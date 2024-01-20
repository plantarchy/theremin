import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
// Register one of the TF.js backends.
import '@tensorflow/tfjs-backend-webgl';

// Check microphone
let hasMicrophone;

async function askWebcamPermissions() {
  let stream;
  try {
    let constraints = { video: true, audio: true }; //ask for camera and microphone permission
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.log(error);
    let constraints = { video: true, audio: false }; //ask for camera permission only if no microphones detected
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    hasMicrophone = false;
  }
  closeStream(stream);
}

function closeStream(stream){
  try{
    if (stream){
      stream.getTracks().forEach(track => track.stop());
    }
  } catch (e){
    alert(e.message);
  }
}

async function captureCamera(callback) {
  const video = document.querySelector('video');
  let constraints = {
    audio: true,
    video: true
  }

  const devices = [0];
  let device = devices[0];
  let deviceID = device.deviceId;
  console.log(deviceID);
  constraints = {
    video: { 
      deviceId: deviceID,
      width: 1280,
      height: 720,
    },
    audio: hasMicrophone
  }

  try {
    const camera = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = camera;
  } catch (error) {
    alert('Unable to capture your camera. Please check console logs.');
    console.error(error);
  }
}

window.onload = async () => {
  await askWebcamPermissions();
  await tf.ready();
  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
    modelUrl: '/movenet-multipose.json',
    enableTracking: true,
    trackerType: poseDetection.TrackerType.BoundingBox
  };
  console.log(detectorConfig);
  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
  const video = document.querySelector('video');

  await captureCamera();
  setTimeout(async () => {
    console.log(video, video.srcObject);
    setInterval(async () => {
      const poses = await detector.estimatePoses(video);
      console.log(poses);
    }, 50);
    console.log(poses);

  }, 1000);
}

//const poses = await detector.estimatePoses(image);

//document.querySelector('#app').innerHTML = `
//  <div>
//    <a href="https://vitejs.dev" target="_blank">
//      <img src="${viteLogo}" class="logo" alt="Vite logo" />
//    </a>
//    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
//      <img src="${javascriptLogo}" class="logo vanilla" alt="JavaScript logo" />
//    </a>
//    <h1>Hello Vite!</h1>
//    <div class="card">
//      <button id="counter" type="button"></button>
//    </div>
//    <p class="read-the-docs">
//      Click on the Vite logo to learn more
//    </p>
//  </div>
//`

setupCounter(document.querySelector('#counter'))
