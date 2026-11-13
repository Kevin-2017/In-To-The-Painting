// ---------- interface and main loop ----------
const $ = (id) => document.getElementById(id);
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage may be unavailable */ } },
};
const SVGNS = 'http://www.w3.org/2000/svg';
// the large pictures are kept in the browser's own store, which has room for them. Where there is none they last as long as the page is open
const PICS = {
  db: null,
  open() { return new Promise((res) => { try { const r = indexedDB.open('ruhua-monet', 1); r.onupgradeneeded = () => { try { r.result.createObjectStore('pics'); } catch (e) { /* there already */ } }; r.onsuccess = () => { this.db = r.result; res(true); }; r.onerror = () => res(false); r.onblocked = () => res(false); } catch (e) { res(false); } }); },
  put(k, dataUrl) { try { if (!this.db || !dataUrl) return; const bin = atob(dataUrl.split(',')[1]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); this.db.transaction('pics', 'readwrite').objectStore('pics').put(new Blob([u8], { type: 'image/jpeg' }), k); } catch (e) { /* kept for this visit only */ } },
  del(k) { try { if (this.db) this.db.transaction('pics', 'readwrite').objectStore('pics').delete(k); } catch (e) { /* nothing to take away */ } },
  all() { return new Promise((res) => { const out = {}; try { const rq = this.db.transaction('pics').objectStore('pics').openCursor(); rq.onsuccess = () => { const c = rq.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); }; rq.onerror = () => res(out); } catch (e) { res(out); } }); },
};
// the sun's road on the dial: x and y for a time of day
const dialXY = (t) => { const a = Math.PI * clamp((t - 0.25) / 0.5, 0, 1); return [132 - 116 * Math.cos(a), 66 - 52 * Math.sin(a)]; };
// the signs of the screen, drawn small for the guide
const SIGN_SVG = {
  pillar: '<rect x="30.6" y="1" width="2.8" height="27" rx="1.4" fill="#fffaf0" opacity=".8"/><circle cx="32" cy="28" r="4.4" fill="#ffc65c"/>',
  arc: '<line x1="3" y1="28" x2="61" y2="28" stroke="rgba(255,250,240,.45)"/><path d="M6 28 A26 22 0 0 1 58 28" fill="none" stroke="rgba(255,250,240,.6)" stroke-width="1.2"/><circle cx="17.5" cy="9.8" r="4.6" fill="#ffc65c" stroke="#fffaf0" stroke-width="1.2"/>',
  window: '<line x1="3" y1="28" x2="61" y2="28" stroke="rgba(255,250,240,.45)"/><path d="M6 28 A26 22 0 0 1 58 28" fill="none" stroke="rgba(255,250,240,.6)" stroke-width="1.2"/><path d="M22.3 7.6 A26 22 0 0 1 41.7 7.6" fill="none" stroke="#ffc65c" stroke-width="3.6" stroke-linecap="round"/>',
  dots: '<rect x="3" y="10" width="27" height="14" rx="7" fill="rgba(255,250,240,.22)" stroke="#fffaf0" stroke-width="1.2"/><circle cx="11" cy="17" r="3.3" fill="#8fc27a"/><rect x="34" y="10" width="27" height="14" rx="7" fill="none" stroke="rgba(255,250,240,.5)"/><circle cx="42" cy="17" r="3.3" fill="#e8a04a"/><circle cx="59" cy="10" r="2.5" fill="#ffc65c"/>',
  ring: '<circle cx="32" cy="17" r="12" fill="none" stroke="rgba(255,250,240,.45)" stroke-width="2.2"/><path d="M32 5 A12 12 0 1 1 20.6 13.3" fill="none" stroke="#ffc65c" stroke-width="3.2" stroke-linecap="round"/><circle cx="32" cy="17" r="3" fill="#ffc65c"/>',
  frame: '<rect x="12" y="4" width="40" height="26" fill="none" stroke="rgba(255,250,240,.5)"/><path d="M12 30 V4 H52 V18" fill="none" stroke="#ffc65c" stroke-width="2.4"/>',
  thumbs: '<rect x="8" y="10" width="20" height="14" fill="rgba(255,250,240,.7)" stroke="#f7f3ea" stroke-width="1.6"/><rect x="36" y="10" width="20" height="14" fill="none" stroke="#ffc65c" stroke-width="1.4"/>',
  marker: '<circle cx="32" cy="20" r="8" fill="none" stroke="#ffc65c" stroke-width="1.6"/><path d="M32 4 l4.2 6 h-8.4 z" fill="#ffc65c"/>',
  motes: '<circle cx="8" cy="25" r="2.6" fill="#ffd978"/><circle cx="19" cy="17" r="2.9" fill="#ffd978"/><circle cx="32" cy="12" r="3.2" fill="#ffe08a"/><circle cx="45" cy="13" r="2.9" fill="#ffd978"/><circle cx="57" cy="20" r="2.6" fill="#ffd978"/>',
  door: '<rect x="22" y="3" width="20" height="28" fill="none" stroke="#e0b84c" stroke-width="3.2"/>',
};

const App = {
  lang: 'zh', game: null, audio: null, panel: false, coarse: false, ended: false,
  drag: null, touchMove: null, touchLook: null, dialDrag: false,
  timers: {}, dialKey: '', thumbKey: '', hinted: {}, frameW: 0,
  origKey: '', origSt: '', themeSpot: -1, detail: null,
  seen: null, lesson: null, gapUntil: 0, lostT: 0, idleT: 0, walked: 0, phaseSeen: -1, capN: 0, learnAt: 0, thumbsMixed: false, dialShown: false,
  helpOn: false, capAt: 0, albumSeen: false, frees: [], finaleOn: false, finaleDue: 0,

  t(o) { return o ? (o[this.lang] !== undefined ? o[this.lang] : o.zh) : ''; },
  later(name, ms, fn) { clearTimeout(this.timers[name]); this.timers[name] = setTimeout(fn, ms); },

  init() {
    this.lang = LS.get('ruhua.lang', 'en') === 'zh' ? 'zh' : 'en'; // English, until she chooses otherwise at the top of the title
    this.coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    { const ua = navigator.userAgent || ''; this.ios = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); } // an iPhone or an iPad, whatever the browser
    if (ENERGY) { LESSONS.fly.text = FLY_ENERGY.text; LESSONS.fly.touch = FLY_ENERGY.touch; } // (0.9) flying is taught with its beats
    this.ended = LS.get('ruhua.monet.fin', '') === '1';
    if (this.coarse) $('app').classList.add('coarse');
    try { this.frees = JSON.parse(LS.get('ruhua.monet.free', '[]')) || []; } catch (e) { this.frees = []; }
    $('loading').textContent = this.t(UI.loading);
    this.audio = new Music();
    this.audio.vol = clamp(parseFloat(LS.get('ruhua.vol', '0.75')) || 0, 0, 1);
    $('vol').value = Math.round(this.audio.vol * 100);
    try {
      this.game = new Game($('view'), this, this.audio);
    } catch (e) {
      $('loading').textContent = this.t(UI.noGL);
      console.error(e);
      return;
    }
    const g = this.game;
    // the large pictures of earlier visits come back from the store
    PICS.open().then((ok) => (ok ? PICS.all() : {})).then((m) => { for (const k in m) if (!g.big[k]) { try { g.big[k] = URL.createObjectURL(m[k]); } catch (e) { /* the small one will do */ } } }).catch(() => {});
    // keep the walker's place if the page is republished while open
    try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ save: g.saveState(), lang: this.lang })); } catch (e) { /* not in the viewer */ }
    g.quality = this.coarse ? 1 : 2;
    const sq = LS.get('ruhua.monet.q', '');
    if (sq !== '') { g.quality = clamp(parseInt(sq, 10) || 0, 0, 2); g.autoQuality = false; }
    else if (this.coarse) g.setSaver(parseInt(LS.get('ruhua.monet.sv', '0'), 10) || 0); // a phone begins on the step it was found able to paint with time to spare
    else {
      // what this machine was found able to keep up with on an earlier visit is where it begins now (it may still go lower)
      const sa = LS.get('ruhua.monet.qa', '');
      if (sa !== '') g.quality = Math.min(g.quality, clamp(parseInt(sa, 10) || 0, 0, 2));
    }
    if (this.coarse) g.saver = true; // thirty pictures a second on a phone, whatever setting was chosen by hand
    this.fit();
    window.addEventListener('resize', () => this.fit());
    // build the first painting on the next frames so the loading line can show first
    requestAnimationFrame(() => requestAnimationFrame(() => {
      g.boot();
      this.bind();
      this.texts();
      this.show('title'); $('btnLang').style.display = '';
      $('loading').classList.add('gone');
      this.last = performance.now();
      const loop = (now) => {
        // a phone or a tablet is given thirty pictures a second, not sixty or more: half the work, and it stays cool in the hand
        if (g.saver && now - this.last < 29) { requestAnimationFrame(loop); return; }
        const real = (now - this.last) / 1000, dt = Math.min(0.05, Math.max(0.001, real));
        this.last = now;
        try {
          // while the album lies open over the painting, the day waits and nothing is repainted
          const rest = (this.panel || this.helpOn) && now - this.panelAt > 900 && g.mode === 'play';
          if (!document.hidden && !rest) { g.update(dt); if (!this.skipRender) { g.render(); g.trackFps(real); } this.frame(); }
          else if (!document.hidden && rest && g.building) g.pump(20); // (behind it, the next world can be painted without being felt)
        } catch (e) { if (!this.failed) { this.failed = true; console.error(e); } }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }));
  },
  fit() {
    const r = $('app').getBoundingClientRect(), w = Math.max(2, r.width), h = Math.max(2, r.height), app = $('app'), g = this.game;
    // three shapes of screen: wide (a desk, a tablet on its side), upright (a phone as it is held), low (a phone on its side).
    // The picture leaves a band free for the clock and the way out: under it, or on a low screen beside it
    const tall = h > w * 1.02, low = !tall && h < 480, frac = tall ? 0.9 : low ? 0.74 : 0.8;
    g.frameFrac = frac;
    g.resize(w, h, window.devicePixelRatio || 1);
    const fh = Math.min(h * frac, (w * frac) / 1.5), fw = fh * 1.5, f = $('frame'), bb = (h - fh) / 2, bs = (w - fw) / 2;
    f.style.width = fw.toFixed(1) + 'px'; f.style.height = fh.toFixed(1) + 'px';
    app.classList.toggle('lay-tall', tall); app.classList.toggle('lay-low', low);
    this.lay = { w, h, fw, fh, bb, bs, tall, low };
    const ds = tall ? (this.coarse ? 1.12 : 1) : low ? clamp((bs - 20) / 264, 0.5, 0.85) : clamp((bb - 8) / 78, 0.45, 1); // the size of the clock at an easel
    const cb = tall ? clamp((bb - 150) / 2 + 30, 58, 120) : Math.max(2, (bb - 78 * ds) / 2);
    const set = (k, v) => app.style.setProperty(k, v);
    set('--ds', ds.toFixed(3)); set('--cb', cb.toFixed(1) + 'px'); set('--bb', bb.toFixed(1) + 'px'); set('--bs', bs.toFixed(1) + 'px');
    set('--lb', (tall ? 20 : low ? 8 : Math.max(6, (bb - 34) / 2)).toFixed(1) + 'px');
    set('--sw', (tall ? w - 24 : low ? bs - 14 : Math.max(160, w / 2 - 132 * ds - 150)).toFixed(0) + 'px');
    set('--fw', fw.toFixed(1) + 'px'); set('--fh', fh.toFixed(1) + 'px'); set('--fx', bs.toFixed(1) + 'px'); set('--fy', bb.toFixed(1) + 'px');
  },

  // ----- words -----
  texts() {
    const en = this.lang === 'en', g = this.game;
    document.documentElement.lang = en ? 'en' : 'zh-Hans';
    $('app').classList.toggle('en', en);
    $('tTitle').textContent = this.t(UI.title); $('tTitle').className = en ? 'en' : '';
    $('tSub').textContent = this.t(UI.sub); $('tGoal').textContent = this.t(UI.goal);
    $('btnLang').innerHTML = en ? '中文 / <b>EN</b>' : '<b>中文</b> / EN';
    $('btnSeek').textContent = this.t(UI.seek); $('albLabel').textContent = this.t(UI.album);
    $('alTitle').textContent = this.t(UI.albumTitle); $('alClose').textContent = this.t(UI.backWorld); $('alSets').textContent = this.t(UI.toSets); $('sTitle').textContent = this.t(UI.setsTitle);
    $('soundTxt').textContent = this.t(this.coarse ? UI.soundTap : UI.soundHint);
    this.mkD = '';
    $('btnLeave').textContent = this.t(UI.leave); $('btnShareNow').textContent = this.t(UI.shareNow);
    $('sQ').textContent = this.t(UI.quality); $('sV').textContent = this.t(UI.volume); $('sL').textContent = this.t(UI.language);
    $('q2').textContent = this.t(UI.qHigh); $('q1').textContent = this.t(UI.qMid); $('q0').textContent = this.t(UI.qLow);
    $('btnRestart').textContent = this.t(UI.restart);
    let hidLeft = 0; for (const ch of WORLDS) for (const e of ch.effects) if (e.hidden && !(g && g.caps[e.id])) hidLeft++; // how many paintings are still hidden from her
    $('fnA').textContent = this.t(UI.fnA);
    { // the closing line in the phrases it is written in: the first stands alone, the others stay whole and share a line where there is room
      const c = $('fnC'), parts = this.t(UI.fnC).split('|'); c.textContent = '';
      parts.forEach((ph, i) => { const sp = document.createElement('span'); sp.textContent = ph; if (parts.length > 1) sp.className = i ? 'ph' : 'ph first'; c.appendChild(sp); });
    }
    $('fnD').textContent = hidLeft ? this.t(hidLeft === 1 ? UI.fnD2one : UI.fnD2).replace('#', String(hidLeft)) : this.t(UI.fnD2all);
    $('fnShare').textContent = this.t(UI.save); $('fnShareL').textContent = this.t(UI.fnShare); $('fnX').textContent = this.t(UI.shareX); $('fnIG').textContent = this.t(UI.shareIG); $('fnBack').textContent = this.t(UI.fnBack); $('alShow').textContent = this.t(UI.myShow);
    { const b = $('fnB'), d = g ? g.days : 0; b.textContent = this.t(UI.fnB); if (d > 1) { const sm = document.createElement('small'); sm.textContent = this.t(UI.fnDays).replace('#', String(d)); b.appendChild(sm); } }
    $('alCredit').textContent = this.t(UI.credit);
    $('dtBack').textContent = this.t(UI.back); $('dtPrev').textContent = this.t(UI.prev); $('dtNext').textContent = this.t(UI.next);
    $('dtMineL').textContent = this.t(UI.mine); $('dtHisL').textContent = this.t(UI.orig);
    this.origKey = ''; this.origSt = '';
    if (this.saidId && WORKS[this.saidId]) { $('cpT').textContent = this.t(WORKS[this.saidId]); $('cpW').textContent = this.t(WORKS[this.saidId].when); }
    $('btnHelp').textContent = this.t(UI.help); $('hpTitle').textContent = this.t(UI.help); $('hpClose').textContent = this.t(UI.backWorld);
    $('btnFree').textContent = this.t(UI.free); $('dtSave').textContent = this.t(UI.save); $('dtDel').textContent = this.t(UI.del);
    $('dtX').textContent = this.t(UI.shareX); $('dtIG').textContent = this.t(UI.shareIG); this.wallKey = '';
    this.helpBuild();
    if (this.lesson) this.lessonEnd(4);
    for (const b of $('segL').children) b.classList.toggle('active', b.dataset.l === this.lang);
    const s = Game.loadSave(), has = s && (s.wi > 0 || Object.keys(s.caps || {}).length > 0);
    $('btnStart').textContent = this.t(has ? UI.resume : UI.start);
    $('btnFresh').hidden = !has; $('btnFresh').textContent = this.t(UI.restart);
    this.dialKey = ''; this.thumbKey = '';
    this.count();
    if (g && g.ch && $('card').classList.contains('on')) this.cardText(g.trans ? g.trans.toCh : g.ch);
    if (this.panel) this.album();
    if (this.detail) this.openDetail(this.detail);
  },
  count() {
    const g = this.game, n = Object.keys(g.caps).length; let main = 0, all = 0;
    for (const ch of WORLDS) for (const e of ch.effects) if (!e.hidden) { all++; if (g.caps[e.id]) main++; }
    $('albCount').textContent = n ? main + ' / ' + all + (n > main ? ' +' + (n - main) : '') : '';
  },
  show(id) { $(id).classList.add('on'); },
  hide(id) { $(id).classList.remove('on'); },
  hint(key, secs, once, num) {
    if (once && this.hinted[key]) return;
    { const wait = (this.cardUntil || 0) - performance.now() / 1000; if (wait > 0) { this.later('hintWait', wait * 1000 + 300, () => this.hint(key, secs, once, num)); return; } } // (the card of a world is read first)
    if (key === 'hintKeys' || key === 'hintTouch' || key === 'hintFly' || key === 'hintFlyTouch') return; // these are taught one at a time, when they first matter
    // nothing is written over the picture: a hint that comes up at an easel waits until she has stepped away
    const g = this.game;
    if (g && g.mode === 'play' && (g.spot >= 0 || g.viewK > 0.2)) { this.heldHint = [key, secs, once, num]; return; }
    if (once) this.hinted[key] = true;
    $('hint').textContent = this.t(UI[key]).replace('#', num === undefined ? '' : String(num)); this.show('hint');
    this.later('hint', (secs || 7) * 1000, () => this.hide('hint'));
  },
  cardText(ch) {
    const w = WORLD_TEXT[ch.id]; $('cdName').textContent = this.t(w.name); $('cdYrs').textContent = w.years;
    $('cdGoal').textContent = this.t(UI.goalWorld); // in a sentence, what there is to do here (how many there are she learns from the row of frames, with her first catch)
  },
  // the paintings of a world as a row of small frames: an empty one for each still to catch, her own picture in each one caught.
  // Nothing is said about them. The empty frames say what there is to do
  frames(box, ch) {
    const g = this.game; box.querySelectorAll('i').forEach((el) => el.remove());
    for (const x of ch.effects) { if (x.hidden) continue; const d = document.createElement('i'), got = g.caps[x.id]; if (got) { d.className = 'on'; if (got.length > 8) d.style.backgroundImage = 'url(' + got + ')'; } box.appendChild(d); }
  },
  // the same row, small, under the album button for as long as she walks in this world
  wall() {
    const g = this.game, ch = g.ch, gn = $('gain');
    const key = ch.id + '|' + ch.effects.map((x) => (g.caps[x.id] ? 1 : 0)).join('');
    if (key !== this.wallKey) {
      this.wallKey = key;
      if (!gn.querySelector('.nm')) { for (const cl of ['nm', 'ct']) { const el = document.createElement('span'); el.className = cl; gn.appendChild(el); } }
      gn.querySelector('.ct').textContent = g.capCount(ch) + ' / ' + ch.need; // how many of this world she has, of how many there are
      this.frames(gn, ch);
    }
    return gn;
  },

  // ----- callbacks from the game -----
  onLeave() { this.hide('hud'); this.hide('hint'); this.closeFinale(); $('capt').classList.remove('on'); $('gain').classList.remove('say'); if (this.lesson) this.lessonEnd(6); this.closeAlbum(); this.closeHelp(); },
  onCard(ch) {
    this.cardText(ch); this.show('card');
    this.later('card', 7800, () => this.hide('card'));
    // for as long as the card stands (and while it fades) nothing else is said or shown: no lesson, no line of advice, no keys, no ring
    this.cardUntil = performance.now() / 1000 + 8.7; this.hide('hint'); if (this.lesson) this.lessonEnd(1);
  },
  onArrive(ch) {
    track('world', { id: ch.id }); this.doorN = 0; this.doorTold = 0;
    this.show('hud'); this.dialKey = ''; this.thumbKey = ''; this.count();
    this.later('hint0', 6200, () => { if (this.game.mode === 'play') this.hint(this.coarse ? 'hintTouch' : 'hintKeys', 9, true); });
  },
  onPhase() { this.dialKey = ''; this.thumbKey = ''; },
  onSpot(i) {
    this.thumbKey = '';
    if (i < 0 && this.gainHere) { this.gainHere = false; this.gainUntil = performance.now() / 1000 + 6; }
    if (i < 0 && this.caughtHere) { this.caughtHere = false; if (ENERGY) this.beatsGrow(); } // (0.9) and the catch is counted towards the parasol's next beat // she walks on from a catch: the row of frames stays six seconds more
    if (i >= 0) this.hide('hint'); // at an easel the picture is left alone: no words are laid over it
  },
  onAuto(on) { $('btnSeek').classList.toggle('active', !!on); if (on) track('seek', {}); if (on && this.seen && !this.seen.sought) { this.seen.sought = 1; LS.set('ruhua.monet.learn', JSON.stringify(this.seen)); } }, // (she has used Seek: she need not be told of it again)
  // (0.9) the parasol is spent in the air: the row of beats shakes, its line shows, and the first time it is said what that means
  onDry() { const b = $('beats'); b.classList.remove('dry'); void b.offsetWidth; b.classList.add('dry'); this.beatsSayUntil = performance.now() / 1000 + 3; this.hint('beatsDry', 7, true, this.beatNode(this.game.mainCount())); },
  beatNode(main) { for (const x of BEAT_NODES) if (x > main) return x; return 25; }, // with how many paintings the next beat comes (after the last node: all of them)
  // (0.9) The row of beats: a mark for each beat the parasol has (the spent ones hollow), then one dashed mark for the beat still
  // to be earned; over them, for a few seconds after a catch or when it is spent, how far she is from that beat (1 / 2).
  // What it shows runs behind the game by one catch until the spark of that catch has arrived (beatsGrow)
  beatsRow() {
    const g = this.game, b = $('beats'), cap = g.beatsMax, now = performance.now() / 1000;
    const on = ENERGY && cap !== Infinity && g.mode === 'play' && g.spot < 0 && g.viewK < 0.05 && !g.free && !this.panel && !this.finaleOn && !g.trans && now >= (this.cardUntil || 0);
    b.classList.toggle('on', on); if (!on) return;
    const shown = Math.min(cap, this.capShown === undefined ? cap : this.capShown), left = Math.min(g.beats, shown), main = this.mainShown === undefined ? g.mainCount() : this.mainShown, node = this.beatNode(main);
    const key = shown + '|' + left + '|' + main + '|' + this.lang;
    if (key !== this.beatsKey) {
      const pp = $('btPips');
      if (pp.children.length !== shown + 1) { pp.innerHTML = ''; for (let i = 0; i <= shown; i++) pp.appendChild(document.createElement('i')); }
      for (let i = 0; i < shown; i++) pp.children[i].className = i < left ? 'full' : '';
      pp.children[shown].className = 'next';
      $('btCap').textContent = this.t(node >= 25 ? UI.beatsFree : UI.beatsNext) + '　' + main + ' / ' + node;
      this.beatsKey = key;
    }
    b.classList.toggle('say', now < (this.beatsSayUntil || 0));
  },
  // (0.9) She walks on from a catch: a spark goes from the album to the row of beats, the count over the row goes up by one, and
  // if that was a node the dashed mark fills and a card says what the parasol can do now and when the next beat comes
  beatsGrow() {
    const g = this.game, main = g.mainCount(), cap = g.beatsCap(), now = performance.now() / 1000;
    if (cap === Infinity) { this.capShown = cap; this.mainShown = main; return; }
    if (main === this.mainShown && cap === this.capShown) return;
    this.beatsSayUntil = now + 4.6; // (the line over the row shows only for the flight of the spark and some two seconds after: the land is left to be looked at)
    this.later('spark', 700, () => {
      const land = () => {
        const up = cap > (this.capShown === undefined ? cap : this.capShown);
        this.mainShown = main; this.capShown = cap; this.beatsKey = ''; this.beatsRow();
        const b = $('beats'); b.classList.remove('tick'); void b.offsetWidth; b.classList.add('tick');
        if (up) { const pp = $('btPips'), el = pp.children[cap - 1]; if (el) el.classList.add('new'); if (this.lesson) this.lessonEnd(0.5); this.beatsSayUntil = performance.now() / 1000 + 3; this.lessonShow('beats'); }
      };
      const from = $('btnAlbum').getBoundingClientRect(), to = $('btPips').getBoundingClientRect(), app = $('app').getBoundingClientRect(), sp = document.createElement('span');
      if (!sp.animate || to.width < 2 || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) { land(); return; }
      sp.className = 'spark'; $('app').appendChild(sp);
      const x0 = from.left - app.left + from.width / 2, y0 = from.top - app.top + from.height / 2, x1 = to.left - app.left + to.width / 2, y1 = to.top - app.top + to.height / 2;
      const T = (x, y, k) => 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + k + ')';
      sp.animate([{ transform: T(x0, y0, 0.4), opacity: 0 }, { transform: T(x0, y0, 1.5), opacity: 1, offset: 0.14 }, { transform: T((x0 + x1) / 2 + (x0 - x1) * 0.12, (y0 + y1) / 2 - 40, 1.2), opacity: 1, offset: 0.6 }, { transform: T(x1, y1, 0.8), opacity: 1, offset: 0.96 }, { transform: T(x1, y1, 2.2), opacity: 0 }],
        { duration: 1250, easing: 'cubic-bezier(0.45, 0, 0.3, 1)' }).onfinish = () => { sp.remove(); land(); };
    });
  },
  beatsText() { const g = this.game, cap = g.beatsCap(), node = this.beatNode(g.mainCount()); return this.t(node >= 25 ? UI.beatsUpLast : UI.beatsUp).replace('##', String(node)).replace('#', String(cap)); },
  onFly() { this.later('hintF', 900, () => { if (this.game.mode === 'play' && this.game.spot < 0) this.hint(this.coarse ? 'hintFlyTouch' : 'hintFly', 9, true); }); },
  onSlide() { this.later('hintG', 500, () => { if (this.game.mode === 'play' && this.game.spot < 0) this.hint('hintSlide', 7, true); }); },
  onSaver(step) { LS.set('ruhua.monet.sv', String(step)); },
  onQuality(q, found) {
    for (const b of $('segQ').children) b.classList.toggle('active', +b.dataset.q === q);
    if (found) LS.set('ruhua.monet.qa', String(q)); // the game itself stepped down: kept for the next visit
  },
  onCapture(e, ch, url, big) {
    if (big) PICS.put(e.id, big);
    const w = WORKS[e.id], g = this.game;
    track('catch', { id: e.id, n: Object.keys(g.caps).length, world: ch.id });
    this.caughtHere = true;
    clearTimeout(this.timers.hint0);
    this.hide('hint');
    // what she has just caught: its name stands on the picture for a few seconds, its moment under it
    $('cpT').textContent = this.t(w); $('cpW').textContent = this.t(w.when); this.saidId = e.id; this.capAt = performance.now() / 1000;
    $('orig').classList.add('said'); this.later('said', 1600, () => $('orig').classList.remove('said'));
    this.later('capt0', 550, () => $('capt').classList.add('on')); this.later('capt', 6600, () => $('capt').classList.remove('on'));
    const fl = $('flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
    this.dialKey = ''; this.thumbKey = '';
    // and the reward: the picture stands as a mounted print in a burst of its own colours, then goes into the album
    const main = ch.effects.filter((x) => !x.hidden), n = main.filter((x) => g.caps[x.id]).length, hid = ch.effects.filter((x) => x.hidden);
    // a painting from off the path says only that it was hidden: how many more there are is not told before the ending
    this.reward(big || url, e.hidden ? { text: this.t(UI.hid), n: this.ended ? g.hidCount(ch) : 0, total: this.ended ? hid.length : 0, gold: true }
      : { text: this.t(WORLD_TEXT[ch.id].name) + (n >= main.length ? '　' + this.t(UI.whole) : ''), n, total: main.length, gold: n >= main.length });
    if (ENERGY && !g.mainLeft() && !e.hidden) this.later('beatsUp', 9200, () => this.hint('beatsAll', 9)); // (0.9) with the last painting the parasol no longer tires
    // the last of the twenty five: the picture is left to stand a while, then the ending begins of itself
    if (!e.hidden && !g.mainLeft() && !this.ended) { this.ended = true; LS.set('ruhua.monet.fin', '1'); this.finaleDue = performance.now() / 1000 + 9.5; track('finished', { days: g.days }); }
  },
  onFound() { this.dialKey = ''; this.thumbKey = ''; this.hint('hintFound', 8); },
  // something met on the way: its name is said once, quietly, at the top of the screen, and it is kept in the album
  onSight(id) {
    const g = this.game, sp = SIGHTS.list(g.ch).find((x) => x.id === id);
    if (!sp) return;
    $('metN').textContent = this.t(sp.name); $('metK').textContent = this.t(UI.met); this.show('met');
    this.later('met', 6200, () => this.hide('met'));
    // two small notes of glass in the key of the place: softer than the bells of a painting caught
    try { const a = this.audio; if (a && a.ok() && a.group) { const sc = a.group.score, t = a.ctx.currentTime + 0.03; a.note('glass', t, a.deg(sc, 4, 1), 0.06); a.note('glass', t + 0.18, a.deg(sc, 7, 1), 0.05); } } catch (e) { /* silence is fine */ }
    this.metAt = performance.now() / 1000;
  },
  // a moment asked for again by a tap on its small picture has come round
  onReview(e) {
    const w = WORKS[e.id]; if (!w) return;
    $('cpT').textContent = this.t(w); $('cpW').textContent = this.t(w.when); this.saidId = e.id;
    $('capt').classList.add('on'); this.later('capt', 5600, () => $('capt').classList.remove('on'));
  },
  // a view of her own, kept
  onFree(url, ch, phase, t, big) {
    if (!url || url.length < 9) return;
    const d = new Date(), k = 'free:' + d.getTime();
    if (big) { this.game.big[k] = big; PICS.put(k, big); }
    this.frees.unshift({ u: url, k, w: ch.id, p: phase, t: +t.toFixed(3), d: d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate() });
    while (this.frees.length > 16) { const old = this.frees.pop(); if (old && old.k) { PICS.del(old.k); delete this.game.big[old.k]; } }
    this.saveFrees(); this.reward(big || url, null);
    this.show('btnShareNow'); this.later('shareNow', 9000, () => this.hide('btnShareNow'));
  },
  saveFrees() {
    for (let k = 0; k < 4; k++) { try { localStorage.setItem('ruhua.monet.free', JSON.stringify(this.frees)); return; } catch (e) { this.frees.pop(); } } // no room: the oldest goes
  },
  freeMeta(f) {
    const h = Math.floor(f.t * 24), m = Math.round(((f.t * 24 - h) * 60) / 5) * 5 % 60, w = WORLD_TEXT[f.w];
    return this.t(w.phases[f.p] || w.phases[0]) + '　' + (this.lang === 'en' ? h + '.' + String(m).padStart(2, '0') : h + ' 点' + (m ? ' ' + m + ' 分' : '')) + '　' + f.d;
  },
  reward(url, chip) {
    const fr = $('frame').getBoundingClientRect(), app = $('app').getBoundingClientRect(), pr = $('print'), tg = $('btnAlbum').getBoundingClientRect();
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const x = fr.left - app.left, y = fr.top - app.top, w = fr.width, h = fr.height;
    if (!url || url.length < 9 || still || !pr.animate || w < 20) { this.bump(chip); return; }
    $('prImg').src = url;
    // a mount round the picture, a hand's breadth of card
    const b = Math.max(6, w * 0.018), W2 = w + 2 * b, H2 = h + 2 * b;
    pr.style.width = W2.toFixed(1) + 'px'; pr.style.height = H2.toFixed(1) + 'px'; pr.style.borderWidth = b.toFixed(1) + 'px';
    const sc = Math.min(0.1, 48 / w), tx = tg.left - app.left + tg.width / 2 - (W2 * sc) / 2, ty = tg.top - app.top + tg.height / 2 - (H2 * sc) / 2;
    const T = (px, py, k, r) => 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px) scale(' + k.toFixed(4) + ') rotate(' + r + 'deg)';
    const pop = (k, r) => T(x - b - (W2 * (k - 1)) / 2, y - b - (H2 * (k - 1)) / 2, k, r);
    // it is set down with a little spring, stands to be looked at, then goes up into the album
    pr.animate([
      { transform: pop(0.94, -1.6), opacity: 0, offset: 0, easing: 'cubic-bezier(0.2, 1.5, 0.4, 1)' },
      { transform: pop(1, 0), opacity: 1, offset: 0.17 },
      { transform: pop(1, 0), opacity: 1, offset: 0.52, easing: 'cubic-bezier(0.55, 0, 0.3, 1)' },
      { transform: T(tx, ty, sc, 8), opacity: 1, offset: 0.94 },
      { transform: T(tx, ty, sc * 0.5, 8), opacity: 0, offset: 1 },
    ], { duration: 1800, easing: 'linear' }).onfinish = () => this.bump(chip);
    // a burst of paint in the colours of the picture itself, made a little lighter so they show against it
    const lay = $('paint'), cols = [];
    try {
      const tiny = this.tiny || (this.tiny = document.createElement('canvas')); tiny.width = 7; tiny.height = 5;
      const c = tiny.getContext('2d', { willReadFrequently: true }); c.drawImage(this.game.snap, 0, 0, 7, 5);
      const d = c.getImageData(0, 0, 7, 5).data;
      for (let i = 0; i < 35; i += 3) { const m = Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2], 1), k = 235 / m, g2 = (v) => Math.round(Math.min(255, v * k * 0.82 + 255 * 0.18)); cols.push('rgb(' + g2(d[i * 4]) + ',' + g2(d[i * 4 + 1]) + ',' + g2(d[i * 4 + 2]) + ')'); }
    } catch (e) { /* the sun's colour will do */ }
    cols.push('#ffc65c', '#fffaf0', '#ffc65c');
    for (let i = 0; i < 54; i++) {
      const el = document.createElement('span'), side = i % 4, u = Math.random();
      const sx = side === 0 || side === 2 ? x + u * w : side === 1 ? x + w : x, sy = side === 0 ? y : side === 2 ? y + h : y + u * h;
      const ang = Math.atan2(sy - (y + h / 2), sx - (x + w / 2)) + (Math.random() - 0.5) * 1.0, dist = 60 + Math.random() * 190;
      const ex = sx + Math.cos(ang) * dist, ey = sy + Math.sin(ang) * dist + 40 + Math.random() * 110, r0 = Math.random() * 360, r1 = r0 + (Math.random() - 0.5) * 320;
      const dur = 1100 + Math.random() * 800, delay = 40 + Math.random() * 160;
      el.className = 'dab'; el.style.width = (14 + Math.random() * 24).toFixed(0) + 'px'; el.style.height = (6 + Math.random() * 7).toFixed(0) + 'px'; el.style.background = cols[i % cols.length];
      lay.appendChild(el);
      el.animate([{ transform: 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px) rotate(' + r0.toFixed(0) + 'deg) scale(0.3)' }, { transform: 'translate(' + ex.toFixed(1) + 'px,' + ey.toFixed(1) + 'px) rotate(' + r1.toFixed(0) + 'deg) scale(1)' }],
        { duration: dur, delay, easing: 'cubic-bezier(0.12, 0.75, 0.3, 1)', fill: 'both' });
      el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: dur, delay, fill: 'both' }).onfinish = () => el.remove();
    }
  },
  // the print has reached the album: its number jumps, and the world's own count shows for a moment
  bump(chip) {
    this.count();
    const b = $('btnAlbum'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    if (!chip) return;
    // the frame of the one just caught fills, and the name of the place is said beside the row for a few seconds
    const gn = this.wall(); gn.querySelector('.nm').textContent = chip.text;
    gn.classList.toggle('all', !!chip.gold); gn.classList.add('say'); this.later('gain', 5200, () => gn.classList.remove('say'));
    { const at = this.game.spot >= 0; this.gainUntil = performance.now() / 1000 + (at ? 60 : 6); this.gainHere = at; } // it stands while she is still at this easel (a minute at most), and six seconds after she has walked on
  },

  // ----- the album -----
  openAlbum() { this.closeHelp(); this.albumSeen = true; this.panel = true; this.panelAt = performance.now(); this.album(); this.show('album'); $('album').setAttribute('aria-hidden', 'false'); $('btnAlbum').classList.add('active'); },
  closeAlbum() { this.closeDetail(); if (!this.panel) return; this.panel = false; this.hide('album'); $('album').setAttribute('aria-hidden', 'true'); $('btnAlbum').classList.remove('active'); },
  // one painting taken down: hers beside his, when he painted it, and a few words
  caught() { const g = this.game, out = []; for (const ch of WORLDS) for (const e of ch.effects) if (g.caps[e.id]) out.push(e.id); return out; },
  openDetail(id) {
    const g = this.game, mine = $('dtMine'), his = $('dtHis');
    $('shareImg').hidden = true; $('dtTip').textContent = '';
    if (String(id).startsWith('free:')) { // a view of her own: no original beside it, and it can be thrown away
      const f = this.frees[+id.slice(5)];
      if (!f) return;
      this.detail = id; mine.parentNode.classList.remove('gone'); mine.src = (f.k && g.big[f.k]) || f.u; mine.alt = this.t(UI.mine); $('dtHisBox').classList.add('gone'); $('detail').classList.add('solo');
      $('dtT').textContent = this.t(WORLD_TEXT[f.w].name); $('dtY').textContent = ''; $('dtW').textContent = this.freeMeta(f); $('dtA').textContent = ''; $('dtN').textContent = '';
      $('dtPrev').style.visibility = 'hidden'; $('dtNext').style.visibility = 'hidden'; $('dtDel').style.display = '';
      $('dtCap').value = this.caption(id); this.prepCards(id);
      $('detail').scrollTop = 0; this.show('detail'); $('detail').setAttribute('aria-hidden', 'false');
      return;
    }
    const wk = WORKS[id], got = g.caps[id];
    if (!wk || !got) return;
    this.detail = id; $('dtDel').style.display = 'none'; $('detail').classList.remove('solo');
    mine.parentNode.classList.toggle('gone', !(got.length > 8)); if (got.length > 8) mine.src = g.big[id] || got;
    mine.alt = this.t(UI.mine) + ' ' + this.t(wk);
    $('dtHisBox').classList.toggle('gone', !ORIG[id]); if (ORIG[id]) his.src = 'img/' + id + '.jpg';
    // the copy that travels with the game may be small. Where the page is free to ask Wikimedia Commons, a sharper one takes its place when it has come
    if (ORIG[id] && ORIG[id][0] < 1100 && ORIG_FILE[id] && /^https?:/.test(location.protocol)) {
      const im = new Image(); im.referrerPolicy = 'no-referrer';
      im.onload = () => { if (this.detail === id && im.naturalWidth > 900) his.src = im.src; };
      im.src = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(ORIG_FILE[id]) + '?width=1280';
    }
    his.alt = this.t(UI.orig) + ' ' + this.t(wk);
    $('dtT').textContent = this.t(wk); $('dtY').textContent = wk.y; $('dtW').textContent = this.t(wk.when); $('dtA').textContent = this.t(wk.at); $('dtN').textContent = this.t(wk.note);
    const list = this.caught(), many = list.length > 1;
    $('dtPrev').style.visibility = many ? '' : 'hidden'; $('dtNext').style.visibility = many ? '' : 'hidden';
    $('dtCap').value = this.caption(id); this.prepCards(id);
    $('detail').scrollTop = 0;
    this.show('detail'); $('detail').setAttribute('aria-hidden', 'false');
  },
  stepDetail(d) { if (String(this.detail).startsWith('free:')) return; const list = this.caught(), i = list.indexOf(this.detail); if (list.length) this.openDetail(list[(Math.max(i, 0) + d + list.length) % list.length]); },
  closeDetail() { if (!this.detail) return; $('shareImg').hidden = true; this.detail = null; this.hide('detail'); $('detail').setAttribute('aria-hidden', 'true'); },
  // any picture can be taken out as a card: hers, and beside it the original where there is one
  async shareCard() {
    const id = this.detail;
    if (!id) return;
    const free = String(id).startsWith('free:'), f = free ? this.frees[+id.slice(5)] : null, wk = free ? null : WORKS[id];
    const load = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    const g = this.game, mine = await load(free ? (f.k && g.big[f.k]) || f.u : g.big[id] || g.caps[id]), his = !free && ORIG[id] ? await load('img/' + id + '.jpg') : null;
    if (!mine) return;
    await this.fontsFor('900 46px "Noto Serif SC"', (free ? this.t(WORLD_TEXT[f.w].name) : this.t(wk)) + this.t(UI.title) + this.t(UI.sub));
    const when = free ? '' : this.t(wk.when), meta = free ? this.freeMeta(f) : when.includes(wk.y.slice(0, 4)) ? when : wk.y + '　' + when; // the year is not said twice
    const url = this.cardImage(mine, his, free ? this.t(WORLD_TEXT[f.w].name) : this.t(wk), meta) || (his ? this.cardImage(mine, null, this.t(wk), meta) : '');
    if (!url) return;
    this.offer(url, 'ruhua-' + (free ? 'view' : id) + '.png', $('shareImg'), $('dtTip'));
  },
  // ----- passing a picture on to X or Instagram -----
  // the words that go with it: one line of her own about the picture. The address and the tags are added when it goes
  caption(id) {
    if (String(id).startsWith('free:')) { const f = this.frees[+id.slice(5)]; return f ? this.t(UI.capFree).replace('#', this.t(WORLD_TEXT[f.w].name)) : ''; }
    return WORKS[id] ? this.t(UI.capWork).replace('#', this.t(WORKS[id])) : '';
  },
  // The two cards a picture may go out as, 16 to 9 for X and 4 to 5 for Instagram, are made as soon as it is taken down, so that
  // they lie ready when a button is pressed: only in that moment does a browser let a page open a window or the share sheet
  prepCards(id) {
    const tok = (this.cardTok = (this.cardTok || 0) + 1), g = this.game; this.cards = {};
    const free = String(id).startsWith('free:'), f = free ? this.frees[+id.slice(5)] : null, wk = free ? null : WORKS[id];
    if (free ? !f : !wk) { this.cardsReady = Promise.resolve(); return; }
    const load = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    const title = free ? this.t(WORLD_TEXT[f.w].name) : this.t(wk), when = free ? '' : this.t(wk.when);
    const meta = free ? this.freeMeta(f) : when.includes(wk.y.slice(0, 4)) ? when : wk.y + '　' + when;
    const blobOf = (cv) => new Promise((res) => { try { cv.toBlob((b) => res(b || null), 'image/png'); } catch (e) { res(null); } });
    // (a canvas that holds a picture from elsewhere gives nothing back: then the card is made of her picture alone)
    const make = async (mine, his, shape) => { let b = await blobOf(this.cardShaped(mine, his, title, meta, shape)); if (!b && his) b = await blobOf(this.cardShaped(mine, null, title, meta, shape)); return b ? { blob: b } : null; };
    this.cardsReady = Promise.all([load(free ? (f.k && g.big[f.k]) || f.u : g.big[id] || g.caps[id]), !free && ORIG[id] ? load('img/' + id + '.jpg') : null,
      this.fontsFor(this.lang === 'en' ? 'italic 500 62px "Cormorant Garamond"' : '900 46px "Noto Serif SC"', title + this.t(UI.title) + this.t(UI.sub)).catch(() => {})])
      .then(async ([mine, his]) => { if (!mine || tok !== this.cardTok) return; const a = await make(mine, his, 'wide'), b = await make(mine, his, 'tall'); if (tok === this.cardTok) { this.cards.wide = a; this.cards.tall = b; } })
      .catch(() => {});
  },
  // a card of a set shape: wide (1600 by 900) for X, tall (1080 by 1350) for Instagram. On the wide one hers and his stand side by side,
  // on the tall one hers is large above and his smaller under it beside the words. One of his long panels lies under hers instead,
  // across the card. Whatever is on it is set in the middle of the sheet, over one line at the foot that says where it came from
  cardShaped(mine, his, title, meta, shape) {
    const tall = shape === 'tall', en = this.lang === 'en', W = tall ? 1080 : 1600, H = tall ? 1350 : 900, M = tall ? 60 : 64;
    const cv = document.createElement('canvas'), c = cv.getContext('2d'); cv.width = W; cv.height = H;
    c.fillStyle = '#f7f3ea'; c.fillRect(0, 0, W, H); c.imageSmoothingQuality = 'high'; c.textBaseline = 'alphabetic';
    const latin = '"Cormorant Garamond",Georgia,serif', han = '"Noto Serif SC","Songti SC","STSong",Georgia,serif', sans = '"Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif', ink = '#1f2238';
    const tFace = en ? latin : han, tWeight = en ? 'italic 500' : '900', tSize = en ? 62 : 46;
    const put = (im, x, y, w, h) => { c.save(); c.shadowColor = 'rgba(30,30,50,0.28)'; c.shadowBlur = 22; c.shadowOffsetY = 8; c.fillStyle = '#fff'; c.fillRect(x, y, w, h); c.restore(); c.drawImage(im, x, y, w, h); };
    const am = mine.width / mine.height, ah = his ? his.width / his.height : 0;
    const label = (text, x, y) => { c.fillStyle = ink; c.globalAlpha = 0.62; c.font = '500 19px ' + sans; c.fillText(text, x, y); c.globalAlpha = 1; };
    // words set in a width: on as few lines as allowed, in smaller letters if they must be
    const wrap = (text, weight, size, face, maxW, maxLines) => {
      for (let sz = size; sz >= size * 0.5; sz -= 2) {
        c.font = weight + ' ' + sz + 'px ' + face;
        const toks = /\s/.test(text) ? text.split(/(\s+)/) : Array.from(text), lines = []; let cur = '';
        for (const t of toks) { if (cur.trim() && c.measureText(cur + t).width > maxW) { lines.push(cur.trim()); cur = t.trim() ? t : ''; } else cur += t; }
        if (cur.trim()) lines.push(cur.trim());
        if (lines.length <= maxLines) return { sz, lines };
      }
      c.font = weight + ' ' + Math.round(size * 0.5) + 'px ' + face; return { sz: Math.round(size * 0.5), lines: [text] };
    };
    // the name of the picture with its moment under it: measured first, so that the whole can be set in the middle, then drawn
    const set = (maxW, maxLines) => { const t = wrap(title, tWeight, tSize, tFace, maxW, maxLines), m = meta ? wrap(meta, '400', 20, sans, maxW, 2) : { sz: 20, lines: [] }; return { t, m, lh: Math.round(t.sz * 1.14), h: (t.lines.length - 1) * Math.round(t.sz * 1.14) + Math.round(t.sz * 1.02) + (m.lines.length ? m.lines.length * 30 + 6 : 0) }; };
    const draw = (b, x, y) => {
      c.fillStyle = ink; c.globalAlpha = 1; c.font = tWeight + ' ' + b.t.sz + 'px ' + tFace; let yy = y + Math.round(b.t.sz * 0.8);
      for (const ln of b.t.lines) { c.fillText(ln, x, yy); yy += b.lh; }
      yy += Math.round(b.t.sz * 0.22) + 30 - b.lh; c.globalAlpha = 0.7; c.font = '400 ' + b.m.sz + 'px ' + sans;
      for (const ln of b.m.lines) { c.fillText(ln, x, yy); yy += 30; }
      c.globalAlpha = 1;
    };
    // the foot: the name of the game on the left, where to find it on the right
    const FOOT = 58, foot = (l, r) => {
      const y = H - M + 2, nm = this.t(UI.title); c.fillStyle = ink; c.textAlign = 'left';
      c.globalAlpha = 0.92; c.font = en ? 'italic 500 31px ' + latin : '900 25px ' + han; c.fillText(nm, l, y);
      const w1 = c.measureText(nm).width; c.globalAlpha = 0.6; c.font = '400 17px ' + sans; c.fillText(this.t(UI.sub), l + w1 + 18, y - 1);
      c.textAlign = 'right'; c.globalAlpha = 0.74; c.font = '500 19px ' + sans; c.fillText(SITE_URL.replace(/^https?:\/\//, ''), r, y - 1); c.textAlign = 'left'; c.globalAlpha = 1;
    };
    const mineBy = this.t(UI.mineBy), hisBy = this.t(UI.hisBy), avail = H - 2 * M - FOOT, full = W - 2 * M, LAB = 34;
    if (!tall && ah > 4.2) {
      // his is one of the long panels: it runs across the sheet, hers above it on the left with the words beside her
      const sh = Math.round(full / ah), mh = avail - sh - 2 * LAB - 30, mw = Math.round(mh * am), b = set(full - mw - 56, 3);
      put(mine, M, M, mw, mh); label(mineBy, M, M + mh + 26); draw(b, M + mw + 56, M + Math.max(0, Math.round((mh - b.h) / 2)));
      put(his, M, M + mh + LAB + 30, full, sh); label(hisBy, M, M + mh + LAB + 30 + sh + 26);
      foot(M, W - M);
    } else if (!tall && ah > 2.2) {
      // his is wide and low: the two stand one over the other on the left, as wide as each other, the words on the right
      const w = Math.min(Math.round((avail - 2 * LAB - 26) / (1 / am + 1 / ah)), Math.round(full * 0.56)), mh = Math.round(w / am), hh = Math.round(w / ah);
      const blockH = mh + LAB + 26 + hh + LAB, y0 = M + Math.round((avail - blockH) / 2), b = set(full - w - 64, 3);
      put(mine, M, y0, w, mh); label(mineBy, M, y0 + mh + 26); put(his, M, y0 + mh + LAB + 26, w, hh); label(hisBy, M, y0 + mh + LAB + 26 + hh + 26);
      draw(b, M + w + 64, y0 + Math.max(0, Math.round((blockH - LAB - b.h) / 2)));
      foot(M, W - M);
    } else if (!tall) {
      const gap = his ? 36 : 0, b0 = set(Math.round(full * 0.7), 1), h = Math.min(avail - LAB - 38 - b0.h, Math.round((full - gap) / (am + ah)));
      const mw = Math.round(h * am), hw = Math.round(h * ah), x0 = Math.round((W - (mw + gap + hw)) / 2), b = set(mw + gap + hw, 1), y0 = M + Math.round((avail - (h + LAB + 38 + b.h)) / 2);
      put(mine, x0, y0, mw, h); label(mineBy, x0, y0 + h + 26);
      if (his) { put(his, x0 + mw + gap, y0, hw, h); label(hisBy, x0 + mw + gap, y0 + h + 26); }
      draw(b, x0, y0 + h + LAB + 38);
      foot(x0, W - x0);
    } else if (his && ah > 2.2) {
      // tall, and his is a long panel: hers, his under it as wide as she is, then the words
      const b = set(full, 2), k = Math.min(1, (avail - 2 * LAB - 26 - 30 - b.h) / (full / am + full / ah)), w = Math.round(full * k), mh = Math.round(w / am), hh = Math.round(w / ah), x0 = Math.round((W - w) / 2);
      const blockH = mh + LAB + 26 + hh + LAB + 30 + b.h; let y = M + Math.round((avail - blockH) / 2);
      put(mine, x0, y, w, mh); label(mineBy, x0, y + mh + 26); y += mh + LAB + 26;
      put(his, x0, y, w, hh); label(hisBy, x0, y + hh + 26); y += hh + LAB + 30;
      draw(b, x0, y); foot(x0, W - x0);
    } else {
      const mw = full, mh = Math.round(mw / am);
      if (his) {
        const room = avail - mh - LAB - 30, hw = Math.min(Math.round(mw * 0.54), Math.round(room * ah)), hh = Math.round(hw / ah), tx = M + hw + 40, b = set(W - M - tx, 3);
        const blockH = mh + LAB + 30 + Math.max(hh, LAB + 14 + b.h), y0 = M + Math.max(0, Math.round((avail - blockH) / 2)), y2 = y0 + mh + LAB + 30;
        put(mine, M, y0, mw, mh); label(mineBy, M, y0 + mh + 26); put(his, M, y2, hw, hh);
        label(hisBy, tx, y2 + 18); draw(b, tx, y2 + LAB + 14);
      } else {
        const b = set(full, 2), blockH = mh + LAB + 30 + b.h, y0 = M + Math.round((avail - blockH) / 2);
        put(mine, M, y0, mw, mh); label(mineBy, M, y0 + mh + 26); draw(b, M, y0 + mh + LAB + 30);
      }
      foot(M, W - M);
    }
    return cv;
  },
  // a file handed to whoever is looking: inside Claude through the viewer (who is asked first), elsewhere as a download
  download(blob, name) {
    const link = () => { try { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 8000); } catch (e) { /* the card is on the page to be saved by hand */ } };
    const cl = window.claude;
    if (cl && typeof cl.use === 'function') { Promise.resolve().then(() => cl.use('downloads')).then((d) => (d && d.save ? d.save({ filename: name, data: blob }) : Promise.reject({ code: 'unavailable' }))).catch((err) => { if (!err || (err.code !== 'declined' && err.code !== 'rate_limited')) link(); }); return; }
    link();
  },
  // To X or to Instagram, with the words. On a phone the system's sheet carries the card (and for X the words too) into the app she
  // picks there. At a desk X is opened with the words written and the card on the clipboard to be pasted in; Instagram is opened
  // with the card saved as a file and the words on the clipboard. Whatever a browser refuses falls back to saving the card
  shareTo(kind, what) {
    const ex = what === 'show', id = this.detail; if (!ex && !id) return;
    track('share', { to: kind, id: ex ? 'exhibition' : String(id).startsWith('free:') ? 'view' : id });
    const free = !ex && String(id).startsWith('free:'), tip = $(ex ? 'fnTip' : 'dtTip'), shape = kind === 'ig' ? 'tall' : 'wide', site = SITE_URL;
    const text = (ex ? this.t(UI.capShow) : $('dtCap').value || this.caption(id)).trim(), tags = this.t(UI.capTags), full = text + '\n\n' + site.replace(/^https?:\/\//, '') + '\n' + tags;
    const name = ex ? 'intothepainting-exhibition.png' : 'intothepainting-' + (free ? 'view' : id) + (kind === 'ig' ? '-4x5' : '-16x9') + '.png';
    const ready = ex ? this.poster : this.cards && this.cards[shape];
    const card = ready ? Promise.resolve(ready) : ex ? (this.posterReady || Promise.resolve()).then(() => this.poster || Promise.reject(new Error('no card'))) : (this.cardsReady || Promise.resolve()).then(() => (this.cards && this.cards[shape]) || Promise.reject(new Error('no card')));
    const show = (cd) => { try { const im = $(ex ? 'fnImg' : 'shareImg'); if (this.shownUrl) URL.revokeObjectURL(this.shownUrl); this.shownUrl = URL.createObjectURL(cd.blob); im.src = this.shownUrl; im.hidden = false; } catch (e) { /* not shown */ } return cd; };
    const turn = (this.shareN = (this.shareN || 0) + 1); // (a slow clipboard must not write its line over that of a later press)
    const say = (k, link) => { if (turn !== this.shareN) return; tip.textContent = this.t(UI[k]); if (link) { const a = document.createElement('a'); a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = ' ' + link.replace(/^https?:\/\//, '').split('?')[0]; tip.appendChild(document.createTextNode(this.t(UI.tipOpen))); tip.appendChild(a); } };
    const copyText = () => { try { return navigator.clipboard.writeText(full); } catch (e) { return Promise.reject(e); } };
    const save = () => card.then((cd) => this.download(cd.blob, name));
    const open = (url) => { let w = null; try { w = window.open(url, '_blank'); if (w) w.opener = null; } catch (e) { w = null; } return w; };
    card.then(show).catch(() => {});
    const desk = () => {
      if (kind === 'x') {
        const intent = 'https://x.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(site) + '&hashtags=' + encodeURIComponent(tags.replace(/#/g, '').trim().split(/\s+/).join(','));
        let copied;
        try { copied = navigator.clipboard.write([new ClipboardItem({ 'image/png': ready ? ready.blob : card.then((cd) => cd.blob) })]); } catch (e) { copied = Promise.reject(e); }
        const w = open(intent);
        copied.then(() => say('tipXPaste', w ? null : intent), () => { save().catch(() => {}); say('tipXSaved', w ? null : intent); });
      } else {
        copyText().catch(() => {}); save().catch(() => {});
        const w = open('https://www.instagram.com/');
        say('tipIGDesk', w ? null : 'https://www.instagram.com/');
      }
    };
    if (this.coarse && navigator.share && navigator.canShare) {
      if (kind === 'ig') copyText().catch(() => {});
      const go = (cd) => { const file = new File([cd.blob], name, { type: 'image/png' }); if (!navigator.canShare({ files: [file] })) throw new Error('files'); return navigator.share(kind === 'ig' ? { files: [file] } : { files: [file], text: full }); };
      say(kind === 'ig' ? 'tipSheetIG' : 'tipSheetX');
      let p; try { p = ready ? go(ready) : card.then(go); } catch (e) { p = Promise.reject(e); }
      Promise.resolve(p).catch((err) => { if (err && err.name === 'AbortError') return; desk(); });
      return;
    }
    desk();
  },
  cardImage(mine, his, title, meta) {
    const cv = document.createElement('canvas'), c = cv.getContext('2d'), k = mine.height >= 700 ? 1.55 : 1, M = Math.round(56 * k), H = Math.round(560 * k), px = (n) => Math.round(n * k);
    const mw = Math.round((mine.width * H) / mine.height), hw = his ? Math.round((his.width * H) / his.height) : 0, gap = his ? px(40) : 0;
    cv.width = M * 2 + mw + gap + hw; cv.height = M + H + px(190);
    c.fillStyle = '#f7f3ea'; c.fillRect(0, 0, cv.width, cv.height);
    c.imageSmoothingQuality = 'high';
    const put = (im, x, w) => { c.save(); c.shadowColor = 'rgba(30,30,50,0.28)'; c.shadowBlur = px(22); c.shadowOffsetY = px(8); c.fillStyle = '#fff'; c.fillRect(x, M, w, H); c.restore(); c.drawImage(im, x, M, w, H); };
    put(mine, M, mw); if (his) put(his, M + mw + gap, hw);
    const serif = '"Noto Serif SC","Songti SC",Georgia,serif', sans = '"Noto Sans SC","PingFang SC",system-ui,sans-serif';
    c.fillStyle = '#1f2238'; c.font = '500 ' + px(19) + 'px ' + sans; c.globalAlpha = 0.62;
    c.fillText(this.t(UI.mineBy), M, M + H + px(38)); if (his) c.fillText(this.t(UI.hisBy), M + mw + gap, M + H + px(38));
    c.globalAlpha = 1; c.font = '900 ' + px(46) + 'px ' + serif; c.fillText(title, M, M + H + px(106));
    c.font = '400 ' + px(20) + 'px ' + sans; c.globalAlpha = 0.7; c.fillText(meta, M, M + H + px(144));
    c.textAlign = 'right'; c.font = '600 ' + px(22) + 'px ' + serif; c.globalAlpha = 0.8; c.fillText(this.t(UI.title) + '　' + this.t(UI.sub), cv.width - M, M + H + px(144));
    try { return cv.toDataURL('image/png'); } catch (e) { return ''; }
  },
  // a picture made to be passed on: shown on the page, handed to the system's share sheet where there is one, else saved as a file
  offer(url, name, im, tip) {
    im.src = url; im.hidden = false; tip.textContent = this.t(UI.saveTip);
    setTimeout(() => { try { im.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* fine */ } }, 60);
    let u8 = null;
    try { const bin = atob(url.split(',')[1]); u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); } catch (e) { u8 = null; }
    const plain = () => {
      // on a phone the system's share sheet takes the picture, elsewhere it is saved as a file
      try {
        const file = u8 ? new File([u8], name, { type: 'image/png' }) : null;
        if (file && this.coarse && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: this.t(UI.title) }).catch((err) => { if (!err || err.name !== 'AbortError') link(); }); return; }
      } catch (e) { /* no share sheet here */ }
      link();
    };
    const link = () => { try { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { /* the picture is on the page to be saved by hand */ } };
    // inside Claude a page does not save files by itself: the picture is handed to the viewer there, who is asked first
    const cl = window.claude;
    if (cl && typeof cl.use === 'function' && u8) {
      Promise.resolve().then(() => cl.use('downloads')).then((d) => (d && d.save ? d.save({ filename: name, data: new Blob([u8], { type: 'image/png' }) }) : Promise.reject({ code: 'unavailable' })))
        .catch((err) => { if (!err || (err.code !== 'declined' && err.code !== 'rate_limited')) plain(); });
      return;
    }
    plain();
  },
  album() {
    const g = this.game, box = $('alBody'); box.innerHTML = '';
    $('alShow').hidden = !(this.ended && !g.mainLeft() && g.mode === 'play');
    if (this.frees.length) { // the views she framed herself hang first
      const sec = document.createElement('div'), head = document.createElement('div'), b = document.createElement('b'), n = document.createElement('span'), grid = document.createElement('div');
      sec.className = 'wsec'; head.className = 'head'; b.textContent = this.t(UI.myFrames); n.textContent = String(this.frees.length); head.append(b, n); sec.appendChild(head);
      grid.className = 'grid';
      this.frees.forEach((f, i) => {
        const fig = document.createElement('figure'), im = document.createElement('div'), cap = document.createElement('figcaption'), sm = document.createElement('small');
        fig.className = 'pic got'; im.className = 'im'; im.style.backgroundImage = 'url(' + f.u + ')'; fig.tabIndex = 0; fig.setAttribute('role', 'button');
        fig.addEventListener('click', () => this.openDetail('free:' + i));
        cap.textContent = this.t(WORLD_TEXT[f.w].name); sm.textContent = this.freeMeta(f); cap.appendChild(sm); fig.append(im, cap); grid.appendChild(fig);
      });
      sec.appendChild(grid); box.appendChild(sec);
    }
    WORLDS.forEach((ch, i) => {
      const w = WORLD_TEXT[ch.id], open = i <= g.unlocked || i === g.wi, sec = document.createElement('div');
      sec.className = 'wsec' + (open ? '' : ' locked');
      const head = document.createElement('div'); head.className = 'head';
      const b = document.createElement('b'); b.textContent = this.t(w.name);
      const y = document.createElement('i'); y.textContent = w.years;
      const hid = ch.effects.filter((e) => e.hidden), known = hid.filter((e) => g.caps[e.id] || g.spotFound(e.spot, ch)).length;
      const n = document.createElement('span'); n.textContent = g.capCount(ch) + ' / ' + (ch.effects.length - hid.length) + (hid.length && (this.ended || known) ? '　' + this.t(UI.hidTag) + ' ' + g.hidCount(ch) + (this.ended ? ' / ' + hid.length : '') : '');
      head.append(b, y, n);
      if (i === g.wi && g.mode !== 'title') { const s = document.createElement('span'); s.textContent = this.t(UI.here); s.style.marginLeft = 'auto'; head.appendChild(s); }
      else if (open && g.mode !== 'title') {
        const go = document.createElement('button'); go.type = 'button'; go.textContent = this.t(UI.go);
        go.addEventListener('click', () => { this.closeAlbum(); g.startTransition(i); });
        head.appendChild(go);
      } else if (!open) { const s = document.createElement('span'); s.textContent = this.t(UI.locked); s.style.marginLeft = 'auto'; head.appendChild(s); }
      sec.appendChild(head);
      const grid = document.createElement('div'); grid.className = 'grid';
      for (const e of ch.effects) {
        const got = g.caps[e.id], fig = document.createElement('figure'), im = document.createElement('div'), cap = document.createElement('figcaption');
        const known = !e.hidden || g.spotFound(e.spot, ch), tag = () => { const b2 = document.createElement('b'); b2.textContent = this.t(UI.hidTag); return b2; };
        if (e.hidden && !got && !known && !this.ended) continue; // nothing is said of a hidden painting before the ending, unless she has come upon it
        fig.className = 'pic' + (got ? ' got' : ' none') + (e.hidden ? ' hid' : ''); im.className = 'im';
        if (got) { fig.tabIndex = 0; fig.setAttribute('role', 'button'); fig.addEventListener('click', () => this.openDetail(e.id)); fig.addEventListener('keydown', (ev) => { if (ev.code === 'Enter' || ev.code === 'Space') { ev.preventDefault(); this.openDetail(e.id); } }); }
        if (got && got.length > 8) im.style.backgroundImage = 'url(' + got + ')';
        if (got) { const wk = WORKS[e.id], sm = document.createElement('small'); cap.textContent = this.t(wk); if (e.hidden) sm.appendChild(tag()); sm.appendChild(document.createTextNode(wk.y + '　' + this.t(wk.at))); cap.appendChild(sm); }
        else if (e.hidden) { const sm = document.createElement('small'); if (!known) im.textContent = '?'; sm.appendChild(tag()); sm.appendChild(document.createTextNode(this.t(known ? UI.hidFound : UI.hidSlot))); cap.appendChild(sm); }
        else { const sm = document.createElement('small'); sm.textContent = e.phase < 0 ? '' : this.t(w.phases[e.phase]); cap.appendChild(sm); }
        fig.append(im, cap); grid.appendChild(fig);
      }
      sec.appendChild(grid);
      // what she has met in this world besides the paintings. Nothing is said of it before the first meeting; after the ending the ones still to meet say when and where
      const sights = SIGHTS.list(ch), metN = sights.filter((x) => g.met[x.id]).length;
      if (sights.length && (this.ended || Object.keys(g.met).length)) {
        const row = document.createElement('div'), lab = document.createElement('b'); row.className = 'metrow';
        lab.textContent = this.t(UI.met) + '　' + metN + ' / ' + sights.length; row.appendChild(lab);
        for (const x of sights) { const c = document.createElement('span'), got = !!g.met[x.id]; c.className = 'mc' + (got ? ' got' : ''); c.textContent = got ? this.t(x.name) : this.ended && x.hint ? this.t(x.hint) : '？'; row.appendChild(c); }
        sec.appendChild(row);
      }
      box.appendChild(sec);
    });
  },

  // ----- the guide: every key and every sign, and the first minutes in which they are pointed out one by one -----
  kbd(groups) {
    const frag = document.createDocumentFragment();
    for (const gr of groups) {
      const s = document.createElement('span'); s.className = 'kc';
      for (const k of gr[0]) { const e = document.createElement('kbd'); e.textContent = typeof k === 'string' ? k : this.t(k); s.appendChild(e); }
      if (gr[1]) { const i = document.createElement('i'); i.textContent = this.t(gr[1]); s.appendChild(i); }
      frag.appendChild(s);
    }
    return frag;
  },
  helpBuild() {
    const box = $('hpBody'); box.innerHTML = '';
    const col = (title, rows, make) => {
      const d = document.createElement('div'), h = document.createElement('h4'); h.textContent = this.t(title); d.appendChild(h);
      for (const r of rows) {
        const row = document.createElement('div'), ic = document.createElement('div'), tx = document.createElement('div'), b = document.createElement('b');
        row.className = 'lg'; ic.className = 'ic'; make(ic, r);
        b.textContent = this.t(r[1]); tx.append(b, document.createTextNode(this.t(r[2]))); row.append(ic, tx); d.appendChild(row);
      }
      return d;
    };
    box.appendChild(this.coarse ? col(UI.hpTouch, LEGEND.touch, () => {}) : col(UI.hpKeys, LEGEND.keys, (ic, r) => ic.appendChild(this.kbd([[r[0]]]))));
    box.appendChild(col(UI.hpSigns, LEGEND.signs, (ic, r) => { ic.innerHTML = '<svg viewBox="0 0 64 34" aria-hidden="true">' + SIGN_SVG[r[0]] + '</svg>'; }));
    { // where the settings are: said in a sentence, with a button that goes there
      const d = document.createElement('div'), h = document.createElement('h4'), t = document.createElement('p'), b = document.createElement('button');
      h.textContent = this.t(UI.hpSets); t.className = 'hpnote'; t.textContent = this.t(this.coarse ? UI.hpSetsTouch : UI.hpSetsText);
      b.type = 'button'; b.className = 'hpgo'; b.textContent = this.t(UI.hpSetsGo); b.addEventListener('click', () => this.openSettings());
      d.append(h, t, b); box.appendChild(d);
    }
  },
  // the settings stand at the foot of the album's page: this opens that page and goes down to them
  openSettings() {
    this.closeHelp(); if (!this.panel) this.openAlbum();
    const go = () => { const el = $('sTitle'), al = $('album'); try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { al.scrollTop = al.scrollHeight; } };
    requestAnimationFrame(() => requestAnimationFrame(go));
  },
  openHelp() { this.closeAlbum(); this.helpOn = true; this.panelAt = performance.now(); this.show('help'); $('help').setAttribute('aria-hidden', 'false'); $('btnHelp').classList.add('active'); $('help').scrollTop = 0; },
  closeHelp() { if (!this.helpOn) return; this.helpOn = false; this.hide('help'); $('help').setAttribute('aria-hidden', 'true'); $('btnHelp').classList.remove('active'); },
  // lessons: one thing at a time, each once, at the moment it first matters, with quiet between them
  learnBegin(fresh) {
    let seen = {};
    try { seen = JSON.parse(LS.get('ruhua.monet.learn', '{}')) || {}; } catch (e) { seen = {}; }
    if (fresh) seen = {};
    // someone who already has paintings knows how to walk, what an easel is, where the album is and how to fly
    if (Object.keys(this.game.caps).length && !seen.move) seen.move = seen.arc = seen.album = seen.fly = seen.leave = 1;
    this.seen = seen; this.lesson = null; this.gapUntil = performance.now() / 1000 + 2.5; this.lostT = 0; this.idleT = 0; this.walked = 0; this.phaseSeen = -1;
    this.capN = Object.keys(this.game.caps).length; this.dialShown = this.capN > 0; this.coachOff();
  },
  coachOff() { this.hide('coach'); $('coHalo').classList.remove('on'); $('flybtn').classList.remove('ghost'); },
  nextName() { const g = this.game, nx = WORLDS[g.wi + 1]; return nx ? this.t(WORLD_TEXT[nx.id].name) : ''; },
  lessonShow(id) {
    const L = LESSONS[id], k = $('coKeys'); k.innerHTML = '';
    if (L.keys && !this.coarse) k.appendChild(this.kbd(L.keys));
    $('coText').textContent = id === 'beats' ? this.beatsText() : this.t(this.coarse && L.touch ? L.touch : L.text).replace('#', this.nextName());
    this.lesson = { id, at: performance.now() / 1000 }; this.show('coach'); $('coach').classList.toggle('gold', id === 'door' || id === 'beats'); // (the way on is said in gold)
    if (id === 'fly' && this.coarse && !this.touchFly) { // on a phone the parasol has no button: a ring is shown where a thumb would rest, while this is read
      const f = $('flybtn'), g = this.game; f.style.left = (g.cssW * 0.78).toFixed(0) + 'px'; f.style.top = (g.cssH * (this.lay && this.lay.tall ? 0.72 : 0.66)).toFixed(0) + 'px'; f.classList.add('ghost');
    }
    this.seen[id] = 1; LS.set('ruhua.monet.learn', JSON.stringify(this.seen));
  },
  lessonEnd(gap) { this.lesson = null; this.coachOff(); this.gapUntil = performance.now() / 1000 + (gap || 9); },
  // a card asked for by something she did (it may come again, unlike a lesson)
  tip(id) { if (!this.seen || (this.lesson && this.lesson.id === id)) return; if (this.lesson) this.coachOff(); this.lessonShow(id); },
  // the card sits beside the thing it names, and a ring of light is drawn round that thing
  coachPlace(id) {
    const g = this.game, c = $('coach'), halo = $('coHalo'), W = g.cssW, H = g.cssH, pad = 12, an = LESSONS[id].anchor || (id === 'move' ? 'pillar' : ''), L = this.lay || {};
    const app = $('app').getBoundingClientRect();
    const rect = (el) => { const b = el.getBoundingClientRect(); return b.width > 1 ? { x: b.left - app.left, y: b.top - app.top, w: b.width, h: b.height } : null; };
    let r = null;
    if (an === 'arc') r = rect($('sundial'));
    else if (an === 'season') r = rect($('seasons'));
    else if (an === 'album') r = rect($('btnAlbum'));
    else if (an === 'seek') r = rect($('btnSeek'));
    else if (an === 'free') r = rect($('btnFree'));
    else if (an === 'leave') r = rect($('btnLeave'));
    else if (an === 'thumbs') r = rect($('thumbs'));
    else if (an === 'fly' && this.coarse) r = rect($('flybtn'));
    else if (an === 'beats') r = rect($('beats')); // (the marks and the line over them)
    else if (an === 'marker') { r = this.markOn ? rect($('marker').firstChild) : null; if (r && !$('marker').classList.contains('bare') && !$('marker').classList.contains('plain')) r.h += 22; } // (the ring, and under it its distance)
    else if (an === 'pillar') {
      const t = g.targetScreen();
      if (t && !t.behind) { const x = (t.nx * 0.5 + 0.5) * W, y = (1 - (t.ny * 0.5 + 0.5)) * H; if (x > 30 && x < W - 30 && y > 60 && y < H - 100) r = { x: x - 24, y: y - 92, w: 48, h: 108 }; }
    }
    const small = this.coarse || W < 700, atEasel = g.viewK > 0.5;
    c.style.maxWidth = small && L.low && atEasel ? Math.max(150, L.bs - 16).toFixed(0) + 'px' : '';
    const cw = c.offsetWidth, chh = c.offsetHeight;
    if (r) {
      const e = an === 'pillar' ? 0 : 7;
      halo.style.transform = 'translate(' + (r.x - e).toFixed(1) + 'px,' + (r.y - e).toFixed(1) + 'px)';
      halo.style.width = (r.w + 2 * e).toFixed(1) + 'px'; halo.style.height = (r.h + 2 * e).toFixed(1) + 'px';
      halo.style.borderRadius = r.h > 56 && an !== 'pillar' ? '16px' : '999px';
      halo.classList.add('on');
    } else halo.classList.remove('on');
    let x, y;
    if (small) {
      // on a small screen the card keeps to one quiet place and never lies on the thing it speaks of nor on the picture:
      // above the picture at an easel (beside it on a low screen), low on the screen on the walk
      if (atEasel && L.low) { x = 8; y = (H - chh) / 2; }
      else if (atEasel) { x = (W - cw) / 2; y = Math.max(8, Math.min(L.bb - chh - 10, Math.max(104, L.bb - chh - 14))); }
      else { x = (W - cw) / 2; y = H - chh - (L.low ? 78 : 104); if (r && y < r.y + r.h + 8 && y + chh > r.y - 8) y = Math.max(8, r.y - chh - 14); }
    } else if (!r) { x = (W - cw) / 2; y = H - chh - 126; }
    else if (r.y < H * 0.3 && an !== 'pillar') { x = r.x + r.w / 2 - cw / 2; y = r.y + r.h + pad + 4; } // under the words at the top
    else if (an === 'pillar') { x = r.x + r.w + pad; if (x + cw > W - 8) x = r.x - cw - pad; y = r.y + r.h / 2 - chh / 2; }
    else if (atEasel) { x = an === 'leave' ? r.x - cw - pad - 6 : r.x + r.w + pad + 6; if (x + cw > W - 8) x = r.x - cw - pad - 6; y = H - chh - 8; } // at an easel: in the band under the picture
    else { x = r.x + r.w / 2 - cw / 2; y = r.y - chh - pad - 4; }
    c.style.transform = 'translate(' + clamp(x, 8, Math.max(8, W - cw - 8)).toFixed(1) + 'px,' + clamp(y, 8, Math.max(8, H - chh - 8)).toFixed(1) + 'px)';
  },
  learnTick() {
    const g = this.game, now = performance.now() / 1000, dt = Math.min(0.1, now - (this.learnAt || now));
    this.learnAt = now;
    if (!this.seen) return;
    if (this.panel || this.helpOn || this.detail || g.free || this.finaleOn) { if (this.lesson) this.lessonEnd(5); return; }
    if (now < (this.cardUntil || 0)) { this.gapUntil = Math.max(this.gapUntil, this.cardUntil + 0.5); return; } // the card of a world is read first
    const p = g.pl, n = Object.keys(g.caps).length, atEasel = g.spot >= 0 && g.viewK > 0.9, away = g.spot < 0 && g.viewK < 0.05, sp = Math.hypot(p.vx, p.vz);
    // how long she has wandered since the last catch, and how long she has stood looking
    if (n !== this.capN) { this.capN = n; this.lostT = 0; }
    this.lostT = atEasel ? 0 : away && !g.auto ? this.lostT + dt : this.lostT;
    this.idleT = away && sp < 0.6 && p.alt < 0.1 ? this.idleT + dt : 0;
    if (atEasel && this.phaseSeen < 0) this.phaseSeen = g.phase;
    // is she getting anywhere? The nearest she has come to the place the ring shows is kept; when that stops shrinking she has lost
    // her way. Then the ring calls, and a line says what it is and that she can be led; if water lies between, that it carries her
    const tg = away && !g.auto ? g.target() : null;
    if (!tg) { this.strayT = 0; this.bestD = 1e9; this.tgKey = ''; }
    else {
      const key = tg.kind + Math.round(tg.x) + ',' + Math.round(tg.z), d = Math.hypot(tg.x - p.x, tg.z - p.z);
      if (key !== this.tgKey || d < this.bestD - 5) { this.tgKey = key; this.bestD = d; this.strayT = 0; } else this.strayT = (this.strayT || 0) + dt;
      const W = g.cur, high = !!W && d < 45 && p.alt < 0.5 && g.groundAt(W, tg.x, tg.z) - (p.yAbs === undefined ? 0 : p.yAbs) > 3.5; // the place stands well above her (a bridge, a cliff)
      // She has lost her way. In the first world a card says that G (or Seek) makes her walk to the next painting by herself, and
      // the word Seek at the top calls with it: up to three times, and no more once she has used it. In the second world it is
      // said once, to someone who was never told. After that the ring alone shows the way.
      // Once for each place, if that place stands high above her or across water, a line says how to get there instead
      if (this.strayT > (high ? 9 : n < 2 ? 10 : 14) && (d > 20 || high) && !this.lesson && now > (this.strayNudge || 0) && now >= this.gapUntil) {
        this.strayNudge = now + 38; this.callUntil = now + 13;
        let wet = false;
        if (W && W.waterY !== null && W.waterY !== undefined && p.alt < 0.5) for (let q = 4; q < Math.min(d, 70) && !wet; q += 4) { const x = p.x + ((tg.x - p.x) / d) * q, z = p.z + ((tg.z - p.z) / d) * q; if (W.h(x, z) < W.waterY - 0.05) wet = true; }
        const special = high ? (this.coarse ? 'hintUpTouch' : 'hintUp') : wet && !g.slid ? 'hintWater' : null;
        if (special && this.saidFor !== key) { this.saidFor = key; this.hint(special, 9); }
        else if (g.wi === 0 ? !this.seen.sought && (this.seen.seekN || 0) < 3 : g.wi === 1 && !this.seen.seek) { this.seen.seekN = (this.seen.seekN || 0) + 1; this.seekCalled = true; this.seekCallUntil = now + 13; this.lessonShow('seek'); }
      }
    }
    const L = this.lesson;
    if (L) {
      const age = now - L.at, id = L.id;
      let done = false, max = 9, ok = true;
      if (id === 'move') { this.walked += sp * dt; ok = away; done = this.walked > 4; max = 14; }
      else if (id === 'arc') { ok = atEasel; done = n > 0; max = 10; }
      else if (id === 'album') { done = this.albumSeen; max = 11; }
      else if (id === 'fly') { ok = away; done = !!g.flown && age > 2; max = 13; }
      else if (id === 'seek') { ok = away; done = !!g.auto; max = 13; }
      else if (id === 'door') { ok = away && !g.trans; done = !!g.trans; max = 14; }
      else if (id === 'beats') { ok = away; max = 6; }
      else if (id === 'free') ok = away;
      else if (id === 'handSeason' || id === 'handSun') { ok = atEasel; done = !g.needHand && age > 1.5; max = 11; }
      else { ok = atEasel; max = 8; }
      if (done || (age > max && !this.learnHold) || !ok) { this.lessonEnd(done ? 6 : 9); return; }
      this.coachPlace(id);
      return;
    }
    if (now < this.gapUntil) return;
    const S = this.seen;
    let id = null;
    if (g.doorOn && away && !g.auto && tg && tg.kind === 'door' && now > (this.doorTold || 0) && (this.doorN || 0) < (g.wi === 0 ? 3 : 1)) { id = 'door'; this.doorN = (this.doorN || 0) + 1; this.doorTold = now + 32; this.callUntil = now + 14; }
    else if (!S.move && away && n === 0) id = 'move';
    else if (!S.arc && atEasel && n === 0) id = 'arc';
    else if (!S.leave && atEasel && n >= 1 && !(g.restT > 0) && !g.paintE && now - this.capAt > 4 && now - this.capAt < 90) id = 'leave';
    else if (!S.album && n >= 1 && now - this.capAt > 7.2) id = 'album';
    else if (!S.met && away && this.metAt && now - this.metAt > 2.5 && now - this.metAt < 30) id = 'met';
    else if (!S.fly && away && n >= 1 && !g.flown && this.lostT > 2.5) id = 'fly';
    else if (!S.ring && away && n >= 1 && this.markOn && this.lostT > 5) id = 'ring';
    else if (!S.handSeason && atEasel && g.needHand === 'season' && g.handT > 1.2) id = 'handSeason';
    else if (!S.handSun && atEasel && g.needHand === 'sun' && g.handT > 1.2) id = 'handSun';
    else if (atEasel && g.needHand && g.handT > 8 && now > (this.nudgeAt || 0)) { id = g.needHand === 'sun' ? 'handSun' : 'handSeason'; this.nudgeAt = now + 22; } // still waiting: said once more
    else if (!S.season && atEasel && n >= 1 && (g.wi >= 1 || (this.phaseSeen >= 0 && g.phase !== this.phaseSeen))) id = 'season';
    else if (!S.thumbs && atEasel && n >= 3 && this.thumbsMixed) id = 'thumbs';
    else if (!S.sun && atEasel && n >= 5 && !g.paintE && g.restT <= 0) id = 'sun';
    else if (!S.free && away && n >= 2 && this.idleT > 1.5) id = 'free';
    else if (!S.seek && away && n >= 1 && g.wi <= 1 && (this.lostT > 26 || this.strayT > 8) && !g.auto) id = 'seek'; // (told once, in the first world or the second, to whoever has not been)
    if (id) this.lessonShow(id);
  },
  // ----- the ending: her twenty five pictures hang themselves on a wall while the days go by behind them -----
  mainIds() { const g = this.game, out = []; for (const ch of WORLDS) for (const e of ch.effects) if (!e.hidden && g.caps[e.id]) out.push(e.id); return out; },
  openFinale(first) {
    const g = this.game, wall = $('fnWall'), ids = this.mainIds();
    if (g.mode !== 'play' || this.finaleOn) return;
    wall.innerHTML = '';
    ids.forEach((id, i) => { const el = document.createElement('i'), u = g.caps[id]; if (u && u.length > 8) el.style.backgroundImage = 'url(' + u + ')'; el.style.setProperty('--r', ((((i * 37) % 7) - 3) * 0.45).toFixed(2) + 'deg'); wall.appendChild(el); });
    for (const id of ['fnA', 'fnB', 'fnC', 'fnD', 'fnActs', 'fnShareL']) $(id).classList.remove('on');
    $('fnImg').hidden = true; $('fnTip').textContent = ''; this.prepPoster();
    this.texts(); this.closeAlbum(); this.closeHelp(); if (this.lesson) this.lessonEnd(8); this.hide('hint');
    if (g.free) g.setFree(false);
    g.auto = false; this.onAuto(false); g.keys = {}; g.reverie = true; this.finaleOn = true;
    this.hide('hud'); this.show('finale'); $('finale').setAttribute('aria-hidden', 'false'); $('finale').scrollTop = 0;
    const k = first ? 1 : 0.25, at = (name, sec, fn) => this.later('fn' + name, sec * 1000 * k, fn), on = (id) => () => $(id).classList.add('on');
    at('A', 1.8, on('fnA'));
    [...wall.children].forEach((el, i) => at('w' + i, 4.8 + i * 0.22, () => { el.classList.add('on'); if (first && this.audio && i % 6 === 0) this.audio.chime(i / 6); }));
    const t1 = 4.8 + ids.length * 0.22;
    at('B', t1 + 1.3, on('fnB'));
    at('C', t1 + 5.0, () => { $('fnC').classList.add('on'); if (first && this.audio) this.audio.door(); });
    at('D', t1 + 9.8, on('fnD')); at('E', t1 + 11.2, () => { $('fnActs').classList.add('on'); $('fnShareL').classList.add('on'); });
  },
  closeFinale() {
    if (!this.finaleOn) return;
    this.finaleOn = false; this.game.reverie = false;
    for (const k in this.timers) if (k.startsWith('fn')) clearTimeout(this.timers[k]);
    this.hide('finale'); $('finale').setAttribute('aria-hidden', 'true');
    if (this.game.mode === 'play') this.show('hud');
  },
  fontsFor(font, text) { // the letters of a card are drawn with the page's own faces where those can be had in time
    try { return Promise.race([document.fonts.load(font, text), new Promise((r) => setTimeout(r, 1600))]).catch(() => {}); } catch (e) { return Promise.resolve(); }
  },
  // the whole wall as one sheet to pass on
  async posterCanvas() {
    const g = this.game, ids = this.mainIds(), en = this.lang === 'en';
    const load = (src) => new Promise((res) => { if (!src || src.length < 9) { res(null); return; } const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    const ims = await Promise.all(ids.map((id) => load(g.caps[id])));
    const serif = en ? '"Cormorant Garamond",Georgia,serif' : '"Noto Serif SC","Songti SC","STSong",Georgia,serif', sans = '"Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif';
    const l1 = this.t(UI.poster1), l2 = this.t(UI.poster2), end = this.t(UI.posterEnd), names = WORLDS.map((ch) => this.t(WORLD_TEXT[ch.id].name)).join('　');
    await this.fontsFor((en ? 'italic 500 ' : '900 ') + '64px ' + serif, l1 + l2 + end + this.t(UI.title));
    const W = 1080, M = 64, gap = 12, cols = 5, rows = Math.ceil(ids.length / cols), cw = (W - 2 * M - (cols - 1) * gap) / cols, chh = (cw * 2) / 3;
    const top = 330, gridH = rows * chh + (rows - 1) * gap, H = Math.round(top + gridH + 250);
    const cv = document.createElement('canvas'), c = cv.getContext('2d'); cv.width = W; cv.height = H;
    c.fillStyle = '#f7f3ea'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#1f2238'; c.textBaseline = 'alphabetic';
    const d = new Date();
    c.globalAlpha = 0.72; c.font = '600 26px ' + serif; c.fillText(this.t(UI.title) + '　' + this.t(UI.sub), M, 96);
    // where the game is found, at the head of the sheet beside its name
    c.textAlign = 'right'; c.globalAlpha = 0.8; c.font = '500 21px ' + sans; c.fillText(SITE_URL.replace(/^https?:\/\//, ''), W - M, 96); c.textAlign = 'left';
    c.globalAlpha = 1; c.font = (en ? 'italic 500 66px ' : '900 62px ') + serif; c.fillText(l1, M, 196); c.fillText(l2, M, 276);
    ims.forEach((im, i) => {
      const x = M + (i % cols) * (cw + gap), y = top + Math.floor(i / cols) * (chh + gap);
      c.save(); c.shadowColor = 'rgba(30,30,50,0.26)'; c.shadowBlur = 12; c.shadowOffsetY = 4; c.fillStyle = '#fff'; c.fillRect(x, y, cw, chh); c.restore();
      if (im) c.drawImage(im, x + 3, y + 3, cw - 6, chh - 6);
    });
    const y1 = top + gridH;
    c.fillStyle = '#1f2238'; c.font = (en ? 'italic 500 34px ' : '600 30px ') + serif;
    // the closing line, on one line if there is room, else broken at its first full stop
    const cut = end.indexOf(en ? '. ' : '。') + 1, parts = c.measureText(end).width <= W - 2 * M || cut <= 0 ? [end] : [end.slice(0, cut).trim(), end.slice(cut).trim()];
    parts.forEach((ln, i) => c.fillText(ln, M, y1 + 86 + i * 46));
    // the four places and his years at the foot, and the day she hung her wall where the line leaves room for it
    const foot = names + '　1867–1926', day = d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate();
    c.globalAlpha = 0.6; c.font = '400 19px ' + sans; c.fillText(foot, M, H - 58);
    if (c.measureText(foot).width + 36 + c.measureText(day).width <= W - 2 * M) { c.textAlign = 'right'; c.fillText(day, W - M, H - 58); c.textAlign = 'left'; }
    c.globalAlpha = 1;
    return cv;
  },
  // saved, or handed to the system's sheet where there is one
  async sharePoster() {
    const cv = await this.posterCanvas(); let url = ''; try { url = cv.toDataURL('image/png'); } catch (e) { url = ''; }
    if (url) this.offer(url, 'intothepainting-exhibition.png', $('fnImg'), $('fnTip'));
  },
  // made as soon as the ending opens, so that it lies ready when a button is pressed (only in that moment may a page open a window or the share sheet)
  prepPoster() {
    this.poster = null;
    this.posterReady = this.posterCanvas().then((cv) => new Promise((res) => { try { cv.toBlob((b) => { this.poster = b ? { blob: b } : null; res(); }, 'image/png'); } catch (e) { res(); } })).catch(() => {});
  },
  // music from the first moment a browser allows it: at once where it may, else with the first touch of the page
  wakeSound(ev) {
    const a = this.audio, g = this.game;
    // an iPhone with its ring switch on silent mutes whatever a page plays through Web Audio, unless the page says that what it plays is media
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) { /* no such thing here */ }
    try { a.start(); } catch (e) { return; }
    // the end of a touch, a click or a key: what every browser takes as her word that sound may begin
    const word = !!ev && (ev.type === 'pointerup' || ev.type === 'touchend' || ev.type === 'click' || ev.type === 'keydown');
    // a context that nothing has woken since the page came back (see the watch in the music) is made anew, now that she touches the page
    if (word && a.dead) { try { a.renew(); } catch (e) { /* the old one stays */ } }
    const c = a.ctx;
    if (c && c.state !== 'running') { // asleep, or cut off by a call or by another app: woken from inside a touch, with one sample of silence as the phones of old want it
      try { a.wake(true); const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, c.sampleRate); s.connect(c.destination); s.start(0); } catch (e) { /* the next touch tries again */ }
    } else if (c && word && a.came && this.ios) a.kick(); // back from a locked screen an iPhone can say that it plays, and be silent: put to sleep and woken once, it plays
    if (word) a.came = false;
    this.mediaChannel();
    if (a.ok() && g && g.mode === 'title' && !this.titleSong) { this.titleSong = true; a.setChapter(Math.max(0, g.wi), 2, 3); }
  },
  // older iPhones have no word for it: there a silent track looped by an audio element puts the page on the media channel, past the silent switch
  mediaChannel() {
    if (this.hush === undefined) {
      this.hush = null;
      if (navigator.audioSession || !this.ios) return;
      try {
        const n = 11025, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), w = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
        w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
        const el = document.createElement('audio');
        el.src = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })); el.loop = true; el.preload = 'auto'; el.setAttribute('playsinline', ''); el.setAttribute('x-webkit-airplay', 'deny');
        this.hush = el;
        document.addEventListener('visibilitychange', () => { try { if (document.hidden) el.pause(); } catch (e) { /* nothing to stop */ } });
      } catch (e) { this.hush = null; }
    }
    const el = this.hush;
    if (el && el.paused && !document.hidden) { try { const p = el.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* the next touch tries again */ } }
  },
  toggleFree() {
    const g = this.game, on = g.setFree(!g.free);
    if (on) { this.closeAlbum(); this.closeHelp(); this.hint(this.coarse ? 'hintFreeTouch' : 'hintFree', 9, true); } else this.hide('hint');
  },

  // ----- per frame: the dial, the frame, the little pictures, the ring -----
  frame() {
    const g = this.game;
    { // where a browser holds the sound back until the page is touched (at first, or after a call or another app took it), a line says so, and goes as soon as it plays
      const a = this.audio, c = a && a.ctx, now = performance.now();
      const need = !!c && (c.state !== 'running' || a.stuck) && a.vol > 0.005 && !document.hidden && !this.panel && (g.mode === 'title' || g.mode === 'play'); // (stuck: it says it plays, and its clock stands still)
      if (!need) this.sndSince = 0; else if (!this.sndSince) this.sndSince = now;
      const on = need && now - this.sndSince > 700, el = $('soundHint');
      if (on !== !!this.sndOn) { this.sndOn = on; el.classList.toggle('on', on); }
      if (on) el.classList.toggle('play', g.mode !== 'title');
    }
    if (g.mode === 'title' && this.audio) { // the title has its music too: the ground of the first world in the night, the melody as the day breaks
      const run = !!(this.audio.ctx && this.audio.ctx.state === 'running');
      if (run && this.audio.group) { this.audio.setNight(isNight(g.t) ? 1 : 0); if (this.audio.setIntensity) this.audio.setIntensity(0.3); }
    }
    if (g.mode !== 'play' || !g.ch) { $('frame').style.opacity = 0; $('marker').classList.remove('on'); $('orig').classList.remove('on'); $('app').classList.remove('easel'); $('app').classList.remove('framing'); if (this.lesson) this.lessonEnd(5); return; }
    const ch = g.ch, w = WORLD_TEXT[ch.id], night = isNight(g.t);
    if (this.audio) {
      this.audio.setNight(night ? 1 : 0);
      // the music grows with the paintings of this world: thin on arrival, full when the last is caught
      if (this.audio.setIntensity) this.audio.setIntensity(g.capCount(ch) / Math.max(1, ch.need)); else this.audio.setLevel(2 + Math.min(2, Math.floor(g.capCount(ch) / 2)));
      // the music leans to the painting she is near, and lets go of it some way off
      let ts = g.spot;
      if (ts < 0) { let bd = 1e9, bi = -1; ch.spots.forEach((sp, i) => { const d = Math.hypot(sp.x - g.pl.x, sp.z - g.pl.z); if (d < bd) { bd = d; bi = i; } }); ts = bd < (this.themeSpot === bi ? 26 : 16) ? bi : -1; }
      this.themeSpot = ts;
      const te = ts >= 0 ? g.focus(ts) : null;
      this.audio.setTheme(te ? te.id : null);
    }
    if (g.spot < 0 && g.viewK < 0.05) {
      if (this.heldHint) { const h = this.heldHint; this.heldHint = null; this.hint(h[0], h[1], h[2], h[3]); }
    }
    if (this.finaleDue) { const now = performance.now() / 1000; if (now > this.finaleDue || (g.spot < 0 && g.viewK < 0.05 && now > this.capAt + 4.5)) { this.finaleDue = 0; this.openFinale(true); } }
    // the interface comes in piece by piece: the sun's road at the first easel, the album and the rest with the first painting, the seasons when one first changes
    const nc = Object.keys(g.caps).length, app = $('app'), nowS0 = performance.now() / 1000;
    if (g.spot >= 0 || nc > 0) this.dialShown = true;
    app.classList.toggle('hide-more', nc === 0); app.classList.toggle('hide-seek', nc === 0 && !this.seekCalled); $('btnSeek').classList.toggle('call', nowS0 < (this.seekCallUntil || 0) && !g.auto);
    const nowS = performance.now() / 1000, carded = nowS < (this.cardUntil || 0);
    // the row of frames under the album: it comes when a painting is caught and goes a few seconds after she has walked on, so that the land is left to be looked at
    { const on = g.mode === 'play' && !g.free && nowS < (this.gainUntil || 0); $('gain').classList.toggle('on', on); if (on) this.wall(); }
    if (ENERGY) this.beatsRow();
    app.classList.toggle('hide-dial', !this.dialShown && !g.free);
    app.classList.toggle('hide-dots', nc < 2 && g.wi === 0 && !(this.seen && this.seen.season));
    app.classList.toggle('framing', !!g.free);
    app.classList.toggle('sun-locked', g.sunLocked());
    $('btnLeave').classList.toggle('go', g.spot >= 0 && !g.paintE && !!g.lastCap);
    if (g.viewK < 0.3 && this.saidId && $('capt').classList.contains('on') && g.spot < 0) $('capt').classList.remove('on');
    // by the easel: the name of the painting and its moment, outside the picture, and the ring that closes as its light comes round
    app.classList.toggle('easel', g.viewK > 0.25);
    const og = $('orig'), rs = g.spot >= 0 ? g.ringState() : null;
    if (rs && rs.e) {
      $('ogArc').setAttribute('stroke-dasharray', (rs.k * 100).toFixed(1) + ' 100');
      if (rs.st !== this.origSt) { this.origSt = rs.st; og.classList.toggle('done', rs.st === 'done'); }
      // the ring is there while a painting is on its way, and with the name for the few seconds after one is caught
      og.classList.toggle('on', g.viewK > 0.1 && (rs.st !== 'done' || og.classList.contains('said')));
    } else og.classList.remove('on');
    // the sun on its road
    const dot = $('sunDot'), p = dialXY(night ? (g.t > 0.5 ? 0.75 : 0.25) : g.t);
    dot.setAttribute('cx', p[0].toFixed(1)); dot.setAttribute('cy', p[1].toFixed(1)); dot.classList.toggle('night', night);
    $('sundial').setAttribute('aria-valuenow', String(Math.round(clamp((g.t - 0.25) / 0.5, 0, 1) * 100)));
    const spotNow = g.spot >= 0 ? g.spot : (g.viewK > 0.05 ? g.lastSpot : -1);
    const key = ch.id + '|' + g.phase + '|' + spotNow + '|' + Object.keys(g.caps).length + '|' + this.lang;
    if (key !== this.dialKey) {
      this.dialKey = key;
      const win = $('windows'), sz = $('seasons'); win.innerHTML = ''; sz.innerHTML = '';
      for (const e of ch.effects) {
        if (g.caps[e.id] || (e.phase >= 0 && e.phase !== g.phase) || !g.spotFound(e.spot)) continue;
        const a = dialXY(e.t0), b = dialXY(e.t1), path = document.createElementNS(SVGNS, 'path');
        path.setAttribute('d', 'M ' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' A 116 52 0 0 1 ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1));
        if (e.spot === spotNow) path.setAttribute('class', 'here');
        win.appendChild(path);
      }
      // the weather, the seasons or the years of this world: labels to read and to press. A golden dot marks one that still holds a painting
      for (let i = 0; i < ch.phases.length; i++) {
        const b = document.createElement('button'), dot = document.createElement('i');
        // (at an easel the dot speaks of this easel only, so that it can be followed)
        b.type = 'button'; b.className = 'sz' + (i === g.phase ? ' now' : '') + (ch.effects.some((e) => !g.caps[e.id] && (e.phase === i || e.phase < 0) && (spotNow >= 0 ? e.spot === spotNow : g.spotFound(e.spot))) ? ' todo' : '');
        b.style.setProperty('--c', w.dots[i]); b.setAttribute('aria-pressed', i === g.phase ? 'true' : 'false');
        b.appendChild(dot); b.appendChild(document.createTextNode(this.t(w.phases[i])));
        b.addEventListener('click', (ev) => { ev.stopPropagation(); g.setPhase(i); });
        sz.appendChild(b);
      }
    }
    // the edge of the picture, inked round while the light holds
    const fr = $('frame'), k = g.viewK;
    fr.style.opacity = Math.max(k * k, g.freeK || 0).toFixed(3);
    $('frInk').setAttribute('stroke-dasharray', (g.paintK * 100).toFixed(1) + ' 100');
    // the little pictures of this easel
    const th = $('thumbs');
    if (spotNow >= 0) {
      const tk = ch.id + '|' + spotNow + '|' + Object.keys(g.caps).length + '|' + g.phase;
      if (tk !== this.thumbKey) {
        this.thumbKey = tk; th.innerHTML = '';
        for (const e of ch.effects) {
          if (e.spot !== spotNow) continue;
          const d = document.createElement('div'), i = document.createElement('i'), got = g.caps[e.id];
          d.className = 'th' + (got ? ' got' : ''); d.dataset.id = e.id;
          if (got && got.length > 8) d.style.backgroundImage = 'url(' + got + ')';
          i.style.background = e.phase < 0 ? '#ffc65c' : w.dots[e.phase]; d.appendChild(i);
          // a tap on a small picture already caught: the day runs back to that painting's moment. One not yet caught cannot be hurried
          d.addEventListener('click', (ev) => { ev.stopPropagation(); if (g.caps[e.id]) g.want(e.id); else { d.classList.remove('no'); void d.offsetWidth; d.classList.add('no'); this.tip(g.needHand === 'sun' ? 'handSun' : g.needHand === 'season' ? 'handSeason' : 'noSkip'); } });
          th.appendChild(d);
        }
        const here = ch.effects.filter((x) => x.spot === spotNow), gotN = here.filter((x) => g.caps[x.id]).length;
        this.thumbsMixed = here.length > 1 && gotN > 0;
      }
      for (const d of th.children) { const e = ch.effects.find((x) => x.id === d.dataset.id); d.classList.toggle('now', !g.caps[e.id] && (e.phase < 0 || e.phase === g.phase) && g.t >= e.t0 && g.t <= e.t1); d.classList.toggle('want', g.wantId === e.id); }
      th.classList.toggle('on', k > 0.3);
    } else th.classList.remove('on');
    this.learnTick();
    // The ring that shows the next place. For her first two paintings it is always there, with how far the place is: on the place
    // itself when that is in sight, at the edge of the screen with a point towards it when it is not. For the third it is still
    // always there, without the distance. From the fourth on it is the plain ring it always was: only when the place is out of
    // sight, at the edge on the side where it lies. By then she knows what she is looking for
    const mk = $('marker'), t = k < 0.05 && !this.panel && !g.free && !carded ? g.targetScreen() : null;
    if (!t || (t.dist < 16 && t.up < 3.5)) { mk.classList.remove('on'); this.markOn = false; return; } // (near, the place itself is plain to see: unless it stands high above her)
    const door = t.kind === 'door', early = nc < 3 || door; // (the golden frame that leads on is always shown, whatever she has caught)
    const W = g.cssW, H = g.cssH, pad = early ? 38 : 30;
    let x = (t.nx * 0.5 + 0.5) * W, y = (1 - (t.ny * 0.5 + 0.5)) * H, rot = '';
    const off = t.behind || x < pad || x > W - pad || y < pad + 40 || y > H - 130;
    if (!off && !early) { mk.classList.remove('on'); this.markOn = false; return; }
    if (off) {
      let dx = x - W / 2, dy = y - H / 2;
      if (t.behind) { const l = Math.hypot(dx, dy) || 1; dx = (dx / l) * W; dy = (dy / l) * H; }
      const s = Math.min((W / 2 - pad) / (Math.abs(dx) || 1), (H / 2 - pad) / (Math.abs(dy) || 1));
      x = clamp(W / 2 + dx * s, pad, W - pad); y = clamp(H / 2 + dy * s, pad + 40, H - 140);
      rot = 'rotate(' + (Math.atan2(dy, dx) + Math.PI / 2).toFixed(3) + 'rad)';
    }
    mk.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'; mk.firstChild.style.transform = rot;
    const dist = Math.round(t.dist) + this.t(UI.metres); if (dist !== this.mkD) { this.mkD = dist; $('mkDist').textContent = dist; }
    mk.classList.toggle('plain', !early); mk.classList.toggle('bare', door ? g.wi > 0 : nc === 2); mk.classList.toggle('at', !off); mk.classList.toggle('call', early && (performance.now() / 1000 < (this.callUntil || 0) || (door && g.wi === 0)));
    mk.classList.add('on'); this.markOn = true;
  },

  // ----- input -----
  bind() {
    const g = this.game, cv = $('view');
    const begin = (fresh) => {
      this.audio.start(); this.audio.wake(true);
      this.hide('title'); $('btnLang').style.display = 'none';
      if (fresh) { this.ended = false; LS.set('ruhua.monet.fin', ''); for (const id in g.caps) { PICS.del(id); delete g.big[id]; } }
      this.finaleDue = 0;
      g.begin(fresh); track(fresh || !Object.keys(g.caps).length ? 'begin' : 'continue', { paintings: Object.keys(g.caps).length, touch: this.coarse ? 1 : 0 });
      this.learnBegin(fresh); this.albumSeen = false; this.capShown = g.beatsCap(); this.mainShown = g.mainCount(); this.beatsKey = ''; // (0.9) what the row of beats shows to begin with
      // a game already complete that has not had its ending yet is given it now
      if (!g.mainLeft() && !this.ended) { this.ended = true; LS.set('ruhua.monet.fin', '1'); this.capAt = performance.now() / 1000; this.finaleDue = this.capAt + 7; }
      if (!g.trans) this.onCard(g.ch);
      if (this.audio.ok()) this.audio.setChapter(g.trans ? g.trans.to : g.wi, 2, 4);
      this.count();
    };
    // any first touch of the page lets the music begin, on the title already
    // (a browser decides which touch counts: so every kind is listened for, until the sound runs)
    const WAKE = ['pointerdown', 'pointerup', 'mousedown', 'touchend', 'click', 'keydown'];
    // (they stay on: a call or another app can cut the sound off again, and the next touch brings it back)
    const wake = (ev) => this.wakeSound(ev);
    for (const ev of WAKE) window.addEventListener(ev, wake, true);
    wake();
    $('btnStart').addEventListener('click', () => begin(false));
    $('btnFresh').addEventListener('click', () => begin(true));
    $('btnLang').addEventListener('click', () => { this.lang = this.lang === 'zh' ? 'en' : 'zh'; LS.set('ruhua.lang', this.lang); this.texts(); });
    const seek = () => { g.auto = !g.auto; this.onAuto(g.auto); };
    $('btnSeek').addEventListener('click', seek);
    $('btnAlbum').addEventListener('click', () => (this.panel ? this.closeAlbum() : this.openAlbum()));
    $('alClose').addEventListener('click', () => this.closeAlbum());
    $('btnHelp').addEventListener('click', () => (this.helpOn ? this.closeHelp() : this.openHelp()));
    $('hpClose').addEventListener('click', () => this.closeHelp());
    $('btnFree').addEventListener('click', () => this.toggleFree());
    $('btnLeave').addEventListener('click', () => { if (g.spot >= 0) g.leaveSpot(); });
    $('btnShareNow').addEventListener('click', () => { this.hide('btnShareNow'); if (!this.frees.length) return; if (g.free) this.toggleFree(); this.openAlbum(); this.openDetail('free:0'); this.shareCard(); });
    // on a touch screen a picture taken down is turned over with a sweep of the finger
    { const pr = document.querySelector('#detail .pair'); let sx = null;
      pr.addEventListener('pointerdown', (e) => { sx = e.clientX; });
      pr.addEventListener('pointerup', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 60) this.stepDetail(e.clientX < sx ? 1 : -1); sx = null; });
      pr.addEventListener('pointercancel', () => { sx = null; }); }
    $('fnBack').addEventListener('click', () => this.closeFinale());
    $('fnShare').addEventListener('click', () => this.sharePoster());
    $('fnX').addEventListener('click', () => this.shareTo('x', 'show')); $('fnIG').addEventListener('click', () => this.shareTo('ig', 'show'));
    $('alShow').addEventListener('click', () => { this.closeAlbum(); this.openFinale(false); });
    $('shutter').addEventListener('click', () => { if (g.free && g.freeK > 0.8) g.pendingFree = true; });
    $('dtSave').addEventListener('click', () => this.shareCard());
    $('dtX').addEventListener('click', () => this.shareTo('x'));
    $('dtIG').addEventListener('click', () => this.shareTo('ig'));
    $('dtCap').addEventListener('keydown', (e) => e.stopPropagation()); // (typing the words must not walk her about)
    $('dtDel').addEventListener('click', () => { const id = String(this.detail || ''); if (!id.startsWith('free:')) return; const f = this.frees.splice(+id.slice(5), 1)[0]; if (f && f.k) { PICS.del(f.k); delete g.big[f.k]; } this.saveFrees(); this.closeDetail(); this.album(); });
    $('coach').addEventListener('click', () => { if (this.lesson) this.lessonEnd(6); });
    $('dtBack').addEventListener('click', () => this.closeDetail());
    $('dtPrev').addEventListener('click', () => this.stepDetail(-1)); $('dtNext').addEventListener('click', () => this.stepDetail(1));
    $('dtHis').addEventListener('error', () => $('dtHisBox').classList.add('gone'));
    for (const b of $('segQ').children) b.addEventListener('click', () => { g.setQuality(+b.dataset.q, true); LS.set('ruhua.monet.q', String(g.quality)); });
    for (const b of $('segL').children) b.addEventListener('click', () => { this.lang = b.dataset.l; LS.set('ruhua.lang', this.lang); this.texts(); });
    $('vol').addEventListener('input', (e) => { const v = e.target.value / 100; this.audio.setVolume(v); LS.set('ruhua.vol', String(v)); });
    $('alSets').addEventListener('click', () => this.openSettings());
    $('btnRestart').addEventListener('click', () => {
      this.closeAlbum(); this.ended = false; LS.set('ruhua.monet.fin', ''); this.finaleDue = 0;
      for (const id in g.caps) { PICS.del(id); delete g.big[id]; }
      g.caps = {}; g.unlocked = 0; g.found = {}; g.days = 0; g.met = {}; g.save(); this.count(); this.dialKey = ''; this.thumbKey = '';
      if (g.mode !== 'title') this.learnBegin(true);
      if (g.mode === 'title') { this.texts(); return; }
      if (g.wi === 0 && !g.trans) { g.place(g.ch.start); g.doorOn = false; g.t = g.ch.t0; g.phase = g.prevPhase = 0; g.phShown = null; } else g.startTransition(0);
    });
    this.onQuality(g.quality);

    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (this.finaleOn) { if (e.code === 'Escape') this.closeFinale(); return; }
      if (e.code === 'Escape') { if (this.helpOn) this.closeHelp(); else if (this.detail) this.closeDetail(); else if (this.panel) this.closeAlbum(); else if (g.free) this.toggleFree(); else if (g.spot >= 0) g.leaveSpot(); return; }
      if (this.detail) { if (e.code === 'ArrowLeft') this.stepDetail(-1); else if (e.code === 'ArrowRight') this.stepDetail(1); return; }
      if (g.mode === 'title' || g.mode === 'boot') return;
      g.keys[e.code] = true;
      if (e.code === 'KeyG' && !e.repeat) seek();
      if (e.code === 'KeyJ' && !e.repeat) this.panel ? this.closeAlbum() : this.openAlbum();
      if (e.code === 'KeyH' && !e.repeat) this.helpOn ? this.closeHelp() : this.openHelp();
      if ((e.code === 'KeyF' || e.code === 'KeyP') && !e.repeat && g.mode === 'play') this.toggleFree(); // F for frame (P still works)
      if ((e.code === 'Enter' || e.code === 'NumpadEnter') && g.free && g.freeK > 0.8 && !e.repeat) g.pendingFree = true;
      if (e.code === 'BracketLeft') g.setTime(g.t - 0.012);
      if (e.code === 'BracketRight') g.setTime(g.t + 0.012);
      if (/^Digit[1-9]$/.test(e.code) && !e.repeat && g.mode === 'play') { const i = +e.code.slice(5) - 1; if (i < g.ch.phases.length) g.setPhase(i); }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { g.keys[e.code] = false; });
    window.addEventListener('blur', () => { g.keys = {}; g.flyHeld = false; if (this.touchFly) { clearTimeout(this.touchFly.timer); this.touchFly = null; } $('flybtn').classList.remove('held', 'near'); });

    // looking round: drag anywhere on the painting
    const look = (dx, dy, k) => { g.camYaw += dx * k; g.camPitch = clamp(g.camPitch - dy * k, -1.15, 0.5); };
    cv.addEventListener('pointerdown', (e) => {
      if (g.mode !== 'play') return;
      this.closeAlbum();
      if (e.pointerType === 'touch') {
        const left = e.clientX < g.cssW * 0.42;
        if (left && !this.touchMove) { this.touchMove = { id: e.pointerId, x: e.clientX, y: e.clientY }; const s = $('stick'); s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; s.style.opacity = 1; }
        else {
          // the lower right of the screen is the parasol's: a tap there is a hop, a thumb held there lifts her, and a ring shows under it.
          // The same thumb looks round by dragging: a touch that moves off at once is a look and nothing more
          if (!this.touchFly && e.clientX > g.cssW * 0.5 && e.clientY > g.cssH * (this.lay && this.lay.tall ? 0.5 : 0.36) && g.viewK < 0.25 && !g.free) {
            const tf = this.touchFly = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now(), on: false }, f = $('flybtn');
            f.style.left = e.clientX + 'px'; f.style.top = e.clientY + 'px'; f.classList.remove('ghost'); f.classList.add('near');
            tf.timer = setTimeout(() => { if (this.touchFly === tf && !tf.on) { tf.on = true; g.flyHeld = true; f.classList.add('held'); } }, 150);
          }
          if (!this.touchLook) this.touchLook = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
        return;
      }
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      cv.classList.add('drag');
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    });
    cv.addEventListener('pointermove', (e) => {
      if (this.touchMove && e.pointerId === this.touchMove.id) {
        const dx = e.clientX - this.touchMove.x, dy = e.clientY - this.touchMove.y, l = Math.hypot(dx, dy), m = 46, k = l > m ? m / l : 1;
        g.joy[0] = (dx * k) / m; g.joy[1] = (dy * k) / m;
        $('stick').firstElementChild.style.transform = 'translate(' + dx * k + 'px,' + dy * k + 'px)';
        return;
      }
      const tf = this.touchFly;
      if (tf && e.pointerId === tf.id && !tf.on && Math.hypot(e.clientX - tf.x, e.clientY - tf.y) > 16) { clearTimeout(tf.timer); this.touchFly = null; $('flybtn').classList.remove('near'); } // it moved off before it settled: a look
      if (this.touchLook && e.pointerId === this.touchLook.id) { look(e.clientX - this.touchLook.x, e.clientY - this.touchLook.y, 0.0052); this.touchLook.x = e.clientX; this.touchLook.y = e.clientY; return; }
      if (this.drag && e.pointerId === this.drag.id) { look(e.clientX - this.drag.x, e.clientY - this.drag.y, 0.0042); this.drag.x = e.clientX; this.drag.y = e.clientY; }
    });
    const up = (e) => {
      if (this.touchMove && e.pointerId === this.touchMove.id) { this.touchMove = null; g.joy[0] = g.joy[1] = 0; $('stick').style.opacity = 0; $('stick').firstElementChild.style.transform = ''; }
      if (this.touchLook && e.pointerId === this.touchLook.id) this.touchLook = null;
      if (this.touchFly && e.pointerId === this.touchFly.id) {
        const tf = this.touchFly, f = $('flybtn'); clearTimeout(tf.timer); this.touchFly = null;
        if (tf.on) { g.flyHeld = false; f.classList.remove('held', 'near'); }
        else { g.flyHeld = true; f.classList.add('held'); setTimeout(() => { if (!this.touchFly) { g.flyHeld = false; f.classList.remove('held', 'near'); } }, 130); } // lifted at once without moving: a tap, one beat of the parasol
      }
      if (this.drag && e.pointerId === this.drag.id) { this.drag = null; cv.classList.remove('drag'); }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => { g.camDist = clamp(g.camDist * (e.deltaY > 0 ? 1.08 : 0.92), 3.6, 14); e.preventDefault(); }, { passive: false });
    // the dial: take the sun and move it
    const dial = $('sundial');
    const setFrom = (e) => {
      const r = dial.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 264;
      g.setTime(0.25 + (0.5 * Math.acos(clamp((132 - x) / 116, -1, 1))) / Math.PI);
    };
    dial.addEventListener('pointerdown', (e) => {
      if (g.mode !== 'play') return;
      this.dialDrag = true; g.scrubbing = true; setFrom(e);
      try { dial.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
      e.preventDefault();
    });
    dial.addEventListener('pointermove', (e) => { if (this.dialDrag) setFrom(e); });
    const dialUp = () => { this.dialDrag = false; g.scrubbing = false; };
    dial.addEventListener('pointerup', dialUp); dial.addEventListener('pointercancel', dialUp);
    dial.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { g.setTime(g.t + (e.code === 'ArrowLeft' ? -0.012 : 0.012)); e.preventDefault(); e.stopPropagation(); }
    });
  },
};

// test and debugging hooks
window.__ruhua = App; App.SIGHTS = SIGHTS; App.WORLDS = WORLDS; // (for the tests and for the film camera)
function startApp(data) {
  if (data && data.save && typeof data.save.wi === 'number' && data.save.caps && !Game.loadSave()) Game._mem = data.save;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => App.init()); else App.init();
}
const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(startApp); else startApp((hot && hot.data) || {});
