// the flow of water, cloud and wind, and the rule that a settled easel shows the painting.
//   node test/flow.mjs            logic only (no browser, a second): the clouds' glide home, the settled frame, S.float
//   node test/flow.mjs pixels [0,1,2,3]   also renders every painting of those worlds at its easel, settled, from the stable build and
//                                 from this one, plus easels 0 and 1 at game clock 3 and 97, and compares them with test/cmp.py (fails past its limit)
// env MINE: the files under test (default the flow agent's six)
import fs from 'fs';
import vm from 'vm';
import { execFileSync } from 'child_process';
const dir = '/home/claude/monet';
const MINE = process.env.MINE || '02_gl.js,03_shaders.js,04_render.js,05_strokes.js,06_paint.js,25_time.js';
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };

// ---------- logic ----------
{
  const ctx = { console, Math, Float32Array, Uint8Array, Uint32Array, Object, Array, JSON };
  vm.createContext(ctx);
  const src = ['01_util.js', '02_gl.js', '03_shaders.js', '04_render.js', '05_strokes.js'].map((f) => fs.readFileSync(dir + '/src/' + f, 'utf8')).join('\n');
  vm.runInContext(src + '\nthis.Renderer = Renderer; this.Strokes = Strokes; this.World = World; this.FLAG_FLOAT = FLAG_FLOAT;', ctx);
  const { Renderer, World, FLAG_FLOAT } = ctx;
  const wind = [0.85, 0.5];
  ctx.WORLDS = [{ id: 'argenteuil', wind }];
  vm.runInContext('var WORLDS = this.WORLDS;', ctx);
  const R = Object.create(Renderer.prototype);
  Object.assign(R, { settle: 0, cloudO: 0, cloudT: null, glide: null, cloudOff: [0, 0], flowCfg: Renderer.FLOW.default, flowKey: null });
  const f = { time: 100, settle: 0, rush: 1, windDir: wind };
  R._flowStep(f);
  ok(R.flowCfg === R._flowFor(f) && Math.abs(R.flowCfg.current - Renderer.FLOW.argenteuil.current) < 1e-9, 'the world is found by its wind');
  const L = R.flowCfg.lat;
  ok(L[0] * wind[0] + L[1] * wind[1] < 0 && Number.isInteger(L[0]) && Number.isInteger(L[1]), 'the clouds turn their noise along a whole step against the wind (so they travel with it): ' + L);
  // roam for 20 s at 60 frames a second: the clouds move on, never back
  let prev = R.cloudO, back = 0;
  for (let i = 0; i < 1200; i++) { f.time += 1 / 60; R._flowStep(f); if (R.cloudO < prev - 1e-9) back++; prev = R.cloudO; }
  ok(back === 0 && R.cloudO > 0.05, 'roaming: the clouds go on (' + R.cloudO.toFixed(3) + ' turns)');
  // the hours fly: faster
  const o0 = R.cloudO; f.rush = 30; for (let i = 0; i < 60; i++) { f.time += 1 / 60; R._flowStep(f); }
  const fast = R.cloudO - o0; f.rush = 1; const o1 = R.cloudO; for (let i = 0; i < 60; i++) { f.time += 1 / 60; R._flowStep(f); }
  ok(fast > 4 * (R.cloudO - o1), 'while the hours fly the clouds race (' + (fast / (R.cloudO - o1)).toFixed(1) + ' times)');
  // she settles: viewK rises by dt / 2.4, settle = sstep(0.3, 0.9, viewK). Forward all the way, and at rest where they were painted
  let vk = 0; back = 0; prev = R.cloudO;
  const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < 200; i++) { f.time += 1 / 60; vk = Math.min(1, vk + 1 / 60 / 2.4); f.settle = sst(0.3, 0.9, vk); R._flowStep(f); if (R.cloudO < prev - 1e-9) back++; prev = R.cloudO; }
  ok(back === 0, 'settling: the clouds never run back');
  ok(R.cloudOff[0] === 0 && R.cloudOff[1] === 0, 'settled: the sky is the painted one (offset ' + R.cloudOff + ')');
  for (let i = 0; i < 300; i++) { f.time += 1 / 60; R._flowStep(f); }
  ok(R.cloudOff[0] === 0 && R.cloudOff[1] === 0, 'settled for 5 s more: still the painted sky');
  // half settled, then away again, then settled: still home, still forward
  back = 0; prev = R.cloudO;
  for (let i = 0; i < 400; i++) { f.time += 1 / 60; f.settle = i < 100 ? 1 - i / 100 : i < 150 ? 0 : i < 220 ? (i - 150) / 140 : i < 260 ? 0.5 - (i - 220) / 100 : Math.min(1, (i - 260) / 80); R._flowStep(f); if (R.cloudO < prev - 1e-9) back++; prev = R.cloudO; }
  ok(back === 0 && R.cloudOff[0] === 0 && R.cloudOff[1] === 0, 'leaving, half settling, leaving, settling: forward only, and home at the end');
  // a still: the clock jumps; settled means painted, roaming means a pure function of the clock
  f.settle = 1; f.time = 977.3; R._flowStep(f); ok(R.cloudOff[0] === 0 && R.cloudOff[1] === 0, 'a settled still at any hour is the painted sky');
  f.settle = 0; f.time = 51; R._flowStep(f); const a = R.cloudOff.slice(); f.time = 12; R._flowStep(f); f.time = 51; R._flowStep(f);
  ok(a[0] === R.cloudOff[0] && a[1] === R.cloudOff[1] && (a[0] !== 0 || a[1] !== 0), 'a roaming still depends on the clock alone');
  // S.float marks the strokes and the solid underpainting of what was painted after the mark, and nothing before it
  const W = new World(5), S = W.S;
  // a tree core on the bank, and then, at the same stroke count, a hull on the water 20 m off
  S.add(0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, [1, 1, 1], 0, 0, 0, 0); W.quad([0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [1, 1, 1]);
  const k0 = S.n, s0 = W.solidN;
  W.quad([20, 0, 0], [21, 0, 0], [21, 1, 0], [20, 1, 0], [1, 1, 1]); S.add(20.5, 0.5, 0, 1, 0, 0, 0, 1, 0, 1, 1, [1, 1, 1], 0, 0, 0, 8); S.add(20.5, 0.2, 0, 1, 0, 0, 0, 1, 0, 1, 1, [1, 1, 1], 0, 0, 0, 0);
  S.float(k0); S.float(k0);
  const fl = (i) => Math.floor(S.sca[i * 4 + 2] / 16);
  ok(!(fl(0) & FLAG_FLOAT) && (fl(1) & FLAG_FLOAT) && (fl(2) & FLAG_FLOAT) && fl(1) === (8 | FLAG_FLOAT), 'S.float flags the strokes from the mark on, once, keeping their other flags');
  let solOk = true;
  for (let v = 0; v < W.solidN; v++) { const want = v >= s0 ? 2 : 0; if (W.solid[v * 7 + 6] !== want) solOk = false; }
  ok(solOk, 'S.float floats the solids laid with them, and only those');
}

// ---------- pixels ----------
if (process.argv[2] === 'pixels') {
  const worlds = (process.argv[3] || '0,1,2,3').split(',').map(Number);
  const env = (mine) => Object.assign({}, process.env, { MINE: mine, W: '480', H: '270', Q: process.env.Q || '1' });
  const run = (w, mine, arg, pre) => execFileSync('bash', ['test/render.sh', String(w), arg], { cwd: dir, env: Object.assign(env(mine), pre ? { PRE: pre } : {}), stdio: ['ignore', 'pipe', 'inherit'], timeout: 400000 }).toString();
  for (const w of worlds) {
    // every painting at its easel, its hour and its season
    run(w, '', 'easels', `fqs${w}_`); run(w, MINE, 'easels', `fqm${w}_`);
    // and the first two easels at two other moments of the game clock, so that what moves while she roams is seen to be home
    const shots = (p) => JSON.stringify([3, 97].flatMap((time) => [0, 1].map((spot) => ({ name: `${p}${w}_s${spot}_${time}`, t: 0.45, phase: 0, time, spot }))));
    run(w, '', shots('fts')); run(w, MINE, shots('ftm'));
    for (const [a, b] of [[`fqs${w}_`, `fqm${w}_`], [`fts${w}_`, `ftm${w}_`]]) {
      try { console.log(execFileSync('python3', ['test/cmp.py', a, b], { cwd: dir }).toString().trim()); console.log('ok   world', w, a, b); }
      catch (e) { console.log(e.stdout.toString().trim()); fails++; console.log('FAIL world', w, 'settled easels drift from the stable build', a, b); }
    }
  }
}
console.log(fails ? `flow: ${fails} failed` : 'flow: all passed');
process.exit(fails ? 1 : 0);
