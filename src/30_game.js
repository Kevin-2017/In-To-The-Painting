// ---------- game: chasing the light ----------
for (const ch of WORLDS) {
  ch._canvas = hex(ch.canvas);
  ch._water = ch.water ? { tint: hex(ch.water.tint), refl: ch.water.refl } : null;
  ch._swatch = (ch.swatch || ['#fff0c0', '#a8c8e8', '#f0b0a0', '#b8d090']).map(hex);
  ch.style = ch.style || { len: 1, wid: 1, wind: 1, flow: 1 };
  ch.need = ch.effects.filter((e) => !e.hidden).length; // the frame that leads on stands only when every painting of this world is caught
}
const TP_FOV = 60 * DEG;
const FRAME_FRAC = 0.86; // the views were composed for a picture that is the middle of a wide screen, three by two, 86 percent of its height

// what speed looks like: two ribbons of light off the rim of the parasol, the air going by in short strokes, and what the ground throws up in a slide
function drawSpeed(S, g, time, cam) {
  const p = g.pl, inAir = p.alt > 0.06, vx = p.vx, vy = inAir ? p.valt : 0, vz = p.vz, sp = Math.hypot(vx, vy, vz);
  const tr = g.trail, n = tr.length, cp = cam.pos;
  for (let i = 0; i + 1 < n; i++) {
    const a = tr[i], b = tr[i + 1], on = Math.min(a[6], b[6]);
    if (on < 0.03) continue;
    const k = 1 - i / n, w = (0.03 + 0.1 * k * k) * on * (1 + 0.8 * (g.shine || 0));
    for (let e = 0; e < 2; e++) {
      const o = e * 3, mx = (a[o] + b[o]) / 2, my = (a[o + 1] + b[o + 1]) / 2, mz = (a[o + 2] + b[o + 2]) / 2;
      const dx = a[o] - b[o], dy = a[o + 1] - b[o + 1], dz = a[o + 2] - b[o + 2], len = Math.hypot(dx, dy, dz);
      if (len < 0.02 || Math.hypot(mx - cp[0], my - cp[1], mz - cp[2]) < 3.2) continue;
      S.add(mx, my, mz, dx, dy, dz, 0, 1, 0, len * 1.5, w, [1.0, 0.97 - 0.1 * (1 - k), 0.86 - 0.3 * (1 - k)], 0, i % 2 ? CELL.LONG_A : CELL.LONG_B, 0.55 * k * on, FLAG_AXIAL);
    }
  }
  if (sp > 9) {
    const k = clamp((sp - 9) / 8, 0, 1), dx = vx / sp, dy = vy / sp, dz = vz / sp, Lb = 44, m = Math.round(14 + 22 * k);
    let sx = -dz, sz = dx; const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
    for (let i = 0; i < m; i++) {
      const h1 = _fr(Math.sin(i * 12.9898 + 3.1) * 43758.5453), h2 = _fr(Math.sin(i * 78.233 + 1.7) * 12345.678), h3 = _fr(Math.sin(i * 39.425 + 0.3) * 24634.633);
      const along = Lb * 0.62 - ((h1 * Lb + time * sp * 1.15) % Lb), side = (h2 - 0.5) * 22, up = (h3 - 0.4) * 11;
      if (Math.abs(side) < 2.6 && Math.abs(up - 1.2) < 2.4) continue; // keep the air clear around her
      const x = p.x + dx * along + sx * side, y = p.y + 1.2 + dy * along + up, z = p.z + dz * along + sz * side;
      if (Math.hypot(x - cp[0], y - cp[1], z - cp[2]) < 5) continue;
      const fade = sstep(Lb * 0.62, Lb * 0.4, along) * sstep(-Lb * 0.38, -Lb * 0.2, along), len = (0.9 + sp * 0.11) * (0.6 + h3 * 0.9);
      S.add(x, y, z, dx, dy, dz, 0, 1, 0, len, (0.035 + 0.035 * h2) * fade, [0.93, 0.95, 1.0], 0, i % 2 ? CELL.LONG_B : CELL.COMMA_S, 0.22 * k * fade, FLAG_AXIAL);
    }
  }
  if (g.sliding && !inAir) {
    // what a slide throws up: a fan of small touches off her heels, the colour of what she slides on, and the two lines she draws
    const hs = Math.hypot(vx, vz) || 1, dx = vx / hs, dz = vz / hs, k = clamp((hs - 4) / 8, 0.25, 1), base = g.slideCol, lite = mixc(base, [1, 1, 1], 0.55);
    for (let i = 0; i < 44; i++) {
      const h1 = _fr(Math.sin(i * 12.9898 + 1.3) * 43758.5453), h2 = _fr(Math.sin(i * 78.233 + 2.1) * 12345.678);
      const ph = _fr(time * (1.3 + h1 * 0.9) + h2), sd = (i % 2 ? 1 : -1) * (0.14 + (0.5 + 0.7 * h1) * ph) * (0.7 + 0.5 * k), back = 0.15 + ph * (0.8 + hs * 0.16) * (0.6 + 0.8 * h2);
      const up = Math.sin(ph * Math.PI) * (0.12 + 0.34 * k * h2), sz = (0.2 - 0.12 * ph) * (0.55 + 0.6 * k) * (0.6 + 0.8 * h1);
      S.add(p.x - dx * back - dz * sd, p.y + 0.05 + up, p.z - dz * back + dx * sd, -dx + (-dz) * sd * 0.5, 0.5 - ph, -dz + dx * sd * 0.5, 0, 1, 0, sz * 1.9, sz * 0.5, i % 3 === 0 ? lite : base, 0, i % 2 ? CELL.COMMA : CELL.COMMA_S, 0.06, FLAG_AXIAL);
    }
    for (let e = -1; e <= 1; e += 2) {
      const x = p.x - dx * (0.7 + hs * 0.07) - dz * 0.17 * e, z = p.z - dz * (0.7 + hs * 0.07) + dx * 0.17 * e;
      S.add(x, p.y + 0.04, z, dx, 0, dz, 0, 1, 0, 1.3 + hs * 0.16, 0.06, lite, 0, CELL.LONG_B, 0.06, FLAG_FLAT);
    }
  }
}

const _fr = (v) => v - Math.floor(v);
// how much of the chase is left to her hand, world by world. 0: at an easel the day and the season run of themselves to the hour
// he painted. 1: the hour still comes of itself, the season is hers to change. 2: the season and the sun are both hers.
// (Nobody is left standing: after twenty seconds without a touch the light goes on by itself.)
const HAND = { coast: 0, argenteuil: 0, fields: 1, pond: 2 };
// how near she must come before the light of an easel takes hold of her: metres from its foot, and how high above the ground
// she may be. (It was 4.8 and 10: she was taken from too far off. The glow she sees is 3.6 across, so this is its edge and a step more)
const REACH = 2.6, REACH_UP = 6;
function drawAir(S, cam, env, time, wind, centre, still, dens) {
  const snow = env.snow > 0.5, fall = !snow && env.autumn > 0.5 && env.leaf > 0.25, n = Math.round((snow ? 250 : fall ? 64 : 30) * (dens || 1));
  const B = 34, BY = 13, day = clamp(env.sunI * 1.5 + 0.25, 0.25, 1);
  // (what drifts in the air is for the walk. Before an easel the air clears, so that nothing lands on the picture as a speck)
  const sk = 1 - sstep(0.3, 0.8, still || 0);
  for (let i = 0; i < n && sk > 0.02; i++) {
    const h1 = _fr(Math.sin(i * 12.9898) * 43758.5453), h2 = _fr(Math.sin(i * 78.233) * 12345.678), h3 = _fr(Math.sin(i * 39.425) * 24634.633);
    const vy = snow ? -(0.7 + h1 * 0.5) : fall ? -(0.45 + h2 * 0.5) : (h1 - 0.5) * 0.12, drift = snow ? 0.5 : fall ? 0.9 : 0.55;
    let x = h1 * B + wind[0] * time * drift + Math.sin(time * (0.5 + h2) + i) * 0.6, y = h2 * BY + vy * time, z = h3 * B + wind[1] * time * drift + Math.cos(time * (0.4 + h3) + i * 2) * 0.6;
    x = cam[0] + ((((x - cam[0]) % B) + B) % B) - B / 2; z = cam[2] + ((((z - cam[2]) % B) + B) % B) - B / 2;
    y = cam[1] + ((((y - cam[1]) % BY) + BY) % BY) - BY * 0.42;
    if (snow) S.bill(x, y, z, 0, (0.1 + h3 * 0.07) * sk, (0.09 + h3 * 0.06) * sk, [0.9 * day, 0.92 * day, 0.98 * day], 0, CELL.DOT, 0.5, false, 0, 1, 0, 0);
    else if (fall) {
      const a = time * (1.5 + h3 * 2) + i, c = h1 < 0.5 ? [0.95, 0.66, 0.18] : h1 < 0.8 ? [0.86, 0.4, 0.14] : [0.9, 0.8, 0.3];
      S.add(x, y, z, Math.cos(a), Math.sin(a * 0.7) * 0.6, Math.sin(a), Math.sin(a * 1.3), 1, Math.cos(a * 0.9), 0.26 * sk, 0.13 * sk, c, 0, CELL.LEAF, 0.15, 0);
    } else { const sz = clamp(env.sunI * 2.5, 0, 1) * sk; if (sz > 0.02) S.bill(x, y, z, 0, 0.075 * sz, 0.07 * sz, [1.0 * day, 0.98 * day, 0.9 * day], 0, CELL.DOT, 0.55 * day, false, 0, 1, 0, 0); } // motes show in the sun, not in the dark
  }
  if (env.sunI > 0.2 && !snow) { // a small flock crossing
    const a = time * 0.035, R = 150, cx = centre[0] + Math.cos(a) * R, cz = centre[1] + Math.sin(a) * R, hd = a + Math.PI / 2;
    for (let i = 0; i < 5; i++) drawBird(S, cx + Math.cos(i * 2.4) * 7 * (1 + i * 0.3), 46 + Math.sin(i * 1.7) * 4 + Math.sin(time * 0.3 + i) * 2, cz + Math.sin(i * 2.4) * 7 * (1 + i * 0.3), hd, Math.sin(time * 5.5 + i * 1.3) * 0.55, 1.5, [0.3, 0.3, 0.42]);
  }
}

// some moments are not to be hurried. The first sunrise comes up slowly, is painted slowly, and is left to be looked at.
// (It was slower still, rate 0.0064 and 5.5 s of painting: some 17 s from the eye settling to the picture. Now about 12.5)
const PACE = { c1: { rate: 0.0147, paint: 4.0, rest: 7 } };
// A phone or a tablet is kept cool: thirty pictures a second (the loop sees to that) on a setting it can paint in well under the
// time it has. What one picture costs it is asked directly: now and then a frame is painted and one pixel of it read back at once,
// which makes the machine finish the whole of it before it answers. (How fast the frames follow each other would say nothing
// here: a browser may hold them to thirty a second by itself, to save the battery.) Three answers, the middle one counts. If
// that is more than the step allows (its third number, in ms: about half of the 33 a frame has) it goes one step down: first the
// same picture a little less sharp, then the plain setting. It is asked again every twenty seconds for as long as she plays, so
// that a machine grown warm, and slower for it, is eased as well
const SAVER = [[1, 1, 17], [1, 0.82, 22], [0, 1, 1e9]];
const BEAT_NODES = [2, 6, 10, 14, 18]; // (0.9) with so many paintings the parasol gains a beat
const DAWN0 = 0.157; // the night before that sunrise (the dawn of the first painting is paced from here on)
// The opening, made short and never dark: the title shows the sunrise itself (TITLE0 to TITLE1), and a first game steps back from it only as far
// as the first glow (BEGIN0), so that the first painting is caught some eight seconds after Begin
const TITLE0 = 0.268, TITLE1 = 0.312, BEGIN0 = 0.24;
// lamps that burn while it is dark: x, z, height above the water or the ground, colour, size
const LAMPS = {
  coast: [[287, -74, 16, 0, 2.6], [287, -74, 4, 0, 2], [342, -56, 18, 0, 2.8], [342, -56, 4.5, 1, 2], [252, -78, 13, 0, 2.4], [384, -40, 20, 0, 2.8], [384, -40, 5, 2, 2],
    [341, 35, 8, 0, 2.4], [341, 35, 3, 0, 1.8], [322, 112, 5, 0, 2.6], [344, 108, 4, 0, 2.2], [366, 120, 6, 0, 2.6], [392, 126, 5, 0, 2.4], [331, 121, 3, 0, 2], [310, 114, 4, 0, 2.2],
    [212.5, -28.6, 1.6, 0, 1.5], [238.4, -36.9, 1.5, 0, 1.3], [277.6, -45.6, 1.4, 0, 1.2], [352, -74, 15, 0, 2.4], [352, -74, 4, 2, 1.8], [275.6, 36.5, 7, 0, 2.2], [250, 48.6, 6, 1, 2]],
};
const LAMP_COL = [[1.0, 0.68, 0.34], [1.0, 0.3, 0.2], [0.4, 0.9, 0.62]];

class Game {
  constructor(canvas, ui, audio) {
    this.R = new Renderer(canvas);
    this.ui = ui; this.audio = audio;
    this.worlds = {}; this.building = null;
    this.slot = 0; this.wi = -1; this.cur = null; this.ch = null; this.slotCh = [null, null];
    this.trans = null; this.mode = 'boot';
    this.pl = { x: 0, y: 0, z: 0, heading: 0, vx: 0, vz: 0, alt: 0, valt: 0, step: 0 };
    this.camYaw = 0; this.camPitch = -0.06; this.camDist = 5.9;
    this.keys = {}; this.joy = [0, 0]; this.flyHeld = false;
    this.t = 0.3; this.phase = 0; this.prevPhase = 0; this.scrubbing = false;
    this.caps = {}; this.unlocked = 0; this.found = {}; this.foundT = {}; this.days = 0; this.reverie = false; this.met = {}; this.metT = {};
    this.spot = -1; this.lastSpot = -1; this.viewK = 0; this.spotHold = 0; this.spotBlock = -1; this.pending = null;
    this.paintK = 0; this.paintE = null; this.phShown = null; this.phHold = 0; this.debugCam = null;
    this.hero = new Hero();
    this.lean = 0; this.roll = 0; this.fovK = 0; this.trail = []; this.sliding = false; this.slideCol = [1, 1, 1]; this.flown = false;
    this.flowPhase = [0, 0]; this.time = 0;
    this.dyn = new Strokes(MAX_DYN);
    this.auto = false; this.doorOn = false; this.doorT = 0; this.flash = 0;
    this.quality = 2; this.fpsAcc = 0; this.fpsN = 0; this.fpsHold = 6; this.autoQuality = true;
    this.beats = 1; this.beatsMax = ENERGY ? 1 : Infinity; this.beatDry = false;
    this.saver = false; this.saverStep = 0; this.resK = 1; this.costs = []; this.probeIn = 2.5; this.probeNext = false; this.lastCost = 0;
    this.cam = { pos: [0, 0, 0], fwd: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0], fov: TP_FOV };
    this.env = {}; this.envB = {};
    this.frame = { solidAppear: [0, 0], flowPhase: this.flowPhase, casters: [[], []], shadowOrigin: [0, 0], shadowSize: 400, shadowStrength: 0.9, hero: [0, 0, 0, 0],
      wave: [0, 0, 0.001], front: [-9, 9], solidWave: [[0, 0, 0.001, -9, 9], [0, 0, 0.001, -9, 9]], waveA: [0, 0, 0.001], waveB: [0, 0, 0.001], pivot: [0, 0, 0] };
    this.dynCasters = [];
    this.titleT = 0; this.dpr = 1; this.cssW = 0; this.cssH = 0;
    this.snap = document.createElement('canvas'); this.snap.width = 570; this.snap.height = 380;
    this.big = {}; // the pictures she has caught, at their full size (the small ones in caps are for the album's wall and are what is kept with the game)
    this.frameFrac = FRAME_FRAC; // how much of the screen the frame takes on this screen (the interface sets it by the shape of the screen)
  }
  // the height of the frame as a part of the height of the screen
  frameH() { return Math.min(this.cssH * this.frameFrac, (this.cssW * this.frameFrac) / 1.5) / Math.max(1, this.cssH); }

  // ----- building the painted worlds, a little each frame -----
  prepare(idx) {
    if (this.worlds[idx] || (this.building && this.building.idx === idx)) return;
    if (this.building) this.finishBuild();
    const ch = WORLDS[idx], W = new World(ch.seed);
    W.wind = ch.wind;
    ch.build(W);
    this.building = { idx, W, i: 0 };
  }
  // one call does what fits into ms and at least one piece. After the painting itself come four more pieces, each on a frame of
  // its own so that none of them is felt: the order of the strokes, the baking, and what lives in that world (its lines of light
  // and its birds, its people), made ready now so that arriving there costs nothing
  pump(ms) {
    const b = this.building;
    if (!b) return false;
    const t0 = performance.now();
    this.pumped = true;
    if (b.i < b.W.tasks.length) {
      while (b.i < b.W.tasks.length) { b.W.tasks[b.i++](); if (performance.now() - t0 > ms) break; }
      return true;
    }
    const ch = WORLDS[b.idx], st = (b.st = (b.st || 0) + 1);
    if (st === 1) { b.W.S.shuffle(mulberry32(ch.seed + 1)); b.W.S.pad(mulberry32(ch.seed + 2)); }
    else if (st === 2) { b.W.bake(ch); b.W.tasks = []; this.worlds[b.idx] = b.W; }
    else if (st === 3) { if (b.W !== this.cur) ALIVE.prepare(this, ch, b.W); }
    else { if (b.W !== this.cur) FOLK.prepare(this, ch, b.W); this.building = null; return false; }
    return true;
  }
  finishBuild() { while (this.pump(1e9)) { /* run to the end */ } }
  ensure(idx) { if (!this.worlds[idx]) this.prepare(idx); if (this.building && this.building.idx === idx) this.finishBuild(); return this.worlds[idx]; }

  // ----- worlds -----
  // the paintings of a world that everyone is shown, and those that stand off the path at an easel nobody points to
  // (0.9) How many beats the parasol has before she must touch the ground again. One at first; the paintings bring more: one more
  // at each of BEAT_NODES (2, 6, 10, 14, 18 paintings of the twenty five), and with all twenty five it no longer tires.
  // In the 0.8 line it never did
  mainCount() { let n = 0; for (const ch of WORLDS) for (const e of ch.effects) if (!e.hidden && this.caps[e.id]) n++; return n; }
  beatsCap() {
    if (!ENERGY) return Infinity;
    const main = this.mainCount();
    if (!this.mainLeft()) return Infinity;
    let cap = 1; for (const x of BEAT_NODES) if (main >= x) cap++;
    return cap;
  }
  capCount(ch) { let n = 0; for (const e of ch.effects) if (!e.hidden && this.caps[e.id]) n++; return n; }
  hidCount(ch) { let n = 0; for (const e of ch.effects) if (e.hidden && this.caps[e.id]) n++; return n; }
  mainLeft() { for (const ch of WORLDS) for (const e of ch.effects) if (!e.hidden && !this.caps[e.id]) return true; return false; }
  // the hidden painting of a world is no secret any more once its other paintings are all caught, or once the ending has been seen
  hidOpen(ch) { ch = ch || this.ch; return !!ch && (this.capCount(ch) >= ch.need || !!(this.ui && this.ui.ended)); }
  spotFound(i, ch) { ch = ch || this.ch; const s = ch.spots[i]; return !!s && (!s.hidden || !!this.found[ch.id + i]); }
  showWorld(idx) {
    const W = this.ensure(idx), ch = WORLDS[idx];
    this.slot = 0; this.wi = idx; this.cur = W; this.ch = ch; this.slotCh = [ch, ch];
    this.R.uploadWorld(0, W); this.R.uploadWorld(1, W); this.R.clearSolids(1);
    this.t = ch.t0 === undefined ? 0.3 : ch.t0; this.phase = 0; this.prevPhase = 0;
    this.place(ch.start);
    this.doorOn = !!ch.door && this.capCount(ch) >= ch.need;
    this.trans = null; this.spot = -1; this.viewK = 0; this.phShown = null; this.paintK = 0;
    for (const key in this.worlds) if (+key !== idx) delete this.worlds[key];
    ALIVE.enter(this); FOLK.enter(this); SIGHTS.enter(this);
  }
  place(s) {
    const p = this.pl;
    p.x = s.x; p.z = s.z; p.heading = s.yaw || 0; p.vx = p.vz = 0; p.alt = 0; p.valt = 0;
    p.y = p.yAbs = this.groundAt(this.cur, p.x, p.z); this.trail.length = 0;
    this.camYaw = s.yaw || 0; this.camPitch = -0.05;
  }
  // The ground under her own feet: the land, the water, a low deck, or the top of something tall that she has come down on (W.roof: the
  // road bridge at Argenteuil). A roof holds her only from above, so that she still walks under it
  floorAt(W, p) { let h = this.groundAt(W, p.x, p.z); if (W.roof && p.yAbs !== undefined) { const r = W.roof(p.x, p.z); if (r !== null && r > h && p.yAbs >= r - 0.9) h = r; } return h; }
  groundAt(W, x, z) {
    let h = W.h(clamp(x, -790, 790), clamp(z, -790, 790));
    if (W.waterY !== null && h < W.waterY) h = W.waterY;
    if (W.deck) { const d = W.deck(x, z); if (d !== null && d > h) h = d; }
    return h;
  }
  startTransition(toIdx) {
    if (this.trans || toIdx === this.wi) return;
    const W = this.ensure(toIdx), ch = WORLDS[toIdx], other = 1 - this.slot, p = this.pl;
    this.R.uploadWorld(other, W);
    this.slotCh[other] = ch;
    const s = ch.start;
    this.trans = { from: this.wi, to: toIdx, t: 0, dur: 8.6, q0: 0, fromW: this.cur, toW: W, fromCh: this.ch, toCh: ch, shown: false,
      pose0: { x: p.x, y: p.y, z: p.z, heading: p.heading, yaw: this.camYaw, pitch: this.camPitch },
      t0: this.t, ph0: this.phaseNow(), t1: ch.t0 === undefined ? 0.3 : ch.t0 };
    this.flowPhase[other] = 0;
    this.auto = false; this.doorOn = false; this.spot = -1;
    // her way through the air is laid over the land of both worlds: over every hill of the old one while it can still be seen,
    // and over those of the new one from the moment it begins to settle, so that she never goes through a slope
    { const tr = this.trans, N = 64, env = tr.env = new Float32Array(N + 1), tmp = new Float32Array(N + 1);
      for (let j = 0; j <= N; j++) {
        const q = j / N, e = ease(sstep(0.05, 0.95, q)), x = lerp(tr.pose0.x, s.x, e), z = lerp(tr.pose0.z, s.z, e);
        env[j] = Math.max(q < 0.52 ? this.groundAt(tr.fromW, x, z) : -1e9, q > 0.42 ? this.groundAt(W, x, z) : -1e9) + 6.5;
      }
      for (let pass = 0; pass < 2; pass++) { // widen every rise a little, then round it off, never going under the land
        for (let j = 0; j <= N; j++) { let m = -1e9; for (let k = -3; k <= 3; k++) m = Math.max(m, env[clamp(j + k, 0, N)]); tmp[j] = m; }
        for (let j = 0; j <= N; j++) env[j] = Math.max(tmp[j], (tmp[clamp(j - 2, 0, N)] + tmp[clamp(j - 1, 0, N)] + tmp[j] + tmp[clamp(j + 1, 0, N)] + tmp[clamp(j + 2, 0, N)]) / 5);
      }
    }
    this.mode = 'trans';
    if (this.audio) this.audio.setChapter(toIdx, 2, 6);
    this.ui.onLeave(this.ch, ch);
  }
  endTransition() {
    const tr = this.trans;
    this.slot = 1 - this.slot; this.wi = tr.to; this.cur = tr.toW; this.ch = tr.toCh;
    this.t = tr.t1; this.phase = 0; this.prevPhase = 0; this.phShown = null; this.paintK = 0;
    delete this.worlds[tr.from];
    this.trans = null; this.transK = 0; if (this.audio) this.audio.setRush(0);
    const p = this.pl; p.alt = 0; p.valt = 0; p.vx = p.vz = 0; p.yAbs = p.y = this.groundAt(this.cur, p.x, p.z); this.trail.length = 0;
    this.unlocked = Math.max(this.unlocked, this.wi);
    this.doorOn = !!this.ch.door && this.capCount(this.ch) >= this.ch.need;
    this.mode = 'play'; this.viewK = 0; this.spot = -1;
    this.ui.onArrive(this.ch, this.wi);
    this.save();
    ALIVE.enter(this); FOLK.enter(this); SIGHTS.enter(this);
    if (this.wi + 1 < WORLDS.length) this.prepare(this.wi + 1);
  }

  // ----- persistence -----
  saveState() { return { wi: this.mode === 'title' || this.mode === 'boot' ? -1 : (this.trans ? this.trans.to : this.wi), unlocked: this.unlocked, caps: this.caps, found: this.found, days: this.days, met: this.met }; }
  save() {
    Game._mem = this.saveState();
    try { localStorage.setItem('ruhua.monet.v1', JSON.stringify(Game._mem)); } catch (e) { /* storage may be full or unavailable */ }
  }
  static loadSave() {
    try { const s = JSON.parse(localStorage.getItem('ruhua.monet.v1') || 'null'); if (s && typeof s.wi === 'number' && s.caps) return s; } catch (e) { /* ignore */ }
    const m = Game._mem;
    return m && typeof m.wi === 'number' && m.caps ? m : null;
  }

  // ----- flow -----
  boot() {
    this.showWorld(0);
    this.mode = 'title';
    const s = Game.loadSave();
    if (s) { this.caps = s.caps || {}; this.unlocked = s.unlocked || 0; this.found = s.found || {}; this.days = s.days || 0; this.met = s.met || {}; }
    // behind the title the next world is painted already: the one a kept game goes on in, or the second
    const next = s && s.wi > 0 && s.wi < WORLDS.length ? s.wi : 1;
    if (next < WORLDS.length) this.prepare(next);
  }
  begin(fresh) {
    const s = fresh ? null : Game.loadSave();
    if (fresh) { this.caps = {}; this.unlocked = 0; this.found = {}; this.days = 0; this.met = {}; }
    const target = s && s.wi >= 0 && s.wi < WORLDS.length ? s.wi : 0;
    if (target === this.wi) {
      this.place(this.ch.start);
      this.mode = 'play';
      // the camera drifts back from the picture on the title to the walker, and the day begins at its beginning
      if (this.ch.title && this.ch.spots[0]) { this.lastSpot = 0; this.viewK = 1; this.spotBlock = -1; }
      // a first game begins at the first glow before that sunrise: the sun of the title slips back to the horizon as the eye draws back
      if (this.wi === 0 && !this.caps.c1) { this.rewind = { from: this.t, to: BEGIN0, k: 0, dur: 1.6 }; this.phase = this.prevPhase = 0; }
      else if (this.ch.t0 !== undefined) this.t = Math.min(this.t, this.ch.t0 + 0.02);
      this.doorOn = !!this.ch.door && this.capCount(this.ch) >= this.ch.need;
      this.ui.onArrive(this.ch, this.wi);
      if (this.audio) this.audio.setChapter(this.wi, 2, 3);
      if (this.wi + 1 < WORLDS.length) this.prepare(this.wi + 1);
      this.save();
      return;
    }
    this.startTransition(target);
  }

  // ----- the hour -----
  phaseTarget() {
    const ph = this.ch.phases, n = ph.length, t = this.t;
    if (t > 0.8) return mixPhase(ph[this.phase], ph[(this.phase + 1) % n], ((t - 0.8) / 0.2) * 0.5);
    if (t < 0.19) return mixPhase(ph[this.prevPhase], ph[this.phase], 0.5 + (t / 0.19) * 0.5);
    return mixPhase(ph[this.phase], ph[this.phase], 0);
  }
  // the season on screen follows the calendar a little behind, so a jump of the calendar is a slow change of the land
  phaseNow() { return this.phShown || (this.phShown = this.phaseTarget()); }
  stepPhase(dt) { const tg = this.phaseTarget(); this.phShown = this.phShown ? mixPhase(this.phShown, tg, 1 - Math.exp(-dt * 2.4)) : tg; this.phHold = Math.max(0, this.phHold - dt); }
  // the hand on the dial: whoever moves the sun or the season at an easel takes the light into their own keeping
  // at the very first easel the sun and the weather are not hers to move until the first painting is caught: a slip of the hand
  // during that first sunrise would take the day out of its course
  sunLocked() { return this.mode === 'play' && this.wi === 0 && !this.caps.c1 && (this.spot >= 0 || this.viewK > 0.05); }
  setTime(t) { if (this.sunLocked()) return; this.t = clamp(t, 0.2, 0.8); this.handT = 0; if (this.spot >= 0) this.manual = true; }
  setPhase(i) { if (this.sunLocked()) return; const n = this.ch.phases.length; i = ((i % n) + n) % n; this.handT = 0; if (this.spot >= 0 && HAND[this.ch.id] !== 1) this.manual = true; if (i === this.phase && this.prevPhase === i) return; this.phase = i; this.prevPhase = i; this.phHold = 2.2; if (isNight(this.t)) this.t = 0.3; this.ui.onPhase(i); }
  // the painting an easel is turning towards: one whose light is here now, else the next to come round the day and the year
  want(id) { this.wantId = id; this.manual = false; this.restT = 0; this.lastCap = null; this.paintK = 0; }
  aim(spot) {
    if (spot === undefined) spot = this.spot;
    if (spot < 0) return null;
    if (spot === this.spot && this.wantId) { const w = this.ch.effects.find((x) => x.id === this.wantId && x.spot === spot); if (w) return w; this.wantId = null; }
    const n = this.ch.phases.length;
    let best = null, bc = 1e9;
    for (const e of this.ch.effects) {
      if (e.spot !== spot || this.caps[e.id]) continue;
      const dp = e.phase < 0 ? 0 : (((e.phase - this.phase) % n) + n) % n, mid = e.t0 + 0.35 * (e.t1 - e.t0);
      const c = dp * 10 + (this.t <= e.t1 ? Math.max(0, mid - this.t) : 1 + mid);
      if (c < bc) { bc = c; best = e; }
    }
    return best;
  }
  // the painting in question at an easel: the one just caught, the one being painted, the one the light is turning to
  focus(spot) {
    if (spot < 0) return null;
    if (spot === this.spot) { if (this.restT > 0 && this.lastCap) return this.lastCap; if (this.paintE) return this.paintE; }
    let e = this.aim(spot);
    if (!e && spot === this.spot && this.lastCap && this.lastCap.spot === spot) e = this.lastCap;
    if (!e) for (const x of this.ch.effects) if (x.spot === spot) { e = x; break; }
    return e;
  }
  advanceTime(dt) {
    if (this.scrubbing) { this.rewind = null; return; }
    if (this.rewind) { const r = this.rewind; r.k += dt / (r.dur || 2.8); this.t = lerp(r.from, r.to, ease(Math.min(1, r.k))); if (r.k >= 1) this.rewind = null; return; }
    const inView = this.spot >= 0 && this.viewK > 0.9, n = this.ch.phases.length;
    if (this.reverie) { // the ending: behind the wall of her pictures the days and the seasons go by of themselves
      this.t += dt * (isNight(this.t) ? 0.4 : 1 / 30);
      if (this.t >= 1) { this.t -= 1; this.prevPhase = this.phase; this.phase = (this.phase + 1) % n; this.ui.onPhase(this.phase); }
      return;
    }
    this.restT = Math.max(0, (this.restT || 0) - dt);
    let rate = 1 / 320;
    const first = this.wi === 0 && !this.caps.c1 && this.phase === 0 && this.t >= DAWN0 - 0.03 && this.t < 0.232;
    const u = inView && this.paintK <= 0 && this.restT <= 0 ? this.aim() : null;
    let e = this.manual ? null : u;
    // in the later worlds a painting not yet caught waits for her hand: the season in the fields, the season and the sun at the pond
    this.needHand = null;
    if (u && !this.caps[u.id] && !this.helpOn && HAND[this.ch.id]) {
      const here = u.phase < 0 || u.phase === this.phase;
      if (HAND[this.ch.id] >= 2) this.needHand = here ? 'sun' : 'season'; else if (!here) this.needHand = 'season';
      if (this.needHand) {
        e = null; this.handT = (this.handT || 0) + dt;
        if (this.handT > 20) { this.helpOn = true; this.needHand = null; this.manual = false; e = u; } // she has waited long enough: the light goes on by itself
      }
    }
    if (e) {
      // standing at an easel: the day and the year run on of themselves to the hour he painted
      const P = e.phase < 0 ? this.phase : e.phase, tt = e.t0 + 0.35 * (e.t1 - e.t0);
      const fast = this.wantId === e.id ? 2.4 : 1, seen = !!this.caps[e.id];
      if (seen && this.phase === P && this.t >= tt - 1e-4 && this.t <= e.t1) {
        // a moment asked for again has come round: the light holds on it for a while, and its name is said once more
        this.wantId = null; this.lastCap = e; this.restT = 7; rate = 1 / 900; this.ui.onReview(e);
      } else if (this.t > e.t1 || (seen && this.t > tt)) { rate = (isNight(this.t) ? 0.45 : 0.14) * fast; this.nextPhase = P; } // its hour is past today: on through evening and night
      else {
        if (this.phase !== P) { this.phase = P; this.prevPhase = P; this.phHold = 1.6; this.ui.onPhase(P); }
        if (this.t < tt) {
          rate = (isNight(this.t) ? 0.45 : clamp((tt - this.t) * 0.9, 0.03, 0.13)) * fast;
          const pace = PACE[e.id];
          if (pace && this.t > DAWN0 - 0.03) rate = pace.rate * (this.t < 0.205 ? 2.6 : 1); // this dawn is not hurried: out of the night at a walk, then slowly up through the sunrise
          if (this.t + rate * dt > tt) rate = (tt - this.t) / dt;
        }
      }
    } else if (first && !inView) rate *= 0.12; // until she comes to the first easel the night waits for her
    else if (isNight(this.t)) rate *= 7;
    else if (this.paintK > 0) rate *= 0.6;
    else if (inView) rate *= this.restT > 0 ? 1 : 3;
    this.t += dt * rate;
    if (this.t >= 1) {
      this.t -= 1; this.prevPhase = this.phase; this.days++;
      this.phase = this.nextPhase !== undefined && this.nextPhase !== null ? this.nextPhase : (this.phase + 1) % n;
      this.ui.onPhase(this.phase);
    }
    this.nextPhase = null;
  }
  // how near the painting at this easel is to being caught: a turn of the ring for the eye settling, the hour coming round, and the brush
  ringState() {
    if (this.spot < 0) return null;
    if (this.restT > 0 && this.lastCap) return { e: this.lastCap, k: 1, st: 'done' };
    const e = this.paintE || this.aim();
    if (!e) return { e: this.focus(this.spot), k: 1, st: 'done' };
    if ((this.manual || this.needHand) && !this.paintE) return { e, k: 0, st: 'hand' };
    let rem = 0;
    if (this.paintE !== e) rem = this.t <= e.t1 ? Math.max(0, e.t0 - this.t) : 1 - this.t + e.t0;
    if (this.ringE !== e) { this.ringE = e; this.ring0 = Math.max(rem, 0.012); }
    if (rem > this.ring0) this.ring0 = rem;
    return { e, k: clamp(0.07 * this.viewK + 0.55 * (1 - rem / this.ring0) + 0.38 * this.paintK, 0, 1), st: this.paintE === e ? 'paint' : 'wait' };
  }
  // a sight is met when it has stood in view for a moment, near enough to be made out (not from an easel: there the eye is on the painting)
  watchSights(dt) {
    if (this.viewK > 0.3 || !this.R.vpMain) return;
    const list = SIGHTS.now(this), m = this.R.vpMain, cp = this.cam.pos || [this.pl.x, this.pl.y, this.pl.z];
    for (const s of list) {
      if (!s || this.met[s.id]) continue;
      const cx = m[0] * s.x + m[4] * s.y + m[8] * s.z + m[12], cy = m[1] * s.x + m[5] * s.y + m[9] * s.z + m[13], cw = m[3] * s.x + m[7] * s.y + m[11] * s.z + m[15];
      const seen = (s.k === undefined ? 1 : s.k) > 0.6 && cw > 0.01 && Math.abs(cx / cw) < 0.82 && Math.abs(cy / cw) < 0.82
        && (s.sky || Math.hypot(s.x - cp[0], s.y - cp[1], s.z - cp[2]) < Math.max(170, (s.r || 10) * 9));
      const t = this.metT[s.id] = Math.max(0, (this.metT[s.id] || 0) + (seen ? dt : -dt * 0.5));
      if (t > 1.6) { this.met[s.id] = 1; this.metT[s.id] = 0; this.save(); this.ui.onSight(s.id); }
    }
  }
  anyLeftAtSpot() { for (const e of this.ch.effects) if (e.spot === this.spot && !this.caps[e.id]) return true; return false; }
  spotOpen(i) { if (!this.spotFound(i)) return false; for (const e of this.ch.effects) if (e.spot === i && !this.caps[e.id]) return true; return false; }

  // where on the screen the next place of interest lies, for the small ring that points to it
  targetScreen() {
    const t = this.target();
    if (!t) return null;
    const y = this.groundAt(this.cur, t.x, t.z) + 1.6, m = this.R.vpMain;
    const cx = m[0] * t.x + m[4] * y + m[8] * t.z + m[12], cy = m[1] * t.x + m[5] * y + m[9] * t.z + m[13], cw = m[3] * t.x + m[7] * y + m[11] * t.z + m[15];
    const behind = cw <= 0.01, w = behind ? 0.01 : cw;
    return { nx: (behind ? -1 : 1) * cx / w, ny: (behind ? -1 : 1) * cy / w, behind, dist: Math.hypot(t.x - this.pl.x, t.z - this.pl.z), up: y - 1.6 - (this.pl.yAbs === undefined ? y - 1.6 : this.pl.yAbs), kind: t.kind };
  }
  // where the walker might go next: the nearest place with a painting still to catch, else the frame
  target() {
    if (!this.ch || this.mode !== 'play') return null;
    let best = null, bd = 1e9;
    this.ch.spots.forEach((s, i) => { if (!this.spotOpen(i)) return; const d = Math.hypot(s.x - this.pl.x, s.z - this.pl.z); if (d < bd) { bd = d; best = { x: s.x, z: s.z, kind: 'spot' }; } });
    if (this.doorOn && this.ch.door && (!best || this.auto === 'door')) best = { x: this.ch.door.x, z: this.ch.door.z, kind: 'door' };
    return best;
  }

  update(dt) {
    this.time += dt;
    const tWas = this.t;
    this.pumped = false;
    if (this.building) {
      // the next world is painted where it cannot be felt: behind the title, and while the picture stands still at an easel
      // (nothing moves there but the light; not while a caught painting is being shown, that moment is hers). Once the frame
      // that leads on stands open it is painted wherever she is, so that it is ready when she reaches it
      const still = this.mode === 'play' && this.spot >= 0 && this.viewK > 0.985 && !(this.restT > 0.3) && !this.pending;
      const ms = this.mode === 'title' ? 9 : still ? 7 : this.mode === 'play' && this.doorOn ? 3 : 0;
      if (ms > 0) this.pump(ms);
    }
    if (this.mode === 'title') {
      this.titleT += dt;
      const v = this.titleView();
      // The title of the first world opens on the hour of the painting, the sun just up, and lets it climb a little and breathe.
      // (It used to begin in the night and take twenty seconds to reach the sunrise: someone who comes from a link saw a dark page first.)
      const t0 = this.wi === 0 ? TITLE0 : v.t0, t1 = this.wi === 0 ? TITLE1 : v.t1;
      const k = this.wi === 0 ? ease(clamp(this.titleT / 7, 0, 1)) - 0.25 * (0.5 - 0.5 * Math.cos(Math.max(0, this.titleT - 8) * 0.09)) : 0.5 - 0.5 * Math.cos(this.titleT * 0.06);
      this.t = t0 + (t1 - t0) * k;
      this.stepPhase(dt);
      SIGHTS.update(this, dt);
    } else if (this.mode === 'trans') {
      this.updateTransition(dt);
    } else {
      this.advanceTime(dt);
      this.stepPhase(dt);
      this.updatePlayer(dt);
      this.updateSpots(dt);
      ALIVE.update(this, dt); FOLK.update(this, dt); SIGHTS.update(this, dt);
      this.watchSights(dt);
    }
    if (this.spot >= 0 || this.mode !== 'play') this.free = false;
    this.freeK = (this.freeK || 0) + ((this.free ? 1 : 0) - (this.freeK || 0)) * Math.min(1, dt * 3.2);
    if (this.mode !== 'title' && this.ch) {
      const sv = this.spot >= 0 && this.ch.spots[this.spot] ? this.ch.spots[this.spot].view : null;
      this.hero.breeze += ((sv && sv.breeze ? sv.breeze : 1) - this.hero.breeze) * Math.min(1, dt * 1.5);
      this.hero.pose += ((sv && sv.act === 1 ? 1 : 0) - this.hero.pose) * Math.min(1, dt * 1.6); this.hero.eye = this.cam.pos || null;
      this.hero.pose2 += ((sv && sv.act === 2 ? 1 : 0) - this.hero.pose2) * Math.min(1, dt * 1.6);
      this.hero.step(dt, this.pl, sv && sv.gale ? sv.gale : this.ch.wind, this.time, this.pl.alt > 0.06, this.sliding);
    }
    this.flowPhase[0] += dt * 0.05; this.flowPhase[1] += dt * 0.05;
    // how fast the day is running against its walking pace (smoothed), for whatever in the world keeps time with it
    { let d = this.t - tWas; if (d < -0.5) d += 1; else if (d > 0.5) d -= 1; const r = dt > 0 ? clamp(Math.abs(d) / dt * 320, 0, 60) : 1; this.rush = (this.rush === undefined ? 1 : this.rush) + (r - (this.rush === undefined ? 1 : this.rush)) * Math.min(1, dt * 2.5); }
    if (this.doorOn) this.doorT += dt;
    this.flash = Math.max(0, this.flash - dt * 1.2);
  }

  updatePlayer(dt) {
    const p = this.pl, K = this.keys, W = this.cur;
    let mx = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0) + this.joy[0];
    let mz = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) - this.joy[1];
    const turn = (K.KeyE ? 1 : 0) - (K.KeyQ ? 1 : 0);
    this.camYaw += turn * dt * 1.5;
    const wantUp = !!(K.Space || this.flyHeld);
    if (this.spot >= 0 && this.heldKeys) {
      // the keys that brought her here are still down: they do not carry her off again, unless she really keeps at it.
      // (Only what was held when the light took her counts: a key pressed after that is a new wish)
      if (!(mx || mz || wantUp)) this.heldKeys = false;
      else { this.heldT = (this.heldT || 0) + dt; if (this.heldT > 2.8) this.heldKeys = false; }
      if (this.heldKeys) { mx = 0; mz = 0; }
    }
    if (this.spot >= 0) {
      // a thumb that only brushes the screen, or a key only tapped, does not take her from the easel: the push must be held a moment
      const keyed = !!(K.KeyD || K.ArrowRight || K.KeyA || K.ArrowLeft || K.KeyW || K.ArrowUp || K.KeyS || K.ArrowDown);
      this.joyT = keyed || Math.hypot(this.joy[0], this.joy[1]) > 0.6 ? (this.joyT || 0) + dt : 0;
      if (this.joyT < (keyed ? 0.22 : 0.28)) { mx = 0; mz = 0; }
    } else this.joyT = 0;
    const caught = this.spot >= 0 || this.spotNear >= 0;
    if ((mx || mz) && this.spot >= 0) this.leaveSpot();
    let fwdYaw = this.camYaw, near = 1e9, tgtY = null;
    if (this.auto) {
      if (mx || mz) { this.auto = false; this.ui.onAuto(false); }
      else {
        const t = this.target();
        if (t) {
          const d = Math.hypot(t.x - p.x, t.z - p.z); near = d; tgtY = this.groundAt(W, t.x, t.z);
          if (d > (t.kind === 'spot' ? 1.0 : 0.5)) { fwdYaw = Math.atan2(t.x - p.x, -(t.z - p.z)); mz = d < 4 ? 0.5 : 1; this.camYaw += angDiff(fwdYaw, this.camYaw) * Math.min(1, dt * 0.7); }
        }
      }
    }
    const l = Math.hypot(mx, mz);
    this.pushing = l > 0.05 || wantUp; // she is being moved: by the keys, the stick, or the light she is seeking
    if (l > 1) { mx /= l; mz /= l; }
    const shift = !!(K.ShiftLeft || K.ShiftRight), maxAlt = this.ch.maxAlt || 42;
    const gy0 = this.floorAt(W, p);
    if (p.yAbs === undefined) p.yAbs = gy0 + p.alt;
    let inAir = p.alt > 0.06;
    // seeking the light and held up by a wall or a tree: she lets the parasol lift her over it
    if (this.auto && l > 0.1) {
      this.stuckT = (this.realSp === undefined ? 9 : this.realSp) < 1.2 && !inAir ? (this.stuckT || 0) + dt : 0;
      if (this.stuckT > 0.7) { this.autoLift = 1.2; this.stuckT = 0; }
    } else this.stuckT = 0;
    this.autoLift = Math.max(0, (this.autoLift || 0) - dt);
    // and where the land rises in front of her she beats the parasol until she is over it
    let autoHold = false;
    if (this.auto && l > 0.1 && near < 1e8) {
      const ax = Math.sin(fwdYaw), az = -Math.cos(fwdYaw);
      let ahead = -1e9;
      for (const dd of [2.5, 5, 9]) { const q = Math.min(dd, near); ahead = Math.max(ahead, this.groundAt(W, p.x + ax * q, p.z + az * q)); }
      autoHold = inAir ? p.yAbs < ahead + 2.4 : ahead - gy0 > 1.5;
    }
    const hold = !!(((wantUp && !(this.spot >= 0 && this.heldKeys)) || this.autoLift > 0 || autoHold) && !(this.spotNear >= 0));
    if (wantUp && this.spot >= 0 && !this.heldKeys) this.leaveSpot();
    const hs0 = Math.hypot(p.vx, p.vz);
    // a beat of the parasol: one for a tap, one after another while it is held. Each lifts her and throws her forward
    this.flapT = Math.max(0, (this.flapT || 0) - dt);
    this.liftT = Math.max(0, (this.liftT || 0) - dt);
    this.flapK = Math.max(0, (this.flapK || 0) - dt * 2.6);
    // (0.9) the parasol has only so many beats in the air; on the ground, or on the water, it has them all again.
    // Led to the next painting by the light she is carried: those beats are not counted
    const cap = this.beatsMax = this.beatsCap(), led = !!this.auto || this.autoLift > 0;
    if (!inAir) { this.beats = cap; this.beatDry = false; }
    if (hold && this.flapT <= 0 && p.alt < maxAlt - 1) {
      if (cap !== Infinity && !led && this.beats <= 0) { this.flapT = 0.44; if (!this.beatDry) { this.beatDry = true; this.ui.onDry(); } } // spent: she glides
      else {
        if (cap !== Infinity && !led) this.beats--;
        p.valt = Math.max(p.valt, 0) * 0.4 + 9.5; this.flapT = 0.44; this.liftT = 0.9; this.flapK = 1;
        if (!inAir) { p.yAbs = gy0 + 0.1; p.alt = 0.1; inAir = true; }
        if (mz > 0.2 && hs0 < 21 && !(this.auto && near < 24)) { const a = this.auto ? fwdYaw : this.camYaw; p.vx += Math.sin(a) * 3.2; p.vz -= Math.cos(a) * 3.2; }
        if (this.audio) this.audio.flap();
        if (!this.flown) { this.flown = true; this.ui.onFly(); }
      }
    }
    const waterY = W.waterY, hh = (x, z) => { const h = W.h(clamp(x, -790, 790), clamp(z, -790, 790)); return waterY !== null && h < waterY ? waterY : h; };
    const base0 = hh(p.x, p.z), onWater = waterY !== null && gy0 <= waterY + 0.001, snowy = !!(this.envNow && this.envNow.snow > 0.5);
    let sK = 0;
    if (!inAir) {
      // on the ground: walking has grip. Water and snow are for skating, a slope carries her down it, and a landing at speed runs on into a slide
      const flat = gy0 > base0 + 0.05; // on a deck
      const gx = flat ? 0 : (hh(p.x + 1, p.z) - hh(p.x - 1, p.z)) * 0.5, gz = flat ? 0 : (hh(p.x, p.z + 1) - hh(p.x, p.z - 1)) * 0.5, grade = Math.hypot(gx, gz);
      const down = grade > 0.05 && hs0 > 0.4 ? Math.max(0, -(p.vx * gx + p.vz * gz) / (hs0 * grade)) : 0;
      this.slideT = Math.max(0, (this.slideT || 0) - dt);
      let dSpot = 1e9; for (const sp of this.ch.spots) dSpot = Math.min(dSpot, Math.hypot(sp.x - p.x, sp.z - p.z));
      sK = Math.max(onWater || snowy ? 1 : 0, clamp((grade - 0.1) / 0.14, 0, 1) * down, clamp((grade - 0.55) / 0.25, 0, 1), clamp(this.slideT / 0.5, 0, 1));
      sK *= clamp((dSpot - 3.5) / 4, 0, 1); // the ground holds her by an easel
      const fx = Math.sin(fwdYaw), fz = -Math.cos(fwdYaw), rx = Math.cos(fwdYaw), rz = Math.sin(fwdYaw);
      const ix = fx * mz + rx * mx, iz = fz * mz + rz * mx, top = shift ? 9 : 5.4;
      const against = hs0 > 1 && l > 0.1 ? Math.max(0, -(ix * p.vx + iz * p.vz) / (hs0 * l)) : 0; // leaning back against the slide is a brake
      const drag = lerp(7, 0.55, sK) + 2.6 * against * sK, push = lerp(top * 7, shift ? 8 : 5, sK);
      p.vx += (ix * push - p.vx * drag) * dt; p.vz += (iz * push - p.vz * drag) * dt;
      p.vx -= gx * 13 * sK * dt; p.vz -= gz * 13 * sK * dt;
      if (caught) { const b = Math.max(0, 1 - dt * 7); p.vx *= b; p.vz *= b; } // and stills her feet
      let hs = Math.hypot(p.vx, p.vz);
      if (sK > 0.3 && l > 0.1 && hs > 1.5) { // carving: the slide turns towards where she leans and keeps its speed
        const da = clamp(angDiff(Math.atan2(ix, -iz), Math.atan2(p.vx, -p.vz)), -2.0 * dt * sK, 2.0 * dt * sK), c = Math.cos(da), sn = Math.sin(da);
        const vx = p.vx * c - p.vz * sn, vz = p.vx * sn + p.vz * c; p.vx = vx; p.vz = vz;
      }
      if (hs > 19) { p.vx *= 19 / hs; p.vz *= 19 / hs; hs = 19; }
      this.sliding = sK > 0.3 && hs > 4.2;
      if (this.sliding && !this.slid && hs > 6) { this.slid = true; this.ui.onSlide(); }
      p.valt = 0;
    } else {
      // in the air she goes where the eye goes: look down to dive and gather speed, look up to spend it on height
      this.sliding = false;
      if (!this.auto) this.camYaw += mx * dt * 1.15; // lean into a turn
      const pe = clamp(this.camPitch, -1.0, 0.55) + 0.06, pitch = Math.abs(pe) < 0.1 ? 0 : pe - Math.sign(pe) * 0.1, sp = Math.sin(pitch);
      const yaw = this.auto ? fwdYaw : this.camYaw;
      const fwd = mz > 0.05 || (Math.abs(mx) > 0.2 && mz > -0.05) ? clamp(Math.hypot(mx, mz), 0, 1) : 0;
      let hsT = fwd * (14.5 + 9.5 * Math.max(0, -sp) + (shift ? 7 : 0)) * (1 - 0.5 * Math.max(0, pitch));
      if (this.auto && near < 34) hsT = Math.min(hsT, 3 + near * 0.42);
      const ah = Math.min(1, dt * (fwd > 0 ? 2.0 : mz < 0 ? 2.6 : 0.8));
      p.vx += (Math.sin(yaw) * hsT - p.vx) * ah; p.vz += (-Math.cos(yaw) * hsT - p.vz) * ah;
      const hs = Math.hypot(p.vx, p.vz);
      // the open parasol holds her up for a moment after each beat; gliding fast she sinks slowly; standing in the air she comes down
      let vyT = -lerp(8.5, 2.2, clamp(hs / 11, 0, 1)) + (fwd > 0 ? hs * sp * 0.95 : 0);
      vyT = lerp(vyT, Math.max(vyT, -1.2), clamp(this.liftT / 0.5, 0, 1));
      if (shift) vyT = Math.min(vyT, -17);
      if (this.auto && near < 12 && tgtY !== null && p.yAbs > tgtY + 0.4 && !autoHold) vyT = Math.min(vyT, -5);
      if (caught) { vyT = Math.min(vyT, -7); const b = Math.max(0, 1 - dt * 5); p.vx *= b; p.vz *= b; } // the easel draws her down out of the air
      if (p.alt < 3 && !shift) vyT = Math.max(vyT, -2.6 - p.alt * 2); // she always lands softly
      p.valt += (vyT - p.valt) * Math.min(1, dt * 2.2);
    }
    const px0 = p.x, pz0 = p.z;
    p.x += p.vx * dt; p.z += p.vz * dt;
    if (p.alt < 5) {
      for (const c of W.colliders) {
        const dx = p.x - c.x, dz = p.z - c.z, rr = c.r + 0.4, d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), push = rr - d; p.x += (dx / d) * push; p.z += (dz / d) * push; }
      }
    }
    const cx = this.ch.center[0], cz = this.ch.center[1], R = this.ch.radius;
    const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d > R) { const k = Math.min(1, (d - R) * 0.12); p.x -= (dx / d) * (d - R) * k; p.z -= (dz / d) * (d - R) * k; }
    this.realSp = Math.hypot(p.x - px0, p.z - pz0) / dt;
    // height: her own in the air, the ground's on the ground, and a cliff edge is a place to take off from
    const gy = this.floorAt(W, p);
    if (inAir) {
      p.yAbs += p.valt * dt;
      if (p.yAbs > gy + maxAlt) { p.yAbs = gy + maxAlt; if (p.valt > 0) p.valt = 0; }
      if (p.yAbs <= gy) { p.yAbs = gy; p.valt = 0; inAir = false; if (Math.hypot(p.vx, p.vz) > 6.5) this.slideT = 1.3; if (this.audio) this.audio.step(1.3); }
    } else if (gy < p.yAbs - 7.5 * dt - 0.04) { p.yAbs -= 0.02; p.valt = -1.5; inAir = true; } // the ground fell away under her feet
    else p.yAbs = gy;
    p.alt = inAir ? Math.max(0.07, p.yAbs - gy) : 0;
    const hsN = Math.hypot(p.vx, p.vz), sp3 = Math.hypot(hsN, inAir ? p.valt : 0);
    if (hsN > 0.4) p.heading += angDiff(Math.atan2(p.vx, -p.vz), p.heading) * Math.min(1, dt * 8);
    if (!inAir && !this.sliding) {
      const before = Math.floor(p.step / Math.PI);
      p.step += hsN * dt * 1.5;
      if (Math.floor(p.step / Math.PI) !== before && hsN > 1 && this.audio) this.audio.step(hsN / 5.2);
    }
    // what the body and the camera make of the speed
    const leanT = inAir ? clamp(hsN / 15, 0, 1) * 0.5 + clamp(-p.valt / 16, -0.15, 0.36) : this.sliding ? -0.2 : 0;
    this.lean += (leanT - this.lean) * Math.min(1, dt * 4);
    this.roll += ((inAir ? -mx * 0.2 : this.sliding ? -mx * 0.08 : 0) - this.roll) * Math.min(1, dt * 3);
    this.fovK += (clamp((sp3 - 7.5) / 11, 0, 1) - this.fovK) * Math.min(1, dt * 2.5);
    if (this.audio) this.audio.setRush(clamp((sp3 - 6) / 13, 0, 1));
    if (this.sliding) { const c = !onWater && !snowy && W.ground ? W.ground.col(p.x, p.z, this.dyn.rnd) : null; this.slideCol = onWater ? [0.86, 0.93, 1.0] : snowy ? [0.95, 0.96, 1.0] : c ? mixc(c, [1, 1, 1], 0.3) : [0.8, 0.9, 0.6]; }
    // the ribbon of light she leaves behind when she flies or slides
    this.trailT = (this.trailT || 0) - dt;
    if (this.trailT <= 0) {
      this.trailT = 0.035;
      const sh = this.shine || 0, on = Math.max(inAir && sp3 > 6 ? clamp((sp3 - 6) / 7, 0, 1) : 0, sh * (inAir || this.sliding ? 0.85 : hsN > 1.5 ? 0.4 : 0));
      const a = this.hero.tipL, b = this.hero.tipR; // the two ends of the parasol's rim, where the ribbons come off
      this.trail.unshift([a[0], a[1], a[2], b[0], b[1], b[2], this.hero.ready ? on : 0]);
      const tmax = 16 + Math.round(14 * sh); while (this.trail.length > tmax) this.trail.pop();
    }
    const bob = !inAir ? (onWater ? 0.05 * Math.sin(this.time * 1.7) + 0.05 : 0) : Math.sin(this.time * 0.9) * 0.1 * clamp(p.alt / 22, 0, 1);
    p.y += (p.yAbs + bob - p.y) * Math.min(1, dt * (inAir ? 18 : 12));
  }

  leaveSpot() { this.wantId = null; this.helpOn = false; this.handT = 0; this.needHand = null; this.spotBlock = this.spot; this.spot = -1; this.manual = false; this.lastCap = null; this.restT = 0; this.ringE = null; this.ui.onSpot(-1); }
  updateSpots(dt) {
    const p = this.pl, sp = Math.hypot(p.vx, p.vz);
    // an easel nobody pointed to: coming near is finding it, and from then on it has its light like the others
    this.ch.spots.forEach((s, i) => {
      if (!s.hidden || this.found[this.ch.id + i] || p.alt > 16) return;
      // (once every painting of this world is caught, or after the ending, its hidden one is meant to be found: a faint beam stands
      // over it, a line says when it is near, and it is found from farther off. See hidOpen)
      const d = Math.hypot(s.x - p.x, s.z - p.z), late = this.hidOpen(), key = this.ch.id + i;
      if (late && d < 70 && d > 30 && !(this.nearTold || (this.nearTold = {}))[key]) { this.nearTold[key] = 1; this.ui.hint('hidNear', 8); }
      if (d > (late ? 30 : 13)) return;
      this.found[this.ch.id + i] = 1; this.foundT[this.ch.id + i] = this.time;
      if (this.audio) this.audio.door();
      this.ui.onFound(i); this.save();
    });
    if (this.spot < 0) {
      // a place with a painting still to catch takes hold of her as soon as she comes into its light: she need not stop, or land, or let go of the keys.
      // A place already painted out asks her to stand still first, so that she can pass through it
      let near = -1, nd = 1e9;
      this.ch.spots.forEach((s, i) => { const d = Math.hypot(s.x - p.x, s.z - p.z), open = this.spotOpen(i); if (d < REACH && p.alt < (open ? REACH_UP : 3) && d < nd) { nd = d; near = i; } });
      this.spotNear = -1;
      if (near < 0) { this.spotBlock = -1; this.spotHold = 0; this.backT = 0; }
      else if (near !== this.spotBlock) {
        this.backT = 0;
        const open = this.spotOpen(near);
        if (open) this.spotNear = near;
        if (open || sp < 1.6) {
          this.spotHold += dt;
          if (this.spotHold > (open ? 0.2 : 0.45)) { this.spot = near; this.spotHold = 0; this.manual = false; this.helpOn = false; this.handT = 0; this.lastCap = null; this.restT = 0; this.heldKeys = !!this.pushing; this.heldT = 0; if (this.auto) { this.auto = false; this.ui.onAuto(false); } this.ui.onSpot(near); }
        } else this.spotHold = 0;
      } else {
        // she stepped off this easel and has not left its light: a painting still to catch takes her back as soon as she stands,
        // so a step taken by mistake loses nothing. (Walking on out of the light frees her, as before)
        this.spotHold = 0;
        this.backT = this.spotOpen(near) && !this.pushing && sp < 1.2 ? (this.backT || 0) + dt : 0;
        if (this.backT > 0.3) { this.spotBlock = -1; this.backT = 0; }
      }
    } else this.spotNear = -1;
    // (while she stands in the light of the easel she has just stepped off, about to be taken back, the eye waits where it is)
    this.viewK = clamp(this.viewK + (this.spot >= 0 ? dt / 2.4 : this.backT > 0 || (this.spotHold > 0 && this.spotNear >= 0 && this.spotNear === this.lastSpot) ? 0 : -dt / 1.1), 0, 1);
    if (this.spot >= 0) { // she turns to face what he painted, and where she is part of the picture she goes to her place in it
      const s = this.ch.spots[this.spot], v = s.view;
      p.heading += angDiff(v.pose === undefined ? v.yaw : v.pose, p.heading) * Math.min(1, dt * 3);
      if (v.show) { p.x += (s.x - p.x) * Math.min(1, dt * 2.2); p.z += (s.z - p.z) * Math.min(1, dt * 2.2); }
    }
    let hit = null;
    if (this.spot >= 0 && this.viewK > 0.985 && !this.pending && !isNight(this.t) && this.phHold <= 0 && !this.scrubbing && !(this.restT > 0) && !this.reverie) {
      for (const e of this.ch.effects) {
        if (e.spot !== this.spot || this.caps[e.id] || (e.phase >= 0 && e.phase !== this.phase)) continue;
        if (this.t >= e.t0 && this.t <= e.t1) { hit = e; break; }
      }
    }
    if (hit && hit === this.paintE) {
      this.paintK += dt / (PACE[hit.id] ? PACE[hit.id].paint : 2.6);
      if (this.paintK >= 1) { this.pending = hit; this.paintK = 0; this.paintE = null; }
    } else { this.paintE = hit; this.paintK = hit ? Math.max(0, this.paintK - dt) : Math.max(0, this.paintK - dt * 2); if (!hit) this.paintE = null; }
    if (this.doorOn && this.ch.door && this.doorT > 1.5 && this.wi + 1 < WORLDS.length) {
      const d = this.ch.door;
      if (Math.hypot(d.x - p.x, d.z - p.z) < 2.6 && p.alt < 6) this.startTransition(this.wi + 1);
    }
  }
  // called right after the frame is drawn: the picture on screen becomes the painting
  // what is inside the frame at this moment, as a small picture
  grab() {
    try {
      const c = this.R.canvas, g = this.snap.getContext('2d'), sh = Math.min(c.height * this.frameFrac, (c.width * this.frameFrac) / 1.5), sw = sh * 1.5;
      g.imageSmoothingQuality = 'high';
      g.drawImage(c, (c.width - sw) / 2, (c.height - sh) / 2, sw, sh, 0, 0, this.snap.width, this.snap.height);
      return this.snap.toDataURL('image/jpeg', 0.8);
    } catch (err) { return ''; }
  }
  setFree(on) { this.free = !!on && this.mode === 'play' && this.spot < 0; return this.free; }
  // the picture is painted once more at its own size, the frame alone, so that it is as sharp in the album as the world was on the screen
  captureHi() {
    const R = this.R, f = this.frame, cam = f.cam, w0 = R.fbW, h0 = R.fbH, fov0 = cam.fov, weave0 = f.weave, vig0 = f.vig;
    try {
      const H = this.quality === 0 ? 720 : this.quality === 1 ? 900 : 1080, W = H * 1.5, hi = this.hi || (this.hi = document.createElement('canvas'));
      if (hi.width !== W || hi.height !== H) { hi.width = W; hi.height = H; }
      cam.fov = 2 * Math.atan(Math.tan(fov0 / 2) * this.frameH());
      f.weave = 1 / clamp(W / Math.max(1, this.cssH * this.frameH() * 1.5), 1, 2); f.vig = vig0 * 0.6;
      R.resize(W, H); R.draw(f);
      hi.getContext('2d').drawImage(R.canvas, 0, 0, W, H);
      cam.fov = fov0; f.weave = weave0; f.vig = vig0;
      R.resize(w0, h0); R.draw(f); // and the screen is painted again as it was
      return hi;
    } catch (err) { cam.fov = fov0; f.weave = weave0; f.vig = vig0; try { R.resize(w0, h0); } catch (e2) { /* as it is */ } return null; }
  }
  small(hi) { try { const g = this.snap.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(hi, 0, 0, this.snap.width, this.snap.height); return this.snap.toDataURL('image/jpeg', 0.8); } catch (err) { return ''; } }
  // one picture taken: [the small one for the wall, the large one]
  take() { const hi = this.captureHi(), url = (hi && this.small(hi)) || this.grab(); let big = ''; try { if (hi) big = hi.toDataURL('image/jpeg', 0.9); } catch (err) { big = ''; } return [url, big]; }
  takePending() {
    const e = this.pending;
    if (!e) return;
    this.pending = null; this.heavy = true;
    const pic = this.take(), url = pic[0];
    if (pic[1]) this.big[e.id] = pic[1];
    if (this.wantId === e.id) this.wantId = null;
    this.caps[e.id] = url || '1';
    this.lastCap = e; this.restT = PACE[e.id] ? PACE[e.id].rest : 3.6;
    this.helpOn = false; this.handT = 0; if (HAND[this.ch.id]) this.manual = false;
    this.flash = 1;
    if (this.audio) this.audio.chime(this.capCount(this.ch));
    const need = this.ch.need;
    if (this.ch.door && !this.doorOn && this.capCount(this.ch) >= need) { this.doorOn = true; this.doorT = 0; if (this.audio) this.audio.door(); }
    this.ui.onCapture(e, this.ch, url, pic[1]);
    this.save();
  }

  updateTransition(dt) {
    const tr = this.trans, p = this.pl;
    tr.t += dt;
    const q = clamp(tr.t / tr.dur, 0, 1);
    // the old painting lets go from under her feet outwards; she rises on three beats of the parasol into the paint as it
    // circles her; the eye goes once round her with it; and she comes down as the new painting spreads out from where she lands
    const s = tr.toCh.start, e = ease(sstep(0.05, 0.95, q)), lift = Math.pow(Math.sin(Math.PI * e), 0.8) * 13;
    const y1 = this.groundAt(tr.toW, s.x, s.z), arc = lerp(tr.pose0.y, y1, e) + lift;
    const ei = clamp(q, 0, 1) * (tr.env.length - 1), e0 = Math.floor(ei), over = lerp(tr.env[e0], tr.env[Math.min(e0 + 1, tr.env.length - 1)], ei - e0) * sstep(0, 0.1, q) * sstep(1, 0.9, q) + arc * (1 - sstep(0, 0.1, q) * sstep(1, 0.9, q));
    const y = 0.5 * (arc + over + Math.sqrt((arc - over) * (arc - over) + 6)); // the higher of the two, with the corner rounded
    p.x = lerp(tr.pose0.x, s.x, e); p.z = lerp(tr.pose0.z, s.z, e);
    p.valt = dt > 1e-4 ? clamp((y - p.y) / dt, -12, 12) : 0;
    p.y = y; p.alt = lift; p.vx = p.vz = 0;
    for (const fq of [0.02, 0.085, 0.16]) if (tr.q0 < fq && q >= fq) { this.flapK = 1; if (this.audio) this.audio.flap(); }
    tr.q0 = q;
    this.flapK = Math.max(0, (this.flapK || 0) - dt * 2.6);
    p.heading = tr.pose0.heading + angDiff(s.yaw || 0, tr.pose0.heading) * e;
    this.camYaw = tr.pose0.yaw + angDiff(s.yaw || 0, tr.pose0.yaw) * e + TAU * ease(sstep(0.03, 0.97, q));
    this.camPitch = lerp(tr.pose0.pitch, -0.05, e) + Math.sin(Math.PI * e) * 0.14;
    this.transK = Math.sin(Math.PI * q);
    if (this.audio) this.audio.setRush(0.7 * this.transK);
    this.viewK = Math.max(0, this.viewK - dt);
    if (!tr.shown && q > 0.56) { tr.shown = true; this.ui.onCard(tr.toCh, tr.to); }
    if (q >= 1) this.endTransition();
  }

  resize(cssW, cssH, dpr) {
    this.cssW = cssW; this.cssH = cssH; this.dpr = dpr;
    const q = this.quality;
    let ratio = q === 2 ? Math.min(dpr, 2) : q === 1 ? Math.min(dpr, 1.5) : Math.min(dpr, this.saver ? 1.3 : 1); // (the plain setting on a phone: its small screen is given a little more than one pixel in three)
    const budget = q === 2 ? 3.4e6 : q === 1 ? 1.6e6 : 1.2e6;
    ratio = Math.min(ratio, Math.sqrt(budget / Math.max(1, cssW * cssH))) * (this.resK || 1);
    this.R.msaa = q === 0 ? 0 : 4;
    this.R.resize(Math.round(cssW * ratio), Math.round(cssH * ratio));
  }
  setQuality(q, manual) {
    this.quality = clamp(q | 0, 0, 2);
    if (manual) { this.autoQuality = false; this.resK = 1; }
    this.resize(this.cssW, this.cssH, this.dpr);
    this.ui.onQuality(this.quality, !manual && this.autoQuality);
  }
  // Called once a frame with the true time since the last one. On the fine setting a machine that cannot keep some 45 frames
  // a second is given the middle one, which looks nearly the same; on the middle one it must fall under 24 before the plain
  // one is taken. It is the share of slow frames in three seconds that counts, not their mean, so one long frame (a world being
  // painted in the background, a picture being taken) decides nothing; and frames on which such work was done are left out
  // the cool running of a phone: where it begins (the step found on an earlier visit), and one step down
  setSaver(step) { this.saver = true; this.saverStep = clamp(step | 0, 0, SAVER.length - 1); const st = SAVER[this.saverStep]; this.quality = st[0]; this.resK = st[1]; }
  saverDown() {
    if (this.saverStep >= SAVER.length - 1) return;
    const st = SAVER[++this.saverStep]; this.resK = st[1]; this.setQuality(st[0]); this.ui.onSaver(this.saverStep);
  }
  // what a timed frame cost, in ms
  probed(ms) {
    this.costs.push(ms);
    if (this.costs.length < 3) { this.probeIn = 0.8; return; }
    const m = this.costs.sort((a, b) => a - b)[1]; this.costs = []; this.lastCost = m;
    if (m > SAVER[this.saverStep][2]) { this.saverDown(); this.probeIn = 2; } else this.probeIn = 20;
  }
  trackFps(dt) {
    if (this.saver) { // (a phone is judged by what a frame costs it, not by how fast the frames come)
      if (this.autoQuality && !this.trans && !this.heavy && (this.mode === 'play' || this.mode === 'title') && (this.probeIn -= dt) <= 0) this.probeNext = true;
      this.heavy = false; return;
    }
    if (!this.autoQuality || this.quality === 0 || this.mode !== 'play' || this.pumped || this.heavy) { this.heavy = false; return; }
    if (this.fpsHold > 0) { this.fpsHold -= dt; return; }
    const limit = this.quality === 2 ? 1 / 45 : 1 / 24;
    this.fpsAcc += dt; this.fpsN++; if (dt > limit) this.fpsSlow = (this.fpsSlow || 0) + 1;
    if (this.fpsAcc > 3 && this.fpsN >= 12) {
      const share = (this.fpsSlow || 0) / this.fpsN;
      this.fpsAcc = 0; this.fpsN = 0; this.fpsSlow = 0;
      if (share > 0.6) { this.setQuality(this.quality - 1); this.fpsHold = 4; }
    }
  }

  titleView() {
    const ch = this.ch;
    if (ch.title) return ch.title;
    const v = ch.spots[0].view;
    return (ch.title = { x: v.x, z: v.z, y: v.y, yaw: v.yaw, pitch: v.pitch, fov: v.fov, t0: 0.27, t1: 0.36 });
  }

  // ----- camera -----
  camera() {
    const p = this.pl, c = this.cam, W = this.trans && this.trans.t / this.trans.dur > 0.5 ? this.trans.toW : this.cur;
    let pos, fwd, lens = TP_FOV, fitK = 0; // lens: the angle the view was composed with. fitK: how far a frame lies on it (an easel, or a view of her own)
    if (this.mode === 'title') {
      const v = this.titleView(), a = Math.sin(this.titleT * 0.05) * 0.06;
      const gy = this.groundAt(W, v.x, v.z);
      pos = [v.x, gy + v.y, v.z];
      const cp = Math.cos(v.pitch), yaw = v.yaw + a;
      fwd = [Math.sin(yaw) * cp, Math.sin(v.pitch), -Math.cos(yaw) * cp]; lens = (v.fov || 55) * DEG;
    } else {
      const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
      fwd = [Math.sin(this.camYaw) * cp, sp, -Math.cos(this.camYaw) * cp];
      const tx = p.x, ty = p.y + 1.45, tz = p.z, dist = this.camDist * (1 + clamp(p.alt / 30, 0, 1) * 0.6) * (1 + 0.22 * this.fovK) * (1 + 0.3 * (this.transK || 0));
      let dd = dist;
      for (let it = 0; it < 7; it++) {
        const cx = tx - fwd[0] * dd, cz = tz - fwd[2] * dd;
        let inside = false;
        if (p.alt < 6) for (const c of W.colliders) if (c.r > 1.4 && (cx - c.x) * (cx - c.x) + (cz - c.z) * (cz - c.z) < (c.r + 0.3) * (c.r + 0.3)) { inside = true; break; }
        if (!inside) break;
        dd *= 0.72;
      }
      this.camDD = this.camDD === undefined ? dd : this.camDD + (dd - this.camDD) * 0.18;
      dd = Math.min(this.camDD, dist);
      pos = [tx - fwd[0] * dd, ty - fwd[1] * dd + 0.35, tz - fwd[2] * dd];
      const floor = this.groundAt(W, pos[0], pos[2]) + (this.trans ? 2.6 : 0.5); // between two paintings the eye keeps well clear of the land
      if (pos[1] < floor) pos[1] = floor;
      if (this.freeK > 0.001) { const fe = ease(this.freeK); pos = [lerp(pos[0], tx, fe), lerp(pos[1], p.y + 1.6, fe), lerp(pos[2], tz, fe)]; lens = lerp(lens, 52 * DEG, fe); fitK = fe; } // framing a view of her own: the eye stands where she stands
      if (this.viewK > 0.001 && (this.spot >= 0 || this.lastSpot >= 0)) {
        const s = this.ch.spots[this.spot >= 0 ? this.spot : this.lastSpot];
        if (s) {
          const v = s.view, e = ease(this.viewK), vy = this.groundAt(W, v.x, v.z) + v.y, vcp = Math.cos(v.pitch);
          const vf = [Math.sin(v.yaw) * vcp, Math.sin(v.pitch), -Math.cos(v.yaw) * vcp];
          pos = [lerp(pos[0], v.x, e), lerp(pos[1], vy, e), lerp(pos[2], v.z, e)];
          fwd = v3norm([lerp(fwd[0], vf[0], e), lerp(fwd[1], vf[1], e), lerp(fwd[2], vf[2], e)]);
          lens = lerp(lens, v.fov * DEG, e); fitK = Math.max(fitK, e);
        }
      }
    }
    if (this.spot >= 0) this.lastSpot = this.spot;
    if (this.debugCam) { const v = this.debugCam, cp = Math.cos(v.pitch || 0); pos = [v.x, (v.abs ? 0 : this.groundAt(W, v.x, v.z)) + v.y, v.z]; fwd = [Math.sin(v.yaw) * cp, Math.sin(v.pitch || 0), -Math.cos(v.yaw) * cp]; lens = (v.fov || 60) * DEG; fitK = 0; }
    // on an upright screen the walk is seen through a wider lens. Where a frame lies on the view, the frame holds the same piece
    // of the world on every screen: the lens opens or closes until what was composed for the wide screen fills it
    const asp = this.cssW / Math.max(1, this.cssH);
    let fov = asp < 1.3 ? clamp(2 * Math.atan(Math.tan(lens / 2) * 1.3 / asp), lens, 95 * DEG) : lens;
    if (fitK > 0) fov = lerp(fov, Math.min(126 * DEG, 2 * Math.atan((Math.tan(lens / 2) * FRAME_FRAC) / this.frameH())), fitK);
    c.lens = Math.tan(lens / 2);
    const rl = Math.hypot(fwd[0], fwd[2]) || 1;
    const free = this.mode === 'play' ? 1 - ease(this.viewK) : 0;
    fov *= 1 + 0.24 * this.fovK * free + 0.1 * (this.transK || 0);
    let right = [-fwd[2] / rl, 0, fwd[0] / rl], up = v3cross(right, fwd);
    const ro = this.roll * free;
    if (Math.abs(ro) > 0.001) { const cr = Math.cos(ro), sr = Math.sin(ro), r2 = [right[0] * cr + up[0] * sr, right[1] * cr + up[1] * sr, right[2] * cr + up[2] * sr]; up = [up[0] * cr - right[0] * sr, up[1] * cr - right[1] * sr, up[2] * cr - right[2] * sr]; right = r2; }
    c.pos = pos; c.fwd = fwd; c.right = right; c.up = up; c.fov = fov;
    return c;
  }

  render() {
    const f = this.frame, R = this.R, tr = this.trans, probeT = this.probeNext && !tr && !this.pending && !this.pendingFree ? performance.now() : 0;
    let q = 0, chA = this.ch, chB = this.ch, mixEnv = 0;
    if (tr) { q = clamp(tr.t / tr.dur, 0, 1); chA = tr.fromCh; chB = tr.toCh; mixEnv = sstep(0.25, 0.75, q); }
    // the hour: during a repainting, one world's light fades into the next
    let env;
    if (tr) {
      const a = atmosphere(chA, tr.t0, tr.ph0, this.time, this.env), b = atmosphere(chB, tr.t1, mixPhase(chB.phases[0], chB.phases[0], 0), this.time, this.envB);
      env = mixEnvs(a, b, mixEnv);
    } else env = atmosphere(this.ch, this.t, this.phaseNow(), this.time, this.env);
    this.envNow = env;
    f.env = env;
    f.cam = this.camera();
    f.time = this.time;
    // settle: 0 while she roams, 1 when she has settled at an easel and a picture may be taken (whatever drifts must then be where it was painted).
    // rush: how fast the day is running, 1 at a walk, some tens while the hours fly towards a painting
    f.settle = tr || this.mode !== 'play' || this.free || this.reverie ? 0 : sstep(0.3, 0.9, this.viewK);
    f.rush = this.rush === undefined ? 1 : this.rush;
    f.canvas = mixc(chA._canvas, chB._canvas, mixEnv);
    const wCh = q > 0.5 ? chB : chA, wW = tr ? (q > 0.5 ? tr.toW : tr.fromW) : this.cur;
    f.water = wCh._water ? { y: wW.waterY, tint: wCh._water.tint, refl: env.waterRefl === undefined ? wCh._water.refl : env.waterRefl } : null;
    f.windDir = wCh.wind; f.flowId = wCh.id;
    const arcq = Math.sin(Math.PI * q);
    f.morph = tr ? q : 0; f.dir = this.slot;
    f.mixT = tr && q >= 0.5 ? 1 - this.slot : this.slot; // the ground changes shape while it is bare canvas
    f.blank = 0;
    f.white = (tr ? Math.pow(arcq, 3) * 0.06 : 0) + this.flash * this.flash * 0.35;
    f.solidAppear[this.slot] = 1; f.solidAppear[1 - this.slot] = tr ? 1 : 0;
    // a repainting has two fronts that run out from her: one where the old painting lets go, one where the new one settles.
    // What lies under the strokes goes a little after them and comes a little before
    const pl = this.pl, sw = f.solidWave;
    if (tr) {
      const st = chB.start, uA = (q - 0.03) / 0.4 - 0.035, uB = (q - 0.53) / 0.4 + 0.035, a = f.waveA, b = f.waveB;
      a[0] = tr.pose0.x; a[1] = tr.pose0.z; a[2] = 1 / (chA.radius * 1.6); b[0] = st.x; b[1] = st.z; b[2] = 1 / (chB.radius * 1.6);
      f.wave = q < 0.5 ? a : b; f.front[0] = q < 0.5 ? uA : -9; f.front[1] = q < 0.5 ? 9 : uB;
      const s0 = sw[this.slot], s1 = sw[1 - this.slot];
      s0[0] = a[0]; s0[1] = a[1]; s0[2] = a[2]; s0[3] = uA; s0[4] = 9; s1[0] = b[0]; s1[1] = b[1]; s1[2] = b[2]; s1[3] = -9; s1[4] = uB;
    } else { f.front[0] = -9; f.front[1] = 9; for (const x of sw) { x[3] = -9; x[4] = 9; } }
    f.pivot[0] = pl.x; f.pivot[1] = pl.y + 1.2; f.pivot[2] = pl.z;
    const ph = tr ? null : this.phaseNow();
    const sA = this.slotCh[0].style, sB = this.slotCh[1].style, lm = ph ? ph.len : 1, wm = ph ? ph.wid : 1;
    f.styleA = [sA.len * lm, sA.wid * wm, sA.wind, sA.flow]; f.styleB = [sB.len * lm, sB.wid * wm, sB.wind, sB.flow];
    const frac = this.quality === 2 ? 1 : this.quality === 1 ? 0.72 : 0.48;
    f.sizeBoost = Math.min(1.35, 1 / Math.sqrt(frac));
    const nA = R.strokeCount[this.slot], nB = tr ? R.strokeCount[1 - this.slot] : 0;
    f.strokeCount = Math.max(nA, nB) * frac;
    f.brushRot = wCh.brushRot || 0; f.edge = lerp(chA.edge === undefined ? 0.7 : chA.edge, chB.edge === undefined ? 0.7 : chB.edge, mixEnv);
    f.nearDist = 17; f.nearMin = 0.22; f.relief = 0.34; f.emboss = 0.3; f.vig = 0.36;
    // the small touches under the eye: there for the world she stands in, gone while one painting turns into the next
    f.touchSlot = tr && q >= 0.5 ? 1 - this.slot : this.slot;
    f.touch = 1;
    f.touchCount = Math.round(MAX_TOUCH * (this.quality === 2 ? 1 : this.quality === 1 ? 0.62 : 0.34));
    // through a long lens the near ground comes close: its touches and its grass are made smaller, so they stay touches
    f.fovK = clamp((f.cam.lens || Math.tan(f.cam.fov / 2)) / 0.5774, 0.4, 1.1);
    f.touchSize = [(ph ? ph.len : 1) * f.fovK, (ph ? ph.wid : 1) * f.fovK];
    f.tilt = this.tilt || (this.tilt = [0.92, 0.9, 0.9, 1.0]); f.vib = this.vib === undefined ? 1 : this.vib;
    f.weave = 1 / clamp(R.fbW / Math.max(1, this.cssW), 1, 2);
    f.bloom = this.quality === 0 ? 0 : 1;
    // the mirror in the water: on the lower settings it is painted with fewer touches while she roams, and whole again at an easel
    f.mirrorThin = this.quality === 2 ? 0.45 : lerp(0.32, 0.45, f.settle);
    if (tr) { // between two paintings the canvas is seen in plain light
      const nb = Math.pow(arcq, 0.8) * 0.85, g = env.grade;
      g.sat = lerp(g.sat, 1.05, nb); g.bright = lerp(g.bright, 1.0, nb); g.veil = [g.veil[0], g.veil[1], g.veil[2], g.veil[3] * (1 - nb)]; g.soft *= 1 - nb;
    }
    // shadows
    f.shadowOrigin = wCh.center; f.shadowSize = (wCh.radius + 40) * 2;
    f.shadowStrength = 0.92 * clamp(env.sunI * 1.6, 0, 1) * clamp((env.sunEl - 0.5) / 5, 0, 1) * (tr ? 1 - arcq : 1);
    this.dynCasters.length = 0;
    f.casters[0] = wW.casters; f.casters[1] = this.dynCasters;

    this.buildDynamic(q, env);
    R.uploadDyn(this.dyn); R.uploadFigure(this.hero.d, this.hero.n);
    this.buildGlows(q, env);
    R.draw(f);
    if (probeT) { // this frame is timed: one pixel is read back, and the machine answers only when the whole frame is painted
      this.probeNext = false;
      try { const gl = R.gl; gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.px || (this.px = new Uint8Array(4))); this.probed(performance.now() - probeT); } catch (e) { this.probeIn = 60; }
    }
    if (this.pending) this.takePending();
    if (this.pendingFree) { this.pendingFree = false; const pic = this.take(); this.flash = 0.8; if (this.audio) this.audio.chime(3); this.ui.onFree(pic[0], this.ch, this.phase, this.t, pic[1]); }
  }

  buildGlows(q, env) {
    const R = this.R, t = this.time;
    R.beginGlows();
    // the sun, seen through whatever air there is
    if (env.sunEl > -4) {
      const d = env.sunDir, k = clamp((env.sunEl + 4) / 5, 0, 1), low = 1 - clamp(env.sunEl / 30, 0, 1);
      const c = env.glow, s = 34 + 60 * low, g = 1 - 0.85 * (env.grey || 0), kk = k * g * (0.4 + 0.6 * clamp(env.sunI * 1.3, 0, 1));
      R.glow(d[0] * 870, d[1] * 870, d[2] * 870, 2, c[0] * kk * 0.6, c[1] * kk * 0.6, c[2] * kk * 0.6, s * 3.2, s * 3.2);
      R.glow(d[0] * 860, d[1] * 860, d[2] * 860, 2, c[0] * kk * 0.5 + 0.12 * kk, c[1] * kk * 0.5 + 0.1 * kk, c[2] * kk * 0.45 + 0.06 * kk, s, s);
    }
    // lamps on the ships and along the quay while it is dark. The water takes them up of itself
    const lamps = this.cur && this.ch ? LAMPS[this.ch.id] : null, dark = clamp(1 - env.sunI * 2.6, 0, 1) * (this.trans ? 0 : 1);
    if (lamps && dark > 0.02) {
      const W = this.cur, wy = W.waterY === null ? -1e9 : W.waterY;
      lamps.forEach((L, i) => {
        const base = Math.max(W.h(L[0], L[1]), wy), c = LAMP_COL[L[3]], k = dark * (0.85 + 0.15 * Math.sin(t * 2.3 + i * 1.7)), sz = L[4];
        R.glow(L[0], base + L[2], L[1], 0, c[0] * k, c[1] * k, c[2] * k, sz, sz);
        R.glow(L[0], base + L[2], L[1], 0, c[0] * k * 0.35, c[1] * k * 0.35, c[2] * k * 0.35, sz * 3, sz * 3);
      });
    }
    // stars, while the night lasts: they go out one by one before the first light
    const dn = this.t < 0.25 ? 0.25 - this.t : this.t > 0.75 ? this.t - 0.75 : 0, sk = clamp((dn - 0.03) / 0.05, 0, 1) * (this.trans ? 0 : 1);
    if (sk > 0.01) for (let i = 0; i < 96; i++) {
      const h1 = _fr(Math.sin(i * 12.9898 + 7.1) * 43758.5453), h2 = _fr(Math.sin(i * 78.233 + 3.3) * 12345.678), h3 = _fr(Math.sin(i * 39.425 + 5.7) * 24634.633);
      const on = clamp(sk * 1.6 - h1 * 0.6, 0, 1);
      if (on <= 0) continue;
      const az = h2 * TAU, el = Math.asin(0.07 + 0.9 * h1), ce = Math.cos(el), b = on * (0.6 + 0.4 * Math.sin(t * (0.7 + 2.4 * h3) + i * 2.7)) * (0.16 + 0.5 * h3 * h3), sz = 5 + 8 * h3;
      R.glow(Math.sin(az) * ce * 860, Math.sin(el) * 860, -Math.cos(az) * ce * 860, 2, b * (0.92 + 0.08 * h2), b * 0.92, b * (0.78 + 0.3 * h2), sz, sz);
    }
    if (!this.trans && this.cur) SIGHTS.glows(R, this, env, t);
    if (this.mode !== 'play' || !this.cur) return;
    const day = clamp(0.6 + env.sunI, 0.6, 1.5);
    const vis = day * (1 - this.viewK) * (1 - (this.freeK || 0)); // no beams at an easel, nor in a view of her own
    const lead = this.target(); // the place the ring shows: its beam is the strongest, so that by day too one beam stands out
    this.ch.spots.forEach((s, i) => {
      const y = this.groundAt(this.cur, s.x, s.z), pu = 1 + 0.15 * Math.sin(t * 2 + i * 2), first = !!lead && lead.kind === 'spot' && lead.x === s.x && lead.z === s.z, kb = first ? 1.7 + 0.25 * Math.sin(t * 2.4) : 1;
      if (!this.spotFound(i)) { // not yet found: no beam, only a glint on the easel when she is not far off
        const g = sstep(48, 15, Math.hypot(s.x - this.pl.x, s.z - this.pl.z)) * vis * (0.55 + 0.45 * Math.sin(t * 3.3 + i));
        if (g > 0.01) { const ex = s.easel ? s.easel[0] : s.x + 1.2, ez = s.easel ? s.easel[1] : s.z + 0.6; R.glow(ex, this.groundAt(this.cur, ex, ez) + 1.5, ez, 0, 0.62 * g, 0.54 * g, 0.3 * g, 1.3, 1.3); }
        // a hidden one that may now be found: a faint, slow beam, paler and thinner than the others, to be seen from far off
        if (s.hidden && this.hidOpen()) { const kf = vis * (0.3 + 0.1 * Math.sin(t * 1.3 + i)); if (kf > 0.01) R.glow(s.x, y, s.z, 1, 0.24 * kf, 0.3 * kf, 0.36 * kf, 1.1, 52); }
        return;
      }
      const grow = s.hidden ? ease(sstep(0, 2.6, t - (this.foundT[this.ch.id + i] === undefined ? -99 : this.foundT[this.ch.id + i]))) : 1; // its light goes up as she finds it
      const k = (this.spotOpen(i) ? 1 : 0.3) * vis * (0.25 + 0.75 * grow);
      if (k < 0.01) return;
      R.glow(s.x, y + 1.2, s.z, 0, 0.7 * k, 0.6 * k, 0.36 * k, 3.6 * pu, 3.6 * pu);
      R.glow(s.x, y, s.z, 1, 0.3 * k * kb, 0.26 * k * kb, 0.16 * k * kb, first ? 2.2 : 1.5, (first ? 78 : 64) * Math.max(0.04, grow));
    });
    if (this.doorOn && this.ch.door) {
      const d = this.ch.door, y = this.groundAt(this.cur, d.x, d.z), k = sstep(0, 2, this.doorT) * day * (1 - this.viewK), c = WORLDS[Math.min(this.wi + 1, WORLDS.length - 1)]._swatch[0];
      R.glow(d.x, y + 2.3, d.z, 0, c[0] * 0.6 * k, c[1] * 0.6 * k, c[2] * 0.6 * k, 7, 7);
      R.glow(d.x, y, d.z, 1, 0.5 * k, 0.42 * k, 0.2 * k, 3.2, 110);
    }
    ALIVE.glows(R, this, env, t);
  }

  buildDynamic(q, env) {
    const S = this.dyn, t = this.time, tr = this.trans;
    S.clear(); this.hero.n = 0; this.frame.hero[3] = 0;
    const W = tr && q > 0.5 ? tr.toW : this.cur, ch = tr && q > 0.5 ? tr.toCh : this.ch;
    const fade = tr ? Math.abs(Math.cos(Math.PI * q)) : 1;
    // the sun as a dab of paint
    if (env.sunEl > -1.5 && env.sunI > 0.02) {
      const d = env.sunDir, low = 1 - clamp(env.sunEl / 24, 0, 1), g = env.grey || 0, s = 20 + 22 * low, c = mixc(mixc([1, 0.97, 0.84], [1, 0.5, 0.24], low * low), [1, 0.42, 0.18], g * 0.9);
      S.bill(d[0] * 880, d[1] * 880, d[2] * 880, t * 0.05, s * 1.05, s, c, 0, CELL.DOT, (0.75 - 0.5 * low) * (1 - 0.7 * g), true);
    }
    if (ch.dyn && fade > 0.01) ch.dyn(S, t, W, fade, this, env);
    if (!W) return;
    if (!tr) drawAir(S, this.cam.pos, env, t, ch.wind, ch.center, this.spot >= 0 ? this.viewK : 0, this.quality === 0 ? 0.55 : 1);
    if (!tr) FOLK.draw(S, this, env, t); // the people of the paintings, on the title too
    if (!tr) SIGHTS.draw(S, this, env, t); // and what happens there at its hour
    if (this.mode === 'title') return;
    const p = this.pl;
    // hidden when the camera stands where she stands
    const s = this.spot >= 0 ? this.ch.spots[this.spot] : null;
    const hide = Math.max(s && !s.view.show ? this.viewK : 0, this.freeK || 0);
    if (hide < 0.6) {
      const H = this.hero;
      H.build(S, p.x, p.y, p.z, p.heading, t, ch.wind, tr ? 0.25 : this.lean, this.flapK || 0);
      if (!tr) drawSpeed(S, this, t, this.cam);
      const gy = this.groundAt(W, p.x, p.z);
      this.dynCasters.push({ k: 'ball', x: p.x, z: p.z, y: p.alt + 0.75, r: 0.47, v: 0.85 }, { k: 'ball', x: H.hub[0], z: H.hub[2], y: Math.max(0.5, H.hub[1] - gy - 0.15), r: H.rp * 0.96, v: 0.7 });
      const fh = this.frame.hero; fh[0] = p.x; fh[1] = p.y; fh[2] = p.z; fh[3] = 0.4 * (1 - clamp(p.alt / 2.4, 0, 1)) * (1 - hide / 0.6);
    }
    if (this.mode !== 'play') return;
    ALIVE.draw(S, this, env, t);
    // the gilded frame that leads on
    if (this.doorOn && this.ch.door) {
      const d = this.ch.door, y0 = this.groundAt(W, d.x, d.z), k = ease(sstep(0, 2.2, this.doorT));
      const yaw = d.yaw || 0, tx = Math.cos(yaw), tz = Math.sin(yaw), nx = -Math.sin(yaw), nz = Math.cos(yaw);
      const hw = 1.9, hh = 4.6 * k, gold = [[0.80, 0.63, 0.22], [0.90, 0.76, 0.34], [0.66, 0.5, 0.16], [0.95, 0.84, 0.5]];
      for (let sd = -1; sd <= 1; sd += 2) for (let i = 0; i < 5; i++) S.add(d.x + tx * hw * sd, y0 + ((i + 0.5) / 5) * hh, d.z + tz * hw * sd, 0, 1, 0, nx, 0, nz, (hh / 5) * 1.25, 0.42, gold[(i + (sd > 0 ? 1 : 0)) % 4], 0, CELL.HEAVY, 0.2, 0);
      for (let i = 0; i < 4; i++) {
        const u = ((i + 0.5) / 4) * 2 - 1;
        S.add(d.x + tx * hw * u, y0 + hh + 0.1, d.z + tz * hw * u, tx, 0, tz, nx, 0, nz, (hw * 2 / 4) * 1.3, 0.46, gold[i % 4], 0, CELL.HEAVY, 0.2, 0);
        S.add(d.x + tx * hw * u, y0 + 0.12, d.z + tz * hw * u, tx, 0, tz, nx, 0, nz, (hw * 2 / 4) * 1.3, 0.4, gold[(i + 2) % 4], 0, CELL.HEAVY, 0.16, 0);
      }
      const sw = WORLDS[Math.min(this.wi + 1, WORLDS.length - 1)]._swatch;
      for (let i = 0; i < 22; i++) {
        const a = t * (0.5 + (i % 5) * 0.08) + i * 1.7, r = (0.25 + (i % 7) * 0.2) * k, lx = Math.cos(a) * r, ly = Math.sin(a) * r * 1.35 + 2.3 * k;
        S.add(d.x + tx * lx, y0 + ly, d.z + tz * lx, tx * -Math.sin(a), Math.cos(a), tz * -Math.sin(a), nx, 0, nz, 0.95 * k, 0.34 * k, sw[i % sw.length], 0, i % 2 ? CELL.COMMA : CELL.DAB, 0.5, 0);
      }
    }
  }
}

// blend two moments of light
function mixEnvs(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const o = {};
  for (const key of ['sun', 'amb', 'haze', 'glow', 'fog', 'cloudLit', 'cloudShade']) o[key] = mixc(a[key], b[key], k);
  o.sky = a.sky.map((c, i) => mixc(c, b.sky[i], k));
  for (const key of ['glowT', 'glowP', 'glowW', 'grey', 'fogD', 'mist', 'mistBase', 'scatter', 'cover', 'cloudShadow', 'autumn', 'leaf', 'snow', 'flower', 'sunEl', 'sunI']) o[key] = lerp(a[key], b[key], k);
  o.cloudOff = a.cloudOff; o.sunDir = v3norm(v3lerp(a.sunDir, b.sunDir, k)); o.night = 0;
  const ga = a.grade, gb = b.grade;
  o.grade = { sat: lerp(ga.sat, gb.sat, k), bright: lerp(ga.bright, gb.bright, k), contrast: lerp(ga.contrast, gb.contrast, k), lift: lerp(ga.lift, gb.lift, k),
    veil: [lerp(ga.veil[0], gb.veil[0], k), lerp(ga.veil[1], gb.veil[1], k), lerp(ga.veil[2], gb.veil[2], k), lerp(ga.veil[3], gb.veil[3], k)], soft: lerp(ga.soft, gb.soft, k) };
  return o;
}
