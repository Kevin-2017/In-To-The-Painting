// her pictures for the wall: every painting caught at its own easel, hour and season, as the game itself takes it (captureHi)
//   node film/tools/pics.mjs [ids comma separated | all] [--dist dist_new]   writes film/out/pics/<id>.jpg (1620 x 1080 at quality 2)
import fs from 'fs';
import { open, FILM } from './lib.mjs';
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const want = !argv[0] || argv[0] === 'all' || argv[0].startsWith('--') ? null : argv[0].split(',');
const { browser, page } = await open({ w: 960, h: 540, q: 2, dist: opt('dist', process.env.DIST || 'dist_new'), log: false });
fs.mkdirSync(FILM + '/out/pics', { recursive: true });
for (let wi = 0; wi < 4; wi++) {
  const effects = await page.evaluate((wi) => { const g = window.__ruhua.game; if (g.wi !== wi) g.showWorld(wi); return g.ch.effects.map((e) => ({ id: e.id, spot: e.spot, phase: e.phase, t0: e.t0, t1: e.t1, hidden: !!e.hidden })); }, wi);
  for (const e of effects) {
    if (e.hidden || (want && !want.includes(e.id))) continue;
    const sh = { id: 'pic_' + e.id, world: wi, len: 1, time0: 200, clock: e.t0 + 0.5 * (e.t1 - e.t0), season: Math.max(0, e.phase), spot: e.spot, viewK: 1, her: { spot: e.spot }, cam: { game: true }, frameFrac: 0.86, runup: 2.5 };
    const t0 = Date.now();
    const url = await page.evaluate((sh) => { const D = window.DIRECTOR, g = window.__ruhua.game; D.prepare(sh, 0); D.runTo(0); D.frame(0); const hi = g.captureHi(); return hi ? hi.toDataURL('image/jpeg', 0.92) : ''; }, sh);
    if (url) fs.writeFileSync(`${FILM}/out/pics/${e.id}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
    console.log(e.id, url ? 'saved' : 'FAILED', ((Date.now() - t0) / 1000).toFixed(1), 's');
  }
}
await browser.close();
