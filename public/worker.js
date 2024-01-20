importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.4.0/dist/tf.min.js");
importScripts("https://cdn.jsdelivr.net/npm/@magenta/music@^1.12.0/es6/core.js");
importScripts("https://cdn.jsdelivr.net/npm/@magenta/music@^1.12.0/es6/music_vae.js");

const mvae = new music_vae.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small');
// Main script asks for work.
self.onmessage = async (e) => {
    if (!mvae.isInitialized()) {
        await mvae.initialize();
        postMessage({ fyi: 'model initialized' });
    }

    const output = await mvae.sample(1);
    // Send main script the result.
    postMessage({ sample: output[0] });
};