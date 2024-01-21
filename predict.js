import {
    GestureRecognizer,
    DrawingUtils,
    PoseLandmarker
} from '@mediapipe/tasks-vision';
import * as Tone from 'tone';
import * as teoria from 'teoria';
import * as core from '@magenta/music/esm/core';

const notes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];
let lastVideoTime = -1;
const canvas = document.querySelector("#video-container canvas");
const humans = {};

Tone.start()
let prevLeftGesture = null;
let prevRightGesture = null;
let prevLeftPos = null;
let prevRightPos = null;
let chordReverb = new Tone.Freeverb().toDestination();
let chordFilter = new Tone.Filter(20000, "lowpass").connect(chordReverb);
let pitchShift = new Tone.PitchShift().connect(chordFilter);
let chordSynth = new Tone.PolySynth(Tone.Synth).connect(pitchShift);
chordSynth.set({ volume: -20 });

let slideToggle = false;
document.getElementById("slideToggle").addEventListener("click", () => {
    slideToggle = !slideToggle;
})

export async function predictWebcam(video, gestureRecognizer, ctx) {
    let nowInMs = Date.now();
    let handResults;
    const scale = video.videoWidth / video.offsetWidth;

    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        handResults = gestureRecognizer.recognizeForVideo(video, nowInMs);
    }
    if (handResults?.landmarks) {
        ctx.save();
        ctx.clearRect(0, 0, video.offsetWidth, video.offsetHeight);
        const drawingUtils = new DrawingUtils(ctx);
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;

        let leftHand = null;
        let rightHand = null;
        for (let [index, landmarks] of handResults.landmarks.entries()) {
            if (!handResults.handedness[index]?.[0]) continue;
            if (handResults.handedness[index][0].categoryName === "Left") {
                rightHand = {
                    x: landmarks[0].x,
                    y: landmarks[0].y,
                    gesture: handResults.gestures[index][0].categoryName
                };
            } else if (handResults.handedness[index][0].categoryName === "Right") {
                leftHand = {
                    x: landmarks[0].x,
                    y: landmarks[0].y,
                    gesture: handResults.gestures[index][0].categoryName
                };
            }

            drawingUtils.drawConnectors(
                landmarks,
                GestureRecognizer.HAND_CONNECTIONS,
                {
                    color: "#FF0000",
                    lineWidth: 5
                }
            );
            drawingUtils.drawLandmarks(landmarks, {
                color: "#00FF00",
                lineWidth: 2
            });
        }

        if (leftHand) {
            if (leftHand.gesture === "Open_Palm") {
                if (prevLeftGesture !== "Open_Palm") {
                    const now = Tone.now();
                    chordSynth.releaseAll();
                    const normal = (Math.max(0.20, Math.min(0.80, 1-leftHand.y)) - 0.20) * (1 / 0.60);
                    const note = notes[Math.min(Math.floor(normal * notes.length), notes.length - 1)];
                    console.log(normal, note, teoria.note(note));
                    const chord = teoria.note(note).chord("maj"); //FRONT END INTEGRATION
                    for (let n of chord.notes()) {
                        chordSynth.triggerAttack(n.scientific(), now);
                    }
                    prevLeftPos = normal;
                } else {
                    if (slideToggle) {
                        const normal = (Math.max(0.20, Math.min(0.80, leftHand.y)) - 0.20) * (1 / 0.60);
                        pitchShift.pitch = ((normal - prevLeftPos) * -4);
                    }
                }
            } else if (leftHand.gesture === "Closed_Fist" && prevLeftGesture !== "Closed_Fist") {
                const now = Tone.now();
                chordSynth.releaseAll();
            }
            prevLeftGesture = leftHand.gesture;
        }

        ctx.restore();
    }

    window.requestAnimationFrame(() => predictWebcam(video, gestureRecognizer, ctx));
}