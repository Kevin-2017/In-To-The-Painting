// the frame writer: plays shots of the storyboard in the page and writes every frame as a jpeg
//   node film/tools/render.mjs <shotId,...|all> [--w 640] [--h 360] [--from k] [--to k] [--step n] [--keys] [--q 2] [--dist dist_new]
// frames go to film/frames/<W>x<H>/<shotId>/f<k>.jpg, k the frame of the shot (0 at its first frame).
// --step n writes every n-th frame (an animatic at 15 a second is --step 2), still stepping the game at 30 a second.
// --keys writes three key frames per shot (at a tenth, the middle and nine tenths), each from its own run up.
// A log of milliseconds per frame is printed and kept in film/out/timing.log.
import fs from 'fs';
import { open, FILM } from './lib.mjs';
import BOARD from '../board.mjs';
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const W = +opt('w', 640), H = +opt('h', 360), STEP = +opt('step', 1), KEYS = argv.includes('--keys'), Q = +opt('q', 2);
const ids = argv[0] === 'all' ? BOARD.shots.map((s) => s.id) : argv[0].split(',');
const { browser, page, errors } = await open({ w: W, h: H, q: Q, dist: opt('dist', process.env.DIST || 'dist_new'), log: false });
const save = (dir, k, url) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(`${dir}/f${String(k).padStart(5, '0')}.jpg`, Buffer.from(url.split(',')[1], 'base64')); };
const tlog = fs.createWriteStream(FILM + '/out/timing.log', { flags: 'a' });
const load = () => { try { return fs.readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).join(' '); } catch (e) { return '?'; } };
for (const id of ids) {
  const sh = BOARD.shots.find((s) => s.id === id);
  if (!sh) { console.log('no shot', id); continue; }
  const dir = `${FILM}/frames/${W}x${H}/${id}`, fps = BOARD.fps;
  const want = opt('at', null) ? opt('at').split(',').map(Number) : KEYS ? (sh.keys || [0.1, 0.5, 0.9].map((u) => Math.round(u * (sh.len - 1)))) : null;
  // --every N: the frames of this shot that fall on every N-th frame of the film (a strip)
  const EVERY = +opt('every', 0);
  const from = EVERY ? (EVERY - (sh.start % EVERY)) % EVERY : +opt('from', 0), to = Math.min(+opt('to', sh.len - 1), sh.len - 1);
  const STEPN = EVERY || STEP;
  let tw = Date.now(), sum = 0, n = 0;
  const shoot = async (k) => {
    const r = await page.evaluate(([k, fps]) => window.DIRECTOR.frame(k / fps), [k, fps]);
    save(dir, k, r.url); sum += r.ms + r.grabMs; n++;
    console.log(id, 'f' + k, 'render', r.ms, 'ms grab', r.grabMs, 'ms t', r.t, 'ph', r.ph, r.mode, 'her', r.pl.join(','), 'cam', r.cam.join(','), 'sun', JSON.stringify(r.sun));
  };
  if (want) {
    for (const k of want) {
      const p = await page.evaluate(([sh, s]) => window.DIRECTOR.prepare(sh, s), [sh, k / fps]);
      await page.evaluate(([s]) => window.DIRECTOR.runTo(s), [k / fps]);
      await shoot(k);
      if (p.strokes === undefined) console.log(p);
    }
  } else {
    const p = await page.evaluate(([sh, s]) => window.DIRECTOR.prepare(sh, s), [sh, from / fps]);
    console.log(id, 'prepared', JSON.stringify(p), 'run up steps', await page.evaluate(([s]) => window.DIRECTOR.runTo(s), [from / fps]));
    for (let k = from; k <= to; k++) {
      if ((k - from) % STEPN === 0) await shoot(k);
      else await page.evaluate(([s]) => window.DIRECTOR.runTo(s + 1e-3), [k / fps]); // stepped, not painted
    }
  }
  const line = `${new Date().toISOString()} ${id} ${W}x${H} q${Q} frames ${n} mean ${(sum / Math.max(1, n) / 1000).toFixed(2)} s in page, wall ${((Date.now() - tw) / 1000 / Math.max(1, n)).toFixed(2)} s per frame, load ${load()}`;
  console.log(line); tlog.write(line + '\n');
}
if (errors.length) console.log('page errors:\n' + errors.slice(0, 10).join('\n')); else console.log('errors: none');
await browser.close();
