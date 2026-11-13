// ---------- the living world: things that answer her as she passes ----------
// enter(g): a world has just been shown. update(g, dt): once a frame while she plays. draw(S, g, env, t): strokes for this frame.
// glows(R, g, env, t): lights for this frame.
// What lives here: strings of golden motes that ring as she takes them, birds that get up before her and come down again a
// little way off, rings that the water keeps behind her for a moment, and fireflies and a falling star for the night.
// Nothing is counted and nothing is written. g.shine (0 to 1) rises with every mote she takes and ebbs away again.
const ALIVE = (() => {
  const fr = (v) => v - Math.floor(v);
  const hh = (i, k) => fr(Math.sin(i * 12.9898 + k * 78.233 + 0.37) * 43758.5453);
  const GOLD = [1.0, 0.85, 0.44], SPARK = [1.0, 0.95, 0.74], RIPPLE = [0.9, 0.95, 1.0], TMP = [0, 0, 0];
  const PENT = [[0, 1, 2, 4, 5], [0, 2, 3, 4, 6]]; // the five note scale inside a seven note one: over a major third, over a minor third
  const PAUSE = 14;     // seconds a string half taken waits for her before it grows whole again
  const REGROW = 90;    // seconds until a string taken whole comes back
  const REACH = 1.6;    // how near she must pass to a mote
  const MAX_STRINGS = 7, MAX_FLOCKS = 5, FLIES = 26;

  const strings = [], flocks = [], bursts = [], rings = [];
  for (let i = 0; i < 10; i++) bursts.push({ t0: -99, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, big: 0, seed: 0 });
  for (let i = 0; i < 6; i++) rings.push({ t0: -99, x: 0, z: 0, seed: 0 });
  // clock: her own time, which only runs while she plays. Everything that has an age is measured on it
  const st = { world: null, ch: null, clock: 0, has: false, lx: 0, ly: 0, lz: 0, ringT: 0, ringN: 0, bi: 0, ri: 0, rnd: null, show: 0, motes: 0,
    starWait: 20, starT0: -99, starAz: 0, starEl: 0, starDa: 0, starDe: 0, starDur: 1 };

  // ----- the lie of the land, asked once when a world is entered -----
  const gh = (W, x, z) => W.h(clamp(x, -790, 790), clamp(z, -790, 790));
  const wet = (W, x, z) => W.waterY !== null && gh(W, x, z) < W.waterY - 0.15 && !(W.deck && W.deck(x, z) !== null);
  const dry = (W, x, z) => (W.waterY === null || gh(W, x, z) > W.waterY + 0.25) && !(W.deck && W.deck(x, z) !== null);
  const inWorld = (ch, x, z, m) => { const dx = x - ch.center[0], dz = z - ch.center[1], r = ch.radius - m; return dx * dx + dz * dz < r * r; };
  const easelDist = (ch, x, z) => {
    let d = 1e9;
    for (const s of ch.spots) { d = Math.min(d, Math.hypot(s.x - x, s.z - z)); if (s.easel) d = Math.min(d, Math.hypot(s.easel[0] - x, s.easel[1] - z)); }
    return d;
  };
  function inQuad(pts, x, z, pad) {
    let pos = 0, neg = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ex = b[0] - a[0], ez = b[1] - a[1], l = Math.hypot(ex, ez) || 1;
      const d = (ex * (z - a[1]) - ez * (x - a[0])) / l;
      if (d > pad) pos++; else if (d < -pad) neg++;
    }
    return pos === 0 || neg === 0;
  }
  // is this point of the air taken up by something that stands there: a trunk or a wall low down, a crown, a stack, a roof, a bridge.
  // up is its height above the ground. The colliders are what she bumps into, the shadow casters say how tall and how wide things are
  function taken(W, x, z, up, pad) {
    if (up < 5.5) for (const c of W.colliders) { const dx = x - c.x, dz = z - c.z, r = c.r + pad; if (dx * dx + dz * dz < r * r) return true; }
    for (const c of W.casters || []) {
      const dx = x - c.x, dz = z - c.z;
      if (c.k === 'ball') { const dy = up - c.y, r = c.r + pad; if (dx * dx + dy * dy + dz * dz < r * r) return true; }
      else if (c.k === 'pole') { const r = c.r + pad; if (up < c.h + pad && dx * dx + dz * dz < r * r) return true; }
      else if (c.k === 'cone') { if (up < c.h + pad) { const r = c.r * (1 - clamp(up / c.h, 0, 1)) + pad; if (dx * dx + dz * dz < r * r) return true; } }
      else if (c.k === 'box' && c.pts) { if (up < c.h + pad && inQuad(c.pts, x, z, pad)) return true; }
    }
    return false;
  }

  // ----- strings of light -----
  // n points evenly spaced by length on the curve f(u), u from 0 to 1
  function along(f, n, closed) {
    const M = 120, px = [], pz = [], L = [0];
    for (let i = 0; i <= M; i++) { const q = f(i / M); px.push(q[0]); pz.push(q[1]); if (i) L.push(L[i - 1] + Math.hypot(px[i] - px[i - 1], pz[i] - pz[i - 1])); }
    const out = [], tot = L[M];
    for (let k = 0, j = 0; k < n; k++) {
      const want = tot * (closed ? k / n : k / (n - 1));
      while (j < M - 1 && L[j + 1] < want) j++;
      const q = (want - L[j]) / Math.max(1e-6, L[j + 1] - L[j]);
      out.push([px[j] + (px[j + 1] - px[j]) * q, pz[j] + (pz[j + 1] - pz[j]) * q]);
    }
    out.len = tot;
    return out;
  }
  // a line from one point to another that leans out to the side by b1 a third of the way along and by b2 at two thirds
  function bez(x0, z0, x3, z3, b1, b2) {
    const dx = x3 - x0, dz = z3 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    const x1 = x0 + dx / 3 + nx * b1, z1 = z0 + dz / 3 + nz * b1, x2 = x0 + dx * 2 / 3 + nx * b2, z2 = z0 + dz * 2 / 3 + nz * b2;
    return (u) => { const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u; return [a * x0 + b * x1 + c * x2 + d * x3, a * z0 + b * z1 + c * z2 + d * z3]; };
  }
  // of several bends of a line, the one that keeps clearest of what stands in its way, of the easels and of the edge of the world
  function pick(ch, W, curves, spacing, upOf, pad, minEasel) {
    let best = null, bs = 1e9;
    for (let k = 0; k < curves.length; k++) {
      const len = along(curves[k], 2, false).len, n = clamp(Math.round(len / spacing) + 1, 8, 14), pts = along(curves[k], n, false);
      let bad = k * 0.01;
      for (let i = 0; i < n; i++) {
        const x = pts[i][0], z = pts[i][1];
        if (!inWorld(ch, x, z, 8)) bad += 4;
        if (easelDist(ch, x, z) < minEasel) bad += 2;
        if (taken(W, x, z, upOf(i / (n - 1)), pad)) bad += 1;
      }
      if (bad < bs) { bs = bad; best = pts; }
      if (bad < 0.5) break;
    }
    return best;
  }
  // heights for a line in the air: it rides on a smoothed ground, never nearer to the real one than floor, and never steeper than she can glide
  function lift(g, ch, W, pts, rel, floor, closed) {
    const n = pts.length, gy = [], y = [];
    for (let i = 0; i < n; i++) gy.push(g.groundAt(W, pts[i][0], pts[i][1]));
    const ix = (i) => (closed ? (i + n) % n : clamp(i, 0, n - 1));
    let sm = gy.slice();
    for (let pass = 0; pass < 3; pass++) { const o = sm.slice(); for (let i = 0; i < n; i++) sm[i] = (o[ix(i - 1)] + 2 * o[i] + o[ix(i + 1)]) / 4; }
    for (let i = 0; i < n; i++) y.push(Math.max(sm[i] + rel(closed ? i / n : i / (n - 1)), gy[i] + floor));
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const j = ix(i + 1), gm = g.groundAt(W, (pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2), lack = gm + floor - 1.5 - (y[i] + y[j]) / 2;
      if (lack > 0) { y[i] += lack; y[j] += lack; }
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < n; i++) y[i] = Math.max(y[i], y[i - 1] - 0.55 * Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      for (let i = n - 2; i >= 0; i--) y[i] = Math.max(y[i], y[i + 1] - 0.55 * Math.hypot(pts[i][0] - pts[i + 1][0], pts[i][1] - pts[i + 1][1]));
    }
    const top = (ch.maxAlt || 42) - 4;
    for (let i = 0; i < n; i++) y[i] = Math.min(y[i], gy[i] + top);
    return y;
  }
  function addString(kind, P, closed) {
    const n = P.length;
    if (n < 5 || strings.length >= MAX_STRINGS) return false;
    const s = { kind, n, closed: !!closed, x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), tk: new Uint8Array(n), bt: new Float64Array(n).fill(-1e6),
      got: 0, last: -1e6, back: 0, awake: 0, ph: strings.length * 1.7, base: -Math.max(0, n - 10), cx: 0, cy: 0, cz: 0, rad: 0 };
    for (let i = 0; i < n; i++) { s.x[i] = P[i][0]; s.y[i] = P[i][1]; s.z[i] = P[i][2]; s.cx += P[i][0] / n; s.cy += P[i][1] / n; s.cz += P[i][2] / n; }
    for (let i = 0; i < n; i++) s.rad = Math.max(s.rad, Math.hypot(s.x[i] - s.cx, s.y[i] - s.cy, s.z[i] - s.cz));
    strings.push(s);
    return true;
  }
  // set the motes of a line at their heights and move those aside or up that hang in a crown or a roof. A mote that cannot be freed is left out
  function hang(g, ch, W, pts, y, pad, canRise, kind, closed) {
    const P = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      let x = pts[i][0], z = pts[i][1], yy = y[i], ok = !taken(W, x, z, yy - g.groundAt(W, x, z), pad);
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l;
      for (let k = 1; k <= 6 && !ok; k++) {
        const up = canRise && k % 3 === 0 ? k : 0, side = up ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (canRise ? 2.5 : 1.5), tx = pts[i][0] + nx * side, tz = pts[i][1] + nz * side;
        const ty = y[i] + up + (g.groundAt(W, tx, tz) - g.groundAt(W, pts[i][0], pts[i][1])) * (canRise ? 0 : 1);
        if (inWorld(ch, tx, tz, 6) && ty - g.groundAt(W, tx, tz) > 1.3 && !taken(W, tx, tz, ty - g.groundAt(W, tx, tz), pad)) { x = tx; z = tz; yy = ty; ok = true; }
      }
      if (ok) P.push([x, yy, z]);
    }
    return addString(kind, P, closed);
  }
  // a line to fly from near one place to near another: a bow in the air, some 6 to 13 m up
  function flightLine(g, ch, W, rnd, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
    if (d < 10) return false;
    const ux = dx / d, uz = dz / d, nx = -uz, nz = ux, curves = [], s0 = rnd() < 0.5 ? 1 : -1, o = Math.floor(rnd() * 4);
    if (d < 58) {
      // two places close together: the line swings out to one side and comes round, a way about rather than a hop across
      for (const s of [s0, -s0]) for (const b of [24, 16]) curves.push(bez(ax + nx * 15 * s - ux * 2, az + nz * 15 * s - uz * 2, bx + nx * 15 * s + ux * 2, bz + nz * 15 * s + uz * 2, b * s, b * s));
    } else {
      const L = d - 32, use = Math.min(L, 72), m0 = 16 + (L - use) * 0.45, bend = clamp(use * 0.2, 5, 14);
      const x0 = ax + ux * m0, z0 = az + uz * m0, x3 = ax + ux * (m0 + use), z3 = az + uz * (m0 + use), sh = [[1, 1], [-1, -1], [1, -1], [-1, 1]];
      for (let k = 0; k < 4; k++) { const q = sh[(k + o) % 4]; curves.push(bez(x0, z0, x3, z3, q[0] * bend, q[1] * bend)); }
      for (const q of [[0.5, 0.5], [-0.5, -0.5], [0, 0], [1.7, 1.7], [-1.7, -1.7]]) curves.push(bez(x0, z0, x3, z3, q[0] * bend, q[1] * bend));
    }
    const rel = (u) => 6.4 + 6.4 * Math.pow(Math.sin(Math.PI * u), 0.85);
    const pts = pick(ch, W, curves, 5.3, rel, 2, 13);
    return hang(g, ch, W, pts, lift(g, ch, W, pts, rel, 6, false), 1.8, true, 'arc', false);
  }
  // a low garland, just over her head, from near one place towards another: it is taken on foot, sliding, or skimming the ground
  function lowLine(g, ch, W, rnd, ax, az, bx, bz, m0, m1) {
    const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
    let e = d - m1, b = m0;
    if (e - b < 18) b = Math.max(5, e - 18);
    if (e - b < 9) return false;
    const ux = dx / d, uz = dz / d, len = e - b, bend = clamp(len * 0.14, 2, 9), curves = [], sh = [[1, -1], [-1, 1], [1, 1], [-1, -1]], o = Math.floor(rnd() * 4);
    const x0 = ax + ux * b, z0 = az + uz * b, x3 = ax + ux * e, z3 = az + uz * e;
    for (let k = 0; k < 4; k++) { const q = sh[(k + o) % 4]; curves.push(bez(x0, z0, x3, z3, q[0] * bend, q[1] * bend)); }
    for (const q of [[0.4, -0.4], [0, 0], [2, 2], [-2, -2]]) curves.push(bez(x0, z0, x3, z3, q[0] * bend, q[1] * bend));
    const up = () => 2.1, pts = pick(ch, W, curves, Math.max(4.4, len / 13), up, 1.4, 9.5), y = [];
    for (let i = 0; i < pts.length; i++) y.push(g.groundAt(W, pts[i][0], pts[i][1]) + 2.1 + 0.4 * Math.sin(i * 1.25));
    return hang(g, ch, W, pts, y, 1.2, false, 'lead', false);
  }
  // a loop low over open water, for a slide: as round as the water allows, as near to the easels as it may be
  function waterLoops(g, ch, W, rnd, want) {
    if (W.waterY === null || want <= 0) return;
    const shapes = [[13, 13], [14, 9.5], [15, 6.5], [9, 9], [13, 4.8], [16, 3.8], [10, 4.2]], anchors = [ch.start], cands = [];
    for (const s of ch.spots) if (!s.hidden) anchors.push(s);
    const fits = (cx, cz, a, b, rot) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      for (let k = 0; k < 24; k++) {
        const th = k < 16 ? k * TAU / 16 : (k - 16) * TAU / 8 + 0.2, q = k < 16 ? 1 : 1.35, ex = Math.cos(th) * a * q, ez = Math.sin(th) * b * q, x = cx + ex * c - ez * s, z = cz + ex * s + ez * c; // the loop itself, and room to slide round it
        if (!wet(W, x, z) || !inWorld(ch, x, z, 10)) return false;
        if (k < 16 && (easelDist(ch, x, z) < 15 || taken(W, x, z, 2, 2.6))) return false;
      }
      return true;
    };
    for (let k = 0; k < 900; k++) {
      const a = rnd() * TAU, r = Math.sqrt(rnd()) * (ch.radius - 22), cx = ch.center[0] + Math.cos(a) * r, cz = ch.center[1] + Math.sin(a) * r, rot0 = rnd() * Math.PI;
      if (!wet(W, cx, cz)) continue;
      let dA = 1e9; for (const q of anchors) dA = Math.min(dA, Math.hypot(q.x - cx, q.z - cz));
      for (let si = 0; si < shapes.length; si++) {
        let rot = -1;
        for (let ri = 0; ri < (shapes[si][0] === shapes[si][1] ? 1 : 8) && rot < 0; ri++) if (fits(cx, cz, shapes[si][0], shapes[si][1], rot0 + ri * Math.PI / 8)) rot = rot0 + ri * Math.PI / 8;
        if (rot >= 0) { cands.push({ cx, cz, a: shapes[si][0], b: shapes[si][1], rot, score: dA + si * 11 }); break; }
      }
    }
    cands.sort((p, q) => p.score - q.score);
    const made = [], apart = Math.max(46, ch.radius * 0.42);
    for (const q of cands) {
      if (made.length >= want) break;
      let ok = true; for (const m of made) if (Math.hypot(m.cx - q.cx, m.cz - q.cz) < apart) ok = false;
      if (!ok) continue;
      const c = Math.cos(q.rot), s = Math.sin(q.rot), per = TAU * Math.sqrt((q.a * q.a + q.b * q.b) / 2), n = clamp(Math.round(per / 4.8), 8, 14);
      const pts = along((u) => { const ex = Math.cos(u * TAU) * q.a, ez = Math.sin(u * TAU) * q.b; return [q.cx + ex * c - ez * s, q.cz + ex * s + ez * c]; }, n, true), P = [];
      for (let i = 0; i < n; i++) P.push([pts[i][0], W.waterY + 2.1 + 0.5 * Math.sin((i / n) * TAU * 2), pts[i][1]]);
      if (addString('loop', P, true)) made.push(q);
    }
  }
  // a ring in the air around what stands tallest in the open: a stack, a great tree. A thing to circle
  function flightRing(g, ch, W, rnd) {
    let best = null, bs = 0;
    for (const c of W.casters || []) {
      const size = c.k === 'cone' ? c.r * 3 : c.k === 'ball' ? c.r : 0;
      if (size <= bs || !inWorld(ch, c.x, c.z, 36) || easelDist(ch, c.x, c.z) < 28 || !dry(W, c.x, c.z)) continue;
      let near = false; for (const s of strings) if (s.kind === 'ring' && Math.hypot(s.cx - c.x, s.cz - c.z) < 60) near = true;
      if (near) continue;
      bs = size; best = c;
    }
    const cx = best ? best.x : (ch.start.x + ch.center[0]) / 2, cz = best ? best.z : (ch.start.z + ch.center[1]) / 2, R = clamp((best ? best.r : 4) + 8, 11, 14), a0 = rnd() * TAU;
    const n = clamp(Math.round(TAU * R / 5.6), 8, 14), pts = along((u) => [cx + Math.cos(a0 + u * TAU) * R, cz + Math.sin(a0 + u * TAU) * R], n, true);
    const rel = (u) => 8.2 + 2 * Math.sin(u * TAU * 2);
    return hang(g, ch, W, pts, lift(g, ch, W, pts, rel, 6, true), 1.8, true, 'ring', true);
  }
  function makeStrings(g, ch, W, rnd) {
    const mains = [], hid = [];
    for (const s of ch.spots) (s.hidden ? hid : mains).push(s);
    // from each easel to the next, a line to fly
    for (let i = 0; i + 1 < mains.length; i++) flightLine(g, ch, W, rnd, mains[i].x, mains[i].z, mains[i + 1].x, mains[i + 1].z);
    // towards an easel nobody points to, a garland that sets out from the nearest easel she knows and stops short of it
    for (const h of hid) {
      let m = null, md = 1e9;
      for (const q of mains) { const d = Math.hypot(q.x - h.x, q.z - h.z); if (d < md) { md = d; m = q; } }
      if (m) lowLine(g, ch, W, rnd, m.x, m.z, h.x, h.z, 14, 22);
    }
    // over the water, loops to be taken in a slide
    waterLoops(g, ch, W, rnd, Math.min(2, MAX_STRINGS - strings.length));
    // and where that leaves a world thin: on to the frame that leads out, round from the last easel to the first, around a stack
    const first = mains[0], lastM = mains[mains.length - 1];
    if (strings.length < 5 && ch.door && lastM && Math.hypot(ch.door.x - lastM.x, ch.door.z - lastM.z) > 60) flightLine(g, ch, W, rnd, lastM.x, lastM.z, ch.door.x, ch.door.z);
    if (strings.length < 5 && mains.length > 2 && Math.hypot(first.x - lastM.x, first.z - lastM.z) > 28) flightLine(g, ch, W, rnd, lastM.x, lastM.z, first.x, first.z);
    for (let k = 0; k < 2 && strings.length < 5; k++) flightRing(g, ch, W, rnd);
  }

  // ----- birds -----
  // wing: length of one wing. len: of the body. leg: how high it stands. beat: wing beats a second. sp: speed. up: how high it circles.
  // glide: how much of the time it sails. water: it rests afloat
  const KINDS = {
    gull: { name: 'gull', wing: 0.62, len: 0.46, leg: 0.1, body: [0.95, 0.95, 0.92], top: [0.7, 0.74, 0.8], head: [0.97, 0.97, 0.94], beat: 4.6, sp: 9, up: 7, glide: 0.7, water: 0 },
    duck: { name: 'duck', wing: 0.42, len: 0.44, leg: 0.04, body: [0.6, 0.47, 0.34], top: [0.42, 0.34, 0.28], head: [0.2, 0.44, 0.35], beat: 9, sp: 10, up: 4.5, glide: 0, water: 1 },
    crow: { name: 'crow', wing: 0.52, len: 0.44, leg: 0.08, body: [0.21, 0.2, 0.33], top: [0.17, 0.17, 0.29], head: [0.2, 0.19, 0.32], beat: 4.4, sp: 8, up: 7, glide: 0.35, water: 0 },
    lark: { name: 'lark', wing: 0.28, len: 0.23, leg: 0.05, body: [0.7, 0.57, 0.4], top: [0.5, 0.4, 0.3], head: [0.62, 0.5, 0.37], beat: 9.5, sp: 7.5, up: 6, glide: 0.25, water: 0 },
    swallow: { name: 'swallow', wing: 0.34, len: 0.22, leg: 0.04, body: [0.93, 0.9, 0.85], top: [0.2, 0.25, 0.45], head: [0.23, 0.27, 0.46], beat: 7.5, sp: 11, up: 5, glide: 0.7, water: 0 },
  };
  // who lives where: by the place she begins, on the way between easels, by what stands tall in the open, at the edge of the water (and how many flocks of those)
  const WHO = {
    coast: { start: 'gull', way: 'gull', tall: null, water: 'gull', nWater: 2 },
    argenteuil: { start: 'swallow', way: 'swallow', tall: null, water: 'duck', nWater: 2 },
    fields: { start: 'lark', way: 'lark', tall: 'crow', water: 'duck', nWater: 1 },
    pond: { start: 'lark', way: 'lark', tall: null, water: 'duck', nWater: 3 },
    other: { start: 'lark', way: 'lark', tall: null, water: 'duck', nWater: 1 },
  };
  // a place where a flock may stand (or float): open, level, away from the easels and from the other flocks
  function perchOK(ch, W, kind, x, z, self) {
    if (!inWorld(ch, x, z, 12) || easelDist(ch, x, z) < 13.5) return false;
    if (ch.door && Math.hypot(ch.door.x - x, ch.door.z - z) < 9) return false;
    for (const f of flocks) if (f !== self && Math.hypot(f.hx - x, f.hz - z) < 26) return false;
    if (kind.water) {
      if (!wet(W, x, z)) return false;
      let shore = false;
      for (let k = 0; k < 8; k++) { const c = Math.cos(k * 0.7854), s = Math.sin(k * 0.7854); if (!wet(W, x + c * 3, z + s * 3)) return false; if (dry(W, x + c * 7, z + s * 7) || dry(W, x + c * 12, z + s * 12)) shore = true; }
      if (!shore || taken(W, x, z, 0.3, 4)) return false;
    } else {
      if (!dry(W, x, z)) return false;
      const h0 = gh(W, x, z);
      for (let k = 0; k < 8; k++) { const c = Math.cos(k * 0.7854) * 2.6, s = Math.sin(k * 0.7854) * 2.6; if (!dry(W, x + c, z + s) || Math.abs(gh(W, x + c, z + s) - h0) > 0.9) return false; }
      if (taken(W, x, z, 0.3, 3.2)) return false;
    }
    return true;
  }
  function perch(g, W, f) {
    f.hy = g.groundAt(W, f.hx, f.hz);
    for (let i = 0; i < f.n; i++) f.qy[i] = g.groundAt(W, f.hx + f.ox[i], f.hz + f.oz[i]);
  }
  function addFlock(g, W, kind, x, z, n, rnd) {
    if (flocks.length >= MAX_FLOCKS) return;
    const F = () => new Float32Array(n);
    const f = { kind, n, hx: x, hz: z, hy: 0, state: 0, t: 0, T: 0, cx: x, cz: z, cy: 0, rad: 7, a0: 0, dir: 1, ph: flocks.length * 2.3 + 0.7,
      ox: F(), oz: F(), qy: F(), px: F(), py: F(), pz: F(), vx: F(), vy: F(), vz: F(), hd: F(), wait: F(), at: new Uint8Array(n).fill(1) };
    for (let i = 0; i < n; i++) {
      let ox = 0, oz = 0;
      for (let k = 0; k < 24; k++) {
        const a = rnd() * TAU, r = kind.water ? 0.5 + rnd() * 2.2 : 0.4 + rnd() * 1.9;
        ox = Math.cos(a) * r; oz = Math.sin(a) * r;
        let ok = true; for (let j = 0; j < i; j++) if (Math.hypot(ox - f.ox[j], oz - f.oz[j]) < 0.8) ok = false;
        if (ok) break;
      }
      f.ox[i] = ox; f.oz[i] = oz; f.hd[i] = rnd() * TAU;
    }
    perch(g, W, f);
    for (let i = 0; i < n; i++) { f.px[i] = x + f.ox[i]; f.py[i] = f.qy[i]; f.pz[i] = z + f.oz[i]; }
    flocks.push(f);
  }
  function makeFlocks(g, ch, W, rnd) {
    const who = WHO[ch.id] || WHO.other, mains = [];
    for (const s of ch.spots) if (!s.hidden) mains.push(s);
    const some = () => 3 + Math.floor(rnd() * 3.99);
    // by the place where she begins, a little ahead of her and to one side
    if (who.start) for (let k = 0; k < 90; k++) {
      const a = (ch.start.yaw || 0) + (rnd() - 0.5) * (k < 45 ? 2.4 : 6.283), d = 12 + rnd() * 12, x = ch.start.x + Math.sin(a) * d, z = ch.start.z - Math.cos(a) * d;
      if (perchOK(ch, W, KINDS[who.start], x, z, null)) { addFlock(g, W, KINDS[who.start], x, z, some(), rnd); break; }
    }
    // on the way from one easel to the next
    let legs = 0;
    for (let i = 0; i + 1 < mains.length && legs < 2 && who.way; i++) {
      const a = mains[i], b = mains[i + 1], d = Math.hypot(b.x - a.x, b.z - a.z);
      if (d < 64) continue;
      for (let k = 0; k < 50; k++) {
        const u = 0.3 + rnd() * 0.4, side = (rnd() < 0.5 ? -1 : 1) * (3 + rnd() * 11), x = a.x + (b.x - a.x) * u - ((b.z - a.z) / d) * side, z = a.z + (b.z - a.z) * u + ((b.x - a.x) / d) * side;
        if (perchOK(ch, W, KINDS[who.way], x, z, null)) { addFlock(g, W, KINDS[who.way], x, z, some(), rnd); legs++; break; }
      }
    }
    // by what stands tall in the open: the stacks have their crows
    if (who.tall) {
      let best = null;
      for (const c of W.casters || []) if (c.k === 'cone' && inWorld(ch, c.x, c.z, 24) && easelDist(ch, c.x, c.z) > 20 && (!best || c.r > best.r)) best = c;
      if (best) for (let k = 0; k < 40; k++) {
        const a = rnd() * TAU, d = best.r + 3.5 + rnd() * 4, x = best.x + Math.cos(a) * d, z = best.z + Math.sin(a) * d;
        if (perchOK(ch, W, KINDS[who.tall], x, z, null)) { addFlock(g, W, KINDS[who.tall], x, z, 4 + Math.floor(rnd() * 2.99), rnd); break; }
      }
    }
    // at the edge of the water: out along rays from the easels and from her first place until land turns to water or water to land
    if (who.water && W.waterY !== null) {
      const kind = KINDS[who.water], sh = [], anchors = mains.concat([ch.start]);
      for (const q of anchors) for (let k = 0; k < 16; k++) {
        const a = k * TAU / 16 + 0.2, dx = Math.cos(a), dz = Math.sin(a);
        let was = wet(W, q.x, q.z) ? 1 : dry(W, q.x, q.z) ? -1 : 0;
        for (let r = 3; r <= 90; r += 1.5) {
          const x = q.x + dx * r, z = q.z + dz * r, now = wet(W, x, z) ? 1 : dry(W, x, z) ? -1 : 0;
          if (now && was && now !== was) { sh.push([x, z, dx * now, dz * now, r + rnd() * 6]); break; }
          if (now) was = now;
        }
      }
      sh.sort((p, q) => p[4] - q[4]);
      let made = 0;
      for (const q of sh) {
        if (made >= who.nWater || flocks.length >= MAX_FLOCKS) break;
        for (let k = 0; k < 3; k++) {
          const off = kind.water ? 4 + k * 1.5 : -(3 + k * 1.5), x = q[0] + q[2] * off, z = q[1] + q[3] * off;
          if (!kind.water && gh(W, x, z) > W.waterY + 3.2) continue; // a beach or a low rock, not the top of a cliff
          if (perchOK(ch, W, kind, x, z, null)) { addFlock(g, W, kind, x, z, some(), rnd); made++; break; }
        }
      }
    }
  }
  // she has come too near: up they go, the nearest first, and round in a ring a little way off
  function rise(g, f) {
    const p = g.pl, r = st.rnd;
    let ax = f.hx - p.x, az = f.hz - p.z;
    const l = Math.hypot(ax, az) || 1; ax /= l; az /= l;
    f.state = 1; f.t = 0; f.T = 9 + r() * 6; f.rad = 6 + r() * 3; f.dir = r() < 0.5 ? -1 : 1;
    f.cx = f.hx + ax * 9; f.cz = f.hz + az * 9; f.cy = Math.max(f.hy, g.groundAt(g.cur, f.cx, f.cz));
    f.a0 = Math.atan2(f.hz - f.cz, f.hx - f.cx);
    for (let i = 0; i < f.n; i++) {
      const d = Math.hypot(f.px[i] - p.x, f.pz[i] - p.z);
      f.wait[i] = clamp((d - 5) * 0.07, 0, 0.45) + r() * 0.12;
    }
    const k0 = 7 + Math.floor(r() * 2);
    ring(g, 'pluck', 0.01, k0, 0.028); ring(g, 'pluck', 0.08, k0 + 2, 0.024); if (f.n > 3) ring(g, 'pluck', 0.16, k0 + 1, 0.02);
  }
  // time to come down: a place near where they circle, away from her
  function settle(g, f) {
    const ch = g.ch, W = g.cur, p = g.pl, r = st.rnd;
    for (let k = 0; k < 14; k++) {
      const a = r() * TAU, d = 12 + r() * 22, x = f.cx + Math.cos(a) * d, z = f.cz + Math.sin(a) * d;
      if (Math.hypot(x - p.x, z - p.z) < 17 || !perchOK(ch, W, f.kind, x, z, f)) continue;
      f.hx = x; f.hz = z; perch(g, W, f); f.state = 2;
      return true;
    }
    if (Math.hypot(f.hx - p.x, f.hz - p.z) > 17) { f.state = 2; return true; } // nowhere new: back to where they stood
    return false;
  }
  function stepFlocks(g, dt) {
    const p = g.pl, W = g.cur;
    for (let fi = 0; fi < flocks.length; fi++) {
      const f = flocks[fi], k = f.kind;
      if (f.state === 0) {
        const dx = p.x - f.hx, dz = p.z - f.hz;
        if (dx * dx + dz * dz < 81 && Math.abs(p.y - f.hy) < 8) rise(g, f);
        continue;
      }
      f.t += dt;
      if (f.state === 1 && f.t > f.T && !settle(g, f)) f.T = f.t + 3;
      if (f.state === 2 && Math.hypot(p.x - f.hx, p.z - f.hz) < 8 && Math.abs(p.y - f.hy) < 8) {
        // she is where they meant to come down: round once more
        let ax = f.hx - p.x, az = f.hz - p.z; const l = Math.hypot(ax, az) || 1;
        f.state = 1; f.T = f.t + 4 + st.rnd() * 4; f.cx = f.hx + (ax / l) * 9; f.cz = f.hz + (az / l) * 9; f.cy = Math.max(f.hy, g.groundAt(W, f.cx, f.cz));
        for (let i = 0; i < f.n; i++) if (f.at[i]) f.wait[i] = f.t + st.rnd() * 0.3;
      }
      let down = 0;
      for (let i = 0; i < f.n; i++) {
        if (f.at[i]) {
          if (f.state === 1 && f.t >= f.wait[i]) { // off its feet: away from her and up
            f.at[i] = 0;
            let ax = f.px[i] - p.x, az = f.pz[i] - p.z; const l = Math.hypot(ax, az) || 1;
            f.vx[i] = (ax / l) * 2.5; f.vz[i] = (az / l) * 2.5; f.vy[i] = 4.5;
          } else { down++; continue; }
        }
        const air = f.t - f.wait[i], gy = g.groundAt(W, f.px[i], f.pz[i]);
        let tx, ty, tz, top = k.sp;
        if (f.state === 1) {
          const th = f.a0 + f.dir * ((f.t * k.sp * 0.8) / f.rad - i * 0.42), rr = f.rad + 1.5 * Math.sin(f.t * 0.7 + i * 1.9);
          tx = f.cx + Math.cos(th) * rr; tz = f.cz + Math.sin(th) * rr;
          ty = Math.max(f.cy, gy) + k.up + 1.1 * Math.sin(f.t * 0.9 + i * 2.3);
          if (air < 1.2) top *= 1.3;
        } else {
          tx = f.hx + f.ox[i]; tz = f.hz + f.oz[i];
          const hd = Math.hypot(tx - f.px[i], tz - f.pz[i]);
          ty = f.qy[i] + (hd > 2.5 ? Math.min(k.up, 0.4 + hd * 0.45) : 0);
          top = Math.min(top, Math.max(1.3, hd * 1.5 + 0.6));
          if (hd < 0.3 && Math.abs(f.py[i] - f.qy[i]) < 0.3) { f.at[i] = 1; f.px[i] = tx; f.py[i] = f.qy[i]; f.pz[i] = tz; f.vx[i] = f.vy[i] = f.vz[i] = 0; down++; continue; }
        }
        const dx = tx - f.px[i], dy = ty - f.py[i], dz = tz - f.pz[i], d = Math.hypot(dx, dy, dz) || 1, want = Math.min(top, d * 1.8) / d, q = Math.min(1, dt * (air < 0.8 ? 5 : 2.8));
        f.vx[i] += (dx * want - f.vx[i]) * q; f.vy[i] += (dy * want - f.vy[i]) * q; f.vz[i] += (dz * want - f.vz[i]) * q;
        f.px[i] += f.vx[i] * dt; f.py[i] += f.vy[i] * dt; f.pz[i] += f.vz[i] * dt;
        if (f.py[i] < gy + 0.05) f.py[i] = gy + 0.05;
        if (f.vx[i] * f.vx[i] + f.vz[i] * f.vz[i] > 0.25) f.hd[i] = Math.atan2(f.vx[i], -f.vz[i]);
      }
      if (f.state === 2 && down === f.n) f.state = 0;
    }
  }

  // ----- sound: always in the key of the music that is playing, and never a reason for a frame to fail -----
  function tone(g, voice, wait, deg, vel) {
    const a = g.audio;
    if (!a || !a.ok || !a.ok() || !a.group || !a.group.score || !a.ctx) return;
    if (a.ctx.state && a.ctx.state !== 'running') return;
    try { a.note(voice, a.ctx.currentTime + wait, a.deg(a.group.score, deg, 1), vel); } catch (e) { /* a voice that fails is only a silence */ }
  }
  // the k-th step of the five note scale of that key
  function ring(g, voice, wait, k, vel) {
    const a = g.audio, sc = a && a.group ? a.group.score : null;
    if (!sc) return;
    const o = Math.floor(k / 5);
    tone(g, voice, wait, o * 7 + PENT[sc.scale && sc.scale[2] === 3 ? 1 : 0][k - o * 5], vel);
  }

  function burst(g, x, y, z, big) {
    const b = bursts[st.bi], p = g.pl, k = big ? 0.45 : 0.7;
    st.bi = (st.bi + 1) % bursts.length;
    b.t0 = st.clock; b.x = x; b.y = y; b.z = z; b.big = big; b.seed = st.bi * 3.7 + st.clock;
    b.vx = p.vx * k; b.vz = p.vz * k; b.vy = (p.alt > 0.06 ? p.valt : 0) * k; // what bursts goes along with her for a moment, so that she sees it
  }
  function take(g, s, i) {
    s.tk[i] = 1; s.got++; s.last = st.clock; s.awake = 1;
    g.shine = Math.min(1, (g.shine || 0) + 0.12);
    ring(g, 'glass', 0.01, s.base + s.got - 1, 0.05 + 0.02 * (s.got / s.n));
    if (s.got < s.n) { burst(g, s.x[i], s.y[i], s.z[i], 0); return; }
    // the whole string in one go: it answers with a rising figure and a spray of petals, and rests a while before it grows again
    s.back = st.clock + REGROW;
    g.shine = Math.min(1, g.shine + 0.2);
    burst(g, s.x[i], s.y[i], s.z[i], 1);
    tone(g, 'glass', 0.1, 0, 0.045);
    for (let k = 0; k < 5; k++) tone(g, 'bell', 0.1 + k * 0.075, [7, 9, 11, 14, 16][k], 0.05 - k * 0.005);
  }

  function enter(g) {
    strings.length = 0; flocks.length = 0;
    for (const b of bursts) b.t0 = -99;
    for (const r of rings) r.t0 = -99;
    st.has = false; st.world = null; st.ch = null; st.ringT = 0; st.starT0 = -99;
    if (!g) return;
    if (typeof g.shine !== 'number') g.shine = 0;
    const ch = g.ch, W = g.cur;
    if (!ch || !W || !ch.spots || !ch.start) return;
    st.world = W; st.ch = ch;
    if (pre && pre.W === W && pre.ch === ch) { // made ahead of time (see prepare): only taken over
      for (const x of pre.strings) strings.push(x);
      for (const x of pre.flocks) flocks.push(x);
      st.rnd = pre.rnd; st.starWait = pre.starWait; pre = null;
      return;
    }
    st.rnd = mulberry32((ch.seed | 0) * 17 + 99); // the one that runs on while she plays: where birds come down, when a star falls
    st.starWait = 12 + st.rnd() * 26;
    try { makeStrings(g, ch, W, mulberry32((ch.seed | 0) * 31 + 1717)); } catch (e) { if (typeof console !== 'undefined') console.warn('alive: strings', e); }
    try { makeFlocks(g, ch, W, mulberry32((ch.seed | 0) * 13 + 4242)); } catch (e) { if (typeof console !== 'undefined') console.warn('alive: birds', e); }
  }
  // The lines of light and the birds of a world she is not in yet, made while the picture stands still, so that arriving there
  // costs nothing (it is a quarter of a second of looking for places). What is in the world she is in now is put back as it was.
  // The making asks nothing of the game but the lie of that world's land, so made ahead it comes out the same as made on arrival
  let pre = null;
  function prepare(g, ch, W) {
    if (!g || !ch || !W || (pre && pre.W === W)) return;
    const keepS = strings.slice(), keepF = flocks.slice(), keepSt = Object.assign({}, st), kb = bursts.map((b) => b.t0), kr = rings.map((r) => r.t0);
    pre = null;
    try {
      enter({ ch, cur: W, shine: 0, groundAt: (w, x, z) => g.groundAt(w, x, z) });
      pre = { W, ch, strings: strings.slice(), flocks: flocks.slice(), rnd: st.rnd, starWait: st.starWait };
    } catch (e) { pre = null; }
    strings.length = 0; for (const x of keepS) strings.push(x);
    flocks.length = 0; for (const x of keepF) flocks.push(x);
    Object.assign(st, keepSt);
    bursts.forEach((b, i) => { b.t0 = kb[i]; }); rings.forEach((r, i) => { r.t0 = kr[i]; });
  }

  function update(g, dt) {
    if (!g || !g.cur || !g.ch || !g.pl) return;
    if (g.cur !== st.world || g.ch !== st.ch) enter(g);
    if (st.world !== g.cur) return;
    if (typeof g.shine !== 'number') g.shine = 0;
    g.shine *= Math.pow(0.5, dt / 25);
    if (g.shine < 1e-4) g.shine = 0;
    if (g.reverie) { st.has = false; return; }
    st.clock += dt;
    const p = g.pl, W = g.cur, now = st.clock;
    st.show = g.viewK > 0.6 ? 0 : 1 - g.viewK / 0.6;
    st.motes = st.show * clamp(1 - (g.freeK || 0) * 2, 0, 1);

    // strings: she takes what she passes through. Between two frames she may have gone a long way, so the whole step is looked at
    const jump = !st.has || Math.hypot(p.x - st.lx, p.y - st.ly, p.z - st.lz) > 14;
    const ax = jump ? p.x : st.lx, az = jump ? p.z : st.lz, ay = jump ? p.y : st.ly;
    st.lx = p.x; st.ly = p.y; st.lz = p.z; st.has = true;
    const ex = p.x - ax, ez = p.z - az, el2 = ex * ex + ez * ez, ylo = Math.min(ay, p.y) + 0.3, yhi = Math.max(ay, p.y) + 2.2;
    const R = REACH + Math.min(0.8, Math.hypot(p.vx, p.vz, p.alt > 0.06 ? p.valt : 0) * 0.045), seg = Math.sqrt(el2);
    for (let si = 0; si < strings.length; si++) {
      const s = strings[si];
      if (s.awake > 0) s.awake = Math.max(0, s.awake - dt / 3);
      if (s.got === s.n) { if (now >= s.back) { for (let i = 0; i < s.n; i++) { s.tk[i] = 0; s.bt[i] = now + i * 0.14; } s.got = 0; } continue; }
      if (s.got > 0 && now - s.last > PAUSE) { let k = 0; for (let i = 0; i < s.n; i++) if (s.tk[i]) { s.tk[i] = 0; s.bt[i] = now + (k++) * 0.18; } s.got = 0; }
      if (st.motes < 0.3) continue;
      const cdx = p.x - s.cx, cdy = p.y - s.cy, cdz = p.z - s.cz, lim = s.rad + seg + 6;
      if (cdx * cdx + cdy * cdy + cdz * cdz > lim * lim) continue;
      for (let i = 0; i < s.n; i++) {
        if (s.tk[i] || now - s.bt[i] < 0.6) continue;
        const y = s.y[i], dy = y < ylo ? ylo - y : y > yhi ? y - yhi : 0;
        if (dy >= R) continue;
        const mx = s.x[i] - ax, mz = s.z[i] - az, u = el2 > 1e-8 ? clamp((mx * ex + mz * ez) / el2, 0, 1) : 0, hx = mx - ex * u, hz = mz - ez * u;
        if (hx * hx + hz * hz + dy * dy < R * R) { take(g, s, i); if (s.got === s.n) break; }
      }
    }

    stepFlocks(g, dt);

    // water: a ring left behind her every half second of a slide
    const onWater = W.waterY !== null && p.alt <= 0.06 && g.floorAt(W, p) <= W.waterY + 0.001;
    if (g.sliding && onWater) {
      st.ringT -= dt;
      if (st.ringT <= 0) {
        st.ringT = 0.5;
        const r = rings[st.ri]; st.ri = (st.ri + 1) % rings.length;
        r.t0 = now; r.x = p.x; r.z = p.z; r.seed = st.ringN * 1.37;
        if (g.ch.id === 'pond' && st.ringN % 3 === 1) ring(g, 'glass', 0.01, [5, 7, 6, 8, 5, 9][((st.ringN - 1) / 3) % 6], 0.022); // the pond rings like glass, now and then
        st.ringN++;
      }
    } else st.ringT = Math.min(st.ringT, 0.12);

    // night: now and then a star falls where she is looking
    const dn = g.t < 0.25 ? 0.25 - g.t : g.t > 0.75 ? g.t - 0.75 : 0;
    if (dn > 0.055 && g.viewK < 0.3 && now - st.starT0 > st.starDur) {
      st.starWait -= dt;
      if (st.starWait <= 0) {
        const r = st.rnd;
        st.starWait = 40 + r() * 50; st.starT0 = now; st.starDur = 0.8 + r() * 0.5;
        st.starAz = (g.camYaw || 0) + (r() - 0.5) * 1.3; st.starEl = 0.52 + r() * 0.4;
        st.starDa = (r() < 0.5 ? -1 : 1) * (0.26 + r() * 0.2); st.starDe = -(0.13 + r() * 0.12);
      }
    }
  }

  // how much smaller a flat touch is drawn close to the eye (the renderer breaks near paint into small touches): the inverse, to hold a size
  const nearUp = (d) => 1 / (0.22 + 0.78 * sstep(1.5, 17, d));

  function drawStanding(S, k, x, y, z, hd, sc, t, i) {
    const fx = Math.sin(hd), fz = -Math.cos(hd), L = k.len * sc, pk = sstep(0.9, 0.97, Math.sin(t * (0.5 + 0.2 * hh(i, 3)) + i * 2.7)); // now and then it pecks
    if (k.water) { // afloat: low in the water, rocking a little
      const yy = y + 0.02 + 0.02 * Math.sin(t * 1.4 + i * 2.1);
      S.bill(x, yy + L * 0.17, z, -1.5708, L * 1.15, L * 0.5, k.body, 0, CELL.LEAF, 0.02, false, fx, 0.05, fz, 0);
      S.bill(x - fx * L * 0.12, yy + L * 0.3, z - fz * L * 0.12, -1.5708, L * 0.72, L * 0.3, k.top, 0, CELL.LEAF, 0.02, false, fx, 0.1, fz, 0);
      S.bill(x + fx * L * 0.5, yy + L * (0.52 - 0.34 * pk), z + fz * L * 0.5, 0, L * 0.34, L * 0.32, k.head, 0, CELL.DOT, 0.02, false, 0, 1, 0, 0);
    } else {
      const yy = y + k.leg * sc;
      S.bill(x, yy + L * 0.24, z, -1.5708, L, L * 0.5, k.body, 0, CELL.LEAF, 0.02, false, fx, 0.32 - 0.3 * pk, fz, 0);
      S.bill(x - fx * L * 0.16, yy + L * 0.3, z - fz * L * 0.16, -1.5708, L * 0.8, L * 0.3, k.top, 0, CELL.LEAF, 0.02, false, fx, 0.12, fz, 0);
      S.bill(x + fx * L * (0.4 + 0.12 * pk), yy + L * (0.6 - 0.52 * pk), z + fz * L * (0.4 + 0.12 * pk), 0, L * 0.32, L * 0.3, k.head, 0, CELL.DOT, 0.02, false, 0, 1, 0, 0);
    }
  }
  function drawFlying(S, k, x, y, z, hd, vy, sc, flap) {
    const fx = Math.sin(hd), fz = -Math.cos(hd), sx = Math.cos(hd), sz = Math.sin(hd), c = Math.cos(flap), s = Math.sin(flap), w = k.wing * sc, L = k.len * sc;
    S.bill(x, y, z, -1.5708, L, L * 0.38, k.body, 0, CELL.LEAF, 0.03, false, fx, clamp(vy * 0.12, -0.6, 0.6), fz, 0);
    for (let e = -1; e <= 1; e += 2) {
      const ax = sx * c * e - fx * 0.12, ay = s, az = sz * c * e - fz * 0.12;
      S.add(x + ax * w * 0.48, y + ay * w * 0.48, z + az * w * 0.48, ax, ay, az, 0, 1, 0, w, w * 0.4, k.top, 0, CELL.LEAF, 0.03, FLAG_AXIAL);
    }
  }

  function draw(S, g, env, t) {
    if (!g || !g.cur || !g.ch || g.cur !== st.world || g.reverie || !g.cam) return;
    const show = g.viewK > 0.6 ? 0 : 1 - g.viewK / 0.6;
    if (show <= 0) return;
    const now = st.clock, cp = g.cam.pos, cx = cp[0], cy = cp[1], cz = cp[2], W = g.cur;
    const mk = show * clamp(1 - (g.freeK || 0) * 2, 0, 1);

    // the motes: a small dab of gold each, breathing, a little larger far off so that the line can be read from a distance
    if (mk > 0.02) for (let si = 0; si < strings.length; si++) {
      const s = strings[si], dc = Math.hypot(s.cx - cx, s.cy - cy, s.cz - cz) - s.rad;
      if (dc > 230 || s.got === s.n) continue;
      const far = (dc > 170 ? 1 - (dc - 170) / 60 : 1) * mk * (1 + 0.3 * s.awake);
      for (let i = 0; i < s.n; i++) {
        if (s.tk[i]) continue;
        const born = now - s.bt[i];
        if (born <= 0) continue;
        const gk = born > 1.2 ? 1 : (born / 1.2) * (2 - born / 1.2);
        const x = s.x[i], z = s.z[i], y = s.y[i] + 0.13 * Math.sin(t * 0.9 + i * 1.3 + s.ph), d = Math.hypot(x - cx, y - cy, z - cz);
        const sz = (0.22 + d * 0.0034) * (0.84 + 0.16 * Math.sin(t * 1.9 + i * 0.83 + s.ph)) * gk * far;
        if (sz > 0.012) S.bill(x, y, z, 0, sz, sz * 0.96, GOLD, 0, CELL.DOT, 1.3, false, 0, 1, 0, 0);
      }
    }

    // what a mote leaves when it is taken: a few bright dabs flying apart. And at the end of a string, petals in the colours of this world
    const sw = g.ch._swatch;
    for (let bi = 0; bi < bursts.length && mk > 0.02; bi++) {
      const b = bursts[bi], age = now - b.t0, life = b.big ? 2.6 : 0.6;
      if (age < 0 || age >= life) continue;
      const a = age / life, drift = (1 - Math.exp(-age * 2.2)) / 2.2, ox = b.x + b.vx * drift, oy = b.y + b.vy * drift, oz = b.z + b.vz * drift;
      if (!b.big) {
        for (let j = 0; j < 6; j++) {
          const h1 = hh(j, b.seed), h2 = hh(j + 9, b.seed), th = h1 * TAU, cz2 = h2 * 2 - 1, sr = Math.sqrt(1 - cz2 * cz2), dx = Math.cos(th) * sr, dy = cz2 * 0.8 + 0.2, dz = Math.sin(th) * sr;
          const r = 0.2 + (1.1 + 0.9 * h2) * (1 - (1 - a) * (1 - a)), sz = 0.12 * (1 - a) * (0.6 + 0.8 * h1) * mk;
          S.bill(ox + dx * r, oy + dy * r, oz + dz * r, -1.5708, sz * 2.3, sz, SPARK, 0, j % 2 ? CELL.COMMA_S : CELL.DAB, 1.4, false, dx, dy, dz, 0);
        }
      } else {
        for (let j = 0; j < 26; j++) {
          const h1 = hh(j, b.seed), h2 = hh(j + 31, b.seed), h3 = hh(j + 57, b.seed), th = h1 * TAU, out = (1.6 + 3.4 * h2) * (1 - Math.exp(-age * 2.6)) / 2.6 * 2.2;
          const x = ox + Math.cos(th) * out + Math.sin(age * (1.3 + h3) + j) * 0.25, z = oz + Math.sin(th) * out + Math.cos(age * (1.1 + h2) + j * 2) * 0.25;
          const y = oy + (1.2 + 2.2 * h3) * (1 - Math.exp(-age * 2.4)) / 2.4 * 1.6 - 0.42 * age * age * (0.5 + h1);
          const sz = (0.1 + 0.1 * h3) * Math.sqrt(1 - a) * sstep(0, 0.08, a) * mk;
          let c = SPARK;
          if (sw && j % 3) { const q = sw[j % sw.length]; TMP[0] = q[0] * 0.6 + 0.4; TMP[1] = q[1] * 0.6 + 0.4; TMP[2] = q[2] * 0.6 + 0.4; c = TMP; }
          S.bill(x, y, z, age * (2 + 3 * h1) + j, sz * 1.9, sz, c, 0, CELL.LEAF, j % 3 ? 0.35 : 1.2, false, 0, 0, 0, 0);
        }
      }
    }

    // the birds: standing, or on the wing
    for (let fi = 0; fi < flocks.length; fi++) {
      const f = flocks[fi], k = f.kind, d = Math.hypot(f.cx - cx, f.cz - cz), dh = Math.hypot(f.hx - cx, f.hz - cz);
      if (Math.min(d, dh) > 190) continue;
      for (let i = 0; i < f.n; i++) {
        if (f.at[i]) drawStanding(S, k, f.hx + f.ox[i], f.qy[i], f.hz + f.oz[i], f.hd[i], show, t, i + fi * 7);
        else {
          const air = f.t - f.wait[i], quick = air < 1.3 || f.state === 2 ? 1 : 0;
          const sail = quick ? 0 : k.glide * sstep(-0.1, 0.5, Math.sin(now * 0.8 + i * 2.1 + f.ph));
          const flap = (0.12 + Math.sin(now * k.beat * (quick ? 1.5 : 1) * TAU + i * 1.7) * 0.78) * (1 - sail) + 0.16 * sail;
          drawFlying(S, k, f.px[i], f.py[i], f.pz[i], f.hd[i], f.vy[i], show, flap);
        }
      }
    }

    // rings on the water behind her: flat dabs set round, widening and thinning out over two seconds
    if (W.waterY !== null) for (let ri = 0; ri < rings.length; ri++) {
      const r = rings[ri], age = now - r.t0;
      if (age < 0 || age >= 2) continue;
      const a = age / 2, rad = 0.35 + 1.55 * age - 0.2 * age * age, k = (1 - a) * show, up = Math.min(2.2, nearUp(Math.hypot(r.x - cx, W.waterY - cy, r.z - cz)));
      const len = Math.min(0.85, (TAU * rad / 12) * 0.72) * up, wid = (0.025 + 0.075 * Math.pow(k, 0.7)) * up;
      for (let j = 0; j < 12; j++) {
        const th = (j / 12) * TAU + r.seed, c = Math.cos(th), s = Math.sin(th);
        S.add(r.x + c * rad, W.waterY + 0.07, r.z + s * rad, -s, 0, c, 0, 1, 0, len * (0.8 + 0.4 * hh(j, r.seed)), wid, RIPPLE, 0, j % 2 ? CELL.LONG_B : CELL.HEAVY, 0.1 * k, FLAG_FLAT);
      }
    }
  }

  function glows(R, g, env, t) {
    if (!g || !g.cur || !g.ch || g.cur !== st.world || g.reverie || !g.cam || !g.pl) return;
    const show = g.viewK > 0.6 ? 0 : 1 - g.viewK / 0.6;
    if (show <= 0) return;
    const now = st.clock, cp = g.cam.pos, cx = cp[0], cy = cp[1], cz = cp[2], W = g.cur, p = g.pl;
    const mk = show * clamp(1 - (g.freeK || 0) * 2, 0, 1), night = 1 - clamp(env.sunI * 1.4, 0, 1);

    // every mote has a small halo. By day it is hardly there, at night it carries
    if (mk > 0.02) for (let si = 0; si < strings.length; si++) {
      const s = strings[si], dc = Math.hypot(s.cx - cx, s.cy - cy, s.cz - cz) - s.rad;
      if (dc > 170 || s.got === s.n) continue;
      const far = (dc > 120 ? 1 - (dc - 120) / 50 : 1) * mk * (1 + 0.5 * s.awake) * (0.9 + 0.4 * night);
      for (let i = 0; i < s.n; i++) {
        if (s.tk[i]) continue;
        const born = now - s.bt[i];
        if (born <= 0) continue;
        const b = (born > 1.2 ? 1 : born / 1.2) * far * (0.8 + 0.2 * Math.sin(t * 1.9 + i * 0.83 + s.ph));
        const x = s.x[i], z = s.z[i], y = s.y[i] + 0.13 * Math.sin(t * 0.9 + i * 1.3 + s.ph), w = 1.0 + Math.hypot(x - cx, y - cy, z - cz) * 0.012;
        R.glow(x, y, z, 0, 0.7 * b, 0.5 * b, 0.16 * b, w, w);
      }
    }
    // the flash of a mote taken, and the larger one at the end of a string
    for (let bi = 0; bi < bursts.length && mk > 0.02; bi++) {
      const b = bursts[bi], age = now - b.t0, life = b.big ? 0.9 : 0.4;
      if (age < 0 || age >= life) continue;
      const a = age / life, k = (1 - a) * (1 - a) * mk * (b.big ? 0.8 : 0.5), w = (b.big ? 4.5 : 2.0) * (0.6 + a);
      R.glow(b.x + b.vx * age * 0.6, b.y + b.vy * age * 0.6, b.z + b.vz * age * 0.6, 0, 0.9 * k, 0.72 * k, 0.36 * k, w, w);
    }

    // fireflies, when it is dark and not winter: they keep to their own places and she walks among them
    const tk = g.t < 0.5 ? sstep(0.225, 0.2, g.t) : sstep(0.775, 0.8, g.t), dark = Math.min(clamp((0.15 - env.sunI) / 0.12, 0, 1), tk) * show * (env.snow > 0.5 ? 0 : 1);
    if (dark > 0.02) {
      const B = 60;
      for (let i = 0; i < FLIES; i++) {
        const h1 = hh(i, 1.3), h2 = hh(i, 2.9), h3 = hh(i, 4.1);
        let x = h1 * B + Math.sin(t * (0.11 + 0.1 * h2) + i) * 2.4, z = h3 * B + Math.cos(t * (0.09 + 0.1 * h1) + i * 2) * 2.4;
        x = p.x + ((((x - p.x) % B) + B) % B) - B / 2; z = p.z + ((((z - p.z) % B) + B) % B) - B / 2;
        const d = Math.hypot(x - p.x, z - p.z);
        if (d > 29.5) continue;
        const y = g.groundAt(W, x, z) + 0.45 + 1.5 * h2 + 0.3 * Math.sin(t * 0.7 + i * 1.9);
        const blink = sstep(0.05, 0.75, Math.sin(t * (0.9 + 0.8 * h3) + i * 2.4) * 0.5 + 0.5);
        const b = dark * blink * sstep(29.5, 24, d) * sstep(1.5, 4, Math.hypot(x - cx, y - cy, z - cz));
        if (b < 0.02) continue;
        R.glow(x, y, z, 0, 0.5 * b, 0.78 * b, 0.2 * b, 0.42, 0.42);
        R.glow(x, y, z, 0, 0.09 * b, 0.16 * b, 0.04 * b, 1.7, 1.7);
      }
    }

    // a falling star: a bright head and a tail that thins out behind it
    const sa = now - st.starT0;
    if (sa >= 0 && sa < st.starDur) {
      const u = sa / st.starDur, on = Math.pow(Math.sin(Math.PI * u), 0.6) * show;
      for (let j = 0; j < 9; j++) {
        const v = u - j * 0.028;
        if (v < 0) break;
        const az = st.starAz + st.starDa * v, el = st.starEl + st.starDe * v, ce = Math.cos(el), b = on * Math.pow(1 - j / 9, 1.6) * (j ? 0.5 : 0.95), w = j ? 6.5 - j * 0.45 : 9;
        R.glow(Math.sin(az) * ce * 860, Math.sin(el) * 860, -Math.cos(az) * ce * 860, 2, 0.92 * b, 0.95 * b, b, w, w);
      }
    }
  }

  return { enter, prepare, update, draw, glows, strings, flocks };
})();
