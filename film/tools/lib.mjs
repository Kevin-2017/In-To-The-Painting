// shared by the film tools: start headless Chrome on a built game, stop its own loop, and load the director into the page
import fs from 'fs';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
export const ROOT = '/home/claude/monet';
export const FILM = ROOT + '/film';

export async function open({ dist = process.env.DIST || 'dist_new', w = 640, h = 360, q = 2, log = true } = {}) {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('console', (m) => { const t = m.text(); if (/GL Driver|GPU stall|ERR_FAILED|net::ERR/.test(t)) return; if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ' ' + t.slice(0, 400)); if (log) console.log('[page]', m.type(), t.slice(0, 400)); });
  page.on('pageerror', (e) => { errors.push('pageerror ' + e.message.slice(0, 800)); console.log('[pageerror]', e.message.slice(0, 800)); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  // the game must not change its own quality, nor keep the last visit
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('ruhua.monet.q', '2'); } catch (e) {} });
  page.setDefaultTimeout(400000);
  await page.goto('file://' + ROOT + '/' + dist + '/index.html');
  await page.waitForFunction(() => window.__ruhua && window.__ruhua.game && window.__ruhua.game.mode === 'title', null, { timeout: 200000 });
  await page.addScriptTag({ content: fs.readFileSync(FILM + '/tools/director.js', 'utf8') });
  await page.evaluate(([w, h, q]) => window.DIRECTOR.setup({ w, h, q }), [w, h, q]);
  return { browser, page, errors };
}

export function loadBoard(file = FILM + '/board.json') { return JSON.parse(fs.readFileSync(file, 'utf8')); }
