export async function askWebcamPermissions() {
  let stream;
  try {
    let constraints = { video: true, audio: false }; //ask for camera and microphone permission
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    alert(error);
  }
  closeStream(stream);
}

export function closeStream(stream){
  try{
    if (stream){
      stream.getTracks().forEach(track => track.stop());
    }
  } catch (e){
    alert(e.message);
  }
}

export async function captureCamera(video, hasMicrophone, callback) {
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
    audio: false
  }

  try {
    const camera = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = camera;
  } catch (error) {
    alert('Unable to capture your camera. Please check console logs.');
    console.error(error);
  }
}