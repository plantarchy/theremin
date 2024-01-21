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

let leadEnv = new Tone.AmplitudeEnvelope().toDestination();
let leadFilter = new Tone.Filter(5000, "lowpass").toDestination();
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
    volume: -10 
}).connect(leadFilter);

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

const drumButton = document.getElementById("majorBtn");
const beatDropdown = document.getElementById("beat-option");
const bpmInput = document.getElementById("labels-range-input");
bpmInput.addEventListener("change", () => {
    console.log(bpmInput.value)
    Tone.Transport.bpm.value = bpmInput.value;
    amenBreak.playbackRate = bpmInput.value / 120;
})

let playLeads = false;
let drumToggle = false;
let drumSynth = new Tone.MembraneSynth().toDestination();
let hihatSynth = new Tone.NoiseSynth().toDestination();
let amenBreak = new Tone.Player("/Amen-break.wav").toDestination();
amenBreak.loop = true;

drumSynth.set({ volume: -20 });
hihatSynth.set({ volume: -20 });
const loopA = new Tone.Loop(time => {
    if (!drumToggle) return;
	drumSynth.triggerAttackRelease("C2", "8n", time);
}, "4n").start(0);
const loopB = new Tone.Loop(time => {
    if (!drumToggle) return;
 hihatSynth.triggerAttackRelease("4n", time);
}, "4n").start("8n");
const leadLoop = new Tone.Loop(time => {
    console.log(playLeads);
    if (!playLeads) return;
    const rand = Math.random();
    let genieNoteNum = genie.next(Math.floor(Math.random() * 7));
    let genieNote = teoria.note.fromKey(genieNoteNum);
    console.log("genieNoteNum:", genieNoteNum, "genieNote:", genieNote.scientific());
    if (rand > 0.75) {
        // 8th note
        leadSynth.triggerAttackRelease(genieNote.scientific(), "8n");
    } else if (rand > 0.5) {
        // 4th note
        leadSynth.triggerAttackRelease(genieNote.scientific(), "4n");
    } else {
    }
}, "8n").start("8n");
Tone.Transport.start();

drumButton.addEventListener("click", () => {
    drumToggle = !drumToggle;
    if (drumToggle) {
        if (beatDropdown.innerText === "Amen Break") {
            amenBreak.playbackRate = bpmInput.value / 120;
            amenBreak.start();
        } else {
            console.log(bpmInput.value)
            Tone.Transport.bpm.value = bpmInput.value;
        }
    } else {
        amenBreak.stop();
    }
})

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
                    console.log("play leads");
                    playLeads = true;
                }
            } else if (prevRightGesture !== "Closed_Fist") {
                console.log("stop leads");
                playLeads = false;
            }

            prevRightGesture = rightHand.gesture;
        }

        ctx.restore();
    }

    window.requestAnimationFrame(() => predictWebcam(video, gestureRecognizer, ctx));
}
