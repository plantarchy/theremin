import * as Tone from 'tone'
import * as core from '@magenta/music/esm/core';
import * as music_vae from '@magenta/music/esm/music_vae';


const player = new core.Player();
//...
const mvae = new music_vae.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small');
mvae.initialize().then(() => {
});

// Initialize Tone.js
Tone.start();

// Create a simple synth
const synth = new Tone.Synth().toDestination();

// Function to play a sound
async function playSound() {
  // Trigger a note
  const samples = await mvae.sample(1);
  await player.start(samples[0]);
  window.requestAnimationFrame(playSound);
}

// Attach click event listener to the button
const playButton = document.getElementById("playButton");
playButton.addEventListener("click", playSound);