// harness of the sights of the sea (src/34_sights_sea.js): the coast and Argenteuil, without the renderer
// node test/sights_sea.mjs              step a whole day in every season of both worlds with her standing and flying about, and check:
//                                       no exception (a set that throws is dropped), strokes and glows a frame under the caps (also at
//                                       quality 0), nothing drawn from viewK 0.6 up nor in the ending, the title of the coast shows only the
//                                       dawn fleet, now() and list() agree, names and hints without colons or em dashes, sounds made with a
//                                       stand in for the audio, every sight seen at least once, and when and where each one shows
// node test/sights_sea.mjs where <wi> <t> <phase> <time>    where each sight is at that moment (for placing cameras)
import fs from 'fs';
const dir = '/home/claude/monet';
const WFILES = ['11_coast.js', '12_argenteuil.js', '13_fields.js', '14_pond.js'], WNAMES = ['W_COAST', 'W_ARGENTEUIL', 'W_FIELDS', 'W_POND'];
const parses = (code) => { try { new Function(code); return true; } catch (e) { return false; } };
// as test/render.sh does with MINE: this set from src, everything else from stable/ (env SIGHTS_SRC=1: the other files from src too,
// where they parse, to try this set against the worlds being rebuilt)
function read(f) {
  const a = dir + '/src/' + f, b = dir + '/stable/' + f;
  if (f === '34_sights_sea.js' || !fs.existsSync(b)) return fs.readFileSync(a, 'utf8');
  if (process.env.SIGHTS_SRC === '1') { const code = fs.readFileSync(a, 'utf8'); if (parses(code)) return code; console.log('[harness] src/' + f + ' does not parse, using stable/'); }
  return fs.readFileSync(b, 'utf8');
}
function load(wi) {
  const files = fs.readdirSync(dir + '/src').filter((f) => f.endsWith('.js') && !/^40_/.test(f) && (!/^1[1-4]_/.test(f) || f === WFILES[wi])).sort();
  const src = files.map((f) => (f === '19_worlds.js' ? 'const WORLDS = [0, 1, 2, 3].map(() => ' + WNAMES[wi] + ');' : read(f))).join('\n');
  return new Function(src + '\nreturn { WORLDS, World, SIGHTS, Game, atmosphere, mixPhase, Strokes, SCORES, Music, MAX_DYN };')();
}
function fakeAudio(api, wi, stats) {
  const param = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() {}, disconnect() { stats.freed++; }, gain: param(), frequency: param(), Q: param(), pan: param(), type: '', start() { stats.start++; }, stop() {}, onended: null, buffer: null, loop: false });
  const ctx = { currentTime: 0, sampleRate: 8000, state: 'running', destination: node(), createGain: node, createOscillator: node, createBiquadFilter: node, createStereoPanner: node, createBufferSource: node, createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }) };
  return { ctx, master: node(), rev: node(), group: { score: api.SCORES[wi] }, ok() { return true; }, deg: api.Music.prototype.deg, note() { stats.notes++; } };
}
function game(api, wi) {
  const ch = api.WORLDS[wi], W = new api.World(ch.seed);
  W.wind = ch.wind; ch.build(W); for (const task of W.tasks) task(); W.tasks = [];
  const g = { ch, cur: W, wi, mode: 'play', pl: { x: ch.start.x, y: 0, z: ch.start.z, heading: 0, vx: 0, vz: 0, alt: 0 }, spot: -1, viewK: 0, freeK: 0, reverie: false,
    t: 0.3, time: 0, phase: 0, audio: null, quality: 2, cam: { pos: [0, 0, 0], fwd: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] }, groundAt: api.Game.prototype.groundAt, env: {} };
  g.pl.y = g.groundAt(W, g.pl.x, g.pl.z);
  return g;
}
const envOf = (api, g) => { const ph = g.ch.phases[g.phase % g.ch.phases.length]; return (g.envNow = api.atmosphere(g.ch, g.t, api.mixPhase(ph, ph, 0), g.time, g.env)); };
function look(g, x, y, z, yaw, pitch) { const cp = Math.cos(pitch); g.cam.pos = [x, y, z]; g.cam.fwd = [Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp]; g.cam.right = [Math.cos(yaw), 0, Math.sin(yaw)]; }

const mode = process.argv[2] || 'logic';
if (mode === 'where') {
  const wi = +process.argv[3], api = load(wi), g = game(api, wi);
  g.t = +process.argv[4]; g.phase = +process.argv[5]; g.time = +process.argv[6];
  api.SIGHTS.enter(g);
  for (const s of api.SIGHTS.now(g)) console.log(s.id, 'at', s.x.toFixed(1), s.y.toFixed(1), s.z.toFixed(1), 'r', s.r, 'k', s.k.toFixed(2));
  const set = api.SIGHTS.sets.find((s) => s.worlds.includes(g.ch.id) && s.SND);
  if (g.ch.id === 'coast') { set.E.wy = g.cur.waterY; }
  process.exit(0);
}

let fails = 0;
const fail = (m) => { fails++; console.log('  FAIL', m); };
const bad = /[:：—–]/;
for (const wi of [0, 1]) {
  const api = load(wi), g = game(api, wi), ch = g.ch, W = g.cur, SG = api.SIGHTS;
  const set = SG.sets.find((s) => s.worlds.includes(ch.id) && s.SND);
  console.log('\n===== world', wi, ch.id, '=====');
  SG.enter(g);
  if (!set) { fail('the sea set is not registered for ' + ch.id); continue; }
  const L = SG.list(ch).filter((s) => /^s_(fleet|steamer|gulls|train|regatta|swallows)/.test(s.id)), ids = new Set(L.map((s) => s.id));
  console.log('sights', L.map((s) => s.id).join(' '));
  for (const s of L) for (const v of [s.name.zh, s.name.en, s.hint.zh, s.hint.en]) if (!v || bad.test(v)) fail('name or hint of ' + s.id + ' has a colon or a dash: ' + v);
  const stats = { start: 0, freed: 0, notes: 0 }, S = new api.Strokes(api.MAX_DYN);
  let glowN = 0; const R = { glow() { glowN++; } };
  g.audio = fakeAudio(api, wi, stats); set.SND.log = [];
  const dt = 1 / 15, seen = {}, when = {};
  let worstS = 0, worstG = 0, worstAt = '', worstQ0 = 0;
  // she walks the land between the easels and flies to each sight in turn: a wandering eye that sooner or later is near everything
  const tour = ch.spots.filter((s) => !s.hidden).map((s) => [s.x, s.z]).concat(ch.id === 'coast' ? [[-170, -60], [320, -40], [0, -118], [-140, -71]] : [[-30, -110], [24, -76], [0, -120]]);
  for (let phase = 0; phase < ch.phases.length; phase++) {
    g.phase = phase;
    for (let step = 0; step * dt * (1 / 320) * 4 < 1; step++) {
      g.t = (0.15 + step * dt * (1 / 320) * 4) % 1; g.time += dt;
      // she moves along the tour, a stop every 12 seconds, sometimes high in the air
      const k = Math.floor(g.time / 12) % tour.length, q = tour[k], p = g.pl;
      p.x += (q[0] - p.x) * Math.min(1, dt * 0.5); p.z += (q[1] - p.z) * Math.min(1, dt * 0.5); p.alt = Math.floor(g.time / 12) % 3 === 1 ? 14 : 2; p.y = g.groundAt(W, p.x, p.z) + p.alt;
      // and the eye turns round her, so that every side is looked at
      const yaw = g.time * 0.31;
      look(g, p.x - Math.sin(yaw) * 6, p.y + 2.5, p.z + Math.cos(yaw) * 6, yaw, -0.05);
      const env = envOf(api, g);
      g.viewK = 0; g.reverie = false; g.mode = 'play';
      SG.update(g, dt);
      for (const qq of [2, 0]) {
        g.quality = qq;
        S.clear(); SG.draw(S, g, env, g.time); glowN = 0; R.glowN = 0; SG.glows(R, g, env, g.time);
        if (qq === 2) { if (S.n > worstS) { worstS = S.n; worstAt = 't ' + g.t.toFixed(3) + ' phase ' + phase; } worstG = Math.max(worstG, glowN); }
        else worstQ0 = Math.max(worstQ0, S.n);
      }
      g.quality = 2;
      if (S.n > 450) fail('strokes ' + S.n + ' over the cap at t ' + g.t.toFixed(3));
      if (glowN > 60) fail('glows ' + glowN + ' over the cap at t ' + g.t.toFixed(3));
      // now() and list() agree; note when and where each shows
      for (const o of SG.now(g)) {
        if (!ids.has(o.id)) { if (/^s_(fleet|steamer|gulls|train|regatta|swallows)/.test(o.id)) fail('now() gives ' + o.id + ' that list() does not'); continue; }
        if (!(Number.isFinite(o.x) && Number.isFinite(o.z) && o.k >= 0 && o.k <= 1.0001)) fail('now() of ' + o.id + ' not finite');
        seen[o.id] = (seen[o.id] || 0) + 1;
        const w = when[o.id] || (when[o.id] = {}), key = 'phase ' + phase; const r = w[key] || (w[key] = [9, -9]); r[0] = Math.min(r[0], g.t); r[1] = Math.max(r[1], g.t);
      }
      // from viewK 0.6 up, and in the ending, nothing at all
      if (step % 7 === 0) {
        for (const [vk, rev] of [[0.6, false], [0.95, false], [0, true]]) {
          g.viewK = vk; g.reverie = rev;
          S.clear(); SG.draw(S, g, env, g.time); glowN = 0; SG.glows(R, g, env, g.time);
          if (S.n || glowN) fail('drawn at viewK ' + vk + (rev ? ' in the ending' : '') + ': ' + S.n + ' strokes ' + glowN + ' glows, t ' + g.t.toFixed(3));
        }
        g.viewK = 0; g.reverie = false;
        // the title: on the coast only the fleet of the dawn, elsewhere nothing
        g.mode = 'title';
        const tv = ch.title || ch.spots[0].view; look(g, tv.x, g.groundAt(W, tv.x, tv.z) + tv.y, tv.z, tv.yaw, tv.pitch);
        S.clear(); SG.draw(S, g, env, g.time);
        const dawn = g.t > 0.16 && g.t < 0.38;
        if (S.n && !(ch.id === 'coast' && dawn)) fail('drawn on the title at t ' + g.t.toFixed(3) + ': ' + S.n);
        if (ch.id === 'coast' && g.t > 0.24 && g.t < 0.3 && S.n === 0) fail('the title at dawn shows no fleet, t ' + g.t.toFixed(3));
        g.mode = 'play';
      }
      if (set.dead) { fail('the set threw and was dropped at t ' + g.t.toFixed(3)); set.dead = false; }
    }
  }
  console.log('worst frame', worstS, 'strokes at', worstAt, ' quality 0 worst', worstQ0, ' glows', worstG);
  for (const s of L) {
    if (!seen[s.id]) fail(s.id + ' never showed');
    console.log('  ', s.id.padEnd(14), s.name.en.padEnd(26), JSON.stringify(when[s.id] || {}).replace(/(\d\.\d{3})\d+/g, '$1'));
  }
  // she comes near each sight at its hour: it must answer with its own sound
  const ANSWER = { s_fleet_out: 'hail', s_fleet_home: 'hail', s_steamer: 'whistleS', s_gulls: 'gullCry', s_train: 'whistleS', s_regatta: 'flapS', s_swallows: 'twitter' };
  const HOUR = { s_fleet_out: [0.3, 0], s_fleet_home: [0.75, 0], s_steamer: [0.5, 1], s_gulls: [0.62, 1], s_train: [0.38, 0], s_regatta: [0.58, 0], s_swallows: [0.7, 0] };
  for (const s of L) {
    const h = HOUR[s.id]; g.t = h[0]; g.phase = h[1]; g.viewK = 0; g.mode = 'play';
    SG.enter(g); set.SND.log.length = 0;
    let got = false;
    for (let k = 0; k < 90 && !got; k++) {
      g.time += dt;
      const o = SG.now(g).find((q) => q.id === s.id);
      if (!o) break;
      // her place: at the boat, the steamer, the swarm itself; by the train at the edge of what she can reach
      let x = o.x, z = o.z;
      if (s.id === 's_fleet_out' || s.id === 's_fleet_home') { const B = set.FB.find((b) => b.k > 0.5); x = B.x; z = B.z; }
      if (s.id === 's_regatta') { const B = set.RB[0]; x = B.x; z = B.z; }
      if (s.id === 's_train') { x = o.x; z = o.z + 60; }
      if (s.id === 's_steamer') z += 30;
      g.pl.x = x + 4; g.pl.z = z + 4; g.pl.alt = 4; g.pl.y = Math.max(g.groundAt(W, g.pl.x, g.pl.z), W.waterY || 0) + 4;
      look(g, g.pl.x, g.pl.y + 2, g.pl.z + 6, 0, 0);
      const env = envOf(api, g); SG.update(g, dt); S.clear(); SG.draw(S, g, env, g.time);
      got = set.SND.log.includes(ANSWER[s.id]);
    }
    console.log('  near', s.id.padEnd(14), got ? 'answers with ' + ANSWER[s.id] : 'NO ANSWER');
    if (!got) fail(s.id + ' does not answer when she comes near');
  }
  const counts = {}; for (const n of set.SND.log) counts[n] = (counts[n] || 0) + 1;
  console.log('sounds', JSON.stringify(counts), 'nodes started', stats.start, 'bell notes', stats.notes);
  if (!set.SND.log.length) fail('no sound at all');
  // a sound only when the audio runs
  g.audio = null; set.SND.log.length = 0;
}
console.log(fails ? '\nFAILED ' + fails : '\nall good');
process.exit(fails ? 1 : 0);
