// music3: what each step of intensity adds in each world (notes per second per voice, live oscillators), a change of world rendered while playing,
// painting themes at step 0 and 5, and the fall to night. Run: node test/music3.mjs [steps|change|themes|night] (default all)
import fs from 'fs';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const dir = '/home/claude/monet';
const which = process.argv[2] || 'all';
const src = fs.readFileSync(dir + '/src/01_util.js', 'utf8') + '\n' + fs.readFileSync(process.env.AUDIO_SRC || dir + '/src/20_audio.js', 'utf8'); // AUDIO_SRC renders an older copy for comparison
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (!/outside nominal range/.test(m.text())) console.log(m.text()); });
await page.setContent('<script>' + src + ';window.Music=Music;window.SCORES=SCORES;window.THEMES=THEMES;</script>');
const res = await page.evaluate(async ([which, control, themeList]) => {
  const out = [], sr = 22050;
  // every oscillator's life, to count how many sound at once
  const S = OscillatorNode.prototype.start, T = OscillatorNode.prototype.stop;
  let iv = [];
  OscillatorNode.prototype.start = function (t) { this._t0 = t || 0; return S.call(this, t); };
  OscillatorNode.prototype.stop = function (t) { iv.push([this._t0, t]); return T.call(this, t); };
  const maxLive = () => { const ev = []; for (const [a, b] of iv) { ev.push([a, 1]); ev.push([b, -1]); } ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]); let c = 0, m = 0; for (const e of ev) { c += e[1]; if (c > m) m = c; } return m; };
  if (!Music.prototype.groupsToPlay) { Music.prototype.groupsToPlay = function () { return [this.group]; }; Music.prototype.stepLen = function (g) { return g.stepDur * (1 - 0.02 * Math.max(0, this.heat() - 2)); }; Music.prototype.pad0 = 1; }
  const mk = (secs) => { iv = []; const ctx = new OfflineAudioContext(1, Math.ceil(secs * sr), sr); const m = new Music(); m.start(ctx); return { ctx, m }; };
  const count = (m) => { const c = {}; const n0 = m.note.bind(m); m.note = (v, ...a) => { c[v] = (c[v] || 0) + 1; return n0(v, ...a); }; const p0 = m.pad.bind(m); m.pad = (...a) => { c.pad = (c.pad || 0) + 1; return p0(...a); }; return c; };
  const pump = (m, ctx) => { const now = ctx.currentTime; for (const o of m.groupsToPlay(now)) { if (o.next < now - 0.5) o.next = now + 0.05; let n = 0; while (o.next < now + 0.4 && o.next < (o.endAt || 1e9) - 0.4 && n++ < 16) { m.schedule(o, o.step, o.next); o.step++; o.next += m.stepLen(o); } } };
  const stats = (d, a, b) => { let peak = 0, sum = 0, n = 0, zc = 0, jump = 0; for (let i = Math.max(1, Math.floor(a * sr)); i < Math.min(d.length, b * sr); i++) { const x = Math.abs(d[i]); if (x > peak) peak = x; sum += d[i] * d[i]; n++; if ((d[i] >= 0) !== (d[i - 1] >= 0)) zc++; const j = Math.abs(d[i] - d[i - 1]); if (j > jump) jump = j; } return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / Math.max(1, n)).toFixed(4), bright: Math.round(zc / (n / sr) / 2), jump: +jump.toFixed(4) }; };
  const steady = async (idx, I, secs, theme) => {
    const { ctx, m } = mk(secs); m.setNight(0); m.setIntensity([0, 0.2, 0.4, 0.6, 0.8, 1][I]); m.setChapter(idx, 2, 0.5);
    if (theme) m.setTheme(theme, 0.3);
    m.group.I = I; m.inten = I; m.intenWant = I; if (m.group.trim) m.group.trim.gain.value = m.trimFor(I); m.level = [1, 2, 3, 4, 4, 4][I];
    const c = count(m), g = m.group;
    while (g.next < secs - 4) { m.schedule(g, g.step, g.next); g.step++; g.next += m.stepLen(g); }
    const live = maxLive(), buf = await ctx.startRendering(), st = stats(buf.getChannelData(0), 3, secs);
    const per = {}; let all = 0; for (const k in c) { per[k] = +(c[k] / (secs - 4)).toFixed(2); if (k !== 'pad') all += c[k]; }
    return Object.assign({ idx, I, theme: theme || '', step: g.I, nps: +(all / (secs - 4)).toFixed(2), live }, st, { per });
  };
  if (which === 'all' || which === 'steps') for (let idx = 0; idx < SCORES.length; idx++) for (let I = 0; I <= 5; I++) out.push(await steady(idx, I, 32));
  if (which === 'all' || which === 'themes') for (const id of themeList.split(',')) for (const I of [0, 5]) out.push(await steady({ c: 0, a: 1, f: 2, p: 3 }[id[0]], I, 24, id));
  if (which === 'all' || which === 'change') for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0]]) {
    // world a full (step 5) for 14 s, then the golden frame: setChapter(b, 2, 6), 8.6 s of flight with no setIntensity, then arrival at nothing caught
    const secs = 40, at = 14, land = at + 8.6, { ctx, m } = mk(secs);
    m.setNight(0); m.setIntensity(1); m.setChapter(a, 2, 0.5); m.group.I = 5; m.inten = 5; m.intenWant = 5; if (m.group.trim) m.group.trim.gain.value = m.trimFor(5);
    const acts = [];
    for (let t = 0.1; t < secs - 0.2; t += 0.2) acts.push(t);
    let did = 0, landed = 0;
    for (const t of acts) ctx.suspend(t).then(() => {
      try {
        if (!did && ctx.currentTime >= at - 1e-6) { did = 1; if (!control) m.setChapter(b, 2, 6); }
        if (!landed && ctx.currentTime >= land - 1e-6) landed = 1;
        if (landed && !control) m.setIntensity(0); else if (!did) m.intenWant = 5;
        pump(m, ctx);
      } catch (e) { console.log('ERR ' + e.message); }
      ctx.resume();
    });
    const buf = await ctx.startRendering(), d = buf.getChannelData(0);
    const w = []; for (let t = at - 3; t < at + 12; t += 0.5) w.push(stats(d, t, t + 0.5).rms);
    const before = stats(d, 4, at), during = stats(d, at, at + 6), after = stats(d, at + 6, at + 14), late = stats(d, land + 6, secs);
    let minW = 9, maxStepRatio = 0; for (let i = 6; i < w.length; i++) { if (w[i] < minW) minW = w[i]; if (i > 0) maxStepRatio = Math.max(maxStepRatio, w[i] / w[i - 1], w[i - 1] / w[i]); }
    out.push({ change: a + '->' + b, rms05: w.map((x) => +x.toFixed(3)).join(' '), minWindowFromChange: minW, worstNeighbourRatio: +maxStepRatio.toFixed(2), jumpBefore: before.jump, jumpDuring: during.jump, jumpAfter: after.jump, peakDuring: during.peak, rmsBefore: before.rms, rmsDuring: during.rms, rmsAfter: after.rms, rmsLate: late.rms, liveMax: maxLive() });
  }
  if (which === 'all' || which === 'flip') {
    // the walker dithering at the edge of an easel: the theme flips on and off every 0.7 s for 10 s
    const secs = 24, { ctx, m } = mk(secs); m.setNight(0); m.setChapter(1, 2, 0.5); m.setIntensity(0.6);
    let k = 0, maxOld = 0, errs = 0;
    for (let t = 0.1; t < secs - 0.2; t += 0.1) ctx.suspend(t).then(() => {
      try { const now = ctx.currentTime; if (now > 4 && now < 14 && Math.abs((now - 4) % 0.7) < 0.05) m.setTheme(k++ % 2 ? null : 'a2'); pump(m, ctx); maxOld = Math.max(maxOld, m.old ? m.old.length : 0); } catch (e) { errs++; console.log('ERR ' + e.message); }
      ctx.resume();
    });
    const buf = await ctx.startRendering(), d = buf.getChannelData(0), w = [];
    for (let t = 2; t < secs - 1; t += 0.5) w.push(stats(d, t, t + 0.5).rms.toFixed(3));
    out.push({ flip: k, errs, maxOld, live: maxLive(), steady: stats(d, 1, 4), flipping: stats(d, 4, 15), rms05: w.join(' ') });
  }
  if (which === 'all' || which === 'night') for (const idx of [1, 3]) {
    const secs = 40, { ctx, m } = mk(secs); m.setNight(0); m.setIntensity(1); m.setChapter(idx, 2, 0.5); m.group.I = 5; m.inten = 5; m.intenWant = 5; if (m.group.trim) m.group.trim.gain.value = m.trimFor(5);
    const g = m.group, log = [];
    while (g.next < secs - 4) { if (g.next > 10) m.setNight(1); if (g.step % (g.score.beats * g.score.sub) === 0) log.push(g.I); m.schedule(g, g.step, g.next); g.step++; g.next += m.stepLen(g); }
    const buf = await ctx.startRendering(), d = buf.getChannelData(0);
    out.push({ night: idx, stepsPerBar: log.join(''), rmsDay: stats(d, 3, 10).rms, rmsNight: stats(d, 28, 36).rms });
  }
  return out;
}, [which, !!process.env.CONTROL, process.env.THEMES || 'c2,a4,f3,p6']); // CONTROL=1: the same renders with no change of world, for a yardstick
for (const r of res) console.log(typeof r === 'string' ? r : JSON.stringify(r));
await browser.close();
