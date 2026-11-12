// harness of the people of the paintings (src/32_folk.js)
// node test/folk.mjs logic [wi ...]        plain node: who is where, the painted ones exactly at their marks at an easel, the extras gone
//                                          when they must be, greetings and sounds (with a stand in for the audio), the cost of a frame
// node test/folk.mjs shots <wi> '<json>'   stills from the real renderer
//     shot: { name, t, phase, time, pl:{x,z,yaw,pitch,heading} | spot, viewK, reverie, free, wait (seconds of life before the frame),
//             sim:[{ to:{x,z} | at:'painted 0'|'extra 3', dx, dz, secs }], end:{yaw,pitch}, cam }
import fs from 'fs';
const dir = '/home/claude/monet';
const mode = process.argv[2] || 'logic';
const WFILES = ['11_coast.js', '12_argenteuil.js', '13_fields.js', '14_pond.js'], WNAMES = ['W_COAST', 'W_ARGENTEUIL', 'W_FIELDS', 'W_POND'];
const parses = (code) => { try { new Function(code); return true; } catch (e) { return false; } };
// the files other people are writing are taken from stable/ (the music, the living world, the walker); a world file from src when it parses
// env FOLK_SNAP: a folder with a copy of src/ to read instead (so that before and after are rendered from the same worlds).
// env FOLK_STUB=1: the stub of this layer from stable/ (the painted people as fixed strokes), for the "before" pictures
const SRCDIR = process.env.FOLK_SNAP || dir + '/src';
function read(f) {
  const a = SRCDIR + '/' + f, b = dir + '/stable/' + f;
  if (f === '32_folk.js' && process.env.FOLK_STUB === '1') return fs.readFileSync(b, 'utf8');
  if (/^(20_|31_|08_)/.test(f) && fs.existsSync(b) && process.env.FOLK_SRC !== '1') return fs.readFileSync(b, 'utf8');
  const code = fs.readFileSync(a, 'utf8');
  if (/^1[1-4]_/.test(f) && !parses(code) && fs.existsSync(b)) { console.log('[harness] src/' + f + ' does not parse, using stable/'); return fs.readFileSync(b, 'utf8'); }
  return code;
}
function source(only) {
  const files = fs.readdirSync(SRCDIR).filter((f) => f.endsWith('.js') && !/^40_/.test(f) && (only === undefined || !/^1[1-4]_/.test(f) || f === WFILES[only])).sort();
  return files.map((f) => (only !== undefined && f === '19_worlds.js' ? 'const WORLDS = [0, 1, 2, 3].map(() => ' + WNAMES[only] + ');' : read(f))).join('\n');
}
const fx2 = (v) => +v.toFixed(2);

function load() {
  return new Function(source() + '\nreturn { WORLDS, World, FOLK, Game, mulberry32, atmosphere, mixPhase, Strokes, SCORES, Music, MAX_DYN, person, CELL, FLAG_AXIAL };')();
}
function fakeGame(api, wi) {
  const ch = api.WORLDS[wi], W = new api.World(ch.seed);
  W.wind = ch.wind; ch.build(W); for (const task of W.tasks) task(); W.tasks = [];
  ch.style = ch.style || { len: 1, wid: 1, wind: 1, flow: 1 };
  const g = { ch, cur: W, wi, mode: 'play', pl: { x: ch.start.x, y: 0, z: ch.start.z, heading: 0, vx: 0, vz: 0, alt: 0 }, spot: -1, viewK: 0, free: false, freeK: 0, reverie: false,
    t: 0.42, time: 0, phase: 0, audio: null, quality: 2, cam: { pos: [0, 0, 0], fwd: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] }, groundAt: api.Game.prototype.groundAt, env: {} };
  g.pl.y = g.groundAt(W, g.pl.x, g.pl.z);
  g.S = new api.Strokes(api.MAX_DYN);
  return g;
}
function envOf(api, g) { const ph = g.ch.phases[g.phase], e = api.atmosphere(g.ch, g.t, api.mixPhase(ph, ph, 0), g.time, g.env); g.envNow = e; return e; }
// an eye 40 m above the middle of the painted people: far enough that nothing is shrunk for being near, near enough to draw them
function overhead(api, g) {
  const f = api.FOLK.figs; let x = g.ch.start.x, z = g.ch.start.z;
  if (f.length) { x = 0; z = 0; for (const q of f) { x += q.x0 / f.length; z += q.z0 / f.length; } }
  return { x, z, y: g.groundAt(g.cur, x, z) + 40 };
}
// one frame: she stands (or is moved) where the script says, the camera a little behind and above her
function frame(api, g, dt, to, noUpdate) {
  const p = g.pl, W = g.cur;
  if (to) { p.x = to.x; p.z = to.z; p.y = g.groundAt(W, p.x, p.z) + (to.alt || 0); p.alt = to.alt || 0; if (to.h !== undefined) p.heading = to.h; }
  g.time += dt;
  const fx = Math.sin(p.heading), fz = -Math.cos(p.heading);
  g.cam.pos[0] = p.x - fx * 6; g.cam.pos[1] = p.y + 2.6; g.cam.pos[2] = p.z - fz * 6;
  if (g.eye) { g.cam.pos[0] = g.eye.x; g.cam.pos[1] = g.eye.y; g.cam.pos[2] = g.eye.z; } g.cam.right[0] = Math.cos(p.heading); g.cam.right[2] = Math.sin(p.heading);
  const env = envOf(api, g);
  if (!noUpdate) api.FOLK.update(g, dt);
  g.S.clear(); api.FOLK.draw(g.S, g, env, g.time);
  return g.S.n;
}
const noteName = (m) => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
// a stand in for the audio: a context whose nodes count what is made, started and stopped
function fakeAudio(api, wi, stats) {
  const param = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = (kind) => { stats[kind] = (stats[kind] || 0) + 1; const n = { connect() {}, disconnect() { stats.freed++; }, gain: param(), frequency: param(), Q: param(), pan: param(), type: '',
    start() { stats.start++; }, stop() { stats.stop++; }, onended: null, buffer: null, loop: false }; return n; };
  const ctx = { currentTime: 0, sampleRate: 8000, state: 'running', destination: node('dest'), createGain: () => node('gain'), createOscillator: () => node('osc'), createBiquadFilter: () => node('filter'),
    createStereoPanner: () => node('pan'), createBufferSource: () => node('src'), createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }) };
  return { ctx, master: node('master'), rev: node('rev'), group: { score: api.SCORES[wi] }, ok() { return true; }, deg: api.Music.prototype.deg,
    note(voice, t, midi, vel) { stats.notes.push(voice + ' ' + noteName(midi) + ' v' + vel.toFixed(3)); } };
}

// the strokes person() would paint for a record, colours aside (they come from the record): the reference for a figure at its mark
let FIGURE = null; // the Argenteuil meadows' own figure(), taken from its file
function reference(api, r) {
  if (r.kind === 'figure') {
    if (!FIGURE) {
      const m = fs.readFileSync(SRCDIR + '/12_argenteuil.js', 'utf8').match(/const figure = \(x, z, yaw, o\) => \{[\s\S]*?\n    \};/);
      FIGURE = new Function('W', 'S', 'rnd', 'hex', 'jit', 'mixc', 'CELL', 'FLAG_AXIAL', 'FOLK', m[0] + '\nreturn figure;');
    }
    const S = new api.Strokes(64), Wf = { h: () => r.y };
    FIGURE(Wf, S, api.mulberry32(5), (h) => h, (c) => c, (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], api.CELL, api.FLAG_AXIAL, { live: false })(r.x, r.z, r.yaw, r.o);
    return S;
  }
  const S = new api.Strokes(64), Wf = { S, rnd: api.mulberry32(5), h: () => r.y };
  api.FOLK.live = false;
  api.person(Wf, r.x, r.z, r.yaw, Object.assign({}, r.o, { y: r.y }));
  api.FOLK.live = true;
  return S;
}
// compare what FOLK drew for the painted figures with what person() would have painted. tight: directions too (with no turning to the eye)
function compare(api, g, S, tight, posOnly) {
  const recs = g.cur.folk || [];
  let i0 = 0, worst = 0, bad = 0;
  for (const r of recs) {
    const R = reference(api, r);
    for (let i = 0; i < R.n; i++) {
      const a = i * 4, b = (i0 + i) * 4;
      let d = Math.max(Math.abs(R.pos[a] - S.pos[b]), Math.abs(R.pos[a + 1] - S.pos[b + 1]), Math.abs(R.pos[a + 2] - S.pos[b + 2]), Math.abs(R.pos[a + 3] - S.pos[b + 3]));
      if (!posOnly) d = Math.max(d, Math.abs(R.sca[a] - S.sca[b]), Math.abs(R.sca[a + 1] - S.sca[b + 1]));
      d = Math.max(d, Math.abs(R.sca[a + 2] - S.sca[b + 2]));
      if (tight) for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(R.quat[a + k] - S.quat[b + k]));
      // colour: the record's colours for the oriented strokes, the fixed ones for the dabs
      const isBill = Math.floor(R.sca[a + 2] / 16) & 4;
      if (!isBill) for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(R.col[a + k] - S.col[b + k]) > 0 ? 0 : 0);
      // (the two parasol dabs of a meadow figure take their colours from the record too)
      const pb = r.kind === 'figure' && r.o.parasol && i >= R.n - 2 ? r.cols[r.cols.length - (R.n - i)] : null;
      for (let k = 0; k < 3; k++) if (isBill) d = Math.max(d, Math.abs((pb ? pb[k] : R.col[a + k]) - S.col[b + k]));
      worst = Math.max(worst, d);
      if (d > 1e-5) bad++;
    }
    // the oriented strokes take the record's colours in order
    let ci = 0;
    for (let i = 0; i < R.n; i++) { const b = (i0 + i) * 4; if (Math.floor(S.sca[b + 2] / 16) & 4) continue; const c = r.cols[ci++]; if (!c || Math.abs(c[0] - S.col[b]) + Math.abs(c[1] - S.col[b + 1]) + Math.abs(c[2] - S.col[b + 2]) > 1e-6) bad++; }
    i0 += R.n;
  }
  return { strokes: i0, worst: +worst.toExponential(2), bad };
}

if (mode === 'logic') {
  const api = load(), which = process.argv.slice(3).map(Number), list = which.length ? which : [0, 1, 2, 3], dt = 1 / 30, F = api.FOLK;
  let worstAll = 0, fails = 0;
  for (const wi of list) {
    const g = fakeGame(api, wi), ch = g.ch, W = g.cur, stats = { start: 0, stop: 0, freed: 0, notes: [] };
    console.log('\n===== world', wi, ch.id, '=====');
    F.enter(g);
    console.log('painted', F.figs.length, ' extras', F.extras.length, ' props', F.props.length);
    for (const f of F.figs) console.log('  painted', f.name, 'at', fx2(f.x0), fx2(f.z0), 's', f.s, 'role', f.role + (f.lead === false ? ' (follows)' : f.solo ? ' (short walks)' : ''), 'partner', f.partner ? f.partner.name : '-', 'ways', f.ways.length, f.ways.length ? 'longest ' + Math.max(...f.ways.map((w) => w[2])) + ' m' : '', f.o.parasol ? 'parasol' : '');
    let bad = 0;
    for (const f of F.extras) {
      const dS = Math.min(...ch.spots.map((s) => Math.hypot(s.x - f.x0, s.z - f.z0))), col = W.colliders.find((c) => Math.hypot(c.x - f.x0, c.z - f.z0) < c.r + 0.3), wet = W.waterY !== null && W.h(f.x0, f.z0) < W.waterY + 0.2;
      const rl = f.route ? f.route.reduce((s, p, i) => s + (i ? Math.hypot(p[0] - f.route[i - 1][0], p[1] - f.route[i - 1][1]) : 0), 0) : 0;
      if ((col || wet) && f.role !== 'dog' && !f.lead) { bad++; }
      console.log('  extra', f.name.padEnd(26), 'at', fx2(f.x0), fx2(f.z0), 'easel', fx2(dS), 'm', f.route ? 'route ' + f.route.length + ' pts ' + fx2(rl) + ' m' : '', f.summer ? 'summer only' : '', col ? '!! IN COLLIDER' : '', wet ? '!! IN WATER' : '');
    }
    console.log('extras badly placed', bad); fails += bad;
    // 1. at an easel, from the start: every painted figure exactly as person() painted it
    g.spot = 0; g.viewK = 1; g.tilt = [0];
    g.eye = overhead(api, g);
    frame(api, g, dt, null, true);
    const c0 = compare(api, g, g.S, true);
    g.eye = null;
    console.log('1. at an easel, nothing lived yet: strokes', g.S.n, ' painted strokes', c0.strokes, ' differing', c0.bad, ' worst', c0.worst);
    fails += c0.bad;
    g.spot = -1; g.viewK = 0; delete g.tilt;
    // 2. she wanders near them for a while: they live. How far do they go, how often do they greet her
    const m = { strokes: 0 };
    let maxOff = 0, maxTurn = 0;
    const p = g.pl;
    const targets = F.figs.concat(F.extras.filter((f) => f.role !== 'dog'));
    let gi = 0;
    for (const f of targets) {
      // from 16 m off, walking up to 3 m, then staying 8 s, then away
      const a = (gi++) * 2.1, sx = f.x + Math.sin(a) * 16, sz = f.z - Math.cos(a) * 16;
      for (let i = 0; i <= 90; i++) { const k = i / 90, x = sx + (f.x - sx) * k * 0.82, z = sz + (f.z - sz) * k * 0.82; const n = frame(api, g, dt, { x, z, h: Math.atan2(f.x - sx, -(f.z - sz)) }); m.strokes = Math.max(m.strokes, n); }
      for (let i = 0; i < 240; i++) { const n = frame(api, g, dt, null); m.strokes = Math.max(m.strokes, n); }
      for (const q of F.figs) { maxOff = Math.max(maxOff, Math.hypot(q.x - q.x0, q.z - q.z0)); maxTurn = Math.max(maxTurn, Math.abs(((q.hd - q.yaw0 + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI)); }
    }
    const greets = F.log.filter((e) => e.what === 'greet');
    console.log('2. walked up to each of', targets.length, ': greetings', greets.length, ' worst frame strokes', m.strokes, ' painted ones went up to', fx2(maxOff), 'm from their marks, turned up to', fx2(maxTurn), 'rad');
    for (const e of F.log.slice(-12)) console.log('     ', JSON.stringify(e));
    // again at once: nobody greets twice within 20 s
    const n0 = F.log.length, last = targets.slice(-2).filter((f) => F.st.clock - f.greetT < 15);
    for (const f of last) { for (let i = 0; i < 20; i++) frame(api, g, dt, { x: f.x + 20, z: f.z }); for (let i = 0; i < 20; i++) frame(api, g, dt, { x: f.x + 2, z: f.z + 2 }); }
    const again = F.log.slice(n0).filter((e) => e.what === 'greet' && last.some((f) => f.name === e.who)).length;
    console.log('   of the last two,', last.length, 'greeted in the last 15 s: away and back again, greeted again', again, 'times (0 expected)');
    if (again) fails++;
    // 3. a long life in free play: two minutes standing among them, with the audio stand in
    g.audio = fakeAudio(api, wi, stats);
    const hub = F.figs.find((f) => f.role !== 'still') || F.extras[0];
    const before = Object.assign({}, F.count);
    // she stands among the most of them: by the painted ones, else by the passer by with the most others near
    let best = null, bn = -1;
    for (const f of F.figs.concat(F.extras)) { if (f.role === 'still') continue; const n = F.figs.concat(F.extras).filter((q) => Math.hypot(q.x - f.x, q.z - f.z) < 10).length; if (n > bn) { bn = n; best = f; } }
    if (best) { p.x = best.x + 3; p.z = best.z + 3; }
    for (let i = 0; i < 30 * 120; i++) m.strokes = Math.max(m.strokes, frame(api, g, dt, null));
    const tally = {}; for (const k in F.count) if (F.count[k] !== (before[k] || 0)) tally[k] = F.count[k] - (before[k] || 0);
    for (const q of F.figs) maxOff = Math.max(maxOff, Math.hypot(q.x - q.x0, q.z - q.z0));
    console.log('3. two minutes by', best ? best.name : '-', ': sounds', JSON.stringify(tally), ' nodes', JSON.stringify({ osc: stats.osc || 0, src: stats.src || 0, gain: stats.gain || 0, filter: stats.filter || 0 }), 'started', stats.start, 'stopped', stats.stop, ' notes', stats.notes.length,
      ' painted went up to', fx2(maxOff), 'm');
    if (stats.start !== stats.stop) { console.log('   !! a source was started and never stopped'); fails++; }
    // 4. she comes to an easel: viewK rises over two seconds. From 0.9 on every painted figure is at its mark; the extras are gone after 0.6
    g.spot = 0; let exOn = 0, exactAt = -1;
    for (let i = 0; i <= 60; i++) {
      g.viewK = Math.min(1, i / 55);
      g.tilt = [0]; g.eye = i > 0 ? overhead(api, g) : null;
      const n = frame(api, g, dt, null);
      const c = compare(api, g, g.S, true);
      if (g.viewK > 0.6 && n > c.strokes) exOn++;
      if (g.viewK >= 0.9 && c.bad) { fails++; console.log('   !! viewK', fx2(g.viewK), 'a painted figure is off its mark', JSON.stringify(c)); }
      if (exactAt < 0 && !c.bad) exactAt = g.viewK;
    }
    delete g.tilt; g.eye = null;
    console.log('4. coming to an easel: exactly at their marks from viewK', fx2(exactAt), ' frames with extras drawn past viewK 0.6:', exOn);
    fails += exOn;
    // 5. the reverie, the title, framing a photo, the night, the snow
    g.viewK = 0; g.spot = -1;
    for (let i = 0; i < 90; i++) frame(api, g, dt, { x: hub ? hub.x0 + 4 : p.x, z: hub ? hub.z0 + 4 : p.z });
    const plain = frame(api, g, dt, null);
    g.reverie = true; const logR = F.log.length; let rev = 0;
    for (let i = 0; i < 60; i++) rev = frame(api, g, dt, null);
    const cr = compare(api, g, g.S, false, true); g.reverie = false;
    const revSounds = F.log.length - logR;
    g.mode = 'title'; const title = frame(api, g, dt, null, true), ct = compare(api, g, g.S, false, true); g.mode = 'play';
    g.free = true; g.freeK = 1; const free = frame(api, g, dt, null); g.free = false; g.freeK = 0;
    g.t = 0.9; const night = frame(api, g, dt, null); g.t = 0.42;
    let snowTxt = '';
    const snowy = ch.phases.findIndex((q) => (q.snow || 0) > 0.5);
    if (snowy >= 0) { g.phase = snowy; const n = frame(api, g, dt, null); const left = F.extras.filter((f) => f.summer).length; snowTxt = ' snow (phase ' + snowy + '): ' + n + ' strokes, ' + left + ' of the extras are for summer only'; g.phase = 0; }
    const pc = cr.strokes;
    console.log('5. free play', plain, ' reverie', rev, '(painted', pc, ', at marks:', cr.bad === 0, ', sounds', revSounds + ')', ' title', title, '(at marks:', (ct.bad === 0) + ')', ' framing a photo', free, ' night', night + snowTxt);
    if (rev !== pc || cr.bad || ct.bad || revSounds) fails++;
    // 6. a wandering walk across the world while the day goes round: exceptions and the cost
    {
      const r = api.mulberry32(17 + wi); let x = ch.start.x, z = ch.start.z, a = r() * 6.28, worst = 0; const t0 = Date.now();
      for (let i = 0; i < 1800; i++) {
        a += (r() - 0.5) * 0.3; let nx = x + Math.sin(a) * 6 * dt, nz = z - Math.cos(a) * 6 * dt;
        if (Math.hypot(nx - ch.center[0], nz - ch.center[1]) > ch.radius - 10) { a += 2.6; nx = x; nz = z; }
        x = nx; z = nz; g.t = 0.3 + 0.62 * (i / 1800);
        worst = Math.max(worst, frame(api, g, dt, { x, z, h: a }));
      }
      g.t = 0.42;
      console.log('6. wandering 1800 frames as the day goes round: worst frame', worst, 'strokes,', ((Date.now() - t0) / 1800).toFixed(3), 'ms a frame');
      m.strokes = Math.max(m.strokes, worst);
    }
    // 7. no audio, no painted people, no water
    {
      g.audio = null; for (let i = 0; i < 30; i++) frame(api, g, dt, null);
      const folk = W.folk; delete W.folk; F.enter(g); for (let i = 0; i < 30; i++) frame(api, g, dt, null); W.folk = folk;
      const wy = W.waterY; W.waterY = null; F.enter(g); for (let i = 0; i < 30; i++) frame(api, g, dt, null); W.waterY = wy;
      const cur = g.cur; g.cur = null; F.update(g, dt); F.draw(g.S, g, g.envNow, 0); g.cur = cur; F.enter(g);
      console.log('7. no audio, no painted people, no water, no world: no exception');
    }
    console.log('worst frame of this world:', m.strokes, 'strokes');
    worstAll = Math.max(worstAll, m.strokes);
  }
  // 8. the fuller figure of the Argenteuil meadows (kind 'figure'), should that world list its figures too: drawn as its own figure() paints it
  {
    const code = fs.readFileSync(SRCDIR + '/12_argenteuil.js', 'utf8'), m = code.match(/const figure = \(x, z, yaw, o\) => \{[\s\S]*?\n    \};/);
    if (!m) console.log('8. figure(): not found in 12_argenteuil.js');
    else {
      const make = new Function('W', 'S', 'rnd', 'hex', 'jit', 'mixc', 'CELL', 'FLAG_AXIAL', m[0] + '\nreturn figure;');
      const g = fakeGame(api, 1), W = g.cur, from = { x: 33, z: 62 };
      const os = [{ dress: [0.42, 0.44, 0.53], top: [0.21, 0.24, 0.33], hat: [0.89, 0.82, 0.6], band: [0.23, 0.23, 0.27], parasol: [0.21, 0.38, 0.42], s: 1.06, from }, { dress: [0.94, 0.91, 0.84], hat: [0.91, 0.85, 0.63], s: 0.76 }];
      const at = [[40, 70, 1.4], [41, 69.5, 1.9]];
      // the reference: figure() painting into strokes of its own. The record: the same call, with the colours taken down
      const ref = new api.Strokes(64), helpers = [(h) => h, (c, a, r) => { const q = c.slice(); q[0] += (r() - 0.5) * a; q[1] += (r() - 0.5) * a; q[2] += (r() - 0.5) * a; return q; }, (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], api.CELL, api.FLAG_AXIAL];
      const Wr = { h: () => 1.5 }, recs = [];
      at.forEach((p, i) => {
        make(Wr, ref, api.mulberry32(3 + i), ...helpers)(p[0], p[1], p[2], os[i]);
        const rec = { kind: 'figure', x: p[0], y: 1.5, z: p[1], yaw: p[2], s: os[i].s, o: os[i], cols: [] };
        const bills = [], Srec = { n: 0, add(...a) { rec.cols.push(a[11]); }, bill(...a) { bills.push(a[6]); }, mark() {} };
        make(Wr, Srec, api.mulberry32(3 + i), ...helpers)(p[0], p[1], p[2], os[i]);
        if (os[i].parasol) rec.cols.push(bills[bills.length - 2], bills[bills.length - 1]); // the canopy and the light across its top
        recs.push(rec);
      });
      W.folk = recs; api.FOLK.enter(g);
      g.spot = 0; g.viewK = 1; g.tilt = [0]; g.eye = { x: 40, y: 45, z: 70 };
      frame(api, g, 1 / 30, null, true);
      let worst = 0, n = Math.min(ref.n, g.S.n);
      for (let i = 0; i < n; i++) for (const A of ['pos', 'sca', 'col']) for (let k = 0; k < (A === 'col' ? 3 : A === 'sca' ? 3 : 4); k++) worst = Math.max(worst, Math.abs(ref[A][i * 4 + k] - g.S[A][i * 4 + k]));
      for (let i = 0; i < n; i++) { let d = 0, which = ''; for (const A of ['pos', 'sca', 'col']) for (let k = 0; k < 3; k++) { const e = Math.abs(ref[A][i * 4 + k] - g.S[A][i * 4 + k]); if (e > d) { d = e; which = A + k; } } if (d > 1e-5 && process.env.FOLK_DEBUG) console.log('   stroke', i, which, d.toFixed(3)); }
      let wq = 0; for (let i = 0; i < n * 4; i++) wq = Math.max(wq, Math.abs(ref.quat[i] - g.S.quat[i]));
      console.log('8. kind figure (Argenteuil meadows): roles', api.FOLK.figs.map((f) => f.role).join(','), ' painted', ref.n, 'drawn', g.S.n, ' worst difference of place, size, colour', worst.toExponential(2), ' of orientation', wq.toExponential(2));
      if (ref.n !== g.S.n || worst > 1e-5 || wq > 1e-5) fails++;
      g.viewK = 0; g.spot = -1; g.eye = null; delete g.tilt;
      for (let i = 0; i < 600; i++) frame(api, g, 1 / 30, { x: 60, z: 60 });
      console.log('   after twenty seconds of life:', api.FOLK.figs.map((f) => f.role + ' ' + fx2(Math.hypot(f.x - f.x0, f.z - f.z0)) + ' m off').join(', '));
    }
  }
  console.log('\nworst frame over everything:', worstAll, 'strokes;', fails ? fails + ' FAILURES' : 'all checks passed');
} else if (mode === 'shots') {
  const { chromium } = await import('/opt/npm-tools/node_modules/playwright/index.mjs');
  const wi = Number(process.argv[3] || 0);
  const shots = JSON.parse(process.argv[4] || '[{"name":"folk_a","t":0.4,"phase":0}]');
  const W_ = Number(process.env.W || 1280), H_ = Number(process.env.H || 720);
  const html = `<!doctype html><html><body style="margin:0;background:#000"><canvas id="c" style="width:${W_}px;height:${H_}px;display:block"></canvas><script>
${source(wi)}
window.__run = function (wi) {
  const ui = { onLeave() {}, onArrive() {}, onCard() {}, onPhase() {}, onSpot() {}, onAuto() {}, onCapture() {}, onQuality() {}, onFly() {}, onSlide() {}, onReview() {}, onFree() {}, onFound() {} };
  const g = window.__g = new Game(document.getElementById('c'), ui, null);
  g.quality = ${process.env.Q === undefined ? 2 : Number(process.env.Q)}; g.autoQuality = false;
  g.resize(${W_}, ${H_}, 1);
  g.showWorld(wi); g.mode = 'play';
  if (!FOLK.figs) return { strokes: g.cur.S.n, dropped: g.cur.S.dropped, stub: true };
  return { strokes: g.cur.S.n, dropped: g.cur.S.dropped, painted: FOLK.figs.map((f) => f.role + '@' + f.x0.toFixed(1) + ',' + f.z0.toFixed(1)), extras: FOLK.extras.map((f) => f.role + '@' + f.x0.toFixed(1) + ',' + f.z0.toFixed(1)) };
};
window.__shot = function (o) {
  const g = window.__g, p = g.pl, W = g.cur, dt = 1 / 30;
  g.mode = 'play'; g.t = o.t === undefined ? 0.4 : o.t; g.phase = g.prevPhase = o.phase || 0; g.phShown = null;
  g.time = o.time === undefined ? (g.time || 3) : o.time; g.flowPhase[0] = g.flowPhase[1] = g.time * 0.05;
  g.spot = -1; g.viewK = 0; g.debugCam = null; g.doorOn = false; g.free = false; g.freeK = 0; g.reverie = false; g.sliding = false;
  const at = (q) => { if (!q.at) return q; const w = q.at.split(' '), f = w[0] === 'painted' ? FOLK.figs[+w[1]] : FOLK.extras[+w[1]]; return { x: (w[0] === 'painted' ? f.x0 : f.x) + (q.dx || 0), z: (w[0] === 'painted' ? f.z0 : f.z) + (q.dz || 0) }; };
  const put = (q) => { p.x = q.x; p.z = q.z; p.alt = 0; p.y = g.groundAt(W, p.x, p.z); };
  if (o.reset) FOLK.enter(g);
  if (o.pl) { const q = at(o.pl); put(q); p.heading = o.pl.heading === undefined ? o.pl.yaw : o.pl.heading; g.camYaw = o.pl.yaw; g.camPitch = o.pl.pitch === undefined ? -0.06 : o.pl.pitch; g.camDD = undefined; }
  p.vx = p.vz = 0;
  const env = () => { g.envNow = atmosphere(g.ch, g.t, g.phaseNow(), g.time, g.env); };
  env();
  for (const st of o.sim || []) {
    const n = Math.max(1, Math.round((st.secs || 1) * 30)), x0 = p.x, z0 = p.z, to = st.to ? at(st.to) : { x: x0, z: z0 };
    for (let i = 1; i <= n; i++) {
      const k = i / n, nx = x0 + (to.x - x0) * k, nz = z0 + (to.z - z0) * k;
      p.vx = (nx - p.x) / dt; p.vz = (nz - p.z) / dt; p.x = nx; p.z = nz; p.y = g.groundAt(W, nx, nz);
      if (Math.hypot(p.vx, p.vz) > 0.5) p.heading = Math.atan2(p.vx, -p.vz);
      g.time += dt; FOLK.update(g, dt);
    }
    p.vx = p.vz = 0;
  }
  for (let i = 0; i < Math.round((o.wait || 0) * 30); i++) { g.time += dt; FOLK.update(g, dt); }
  if (o.end) { if (o.end.yaw !== undefined) g.camYaw = o.end.yaw; if (o.end.pitch !== undefined) g.camPitch = o.end.pitch; g.camDD = undefined; }
  if (o.spot !== undefined) { const s = g.ch.spots[o.spot]; g.spot = o.spot; g.viewK = o.viewK === undefined ? 1 : o.viewK; put({ x: s.x, z: s.z }); p.heading = s.view.pose === undefined ? s.view.yaw : s.view.pose; }
  else if (o.viewK !== undefined) g.viewK = o.viewK;
  if (o.free) { g.free = true; g.freeK = 1; }
  if (o.reverie) g.reverie = true;
  if (g.hero) { const sv = o.spot !== undefined ? g.ch.spots[o.spot].view : null; g.hero.breeze = sv && sv.breeze || 1; for (let i = 0; i < 3; i++) g.hero.step(0.5, p, sv && sv.gale ? sv.gale : g.ch.wind, g.time, false, false); g.hero.fly = 0; g.hero.pose = sv && sv.act === 1 ? 1 : 0; g.hero.pose2 = sv && sv.act === 2 ? 1 : 0; g.hero.eye = sv ? [sv.x, g.groundAt(W, sv.x, sv.z) + sv.y, sv.z] : null; }
  if (o.cam) g.debugCam = o.cam.at ? Object.assign({}, o.cam, at(o.cam)) : o.cam;
  g.render(); g.R.gl.finish();
  const S2 = new Strokes(MAX_DYN); FOLK.draw(S2, g, g.envNow, g.time);
  return { sunI: +g.envNow.sunI.toFixed(2), dyn: g.dyn.n, ours: S2.n, pl: [+p.x.toFixed(1), +p.z.toFixed(1)], log: FOLK.log ? FOLK.log.slice(-4).map((e) => e.who + ' ' + e.what) : [] };
};
</script></body></html>`;
  const page_ = dir + '/test/folk_' + wi + (process.env.FOLK_STUB === '1' ? '_stub' : '') + '.html';
  fs.writeFileSync(page_, html);
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: W_, height: H_ } });
  page.on('console', (m) => { const t = m.text(); if (!/GL Driver|GPU stall/.test(t)) console.log('[console]', m.type(), t.slice(0, 1500)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 6000)));
  await page.goto('file://' + page_);
  const info = await page.evaluate((i) => window.__run(i), wi);
  console.log(JSON.stringify(info));
  for (const c of shots) {
    const r = await page.evaluate((c) => window.__shot(c), c);
    const out = `${dir}/shots/${c.name}.png`;
    await page.screenshot({ path: out });
    console.log('saved', out, JSON.stringify(r));
  }
  await browser.close();
} else console.log('modes: logic, shots');
