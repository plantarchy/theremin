import * as teoria from 'teoria';

let X_MIN_LEFT = 1 - 0.10;
let X_MAX_LEFT = 1 - 0.45;
let X_MIN_RIGHT = 0.50;
let X_MAX_RIGHT = 0.10;
let Y_MIN = 0.20;
let Y_MAX = 0.91;

let grid = [];


// Generate C, D, E, F, G etc chords (intermediates can be filled in)
let scale = teoria.note("c4").scale("chromatic").notes()
scale.push(teoria.note("c5"));
let chords = ["M", "maj7", "7", "min7", "min"]
// for (let [index, note] of scale.notes().entries()) {
//     let xpos = X_MIN + index * (X_MAX - X_MIN) / scale.notes().length;
//     for (let [i2, chord] of chords.entries()) {
//         let ypos = Y_MIN + i2 * (Y_MAX - Y_MIN) / chords.length;
//     }
// }
console.log("len", scale);

export let chordTypeMap = {
    "M": "ionian",
    "maj7": "ionian",
    "7": "lydian",
    "min7": "lydian",
    "min": "dorian",
}

export function getNotes(x, y) {
    let row = (y - Y_MIN) * chords.length / (Y_MAX - Y_MIN);
    let col = (x - X_MIN_LEFT) * scale.length / (X_MAX_LEFT - X_MIN_LEFT);
    row = Math.max(0, Math.min(Math.floor(row), chords.length - 1));
    col = Math.max(0, Math.min(Math.floor(col), scale.length - 1));

    let xpos = X_MIN_LEFT + col * (X_MAX_LEFT - X_MIN_LEFT) / scale.length;
    let ypos = Y_MIN + row * (Y_MAX - Y_MIN) / chords.length;
    let xadj = (x - xpos) * (X_MAX_LEFT - X_MIN_LEFT) / scale.length; // semitones

    let note = scale[col];
    let chord = note.chord(chords[row]).notes();
    if (chords[row] === "M") chord.push(note.interval("P8"))
    // console.log(note.chord(chords[col]).notes().map(a => a.scientific()));
    // return note.chord(chords[col]).notes().map(a => (a.fq() * 2 ** (xadj/12)));
    console.log(note.scientific(), chords[row], chord.map(a => a.scientific()));
    displayChord(note.chord(chords[row]).name)
    
    return [note, chords[row], chord.map(a => a.fq()), xadj];
}

//gets the piano genie button number
export function getButtonNum(y) {
    console.log("y:", y);
    let button = (y-Y_MAX) * 8 / (Y_MIN - Y_MAX);
    button = Math.max(0, Math.min(Math.floor(button), 7));
    return button;
}