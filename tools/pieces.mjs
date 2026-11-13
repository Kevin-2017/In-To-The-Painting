// Turns MIDI files (made by LilyPond from the public domain scores of the Mutopia Project) into the note lists of src/21_pieces.js.
//   node tools/pieces.mjs <folder with the .midi files>
// A note is [start, midi, length, loudness, part]: start and length in 24ths of a quarter note, loudness 1 to 9,
// part 0 the tune, 1 the bass, 2 what lies between.
import fs from 'fs';
const dir = process.argv[2] || '/tmp/midi', out = new URL('../src/21_pieces.js', import.meta.url).pathname;
const LIST = [
  // [name in the game, file, quarter notes a minute, how long a note rings at least (quarters), by, quarters in a bar, bars in a phrase]
  ['arabesque1', 'debussy_Arabesque_1.midi', 88, 1.25, 'Claude Debussy, Première Arabesque (1891). Score: Mutopia Project, Keith OHara, from Durand et Fils 1904, public domain', 4, 2],
  ['clair', 'debussy_Ste_Bergamesq_Clair.midi', 76, 1.5, 'Claude Debussy, Clair de lune, from the Suite bergamasque (1905). Score: Mutopia Project, Keith OHara, from E. Fromont 1905, public domain', 4.5, 2],
  ['gym3', 'gymnopedie_3.midi', 66, 0.5, 'Erik Satie, Gymnopédie No. 3 (1888). Score: Mutopia Project, Evin Robertson, from the Dover reprint, public domain', 3, 4],
];
function read(file) {
  const b = fs.readFileSync(file); let p = 0;
  const u32 = () => { const v = b.readUInt32BE(p); p += 4; return v; }, u16 = () => { const v = b.readUInt16BE(p); p += 2; return v; };
  const vlq = () => { let v = 0, c; do { c = b[p++]; v = (v << 7) | (c & 127); } while (c & 128); return v; };
  if (b.toString('latin1', 0, 4) !== 'MThd') throw new Error('not a MIDI file'); p = 4; u32(); u16(); const nt = u16(), div = u16();
  const notes = [], ped = [];
  for (let t = 0; t < nt; t++) {
    if (b.toString('latin1', p, p + 4) !== 'MTrk') throw new Error('bad track'); p += 4; const end = p + 4 + b.readUInt32BE(p); p += 4;
    let tick = 0, run = 0; const on = {};
    while (p < end) {
      tick += vlq(); let st = b[p];
      if (st & 128) p++; else st = run;
      if (st === 0xff) { p++; const n = vlq(); p += n; continue; }
      if (st === 0xf0 || st === 0xf7) { const n = vlq(); p += n; continue; }
      run = st; const hi = st & 0xf0, ch = st & 15;
      if (hi === 0x90 || hi === 0x80) { const k = b[p++], v = b[p++], id = ch + ':' + k;
        if (hi === 0x90 && v > 0) { (on[id] = on[id] || []).push([tick, v]); } else if (on[id] && on[id].length) { const [t0, v0] = on[id].shift(); notes.push({ t: t0 / div, d: (tick - t0) / div, m: k, v: v0, tr: t }); } }
      else if (hi === 0xb0) { const c = b[p++], v = b[p++]; if (c === 64) ped.push([tick / div, v >= 64, t]); }
      else if (hi === 0xc0 || hi === 0xd0) p++; else p += 2;
    }
    p = end;
  }
  return { notes: notes.sort((a, c) => a.t - c.t || a.m - c.m), ped: ped.sort((a, c) => a[0] - c[0]) };
}
let js = "// Made by tools/pieces.mjs from the public domain scores of the Mutopia Project (mutopiaproject.org). Do not edit by hand.\n// A note is [start, midi, length, loudness, part]: start and length in 24ths of a quarter note, loudness 1 to 9, part 0 the tune, 1 the bass, 2 between.\nconst PIECE_NOTES = {\n";
for (const [name, file, bpm, ring, by, bar, phrase] of LIST) {
  const { notes } = read(dir + '/' + file);
  // The scores carry no pedal marks and hardly a dynamic, so both are supplied here the way a pianist would by habit: every note rings on a
  // little past its written length (ring, in quarters; the low notes twice as long), the top of what the upper hand strikes together sings out,
  // the lower hand stays under it
  const tracks = {}; for (const n of notes) { const k = (tracks[n.tr] = tracks[n.tr] || { sum: 0, n: 0 }); k.sum += n.m; k.n++; }
  const upper = +Object.keys(tracks).sort((x, y) => tracks[y].sum / tracks[y].n - tracks[x].sum / tracks[x].n)[0];
  const t0 = notes[0].t, vs = notes.map((n) => n.v), lo = Math.min(...vs), hi = Math.max(...vs);
  const groups = {}; for (const n of notes) { const k = Math.round(n.t * 48); (groups[k] = groups[k] || []).push(n); }
  for (const k of Object.keys(groups)) { const g = groups[k], top = Math.max(...g.filter((n) => n.tr === upper).map((n) => n.m), -1);
    const struck = g.filter((n) => n.tr === upper).length; // (three or more together in the upper hand is a chord of the accompaniment, not the tune)
    const low = Math.min(...g.map((n) => n.m));
    // what each note is in the arrangement: 0 the tune (the top of the upper hand), 1 the bass (the lowest note where it lies low), 2 all that lies between
    for (const n of g) { n.role = n.tr === upper && struck < 3 && n.m === top ? 0 : n.m === low && n.m <= 50 ? 1 : 2;
      n.l = n.m <= 47 ? 5 : n.tr === upper ? (struck >= 3 ? (n.m === top ? 5 : 4) : n.m === top ? 7 : 5) : 4; if (hi > lo) n.l += n.v >= hi ? 1 : n.v <= lo ? -1 : 0; n.d = Math.max(n.d, n.m <= 47 ? ring * 2 : ring); } }
  // (the same key written in two voices at once is struck once)
  const seen = {}, rows = [];
  for (const n of notes) { const r = [Math.round((n.t - t0) * 24), n.m, Math.max(2, Math.round(n.d * 24)), Math.max(1, Math.min(9, n.l)), n.role], k = r[0] + ':' + r[1];
    if (seen[k]) { seen[k][2] = Math.max(seen[k][2], r[2]); seen[k][3] = Math.max(seen[k][3], r[3]); seen[k][4] = Math.min(seen[k][4], r[4]); } else { seen[k] = r; rows.push(r); } }
  const len = Math.max(...rows.map((r) => r[0] + r[2]));
  js += '  // ' + by + '\n  ' + name + ': { bpm: ' + bpm + ', bar: ' + bar + ', phrase: ' + phrase + ', len: ' + len + ', notes: ' + JSON.stringify(rows) + ' },\n';
  console.log(name, 'notes', rows.length, 'quarters', (len / 24).toFixed(1), 'minutes', (len / 24 / bpm).toFixed(2), 'velocities', lo, hi, 'upper track', upper, 'range', Math.min(...rows.map((r) => r[1])), Math.max(...rows.map((r) => r[1])));
}
js += '};\n';
fs.writeFileSync(out, js);
console.log('wrote', out, (js.length / 1024).toFixed(1), 'KiB');
