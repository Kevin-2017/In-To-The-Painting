// ground heights of a world: node film/tools/ground.mjs <world> '[[x,z],...]'
import { open } from './lib.mjs';
const { browser, page } = await open({ w: 320, h: 180, log: false });
const r = await page.evaluate(([wi, pts]) => { const g = window.__ruhua.game; if (g.wi !== wi) g.showWorld(wi); return window.DIRECTOR.ground(pts); }, [+process.argv[2], JSON.parse(process.argv[3])]);
console.log(JSON.stringify(r)); await browser.close();
