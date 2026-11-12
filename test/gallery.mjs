// stills of chosen moments from the built game: node test/gallery.mjs a,b,c
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const dir = '/home/claude/monet';
const W = Number(process.env.W || 1280), H = Number(process.env.H || 720);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: process.env.LOCALE || 'zh-CN', hasTouch: !!process.env.TOUCH, isMobile: !!process.env.TOUCH });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/ERR_FAILED|net::ERR/.test(t)) errors.push(t.slice(0, 500)); });
page.on('pageerror', (e) => errors.push('pageerror ' + e.message.slice(0, 1500)));
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.addInitScript((q) => { try { localStorage.setItem('ruhua.monet.q', q); } catch (e) {} }, process.env.Q === undefined ? '2' : process.env.Q);
await page.goto('file://' + dir + '/dist/index.html');
await page.waitForFunction(() => window.__ruhua && window.__ruhua.game && window.__ruhua.game.mode === 'title', null, { timeout: 100000 });
const shot = async (name) => { await page.evaluate(() => new Promise((r) => { window.__ruhua.skipRender = false; requestAnimationFrame(() => requestAnimationFrame(() => r())); })); await page.screenshot({ path: `${dir}/shots/${name}.png` }); await page.evaluate(() => { window.__ruhua.skipRender = true; }); console.log('shot', name); };
const setup = (o) => page.evaluate((o) => {
  const A = window.__ruhua, g = A.game; A.skipRender = true;
  A.hide('title'); document.getElementById('btnLang').style.display = 'none';
  g.caps = {}; for (const id of o.caps || []) g.caps[id] = '1';
  g.unlocked = o.wi;
  g.showWorld(o.wi); g.mode = 'play'; A.onArrive(g.ch, g.wi); if (o.card) A.onCard(g.ch); else A.hide('card');
  g.t = o.t; g.phase = g.prevPhase = o.phase || 0; g.phShown = null;
  const p = g.pl; const place = () => { p.x = o.x; p.z = o.z; p.heading = o.heading === undefined ? o.yaw : o.heading; p.alt = o.alt || 0; p.valt = 0; p.vx = p.vz = 0; g.camYaw = o.yaw; g.camPitch = o.pitch === undefined ? -0.06 : o.pitch; g.t = o.t; };
  place(); for (let i = 0; i < 60; i++) { g.update(1 / 30); place(); }
  g.keys = {};
}, o);
const list = (process.argv[2] || 'a,b,c,d').split(',');
if (list.includes('a')) { await setup({ wi: 3, t: 0.44, phase: 1, x: -28, z: 2, yaw: 1.2, pitch: -0.12, heading: 0.2 }); await shot('g_pond_bridge'); }
if (list.includes('b')) { await setup({ wi: 0, t: 0.69, phase: 1, x: -70, z: -20, yaw: -1.3, pitch: -0.05, caps: ['c1', 'c2', 'c3'] }); await shot('g_coast_cliff'); }
if (list.includes('c')) { await setup({ wi: 1, t: 0.45, phase: 0, x: 4, z: 30, yaw: 0.5, pitch: -0.04, card: true }); await page.waitForTimeout(1200); await shot('g_arg_card'); }
if (list.includes('d')) {
  await setup({ wi: 1, t: 0.6, phase: 0, x: 100, z: 20, yaw: 1.2, pitch: -0.04, caps: ['a1', 'a2', 'a3'] });
  await page.evaluate(() => { const g = window.__ruhua.game; g.startTransition(2); for (let i = 0; i < 30 * 3.8; i++) g.update(1 / 30); });
  await shot('g_trans_mid');
  await page.evaluate(() => { const g = window.__ruhua.game; for (let i = 0; i < 30 * 6; i++) g.update(1 / 30); });
  await page.waitForTimeout(600); await shot('g_fields_arrive');
}
if (list.includes('e')) { await setup({ wi: 2, t: 0.31, phase: 3, x: 6, z: 14, yaw: -1.1, pitch: -0.04 }); await shot('g_fields_mist'); }
if (list.includes('f')) { await setup({ wi: 3, t: 0.5, phase: 0, x: -29, z: 52, yaw: 2.6, pitch: -0.04 }); await shot('g_pond_garden'); }
if (list.includes('g')) { await setup({ wi: 2, t: 0.9, phase: 0, x: 6, z: 14, yaw: -1.1, pitch: 0.05 }); await shot('g_fields_night'); }
if (list.includes('t')) { await page.evaluate(() => { window.__ruhua.skipRender = false; }); await page.waitForTimeout(500); await shot('g_title'); }
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
