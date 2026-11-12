// ---------- the people of the paintings, alive ----------
// live: when true, person() in 06_paint.js paints nobody into a world and lists them in W.folk instead, for this layer to draw.
// enter(g): a world has just been shown. update(g, dt): once a frame while she plays. draw(S, g, env, t): strokes for this frame
// (called on the title too, where g.mode is 'title').
// Who is here: the people painted into the worlds (their records in W.folk), who stand exactly at their marks whenever a picture
// may be taken and live a little the rest of the time, and a few passers by who belong to no painting (the extras below), who
// go home at night and are never there when she settles at an easel.
// A record may also say kind: 'figure', for the fuller figure that the Argenteuil meadows paint (seven touches of skirt, a bodice,
// a band on the hat, a parasol turned to the painter: its cols are the colours of its oriented strokes in order, seven of skirt, one of
// the skirt's top, one of the bodice and, with a parasol, one of the shaft, then those of the two parasol dabs, the canopy and the light across it).
const FOLK = (() => {
  const PI = Math.PI, TW = PI * 2;
  const wrap = (a) => { a = (a + PI) % TW; if (a < 0) a += TW; return a - PI; };
  const fr = (v) => v - Math.floor(v);
  const hh = (i, k) => fr(Math.sin(i * 12.9898 + k * 78.233 + 0.37) * 43758.5453);
  const SKIN = [0.86, 0.68, 0.56], SKIN2 = [0.84, 0.66, 0.54], HAT0 = [0.85, 0.75, 0.45], SHAFT = [0.3, 0.26, 0.2];
  const WOOD = [0.42, 0.32, 0.22], WOOD2 = [0.5, 0.4, 0.28], HAY = [0.86, 0.76, 0.46], CANVAS = [0.93, 0.9, 0.82], LINE = [0.82, 0.84, 0.86];
  const DAUBS = [[0.42, 0.6, 0.82], [0.48, 0.66, 0.42], [0.92, 0.66, 0.72], [0.95, 0.86, 0.5]];
  const C0 = [0.9, 0.88, 0.84], C1 = [0.5, 0.5, 0.52], C2 = [0.6, 0.46, 0.32], C3 = [0.66, 0.5, 0.3], C4 = [0.56, 0.42, 0.3], C5 = [0.4, 0.3, 0.22], C6 = [0.2, 0.3, 0.36], C7 = [0.66, 0.3, 0.24], C8 = [0.78, 0.68, 0.5], C9 = [0.3, 0.26, 0.24], C10 = [0.24, 0.32, 0.38], C11 = [0.36, 0.3, 0.24], C12 = [0.62, 0.42, 0.32]; // colours of the passers by's things: beard, palette, basket, tines, boat, dog
  const CAP = 350;          // strokes of this layer in a frame, at most
  const FAR = 220;          // no passer by is drawn further than this from the eye (the painted ones up to FAR_P)
  const FAR_P = 420;
  const NOTICE = 7, HEAR = 12, GREET_GAP = 20;
  const PENT = [[0, 1, 2, 4, 5], [0, 2, 3, 4, 6]];

  const figs = [], extras = [], props = [], log = [], count = {};
  const st = { world: null, ch: null, clock: 0, rnd: null, lastSound: -99, summer: 1, seen: 0 };

  // ----- the lie of the land -----
  const inWorld = (ch, x, z, m) => { const dx = x - ch.center[0], dz = z - ch.center[1], r = ch.radius - m; return dx * dx + dz * dz < r * r; };
  function taken(W, x, z, up, pad) {
    for (const c of W.colliders || []) { const dx = x - c.x, dz = z - c.z, r = c.r + pad; if (dx * dx + dz * dz < r * r) return true; }
    for (const c of W.casters || []) {
      const dx = x - c.x, dz = z - c.z;
      if (c.k === 'ball') { const dy = up - c.y, r = c.r + pad; if (dx * dx + dy * dy + dz * dz < r * r) return true; }
      else if (c.k === 'pole') { const r = c.r + pad; if (up < c.h + pad && dx * dx + dz * dz < r * r) return true; }
      else if (c.k === 'cone') { if (up < c.h + pad) { const r = c.r * (1 - clamp(up / c.h, 0, 1)) + pad; if (dx * dx + dz * dz < r * r) return true; } }
      else if (c.k === 'box' && c.pts) { if (up < c.h + pad && inPoly(c.pts, x, z, pad)) return true; }
    }
    return false;
  }
  function inPoly(pts, x, z, pad) {
    let pos = 0, neg = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ex = b[0] - a[0], ez = b[1] - a[1], l = Math.hypot(ex, ez) || 1;
      const d = (ex * (z - a[1]) - ez * (x - a[0])) / l;
      if (d > pad) pos++; else if (d < -pad) neg++;
    }
    return pos === 0 || neg === 0;
  }
  const easelDist = (ch, x, z) => {
    let d = 1e9;
    for (const s of ch.spots || []) { d = Math.min(d, Math.hypot(s.x - x, s.z - z)); const e = s.easel || [s.x + 1.2, s.z + 0.6]; d = Math.min(d, Math.hypot(e[0] - x, e[1] - z)); }
    return d;
  };
  // a place a person may stand on: dry, open, not in a bed of flowers, not on the bridge, not at an easel
  function standable(W, ch, x, z, pad, anywhere) {
    if (!anywhere && !inWorld(ch, x, z, 6)) return false;
    const h = W.h(x, z);
    if (W.waterY !== null && W.waterY !== undefined && h < W.waterY + 0.3) return false;
    if (W.deck && W.deck(x, z) !== null) return false;
    if (W.ground && W.ground.mask && W.ground.mask(x, z) < 0.5) return false;
    if (taken(W, x, z, 1.0, pad)) return false;
    return easelDist(ch, x, z) > 2.4;
  }
  // a straight way out from a place: every step of it standable and gently sloped
  function wayOK(W, ch, x0, z0, dx, dz, len, pad) {
    let hp = W.h(x0, z0);
    for (let d = 0.6; d <= len + 0.01; d += 0.6) {
      const x = x0 + dx * d, z = z0 + dz * d, h = W.h(x, z);
      if (!standable(W, ch, x, z, pad, true) || Math.abs(h - hp) > 0.3) return false; // (the painted may stand beyond where she can go)
      hp = h;
    }
    return true;
  }
  // the ways a painted figure may stroll from its mark (and back): the longest one in each of sixteen directions
  function findWays(W, ch, homes, lens, pad) {
    const out = [];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TW + 0.1, dx = Math.sin(a), dz = -Math.cos(a);
      for (const L of lens) {
        let ok = true;
        for (const h of homes) if (!wayOK(W, ch, h[0], h[1], dx, dz, L, pad)) ok = false;
        if (ok) { out.push([dx, dz, L]); break; }
      }
    }
    return out;
  }
  // which way the nearest water lies from a place, if there is any within reach
  function waterDir(W, x, z) {
    if (W.waterY === null || W.waterY === undefined) return null;
    let best = null, bd = 1e9;
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * TW, dx = Math.sin(a), dz = -Math.cos(a);
      for (let r = 2; r < 70; r += 2) if (W.h(x + dx * r, z + dz * r) < W.waterY - 0.1) { if (r < bd) { bd = r; best = a; } break; }
    }
    return best;
  }

  // ----- the strokes: as the world's own painter would lay them -----
  // The dynamic strokes are drawn without the world's style, size boost, near shrink and turning to the eye. So that a figure at its
  // mark looks exactly as person() painted it, those are applied here instead.
  const E = { S: null, seeds: null, kp: 1, nk: 1, axw: 1, sx: 0.7, sz: -0.7, lm: 1, wm: 1, boost: 1, wind: 1, tilt: 0.92, cx: 0, cy: 0, cz: 0, k: 1, nS: 1, nB: 1, id: 0, j: 0, n: 0 };
  function seed() {
    const S = E.S;
    // the painted strokes keep the very seeds the world would have given them (if the record carries them), so their small shifts of hue are the same
    if (S.sca && S.n > 0) S.sca[(S.n - 1) * 4 + 3] = E.seeds && E.j < E.seeds.length ? E.seeds[E.j] : hh(E.id * 31 + E.j, 4.7);
    E.j++; E.n++;
  }
  function put(x, y, z, dx, dy, dz, nx, ny, nz, len, wid, c, motion, cell, flags) {
    const S = E.S;
    if (E.k < 0.01) { E.j++; return; }
    if (E.n >= CAP || S.n >= S.max) return;
    let lm, wm;
    if (flags & FLAG_AXIAL) { lm = 0.45 * E.lm + 0.55; wm = (0.45 * E.wm + 0.55) * E.axw; }
    else {
      lm = E.lm * E.nS; wm = E.wm * E.nS;
      // a touch seen from the side turns to the eye, as the shader turns the touches of the world
      let l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
      const q = nx * dx + ny * dy + nz * dz; nx -= dx * q; ny -= dy * q; nz -= dz * q;
      l = Math.hypot(nx, ny, nz);
      if (l > 1e-5 && E.tilt > 0) {
        nx /= l; ny /= l; nz /= l;
        let vx = E.cx - x, vy = E.cy - y, vz = E.cz - z; const vl = Math.hypot(vx, vy, vz) || 1; vx /= vl; vy /= vl; vz /= vl;
        let nv = nx * vx + ny * vy + nz * vz;
        if (nv < 0) { nx = -nx; ny = -ny; nz = -nz; nv = -nv; }
        const k = E.tilt * (1 - sstep(0.2, 0.8, nv));
        if (k > 0.002) {
          let mx = nx + (vx - nx) * k, my = ny + (vy - ny) * k, mz = nz + (vz - nz) * k; const ml = Math.hypot(mx, my, mz) || 1; mx /= ml; my /= ml; mz /= ml;
          const p = dx * mx + dy * my + dz * mz; let ax = dx - mx * p, ay = dy - my * p, az = dz - mz * p; const al = Math.hypot(ax, ay, az);
          if (al > 1e-3) { dx = ax / al; dy = ay / al; dz = az / al; nx = mx; ny = my; nz = mz; }
        }
      }
    }
    S.add(x, y, z, dx, dy, dz, nx, ny, nz, len * lm * E.boost * E.k, wid * wm * E.boost * E.k, c, motion > 0 ? motion * E.wind : motion, cell, 0, flags);
    seed();
  }
  function dab(x, y, z, roll, len, wid, c, cell, px, py, pz) {
    const S = E.S;
    if (E.k < 0.01) { E.j++; return; }
    if (E.n >= CAP || S.n >= S.max) return;
    const f = E.boost * E.nB * E.k;
    S.bill(x, y, z, roll, len * E.lm * f, wid * E.wm * f, c, 0, cell, 0, false, px, py, pz, 0);
    seed();
  }
  // a limb or a pole from one point to another: a touch that turns about its own length to face the eye
  function rod(ax, ay, az, bx, by, bz, wid, c, cell, over) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, l = Math.hypot(dx, dy, dz);
    if (l < 1e-3) return;
    put((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, dx, dy, dz, 1, 0, 0, l + (over || 0), wid, c, 0, cell, FLAG_AXIAL);
  }
  function frameSetup(S, g, env) {
    E.S = S;
    const ph = g.phaseNow ? g.phaseNow() : null, sty = (g.ch && g.ch.style) || { len: 1, wid: 1, wind: 1 };
    E.lm = (sty.len || 1) * (ph && ph.len ? ph.len : 1); E.wm = (sty.wid || 1) * (ph && ph.wid ? ph.wid : 1); E.wind = sty.wind === undefined ? 1 : sty.wind;
    const q = g.quality === undefined ? 2 : g.quality, frac = q === 2 ? 1 : q === 1 ? 0.72 : 0.48;
    E.boost = Math.min(1.35, 1 / Math.sqrt(frac));
    E.tilt = g.tilt ? g.tilt[0] : 0.92;
    const cp = g.cam && g.cam.pos ? g.cam.pos : [0, 0, 0];
    E.cx = cp[0]; E.cy = cp[1]; E.cz = cp[2]; E.n = 0;
    // which way the light comes from, along the ground: the side of a near figure that takes it is painted lighter
    const sd = env && env.sunDir, sl = sd ? Math.hypot(sd[0], sd[2]) : 0;
    if (sl > 1e-3) { E.sx = sd[0] / sl; E.sz = sd[2] / sl; } else { E.sx = 0.7; E.sz = -0.7; }
  }
  // how the world's painter shrinks touches close to the eye. A figure at its mark is shrunk just so (that is how it was painted);
  // one that lives (live 1) keeps its full size, so that close by it does not break into floating pieces
  function near(x, y, z, live) {
    E.nk = sstep(1.5, 17, Math.hypot(x - E.cx, y - E.cy, z - E.cz));
    const k = E.nk * (1 - live) + live;
    E.nS = 0.22 + 0.78 * k; E.nB = 0.61 + 0.39 * k;
  }

  // ----- one figure -----
  // P: the pose of this frame. At rest (all of it zero, heading the painted yaw, at the mark) this lays the very strokes of person()
  const P = { x: 0, y: 0, z: 0, x0: 0, z0: 0, hd: 0, s: 1, cols: null, o: null, kind: 'person', bob: 0, lx: 0, lz: 0, bend: 0, nod: 0, walk: 0, ph: 0,
    wx: 0, wz: 0, ptx: 0, ptz: 0, spin: 0, beard: 0,
    arms: 0, h1x: 0, h1y: 0, h1z: 0, h2x: 0, h2y: 0, h2z: 0, a1: 0, a2: 0, tx: 0, ty: 0, tz: 0 };
  function rest(F) {
    P.x = F.x0; P.y = F.y0; P.z = F.z0; P.x0 = F.x0; P.z0 = F.z0; P.hd = F.yaw0; P.s = F.s; P.cols = F.cols; P.o = F.o; P.kind = F.kind;
    P.bob = 0; P.lx = 0; P.lz = 0; P.bend = 0; P.nod = 0; P.walk = 0; P.ph = 0; P.wx = 0; P.wz = 0; P.ptx = 0; P.ptz = 0; P.spin = 0; P.beard = F.beard || 0;
    P.a1 = 0; P.a2 = 0;
  }
  // where her shoulders are this frame (after drawBody has set the top)
  const SH = [0, 0, 0];
  function shoulder(side) { const s = P.s, rx = Math.cos(P.hd), rz = Math.sin(P.hd); SH[0] = P.tx + rx * 0.15 * s * side; SH[1] = P.ty + 0.14 * s; SH[2] = P.tz + rz * 0.15 * s * side; return SH; }
  function arm(side, hx, hy, hz, k) {
    if (k < 0.05) return;
    const sh = shoulder(side), c = P.cols[P.kind === 'figure' ? 8 : 4];
    rod(sh[0], sh[1], sh[2], sh[0] + (hx - sh[0]) * k, sh[1] + (hy - sh[1]) * k, sh[2] + (hz - sh[2]) * k, 0.09 * P.s, c, CELL.DAB, 0.05);
    dab(sh[0] + (hx - sh[0]) * k, sh[1] + (hy - sh[1]) * k, sh[2] + (hz - sh[2]) * k, 0, 0.08 * P.s * k, 0.08 * P.s * k, SKIN, CELL.DOT, 0, 1, 0);
  }
  // where the hands are wanted this frame (x, y, z, how far they reach there: 0 they hang). Tools and gestures set them; the old
  // recipe draws a stroke of an arm to each, the near body draws its arms to them
  const HR = [0, 0, 0, 0], HL = [0, 0, 0, 0];
  function hand(side, x, y, z, k) { const h = side > 0 ? HR : HL; h[0] = x; h[1] = y; h[2] = z; h[3] = k; }
  function oldArms() { if (HR[3] > 0.05) arm(1, HR[0], HR[1], HR[2], HR[3]); if (HL[3] > 0.05) arm(-1, HL[0], HL[1], HL[2], HL[3]); }
  // the top of the body, as drawBody places it
  function torso() {
    const s = P.s, fx = Math.sin(P.hd), fz = -Math.cos(P.hd), b = P.bend;
    P.tx = P.x + P.lx * 0.55 + fx * b * 0.22 * s; P.ty = P.y + P.bob + (P.kind === 'figure' ? 1.2 : 1.18) * s - b * 0.12 * s; P.tz = P.z + P.lz * 0.55 + fz * b * 0.22 * s;
  }
  // a wave: a hand up and waving (the left one if the right holds a parasol)
  function waveHand(t, id) {
    if (P.a1 <= 0.05) return;
    const side = P.o && P.o.parasol ? -1 : 1, sh = shoulder(side), s = P.s, rx = Math.cos(P.hd) * side, rz = Math.sin(P.hd) * side, fx = Math.sin(P.hd), fz = -Math.cos(P.hd);
    const wv = Math.sin(t * 9 + id) * 0.1 * s;
    hand(side, sh[0] + rx * (0.18 * s + wv) + fx * 0.06 * s, sh[1] + 0.42 * s, sh[2] + rz * (0.18 * s + wv) + fz * 0.06 * s, P.a1);
  }
  function drawBody() {
    const s = P.s, y = P.y + P.bob, x = P.x, z = P.z, hd = P.hd, fx = Math.sin(hd), fz = -Math.cos(hd), c = P.cols, o = P.o;
    const bend = P.bend, lx = P.lx, lz = P.lz;
    if (P.kind === 'figure') {
      for (let i = 0; i < 7; i++) {
        const a = hd + i * 0.898, ca = Math.cos(a), sa = Math.sin(a), sw = P.walk * 0.3 * Math.sin(P.ph + i * 0.9) * (ca * Math.cos(hd) + sa * Math.sin(hd));
        put(x + ca * 0.2 * s + lx * 0.12, y + 0.5 * s, z + sa * 0.2 * s + lz * 0.12, -ca * 0.3 + fx * sw + P.wx * 0.14, 1, -sa * 0.3 + fz * sw + P.wz * 0.14, ca, 0.3, sa, 1.04 * s, 0.4 * s, c[i], 0.05, CELL.BLADE, 0);
      }
      put(x + lx * 0.25, y + 0.76 * s, z + lz * 0.25, lx * 0.4, 1, lz * 0.4, 1, 0, 0, 0.74 * s, 0.42 * s, c[7], 0, CELL.DAB, FLAG_AXIAL);
      P.tx = x + lx * 0.55 + fx * bend * 0.22 * s; P.ty = y + 1.2 * s - bend * 0.12 * s; P.tz = z + lz * 0.55 + fz * bend * 0.22 * s;
      put(P.tx, P.ty, P.tz, lx * 0.8 + fx * bend * 0.9, 1, lz * 0.8 + fz * bend * 0.9, 1, 0, 0, 0.56 * s, 0.36 * s, c[8], 0, CELL.DAB, FLAG_AXIAL);
      const hx = x + lx + fx * (bend * 0.5 + P.nod * 0.04) * s, hy = y - (bend * 0.38 + P.nod * 0.05) * s, hz = z + lz + fz * (bend * 0.5 + P.nod * 0.04) * s;
      dab(hx, hy + 1.54 * s, hz, 0, 0.21 * s, 0.2 * s, SKIN2, CELL.DOT, 0, 1, 0);
      dab(hx, hy + 1.67 * s, hz, 0, 0.46 * s, 0.15 * s, o.hat || HAT0, CELL.DAB, 0, 1, 0);
      if (o.band) dab(hx, hy + 1.63 * s, hz, 0, 0.3 * s, 0.06 * s, o.band, CELL.DAB, 0, 1, 0);
      if (o.parasol && o.from) {
        const k0 = E.k; E.k = E.kp;
        const v = o.from, tl = Math.hypot(v.x - P.x0, v.z - P.z0) || 1, qx = -(v.z - P.z0) / tl, qz = (v.x - P.x0) / tl; // turned to the painter from the mark
        const ax = x + qx * 0.5 * s + lx * 0.8 + P.ptx * 0.3 * s, az = z + qz * 0.5 * s + lz * 0.8 + P.ptz * 0.3 * s, ay = y + 1.72 * s;
        put((x + ax) / 2, y + 1.5 * s, (z + az) / 2, ax - x, 0.5 * s, az - z, 0, 1, 0, 0.7 * s, 0.03, SHAFT, 0, CELL.LONG_B, FLAG_AXIAL);
        dab(ax, ay, az, 0.35 + P.spin * 0.3, 0.92 * s, 0.68 * s, c[10], CELL.DOT, 0, 1, 0);
        dab(ax - qx * 0.05 * s, ay + 0.13 * s, az - qz * 0.05 * s, 0.35 + P.spin * 0.3, 0.56 * s, 0.24 * s, c[11], CELL.DAB, 0, 1, 0);
        E.k = k0;
      }
      return;
    }
    // person(): four touches of skirt, the bodice, the head, the hat, and the parasol over the right shoulder
    const rx = Math.cos(hd), rz = Math.sin(hd);
    for (let i = 0; i < 4; i++) {
      const a = hd + i * 1.57, ca = Math.cos(a), sa = Math.sin(a);
      const sw = P.walk * 0.32 * Math.sin(P.ph) * (i === 3 ? 1 : i === 1 ? -1 : 0) + P.walk * 0.1 * Math.sin(P.ph + 1.6) * (i === 0 ? 1 : i === 2 ? -1 : 0);
      put(x + ca * 0.14 * s + lx * 0.15, y + 0.5 * s, z + sa * 0.14 * s + lz * 0.15, ca * 0.16 + fx * sw + P.wx * 0.12, 1, sa * 0.16 + fz * sw + P.wz * 0.12, ca, 0.2, sa, 1.0 * s, 0.34 * s, c[i], 0.05, CELL.BLADE, 0);
    }
    P.tx = x + lx * 0.55 + fx * bend * 0.22 * s; P.ty = y + 1.18 * s - bend * 0.12 * s; P.tz = z + lz * 0.55 + fz * bend * 0.22 * s;
    put(P.tx, P.ty, P.tz, lx * 0.8 + fx * bend * 0.9, 1, lz * 0.8 + fz * bend * 0.9, 1, 0, 0, 0.5 * s, 0.34 * s, c[4], 0, CELL.DAB, FLAG_AXIAL);
    const hx = x + lx + fx * (bend * 0.5 + P.nod * 0.04) * s, hy = y - (bend * 0.38 + P.nod * 0.05) * s, hz = z + lz + fz * (bend * 0.5 + P.nod * 0.04) * s;
    dab(hx, hy + 1.52 * s, hz, 0, 0.2 * s, 0.2 * s, SKIN, CELL.DOT, 0, 1, 0);
    if (P.beard > 0) dab(hx + fx * 0.06 * s, hy + 1.43 * s, hz + fz * 0.06 * s, 0, 0.14 * s, 0.13 * s, C0, CELL.DAB, 0, 1, 0);
    dab(hx, hy + 1.64 * s, hz, 0, 0.42 * s * (P.beard > 0 ? 1.25 : 1), 0.14 * s, o.hat || HAT0, CELL.DAB, 0, 1, 0);
    if (o.parasol && c.length >= 13) {
      const k0 = E.k; E.k = E.kp;
      // the hand, and the parasol tipped about it by (ptx, ptz) and turned by spin
      const bx = x + rx * 0.25 * s + lx * 0.6, by = y + 1.3 * s, bz = z + rz * 0.25 * s + lz * 0.6, tx = P.ptx, tz = P.ptz;
      const u = TMP0; u[0] = 0; u[1] = 0.45 * s; u[2] = 0; tip(u, tx, tz);
      const d = TMP1; d[0] = 0; d[1] = 1; d[2] = 0; tip(d, tx, tz);
      put(bx + u[0], by + u[1], bz + u[2], d[0], d[1], d[2], 1, 0, 0, 0.9 * s, 0.03, SHAFT, 0, CELL.LONG_B, FLAG_AXIAL);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TW + P.spin, ca = Math.cos(a), sa = Math.sin(a);
        u[0] = ca * 0.3 * s; u[1] = 0.78 * s; u[2] = sa * 0.3 * s; tip(u, tx, tz);
        d[0] = ca; d[1] = -0.35; d[2] = sa; tip(d, tx, tz);
        const n = TMP2; n[0] = ca * 0.35; n[1] = 1; n[2] = sa * 0.35; tip(n, tx, tz);
        put(bx + u[0], by + u[1], bz + u[2], d[0], d[1], d[2], n[0], n[1], n[2], 0.62 * s, 0.34 * s, c[6 + i], 0, CELL.LEAF, 0);
      }
      E.k = k0;
    }
  }
  const TMP0 = [0, 0, 0], TMP1 = [0, 0, 0], TMP2 = [0, 0, 0];
  // a small tipping of a vector: its up turns towards (tx, tz)
  function tip(v, tx, tz) { const vx = v[0], vy = v[1], vz = v[2]; v[0] = vx + tx * vy; v[1] = vy - tx * vx - tz * vz; v[2] = vz + tz * vy; return v; }


  // ----- the near body: a fuller figure for when she is close by (from 22 m in, whole from 12 m) -----
  // A few sure touches in the figure's own colours, a light side and a shade side, no outline and no black.
  const SHOE = [0.27, 0.22, 0.26], SHIRT = [0.93, 0.91, 0.86], HAIRS = [[0.46, 0.33, 0.23], [0.32, 0.25, 0.23], [0.6, 0.45, 0.3], [0.52, 0.38, 0.26]];
  const SKIRT_CELLS = [CELL.HEAVY, CELL.DAB, CELL.LONG_A, CELL.COMMA];
  const lightOf = (c) => [Math.min(1, c[0] * 1.1 + 0.05), Math.min(1, c[1] * 1.08 + 0.04), Math.min(1, c[2] * 1.02 + 0.02)];
  const shadeOf = (c) => mixc([c[0] * 0.68, c[1] * 0.68, c[2] * 0.74], [0.3, 0.32, 0.52], 0.28);
  const lumOf = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  const WOMEN = { lady: 1, lady2: 1, lady3: 1, workw: 1, child: 1 };
  // what body a figure has: a woman's or a man's, a child's (once, when it is first drawn near)
  function bodyOf(F) {
    const o = F.o, child = F.s < 0.8;
    let woman;
    if (F.q) woman = !!WOMEN[F.q.c];
    else woman = !!o.parasol || lumOf(o.dress) > 0.5 || (F.s >= 0.8 && F.s < 0.93);
    return { woman, child };
  }
  function nearCols(F) {
    const c = F.cols, top = c[F.kind === 'figure' ? 8 : 4], o = F.o, b = F.bt;
    const d = [c[0], c[1], c[2], c[3]];
    return { dL: d.map(lightOf), dS: d.map(shadeOf), t: top, tL: lightOf(top), tS: shadeOf(top), hat: o.hat || HAT0, hatS: shadeOf(o.hat || HAT0),
      rib: o.band || (b.woman ? mixc(top, [0.32, 0.42, 0.74], 0.55) : [0.22, 0.22, 0.3]), hair: F.beard ? [0.9, 0.88, 0.84] : HAIRS[F.id % 4], skinS: shadeOf(SKIN) };
  }
  const litSide = (ax, az) => ax * E.sx + az * E.sz > 0;
  // an arm from the shoulder to the hand: to where the hand is wanted, or hanging and swinging as the figure walks
  function nearArm(side, nc, t) {
    const s = P.s, rx = Math.cos(P.hd), rz = Math.sin(P.hd), fx = Math.sin(P.hd), fz = -Math.cos(P.hd), h = side > 0 ? HR : HL;
    const sx = P.tx + rx * side * 0.18 * s, sy = P.ty + 0.15 * s, sz = P.tz + rz * side * 0.18 * s;
    const sw = -side * Math.sin(P.ph) * 0.13 * s * P.walk + Math.sin(t * 0.6 + side) * 0.012 * s;
    let hx = sx + rx * side * 0.05 * s + fx * (sw + 0.03 * s), hy = sy - 0.56 * s, hz = sz + rz * side * 0.05 * s + fz * (sw + 0.03 * s);
    if (h[3] > 0.02) { hx += (h[0] - hx) * h[3]; hy += (h[1] - hy) * h[3]; hz += (h[2] - hz) * h[3]; }
    const lit = litSide(rx * side, rz * side);
    rod(sx, sy, sz, hx, hy, hz, 0.11 * s, lit ? nc.tL : nc.t, CELL.HEAVY, 0.06 * s);
    dab(hx, hy, hz, 0, 0.075 * s, 0.07 * s, lit ? SKIN : nc.skinS, CELL.DAB, 0, 1, 0);
  }
  function drawNear(F, t) {
    const bt = F.bt || (F.bt = bodyOf(F)), nc = F.nc || (F.nc = nearCols(F));
    const s = P.s, x = P.x, z = P.z, y = P.y + P.bob, hd = P.hd, fx = Math.sin(hd), fz = -Math.cos(hd), rx = Math.cos(hd), rz = Math.sin(hd);
    const hs = bt.child ? 1.15 : 1, walk = P.walk, ph = P.ph, b = P.bend;
    const ux = P.lx * 0.8 + fx * b * 0.9, uz = P.lz * 0.8 + fz * b * 0.9; // the way the body leans
    if (bt.woman) {
      // the skirt: eight touches round a soft bell, the hem swinging as she walks and lifting in the wind
      const sw = walk * 0.09 * s * Math.sin(ph), wy = y + 0.98 * s;
      for (let i = 0; i < 8; i++) {
        const a = hd + (i + 0.5) * TW / 8, ca = Math.cos(a), sa = Math.sin(a), rip = Math.sin(t * 1.4 + i * 1.7 + F.id) * 0.02 * s;
        const bx = x + ca * (0.34 * s + rip) + fx * sw + P.wx * 0.07 * s, bz = z + sa * (0.34 * s + rip) + fz * sw + P.wz * 0.07 * s, by = y + 0.05 * s;
        const tx = x + ca * 0.12 * s + P.lx * 0.25, tz = z + sa * 0.12 * s + P.lz * 0.25;
        const dx = tx - bx, dy = wy - by, dz = tz - bz, l = Math.hypot(dx, dy, dz);
        put((bx + tx) / 2, (by + wy) / 2, (bz + tz) / 2, dx, dy, dz, ca, 0.3, sa, l + 0.12 * s, 0.38 * s, litSide(ca, sa) ? nc.dL[i & 3] : nc.dS[i & 3], 0.04, SKIRT_CELLS[i & 3], 0);
      }
      // the bodice, and the light along one side of it
      put(P.tx, P.ty - 0.03 * s, P.tz, ux, 1, uz, 1, 0, 0, 0.56 * s, 0.34 * s, nc.t, 0, CELL.DAB, FLAG_AXIAL);
      put(P.tx + E.sx * 0.08 * s, P.ty + 0.02 * s, P.tz + E.sz * 0.08 * s, ux, 1, uz, 1, 0, 0, 0.38 * s, 0.15 * s, nc.tL, 0, CELL.COMMA, FLAG_AXIAL);
    } else {
      // two legs that step, the shoes, the coat with its skirts, the shirt at the throat
      const hip = (bt.child ? 0.72 : 0.8) * s;
      for (let side = -1; side <= 1; side += 2) {
        const stp = walk * 0.2 * s * Math.sin(ph) * side, lift = walk * 0.07 * s * Math.max(0, Math.cos(ph) * side);
        const hx = x + rx * side * 0.1 * s + P.lx * 0.3, hz = z + rz * side * 0.1 * s + P.lz * 0.3;
        const kx = x + rx * side * 0.09 * s + fx * stp, kz = z + rz * side * 0.09 * s + fz * stp, ky = y + 0.08 * s + lift;
        const lit = litSide(rx * side, rz * side);
        rod(hx, y + hip + 0.05 * s, hz, kx, ky, kz, 0.19 * s, lit ? nc.dL[side > 0 ? 0 : 1] : nc.dS[side > 0 ? 0 : 1], CELL.HEAVY, 0.04 * s);
        put(kx + fx * 0.06 * s, y + 0.04 * s + lift, kz + fz * 0.06 * s, fx, 0, fz, 0, 1, 0, 0.26 * s, 0.13 * s, SHOE, 0, CELL.DAB, 0);
      }
      put(P.tx, P.ty - 0.1 * s, P.tz, ux, 1, uz, 1, 0, 0, 0.74 * s, 0.46 * s, nc.t, 0, CELL.DAB, FLAG_AXIAL);
      for (let side = -1; side <= 1; side += 2) {
        const lit = litSide(rx * side, rz * side), sw = walk * 0.05 * s * Math.sin(ph + side);
        rod(P.tx + rx * side * 0.12 * s, P.ty - 0.15 * s, P.tz + rz * side * 0.1 * s, x + rx * side * 0.13 * s - fx * sw + P.wx * 0.03 * s, y + hip - 0.16 * s, z + rz * side * 0.13 * s - fz * sw + P.wz * 0.03 * s, 0.2 * s, lit ? nc.tL : nc.tS, CELL.HEAVY, 0.05 * s);
      }
      put(P.tx + fx * 0.1 * s, P.ty + 0.1 * s, P.tz + fz * 0.1 * s, 0, 1, 0, 1, 0, 0, 0.2 * s, 0.08 * s, SHIRT, 0, CELL.DAB, FLAG_AXIAL);
    }
    // neck, hair, head, and the hat
    const hx = x + P.lx + fx * (b * 0.5 + P.nod * 0.04) * s, hy = y - (b * 0.38 + P.nod * 0.05) * s, hz = z + P.lz + fz * (b * 0.5 + P.nod * 0.04) * s;
    rod(P.tx, P.ty + 0.18 * s, P.tz, hx, hy + 1.47 * s, hz, 0.09 * s, nc.skinS, CELL.DAB, 0.04 * s);
    dab(hx - fx * 0.045 * s, hy + 1.56 * s, hz - fz * 0.045 * s, 0, 0.21 * s * hs, (bt.woman ? 0.15 : 0.11) * s * hs, nc.hair, CELL.DAB, 0, 1, 0);
    dab(hx, hy + 1.52 * s, hz, 0, 0.19 * s * hs, 0.21 * s * hs, SKIN, CELL.DOT, 0, 1, 0);
    if (F.beard) dab(hx + fx * 0.06 * s, hy + 1.44 * s, hz + fz * 0.06 * s, 0, 0.14 * s, 0.13 * s, C0, CELL.DAB, 0, 1, 0);
    if (bt.woman) {
      dab(hx, hy + 1.625 * s, hz, 0, 0.5 * s * hs, 0.11 * s * hs, nc.hat, CELL.DAB, 0, 1, 0);
      dab(hx, hy + 1.66 * s, hz, 0, 0.27 * s * hs, 0.05 * s * hs, nc.rib, CELL.DAB, 0, 1, 0);
    } else {
      put(hx, hy + 1.7 * s, hz, 0, 1, 0, 1, 0, 0, 0.17 * s, 0.21 * s * hs, nc.hat, 0, CELL.DAB, FLAG_AXIAL);
      dab(hx, hy + 1.645 * s, hz, 0, 0.22 * s * hs, 0.035 * s, nc.rib, CELL.DAB, 0, 1, 0);
      dab(hx, hy + 1.62 * s, hz, 0, (F.beard ? 0.5 : 0.38) * s * hs, 0.06 * s, nc.hatS, CELL.DAB, 0, 1, 0);
    }
    // the arms; the right hand holds the parasol if there is one
    if (F.o.parasol && HR[3] < 0.05 && F.kind !== 'figure') hand(1, x + rx * 0.25 * s + P.lx * 0.6, y + 1.3 * s, z + rz * 0.25 * s + P.lz * 0.6, 1);
    nearArm(1, nc, t); nearArm(-1, nc, t);
  }
  // a figure of the paintings or a passer by, at its level of detail: q 0 the old recipe only, 1 the near body only. kb: its strength
  function lod(F, t, q, kb) {
    const ko = 1 - sstep(0.25, 0.85, q), kn = sstep(0.15, 0.75, q);
    E.kp = kb; E.k = kb * ko;
    drawBody();
    E.k = kb * ko; oldArms();
    // (the renderer narrows standing touches near the eye: the near body is made to keep its width)
    if (kn > 0.02 && E.n < CAP - 80) { E.k = kb * kn; E.axw = 1 / (0.6 + 0.4 * E.nk); drawNear(F, t); E.axw = 1; }
    E.k = kb;
  }

  // ----- palettes of the extras -----
  const LOOK = {
    man: { dress: '#2e3444', top: '#283040', hat: '#1e2230' },
    boater: { dress: '#3a4258', top: '#e8e2d0', hat: '#e6d6a0' },
    lady: { dress: '#f0ece0', top: '#e8e2d4', hat: '#e8d8a8', parasol: '#f0e2c0' },
    lady2: { dress: '#5a6e96', top: '#48587a', hat: '#e6d8b0', parasol: '#e0a4ac' },
    lady3: { dress: '#d8a8a8', top: '#e8ccc4', hat: '#f0e6c8' },
    worker: { dress: '#4a5a7a', top: '#6a7ca4', hat: '#d8c070' },
    workw: { dress: '#8a5a4a', top: '#e6dcc4', hat: '#ece0c2' },
    child: { dress: '#f2eee4', top: '#e8a8a4', hat: '#f0e0b0' },
    boy: { dress: '#3c4a64', top: '#e4dccc', hat: '#e8d8a0' },
    fisher: { dress: '#3c4a5e', top: '#8a6a4a', hat: '#2e3440' },
    monet: { dress: '#ece8dc', top: '#e6e0d0', hat: '#dcc488' },
    gardener: { dress: '#44506a', top: '#5a6e94', hat: '#d6c27a' },
  };
  // who walks where in each world, beside the painted people. r: what they do. p: where. to: the way they walk (there and back).
  // look: what they face. with: whom they keep to (an index in the same list). s: size. summer: only when there is no snow
  const CAST = {
    coast: [
      { r: 'stroll', c: 'lady', p: [112, -24.5], to: [[112, -24.5], [141, -26]] },
      { r: 'stroll', c: 'man', with: 0, s: 1.04 },
      { r: 'fish', c: 'fisher', p: [126, -32.4], look: [126, -60] },
      { r: 'idle', c: 'lady2', p: [146, -12], look: [150, -40] },
      { r: 'play', c: 'child', with: 3, s: 0.62 },
      { r: 'mend', c: 'fisher', p: [-141.6, 9.6], boat: [-140, 7.4, 0.5], look: [-140, 7.4] },
      { r: 'idle', c: 'fisher', p: [-137.2, 5.2], look: [-150, -30], whistle: 1, s: 1.04 },
      { r: 'stroll', c: 'boater', p: [-18, -6], to: [[-18, -6], [9, -9]] },
      { r: 'bend', c: 'child', p: [2, 8], look: [2, -20], s: 0.7, basket: 1, girl: 1 },
    ],
    argenteuil: [
      { r: 'stroll', c: 'lady2', p: [-44, -43.5], to: [[-44, -43.5], [-8, -41.6]] },
      { r: 'stroll', c: 'boater', with: 0, s: 1.04 },
      { r: 'fish', c: 'boater', p: [-24, -48.6], look: [-24, -80] },
      { r: 'stroll', c: 'man', p: [1.2, -32], to: [[1.2, -32], [2, -4], [0.6, 22]] },
      { r: 'dog', with: 3 },
      { r: 'idle', c: 'lady', p: [16, 8], look: [10, -60] },
      { r: 'play', c: 'child', with: 5, s: 0.6 },
      { r: 'idle', c: 'man', p: [62, -49], look: [62, -90], whistle: 1 },
      // up in the poppies: a pair coming down the slope as his pairs do, and a girl gathering flowers
      { r: 'stroll', c: 'lady', p: [68, 102], to: [[68, 102], [54, 80], [47, 72]] },
      { r: 'stroll', c: 'child', with: 8, s: 0.66 },
      { r: 'bend', c: 'child', p: [46, 86], look: [50, 92], s: 0.68, basket: 1, girl: 1 },
    ],
    fields: [
      { r: 'pitch', c: 'worker', stack: 2, side: 0.6, summer: 1 },
      { r: 'rake', c: 'workw', stack: 2, side: 1.5, off: 4.2, summer: 1 },
      { r: 'rake', c: 'workw', stack: 4, side: 0.9, off: 3.6, summer: 1 },
      { r: 'pitch', c: 'worker', stack: 3, side: 0.3, summer: 1 },
      { r: 'play', c: 'boy', stack: 2, side: 2.3, off: 9, s: 0.62, summer: 1 },
      { r: 'stroll', c: 'man', p: [-30, -107], to: [[-30, -107], [-2, -108.5], [22, -106]] },
      { r: 'stroll', c: 'workw', p: [-104, -6], to: [[-104, -6], [-88, 6], [-66, 14]], basket: 1 },
    ],
    pond: [
      { r: 'paint', c: 'monet', p: [-4, 24.2], look: [-12, 6], beard: 1 },
      { r: 'bend', c: 'gardener', p: [16, 62], look: [16, 80] },
      { r: 'rake', c: 'gardener', p: [10, 44.2], look: [10, 48], along: 1 },
      { r: 'stroll', c: 'lady', p: [24, 24], to: [[24, 24], [41, 19.5], [49, 9]] },
      { r: 'stroll', c: 'lady3', with: 3 },
      { r: 'play', c: 'child', p: [24, 35], s: 0.6 },
      { r: 'idle', c: 'lady2', p: [-30, 66], look: [-40, 70] },
    ],
  };
  const SUMMER_ROLES = { pitch: 1, rake: 1 };

  function makeCols(o, rnd) {
    const c = [];
    for (let i = 0; i < 4; i++) c.push(jit(o.dress, 0.04, rnd));
    c.push(jit(o.top || o.dress, 0.04, rnd));
    if (o.parasol) { c.push(SHAFT); for (let i = 0; i < 7; i++) c.push(jit(o.parasol, 0.05, rnd)); }
    return c;
  }
  function blank(F) {
    F.x = F.x0; F.z = F.z0; F.y = F.y0; F.hd = F.yaw0; F.mode = 'stand'; F.mt = 0; F.md = 3 + st.rnd() * 6; F.tx = F.x0; F.tz = F.z0;
    F.walk = 0; F.ph = st.rnd() * TW; F.lx = 0; F.lz = 0; F.bend = 0; F.nod = 0; F.wave = 0; F.waveT = 0; F.look = 0; F.lookT = 0;
    F.greetT = -99; F.noticeT = -99; F.prev = null; F.sndT = 6 + st.rnd() * 14; F.cyc = st.rnd(); F.sp = 0; F.wi = 0; F.dir = 1; F.talk = 0; F.k = 0;
    F.ox = 0; F.oz = 0; F.oa = st.rnd() * TW; F.away = 1; F.laugh = 0; F.gk = 0;
  }

  // ----- a world is shown: read its painted people, and set its passers by in their places -----
  function enter(g) {
    figs.length = 0; extras.length = 0; props.length = 0;
    st.world = null; st.ch = null;
    if (!g || !g.cur || !g.ch) return;
    const W = g.cur, ch = g.ch;
    st.world = W; st.ch = ch;
    if (pre && pre.W === W && pre.ch === ch) { // made ahead of time (see prepare): only taken over
      for (const x of pre.figs) figs.push(x);
      for (const x of pre.extras) extras.push(x);
      for (const x of pre.props) props.push(x);
      st.rnd = pre.rnd; pre = null;
      return;
    }
    st.rnd = mulberry32((ch.seed | 0) * 7 + 3131);
    try { readFolk(g, W, ch); } catch (e) { if (typeof console !== 'undefined') console.warn('folk: painted', e); }
    try { cast(g, W, ch); } catch (e) { if (typeof console !== 'undefined') console.warn('folk: extras', e); }
  }
  // The people of a world she is not in yet, read and set in their places while the picture stands still, so that arriving there
  // costs nothing. Those of the world she is in now are put back as they were. The making asks nothing of the game but that
  // world and the lie of its land, so made ahead it comes out the same as made on arrival
  let pre = null;
  function prepare(g, ch, W) {
    if (!g || !ch || !W || (pre && pre.W === W)) return;
    const kf = figs.slice(), ke = extras.slice(), kp = props.slice(), ks = Object.assign({}, st);
    pre = null;
    try {
      enter({ ch, cur: W, groundAt: (w, x, z) => g.groundAt(w, x, z) });
      pre = { W, ch, figs: figs.slice(), extras: extras.slice(), props: props.slice(), rnd: st.rnd };
    } catch (e) { pre = null; }
    figs.length = 0; for (const x of kf) figs.push(x);
    extras.length = 0; for (const x of ke) extras.push(x);
    props.length = 0; for (const x of kp) props.push(x);
    Object.assign(st, ks);
  }
  function readFolk(g, W, ch) {
    const recs = W.folk || [];
    recs.forEach((r, i) => {
      const kind = r.kind === 'figure' ? 'figure' : 'person';
      const F = { name: (ch.id || 'w') + ' painted ' + i, painted: true, kind, x0: r.x, y0: r.y, z0: r.z, yaw0: r.yaw, s: r.s || 1, o: r.o, cols: r.cols, seeds: r.seeds || null, id: i + 1, role: 'stand', partner: null, ways: [] };
      const nCol = kind === 'figure' ? 9 + (r.o.parasol ? 3 : 0) : 5 + (r.o.parasol ? 8 : 0);
      if (!F.cols || F.cols.length < nCol) return; // a record that does not carry its colours cannot be drawn as it was painted
      if (r.o.y !== undefined) F.role = 'still'; // set on something: a deck, a boat
      blank(F);
      figs.push(F);
    });
    // anything else the world painted on a figure (a top hat over the man at the terrace) stays where it was painted: such a figure keeps its place
    const S = W.S;
    if (S && S.pos) for (const F of figs) {
      if (F.role === 'still') continue;
      const s = F.s;
      for (let i = 0; i < S.n; i++) {
        const o = i * 4, dx = S.pos[o] - F.x0, dz = S.pos[o + 2] - F.z0;
        if (dx * dx + dz * dz > 0.0064) continue;
        const dy = S.pos[o + 1] - F.y0;
        if (dy > 1.0 * s && dy < 2.5 * s) { F.role = 'anchored'; break; }
      }
    }
    // pairs, children, and the ways each may stroll
    for (const F of figs) {
      if (F.role === 'still') continue;
      let best = null, bd = 2.6;
      for (const G of figs) if (G !== F && G.role !== 'still') { const d = Math.hypot(G.x0 - F.x0, G.z0 - F.z0); if (d < bd) { bd = d; best = G; } }
      F.partner = best;
      if (F.role === 'anchored') continue;
      F.role = F.s < 0.8 ? 'child' : best ? 'pair' : 'loiter';
    }
    for (const F of figs) {
      if (F.role === 'child') F.ways = findWays(W, ch, [[F.x0, F.z0]], [6, 4.5, 3], 0.35);
      else if (F.role === 'loiter') F.ways = findWays(W, ch, [[F.x0, F.z0]], [9, 7, 5, 3.5], 0.4);
      else if (F.role === 'pair') {
        const G = F.partner;
        if (G.role === 'pair' && G.partner === F) {
          // the two walk together: one leads, and the way must suit both
          if (F.id < G.id) { F.lead = true; F.ways = findWays(W, ch, [[F.x0, F.z0], [G.x0, G.z0]], [9, 7, 5, 3.5], 0.35); }
          else F.lead = false;
        } else { F.lead = true; F.solo = true; F.ways = findWays(W, ch, [[F.x0, F.z0]], [4.5, 3.5, 2.5], 0.35); } // the other stays: short walks only
      }
      F.water = waterDir(W, F.x0, F.z0);
    }
  }
  function placeNear(W, ch, x, z, pad) {
    if (standable(W, ch, x, z, pad)) return [x, z];
    for (let r = 0.8; r < 9; r += 0.8) for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TW + r, px = x + Math.sin(a) * r, pz = z - Math.cos(a) * r;
      if (standable(W, ch, px, pz, pad)) return [px, pz];
    }
    return null;
  }
  function cast(g, W, ch) {
    const list = CAST[ch.id];
    if (!list) return;
    const rnd = mulberry32((ch.seed | 0) * 11 + 707), stacks = (W.casters || []).filter((c) => c.k === 'cone');
    const made = [];
    list.forEach((q, i) => {
      let F = null;
      const lead = q.with !== undefined ? made[q.with] : null;
      if (q.with !== undefined && !lead) { made.push(null); return; }
      let x, z;
      if (q.r === 'dog') { x = lead.x0 + 1.2; z = lead.z0 + 0.6; }
      else if (q.with !== undefined) { const rx = Math.cos(lead.yaw0), rz = Math.sin(lead.yaw0); x = lead.x0 - rx * 0.75; z = lead.z0 - rz * 0.75; }
      else if (q.stack !== undefined) {
        // by a grainstack: the stacks are the cones of the world, in the order they were built
        const c = stacks[q.stack];
        if (!c) { made.push(null); return; }
        const d = c.r + 1.25 + (q.off || 0);
        x = c.x + Math.cos(q.side) * d; z = c.z + Math.sin(q.side) * d;
        q = Object.assign({}, q, { look: [c.x, c.z], stackR: c.r, stackH: c.h });
      } else { x = q.p[0]; z = q.p[1]; }
      const at = q.r === 'dog' || q.with !== undefined ? [x, z] : placeNear(W, ch, x, z, 0.5);
      if (!at) { made.push(null); return; }
      x = at[0]; z = at[1];
      const look = q.look || (q.to ? q.to[1] : null);
      let yaw0 = lead ? lead.yaw0 : look ? Math.atan2(look[0] - x, -(look[1] - z)) : rnd() * TW;
      const pal = LOOK[q.c] || LOOK.man, o = { dress: hex(pal.dress), top: hex(pal.top), hat: hex(pal.hat) };
      if (pal.parasol) o.parasol = hex(pal.parasol);
      F = { name: ch.id + ' ' + q.r + ' ' + i, painted: false, kind: 'person', role: q.r, q, x0: x, z0: z, y0: g.groundAt ? g.groundAt(W, x, z) : W.h(x, z), yaw0, s: q.s || (q.r === 'dog' ? 1 : 0.96 + rnd() * 0.08), o,
        cols: q.r === 'dog' ? null : makeCols(o, rnd), id: 100 + i, lead, beard: q.beard || 0, ways: [], route: null, summer: !!(q.summer || SUMMER_ROLES[q.r]) };
      // a way to walk: each leg checked, cut short where it meets something
      if (q.to) {
        const pts = [[x, z]];
        for (let k = 1; k < q.to.length; k++) {
          const a = pts[pts.length - 1], b = q.to[k], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
          let ok = L;
          for (let d = 0.6; d < L; d += 0.6) if (!standable(W, ch, a[0] + dx / L * d, a[1] + dz / L * d, 0.45)) { ok = d - 1.2; break; }
          if (ok < 2) break;
          pts.push([a[0] + dx / L * ok, a[1] + dz / L * ok]);
          if (ok < L) break;
        }
        if (pts.length > 1) F.route = pts;
      }
      if (q.r === 'rake' && !q.stack && !q.along) F.rakeAxis = yaw0 + PI / 2;
      if (q.r === 'paint') { const fx = Math.sin(yaw0), fz = -Math.cos(yaw0); F.easel = [x + fx * 1.15, z + fz * 1.15]; }
      if (q.boat) { props.push({ kind: 'boat', x: q.boat[0], z: q.boat[1], hd: q.boat[2], y: g.groundAt ? g.groundAt(W, q.boat[0], q.boat[1]) : W.h(q.boat[0], q.boat[1]), owner: F }); }
      blank(F);
      if (q.r === 'dog') { F.x = x; F.z = z; }
      F.water = waterDir(W, x, z);
      extras.push(F); made.push(F);
    });
  }

  // ----- steps of the living -----
  function steer(F, tx, tz, sp, dt) {
    const dx = tx - F.x, dz = tz - F.z, d = Math.hypot(dx, dz);
    if (d < 0.08) { F.x = tx; F.z = tz; F.sp += (0 - F.sp) * Math.min(1, dt * 4); return true; }
    F.sp += (sp - F.sp) * Math.min(1, dt * 2.2);
    const stp = Math.min(d, F.sp * dt);
    F.x += (dx / d) * stp; F.z += (dz / d) * stp;
    turn(F, Math.atan2(dx, -dz), dt, 3);
    return false;
  }
  function turn(F, want, dt, rate) { F.hd += clamp(wrap(want - F.hd), -rate * dt, rate * dt); }
  function setMode(F, m, md) { F.mode = m; F.mt = 0; F.md = md; }
  const R = () => st.rnd();

  // the painted ones away from an easel
  function livePainted(g, F, dt, free) {
    if (F.role === 'still') return;
    if (!free) { // a picture may be taken: back to the mark, and the pose he gave them
      F.mode = 'home';
      const back = steer(F, F.x0, F.z0, 1.1, dt);
      if (back) turn(F, F.yaw0, dt, 1.5);
      F.talk *= Math.max(0, 1 - dt * 2); F.wave *= Math.max(0, 1 - dt * 3); F.nod *= Math.max(0, 1 - dt * 3);
      return;
    }
    if (F.mode === 'home') setMode(F, 'stand', 2 + R() * 4);
    if (F.mode === 'notice') return;
    const G = F.partner, ways = F.ways;
    F.mt += dt;
    if (F.role === 'pair' && !F.lead && G && G.lead && !G.solo) {
      // the one who keeps to the leader: the same way out, at the same distance
      const tx = F.x0 + (G.x - G.x0), tz = F.z0 + (G.z - G.z0), d = Math.hypot(tx - F.x, tz - F.z);
      if (d > 0.05) steer(F, tx, tz, Math.max(0.3, Math.min(1.3, G.sp + d * 0.8)), dt);
      else { F.sp *= 0.9; turn(F, G.mode === 'stand' || G.mode === 'talk' ? Math.atan2(G.x - F.x, -(G.z - F.z)) * 0.5 + F.yaw0 * 0.5 + (F.look || 0) : G.hd, dt, 1.2); }
      F.talk = G.talk;
      return;
    }
    if (F.mode === 'stand' || F.mode === 'talk') {
      F.sp *= 0.9;
      // looks about: at her, at the water, at the partner, or nowhere in particular
      F.lookT -= dt;
      if (F.lookT <= 0) {
        F.lookT = 2.5 + R() * 5;
        const p = g.pl, dp = Math.hypot(p.x - F.x, p.z - F.z), u = R();
        if (dp < 30 && u < 0.4) F.look = clamp(wrap(Math.atan2(p.x - F.x, -(p.z - F.z)) - F.yaw0), -0.9, 0.9);
        else if (F.water !== null && F.water !== undefined && u < 0.7) F.look = clamp(wrap(F.water - F.yaw0), -0.7, 0.7);
        else if (G && u < 0.85) F.look = clamp(wrap(Math.atan2(G.x - F.x, -(G.z - F.z)) - F.yaw0), -0.8, 0.8);
        else F.look = (R() - 0.5) * 0.8;
      }
      const back = steer(F, F.x0, F.z0, 0.6, dt);
      if (back) turn(F, F.yaw0 + F.look, dt, F.role === 'anchored' ? 0.25 : 0.5);
      F.talk += ((G && F.mode === 'talk' ? 1 : 0) - F.talk) * Math.min(1, dt * 1.2);
      if (F.mt > F.md) {
        if (F.role === 'anchored') { setMode(F, G && R() < 0.6 ? 'talk' : 'stand', 6 + R() * 10); return; }
        if (G && F.mode === 'stand' && R() < 0.55) { setMode(F, 'talk', 8 + R() * 10); return; }
        if (ways.length && R() < (F.role === 'child' ? 0.85 : 0.6)) {
          const w = ways[(R() * ways.length) | 0], L = w[2] * (0.6 + 0.4 * R());
          F.tx = F.x0 + w[0] * L; F.tz = F.z0 + w[1] * L;
          setMode(F, 'out', 0);
        } else setMode(F, 'stand', 5 + R() * 8);
      }
      return;
    }
    if (F.mode === 'out') {
      if (steer(F, F.tx, F.tz, F.role === 'child' ? 2.1 : 0.75, dt)) setMode(F, 'pause', F.role === 'child' ? 0.8 + R() * 1.2 : 3 + R() * 4);
      return;
    }
    if (F.mode === 'pause') {
      F.sp *= 0.9;
      if (F.water !== null && F.water !== undefined && F.role !== 'child') turn(F, F.water, dt, 0.6);
      if (F.mt > F.md) setMode(F, 'back', 0);
      return;
    }
    if (F.mode === 'back') {
      if (steer(F, F.x0, F.z0, F.role === 'child' ? 2.1 : 0.75, dt)) setMode(F, 'stand', F.role === 'child' ? 4 + R() * 6 : 8 + R() * 10);
    }
  }

  // the passers by
  function liveExtra(g, F, dt) {
    if (F.mode === 'notice') return;
    F.mt += dt;
    const q = F.q, L = F.lead;
    switch (F.role) {
      case 'stroll': {
        if (L) { // keeps to the left of the one she walks with
          const rx = Math.cos(L.hd), rz = Math.sin(L.hd), tx = L.x - rx * 0.75, tz = L.z - rz * 0.75, d = Math.hypot(tx - F.x, tz - F.z);
          if (d > 0.06) steer(F, tx, tz, Math.max(0.25, Math.min(1.4, L.sp + d)), dt); else { F.sp *= 0.9; turn(F, L.hd + (L.mode === 'pause' ? 0.35 : 0), dt, 1.5); }
          F.talk = L.mode === 'pause' ? Math.min(1, F.talk + dt) : Math.max(0, F.talk - dt);
          return;
        }
        const rt = F.route;
        if (!rt) { F.sp *= 0.9; return; }
        if (F.mode === 'stand') setMode(F, 'walk', 0);
        if (F.mode === 'walk') {
          let nx = F.wi + F.dir;
          if (nx < 0 || nx >= rt.length) { F.dir = -F.dir; setMode(F, 'pause', 4 + R() * 6); F.talk = 0; return; }
          if (steer(F, rt[nx][0], rt[nx][1], 0.85, dt)) F.wi = nx;
        } else if (F.mode === 'pause') {
          F.sp *= 0.9; F.talk = Math.min(1, F.talk + dt);
          if (F.water !== null && F.water !== undefined) turn(F, F.water, dt, 0.7);
          if (F.mt > F.md) { setMode(F, 'walk', 0); F.talk = 0; }
        }
        return;
      }
      case 'dog': {
        if (!L) return;
        F.oa += dt * (0.5 + 0.6 * Math.sin(st.clock * 0.3 + F.id));
        const r = 1.6 + 0.9 * Math.sin(st.clock * 0.7 + F.id), tx = L.x + Math.cos(F.oa) * r, tz = L.z + Math.sin(F.oa) * r;
        steer(F, tx, tz, 1.2 + Math.hypot(tx - F.x, tz - F.z) * 1.2, dt);
        return;
      }
      case 'play': {
        // a child: runs round about the one it is with (or its own place), stops, looks, runs again
        const cx = L ? L.x : F.x0, cz = L ? L.z : F.z0;
        if (F.mode === 'stand') { F.sp *= 0.9; turn(F, Math.atan2(cx - F.x, -(cz - F.z)), dt, 2); if (F.mt > F.md) { setMode(F, 'run', 3 + R() * 4); F.dir = R() < 0.5 ? -1 : 1; } return; }
        F.oa += F.dir * dt * 0.75;
        const r = 2.6 + 0.8 * Math.sin(F.oa * 1.7), tx = cx + Math.cos(F.oa) * r, tz = cz + Math.sin(F.oa) * r;
        steer(F, tx, tz, 2.2, dt);
        if (F.mt > F.md) setMode(F, 'stand', 1.5 + R() * 3);
        return;
      }
      default: { // they work, or stand, in their own place
        F.sp *= 0.9;
        const look = q.look ? Math.atan2(q.look[0] - F.x, -(q.look[1] - F.z)) : F.yaw0;
        if (F.role === 'idle') {
          F.lookT -= dt;
          if (F.lookT <= 0) { F.lookT = 3 + R() * 5; F.look = (R() - 0.5) * 1.1; }
          turn(F, look + F.look, dt, 0.5);
        } else if (F.role === 'bend' || F.role === 'mend') {
          // bent to the bed (or the hull), now and then straightening up, and a step along
          if (F.mode === 'stand') { if (F.mt > F.md) setMode(F, 'up', 2 + R() * 1.5); }
          else if (F.mode === 'up') { if (F.mt > F.md) { setMode(F, 'step', 0); const a = F.yaw0 + PI / 2, k = (R() - 0.5) * 1.2; F.tx = clamp(F.x + Math.cos(a) * k, F.x0 - 1.6, F.x0 + 1.6); F.tz = F.z + Math.sin(a) * k; if (Math.hypot(F.tx - F.x0, F.tz - F.z0) > 1.7) { F.tx = F.x0; F.tz = F.z0; } } }
          else if (F.mode === 'step') { if (steer(F, F.tx, F.tz, 0.5, dt)) setMode(F, 'stand', 6 + R() * 6); return; }
          turn(F, look, dt, 1);
        } else if (F.role === 'rake') {
          // raking along a line: a pull every two and a half seconds, a step to the side every few pulls
          F.cyc += dt / 2.4;
          if (F.mode === 'step') { if (steer(F, F.tx, F.tz, 0.45, dt)) setMode(F, 'stand', 0); }
          else if (F.cyc >= 3) { F.cyc -= 3; const a = (q.along ? F.yaw0 + PI / 2 : F.yaw0 + PI / 2), k = F.dir * 0.7; F.tx = F.x + Math.cos(a) * k; F.tz = F.z + Math.sin(a) * k; if (Math.hypot(F.tx - F.x0, F.tz - F.z0) > 2.2) { F.dir = -F.dir; F.tx = F.x; F.tz = F.z; } setMode(F, 'step', 0); }
          turn(F, look, dt, 1);
        } else if (F.role === 'pitch') {
          F.cyc += dt / 4.2;
          if (F.cyc >= 1) { F.cyc -= 1; F.tossed = 1; }
          turn(F, look, dt, 1);
        } else if (F.role === 'paint') {
          // looks at the motif, paints, steps back to see it, steps in again
          if (F.mode === 'stand') setMode(F, 'see', 3 + R() * 3);
          if (F.mode === 'see') { turn(F, look, dt, 0.8); steer(F, F.x0, F.z0, 0.4, dt); if (F.mt > F.md) setMode(F, R() < 0.25 ? 'back' : 'dab', 2.5 + R() * 3); }
          else if (F.mode === 'dab') { turn(F, Math.atan2(F.easel[0] - F.x, -(F.easel[1] - F.z)), dt, 1); if (F.mt > F.md) setMode(F, 'see', 2 + R() * 3); }
          else if (F.mode === 'back') { const fx = Math.sin(F.yaw0), fz = -Math.cos(F.yaw0); steer(F, F.x0 - fx * 0.7, F.z0 - fz * 0.7, 0.35, dt); turn(F, Math.atan2(F.easel[0] - F.x, -(F.easel[1] - F.z)), dt, 1); if (F.mt > F.md) setMode(F, 'see', 2 + R() * 2); }
        } else if (F.role === 'fish') {
          turn(F, look, dt, 0.6);
          if (F.mode === 'stand' && F.mt > F.md) setMode(F, 'cast', 1.6);
          else if (F.mode === 'cast' && F.mt > F.md) setMode(F, 'stand', 16 + R() * 14);
        }
      }
    }
  }

  // ----- sound: soft, near, in the key of the music -----
  let NOISE = null, NOISE_CTX = null;
  function audioOK(g) {
    const a = g.audio;
    if (!a || !a.ok || !a.ok() || !a.ctx || g.reverie) return null;
    if (a.ctx.state && a.ctx.state !== 'running') return null;
    return a;
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // the k-th step of the five note scale of the music playing (a plain major scale on C if there is none)
  function pent(a, k, oct) {
    const sc = a.group && a.group.score;
    const o = Math.floor(k / 5), j = k - o * 5;
    if (sc && sc.scale && a.deg) { try { return a.deg(sc, o * 7 + PENT[sc.scale[2] === 3 ? 1 : 0][j], oct); } catch (e) { /* fall through */ } }
    return 60 + 12 * (o + oct) + [0, 2, 4, 7, 9][j];
  }
  function noiseBuf(ctx) {
    if (NOISE && NOISE_CTX === ctx) return NOISE;
    const n = Math.floor((ctx.sampleRate || 44100) * 1.0), b = ctx.createBuffer(1, n, ctx.sampleRate || 44100), d = b.getChannelData(0), r = mulberry32(99);
    for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    NOISE = b; NOISE_CTX = ctx;
    return b;
  }
  // every node of a sound goes into its bag, and the whole bag is let go when the sound has ended
  let BAG = null;
  const keep = (n) => { if (BAG) BAG.push(n); return n; };
  // the end of a little chain: a gain, a pan to where the sound is, the music's master and a little of its reverb
  function chain(a, vol, pan) {
    const ctx = a.ctx, gn = keep(ctx.createGain());
    BAG = [gn];
    gn.gain.value = vol;
    let last = gn;
    if (ctx.createStereoPanner) { const p = keep(ctx.createStereoPanner()); p.pan.value = clamp(pan, -0.8, 0.8); gn.connect(p); last = p; }
    last.connect(a.master || ctx.destination);
    if (a.rev) { const send = keep(ctx.createGain()); send.gain.value = 0.3; last.connect(send); send.connect(a.rev); }
    const bag = BAG;
    return { input: gn, done(src) { src.onended = () => { for (const n of bag) try { n.disconnect(); } catch (e) { /* gone */ } }; BAG = null; } };
  }
  const gainN = (ctx, v) => { const n = keep(ctx.createGain()); n.gain.value = v; return n; };
  const filt = (ctx, type, f, Q) => { const n = keep(ctx.createBiquadFilter()); n.type = type; n.frequency.value = f; n.Q.value = Q; return n; };
  function osc(ctx, type, f, t0, t1, to) { const o = keep(ctx.createOscillator()); o.type = type; o.frequency.setValueAtTime(f, t0); if (to) o.connect(to); o.start(t0); o.stop(t1); return o; }
  function noise(ctx, t0, t1, to) { const s = keep(ctx.createBufferSource()); s.buffer = noiseBuf(ctx); s.loop = true; s.connect(to); s.start(t0, R() * 0.5); s.stop(t1); return s; }
  // a slow wobble of a pitch
  function vib(ctx, o, f, rate, depth, t0, t1) { const l = osc(ctx, 'sine', rate, t0, t1, null), d = gainN(ctx, f * depth); l.connect(d); d.connect(o.frequency); }
  // a whistled phrase: a pure tone that glides from note to note with a little vibrato, and a breath of air about it
  function whistle(a, t0, notes, vol, pan) {
    const ctx = a.ctx;
    let T = 0; for (const n of notes) T += n[1];
    const t1 = t0 + T + 0.25, out = chain(a, vol, pan), env = gainN(ctx, 0);
    env.gain.setValueAtTime(0.0001, t0); env.connect(out.input);
    const o = osc(ctx, 'sine', mtof(notes[0][0]), t0, t1, env);
    vib(ctx, o, mtof(notes[0][0]), 5.6, 0.008, t0, t1);
    const bp = filt(ctx, 'bandpass', mtof(notes[0][0]), 7), air = gainN(ctx, 0.16);
    bp.connect(air); air.connect(env);
    noise(ctx, t0, t1, bp);
    let t = t0;
    for (let i = 0; i < notes.length; i++) {
      const f = mtof(notes[i][0]), d = notes[i][1];
      o.frequency.setTargetAtTime(f, t, 0.025); bp.frequency.setTargetAtTime(f, t, 0.025);
      env.gain.setTargetAtTime(1, t, 0.03); env.gain.setTargetAtTime(0.35, t + d * 0.8, 0.03);
      t += d;
    }
    env.gain.setTargetAtTime(0.0001, t, 0.06);
    out.done(o);
  }
  // a hum with the mouth closed: a soft reedy tone behind a low filter. lo: a lower voice
  function hum(a, t0, notes, vol, pan) {
    const ctx = a.ctx;
    let T = 0; for (const n of notes) T += n[1];
    const t1 = t0 + T + 0.35, out = chain(a, vol, pan), env = gainN(ctx, 0), lp = filt(ctx, 'lowpass', 760, 1.4);
    lp.connect(env); env.connect(out.input);
    env.gain.setValueAtTime(0.0001, t0);
    const o = osc(ctx, 'triangle', mtof(notes[0][0]), t0, t1, lp), o2g = gainN(ctx, 0.25); o2g.connect(lp);
    const o2 = osc(ctx, 'sine', mtof(notes[0][0]) * 2.003, t0, t1, o2g);
    vib(ctx, o, mtof(notes[0][0]), 4.8, 0.006, t0, t1);
    let t = t0;
    for (const n of notes) {
      const f = mtof(n[0]);
      o.frequency.setTargetAtTime(f, t, 0.05); o2.frequency.setTargetAtTime(f * 2.003, t, 0.05);
      env.gain.setTargetAtTime(1, t, 0.06); env.gain.setTargetAtTime(0.55, t + n[1] * 0.7, 0.08);
      t += n[1];
    }
    env.gain.setTargetAtTime(0.0001, t, 0.1);
    out.done(o);
  }
  // two voices talking low, too far to make out a word: little bursts of a voice through changing vowels
  function murmur(a, t0, vol, pan, base, n) {
    const ctx = a.ctx;
    let t = t0;
    const sy = [];
    for (let i = 0; i < n; i++) { const d = 0.1 + R() * 0.17, gap = R() < 0.25 ? 0.22 + R() * 0.3 : 0.03 + R() * 0.06; sy.push([t, d]); t += d + gap; }
    const t1 = t + 0.2, out = chain(a, vol, pan), env = gainN(ctx, 0), bp = filt(ctx, 'bandpass', 700, 2.2), lp = filt(ctx, 'lowpass', 1300, 0.7);
    bp.connect(lp); lp.connect(env); env.connect(out.input); env.gain.setValueAtTime(0.0001, t0);
    const o = osc(ctx, 'sawtooth', base, t0, t1, bp);
    for (const q of sy) {
      o.frequency.setTargetAtTime(base * (0.88 + R() * 0.28), q[0], 0.03);
      bp.frequency.setValueAtTime(450 + R() * 900, q[0]);
      env.gain.setTargetAtTime(1, q[0], 0.02); env.gain.setTargetAtTime(0.0001, q[0] + q[1], 0.035);
    }
    out.done(o);
    return t - t0;
  }
  // a child's short laugh: four quick falling syllables
  function laugh(a, t0, vol, pan) {
    const ctx = a.ctx, t1 = t0 + 0.75, out = chain(a, vol, pan), env = gainN(ctx, 0), bp = filt(ctx, 'bandpass', 1150, 1.6);
    bp.connect(env); env.connect(out.input); env.gain.setValueAtTime(0.0001, t0);
    const f0 = 470 + R() * 90, o = osc(ctx, 'triangle', f0, t0, t1, bp), ng = gainN(ctx, 0.25); ng.connect(bp);
    noise(ctx, t0, t1, ng);
    for (let i = 0; i < 4; i++) {
      const t = t0 + i * 0.14;
      o.frequency.setValueAtTime(f0 * Math.pow(0.93, i) * 1.06, t); o.frequency.linearRampToValueAtTime(f0 * Math.pow(0.93, i), t + 0.09);
      env.gain.setTargetAtTime(1 - i * 0.15, t, 0.012); env.gain.setTargetAtTime(0.0001, t + 0.07, 0.02);
    }
    out.done(o);
  }
  // a rake drawn over gravel or stubble, and the rustle of a forkful of hay
  function scrape(a, t0, dur, vol, pan, hi) {
    const ctx = a.ctx, t1 = t0 + dur + 0.1, out = chain(a, vol, pan), env = gainN(ctx, 0), bp = filt(ctx, 'bandpass', hi ? 3600 : 2100, hi ? 0.7 : 1.1);
    bp.connect(env); env.connect(out.input);
    env.gain.setValueAtTime(0.0001, t0);
    for (let t = t0; t < t0 + dur; t += 0.035) env.gain.setValueAtTime((0.35 + 0.65 * R()) * Math.sin(Math.PI * (t - t0) / dur), t);
    env.gain.setValueAtTime(0.0001, t0 + dur);
    out.done(noise(ctx, t0, t1, bp));
  }
  function note(F, what, d) {
    count[what] = (count[what] || 0) + 1;
    if (log.length > 63) log.shift();
    log.push({ t: +st.clock.toFixed(2), who: F.name, what, d: +d.toFixed(1) });
  }
  // what a figure says, by what it does
  function voiceOf(F) {
    if (F.role === 'dog' || F.role === 'still') return null;
    if (F.role === 'play' || F.role === 'child') return 'laugh';
    if (F.role === 'rake') return 'scrape';
    if (F.role === 'pitch') return 'rustle';
    if (F.talk > 0.5 || (F.role === 'pair' && F.mode === 'talk') || (F.role === 'anchored' && F.mode === 'talk')) return 'murmur';
    if (F.q && F.q.whistle) return 'whistle';
    if (F.role === 'paint' || F.role === 'bend') return 'humlo';
    return F.o && F.o.parasol ? 'hum' : F.o && F.o.dress && F.o.dress[0] > 0.6 ? 'hum' : 'whistle';
  }
  function sound(g, F, what, d) {
    note(F, what, d);
    const a = audioOK(g);
    if (!a) return;
    const near = Math.pow(clamp(1 - d / HEAR, 0, 1), 1.5), cam = g.cam, t0 = a.ctx.currentTime + 0.05;
    const pan = cam && cam.right ? ((F.x - cam.pos[0]) * cam.right[0] + (F.z - cam.pos[2]) * cam.right[2]) / Math.max(1, d) : 0;
    try {
      if (what === 'whistle') { const k = (R() * 3) | 0, ph = [[[k + 5, 0.22], [k + 7, 0.22], [k + 6, 0.3], [k + 4, 0.5]], [[k + 4, 0.3], [k + 7, 0.18], [k + 9, 0.6]], [[k + 7, 0.16], [k + 6, 0.16], [k + 5, 0.16], [k + 3, 0.5]]][(R() * 3) | 0];
        whistle(a, t0, ph.map((n) => [pent(a, n[0], 1), n[1]]), 0.05 * near, pan); }
      else if (what === 'hum' || what === 'humlo') { const lo = what === 'humlo', k = (R() * 3) | 0, ph = [[k + 2, 0.5], [k + 3, 0.4], [k + 1, 0.4], [k + 2, 0.8]];
        hum(a, t0, ph.slice(0, 2 + ((R() * 3) | 0)).map((n) => [pent(a, n[0], lo ? -1 : 0), n[1]]), 0.06 * near, pan); }
      else if (what === 'murmur') { const l = murmur(a, t0, 0.04 * near, pan, 190 + R() * 30, 6 + ((R() * 5) | 0)); murmur(a, t0 + l + 0.15, 0.035 * near, pan * 0.8, 120 + R() * 25, 4 + ((R() * 4) | 0)); }
      else if (what === 'laugh') laugh(a, t0, 0.045 * near, pan);
      else if (what === 'scrape') scrape(a, t0, 0.55, 0.035 * near, pan, false);
      else if (what === 'rustle') scrape(a, t0, 0.45, 0.03 * near, pan, true);
      else if (what === 'greet') {
        // two or three notes, up and back: whistled by a man, hummed by a woman, sung high by a child
        const v = voiceOf(F), k = (R() * 2) | 0;
        if (F.role === 'play' || F.role === 'child') a.note('flute', t0, pent(a, k + 7, 0), 0.03 * Math.max(0.4, near), 0.35), a.note('flute', t0 + 0.2, pent(a, k + 9, 0), 0.03 * Math.max(0.4, near), 0.5);
        else if (v === 'whistle' || v === 'scrape' || v === 'rustle') whistle(a, t0, [[pent(a, k + 4, 1), 0.16], [pent(a, k + 6, 1), 0.34]], 0.05 * Math.max(0.4, near), pan);
        else hum(a, t0, [[pent(a, k + 3, 0), 0.22], [pent(a, k + 2, 0), 0.22], [pent(a, k + 4, 0), 0.45]], 0.06 * Math.max(0.4, near), pan);
      }
    } catch (e) { /* a voice that fails is only a silence */ }
  }

  // ----- every frame -----
  function update(g, dt) {
    if (!g || !g.cur || !g.ch || !g.pl) return;
    if (g.cur !== st.world || g.ch !== st.ch) enter(g);
    if (st.world !== g.cur) return;
    dt = Math.min(dt, 0.1);
    st.clock += dt;
    const p = g.pl, free = g.spot < 0 && g.viewK < 0.02 && !g.reverie, W = g.cur;
    const sunI = g.envNow ? g.envNow.sunI : 1, snow = g.envNow ? g.envNow.snow || 0 : 0;
    st.summer = snow > 0.25 ? 0 : 1;
    const show = g.reverie ? 0 : g.viewK > 0.6 ? 0 : 1 - g.viewK / 0.6, day = sstep(0.06, 0.3, sunI);
    for (const F of figs) { livePainted(g, F, dt, free); if (F.role !== 'still') F.y = F.x === F.x0 && F.z === F.z0 ? F.y0 : W.h(F.x, F.z); }
    for (const F of extras) {
      F.k = show * day * (F.summer && !st.summer ? 0 : 1);
      liveExtra(g, F, dt);
      F.y = g.groundAt ? g.groundAt(W, F.x, F.z) : W.h(F.x, F.z);
    }
    // she comes near: they turn to her, a wave or a nod and a word without words, then back to what they were doing
    const all = figs.length + extras.length;
    for (let i = 0; i < all; i++) {
      const F = i < figs.length ? figs[i] : extras[i - figs.length];
      const isX = !F.painted;
      if (F.mode === 'notice') {
        F.mt += dt;
        const want = Math.atan2(p.x - F.x, -(p.z - F.z));
        if (F.painted) turn(F, F.yaw0 + clamp(wrap(want - F.yaw0), -1.0, 1.0), dt, 2.2); else if (F.role !== 'pitch' && F.role !== 'rake' && F.role !== 'paint') turn(F, want, dt, 2.2);
        F.sp *= 0.85;
        const u = F.mt / F.md;
        F.wave = F.gk === 1 ? sstep(0, 0.15, u) * sstep(1, 0.7, u) : 0;
        F.nod = F.gk === 2 ? Math.sin(clamp(u * 2, 0, 1) * PI) : 0;
        if (F.mt > F.md || !free && F.painted) { F.mode = F.prev || 'stand'; F.mt = 0; F.md = F.prevMd || 4; F.wave = 0; F.nod = 0; }
        continue;
      }
      if (F.role === 'still' || F.role === 'dog' || !free || (isX && F.k < 0.5) || p.alt > 2.5) continue;
      const dx = p.x - F.x, dz = p.z - F.z, d = Math.hypot(dx, dz);
      if (d > HEAR) F.away = 1; // she has gone: when she comes back she is greeted again (not before twenty seconds)
      if (d < NOTICE && F.away && st.clock - F.greetT > GREET_GAP && Math.abs(p.y - F.y0) < 4) {
        F.greetT = st.clock; F.away = 0; F.prev = F.mode === 'notice' ? 'stand' : F.mode; F.prevMd = Math.max(2, F.md - F.mt);
        F.mode = 'notice'; F.mt = 0; F.md = 2.6;
        const busy = F.role === 'rake' || F.role === 'pitch' || F.role === 'paint' || F.role === 'fish' || F.role === 'anchored';
        F.gk = F.role === 'play' || F.role === 'child' ? 1 : busy ? 2 : R() < 0.6 ? 1 : 2;
        sound(g, F, 'greet', d);
        continue;
      }
      // their own sounds, only when she is near enough to hear them
      if (d < HEAR) {
        F.sndT -= dt;
        if (F.sndT <= 0 && st.clock - st.lastSound > 5) {
          F.sndT = 16 + R() * 24;
          const v = voiceOf(F);
          if (v && v !== 'scrape' && v !== 'rustle') { st.lastSound = st.clock; sound(g, F, v, d); }
        }
        if (F.role === 'rake' && F.mode !== 'step') { const c = fr(F.cyc); if (c < F.lastC) sound(g, F, 'scrape', d); F.lastC = c; }
        if (F.role === 'pitch' && F.tossed) { F.tossed = 0; sound(g, F, 'rustle', d); }
      } else { F.tossed = 0; F.lastC = fr(F.cyc || 0); }
    }
  }

  // ----- the pose of a figure this frame, from what it is doing -----
  function posePainted(F, t, L, env) {
    rest(F);
    if (L <= 0) return;
    const s = F.s, wind = 0.5 + 0.5 * Math.sin(t * 0.37 + F.id * 1.9) * Math.sin(t * 0.23 + F.id), ch = st.ch, wd = ch && ch.wind ? ch.wind : [1, 0];
    P.x = F.x0 + (F.x - F.x0) * L; P.z = F.z0 + (F.z - F.z0) * L;
    P.y = F.y0 + (F.role === 'still' ? 0 : (F.y - F.y0) * L);
    if (F.role === 'still') { P.wx = wd[0] * 0.25 * wind * L; P.wz = wd[1] * 0.25 * wind * L; return; }
    P.hd = F.yaw0 + wrap(F.hd - F.yaw0) * L;
    const k = (F.role === 'anchored' ? 0.4 : 1) * L, fx = Math.sin(P.hd), fz = -Math.cos(P.hd), rx = Math.cos(P.hd), rz = Math.sin(P.hd);
    // breath and a slow shift of weight from one foot to the other
    const sh = Math.sin(t * 0.21 + F.id * 2.3) * 0.035 * s;
    P.lx = rx * sh * k; P.lz = rz * sh * k;
    P.bob = Math.sin(t * 1.4 + F.id) * 0.006 * s * k;
    // talking: they lean toward each other, now one, now the other, and nod
    const G = F.partner;
    if (G && F.talk > 0.01) {
      const gx = G.x - F.x, gz = G.z - F.z, gl = Math.hypot(gx, gz) || 1, turnK = Math.max(0, Math.sin(t * 0.55 + F.id * 1.3));
      P.lx += (gx / gl) * 0.06 * s * F.talk * turnK * k; P.lz += (gz / gl) * 0.06 * s * F.talk * turnK * k;
      P.nod += 0.35 * F.talk * Math.max(0, Math.sin(t * 2.3 + F.id)) * turnK * k;
    }
    P.nod += F.nod * L;
    // walking
    P.walk = clamp(F.sp / 0.8, 0, 1) * L; P.ph = F.ph;
    if (P.walk > 0.01) { P.bob += Math.abs(Math.sin(F.ph)) * 0.035 * s * P.walk; P.lx += fx * 0.05 * s * P.walk; P.lz += fz * 0.05 * s * P.walk; }
    if (F.role === 'child' && P.walk > 0.01) P.bob += Math.abs(Math.sin(F.ph)) * 0.05 * s * P.walk;
    // the skirt in the wind, the parasol tipped by it and turned in the hand now and then
    P.wx = wd[0] * (0.3 + 0.7 * wind) * k; P.wz = wd[1] * (0.3 + 0.7 * wind) * k;
    if (F.o.parasol) {
      P.ptx = (wd[0] * 0.12 * wind + Math.sin(t * 0.4 + F.id) * 0.04) * k; P.ptz = (wd[1] * 0.12 * wind + Math.cos(t * 0.33 + F.id) * 0.04) * k;
      P.spin = Math.sin(t * 0.17 + F.id * 3.1) * 0.5 * Math.max(0, Math.sin(t * 0.05 + F.id)) * k;
    }
    P.a1 = F.wave * L;
    void env;
  }
  function poseExtra(F, t) {
    P.x = F.x; P.y = F.y; P.z = F.z; P.hd = F.hd; P.s = F.s; P.cols = F.cols; P.o = F.o; P.kind = 'person'; P.beard = F.beard || 0;
    const s = F.s, ch = st.ch, wd = ch && ch.wind ? ch.wind : [1, 0], wind = 0.5 + 0.5 * Math.sin(t * 0.37 + F.id * 1.9);
    const rx = Math.cos(F.hd), rz = Math.sin(F.hd), fx = Math.sin(F.hd), fz = -Math.cos(F.hd);
    const sh = Math.sin(t * 0.23 + F.id * 2.3) * 0.03 * s;
    P.lx = rx * sh; P.lz = rz * sh; P.bob = 0; P.bend = 0; P.nod = F.nod; P.a1 = F.wave; P.a2 = 0;
    P.walk = clamp(F.sp / 0.8, 0, 1); P.ph = F.ph;
    if (P.walk > 0.01) { P.bob = Math.abs(Math.sin(F.ph)) * (F.role === 'play' ? 0.08 : 0.035) * s * P.walk; P.lx += fx * 0.06 * s * P.walk; P.lz += fz * 0.06 * s * P.walk; }
    P.wx = wd[0] * (0.3 + 0.7 * wind); P.wz = wd[1] * (0.3 + 0.7 * wind);
    P.ptx = wd[0] * 0.12 * wind + Math.sin(t * 0.4 + F.id) * 0.05; P.ptz = wd[1] * 0.12 * wind; P.spin = Math.sin(t * 0.3 + F.id) * 0.6;
    if (F.talk > 0.01 && F.lead) { P.lx += rx * -0.05 * s * F.talk * Math.max(0, Math.sin(t * 0.6 + F.id)); P.lz += rz * -0.05 * s * F.talk * Math.max(0, Math.sin(t * 0.6 + F.id)); P.nod += 0.3 * F.talk * Math.max(0, Math.sin(t * 2.1)); }
  }

  // ----- the strokes of a frame -----
  function drawExtra(F, t, notice, kb, qd) {
    poseExtra(F, t);
    const s = F.s, fx = Math.sin(P.hd), fz = -Math.cos(P.hd), rx = Math.cos(P.hd), rz = Math.sin(P.hd), y = P.y, x = P.x, z = P.z, q = F.q;
    const busy = !notice;
    let tool = null;
    if (F.role === 'bend' || F.role === 'mend') {
      const up = F.mode === 'up' ? sstep(0, 0.5, F.mt) * sstep(F.md, F.md - 0.5, F.mt) : F.mode === 'step' ? 1 : 0;
      P.bend = (F.role === 'mend' ? 0.7 : 0.85) * (1 - up) * (notice ? 0.3 : 1);
      if (q.girl && F.mode === 'up') P.nod = 0.2;
    } else if (F.role === 'rake') {
      const c = fr(F.cyc), pull = c < 0.55 ? c / 0.55 : 1 - (c - 0.55) / 0.45, e = 0.5 - 0.5 * Math.cos(pull * PI);
      P.bend = busy ? 0.18 + 0.12 * e : 0;
      P.lx += fx * 0.05 * s * e; P.lz += fz * 0.05 * s * e;
      tool = 'rake'; F.reach = 1.75 - 0.75 * e;
    } else if (F.role === 'pitch') {
      const c = F.cyc;
      // scoop low, lift and throw up on to the stack, hold, come back
      const lift = c < 0.3 ? 0 : c < 0.6 ? sstep(0.3, 0.6, c) : c < 0.72 ? 1 : 1 - sstep(0.72, 1, c);
      P.bend = busy ? 0.55 * (1 - lift) * (c < 0.3 ? sstep(0, 0.2, c) : 1) + 0.05 : 0;
      tool = 'fork'; F.lift = busy ? lift : 0.35; F.carry = busy && c > 0.18 && c < 0.62;
    } else if (F.role === 'paint') { tool = 'brush'; }
    else if (F.role === 'fish') { tool = 'rod'; }
    else if (F.role === 'play' && F.mode === 'stand' && F.wave < 0.01) { P.a1 = 0.5 + 0.5 * Math.sin(t * 3 + F.id); P.a1 *= sstep(0, 0.5, F.mt) * sstep(F.md, F.md - 0.4, F.mt); }
    // where the hands go, and what they hold (drawn at full strength); then the body at its level of detail
    torso(); HR[3] = 0; HL[3] = 0;
    waveHand(t, F.id);
    const kn = sstep(0.15, 0.75, qd), kd = kb * kn; // the strength of the near details of the things they hold
    if (tool === 'rake') {
      const gx = x + fx * F.reach * s, gz = z + fz * F.reach * s, gy = y + 0.04, hx = x + fx * 0.42 * s + rx * 0.06 * s, hy = y + (1.0 - P.bend * 0.3) * s, hz = z + fz * 0.42 * s + rz * 0.06 * s;
      rod(gx, gy, gz, hx + (hx - gx) * 0.25, hy + (hy - gy) * 0.25, hz + (hz - gz) * 0.25, 0.045, WOOD2, CELL.LONG_B, 0);
      put(gx, gy + 0.04, gz, rx, 0, rz, 0, 1, 0, 0.55 * s, 0.07, WOOD, 0, CELL.HEAVY, FLAG_AXIAL);
      if (kd > 0.02) { E.k = kd; for (let k = -1; k <= 1; k++) rod(gx + rx * k * 0.2 * s, gy + 0.05, gz + rz * k * 0.2 * s, gx + rx * k * 0.2 * s - fx * 0.06, gy - 0.06, gz + rz * k * 0.2 * s - fz * 0.06, 0.025, WOOD, CELL.LONG_B, 0); E.k = kb; }
      if (P.a1 <= 0.05) hand(1, hx, hy, hz, 1);
      hand(-1, hx + (gx - hx) * 0.28, hy + (gy - hy) * 0.28, hz + (gz - hz) * 0.28, 1);
    } else if (tool === 'fork') {
      const lift = F.lift, bx = x + fx * 0.05 * s - rx * 0.1 * s, by = y + 0.85 * s, bz = z + fz * 0.05 * s - rz * 0.1 * s;
      const reach = 1.5 * s, up = -0.55 + lift * 1.75, tx = bx + fx * reach * Math.cos(up), ty = by + reach * Math.sin(up) + lift * 0.2, tz = bz + fz * reach * Math.cos(up);
      rod(bx, by, bz, tx, ty, tz, 0.045, WOOD2, CELL.LONG_B, 0);
      const ux = (tx - bx) / reach, uy = (ty - by) / reach, uz = (tz - bz) / reach;
      for (let k = -1; k <= 1; k += 2) rod(tx + rx * 0.07 * k, ty, tz + rz * 0.07 * k, tx + rx * 0.07 * k + ux * 0.3, ty + uy * 0.3, tz + rz * 0.07 * k + uz * 0.3, 0.02, C1, CELL.LONG_B, 0);
      if (kd > 0.02) { E.k = kd; rod(tx, ty, tz, tx + ux * 0.3, ty + uy * 0.3, tz + uz * 0.3, 0.02, C1, CELL.LONG_B, 0); rod(tx - ux * 0.05 - rx * 0.09, ty - uy * 0.05, tz - uz * 0.05 - rz * 0.09, tx - ux * 0.05 + rx * 0.09, ty - uy * 0.05, tz - uz * 0.05 + rz * 0.09, 0.03, C1, CELL.LONG_B, 0); E.k = kb; }
      if (F.carry && kd > 0.02) { E.k = kd; dab(tx + ux * 0.32, ty + uy * 0.32 + 0.2, tz + uz * 0.32, F.cyc * 2 + 1, 0.4 * s, 0.26 * s, C8, CELL.COMMA, 0, 1, 0); E.k = kb; }
      if (F.carry) dab(tx + ux * 0.2, ty + uy * 0.2 + 0.12, tz + uz * 0.2, F.cyc * 3, 0.55 * s, 0.34 * s, HAY, CELL.DAB, 0, 1, 0);
      if (P.a1 <= 0.05) hand(1, bx + (tx - bx) * 0.2, by + (ty - by) * 0.2, bz + (tz - bz) * 0.2, 1);
      hand(-1, bx + (tx - bx) * 0.48, by + (ty - by) * 0.48, bz + (tz - bz) * 0.48, 1);
    } else if (tool === 'rod') {
      const cast = F.mode === 'cast' ? Math.sin(clamp(F.mt / F.md, 0, 1) * PI) : 0, e = 0.5 + 0.03 * Math.sin(t * 1.7 + F.id) + cast * 0.75;
      const hx = x + fx * 0.3 * s + rx * 0.05, hy = y + 1.0 * s, hz = z + fz * 0.3 * s + rz * 0.05, L = 3.4;
      const tx = hx + fx * L * Math.cos(e), ty = hy + L * Math.sin(e), tz = hz + fz * L * Math.cos(e);
      rod(hx - fx * 0.3, hy - 0.2, hz - fz * 0.3, tx, ty, tz, 0.035, WOOD, CELL.LONG_B, 0);
      const wy = st.world && st.world.waterY !== null ? st.world.waterY + 0.05 : y - 1;
      rod(tx, ty, tz, tx + fx * 0.6, wy, tz + fz * 0.6, 0.012, LINE, CELL.LONG_B, 0);
      if (P.a1 <= 0.05) hand(1, hx, hy, hz, 1);
      hand(-1, hx - fx * 0.15, hy - 0.1, hz - fz * 0.15, 1);
    } else if (tool === 'brush') {
      // the big easel, his canvas with the morning's touches on it, the palette, and the brush going to it
      const ex = F.easel[0], ez = F.easel[1], ey = st.world ? (st.world.h(ex, ez)) : y, ax = ex - x, az = ez - z, al = Math.hypot(ax, az) || 1, nx = ax / al, nz = az / al, tx = -nz, tz = nx;
      for (let k = -1; k <= 1; k += 2) rod(ex + tx * k * 0.42 - nx * 0.12, ey, ez + tz * k * 0.42 - nz * 0.12, ex + tx * k * 0.2, ey + 1.9, ez + tz * k * 0.2, 0.06, WOOD, CELL.HEAVY, 0);
      rod(ex + nx * 0.55, ey, ez + nz * 0.55, ex, ey + 1.8, ez, 0.06, WOOD, CELL.HEAVY, 0);
      put(ex - nx * 0.02, ey + 1.4, ez - nz * 0.02, tx, 0, tz, -nx, 0.12, -nz, 1.05, 0.82, CANVAS, 0, CELL.RECT, 0);
      if (kd > 0.02) { E.k = kd; rod(ex + tx * 0.45 - nx * 0.06, ey + 0.88, ez + tz * 0.45 - nz * 0.06, ex - tx * 0.45 - nx * 0.06, ey + 0.88, ez - tz * 0.45 - nz * 0.06, 0.05, WOOD2, CELL.HEAVY, 0);
        for (let k = 0; k < 3; k++) put(ex - nx * 0.06 + tx * (k - 1) * 0.3, ey + 1.6 - (k % 2) * 0.1, ez - nz * 0.06 + tz * (k - 1) * 0.3, tx, 0.2 * (k - 1), tz, -nx, 0.12, -nz, 0.28, 0.12, DAUBS[(k + 2) % 4], 0, CELL.DAB, 0); E.k = kb; }
      for (let k = 0; k < 4; k++) put(ex - nx * 0.05 + tx * (k - 1.5) * 0.22, ey + 1.32 + (k % 2) * 0.16, ez - nz * 0.05 + tz * (k - 1.5) * 0.22, tx, 0.3 * (k - 1.5), tz, -nx, 0.12, -nz, 0.34, 0.16, DAUBS[k], 0, CELL.COMMA, 0);
      const dabbing = F.mode === 'dab' && !notice ? 1 : 0, wig = Math.sin(t * 5.3) * 0.08;
      const bx = dabbing ? ex - nx * 0.12 + tx * (0.1 + wig) : x + rx * 0.24 * s + fx * 0.15 * s, by = dabbing ? ey + 1.4 + Math.sin(t * 3.1) * 0.12 : y + 0.95 * s, bz = dabbing ? ez - nz * 0.12 + tz * (0.1 + wig) : z + rz * 0.24 * s + fz * 0.15 * s;
      if (P.a1 <= 0.05) { hand(1, bx, by, bz, dabbing ? 1 : 0.85); rod(bx, by, bz, bx - nx * 0.05, by + 0.12, bz - nz * 0.05, 0.02, WOOD2, CELL.LONG_B, 0.05); }
      const px = x - rx * 0.25 * s + fx * 0.22 * s, pz = z - rz * 0.25 * s + fz * 0.22 * s;
      hand(-1, px, y + 1.0 * s, pz, 1);
      dab(px, y + 1.02 * s, pz, 0.3, 0.32 * s, 0.2 * s, C2, CELL.DAB, 0, 1, 0);
    } else if (q && q.basket) {
      const bx = x - rx * 0.24 * s + fx * 0.05 * s, bz = z - rz * 0.24 * s + fz * 0.05 * s, by = y + (0.82 - P.bend * 0.3) * s;
      hand(-1, bx, by + 0.12 * s, bz, 1);
      dab(bx, by, bz, 0, 0.36 * s, 0.24 * s, C3, CELL.DAB, 0, 1, 0);
      if (kd > 0.02) { E.k = kd; dab(bx, by + 0.1 * s, bz, 0, 0.36 * s, 0.07 * s, C8, CELL.DAB, 0, 1, 0); dab(bx, by + 0.2 * s, bz, 0, 0.3 * s, 0.2 * s, C2, CELL.COMMA, 0, 1, 0); E.k = kb; }
    }
    if ((F.role === 'bend' || F.role === 'mend') && P.bend > 0.3) { // hands at the ground (or at the hull), busy
      const w = Math.sin(t * 3.3 + F.id) * 0.06;
      const hy = F.role === 'mend' ? y + 0.55 * s : y + 0.18 * s + Math.abs(w);
      hand(1, x + fx * 0.6 * s + rx * (0.16 + w) * s, hy, z + fz * 0.6 * s + rz * (0.16 + w) * s, sstep(0.3, 0.6, P.bend));
      if (!(q && q.basket)) hand(-1, x + fx * 0.58 * s - rx * (0.14 - w) * s, hy, z + fz * 0.58 * s - rz * (0.14 - w) * s, sstep(0.3, 0.6, P.bend));
    }
    lod(F, t, qd, kb);
  }

  function drawDog(F, t) {
    const k = E.k, fx = Math.sin(F.hd), fz = -Math.cos(F.hd), run = clamp(F.sp / 1.5, 0, 1), y = F.y + 0.3 + Math.abs(Math.sin(F.ph * 1.6)) * 0.06 * run;
    const col = C4, dark = C5;
    dab(F.x, y, F.z, -1.5708, 0.62, 0.28, col, CELL.LEAF, fx, 0, fz);
    dab(F.x + fx * 0.34, y + 0.12, F.z + fz * 0.34, 0, 0.2, 0.18, dark, CELL.DOT, 0, 1, 0);
    const wag = Math.sin(t * 9) * 0.6;
    dab(F.x - fx * 0.34, y + 0.1, F.z - fz * 0.34, wag, 0.22, 0.07, col, CELL.COMMA, 0, 0, 0);
    for (let i = 0; i < 2; i++) { const o = (i ? -0.18 : 0.18), sw = Math.sin(F.ph * 1.6 + i * PI) * 0.12 * run; rod(F.x + fx * (o + sw), F.y + 0.24, F.z + fz * (o + sw), F.x + fx * (o - sw), F.y + 0.02, F.z + fz * (o - sw), 0.07, dark, CELL.DAB, 0); }
    void k;
  }
  function drawBoat(B) {
    // a fishing boat drawn up on the shingle: a dark hull and a lighter strake, a red band, the mast with its sail furled
    const fx = Math.sin(B.hd), fz = -Math.cos(B.hd), rx = Math.cos(B.hd), rz = Math.sin(B.hd), y = B.y;
    for (let k = -1; k <= 1; k += 2) {
      put(B.x + rx * 0.62 * k, y + 0.42, B.z + rz * 0.62 * k, fx, 0.04, fz, rx * k, 0.25, rz * k, 4.4, 0.62, C6, 0, CELL.HEAVY, 0);
      put(B.x + rx * 0.66 * k, y + 0.76, B.z + rz * 0.66 * k, fx, 0.05, fz, rx * k, 0.2, rz * k, 4.5, 0.14, C7, 0, CELL.LONG_B, 0);
      put(B.x + rx * 0.6 * k, y + 0.88, B.z + rz * 0.6 * k, fx, 0.06, fz, 0, 1, 0, 4.3, 0.12, C8, 0, CELL.LONG_A, 0);
    }
    put(B.x, y + 0.82, B.z, fx, 0, fz, 0, 1, 0, 3.8, 0.9, C9, 0, CELL.DAB, FLAG_FLAT);
    put(B.x + fx * 2.25, y + 0.62, B.z + fz * 2.25, rx, 0.2, rz, fx, 0.2, fz, 0.9, 0.5, C10, 0, CELL.DAB, 0);
    rod(B.x + fx * 0.7, y + 0.7, B.z + fz * 0.7, B.x + fx * 0.75, y + 5.2, B.z + fz * 0.75, 0.09, C11, CELL.HEAVY, 0);
    dab(B.x + fx * 0.6, y + 3.1, B.z + fz * 0.6, 1.5708, 3.2, 0.26, C12, CELL.LONG_B, 0, 0, 0);
  }

  function draw(S, g, env, t) {
    if (!g || !g.cur || !g.ch || !S) return;
    if (g.cur !== st.world || g.ch !== st.ch) enter(g);
    if (st.world !== g.cur || !g.cam) return;
    frameSetup(S, g, env);
    const n0 = S.n;
    // the painted ones: exactly at their marks whenever a picture may be taken
    const L = g.mode === 'title' || g.reverie ? 0 : 1 - sstep(0, 0.9, g.viewK || 0);
    for (const F of figs) {
      if (Math.hypot(F.x0 - E.cx, F.y0 - E.cy, F.z0 - E.cz) > FAR_P) continue;
      posePainted(F, t, L, env);
      near(P.x, P.y + 1 * P.s, P.z, F.role === 'still' ? 0 : L); E.k = 1; E.id = F.id; E.j = 0; E.seeds = F.seeds;
      // near her they have a fuller body; at their marks (L 0) never
      const q = F.role === 'still' ? 0 : sstep(22, 12, Math.hypot(P.x - E.cx, P.y + P.s - E.cy, P.z - E.cz)) * L;
      torso(); HR[3] = 0; HL[3] = 0;
      waveHand(t, F.id);
      lod(F, t, q, 1);
    }
    // the passers by: gone when she settles at an easel, at night, in the reverie and on the title
    const show = g.mode !== 'play' || g.reverie ? 0 : g.viewK > 0.6 ? 0 : 1 - (g.viewK || 0) / 0.6, day = sstep(0.06, 0.3, env ? env.sunI : 1), summer = env && env.snow > 0.25 ? 0 : 1;
    if (show > 0.01 && day > 0.01) {
      for (const F of extras) {
        const k = show * day * (F.summer && !summer ? 0 : 1);
        if (k < 0.02 || Math.hypot(F.x - E.cx, F.y - E.cy, F.z - E.cz) > FAR) continue;
        near(F.x, F.y + 1, F.z, 1); E.k = k; E.id = F.id; E.j = 0; E.seeds = null;
        if (F.role === 'dog') drawDog(F, t); else drawExtra(F, t, F.mode === 'notice', k, sstep(22, 12, Math.hypot(F.x - E.cx, F.y + F.s - E.cy, F.z - E.cz)));
      }
      for (const B of props) {
        const k = show * day;
        if (Math.hypot(B.x - E.cx, B.z - E.cz) > FAR) continue;
        near(B.x, B.y + 1, B.z, 0); E.k = k; E.id = 900 + B.x; E.j = 0; E.seeds = null;
        drawBoat(B);
      }
    }
    st.seen = S.n - n0;
  }

  // the steps of walking: their phase runs with their speed
  function stepPhase(dt) { for (const F of figs) F.ph += dt * F.sp * 5.5; for (const F of extras) F.ph += dt * F.sp * (F.role === 'dog' ? 7 : 5.5); }
  const upd = update;
  function update2(g, dt) { upd(g, dt); stepPhase(Math.min(dt || 0, 0.1)); }

  return { live: true, enter, prepare, update: update2, draw, figs, extras, props, log, count, st, CAST };
})();
