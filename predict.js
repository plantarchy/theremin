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
    let handResults, poseResults;
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

        // for (const landmarks of (handResults.landmarks || [])) {
        //     drawingUtils.drawConnectors(
        //         landmarks,
        //         GestureRecognizer.HAND_CONNECTIONS,
        //         {
        //             color: "#00FF00",
        //             lineWidth: 5
        //         }
        //     );
        //     drawingUtils.drawLandmarks(landmarks, {
        //         color: "#FF0000",
        //         lineWidth: 2
        //     });
        // }
        ctx.restore();
        ctx.save();
        window.matchedHands = new Set();
        for (const person of (poseResults || [])) {
            ctx.save();
            if (person.id in humans) {
                humans[person.id].updatePose(person, (handResults || []));
            } else {
                console.log("add person", person.id)
                humans[person.id] = new Human(person.id, video, person, handResults, ctx, () => {
                    // On expire, remove
                    console.log("remove person", person.id);
                    delete humans[person.id];
                })
            }
            ctx.restore();
        }
        ctx.restore();
    }

    window.requestAnimationFrame(() => predictWebcam(video, gestureRecognizer, ctx));
}