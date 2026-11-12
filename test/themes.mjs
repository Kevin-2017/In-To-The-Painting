// renders every painting's theme offline at the fullest level and reports levels, plus the flap and the rush of air
import fs from 'fs';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const dir = '/home/claude/monet';
const src = ['01_util.js', '20_audio.js'].map((f) => fs.readFileSync(dir + '/src/' + f, 'utf8')).join('\n');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-background-networking'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.setContent('<script>' + src + ';window.Music=Music;window.SCORES=SCORES;window.THEMES=THEMES;</script>');
const res = await page.evaluate(async () => {
  const out = [], worldOf = { c: 0, a: 1, f: 2, p: 3 };
  for (const id of Object.keys(THEMES)) {
    const secs = 24, sr = 22050;
    const ctx = new OfflineAudioContext(2, secs * sr, sr);
    const m = new Music(); m.start(ctx); m.setChapter(worldOf[id[0]], 4, 0.3); m.setTheme(id, 0.3);
    const g = m.group; let errs = 0, first = '';
    while (g.next < secs - 3) { try { m.schedule(g, g.step, g.next); } catch (e) { errs++; if (!first) first = e.message; } g.step++; g.next += g.stepDur; }
    if (id === 'c1') { try { m.flap(); m.setRush(1); m.step(1); } catch (e) { errs++; first = first || e.message; } }
    const buf = await ctx.startRendering();
    const d = buf.getChannelData(0); let peak = 0, sum = 0, n = 0;
    for (let i = sr * 2; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; n++; }
    out.push(id + ' peak ' + peak.toFixed(2) + ' rms ' + Math.sqrt(sum / n).toFixed(3) + ' bpm ' + g.score.bpm + (errs ? ' ERR ' + errs + ' ' + first : ''));
  }
  return out;
});
console.log(res.join('\n'));
await browser.close();
