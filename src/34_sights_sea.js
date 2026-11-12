// ---------- sights of the Normandy coast and of Argenteuil ----------
// The coast: the fishing fleet putting out of Le Havre before first light, lanterns lit and gulls behind it; the same fleet coming
// home at dusk; a paddle steamer under its smoke steaming west along the shore through the middle of the day; the gulls of Etretat
// wheeling round the Needle and through the arch of the Porte d'Aval in the afternoon. Argenteuil: the train along the far bank
// with its long white plume, twice a day; the summer regatta on the reach below the bridge; swallows skimming the river on summer evenings.
// Everything here is drawn every frame from the hour (g.t), the season (g.phase) and the clock (g.time), so a still shows it as play does.
// Nothing of this is drawn from viewK 0.6 up (the painting stays the painting), nothing in the ending, and on the title only the dawn fleet.
SIGHTS.add((() => {
  const PI = Math.PI, TW = PI * 2;
  const fr = (v) => v - Math.floor(v);
  const hh = (i, k) => fr(Math.sin(i * 12.9898 + k * 78.233 + 0.37) * 43758.5453);
  const win = (t, a, b, r) => sstep(a, a + r, t) * (1 - sstep(b - r, b, t));
  const CAP = 450, GCAP = 60, FAR = 950, UNDER = [0.56, 0.6, 0.7];

  // ----- names, for the album -----
  const LIST = {
    coast: [
      { id: 's_fleet_out', name: { zh: '出海的渔船', en: 'The fleet puts out' }, hint: { zh: '黎明前后，勒阿弗尔港外，桅灯还亮着', en: 'Around first light, off Le Havre, the lanterns still lit' } },
      { id: 's_steamer', name: { zh: '冒烟的明轮船', en: 'The paddle steamer' }, hint: { zh: '上午到午后，沿着海岸向西驶去', en: 'Late morning to afternoon, steaming west along the shore' } },
      { id: 's_gulls', name: { zh: '针岩的海鸥', en: 'Gulls round the Needle' }, hint: { zh: '下午到日落，埃特尔塔的针岩和拱门', en: 'Afternoon till sunset, at the Needle and the arch of Etretat' } },
      { id: 's_fleet_home', name: { zh: '归航的渔船', en: 'The fleet comes home' }, hint: { zh: '黄昏，点着灯回到勒阿弗尔', en: 'At dusk, lanterns lit, back into Le Havre' } },
    ],
    argenteuil: [
      { id: 's_train', name: { zh: '冒白烟的火车', en: 'The steam train' }, hint: { zh: '上午一班，下午一班，在对岸', en: 'One in the morning, one in the afternoon, along the far bank' } },
      { id: 's_regatta', name: { zh: '夏日赛船', en: 'The summer regatta' }, hint: { zh: '夏天午后，桥下游的河面', en: 'Summer afternoons, on the reach below the bridge' } },
      { id: 's_swallows', name: { zh: '掠水的燕子', en: 'Swallows over the river' }, hint: { zh: '夏天傍晚，桥边低低的水面', en: 'Summer evenings, low over the water by the bridge' } },
    ],
  };
  const NOWS = {};
  for (const w in LIST) for (const s of LIST[w]) NOWS[s.id] = { id: s.id, x: 0, y: 0, z: 0, r: 0, k: 0, sky: false };
  const out = [];

  // ----- paths: polylines with their length, read without allocating -----
  function mkPath(pts) {
    const n = pts.length, P = { n, x: new Float64Array(n), y: new Float64Array(n), z: new Float64Array(n), L: new Float64Array(n), total: 0, hasY: pts[0].length > 2 };
    for (let i = 0; i < n; i++) {
      const p = pts[i]; P.x[i] = p[0];
      if (p.length > 2) { P.y[i] = p[1]; P.z[i] = p[2]; } else { P.y[i] = 0; P.z[i] = p[1]; }
      if (i) P.L[i] = P.L[i - 1] + Math.hypot(P.x[i] - P.x[i - 1], P.z[i] - P.z[i - 1]);
    }
    P.total = P.L[n - 1];
    return P;
  }
  const PO = { x: 0, y: 0, z: 0, tx: 1, tz: 0 };
  function pathAt(P, s, o) {
    const n = P.n;
    if (s <= 0) s = 0; else if (s >= P.total) s = P.total;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P.L[m] <= s) lo = m; else hi = m; }
    const seg = P.L[hi] - P.L[lo] || 1, u = (s - P.L[lo]) / seg;
    o.x = P.x[lo] + (P.x[hi] - P.x[lo]) * u; o.y = P.y[lo] + (P.y[hi] - P.y[lo]) * u; o.z = P.z[lo] + (P.z[hi] - P.z[lo]) * u;
    // the heading eases round the corners: the tangent is blended with the next leg over the last ten metres
    let tx = (P.x[hi] - P.x[lo]) / seg, tz = (P.z[hi] - P.z[lo]) / seg;
    const left = P.L[hi] - s;
    if (left < 10 && hi < n - 1) {
      const s2 = P.L[hi + 1] - P.L[hi] || 1, k = 0.5 * (1 - left / 10);
      tx += ((P.x[hi + 1] - P.x[hi]) / s2 - tx) * k; tz += ((P.z[hi + 1] - P.z[hi]) / s2 - tz) * k;
    }
    const tl = Math.hypot(tx, tz) || 1; o.tx = tx / tl; o.tz = tz / tl;
    return o;
  }

  // ----- the strokes of a frame: as the world's painter lays them (see FOLK) -----
  const E = { S: null, n: 0, cap: CAP, gn: 0, R: null, cx: 0, cy: 0, cz: 0, fx: 0, fy: 0, fz: -1, boost: 1, k: 1, q: 2, nq: 1, tilt: 0.92, show: 0, wy: 0, sun: 1, dark: 0 };
  function put(x, y, z, dx, dy, dz, nx, ny, nz, len, wid, c, cell, flags, glow) {
    const S = E.S;
    if (E.k < 0.01 || E.n >= E.cap || S.n >= S.max) return;
    if (!(flags & FLAG_AXIAL)) {
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
          const p = dx * mx + dy * my + dz * mz; const ax = dx - mx * p, ay = dy - my * p, az = dz - mz * p, al = Math.hypot(ax, ay, az);
          if (al > 1e-3) { dx = ax / al; dy = ay / al; dz = az / al; nx = mx; ny = my; nz = mz; }
        }
      }
    }
    S.add(x, y, z, dx, dy, dz, nx, ny, nz, len * E.boost * E.k, wid * E.boost * E.k, c, 0, cell, glow || 0, flags || 0);
    E.n++;
  }
  function dab(x, y, z, roll, len, wid, c, cell, glow, px, py, pz) {
    const S = E.S;
    if (E.k < 0.01 || E.n >= E.cap || S.n >= S.max) return;
    S.bill(x, y, z, roll, len * E.boost * E.k, wid * E.boost * E.k, c, 0, cell, glow || 0, false, px || 0, py || 0, pz || 0, 0);
    E.n++;
  }
  function rod(ax, ay, az, bx, by, bz, wid, c, cell) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, l = Math.hypot(dx, dy, dz);
    if (l < 1e-3) return;
    put((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, dx, dy, dz, 1, 0, 0, l, wid, c, cell, FLAG_AXIAL);
  }
  function glow(x, y, z, r, g, b, w) { if (E.gn >= GCAP || !E.R) return; E.R.glow(x, y, z, 0, r, g, b, w, w); E.gn++; }
  // how far a thing is from the eye, or -1 when it is behind the eye or too far to matter
  function seen(x, y, z, r) {
    const dx = x - E.cx, dy = y - E.cy, dz = z - E.cz, d = Math.hypot(dx, dy, dz);
    if (d > FAR + r) return -1;
    if (dx * E.fx + dy * E.fy + dz * E.fz < -r && d > r) return -1;
    return d;
  }
  function frameSetup(g, env) {
    const q = g.quality === undefined ? 2 : g.quality, frac = q === 2 ? 1 : q === 1 ? 0.72 : 0.48;
    E.q = q; E.nq = q === 2 ? 1 : q === 1 ? 0.8 : 0.6; E.cap = Math.round(CAP * (q === 2 ? 1 : q === 1 ? 0.8 : 0.62));
    E.boost = Math.min(1.35, 1 / Math.sqrt(frac));
    E.tilt = g.tilt ? g.tilt[0] : 0.92;
    const c = g.cam;
    E.cx = c.pos[0]; E.cy = c.pos[1]; E.cz = c.pos[2]; E.fx = c.fwd[0]; E.fy = c.fwd[1]; E.fz = c.fwd[2];
    E.wy = g.cur && g.cur.waterY !== null && g.cur.waterY !== undefined ? g.cur.waterY : 0;
    E.sun = env ? env.sunI : 1; E.dark = clamp(1 - (env ? env.sunI : 1) * 2.4, 0, 1);
  }
  // how much of everything shows: none from viewK 0.6 up, none in the ending; on the title only what may show there
  function showOf(g) {
    if (!g || g.reverie) return 0;
    if (g.mode === 'title') return 1;
    if (g.mode !== 'play') return 0;
    return g.viewK > 0.6 ? 0 : 1 - (g.viewK || 0) / 0.6;
  }

  // ----- colours -----
  const HULL = [[0.15, 0.16, 0.2], [0.2, 0.18, 0.2], [0.13, 0.17, 0.2], [0.22, 0.2, 0.18]], WALE = [[0.56, 0.24, 0.18], [0.3, 0.42, 0.5], [0.66, 0.56, 0.36], [0.5, 0.2, 0.18]];
  const SAIL = [[0.58, 0.34, 0.2], [0.5, 0.29, 0.19], [0.66, 0.42, 0.24], [0.72, 0.4, 0.22], [0.46, 0.3, 0.22]], SAILL = [[0.76, 0.5, 0.3], [0.7, 0.44, 0.26], [0.84, 0.6, 0.36], [0.86, 0.52, 0.3], [0.64, 0.44, 0.3]];
  const MAST = [0.3, 0.24, 0.18], CREW = [0.18, 0.2, 0.26], CREW2 = [0.62, 0.42, 0.28], FOAM = [0.93, 0.95, 0.94], FOAM2 = [0.82, 0.88, 0.9];
  const GULL = [0.97, 0.97, 0.95], GULLW = [0.86, 0.88, 0.91], GULLD = [0.36, 0.38, 0.46];
  const SHULL = [0.12, 0.13, 0.16], SBAND = [0.86, 0.84, 0.78], SBOX = [0.26, 0.24, 0.24], FUN = [0.1, 0.1, 0.12], FUNB = [0.78, 0.44, 0.22], CABIN = [0.84, 0.8, 0.72];
  const SMOKE = [[0.34, 0.32, 0.36], [0.46, 0.44, 0.5], [0.58, 0.57, 0.63], [0.7, 0.69, 0.75], [0.8, 0.79, 0.83]];
  const STEAM = [[0.97, 0.97, 0.95], [0.93, 0.93, 0.92], [0.88, 0.89, 0.9], [0.84, 0.85, 0.88], [0.8, 0.82, 0.86]];
  const LOCO = [0.12, 0.13, 0.15], LOCO2 = [0.2, 0.26, 0.24], BRASS = [0.8, 0.62, 0.3], CARR = [[0.4, 0.24, 0.17], [0.24, 0.32, 0.27], [0.42, 0.26, 0.19], [0.22, 0.28, 0.36], [0.44, 0.3, 0.2], [0.26, 0.33, 0.28]];
  const ROOF = [0.56, 0.56, 0.54], WIN = [0.86, 0.8, 0.6], RHULL = [0.95, 0.93, 0.88], RHULL2 = [0.8, 0.82, 0.86], RSAIL = [0.98, 0.96, 0.9], RSAILS = [0.82, 0.8, 0.78];
  const STRAW = [0.9, 0.8, 0.5], RED = [0.84, 0.24, 0.18], BLUE = [0.24, 0.34, 0.62], BUOY = [0.9, 0.36, 0.22], FLAGC = [[0.86, 0.22, 0.18], [0.96, 0.94, 0.88], [0.22, 0.36, 0.7]];
  const SWAL = [0.16, 0.2, 0.36], SWALB = [0.92, 0.88, 0.82], RING = [0.9, 0.94, 0.98];
  const LANT = [1.0, 0.7, 0.34];

  // ----- birds -----
  // lod 0: one touch (a fleck, far off), 1: two wings, 2: wings and a body
  function bird(x, y, z, hd, flap, sz, lod, cb, cw) {
    const sx = Math.cos(hd), sz2 = Math.sin(hd);
    // seen from below a white bird is grey: its underside is in its own shade
    if (cw === GULLW && y > E.cy + 2) cw = UNDER;
    if (lod === 0) { dab(x, y, z, Math.sin(flap) * 0.5, sz * 1.5, sz * 0.42, cw, CELL.COMMA, 0, 0, 1, 0); return; }
    const c = Math.cos(flap), s = Math.sin(flap);
    for (let k = -1; k <= 1; k += 2) {
      const ax = sx * c * k, ay = s, az = sz2 * c * k;
      put(x + ax * sz * 0.45, y + ay * sz * 0.45, z + az * sz * 0.45, ax, ay, az, 0, 1, 0, sz, sz * 0.4, cw, CELL.LEAF, 0);
    }
    if (lod > 1) dab(x, y, z, -1.5708, sz * 0.7, sz * 0.26, cb, CELL.LEAF, 0, Math.sin(hd), 0, -Math.cos(hd));
  }
  const birdLod = (d) => (d < 45 ? 2 : d < 140 ? 1 : 0);
  // far birds are drawn a little larger than they are, so that a flock still reads as a flock from across the bay
  const birdSize = (base, d) => base * (1 + Math.max(0, d - 25) / 48);

  // ======================================================================================================================
  // THE COAST
  // ======================================================================================================================
  const NX = -181.7, NZ = -77.3, NTOP = 41;                    // the Needle
  const DOOR_X = -140.9, DOOR_Z = -71.4, WX = -0.242, WZ = 0.97; // the door of the Porte d'Aval, and the way through it
  // the way out of the harbour: from the inner basin, between the tall ships, out into the Channel (the world's fairway if it gives one)
  const FLEET_DEF = [[405, 92], [322, 30], [279, -2], [267, -38], [267, -75], [262, -122], [218, -192], [120, -280], [0, -382]];
  // the steamer's way: out of the haze off Le Havre, west along the shore past the Needle, into the haze again
  const STEAM_DEF = [[560, -150], [330, -128], [120, -118], [-60, -119], [-260, -124], [-560, -140]];
  let FLEET = mkPath(FLEET_DEF), STEAMR = mkPath(STEAM_DEF);
  const NB = 8, FLEET_V = 4.6;
  const FB = [];
  for (let i = 0; i < NB; i++) FB.push({ off: (i + 0.42 * (hh(i, 1) - 0.5)) / NB, lat: (hh(i, 3) - 0.5) * 2, s: 1.15 + 0.3 * hh(i, 4), sc: (i * 3) % SAIL.length, hc: i % HULL.length,
    x: 0, y: 0, z: 0, hd: 0, k: 0, d: 1e9, away: 1, sndT: -99 });
  const FW = { out: { a: 0.165, b: 0.37, r: 0.016 }, home: { a: 0.69, b: 0.845, r: 0.016 } };
  // where boat i is: home 0 puts out, 1 comes home
  function fleetPos(B, i, time, home, wk) {
    const P = FLEET, L = P.total, u = fr(time * FLEET_V / L + B.off), uo = home ? 1 - u : u;
    pathAt(P, uo * L, PO);
    let tx = PO.tx, tz = PO.tz; if (home) { tx = -tx; tz = -tz; }
    const spread = 1.5 + 4 * sstep(0.12, 0.25, uo) * (1 - sstep(0.33, 0.42, uo)) + 24 * sstep(0.55, 0.85, uo), nx = -PO.tz, nz = PO.tx;
    B.x = PO.x + nx * B.lat * spread; B.z = PO.z + nz * B.lat * spread;
    B.hd = Math.atan2(tx, -tz) + 0.06 * Math.sin(time * 0.21 + i);
    B.k = wk * sstep(0, 0.06, u) * (1 - sstep(0.86, 1, u));
    return B;
  }
  function lugger(B, i, time, d) {
    const s = B.s, hd = B.hd, fx = Math.sin(hd), fz = -Math.cos(hd), rx = Math.cos(hd), rz = Math.sin(hd), wy = E.wy;
    const bob = 0.12 * Math.sin(time * 1.25 + i * 1.7), y0 = wy + 0.05 + bob, roll = 0.05 * Math.sin(time * 0.9 + i) + 0.07;
    const lod = d < 110 ? 2 : d < 300 ? 1 : 0, hc = HULL[B.hc], sc = SAIL[B.sc], sl = SAILL[B.sc];
    // the hull: dark, with a band of colour along the wale
    put(B.x, y0 + 0.55 * s, B.z, fx, 0.02, fz, rx, 0.3, rz, 9.2 * s, 1.5 * s, hc, CELL.HEAVY, 0);
    if (lod > 0) put(B.x + fx * 0.3 * s, y0 + 1.15 * s, B.z + fz * 0.3 * s, fx, 0.05, fz, rx, 0.2, rz, 8.4 * s, 0.26 * s, WALE[B.hc], CELL.LONG_B, 0);
    // two masts, raked a little and leaning to leeward, each with its brown lugsail set from a yard
    const lean = roll, ux = rx * lean, uz = rz * lean;
    for (let m = 0; m < 2; m++) {
      const mo = m ? 2.8 * s : -1.0 * s, H = (m ? 7.6 : 10.2) * s, bx = B.x + fx * mo, bz = B.z + fz * mo, by = y0 + 1.1 * s;
      if (lod > 0) rod(bx, by, bz, bx + ux * H - fx * 0.3 * s, by + H, bz + uz * H - fz * 0.3 * s, 0.16 * s, MAST, CELL.HEAVY);
      // the sail: a broad touch hanging from the yard, its foot aft of the mast, sheeted out a little to leeward
      const W = (m ? 3.6 : 4.8) * s, sh = 0.35, ax = -fx * Math.cos(sh) + rx * Math.sin(sh), az = -fz * Math.cos(sh) + rz * Math.sin(sh);
      // the lugsail: upright touches side by side across the cloth from the luff aft, the yard peaking up aft, the cloth bellied to leeward
      const nc = lod === 0 ? 1 : lod === 1 ? 2 : 3, belly = 0.5 + 0.12 * Math.sin(time * 0.6 + i + m), lx = -az, lz = ax, sd = rx * lx + rz * lz > 0 ? 1 : -1;
      for (let c = 0; c < nc; c++) {
        const v = nc === 1 ? 0.5 : (c + 0.5) / nc, foot = by + H * 0.1, top = by + H * (0.74 + 0.2 * v), hgt = top - foot, bl = Math.sin(PI * v) * belly * W * 0.16 * sd;
        const px = bx + ax * W * v + lx * bl + ux * (foot + hgt * 0.5 - by), pz = bz + az * W * v + lz * bl + uz * (foot + hgt * 0.5 - by);
        put(px, foot + hgt * 0.5 + W * 0.04 * v, pz, ux * 0.6 + ax * 0.5, 1, uz * 0.6 + az * 0.5, lx, 0, lz, hgt * 1.08, (W / nc) * (nc === 1 ? 1 : 1.75), sc, c === 1 ? CELL.DAB : CELL.BLOCK, 0);
      }
      // where the cloth bellies out it takes the light: one softer touch across the middle
      if (lod > 1) put(bx + ax * W * 0.55 + lx * belly * W * 0.2 * sd + ux * H * 0.5, by + H * 0.52, bz + az * W * 0.55 + lz * belly * W * 0.2 * sd + uz * H * 0.5, ax, 0.25, az, lx, 0, lz, W * 0.7, H * 0.32, sl, CELL.DAB, 0);
      if (lod > 0) rod(bx + ux * H * 0.86, by + H * 0.86, bz + uz * H * 0.86, bx + ax * W * 1.02 + ux * H * 0.96, by + H * 0.97, bz + az * W * 1.02 + uz * H * 0.96, 0.12 * s, MAST, CELL.LONG_B);
    }
    if (lod > 1) {
      // two men aft, one at the tiller
      for (let c = 0; c < 2; c++) {
        const o = -2.9 * s + c * 1.3 * s, px = B.x + fx * o + rx * (c ? -0.3 : 0.3), pz = B.z + fz * o + rz * (c ? -0.3 : 0.3);
        put(px, y0 + 1.75 * s, pz, 0, 1, 0, 1, 0, 0, 1.0 * s, 0.4 * s, c ? CREW2 : CREW, CELL.HEAVY, FLAG_AXIAL);
        dab(px, y0 + 2.35 * s, pz, 0, 0.3 * s, 0.28 * s, CREW, CELL.DOT, 0, 0, 1, 0);
      }
    }
    if (lod > 0) {
      // the wake, and the bow wave
      const wl = 9 + 6 * s;
      put(B.x - fx * (4.6 * s + wl * 0.5), wy + 0.1, B.z - fz * (4.6 * s + wl * 0.5), fx, 0, fz, 0, 1, 0, wl, 0.7 * s, FOAM2, CELL.LONG_B, FLAG_FLAT);
      if (lod > 1) {
        for (let k = -1; k <= 1; k += 2) put(B.x + fx * 3.6 * s + rx * k * 0.9 * s, wy + 0.12, B.z + fz * 3.6 * s + rz * k * 0.9 * s, fx - rx * k * 0.5, 0, fz - rz * k * 0.5, 0, 1, 0, 2.6 * s, 0.4 * s, FOAM, CELL.COMMA, FLAG_FLAT);
        put(B.x - fx * (4.6 * s + wl), wy + 0.1, B.z - fz * (4.6 * s + wl), fx, 0, fz, 0, 1, 0, wl * 0.9, 1.1 * s, FOAM2, CELL.DRY, FLAG_FLAT);
      }
    }
  }
  // the gulls that follow a boat, low over its wake
  function boatGulls(B, i, time, d, n) {
    const fx = Math.sin(B.hd), fz = -Math.cos(B.hd);
    for (let j = 0; j < n; j++) {
      const a = time * (0.7 + 0.13 * j) + j * 2.1 + i, r = 5 + 3 * j, bx = B.x - fx * (7 + 4 * j), bz = B.z - fz * (7 + 4 * j);
      const x = bx + Math.cos(a) * r, z = bz + Math.sin(a) * r, y = E.wy + 6 + 2.5 * j + 1.5 * Math.sin(time * 0.8 + j);
      const flap = 0.15 + 0.6 * Math.sin(time * 4.4 + j * 1.9 + i) * sstep(0.2, 0.6, Math.sin(time * 0.7 + j + i));
      bird(x, y, z, Math.atan2(-Math.sin(a), -Math.cos(a)), flap, birdSize(0.62, d), birdLod(d), GULL, GULLW);
    }
  }
  function drawFleet(g, time, home, wk) {
    const n = NB; // (every boat at every quality: the fleet is the sight. Detail thins instead)
    for (let i = 0; i < n; i++) {
      const B = fleetPos(FB[i], i, time, home, wk);
      B.d = 1e9;
      if (B.k < 0.02) continue;
      const d = seen(B.x, E.wy + 4, B.z, 14);
      if (d < 0) continue;
      B.d = d;
      E.k = B.k * E.show;
      lugger(B, i, time, d);
      if (d < 320) boatGulls(B, i, time, d, d < 140 && E.q > 0 ? 3 : 2);
    }
    E.k = E.show;
  }
  function fleetGlows(time, home, wk) {
    if (E.dark < 0.05) return;
    const n = NB;
    for (let i = 0; i < n; i++) {
      const B = fleetPos(FB[i], i, time, home, wk), k = B.k * E.show * E.dark;
      if (k < 0.03 || seen(B.x, E.wy + 4, B.z, 14) < 0) continue;
      const s = B.s, fx = Math.sin(B.hd), fz = -Math.cos(B.hd), fl = 0.85 + 0.15 * Math.sin(time * 3.1 + i * 2.3);
      glow(B.x - fx * 1.0 * s, E.wy + 11.6 * s, B.z - fz * 1.0 * s, LANT[0] * k * fl, LANT[1] * k * fl, LANT[2] * k * fl, 2.2);
      glow(B.x - fx * 1.0 * s, E.wy + 11.6 * s, B.z - fz * 1.0 * s, LANT[0] * k * 0.3, LANT[1] * k * 0.3, LANT[2] * k * 0.3, 7);
      glow(B.x - fx * 3.8 * s, E.wy + 2.3 * s, B.z - fz * 3.8 * s, LANT[0] * k * 0.8, LANT[1] * k * 0.7, LANT[2] * k * 0.6, 1.1);
    }
  }

  // ----- the steamer -----
  const STW = { a: 0.34, b: 0.7 }, ST = { x: 0, z: 0, hd: 0, tx: 1, tz: 0, k: 0, u: 0, d: 1e9 };
  function steamerAt(t) {
    const u = (t - STW.a) / (STW.b - STW.a);
    ST.u = u; ST.k = u <= 0 || u >= 1 ? 0 : sstep(0, 0.03, u) * (1 - sstep(0.97, 1, u));
    pathAt(STEAMR, clamp(u, 0, 1) * STEAMR.total, PO);
    ST.x = PO.x; ST.z = PO.z; ST.tx = PO.tx; ST.tz = PO.tz; ST.hd = Math.atan2(PO.tx, -PO.tz);
    return ST;
  }
  const STEAM_V = () => STEAMR.total / ((STW.b - STW.a) * 320);
  function drawSteamer(g, time, wind) {
    if (ST.k < 0.01) return;
    const d = seen(ST.x, E.wy + 8, ST.z, 60);
    ST.d = d < 0 ? 1e9 : d;
    if (d < 0) return;
    E.k = ST.k * E.show;
    const fx = ST.tx, fz = ST.tz, rx = -fz, rz = fx, wy = E.wy, y0 = wy + 0.08 * Math.sin(time * 0.8);
    const lod = d < 160 ? 2 : d < 420 ? 1 : 0;
    // the hull, long and low and black, a pale band along it, the paddle boxes amidships
    put(ST.x, y0 + 1.3, ST.z, fx, 0, fz, rx, 0.25, rz, 36, 3.2, SHULL, CELL.HEAVY, 0);
    put(ST.x + fx * 1.5, y0 + 2.5, ST.z + fz * 1.5, fx, 0, fz, rx, 0.2, rz, 30, 0.7, SBAND, CELL.LONG_A, 0);
    if (lod > 0) {
      put(ST.x - fx * 4, y0 + 3.4, ST.z - fz * 4, fx, 0, fz, rx, 0.1, rz, 12, 1.7, CABIN, CELL.BLOCK, 0);
      for (let k = -1; k <= 1; k += 2) put(ST.x + rx * k * 3.2, y0 + 2.6, ST.z + rz * k * 3.2, fx, 0.35, fz, rx * k, 0.1, rz * k, 6.2, 3.6, SBOX, CELL.DAB, 0);
      // two masts with their stays
      for (const m of [-12, 11]) rod(ST.x + fx * m, y0 + 2.6, ST.z + fz * m, ST.x + fx * (m - 0.6), y0 + 15, ST.z + fz * (m - 0.6), 0.22, MAST, CELL.HEAVY);
    }
    // the funnel, black with a band of red ochre near the top
    const fxp = ST.x + fx * 1.2, fzp = ST.z + fz * 1.2;
    rod(fxp, y0 + 2.8, fzp, fxp - fx * 0.5, y0 + 11.5, fzp - fz * 0.5, 1.5, FUN, CELL.HEAVY);
    if (lod > 0) rod(fxp - fx * 0.42, y0 + 9.4, fzp - fz * 0.42, fxp - fx * 0.48, y0 + 10.4, fzp - fz * 0.48, 1.6, FUNB, CELL.HEAVY);
    // the paddles churn: foam at each side, and the long pale road behind her
    if (lod > 0) {
      for (let k = -1; k <= 1; k += 2) dab(ST.x + rx * k * 3.8 - fx * 1, wy + 0.25, ST.z + rz * k * 3.8 - fz * 1, time * 2 + k, 4.2, 1.6, FOAM, CELL.COMMA, 0.05, 0, 1, 0);
      put(ST.x - fx * 38, wy + 0.1, ST.z - fz * 38, fx, 0, fz, 0, 1, 0, 42, 3.2, FOAM2, CELL.DRY, FLAG_FLAT);
      put(ST.x - fx * 20, wy + 0.11, ST.z - fz * 20, fx, 0, fz, 0, 1, 0, 22, 2.2, FOAM, CELL.LONG_B, FLAG_FLAT);
    }
    // the smoke: puffs laid down where the funnel was, rising and drifting downwind as they age, dark near the funnel, pale far off
    const v = STEAM_V(), np = Math.round(30 * E.nq), gap = 4.6 / E.nq, wl = Math.hypot(wind[0], wind[1]) || 1, wx = wind[0] / wl, wz = wind[1] / wl;
    const s = ST.u * STEAMR.total, whistle = clamp(1 - (time - SND.stWhistle) / 2.5, 0, 1);
    for (let j = 0; j < np; j++) {
      const sj = s - j * gap; if (sj < 0) break;
      pathAt(STEAMR, sj, PO);
      const age = (j * gap) / v, ex = PO.x + PO.tx * 1.2, ez = PO.z + PO.tz * 1.2, h1 = hh(j, 7.1), h2 = hh(j, 3.3);
      const x = ex + wx * age * 2.1 + Math.sin(age * 0.5 + j) * 0.8, z = ez + wz * age * 2.1 + Math.cos(age * 0.4 + j * 2) * 0.8;
      const y = y0 + 12 + age * 0.75 + 2.5 * (h1 - 0.5) * Math.sqrt(age);
      const sz = (4.4 + age * 1.35) * (0.8 + 0.4 * h2) * (1 - sstep(np * 0.7, np, j) * 0.6);
      const c = SMOKE[Math.min(SMOKE.length - 1, ((j + 2 * h2) * SMOKE.length / (np + 2)) | 0)];
      dab(x, y, z, (h1 - 0.5) * 0.8, sz * 1.45, sz, c, j % 3 === 0 ? CELL.DAB : j % 3 === 1 ? CELL.DRY : CELL.COMMA, 0, 0, 1, 0);
    }
    // when she blows her whistle, a jet of white steam at the funnel
    if (whistle > 0.02 && lod > 0) for (let j = 0; j < 4; j++) dab(fxp - fx * 0.7, y0 + 12.4 + j * 0.9 * whistle, fzp - fz * 0.7, j, (1.2 + j * 0.6) * whistle, (0.9 + j * 0.5) * whistle, STEAM[j], CELL.DAB, 0.1, 0, 1, 0);
    E.k = E.show;
  }

  // ----- the gulls of Etretat -----
  const GW = { a: 0.5, b: 0.78, r: 0.025 }, NG = 96, NA = 12;
  const GB = [];
  for (let i = 0; i < NG + NA; i++) GB.push({ r: 10 + 30 * Math.pow(hh(i, 11), 1.1), y: 14 + 40 * hh(i, 12), w: (hh(i, 13) < 0.22 ? -1 : 1), v: 8 + 4 * hh(i, 14), p: hh(i, 15) * TW, e: 0.7 + 0.3 * hh(i, 16), q: hh(i, 17) * TW, ox: (hh(i, 18) - 0.5) * 10, oz: (hh(i, 19) - 0.5) * 10 });
  const GP = { x: 0, y: 0, z: 0, hd: 0, vy: 0 };
  // where gull i is. near: how far she has drawn some of them to her (0 to 1), and her place
  function gullAt(i, time, kw, near, px, py, pz) {
    const G = GB[i];
    if (i >= NG) {
      // through the door of the arch and back over the top of the wall: a wheel standing on its edge
      const ph = time * 0.47 + (i - NG) * TW / NA + 0.25 * Math.sin(i * 1.3), A = 27 + 3 * hh(i, 21), Bv = 21;
      const wv = Math.cos(ph) * A, yv = 27 - Math.sin(ph) * Bv, side = (hh(i, 22) - 0.5) * 5;
      GP.x = DOOR_X + WX * wv - WZ * side; GP.z = DOOR_Z + WZ * wv + WX * side; GP.y = yv + 14 * (1 - kw);
      const dw = -Math.sin(ph) * A, dy = -Math.cos(ph) * Bv;
      GP.hd = Math.atan2(WX * dw, -(WZ * dw)); GP.vy = dy * 0.47;
      return GP;
    }
    const r = G.r * (1 + 2.5 * (1 - kw)), om = (G.v / r) * G.w, th = time * om + G.p;
    let cx = NX + 1 + G.ox, cz = NZ + G.oz, cy = G.y + 30 * (1 - kw), rr = r;
    if (near > 0 && i % 3 === 0) { cx += (px - cx) * near; cz += (pz - cz) * near; cy += (py + 3 - cy) * near; rr = r + (6 + 0.25 * r - r) * near; }
    GP.x = cx + Math.cos(th) * rr; GP.z = cz + Math.sin(th) * rr * G.e; GP.y = cy + 3.5 * Math.sin(th * 2 + G.q);
    GP.hd = Math.atan2(-Math.sin(th) * G.w, -Math.cos(th) * G.e * G.w); GP.vy = 7 * Math.cos(th * 2 + G.q) * om;
    return GP;
  }
  function gullsNear(g) { const p = g.pl; return p ? sstep(85, 30, Math.hypot(p.x - NX, p.z - NZ)) * 0.75 : 0; }
  function drawGulls(g, time, kw) {
    const dC = seen(NX, 30, NZ, 120);
    if (dC < 0) return;
    E.k = E.show;
    const near = gullsNear(g), p = g.pl, n = Math.round(NG * E.nq), na = Math.round(NA * E.nq);
    for (let i = 0; i < NG + NA; i++) {
      if (i >= n && i < NG) continue;
      if (i >= NG + na) break;
      const P = gullAt(i, time, kw, near, p.x, p.y, p.z), d = Math.hypot(P.x - E.cx, P.y - E.cy, P.z - E.cz);
      if (P.y < E.wy + 0.8) continue;
      const glide = sstep(-0.2, 0.6, Math.sin(time * 0.6 + i * 2.3)), flap = (0.1 + 0.65 * Math.sin(time * 4.6 + i * 1.7)) * (1 - glide) + (0.12 + 0.3 * clamp(-P.vy * 0.08, -0.5, 0.5)) * glide;
      bird(P.x, P.y, P.z, P.hd, flap, birdSize(0.66, d), birdLod(d), GULL, i % 7 === 3 ? GULLD : GULLW);
    }
  }

  // ======================================================================================================================
  // ARGENTEUIL
  // ======================================================================================================================
  const RIVER = [[-420, -112], [-250, -104], [-120, -96], [-40, -90], [40, -92], [120, -98], [250, -108], [420, -120]];
  const riverZ = (x) => { for (let i = 0; i < RIVER.length - 1; i++) { const a = RIVER[i], b = RIVER[i + 1]; if (x >= a[0] && x <= b[0]) return a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0])); } return x < 0 ? -112 : -120; };
  let RAIL = null, railFromWorld = false, RAIL_C = 0;
  const TRAIN_V = 17; // metres a second at the walking pace of the day
  // the trains: the morning one runs along the line in its own order, the afternoon one back the other way
  const TRW = [{ a: 0.31, b: 0.45, dir: 1 }, { a: 0.57, b: 0.71, dir: -1 }], TR = { x: 0, y: 0, z: 0, tx: 1, tz: 0, k: 0, u: 0, s: 0, dir: 1, w: -1, d: 1e9 };
  function railFallback(W, wy) {
    // the far bank, behind the first row of trees, the line raised on a low embankment so that the train stands clear of the meadow
    const pts = [];
    for (let x = -460; x <= 460; x += 20) {
      const z = riverZ(x) - 64, h = W && W.h ? W.h(clamp(x, -790, 790), clamp(z, -790, 790)) : 1;
      pts.push([x, Math.max(h, wy + 1.4) + 2.4, z]);
    }
    for (let pass = 0; pass < 3; pass++) for (let i = 1; i < pts.length - 1; i++) pts[i][1] = (pts[i - 1][1] + 2 * pts[i][1] + pts[i + 1][1]) / 4;
    return pts;
  }
  function trainAt(t) {
    TR.k = 0; TR.w = -1;
    if (!RAIL) return TR;
    for (let wi = 0; wi < TRW.length; wi++) {
      const w = TRW[wi], u = (t - w.a) / (w.b - w.a);
      if (u <= 0 || u >= 1) continue;
      TR.w = wi; TR.u = u; TR.dir = w.dir; TR.k = 1;
      // at a steady pace, passing the point of the line nearest the middle of the world halfway through its hour
      TR.s = RAIL_C + w.dir * (t - (w.a + w.b) / 2) * 320 * TRAIN_V;
      break;
    }
    return TR;
  }
  // a place on the line by its distance along it, beyond the ends carried on straight
  const RP = { x: 0, y: 0, z: 0, tx: 1, tz: 0 };
  function railAt(s) {
    const L = RAIL.total;
    pathAt(RAIL, s, RP);
    if (s < 0) { RP.x += RP.tx * s; RP.z += RP.tz * s; } else if (s > L) { RP.x += RP.tx * (s - L); RP.z += RP.tz * (s - L); }
    return RP;
  }
  function drawTrain(g, time, wind) {
    if (TR.k < 0.01 || !RAIL) return;
    railAt(TR.s);
    const lx = RP.x, ly = RP.y, lz = RP.z, d = seen(lx, ly + 3, lz, 90);
    TR.x = lx; TR.y = ly; TR.z = lz; TR.d = d < 0 ? 1e9 : d;
    E.k = E.show;
    const dir = TR.dir, lod = d < 0 ? 0 : d < 140 ? 2 : d < 400 ? 1 : 0, bob = 0.03 * Math.sin(time * 9);
    if (d >= 0) {
      const fx = RP.tx * dir, fz = RP.tz * dir, rx = -fz, rz = fx;
      // the engine: the boiler, the chimney, the dome, the cab, the tender
      put(lx + fx * 1.5, ly + 1.9 + bob, lz + fz * 1.5, fx, 0, fz, rx, 0.3, rz, 6.4, 1.7, LOCO, CELL.HEAVY, 0);
      rod(lx + fx * 4.1, ly + 2.4, lz + fz * 4.1, lx + fx * 4.15, ly + 4.4, lz + fz * 4.15, 0.62, LOCO, CELL.HEAVY);
      put(lx - fx * 2.2, ly + 2.3, lz - fz * 2.2, fx, 0, fz, rx, 0.1, rz, 2.6, 2.8, LOCO2, CELL.BLOCK, 0);
      if (lod > 0) {
        dab(lx + fx * 1.2, ly + 3.0 + bob, lz + fz * 1.2, 0, 0.8, 0.7, BRASS, CELL.DOT, 0, 0, 1, 0);
        put(lx + fx * 1.4, ly + 0.7, lz + fz * 1.4, fx, 0, fz, rx, 0, rz, 7.6, 0.9, LOCO2, CELL.LONG_A, 0);
      }
      railAt(TR.s - dir * 6.5);
      put(RP.x, RP.y + 1.6, RP.z, RP.tx, 0, RP.tz, -RP.tz, 0.2, RP.tx, 4.2, 2.2, LOCO, CELL.BLOCK, 0);
      // the carriages, each following the line
      for (let c = 0; c < 6; c++) {
        railAt(TR.s - dir * (13.5 + c * 9.2));
        const cx = RP.x, cy = RP.y, cz = RP.z, tx = RP.tx, tz = RP.tz;
        if (seen(cx, cy + 2, cz, 8) < 0) continue;
        put(cx, cy + 1.9, cz, tx, 0, tz, -tz, 0.15, tx, 8.4, 2.5, CARR[c], CELL.BLOCK, 0);
        if (lod > 0) put(cx, cy + 3.3, cz, tx, 0, tz, -tz, 0.6, tx, 8.6, 0.5, ROOF, CELL.LONG_A, 0);
        if (lod > 1) put(cx, cy + 2.3, cz, tx, 0, tz, -tz, 0.1, tx, 7.0, 0.42, WIN, CELL.LONG_B, 0, 0.15 * E.dark);
      }
    }
    // the plume: laid down where the chimney has been, rising and spreading and drifting downwind, long and white over the trees
    const v = TRAIN_V, np = Math.round(26 * E.nq), gap = 9 / E.nq, wl = Math.hypot(wind[0], wind[1]) || 1, wx = wind[0] / wl, wz = wind[1] / wl;
    const blow = clamp(1 - (time - SND.trWhistle) / 2.2, 0, 1);
    for (let j = 0; j < np; j++) {
      railAt(TR.s - dir * (j * gap - 4.1));
      const age = (j * gap) / v, h1 = hh(j, 5.1), h2 = hh(j, 9.7);
      const x = RP.x + wx * age * 1.6 + Math.sin(age * 0.7 + j) * 0.6, z = RP.z + wz * age * 1.6, y = RP.y + 4.6 + (5.6 * age) / (1 + 0.085 * age) + 1.5 * (h1 - 0.3) * Math.sqrt(age);
      if (seen(x, y, z, 20) < 0) continue;
      const sz = (2.2 + age * 1.05) * (0.8 + 0.35 * h2) * (1 - 0.75 * sstep(np * 0.7, np, j)) * (j < 3 ? 1 + 0.6 * blow : 1);
      dab(x, y, z, h1 * 3, sz * 1.35, sz, STEAM[Math.min(STEAM.length - 1, (j * STEAM.length / np) | 0)], j % 2 ? CELL.DAB : CELL.COMMA, 0.06, 0, 1, 0);
    }
    E.k = E.show;
  }

  // ----- the regatta -----
  const RGW = { a: 0.5, b: 0.665, r: 0.012 }, RCX = -30, RCZ = -113, RHL = 75, RR = 9, NR = 8, RG_V = 4.2;
  const RPER = 4 * RHL + TW * RR;
  const RB = [];
  for (let i = 0; i < NR; i++) RB.push({ off: (i + 0.5 * hh(i, 31)) / NR * 0.55, lane: (hh(i, 32) - 0.5) * 4, s: 0.92 + 0.16 * hh(i, 33), flag: i % 3, x: 0, z: 0, hd: 0, tx: 1, tz: 0, k: 0, d: 1e9, away: 1, sndT: -99, waveT: -99 });
  // a stadium round the two buoys, sailed anticlockwise seen from above (east along the far side, west along the near)
  function stadium(u, lane, o) {
    let s = fr(u) * RPER;
    const r = RR + lane;
    if (s < 2 * RHL) { o.x = RCX - RHL + s; o.z = RCZ - r; o.tx = 1; o.tz = 0; return o; }
    s -= 2 * RHL;
    if (s < PI * RR) { const a = -PI / 2 + s / RR; o.x = RCX + RHL + Math.cos(a) * r; o.z = RCZ + Math.sin(a) * r; o.tx = -Math.sin(a); o.tz = Math.cos(a); return o; }
    s -= PI * RR;
    if (s < 2 * RHL) { o.x = RCX + RHL - s; o.z = RCZ + r; o.tx = -1; o.tz = 0; return o; }
    s -= 2 * RHL;
    const a = PI / 2 + s / RR; o.x = RCX - RHL + Math.cos(a) * r; o.z = RCZ + Math.sin(a) * r; o.tx = -Math.sin(a); o.tz = Math.cos(a); return o;
  }
  function racerAt(B, i, time, kw) {
    stadium(time * RG_V / RPER + B.off, B.lane, PO);
    B.x = PO.x; B.z = PO.z; B.tx = PO.tx; B.tz = PO.tz; B.hd = Math.atan2(PO.tx, -PO.tz); B.k = kw;
    return B;
  }
  function racer(B, i, time, d, wind) {
    const s = B.s, fx = B.tx, fz = B.tz, rx = -fz, rz = fx, wy = E.wy, lod = d < 90 ? 2 : d < 260 ? 1 : 0;
    // she heels away from the wind
    const side = wind[0] * rx + wind[1] * rz > 0 ? 1 : -1, heel = (0.22 + 0.06 * Math.sin(time * 0.7 + i * 1.9)) * side;
    const ux = rx * heel, uz = rz * heel, y0 = wy + 0.05 * Math.sin(time * 1.6 + i);
    put(B.x, y0 + 0.35 * s, B.z, fx, 0, fz, rx, 0.3, rz, 6.2 * s, 0.9 * s, RHULL, CELL.HEAVY, 0);
    if (lod > 0) put(B.x - fx * 0.2, y0 + 0.08, B.z - fz * 0.2, fx, 0, fz, rx, 0.1, rz, 5.6 * s, 0.3 * s, RHULL2, CELL.LONG_B, 0);
    const mx = B.x + fx * 0.8 * s, mz = B.z + fz * 0.8 * s, H = 8.6 * s;
    if (lod > 0) rod(mx, y0 + 0.7 * s, mz, mx + ux * H, y0 + H, mz + uz * H, 0.12 * s, MAST, CELL.HEAVY);
    // the mainsail aft of the mast, swung out to leeward; the jib before it
    const sh = 0.45, ax = -fx * Math.cos(sh) - rx * side * Math.sin(sh), az = -fz * Math.cos(sh) - rz * side * Math.sin(sh);
    const cx = mx + ax * 1.5 * s + ux * H * 0.42, cy = y0 + H * 0.45, cz = mz + az * 1.5 * s + uz * H * 0.42;
    put(cx, cy, cz, ux * 0.8 + ax * 0.25, 1, uz * 0.8 + az * 0.25, -az, 0, ax, H * 0.82, 3.2 * s, RSAIL, CELL.LEAF, 0);
    if (lod > 0) put(cx + ax * 0.6 * s, cy - H * 0.12, cz + az * 0.6 * s, ux * 0.8, 1, uz * 0.8, -az, 0, ax, H * 0.45, 1.6 * s, RSAILS, CELL.DAB, 0);
    put(mx + fx * 1.4 * s + ux * H * 0.3, y0 + H * 0.33, mz + fz * 1.4 * s + uz * H * 0.3, ux * 0.8 + fx * 0.35, 1, uz * 0.8 + fz * 0.35, -fz, 0, fx, H * 0.55, 1.4 * s, RSAIL, CELL.LEAF, 0);
    if (lod > 0) dab(mx + ux * H, y0 + H + 0.3, mz + uz * H, 0, 0.7 * s, 0.4 * s, FLAGC[B.flag], CELL.BLOCK, 0, rx, 0, rz);
    if (lod > 1) {
      // two men sitting out on the windward side, their straw hats
      const wave = clamp(1 - (time - B.waveT) / 2.5, 0, 1);
      for (let c = 0; c < 2; c++) {
        const o = -1.4 * s + c * 1.0 * s, px = B.x + fx * o - rx * side * 0.55 * s, pz = B.z + fz * o - rz * side * 0.55 * s;
        put(px, y0 + 1.0 * s, pz, -ux, 1, -uz, 1, 0, 0, 0.8 * s, 0.38 * s, c ? BLUE : SBAND, CELL.HEAVY, FLAG_AXIAL);
        dab(px, y0 + 1.5 * s, pz, 0, 0.42 * s, 0.14 * s, STRAW, CELL.DAB, 0, 0, 1, 0);
        if (c === 1 && wave > 0.02) rod(px, y0 + 1.25 * s, pz, px - rx * side * 0.3, y0 + 1.25 * s + 0.75 * wave + 0.12 * Math.sin(time * 9), pz - rz * side * 0.3, 0.09, SBAND, CELL.DAB);
      }
      put(B.x - fx * 4.4 * s, wy + 0.1, B.z - fz * 4.4 * s, fx, 0, fz, 0, 1, 0, 5 * s, 0.45 * s, FOAM, CELL.LONG_B, FLAG_FLAT);
    }
  }
  function drawRegatta(g, time, kw, wind) {
    E.k = E.show * kw;
    // the two buoys, and the committee boat with its flags at the eastern mark
    for (let k = -1; k <= 1; k += 2) { const bx = RCX + k * RHL, d = seen(bx, E.wy, RCZ, 4); if (d >= 0 && d < 500) { dab(bx, E.wy + 0.5, RCZ, 0, 1.1, 1.0, BUOY, CELL.DOT, 0, 0, 1, 0); if (d < 200) rod(bx, E.wy + 0.5, RCZ, bx, E.wy + 2.6, RCZ, 0.08, MAST, CELL.HEAVY); } }
    const cbx = RCX + RHL + 22, cbz = RCZ - 3, dcb = seen(cbx, E.wy + 2, cbz, 10);
    if (dcb >= 0) {
      put(cbx, E.wy + 0.5, cbz, 1, 0, 0, 0, 0.3, 1, 7, 1.4, LOCO2, CELL.HEAVY, 0);
      put(cbx - 0.5, E.wy + 1.4, cbz, 1, 0, 0, 0, 0.1, 1, 3.2, 1.0, SBAND, CELL.BLOCK, 0);
      rod(cbx + 1.5, E.wy + 1, cbz, cbx + 1.5, E.wy + 7.5, cbz, 0.12, MAST, CELL.HEAVY);
      for (let f = 0; f < 3; f++) dab(cbx + 1.5 + 0.6 + 0.15 * Math.sin(time * 3 + f), E.wy + 7.0 - f * 0.9, cbz + 0.2 * f, 0.1 * Math.sin(time * 2.6 + f), 1.1, 0.6, FLAGC[f], CELL.BLOCK, 0, 0, 0, 1);
      // the puff of the starting gun
      const gt = time - SND.gunT;
      if (gt >= 0 && gt < 5) { const a = gt / 5; for (let j = 0; j < 4; j++) dab(cbx + 2 + j * 0.8 + gt * 0.7, E.wy + 2.4 + j * 0.5 + gt * 0.4, cbz - 0.5, j, (1.4 + j * 0.5 + gt * 0.8) * (1 - a * 0.6), (1.1 + j * 0.4 + gt * 0.6) * (1 - a * 0.6), STEAM[j], CELL.DAB, 0, 0, 1, 0); }
    }
    for (let i = 0; i < NR; i++) {
      const B = racerAt(RB[i], i, time, kw), d = seen(B.x, E.wy + 4, B.z, 10);
      B.d = d < 0 ? 1e9 : d;
      if (d < 0 || kw < 0.02) continue;
      racer(B, i, time, d, wind);
    }
    E.k = E.show;
  }

  // ----- the swallows -----
  const SWW = { a: 0.6, b: 0.79, r: 0.02 }, NS = 30, SWC = { x: 24, z: -76 };
  const SB = [];
  for (let i = 0; i < NS; i++) SB.push({ A: 7 + 17 * hh(i, 41), B: 4 + 10 * hh(i, 42), rot: hh(i, 43) * PI, om: (0.6 + 0.5 * hh(i, 44)) * (hh(i, 45) < 0.3 ? -1 : 1), p: hh(i, 46) * TW, q: hh(i, 47) * PI, ox: (hh(i, 48) - 0.5) * 14, oz: (hh(i, 49) - 0.5) * 8 });
  const SP = { x: 0, y: 0, z: 0, hd: 0 }, SC = { x: SWC.x, z: SWC.z };
  function swarmCentre(g) {
    const p = g.pl; let k = 0;
    if (p) k = 0.65 * sstep(70, 28, Math.hypot(p.x - SWC.x, p.z - SWC.z)) * (p.y - E.wy < 12 ? 1 : 0.4);
    SC.x = SWC.x + ((p ? p.x : 0) - SWC.x) * k; SC.z = SWC.z + ((p ? p.z : 0) - SWC.z) * k;
    return SC;
  }
  function swallowAt(i, th, kw) {
    const S = SB[i], c = Math.cos(S.rot), s = Math.sin(S.rot), ex = Math.cos(th) * S.A * (1 + 1.5 * (1 - kw)), ez = Math.sin(th) * S.B * (1 + 1.5 * (1 - kw));
    SP.x = SC.x + S.ox + ex * c - ez * s; SP.z = SC.z + S.oz + ex * s + ez * c;
    const v = Math.abs(Math.sin(th * 1.5 + S.q));
    SP.y = E.wy + 0.25 + (3.5 + 6 * hh(i, 50)) * Math.pow(v, 0.8) + 12 * (1 - kw);
    const dx = -Math.sin(th) * S.A * c - Math.cos(th) * S.B * s, dz = -Math.sin(th) * S.A * s + Math.cos(th) * S.B * c;
    SP.hd = Math.atan2(dx * Math.sign(S.om), -dz * Math.sign(S.om));
    return SP;
  }
  function drawSwallows(g, time, kw) {
    swarmCentre(g);
    if (seen(SC.x, E.wy + 2, SC.z, 50) < 0) return;
    E.k = E.show;
    const n = Math.round(NS * E.nq);
    for (let i = 0; i < n; i++) {
      const S = SB[i], th = time * S.om + S.p, P = swallowAt(i, th, kw), d = Math.hypot(P.x - E.cx, P.y - E.cy, P.z - E.cz);
      if (d > 420) continue;
      const flap = (0.2 + 0.7 * Math.sin(time * 9 + i * 2.3)) * sstep(-0.3, 0.4, Math.sin(time * 1.3 + i)) - 0.05;
      bird(P.x, P.y, P.z, P.hd, flap, birdSize(0.55, d) * kw, d < 30 ? 2 : d < 110 ? 1 : 0, SWALB, SWAL);
      // where it last touched the water, a ring that widens and fades
      if (d < 140 && kw > 0.5 && i % 2 === 0) {
        const ph = th * 1.5 + S.q, nd = Math.floor(ph / PI), thd = (nd * PI - S.q) / 1.5, age = (th - thd) / Math.abs(S.om);
        if (age > 0 && age < 1.8) {
          const D = swallowAt(i, thd, kw), rx = D.x, rz = D.z, rad = 0.3 + 1.3 * age, k = 1 - age / 1.8;
          for (let j = 0; j < 6; j++) { const a = (j / 6) * TW + i, ca = Math.cos(a), sa = Math.sin(a); put(rx + ca * rad, E.wy + 0.07, rz + sa * rad, -sa, 0, ca, 0, 1, 0, 0.9 * rad * 0.8 + 0.2, 0.09 * k + 0.02, RING, CELL.LONG_B, FLAG_FLAT, 0.08 * k); }
        }
      }
    }
  }

  // ======================================================================================================================
  // sound: soft, placed, in the key of the music, silent when the audio is not running
  // ======================================================================================================================
  const SND = { clock: 0, stWhistle: -99, stNear: 0, stLast: -99, stSeenU: -1, trWhistle: -99, trNear: 0, trPass: -1, trChuff: 0, gunT: -99, gunFired: 0, gullT: 0, swT: 0, lastT: 0 };
  let NOISE = null, NOISE_CTX = null, BAG = null, RND = mulberry32(3434);
  function audioOK(g) {
    const a = g.audio;
    if (!a || !a.ok || !a.ok() || !a.ctx || g.reverie || g.mode !== 'play') return null;
    if (a.ctx.state && a.ctx.state !== 'running') return null;
    return a;
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const PENT = [[0, 1, 2, 4, 5], [0, 2, 3, 4, 6]];
  function pent(a, k, oct) {
    const sc = a.group && a.group.score, o = Math.floor(k / 5), j = k - o * 5;
    if (sc && sc.scale && a.deg) { try { return a.deg(sc, o * 7 + PENT[sc.scale[2] === 3 ? 1 : 0][j], oct); } catch (e) { /* fall through */ } }
    return 60 + 12 * (o + oct) + [0, 2, 4, 7, 9][j];
  }
  function noiseBuf(ctx) {
    if (NOISE && NOISE_CTX === ctx) return NOISE;
    const n = Math.floor((ctx.sampleRate || 44100) * 1.0), b = ctx.createBuffer(1, n, ctx.sampleRate || 44100), d = b.getChannelData(0), r = mulberry32(77);
    for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    NOISE = b; NOISE_CTX = ctx;
    return b;
  }
  const keep = (n) => { if (BAG) BAG.push(n); return n; };
  function chain(a, vol, pan) {
    const ctx = a.ctx, gn = ctx.createGain();
    BAG = [gn];
    gn.gain.value = vol;
    let last = gn;
    if (ctx.createStereoPanner) { const p = keep(ctx.createStereoPanner()); p.pan.value = clamp(pan, -0.85, 0.85); gn.connect(p); last = p; }
    last.connect(a.master || ctx.destination);
    if (a.rev) { const send = keep(ctx.createGain()); send.gain.value = 0.35; last.connect(send); send.connect(a.rev); }
    const bag = BAG;
    return { input: gn, done(src) { src.onended = () => { for (const n of bag) try { n.disconnect(); } catch (e) { /* gone */ } }; BAG = null; } };
  }
  const gainN = (ctx, v) => { const n = keep(ctx.createGain()); n.gain.value = v; return n; };
  const filt = (ctx, type, f, Q) => { const n = keep(ctx.createBiquadFilter()); n.type = type; n.frequency.value = f; n.Q.value = Q; return n; };
  function osc(ctx, type, f, t0, t1, to) { const o = keep(ctx.createOscillator()); o.type = type; o.frequency.setValueAtTime(f, t0); if (to) o.connect(to); o.start(t0); o.stop(t1); return o; }
  function noise(ctx, t0, t1, to) { const s = keep(ctx.createBufferSource()); s.buffer = noiseBuf(ctx); s.loop = true; s.connect(to); s.start(t0, RND() * 0.5); s.stop(t1); return s; }
  // a steam whistle: a chord of reedy tones and a breath of steam, swelling and dying. f0: its lowest note
  function whistleS(a, t0, vol, pan, f0, two) {
    const dur = two ? 1.7 : 1.1, ctx = a.ctx, t1 = t0 + dur + 0.6, out = chain(a, vol, pan), env = gainN(ctx, 0), bp = filt(ctx, 'bandpass', f0 * 2.2, 1.2);
    bp.connect(env); env.connect(out.input);
    env.gain.setValueAtTime(0.0001, t0); env.gain.setTargetAtTime(1, t0, 0.07); env.gain.setTargetAtTime(0.0001, t0 + dur, 0.18);
    let o0 = null;
    for (const m of [1, 1.26, 1.5]) {
      const o = osc(ctx, 'sawtooth', f0 * m, t0, t1, bp); if (!o0) o0 = o;
      o.frequency.setValueAtTime(f0 * m * 0.94, t0); o.frequency.setTargetAtTime(f0 * m, t0, 0.08);
      if (two) { o.frequency.setTargetAtTime(f0 * m * 0.84, t0 + dur * 0.55, 0.05); }
    }
    const ng = gainN(ctx, 0.35); ng.connect(bp); noise(ctx, t0, t1, ng);
    out.done(o0);
  }
  // a puff of steam from the cylinders
  function chuff(a, t0, vol, pan) {
    const ctx = a.ctx, out = chain(a, vol, pan), env = gainN(ctx, 0), bp = filt(ctx, 'bandpass', 520 + RND() * 260, 0.9);
    bp.connect(env); env.connect(out.input);
    env.gain.setValueAtTime(0.0001, t0); env.gain.setTargetAtTime(1, t0, 0.008); env.gain.setTargetAtTime(0.0001, t0 + 0.05, 0.06);
    out.done(noise(ctx, t0, t0 + 0.4, bp));
  }
  // a gull: two or three falling cries
  function gullCry(a, t0, vol, pan) {
    const ctx = a.ctx, n = 2 + ((RND() * 2) | 0), t1 = t0 + n * 0.32 + 0.3, out = chain(a, vol, pan), env = gainN(ctx, 0), bp = filt(ctx, 'bandpass', 1700, 2.2);
    bp.connect(env); env.connect(out.input); env.gain.setValueAtTime(0.0001, t0);
    const f0 = 1250 + RND() * 400, o = osc(ctx, 'triangle', f0, t0, t1, bp), ng = gainN(ctx, 0.12); ng.connect(bp); noise(ctx, t0, t1, ng);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.32, f = f0 * (1 - i * 0.06);
      o.frequency.setValueAtTime(f * 1.15, t); o.frequency.linearRampToValueAtTime(f * 0.72, t + 0.24);
      env.gain.setTargetAtTime(1 - i * 0.2, t, 0.015); env.gain.setTargetAtTime(0.0001, t + 0.2, 0.04);
    }
    out.done(o);
  }
  // a man's call over the water: two long notes, falling
  function hail(a, t0, vol, pan) {
    const ctx = a.ctx, k = (RND() * 3) | 0, notes = [[pent(a, k + 4, -1), 0.45], [pent(a, k + 2, -1), 0.8]], t1 = t0 + 1.6, out = chain(a, vol, pan), env = gainN(ctx, 0), lp = filt(ctx, 'lowpass', 900, 1.2);
    lp.connect(env); env.connect(out.input); env.gain.setValueAtTime(0.0001, t0);
    const o = osc(ctx, 'sawtooth', mtof(notes[0][0]), t0, t1, lp);
    let t = t0;
    for (const nn of notes) { o.frequency.setTargetAtTime(mtof(nn[0]), t, 0.05); env.gain.setTargetAtTime(1, t, 0.05); env.gain.setTargetAtTime(0.5, t + nn[1] * 0.7, 0.1); t += nn[1]; }
    env.gain.setTargetAtTime(0.0001, t, 0.12);
    out.done(o);
  }
  // the starting gun: a dull thud, far off
  function gun(a, t0, vol, pan) {
    const ctx = a.ctx, out = chain(a, vol, pan), env = gainN(ctx, 0), lp = filt(ctx, 'lowpass', 700, 0.7);
    lp.connect(env); env.connect(out.input);
    env.gain.setValueAtTime(0.0001, t0); env.gain.setTargetAtTime(1, t0, 0.004); env.gain.setTargetAtTime(0.0001, t0 + 0.05, 0.3);
    const o = osc(ctx, 'sine', 90, t0, t0 + 1.6, lp); o.frequency.setTargetAtTime(38, t0, 0.15);
    const ng = gainN(ctx, 0.8); ng.connect(lp); noise(ctx, t0, t0 + 1.6, ng);
    out.done(o);
  }
  // canvas filling with a crack, and a few lighter flaps
  function flapS(a, t0, vol, pan) {
    const ctx = a.ctx, out = chain(a, vol, pan), env = gainN(ctx, 0), bp = filt(ctx, 'bandpass', 1100, 0.8);
    bp.connect(env); env.connect(out.input); env.gain.setValueAtTime(0.0001, t0);
    for (let i = 0; i < 4; i++) { const t = t0 + i * 0.13 + RND() * 0.04; env.gain.setTargetAtTime(i ? 0.5 : 1, t, 0.004); env.gain.setTargetAtTime(0.0001, t + 0.03, 0.03); }
    out.done(noise(ctx, t0, t0 + 0.9, bp));
  }
  // swallows: quick high twitters
  function twitter(a, t0, vol, pan) {
    const ctx = a.ctx, n = 4 + ((RND() * 4) | 0), t1 = t0 + n * 0.085 + 0.2, out = chain(a, vol, pan), env = gainN(ctx, 0);
    env.connect(out.input); env.gain.setValueAtTime(0.0001, t0);
    const o = osc(ctx, 'sine', 3400, t0, t1, env);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.085, f = 3000 + RND() * 1600;
      o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (RND() < 0.5 ? 1.35 : 0.8), t + 0.045);
      env.gain.setTargetAtTime(0.8 + 0.2 * RND(), t, 0.006); env.gain.setTargetAtTime(0.0001, t + 0.04, 0.012);
    }
    out.done(o);
  }
  function panOf(g, x, z, d) { const c = g.cam; return c && c.right ? ((x - c.pos[0]) * c.right[0] + (z - c.pos[2]) * c.right[2]) / Math.max(1, d) : 0; }
  const fall = (d, R) => Math.pow(clamp(1 - d / R, 0, 1), 1.4);
  function play(g, fn, x, z, d, vol, R, arg, arg2) {
    const a = audioOK(g);
    SND.log && SND.log.push(fn.name);
    if (!a) return;
    const v = vol * fall(d, R);
    if (v < 0.002) return;
    try { fn(a, a.ctx.currentTime + 0.04, v, panOf(g, x, z, d), arg, arg2); } catch (e) { /* a sound that fails is only a silence */ }
  }

  // ======================================================================================================================
  // the set
  // ======================================================================================================================
  const st = { ch: null, W: null };
  function enter(g) {
    st.ch = g && g.ch ? g.ch : null; st.W = g ? g.cur : null;
    if (!st.ch) return;
    const L = st.ch.lines || null;
    if (st.ch.id === 'coast') {
      FLEET = L && L.fairway && L.fairway.length > 1 ? mkPath(L.fairway.map((p) => (p.length > 2 ? [p[0], p[2]] : [p[0], p[1]]))) : mkPath(FLEET_DEF);
      STEAMR = mkPath(STEAM_DEF);
      for (const B of FB) { B.away = 1; B.sndT = -99; }
    } else if (st.ch.id === 'argenteuil') {
      railFromWorld = !!(L && L.rail && L.rail.length > 1);
      const wy = st.W && st.W.waterY !== null && st.W.waterY !== undefined ? st.W.waterY : -1.2;
      RAIL = mkPath(railFromWorld ? L.rail.map((p) => (p.length > 2 ? p : [p[0], (st.W ? st.W.h(p[0], p[1]) : 0) + 0.5, p[1]])) : railFallback(st.W, wy));
      let bd = 1e18; const c = st.ch.center || [0, 0];
      for (let i = 0; i < RAIL.n; i++) { const d = (RAIL.x[i] - c[0]) ** 2 + (RAIL.z[i] - c[1]) ** 2; if (d < bd) { bd = d; RAIL_C = RAIL.L[i]; } }
      for (const B of RB) { B.away = 1; B.sndT = -99; }
    }
    SND.stNear = 0; SND.trNear = 0; SND.trPass = -1; SND.stSeenU = null; SND.gunFired = 0;
    E.wy = st.W && st.W.waterY !== null && st.W.waterY !== undefined ? st.W.waterY : 0;
  }
  function update(g, dt) {
    if (!g || !g.ch) return;
    if (g.ch !== st.ch || g.cur !== st.W) enter(g);
    dt = Math.min(dt || 0, 0.1);
    SND.clock += dt;
    if (g.mode !== 'play' || g.reverie || !g.pl) return;
    const show = showOf(g), time = g.time, t = g.t, p = g.pl, id = g.ch.id;
    if (show < 0.3) return;
    if (id === 'coast') {
      // the fleet: a man on the nearest boat hails her, and the boat's bell answers
      for (let home = 0; home < 2; home++) {
        const w = home ? FW.home : FW.out, wk = win(t, w.a, w.b, w.r);
        if (wk < 0.05) continue;
        for (let i = 0; i < NB; i++) {
          const B = fleetPos(FB[i], i, time, home, wk);
          if (B.k < 0.3) continue;
          const d = Math.hypot(B.x - p.x, E.wy + 3 - p.y, B.z - p.z);
          if (d > 50) B.away = 1;
          if (d < 26 && B.away && SND.clock - B.sndT > 20) {
            B.away = 0; B.sndT = SND.clock;
            play(g, hail, B.x, B.z, d, 0.07, 80);
            const a = audioOK(g); if (a) try { a.note('bell', a.ctx.currentTime + 0.9, pent(a, 7 + (i % 3), 0), 0.035); a.note('bell', a.ctx.currentTime + 1.25, pent(a, 5 + (i % 3), 0), 0.03); } catch (e) { /* silence */ }
          }
        }
      }
      // the steamer whistles as she comes near it, and once as it clears the harbour
      steamerAt(t);
      if (ST.k > 0.3) {
        const d = Math.hypot(ST.x - p.x, ST.z - p.z);
        if (SND.stSeenU !== null && SND.stSeenU < 0.08 && ST.u >= 0.08 && d < 420) { SND.stWhistle = time; play(g, whistleS, ST.x, ST.z, d, 0.06, 500, 170); }
        if (d < 80 && !SND.stNear && time - SND.stWhistle > 12) { SND.stNear = 1; SND.stWhistle = time; play(g, whistleS, ST.x, ST.z, d, 0.09, 260, 170); }
        if (d > 130) SND.stNear = 0;
      }
      SND.stSeenU = ST.k > 0 ? ST.u : -1;
      // the gulls cry the nearer she is the more
      const gk = win(t, GW.a, GW.b, GW.r);
      if (gk > 0.2) {
        const d = Math.hypot(p.x - NX, p.y - 30, p.z - NZ);
        if (d < 170) {
          SND.gullT -= dt;
          if (SND.gullT <= 0) {
            SND.gullT = lerp(0.9, 7, clamp(d / 170, 0, 1)) * (0.6 + 0.8 * RND());
            const a = RND() * TW, r = 10 + 30 * RND();
            play(g, gullCry, NX + Math.cos(a) * r, NZ + Math.sin(a) * r, Math.max(8, d - 20), 0.05 * gk, 190);
          }
        }
      }
    } else if (id === 'argenteuil') {
      // the train: a whistle as it comes on to the line, another when she is near; its beat while she can hear it
      trainAt(t);
      if (TR.k > 0 && RAIL) {
        railAt(TR.s);
        const d = Math.hypot(RP.x - p.x, RP.y - p.y, RP.z - p.z);
        if (TR.w !== SND.trPass && TR.u > 0.06) { SND.trPass = TR.w; if (d < 600) { SND.trWhistle = time; play(g, whistleS, RP.x, RP.z, d, 0.07, 700, 560); } }
        if (d < 120 && !SND.trNear && time - SND.trWhistle > 8) { SND.trNear = 1; SND.trWhistle = time; play(g, whistleS, RP.x, RP.z, d, 0.1, 400, 560, 1); }
        if (d > 170) SND.trNear = 0;
        if (d < 210) { SND.trChuff -= dt; if (SND.trChuff <= 0) { SND.trChuff = 0.22 + 0.03 * Math.sin(time); play(g, chuff, RP.x, RP.z, d, 0.05, 230); } }
      }
      // the regatta: the gun at the start; near a boat, her canvas cracks as she goes about, and a man waves
      const rk = g.phase === 0 ? win(t, RGW.a, RGW.b, RGW.r) : 0;
      if (rk <= 0) SND.gunFired = 0;
      else if (!SND.gunFired && t > RGW.a + 0.004) {
        SND.gunFired = 1;
        if (t < RGW.a + 0.03) {
          SND.gunT = time;
          const cbx = RCX + RHL + 22, d = Math.hypot(cbx - p.x, RCZ - p.z);
          if (d < 600) play(g, gun, cbx, RCZ, d, 0.11, 650);
        }
      }
      if (rk > 0.3) for (let i = 0; i < NR; i++) {
        const B = racerAt(RB[i], i, time, rk), d = Math.hypot(B.x - p.x, E.wy + 3 - p.y, B.z - p.z);
        if (d > 45) B.away = 1;
        if (d < 22 && B.away && SND.clock - B.sndT > 15) { B.away = 0; B.sndT = SND.clock; B.waveT = time; play(g, flapS, B.x, B.z, d, 0.06, 60); play(g, hail, B.x, B.z, d, 0.04, 60); }
      }
      // the swallows twitter round her
      const sk = g.phase === 0 ? win(t, SWW.a, SWW.b, SWW.r) : 0;
      if (sk > 0.3) {
        swarmCentre(g);
        const d = Math.hypot(SC.x - p.x, SC.z - p.z);
        if (d < 50) { SND.swT -= dt; if (SND.swT <= 0) { SND.swT = 0.5 + 1.4 * RND(); play(g, twitter, SC.x + (RND() - 0.5) * 20, SC.z + (RND() - 0.5) * 20, Math.max(4, d), 0.035 * sk, 70); } }
      }
    }
  }
  function draw(S, g, env, time) {
    if (!g || !g.ch || !g.cam || !S) return;
    if (g.ch !== st.ch || g.cur !== st.W) enter(g);
    E.show = showOf(g);
    if (E.show <= 0.01) return;
    const id = g.ch.id, title = g.mode === 'title';
    if (title && id !== 'coast') return;
    E.S = S; E.n = 0; frameSetup(g, env); E.k = E.show;
    const t = g.t, wind = g.ch.wind || [1, 0];
    if (id === 'coast') {
      const wo = win(t, FW.out.a, FW.out.b, FW.out.r);
      if (wo > 0.01) drawFleet(g, time, 0, wo);
      if (title) return;
      const wh = win(t, FW.home.a, FW.home.b, FW.home.r);
      if (wh > 0.01) drawFleet(g, time, 1, wh);
      steamerAt(t); drawSteamer(g, time, wind);
      const gk = win(t, GW.a, GW.b, GW.r);
      if (gk > 0.01) drawGulls(g, time, gk);
    } else if (id === 'argenteuil') {
      trainAt(t); drawTrain(g, time, wind);
      if (g.phase === 0) {
        const rk = win(t, RGW.a, RGW.b, RGW.r);
        if (rk > 0.01) drawRegatta(g, time, rk, wind);
        const sk = win(t, SWW.a, SWW.b, SWW.r);
        if (sk > 0.01) drawSwallows(g, time, sk);
      }
    }
    st.last = E.n;
  }
  function glows(R, g, env, time) {
    if (!g || !g.ch || !g.cam) return;
    E.show = showOf(g);
    if (E.show <= 0.01) return;
    const id = g.ch.id, title = g.mode === 'title';
    if (title && id !== 'coast') return;
    E.R = R; E.gn = 0; frameSetup(g, env);
    const t = g.t;
    if (id === 'coast') {
      const wo = win(t, FW.out.a, FW.out.b, FW.out.r);
      if (wo > 0.01) fleetGlows(time, 0, wo);
      if (!title) { const wh = win(t, FW.home.a, FW.home.b, FW.home.r); if (wh > 0.01) fleetGlows(time, 1, wh); }
    } else if (id === 'argenteuil' && E.dark > 0.05) {
      trainAt(t);
      if (TR.k > 0 && RAIL) {
        // the glow of the firebox under the cab, and the lit windows of the carriages
        railAt(TR.s - TR.dir * 2.2);
        if (seen(RP.x, RP.y, RP.z, 10) >= 0) glow(RP.x, RP.y + 1.4, RP.z, 1.0 * E.dark * E.show, 0.5 * E.dark * E.show, 0.18 * E.dark * E.show, 1.6);
        for (let c = 0; c < 6; c++) { railAt(TR.s - TR.dir * (13.5 + c * 9.2)); if (seen(RP.x, RP.y, RP.z, 10) >= 0) glow(RP.x, RP.y + 2.3, RP.z, 0.6 * E.dark * E.show, 0.48 * E.dark * E.show, 0.26 * E.dark * E.show, 3.2); }
      }
    }
    st.glows = E.gn;
  }
  function list(ch) { return LIST[ch.id] || []; }
  // the sights showing now, where they are, how large, how fully there
  function rec(id, x, y, z, r, k) { const o = NOWS[id]; o.x = x; o.y = y; o.z = z; o.r = r; o.k = k; out.push(o); }
  function now(g) {
    out.length = 0;
    if (!g || !g.ch || g.reverie || g.mode !== 'play') return out;
    const id = g.ch.id, t = g.t, time = g.time;
    if (g.ch !== st.ch || g.cur !== st.W) enter(g);
    E.wy = g.cur && g.cur.waterY !== null && g.cur.waterY !== undefined ? g.cur.waterY : 0;
    if (id === 'coast') {
      for (let home = 0; home < 2; home++) {
        const w = home ? FW.home : FW.out, wk = win(t, w.a, w.b, w.r);
        if (wk < 0.05) continue;
        let sx = 0, sz = 0, sk = 0;
        for (let i = 0; i < NB; i++) { const B = fleetPos(FB[i], i, time, home, wk); sx += B.x * B.k; sz += B.z * B.k; sk += B.k; }
        if (sk > 0.3) rec(home ? 's_fleet_home' : 's_fleet_out', sx / sk, E.wy + 5, sz / sk, 140, wk);
      }
      steamerAt(t);
      if (ST.k > 0.05) rec('s_steamer', ST.x, E.wy + 10, ST.z, 40, ST.k);
      const gk = win(t, GW.a, GW.b, GW.r);
      if (gk > 0.05) rec('s_gulls', NX, 30, NZ, 60, gk);
    } else if (id === 'argenteuil') {
      trainAt(t);
      if (TR.k > 0 && RAIL) { railAt(TR.s - TR.dir * 30); rec('s_train', RP.x, RP.y + 4, RP.z, 45, 1); }
      if (g.phase === 0) {
        const rk = win(t, RGW.a, RGW.b, RGW.r);
        if (rk > 0.05) rec('s_regatta', RCX, E.wy + 4, RCZ, RHL + RR, rk);
        const sk = win(t, SWW.a, SWW.b, SWW.r);
        if (sk > 0.05) { swarmCentre(g); rec('s_swallows', SC.x, E.wy + 2, SC.z, 30, sk); }
      }
    }
    return out;
  }
  return { worlds: ["coast", "argenteuil"], list, enter, update, draw, glows, now, st, SND, E, FB, RB, fleetPos, paths: () => ({ FLEET, STEAMR, RAIL }) };
})());
