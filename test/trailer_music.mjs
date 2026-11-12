// The trailer cue: one through composed piece of 52 s at 72 beats a minute in 4/4 (a bar is 10/3 s), played on the game's own voices (src/20_audio.js).
// Its theme grows from the coast theme of the game (A F# E, then G F# E), in D major.
// Renders offline at 48 kHz, measures loudness (K weighted, gated, as in BS.1770), brings it near -16 LUFS under a gentle peak limiter,
// and writes shots/music/trailer.wav and shots/music/trailer_hits.json.  Run: node test/trailer_music.mjs
import fs from 'fs';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const dir = '/home/claude/monet';
const src = fs.readFileSync(dir + '/src/01_util.js', 'utf8') + '\n' + fs.readFileSync(dir + '/src/20_audio.js', 'utf8');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (!/outside nominal range/.test(m.text())) console.log(m.text()); });
await page.setContent('<script>' + src + ';window.Music=Music;</script>');

const res = await page.evaluate(async (MUTE) => {
  const SR = 48000, LEN = 52, BAR = 10 / 3, BEAT = BAR / 4;
  const T = (bar, beat) => (bar - 1) * BAR + (beat || 0) * BEAT; // bar from 1, beat from 0
  const NN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const n = (s) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(s); return 12 * (+m[3] + 1) + NN[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
  // chords: bass and the pitch classes above it
  const PC = (s) => s.split(' ').map((x) => NN[x[0]] + (x[1] === '#' ? 1 : x[1] === 'b' ? -1 : 0));
  const CH = {
    D: { b: 'D', t: PC('D F# A') }, Dadd9: { b: 'D', t: PC('D F# A E') }, Em7: { b: 'E', t: PC('E G B D') }, Bm: { b: 'B', t: PC('B D F#') }, Bm7: { b: 'B', t: PC('B D F# A') },
    Asus: { b: 'A', t: PC('A D E') }, A: { b: 'A', t: PC('A C# E') }, Bm_A: { b: 'A', t: PC('B D F#') }, G: { b: 'G', t: PC('G B D') }, Gmaj7: { b: 'G', t: PC('G B D F#') },
    D_F: { b: 'F#', t: PC('D F# A') }, Em: { b: 'E', t: PC('E G B') }, Gm6: { b: 'G', t: PC('G Bb D E') }, G_A: { b: 'A', t: PC('G B D') },
  };
  const bassPc = (c) => PC(CH[c].b)[0];
  const spread = (c, lo, hi) => { const out = []; for (let m = lo; m <= hi; m++) if (CH[c].t.indexOf(m % 12) >= 0) out.push(m); return out; };
  const low = (c, oct) => 12 * (oct + 1) + bassPc(c);

  const ctx = new OfflineAudioContext(2, SR * LEN, SR), M = new Music(); M.start(ctx); M.setChapter(0, 2, 0.01);
  // a concert hall rather than the game's room: no wind, no sea, no fade, the master straight out (the loudness is set after the render)
  const g = M.group; g.windGain.gain.cancelScheduledValues(0); g.windGain.gain.value = 0; for (const p of [g.out.gain, g.xout.gain]) { p.cancelScheduledValues(0); p.value = 1; }
  g.send.gain.value = 0.42; M.master.disconnect(); M.master.gain.value = 1; M.master.connect(ctx.destination);
  M.slots = new Float64Array(256); M.cur = g;
  const r = mulberry32(1874);
  const hum = () => (r() - 0.5) * 0.012;
  let count = 0; const N = (v, t, m, vel, len) => { count++; if (MUTE.indexOf(v) >= 0) return; M.note(v, t + hum(), m, vel * (v === 'piano' && (t < T(3) || t > T(13) - 0.1) ? PS : 1), len, 1); };
  const PS = 1.35; // the solo piano a little forward, so that it carries on a phone
  const S = (v, t, m, vel, len) => { count++; if (MUTE.indexOf(v) >= 0) return; M.note(v, t, m, vel, len, 1); }; // exact time, for strokes that mark a cut

  // ---------- the theme ----------
  // A: the head of the coast theme in D (bars 1 and 7, 3 and 13), B: its second bar (bars 2, 8, 4, 14), then two bars of their own for the cello
  const A = [[0, 'A4', 1, 0.85], [1, 'F#5', 2, 1], [3, 'E5', 1, 0.8]];
  const B = [[0, 'G5', 1.5, 0.95], [1.5, 'F#5', 0.5, 0.75], [2, 'E5', 2, 0.85]];
  const C = [[0, 'D5', 1, 0.85], [1, 'B4', 1, 0.8], [2, 'C#5', 1, 0.85], [3, 'D5', 1, 0.9]];
  const D4 = [[0, 'E5', 3.6, 0.95]];
  const play = (voice, bar, phrase, oct, vel, legato, pedalTo) => { for (const [b, nm, l, w] of phrase) { const t = T(bar, b), len = pedalTo ? Math.max(l * BEAT * legato, pedalTo - t) : l * BEAT * legato; N(voice, t, n(nm) + 12 * oct, vel * w, len); } };

  // ---------- bars 1 and 2: the piano alone, free and quiet ----------
  // the first note a breath after the bar line, the others on the beat
  { const [b, nm, l, w] = A[0]; N('piano', 0.3, n(nm), 0.075 * w, BAR); }
  for (const [b, nm, l, w] of A.slice(1)) N('piano', T(1, b), n(nm), 0.08 * w, T(2) - T(1, b) + 0.1);
  play('piano', 2, B, 0, 0.08, 1, T(3) + 0.1);
  const lh = (bar, c, eighths, vel, until) => { // the left hand under the pedal: root, fifth, octave, tenth ... rising and falling
    const root = low(c, 2), fifth = root + 7, third = root + (CH[c].t.indexOf((bassPc(c) + 3) % 12) >= 0 ? 15 : 16);
    const pat = eighths ? [root, fifth, root + 12, third, fifth + 12, third, root + 12, fifth] : [root, fifth, root + 12, third];
    const step = eighths ? BEAT / 2 : BEAT, end = until || T(bar + 1) + 0.1;
    pat.forEach((m, i) => N('piano', T(bar) + i * step + (bar === 1 && i === 0 ? 0.3 : 0), m, vel * (i === 0 ? 1 : 0.8), end - T(bar) - i * step));
  };
  lh(1, 'D', false, 0.04); lh(2, 'Em7', false, 0.04);

  // ---------- bars 3 to 6: the strings come in, the cello takes the tune, the harp begins, a lift at bar 5 ----------
  const prog36 = ['D', 'Em7', 'Bm', 'Asus'];
  play('cello', 3, A, -1, 0.085, 1.02); play('cello', 4, B, -1, 0.09, 1.02); play('cello', 5, C, -1, 0.1, 1.02);
  N('cello', T(6), n('E4'), 0.105, 3.6 * BEAT);
  lh(3, 'D', true, 0.03); lh(4, 'Em7', true, 0.03);
  prog36.forEach((c, i) => { // the section: high and soft above the cello, the basses under it, growing bar by bar
    const bar = 3 + i, grow = 1 + 0.35 * i;
    for (const m of spread(c, n('F#4'), n('D5'))) N('strings', T(bar), m, 0.009 * grow, BAR * 1.02);
    N('strings', T(bar), low(c, 2), 0.016 * grow, BAR * 1.02);
    if (bar >= 5) N('strings', T(bar), low(c, 1), 0.012 * grow, BAR * 1.02);
  });
  // bar 6 resolves its suspension on beat 3
  for (const m of spread('A', n('G#4'), n('D5'))) N('strings', T(6, 2), m, 0.014, BAR * 0.5);
  const harpBar = (bar, c, per, vel, lo, hi, up) => { // rising (and falling) arpeggio through the chord, per notes to the bar
    const ms = spread(c, lo, hi), path = up ? ms : ms.concat(ms.slice(1, -1).reverse());
    for (let i = 0; i < per; i++) N('harp', T(bar) + i * BAR / per, path[i % path.length], vel * (i % (per / 4) === 0 ? 1.15 : 0.9));
  };
  harpBar(5, 'Bm', 8, 0.034, n('B2'), n('F#4')); harpBar(6, 'Asus', 8, 0.038, n('A2'), n('E4'));
  N('piano', T(5), n('B5'), 0.04, BAR); N('piano', T(5, 2), n('F#6'), 0.03, BAR / 2); // the lift: a high glint on the new world
  // into the bloom: a timpani roll and a cymbal swell through the last beat of bar 6, a harp glissando up
  for (let k = 0, t = T(6, 3); t < T(7) - 0.03; k++, t += 0.058) S('timpani', t, n('A1'), 0.03 + 0.07 * (t - T(6, 3)) / BEAT);
  S('cymbal', T(6, 2), 0, 0.035, T(7) - T(6, 2));
  { const sc = []; for (let m = n('A3'); sc.length < 15; m++) if ([0, 2, 4, 6, 7, 9, 11].indexOf((m + 10) % 12) >= 0) sc.push(m); sc.forEach((m, i) => S('harp', T(6, 3) + i * BEAT / 16, m, 0.02 + 0.002 * i)); } // up the scale of D

  // ---------- bars 7 to 10: the full bloom ----------
  const tutti = (bar, beat, c, beats, vel, opts) => { // the orchestra under the tune for a chord of so many beats
    const t = T(bar, beat), L = beats * BEAT * 1.02, o = opts || {};
    N('strings', t, low(c, 1), 0.026 * vel, L); N('strings', t, low(c, 2), 0.034 * vel, L); // basses and cellos
    for (const m of spread(c, n('D3'), n('A4'))) N('strings', t, m, 0.015 * vel, L); // violas and second violins
    for (const m of spread(c, n('A3'), n('F#4')).slice(0, 2)) N('horn', t, m, 0.055 * vel * (o.horn || 1), L * 0.98);
    if (o.harp) harpOver(t, c, beats, 0.03 * vel);
    if (o.cel) celOver(t, c, beats, 0.02 * vel);
  };
  const harpOver = (t, c, beats, vel) => { const ms = spread(c, n('D3'), n('D6')), path = ms.concat(ms.slice(1, -1).reverse()), k = beats * 4; for (let i = 0; i < k; i++) N('harp', t + i * BEAT / 4, path[i % path.length], vel * (i % 4 ? 0.8 : 1.1)); };
  const celOver = (t, c, beats, vel) => { const ms = spread(c, n('D6'), n('A7')), k = beats * 2; for (let i = 0; i < k; i++) N('celesta', t + i * BEAT / 2 + 0.01, ms[(i * 3) % ms.length], vel * (0.8 + 0.4 * r())); };
  // the tune in the high violins, an octave under it in the seconds, and the cellos in the middle for warmth
  const sing = (bar, phrase, vel) => { play('violins', bar, phrase, 1, vel, 1.02); play('strings', bar, phrase, 0, vel * 0.32, 1.02); play('cello', bar, phrase, -1, vel * 0.8, 1.02); };
  S('timpani', T(7), n('D2'), 0.15); S('cymbal', T(7), 0, 0.035, 0);
  sing(7, A, 0.065); tutti(7, 0, 'D', 4, 1, { harp: 1, cel: 1 });
  // the horns answer under the tune: D E F# G F# E
  for (const [b, nm, l] of [[0, 'D4', 2], [2, 'E4', 1], [3, 'F#4', 1]]) N('horn', T(7, b), n(nm), 0.05, l * BEAT);
  sing(8, B, 0.065); tutti(8, 0, 'Em7', 4, 1.15, { harp: 1, cel: 1, horn: 0.7 });
  for (const [b, nm, l] of [[0, 'G4', 2], [2, 'F#4', 1], [3, 'E4', 1]]) N('horn', T(8, b), n(nm), 0.05, l * BEAT);
  S('timpani', T(8), n('A1'), 0.12);
  // bars 9 and 10: eight cuts, one on each beat. The tune walks down and up in tenths over the bass, and every beat is struck:
  // basses, horns and a harp chord on the beat, a timpani stroke growing through bar 10, the roll and the cymbal into bar 11
  const beats910 = [['Bm', 'D6'], ['Bm_A', 'C#6'], ['G', 'B5'], ['D_F', 'A5'], ['Em', 'G5'], ['D_F', 'A5'], ['G', 'B5'], ['A', 'C#6']];
  beats910.forEach(([c, mel], i) => {
    const bar = 9 + (i >> 2), beat = i & 3, t = T(bar, beat), up = 1 + 0.06 * i;
    N('violins', t, n(mel), 0.062 * up, BEAT * 1.02); N('strings', t, n(mel) - 12, 0.02 * up, BEAT * 1.02); N('cello', t, n(mel) - 24, 0.05 * up, BEAT);
    // (the bowed strokes a few ms apart, as players are: struck together, octaves of the same bowed spectrum would add up to sharp peaks)
    N('strings', t, low(c, 1), 0.03 * up, BEAT * 0.75); N('strings', t, low(c, 2), 0.034 * up, BEAT * 0.75);
    for (const m of spread(c, n('D3'), n('A4'))) N('strings', t, m, 0.012 * up, BEAT * 0.9);
    for (const m of spread(c, n('A3'), n('F#4')).slice(0, 2)) S('horn', t, m, 0.05 * up, BEAT * 0.7);
    const hs = spread(c, n('D3'), n('D5')); hs.forEach((m, j) => S('harp', t + j * 0.018, m, 0.03 * up));
    const cs = spread(c, n('D6'), n('D7')); S('celesta', t + 0.01, cs[i % cs.length], 0.022 * up); S('celesta', t + BEAT / 2, cs[(i + 2) % cs.length], 0.016 * up);
    if (bar === 10 && beat < 3) S('timpani', t, low(c, 1) < n('C2') ? low(c, 2) : low(c, 1), 0.09 + 0.03 * beat);
    if (bar === 9 && (beat === 0 || beat === 2)) S('timpani', t, beat ? n('A1') : n('D2'), 0.08);
  });
  for (let t = T(10, 3); t < T(11) - 0.03; t += 0.055) S('timpani', t, n('A1'), 0.035 + 0.06 * (t - T(10, 3)) / BEAT);
  S('cymbal', T(10, 1.5), 0, 0.045, T(11) - T(10, 1.5));

  // ---------- bars 11 and 12: the summit and the turn ----------
  // the head of the theme once more, a fourth higher and over a new bass (B, the sad sixth of the key), then its second bar over G and G minor, letting go
  S('timpani', T(11), n('B1'), 0.13); S('cymbal', T(11), 0, 0.05, 0);
  const A2 = [[0, 'D5', 1, 1], [1, 'B5', 2, 1.05], [3, 'A5', 1, 0.9]];
  sing(11, A2, 0.075); tutti(11, 0, 'Bm7', 4, 1.25, { harp: 1, cel: 1, horn: 1.2 });
  for (const [b, nm, l] of [[0, 'F#4', 2], [2, 'E4', 1], [3, 'D4', 1]]) N('horn', T(11, b), n(nm), 0.06, l * BEAT);
  const B2 = [[0, 'G5', 1.5, 0.9], [1.5, 'F#5', 0.5, 0.7], [2, 'E5', 2.2, 0.75]];
  play('violins', 12, B2, 1, 0.06, 1.02); play('strings', 12, B2, 0, 0.016, 1.02);
  tutti(12, 0, 'Gmaj7', 2, 1.0, { horn: 0.8 }); tutti(12, 2, 'Gm6', 2, 0.7, { horn: 0.65 });
  for (let i = 0; i < 8; i++) N('harp', T(12) + i * BEAT / 2, spread('Gmaj7', n('G3'), n('B5')).reverse()[i], 0.026 * (1 - i / 12));

  // ---------- bars 13 to 15: the piano alone again, a celesta echo, the strings hold a last soft chord ----------
  play('piano', 13, A, 0, 0.075, 1, T(14) + 0.1); lh(13, 'D', false, 0.036);
  play('piano', 14, B.slice(0, 2), 0, 0.07, 1, T(14, 2) + 0.05); N('piano', T(14, 2), n('E5'), 0.06, T(15) - T(14, 2));
  N('piano', T(14), low('Em7', 2), 0.034, 2 * BEAT); N('piano', T(14, 1), n('B2'), 0.026, BEAT); N('piano', T(14, 2), low('G_A', 2), 0.034, 2 * BEAT); N('piano', T(14, 2.5), n('G3'), 0.026, 1.5 * BEAT);
  for (const [b, nm] of [[2, 'A5'], [2.5, 'F#6'], [3.5, 'E6']]) N('celesta', T(14, b), n(nm), 0.035);
  for (const m of [n('G3'), n('B3'), n('D4')]) N('strings', T(14, 2), m, 0.008, 2 * BEAT * 1.02);
  N('strings', T(14, 2), n('A2'), 0.012, 2 * BEAT * 1.02);
  // the last chord: D with an added ninth, rolled on the piano, held by the strings, ringing out
  const fin = ['D2', 'A2', 'D3', 'F#3', 'A3', 'E4', 'F#4', 'A4', 'D5'].map(n), tf = T(15), damp = 51.0 - tf;
  fin.forEach((m, i) => N('piano', tf + i * 0.035, m, (i < 3 ? 0.04 : 0.05) * (i === fin.length - 1 ? 1.1 : 1), damp - i * 0.035));
  for (const m of [n('D3'), n('A3'), n('F#4'), n('A4'), n('E5')]) N('strings', tf, m, 0.009, 2.4);
  N('strings', tf, n('D2'), 0.012, 2.4);
  N('celesta', tf + 0.9, n('A6'), 0.02); N('celesta', tf + 1.6, n('D6'), 0.016);

  const buf = await ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1), F = L.length;

  // ---------- loudness (BS.1770: K weighting at 48 kHz, 400 ms blocks, absolute and relative gates) ----------
  const kw = (x) => { const y = new Float32Array(x.length);
    const st = [[1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585], [1, -2, 1, -1.99004745483398, 0.99007225036621]];
    y.set(x); for (const [b0, b1, b2, a1, a2] of st) { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < y.length; i++) { const xi = y[i], v = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = xi; y2 = y1; y1 = v; y[i] = v; } } return y; };
  const lufs = (L, R, a, b) => { const kl = kw(L), kr = kw(R), blk = Math.round(0.4 * SR), hop = Math.round(0.1 * SR), z = [];
    for (let i = Math.floor(a * SR); i + blk <= Math.min(F, b * SR); i += hop) { let s = 0; for (let j = i; j < i + blk; j++) s += kl[j] * kl[j] + kr[j] * kr[j]; z.push(s / blk); }
    const ld = (q) => -0.691 + 10 * Math.log10(q + 1e-12); const g1 = z.filter((q) => ld(q) > -70); if (!g1.length) return -99;
    const m1 = g1.reduce((x, y) => x + y, 0) / g1.length, g2 = g1.filter((q) => ld(q) > ld(m1) - 10); return ld(g2.reduce((x, y) => x + y, 0) / g2.length); };
  const peakOf = (L, R) => { let p = 0; for (let i = 0; i < F; i++) p = Math.max(p, Math.abs(L[i]), Math.abs(R[i])); return p; };
  const raw = { lufs: +lufs(L, R, 0, LEN).toFixed(2), peak: +peakOf(L, R).toFixed(3), peakPerBar: [] };
  for (let bb = 0; bb < 16; bb++) { let p = 0, at = 0; for (let i = Math.floor(bb * BAR * SR); i < Math.min(F, (bb + 1) * BAR * SR); i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > p) { p = a; at = i / SR; } } raw.peakPerBar.push(+p.toFixed(2) + '@' + at.toFixed(2)); }
  // gain to -16 LUFS, then a gentle peak limiter (5 ms look ahead, 120 ms release) holding the peaks at 0.88
  const CEIL = 0.88, L0 = Float32Array.from(L), R0 = Float32Array.from(R);
  let gain = Math.pow(10, (-16 - raw.lufs) / 20);
  for (let pass = 0; pass < 3; pass++) { // gain, limit, measure, and again until the loudness after the limiter is within 0.1 dB
    if (pass) { L.set(L0); R.set(R0); }
  const W = Math.round(0.005 * SR), need = new Float32Array(F);
  for (let i = 0; i < F; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])) * gain; need[i] = a > CEIL ? CEIL / a : 1; }
  const win = new Float32Array(F), dq = new Int32Array(F); let h = 0, tl = 0; // sliding minimum over the look ahead
  for (let i = F - 1; i >= 0; i--) { while (tl > h && need[dq[tl - 1]] >= need[i]) tl--; dq[tl++] = i; while (dq[h] > i + W) h++; win[i] = need[dq[h]]; }
  var env = 1, minG = 1, limited = 0; const rel = 1 - Math.exp(-1 / (0.12 * SR)), att = 1 - Math.exp(-1 / (0.0015 * SR));
  for (let i = 0; i < F; i++) { const w = win[i]; env = w < env ? env + (w - env) * att : env + (w - env) * rel; if (env > w * 1.0) env = Math.max(w, env); const k = gain * Math.min(env, need[i] < 1 ? need[i] : 1); if (env < 0.999) limited++; minG = Math.min(minG, env); L[i] *= k; R[i] *= k; }
    const got = lufs(L, R, 0, LEN); if (Math.abs(got + 16) < 0.1 || pass === 2) break; gain *= Math.pow(10, (-16 - got) / 20);
  }
  // the silence at the end: the last chord has rung out, a short fade takes the reverb's last breath away from 51.2 to 52 s
  for (let i = Math.floor(51.2 * SR); i < F; i++) { const k = Math.cos((i / SR - 51.2) / 0.8 * Math.PI / 2); L[i] *= k * k; R[i] *= k * k; }
  const fin2 = { lufs: +lufs(L, R, 0, LEN).toFixed(2), peak: +peakOf(L, R).toFixed(3), gainDb: +(20 * Math.log10(gain)).toFixed(2), limiterMaxReductionDb: +(20 * Math.log10(minG)).toFixed(2), limitedMs: Math.round(limited / SR * 1000) };
  // the curve: RMS and short term loudness per bar (and per beat in bars 9 to 11)
  const db = (a, b) => { let s = 0; const i0 = Math.floor(a * SR), i1 = Math.min(F, Math.floor(b * SR)); for (let i = i0; i < i1; i++) s += (L[i] * L[i] + R[i] * R[i]) / 2; return +(10 * Math.log10(s / Math.max(1, i1 - i0) + 1e-12)).toFixed(1); };
  const bars = []; for (let b = 1; b <= 16; b++) { const a = T(b), e = Math.min(LEN, T(b + 1)); if (a >= LEN) break; bars.push({ bar: b, from: +a.toFixed(3), rmsDb: db(a, e), lufsShort: +lufs(L, R, a, Math.max(e, a + 0.5)).toFixed(1) }); }
  const beats = []; for (let i = 0; i < 12; i++) { const a = T(9, i); beats.push(db(a, a + BEAT)); }
  // how strongly each beat is struck: level of the 120 ms after the beat against the 120 ms before it (bars 7 and 8 for comparison, bars 9 and 10 are the cuts)
  const punch = []; for (let i = 0; i < 16; i++) { const a = T(7, i); punch.push(+(db(a, a + 0.12) - db(a - 0.12, a)).toFixed(1)); }
  let pk = 0, pkAt = 0; for (let i = 0; i < F; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > pk) { pk = a; pkAt = i / SR; } }
  // the WAV: 16 bit stereo with a little triangular dither
  const b = new ArrayBuffer(44 + F * 4), v = new DataView(b), str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + F * 4, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, F * 4, true);
  let clipped = 0; const q = (x) => { let y = Math.round(x * 32767 + (r() - r())); if (y > 32767 || y < -32768) clipped++; return Math.max(-32768, Math.min(32767, y)); };
  for (let i = 0; i < F; i++) { v.setInt16(44 + i * 4, q(L[i]), true); v.setInt16(46 + i * 4, q(R[i]), true); }
  let tailDb = db(51.9, 52);
  let s = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
  return { b64: btoa(s), frames: F, seconds: F / SR, notes: count, raw, final: fin2, clippedSamples: clipped, loudestSampleAt: +pkAt.toFixed(2), last100msDb: tailDb, bars, beats9to11Db: beats, beatPunchDb_bars7to10: punch };
}, (process.env.MUTE || '').split(',').filter(Boolean)); // MUTE=harp,cymbal leaves voices out, to find what makes a peak
if (process.env.MUTE) { delete res.b64; console.log(JSON.stringify(res.raw)); await browser.close(); process.exit(0); }
fs.mkdirSync(dir + '/shots/music', { recursive: true });
fs.writeFileSync(dir + '/shots/music/trailer.wav', Buffer.from(res.b64, 'base64'));
const bar = (b, beat) => +((b - 1) * 10 / 3 + (beat || 0) * 5 / 6).toFixed(3);
const hits = {
  bpm: 72, beatsPerBar: 4, barSeconds: +(10 / 3).toFixed(4), length: 52.0,
  barLines: Array.from({ length: 16 }, (_, i) => bar(i + 1)),
  firstNote: 0.3,
  liftWorldChange: bar(5),
  rollAndSwellInto: { from: bar(6, 3), to: bar(7) },
  firstPeak: bar(7),
  cutsOnBeats: Array.from({ length: 8 }, (_, i) => bar(9, i)),
  rollAndSwellInto2: { from: bar(10, 3), to: bar(11) },
  summit: bar(11),
  turn: bar(12, 2),
  pianoAloneAgain: bar(13),
  lastChord: bar(15),
  silenceBy: 52.0,
  measuredLoudestBar: res.bars.reduce((a, b) => (b.lufsShort > a.lufsShort ? b : a)).from,
};
fs.writeFileSync(dir + '/shots/music/trailer_hits.json', JSON.stringify(hits, null, 1));
delete res.b64;
console.log(JSON.stringify(res, null, 1));
await browser.close();
