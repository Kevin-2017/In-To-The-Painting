// renders each score offline and reports levels, so clipping or silence shows up without ears
import fs from 'fs';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const dir = '/home/claude/monet';
const src = ['01_util.js', '20_audio.js'].map((f) => fs.readFileSync(dir + '/src/' + f, 'utf8')).join('\n');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.setContent('<script>' + src + ';window.Music=Music;window.SCORES=SCORES;</script>');
const res = await page.evaluate(async () => {
  const out = [];
  for (let idx = 0; idx < SCORES.length; idx++) for (const cfg of [[1, 1], [2, 0], [4, 0]]) {
    const secs = 40, sr = 44100;
    const ctx = new OfflineAudioContext(2, secs * sr, sr);
    const m = new Music(); m.start(ctx); m.setChapter(idx, cfg[0], 0.5); m.setNight(cfg[1]);
    const g = m.group; let errs = 0;
    while (g.next < secs - 4) { try { m.schedule(g, g.step, g.next); } catch (e) { errs++; if (errs === 1) out.push('ERR ' + e.message); } g.step++; g.next += g.stepDur; }
    const buf = await ctx.startRendering();
    const d = buf.getChannelData(0); let peak = 0, sum = 0, n = 0;
    for (let i = sr * 2; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; n++; }
    out.push({ idx, level: cfg[0], night: cfg[1], peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4), steps: g.step, errs });
  }
  return out;
});
for (const r of res) console.log(typeof r === 'string' ? r : JSON.stringify(r));
await browser.close();
