// harness of the living world (src/31_alive.js): strings of light, birds, rings on water, the night
// node test/alive.mjs map [wi ...]          plans of the worlds with the strings and the birds on them (plain node): shots/alive_map_<wi>.png
// node test/alive.mjs logic [wi ...]        scripted walks through strings, birds, water and night, in plain node, with a log of what popped and rang
// node test/alive.mjs shots <wi> '<json>'   stills from the real renderer
//     shot: { name, t, phase, time, pl:{x,z,yaw,pitch,alt,heading} | cam:{x,y,z,yaw,pitch,fov,abs} | spot, free, reverie, viewK,
//             sim:[{ to:{x,z,alt}, secs, slide, at:'string 0 mote 3' ... }] }   the sim moves her with ALIVE.update running, then the frame is drawn
import fs from 'fs';
import { execFileSync } from 'child_process';
const dir = '/home/claude/monet';
const mode = process.argv[2] || 'logic';
const WFILES = ['11_coast.js', '12_argenteuil.js', '13_fields.js', '14_pond.js'], WNAMES = ['W_COAST', 'W_ARGENTEUIL', 'W_FIELDS', 'W_POND'];
// files other people are writing right now are taken from src when they parse and from the saved copy in stable/ when they do not
const parses = (code) => { try { new Function(code); return true; } catch (e) { return false; } };
function read(f, note) {
  const a = dir + '/src/' + f, b = dir + '/stable/' + f;
  if (f === '31_alive.js') return fs.readFileSync(a, 'utf8');
  if (process.env.STABLE === '1' && fs.existsSync(b)) return fs.readFileSync(b, 'utf8');
  const code = fs.readFileSync(a, 'utf8');
  if (/^(08_|1[1-4]_|20_)/.test(f) && !parses(code) && fs.existsSync(b)) { if (note) console.log('[harness] src/' + f + ' does not parse right now, using stable/' + f); return fs.readFileSync(b, 'utf8'); }
  return code;
}
function source(only) {
  const files = fs.readdirSync(dir + '/src').filter((f) => f.endsWith('.js') && !/^40_/.test(f) && (only === undefined || !/^1[1-4]_/.test(f) || f === WFILES[only])).sort();
  return files.map((f) => (only !== undefined && f === '19_worlds.js' ? 'const WORLDS = [0, 1, 2, 3].map(() => ' + WNAMES[only] + ');' : read(f, true))).join('\n');
}

// ----- plain node: the worlds are built without a renderer, and a stand in for the game carries what ALIVE reads -----
function load() {
  return new Function(source() + '\nreturn { WORLDS, World, ALIVE, Game, mulberry32, atmosphere, mixPhase, Strokes, SCORES, Music, MAX_DYN, clamp, FLAG_FLAT, FLAG_BILL, CELL };')();
}
function fakeGame(api, wi, audio) {
  const ch = api.WORLDS[wi], W = new api.World(ch.seed);
  W.wind = ch.wind; ch.build(W); for (const task of W.tasks) task(); W.tasks = [];
  const g = { ch, cur: W, wi, mode: 'play', pl: { x: ch.start.x, y: 0, z: ch.start.z, heading: ch.start.yaw || 0, vx: 0, vz: 0, alt: 0, valt: 0, step: 0 },
    sliding: false, spot: -1, viewK: 0, free: false, freeK: 0, reverie: false, t: 0.42, time: 0, phase: 0, audio: audio || null, found: {}, caps: {},
    camYaw: ch.start.yaw || 0, camPitch: -0.06, cam: { pos: [0, 0, 0], fwd: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0], fov: 1.05 },
    groundAt: api.Game.prototype.groundAt, env: {} };
  g.pl.y = g.groundAt(W, g.pl.x, g.pl.z);
  g.S = new api.Strokes(api.MAX_DYN);
  g.R = { n: 0, list: [], keep: false, glow(x, y, z, kind, r, gg, b, w, h) { this.n++; if (this.keep) this.list.push([x, y, z, kind, r, gg, b, w, h]); } };
  return g;
}
// one frame: she is put where the script says, the living world is stepped and asked for its strokes and its lights
function frame(api, g, dt, to) {
  const p = g.pl, W = g.cur;
  if (to) {
    const gy0 = g.groundAt(W, to.x, to.z), y = gy0 + (to.alt || 0);
    p.vx = (to.x - p.x) / dt; p.vz = (to.z - p.z) / dt; p.valt = (y - p.y) / dt;
    p.x = to.x; p.z = to.z; p.y = y; p.alt = to.alt || 0;
    if (Math.hypot(p.vx, p.vz) > 0.3) { p.heading = Math.atan2(p.vx, -p.vz); g.camYaw = p.heading; }
  } else { p.vx = p.vz = 0; p.valt = 0; }
  g.time += dt;
  const fx = Math.sin(g.camYaw), fz = -Math.cos(g.camYaw);
  g.cam.pos[0] = p.x - fx * 6; g.cam.pos[1] = p.y + 2.6; g.cam.pos[2] = p.z - fz * 6; g.cam.fwd[0] = fx; g.cam.fwd[2] = fz;
  api.ALIVE.update(g, dt);
  const ph = g.ch.phases[g.phase], env = api.atmosphere(g.ch, g.t, api.mixPhase(ph, ph, 0), g.time, g.env);
  g.envNow = env;
  g.S.clear(); api.ALIVE.draw(g.S, g, env, g.time);
  g.R.n = 0; g.R.list.length = 0; api.ALIVE.glows(g.R, g, env, g.time);
  return { strokes: g.S.n, glows: g.R.n };
}
const noteName = (m) => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
function fakeAudio(api, wi, log) {
  return { ctx: { currentTime: 0, state: 'running' }, group: { score: api.SCORES[wi] }, ok() { return true; }, deg: api.Music.prototype.deg,
    note(voice, t, midi, vel) { log.push({ voice, at: +(t - this.ctx.currentTime).toFixed(3), midi, name: noteName(midi), vel: +vel.toFixed(3) }); } };
}
const fx2 = (v) => +v.toFixed(1);

if (mode === 'map') {
  const api = load(), which = process.argv.slice(3).map(Number), list = which.length ? which : [0, 1, 2, 3];
  for (const wi of list) {
    const g = fakeGame(api, wi, null), ch = g.ch, W = g.cur;
    api.ALIVE.enter(g);
    const span = 2 * (ch.radius + 16), x0 = ch.center[0] - span / 2, z0 = ch.center[1] - span / 2, n = 300, h = [], deck = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = x0 + ((i + 0.5) / n) * span, z = z0 + ((j + 0.5) / n) * span;
      h.push(+W.h(x, z).toFixed(2));
      if (W.deck && W.deck(x, z) !== null) deck.push([fx2(x), fx2(z)]);
    }
    const strings = (api.ALIVE.strings || []).map((s) => ({ kind: s.kind, closed: !!s.closed, m: Array.from({ length: s.n }, (_, i) => [fx2(s.x[i]), fx2(s.y[i]), fx2(s.z[i])]) }));
    const birds = (api.ALIVE.flocks || []).map((f) => ({ x: fx2(f.hx), z: fx2(f.hz), kind: f.kind.name, n: f.n }));
    const out = { id: ch.id, n, x0, z0, span, h, waterY: W.waterY, center: ch.center, radius: ch.radius, colliders: W.colliders.map((c) => [fx2(c.x), fx2(c.z), fx2(c.r)]), deck,
      spots: ch.spots.map((s) => ({ x: s.x, z: s.z, hidden: !!s.hidden })), start: ch.start, door: ch.door || null, strings, birds, px: Number(process.env.PX || 1000) };
    const jf = '/tmp/alive_map_' + wi + '.json', png = dir + '/shots/alive_map_' + wi + '.png';
    fs.writeFileSync(jf, JSON.stringify(out));
    execFileSync('python3', [dir + '/test/alive_map.py', jf, png]);
    console.log('== world', wi, ch.id, ' spots', ch.spots.length, 'hidden', ch.spots.filter((s) => s.hidden).length, ' ->', png);
    strings.forEach((s, i) => {
      const hs = s.m.map((m) => fx2(m[1] - g.groundAt(W, m[0], m[2])));
      let len = 0; for (let k = 1; k < s.m.length; k++) len += Math.hypot(s.m[k][0] - s.m[k - 1][0], s.m[k][2] - s.m[k - 1][2]);
      console.log('  string', i, s.kind, 'motes', s.m.length, 'from', s.m[0][0], s.m[0][2], 'to', s.m[s.m.length - 1][0], s.m[s.m.length - 1][2], 'length', fx2(len), 'above ground', Math.min(...hs), 'to', Math.max(...hs));
    });
    birds.forEach((b, i) => console.log('  birds', i, b.kind, 'x' + b.n, 'at', b.x, b.z, 'ground', fx2(g.groundAt(W, b.x, b.z)), 'nearest easel', fx2(Math.min(...ch.spots.map((s) => Math.hypot(s.x - b.x, s.z - b.z))))));
  }
} else if (mode === 'logic') {
  const api = load(), which = process.argv.slice(3).map(Number), list = which.length ? which : [0, 1, 2, 3];
  const dt = 1 / 30;
  let worst = { strokes: 0, glows: 0 };
  const track = (r, m) => { if (r.strokes > m.strokes) m.strokes = r.strokes; if (r.glows > m.glows) m.glows = r.glows; if (r.strokes > worst.strokes) worst.strokes = r.strokes; if (r.glows > worst.glows) worst.glows = r.glows; };
  for (const wi of list) {
    const log = [], g = fakeGame(api, wi, null), ch = g.ch, W = g.cur, A = api.ALIVE;
    g.audio = fakeAudio(api, wi, log);
    console.log('\n===== world', wi, ch.id, '=====');
    A.enter(g);
    const strings = A.strings || [], flocks = A.flocks || [];
    console.log('strings', strings.length, strings.map((s) => s.kind + ':' + s.n).join(' '), ' flocks', flocks.length, flocks.map((f) => f.kind.name + ':' + f.n).join(' '));
    // checks of the placement: nothing in the ground, in a collider, by an easel or outside the world
    let bad = 0;
    strings.forEach((s, si) => { for (let i = 0; i < s.n; i++) {
      const x = s.x[i], y = s.y[i], z = s.z[i], gy = g.groundAt(W, x, z), dS = Math.min(...ch.spots.map((q) => Math.hypot(q.x - x, q.z - z)));
      const col = W.colliders.find((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.5), out = Math.hypot(x - ch.center[0], z - ch.center[1]) > ch.radius - 2;
      if (y - gy < 1.2 || col || dS < 9 || out) { bad++; console.log('  !! string', si, s.kind, 'mote', i, 'above ground', fx2(y - gy), col ? 'IN COLLIDER r ' + col.r : '', 'easel at', fx2(dS), out ? 'OUTSIDE' : ''); }
    } });
    flocks.forEach((f, fi) => { const dS = Math.min(...ch.spots.map((q) => Math.hypot(q.x - f.hx, q.z - f.hz))), col = W.colliders.find((c) => Math.hypot(c.x - f.hx, c.z - f.hz) < c.r + 0.3);
      if (dS < 12 || col) { bad++; console.log('  !! flock', fi, 'easel at', fx2(dS), col ? 'IN COLLIDER' : ''); } });
    console.log('placement problems', bad);
    // 1. idle frames at the start: what a frame costs when nothing happens
    const m0 = { strokes: 0, glows: 0 };
    for (let i = 0; i < 60; i++) track(frame(api, g, dt, null), m0);
    console.log('idle at the start: strokes', m0.strokes, 'glows', m0.glows, 'shine', +(g.shine || 0).toFixed(3));
    // 2. through every string, mote by mote, at flying speed (16 m/s) or a slide (9 m/s) for the low ones
    strings.forEach((s, si) => {
      log.length = 0;
      const m = { strokes: 0, glows: 0 }, low = s.kind === 'loop' || s.kind === 'lead', sp = low ? 9 : 16, p = g.pl;
      const gy = (i) => g.groundAt(W, s.x[i], s.z[i]);
      // she is set down 8 m before the first mote, on the line of the first two
      const dx = s.x[1] - s.x[0], dz = s.z[1] - s.z[0], dl = Math.hypot(dx, dz) || 1, bx = s.x[0] - (dx / dl) * 8, bz = s.z[0] - (dz / dl) * 8;
      const altOf = (i) => (low ? 0 : Math.max(0, s.y[i] - 1.2 - gy(i)));
      p.x = bx; p.z = bz; p.alt = altOf(0); p.y = g.groundAt(W, bx, bz) + p.alt;
      A.update(g, dt); // (a jump: nothing may pop on the way here)
      const got0 = s.got;
      g.sliding = low && W.waterY !== null && g.groundAt(W, p.x, p.z) <= W.waterY + 0.001;
      const order = [];
      let k = -1, shineMax = 0;
      const pts = []; for (let i = 0; i < s.n; i++) pts.push(i); if (s.closed) pts.push(0);
      for (const i of pts) {
        const tx = s.x[i], tz = s.z[i], ta = altOf(i);
        for (let guard = 0; guard < 400; guard++) {
          const d = Math.hypot(tx - p.x, tz - p.z), stp = sp * dt;
          if (d < 0.05) break;
          const q = Math.min(1, stp / d), nx = p.x + (tx - p.x) * q, nz = p.z + (tz - p.z) * q, na = p.alt + (ta - p.alt) * q;
          g.sliding = low && W.waterY !== null && g.groundAt(W, nx, nz) <= W.waterY + 0.001;
          const before = s.got;
          track(frame(api, g, dt, { x: nx, z: nz, alt: na }), m);
          if (s.got !== before) for (let j = 0; j < s.n; j++) if (s.tk[j] && !order.includes(j)) order.push(j);
          shineMax = Math.max(shineMax, g.shine || 0);
        }
      }
      for (let i = 0; i < 20; i++) track(frame(api, g, dt, null), m); // the burst and the spray play out
      const notes = log.filter((n) => n.voice === 'glass' && n.at < 0.05).map((n) => n.name), rest = log.filter((n) => !(n.voice === 'glass' && n.at < 0.05));
      console.log(' string', si, s.kind, 'n', s.n, ' taken', s.got, 'of', s.n, got0 ? '(had ' + got0 + ')' : '', ' order', order.join(','), '\n    notes', notes.join(' '), '\n    then', rest.map((n) => n.voice + ' ' + n.name + '@' + n.at).join(', ') || 'nothing',
        '\n    worst frame: strokes', m.strokes, 'glows', m.glows, ' shine peak', +shineMax.toFixed(2));
      k = k + 1;
    });
    // 3. a partial run comes back: two motes of the first string after a regrow, then a long wait
    if (strings.length) {
      const s = strings[0];
      let T = 0; while (s.got > 0 && T < 130) { frame(api, g, 0.5, null); T += 0.5; }
      console.log(' string 0 whole again after', T, 's of waiting (taken', s.got, ')');
      const p = g.pl; p.x = s.x[0] - 20; p.z = s.z[0]; A.update(g, dt);
      for (const i of [0, 1]) { const a = Math.max(0, s.y[i] - 1.2 - g.groundAt(W, s.x[i], s.z[i])); frame(api, g, dt, { x: s.x[i] - 0.4, z: s.z[i], alt: a }); frame(api, g, dt, { x: s.x[i] + 0.4, z: s.z[i], alt: a }); }
      const had = s.got; T = 0; while (s.got > 0 && T < 60) { frame(api, g, 0.25, null); T += 0.25; }
      console.log(' a run of', had, 'motes left alone grows back after', T, 's');
    }
    // 4. birds: she walks up to each flock from 30 m away, waits, and the flock is followed until it has settled again
    flocks.forEach((f, fi) => {
      log.length = 0;
      const m = { strokes: 0, glows: 0 }, p = g.pl, hx0 = f.hx, hz0 = f.hz;
      let ax = hx0 + 30, az = hz0; // from the east, unless that is outside or far below
      p.x = ax; p.z = az; p.alt = 0; p.y = g.groundAt(W, ax, az); A.update(g, dt);
      const st0 = f.state;
      let tookAt = -1, d = 30;
      for (let i = 0; i < 200 && d > 2; i++) { d -= 5.4 * dt; track(frame(api, g, dt, { x: hx0 + d, z: hz0, alt: 0 }), m); if (tookAt < 0 && f.state !== 0) tookAt = d; }
      let T = 0, maxUp = 0;
      // she walks on, away from them, and they come down somewhere
      for (let i = 0; i < 1500 && f.state !== 0; i++) { d -= 5.4 * dt; track(frame(api, g, dt, { x: hx0 + d, z: hz0, alt: 0 }), m); T += dt; for (let b = 0; b < f.n; b++) maxUp = Math.max(maxUp, f.py[b] - g.groundAt(W, f.px[b], f.pz[b])); }
      const dS = Math.min(...ch.spots.map((q) => Math.hypot(q.x - f.hx, q.z - f.hz)));
      console.log(' flock', fi, f.kind.name, 'x' + f.n, 'was', st0 === 0 ? 'standing' : 'state ' + st0, ' took off with her at', tookAt < 0 ? 'NEVER' : fx2(tookAt) + ' m', ' in the air', fx2(T), 's, up to', fx2(maxUp), 'm, settled', fx2(Math.hypot(f.hx - hx0, f.hz - hz0)), 'm away at', fx2(f.hx), fx2(f.hz),
        ' easel at', fx2(dS), ' sound', log.map((n) => n.voice + ' ' + n.name + '@' + n.at + ' v' + n.vel).join(', ') || 'none', ' worst frame: strokes', m.strokes);
    });
    // 5. water: a slide of 6 seconds over the nearest open water
    if (W.waterY !== null) {
      let best = null;
      for (let r = 10; r < ch.radius && !best; r += 6) for (let a = 0; a < 24 && !best; a++) {
        const x = ch.start.x + Math.cos(a * 0.2618) * r, z = ch.start.z + Math.sin(a * 0.2618) * r;
        let ok = Math.hypot(x - ch.center[0], z - ch.center[1]) < ch.radius - 30;
        for (let q = -1; q <= 9 && ok; q++) if (W.h(x + q * 4, z) > W.waterY - 0.2 || (W.deck && W.deck(x + q * 4, z) !== null)) ok = false;
        if (ok) best = [x, z];
      }
      if (best) {
        log.length = 0;
        const m = { strokes: 0, glows: 0 }, p = g.pl; p.x = best[0]; p.z = best[1]; p.alt = 0; p.y = W.waterY; A.update(g, dt);
        const base = frame(api, g, dt, null).strokes;
        g.sliding = true; let rings = 0;
        for (let i = 0; i < 180; i++) { const r = frame(api, g, dt, { x: best[0] + i * 9 * dt, z: best[1], alt: 0 }); track(r, m); rings = Math.max(rings, r.strokes - base); }
        g.sliding = false;
        let T = 0, left = 1; while (left > 0 && T < 6) { left = frame(api, g, dt, null).strokes - base; T += dt; }
        console.log(' water: slide from', fx2(best[0]), fx2(best[1]), ' strokes for the rings at most', rings, ' gone', fx2(T), 's after she stops', ' glass notes', log.filter((n) => n.voice === 'glass').map((n) => n.name + ' v' + n.vel).join(' ') || 'none');
      } else console.log(' water: no open water found near the start');
    }
    // 6. night: fireflies and shooting stars over three minutes of darkness
    {
      const p = g.pl; p.x = ch.start.x; p.z = ch.start.z; p.alt = 0; p.y = g.groundAt(W, p.x, p.z); A.update(g, dt);
      g.t = 0.9;
      const m = { strokes: 0, glows: 0 }; let stars = 0, was = false, fmin = 1e9, fmax = 0, far = 0;
      g.R.keep = true;
      for (let i = 0; i < 30 * 180; i++) {
        const r = frame(api, g, dt, null); track(r, m);
        const on = g.R.list.some((q) => q[3] === 2);
        if (on && !was) stars++; was = on;
        const ff = g.R.list.filter((q) => q[3] === 0 && q[5] > q[4] && q[8] < 1); // the green ones, their hearts
        if (i > 30) { fmin = Math.min(fmin, ff.length); fmax = Math.max(fmax, ff.length); }
        for (const q of ff) far = Math.max(far, Math.hypot(q[0] - p.x, q[2] - p.z));
      }
      g.R.keep = false;
      console.log(' night (t 0.9): glows a frame at most', m.glows, ' fireflies lit at once', fmin, 'to', fmax, ' farthest from her', fx2(far), 'm  shooting stars in 180 s:', stars);
      g.t = 0.42;
    }
    // 7. the rules: at an easel, in the reverie, framing a photo
    {
      const p = g.pl, s0 = strings[0];
      if (s0) { p.x = s0.x[0] + 3; p.z = s0.z[0]; p.alt = Math.max(0, s0.y[0] - 1.2 - g.groundAt(W, p.x, p.z)); p.y = g.groundAt(W, p.x, p.z) + p.alt; }
      A.update(g, dt);
      let T = 0; while (s0 && s0.got > 0 && T < 130) { frame(api, g, 0.5, null); T += 0.5; }
      const plain = frame(api, g, dt, null);
      g.viewK = 0.61; const atEasel = frame(api, g, dt, null); g.viewK = 0.3; const half = frame(api, g, dt, null); g.viewK = 0;
      g.reverie = true; log.length = 0; const before = s0 ? s0.got : 0;
      if (s0) frame(api, g, dt, { x: s0.x[0], z: s0.z[0], alt: p.alt });
      const rev = frame(api, g, dt, null), revGot = s0 ? s0.got - before : 0, revNotes = log.length; g.reverie = false;
      g.free = true; g.freeK = 0.8; const free = frame(api, g, dt, null); g.free = false; g.freeK = 0;
      console.log(' rules: free play', JSON.stringify(plain), ' viewK 0.3', JSON.stringify(half), ' viewK 0.61', JSON.stringify(atEasel), ' reverie', JSON.stringify(rev), 'popped', revGot, 'notes', revNotes, ' framing a photo', JSON.stringify(free));
    }
    // 8. a few hundred frames of a wandering flight across the world, for exceptions and for the cost
    {
      const m = { strokes: 0, glows: 0 }, r = api.mulberry32(99 + wi), p = g.pl;
      let x = ch.start.x, z = ch.start.z, a = r() * 6.283, alt = 0, t0 = Date.now();
      for (let i = 0; i < 1800; i++) {
        a += (r() - 0.5) * 0.3; const sp = 14;
        let nx = x + Math.sin(a) * sp * dt, nz = z - Math.cos(a) * sp * dt;
        if (Math.hypot(nx - ch.center[0], nz - ch.center[1]) > ch.radius - 10) { a += 2.6; nx = x; nz = z; }
        x = nx; z = nz; alt = Math.max(0, 8 + 7 * Math.sin(i * 0.02));
        g.t = 0.3 + 0.62 * (i / 1800); // the day goes round to night meanwhile
        g.sliding = false;
        track(frame(api, g, dt, { x, z, alt }), m);
      }
      console.log(' wandering flight of 1800 frames: no exception, worst frame strokes', m.strokes, 'glows', m.glows, ' ms a frame (update, draw, glows)', ((Date.now() - t0) / 1800).toFixed(3), ' shine', +(g.shine || 0).toFixed(2));
      g.t = 0.42;
    }
    // 9. no audio at all, and a world that is not there
    { g.audio = null; const s0 = strings[0]; if (s0) { frame(api, g, dt, { x: s0.x[0] - 1, z: s0.z[0], alt: 0 }); } frame(api, g, dt, null);
      const cur = g.cur, c2 = g.ch; g.cur = null; A.update(g, dt); A.draw(g.S, g, g.envNow, g.time); A.glows(g.R, g, g.envNow, g.time); g.cur = cur; g.ch = null; A.update(g, dt); A.draw(g.S, g, g.envNow, g.time); A.glows(g.R, g, g.envNow, g.time); g.ch = c2;
      console.log(' no audio, no world: no exception'); }
  }
  console.log('\nworst frame over everything: strokes', worst.strokes, 'glows', worst.glows);
} else if (mode === 'shots') {
  const { chromium } = await import('/opt/npm-tools/node_modules/playwright/index.mjs');
  const wi = Number(process.argv[3] || 0);
  const shots = JSON.parse(process.argv[4] || '[{"name":"alive_a","t":0.4,"phase":0}]');
  const W_ = Number(process.env.W || 1280), H_ = Number(process.env.H || 720);
  const html = `<!doctype html><html><body style="margin:0;background:#000"><canvas id="c" style="width:${W_}px;height:${H_}px;display:block"></canvas><script>
${source(wi)}
window.__run = function (wi) {
  const ui = { onLeave() {}, onArrive() {}, onCard() {}, onPhase() {}, onSpot() {}, onAuto() {}, onCapture() {}, onQuality() {}, onFly() {}, onSlide() {}, onReview() {}, onFree() {}, onFound() {} };
  const g = window.__g = new Game(document.getElementById('c'), ui, null);
  g.quality = ${process.env.Q === undefined ? 2 : Number(process.env.Q)}; g.autoQuality = false;
  g.resize(${W_}, ${H_}, 1);
  g.showWorld(wi); g.mode = 'play';
  const W = g.cur;
  return { strokes: W.S.n, dropped: W.S.dropped, strings: (ALIVE.strings || []).map((s) => s.kind + ':' + s.n), flocks: (ALIVE.flocks || []).map((f) => f.kind.name + ':' + f.n + '@' + f.hx.toFixed(0) + ',' + f.hz.toFixed(0)) };
};
window.__shot = function (o) {
  const g = window.__g, p = g.pl, W = g.cur, dt = 1 / 30;
  g.mode = 'play'; g.t = o.t === undefined ? 0.4 : o.t; g.phase = g.prevPhase = o.phase || 0; g.phShown = null;
  if (o.time !== undefined) g.time = o.time; else if (!g.time) g.time = 3;
  g.flowPhase[0] = g.flowPhase[1] = g.time * 0.05;
  g.spot = -1; g.viewK = 0; g.debugCam = null; g.doorOn = false; g.free = false; g.freeK = 0; g.reverie = false; g.sliding = false;
  const put = (q) => { p.x = q.x; p.z = q.z; p.alt = q.alt || 0; p.y = g.groundAt(W, p.x, p.z) + p.alt; };
  // where a script may name a place: "string i mote j" (off by dx, dz), "flock i" (off by dx, dz)
  const at = (q) => { if (!q.at) return q; const w = q.at.split(' '); let x = 0, z = 0, alt = q.alt;
    if (w[0] === 'string') { const s = ALIVE.strings[+w[1]], i = +w[3] || 0; x = s.x[i]; z = s.z[i]; if (alt === undefined) alt = Math.max(0, s.y[i] - 1.2 - g.groundAt(W, x, z)); }
    else if (w[0] === 'flock') { const f = ALIVE.flocks[+w[1]]; x = f.hx; z = f.hz; }
    return { x: x + (q.dx || 0), z: z + (q.dz || 0), alt: alt || 0, yaw: q.yaw, pitch: q.pitch, heading: q.heading }; };
  if (o.reset) ALIVE.enter(g);
  if (o.pl) { const q = at(o.pl); put(q); p.heading = q.heading === undefined ? q.yaw : q.heading; g.camYaw = q.yaw; g.camPitch = q.pitch === undefined ? -0.06 : q.pitch; g.camDD = undefined; }
  p.vx = p.vz = 0; p.valt = 0;
  ALIVE.update(g, dt); // (she was set down here: a jump)
  let log = '';
  for (const st of o.sim || []) {
    const n = Math.max(1, Math.round((st.secs || 1) * 30)), x0 = p.x, z0 = p.z, a0 = p.alt, to = st.to ? at(st.to) : { x: x0, z: z0, alt: a0 };
    for (let i = 1; i <= n; i++) {
      const k = i / n, nx = x0 + (to.x - x0) * k, nz = z0 + (to.z - z0) * k, na = a0 + ((to.alt || 0) - a0) * k, ny = g.groundAt(W, nx, nz) + na;
      p.vx = (nx - p.x) / dt; p.vz = (nz - p.z) / dt; p.valt = (ny - p.y) / dt; p.x = nx; p.z = nz; p.alt = na; p.y = ny;
      if (Math.hypot(p.vx, p.vz) > 0.5) p.heading = Math.atan2(p.vx, -p.vz);
      g.sliding = !!st.slide; g.time += dt;
      if (st.t !== undefined) g.t = st.t;
      ALIVE.update(g, dt);
    }
    if (st.stop) { p.vx = p.vz = 0; p.valt = 0; }
  }
  if (o.end) { const q = o.end; if (q.yaw !== undefined) g.camYaw = q.yaw; if (q.pitch !== undefined) g.camPitch = q.pitch; g.camDD = undefined; }
  if (o.spot !== undefined) { const s = g.ch.spots[o.spot]; g.spot = o.spot; g.viewK = o.viewK === undefined ? 1 : o.viewK; put({ x: s.x, z: s.z }); p.heading = s.view.pose === undefined ? s.view.yaw : s.view.pose; }
  if (o.viewK !== undefined && o.spot === undefined) g.viewK = o.viewK;
  if (o.free) { g.free = true; g.freeK = 1; }
  if (o.reverie) g.reverie = true;
  if (g.hero) { for (let i = 0; i < 3; i++) g.hero.step(0.5, p, g.ch.wind, g.time, p.alt > 0.06, g.sliding); g.hero.fly = p.alt > 0.06 ? 1 : 0; g.hero.eye = null; }
  if (o.cam) g.debugCam = o.cam.at ? Object.assign({}, o.cam, (() => { const q = at(o.cam); return { x: q.x, z: q.z }; })()) : o.cam;
  g.render(); g.R.gl.finish();
  const n0 = g.dyn.n;
  // how much of the frame's dynamic strokes and lights is ours
  const S2 = new Strokes(MAX_DYN); ALIVE.draw(S2, g, g.envNow, g.time);
  let gl = 0; ALIVE.glows({ glow() { gl++; } }, g, g.envNow, g.time);
  return { sunI: +g.envNow.sunI.toFixed(2), dyn: n0, ours: S2.n, ourGlows: gl, allGlows: g.R.glowCount, shine: +(g.shine || 0).toFixed(2), pl: [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)], taken: (ALIVE.strings || []).map((s) => s.got).join(',') };
};
</script></body></html>`;
  const page_ = dir + '/test/alive_' + wi + '.html';
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
} else console.log('modes: map, logic, shots');
