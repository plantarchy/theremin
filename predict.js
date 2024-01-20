import {
    GestureRecognizer,
    DrawingUtils,
    PoseLandmarker
} from '@mediapipe/tasks-vision';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import { Human } from './human';

let poseDetector;
(async () => {
    await tf.ready();
    const poseDetectorConfig = {
        modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
        modelUrl: "/movenet-multipose.json",
        enableTracking: true,
        trackerType: poseDetection.TrackerType.Keypoint
    };
    poseDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, poseDetectorConfig);
})()

let lastVideoTime = -1;
const canvas = document.querySelector("#video-container canvas");
const humans = {};

export async function predictWebcam(video, gestureRecognizer, ctx) {
    let nowInMs = Date.now();
    let handResults, poseResults, wrists;
    const scale = video.videoWidth / video.offsetWidth;

    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        handResults = gestureRecognizer.recognizeForVideo(video, nowInMs);
        poseResults = await poseDetector.estimatePoses(video);
    }
    if (handResults?.landmarks || poseResults?.length > 0) {
        ctx.save();
        ctx.clearRect(0, 0, video.offsetWidth, video.offsetHeight);
        const drawingUtils = new DrawingUtils(ctx);
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;

        wrists = (poseResults || []).map((person) => {
            return {
                id: person.id,
                leftWristConfidence: person.keypoints[9].score,
                rightWristConfidence: person.keypoints[10].score,
                leftWristX: person.keypoints[9].x / video.videoWidth,
                leftWristY: person.keypoints[9].y / video.videoHeight,
                rightWristX: person.keypoints[10].x / video.videoWidth,
                rightWristY: person.keypoints[10].y / video.videoHeight,
            };
        });
        let lefts = {};
        let rights = {};

        for (const [index, landmarks] of (handResults.landmarks || []).entries()) {
            let bestWrist = null;
            let bestDist = 99999999;
            for (let wrist of wrists) {
                const leftDist = (landmarks[0].x - wrist.leftWristX)**2 + (landmarks[0].y - wrist.leftWristY)**2;
                const rightDist = (landmarks[0].x - wrist.rightWristX)**2 + (landmarks[0].y - wrist.rightWristY)**2;
                if (leftDist < bestDist) {
                    bestDist = leftDist;
                    bestWrist = {
                        handedness: "Left",
                        confidence: wrist.leftWristConfidence,
                        gesture: handResults.gestures[index],
                        x: handResults.landmarks[index][0].x,
                        y: handResults.landmarks[index][0].y,
                        landmarks,
                        id: wrist.id
                    };
                }
                if (rightDist < bestDist) {
                    bestDist = rightDist;
                    bestWrist = {
                        handedness: "Right",
                        confidence: wrist.rightWristConfidence,
                        gesture: handResults.gestures[index],
                        x: handResults.landmarks[index][0].x,
                        y: handResults.landmarks[index][0].y,
                        landmarks,
                        id: wrist.id
                    };
                }

            }

            // NOTE: Handedness is reversed??
            if (bestWrist.handedness === "Left" && bestWrist.confidence > 0.1) {
                lefts[bestWrist.id] = bestWrist;
            } else if (bestWrist.handedness === "Right" && bestWrist.confidence > 0.1) {
                rights[bestWrist.id] = bestWrist;
            }

        }
        
        ctx.restore();
        ctx.save();
        window.matchedHands = new Set();
        for (const person of (poseResults || [])) {
            const handMap = {"left": lefts[person.id], "right": rights[person.id]};
            ctx.save();
            if (person.id in humans) {
                humans[person.id].updatePose(person, handMap);
            } else {
                console.log("add person", person.id)
                humans[person.id] = new Human(person.id, video, person, handMap, ctx, () => {
                    // On expire, remove
                    console.log("remove person", person.id);
                    delete humans[person.id];
                });
            }
            ctx.restore();
        }
        ctx.restore();
    }

    window.requestAnimationFrame(() => predictWebcam(video, gestureRecognizer, ctx));
}