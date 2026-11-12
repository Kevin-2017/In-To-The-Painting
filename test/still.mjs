// stills of one world at chosen hours, straight from the game code (no interface)
// node test/still.mjs <worldIndex> '<json shots>'   shot: {name, t, phase, spot | cam:{x,y,z,yaw,pitch,fov} | pl:{x,z,yaw,pitch,alt}, time}
import fs from 'fs';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const dir = '/home/claude/monet';
const wi = Number(process.argv[2] || 0);
// only the world asked for is loaded, so that a world someone else is working on cannot break this render
const WFILE = ['11_coast.js', '12_argenteuil.js', '13_fields.js', '14_pond.js'][wi], WNAME = ['W_COAST', 'W_ARGENTEUIL', 'W_FIELDS', 'W_POND'][wi];
const SRC = '/' + (process.env.SRC || 'src') + '/';
const files = fs.readdirSync(dir + SRC).filter((f) => f.endsWith('.js') && !/^40_/.test(f) && (!/^1[1-4]_/.test(f) || f === WFILE)).sort();
// files that other people are working on are taken from the saved copies in stable/, so a half written file cannot break this render
// MINE (comma separated) turns that round: every file that has a saved copy is taken from stable/, except the ones named, which are the renderer's own work
const MINE = process.env.MINE === undefined ? null : process.env.MINE.split(',').filter(Boolean);
const STABLE = MINE ? files.filter((f) => !MINE.includes(f)) : (process.env.STABLE_FILES === undefined ? '20_audio.js,31_alive.js,32_folk.js,08_hero.js' : process.env.STABLE_FILES).split(',').filter(Boolean);
const src = files.map((f) => (f === '19_worlds.js' ? 'const WORLDS = [0, 1, 2, 3].map(() => ' + WNAME + ');' : fs.readFileSync(dir + (STABLE.includes(f) && fs.existsSync(dir + '/stable/' + f) ? '/stable/' : SRC) + f, 'utf8'))).join('\n');
// 'easels' in place of the json: every painting of the world at its own easel, hour and season (names PRE + id, PRE defaults to ez_)
const EASELS = process.argv[3] === 'easels';
let shots = EASELS ? [] : JSON.parse(process.argv[3] || '[{"name":"a","t":0.4,"phase":0,"spot":0}]');
const W_ = Number(process.env.W || 1280), H_ = Number(process.env.H || 720);
const html = `<!doctype html><html><body style="margin:0;background:#000"><canvas id="c" style="width:${W_}px;height:${H_}px;display:block"></canvas><script>
${src}
window.__run = function (wi) {
  const ui = { onLeave() {}, onArrive() {}, onCard() {}, onPhase() {}, onSpot() {}, onAuto() {}, onCapture() {}, onQuality() {}, onFly() {}, onSlide() {}, onReview() {}, onFree() {}, onFound() {} };
  const g = window.__g = new Game(document.getElementById('c'), ui, null);
  g.quality = ${process.env.Q === undefined ? 2 : Number(process.env.Q)}; g.autoQuality = false;
  g.resize(${W_}, ${H_}, 1);
  const t0 = performance.now();
  g.showWorld(wi); g.mode = 'play';
  const W = g.cur;
  return { strokes: W.S.n, dropped: W.S.dropped, solids: W.solidN, casters: W.casters.length, colliders: W.colliders.length, buildMs: Math.round(performance.now() - t0) };
};
window.__shot = function (o) {
  const g = window.__g;
  g.mode = 'play'; g.t = o.t === undefined ? 0.4 : o.t; g.phase = g.prevPhase = o.phase || 0; g.phShown = null;
  g.time = o.time === undefined ? 3 : o.time; g.flowPhase[0] = g.flowPhase[1] = g.time * 0.05;
  g.spot = -1; g.viewK = 0; g.debugCam = null; g.doorOn = !!o.door; g.doorT = 9;
  const p = g.pl;
  if (o.pl) { p.x = o.pl.x; p.z = o.pl.z; p.heading = o.pl.heading === undefined ? o.pl.yaw : o.pl.heading; p.alt = o.pl.alt || 0; p.y = g.groundAt(g.cur, p.x, p.z) + p.alt; g.camYaw = o.pl.yaw; g.camPitch = o.pl.pitch === undefined ? -0.06 : o.pl.pitch; g.camDD = undefined; }
  if (o.spot !== undefined) { const s = g.ch.spots[o.spot]; g.spot = o.spot; g.viewK = 1; p.x = s.x; p.z = s.z; p.y = g.groundAt(g.cur, p.x, p.z); p.alt = 0; p.heading = s.view.pose === undefined ? s.view.yaw : s.view.pose; }
  p.vx = p.vz = 0; p.valt = 0;
  if (g.hero) { g.hero.breeze = o.spot !== undefined && g.ch.spots[o.spot].view.breeze || 1; const sv = o.spot !== undefined ? g.ch.spots[o.spot].view : null; for (let i = 0; i < 3; i++) g.hero.step(0.5, p, sv && sv.gale ? sv.gale : g.ch.wind, g.time, p.alt > 0.06, false); g.hero.fly = p.alt > 0.06 ? 1 : 0; g.hero.pose = sv && sv.act === 1 ? 1 : 0; g.hero.pose2 = sv && sv.act === 2 ? 1 : 0; g.hero.eye = sv ? [sv.x, g.groundAt(g.cur, sv.x, sv.z) + sv.y, sv.z] : null; }
  if (o.cam) g.debugCam = o.cam;
  g.render(); g.R.gl.finish();
  return { sunEl: +g.envNow.sunEl.toFixed(1), sunI: +g.envNow.sunI.toFixed(2), sunAz: +Math.atan2(g.envNow.sunDir[0], -g.envNow.sunDir[2]).toFixed(3) };
};
</script></body></html>`;
const page_ = dir + '/test/still_' + wi + (process.env.SRC ? '_' + process.env.SRC : '') + '.html';
fs.writeFileSync(page_, html);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: W_, height: H_ } });
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 1500)));
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 6000)));
await page.goto('file://' + page_);
const info = await page.evaluate((i) => window.__run(i), wi);
console.log(JSON.stringify(info));
if (EASELS) shots = await page.evaluate((pre) => window.__g.ch.effects.map((e) => ({ name: pre + e.id, t: e.t0 + 0.5 * (e.t1 - e.t0), phase: Math.max(0, e.phase), spot: e.spot })), process.env.PRE || 'ez_');
for (const c of shots) {
  const r = await page.evaluate((c) => window.__shot(c), c);
  const out = `${dir}/shots/${c.name}.png`;
  await page.screenshot({ path: out });
  console.log('saved', out, JSON.stringify(r));
}
await browser.close();
