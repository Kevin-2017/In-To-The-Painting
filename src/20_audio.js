// ---------- generative music ----------
// One score per world, each with its own lead instrument that nobody else leads with.
// The coast is a felt piano, Argenteuil a harp and a French accordion, the fields a felt piano in three over a rocking harp, the pond a celesta and a far flute.
// Each world has a written theme of eight bars (tune) that comes back again and again. Between its returns the generator varies it
// (same rhythm with other notes, the same notes ornamented, the answer alone). Layers come in as paintings are gathered, at night the music thins to its ground.
// grow holds the step of intensity (0 to 5) at which each layer enters. A line is a slow held counter melody, per gives its notes per bar at each step,
// c the degree it moves around, dbl the step at which it is doubled an octave away (by dblOct octaves).
// A tune bar is a list of notes [step in the bar, scale degree from the root (7 is an octave up), length in steps, weight].
// layers double the tune (iv moves it by scale degrees, 'ct' puts the nearest chord tone under it), answer gives the second half of a varied pass to another voice.
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10] };
const SCORES = [
  { // the coast, D lydian in four, a felt piano with the pedal down over a quiet string pad and the sea. It grows by swell and height.
    bpm: 69, beats: 4, sub: 2, root: 50, scale: SCALES.lydian, prog: [0, 1, 5, 4, 2, 1, 4, 0], barsPer: 1, wet: 0.5, jit: 0.012, pedal: true, grand: true,
    pad: { cut: 900, gain: 0.011, lfo: true, v: [[2, 0], [4, 0], [0, 1]], v4: [6, 0], vTop: [2, 1] }, bass: null,
    arp: { voice: 'piano', oct: -1, vel: 0.05, pat: [[0, [0]], [1, [2]], [2, [3]], [3, [4]], [4, [5]], [5, [4]], [6, [3]], [7, [2]]], at0: [0, 2, 4, 6] },
    mel: { voice: 'piano', oct: 1, dens: 0.5, vel: 0.105 },
    tune: { bars: [
      [[0, 11, 2, 0.85], [2, 16, 4, 1], [6, 15, 2, 0.8]],
      [[0, 17, 3, 0.95], [3, 16, 1, 0.75], [4, 15, 4, 0.85]],
      [[0, 14, 2, 0.85], [2, 12, 2, 0.8], [4, 13, 2, 0.85], [6, 14, 2, 0.9]],
      [[0, 15, 6, 0.9]],
      [[0, 11, 2, 0.8], [2, 16, 3, 0.95], [5, 17, 1, 0.8], [6, 18, 2, 0.95]],
      [[0, 19, 4, 1], [4, 18, 2, 0.9], [6, 17, 2, 0.85]],
      [[0, 16, 2, 0.9], [2, 15, 2, 0.85], [4, 13, 2, 0.8], [6, 15, 2, 0.85]],
      [[0, 14, 8, 0.9]]] },
    layers: [{ at: 4, voice: 'piano', iv: 'ct', minLen: 2, vel: 0.5 }, { at: 5, voice: 'piano', oct: -1, vel: 0.62 }],
    spark: { voice: 'piano', p: 0.045, vel: 0.026, oct: 2 }, chime: 'piano', wind: 0.07, windLevel: 0.01, gulls: true, sea: true,
    rhythms: [[0, 4], [0, 3, 4], [0, 2, 4, 6], [0], [4, 6], [0, 6]],
    grow: { spark: 2, chord4: 2, low: 3, top: 5, breath: 4, swell: 0.05, cut: 0.1, quick: 0.02,
      line: { voice: 'strings', c: 5, per: [0, 0, 0, 1, 1, 2], vel: 0.017, dbl: 5, dblOct: -1 } },
  },
  { // Argenteuil, a day out by the river: G major in four at a walking pace, light on its feet. A piano skips along the tune, a harp runs in
    // even quavers under it and answers, the bass is plucked. (It was a boat song in six with an accordion: the owner asked for the feel of
    // an outing, and for fewer made voices.) It grows by company: thirds under the tune, then octaves, then the left hand of the piano.
    bpm: 96, beats: 4, sub: 2, root: 55, scale: SCALES.major, prog: [0, 4, 5, 3, 0, 3, 4, 0], barsPer: 1, penta: true, wet: 0.3, acc: 0.15, jit: 0.01, grand: true,
    pad: { cut: 760, gain: 0.005, v: [[0, 0], [2, 0], [4, 0]], v4: [6, 0], vTop: [4, 1] }, bass: 'pluck', bassVel: 0.055,
    arp: { voice: 'harp', oct: -1, vel: 0.036, pat: [[0, [0]], [1, [2]], [2, [3]], [3, [2]], [4, [4]], [5, [2]], [6, [3]], [7, [2]]], at0: [0, 2, 4, 6] },
    mel: { voice: 'piano', oct: 0, dens: 0.62, vel: 0.11 },
    tune: { bars: [
      [[0, 9, 1, 0.9], [1, 11, 1, 0.7], [2, 12, 2, 0.9], [4, 11, 2, 0.85], [6, 9, 1, 0.7], [7, 11, 1, 0.7]],
      [[0, 11, 2, 0.9], [2, 13, 1, 0.75], [3, 12, 1, 0.7], [4, 11, 2, 0.85], [6, 8, 2, 0.75]],
      [[0, 12, 2, 0.9], [2, 11, 1, 0.7], [3, 9, 1, 0.75], [4, 7, 2, 0.8], [6, 9, 1, 0.7], [7, 11, 1, 0.7]],
      [[0, 10, 2, 0.9], [2, 12, 1, 0.75], [3, 14, 1, 0.8], [4, 12, 3, 0.85], [7, 11, 1, 0.65]],
      [[0, 9, 1, 0.9], [1, 11, 1, 0.7], [2, 14, 2, 0.95], [4, 13, 1, 0.75], [5, 12, 1, 0.75], [6, 11, 2, 0.8]],
      [[0, 12, 2, 0.9], [2, 10, 1, 0.75], [3, 12, 1, 0.7], [4, 14, 2, 0.9], [6, 12, 2, 0.75]],
      [[0, 11, 1, 0.85], [1, 13, 1, 0.75], [2, 15, 2, 0.95], [4, 13, 2, 0.85], [6, 11, 1, 0.7], [7, 8, 1, 0.7]],
      [[0, 9, 2, 0.85], [2, 8, 2, 0.75], [4, 7, 4, 0.9]]] },
    answer: { at: 3, voice: 'harp', oct: 1, vel: 1.0 },
    layers: [{ at: 4, voice: 'piano', iv: -2, vel: 0.5 }, { at: 5, voice: 'piano', oct: -1, vel: 0.5 }],
    spark: { voice: 'harp', p: 0.06, vel: 0.024, oct: 2 }, chime: 'harp', wind: 0.016, birds: true,
    rhythms: [[0, 2, 4, 6], [0, 3, 4], [0, 4, 6], [0, 6], [2, 4], [0]],
    grow: { spark: 2, chord4: 2, bassAt: 1, bassHalf: 2, roll: 5, top: 5, cut: 0.08, quick: 0.04, hand: 5,
      line: { voice: 'harp', c: 4, per: [0, 0, 0, 0, 1, 2], vel: 0.028 } },
  },
  { // the fields, A major in three, all struck and plucked: a felt piano sings with the pedal down, a harp rocks under it and answers at the top,
    // a plucked bass, and only a low breath of strings far behind. (It was a cello, an oboe and held strings: bowed and blown voices made here
    // sound made, not played.) It grows by warmth.
    bpm: 66, beats: 3, sub: 2, root: 57, scale: SCALES.major, prog: [0, 5, 3, 4, 5, 3, 4, 0], barsPer: 1, wet: 0.5, jit: 0.012, pedal: true, grand: true,
    pad: { cut: 760, gain: 0.006, att: 1.6, rel: 1.6, v: [[0, -1], [4, -1], [2, 0]], v4: [6, 0], vTop: [4, 0] }, bass: 'pluck', bassVel: 0.045,
    arp: { voice: 'harp', oct: -1, vel: 0.044, pat: [[0, [0]], [1, [2]], [2, [3]], [3, [4]], [4, [3]], [5, [2]]], at0: [0, 2, 4],
      // every other eight bars, from the third step on, the harp runs wider: up through the tenth and back
      pat2: [[0, [0]], [1, [2]], [2, [4]], [3, [5]], [4, [4]], [5, [3]]], pat2At: 3 },
    mel: { voice: 'piano', oct: 0, dens: 0.55, vel: 0.125 },
    tune: { bars: [
      [[0, 4, 4, 0.9], [4, 2, 2, 0.8]],
      [[0, 5, 3, 0.95], [3, 4, 1, 0.75], [4, 2, 2, 0.8]],
      [[0, 3, 2, 0.85], [2, 5, 2, 0.9], [4, 3, 2, 0.8]],
      [[0, 1, 6, 0.85]],
      [[0, 2, 2, 0.85], [2, 5, 4, 0.95]],
      [[0, 7, 4, 1], [4, 5, 2, 0.85]],
      [[0, 4, 2, 0.9], [2, 3, 2, 0.8], [4, 1, 2, 0.8]],
      [[0, 0, 6, 0.85]]] },
    answer: { at: 4, voice: 'harp', oct: 1, vel: 1.0 },
    layers: [{ at: 3, voice: 'piano', iv: 'ct', minLen: 2, vel: 0.5 }, { at: 4, voice: 'piano', oct: 1, vel: 0.42 }, { at: 5, voice: 'piano', oct: -1, vel: 0.6 }],
    spark: null, chime: 'harp', wind: 0.03, birds: true,
    rhythms: [[0, 2, 4], [0, 3], [0, 4], [0], [2, 4], [0, 2, 3, 4]],
    // It grows by breadth: the left hand of the piano opens out under the tune (step 4), the tune goes into octaves, a harp sweeps up into
    // every fourth bar, a soft drum and a cymbal mark the turn of each eight bars, and at the top the whole music lifts a fourth for eight bars in four
    grow: { chord4: 2, bassAt: 2, bassHalf: 3, pulse: 5, top: 4, deep: 4, cut: 0.05, swell: 0.02, quick: 0.03, hand: 4, gliss: 4, drum: 5, lift: 5, lifts: [0, 0, 5, 0],
      line: { voice: 'harp', c: -4, per: [0, 0, 0, 1, 1, 1], vel: 0.032 } },
  },
  { // the pond, E dorian that never quite settles, the celesta rings like rings on water, a flute a long way off, a low string drone. It grows by shimmer and depth.
    bpm: 50, beats: 4, sub: 3, root: 52, scale: SCALES.dorian, prog: [0, 3, 0, 6, 2, 3, 6, 0], barsPer: 1, wet: 0.7, jit: 0.02,
    pad: { cut: 620, gain: 0.016, lfo: true, att: 2.2, v: [[0, -1], [4, -1]], v4: [2, 0], vTop: [4, 0] }, bass: null,
    arp: { voice: 'celesta', oct: 1, vel: 0.03, ripple: true, pat: [[0, [0, 2, 3], 0.13], [6, [1, 3, 4], 0.13]], at0: [0] },
    mel: { voice: 'celesta', oct: 1, dens: 0.5, vel: 0.12 },
    tune: { bars: [
      [[0, 14, 3, 0.85], [3, 16, 3, 0.85], [6, 18, 6, 0.95]],
      [[0, 19, 3, 0.9], [3, 18, 3, 0.8], [6, 17, 6, 0.85]],
      [[0, 16, 3, 0.85], [3, 15, 3, 0.75], [6, 14, 3, 0.8], [9, 16, 3, 0.8]],
      [[0, 15, 12, 0.85]],
      [[0, 16, 3, 0.85], [3, 18, 3, 0.9], [6, 20, 6, 0.95]],
      [[0, 21, 6, 1], [6, 19, 3, 0.85], [9, 18, 3, 0.8]],
      [[0, 17, 6, 0.9], [6, 15, 3, 0.8], [9, 13, 3, 0.75]],
      [[0, 14, 12, 0.85]]] },
    answer: { at: 3, voice: 'flute', oct: -1, vel: 0.38 },
    layers: [{ at: 5, voice: 'flute', oct: -1, vel: 0.25 }],
    echo: { at: 4, voice: 'celesta', oct: 0, vel: 0.33, steps: 3 },
    far: { flute: 0.7 }, spark: { voice: 'celesta', p: 0.04, vel: 0.022, oct: 2 }, chime: 'celesta', wind: 0.014, birds: true, frogs: true,
    rhythms: [[0, 6], [0, 3, 6], [0, 6, 9], [0], [3, 6, 9], [0, 4, 8]],
    grow: { spark: 2, chord4: 2, air: 5, gliss: 5, top: 5, cut: 0.08, quick: 0.03,
      line: { voice: 'flute', c: 9, per: [0, 0, 0.5, 0.5, 0, 0], vel: 0.014, yieldTo: true },
      line2: { voice: 'strings', c: -5, per: [0, 0, 0, 1, 1, 1], vel: 0.026 } },
  },
];
for (const s of SCORES) if (s.tune) { s.tune.prog = s.prog; s.tune.spb = s.beats * s.sub; }
// Every painting has its own air. A theme is the world's score with some of its lines rewritten, key, pace, who accompanies.
// The world's lead keeps the tune unless a theme names another. Where a theme keeps the world's chords, the written tune plays in its key and pace.
// The music leans into it as the walker comes up to the easel and lets go again as she walks away.
const R8 = [[0, 2, 4, 6], [0, 3, 4], [0, 4, 6], [0, 6], [2, 4], [0]], R6 = [[0, 3], [0, 2, 3], [0, 3, 5], [0], [3, 4, 5], [0, 2, 3, 5]], RW = [[0, 2, 4], [0, 3, 4], [0, 4], [0, 1, 2, 4], [2, 4]];
const RUN8 = [[0, [0]], [1, [1]], [2, [2]], [3, [1]], [4, [3]], [5, [2]], [6, [1]], [7, [2]]], RUN6 = [[0, [0]], [1, [1]], [2, [2]], [3, [3]], [4, [2]], [5, [1]]], WALTZ = [[2, [1, 2]], [4, [1, 2]]];
// Written pieces of the painters' own years, played as their composers set them down: one tune, one accompaniment, nothing added.
// The first is entered here by hand, bar by bar: [beat, midi, beats long] for the tune (m), the chords (c, a list of notes) and the bass (b).
// The others come from 21_pieces.js, made by tools/pieces.mjs.
const PIECES = (() => {
  // Erik Satie, Gymnopédie No. 1 (1888), after the public domain edition of the Mutopia Project (Evin Robertson, from the Dover reprint)
  const T = (x, y, z) => [[0, x, 1], [1, y, 1], [2, z, 1]], H = (x, n) => [[0, x, n || 3]], A = [59, 62, 66], B = [57, 61, 66], C = (k) => [[1, k, 2]];
  const m = [[], [], [], [], [[1, 78, 1], [2, 81, 1]], T(79, 78, 73), T(71, 73, 74), H(69), H(66, 12), [], [], [], [[1, 78, 1], [2, 81, 1]], T(79, 78, 73), T(71, 73, 74), H(69),
    H(73), H(78), H(64, 9), [], [], T(69, 71, 72), T(76, 74, 71), T(74, 72, 71), H(74, 5), [[2, 74, 1]], T(76, 77, 79), T(81, 72, 74), T(76, 74, 71), H(74, 5), [[2, 74, 1]]];
  const c = []; for (let i = 0; i < 16; i++) c.push(C(i % 2 ? B : A));
  c.push(C(B), C(A), C([55, 59]), C([59, 62, 67]), C([53, 57, 62]), C([57, 60, 64]), C([55, 59, 64]), C([50, 55, 59, 64]), C([48, 52, 57, 62]), C([48, 54, 57, 62]), C([57, 60, 65]), C([57, 60, 64]), C([50, 55, 59, 64]), C([48, 52, 57, 62]), C([48, 54, 57, 62]));
  const b = []; for (let i = 0; i < 16; i++) b.push(H(i % 2 ? 38 : 43));
  b.push(H(42), H(35), H(40), H(40), H(38), H(33)); for (let i = 0; i < 9; i++) b.push(H(38));
  const last = [[1, [57, 62], 1], [2, [59, 62, 67], 1]], lastB = [[0, 40, 3], [1, 47, 1], [2, 52, 1]];
  const end1 = { m: [H(79), H(78), T(71, 69, 71), T(73, 74, 76), T(73, 74, 76), H(66), [], []], c: [C([59, 64, 67]), C(B), C(A), C([61, 64, 69]), C([57, 61, 66, 69]), last, [[0, [60, 64, 69, 72], 3]], [[0, [62, 66, 69, 74], 3]]],
    b: [H(40), H(42), H(35), H(40), H(40), lastB, [[0, 45, 3], [0, 55, 3]], [[0, 38, 3], [0, 45, 3], [0, 50, 3]]] };
  const end2 = { m: [H(79), H(77), T(71, 72, 77), T(76, 74, 72), T(76, 74, 72), H(65), [], []], c: [C([59, 64, 67]), C([57, 62, 65, 69]), C([57, 60, 65]), C([60, 64, 69]), C([57, 60, 65, 69]), last, [[0, [60, 64, 69, 72], 3]], [[0, [62, 65, 69, 74], 3]]],
    b: [H(40), H(40), H(40), H(40), H(40), lastB, [[0, 45, 3], [0, 55, 3]], [[0, 38, 3], [0, 45, 3], [0, 50, 3]]] };
  const bars = [];
  for (const e of [end1, end2]) { for (let i = 0; i < 31; i++) bars.push({ m: m[i], c: c[i], b: b[i] }); for (let i = 0; i < 8; i++) bars.push({ m: e.m[i], c: e.c[i], b: e.b[i] }); }
  // as a list of notes like the pieces of 21_pieces.js: [start, midi, length, loudness], in 24ths of a quarter
  const notes = [];
  bars.forEach((bar, i) => { const at = i * 72;
    for (const e of bar.b) notes.push([at + e[0] * 24, e[1], Math.max(e[2], 3 - e[0]) * 24 + 12, 4]);
    for (const e of bar.c) for (const mi of e[1]) notes.push([at + e[0] * 24, mi, e[2] * 24 + 8, 2]);
    for (const e of bar.m) notes.push([at + e[0] * 24, e[1], e[2] * 24 + 4, 8]); });
  return { gym1: { bpm: 72, len: bars.length * 72, notes } };
})();
// What each world plays, and the key it is in (for the harp that marks a catch). Take a line out and that world plays its generated score again.
const PLAYS = [
  ['gym1', 50, SCALES.major],        // the coast at dawn: Satie, Gymnopédie No. 1, D major
  ['arabesque1', 52, SCALES.major],  // a day out at Argenteuil: Debussy, Première Arabesque, E major
  ['clair', 49, SCALES.major],       // the fields of Giverny: Debussy, Clair de lune, D flat major
  ['gym3', 57, SCALES.minor],        // the water lily pond: Satie, Gymnopédie No. 3, A minor
];
const THEMES = {
  // the coast
  c1: { bpm: 58, pad: { cut: 640, gain: 0.013 }, arp: { voice: 'piano', oct: -1, vel: 0.045, pat: [[0, [0]], [2, [3]], [4, [4]], [6, [3]]] }, spark: null, wind: 0.085, gulls: false },
  c2: { bpm: 88, beats: 3, sub: 2, root: 55, scale: SCALES.major, prog: [0, 3, 4, 0, 5, 3, 4, 0], pad: { cut: 1100, gain: 0.009 }, bass: 'piano', bassVel: 0.042, arp: { voice: 'piano', oct: 0, vel: 0.036, pat: WALTZ }, mel: { dens: 0.62 }, spark: { voice: 'bell', p: 0.06, vel: 0.022, oct: 2 }, wind: 0.03, rhythms: RW },
  c3: { bpm: 72, root: 57, scale: SCALES.major, penta: true, prog: [0, 3, 0, 4, 5, 3, 1, 4], pad: { cut: 1000, gain: 0.011 }, arp: { voice: 'piano', oct: -1, vel: 0.042, pat: RUN8 }, mel: { dens: 0.55 }, wind: 0.1, windLevel: 0.02, rhythms: R8 },
  c4: { bpm: 60, scale: SCALES.major, prog: [0, 4, 5, 3, 0, 3, 4, 0], pad: { cut: 1000, gain: 0.013 }, arp: { voice: 'piano', oct: -1, vel: 0.045, pat: [[0, [0]], [2, [2]], [4, [4]], [6, [2]]] }, mel: { dens: 0.55 }, wind: 0.06, rhythms: R8 },
  c5: { bpm: 50, scale: SCALES.mixo, prog: [0, 6, 3, 0, 4, 6, 3, 0], pad: { cut: 1250, gain: 0.014, lfo: true }, arp: { voice: 'piano', oct: -1, vel: 0.045, pat: [[0, [0]], [3, [3]], [6, [4]]] }, mel: { dens: 0.45, fall: true }, spark: { voice: 'piano', p: 0.06, vel: 0.026, oct: 2 }, wind: 0.05, gulls: false, rhythms: R8 },
  // Argenteuil
  a1: { bpm: 104, spark: { voice: 'harp', p: 0.1, vel: 0.026, oct: 2 } },
  a2: { bpm: 84, root: 60, scale: SCALES.lydian, penta: false, prog: [0, 1, 0, 4, 2, 1, 0, 4], pad: { cut: 1100, gain: 0.008 }, arp: { voice: 'harp', oct: -1, vel: 0.048, pat: [[0, [0]], [2, [2]], [3, [3]], [5, [4]]] }, mel: { dens: 0.5 }, spark: { voice: 'bell', p: 0.08, vel: 0.022, oct: 3 }, wind: 0.06 },
  a3: { bpm: 90, beats: 4, sub: 2, prog: [0, 4, 5, 3, 0, 3, 4, 0], arp: { voice: 'harp', oct: -1, vel: 0.045, pat: [[0, [0]], [2, [2]], [4, [3]], [6, [2]]] }, mel: { dens: 0.58 }, rhythms: R8 },
  a4: { bpm: 76, root: 52, scale: SCALES.minor, penta: false, prog: [0, 5, 3, 4, 0, 5, 2, 4], pad: { cut: 760, gain: 0.011 }, arp: { voice: 'harp', oct: -1, vel: 0.046, pat: RUN6 }, mel: { dens: 0.5, fall: true }, spark: null, birds: false, wind: 0.035 },
  a5: { bpm: 80, scale: SCALES.mixo, penta: false, prog: [0, 6, 3, 0, 4, 6, 3, 0], pad: { cut: 1000, gain: 0.011, lfo: true }, arp: { voice: 'harp', oct: -1, vel: 0.044, pat: RUN6 }, mel: { dens: 0.45 }, spark: { voice: 'harp', p: 0.06, vel: 0.024, oct: 2 } },
  // the fields
  f1: {},
  f2: { bpm: 56, root: 54, scale: SCALES.minor, penta: false, prog: [0, 5, 3, 4, 0, 5, 2, 4], pad: { cut: 800, gain: 0.007 }, mel: { dens: 0.5, fall: true }, birds: false },
  f3: { bpm: 60, scale: SCALES.lydian, penta: false, prog: [0, 1, 0, 4, 2, 1, 0, 4], pad: { cut: 900, gain: 0.006 }, arp: { voice: 'pluck', oct: 0, vel: 0.032, pat: [[0, [0]], [2, [2]], [4, [3]]] }, mel: { dens: 0.45 }, spark: { voice: 'harp', p: 0.1, vel: 0.024, oct: 2 }, birds: false, wind: 0.05 },
  f4: { bpm: 56, pad: { cut: 820, gain: 0.007 }, birds: false },
  f5: { bpm: 48, scale: SCALES.dorian, penta: false, prog: [0, 3, 0, 6, 0, 3, 2, 6], pad: { cut: 720, gain: 0.008 }, mel: { dens: 0.4 }, spark: null, birds: false, wind: 0.06 },
  f6: { bpm: 76, beats: 4, sub: 2, root: 50, prog: [0, 3, 0, 4, 5, 3, 1, 4], pad: { cut: 860 }, arp: { voice: 'pluck', oct: 0, vel: 0.034, pat: RUN8 }, mel: { dens: 0.6 }, wind: 0.05, rhythms: R8 },
  f7: { bpm: 60, root: 59, scale: SCALES.dorian, penta: false, prog: [0, 3, 0, 6, 2, 6, 3, 0], pad: { cut: 780 }, arp: { voice: 'pluck', oct: 0, vel: 0.032, pat: [[0, [0]], [2, [1]], [4, [2]]] }, mel: { dens: 0.5, fall: true }, spark: null, birds: false, wind: 0.05 },
  f8: { bpm: 52, root: 50, scale: SCALES.lydian, penta: false, prog: [0, 1, 0, 4, 2, 1, 0, 4], pad: { cut: 800, gain: 0.007 }, mel: { dens: 0.4 }, birds: false },
  // the pond
  p1: { bpm: 54, scale: SCALES.major, penta: true, prog: [0, 3, 0, 4, 5, 3, 1, 4], arp: { voice: 'celesta', oct: 1, vel: 0.028, ripple: true, pat: [[0, [0, 2, 3], 0.12], [4, [1]], [6, [2, 3, 4], 0.12], [10, [3]]] }, mel: { dens: 0.5 }, frogs: false },
  p2: { bpm: 84, beats: 3, sub: 2, root: 57, scale: SCALES.major, prog: [0, 3, 4, 0, 5, 3, 4, 0], pad: { cut: 1100 }, arp: { voice: 'celesta', oct: 1, vel: 0.03, pat: WALTZ }, mel: { dens: 0.6 }, spark: { voice: 'bell', p: 0.08, vel: 0.022, oct: 3 }, rhythms: RW },
  p3: { bpm: 46, scale: SCALES.lydian, prog: [0, 1, 0, 4, 2, 1, 0, 4], pad: { cut: 800, gain: 0.013 }, arp: { voice: 'celesta', oct: 1, vel: 0.03, ripple: true, pat: [[0, [0, 2, 3, 4], 0.1], [6, [1, 3], 0.14]] }, mel: { dens: 0.42 }, spark: { voice: 'bell', p: 0.14, vel: 0.024, oct: 3 } },
  p4: { bpm: 46, pad: { cut: 750, gain: 0.015 }, arp: { voice: 'celesta', oct: 1, vel: 0.026, ripple: true, pat: [[0, [0, 2], 0.16], [9, [3]]] } },
  p5: { bpm: 46, scale: SCALES.mixo, prog: [0, 6, 3, 0, 4, 6, 3, 0], pad: { cut: 1000, gain: 0.014, lfo: true }, mel: { voice: 'flute', vel: 0.06, dens: 0.45, fall: true }, spark: { voice: 'celesta', p: 0.06, vel: 0.022, oct: 2 }, birds: false },
  p6: { bpm: 42, scale: SCALES.phrygian, prog: [0, 1, 0, 6, 3, 1, 0, 6], pad: { cut: 480, gain: 0.016, lfo: true }, arp: { voice: 'celesta', oct: 0, vel: 0.03, ripple: true, pat: [[0, [0, 2], 0.14], [6, [1, 3], 0.14]] }, mel: { dens: 0.4, fall: true }, spark: null, birds: false, frogs: false, wind: 0.03 },
  p7: { bpm: 48, scale: SCALES.major, penta: true, prog: [0, 3, 0, 4, 5, 3, 1, 4], pad: { cut: 800 }, mel: { voice: 'flute', vel: 0.06, dens: 0.45 }, spark: { voice: 'celesta', p: 0.06, vel: 0.022, oct: 3 } },
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

PLAYS.forEach((p, i) => { if (p && SCORES[i]) Object.assign(SCORES[i], { piece: p[0], grand: true, home: { root: p[1], scale: p[2] } }); });
class Music {
  constructor() { this.ctx = null; this.vol = 0.75; this.group = null; this.level = 0; this.idx = -1; this.rnd = mulberry32(8811); this.muted = false; this.night = 0; this.inten = 1; this.intenWant = 1; this.useInten = false; this.old = []; this.cur = null; this.slots = new Float64Array(44); }
  ok() { return !!this.ctx; }
  // call from a click; pass a context only for offline tests
  start(given) {
    if (this.ctx) return; // (made once. What wakes it is wake, from a touch or from the watch)
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC && !given) return;
      const ctx = this.ctx = given || new AC(); this.offline = !!given;
      this.master = ctx.createGain(); this.master.gain.value = this.vol * 1.5;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.3;
      this.master.connect(comp); comp.connect(ctx.destination);
      // reverb from a generated impulse
      const len = Math.floor(ctx.sampleRate * 3.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c); let lp = 0;
        for (let i = 0; i < len; i++) { const t = i / ctx.sampleRate; lp += ((this.rnd() * 2 - 1) - lp) * 0.32; d[i] = lp * Math.pow(1 - i / len, 1.6) * Math.exp(-t * 1.6); }
      }
      this.rev = ctx.createConvolver(); this.rev.buffer = ir;
      this.revGain = ctx.createGain(); this.revGain.gain.value = 0.85;
      this.rev.connect(this.revGain); this.revGain.connect(this.master);
      const nlen = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, nlen, ctx.sampleRate);
      const nd = this.noise.getChannelData(0); for (let i = 0; i < nlen; i++) nd[i] = this.rnd() * 2 - 1;
      // the two halves of an equal power cross fade, made once
      this.cUp = new Float32Array(48); this.cDown = new Float32Array(48);
      for (let i = 0; i < 48; i++) { const k = i / 47; this.cUp[i] = Math.max(0.0001, Math.sin(k * Math.PI / 2)); this.cDown[i] = Math.max(0.0001, Math.cos(k * Math.PI / 2)); }
      if (!given) {
        this.timer = setInterval(() => this.tick(), 70);
        if (!this.listening) { // (once: a context made anew later is looked after by the same listeners)
          this.listening = true;
          document.addEventListener('visibilitychange', () => { if (document.hidden) this.away(); else this.back(); });
          window.addEventListener('pageshow', () => this.back());
        }
      }
    } catch (e) { this.ctx = null; }
  }
  // the recorded piano: fetched once in the background, decoded, and kept (the notes are named by their place on the keyboard)
  loadPiano(base) {
    if (this.pnoAsked || !this.ctx || typeof fetch !== 'function' || location.protocol === 'file:') return; this.pnoAsked = true; // (a page opened from a folder may not fetch: the felt piano plays there)
    const N = { A1: 33, Ds2: 39, A2: 45, Ds3: 51, A3: 57, Ds4: 63, A4: 69, Ds5: 75, A5: 81, Ds6: 87 }, ctx = this.ctx;
    Promise.all(Object.keys(N).map((k) => fetch((base || 'snd/') + 'piano-' + k + '.mp3').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('no file')))).then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej))).then((buf) => ({ midi: N[k], buf }))))
      .then((list) => this.setPiano(list)).catch(() => { this.pnoAsked = false; /* the felt piano plays on */ });
  }
  setPiano(list) { // each note at the same peak, so that none stands out
    for (const x of list) { const d = x.buf.getChannelData(0); let pk = 0; for (let i = 0; i < d.length; i += 3) { const v = Math.abs(d[i]); if (v > pk) pk = v; } x.k = 0.5 / Math.max(0.05, pk); }
    this.pno = list.sort((a, b) => a.midi - b.midi);
  }
  // ----- keeping the sound alive on phones -----
  // A phone that locks its screen, takes a call or goes to another app cuts the sound off, and does not always give it back. The context may
  // stay asleep or "interrupted". Or, on iPhones, it says that it runs while its clock stands still and nothing is heard: that is what a
  // resume() in the very moment the page comes back can leave behind, and no later resume() mends it, since it "runs" already.
  // So the clock is watched (from the timer of the music). Asleep, it is asked to wake, a moment after the page is back and a few times more.
  // Running with a clock that stands still, it is put to sleep and woken again, which is what brings it back there. What neither mends is
  // marked dead, and made anew at her next touch (renew).
  away() { // the page is hidden: the music stops with it
    const c = this.ctx; this.hid = true;
    if (!c || c.state === 'closed') return;
    try { const p = c.suspend(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* the phone has stopped it already */ }
  }
  back() { // the page is seen again: the watch begins afresh, and wakes it in a moment
    const now = performance.now();
    if (this.hid) this.came = true; // (her first touch after it puts an iPhone's context to sleep and wakes it once, see the interface)
    this.hid = false; this.backAt = now; this.seenW = now; this.seenS = ''; this.askAt = 0; this.asks = 0; this.kicks = 0; this.touches = 0; this.stuck = false; this.spent = false;
    // (the timer of the music may still be running slow from the time the page was hidden: the first look is taken by a timer of its own)
    if (this.ctx) { setTimeout(() => this.watch(), 280); setTimeout(() => this.watch(), 1250); }
  }
  watch() {
    const c = this.ctx, now = performance.now();
    if (!c || c.state === 'closed' || document.hidden) { this.watchW = now; return; }
    if (now - (this.watchW || now) > 1500) { this.hid = true; this.back(); } // (a page that a phone froze without a word is back when its timer runs again)
    this.watchW = now;
    const st = c.state, t = c.currentTime;
    if (st !== this.seenS) { this.seenS = st; this.seenW = now; } // a change of state is given a moment before it is judged
    if (st === 'running') {
      if (t !== this.seenT) { this.seenT = t; this.seenW = now; this.ran = true; this.asks = 0; this.kicks = 0; this.touches = 0; this.stuck = false; this.dead = false; return; } // it plays
      // it says it runs, and its clock stands still. (Only a context that has played before is judged so, and patiently: one that is
      // slow to begin, over a wireless headset say, must not be put to sleep for it)
      const still = now - this.seenW;
      if (!this.ran || this.spent) return;
      this.stuck = still > 1800;
      if (still > 1200 && now - (this.kickAt || 0) > 2200) { if ((this.kicks || 0) >= 2) this.dead = true; else this.kick(); }
      return;
    }
    this.stuck = false;
    // asleep or cut off. (Before it has ever played only a touch may wake it: a browser's rule, and asking would only fill its console)
    if (this.ran && (this.asks || 0) < 6 && now - (this.backAt || 0) > 250 && now - (this.askAt || 0) > 900) { this.askAt = now; this.asks = (this.asks || 0) + 1; this.wake(); }
    if (this.ran && !this.spent && (this.touches || 0) >= 3 && now - (this.touch0 || now) > 3000) this.dead = true; // it has played, she has touched the page again and again, and it sleeps on
  }
  // asked to run: by the watch, and from inside a touch (touch true), which is the one place a phone hears it at first
  wake(touch) {
    const c = this.ctx, now = performance.now();
    if (!c || c.state === 'closed' || c.state === 'running' || now < (this.kickUntil || 0)) return;
    if (touch && now - (this.touchAt || 0) > 600) { this.touchAt = now; this.touches = (this.touches || 0) + 1; if (this.touches === 1) this.touch0 = now; }
    try { const p = c.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* the next ask tries again */ }
  }
  // put to sleep and woken a moment later
  kick() {
    const c = this.ctx, now = performance.now();
    if (!c || c.state === 'closed' || now < (this.kickUntil || 0)) return;
    this.kickAt = now; this.kickUntil = now + 250; this.kicks = (this.kicks || 0) + 1;
    try { const p = c.suspend(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* woken all the same */ }
    // (woken whatever it says by then: a context in that state may never own up to having slept)
    setTimeout(() => { if (this.ctx !== c) return; this.kickUntil = 0; this.seenW = performance.now(); try { const p = c.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* the watch asks again */ } }, 230);
  }
  // A context that nothing wakes is left behind and a new one made in its place. Called from inside a touch, where a phone lets a context begin.
  // The music takes up the world it was in. The game brings back the painting's air, the night and the step, as it does every frame
  renew() {
    const old = this.ctx, now = performance.now();
    this.dead = false; this.kicks = 0; this.touches = 0;
    if (!old) return false;
    if ((this.renews || 0) >= 2) { this.spent = true; this.stuck = false; return false; } // twice is enough: after that it is left as it is until the page has been away again
    if (now - (this.renewAt || 0) < 8000) return false;
    this.stuck = false;
    this.renews = (this.renews || 0) + 1; this.renewAt = now;
    const idx = this.idx, level = this.level;
    clearInterval(this.timer);
    // (cut from its output first: should it wake after all, on a phone that would not close it, nothing of it is heard beside the new one)
    try { this.master.disconnect(); this.rev.disconnect(); } catch (e) { /* gone already */ }
    try { const q = old.suspend(); if (q && q.catch) q.catch(() => {}); } catch (e) { /* asleep already */ }
    try { const p = old.close(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* let go either way */ }
    this.ctx = null; this.group = null; this.old = []; this.cur = null; this.playList = null; this.W = null; this.rush = null; this.idx = -1; this.themeId = null;
    this.slots.fill(0); this.ran = false; this.seenS = ''; this.seenT = -1; this.seenW = now; this.asks = 0; this.kickUntil = 0;
    this.start();
    if (!this.ctx) return false;
    if (idx >= 0) this.setChapter(idx, level, 1.5);
    return true;
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : v * 1.5, this.ctx.currentTime, 0.05); }
  setLevel(k) { if (k === this.level) return; this.level = k; if (this.group) this.group.windGain && this.setWind(); }
  setNight(n) { this.night = n; }
  // how much of this world's light she has gathered, from 0 to 1. The music grows with it in six steps. It moves one step at a time, each on a bar line.
  // 0 the ground and fragments of the theme, 1 the whole theme, 2 fuller chords and sparks, 3 the bass answers and the first held line enters,
  // 4 and 5 each world's own way of rising (see grow and layers in SCORES), at 5 the theme in octaves and a little faster
  setIntensity(x) { this.useInten = true; this.intenWant = x <= 0 ? 0 : x >= 1 ? 5 : 1 + Math.min(3, Math.floor(x * 4 + 1e-6)); }
  trimFor(I) { return 1 - 0.03 * Math.max(0, I - 4); }
  heat() { return this.useInten && this.group ? Math.max(0, this.group.I) : 0; }
  setWind() {
    const g = this.group, s = g.score;
    g.windGain.gain.setTargetAtTime((s.wind || 0) + (s.windLevel || 0) * this.level, this.ctx.currentTime, 1.5);
  }
  setChapter(idx, level, fade) {
    const same = idx === this.idx;
    this.idx = idx; this.level = level; this.themeId = null;
    if (!this.ctx) return;
    if (!this.offline) this.loadPiano();
    // asked twice for the world already playing (the game and the interface both ask at the start): let it go on
    if (same && this.group && this.group.score === SCORES[idx]) return;
    // a new world begins on its ground alone, whatever the last one had grown to, and grows again with her pictures (one step a bar)
    let I0 = this.group ? this.group.I : 0;
    if (!same) { I0 = 0; if (this.useInten) this.intenWant = 0; }
    const prev = this.group ? this.group.score : null;
    this.play(SCORES[idx], fade, I0);
    if (prev && !same && (fade || 3) >= 4 && !prev.piece && !SCORES[idx].piece) this.bridge(prev, SCORES[idx], fade);
  }
  // the world's score with a painting's theme laid over it. The pad and the melody keep what the theme does not change
  themed(base, T) {
    const s = Object.assign({}, base, T);
    if (T.mel) s.mel = Object.assign({}, base.mel, T.mel);
    if (T.pad) s.pad = Object.assign({}, base.pad, T.pad);
    return s;
  }
  // lean into the air of one painting, or (with nothing) back to the world's own music
  setTheme(id, fade) {
    id = id && THEMES[id] ? id : null;
    if (id === (this.themeId || null)) return;
    this.themeId = id;
    if (!this.ctx || this.idx < 0) return;
    const base = SCORES[this.idx];
    if (base.piece) return; // a written piece plays on as it is at an easel
    this.play(id ? this.themed(base, THEMES[id]) : base, fade || 3.2, this.group ? this.group.I : 0);
  }
  // the fade of one group, on both its outputs (the near one and the far one that goes to the reverb alone)
  fadeOut(o, now, fade, quick) {
    const k = Math.min(1, Math.max(0, (now - o.inAt) / o.inDur)), v0 = Math.max(0.0001, Math.sin(k * Math.PI / 2) * (o.lvl || 1));
    for (const p of [o.out.gain, o.xout.gain]) {
      try { if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now); else { p.cancelScheduledValues(now); p.setValueAtTime(v0, now); } } catch (e) { /* nothing was scheduled */ }
      if (quick) { p.setTargetAtTime(0.0001, now + 0.005, 0.25); continue; }
      try { const c = v0 >= 0.999 ? this.cDown : this.cDown.map((x) => Math.max(0.0001, x * v0)); p.setValueCurveAtTime(c, now + 0.005, fade); } catch (e) { p.setTargetAtTime(0.0001, now + 0.005, fade / 3); }
    }
  }
  play(score, fade, I0) {
    const ctx = this.ctx, now = ctx.currentTime; fade = fade || 3;
    // asked again before the music last asked for has played a note (she is dithering at the edge of an easel): give it the new score in place
    const y = this.group;
    if (y && y.step === 0 && now - y.inAt < 2 && !y.score.sea === !score.sea) {
      y.score = score; y.stepDur = score.piece && this.pieceOf(score.piece) ? 60 / this.pieceOf(score.piece).bpm : 60 / score.bpm / score.sub; y.section = null; y.tAt = -1; y.send.gain.setTargetAtTime(score.wet || 0.5, now, 0.3); this.setWind();
      return;
    }
    if (this.group) {
      // the old music plays on while it fades, so that the two really cross
      const old = this.group, cut = !!(old.score.piece || score.piece); // (two written pieces must not be heard together: the old one strikes no more notes and rings out)
      this.fadeOut(old, now, cut ? Math.min(fade, 2.5) : fade, false);
      old.endAt = cut ? now : now + fade;
      this.old.push(old);
      while (this.old.length > 2) { const o = this.old.shift(); o.endAt = Math.min(o.endAt, now); this.fadeOut(o, now, 0, true); }
    }
    const out = ctx.createGain(), xout = ctx.createGain();
    for (const p of [out.gain, xout.gain]) { p.setValueAtTime(0.0001, now); try { p.setValueCurveAtTime(this.cUp, now + 0.005, fade); } catch (e) { p.linearRampToValueAtTime(1, now + fade); } }
    // trim keeps the fullest steps from pressing on the master: the growth is in the voices, not in sheer level
    const trim = ctx.createGain(), I1 = Math.max(0, I0 || 0); trim.gain.value = this.trimFor(I1);
    const send = ctx.createGain(); send.gain.value = score.wet || 0.5;
    out.connect(trim); trim.connect(this.master); trim.connect(send); send.connect(this.rev); xout.connect(this.rev);
    // wind bed (and on the coast the slow breath of the sea in it)
    const wind = ctx.createBufferSource(); wind.buffer = this.noise; wind.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = score.sea ? 340 : 420; bp.Q.value = 0.5;
    const windGain = ctx.createGain(); windGain.gain.value = 0;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = ctx.createGain(); lg.gain.value = 180;
    lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    const lfos = [lfo];
    if (score.sea) {
      const sw = ctx.createGain(); sw.gain.value = 0.62; const sl = ctx.createOscillator(); sl.frequency.value = 0.075; const sd = ctx.createGain(); sd.gain.value = 0.38;
      sl.connect(sd); sd.connect(sw.gain); sl.start(); lfos.push(sl);
      wind.connect(bp); bp.connect(sw); sw.connect(windGain);
    } else { wind.connect(bp); bp.connect(windGain); }
    windGain.connect(out); wind.start();
    const stepDur = score.piece && this.pieceOf(score.piece) ? 60 / this.pieceOf(score.piece).bpm : 60 / score.bpm / score.sub;
    this.group = { score, out, xout, trim, send, wind, lfos, windGain, vb: {}, step: 0, next: now + Math.min(fade * 0.4, 1.5), stepDur, section: null, sectionAt: -1, tAt: -1, tNotes: null, tKind: 'none', lastMel: 9, I: I1, inAt: now, inDur: fade, lvl: 1, endAt: 1e9 };
    this.inten = this.group.I;
    this.setWind();
  }
  // a held tone that both keys share, under the change of world, so that the music never quite stops
  bridge(a, b, fade) {
    try {
      const ctx = this.ctx, t = ctx.currentTime + 0.05, pcs = a.scale.map((x) => (a.root + x) % 12);
      let m = -1;
      for (const d of [0, 4, 2]) { const k = this.deg(b, d, 0); if (pcs.indexOf(k % 12) >= 0) { m = k; break; } }
      if (m < 0) return;
      while (m < 57) m += 12;
      const e = ctx.createGain(), hold = fade * 0.55, end = t + fade + 2.6;
      e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.03, t + hold); e.gain.setValueAtTime(0.03, t + fade * 0.8); e.gain.linearRampToValueAtTime(0.0001, end);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.5;
      const sd = ctx.createGain(); sd.gain.value = 0.6;
      lp.connect(e); e.connect(this.master); e.connect(sd); sd.connect(this.rev);
      const f = mtof(m), w = this.wave('bow');
      this.osc(w, f, t, end - t, lp, 6); this.osc(w, f, t, end - t, lp, -6); this.osc('triangle', f / 2, t, end - t, lp);
    } catch (e) { /* the cross fade alone is enough */ }
  }
  // ----- voices -----
  bus() { return (this.cur || this.group).out; }
  // one spectrum per timbre, made once per context
  wave(name) {
    const W = this.W || (this.W = {});
    if (W[name]) return W[name];
    const A = Music.WAVES[name], re = new Float32Array(A.length + 1), im = new Float32Array(A.length + 1);
    for (let i = 0; i < A.length; i++) im[i + 1] = A[i];
    return (W[name] = this.ctx.createPeriodicWave(re, im));
  }
  // where a voice sits: its place in the stereo field and, for the bowed and blown ones, the body that colours it (filters that stay put whatever the note)
  vout(voice, midi) {
    const g = this.cur || this.group, key = voice === 'piano' ? (midi < 62 ? 'pianoL' : 'pianoH') : voice, vb = g.vb || (g.vb = {});
    if (vb[key]) return vb[key];
    const ctx = this.ctx, B = Music.BUS[key] || {}, head = ctx.createGain(); head.gain.value = (B.gain || 1) * Music.LIFT;
    let last = head;
    const add = (n) => { last.connect(n); last = n; };
    for (const q of B.eq || []) { const f = ctx.createBiquadFilter(); f.type = 'peaking'; f.frequency.value = q[0]; f.gain.value = q[1]; f.Q.value = q[2]; add(f); }
    if (B.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = B.lp; f.Q.value = 0.5; add(f); }
    if (B.hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = B.hp; f.Q.value = 0.5; add(f); }
    const far = g.score.far && g.score.far[key];
    if (far) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600; f.Q.value = 0.4; add(f); const x = ctx.createGain(); x.gain.value = far; f.connect(x); x.connect(g.xout); }
    if (B.swell) { // the bellows: a slow breath in the loudness
      const l = ctx.createOscillator(); l.frequency.value = B.swell[0]; const lg = ctx.createGain(); lg.gain.value = B.swell[1] * Music.LIFT; l.connect(lg); lg.connect(head.gain); l.start(); g.lfos.push(l);
    }
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = B.pan || 0; add(p); }
    last.connect(g.out);
    vb[key] = head;
    return head;
  }
  // a bounded number of notes sound at once (phones run this). The tune always finds a place, the rest wait for one
  claim(t, end, hi) {
    const S = this.slots; let j = 0;
    for (let i = 0; i < S.length; i++) { if (S[i] <= t) { S[i] = end; return true; } if (S[i] < S[j]) j = i; }
    if (!hi) return false;
    S[j] = end; return true;
  }
  env(t, peak, a, d1, s, dur) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(peak * s, 0.0002), t + a + d1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  }
  osc(type, f, t, dur, dest, detune) {
    const o = this.ctx.createOscillator();
    if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.value = Math.min(f, 16000); if (detune) o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  // a short burst of the noise buffer through a band pass: hammers, breath, the click of a celesta
  burst(t, f, q, peak, tau, dest, len, type) {
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = type || 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    // the gain starts at 0, not 1: a start between two samples must not let one sample of noise through at full gain
    const e = ctx.createGain(); e.gain.value = 0; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(peak, t + 0.0015); e.gain.setTargetAtTime(0, t + 0.002, tau);
    src.connect(bp); bp.connect(e); e.connect(dest); src.start(t, this.rnd() * 1.5, len);
    return e;
  }
  // a vibrato that comes in after the start of the note (depth in cents)
  vib(t, rate, cents, from, full, end, targets) {
    const ctx = this.ctx, l = ctx.createOscillator(); l.frequency.value = rate;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.setValueAtTime(0, t + from); g.gain.linearRampToValueAtTime(cents, t + full);
    l.connect(g); for (const o of targets) g.connect(o.detune);
    l.start(t); l.stop(end);
  }
  // len (optional) is how long the key is held (piano, with the pedal), or how long a held voice sounds. hi marks a note of the tune
  note(voice, t, midi, vel, len, hi) {
    if (this.cur && this.cur.shift) midi += this.cur.shift; // (a group can lift its whole music into another key for a while)
    const ctx = this.ctx, f = mtof(midi), r = this.rnd;
    // the other modules (the living world, the folk, the chimes) were balanced against the voices before the lift: they keep their level
    if (!this.cur) vel /= Music.LIFT;
    if (voice === 'piano' && this.pno && this.cur && this.cur.score.grand) {
      // a real grand (recorded notes a tritone apart, each played a little higher or lower): the worlds that ask for it, once the notes have come
      let S = this.pno[0]; for (const x of this.pno) if (Math.abs(x.midi - midi) < Math.abs(S.midi - midi)) S = x;
      const rate = Math.pow(2, (midi - S.midi) / 12), nat = S.buf.duration / rate, vn = clamp(vel / 0.09, 0.25, 1.8);
      const damp = len ? t + Math.max(0.2, len) : t + nat, end = Math.min(damp + 0.9, t + nat);
      if (!this.claim(t, Math.min(end, t + 3.5), hi)) return;
      const src = ctx.createBufferSource(); src.buffer = S.buf; src.playbackRate.value = rate;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.3; lp.frequency.value = Math.min(16000, f * (2.5 + 5 * vn) + 900); // struck softly it is darker
      const e = ctx.createGain(), pk = vel * 2.3 * S.k; e.gain.setValueAtTime(pk, t); e.gain.setTargetAtTime(0, Math.max(damp, t + 0.05), 0.22);
      src.connect(lp); lp.connect(e); e.connect(this.vout('piano', midi));
      src.start(t); src.stop(end + 0.05);
    } else if (voice === 'piano') {
      // a soft felt piano: a mellow body that rings on and a brighter strike that dies within a third of a second, partials a little stretched,
      // two strings a breath apart, a touch of hammer, brighter when struck harder, quicker to fade when high
      const vn = clamp(vel / 0.09, 0.25, 1.6), tau = clamp(2.6 * Math.pow(2, -(midi - 60) / 17), 0.45, 5.5);
      const damp = len ? t + Math.max(0.15, len) : t + 5 * tau, end = Math.min(damp + 0.5, t + 0.02 + 5 * tau);
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('piano', midi), pk = vel * 0.95;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.3;
      lp.frequency.setValueAtTime(Math.min(11000, f * (2 + 3.6 * vn) + 500), t); lp.frequency.setTargetAtTime(Math.min(6000, f * 1.3 + 250), t + 0.01, Math.min(0.4, tau * 0.25));
      const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(pk, t + 0.004); e.gain.setTargetAtTime(pk * 0.5, t + 0.004, 0.2);
      if (damp > t + 0.5) e.gain.setTargetAtTime(0, t + 0.5, tau);
      e.gain.setTargetAtTime(0, Math.max(damp, t + 0.02), 0.1);
      lp.connect(e); e.connect(out);
      const w = this.wave('pm'), a = ctx.createGain(); a.gain.value = midi > 47 && midi < 85 ? 0.62 : 1; a.connect(lp);
      this.osc(w, f, t, end - t, a);
      if (midi > 47 && midi < 85) { const b = ctx.createGain(); b.gain.value = 0.42; b.connect(lp); this.osc(w, f, t, end - t, b, 1.6 + r() * 0.8); }
      const eb = ctx.createGain(), bt = clamp(0.075 * Math.pow(2, -(midi - 60) / 30), 0.035, 0.14);
      eb.gain.setValueAtTime(0, t); eb.gain.linearRampToValueAtTime(pk * (0.22 + 0.32 * vn), t + 0.003); eb.gain.setTargetAtTime(0, t + 0.004, bt);
      eb.connect(out); this.osc(this.wave('pb'), f, t, Math.min(end - t, 6 * bt + 0.05), eb, 2 + (midi - 60) * 0.05);
      this.burst(t, clamp(f * 3, 700, 4200), 0.9, pk * 0.12 * vn, 0.006, out, 0.04);
    } else if (voice === 'harp') {
      // a plucked string: bright at first, mellowing within a few hundred ms, longer in the bass, no sustain, the pitch settling as it is let go
      const tau = clamp(1.25 * Math.pow(2, -(midi - 55) / 16), 0.22, 2.6), end = t + 4.5 * tau;
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('harp');
      const o = ctx.createOscillator(); o.setPeriodicWave(this.wave('harp')); o.frequency.setValueAtTime(f * 1.006, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.4; lp.frequency.setValueAtTime(Math.min(10000, f * 9 + 800), t); lp.frequency.setTargetAtTime(f * 2.2 + 300, t + 0.005, 0.13);
      const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel, t + 0.0025); e.gain.setTargetAtTime(0, t + 0.003, tau);
      o.connect(lp); lp.connect(e); e.connect(out); o.start(t); o.stop(end);
    } else if (voice === 'pluck') {
      // a pizzicato: shorter and darker than the harp
      const tau = clamp(0.55 * Math.pow(2, -(midi - 48) / 18), 0.14, 0.9), end = t + 4.5 * tau;
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('pluck');
      const o = ctx.createOscillator(); o.setPeriodicWave(this.wave('pizz')); o.frequency.setValueAtTime(f * 1.012, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.setValueAtTime(Math.min(8000, f * 5 + 500), t); lp.frequency.setTargetAtTime(f * 1.6 + 200, t + 0.005, 0.07);
      const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel * 1.1, t + 0.003); e.gain.setTargetAtTime(0, t + 0.004, tau);
      o.connect(lp); lp.connect(e); e.connect(out); o.start(t); o.stop(end);
    } else if (voice === 'accordion') {
      // two reeds a few cents apart (the French musette), slow to speak, a low pass that opens with the push of the bellows
      const L = clamp(len || 0.8, 0.12, 6), a = 0.06, end = t + L + 0.4, vn = clamp(vel / 0.07, 0.3, 1.6);
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('accordion'), w = this.wave('reed');
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
      const lo = f * 1.2 + 250, op = Math.min(9000, f * (2 + 3 * vn) + 700);
      lp.frequency.setValueAtTime(lo, t); lp.frequency.linearRampToValueAtTime(op, t + a * 1.4); lp.frequency.setValueAtTime(op, t + L); lp.frequency.setTargetAtTime(lo, t + L, 0.06);
      const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel * 0.52, t + a); e.gain.linearRampToValueAtTime(vel * 0.56, t + Math.max(a + 0.02, L * 0.7)); e.gain.setTargetAtTime(0, t + L, 0.06);
      lp.connect(e); e.connect(out);
      this.osc(w, f, t, end - t, lp, -3); this.osc(w, f, t, end - t, lp, 11 + r() * 3);
    } else if (voice === 'cello') {
      // one player: a bowed spectrum through the body of the instrument (on its bus), a bowed attack, vibrato that comes in late,
      // and a little slide up or down from the last note when it is joined to it
      const L = clamp(len || 1.5, 0.2, 9), a = clamp(0.09 + L * 0.04, 0.09, 0.2), end = t + L + 0.7;
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('cello'), g = this.cur || this.group, o = ctx.createOscillator(); o.setPeriodicWave(this.wave('bow'));
      const pv = g.lastCello;
      if (pv && Math.abs(pv.end - t) < 0.12 && Math.abs(pv.m - midi) >= 2 && Math.abs(pv.m - midi) <= 7) { o.frequency.setValueAtTime(mtof(pv.m), t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08); } else o.frequency.value = f;
      if (hi) g.lastCello = { m: midi, end: t + L };
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5;
      lp.frequency.setValueAtTime(f * 1.5 + 300, t); lp.frequency.linearRampToValueAtTime(Math.min(7000, f * 5 + 1400), t + a); lp.frequency.setTargetAtTime(f * 1.5 + 300, t + L, 0.12);
      const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel * 0.7, t + a * 0.6); e.gain.linearRampToValueAtTime(vel, t + a); e.gain.linearRampToValueAtTime(vel * 1.06, t + Math.max(a + 0.02, L * 0.55)); e.gain.setTargetAtTime(0, t + L, 0.13);
      o.connect(lp); lp.connect(e); e.connect(out); o.start(t); o.stop(end);
      this.vib(t, 5.1 + r() * 0.5, 15, 0.22, 0.7, end, [o]);
    } else if (voice === 'strings') {
      // a section: three players a few cents apart, slow to swell and slow to leave, vibrato that comes in late (body on the bus)
      const L = clamp(len || 3, 0.4, 10), a = clamp(L * 0.3, 0.15, 0.6), end = t + L + 1.5;
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('strings'), w = this.wave('bow');
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.value = Math.min(8000, f * 3.5 + 700);
      const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel, t + a); e.gain.setValueAtTime(vel, t + L); e.gain.setTargetAtTime(0, t + L, 0.3);
      lp.connect(e); e.connect(out);
      const os = [];
      for (const [dt, dc] of [[0, -7], [0.011, 1], [0.023, 8]]) { const g = ctx.createGain(); g.gain.value = 0.5; g.connect(lp); os.push(this.osc(w, f, t + dt, end - t - dt, g, dc)); }
      this.vib(t, 4.9 + r() * 0.4, 9, 0.3, Math.min(1.1, a + 0.6), end, os);
    } else if (voice === 'oboe') {
      // a pastoral reed: strong middle partials (nasal), narrow vibrato, gentle attack
      const L = clamp(len || 1, 0.15, 6), a = 0.05, end = t + L + 0.3;
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('oboe'), o = ctx.createOscillator(); o.setPeriodicWave(this.wave('oboe')); o.frequency.value = f;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.3; lp.frequency.value = Math.min(9000, f * 7 + 800);
      const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel * 0.7, t + a); e.gain.setTargetAtTime(vel * 0.63, t + a, 0.3); e.gain.setTargetAtTime(0, t + L, 0.05);
      o.connect(lp); lp.connect(e); e.connect(out); o.start(t); o.stop(end);
      this.vib(t, 5.6, 7, 0.15, 0.45, end, [o]);
    } else if (voice === 'celesta') {
      // struck steel over a wooden box: sine partials at the ratios of a bar, the upper ones gone almost at once, a soft click
      const tau = clamp(1.0 * Math.pow(2, -(midi - 76) / 20), 0.3, 1.8), end = t + 5 * tau;
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('celesta');
      for (const p of [[1, 1, tau], [2, 0.07, tau * 0.35], [2.756, 0.15, 0.13], [5.404, 0.05, 0.05]]) {
        if (f * p[0] > 15000) continue;
        const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel * p[1], t + 0.0015); e.gain.setTargetAtTime(0, t + 0.002, p[2]);
        e.connect(out); this.osc('sine', f * p[0], t, Math.min(end - t, 6 * p[2]), e);
      }
      this.burst(t, 3200, 0.7, vel * 0.1, 0.003, out, 0.02, 'highpass');
    } else if (voice === 'bell') {
      const dur = 2.2, out = this.vout('bell');
      if (!this.claim(t, t + dur, hi)) return;
      const e = this.env(t, vel, 0.004, 0.12, 0.3, dur); e.connect(out);
      this.osc('sine', f, t, dur, e);
      const e2 = this.env(t, vel * 0.4, 0.003, 0.05, 0.12, 0.9); e2.connect(out); this.osc('sine', f * 4.0, t, 0.9, e2);
      const e3 = this.env(t, vel * 0.12, 0.003, 0.04, 0.1, 0.5); e3.connect(out); this.osc('sine', f * 5.4, t, 0.5, e3);
    } else if (voice === 'flute') {
      // a soft breathy voice: slow to speak, a slow vibrato that comes in late, a breath of band passed noise all along and a little more at the start
      const L = clamp(len || 1.9, 0.25, 7), a = 0.11, end = t + L + 0.5;
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('flute'), o = ctx.createOscillator(); o.setPeriodicWave(this.wave('flute')); o.frequency.value = f;
      const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel * 0.85, t + a); e.gain.linearRampToValueAtTime(vel, t + Math.max(a + 0.02, Math.min(L * 0.5, 0.7))); e.gain.setTargetAtTime(0, t + L, 0.09);
      o.connect(e); e.connect(out); o.start(t); o.stop(end);
      this.vib(t, 4.7, 10, 0.3, 0.9, end, [o]);
      const nz = ctx.createBufferSource(); nz.buffer = this.noise; nz.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.min(f * 2, 7000); bp.Q.value = 2.5;
      const ne = ctx.createGain(); ne.gain.value = 0; ne.gain.setValueAtTime(0, t); ne.gain.linearRampToValueAtTime(vel * 0.32, t + 0.015); ne.gain.setTargetAtTime(vel * 0.06, t + 0.03, 0.05); ne.gain.setTargetAtTime(0, t + L, 0.08);
      nz.connect(bp); bp.connect(ne); ne.connect(out); nz.start(t, r() * 1.5); nz.stop(end);
    } else if (voice === 'glass') {
      const dur = 2.6, out = this.vout('glass');
      if (!this.claim(t, t + dur, hi)) return;
      const e = this.env(t, vel, 0.01, 0.3, 0.4, dur); e.connect(out);
      const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = f;
      const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = f * 2.0;
      const mg = ctx.createGain(); mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.2);
      mod.connect(mg); mg.connect(car.frequency); car.connect(e);
      car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
    } else if (voice === 'violins') {
      // a full section of violins for a sung line: five players a few cents and a few ms apart, bright, with a vibrato that blooms and a swell through the note
      const L = clamp(len || 2, 0.2, 10), a = clamp(L * 0.22, 0.07, 0.35), end = t + L + 1.5;
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('violins'), w = this.wave('bow');
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.setValueAtTime(f * 2 + 600, t); lp.frequency.linearRampToValueAtTime(Math.min(10000, f * 4.5 + 1500), t + a);
      const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel, t + a); e.gain.linearRampToValueAtTime(vel * 1.12, t + Math.max(a + 0.02, L * 0.6)); e.gain.setTargetAtTime(0, t + L, 0.22);
      lp.connect(e); e.connect(out);
      const os = [];
      for (const [dt, dc] of [[0, -9], [0.008, -4], [0.015, 0], [0.006, 4], [0.019, 9]]) { const g = ctx.createGain(); g.gain.value = 0.36; g.connect(lp); os.push(this.osc(w, f, t + dt, end - t - dt, g, dc)); }
      this.vib(t, 5.4 + r() * 0.3, 12, 0.2, Math.min(0.9, a + 0.45), end, os);
    } else if (voice === 'horn') {
      // two horns in unison: a round brass spectrum that brightens as it is pushed, slow to speak, a small scoop up into the note
      const L = clamp(len || 2, 0.2, 10), a = 0.09, end = t + L + 0.6, vn = clamp(vel / 0.05, 0.3, 2);
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('horn'), w = this.wave('horn');
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7; const dark = f * 1.5 + 200, open = Math.min(5000, f * (2 + 2.6 * vn) + 400);
      lp.frequency.setValueAtTime(dark, t); lp.frequency.linearRampToValueAtTime(open, t + a + 0.06); lp.frequency.setValueAtTime(open, t + L); lp.frequency.setTargetAtTime(dark, t + L, 0.1);
      const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel, t + a); e.gain.linearRampToValueAtTime(vel * 1.08, t + Math.max(a + 0.02, L * 0.6)); e.gain.setTargetAtTime(0, t + L, 0.12);
      lp.connect(e); e.connect(out);
      const os = [];
      for (const dc of [-3, 4]) { const o = ctx.createOscillator(); o.setPeriodicWave(w); o.detune.value = dc; o.frequency.setValueAtTime(f * 0.985, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.07); const g = ctx.createGain(); g.gain.value = 0.55; o.connect(g); g.connect(lp); o.start(t); o.stop(end); os.push(o); }
      this.vib(t, 4.6, 4, 0.4, 0.9, end, os);
    } else if (voice === 'timpani') {
      // one stroke: the drum's modes (not whole multiples), a pitch that settles, a soft felt thump
      const end = t + 3.2;
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('timpani');
      for (const p of [[1, 1, 1.5], [1.5, 0.45, 0.8], [1.99, 0.3, 0.6], [2.44, 0.16, 0.4], [2.98, 0.09, 0.3]]) {
        const o = ctx.createOscillator(); o.frequency.setValueAtTime(f * p[0] * 1.02, t); o.frequency.exponentialRampToValueAtTime(f * p[0], t + 0.09);
        const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel * p[1], t + 0.004); e.gain.setTargetAtTime(0, t + 0.005, p[2]);
        o.connect(e); e.connect(out); o.start(t); o.stop(Math.min(end, t + 6 * p[2] + 0.05));
      }
      this.burst(t, 180, 0.7, vel * 0.9, 0.025, out, 0.15, 'lowpass');
    } else if (voice === 'cymbal') {
      // a suspended cymbal: soft mallets rolling up over len seconds to the peak at t + len, then the ring (len 0 is a plain crash)
      const L = Math.max(0, len || 0), end = t + L + 6;
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('cymbal'), src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3200; hp.Q.value = 0.5;
      const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 6500; pk.gain.value = 6; pk.Q.value = 0.8;
      const body = ctx.createBiquadFilter(); body.type = 'bandpass'; body.frequency.value = 2200; body.Q.value = 0.9; const bg = ctx.createGain(); bg.gain.value = 0.35;
      const e = ctx.createGain(); e.gain.value = 0; e.gain.setValueAtTime(L > 0 ? vel * 0.02 : 0, t); // value 0 first: a start between two samples must not let one sample of noise through at full gain
      if (L > 0) e.gain.exponentialRampToValueAtTime(vel, t + L); else e.gain.linearRampToValueAtTime(vel, t + 0.005);
      e.gain.setTargetAtTime(0, t + L + 0.01, 1.3);
      src.connect(hp); hp.connect(pk); pk.connect(e); src.connect(body); body.connect(bg); bg.connect(e); e.connect(out);
      src.start(t, r() * 1.5); src.stop(end);
    } else if (voice === 'air') {
      // two pure tones a breath apart that beat slowly: the shimmer over still water
      const dur = clamp(len || 3, 0.8, 9), end = t + dur + 1.5;
      if (!this.claim(t, end, hi)) return;
      const out = this.vout('air');
      const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(vel, t + Math.min(1.2, dur * 0.5)); e.gain.setValueAtTime(vel, t + dur); e.gain.linearRampToValueAtTime(0.0001, end);
      e.connect(out);
      this.osc('sine', f, t, end - t, e); this.osc('sine', f * 1.0035, t, end - t, e);
    }
  }
  // a held chord of strings under everything
  pad(t, midis, dur, I) {
    const ctx = this.ctx, g = this.cur || this.group, s = g.score, P = s.pad, G = s.grow || {};
    if (I === undefined) I = Math.max(0, g.I);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = P.cut * (1 + 0.12 * Math.min(4, I + 1) + (G.cut === undefined ? 0.07 : G.cut) * I); lp.Q.value = 0.7;
    const e = ctx.createGain(), peak = P.gain * (1 + (G.swell === undefined ? 0.06 : G.swell) * I);
    // at the top of the coast the pad breathes in across the whole bar, like a wave coming in
    const at = G.breath !== undefined && I >= G.breath ? Math.max(P.att || 1.8, dur * 0.6) : Math.min(P.att || 1.8, dur * 0.8), rel = P.rel || 2.6;
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(peak, t + at); e.gain.setValueAtTime(peak, t + Math.max(dur - 0.3, at + 0.1)); e.gain.linearRampToValueAtTime(0.0001, t + dur + rel);
    lp.connect(e); e.connect(this.vout('pad'));
    const end = dur + rel + 0.1, w = this.wave('pad');
    if (P.lfo) { const l = ctx.createOscillator(); l.frequency.value = 0.13; const lg = ctx.createGain(); lg.gain.value = P.cut * 0.3; l.connect(lg); lg.connect(lp.frequency); l.start(t); l.stop(t + end); }
    const os = [];
    for (const m of midis) { const f = mtof(m + (g.shift || 0)); os.push(this.osc(w, f, t, end, lp, 6), this.osc(w, f, t + 0.02, end, lp, -6)); }
    if (P.vib) this.vib(t, 4.7, 7, 0.4, 1.2, t + end, os);
  }
  // the pad's chord for one bar: its own voicing for each world, a seventh, the double basses and a high note as the world fills
  voicing(s, G, chord, on) {
    const P = s.pad, out = [];
    for (const v of P.v || [[0, -1], [4, -1], [2, 0]]) out.push(this.deg(s, chord + v[0], v[1]));
    if (on(G.chord4 === undefined ? 2 : G.chord4)) { const v = P.v4 || [6, 0]; out.push(this.deg(s, chord + v[0], v[1])); }
    if (on(G.deep)) out.push(this.deg(s, chord, -2));
    if (on(G.top === undefined ? 5 : G.top)) { const v = P.vTop || [G.topD || 0, 1]; out.push(this.deg(s, chord + v[0], v[1])); }
    return out;
  }
  // ----- sequencing -----
  deg(score, d, oct) { const n = score.scale.length; return score.root + 12 * (Math.floor(d / n) + (oct || 0)) + score.scale[((d % n) + n) % n]; }
  // the nearest tone of the chord at least a third under d
  ctBelow(d, chord) { for (let x = d - 2; x >= d - 6; x--) { const k = (((x - chord) % 7) + 7) % 7; if (k === 0 || k === 2 || k === 4) return x; } return d - 2; }
  nearCt(d, chord) { let best = d, bd = 99; for (let x = d - 3; x <= d + 3; x++) { const k = (((x - chord) % 7) + 7) % 7; if ((k === 0 || k === 2 || k === 4) && Math.abs(x - d) < bd) { bd = Math.abs(x - d); best = x; } } return best; }
  // one pass of the written theme: as written, its rhythm with other notes, its notes ornamented, the answer alone, or a fragment of its head
  variant(s, kind, spb) {
    const T = s.tune.bars, r = this.rnd;
    let out = [];
    for (let b = 0; b < 8; b++) for (const x of T[b]) out.push({ at: b * spb + x[0], bar: b, d: x[1], len: x[2], w: x[3] || 0.9, dt: 0, arc: 1, last: false, toBar: spb - x[0] });
    if (kind === 'frag') out = out.filter((n) => n.bar === 0 || n.bar === 4);
    else if (kind === 'ans') out = out.filter((n) => n.bar >= 4);
    let top = 0; for (let i = 1; i < out.length; i++) if (out[i].d > out[top].d) top = i;
    const lastOf = (i) => i === out.length - 1 || out[i + 1].bar >= 4 !== out[i].bar >= 4;
    if (kind === 'rhy') {
      // the same rhythm with other notes: the contour kept, the strong beats on the chord, the high point and the cadences left as they are
      const orig = out.map((n) => n.d); let lo = 99, hi = -99; for (const d of orig) { lo = Math.min(lo, d); hi = Math.max(hi, d); }
      let prev = orig[0];
      for (let i = 1; i < out.length; i++) {
        const n = out[i];
        if (i === top || lastOf(i)) { prev = n.d; continue; }
        let dir = Math.sign(orig[i] - orig[i - 1]); if (!dir || r() < 0.25) dir = dir ? -dir : (r() < 0.5 ? -1 : 1);
        let d = prev + dir * (r() < 0.65 ? 1 : 2);
        if (n.at % spb === 0 || n.len >= s.sub * 2) d = this.nearCt(d, s.prog[n.bar % s.prog.length]);
        n.d = prev = clamp(d, lo - 1, hi - 1);
      }
    } else if (kind === 'orn') {
      // the same notes with an ornament: a leap after a long note filled by a passing note, a grace note before the high point
      const res = [];
      for (let i = 0; i < out.length; i++) {
        const n = out[i], nx = out[i + 1]; res.push(n);
        if (nx && n.len >= 3 && Math.abs(nx.d - n.d) >= 2 && i !== top) { n.len -= 1; res.push(Object.assign({}, n, { at: n.at + n.len, d: nx.d - Math.sign(nx.d - n.d), len: 1, w: n.w * 0.8, toBar: n.toBar - n.len })); }
      }
      const h = out[top]; res.push(Object.assign({}, h, { d: h.d + 1, dt: -0.075, len: 0.35, w: h.w * 0.6 }));
      res.sort((a, b) => a.at - b.at || a.dt - b.dt);
      out = res;
    }
    // the dynamic arc of each phrase: softer at the ends, a swell to the high point, the last note a little longer
    for (const h of [0, 1]) {
      const idx = []; for (let i = 0; i < out.length; i++) if ((out[i].bar >= 4 ? 1 : 0) === h) idx.push(i);
      if (!idx.length) continue;
      let p = 0; for (let j = 1; j < idx.length; j++) if (out[idx[j]].d > out[idx[p]].d) p = j;
      for (let j = 0; j < idx.length; j++) out[idx[j]].arc = j <= p ? 0.8 + 0.2 * (p ? j / p : 1) : 1 - 0.2 * (j - p) / Math.max(1, idx.length - 1 - p);
      const z = out[idx[idx.length - 1]]; z.last = true; z.arc *= 0.94;
    }
    return out;
  }
  // one note of the tune with everything that doubles it
  sing(g, s, n, t, I, chord, ans, frag) {
    const L = s.layers, A = s.answer, E = s.echo;
    const vel = s.mel.vel * n.w * n.arc * (1 + 0.035 * I) * (0.94 + 0.12 * this.rnd()) * (frag ? 0.8 : 1);
    const len = n.len * g.stepDur * 1.06 * (n.last ? 1.25 : 1), tt = t + n.dt + (this.rnd() - 0.5) * 0.012;
    const useAns = ans && A && I >= A.at, voice = useAns ? A.voice : s.mel.voice;
    const held = (v) => (v === 'piano' && s.pedal ? Math.max(len, n.toBar * g.stepDur + 0.1) : len);
    this.note(voice, tt, this.deg(s, n.d, useAns ? A.oct || 0 : 0), vel * (useAns ? A.vel || 1 : 1), held(voice), 1);
    if (frag) return;
    if (L) for (const l of L) {
      if (I < l.at || (useAns && !l.withAns) || (l.minLen && n.len < l.minLen) || (l.bars && (n.bar < l.bars[0] || n.bar >= l.bars[1]))) continue;
      const d = l.iv === 'ct' ? this.ctBelow(n.d, chord) : n.d + (l.iv || 0);
      this.note(l.voice, tt + 0.006, this.deg(s, d, l.oct || 0), vel * l.vel, held(l.voice), 1);
    }
    if (E && I >= E.at && !useAns && n.dt === 0) this.note(E.voice, tt + g.stepDur * E.steps, this.deg(s, n.d, E.oct || 0), vel * E.vel, len);
  }
  // the written theme, eight bars at a time. Which pass comes when depends on the step: at 0 only fragments of its head, from 1 the whole of it
  tuneStep(g, s, spb, bar, st, t, I, night, chord) {
    const sec = Math.floor(bar / 8), b8 = bar % 8, pos = b8 * spb + st;
    if (g.tAt !== sec) {
      g.tAt = sec;
      let kind = Music.PLAN[Math.min(3, I)][sec % 4];
      if (night && kind !== 'none' && sec % 2) kind = 'none';
      g.tKind = kind; g.tNotes = kind === 'none' ? null : this.variant(s, kind, spb);
    } else if (st === 0 && b8 === 4 && I >= 1 && (g.tKind === 'frag' || g.tKind === 'none') && !night) {
      // she has just caught her first painting: the answer comes at once rather than at the next pass
      g.tKind = 'ans'; g.tNotes = this.variant(s, 'ans', spb);
    }
    if (!g.tNotes) return;
    const ans = g.tKind === 'rhy' || g.tKind === 'ans', frag = g.tKind === 'frag';
    for (const n of g.tNotes) if (n.at === pos) this.sing(g, s, n, t, I, chord, ans, frag);
  }
  makeSection(score) {
    // eight bars of free melody for a painting with chords of its own: rhythm of the first four repeats in the last four, pitches follow the chords
    const bars = 8, spb = score.beats * score.sub, r = this.rnd, out = [];
    const rh = []; for (let b = 0; b < 4; b++) rh.push(score.rhythms[Math.floor(r() * score.rhythms.length)]);
    const penta = [0, 1, 2, 4, 5];
    let d = 7 + 2;
    for (let b = 0; b < bars; b++) {
      const chord = score.prog[Math.floor(b / score.barsPer) % score.prog.length], tones = [chord, chord + 2, chord + 4];
      const steps = rh[b % 4];
      for (let i = 0; i < steps.length; i++) {
        if (i === 0) { // land on the nearest chord tone
          let best = d, bd = 99;
          for (let o = 0; o <= 14; o += 7) for (const tn of tones) { const c = (tn % 7) + o; if (Math.abs(c - d) < bd) { bd = Math.abs(c - d); best = c; } }
          d = best;
        } else {
          const moves = score.mel.fall ? [-2, -1, -1, -1, 1, 1] : [-2, -1, -1, 1, 1, 2];
          d += moves[Math.floor(r() * moves.length)];
        }
        d = clamp(d, 3, 15);
        let dd = d;
        if (score.penta) { const o = Math.floor(dd / 7), k = ((dd % 7) + 7) % 7; let nk = penta[0], bdist = 9; for (const p of penta) if (Math.abs(p - k) < bdist) { bdist = Math.abs(p - k); nk = p; } dd = o * 7 + nk; }
        const next = i + 1 < steps.length ? steps[i + 1] : spb;
        out.push({ at: b * spb + steps[i], d: dd, on: r() < score.mel.dens + 0.2 * (i === 0 ? 1 : 0), len: Math.max(1, Math.min(4, next - steps[i])) });
      }
    }
    return out;
  }
  // one held line: the chord tone nearest to where it was, moving if it can, leaning upward at the top when it is a soaring line
  line(g, s, L, key, chord, t, len, I) {
    const prev = g[key] === undefined ? L.c : g[key];
    let best = prev, bc = 1e9;
    for (let o = -14; o <= 21; o += 7) for (const tn of [chord, chord + 2, chord + 4]) {
      const c = tn + o; if (Math.abs(c - L.c) > 5) continue;
      const cost = Math.abs(c - prev) + (c === prev ? 1.2 : 0) + (L.rise && I >= 5 ? (prev - c) * 0.25 : 0) + Math.abs(c - L.c) * 0.15;
      if (cost < bc) { bc = cost; best = c; }
    }
    g[key] = best;
    const m = this.deg(s, best, 0), v = L.vel * (0.9 + 0.08 * I);
    this.note(L.voice, t, m, v, len);
    if (L.dbl !== undefined && I >= L.dbl) this.note(L.voice, t + 0.012, m + 12 * (L.dblOct || 1), v * 0.5, len);
  }
  lines(g, s, G, bar, st, spb, chord, t, I) {
    for (const key of ['line', 'line2']) {
      const L = G[key]; if (!L) continue;
      const per = L.per[I] || 0; if (!per) continue;
      // a line on the voice that answers the tune is silent while it answers
      if (L.yieldTo && s.answer && I >= s.answer.at && bar % 8 >= 3 && (g.tKind === 'rhy' || g.tKind === 'ans')) continue;
      if (per < 1) { if (st === 0 && bar % Math.round(1 / per) === 0) this.line(g, s, L, key + 'D', chord, t, spb * g.stepDur / per * 1.02, I); continue; }
      for (let k = 0; k < per; k++) if (st === Math.floor(k * spb / per)) this.line(g, s, L, key + 'D', chord, t, spb * g.stepDur / per * 1.02, I);
    }
  }
  schedule(g, step, t) {
    const s = g.score, G = s.grow || {}, spb = s.beats * s.sub, bar = Math.floor(step / spb), st = step % spb, night = this.night > 0.5;
    // the step of intensity moves one step per bar toward what is wanted (and down to the ground at night)
    if (g === this.group && this.useInten && st === 0) {
      const want = night ? 0 : this.intenWant;
      if (want !== g.I) { g.I += want > g.I ? 1 : -1; this.inten = g.I; this.level = [1, 2, 3, 4, 4, 4][g.I]; this.setWind(); g.trim.gain.setTargetAtTime(this.trimFor(g.I), t, 1.5); }
    }
    this.cur = g;
    try { if (s.piece) this.pieceStep(g, s, step, t, night); else this.score1(g, s, G, spb, bar, st, step, t, night); } finally { this.cur = null; }
  }
  // A written piece, a quarter note at a time. What is struck together is spread by a hair from the bottom up, as hands do
  pieceOf(name) {
    const C = this.pieces || (this.pieces = {}); if (C[name]) return C[name];
    const P = PIECES[name] || (typeof PIECE_NOTES !== 'undefined' && PIECE_NOTES[name]); if (!P) return null;
    const steps = Math.ceil(P.len / 24), by = []; for (let k = 0; k < steps; k++) by.push([]);
    for (const n of P.notes) by[Math.min(steps - 1, Math.floor(n[0] / 24))].push(n);
    for (const b of by) b.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    return (C[name] = { bpm: P.bpm, steps, by, rest: 6 }); // (rest: quarters of silence before it begins again)
  }
  pieceStep(g, s, step, t, night) {
    const P = this.pieceOf(s.piece); if (!P) return;
    const k = step % (P.steps + P.rest), d = g.stepDur, soft = night ? 0.8 : 1, r = this.rnd;
    if (k < P.steps) { let last = -1, n = 0;
      for (const e of P.by[k]) { n = e[0] === last ? n + 1 : 0; last = e[0];
        this.note('piano', t + (e[0] - k * 24) / 24 * d + Math.min(0.04, n * 0.011) + (r() - 0.5) * 0.008, e[1], (0.02 + 0.0125 * e[3]) * soft * (0.95 + 0.1 * r()), e[2] / 24 * d + 0.12, 1); } }
    // the world around it, as under the other scores
    if (night) { if (r() < 0.3) this.cricket(t + r() * d); if (s.frogs && r() < 0.05) this.frog(t + r() * d); }
    else { if (s.birds && r() < 0.07) this.bird(t + r() * d); if (s.gulls && r() < 0.03) this.gull(t + r() * d); }
  }
  // how long one step lasts now: at the top it quickens a little, more where the world dances
  stepLen(g) { if (g.score.piece) return g.stepDur; const q = g.score.grow && g.score.grow.quick !== undefined ? g.score.grow.quick : 0.06; return g.stepDur * (1 - q * Math.max(0, (this.useInten ? g.I : 0) - 2) / 3); }
  tick() {
    this.watch();
    const g = this.group;
    if (!g || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    for (const o of this.groupsToPlay(now)) {
      if (o.next < now - 0.5) o.next = now + 0.05;
      let n = 0;
      while (o.next < now + 0.4 && o.next < o.endAt - 0.4 && n++ < 16) { try { this.schedule(o, o.step, o.next); } catch (e) { /* keep time even if a voice fails */ } o.step++; o.next += this.stepLen(o); }
    }
  }
  // the music now playing, and any that is still fading out under it. Those long gone are let go here, on the audio clock
  groupsToPlay(now) {
    for (let i = this.old.length - 1; i >= 0; i--) {
      const o = this.old[i];
      if (now > o.endAt + 4) { try { o.wind.stop(); for (const l of o.lfos) l.stop(); o.out.disconnect(); o.xout.disconnect(); o.trim.disconnect(); o.send.disconnect(); } catch (e) { /* already gone */ } this.old.splice(i, 1); }
    }
    const list = this.playList || (this.playList = []);
    list.length = 0; for (const o of this.old) if (now < o.endAt) list.push(o);
    list.push(this.group);
    return list;
  }
  toll(t) {
    const out = this.bus(), f = mtof(57);
    for (const p of [[1, 0.05, 5], [2.0, 0.03, 3.5], [2.76, 0.022, 2.4], [5.4, 0.008, 1.2]]) { const e = this.env(t, p[1], 0.01, 0.4, 0.4, p[2]); e.connect(out); this.osc('sine', f * p[0], t, p[2], e); }
  }
  cricket(t) {
    const out = this.bus(), f = 3900 + this.rnd() * 900;
    for (let i = 0; i < 3; i++) { const tt = t + i * 0.055; const e = this.env(tt, 0.006, 0.004, 0.02, 0.5, 0.045); e.connect(out); this.osc('sine', f, tt, 0.045, e); }
  }
  bird(t) {
    const out = this.bus(), ctx = this.ctx, n = 2 + Math.floor(this.rnd() * 3), base = 2300 + this.rnd() * 1500;
    for (let i = 0; i < n; i++) {
      const tt = t + i * (0.09 + this.rnd() * 0.05), e = this.env(tt, 0.012, 0.01, 0.03, 0.5, 0.09); e.connect(out);
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(base * (1 + 0.1 * i), tt); o.frequency.exponentialRampToValueAtTime(base * (1.25 + 0.1 * i), tt + 0.08);
      o.connect(e); o.start(tt); o.stop(tt + 0.12);
    }
  }
  gull(t) {
    const out = this.bus(), ctx = this.ctx, n = 2 + Math.floor(this.rnd() * 2), base = 1500 + this.rnd() * 500;
    for (let i = 0; i < n; i++) {
      const tt = t + i * 0.34, e = this.env(tt, 0.012, 0.03, 0.1, 0.5, 0.3); e.connect(out);
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(base, tt); o.frequency.linearRampToValueAtTime(base * 1.35, tt + 0.08); o.frequency.exponentialRampToValueAtTime(base * 0.8, tt + 0.3);
      o.connect(e); o.start(tt); o.stop(tt + 0.34);
    }
  }
  frog(t) {
    const out = this.bus(), f = 300 + this.rnd() * 120;
    for (let i = 0; i < 2; i++) { const tt = t + i * 0.16; const e = this.env(tt, 0.012, 0.01, 0.04, 0.4, 0.12); e.connect(out); this.osc('square', f, tt, 0.12, e); }
  }
  // the air going by her ears: louder the faster she goes
  setRush(k) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (!this.rush) {
      const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(bp); bp.connect(g); g.connect(this.master); src.start();
      this.rush = { g, bp, k: 0 };
    }
    if (Math.abs(k - this.rush.k) < 0.02) return;
    this.rush.k = k;
    const t = this.ctx.currentTime;
    this.rush.g.gain.setTargetAtTime(0.085 * k * k, t, 0.25); this.rush.bp.frequency.setTargetAtTime(500 + 900 * k, t, 0.3);
  }
  // one beat of the parasol
  flap() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx, t = ctx.currentTime + 0.01;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(1300, t + 0.16); bp.frequency.exponentialRampToValueAtTime(500, t + 0.4);
    const e = this.env(t, 0.09, 0.05, 0.14, 0.3, 0.42);
    src.connect(bp); bp.connect(e); e.connect(this.master);
    src.start(t, this.rnd() * 1.4, 0.46);
  }
  // a footfall, like a brush touching canvas
  step(v) {
    if (!this.ctx || !this.group || this.ctx.state !== 'running') return;
    const ctx = this.ctx, t = ctx.currentTime + 0.01;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600 + this.rnd() * 500; bp.Q.value = 1.1;
    const e = this.env(t, 0.03 * clamp(v, 0.4, 1.4), 0.005, 0.035, 0.25, 0.12);
    src.connect(bp); bp.connect(e); e.connect(this.group.out);
    src.start(t, this.rnd() * 1.6, 0.14);
  }
  // a small rising figure when a memory is gathered, on the world's own bright voice
  chime(k) {
    if (!this.ctx || !this.group) return;
    const s0 = this.group.score, s = s0.home || s0, t = this.ctx.currentTime + 0.03, v = s0.piece ? 'harp' : s0.chime || 'bell', lv = v === 'bell' ? 1 : v === 'celesta' ? 0.75 : 0.6;
    const figs = [0, 2, 4, 7, 9];
    for (let i = 0; i < figs.length; i++) this.note(v, t + i * 0.1, this.deg(s, figs[i] + (k % 3), 1), (0.12 - i * 0.012) * lv, 0.9, 1);
    this.note('glass', t + 0.5, this.deg(s, 7 + (k % 3), 0), 0.06);
    // and under the bells the strings swell once, so that a catch is felt in the music at once
    if (s0.piece) return; // (under a written piece the harp alone marks a catch)
    try { const g = this.group, spb = s.beats * s.sub, c = s.prog[Math.floor(Math.floor(g.step / spb) / s.barsPer) % s.prog.length]; this.pad(t, [this.deg(s, c, 0), this.deg(s, c + 2, 0), this.deg(s, c + 4, 0), this.deg(s, c, 1)], 1.6); } catch (e) { /* the bells are enough */ }
  }
  door() {
    if (!this.ctx || !this.group) return;
    const s = this.group.score, t = this.ctx.currentTime + 0.05;
    for (let i = 0; i < 4; i++) this.note('glass', t + i * 0.22, this.deg(s, [0, 4, 7, 9][i], 1), 0.09);
  }
}
// chord tones counted from the root of the chord, in scale degrees: root, third, fifth, octave, tenth, twelfth, two octaves, two octaves and a third
Music.EXT = [0, 2, 4, 7, 9, 11, 14, 16];
// all the voices together, against the wind, the footsteps and the wing beats
Music.LIFT = 1.6;
// which pass of the theme comes in each eight bars, at steps 0, 1, 2 and 3 and above
Music.PLAN = [['frag', 'frag', 'none', 'frag'], ['theme', 'ans', 'theme', 'frag'], ['theme', 'rhy', 'theme', 'ans'], ['theme', 'rhy', 'orn', 'ans']];
// spectra (amplitudes of partials 1, 2, 3 ...)
Music.WAVES = (() => {
  const mk = (N, fn) => { const a = []; for (let n = 1; n <= N; n++) a.push(fn(n)); return a; };
  const strike = (n, p) => Math.abs(Math.sin(Math.PI * n * p)) / Math.sin(Math.PI * p);
  return {
    pm: mk(12, (n) => strike(n, 0.12) / Math.pow(n, 1.75)), // the piano's body, struck an eighth of the way along the string
    pb: mk(20, (n) => (n === 1 ? 0.35 : 1) * strike(n, 0.12) / Math.pow(n, 0.95)), // the piano's bright strike
    harp: mk(16, (n) => strike(n, 0.18) / Math.pow(n, 1.2)),
    pizz: mk(10, (n) => strike(n, 0.25) / Math.pow(n, 1.4)),
    reed: mk(18, (n) => (n % 2 ? 1 : 0.72) / Math.pow(n, 0.8)),
    bow: mk(28, (n) => 1 / Math.pow(n, 1.05)),
    pad: mk(16, (n) => 1 / Math.pow(n, 1.6)),
    oboe: [0.42, 0.6, 1, 0.95, 0.85, 0.62, 0.42, 0.3, 0.2, 0.14, 0.1, 0.07, 0.05],
    flute: [1, 0.2, 0.08, 0.03, 0.012],
    horn: [0.8, 1, 0.8, 0.55, 0.38, 0.25, 0.16, 0.1, 0.07, 0.05, 0.035, 0.025],
  };
})();
// where each voice sits and the body that colours it
Music.BUS = {
  pianoL: { pan: -0.14 }, pianoH: { pan: 0.14 },
  harp: { pan: -0.28 }, pluck: { pan: -0.06 },
  accordion: { pan: 0.2, swell: [0.09, 0.1] },
  cello: { pan: -0.12, eq: [[205, 5, 1.6], [560, 3.5, 2], [1500, 2.5, 1.8], [3300, -6, 0.8]], lp: 5200 },
  strings: { pan: 0.24, eq: [[290, 2.5, 1.2], [2500, 3, 1.3], [5200, -6, 0.7]] },
  pad: { eq: [[300, 2, 1], [2500, 2, 1.2]] },
  oboe: { pan: 0.34, eq: [[1250, 5, 2.2], [2900, 3, 2]], hp: 220 },
  celesta: { pan: 0.18 }, flute: { pan: -0.24 },
  bell: { pan: 0.3 }, glass: { pan: -0.3 }, air: {},
  // the orchestra of the trailer
  violins: { pan: -0.22, eq: [[420, 2, 1], [2600, 4, 1.2], [6500, -5, 0.7]] }, horn: { pan: 0.3, eq: [[450, 3, 1.2]], lp: 3800 },
  timpani: { pan: 0.1 }, cymbal: { pan: 0.25 },
};
