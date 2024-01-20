import {
    GestureRecognizer,
    DrawingUtils,
    PoseLandmarker
} from '@mediapipe/tasks-vision';
import * as core from '@magenta/music/es6/core.js';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import * as Tone from 'tone';

const player = new core.Player();
const worker = new Worker('/worker.js');

document.getElementById("playButton").addEventListener("click", () => {
  worker.postMessage({});
  worker.onmessage = async (event) => {
    if (event.data.fyi) {
      console.log(event.data.fyi);
    } else {
      const sample = event.data.sample;
      console.log("Sampel", sample);
      await player.start(sample);
      worker.postMessage({});
      // Do something with this sample
    }
  };
})