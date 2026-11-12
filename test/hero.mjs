// the walker seen close, in a row of poses. node test/hero.mjs <out name> ['<json poses>']   env: SRC (default dev), T (hour), WI (world)
import fs from 'fs';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const dir = '/home/claude/monet', SRC = '/' + (process.env.SRC || 'dev') + '/', wi = Number(process.env.WI || 2);
const WFILE = ['11_coast.js', '12_argenteuil.js', '13_fields.js', '14_pond.js'][wi], WNAME = ['W_COAST', 'W_ARGENTEUIL', 'W_FIELDS', 'W_POND'][wi];
const files = fs.readdirSync(dir + SRC).filter((f) => f.endsWith('.js') && !/^40_/.test(f) && (!/^1[1-4]_/.test(f) || f === WFILE)).sort();
const src = files.map((f) => (f === '19_worlds.js' ? 'const WORLDS = [0, 1, 2, 3].map(() => ' + WNAME + ');' : fs.readFileSync(dir + SRC + f, 'utf8'))).join('\n');
const S = Number(process.env.S || 560);
const def = [
  { n: 'stand back', az: 0.0, d: 4.2, h: 1.9 }, { n: 'stand 3/4 front', az: 2.5, d: 4.0, h: 1.5 }, { n: 'walk side', az: 1.57, d: 4.2, h: 1.4, v: 1.6, gait: 1.2 }, { n: 'run back', az: 0.35, d: 4.6, h: 2.0, v: 8, gait: 4.2 },
  { n: 'glide back', az: 0.15, d: 5.6, h: 1.4, alt: 12, v: 14, lean: 0.5, vy: -2 }, { n: 'glide side', az: 1.45, d: 5.6, h: 0.6, alt: 12, v: 14, lean: 0.5, vy: -2 }, { n: 'flap below', az: 2.7, d: 5.2, h: -1.6, alt: 12, v: 5, lean: 0.15, flap: 0.9, vy: 6 }, { n: 'fall front', az: 3.0, d: 5.0, h: 0.4, alt: 12, v: 2, lean: 0.0, vy: -8 },
];
const poses = process.argv[3] ? JSON.parse(process.argv[3]) : def;
const html = `<!doctype html><html><body style="margin:0;background:#000"><canvas id="c" style="width:${S}px;height:${S}px;display:block"></canvas><script>
${src}
window.__run = function (wi) {
  const ui = { onLeave() {}, onArrive() {}, onCard() {}, onPhase() {}, onSpot() {}, onAuto() {}, onCapture() {}, onQuality() {}, onFly() {}, onSlide() {}, onReview() {}, onFree() {}, onFound() {} };
  const g = window.__g = new Game(document.getElementById('c'), ui, null);
  g.quality = 2; g.autoQuality = false; g.resize(${S}, ${S}, 1);
  g.showWorld(wi); g.mode = 'play';
  const d = g.R.draw.bind(g.R);
  g.R.draw = (f) => { f.strokeCount = Math.min(f.strokeCount, ${Number(process.env.STROKES || 60000)}); f.touchCount = Math.round(f.touchCount * ${Number(process.env.TOUCH || 0.5)}); d(f); };
  return { strokes: g.cur.S.n };
};
window.__pose = function (o) {
  const g = window.__g, p = g.pl, h = g.hero, W = g.cur;
  g.mode = 'play'; g.t = o.t === undefined ? ${Number(process.env.T || 0.4)} : o.t; g.phase = g.prevPhase = o.phase || 0; g.phShown = null;
  g.time = o.time === undefined ? 3 : o.time; g.spot = -1; g.viewK = 0; g.doorOn = false;
  const st = g.ch.start; p.x = o.x === undefined ? st.x : o.x; p.z = o.z === undefined ? st.z : o.z; p.heading = o.heading === undefined ? st.yaw : o.heading;
  p.alt = o.alt || 0; p.y = p.yAbs = g.groundAt(W, p.x, p.z) + p.alt;
  const v = o.v || 0, hx = Math.sin(p.heading), hz = -Math.cos(p.heading), wind = g.ch.wind;
  p.vx = hx * v; p.vz = hz * v; p.valt = o.vy || 0;
  const a = [wind[0] * 2 - p.vx, -(o.vy || 0), wind[1] * 2 - p.vz];
  h.w1 = a.slice(); h.w2 = a.slice(); h.fly = p.alt > 0 ? 1 : 0; h.walk = p.alt > 0 ? 0 : Math.min(1, v / 1.6); h.gait = o.gait || 0; h.bank = o.bank || 0;
  g.lean = o.lean || 0; g.flapK = o.flap || 0; g.sliding = !!o.slide; g.trail.length = 0;
  const az = p.heading + Math.PI + (o.az || 0), d = o.d || 4.5, cx = p.x + Math.sin(az) * d, cz = p.z - Math.cos(az) * d, cy = p.y + (o.h === undefined ? 1.6 : o.h);
  const tx = p.x - cx, ty = p.y + (o.look === undefined ? 1.35 : o.look) - cy, tz = p.z - cz;
  g.debugCam = { x: cx, y: cy, z: cz, abs: true, yaw: Math.atan2(tx, -tz), pitch: Math.atan2(ty, Math.hypot(tx, tz)), fov: o.fov || 36 };
  g.render(); g.R.gl.finish();
  return { n: h.n };
};
</script></body></html>`;
const page_ = dir + '/test/hero.html';
fs.writeFileSync(page_, html);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: S, height: S } });
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 1500)));
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 3000)));
await page.goto('file://' + page_);
console.log(JSON.stringify(await page.evaluate((i) => window.__run(i), wi)));
const name = process.argv[2] || 'hero';
for (let i = 0; i < poses.length; i++) {
  const r = await page.evaluate((c) => window.__pose(c), poses[i]);
  await page.screenshot({ path: `${dir}/shots/${name}_${i}.png` });
  console.log('pose', i, poses[i].n || '', JSON.stringify(r));
}
await browser.close();
