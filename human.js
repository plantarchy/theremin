import {
    DrawingUtils,
    GestureRecognizer,
} from '@mediapipe/tasks-vision';
import * as Tone from 'tone';
import * as teoria from 'teoria';

const COLORS = ["#FF0000", "#00FF00", "#0000FF"];
const notes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];

export class Human {
    constructor(id, video, pose, hands, ctx, onExpire) {
        this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
        this.playing = [];
        this.video = video;
        this.ctx = ctx;
        this.drawingUtils = new DrawingUtils(ctx);
        this.updatePose(pose, hands);
        this.onExpire = onExpire;
        this.expiry = setTimeout(onExpire, 500);
        this.id = id;
        this.prevLeftGesture = null;
        this.prevRightGesture = null;
    }

    updatePose(pose, hands) {
        this.resetExpiry();
        this.pose = pose;
        this.leftWrist = this.pose.keypoints[9];
        this.rightWrist = this.pose.keypoints[10];
        this.leftWrist.x = this.leftWrist.x / this.video.videoWidth;
        this.leftWrist.y = this.leftWrist.y / this.video.videoHeight;
        this.rightWrist.x = this.rightWrist.x / this.video.videoWidth;
        this.rightWrist.y = this.rightWrist.y / this.video.videoHeight;

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

        let bestLeft = null;
        let bestLeftDist = 99999999999999;
        let bestRight = null;
        let bestRightDist = 99999999999999;
        for (const [index, landmarks] of (hands.landmarks || []).entries()) {
            if (landmarks?.length <= 0) continue;
            const leftDist = (landmarks[0].x - this.leftWrist.x)**2 + (landmarks[0].y - this.leftWrist.y)**2;
            const rightDist = (landmarks[0].x - this.rightWrist.x)**2 + (landmarks[0].y - this.rightWrist.y)**2;
            if (leftDist < bestLeftDist) {// && hands.handedness[index][0].categoryName == "Left") {
                bestLeftDist = leftDist;
                bestLeft = {
                    gesture: hands.gestures[index],
                    x: hands.landmarks[index][0].x,
                    y: hands.landmarks[index][0].y,
                    landmarks,
                    index,

                };
            }
            if (rightDist < bestRightDist) {
                bestRightDist = rightDist;
                bestRight = {
                    gesture: hands.gestures[index],
                    x: hands.landmarks[index][0].x,
                    y: hands.landmarks[index][0].y,
                    landmarks,
                    index,
                };
            }
        }
        if (this.leftWrist.score > 0.1) {
            this.leftHand = bestLeft;
        } else {
            this.leftHand = null;
        }
        if (this.rightWrist.score > 0.1) {
            this.rightHand = bestRight;
        } else {
            this.rightHand = null;
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
        if (this.leftHand?.gesture[0]["categoryName"] === "Open_Palm" && this.prevLeftGesture !== "Open_Palm") {
            const now = Tone.now();
            this.synth.triggerRelease(this.playing, now);
            this.playing = [];
            const normal = (Math.max(0.20, Math.min(0.80, this.leftHand.y)) - 0.20) * (1 / 0.60);
            const note = notes[Math.min(Math.floor(normal * notes.length), notes.length - 1)];
            console.log(normal, note, teoria.note(note));
            const chord = teoria.note(note).chord("maj");
            for (let n of chord.notes()) {
                this.synth.triggerAttack(n.scientific(), now);
                this.playing.push(n.scientific());
            }
        }
        if (this.leftHand?.gesture[0]["categoryName"] === "Closed_Fist" && this.prevLeftGesture !== "Closed_Fist") {
            const now = Tone.now();
            this.synth.triggerRelease(this.playing, now);
        }
        if (this.rightHand?.gesture[0]["categoryName"] === "Open_Palm") {
            console.log("STAB RIGHT");
        }
        this.prevLeftGesture = this.leftHand?.gesture[0]["categoryName"];
        this.prevRightGesture = this.rightHand?.gesture[0]["categoryName"];
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
        this.expiry = setTimeout(this.onExpire, 500);
    }
}