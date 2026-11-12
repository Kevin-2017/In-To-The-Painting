// renders each world offline at every step of intensity and reports level, brightness and how many notes sound
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
  for (let idx = 0; idx < SCORES.length; idx++) for (const x of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    const secs = 32, sr = 22050;
    const ctx = new OfflineAudioContext(1, secs * sr, sr);
    const m = new Music(); m.start(ctx); m.setChapter(idx, 2, 0.5); m.setNight(0); m.setIntensity(x);
    if (m.group.I !== undefined) { m.group.I = m.intenWant; m.inten = m.intenWant; m.group.trim.gain.value = m.trimFor(m.intenWant); } // the climb is one step a bar; here it starts where it is wanted
    let notes = 0; const note0 = m.note.bind(m); m.note = (...a) => { notes++; return note0(...a); };
    const g = m.group; let errs = 0;
    while (g.next < secs - 4) { try { m.schedule(g, g.step, g.next); } catch (e) { errs++; if (errs === 1) out.push('ERR ' + e.message); } g.step++; g.next += m.stepLen ? m.stepLen(g) : g.stepDur * (1 - 0.02 * Math.max(0, m.heat() - 2)); }
    const buf = await ctx.startRendering();
    const d = buf.getChannelData(0); let peak = 0, sum = 0, n = 0, zc = 0;
    for (let i = sr * 3; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; n++; if ((d[i] >= 0) !== (d[i - 1] >= 0)) zc++; }
    out.push({ world: idx, x, step: m.inten, peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4), notesPerSec: +(notes / (secs - 4)).toFixed(2), bright: Math.round(zc / (n / sr) / 2), errs });
  }
  return out;
});
for (const r of res) console.log(typeof r === 'string' ? r : JSON.stringify(r));
await browser.close();
