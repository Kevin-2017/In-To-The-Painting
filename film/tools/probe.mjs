// what each world holds (easels and their views, start, door, sights), for placing the cameras: film/out/worlds.json
// node film/tools/probe.mjs [worldIndex ...]
import fs from 'fs';
import { open, FILM } from './lib.mjs';
const list = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [0, 1, 2, 3];
const { browser, page } = await open({ w: 640, h: 360, log: false });
const out = fs.existsSync(FILM + '/out/worlds.json') ? JSON.parse(fs.readFileSync(FILM + '/out/worlds.json', 'utf8')) : {};
for (const wi of list) {
  const t0 = Date.now();
  const info = await page.evaluate((wi) => { const g = window.__ruhua.game; if (g.wi !== wi) g.showWorld(wi); return window.DIRECTOR.info(); }, wi);
  info.buildS = (Date.now() - t0) / 1000;
  out[wi] = info;
  console.log(wi, info.id, 'strokes', info.strokes, 'build s', info.buildS, 'spots', info.spots.length, 'sights', info.sights.map((s) => s.id).join(' '));
}
fs.mkdirSync(FILM + '/out', { recursive: true });
fs.writeFileSync(FILM + '/out/worlds.json', JSON.stringify(out, null, 1));
await browser.close();
