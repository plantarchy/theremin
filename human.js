import {
    GestureRecognizer,
} from '@mediapipe/tasks-vision';

const COLORS = ["#FF0000", "#00FF00", "#0000FF"];

export class Human {
    constructor(id, video, pose, hands, drawingUtils, onExpire) {
        this.video = video;
        this.drawingUtils = drawingUtils;
        this.updatePose(pose, hands);
        this.onExpire = onExpire;
        this.expiry = setTimeout(onExpire, 500);
        this.id = id;
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

        let bestLeft = null;
        let bestLeftDist = 99999999999999;
        let bestRight = null;
        let bestRightDist = 99999999999999;
        for (const [index, landmarks] of (hands.landmarks || []).entries()) {
            if (landmarks?.length <= 0) continue;
            const leftDist = (landmarks[0].x - this.leftWrist.x)**2 + (landmarks[0].y - this.leftWrist.y)**2;
            const rightDist = (landmarks[0].x - this.rightWrist.x)**2 + (landmarks[0].y - this.rightWrist.y)**2;
            if (leftDist < bestLeftDist && hands.handedness[index][0].categoryName == "Left") {
                bestLeftDist = leftDist;
                bestLeft = {
                    gesture: hands.gestures[index],
                    x: hands.landmarks[index][0].x,
                    y: hands.landmarks[index][0].y,
                    landmarks,
                    index,

                };
            }
            if (rightDist < bestRightDist && hands.handedness[index][0].categoryName == "Right") {
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
        this.leftHand = bestLeft;
        this.rightHand = bestRight;
        if (this.leftHand?.landmarks) {
            hands.landmarks[this.leftHand.index]
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

        console.log("update human", this.id, this.getCenter());
    }

    getCenter() {
        let shoulderX = (this.pose.keypoints[5].x + this.pose.keypoints[6].x) / (2 * this.video.videoWidth);
        let shoulderY = (this.pose.keypoints[5].y + this.pose.keypoints[6].y) / (2 * this.video.videoHeight);
        let hipX = (this.pose.keypoints[11].y + this.pose.keypoints[12].y) / (2 * this.video.videoHeight);
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