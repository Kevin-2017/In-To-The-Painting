// movement trials straight from the game code (no interface)
// node test/move.mjs <worldIndex> '<json trials>'   trial: {name, t, phase, pl:{x,z,yaw,pitch,alt}, steps:[{keys:{}, secs, pitch, yaw}], shot}
import fs from 'fs';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const dir = '/home/claude/monet';
const files = fs.readdirSync(dir + '/src').filter((f) => f.endsWith('.js') && !/^40_/.test(f)).sort();
const src = files.map((f) => fs.readFileSync(dir + '/src/' + f, 'utf8')).join('\n');
const wi = Number(process.argv[2] || 0);
const trials = JSON.parse(process.argv[3]);
const W_ = Number(process.env.W || 1280), H_ = Number(process.env.H || 720);
const html = `<!doctype html><html><body style="margin:0;background:#000"><canvas id="c" style="width:${W_}px;height:${H_}px;display:block"></canvas><script>
${src}
window.__run = function (wi) {
  const ui = { onLeave() {}, onArrive() {}, onCard() {}, onPhase() {}, onSpot() {}, onAuto() {}, onCapture() {}, onQuality() {}, onFly() {}, onSlide() {} };
  const g = window.__g = new Game(document.getElementById('c'), ui, null);
  g.quality = ${process.env.Q === undefined ? 2 : Number(process.env.Q)}; g.autoQuality = false;
  g.resize(${W_}, ${H_}, 1);
  g.showWorld(wi); g.mode = 'play';
  return { strokes: g.cur.S.n };
};
window.__slope = function () { // the steepest walkable ground near the middle, for a slide
  const g = window.__g, W = g.cur; let best = null, bg = 0;
  for (let x = -200; x <= 200; x += 4) for (let z = -200; z <= 200; z += 4) {
    if (W.waterY !== null && W.h(x, z) < W.waterY + 0.5) continue;
    const gx = (W.h(x + 1, z) - W.h(x - 1, z)) * 0.5, gz = (W.h(x, z + 1) - W.h(x, z - 1)) * 0.5, gr = Math.hypot(gx, gz);
    if (gr > bg && gr < 0.5) { bg = gr; best = { x, z, grade: +gr.toFixed(2), yaw: +Math.atan2(-gx, gz).toFixed(2), h: +W.h(x, z).toFixed(1) }; }
  }
  return best;
};
// coming up to an easel with the keys still down: does the place take hold of her?
window.__approach = function (o) {
  const g = window.__g, p = g.pl, s = g.ch.spots[o.spot];
  g.mode = 'play'; g.t = o.t === undefined ? 0.45 : o.t; g.phase = g.prevPhase = o.phase || 0; g.phShown = null; g.caps = {};
  g.spot = -1; g.viewK = 0; g.spotBlock = -1; g.spotHold = 0; g.keys = {}; g.auto = false; g.debugCam = null;
  const yaw = o.yaw === undefined ? 0.7 : o.yaw, d = o.dist || 14;
  p.x = s.x - Math.sin(yaw) * d; p.z = s.z + Math.cos(yaw) * d; p.heading = yaw; p.vx = p.vz = 0; p.valt = 0; p.alt = o.alt || 0;
  p.yAbs = g.groundAt(g.cur, p.x, p.z) + p.alt; p.y = p.yAbs; g.camYaw = yaw; g.camPitch = o.pitch === undefined ? -0.06 : o.pitch;
  g.render();
  let entered = -1, left = -1, n = 0;
  const run = (keys, secs) => { g.keys = keys; for (let i = 0; i < secs * 60; i++) { g.update(1 / 60); n++; if (g.spot >= 0 && entered < 0) entered = n / 60; if (entered >= 0 && g.spot < 0 && left < 0) left = n / 60; } };
  run(o.keys || { KeyW: true }, o.hold || 4);      // keys held all the way in, and for a while after
  const mid = { spot: g.spot, vk: +g.viewK.toFixed(2), alt: +p.alt.toFixed(1), off: +Math.hypot(p.x - s.x, p.z - s.z).toFixed(1) };
  run({}, 3);
  return { entered: +entered.toFixed(2), left, mid, end: { spot: g.spot, vk: +g.viewK.toFixed(2), alt: +p.alt.toFixed(1), off: +Math.hypot(p.x - s.x, p.z - s.z).toFixed(1), paint: +g.paintK.toFixed(2), caps: Object.keys(g.caps).length } };
};
window.__trial = function (o) {
  const g = window.__g, p = g.pl;
  g.mode = 'play'; g.t = o.t === undefined ? 0.45 : o.t; g.phase = g.prevPhase = o.phase || 0; g.phShown = null; g.time = 3;
  g.spot = -1; g.viewK = 0; g.debugCam = null; g.keys = {}; g.auto = false; g.trail.length = 0;
  p.x = o.pl.x; p.z = o.pl.z; p.heading = o.pl.yaw; p.vx = p.vz = 0; p.valt = 0; p.alt = o.pl.alt || 0;
  p.yAbs = g.groundAt(g.cur, p.x, p.z) + p.alt; p.y = p.yAbs; g.camYaw = o.pl.yaw; g.camPitch = o.pl.pitch === undefined ? -0.06 : o.pl.pitch; g.camDD = undefined;
  g.render(); // so that the season on the ground is known
  const log = [];
  for (const st of o.steps) {
    g.keys = st.keys || {};
    if (st.pitch !== undefined) g.camPitch = st.pitch;
    if (st.yaw !== undefined) g.camYaw = st.yaw;
    let top = p.alt, x0 = p.x, z0 = p.z, y0 = p.yAbs;
    const n = Math.round(st.secs * 60);
    for (let i = 0; i < n; i++) { g.time += 1 / 60; g.updatePlayer(1 / 60); top = Math.max(top, p.alt); }
    log.push({ secs: st.secs, alt: +p.alt.toFixed(1), top: +top.toFixed(1), hs: +Math.hypot(p.vx, p.vz).toFixed(1), vy: +p.valt.toFixed(1), went: +Math.hypot(p.x - x0, p.z - z0).toFixed(0), dy: +(p.yAbs - y0).toFixed(1), slide: g.sliding, lean: +g.lean.toFixed(2), fov: +g.fovK.toFixed(2) });
  }
  g.render(); g.R.gl.finish();
  return log;
};
</script></body></html>`;
fs.writeFileSync(dir + '/test/move.html', html);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: W_, height: H_ } });
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 1500)));
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 6000)));
await page.goto('file://' + dir + '/test/move.html');
console.log(JSON.stringify(await page.evaluate((i) => window.__run(i), wi)));
if (process.env.SLOPE) console.log('slope', JSON.stringify(await page.evaluate(() => window.__slope())));
for (const c of trials) {
  const r = await page.evaluate((c) => (c.spot !== undefined ? window.__approach(c) : window.__trial(c)), c);
  console.log(c.name, JSON.stringify(r));
  if (c.shot) { const out = `${dir}/shots/${c.name}.png`; await page.screenshot({ path: out }); console.log('saved', out); }
}
await browser.close();
