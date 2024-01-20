import * as Tone from 'tone';
import * as teoria from 'teoria';
import * as core from '@magenta/music/esm/core';

import {
    DrawingUtils,
    GestureRecognizer,
} from '@mediapipe/tasks-vision';

const COLORS = ["#FF0000", "#00FF00", "#0000FF"];
const notes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];

const vaeWorker = new Worker('/worker.js');
Tone.start();
vaeWorker.postMessage({});

//frontend interfacing

let slideToggle = document.getElementById("slideToggle").ariaChecked;




export class Human {
    constructor(id, video, pose, hands, ctx, onExpire) {
        this.player = new core.Player();
        this.errorCounter = 5;
        this.intervalCounter = 0;

        Tone.Transport.bpm.value = 120;

        this.chordReverb = new Tone.Freeverb().toDestination();
        this.chordFilter = new Tone.Filter(20000, "lowpass").connect(this.chordReverb);
        this.pitchShift = new Tone.PitchShift().connect(this.chordFilter);
        this.chordSynth = new Tone.PolySynth(Tone.Synth).connect(this.pitchShift);
        this.chordSynth.set({ volume: -20 });

        this.leadSynth = new Tone.Synth({
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

        //Tone.Transport.scheduleRepeat(time => {
        //    osc.start(time).stop(time + 0.2);
        //}, "4n");


        this.leadSynth.sync();
        //this.chordSynth.sync();
        Tone.Transport.start();

        this.playing = [];
        this.video = video;
        this.ctx = ctx;
        this.drawingUtils = new DrawingUtils(ctx);
        this.updatePose(pose, hands);
        this.onExpire = onExpire;
        this.expiry = setTimeout(onExpire, 500);
        this.expiry2 = setTimeout(() => {
            const now = Tone.now();
            this.chordSynth.triggerRelease(this.playing, now);
        }, 500)
        this.id = id;
        this.prevLeftGesture = null;
        this.prevLeftPos = null;
        this.prevRightGesture = null;
        
        //magenta stuff
        this.player = new core.Player();

    }

    updatePose(pose, hands) {
        this.intervalCounter+=1;
        this.resetExpiry();
        this.pose = pose;
        this.leftWrist = this.pose.keypoints[9];
        this.rightWrist = this.pose.keypoints[10];
        this.leftWrist.x = this.leftWrist.x / this.video.videoWidth;
        this.leftWrist.y = this.leftWrist.y / this.video.videoHeight;
        this.rightWrist.x = this.rightWrist.x / this.video.videoWidth;
        this.rightWrist.y = this.rightWrist.y / this.video.videoHeight;

        this.leftHand = hands.left || null;
        this.rightHand = hands.right || null;

        let lastPoint;
        const scale = this.video.videoWidth / this.video.offsetWidth;
        for (const point of pose.keypoints) {
            if (point.score < 0.1) continue;
            this.ctx.fillStyle = COLORS[this.id % 3];
            this.ctx.beginPath();
            this.ctx.ellipse(point.x / scale, point.y / scale, 5, 5, 0, 0, 2 * Math.PI);
            this.ctx.closePath();
            this.ctx.fill();
            lastPoint = point;
        }

        if (this.leftHand?.landmarks) {
            window.matchedHands.add(this.leftHand.index);
            let landmarks = this.leftHand.landmarks;
            this.drawingUtils.drawConnectors(
                landmarks,
                GestureRecognizer.HAND_CONNECTIONS,
                {
                    color: COLORS[this.id % 3],
                    lineWidth: 5
                }
            );
            this.drawingUtils.drawLandmarks(landmarks, {
                color: COLORS[this.id % 3],
                lineWidth: 2
            });
        }
        if (this.rightHand?.landmarks) {
            window.matchedHands.add(this.rightHand.index);
            let landmarks = this.rightHand.landmarks;
            this.drawingUtils.drawConnectors(
                landmarks,
                GestureRecognizer.HAND_CONNECTIONS,
                {
                    color: COLORS[this.id % 3],
                    lineWidth: 5
                }
            );
            this.drawingUtils.drawLandmarks(landmarks, {
                color: COLORS[this.id % 3],
                lineWidth: 2
            });
        }
        if (this.leftHand?.gesture[0]["categoryName"] === "Open_Palm") {
            if (this.intervalCounter % 5 === 0) {
                this.chordFilter.frequency.value = 20000*(this.leftHand.x)**4;
            }
            if (this.prevLeftGesture !== "Open_Palm") {
                const now = Tone.now();
                this.chordSynth.triggerRelease(this.playing, now);
                this.playing = [];
                const normal = (Math.max(0.20, Math.min(0.80, this.leftHand.y)) - 0.20) * (1 / 0.60);
                const note = notes[Math.min(Math.floor(normal * notes.length), notes.length - 1)];
                console.log(normal, note, teoria.note(note));
                const chord = teoria.note(note).chord("maj"); //FRONT END INTEGRATION
                for (let n of chord.notes()) {
                    this.chordSynth.triggerAttack(n.scientific(), now);
                    this.playing.push(n.scientific());
                }
                this.prevLeftPos = normal;
            } else {
                const now = Tone.now();
                if (slideToggle) {
                    const normal = (Math.max(0.20, Math.min(0.80, this.leftHand.y)) - 0.20) * (1 / 0.60);
                    this.pitchShift.pitch = ((normal - this.prevLeftPos) * 4);
                }
            }
        }
        if (this.leftHand?.gesture[0]["categoryName"] === "Closed_Fist" && this.prevLeftGesture !== "Closed_Fist") {
            const now = Tone.now();
            this.chordSynth.triggerRelease(this.playing, now);
        }
        if (this.rightHand?.gesture[0]["categoryName"] === "Open_Palm") {
            if (this.prevRightGesture !== "Open_Palm") {
                leadMelody(this)
            }
        }
        if (this.rightHand?.gesture[0]["categoryName"] === "Closed_Fist" && this.prevRightGesture !== "Closed_Fist") {
            vaeWorker.onmessage = null;
            this.player.stop();
        }
        this.prevLeftGesture = this.leftHand?.gesture[0]["categoryName"];
        this.prevRightGesture = this.rightHand?.gesture[0]["categoryName"];
        if (this.intervalCounter >= 100) {
            this.intervalCounter = 0;
        }
    }

    getCenter() {
        let shoulderX = (this.pose.keypoints[5].x + this.pose.keypoints[6].x) / (2 * this.video.videoWidth);
        let shoulderY = (this.pose.keypoints[5].y + this.pose.keypoints[6].y) / (2 * this.video.videoHeight);
        let hipX = (this.pose.keypoints[11].x + this.pose.keypoints[12].x) / (2 * this.video.videoWidth);
        let hipY = (this.pose.keypoints[11].y + this.pose.keypoints[12].y) / (2 * this.video.videoHeight);
        let x = (shoulderX + hipX) / 2;
        let y = (shoulderY + hipY) / 2;
        return {
            x,
            y,
        };
    }

    getNose() {
        const nose = this.pose.keypoints[0];
        return {...nose, x: nose.x / this.video.videoWidth, y: nose.y / this.video.videoHeight };
    }

    getLeftFoot() {
        const foot = this.pose.keypoints[15];
        return {...foot, x: foot.x / this.video.videoWidth, y: foot.y / this.video.videoHeight };
    }

    getRightFoot() {
        const foot = this.pose.keypoints[16];
        return {...foot, x: foot.x / this.video.videoWidth, y: foot.y / this.video.videoHeight };
    }

    getLeftHand() {
    }

    resetExpiry() {
        clearTimeout(this.expiry);
        clearTimeout(this.expiry2);
        this.expiry = setTimeout(this.onExpire, 500);
        this.expiry2 = setTimeout(() => {
            const now = Tone.now();
            this.chordSynth.triggerRelease(this.playing, now);
        }, 500)
    }

}

async function leadMelody(human) {
  console.log("lead melody");
  vaeWorker.postMessage({});
  vaeWorker.onmessage = async (event) => {
    if (event.data.fyi) {
      console.log(event.data.fyi);
    } else {
      const sample = event.data.sample;
      console.log(sample);
      try {
        await human.player.start(sample);
        vaeWorker.postMessage({});
      } catch (e) {}
    }
  };
}




//frontend interfacing


document.getElementById("slideToggle").addEventListener("click", () => {
    slideToggle = !slideToggle;
})