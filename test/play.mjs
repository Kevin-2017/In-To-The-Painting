// drives the built game in headless Chrome: node test/play.mjs <scenario>
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const dir = '/home/claude/monet';
const W = Number(process.env.W || 1280), H = Number(process.env.H || 720);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: process.env.LOCALE || 'zh-CN', hasTouch: !!process.env.TOUCH, isMobile: !!process.env.TOUCH });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || (m.type() === 'warning' && !/GL Driver|GPU stall/.test(t))) { if (!/ERR_FAILED|net::ERR/.test(t)) errors.push(m.type() + ' ' + t.slice(0, 500)); } });
page.on('pageerror', (e) => errors.push('pageerror ' + e.message.slice(0, 1500)));
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.addInitScript((q) => { try { if (q !== '') localStorage.setItem('ruhua.monet.q', q); } catch (e) {} }, process.env.Q === undefined ? '0' : process.env.Q);
await page.goto('file://' + dir + '/' + (process.env.DIST || 'dist') + '/index.html');
await page.waitForFunction(() => window.__ruhua && window.__ruhua.game && window.__ruhua.game.mode === 'title', null, { timeout: 100000 });
const shot = async (name) => { await page.evaluate(() => new Promise((r) => { window.__ruhua.skipRender = false; requestAnimationFrame(() => requestAnimationFrame(() => r())); })); await page.screenshot({ path: `${dir}/shots/${name}.png`, timeout: 90000 }); await page.evaluate(() => { window.__ruhua.skipRender = true; }); console.log('shot', name); };
const st = () => page.evaluate(() => { const g = window.__ruhua.game; return { mode: g.mode, wi: g.wi, caps: Object.keys(g.caps).join(','), t: +g.t.toFixed(3), ph: g.phase, spot: g.spot, vk: +g.viewK.toFixed(2), x: +g.pl.x.toFixed(1), z: +g.pl.z.toFixed(1), door: g.doorOn, auto: g.auto }; });
// fast forward the simulation without waiting on the slow software renderer; a caught picture needs one real frame
const ff = (secs) => page.evaluate((s) => { window.__ruhua.skipRender = true; const g = window.__ruhua.game; for (let i = 0; i < s * 30; i++) { g.update(1 / 30); if (g.pending) g.render(); } }, secs);
const click = (id) => page.evaluate((id) => document.getElementById(id).click(), id);
const scenario = process.argv[2] || 'title';
if (scenario === 'title') {
  await page.waitForTimeout(400); await shot('t_title');
  await page.mouse.click(40, 40); await page.waitForTimeout(1500);
  console.log('title music', await page.evaluate(() => { const a = window.__ruhua.audio; return JSON.stringify({ ctx: a.ctx ? a.ctx.state : 'none', group: !!a.group, step: a.inten, hint: document.getElementById('soundHint').className }); }));
  console.log(JSON.stringify(await st()));
} else if (scenario === 'flow') {
  await click('btnStart');
  await ff(3.2); await shot('f_begin');
  const coach = () => page.evaluate(() => { const a = window.__ruhua, c = document.getElementById('app').className; return { lesson: a.lesson ? a.lesson.id : '', seen: Object.keys(a.seen || {}).join(' '), on: document.getElementById('coach').classList.contains('on'), text: document.getElementById('coText').textContent.slice(0, 40), halo: document.getElementById('coHalo').classList.contains('on'), app: c }; });
  console.log('coach', JSON.stringify(await coach()));
  await page.evaluate(() => { const g = window.__ruhua.game; g.pl.x += 4; }); await page.waitForTimeout(3200); await shot('f_pillar'); console.log('coach', JSON.stringify(await coach()));
  await page.evaluate(() => { const g = window.__ruhua.game; g.auto = true; });
  for (let i = 0; i < 14; i++) { await ff(1.5); const s = await st(); if (i % 2 === 0) console.log(JSON.stringify(s)); if (s.spot >= 0 && s.vk > 0.99) break; }
  await ff(1.2); await shot('f_easel'); console.log('coach', JSON.stringify(await coach()));
  // the first sunrise is slow: wait for it, with a look at the dawn on the way
  for (let i = 0; i < 60; i++) { await ff(1.0); const s = await st(); if (i === 5) { await shot('f_dawn'); console.log('coach', JSON.stringify(await coach())); } if (s.caps) break; }
  await shot('f_caught');
  console.log(JSON.stringify(await st()));
  // the caption at the bottom left: there right after a catch (this renderer is too slow to see it in time, so it is shown again for the picture)
  console.log('caption', JSON.stringify(await page.evaluate(() => { const o = document.getElementById('capt'); const r = { t: document.getElementById('cpT').textContent, w: document.getElementById('cpW').textContent, cls: o.className }; o.classList.add('on'); return r; })));
  await page.waitForTimeout(1800); await page.screenshot({ path: `${dir}/shots/f_caption.png`, timeout: 90000 });
  await page.evaluate(() => document.getElementById('capt').classList.remove('on'));
  console.log('coach', JSON.stringify(await coach()));
  await click('btnHelp'); await page.waitForTimeout(900); await page.screenshot({ path: `${dir}/shots/f_help.png`, timeout: 90000 }); await click('hpClose'); await page.waitForTimeout(300);
  await click('btnAlbum'); await page.waitForTimeout(700); await shot('f_album');
  await page.evaluate(() => { const f = document.querySelector('.pic.got'); if (f) f.click(); }); await page.waitForTimeout(900); await shot('f_detail');
  console.log('detail', JSON.stringify(await page.evaluate(() => ({ on: document.getElementById('detail').classList.contains('on'), his: document.getElementById('dtHis').naturalWidth, mine: document.getElementById('dtMine').naturalWidth, title: document.getElementById('dtT').textContent, when: document.getElementById('dtW').textContent }))));
} else if (scenario === 'ui2') {
  // the paced lessons, the reward of a catch, leaving an easel, the seasons, a view of her own, the album, the card to share and the ending
  const P = process.env.PRE || 'u';
  const coach = () => page.evaluate(() => { const a = window.__ruhua, c = document.getElementById('app').className; return { lesson: a.lesson ? a.lesson.id : '', seen: Object.keys(a.seen || {}).join(' '), app: c }; });
  const freeze = (ms) => page.evaluate((ms) => { for (const a of document.getAnimations()) { if (a.effect && a.effect.target && (a.effect.target.id === 'print' || a.effect.target.className === 'dab')) { a.pause(); a.currentTime = ms; } } }, ms);
  const dom = (name) => page.screenshot({ path: `${dir}/shots/${P}_${name}.png`, timeout: 90000 }).then(() => console.log('dom', name));
  await page.evaluate(() => { window.__ruhua.learnHold = true; });
  await click('btnStart');
  await ff(3.2); await page.waitForTimeout(3400); await shot(P + '_begin'); console.log('begin', JSON.stringify(await coach()));
  await page.evaluate(() => { const a = window.__ruhua; if (a.lesson) a.lessonEnd(0.1); a.game.auto = true; });
  for (let i = 0; i < 14; i++) { await ff(1.5); const s = await st(); if (s.spot >= 0 && s.vk > 0.99) break; }
  await ff(1.2); await page.waitForTimeout(1500); await shot(P + '_easel'); console.log('easel', JSON.stringify(await coach()));
  await page.evaluate(() => { const a = window.__ruhua; if (a.lesson) a.lessonEnd(0.1); });
  for (let i = 0; i < 60; i++) { await ff(1.0); const s = await st(); if (s.caps) break; }
  await page.waitForTimeout(300); await freeze(1000); await shot(P + '_reward1'); await freeze(3150); await dom('reward2');
  await page.evaluate(() => { for (const a of document.getAnimations()) { const tg = a.effect && a.effect.target; if (tg && (tg.id === 'print' || tg.className === 'dab')) a.finish(); } }); await page.waitForTimeout(400); await dom('gain');
  console.log('caught', JSON.stringify(await st()));
  await ff(9); console.log('after the rest', JSON.stringify(await st()), JSON.stringify(await coach()));
  // on to the easel at Etretat, which has two paintings and asks for the clear day
  await page.evaluate(() => { const a = window.__ruhua, g = a.game, s = g.ch.spots[3]; if (a.lesson) a.lessonEnd(0.1); g.spotBlock = -1; g.pl.x = s.x + 7; g.pl.z = s.z + 7; g.pl.y = g.pl.yAbs = g.groundAt(g.cur, g.pl.x, g.pl.z); g.pl.alt = 0; g.auto = true; });
  for (let i = 0; i < 14; i++) { await ff(1.5); const s = await st(); if (s.spot >= 0 && s.vk > 0.99) break; }
  await ff(1.5); await page.waitForTimeout(1500); await shot(P + '_easel2'); console.log('easel2', JSON.stringify(await st()), JSON.stringify(await coach()));
  for (let i = 0; i < 80; i++) { await ff(1.0); const s = await st(); if (s.caps.split(',').length >= 2) break; }
  await page.evaluate(() => { for (const a of document.getAnimations()) { const tg = a.effect && a.effect.target; if (tg && (tg.id === 'print' || tg.className === 'dab')) a.finish(); } const b = window.__ruhua; if (b.lesson) b.lessonEnd(0.1); b.capAt -= 6; });
  await ff(5); await page.waitForTimeout(1500); await shot(P + '_easel3'); console.log('easel3', JSON.stringify(await st()), JSON.stringify(await coach()));
  await click('btnLeave'); await ff(2.5); console.log('left', JSON.stringify(await st()));
  // a view of her own
  await page.evaluate(() => { const a = window.__ruhua, g = a.game; if (a.lesson) a.lessonEnd(0.1); g.pl.x += 16; g.pl.z += 4; g.camYaw = 0.3; g.camPitch = 0.04; }); await ff(1.5);
  await click('btnFree'); await ff(2); await page.waitForTimeout(500); await shot(P + '_framing');
  await page.evaluate(() => { const a = window.__ruhua; a.skipRender = false; a.game.pendingFree = true; }); await page.waitForTimeout(2600);
  await freeze(1000); await dom('freekeep');
  console.log('frees', await page.evaluate(() => window.__ruhua.frees.length + ' share ' + document.getElementById('btnShareNow').className));
  await page.evaluate(() => { for (const a of document.getAnimations()) { const tg = a.effect && a.effect.target; if (tg && (tg.id === 'print' || tg.className === 'dab')) a.finish(); } window.__ruhua.skipRender = true; });
  await click('btnFree'); await ff(1.5);
  await click('btnAlbum'); await page.waitForTimeout(800); await dom('album');
  await page.evaluate(() => { const f = document.querySelectorAll('.pic.got')[1]; if (f) f.click(); }); await page.waitForTimeout(700); await dom('detail');
  await click('dtSave'); await page.waitForTimeout(2500);
  const card = await page.evaluate(() => { const im = document.getElementById('shareImg'); return { w: im.naturalWidth, h: im.naturalHeight, b64: im.src.split(',')[1] || '' }; }); console.log('card', card.w, card.h);
  if (card.b64) (await import('fs')).writeFileSync(`${dir}/shots/${P}_card.png`, Buffer.from(card.b64, 'base64'));
  await click('dtBack'); await page.waitForTimeout(300); await click('alClose'); await page.waitForTimeout(300);
  // the ending, with every painting given her own first picture
  await page.evaluate(() => { const a = window.__ruhua, g = a.game, u = g.caps.c1; for (const ch of [0, 1, 2, 3]) { /* worlds are not in scope here: the ids are */ } for (const id of ['c1','c2','c3','c4','c5','a1','a2','a3','a4','a5','f1','f2','f3','f4','f5','f6','f7','f8','p1','p2','p3','p4','p5','p6','p7']) if (!g.caps[id]) g.caps[id] = u; g.days = 37; a.ended = true; a.openFinale(false); });
  await page.waitForTimeout(9000); await page.evaluate(() => { window.__ruhua.skipRender = false; }); await page.waitForTimeout(4000); await dom('finale');
  await click('fnShare'); await page.waitForTimeout(3500);
  const po = await page.evaluate(() => { const im = document.getElementById('fnImg'); return { w: im.naturalWidth, h: im.naturalHeight, b64: im.src.split(',')[1] || '' }; }); console.log('poster', po.w, po.h);
  if (po.b64) (await import('fs')).writeFileSync(`${dir}/shots/${P}_poster.png`, Buffer.from(po.b64, 'base64'));
  await click('fnBack'); await page.waitForTimeout(600);
  await click('btnAlbum'); await page.waitForTimeout(800); await dom('album2');
} else if (scenario === 'cap') {
  // one painting caught: the large picture, the print, staying at the easel, the card
  await page.evaluate(() => { window.__ruhua.learnHold = true; });
  await click('btnStart'); await ff(3.2);
  await page.evaluate(() => { window.__ruhua.game.auto = true; });
  for (let i = 0; i < 14; i++) { await ff(1.5); const s = await st(); if (s.spot >= 0 && s.vk > 0.99) break; }
  for (let i = 0; i < 60; i++) { await ff(1.0); const s = await st(); if (s.caps) break; }
  const info = await page.evaluate(() => { const g = window.__ruhua.game; return { big: (g.big.c1 || '').length, small: (g.caps.c1 || '').length, hi: g.hi ? g.hi.width + 'x' + g.hi.height : '', fb: g.R.fbW + 'x' + g.R.fbH, b64: (g.big.c1 || '').split(',')[1] || '' }; });
  console.log('caught', JSON.stringify({ big: info.big, small: info.small, hi: info.hi, fb: info.fb }));
  if (info.b64) (await import('fs')).writeFileSync(`${dir}/shots/cap_big.jpg`, Buffer.from(info.b64, 'base64'));
  await page.evaluate(() => { for (const a of document.getAnimations()) { const tg = a.effect && a.effect.target; if (tg && (tg.id === 'print' || tg.className === 'dab')) { a.pause(); a.currentTime = 1000; } } });
  await shot('cap_print');
  await page.evaluate(() => { for (const a of document.getAnimations()) { const tg = a.effect && a.effect.target; if (tg && (tg.id === 'print' || tg.className === 'dab')) a.finish(); } });
  await ff(12); await page.waitForTimeout(1500); await shot('cap_stay');
  console.log('after the rest', JSON.stringify(await st()), await page.evaluate(() => { const a = window.__ruhua; return (a.lesson ? a.lesson.id : '') + ' | ' + document.getElementById('btnLeave').className; }));
  await click('btnAlbum'); await page.waitForTimeout(600);
  await page.evaluate(() => { const f = document.querySelector('.pic.got'); if (f) f.click(); }); await page.waitForTimeout(700);
  await click('dtSave'); await page.waitForTimeout(2500);
  const card = await page.evaluate(() => { const im = document.getElementById('shareImg'); return { w: im.naturalWidth, h: im.naturalHeight, b64: im.src.split(',')[1] || '' }; }); console.log('card', card.w, card.h);
  if (card.b64) (await import('fs')).writeFileSync(`${dir}/shots/cap_card.png`, Buffer.from(card.b64, 'base64'));
} else if (scenario === 'hid') {
  // every world's hidden painting: not sought before it is found, found by coming near, then caught like any other
  await click('btnStart'); await ff(3);
  for (let wi = 0; wi < 4; wi++) {
    const info = await page.evaluate((wi) => { const a = window.__ruhua, g = a.game; g.showWorld(wi); g.mode = 'play'; a.show('hud'); const i = g.ch.spots.findIndex((s) => s.hidden), s = g.ch.spots[i]; g.pl.x = s.x + 22; g.pl.z = s.z + 6; g.pl.y = g.pl.yAbs = g.groundAt(g.cur, g.pl.x, g.pl.z); g.pl.alt = 0; g.auto = true; return { i, x: s.x, z: s.z, id: g.ch.effects.find((e) => e.hidden).id }; }, wi);
    await ff(3); const s0 = await st();
    console.log('world', wi, JSON.stringify(info), 'seeks elsewhere before found:', Math.hypot(s0.x - info.x - 22, s0.z - info.z - 6) > 1);
    await page.evaluate((info) => { const g = window.__ruhua.game; g.auto = false; g.pl.vx = g.pl.vz = 0; g.pl.x = info.x + 9; g.pl.z = info.z + 3; g.pl.y = g.pl.yAbs = g.groundAt(g.cur, g.pl.x, g.pl.z); g.pl.alt = 0; }, info);
    await ff(1); const found = await page.evaluate(() => JSON.stringify(window.__ruhua.game.found));
    await page.evaluate(() => { window.__ruhua.game.auto = true; });
    let got = false;
    for (let k = 0; k < 90 && !got; k++) { await ff(2); got = await page.evaluate((id) => !!window.__ruhua.game.caps[id], info.id); }
    console.log('  found', found, 'caught', info.id, got, JSON.stringify(await st()));
    if (got) { await page.evaluate(() => { for (const a of document.getAnimations()) { const tg = a.effect && a.effect.target; if (tg && (tg.id === 'print' || tg.className === 'dab')) a.finish(); } }); await ff(5); await shot('hid_' + wi); }
  }
  await click('btnAlbum'); await page.waitForTimeout(800); await page.screenshot({ path: `${dir}/shots/hid_album.png`, timeout: 90000 });
} else if (scenario === 'hand') {
  // the later worlds wait for her hand: the season in the fields, the season and the sun at the pond. Played properly, then left alone
  await click('btnStart'); await ff(3);
  const state = () => page.evaluate(() => { const g = window.__ruhua.game; return { spot: g.spot, vk: +g.viewK.toFixed(2), need: g.needHand || '', help: !!g.helpOn, manual: !!g.manual, t: +g.t.toFixed(3), ph: g.phase, caps: Object.keys(g.caps).length, lesson: window.__ruhua.lesson ? window.__ruhua.lesson.id : '' }; });
  for (const wi of [2, 3]) {
    await page.evaluate((wi) => { const a = window.__ruhua, g = a.game; g.showWorld(wi); g.mode = 'play'; a.show('hud'); g.auto = true; }, wi);
    let acted = 0, helped = 0, n0 = (await state()).caps, lessons = {};
    for (let k = 0; k < 400; k++) {
      await ff(1);
      const s = await state();
      if (s.lesson) lessons[s.lesson] = 1;
      if (s.help) helped++;
      if (s.spot < 0) { await page.evaluate(() => { const g = window.__ruhua.game; if (g.mode === 'play') g.auto = true; }); continue; }
      const left = await page.evaluate(() => { const g = window.__ruhua.game; if (!g.anyLeftAtSpot()) { g.leaveSpot(); g.spotBlock = -1; return false; } return true; });
      if (!left || s.vk < 0.99 || !s.need) continue;
      // what a player does: a season that still holds a painting of this easel, then (at the pond) the sun onto its arc
      acted += await page.evaluate(() => { const g = window.__ruhua.game, e = g.ch.effects.find((x) => x.spot === g.spot && !g.caps[x.id] && (x.phase < 0 || x.phase === g.phase)) || g.ch.effects.find((x) => x.spot === g.spot && !g.caps[x.id]);
        if (g.needHand === 'season') { g.setPhase(e.phase); return 1; }
        if (g.needHand === 'sun') { g.setTime(e.t0 + 0.4 * (e.t1 - e.t0)); return 1; } return 0; });
      const got = (await state()).caps - n0, all = await page.evaluate(() => window.__ruhua.game.ch.effects.filter((e) => !e.hidden).length);
      if (got >= all) break;
    }
    const s = await state();
    console.log('world', wi, 'caught', s.caps - n0, 'by hand, acts', acted, 'frames helped', helped, 'lessons', Object.keys(lessons).join(' '), JSON.stringify(s));
  }
  // left alone at an easel that needs her hand: after twenty seconds the light goes on by itself
  const alone = await page.evaluate(() => { const a = window.__ruhua, g = a.game; g.caps = {}; g.showWorld(3); g.mode = 'play'; a.show('hud'); g.auto = true; return 1; });
  let t0 = -1, tHelp = -1, tCap = -1;
  for (let k = 0; k < 240 && tCap < 0; k++) { await ff(1); const s = await state(); if (s.spot < 0) { await page.evaluate(() => { window.__ruhua.game.auto = true; }); continue; } if (s.need && t0 < 0) t0 = k; if (s.help && tHelp < 0) tHelp = k; if (s.caps > 0) tCap = k; }
  console.log('left alone at the pond: asked at', t0, 's, light went on by itself at', tHelp, 's, caught at', tCap, 's');
  // a small picture not yet caught cannot be hurried, a caught one can be asked for again
  await page.evaluate(() => { window.__ruhua.skipRender = false; }); await page.waitForTimeout(600);
  const th = await page.evaluate(() => { const g = window.__ruhua.game, out = []; for (const d of document.querySelectorAll('#thumbs .th')) { g.wantId = null; d.click(); out.push(d.dataset.id + (g.caps[d.dataset.id] ? ' caught' : ' open') + ' want=' + (g.wantId || '-')); } return out.join(' | ') + ' | card: ' + (window.__ruhua.lesson ? window.__ruhua.lesson.id : ''); });
  console.log('thumbs', th);
  await shot('hand_end');
} else if (scenario === 'met') {
  // a sight that shows before her is met after a moment in view, said once, kept in the album and in the save
  await click('btnStart'); await ff(3);
  const r = await page.evaluate(() => {
    const a = window.__ruhua, g = a.game, log = [];
    let on = false;
    a.SIGHTS.add({ worlds: ['coast'], list: () => [{ id: 't_one', name: { zh: '归航的渔船', en: 'The boats come home' }, hint: { zh: '黄昏，港口外', en: 'Dusk, off the harbour' } }, { id: 't_two', name: { zh: '绕着针岩的海鸥', en: 'Gulls round the Needle' }, hint: { zh: '正午，埃特勒塔', en: 'Noon, Etretat' } }],
      now: (g) => (on ? [{ id: 't_one', x: g.pl.x + Math.sin(g.camYaw) * 60, y: g.pl.y + 6, z: g.pl.z - Math.cos(g.camYaw) * 60, r: 12, k: 1 }, { id: 't_two', x: g.pl.x - Math.sin(g.camYaw) * 60, y: g.pl.y + 6, z: g.pl.z + Math.cos(g.camYaw) * 60, r: 12, k: 1 }] : []) });
    a.SIGHTS.enter(g);
    const ff = (s) => { for (let i = 0; i < s * 30; i++) { g.update(1 / 30); if (i % 15 === 0) g.render(); } };
    ff(1); log.push('nothing showing: met ' + Object.keys(g.met).join(','));
    on = true; ff(1); log.push('one second in view: met ' + Object.keys(g.met).join(','));
    ff(1.5); log.push('two and a half: met ' + Object.keys(g.met).join(',') + ' (the one behind her must not count)');
    log.push('toast ' + document.getElementById('met').className + ' ' + document.getElementById('metK').textContent + ' ' + document.getElementById('metN').textContent);
    log.push('saved ' + JSON.stringify(JSON.parse(localStorage.getItem('ruhua.monet.v1')).met));
    return log;
  });
  console.log(r.join('\n'));
  await click('btnAlbum'); await page.waitForTimeout(600);
  console.log('album row', await page.evaluate(() => [...document.querySelectorAll('.metrow')].map((x) => x.textContent).join(' || ')));
  await page.screenshot({ path: `${dir}/shots/met_album.png`, timeout: 180000 });
} else if (scenario === 'see') {
  // the real sights: she is put where one can be seen at its hour and season, and it must be met.  SEE='[{"wi":2,"t":0.745,"phase":1,"x":60,"z":40,"yaw":-0.96,"pitch":0.22,"alt":0}]'
  await click('btnStart'); await ff(3);
  for (const c of JSON.parse(process.env.SEE || '[]')) {
    const r = await page.evaluate((c) => {
      const a = window.__ruhua, g = a.game;
      if (g.wi !== c.wi) { g.showWorld(c.wi); g.mode = 'play'; a.show('hud'); }
      g.met = {}; g.metT = {}; g.advanceTime = () => {}; g.t = c.t; g.phase = g.prevPhase = c.phase; g.phShown = null; g.auto = false;
      const p = g.pl; p.x = c.x; p.z = c.z; p.alt = c.alt || 0; p.y = p.yAbs = g.groundAt(g.cur, p.x, p.z) + p.alt; p.vx = p.vz = 0; p.heading = c.yaw; g.camYaw = c.yaw; g.camPitch = c.pitch === undefined ? 0.1 : c.pitch;
      const hold = () => { p.x = c.x; p.z = c.z; p.alt = c.alt || 0; p.y = p.yAbs = g.groundAt(g.cur, p.x, p.z) + p.alt; p.vx = p.vz = 0; g.camYaw = c.yaw; g.camPitch = c.pitch === undefined ? 0.1 : c.pitch; };
      for (let i = 0; i < 150; i++) { hold(); g.update(1 / 30); if (i % 10 === 0) g.render(); }
      return { list: a.SIGHTS.list(g.ch).map((x) => x.id).join(','), now: a.SIGHTS.now(g).map((x) => x.id + ' k' + (x.k === undefined ? 1 : x.k).toFixed(2)).join(','), met: Object.keys(g.met).join(','), toast: document.getElementById('metN').textContent };
    }, c);
    console.log('see', JSON.stringify(c), '=>', JSON.stringify(r));
  }
} else if (scenario === 'trans') {
  // one repainting from the coast to Argenteuil, seen at chosen moments
  await click('btnStart'); await ff(3);
  await page.evaluate((door) => { const g = window.__ruhua.game; g.rewind = null; g.t = 0.42; g.phase = g.prevPhase = 1; g.phShown = null; g.camPitch = -0.1;
    if (door) { const d = g.ch.door; g.pl.x = d.x; g.pl.z = d.z; g.pl.y = g.pl.yAbs = g.groundAt(g.cur, d.x, d.z); g.pl.alt = 0; g.camYaw = 1.2; } // as the game does it: from the golden frame
    g.startTransition(Number(new URLSearchParams(location.search).get('to') || 1)); }, !!process.env.DOOR);
  console.log('way over the land (q, height kept clear)', await page.evaluate(() => { const tr = window.__ruhua.game.trans, out = []; for (let j = 0; j <= 64; j += 8) out.push((j / 64).toFixed(2) + ' ' + tr.env[j].toFixed(1)); return out.join('  '); }));
  const qs = (process.env.QS || '0.07,0.16,0.27,0.4,0.5,0.6,0.7,0.82,0.94').split(',').map(Number);
  for (let i = 0; i < qs.length; i++) {
    const r = await page.evaluate((q) => { const g = window.__ruhua.game; window.__ruhua.skipRender = true; let n = 0; while (g.trans && g.trans.t / g.trans.dur < q && n++ < 2000) g.update(1 / 30); return g.trans ? +(g.trans.t / g.trans.dur).toFixed(3) : -1; }, qs[i]);
    await shot('tr_' + i); console.log('q', qs[i], r, await page.evaluate(() => { const g = window.__ruhua.game, p = g.pl, tr = g.trans; return tr ? 'she ' + p.y.toFixed(1) + ' old land ' + g.groundAt(tr.fromW, p.x, p.z).toFixed(1) + ' new land ' + g.groundAt(tr.toW, p.x, p.z).toFixed(1) + ' eye ' + g.cam.pos[1].toFixed(1) : ''; }));
  }
} else if (scenario === 'reach') {
  // the reach of an easel's light, and what a step off the easel costs. World by WORLD (0), an easel with a painting still to catch
  await click('btnStart'); await ff(3);
  const wi = Number(process.env.WORLD || 1);
  const put = (dx, extra) => page.evaluate(([wi, dx, extra]) => {
    const a = window.__ruhua, g = a.game;
    if (g.wi !== wi || extra === 'fresh') { g.caps = {}; g.showWorld(wi); }
    g.mode = 'play'; a.show('hud'); if (a.lesson) a.lessonEnd(0.1);
    const i = g.ch.spots.findIndex((sp, k) => !sp.hidden && g.spotOpen(k)), sp = g.ch.spots[i];
    g.auto = false; g.keys = {}; g.joy[0] = g.joy[1] = 0; g.flyHeld = false;
    if (g.spot >= 0) g.leaveSpot(); g.spotBlock = -1; g.spotHold = 0; g.viewK = 0;
    g.pl.x = sp.x + dx; g.pl.z = sp.z; g.pl.vx = g.pl.vz = 0; g.pl.alt = extra === 'air' ? 8 : 0; g.pl.valt = 0; g.pl.y = g.pl.yAbs = g.groundAt(g.cur, g.pl.x, g.pl.z) + g.pl.alt;
    return i;
  }, [wi, dx, extra || '']);
  const run = (secs, keys, joy) => page.evaluate(([s, keys, joy]) => { window.__ruhua.skipRender = true; const g = window.__ruhua.game; for (const k of keys || []) g.keys[k] = true; if (joy) { g.joy[0] = joy[0]; g.joy[1] = joy[1]; } for (let i = 0; i < Math.round(s * 30); i++) { g.update(1 / 30); if (g.pending) g.render(); } for (const k of keys || []) g.keys[k] = false; if (joy) { g.joy[0] = g.joy[1] = 0; } }, [secs, keys || null, joy || null]);
  const q = () => page.evaluate(() => { const g = window.__ruhua.game, sp = g.ch.spots[g.spot >= 0 ? g.spot : g.ch.spots.findIndex((s2, k) => !s2.hidden && g.spotOpen(k))]; return { spot: g.spot, block: g.spotBlock, vk: +g.viewK.toFixed(2), d: sp ? +Math.hypot(sp.x - g.pl.x, sp.z - g.pl.z).toFixed(2) : -1, alt: +g.pl.alt.toFixed(1), caps: Object.keys(g.caps).length }; });
  const res = {};
  // 1. standing at 3.2 m: outside the light now (it took her at 4.8 before). At 2.3 m: taken
  await put(3.2, 'fresh'); await run(1.5); res.at3_2 = await q();
  await put(2.3); await run(1.5); res.at2_3 = await q();
  // 2. in the air at 8 m over its foot: not taken (it was, up to 10)
  await put(0.5, 'air'); await page.evaluate(() => { const g = window.__ruhua.game; g.pl.valt = 0; }); await run(0.2); res.air8 = await q();
  // 3. settled at the easel, a key tapped for 0.13 s: she stays
  await put(1.0); await run(4.0); res.settled = await q();
  await run(0.13, ['KeyW']); await run(0.5); res.afterTap = await q();
  // 4. a step: the key held 0.5 s, then let go. She steps off, stands, and the light takes her back
  await run(0.5, ['KeyW']); res.afterStep = await q();
  let back = -1; for (let k = 0; k < 30 && back < 0; k++) { await run(0.1); const s = await q(); if (s.spot >= 0) back = (k + 1) * 0.1; }
  res.backAfter = +back.toFixed(1); res.back = await q();
  // 5. walking on out of the light: the key held 2.5 s. She is free, and stays free
  await run(2.5, ['KeyW']); await run(1.5); res.walkedOff = await q();
  // 6. the stick that brought her in, still held 2.4 s after she was taken: she is not carried off
  await put(2.4); await run(2.6, null, [-1, 0]); res.stickHeld = await q();
  await run(1.0); res.stickAfter = await q();
  // 7. and from there the painting is caught as before
  await page.evaluate(() => { const a = window.__ruhua; if (a.lesson) a.lessonEnd(0.1); });
  let cap = -1; for (let k = 0; k < 90 && cap < 0; k++) { await ff(1); const s = await q(); if (s.caps > 0) cap = k + 1; }
  res.caughtAfter = cap; res.end = await q();
  console.log(JSON.stringify(res, null, 1));
} else if (scenario === 'all') {
  await click('btnStart');
  await ff(3);
  let last = '';
  for (let wld = 0; wld < 4; wld++) {
    let guard = 0, s = await st();
    console.log('world', wld, JSON.stringify(s));
    while (guard++ < 260) {
      await page.evaluate(() => { const g = window.__ruhua.game; if (g.mode === 'play' && g.spot < 0) g.auto = true; });
      await ff(4);
      s = await st();
      if (s.caps !== last) { last = s.caps; console.log(guard, JSON.stringify(s)); if (process.env.SHOTS) await shot('all_w' + wld + '_' + s.caps.split(',').length); }
      // nothing left to catch at this easel: step away so the walker looks for the next
      const stuck = await page.evaluate(() => { const g = window.__ruhua.game; if (g.spot >= 0 && !g.anyLeftAtSpot()) { g.leaveSpot(); g.spotBlock = -1; return true; } return false; });
      if (s.wi !== wld && s.mode === 'play') break;
      if (wld === 3 && s.caps.split(',').length >= 25) break;
    }
    if (guard >= 260) { console.log('STUCK', JSON.stringify(s)); await shot('all_stuck_w' + wld); break; }
  }
  console.log(JSON.stringify(await st()));
  await shot('all_end');
  await click('btnAlbum'); await page.waitForTimeout(700); await shot('all_album');
}
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
