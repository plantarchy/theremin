import {
    GestureRecognizer,
    DrawingUtils
} from '@mediapipe/tasks-vision';

let lastVideoTime = -1;
const canvas = document.querySelector("#video-container canvas");

export async function predictWebcam(video, gestureRecognizer, ctx) {
    let nowInMs = Date.now();
    let results;
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        results = gestureRecognizer.recognizeForVideo(video, nowInMs);
        if (results.landmarks.length > 0) {
            console.log(results.landmarks[0][0]);
        }
    }
    if (results?.landmarks) {
        ctx.save();
        ctx.clearRect(0, 0, video.offsetWidth, video.offsetHeight);
        const drawingUtils = new DrawingUtils(ctx);
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;

        for (const landmarks of results.landmarks) {
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
    }

    window.requestAnimationFrame(() => predictWebcam(video, gestureRecognizer, ctx));
}