// ---------- sights of the fields of Giverny and of the water lily pond ----------
// What happens there at its own hour and season, seen from far off and answering when she comes near.
// fields  s_murmur   starlings over the stacks at dusk in autumn and winter, turning as one body, pouring into the poplars at last light
//         s_geese    a skein of geese in a V going south on autumn mornings, honking
//         s_shower   a summer shower crossing the far fields in the afternoon, at the end of summer
//         s_rainbow  the bow it leaves behind, opposite the low sun
// pond    s_moon     the moon rising over the garden, its road of light across the water (1907 and 1922, at night)
//         s_wisteria wisteria petals falling from the bridge into the pond on the afternoon breeze (from 1907)
//         s_carp     carp rising among the lilies in the morning, and frogs leaving the bank as she passes
// Everything is worked out from the hour, the season and the game clock, so a still shows it as it would be in play; only the
// sounds and the frogs keep a little state. Nothing is drawn from viewK 0.6 up, so no painting ever holds any of it.
SIGHTS.add((() => {
  const PI = Math.PI, TW = PI * 2;
  const fr = (v) => v - Math.floor(v);
  const hh = (i, k) => fr(Math.sin(i * 12.9898 + k * 78.233 + 0.37) * 43758.5453);
  const sm = (a, b, v) => { const x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const CAP = 450, GCAP = 60;
  // the stroke and light budget of this frame, and where the eye is
  const E = { S: null, n: 0, cap: CAP, R: null, gn: 0, gcap: GCAP, cx: 0, cy: 0, cz: 0, env: null, frac: 1, show: 0 };
  const st = { ch: null, W: null, id: '', clock: 0, lastT: -1, roost: [-46, 16, -116], bridge: null, wet: null, nWet: 0, frogs: [],
    snd: { murmur: 0, roost: 0, geese: 0, rain: 0, thunderDay: -1, bowDay: -1, bridge: 0, croak: 0, plop: 0, part: 0, frog: 0, carpSlot: -1 }, day: 0, prevT: 0 };
  for (let i = 0; i < 4; i++) st.frogs.push({ t0: -99, x: 0, z: 0, x1: 0, z1: 0, y0: 0 });
  const C = [0, 0, 0], C2 = [0, 0, 0], O = new Float64Array(9), Q9 = new Float64Array(9);

  // ----- the air between the eye and a thing: the same fog the shader lays over the world (a dome stroke is not fogged by it) -----
  function air(out, c, x, y, z) {
    const e = E.env, dx = x - E.cx, dy = y - E.cy, dz = z - E.cz, d = Math.hypot(dx, dy, dz) || 1;
    const h = Math.max((y + E.cy) * 0.5 - (e.mistBase || 0), 0), dens = (e.fogD || 0.0015) * (1 + (e.mist || 0) * Math.exp(-h * 0.11)), f = 1 - Math.exp(-Math.pow(d * dens, 1.25));
    const sd = e.sunDir, b = Math.max(0, (dx * sd[0] + dy * sd[1] + dz * sd[2]) / d), gl = Math.pow(b, 5) * (e.scatter || 0);
    for (let k = 0; k < 3; k++) out[k] = c[k] + (e.fog[k] + e.glow[k] * gl - c[k]) * f;
    return d;
  }
  // a touch whose colour is exactly as given (a dome stroke placed at its true distance): x, y, z in the world
  function dab(x, y, z, roll, len, wid, c, cell, px, py, pz) {
    if (E.n >= E.cap) return false;
    E.S.bill(x - E.cx, y - E.cy, z - E.cz, roll, len, wid, c, 0, cell, 0.2, true, px, py, pz, 0); E.n++;
    return true;
  }
  function rod(x, y, z, dx, dy, dz, len, wid, c, cell) {
    if (E.n >= E.cap) return false;
    E.S.add(x - E.cx, y - E.cy, z - E.cz, dx, dy, dz, 0, 1, 0, len, wid, c, 0, cell, 0.2, FLAG_DOME | FLAG_AXIAL); E.n++;
    return true;
  }
  // a touch of the sky itself, painted by the shader from its own colour and only tinted (tint 1 leaves the sky as it is)
  function skyTouch(dx, dy, dz, tx, ty, tz, len, wid, tr, tg, tb) {
    if (E.n >= E.cap) return;
    C2[0] = (tr - 1) / 0.3 + 0.5; C2[1] = (tg - 1) / 0.3 + 0.5; C2[2] = (tb - 1) / 0.3 + 0.5;
    E.S.add(dx * 800, dy * 800, dz * 800, tx, ty, tz, -dx, -dy, -dz, len, wid, C2, 0, CELL.LONG_A, 0, FLAG_DOME); E.n++;
  }
  // the same at a place in the world (the stroke still lies at its true distance, so the land before it covers it)
  function skyAt(x, y, z, tx, ty, tz, len, wid, tr, tg, tb, cell) {
    if (E.n >= E.cap) return;
    C2[0] = (tr - 1) / 0.3 + 0.5; C2[1] = (tg - 1) / 0.3 + 0.5; C2[2] = (tb - 1) / 0.3 + 0.5;
    const rx = x - E.cx, ry = y - E.cy, rz = z - E.cz;
    E.S.add(rx, ry, rz, tx, ty, tz, -rx, -ry, -rz, len, wid, C2, 0, cell, 0, FLAG_DOME); E.n++;
  }
  function glow(x, y, z, kind, r, g, b, w, h) { if (E.gn >= E.gcap) return; E.R.glow(x, y, z, kind, r, g, b, w, h); E.gn++; }
  const camD = (x, y, z) => Math.hypot(x - E.cx, y - E.cy, z - E.cz);
  // is a point in front of the eye (with some room at the sides)
  function ahead(g, x, y, z, room) {
    const f = g.cam && g.cam.fwd; if (!f) return true;
    const dx = x - E.cx, dy = y - E.cy, dz = z - E.cz;
    return dx * f[0] + dy * f[1] + dz * f[2] > -room;
  }

  // ----- the hour, the season -----
  const phaseIs = (g, list) => list.indexOf(g.phase | 0) >= 0;
  const hourK = (t, a, b, c, d) => sm(a, b, t) * (1 - sm(c, d, t));
  const showOf = (g) => (g.reverie ? 0 : g.viewK > 0.6 ? 0 : 1 - (g.viewK || 0) / 0.6);

  // ===================== the fields =====================
  // ----- starlings at dusk: several hundred touches that fly as one body -----
  // A leader path wanders over the stubble. Every bird keeps a place in a body that is laid out along that path, behind it in time
  // (its lag) and to its side and above it (its offset). When the path turns, those behind are still flying the old way: the body
  // bends, folds and streams like smoke. The body breathes between a ball and a long ribbon, swells in waves that run through it,
  // and banks into its turns, so that seen edge on it goes thin and pale and seen flat it goes dark.
  const MN = 400;
  const MB = { lag: new Float32Array(MN), su: new Float32Array(MN), sv: new Float32Array(MN), sf: new Float32Array(MN), ph: new Float32Array(MN), arr: new Float32Array(MN), pr: new Float32Array(MN), sz: new Float32Array(MN) };
  for (let i = 0; i < MN; i++) {
    const a = hh(i, 1.1) * TW, r = Math.pow(hh(i, 2.3), 1.0);
    const u = hh(i, 3.7) * 2 - 1;
    MB.lag[i] = 0.5 + 0.5 * Math.sign(u) * Math.pow(Math.abs(u), 1.5); MB.su[i] = Math.cos(a) * r; MB.sv[i] = Math.sin(a) * r * 0.32; MB.sf[i] = hh(i, 4.9) - 0.5; MB.ph[i] = hh(i, 5.3) * TW;
    MB.arr[i] = hh(i % 11, 6.1) * 0.7 + hh(i, 6.7) * 0.3; MB.pr[i] = hh(i, 7.9); MB.sz[i] = 0.8 + 0.4 * hh(i, 8.3);
  }
  const MC = { x: -50, z: -26, H: 40, y0: 0 }; // where they wander, and how high above the ground
  const PX = [[44, 0.23, 0.4], [17, 0.51, 2.1], [5, 1.07, 0.3]], PY = [[9, 0.31, 1.3], [4, 0.77, 0], [2, 1.3, 2]], PZ = [[30, 0.19, 2.7], [15, 0.43, 0.9], [5, 0.97, 1.9]];
  function axis(A, tau, o, k) {
    let p = 0, v = 0, a = 0;
    for (let j = 0; j < 3; j++) { const q = A[j], w = q[1], s = Math.sin(w * tau + q[2]), c = Math.cos(w * tau + q[2]); p += q[0] * s; v += q[0] * w * c; a -= q[0] * w * w * s; }
    o[k] = p; o[k + 3] = v; o[k + 6] = a;
  }
  // late in the dusk the body drifts over the roost and circles above it (M.b), before it pours down
  function lead(tau) {
    axis(PX, tau, O, 0); axis(PY, tau, O, 1); axis(PZ, tau, O, 2); O[0] += MC.x; O[1] += MC.y0 + MC.H; O[2] += MC.z;
    const b = M.b;
    if (b > 0) {
      const r = st.roost, w = 0.5, R = 24, c = Math.cos(w * tau), s = Math.sin(w * tau), cy = Math.sin(0.4 * tau);
      const q = Q9; q[0] = r[0] + R * c; q[1] = r[1] + 30 + 3 * cy; q[2] = r[2] + R * s; q[3] = -R * w * s; q[4] = 1.2 * Math.cos(0.4 * tau); q[5] = R * w * c; q[6] = -R * w * w * c; q[7] = -0.48 * cy; q[8] = -R * w * w * s;
      for (let k = 0; k < 9; k++) O[k] += (q[k] - O[k]) * b;
    }
  }
  const M = { k: 0, b: 0, Lsp: 1, m: 0, cx: 0, cy: 0, cz: 0, W: 10 };
  // the state of the whole body at this moment (the clock t, the hour ht)
  function murmurFrame(g, t, ht) {
    M.k = phaseIs(g, [1, 2, 3]) ? hourK(ht, 0.685, 0.7, 0.795, 0.805) : 0;
    M.b = sm(0.752, 0.766, ht);
    M.m = 0.5 + 0.5 * Math.sin(0.083 * t + 0.6);
    M.Lsp = 0.7 + 2.6 * M.m;
    lead(t - 0.5 * M.Lsp); M.cx = O[0]; M.cy = O[1]; M.cz = O[2];
    M.W = 32 - 16 * M.m;
    return M.k;
  }
  const BP = [0, 0, 0, 0, 0, 0, 0]; // x, y, z, size, width (edge on or flat), heading x, heading z (of the bird, along its path)
  // where bird i is: returns 0 when it is not there
  function bird(g, i, t, ht, near) {
    const arrive = 0.685 + 0.02 * MB.arr[i], pour0 = 0.767 + 0.017 * MB.lag[i] + 0.004 * MB.pr[i];
    if (ht < arrive || ht > pour0 + 0.011) return 0;
    const lag = MB.lag[i] * M.Lsp, tau = t - lag;
    lead(tau);
    let vx = O[3], vy = O[4], vz = O[5];
    const vl = Math.hypot(vx, vy, vz) || 1; vx /= vl; vy /= vl; vz /= vl;
    // side (level) and up of the path, and the bank of a turn
    let sx = -vz, sz = vx; const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
    const ux = -sz * vy, uy = sz * vx - sx * vz, uz = sx * vy; // up = side x forward
    const lat = (O[6] * sx + O[8] * sz) / 9.8, bank = Math.atan(lat * (1.1 + near));
    const cb = Math.cos(bank), sb = Math.sin(bank);
    const Sx = sx * cb + ux * sb, Sy = uy * sb, Sz = sz * cb + uz * sb, Ux = ux * cb - sx * sb, Uy = uy * cb, Uz = uz * cb - sz * sb;
    // the body: narrow at its head and its tail, breathing in waves that run back through it
    const taper = Math.sqrt(Math.sin(PI * (0.05 + 0.9 * MB.lag[i]))), W = (32 - 16 * (0.5 + 0.5 * Math.sin(0.083 * tau + 0.6))) * (1 - 0.35 * M.b) * (1 + 0.2 * Math.sin(0.55 * tau - MB.lag[i] * 3)) * taper;
    const wob = 0.9, ph = MB.ph[i];
    let x = O[0] + Sx * MB.su[i] * W + Ux * MB.sv[i] * W + vx * MB.sf[i] * 4 + Math.sin(t * 1.3 + ph) * wob;
    let y = O[1] + Sy * MB.su[i] * W + Uy * MB.sv[i] * W + vy * MB.sf[i] * 4 + Math.sin(t * 1.7 + ph * 2) * wob * 0.6;
    let z = O[2] + Sz * MB.su[i] * W + Uz * MB.sv[i] * W + vz * MB.sf[i] * 4 + Math.cos(t * 1.1 + ph) * wob;
    let size = 1, hx = vx, hz = vz;
    // they come in by parties from all round, at the start of dusk
    const ka = sm(arrive, arrive + 0.022, ht);
    if (ka < 1) {
      const pa = ((i % 9) / 9) * TW + 0.3, e = 1 - ka, R = 260 * e * e * (3 - 2 * e);
      x += Math.cos(pa) * R; z += Math.sin(pa) * R; y += 20 * e * hh(i % 9, 9.1);
      hx = -Math.cos(pa); hz = -Math.sin(pa);
    }
    // and at last light they pour down into the poplars, the head first and the tail after, in a turning funnel
    const kp = clamp((ht - pour0) / 0.01, 0, 1);
    if (kp > 0) {
      const e = kp * kp * (3 - 2 * kp), r = st.roost, rx = r[0] + (MB.su[i]) * 4, ry = r[1] + MB.sv[i] * 4, rz = r[2] + MB.sf[i] * 6;
      const cx = rx + (x - rx) * 0.15, cy = ry + 8, cz = rz + (z - rz) * 0.15, a = 1 - e;
      let px = a * a * x + 2 * a * e * cx + e * e * rx, py = a * a * y + 2 * a * e * cy + e * e * ry, pz = a * a * z + 2 * a * e * cz + e * e * rz;
      const sw = e * 3.2, ca = Math.cos(sw), sa = Math.sin(sw), ox = px - rx, oz = pz - rz;
      hx = px; hz = pz;
      px = rx + ox * ca - oz * sa; pz = rz + ox * sa + oz * ca;
      hx = px - hx + vx * 0.2; hz = pz - hz + vz * 0.2;
      x = px; y = py; z = pz; size = 1 - sm(0.82, 1, kp);
    }
    // she flies in among them: they part round her as round a falcon
    const p = g.pl;
    if (p) {
      const dx = x - p.x, dy = y - (p.y + 1), dz = z - p.z, d2 = dx * dx + dy * dy + dz * dz, RP = 15;
      if (d2 < RP * RP) { const d = Math.sqrt(d2) || 1, k = (RP - d) * 1.2 / d; x += dx * k; y += dy * k; z += dz * k; }
    }
    BP[0] = x; BP[1] = y; BP[2] = z; BP[3] = size;
    // seen flat the sheet is dark, seen on edge it thins out
    const vdx = x - E.cx, vdy = y - E.cy, vdz = z - E.cz, vd = Math.hypot(vdx, vdy, vdz) || 1;
    BP[4] = 0.2 + 0.8 * Math.abs((Ux * vdx + Uy * vdy + Uz * vdz) / vd);
    BP[5] = hx; BP[6] = hz;
    return 1;
  }
  const STAR = [0.13, 0.12, 0.16], STAR2 = [0.2, 0.18, 0.22];
  function drawMurmur(g, t, ht) {
    if (murmurFrame(g, t, ht) < 0.005) return;
    if (camD(M.cx, M.cy, M.cz) > 900) return;
    const n = Math.round(MN * E.frac), p = g.pl, nearK = p ? sm(90, 25, Math.hypot(p.x - M.cx, p.y - M.cy, p.z - M.cz)) : 0;
    for (let i = 0; i < n && E.n < E.cap; i++) {
      if (!bird(g, i, t, ht, nearK)) continue;
      const x = BP[0], y = BP[1], z = BP[2];
      if (!ahead(g, x, y, z, 30)) continue;
      const d = air(C, i % 5 ? STAR : STAR2, x, y, z), flap = 0.78 + 0.22 * Math.abs(Math.sin(t * 13 + MB.ph[i] * 3));
      if (d < 30) {
        // close by: a small dark bird, its body and two beating wings
        const L = 0.24 * MB.sz[i] * BP[3], hx = BP[5], hz = BP[6], hl = Math.hypot(hx, hz) || 1, fx = hx / hl, fz = hz / hl, w = Math.sin(t * 14 + MB.ph[i] * 5) * 0.8;
        dab(x, y, z, -1.5708, L, L * 0.42, C, CELL.LEAF, fx, 0, fz);
        for (let e = -1; e <= 1; e += 2) { const ax = -fz * e * Math.cos(w), ay = Math.sin(w), az = fx * e * Math.cos(w); rod(x + ax * L * 0.8, y + ay * L * 0.8, z + az * L * 0.8, ax, ay, az, L * 1.5, L * 0.5, C, CELL.LEAF); }
        continue;
      }
      const L = clamp(d * 0.016, 0.5, 6) * MB.sz[i] * BP[3] * flap;
      if (L < 0.02) continue;
      dab(x, y, z, 0, L, L * (0.24 + 0.34 * BP[4]), C, i & 1 ? CELL.DAB : CELL.COMMA_S, BP[5], 0, BP[6]);
    }
  }

  // ----- geese going south on an autumn morning -----
  const GN = 15, G = { k: 0, x: 0, y: 0, z: 0, dx: 0, dz: 0, on: 0, lift: 0 };
  const GPER = 90, GSP = 13;
  function geeseFrame(g, t, ht) {
    G.k = phaseIs(g, [1, 3]) ? hourK(ht, 0.262, 0.28, 0.39, 0.41) : 0;
    const c = Math.floor(t / GPER), tc = t - c * GPER, az = (196 + 34 * (hh(c, 1.7) - 0.5)) * DEG, dx = Math.sin(az), dz = -Math.cos(az), off = (hh(c, 2.9) - 0.5) * 170;
    const ch = st.ch, cx = ch.center[0] + Math.cos(az) * off, cz = ch.center[1] + Math.sin(az) * off, s = -430 + GSP * tc;
    G.dx = dx; G.dz = dz; G.x = cx + dx * s; G.z = cz + dz * s;
    G.on = sm(-430, -330, s) * (1 - sm(330, 430, s));
    const gy = st.W ? Math.max(st.W.h(clamp(G.x, -790, 790), clamp(G.z, -790, 790)), st.W.waterY === null ? -1e9 : st.W.waterY) : 0;
    const p = g.pl, dp = p ? Math.hypot(p.x - G.x, p.y - (gy + 50), p.z - G.z) : 1e9;
    G.lift = 16 * sm(75, 20, dp); // she comes up to them: they climb away and the V opens
    G.y = Math.max(gy, 0) + 46 + 12 * hh(c, 3.3) + G.lift;
    return G.k * G.on;
  }
  const GOOSE = [0.42, 0.39, 0.38], GWING = [0.34, 0.32, 0.33], GHEAD = [0.15, 0.14, 0.16];
  function drawGeese(g, t, ht) {
    if (geeseFrame(g, t, ht) < 0.01) return;
    const rx = -G.dz, rz = G.dx, open = 1 + G.lift * 0.025;
    for (let j = 0; j < GN && E.n < E.cap; j++) {
      const arm = j === 0 ? 0 : j <= 6 ? 1 : -1, k = j === 0 ? 0 : j <= 6 ? j : j - 6;
      const back = k * 4.8 + Math.sin(t * 0.7 + j) * 0.5, side = k * 3.6 * arm * open + Math.sin(t * 0.9 + j * 2) * 0.4;
      const x = G.x - G.dx * back + rx * side, z = G.z - G.dz * back + rz * side, y = G.y - k * 0.25 + Math.sin(t * 0.8 + j * 1.3) * 0.35;
      if (!ahead(g, x, y, z, 40)) continue;
      const d = air(C, GOOSE, x, y, z), L = Math.max(0.85, d * 0.012), flap = Math.sin(t * 5.2 + j * 0.7);
      dab(x, y, z, -1.5708, L * 1.15, L * 0.36, C, CELL.LEAF, G.dx, 0, G.dz);
      air(C, GHEAD, x, y, z);
      dab(x + G.dx * L * 0.85, y + 0.05 * L, z + G.dz * L * 0.85, -1.5708, L * 0.62, L * 0.13, C, CELL.LONG_B, G.dx, 0, G.dz);
      air(C, GWING, x, y, z);
      if (d < 70) {
        for (let e = -1; e <= 1; e += 2) { const ax = rx * e * Math.cos(flap * 0.7), ay = Math.sin(flap * 0.7) * 0.9, az = rz * e * Math.cos(flap * 0.7); rod(x + ax * L * 0.9, y + ay * L * 0.9, z + az * L * 0.9, ax, ay, az, L * 1.9, L * 0.42, C, CELL.LEAF); }
      } else dab(x, y + flap * L * 0.15, z, 0, L * (2.6 + 0.9 * flap), L * 0.28, C, CELL.LONG_B, G.dx, 0, G.dz);
    }
  }

  // ----- a summer shower crossing the far fields, and the bow after it -----
  const SH = { k: 0, x: 0, z: 0, gy: 0, R: 95, base: 115, w: 0, under: 0 };
  function showerFrame(g, ht) {
    SH.k = phaseIs(g, [0]) ? 1 : 0;
    const w = (ht - 0.505) / 0.15; SH.w = w;
    if (w < 0 || w > 1) SH.k = 0;
    const ch = st.ch, wl = Math.hypot(ch.wind[0], ch.wind[1]) || 1, wx = ch.wind[0] / wl, wz = ch.wind[1] / wl, s = -440 + 880 * w;
    SH.x = ch.center[0] + wx * s - wz * 50; SH.z = ch.center[1] + wz * s + wx * 50;
    SH.k *= sm(0, 0.12, w) * (1 - sm(0.88, 1, w));
    SH.gy = st.W ? Math.max(0, st.W.h(clamp(SH.x, -790, 790), clamp(SH.z, -790, 790))) : 0;
    const p = g.pl; SH.under = p ? sm(SH.R, SH.R * 0.7, Math.hypot(p.x - SH.x, p.z - SH.z)) * SH.k : 0;
    return SH.k;
  }
  const DROP = [0.78, 0.82, 0.9];
  function drawShower(g, t, ht) {
    if (showerFrame(g, ht) < 0.01) return;
    const ch = st.ch, wl = Math.hypot(ch.wind[0], ch.wind[1]) || 1, wx = ch.wind[0] / wl, wz = ch.wind[1] / wl, k = SH.k;
    if (camD(SH.x, SH.gy + 80, SH.z) < 1100) {
      // the curtain: streaks of the sky's own grey, darkened, slanting with the wind and hanging from the cloud to the ground.
      // They are painted by the shader in the colour of the sky behind them, so the far land shows through as through rain
      const nr = Math.round(170 * E.frac);
      for (let i = 0; i < nr && E.n < E.cap; i++) {
        const a = hh(i, 11.1) * TW, r = Math.sqrt(hh(i, 12.3)) * SH.R, x = SH.x + Math.cos(a) * r * 1.15, z = SH.z + Math.sin(a) * r * 0.75;
        const top = SH.gy + SH.base - 40 * hh(i, 13.7) * hh(i, 13.9), L = (SH.base * (0.3 + 0.7 * hh(i, 14.1)) + 6 * Math.sin(t * 0.7 + i)) * k, y = top - L * 0.5;
        if (!ahead(g, x, y, z, SH.R) || camD(x, y, z) < 60) continue;
        const dk = 0.84 + 0.08 * hh(i, 15.3) + 0.08 * (r / SH.R);
        skyAt(x, y, z, wx * 0.45, -1, wz * 0.45, L, (1.4 + 1.8 * hh(i, 16.9)) * (0.5 + 0.5 * k), dk, dk * 1.01, dk * 1.05, i % 3 ? CELL.LONG_A : i & 1 ? CELL.DRY : CELL.LONG_B);
      }
      // its cloud: a heavy grey belly, darker underneath and lit at the top
      const nc = Math.round(54 * E.frac);
      for (let i = 0; i < nc && E.n < E.cap; i++) {
        const a = hh(i, 17.7) * TW, r = Math.sqrt(hh(i, 18.1)) * SH.R * 1.3, x = SH.x + Math.cos(a) * r * 1.15, z = SH.z + Math.sin(a) * r * 0.8, u = hh(i, 19.3);
        const y = SH.gy + SH.base + 4 + 44 * u * (1 - 0.5 * r / (SH.R * 1.3)) + Math.sin(t * 0.2 + i) * 2;
        if (!ahead(g, x, y, z, 150)) continue;
        const v = u * u; C[0] = 0.56 + 0.36 * v; C[1] = 0.57 + 0.34 * v; C[2] = 0.66 + 0.28 * v;
        air(C, C, x, y, z);
        const sz = (20 + 18 * hh(i, 21.3)) * k;
        dab(x, y, z, (hh(i, 20.1) - 0.5) * 0.8, sz, sz * 0.66, C, i % 3 ? CELL.DAB : CELL.COMMA, 0, 0, 0);
      }
    }
    // she is under it: drops all round her
    if (SH.under > 0.05) {
      const nd = Math.round(40 * E.frac * SH.under);
      for (let i = 0; i < nd && E.n < E.cap; i++) {
        const a = hh(i, 23.1) * TW, r = 2.5 + 12 * hh(i, 24.3), x = E.cx + Math.cos(a) * r, z = E.cz + Math.sin(a) * r, fall = (t * 9 + hh(i, 25.7) * 14) % 14;
        rod(x - wx * fall * 0.2, E.cy + 7 - fall, z - wz * fall * 0.2, wx * 0.2, -1, wz * 0.2, 1.4, 0.045, DROP, CELL.LONG_B);
      }
    }
  }
  const BOW = { k: 0, ax: 0, ay: 0, az: 0 };
  function bowFrame(g, ht) {
    const e = E.env;
    BOW.k = phaseIs(g, [0]) ? hourK(ht, 0.592, 0.615, 0.675, 0.7) : 0;
    if (!e || e.sunI < 0.25 || e.sunEl > 40) BOW.k = 0;
    BOW.ax = -e.sunDir[0]; BOW.ay = -e.sunDir[1]; BOW.az = -e.sunDir[2];
    return BOW.k;
  }
  // bands from the inside out: violet blue, green, yellow, red. tint over the sky's own colour
  const BANDS = [[40.4, 0.92, 0.9, 1.32], [41.2, 0.95, 1.16, 1.0], [41.8, 1.18, 1.14, 0.86], [42.4, 1.34, 0.94, 0.86]];
  function drawBow(g) {
    if (bowFrame(g, g.t) < 0.01) return;
    const k = BOW.k, ax = BOW.ax, ay = BOW.ay, az = BOW.az;
    // two directions square to the antisolar point, one of them as near to the up of the sky as may be
    let ux = -ax * ay, uy = 1 - ay * ay, uz = -az * ay; const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
    const vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;
    const p = g.pl, hi = p ? sm(4, 20, p.alt || 0) : 0;
    const N = Math.round(30 * Math.max(0.6, E.frac));
    for (let b = 0; b < BANDS.length + 2; b++) {
      const sec = b >= BANDS.length, B = sec ? BANDS[3 - (b - BANDS.length) * 3] : BANDS[b], rad = (sec ? 50.6 + (b - BANDS.length) * 1.4 : B[0]) * DEG;
      const kk = k * (sec ? 0.3 + 0.5 * hi : 1), cr = Math.cos(rad), sr = Math.sin(rad);
      for (let j = 0; j < N && E.n < E.cap; j++) {
        const ph = (j / N) * TW, cp = Math.cos(ph), sp = Math.sin(ph);
        const dx = ax * cr + (ux * cp + vx * sp) * sr, dy = ay * cr + (uy * cp + vy * sp) * sr, dz = az * cr + (uz * cp + vz * sp) * sr;
        if (dy < -0.01) continue;
        const foot = sm(-0.01, 0.12, dy) * (0.65 + 0.35 * sm(0.1, 0.5, cp)); // fainter towards its feet
        const q = kk * foot;
        skyTouch(dx, dy, dz, -ux * sp + vx * cp, -uy * sp + vy * cp, -uz * sp + vz * cp, 800 * sr * TW / N * 1.35, 800 * 0.9 * DEG * (sec ? 1.4 : 1),
          1 + (B[1] - 1) * q, 1 + (B[2] - 1) * q, 1 + (B[3] - 1) * q);
      }
    }
  }

  // ===================== the pond =====================
  // ----- the moon and its road of light on the water -----
  const MOON = { k: 0, dx: 0, dy: 0, dz: 0, el: 0 };
  function moonFrame(g, ht) {
    const e = E.env;
    let tt = ht > 0.5 ? ht - 0.765 : ht + 0.235; // the clock since the moon rose, in days
    MOON.k = phaseIs(g, [1, 3]) && tt > 0 && tt < 0.4 ? clamp((0.3 - (e ? e.sunI : 0)) / 0.25, 0, 1) * sm(0, 0.02, tt) * (1 - sm(0.36, 0.4, tt)) : 0;
    const el = Math.min(34, 1.5 + tt * 150), az = 98 + tt * 140;
    const a = az * DEG, c = Math.cos(el * DEG);
    MOON.dx = Math.sin(a) * c; MOON.dy = Math.sin(el * DEG); MOON.dz = -Math.cos(a) * c; MOON.el = el;
    return MOON.k;
  }
  const MOONC = [1.0, 0.97, 0.86], MARE = [0.88, 0.86, 0.8], GLINT = [0.96, 0.94, 0.82];
  function drawMoon(g, t) {
    if (moonFrame(g, g.t) < 0.01) return;
    const k = MOON.k, D = 840, mx = MOON.dx, my = MOON.dy, mz = MOON.dz;
    let rx = -mz, rz = mx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    const upx = -rx * my, upy = rx * mz - rz * mx, upz = rz * my; // a way up across the face of the moon
    if (E.n < E.cap) { E.S.bill(mx * D, my * D, mz * D, 0, 44 * k, 44 * k, MOONC, 0, CELL.DOT, 0.6, true, 0, 0, 0, 0); E.n++; }
    for (let i = 0; i < 3 && E.n < E.cap; i++) {
      const ox = (hh(i, 31.1) - 0.5) * 17, oy = (hh(i, 32.3) - 0.3) * 14;
      E.S.bill(mx * (D - 2) + rx * ox + upx * oy, my * (D - 2) + upy * oy, mz * (D - 2) + rz * ox + upz * oy, hh(i, 33.7) * 3, 13 * k, 9 * k, MARE, 0, CELL.DAB, 0.45, true, 0, 0, 0, 0); E.n++;
    }
    // the road: glints on the water under the moon, from the mirror point to the far bank, wider as they go
    const W = st.W; if (!W || W.waterY === null) return;
    const wy = W.waterY, hgt = Math.max(0.3, E.cy - wy), tanE = Math.max(0.03, Math.tan(MOON.el * DEG)), s0 = hgt / tanE;
    let hx = mx, hz = mz; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
    const p = g.pl, NG = Math.round(120 * E.frac);
    for (let i = 0; i < NG && E.n < E.cap; i++) {
      const u = hh(i, 34.1), s = Math.max(1.5, s0 * 0.45) + Math.pow(u, 1.4) * 150, lat = (hh(i, 35.3) - 0.5) * (0.5 + s * 0.06) * 2;
      const x = E.cx + hx * s + rx * lat, z = E.cz + hz * s + rz * lat;
      if (W.h(x, z) > wy - 0.08 || (W.deck && W.deck(x, z) !== null)) continue;
      const tw = 0.35 + 0.65 * Math.max(0, Math.sin(t * (2 + 3 * hh(i, 36.7)) + i * 1.9)), q = k * tw * (0.5 + 0.5 * sm(s0 * 3, s0 * 0.8, s));
      const dp = p ? Math.hypot(p.x - x, p.z - z) : 99, near = sm(5, 1, dp); // where she passes the glints dance and flare
      const L = (0.45 + s * 0.04) * (0.5 + 0.7 * q) * (1 + near), y = wy + 0.25 + near * 0.15 * Math.sin(t * 6 + i);
      if (L < 0.05 || q < 0.05) continue;
      C[0] = GLINT[0] * (0.7 + 0.3 * q); C[1] = GLINT[1] * (0.7 + 0.3 * q); C[2] = GLINT[2] * (0.7 + 0.3 * q);
      E.S.bill(x - E.cx, y - E.cy, z - E.cz, -1.5708, L, L * 0.22, C, 0, CELL.LONG_B, 0.3 + 0.6 * q, true, rx, 0, rz, 0); E.n++;
    }
  }
  function glowMoon(g, t) {
    if (MOON.k < 0.01) return;
    const k = MOON.k, D = 860;
    glow(MOON.dx * D, MOON.dy * D, MOON.dz * D, 2, 0.6 * k, 0.58 * k, 0.5 * k, 60, 60);
    glow(MOON.dx * D, MOON.dy * D, MOON.dz * D, 2, 0.22 * k, 0.22 * k, 0.26 * k, 220, 220);
    const W = st.W; if (!W || W.waterY === null) return;
    const wy = W.waterY, s0 = Math.max(0.3, E.cy - wy) / Math.max(0.03, Math.tan(MOON.el * DEG)), hl = Math.hypot(MOON.dx, MOON.dz) || 1;
    for (let i = 0; i < 6; i++) {
      const s = s0 * (0.8 + i * 0.9) + 2, x = E.cx + MOON.dx / hl * s, z = E.cz + MOON.dz / hl * s;
      if (W.h(x, z) > wy - 0.08) continue;
      const q = k * (0.6 + 0.4 * Math.sin(t * 2.3 + i * 1.7)) / (1 + i * 0.4);
      glow(x, wy + 0.1, z, 0, 0.3 * q, 0.29 * q, 0.22 * q, 1.2 + s * 0.04, 0.5 + s * 0.012);
    }
  }

  // ----- wisteria petals falling from the bridge -----
  const WIS = { k: 0, gust: 0 };
  function wisFrame(g, ht) {
    const ph = g.phaseNow ? g.phaseNow() : null, fl = ph ? ph.flower : 1;
    WIS.k = st.bridge && phaseIs(g, [1, 2, 3, 4]) ? hourK(ht, 0.4, 0.43, 0.64, 0.67) * clamp(fl, 0, 1) : 0;
    const b = st.bridge, p = g.pl;
    WIS.gust = b && p ? sm(9, 2, Math.hypot(Math.max(0, Math.abs(p.x - b.x) - b.hw), Math.max(0, Math.abs(p.z - (b.z0 + b.z1) / 2) - (b.z1 - b.z0) / 2))) : 0;
    return WIS.k;
  }
  const PETAL = [[0.7, 0.6, 0.88], [0.82, 0.74, 0.94], [0.92, 0.88, 0.97], [0.64, 0.54, 0.84]];
  function drawWisteria(g, t) {
    if (wisFrame(g, g.t) < 0.01) return;
    const b = st.bridge, W = st.W;
    if (camD(b.x, b.top, (b.z0 + b.z1) / 2) > 260) return;
    const ch = st.ch, wx = ch.wind[0], wz = ch.wind[1], k = WIS.k, gust = WIS.gust, n = Math.round(110 * E.frac);
    for (let i = 0; i < n && E.n < E.cap; i++) {
      if (hh(i, 41.1) > 0.5 + 0.5 * gust && i > 30) continue; // more of them come down when she shakes the bridge
      const T = 7 + 4 * hh(i, 42.3), sp = 1 + gust * 0.8, age = fr((t * sp) / T + hh(i, 43.7)) * T;
      const z0 = b.z0 + 1 + (b.z1 - b.z0 - 2) * hh(i, 44.1), x0 = b.x + (hh(i, 45.3) < 0.5 ? -1 : 1) * b.hw * (0.9 + 0.3 * hh(i, 46.7)), y0 = b.deckY(z0) + 2.7 - 0.8 * hh(i, 47.1);
      const fall = Math.min(age, 7.5), drift = 0.6 + 0.6 * gust;
      let x = x0 + wx * fall * drift + Math.sin(age * 2.1 + i) * 0.35, z = z0 + wz * fall * drift + Math.cos(age * 1.7 + i * 2) * 0.35;
      const deck = W.deck ? W.deck(x, z) : null, floor = deck !== null ? deck + 0.05 : Math.max(W.h(x, z), W.waterY) + 0.26;
      let y = y0 - fall * 0.55 + Math.sin(age * 3 + i) * 0.08, lie = 0;
      if (y < floor) { lie = 1; y = floor; x += wx * (age - fall) * 0.05; z += wz * (age - fall) * 0.05; }
      const fade = sm(0, 0.4, age) * (1 - sm(T - 1, T, age)) * k;
      const d = camD(x, y, z), L = Math.max(0.3, d * 0.01) * fade;
      if (L < 0.02 || !ahead(g, x, y, z, 5)) continue;
      const c = PETAL[i & 3];
      if (lie) E.S.add(x - E.cx, y - E.cy, z - E.cz, Math.cos(i), 0, Math.sin(i), 0, 1, 0, L * 1.2, L * 0.8, c, 0, CELL.DOT, 0.2, FLAG_DOME | FLAG_FLAT);
      else E.S.bill(x - E.cx, y - E.cy, z - E.cz, age * 2.3 + i, L, L * 0.62, c, 0, CELL.COMMA_S, 0.2, true, 0, 0, 0, 0);
      E.n++;
    }
    // the ones that came down earlier, lying on the water downwind of the bridge, drifting away
    const nl = Math.round(36 * E.frac), wl = Math.hypot(wx, wz) || 1;
    for (let i = 0; i < nl && E.n < E.cap; i++) {
      const T = 40, age = fr(t / T + hh(i, 48.3)) * T, z0 = b.z0 + (b.z1 - b.z0) * hh(i, 49.1);
      const x = b.x + (wx / wl) * (2 + age * 0.22) + (hh(i, 50.3) - 0.5) * 5, z = z0 + (wz / wl) * age * 0.22 + Math.sin(age * 0.2 + i) * 0.6;
      if (W.h(x, z) > W.waterY - 0.05 || (W.deck && W.deck(x, z) !== null)) continue;
      const fade = sm(0, 3, age) * (1 - sm(T - 8, T, age)) * k, d = camD(x, W.waterY, z), L = Math.max(0.22, d * 0.006) * fade;
      if (L < 0.02 || !ahead(g, x, W.waterY, z, 5)) continue;
      E.S.add(x - E.cx, W.waterY + 0.26 - E.cy, z - E.cz, Math.cos(i * 2.3), 0, Math.sin(i * 2.3), 0, 1, 0, L * 1.2, L * 0.8, PETAL[(i + 1) & 3], 0, CELL.DOT, 0.2, FLAG_DOME | FLAG_FLAT); E.n++;
    }
  }

  // ----- carp rising in the morning, frogs leaving the bank as she passes -----
  const CARP = { k: 0 }, CSLOT = 2.6;
  function carpFrame(g, ht) { CARP.k = hourK(ht, 0.26, 0.28, 0.47, 0.5); return CARP.k; }
  const RING = [0.93, 0.96, 0.98], FIN = [0.36, 0.34, 0.3], FROG = [0.4, 0.52, 0.26], FROG2 = [0.6, 0.66, 0.36];
  function ringAt(x, z, age, life, k, seed) {
    const W = st.W, a = age / life, rad = 0.25 + 1.4 * age - 0.18 * age * age, q = (1 - a) * k, d = camD(x, W.waterY, z); // (a dome touch is not shrunk near the eye)
    const len = Math.min(1.1, (TW * rad / 12) * 0.8) * Math.max(1, d / 30), wid = (0.05 + 0.09 * q) * Math.max(1, d / 22);
    for (let j = 0; j < 12 && E.n < E.cap; j++) {
      const th = (j / 12) * TW + seed, c = Math.cos(th), s = Math.sin(th);
      E.S.add(x + c * rad - E.cx, W.waterY + 0.28 - E.cy, z + s * rad - E.cz, -s, 0, c, 0, 1, 0, len, wid, RING, 0, j & 1 ? CELL.LONG_B : CELL.HEAVY, 0.25 + 0.3 * q, FLAG_DOME | FLAG_FLAT); E.n++;
    }
  }
  // the rise of slot s: where (a point of open water), or null
  function carpAt(s) {
    if (!st.nWet || hh(s, 51.1) > 0.75) return -1;
    return Math.floor(hh(s, 52.3) * st.nWet) * 2;
  }
  function drawCarp(g, t) {
    const W = st.W; if (!W || W.waterY === null) return;
    const k = carpFrame(g, g.t);
    if (k > 0.01) {
      const s1 = Math.floor(t / CSLOT);
      for (let s = s1 - 1; s <= s1; s++) {
        const j = carpAt(s); if (j < 0) continue;
        const x = st.wet[j], z = st.wet[j + 1], age = t - s * CSLOT - hh(s, 53.7) * 0.8;
        if (age < 0 || age > 4.2 || camD(x, W.waterY, z) > 150 || !ahead(g, x, W.waterY, z, 4)) continue;
        if (age < 0.7) { // the back and the tail of the fish breaking the water
          const u = age / 0.7, d = camD(x, W.waterY, z), L = Math.max(0.5, d * 0.006) * Math.sin(PI * u), hd = hh(s, 54.1) * TW;
          if (L > 0.02) { C[0] = FIN[0]; C[1] = FIN[1]; C[2] = FIN[2]; dab(x + Math.cos(hd) * u * 0.6, W.waterY + 0.08 + 0.12 * Math.sin(PI * u), z + Math.sin(hd) * u * 0.6, -1.5708, L, L * 0.35, C, CELL.ARC, Math.cos(hd), 0.4 - u, Math.sin(hd)); }
        }
        ringAt(x, z, age, 4.2, k, s * 1.37);
        if (age > 1.1) ringAt(x, z, age - 1.1, 3.1, k * 0.7, s * 2.11);
      }
    }
    // the frogs (set going by update): a leap in an arc from the bank, and the ring where it went in
    const day = E.env ? sm(0.05, 0.3, E.env.sunI) : 1;
    if (day < 0.01) return;
    for (let i = 0; i < st.frogs.length; i++) {
      const f = st.frogs[i], age = st.clock - f.t0;
      if (age < 0 || age > 3) continue;
      if (age < 0.5) {
        const u = age / 0.5, x = f.x + (f.x1 - f.x) * u, z = f.z + (f.z1 - f.z) * u, y = f.y0 + (W.waterY - f.y0) * u + 0.55 * Math.sin(PI * u);
        const hx = f.x1 - f.x, hz = f.z1 - f.z, hl = Math.hypot(hx, hz) || 1;
        air(C, FROG, x, y, z); dab(x, y, z, -1.5708, 0.2, 0.09, C, CELL.LEAF, hx / hl, 0.5 - u, hz / hl);
        air(C, FROG2, x, y, z); rod(x - hx / hl * 0.12, y - 0.02, z - hz / hl * 0.12, hx, 0, hz, 0.22, 0.03, C, CELL.LONG_B);
      } else ringAt(f.x1, f.z1, age - 0.5, 2.5, day, i * 3.1);
    }
  }

  // ----- the world is shown: find what the sights need of its land -----
  function enter(g) {
    st.ch = g && g.ch ? g.ch : null; st.W = g ? g.cur : null; st.id = st.ch ? st.ch.id : ''; st.bridge = null; st.wet = null; st.nWet = 0;
    for (const f of st.frogs) f.t0 = -99;
    if (!st.ch || !st.W) return;
    const W = st.W, ch = st.ch;
    if (st.id === 'fields') {
      // the roost: the top of the nearest tall poplar to the north of the stubble, by the stream
      let best = null, bd = 1e9;
      for (const c of W.casters || []) if (c.k === 'pole' && c.h > 9) { const d = Math.hypot(c.x + 46, c.z + 116); if (d < bd) { bd = d; best = c; } }
      const rx = best && bd < 80 ? best.x : -46, rz = best && bd < 80 ? best.z : -116;
      st.roost[0] = rx; st.roost[2] = rz; st.roost[1] = W.h(rx, rz) + (best && bd < 80 ? best.h * 1.15 : 17);
      MC.y0 = Math.max(0, W.h(MC.x, MC.z));
    }
    if (st.id === 'pond') {
      // the bridge, from its deck
      if (W.deck) {
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
        for (let x = -70; x <= 70; x += 0.5) for (let z = -40; z <= 40; z += 0.5) if (W.deck(x, z) !== null) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
        if (x1 > x0) {
          const b = { x: (x0 + x1) / 2, hw: (x1 - x0) / 2, z0, z1, top: 0, deckY: null };
          if (x1 - x0 > z1 - z0) { /* a bridge that runs east and west: keep the same reading along z of its middle */ }
          b.deckY = (z) => { const d = W.deck(b.x, clamp(z, z0, z1)); return d === null ? Math.max(W.h(b.x, z), W.waterY) + 0.6 : d; };
          b.top = b.deckY((z0 + z1) / 2) + 3; st.bridge = b;
        }
      }
    }
    // open water for the rings: points well inside the pond
    if (W.waterY !== null && st.id === 'pond') {
      const pts = [], r = mulberry32((ch.seed | 0) * 5 + 35);
      for (let k = 0; k < 2400 && pts.length < 400; k++) {
        const x = ch.center[0] + (r() - 0.5) * 2 * ch.radius, z = ch.center[1] + (r() - 0.5) * 2 * ch.radius;
        if (W.h(x, z) > W.waterY - 0.5 || W.h(x + 1.5, z) > W.waterY - 0.2 || W.h(x - 1.5, z) > W.waterY - 0.2 || W.h(x, z + 1.5) > W.waterY - 0.2 || W.h(x, z - 1.5) > W.waterY - 0.2) continue;
        if (W.deck && W.deck(x, z) !== null) continue;
        let easel = false; for (const s of ch.spots) if (Math.hypot(s.x - x, s.z - z) < 4) easel = true;
        if (!easel) pts.push(x, z);
      }
      st.wet = new Float32Array(pts); st.nWet = pts.length / 2;
    }
  }

  // ----- sound: soft, placed, in the key of the music -----
  let NOISE = null, NOISE_CTX = null, BAG = null;
  function audioOK(g) {
    const a = g.audio;
    if (!a || !a.ok || !a.ok() || !a.ctx || g.reverie) return null;
    if (a.ctx.state && a.ctx.state !== 'running') return null;
    return a;
  }
  const keep = (n) => { if (BAG) BAG.push(n); return n; };
  function noiseBuf(ctx) {
    if (NOISE && NOISE_CTX === ctx) return NOISE;
    const n = Math.floor((ctx.sampleRate || 44100) * 1.0), b = ctx.createBuffer(1, n, ctx.sampleRate || 44100), d = b.getChannelData(0), r = mulberry32(355);
    for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    NOISE = b; NOISE_CTX = ctx; return b;
  }
  function chain(a, vol, pan, wet) {
    const ctx = a.ctx, gn = ctx.createGain();
    BAG = [gn]; gn.gain.value = vol;
    let last = gn;
    if (ctx.createStereoPanner) { const p = keep(ctx.createStereoPanner()); p.pan.value = clamp(pan, -0.85, 0.85); gn.connect(p); last = p; }
    last.connect(a.master || ctx.destination);
    if (a.rev) { const s = keep(ctx.createGain()); s.gain.value = wet === undefined ? 0.3 : wet; last.connect(s); s.connect(a.rev); }
    const bag = BAG;
    return { input: gn, done(src) { src.onended = () => { for (const n of bag) try { n.disconnect(); } catch (e) { /* gone */ } }; BAG = null; } };
  }
  const gainN = (ctx, v) => { const n = keep(ctx.createGain()); n.gain.value = v; return n; };
  const filt = (ctx, type, f, Q) => { const n = keep(ctx.createBiquadFilter()); n.type = type; n.frequency.value = f; n.Q.value = Q; return n; };
  function osc(ctx, type, f, t0, t1, to) { const o = keep(ctx.createOscillator()); o.type = type; o.frequency.setValueAtTime(f, t0); if (to) o.connect(to); o.start(t0); o.stop(t1); return o; }
  function noise(ctx, t0, t1, to) { const s = keep(ctx.createBufferSource()); s.buffer = noiseBuf(ctx); s.loop = true; s.connect(to); s.start(t0, Math.random() * 0.5); s.stop(t1); return s; }
  const R = () => Math.random();
  function panOf(g, x, z) {
    const c = g.cam; if (!c || !c.right) return 0;
    const dx = x - c.pos[0], dz = z - c.pos[2], d = Math.hypot(dx, dz) || 1;
    return (dx * c.right[0] + dz * c.right[2]) / d;
  }
  // a rush of air through many wings: noise swept down through a band
  function whoosh(a, t0, dur, vol, pan, f0, f1) {
    const ctx = a.ctx, out = chain(a, vol, pan, 0.4), env = gainN(ctx, 0), bp = filt(ctx, 'bandpass', f0, 0.9);
    bp.connect(env); env.connect(out.input);
    env.gain.setValueAtTime(0.0001, t0); env.gain.linearRampToValueAtTime(1, t0 + dur * 0.35); env.gain.setTargetAtTime(0.0001, t0 + dur * 0.4, dur * 0.22);
    bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    out.done(noise(ctx, t0, t0 + dur * 1.4, bp));
  }
  // starlings in the trees: clicks, creaks and little whistles
  function chatter(a, t0, n, vol, pan) {
    const ctx = a.ctx, T = t0 + n * 0.09 + 0.4, out = chain(a, vol, pan, 0.25), env = gainN(ctx, 0), bp = filt(ctx, 'bandpass', 3200, 3);
    bp.connect(env); env.connect(out.input); env.gain.setValueAtTime(0.0001, t0);
    const o = osc(ctx, 'triangle', 2800, t0, T, bp);
    let t = t0;
    for (let i = 0; i < n; i++) {
      const f = 2000 + R() * 2600, d = 0.025 + R() * 0.07;
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (0.6 + R() * 0.9), t + d);
      env.gain.setTargetAtTime(0.5 + 0.5 * R(), t, 0.005); env.gain.setTargetAtTime(0.0001, t + d, 0.012);
      t += d + 0.02 + R() * 0.08;
    }
    out.done(o);
  }
  // a goose's honk: a nasal reed whose pitch breaks down
  function honk(a, t0, vol, pan) {
    const ctx = a.ctx, f = 290 + R() * 90, out = chain(a, vol, pan, 0.35), env = gainN(ctx, 0), bp = filt(ctx, 'bandpass', 1050, 2.4), lp = filt(ctx, 'lowpass', 2200, 0.7);
    bp.connect(lp); lp.connect(env); env.connect(out.input);
    env.gain.setValueAtTime(0.0001, t0); env.gain.setTargetAtTime(1, t0, 0.015); env.gain.setTargetAtTime(0.0001, t0 + 0.16, 0.04);
    const o = osc(ctx, 'sawtooth', f, t0, t0 + 0.4, bp);
    o.frequency.setValueAtTime(f * 1.12, t0); o.frequency.exponentialRampToValueAtTime(f * 0.86, t0 + 0.2);
    out.done(o);
  }
  // rain on the leaves, a long soft hiss that comes and goes
  function hiss(a, t0, dur, vol, pan) {
    const ctx = a.ctx, out = chain(a, vol, pan, 0.2), env = gainN(ctx, 0), hp = filt(ctx, 'highpass', 2600, 0.5), lp = filt(ctx, 'lowpass', 7500, 0.5);
    hp.connect(lp); lp.connect(env); env.connect(out.input);
    env.gain.setValueAtTime(0.0001, t0); env.gain.linearRampToValueAtTime(1, t0 + dur * 0.3); env.gain.setValueAtTime(1, t0 + dur * 0.7); env.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    out.done(noise(ctx, t0, t0 + dur + 0.1, hp));
  }
  function rumble(a, t0, vol, pan) {
    const ctx = a.ctx, dur = 3.4, out = chain(a, vol, pan, 0.6), env = gainN(ctx, 0), lp = filt(ctx, 'lowpass', 140, 0.8);
    lp.connect(env); env.connect(out.input);
    env.gain.setValueAtTime(0.0001, t0);
    for (let t = t0; t < t0 + dur; t += 0.12) env.gain.setValueAtTime((0.3 + 0.7 * R()) * Math.sin(PI * (t - t0) / dur), t);
    env.gain.setValueAtTime(0.0001, t0 + dur);
    out.done(noise(ctx, t0, t0 + dur + 0.1, lp));
  }
  // a stone in a well: what goes into the water
  function plop(a, t0, vol, pan, hi) {
    const ctx = a.ctx, f = (hi ? 900 : 520) + R() * 200, out = chain(a, vol, pan, 0.35), env = gainN(ctx, 0);
    env.connect(out.input); env.gain.setValueAtTime(0.0001, t0); env.gain.setTargetAtTime(1, t0, 0.004); env.gain.setTargetAtTime(0.0001, t0 + 0.05, 0.03);
    const o = osc(ctx, 'sine', f, t0, t0 + 0.3, env);
    o.frequency.setValueAtTime(f * 0.6, t0); o.frequency.exponentialRampToValueAtTime(f * 1.6, t0 + 0.07);
    const bp = filt(ctx, 'bandpass', 1800, 1.2), ng = gainN(ctx, 0.25); bp.connect(ng); ng.connect(env); noise(ctx, t0, t0 + 0.12, bp);
    out.done(o);
  }
  // a frog of the night: a low burr
  function croak(a, t0, vol, pan) {
    const ctx = a.ctx, f = 140 + R() * 60, n = 2 + ((R() * 3) | 0), out = chain(a, vol, pan, 0.3), env = gainN(ctx, 0), bp = filt(ctx, 'bandpass', 520, 2);
    bp.connect(env); env.connect(out.input); env.gain.setValueAtTime(0.0001, t0);
    const o = osc(ctx, 'sawtooth', f, t0, t0 + n * 0.32 + 0.2, bp);
    for (let i = 0; i < n; i++) { const t = t0 + i * 0.32; env.gain.setTargetAtTime(1, t, 0.01); env.gain.setTargetAtTime(0.0001, t + 0.13, 0.03); o.frequency.setValueAtTime(f * (1 + 0.05 * i), t); }
    out.done(o);
  }
  function rustle(a, t0, dur, vol, pan) {
    const ctx = a.ctx, out = chain(a, vol, pan, 0.3), env = gainN(ctx, 0), bp = filt(ctx, 'bandpass', 3000, 0.8);
    bp.connect(env); env.connect(out.input); env.gain.setValueAtTime(0.0001, t0);
    for (let t = t0; t < t0 + dur; t += 0.04) env.gain.setValueAtTime((0.3 + 0.7 * R()) * Math.sin(PI * (t - t0) / dur), t);
    env.gain.setValueAtTime(0.0001, t0 + dur);
    out.done(noise(ctx, t0, t0 + dur + 0.1, bp));
  }
  const PENT = [[0, 1, 2, 4, 5], [0, 2, 3, 4, 6]];
  function ring(a, wait, k, vel) {
    const sc = a.group && a.group.score;
    if (!sc || !a.deg || !a.note) return;
    const o = Math.floor(k / 5);
    try { a.note('glass', a.ctx.currentTime + wait, a.deg(sc, o * 7 + PENT[sc.scale && sc.scale[2] === 3 ? 1 : 0][k - o * 5], 1), vel); } catch (e) { /* only a silence */ }
  }
  const log = [], count = {};
  function heard(what, d) { count[what] = (count[what] || 0) + 1; if (log.length > 63) log.shift(); log.push({ t: +st.clock.toFixed(2), what, d: +d.toFixed(1) }); }
  // a sound of a sight: only when she is near enough, never on top of the last one of its kind
  function sound(g, what, x, z, d, fn) {
    heard(what, d);
    const a = audioOK(g); if (!a) return;
    try { fn(a, a.ctx.currentTime + 0.05, panOf(g, x, z)); } catch (e) { /* a voice that fails is only a silence */ }
  }

  // ----- every frame -----
  function update(g, dt) {
    if (!g || !g.cur || !g.ch) return;
    if (g.cur !== st.W || g.ch !== st.ch) enter(g);
    dt = Math.min(dt || 0, 0.1); st.clock += dt;
    if (g.t < st.prevT - 0.5) st.day++; st.prevT = g.t;
    const show = showOf(g), p = g.pl, t = g.time, ht = g.t, S = st.snd, cam = g.cam && g.cam.pos ? g.cam.pos : [p ? p.x : 0, p ? p.y : 0, p ? p.z : 0];
    if (show < 0.3 || !p || g.mode !== 'play') return;
    for (const k in S) if (k !== 'thunderDay' && k !== 'bowDay' && k !== 'carpSlot') S[k] -= dt;
    E.cx = cam[0]; E.cy = cam[1]; E.cz = cam[2]; E.env = g.envNow || E.env;
    if (st.id === 'fields') {
      if (murmurFrame(g, t, ht) > 0.05) {
        const d = Math.hypot(M.cx - p.x, M.cy - p.y, M.cz - p.z);
        if (d < 18 && S.part <= 0) { S.part = 3; S.murmur = 4; sound(g, 'part', M.cx, M.cz, d, (a, t0, pan) => whoosh(a, t0, 1.6, 0.09, pan, 1400, 380)); }
        else if (d < 160 && S.murmur <= 0) { S.murmur = 4 + R() * 5; const v = Math.pow(1 - d / 160, 1.4); sound(g, 'murmur', M.cx, M.cz, d, (a, t0, pan) => whoosh(a, t0, 2.4, 0.06 * v, pan, 900, 300)); }
        const r = st.roost, dr = Math.hypot(r[0] - p.x, r[2] - p.z);
        if (ht > 0.768 && dr < 90 && S.roost <= 0) { S.roost = 1.5 + R() * 2; sound(g, 'roost', r[0], r[2], dr, (a, t0, pan) => chatter(a, t0, 8 + ((R() * 10) | 0), 0.03 * Math.pow(1 - dr / 90, 1.2), pan)); }
      }
      if (geeseFrame(g, t, ht) > 0.05) {
        const d = Math.hypot(G.x - cam[0], G.y - cam[1], G.z - cam[2]);
        if (d < 450 && S.geese <= 0) {
          S.geese = 1.6 + R() * 2.4; const v = Math.pow(1 - d / 450, 1.3), n = 2 + ((R() * 4) | 0);
          sound(g, 'honk', G.x, G.z, d, (a, t0, pan) => { for (let i = 0; i < n; i++) honk(a, t0 + i * (0.18 + R() * 0.25), 0.05 * v * (0.7 + 0.3 * R()), pan + (R() - 0.5) * 0.2); });
        }
      }
      if (showerFrame(g, ht) > 0.05) {
        if (SH.under > 0.3 && S.rain <= 0) { S.rain = 5.5; sound(g, 'rain', p.x, p.z, 0, (a, t0) => hiss(a, t0, 6.5, 0.05 * SH.under, 0)); }
        const d = Math.hypot(SH.x - p.x, SH.z - p.z);
        if (S.thunderDay !== st.day && SH.w > 0.3 && d < 700 && d > 120) { S.thunderDay = st.day; sound(g, 'thunder', SH.x, SH.z, d, (a, t0, pan) => rumble(a, t0, 0.07 * (1 - d / 800), pan)); }
      }
      if (bowFrame(g, ht) > 0.5 && S.bowDay !== st.day && g.cam && g.cam.fwd) {
        const f = g.cam.fwd, look = f[0] * BOW.ax + f[2] * BOW.az;
        if (look > 0.3) { S.bowDay = st.day; heard('bow', 0); const a = audioOK(g); if (a) for (let i = 0; i < 5; i++) ring(a, 0.1 + i * 0.16, [4, 5, 6, 7, 9][i], 0.035 - i * 0.004); }
      }
    }
    if (st.id === 'pond') {
      const W = g.cur;
      if (moonFrame(g, ht) > 0.1 && S.croak <= 0) {
        S.croak = 2 + R() * 4;
        if (st.nWet) { const j = Math.floor(R() * st.nWet) * 2, x = st.wet[j], z = st.wet[j + 1], d = Math.hypot(x - p.x, z - p.z); if (d < 40) sound(g, 'croak', x, z, d, (a, t0, pan) => croak(a, t0, 0.045 * (1 - d / 40), pan)); }
      }
      if (wisFrame(g, ht) > 0.05 && WIS.gust > 0.8 && S.bridge <= 0) {
        S.bridge = 9; sound(g, 'petals', st.bridge.x, (st.bridge.z0 + st.bridge.z1) / 2, 2, (a, t0, pan) => { rustle(a, t0, 1.4, 0.035, pan); ring(a, 0.3, 7, 0.03); ring(a, 0.55, 9, 0.025); });
      }
      if (carpFrame(g, ht) > 0.05) {
        const s = Math.floor(t / CSLOT);
        if (s !== S.carpSlot) { S.carpSlot = s; const j = carpAt(s); if (j >= 0) { const x = st.wet[j], z = st.wet[j + 1], d = Math.hypot(x - p.x, z - p.z); if (d < 35) setTimeout0(g, hh(s, 53.7) * 0.8, () => sound(g, 'carp', x, z, d, (a, t0, pan) => plop(a, t0, 0.05 * (1 - d / 35), pan, false))); } }
      }
      // the frogs: she walks along the edge of the water, and one goes in ahead of her
      const sp = Math.hypot(p.vx || 0, p.vz || 0);
      if (W.waterY !== null && (p.alt || 0) < 1.2 && sp > 0.6 && S.frog <= 0 && E.env && E.env.sunI > 0.1) {
        const hd = Math.atan2(p.vx, -p.vz), ax = p.x + Math.sin(hd) * 3, az = p.z - Math.cos(hd) * 3;
        let bx = 0, bz = 0, found = false;
        for (let r = 1; r <= 4 && !found; r++) for (let k = 0; k < 12; k++) {
          const a2 = k / 12 * TW, x = ax + Math.cos(a2) * r, z = az + Math.sin(a2) * r;
          if (W.h(x, z) < W.waterY - 0.3 && !(W.deck && W.deck(x, z) !== null)) { bx = x; bz = z; found = true; break; }
        }
        if (found) {
          S.frog = 1.4 + R() * 2.2;
          let f = st.frogs[0]; for (const q of st.frogs) if (q.t0 < f.t0) f = q;
          const dx = bx - ax, dz = bz - az, dl = Math.hypot(dx, dz) || 1;
          f.x = bx - dx / dl * 0.9; f.z = bz - dz / dl * 0.9; f.x1 = bx + dx / dl * 0.6; f.z1 = bz + dz / dl * 0.6;
          f.y0 = Math.max(W.h(f.x, f.z), W.waterY) + 0.06; f.t0 = st.clock;
          const d = Math.hypot(f.x1 - p.x, f.z1 - p.z);
          setTimeout0(g, 0.45, () => sound(g, 'frog', f.x1, f.z1, d, (a, t0, pan) => plop(a, t0, 0.04, pan, true)));
        }
      }
    }
    runLater();
  }
  // things to sound a little later, on the game's own clock
  const later = [];
  for (let i = 0; i < 8; i++) later.push({ at: -1, fn: null });
  function setTimeout0(g, wait, fn) { for (const l of later) if (!l.fn) { l.at = st.clock + wait; l.fn = fn; return; } }
  function runLater() { for (const l of later) if (l.fn && st.clock >= l.at) { const f = l.fn; l.fn = null; f(); } }

  function frameSetup(S, g, env) {
    const cp = g.cam && g.cam.pos ? g.cam.pos : [0, 0, 0];
    E.S = S; E.env = env; E.cx = cp[0]; E.cy = cp[1]; E.cz = cp[2];
    const q = g.quality === undefined ? 2 : g.quality; E.frac = q === 2 ? 1 : q === 1 ? 0.72 : 0.48;
    E.cap = Math.round(CAP * E.frac); E.n = 0;
  }
  function draw(S, g, env, t) {
    if (!g || !g.cur || !g.ch || !S || !env) return;
    if (g.cur !== st.W || g.ch !== st.ch) enter(g);
    E.show = showOf(g);
    if (E.show <= 0.001 || !g.cam) return;
    frameSetup(S, g, env);
    const ht = g.t, n0 = S.n;
    if (st.id === 'fields') { drawMurmur(g, t, ht); drawGeese(g, t, ht); drawShower(g, t, ht); drawBow(g); }
    else if (st.id === 'pond') { drawMoon(g, t); drawWisteria(g, t); drawCarp(g, t); }
    // fading as the eye settles at an easel: every touch of this frame thins with it
    if (E.show < 0.999) for (let i = n0; i < S.n; i++) { S.sca[i * 4] *= E.show; S.sca[i * 4 + 1] *= E.show; }
    stats.last = S.n - n0; stats.max = Math.max(stats.max, stats.last);
  }
  function glows(Rn, g, env, t) {
    if (!g || !g.cur || !g.ch || !env || st.W !== g.cur) return;
    const show = showOf(g); if (show <= 0.001 || !g.cam) return;
    E.R = Rn; E.gn = 0; E.gcap = Math.round(GCAP * (g.quality === 0 ? 0.5 : 1)); E.env = env;
    const cp = g.cam.pos; E.cx = cp[0]; E.cy = cp[1]; E.cz = cp[2];
    if (st.id === 'pond') { moonFrame(g, g.t); glowMoon(g, t); }
    stats.glow = E.gn; stats.glowMax = Math.max(stats.glowMax, E.gn);
  }
  const stats = { last: 0, max: 0, glow: 0, glowMax: 0 };

  // ----- what the album needs -----
  const LIST = {
    fields: [
      { id: 's_murmur', name: { zh: '草垛上空的椋鸟群', en: 'Starlings over the stacks' }, hint: { zh: '秋冬的黄昏，日落前后，草垛西边的天上', en: 'Autumn and winter, at sunset, in the sky west of the stacks' } },
      { id: 's_geese', name: { zh: '南飞的雁阵', en: 'Geese going south' }, hint: { zh: '秋天的清晨，抬头望天', en: 'Autumn mornings, look up' } },
      { id: 's_shower', name: { zh: '掠过远野的阵雨', en: 'A shower over the far fields' }, hint: { zh: '夏末午后，顺着风望去', en: 'End of summer, early afternoon, down the wind' } },
      { id: 's_rainbow', name: { zh: '雨后的彩虹', en: 'The rainbow after the rain' }, hint: { zh: '夏末，阵雨过后，背对着西斜的太阳', en: 'End of summer, after the shower, with the low sun behind you' } },
    ],
    pond: [
      { id: 's_moon', name: { zh: '月光铺在池上', en: 'The moon road on the pond' }, hint: { zh: '1907 年与 1922 年，入夜，月亮从东边升起', en: '1907 and 1922, at nightfall, the moon rising in the east' } },
      { id: 's_wisteria', name: { zh: '桥上飘落的紫藤', en: 'Wisteria falling from the bridge' }, hint: { zh: '有紫藤的年份，午后，走上日本桥', en: 'The years of the wisteria, in the afternoon, on the bridge' } },
      { id: 's_carp', name: { zh: '睡莲间的鲤鱼与青蛙', en: 'Carp and frogs among the lilies' }, hint: { zh: '清晨，沿着池边慢慢走', en: 'Early morning, walking slowly by the water' } },
    ],
  };
  function list(ch) { return LIST[ch.id] || []; }
  const NOW = [];
  for (let i = 0; i < 8; i++) NOW.push({ id: '', x: 0, y: 0, z: 0, r: 0, k: 0, sky: false });
  const out = [];
  function put(id, x, y, z, r, k, sky) { const o = NOW[out.length]; if (!o) return; o.id = id; o.x = x; o.y = y; o.z = z; o.r = r; o.k = k; o.sky = !!sky; out.push(o); }
  function now(g) {
    out.length = 0;
    if (!g || !g.ch || !g.cur || st.W !== g.cur) return out;
    const env = g.envNow; if (!env) return out;
    const keepE = E.env; E.env = env;
    const t = g.time, ht = g.t, cp = g.cam && g.cam.pos ? g.cam.pos : [0, 0, 0];
    if (st.id === 'fields') {
      if (murmurFrame(g, t, ht) > 0.02) put('s_murmur', M.cx, M.cy, M.cz, M.W * 1.4 + 20, M.k, false);
      if (geeseFrame(g, t, ht) * G.k > 0.02) put('s_geese', G.x, G.y, G.z, 40, G.k * G.on, false);
      if (showerFrame(g, ht) > 0.02) put('s_shower', SH.x, SH.gy + 80, SH.z, SH.R, SH.k, false);
      if (bowFrame(g, ht) > 0.02) { const el = Math.asin(clamp(BOW.ay, -1, 1)) + 42 * DEG, hl = Math.hypot(BOW.ax, BOW.az) || 1; put('s_rainbow', cp[0] + BOW.ax / hl * Math.cos(el) * 800, cp[1] + Math.sin(el) * 800, cp[2] + BOW.az / hl * Math.cos(el) * 800, 500, BOW.k, true); }
    } else if (st.id === 'pond') {
      if (moonFrame(g, ht) > 0.02) put('s_moon', cp[0] + MOON.dx * 800, cp[1] + MOON.dy * 800, cp[2] + MOON.dz * 800, 30, MOON.k, true);
      if (wisFrame(g, ht) > 0.02) { const b = st.bridge; put('s_wisteria', b.x, b.top, (b.z0 + b.z1) / 2, 12, WIS.k, false); }
      if (carpFrame(g, ht) > 0.02 && st.nWet) {
        const s = Math.floor(t / CSLOT); let j = carpAt(s); if (j < 0) j = carpAt(s - 1);
        if (j >= 0) put('s_carp', st.wet[j], st.W.waterY, st.wet[j + 1], 4, CARP.k, false);
      }
    }
    E.env = keepE;
    return out;
  }

  return { worlds: ['fields', 'pond'], list, enter, update, draw, glows, now, st, stats, log, count, M, G, SH, BOW, MOON, WIS, CARP };
})());
