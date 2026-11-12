// share images made from the game's own title screen
//   node test/og.mjs                 the four images into launch/ (og, og-en, og-square, cover-16x9)
//   ONLY=og,og-en node test/og.mjs   some of them
//   ONLY=cover-3x4 node test/og.mjs  the extra upright cover
// env: SCALE (1 or 2, renders larger and scales down, default 1), DIAL=0 hides the sun's road at the bottom,
//      WEBFONTS=1 lets the page fetch its Google fonts (use where the network allows it), TITLE_T (default 30), OUT (default launch)
// The built page in dist/ is opened as it is. Nothing is rebuilt and nothing in dist/ is written.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { createRequire } from 'module';
import fs from 'fs';
const sharp = createRequire('/opt/npm-tools/node_modules/')('sharp');

const dir = '/home/claude/monet';
const out = dir + '/' + (process.env.OUT || 'launch');
const SCALE = Number(process.env.SCALE || 1);
const TITLE_T = Number(process.env.TITLE_T || 30);
// name, size, language of the lettering, largest weight in KB that the JPEG should stay under, first quality tried
const JOBS = [
  { name: 'og', w: 1200, h: 630, lang: 'zh', maxKB: 300, q: 88 },
  { name: 'og-en', w: 1200, h: 630, lang: 'en', maxKB: 300, q: 88 },
  { name: 'og-square', w: 1080, h: 1080, lang: 'zh', maxKB: 400, q: 88 },
  { name: 'cover-16x9', w: 1600, h: 900, lang: 'zh', maxKB: 600, q: 88 },
  // an upright cover for feeds that show 3 to 4 (Xiaohongshu). Not part of the default set: ONLY=cover-3x4
  { name: 'cover-3x4', w: 1242, h: 1656, lang: 'zh', maxKB: 700, q: 88, extra: true },
];
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const jobs = only.length ? JOBS.filter((j) => only.includes(j.name)) : JOBS.filter((j) => !j.extra);

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'] });
const errors = [];
let bad = 0;

for (const job of jobs) {
  const t0 = Date.now();
  const ctx = await browser.newContext({ viewport: { width: job.w, height: job.h }, deviceScaleFactor: SCALE, locale: job.lang === 'zh' ? 'zh-CN' : 'en-US' });
  const page = await ctx.newPage();
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/ERR_FAILED|net::ERR/.test(t)) errors.push(job.name + ' ' + t.slice(0, 400)); });
  page.on('pageerror', (e) => errors.push(job.name + ' pageerror ' + e.message.slice(0, 800)));
  if (!process.env.WEBFONTS) await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  // a first visit: no saved game, the language of this image, the highest quality
  await page.addInitScript((lang) => { try { localStorage.clear(); localStorage.setItem('ruhua.lang', lang); localStorage.setItem('ruhua.monet.q', '2'); } catch (e) {} }, job.lang);
  await page.goto('file://' + dir + '/dist/index.html');
  await page.waitForFunction(() => window.__ruhua && window.__ruhua.game && window.__ruhua.game.mode === 'title', null, { timeout: 200000 });
  // only the name stays: no buttons, no language switch. They keep their room, so the name stands where the real title has it
  // (that also keeps the lettering above the strip at the bottom left where X lays its own label over a large card).
  // Where the page's web fonts cannot be fetched, the same families as installed on this machine stand in.
  await page.addStyleTag({ content: `
    #title .acts, #btnLang { visibility: hidden !important; }
    #loading { display: none !important; }
    .fade, .fade.on { transition: none !important; }
    ${process.env.DIAL === '0' ? '#sundial, #phases, #seasons { display: none !important; }' : ''}
    :root {
      --font-display: "Noto Serif SC", "Noto Serif CJK SC", "Songti SC", "STSong", "Source Han Serif SC", "SimSun", Georgia, serif !important;
      --font-latin: "Cormorant Garamond", "EB Garamond", "Lora", Georgia, "Noto Serif SC", "Noto Serif CJK SC", serif !important;
      --font-meta: "Noto Sans SC", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif !important;
    }` });
  // let the sunrise of the title come up, then wait for real frames (each one is slow here)
  const frames = (n) => page.evaluate((n) => new Promise((res) => { const a = window.__ruhua; a.skipRender = false; let i = 0; const f = () => { if (++i >= n) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
  await page.evaluate((tt) => { const a = window.__ruhua, g = a.game; a.skipRender = true; if (g.building) g.finishBuild(); g.titleT = tt; }, TITLE_T);
  await frames(6);
  await page.evaluate(() => (document.fonts && document.fonts.ready ? document.fonts.ready.then(() => 1) : 1));
  await frames(3);
  // the lettering must lie inside the picture: measure the ink of the two lines, not their boxes
  const m = await page.evaluate(() => {
    const box = (id) => { const el = document.getElementById(id), r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(), cs = getComputedStyle(el); return { text: el.textContent, l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), font: cs.fontFamily.split(',')[0], size: cs.fontSize }; };
    const g = window.__ruhua.game, cv = document.getElementById('view');
    return { title: box('tTitle'), sub: box('tSub'), lang: document.documentElement.lang, mode: g.mode, wi: g.wi, t: +g.t.toFixed(4), titleT: +g.titleT.toFixed(2), q: g.quality, canvas: cv.width + 'x' + cv.height, fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).join('|') };
  });
  const pad = Math.round(job.w * 0.03);
  const inside = (b) => b.l >= pad && b.t >= pad && b.r <= job.w - pad && b.b <= job.h - pad && b.r > b.l && b.b > b.t;
  const ok = inside(m.title) && inside(m.sub) && m.mode === 'title';
  if (!ok) bad++;
  const png = await page.screenshot({ type: 'png', timeout: 120000 });
  // JPEG by mozjpeg: step the quality down only as far as the weight asks for
  let q = job.q, buf;
  for (;;) {
    buf = await sharp(png).resize(job.w, job.h, { fit: 'fill', kernel: 'lanczos3' }).jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:2:0', progressive: true }).toBuffer();
    if (buf.length <= job.maxKB * 1024 || q <= 72) break;
    q -= 2;
  }
  fs.writeFileSync(`${out}/${job.name}.jpg`, buf);
  const meta = await sharp(buf).metadata();
  console.log(JSON.stringify({ file: `${out}/${job.name}.jpg`, size: meta.width + 'x' + meta.height, kb: +(buf.length / 1024).toFixed(1), quality: q, letteringInside: ok, secs: Math.round((Date.now() - t0) / 1000), ...m }));
  await ctx.close();
}
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
if (bad) { console.log('LETTERING OUTSIDE THE PICTURE in', bad, 'image(s)'); process.exit(1); }
