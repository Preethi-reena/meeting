import pyaudio
import wave
import whisper
from transformers import pipeline

# Load Whisper model for transcription
whisper_model = whisper.load_model("base")

# Summarizer pipeline using BART
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

# Parameters for audio capture
FORMAT = pyaudio.paInt16  # 16-bit audio format
CHANNELS = 1  # Mono audio
RATE = 44100  # Sample rate: 44.1 kHz
CHUNK = 2048  # Number of frames per buffer

# Initialize PyAudio
p = pyaudio.PyAudio()

# Search for VB-Cable device
DEVICE_INDEX = None
for i in range(p.get_device_count()):
    dev_info = p.get_device_info_by_index(i)
    if "VB-Cable" in dev_info.get("name", ""):  # Adjust this name if necessary
        DEVICE_INDEX = i
        print(f"VB-Cable device found at index {i}")
        break

if DEVICE_INDEX is None:
    raise ValueError("VB-Cable input device not found! Make sure it's installed and set up correctly.")

# Open a stream for capturing system audio
stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                input_device_index=DEVICE_INDEX,
                frames_per_buffer=CHUNK)

print("Recording system audio...")

# Record and save audio to a WAV file
frames = []
try:
    for _ in range(0, int(RATE / CHUNK * 10)):  # Record for 10 seconds (adjust as needed)
        data = stream.read(CHUNK)
        frames.append(data)

except KeyboardInterrupt:
    print("Recording stopped manually.")
finally:
    # Stop the stream and close it
    stream.stop_stream()
    stream.close()
    p.terminate()

    # Save the recorded audio to a WAV file
    with wave.open("system_audio.wav", 'wb') as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(p.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b''.join(frames))

    print("Audio saved to 'system_audio.wav'")

# Transcribe the audio file
def transcribe_audio(file_path):
    result = whisper_model.transcribe(file_path)
    return result['text']

# Summarize the transcribed text
def summarize_text(text):
    return summarizer(text, max_length=150, min_length=50, do_sample=False)[0]['summary_text']

# Transcription of the recorded system audio
transcription = transcribe_audio("system_audio.wav")
print("Transcription:", transcription)

# Generate the summary of the transcription
summary = summarize_text(transcription)
print("Summary:", summary)
