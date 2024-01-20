import {
    GestureRecognizer,
    DrawingUtils,
    PoseLandmarker
} from '@mediapipe/tasks-vision';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';

let poseDetector;
(async () => {
    await tf.ready();
    const poseDetectorConfig = {
        modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
        modelUrl: "/movenet-multipose.json"
    };
    poseDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, poseDetectorConfig);
})()

let lastVideoTime = -1;
const canvas = document.querySelector("#video-container canvas");

export async function predictWebcam(video, gestureRecognizer, ctx) {
    let nowInMs = Date.now();
    let handResults, poseResults;
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

        for (const landmarks of (handResults.landmarks || [])) {
            drawingUtils.drawConnectors(
                landmarks,
                GestureRecognizer.HAND_CONNECTIONS,
                {
                    color: "#00FF00",
                    lineWidth: 5
                }
            );
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 2
            });
        }
        ctx.restore();
        ctx.save();
        for (const person of (poseResults || [])) {
            let lastPoint;
            for (const point of person.keypoints) {
                if (point.score < 0.1) continue;
                console.log("draw", point);
                ctx.fillStyle = "#FFF";
                ctx.beginPath();
                ctx.ellipse(point.x, point.y, 5, 5, 0, 0, 2 * Math.PI);
                ctx.closePath();
                ctx.fill();
                lastPoint = point;
            }
        }
        ctx.restore();
    }

    window.requestAnimationFrame(() => predictWebcam(video, gestureRecognizer, ctx));
}