import {
    GestureRecognizer,
    DrawingUtils,
    PoseLandmarker
} from '@mediapipe/tasks-vision';
import * as Tone from 'tone';
import * as teoria from 'teoria';
import * as core from '@magenta/music/esm/core';
import { getNotes, getButtonNum } from './theory';
import * as pg from '@magenta/music/esm/piano_genie'
import * as pl from '@magenta/music/esm/core/player'

//chords in letter notation
const notes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];
let lastVideoTime = -1;
const canvas = document.querySelector("#video-container canvas");
const humans = {};

//const worker = new Worker("/worker.js");
// let LOWEST_PIANO_KEY_MIDI_NOTE = 21
let GENIE_CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/piano_genie/model/epiano/stp_iq_auto_contour_dt_166006';
const genie = new pg.PianoGenie(GENIE_CHECKPOINT);
const player = new pl.Player();
genie.initialize();

Tone.start()


let leadSynth = new Tone.Synth({
    oscillator: {
        type: "sawtooth"
    },
    envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 1.0,
        release: 0.3
    },
    volume: 0
}).toDestination();

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
let chordSynth = [0, 0, 0, 0, 0].map(() => new Tone.Synth().connect(pitchShift));
chordSynth.forEach(a => a.set({ volume: -1000 }));
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
                    chordSynth.map(a => { a.triggerRelease(); a.set({ volume: -1000 }) });
                    const [root, freqs, adj] = getNotes(leftHand.x, leftHand.y);
                    for (let [i,freq] of freqs.entries()) {
                        chordSynth[i].set({ volume: -20 });
                        chordSynth[i].triggerAttack(freq, now);
                    }
                    chordPlaying = root;
                    prevLeftRot = leftHand.rot;
                } else {
                    if (slideToggle) {
                        const [root, freqs, adj] = getNotes(leftHand.x, leftHand.y);
                        for (let [i,synth] of chordSynth.entries()) {
                            if (!freqs[i]) {
                                chordSynth[i].triggerRelease();
                                chordSynth[i].set({ volume: -1000 });
                                synth.oscillator.frequency.set(0);
                            } else if (synth.volume.value === -1000) {
                                const now = Tone.now();
                                chordSynth[i].set({ volume: -20 });
                                chordSynth[i].triggerAttack(freqs[i], now);
                            } else {
                                chordSynth[i].oscillator.frequency.rampTo(freqs[i], 0.1);
                            }
                        }
                    }
                    // pitchShift.pitch = teoria.interval(root, chordPlaying).semitones() + (adj);
                }
            } else if (prevLeftGesture !== "Closed_Fist") {
                const now = Tone.now();
                chordSynth.map(a => { a.triggerRelease(); a.set({ volume: -1000 }) });
                chordPlaying = null;
            }
            // if (slideToggle) {
            //     const normal = Math.min(1, Math.max(-1, (leftHand.rot - prevLeftRot) / 60));
            //     console.log(leftHand.rot);
            //     if (Math.abs(normal) >= 0.05) {
            //         pitchShift.pitch = ((normal) * 2);
            //     }
            // }
            prevLeftGesture = leftHand.gesture;
        }

        if (rightHand) {
            if (rightHand.gesture === "Open_Palm") {
                if (prevRightGesture !== "Open_Palm") {
                    let buttonNum = getButtonNum(rightHand.x);
                    console.log("button:", buttonNum);
                    //let genieNoteNum = genie.nextFromKeyList(Math.floor(Math.random() * 7), [40]);
                    let genieNoteNum = genie.next(buttonNum, 1);
                    let genieNote = teoria.note.fromKey(genieNoteNum);
                    console.log("genieNoteNum:", genieNoteNum, "genieNote:", genieNote.scientific());
                    const now = Tone.now();
                    leadSynth.triggerAttackRelease(genieNote.scientific(), "8n", now);
                    
                }

            }
            prevRightGesture = rightHand.gesture;
        }

        ctx.restore();
    }

    window.requestAnimationFrame(() => predictWebcam(video, gestureRecognizer, ctx));
}
