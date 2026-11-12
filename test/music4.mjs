// music4: proof without ears that the four worlds sound different.
//   notes  one note of each lead (and accompanying) voice rendered alone: attack 10 to 90 %, decay to -20 dB, spectral centroid at 50 and 500 ms, partials 1 to 8
//   share  for each world at steps 1, 3 and 5 the share of note events per voice (over four passes of the theme) and the share of loudness per voice (each voice soloed)
//   wav    shots/music/coast.wav argenteuil.wav fields.wav pond.wav (step 3, 20 s) and title.wav (world 0 at night, then the day at the title's step)
// Run: node test/music4.mjs [notes|share|wav] (default all)
import fs from 'fs';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const dir = '/home/claude/monet';
const which = process.argv[2] || 'all';
const src = fs.readFileSync(dir + '/src/01_util.js', 'utf8') + '\n' + fs.readFileSync(process.env.AUDIO_SRC || dir + '/src/20_audio.js', 'utf8');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (!/outside nominal range/.test(m.text())) console.log(m.text()); });
await page.setContent('<script>' + src + ';window.Music=Music;window.SCORES=SCORES;window.THEMES=THEMES;</script>');

const res = await page.evaluate(async (which) => {
  const out = [];
  // a quiet room: no wind, no reverb, no fade
  const room = (m) => { const g = m.group; g.windGain.gain.cancelScheduledValues(0); g.windGain.gain.value = 0; g.send.gain.value = 0; g.xout.gain.cancelScheduledValues(0); g.xout.gain.value = 0; g.out.gain.cancelScheduledValues(0); g.out.gain.value = 1; };
  const fft = (re, im) => { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len; for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k++) { const c = Math.cos(a * k), s = Math.sin(a * k), xr = re[i + k + len / 2] * c - im[i + k + len / 2] * s, xi = re[i + k + len / 2] * s + im[i + k + len / 2] * c; re[i + k + len / 2] = re[i + k] - xr; im[i + k + len / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi; } } };
  const spec = (d, sr, at) => { const N = 4096, re = new Float64Array(N), im = new Float64Array(N), i0 = Math.floor(at * sr); for (let i = 0; i < N; i++) re[i] = (d[i0 + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1))); fft(re, im); const mag = new Float64Array(N / 2); for (let i = 0; i < N / 2; i++) mag[i] = Math.hypot(re[i], im[i]); return mag; };
  const centroid = (mag, sr) => { let a = 0, b = 0; const df = sr / (mag.length * 2); for (let i = 1; i < mag.length; i++) { a += i * df * mag[i]; b += mag[i]; } return b ? Math.round(a / b) : 0; };
  if (which === 'all' || which === 'notes') {
    const sr = 32000;
    const list = [['piano', 69, 0, 1.2, 'coast lead'], ['piano', 45, 0, 3, 'coast left hand'], ['accordion', 69, 1, 1.2, 'Argenteuil lead'], ['harp', 50, 1, 0, 'Argenteuil harp'], ['cello', 57, 2, 1.2, 'fields lead'], ['strings', 69, 2, 1.2, 'fields violins'], ['oboe', 69, 2, 1.2, 'fields answer'],
      ['celesta', 81, 3, 0, 'pond lead'], ['flute', 69, 3, 1.2, 'pond answer']];
    for (const [voice, midi, world, len, role] of list) {
      const secs = 4, ctx = new OfflineAudioContext(1, secs * sr, sr), m = new Music(); m.start(ctx); m.setChapter(world, 2, 0.01); room(m);
      const t0 = 0.2, vel = SCORES[world].mel.vel;
      m.cur = m.group; m.note(voice, t0, midi, vel, len || 0, 1); m.cur = null;
      const f0 = 440 * Math.pow(2, (midi - 69) / 12), d = (await ctx.startRendering()).getChannelData(0), w = Math.round(sr * Math.max(0.002, 2 / f0)), hop = Math.round(sr * 0.002), env = [];
      for (let i = Math.floor(t0 * sr) - w; i + w < d.length; i += hop) { let s = 0; for (let j = 0; j < w; j++) s += d[i + j] * d[i + j]; env.push(Math.sqrt(s / w)); }
      let pk = 0, pi = 0; for (let i = 0; i < env.length; i++) if (env[i] > pk) { pk = env[i]; pi = i; }
      let a10 = 0, a90 = 0; for (let i = 0; i <= pi; i++) { if (!a10 && env[i] >= pk * 0.1) a10 = i + 1; if (!a90 && env[i] >= pk * 0.9) a90 = i + 1; }
      let dec = env.length; for (let i = pi; i < env.length; i++) if (env[i] < pk * 0.1) { dec = i; break; }
      const m1 = spec(d, sr, t0 + 0.05), m2 = spec(d, sr, t0 + 0.5), m3 = spec(d, sr, t0 + 0.1), df = sr / 4096;
      const parts = []; for (let k = 1; k <= 8; k++) { const c = Math.round(k * f0 / df); let mx = 0; for (let j = c - 3; j <= c + 3; j++) mx = Math.max(mx, m3[j] || 0); parts.push(mx); }
      const ref = Math.max(...parts); let ss = 0; for (let i = Math.floor(t0 * sr); i < (t0 + 0.4) * sr; i++) ss += d[i] * d[i];
      out.push({ voice, role, midi, attack10_90ms: (a90 - a10) * 2, decayTo20dBms: (dec - pi) * 2 + (len ? ' (held ' + len + ' s)' : ''), centroid50ms: centroid(m1, sr), centroid500ms: centroid(m2, sr), partials_dB: parts.map((x) => Math.round(20 * Math.log10(Math.max(1e-6, x / ref)))).join(' '), rms400ms: +Math.sqrt(ss / (0.4 * sr)).toFixed(4), peak: +d.reduce((a, x) => Math.max(a, Math.abs(x)), 0).toFixed(3) });
    }
  }
  if (which === 'all' || which === 'share') {
    const sr = 16000;
    // A weighting from first order sections (poles at 20.6 Hz twice, 107.7 Hz, 737.9 Hz high pass): how loud it is to an ear at a quiet level, not raw power
    const aw = (x, sr) => { let y = Float32Array.from(x); for (const fc of [20.6, 20.6, 107.7, 737.9]) { const a = 1 / (1 + 2 * Math.PI * fc / sr); let px = 0, py = 0; for (let i = 0; i < y.length; i++) { const v = a * (py + y[i] - px); px = y[i]; py = v; y[i] = v; } } return y; };
    const run = async (idx, I, secs, solo) => {
      const ctx = new OfflineAudioContext(1, Math.ceil(secs * sr), sr), m = new Music(); m.start(ctx); m.setNight(0); m.setIntensity([0, 0.2, 0.4, 0.6, 0.8, 1][I]); m.setChapter(idx, 2, 0.5);
      m.group.I = I; m.inten = I; m.intenWant = I; m.group.trim.gain.value = m.trimFor(I); m.level = [1, 2, 3, 4, 4, 4][I];
      const c = {}, n0 = m.note.bind(m), p0 = m.pad.bind(m);
      m.note = (v, t, mi, ve, len, hi) => { const k = v + (hi ? ' (tune)' : ''); c[k] = (c[k] || 0) + 1; if (solo && solo !== k) return; return n0(v, t, mi, ve, len, hi); };
      m.pad = (...a) => { c.pad = (c.pad || 0) + 1; if (solo && solo !== 'pad') return; return p0(...a); };
      const c0 = m.claim.bind(m); m.claim = (t, e, hi) => { const ok = c0(t, e, hi); if (!ok) c.dropped = (c.dropped || 0) + 1; return ok; };
      if (solo) { m.group.windGain.gain.cancelScheduledValues(0); m.group.windGain.gain.value = 0; }
      const g = m.group; while (g.next < secs - 3) { m.schedule(g, g.step, g.next); g.step++; g.next += m.stepLen(g); }
      if (!solo) return c;
      const d = aw((await ctx.startRendering()).getChannelData(0), sr); let s = 0; for (let i = sr * 2; i < d.length; i++) s += d[i] * d[i];
      return Math.sqrt(s / (d.length - sr * 2));
    };
    for (let idx = 0; idx < 4; idx++) for (const I of [1, 3, 5]) {
      const S = SCORES[idx], barSec = S.beats * 60 / S.bpm, all = barSec * 32 + 3; // four passes of the theme
      const c = await run(idx, I, all, null); let tot = 0; for (const k in c) if (k !== 'pad' && k !== 'dropped') tot += c[k];
      const ev = {}; for (const k in c) if (k !== 'pad' && k !== 'dropped') ev[k] = Math.round(100 * c[k] / tot);
      const loud = {}, voices = Object.keys(c).filter((k) => k !== 'dropped'); let lt = 0;
      for (const v of voices) { const r = await run(idx, I, Math.min(all, barSec * 16 + 3), v); loud[v] = r * r; lt += r * r; } // power over the first two passes
      for (const v of voices) loud[v] = Math.round(100 * loud[v] / lt);
      out.push({ world: idx, step: I, lead: S.mel.voice, eventsPct: ev, loudnessPct_Aweighted: loud, notesDropped: c.dropped || 0, notes: tot });
    }
  }
  if (which === 'all' || which === 'wav') {
    const sr = 32000, wav = (buf) => {
      const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length, b = new ArrayBuffer(44 + n * 4), v = new DataView(b);
      const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      str(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 4, true);
      let pk = 0;
      for (let i = 0; i < n; i++) { const l = Math.max(-1, Math.min(1, L[i])), r = Math.max(-1, Math.min(1, R[i])); pk = Math.max(pk, Math.abs(l), Math.abs(r)); v.setInt16(44 + i * 4, l * 32767, true); v.setInt16(46 + i * 4, r * 32767, true); }
      let s = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
      return { b64: btoa(s), peak: +pk.toFixed(3) };
    };
    for (const [name, idx] of [['coast', 0], ['argenteuil', 1], ['fields', 2], ['pond', 3]]) {
      const secs = 21, ctx = new OfflineAudioContext(2, secs * sr, sr), m = new Music(); m.start(ctx); m.setNight(0); m.setIntensity(0.6); m.setChapter(idx, 2, 0.6);
      m.group.I = 3; m.inten = 3; m.intenWant = 3; m.group.trim.gain.value = m.trimFor(3); m.level = 4;
      const g = m.group; while (g.next < secs - 1.5) { m.schedule(g, g.step, g.next); g.step++; g.next += m.stepLen(g); }
      const w = wav(await ctx.startRendering()); out.push({ wav: name, b64: w.b64, peak: w.peak });
    }
    { // the title: world 0 at night for 9 s, then the day breaks and the music climbs to the title's step
      const secs = 32, ctx = new OfflineAudioContext(2, secs * sr, sr), m = new Music(); m.start(ctx); m.setChapter(0, 2, 2); m.setNight(1); m.setIntensity(0.3);
      const g = m.group, log = [];
      while (g.next < secs - 1.5) { m.setNight(g.next < 9 ? 1 : 0); if (g.step % 8 === 0) log.push(g.I); m.schedule(g, g.step, g.next); g.step++; g.next += m.stepLen(g); }
      const w = wav(await ctx.startRendering()); out.push({ wav: 'title', b64: w.b64, peak: w.peak, stepsPerBar: log.join('') });
    }
  }
  return out;
}, which);
for (const r of res) {
  if (r.wav) { fs.mkdirSync(dir + '/shots/music', { recursive: true }); fs.writeFileSync(dir + '/shots/music/' + r.wav + '.wav', Buffer.from(r.b64, 'base64')); console.log(JSON.stringify({ wav: 'shots/music/' + r.wav + '.wav', peak: r.peak, stepsPerBar: r.stepsPerBar })); }
  else console.log(JSON.stringify(r));
}
await browser.close();
