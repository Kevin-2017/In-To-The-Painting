// PNG icons from launch/favicon.svg, drawn by Chrome: node test/icons.mjs
// The PNGs fill the whole square with the ground colour (no rounded corners), as phones cut their own shape.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const dir = '/home/claude/monet/launch';
const svg = fs.readFileSync(dir + '/favicon.svg', 'utf8');
const sizes = (process.env.SIZES || '32,180,192,512').split(',').map(Number);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-background-networking', '--no-first-run'] });
for (const n of sizes) {
  const ctx = await browser.newContext({ viewport: { width: n, height: n }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;background:#1f2238;overflow:hidden"><div style="width:${n}px;height:${n}px">${svg.replace('<svg ', `<svg width="${n}" height="${n}" style="display:block" `)}</div></body></html>`);
  await page.screenshot({ path: `${dir}/icon-${n}.png`, type: 'png', clip: { x: 0, y: 0, width: n, height: n } });
  console.log('icon', n, fs.statSync(`${dir}/icon-${n}.png`).size, 'bytes');
  await ctx.close();
}
await browser.close();
