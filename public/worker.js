importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.4.0/dist/tf.min.js");
importScripts("https://cdn.jsdelivr.net/npm/@magenta/music@^1.12.0/es6/core.js");
importScripts("https://cdn.jsdelivr.net/npm/@magenta/music@^1.12.0/es6/piano_genie.js");
// importScripts("https://cdn.jsdelivr.net/npm/@magenta/music@^1.12.0/es6/music_vae.js");

// const mvae = new music_vae.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small');
// // Main script asks for work.
// self.onmessage = async (e) => {
    // if (!mvae.isInitialized()) {
        // await mvae.initialize();
        // postMessage({ fyi: 'model initialized' });
    // }

    // const output = await mvae.sample(1, 0.3, qpm=tempo);
    // // Send main script the result.
    // postMessage({ sample: output[0] });
// };
// let LOWEST_PIANO_KEY_MIDI_NOTE = 21
// let GENIE_CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/piano_genie/model/epiano/stp_iq_auto_contour_dt_166006';
// const genie = new pg.PianoGenie(GENIE_CHECKPOINT);
// self.onmessage = async (e) => {
//  const output = await mvae.sample(1, 0.3, qpm=tempo);
//  // Send main script the result.
//  postMessage({ sample: output[0] });
// };