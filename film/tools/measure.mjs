// how restless a shot is, without painting: node film/tools/measure.mjs <shotId> [fromFrame] [toFrame]
import { open } from './lib.mjs';
import B from '../board.mjs';
const [id, f0, f1] = process.argv.slice(2);
const sh = B.shots.find((s) => s.id === id);
const { browser, page } = await open({ w: 1920, h: 1080, log: false });
const a = +(f0 || 0), b = +(f1 || sh.len - 1);
const m = await page.evaluate(([sh, s0, s1]) => window.DIRECTOR.measure(sh, s0, s1), [sh, a / 30, b / 30]);
await browser.close();
const ys = m.filter((x) => x && x.sy !== null).map((x) => x.sy);
let dcy = 0, dp = 0, rev = 0, last = 0, lastK = -999, shortRev = 0;
for (let i = 1; i < m.length; i++) {
  dcy = Math.max(dcy, Math.abs(m[i].cy - m[i - 1].cy)); dp = Math.max(dp, Math.abs(m[i].pitch - m[i - 1].pitch) * 180 / Math.PI);
  if (m[i].sy !== null && m[i - 1].sy !== null) { const d = m[i].sy - m[i - 1].sy; if (Math.abs(d) > 2e-4) { const sg = Math.sign(d); if (last && sg !== last) { rev++; if (i - lastK < 90) shortRev++; lastK = i; } last = sg; } }
}
// travel: the total distance she moves up and down on the screen, and the range
let travel = 0; for (let i = 1; i < ys.length; i++) travel += Math.abs(ys[i] - ys[i - 1]);
const r = { shot: id, frames: `${a}-${b}`, screenRange: +(Math.max(...ys) - Math.min(...ys)).toFixed(3), screenTravel: +travel.toFixed(3), reversals: rev, reversalsUnder3s: shortRev,
  maxCamDyPerFrame_m: +dcy.toFixed(3), maxPitchPerFrame_deg: +dp.toFixed(3), herOffFrame: m.filter((x) => x && (x.sy === null || Math.abs(x.sy) > 0.5 || Math.abs(x.sx) > 0.5)).length, sxRange: [+Math.min(...m.map((x) => x.sx)).toFixed(2), +Math.max(...m.map((x) => x.sx)).toFixed(2)] };
console.log(JSON.stringify(r));
