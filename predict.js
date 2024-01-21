import {
    GestureRecognizer,
    DrawingUtils,
    PoseLandmarker
} from '@mediapipe/tasks-vision';
import * as Tone from 'tone';
import * as teoria from 'teoria';
import * as core from '@magenta/music/esm/core';
import { getNotes } from './theory';

const notes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];
let lastVideoTime = -1;
const canvas = document.querySelector("#video-container canvas");
const humans = {};

Tone.start()
let prevLeftGesture = null;
let prevRightGesture = null;
let prevLeftPos = null;
let prevRightPos = null;
let prevLeftRot = 0;
let prevRightRot = 0;
let chordPlaying = null;
let chordReverb = new Tone.Freeverb().toDestination();
let chordFilter = new Tone.Filter(20000, "lowpass").connect(chordReverb);
let pitchShift = new Tone.PitchShift().connect(chordFilter);
let chordSynth = new Tone.PolySynth(Tone.Synth).connect(pitchShift);
chordSynth.set({ volume: -20 });
console.log(chordSynth);

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
                    z: landmarks[0].z,
                    rot: Math.atan2((landmarks[9].y - landmarks[0].y), (landmarks[9].x - landmarks[0].x)) * 180 / Math.PI,
                    gesture: handResults.gestures[index][0].categoryName
                };
            } else if (handResults.handedness[index][0].categoryName === "Right") {
                leftHand = {
                    x: landmarks[0].x,
                    y: landmarks[0].y,
                    z: landmarks[0].z,
                    rot: Math.atan2(-(landmarks[9].y - landmarks[0].y), (landmarks[9].x - landmarks[0].x)) * 180 / Math.PI,
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
                if (!chordPlaying) {
                    const now = Tone.now();
                    chordSynth.releaseAll();
                    const [root, freqs, adj] = getNotes(leftHand.x, leftHand.y);
                    for (let freq of freqs) {
                        chordSynth.triggerAttack(freq, now);
                    }
                    chordPlaying = root;
                    prevLeftRot = leftHand.rot;
                } else {
                    // const [root, freqs, adj] = getNotes(leftHand.x, leftHand.y);
                    // pitchShift.pitch = teoria.interval(root, chordPlaying).semitones() + (adj);
                }
            } else if (leftHand.gesture === "Closed_Fist" && prevLeftGesture !== "Closed_Fist") {
                const now = Tone.now();
                chordSynth.releaseAll();
                chordPlaying = null;
            }
            if (slideToggle) {
                const normal = Math.min(1, Math.max(-1, (leftHand.rot - prevLeftRot) / 60));
                console.log(leftHand.rot);
                if (Math.abs(normal) >= 0.05) {
                    pitchShift.pitch = ((normal) * 2);
                }
            }
            prevLeftGesture = leftHand.gesture;
        }

        ctx.restore();
    }

    window.requestAnimationFrame(() => predictWebcam(video, gestureRecognizer, ctx));
}