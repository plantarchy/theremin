import * as Tone from 'tone'

// Initialize Tone.js
Tone.start();

// Create a simple synth
const synth = new Tone.Synth().toDestination();

// Function to play a sound
function playSound() {
  // Trigger a note
  synth.triggerAttackRelease("C4", "2n");
}

// Attach click event listener to the button
const playButton = document.getElementById("playButton");
playButton.addEventListener("click", playSound);