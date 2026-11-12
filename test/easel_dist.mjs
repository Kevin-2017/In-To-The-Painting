// every painting at its own easel, hour and season, from a BUILT game (any dist folder), written straight from the canvas:
// node test/easel_dist.mjs <distFolder> <prefix> [worlds, e.g. 0,2]     env: W, H (default 640 x 360), Q (default 2), SHOTS (json of extra views:
// [{ wi, name, t, phase, time, cam: { x, y, z, yaw, pitch, fov, abs } }]), ONLY=1 with SHOTS to skip the easels
import fs from 'fs';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const dir = '/home/claude/monet', dist = process.argv[2] || 'dist', pre = process.argv[3] || 'ed_';
const worlds = (process.argv[4] || '0,1,2,3').split(',').map(Number), W = Number(process.env.W || 640), H = Number(process.env.H || 360), Q = process.env.Q === undefined ? 2 : Number(process.env.Q);
const extra = JSON.parse(process.env.SHOTS || '[]');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 800)));
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.addInitScript((q) => { try { localStorage.setItem('ruhua.monet.q', String(q)); } catch (e) {} }, Q);
await page.goto('file://' + dir + '/' + dist + '/index.html');
await page.waitForFunction(() => window.__ruhua && window.__ruhua.game && window.__ruhua.game.mode === 'title', null, { timeout: 200000 });
await page.evaluate(() => { document.getElementById('btnStart').click(); window.__ruhua.skipRender = true; });
const save = (name, url) => { fs.writeFileSync(`${dir}/shots/${name}.jpg`, Buffer.from(url.split(',')[1], 'base64')); console.log('saved', name); };
for (const wi of worlds) {
  const list = await page.evaluate(({ wi, q }) => { const a = window.__ruhua, g = a.game; g.quality = q; g.autoQuality = false; g.showWorld(wi); g.mode = 'play'; g.advanceTime = () => {}; g.updatePlayer = () => {};
    return { n: g.cur.S.n, shots: g.ch.effects.map((e) => ({ id: e.id, t: e.t0 + 0.5 * (e.t1 - e.t0), phase: Math.max(0, e.phase), spot: e.spot })) }; }, { wi, q: Q });
  console.log('world', wi, 'strokes', list.n);
  const shots = process.env.ONLY ? [] : list.shots.map((s) => ({ name: pre + s.id, t: s.t, phase: s.phase, spot: s.spot }));
  for (const x of extra) if (x.wi === wi) shots.push(Object.assign({}, x, { name: pre + x.name }));
  for (const c of shots) {
    const url = await page.evaluate((o) => {
      const g = window.__ruhua.game, p = g.pl;
      g.mode = 'play'; g.t = o.t === undefined ? 0.4 : o.t; g.phase = g.prevPhase = o.phase || 0; g.phShown = null;
      g.time = o.time === undefined ? 3 : o.time; g.flowPhase[0] = g.flowPhase[1] = g.time * 0.05;
      g.spot = -1; g.viewK = 0; g.debugCam = null; g.free = false;
      if (o.spot !== undefined) { const s = g.ch.spots[o.spot]; g.spot = o.spot; g.viewK = 1; p.x = s.x; p.z = s.z; p.y = g.groundAt(g.cur, p.x, p.z); p.alt = 0; p.heading = s.view.pose === undefined ? s.view.yaw : s.view.pose; }
      p.vx = p.vz = 0; p.valt = 0;
      const sv = o.spot !== undefined ? g.ch.spots[o.spot].view : null;
      if (g.hero) { g.hero.breeze = (sv && sv.breeze) || 1; for (let i = 0; i < 3; i++) g.hero.step(0.5, p, sv && sv.gale ? sv.gale : g.ch.wind, g.time, p.alt > 0.06, false); g.hero.fly = 0; g.hero.pose = sv && sv.act === 1 ? 1 : 0; g.hero.pose2 = sv && sv.act === 2 ? 1 : 0; g.hero.eye = sv ? [sv.x, g.groundAt(g.cur, sv.x, sv.z) + sv.y, sv.z] : null; }
      if (o.cam) g.debugCam = o.cam;
      // the people and the sights take a few steps of their own clocks to come to their marks (nothing else moves: the clock and she are held)
      for (let i = 0; i < 4; i++) { const tm = g.time; g.update(1 / 30); g.time = tm; if (o.spot !== undefined) { g.spot = o.spot; g.viewK = 1; } g.t = o.t === undefined ? 0.4 : o.t; }
      g.render(); g.R.gl.finish();
      return g.R.canvas.toDataURL('image/jpeg', 0.92);
    }, c);
    save(c.name, url);
  }
}
await browser.close();
