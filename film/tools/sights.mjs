// where the sights are over a shot's clock: node film/tools/sights.mjs <world> '<json shot fields>' s0,s1,...
import { open } from './lib.mjs';
const [wi, js, list] = process.argv.slice(2);
const { browser, page } = await open({ w: 320, h: 180, log: false });
const sh = Object.assign({ id: 'probe', world: +wi, len: 1, her: { hide: true }, cam: { keys: [{ s: 0, x: 0, z: 0, y: 5 }] } }, JSON.parse(js));
for (const s of list.split(',').map(Number)) {
  const r = await page.evaluate(([sh, s]) => { const D = window.DIRECTOR; D.prepare(sh, s); D.runTo(s); D.frame(s); return D.sightsNow(); }, [sh, s]);
  console.log('s', s, JSON.stringify(r));
}
await browser.close();
