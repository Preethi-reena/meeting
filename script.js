let mediaRecorder;
let audioChunks = [];

// Start recording audio (system audio via VB-Cable or similar virtual device)
document.getElementById("startRecording").addEventListener("click", async () => {
    try {
        // List all available audio devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log("Available devices:", devices);

        // Find the VB-Cable or virtual audio device
        const vbCableDevice = devices.find(
            (device) => device.kind === "audioinput" && device.label.includes("VB-Cable")
        );

        if (!vbCableDevice) {
            alert("VB-Cable device not found! Please ensure it is installed and configured.");
            return;
        }

        console.log("Using VB-Cable device:", vbCableDevice);

        // Request access to the virtual audio device
        let stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: vbCableDevice.deviceId,
            },
        });

        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            let audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            let audioUrl = URL.createObjectURL(audioBlob);

            // Set the audio playback for user
            let audioElement = document.getElementById("audioPlayback");
            audioElement.src = audioUrl;
            audioElement.controls = true;

            // Send the audio to the server for transcription
            let formData = new FormData();
            formData.append("file", audioBlob, "audio.webm");

            let response = await fetch("http://127.0.0.1:5000/summarize", {
                method: "POST",
                body: formData,
            });

            let result = await response.json();
            if (result.transcription) {
                document.getElementById("transcriptionResult").value = result.transcription;
                document.getElementById("Summarize").disabled = false; // Enable Summarize button
            } else {
                alert("Transcription failed!");
            }
        };

        audioChunks = [];
        mediaRecorder.start();
        document.getElementById("stopRecording").disabled = false;
        document.getElementById("startRecording").disabled = true;
        document.getElementById("Summarize").disabled = true;

        alert("Recording started using VB-Cable device!");
    } catch (error) {
        console.error("Error starting the recording:", error);
        alert("Failed to start recording. Please check your permissions and VB-Cable setup.");
    }
});

// Stop recording
document.getElementById("stopRecording").addEventListener("click", () => {
    mediaRecorder.stop();
    document.getElementById("stopRecording").disabled = true;
    document.getElementById("startRecording").disabled = false;
});

// Summarize the transcription
document.getElementById("Summarize").addEventListener("click", async () => {
    let text = document.getElementById("transcriptionResult").value;
    if (!text) {
        alert("No transcription available to summarize!");
        return;
    }

    try {
        console.log("Sending text for summarization:", text); // Debug log for sent text

        let response = await fetch("http://127.0.0.1:5000/summarize_text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text }),
        });

        let result = await response.json();
        if (result.summary) {
            alert("Summary: " + result.summary); // Show the summary
        } else {
            alert("Summarization failed!");
        }
    } catch (error) {
        console.error("Error during summarization:", error);
        alert("Failed to summarize. Please try again.");
    }
});
