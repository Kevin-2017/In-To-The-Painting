// The storyboard of the trailer, as data. Frames at 30 a second; a beat is 25 frames, a bar 100 (72 beats a minute, 4/4).
// Every shot names its world, where it lies on the film (start, len, in frames), and its curves in seconds of its own clock
// (see film/tools/director.js for the fields). The layers over the film (the originals, the words, the wall of pictures)
// are laid by film/tools/assemble.py.
const FPS = 30, BEAT = 25, BAR = 100;
const DEG = Math.PI / 180;
// a point along a direction: p + d * k (and sideways by s, to the right of the direction)
const along = (p, d, k, s = 0) => [p[0] + d[0] * k - d[1] * s, p[1] + d[1] * k + d[0] * s];
const dirOf = (yaw) => [Math.sin(yaw), -Math.cos(yaw)];
const yawOf = (d) => Math.atan2(d[0], -d[1]);

// ---- 1. coast: Impression, Sunrise wakes, and she flies in over the camera into the sun ----
// the easel of c1: the eye at (179, 8.5 above the ground, -38), looking along yaw 1.929
const C1 = [179, -38], C1Y = 1.929, F1 = dirOf(C1Y);
const c1 = (k, s, dy, extra = {}) => { const p = along(C1, F1, k, s); return { x: p[0], z: p[1], y: 8.5 + dy, yaw: C1Y, pitch: -0.057, fov: 51, ...extra }; };
const h1 = (s, k, side, ay) => { const p = along(C1, F1, k, side); return { s, x: p[0], z: p[1], ay }; };

// ---- 2. Etretat: the door of the Porte d'Aval, from the beach out to sea ----
// the door of the wall: centre near u 10.3 along it from (-150.9, -73.9) along (0.97, 0.242); out to sea is (0.242, -0.97)
const DOOR = [-150.9 + 0.97 * 10.3, -73.9 + 0.242 * 10.3], SEA = [0.242, -0.97], SEAY = yawOf(SEA);
const d2 = (k, side = 0) => along(DOOR, SEA, k, side);

// ---- 4. Argenteuil, the Seine below the bridge ----
// ---- 6. Argenteuil, Woman with a Parasol: she stands at (-62, 95.5), the eye at (-65.6, 0.7, 85.6) looking yaw 2.757 up 0.15 ----
const A2 = [-62, 95.5];

// ---- 7. the stacks: the easel of the fields at (17, 11), the eye at (6.5, 4, 15) along yaw -1.175 ----
const STK = [6.5, 15], STKY = -1.175, FS = dirOf(STKY);
// eight lights, one on every beat: [season, hour at the beat, hour at the end of the beat]. The last two are one autumn dusk,
// the starlings gathering in the sky as the eye lifts to them
const LIGHTS = [[0, 0.335, 0.37], [0, 0.44, 0.49], [1, 0.738, 0.768], [2, 0.3, 0.355], [2, 0.716, 0.758], [3, 0.649, 0.68], [1, 0.70, 0.725], [1, 0.725, 0.75]];
const stkClock = [], stkSeason = [];
LIGHTS.forEach(([ph, a, b], i) => { const s0 = (i * BEAT) / FPS, s1 = ((i + 1) * BEAT) / FPS - 1e-3; stkClock.push([s0, a], [s1, b]); stkSeason.push([s0, ph]); });
const stk = (k, extra) => ({ x: STK[0] + FS[0] * k, z: STK[1] + FS[1] * k, y: 4, yaw: STKY, pitch: -0.03, fov: 47, ...extra });
// the flock and the stacks share one game clock across the cut into the summit, so the starlings go on where they were
const MURMUR_T = 28;

export default {
  fps: FPS, w: 1920, h: 1080, frames: 1560, music: 'shots/music/trailer2.wav',
  bars: { beat: BEAT, bar: BAR },
  shots: [
    {
      id: 's01_wake', world: 0, start: 0, len: 200, time0: 390,
      // the painting at frame 0, alive by frame 40; she comes in over the eye on the downbeat of bar 2 (frame 100) and the eye goes
      // with her, low over the water among the luggers towards the sun, the hour running so the sun climbs and the mist glows
      clock: [[0, 0.266], [6.67, 0.305]], season: 0,
      spot: 0, viewK: [[0, 1], [0.45, 1], [1.35, 0.25], [2.0, 0]],
      cam: {
        keys: [
          { s: 0, easel: 0, stop: true }, { s: 0.9, easel: 0, stop: true },
          { s: 3.0, ...c1(7, 0, -2.5) }, { s: 4.6, ...c1(24, 1, -4.5, { pitch: 0.0 }) }, { s: 6.67, ...c1(60, 5, -4.5, { pitch: 0.02 }) },
        ],
        look: 'her', lookK: [[3.3, 0], [4.2, 0.55]], lookUp: 0,
      },
      her: { keys: [h1(2.0, -5, 2.5, 8), h1(3.2, 16, 1.8, 6.4), h1(4.5, 34, 2.5, 4.2), h1(6.67, 72, 7, 3.6)], flaps: [3.3, 4.0], ribbons: 0 },
      keys: [12, 40, 100, 130, 190],
    },
    {
      id: 's01b_cliffs', world: 0, start: 200, len: 100, time0: 250,
      // along the edge of the chalk: the sea and the surf far below on her right, the fields, the farms and the church on her left,
      // the Needle and the door coming up ahead. She glides: one beat of the parasol in the run up, then none, her height kept above
      // the sea (not above the land under her) and sinking a little, all the way; the eye on its own slow way, looking at a point that trails her
      clock: [[0, 0.64], [3.33, 0.66]], season: 1,
      her: { absolute: true, keys: [{ s: -2, x: 25, z: -21, ay: 32.5 }, { s: 0, x: -25, z: -23, ay: 33 }, { s: 1.67, x: -68, z: -25, ay: 32 }, { s: 3.33, x: -110, z: -30, ay: 30.5 }], flaps: [-1.5], ribbons: 0 },
      cam: { keys: [{ s: 0, x: -14, z: -27.5, y: 37, abs: true, yaw: -1.57, pitch: -0.12, fov: 62 }, { s: 3.33, x: -99, z: -34, y: 34.4, abs: true, yaw: -1.5, pitch: -0.11, fov: 62 }], look: 'herSmooth', tau: 1, lookK: 0.5, lookUp: -1 },
    },
    {
      id: 's02_arch', world: 0, start: 300, len: 100, time0: 300,
      // through the door of the Porte d'Aval in low gold light, the gulls round the Needle and through the door (0.5 to 0.78)
      clock: 0.7, season: 1,
      her: { keys: [{ s: 0, x: d2(-34)[0], z: d2(-34)[1], ay: 7.5 }, { s: 1.7, x: d2(0)[0], z: d2(0)[1], ay: 7.5 }, { s: 3.4, x: d2(30)[0], z: d2(30)[1], ay: 10.5 }], flaps: [2.4], ribbons: 0 },
      cam: {
        keys: [
          { s: 0, x: d2(-45, 1.5)[0], z: d2(-45, 1.5)[1], y: 9.5, abs: true, yaw: SEAY, pitch: -0.05, fov: 62 },
          { s: 1.7, x: d2(-9, 0.6)[0], z: d2(-9, 0.6)[1], y: 8.8, abs: true, yaw: SEAY, pitch: -0.05, fov: 62 },
          { s: 3.4, x: d2(12, 0)[0], z: d2(12, 0)[1], y: 14, abs: true, yaw: SEAY, pitch: -0.1, fov: 62 },
        ],
        look: 'her', lookK: 0.6, lookUp: 0.6,
      },
    },
    {
      id: 's03_repaint', world: 0, start: 400, len: 115, time0: 500, speed: 2,
      // the game's own repainting, coast to Argenteuil, played in 4.3 seconds from the lift of bar 5
      clock: [[0, 0.7], [4.29, 0.7], [4.3, 0.585]], season: [[0, 1], [4.2, 0]],
      trans: { to: 1, at: 0 },
      her: { keys: [{ s: -2, x: d2(40)[0], z: d2(40)[1], ay: 12 }, { s: 0, x: d2(52)[0], z: d2(52)[1], ay: 12.5 }] },
      cam: { game: true, yaw: SEAY + 0.5, pitch: -0.12 },
    },
    {
      id: 's04_seine', world: 1, start: 515, len: 85, time0: 620,
      // the regatta (summer, 0.5 to 0.665): she skates west among the cutters, the town and the train's plume beyond
      clock: [[0, 0.585], [2.83, 0.6]], season: 0,
      her: { keys: [{ s: 0, x: 22, z: -99, alt: 0 }, { s: 2.83, x: -36, z: -101, alt: 0 }], slide: true },
      cam: {
        keys: [{ s: 0, x: 19, z: -92, y: 2.0, yaw: -1.1, pitch: -0.01, fov: 56 }, { s: 2.83, x: -40, z: -94, y: 2.2, yaw: -1.1, pitch: -0.01, fov: 56 }],
        look: 'her', lookK: 0.7, lookUp: 0.9,
      },
    },
    {
      id: 's05_poppies', world: 1, start: 600, len: 75, time0: 700,
      // the first peak: from down among the poppies the eye rises and comes to the view of the Poppy Field
      clock: [[0, 0.47], [3.33, 0.5]], season: 0,
      her: { hide: true },
      cam: { keys: [{ s: 0, easel: 0, dz: 3.5, dy: -1.7, dyaw: -0.25, dpitch: 0.05, fov: 58 }, { s: 3.1, easel: 0, stop: true }, { s: 3.33, easel: 0 }] },
    },
    {
      id: 's06_parasol', world: 1, start: 675, len: 75, time0: 760,
      // she comes up the slope, turns, the wind takes her veil: for one beat the frame is Woman with a Parasol
      clock: 0.5, season: 0,
      spot: [[0, -1], [1.9, 1]], viewK: [[1.9, 0], [2.6, 1]],
      her: { keys: [{ s: 0, x: -50, z: 99 }, { s: 1.9, x: A2[0], z: A2[1], stop: true }], spotFrom: [1.9, 1] },
      cam: { keys: [{ s: 0, easel: 1, dz: -5, dy: -0.4, dx: -2.5, dyaw: -0.12 }, { s: 2.2, easel: 1, stop: true }, { s: 3.33, easel: 1 }] },
      keys: [10, 50, 66, 89],
    },
    {
      id: 's07_stacks', world: 2, start: 800, len: 200, time0: MURMUR_T - 200 / FPS,
      // one camera on the stacks; on every beat the light changes and between the beats the day races.
      // On the last two beats the eye lifts and widens to the starlings gathering over the stubble
      clock: stkClock, season: stkSeason, snap: true,
      her: { hide: true },
      cam: { keys: [{ s: 0, ...stk(-1.5) }, { s: 5.0, ...stk(1.8), stop: true }, { s: 6.67, ...stk(-1, { y: 3, pitch: 0.3, fov: 68 }) }] },
      keys: [10, 35, 60, 85, 110, 135, 160, 185, 199],
    },
    {
      id: 's08_murmur', world: 2, start: 1000, len: 50, time0: MURMUR_T,
      // the summit, first half: from far off and low through a long lens, the flock a dark body folding against the dusk, she rising into it
      clock: [[0, 0.746], [1.67, 0.75]], season: 1,
      her: { keys: [{ s: -1, x: -30, z: 18, alt: 6 }, { s: 0, x: -32, z: 14, alt: 14 }, { s: 1.67, x: -36, z: 8, alt: 30 }], flaps: [0.1, 0.6, 1.1], ribbons: 0 },
      cam: { keys: [{ s: 0, x: 71, z: 147, y: 4.5, yaw: -0.68, pitch: 0.13, fov: 24 }, { s: 1.67, x: 68, z: 143, y: 4.7, yaw: -0.68, pitch: 0.14, fov: 23 }], look: [-38, 30, 6], lookK: 1 },
    },
    {
      id: 's08b_inside', world: 2, start: 1050, len: 55, time0: MURMUR_T + 50 / FPS,
      // the summit, second half: inside it, the eye just behind her, the birds streaming past on both sides
      clock: [[0, 0.75], [2, 0.754]], season: 1,
      her: { keys: [{ s: 0, x: -10, z: 32, ay: 33 }, { s: 1, x: -28, z: 11, ay: 30 }, { s: 2, x: -44, z: -8, ay: 27.5 }], flaps: [0.3, 1.2], ribbons: 0 },
      cam: { keys: [{ s: 0, x: -3.5, z: 39.6, y: 35.5, abs: true, yaw: -0.7, pitch: -0.05, fov: 72 }, { s: 1, x: -21.5, z: 18.6, y: 32.5, abs: true, yaw: -0.7, pitch: -0.05, fov: 72 }, { s: 2, x: -37.5, z: -0.4, y: 30, abs: true, yaw: -0.7, pitch: -0.05, fov: 72 }], look: 'her', lookK: 0.8, lookUp: 0.3 },
    },
    {
      id: 's09_garden', world: 3, start: 1090, len: 120, time0: 1100,
      // into the water garden in the afternoon, the wisteria falling at the bridge (phases 1 to 4, 0.40 to 0.67), Monet at his easel on the bank
      clock: [[0, 0.55], [3.83, 0.56]], season: 1,
      spot: [[0, -1], [2.9, 0]], viewK: [[2.9, 0], [3.6, 1]],
      her: { hide: true },
      cam: { keys: [{ s: 0, x: 24, z: 14, y: 1.3, yaw: -1.92, pitch: -0.05, fov: 58 }, { s: 2.1, x: 6, z: 9, y: 1.6, yaw: -1.75, pitch: -0.05, fov: 56 }, { s: 3.3, easel: 0, stop: true }, { s: 3.83, easel: 0 }] },
    },
    {
      id: 's10_night', world: 3, start: 1195, len: 365, time0: 1300,
      // night on the pond in 1907: the moon and its road on the water, the fireflies; the wall and the name are laid over it
      clock: 0.86, season: 1,
      her: { hide: true },
      cam: { keys: [{ s: 0, x: -14, y: 1.5, z: 6, yaw: 1.94, pitch: 0.12, fov: 62, abs: true }, { s: 12.2, x: -11, y: 2.6, z: 7.5, yaw: 1.9, pitch: 0.1, fov: 62, abs: true }] },
      keys: [20, 135, 225, 300],
    },
  ],
  // over the film: original paintings, words, the wall of her pictures, the title (see assemble.py)
  layers: [
    // Impression, Sunrise whole at frame 0; the dark at its sides opens into the world first, then the picture comes alive
    { type: 'image', src: 'orig/hi/c1.jpg', fit: 'frame-contain', from: 0, to: 44, fadeIn: 0, fadeOut: 26, sides: [6, 26] },
    { type: 'text', zh: '', en: 'Walk into the art of Claude Monet', from: 46, to: 136, fade: 14, pos: 'low' },
    // the catch, on the beat at 750: a white flash, and out of it two prints side by side, hers and his, until the cut at 800
    { type: 'text', zh: '', en: 'Wait for the light.', from: 690, to: 746, fade: 10, pos: 'catch' },
    { type: 'catch', from: 750, to: 800, bg: 's06_parasol/f00095.jpg', mine: { src: 's06_parasol/f00095.jpg', crop: [651, 100, 788, 980] }, orig: 'orig/hi/a2.jpg',
      labels: ['Yours', 'Claude Monet, 1875'], height: 0.64, push: 0.02 },
    { type: 'flash', from: 750, to: 754 },
    { type: 'text', zh: '', en: 'Catch the painting.', from: 753, to: 800, fadeIn: 8, fadeOut: 0, pos: 'catch' },
    // the end, made to be an invitation and not a full stop. Over the night pond one line about him; then her pictures hang
    // round one empty golden frame through which the night goes on, and under it the line that hands it over. On the last
    // chord (1400) the pictures let go, the name is unveiled as the frame's upper edge comes down, and the frame closes into
    // the button, which breathes in the tempo of the music (a ring every two beats) to the last frame. No fade to black:
    // the film ends on the button
    { type: 'text', zh: '', en: 'Monet chased the light all his life.', from: 1214, to: 1284, fadeIn: 12, fadeOut: 10, pos: 'low', y: 0.5 },
    { type: 'end', from: 1286, to: 1560, hang: { at: 1300, every: 2 }, release: 1384, morph: [1388, 1412], pulse: 50,
      // row by row, the cells round the frame (seven above it, then two on each side of it and of the line under it)
      pics: ['c2', 'f6', 'c4', 'c1', 'c5', 'f7', 'p2', 'a4', 'a2', 'p1', 'f5', 'f1', 'a1', 'a3', 'f2', 'p3', 'c3', 'p6', 'a5', 'f3', 'p5', 'p4', 'f4'],
      title: 'INTO THE PAINTING', button: 'Start the journey', small: 'Play in browser' },
    { type: 'text', zh: '', en: 'Now it is your turn.', from: 1326, to: 1386, fadeIn: 10, fadeOut: 8, pos: 'notch', plate: 0.5 },
    // the address, when there is one: it takes the place of the line under the button (put it in small above)
  ],
};
