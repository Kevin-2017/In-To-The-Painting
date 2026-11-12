// where the time goes round a change of world: node test/hitch.mjs [dist] [from world]
// Steps the game without painting (the software renderer would drown everything) and times what the game itself does each frame
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const dir = '/home/claude/monet', dist = process.argv[2] || 'dist', from = Number(process.argv[3] || 0);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 300)));
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('ruhua.monet.q', '1'); } catch (e) {} });
await page.goto('file://' + dir + '/' + dist + '/index.html');
await page.waitForFunction(() => window.__ruhua && window.__ruhua.game && window.__ruhua.game.mode === 'title', null, { timeout: 200000 });
const res = await page.evaluate(([from, TITLE]) => {
  const a = window.__ruhua, g = a.game, out = { frames: [], marks: [] };
  a.skipRender = true;
  // some seconds on the title first, as a player has (env TITLE, default 3)
  { const n = Math.round(60 * TITLE); let worst = 0, sum = 0; for (let i = 0; i < n; i++) { const t0 = performance.now(); g.update(1 / 60); const d = performance.now() - t0; worst = Math.max(worst, d); sum += d; } out.title = { frames: n, worst: +worst.toFixed(0), sum: +sum.toFixed(0), building: g.building ? g.building.i + '/' + g.building.W.tasks.length : 'done', worlds: Object.keys(g.worlds) }; }
  document.getElementById('btnStart').click();
  const now = () => performance.now();
  const wrap = (obj, name, label) => { const f = obj[name]; obj[name] = function (...args) { const t0 = now(); const r = f.apply(this, args); const d = now() - t0; if (d > 1.5) out.marks.push([label || name, +d.toFixed(1), g.mode, +(g.trans ? g.trans.t : -1).toFixed(2)]); return r; }; };
  wrap(g, 'prepare'); wrap(g, 'endTransition'); wrap(g, 'startTransition'); wrap(g, 'ensure'); wrap(g.R, 'uploadWorld');
  if (from) { g.caps = {}; g.showWorld(from); g.mode = 'play'; }
  // the walk before the door: the next world builds in the background, as in a real game
  let slow = 0;
  const step = (n, tag) => { for (let i = 0; i < n; i++) { const still = g.spot >= 0 && g.viewK > 0.985; const t0 = now(); g.update(1 / 60); const d = now() - t0; if (g.pending) g.render(); if (d > 6) out.frames.push([tag + (still ? ' (still at an easel)' : ''), i, +d.toFixed(1), g.building ? 'building ' + g.building.i + '/' + g.building.W.tasks.length : '']); } };
  out.t0 = { mode: g.mode, wi: g.wi, building: !!g.building };
  step(60 * 6, 'walk');
  g.auto = true; step(60 * 30, 'to the easel and at it');
  out.t1 = { building: !!g.building, worlds: Object.keys(g.worlds), spot: g.spot, vk: +g.viewK.toFixed(2) };
  g.leaveSpot(); step(60 * 2, 'leaving');
  g.startTransition(g.wi + 1);
  step(60 * 9, 'spin');
  out.t2 = { mode: g.mode, wi: g.wi, building: !!g.building };
  step(60 * 10, 'after arriving');
  g.auto = true; step(60 * 40, 'to the next easel and at it');
  out.t3 = { mode: g.mode, wi: g.wi, building: g.building ? g.building.i + '/' + g.building.W.tasks.length + ' st ' + (g.building.st || 0) : 'done', worlds: Object.keys(g.worlds), spot: g.spot, vk: +g.viewK.toFixed(2), rest: +(g.restT || 0).toFixed(1), auto: g.auto, caps: Object.keys(g.caps).length, x: +g.pl.x.toFixed(0), z: +g.pl.z.toFixed(0) };
  return out;
}, [from, Number(process.env.TITLE === undefined ? 3 : process.env.TITLE)]);
console.log('title', JSON.stringify(res.title));
const by = {};
for (const [tag, i, d, b] of res.frames) { (by[tag] = by[tag] || []).push([i, d, b]); }
for (const tag of Object.keys(by)) {
  const L = by[tag], tot = L.reduce((s, x) => s + x[1], 0), mx = Math.max(...L.map((x) => x[1]));
  console.log(tag, 'frames over 6 ms:', L.length, 'sum', tot.toFixed(0), 'ms, worst', mx.toFixed(0), 'ms; over 16 ms:', L.filter((x) => x[1] > 16).length, 'over 33 ms:', L.filter((x) => x[1] > 33).length, 'over 100 ms:', L.filter((x) => x[1] > 100).length);
  console.log('   first', JSON.stringify(L.slice(0, 6)), ' worst', JSON.stringify([...L].sort((p, q) => q[1] - p[1]).slice(0, 6)));
}
console.log('marks', JSON.stringify(res.marks));
console.log(JSON.stringify([res.t0, res.t1, res.t2, res.t3]));
console.log('errors', errors.length ? errors.join('\n') : 'none');
await browser.close();
