// harness of the sights of the fields and the pond (src/35_sights_land.js)
// node test/sights_land.mjs [wi ...]     plain node, no renderer. For worlds 2 (fields) and 3 (pond), every season, a whole day
// stepped at 30 frames a second (the clock running on as in play): no exception, the stroke and light caps held at every quality,
// nothing drawn from viewK 0.6 up, now() and list() agree, every sight of list() shows at its hour in at least one season,
// sounds made (through a stand in for the audio) only while the audio runs. Prints the worst frame.
// env STABLE=1 takes every file but 35_sights_land.js from stable/ (as the lead's builds do).
import fs from 'fs';
const dir = '/home/claude/monet';
const WFILES = ['11_coast.js', '12_argenteuil.js', '13_fields.js', '14_pond.js'], WNAMES = ['W_COAST', 'W_ARGENTEUIL', 'W_FIELDS', 'W_POND'];
const MINE = '35_sights_land.js';
const parses = (code) => { try { new Function(code); return true; } catch (e) { return false; } };
function read(f) {
  const a = dir + '/src/' + f, b = dir + '/stable/' + f;
  if (f !== MINE && fs.existsSync(b) && (process.env.STABLE === '1' || /^(20_|31_|32_|08_)/.test(f))) return fs.readFileSync(b, 'utf8');
  const code = fs.readFileSync(a, 'utf8');
  if (f !== MINE && !parses(code) && fs.existsSync(b)) { console.log('[harness] src/' + f + ' does not parse, using stable/'); return fs.readFileSync(b, 'utf8'); }
  return code;
}
const files = fs.readdirSync(dir + '/src').filter((f) => f.endsWith('.js') && !/^40_/.test(f)).sort();
const api = new Function(files.map(read).join('\n') + '\nreturn { WORLDS, World, SIGHTS, Game, Strokes, atmosphere, mixPhase, MAX_DYN, SCORES, Music };')();
const set = api.SIGHTS.sets.find((s) => (s.worlds || []).includes('pond') && (s.worlds || []).includes('fields'));
let fails = 0;
const fail = (m) => { fails++; console.log('  FAIL', m); };
if (!set) { console.log('no set for fields and pond'); process.exit(1); }

function fakeAudio(stats, running) {
  const param = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = (kind) => { stats.nodes++; return { connect() {}, disconnect() {}, gain: param(), frequency: param(), Q: param(), pan: param(), type: '', start() { stats.start++; }, stop() {}, onended: null, buffer: null, loop: false }; };
  const ctx = { currentTime: 0, sampleRate: 8000, state: running ? 'running' : 'suspended', destination: node(), createGain: () => node(), createOscillator: () => node(), createBiquadFilter: () => node(),
    createStereoPanner: () => node(), createBufferSource: () => node(), createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }) };
  return { ctx, master: node(), rev: node(), group: { score: api.SCORES[2] }, ok() { return true; }, deg: api.Music.prototype.deg, note() { stats.notes++; } };
}
const glowR = { n: 0, glow() { this.n++; } };

const which = process.argv.slice(2).map(Number).filter((v) => v === 2 || v === 3);
for (const wi of which.length ? which : [2, 3]) {
  const ch = api.WORLDS[wi], W = new api.World(ch.seed);
  W.wind = ch.wind; ch.build(W); for (const task of W.tasks) task(); W.tasks = [];
  const g = { ch, cur: W, wi, mode: 'play', pl: { x: ch.start.x, y: 0, z: ch.start.z, heading: 0, vx: 0, vz: 0, alt: 0 }, spot: -1, viewK: 0, reverie: false, freeK: 0,
    t: 0.3, time: 0, phase: 0, prevPhase: 0, quality: 2, audio: null, cam: { pos: [0, 0, 0], fwd: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] }, groundAt: api.Game.prototype.groundAt, env: {} };
  g.phaseNow = () => api.mixPhase(ch.phases[g.phase], ch.phases[g.phase], 0);
  const S = new api.Strokes(api.MAX_DYN);
  api.SIGHTS.enter(g);
  console.log('\n===== world', wi, ch.id, '=====');
  const L = api.SIGHTS.list(ch), ids = new Set(L.map((s) => s.id)), seen = {};
  console.log('list', L.map((s) => s.id).join(' '));
  for (const s of L) {
    for (const k of ['zh', 'en']) for (const f of ['name', 'hint']) { const v = s[f] && s[f][k]; if (!v) fail(s.id + ' has no ' + f + '.' + k); else if (/[:：—]/.test(v)) fail(s.id + ' ' + f + '.' + k + ' has a colon or an em dash'); }
  }
  if (ids.size !== L.length) fail('ids not unique');
  if (set.st.id !== ch.id) fail('enter did not take the world');
  if (ch.id === 'fields') console.log('roost', set.st.roost.map((v) => +v.toFixed(1)).join(', '));
  if (ch.id === 'pond') console.log('bridge', set.st.bridge ? [set.st.bridge.x, set.st.bridge.hw, set.st.bridge.z0, set.st.bridge.z1].map((v) => +v.toFixed(1)).join(', ') : 'none', ' open water points', set.st.nWet);
  let worst = { n: 0 }, worstG = { n: 0 }, t0 = Date.now(), frames = 0, ms = 0;
  const stats = { nodes: 0, start: 0, notes: 0 };
  for (let ph = 0; ph < ch.phases.length; ph++) {
    g.phase = ph; g.prevPhase = ph;
    for (const q of [2, 0]) {
      g.quality = q;
      const capS = Math.round(450 * (q === 2 ? 1 : 0.48)), capG = q === 0 ? 30 : 60;
      g.audio = q === 2 ? fakeAudio(stats, true) : fakeAudio(stats, false);
      const s0 = stats.start;
      // the day from before dawn to after nightfall in steps of a little under three seconds of the day's own pace (1/320 of a day a second)
      for (let k = 0; k <= 1000; k++) {
        g.t = 0.02 + k * 0.00098; const dt = 1 / 30; g.time += dt * 9;
        // she walks a loop round the middle of the world, now and then up in the air and by the water
        const a = k * 0.013 + ph, r = ch.radius * 0.35;
        g.pl.x = ch.center[0] + Math.cos(a) * r; g.pl.z = ch.center[1] + Math.sin(a) * r * 0.6; g.pl.alt = k % 300 < 60 ? 12 : 0;
        g.pl.vx = -Math.sin(a) * 2; g.pl.vz = Math.cos(a) * 1.2;
        g.pl.y = g.groundAt(W, g.pl.x, g.pl.z) + g.pl.alt;
        g.cam.pos[0] = g.pl.x - Math.sin(a) * 6; g.cam.pos[1] = g.pl.y + 2.6; g.cam.pos[2] = g.pl.z + Math.cos(a) * 6;
        const yaw = (k * 0.07) % (Math.PI * 2); g.cam.fwd[0] = Math.sin(yaw); g.cam.fwd[1] = 0.15; g.cam.fwd[2] = -Math.cos(yaw); g.cam.right[0] = Math.cos(yaw); g.cam.right[2] = Math.sin(yaw);
        const e = api.atmosphere(ch, g.t, g.phaseNow(), g.time, g.env); g.envNow = e;
        // a settled easel now and then: nothing at all may be drawn
        g.viewK = k % 97 === 0 ? 0.6 + (k % 3) * 0.2 : k % 53 === 0 ? 0.3 : 0;
        const c0 = Date.now();
        api.SIGHTS.update(g, dt);
        S.clear(); api.SIGHTS.draw(S, g, e, g.time);
        glowR.n = 0; api.SIGHTS.glows(glowR, g, e, g.time);
        ms += Date.now() - c0; frames++;
        if (g.viewK >= 0.6 && (S.n > 0 || glowR.n > 0)) fail('drawn at viewK ' + g.viewK + ' ' + S.n + ' strokes, ' + glowR.n + ' glows');
        if (S.n > capS) fail('strokes ' + S.n + ' over the cap ' + capS + ' at q ' + q + ' t ' + g.t.toFixed(3) + ' phase ' + ph);
        if (glowR.n > capG) fail('glows ' + glowR.n + ' over ' + capG);
        for (let i = 0; i < S.n * 4; i++) if (!Number.isFinite(S.pos[i]) || !Number.isFinite(S.sca[i]) || !Number.isFinite(S.col[i])) { fail('not a number in stroke ' + (i >> 2) + ' t ' + g.t.toFixed(3) + ' phase ' + ph); break; }
        if (S.n > worst.n) worst = { n: S.n, t: +g.t.toFixed(3), ph, q };
        if (glowR.n > worstG.n) worstG = { n: glowR.n, t: +g.t.toFixed(3), ph, q };
        const nw = api.SIGHTS.now(g);
        for (const o of nw) {
          if (!ids.has(o.id)) fail('now() names ' + o.id + ' which list() does not');
          if (![o.x, o.y, o.z, o.r, o.k].every(Number.isFinite)) fail('now() of ' + o.id + ' not finite');
          if (o.k > 0.5) { const s = seen[o.id] || (seen[o.id] = { phases: new Set(), t0: 1, t1: 0 }); s.phases.add(ph); s.t0 = Math.min(s.t0, g.t); s.t1 = Math.max(s.t1, g.t); }
        }
      }
      if (q === 0 && stats.start !== s0) fail('sound made while the audio was not running');
    }
  }
  for (const s of L) { const v = seen[s.id]; console.log('  ' + s.id.padEnd(12), v ? 'shows in phases ' + [...v.phases].join(',') + ', hours ' + v.t0.toFixed(3) + ' to ' + v.t1.toFixed(3) : 'NEVER SHOWN'); if (!v) fail(s.id + ' never shows'); }
  console.log('worst frame', JSON.stringify(worst), ' glows', JSON.stringify(worstG), ' mean cost', (ms / frames).toFixed(3), 'ms a frame in node');
  console.log('sounds started', stats.start, ' notes', stats.notes, ' heard', JSON.stringify(set.count));
  if (set.dead) fail('the set was dropped after a fault');
}
console.log(fails ? '\nFAILED ' + fails : '\nall good');
process.exit(fails ? 1 : 0);
