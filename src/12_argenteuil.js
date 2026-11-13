// ---------- Argenteuil, 1871 to 1878: the river, the sails, the summer meadows ----------
const W_ARGENTEUIL = (() => {
  const WATER_Y = -1.2, HALF = 38, AUT = 1.4;
  const RIVER = [[-420, -112], [-250, -104], [-120, -96], [-40, -90], [40, -92], [120, -98], [250, -108], [420, -120]];
  const PATH = [[-150, -47], [-70, -45], [-30, -42], [10, -41], [44, -42], [80, -44], [150, -50]];
  const PATH2 = [[0, -41], [2, 0], [0, 30], [14, 46], [30, 58]];
  const riverD = (x, z) => pathDist(x, z, RIVER);
  const riverZ = (x) => { for (let i = 0; i < RIVER.length - 1; i++) { const a = RIVER[i], b = RIVER[i + 1]; if (x >= a[0] && x <= b[0]) return a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0])); } return x < 0 ? -112 : -120; };
  const ridge = (x, z) => Math.exp(-(((x + 62) / 46) ** 2 + ((z - 96) / 30) ** 2));
  const slope = (x, z) => Math.exp(-(((x - 96) / 78) ** 2 + ((z - 128) / 62) ** 2));
  // a small wooded island in the stream below the easels: it closes the autumn picture on the right
  const isle = (x, z) => Math.exp(-(((x + 118) / 25) ** 2 + ((z + 86) / 9) ** 2));
  function height(x, z) {
    const d = riverD(x, z), r = Math.hypot(x, z);
    let h = 0.9 + (fbm(x * 0.013 + 7, z * 0.013 + 2, 3, 301) - 0.5) + 8.6 * ridge(x, z) + 12 * slope(x, z);
    h += (18 + 22 * fbm(x * 0.004 + 5, z * 0.004, 3, 302)) * sstep(270, 440, r) * (1 - 0.8 * sstep(470, 700, r)) * sstep(60, 150, d);
    h -= 4.6 * (1 - sstep(HALF - 4, HALF + 6, d));
    h += 4.9 * sstep(0.2, 0.62, isle(x, z));
    h += 30 * orgemont(x, z);
    return h;
  }
  // the views from the five easels. They are named here because the land is planted for them
  const V1 = { x: 33, y: 3.2, z: 62, yaw: 2.75, pitch: -0.0485, fov: 56 };
  const V2 = { x: -65.6, y: 0.7, z: 85.6, yaw: 2.757, pitch: 0.15, fov: 18.2, show: true, pose: 0.7, act: 1, breeze: 4.2, gale: [-1, 0.06] }; // the wind of that afternoon blew her veil to the right
  const V3 = { x: 30, y: 2.6, z: -54, yaw: 0.305, pitch: -0.048, fov: 42 };
  const V4 = { x: -71, y: 1.2, z: -58.8, yaw: -1.43, pitch: 0.03, fov: 50 };
  const V5 = { x: -78, y: 1.4, z: -49.5, yaw: 0.436, pitch: -0.077, fov: 34 };
  // the hidden regatta: from low on the water below the east bank, upstream past the bridge, the sails on the left and the boatyard on the right
  const VH = { x: 103, y: 1.2, z: -75, yaw: 1.72, pitch: 0.045, fov: 40 };
  // a place as an easel sees it: how far off along the line of sight, and how far to the right of it
  const along = (v, x, z) => (x - v.x) * Math.sin(v.yaw) - (z - v.z) * Math.cos(v.yaw);
  const across = (v, x, z) => (x - v.x) * Math.cos(v.yaw) + (z - v.z) * Math.sin(v.yaw);

  // ----- what the six easels see: the land round the pictures is finished only where none of them looks -----
  // a grid of the ground, 5 m a cell, each cell marked if any easel's frame (widened to a screen two by one) sees it over the land;
  // dist is how far a cell lies from the nearest seen one, so that new colour comes in by degrees and never as a line
  const AR = 2.05, GS = 5, GN = 321, G0 = -800;
  let VG = null;
  // tree walls the land itself does not know about: the far bank opposite the easels and the islet, at heights they surely reach
  const OCC = [[-88, -142, -62, -142.5, 10.5], [-62, -142.5, -40, -143, 12], [-40, -143, 12, -144, 17], [12, -144, 72, -147, 14], [84, -148, 110, -150, 14], [-98, -86, -138, -84, 14],
    [-92, -45, -160, -48, 11], [-160, -48, -232, -53, 9]];
  const gh = (x, z) => {
    const fx = clamp((x - G0) / GS, 0, GN - 1.001), fz = clamp((z - G0) / GS, 0, GN - 1.001), i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j, H = VG.h;
    return (H[j * GN + i] * (1 - tx) + H[j * GN + i + 1] * tx) * (1 - tz) + (H[(j + 1) * GN + i] * (1 - tx) + H[(j + 1) * GN + i + 1] * tx) * tz;
  };
  const cross2 = (ax, az, bx, bz, cx, cz, dx, dz) => {
    const r = bx - ax, s = bz - az, p = dx - cx, q = dz - cz, den = r * q - s * p;
    if (Math.abs(den) < 1e-9) return -1;
    const t = ((cx - ax) * q - (cz - az) * p) / den, u = ((cx - ax) * s - (cz - az) * r) / den;
    return t > 0 && t < 1 && u >= 0 && u <= 1 ? t : -1;
  };
  // from e to (x, y, z) over the land and past the tree walls. refl: the line is the mirror image of a ray off the water at t0, and the land beyond is mirrored too
  function clearLine(e, x, y, z, refl, t0) {
    const L = Math.hypot(x - e[0], z - e[2]);
    for (let sd = 2.5; sd < L * 0.985; sd += Math.max(2.5, sd * 0.03)) {
      const t = sd / L, gy = gh(e[0] + (x - e[0]) * t, e[2] + (z - e[2]) * t), ly = e[1] + (y - e[1]) * t;
      if (!refl || t < t0) { if (gy > ly + 0.15) return false; } else if (2 * WATER_Y - gy < ly - 0.15) return false;
    }
    for (const o of OCC) { const t = cross2(e[0], e[2], x, z, o[0], o[1], o[2], o[3]), ly = e[1] + (y - e[1]) * t; if (t > 0 && (!refl || t < t0 ? ly < o[4] : ly > 2 * WATER_Y - o[4])) return false; }
    return true;
  }
  const inFrame = (c, x, y, z, m) => {
    const dx = x - c.e[0], dy = y - c.e[1], dz = z - c.e[2], zc = dx * c.f[0] + dy * c.f[1] + dz * c.f[2];
    if (zc < 0.5) return false;
    return Math.abs(dx * c.r[0] + dz * c.r[2]) < zc * (c.th + m) && Math.abs(dx * c.u[0] + dy * c.u[1] + dz * c.u[2]) < zc * (c.tv + m);
  };
  // is a point seen from any easel, straight or in the water
  function seenPt(x, y, z, m) {
    if (m === undefined) m = 0.06;
    if (!VG) visGrid();
    for (const c of VG.cams) {
      if (inFrame(c, x, y, z, m) && clearLine(c.e, x, y, z)) return true;
      if (c.water) {
        const ym = 2 * WATER_Y - y;
        if (!inFrame(c, x, ym, z, m)) continue;
        const t = (c.e[1] - WATER_Y) / (c.e[1] - ym), hx = c.e[0] + (x - c.e[0]) * t, hz = c.e[2] + (z - c.e[2]) * t;
        if (gh(hx, hz) < WATER_Y - 0.05 && clearLine(c.e, x, ym, z, true, t)) return true;
      }
    }
    return false;
  }
  // a thing of footprint w by d (turned by yaw) and h high stands where no easel sees it
  function unseen(x, z, w, d, h, yaw) {
    const c = Math.cos(yaw || 0), s = Math.sin(yaw || 0), y0 = height(x, z);
    for (const a of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [0, 0]]) {
      const lx = a[0] * w, lz = a[1] * d, px = x + lx * c - lz * s, pz = z + lx * s + lz * c;
      for (const fy of [0, 0.5, 1]) if (seenPt(px, Math.max(height(px, pz), y0) + 0.2 + fy * h, pz)) return false;
    }
    return true;
  }
  function visGrid() {
    if (VG) return VG;
    VG = { h: new Float32Array(GN * GN), seen: new Uint8Array(GN * GN), dist: new Float32Array(GN * GN), sd: new Float32Array(GN * GN) };
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) VG.h[j * GN + i] = height(G0 + i * GS, G0 + j * GS);
    VG.cams = [V1, V2, V3, V4, V5, VH].map((v) => {
      const cp = Math.cos(v.pitch), f = [Math.sin(v.yaw) * cp, Math.sin(v.pitch), -Math.cos(v.yaw) * cp], r = [Math.cos(v.yaw), 0, Math.sin(v.yaw)], tv = Math.tan((v.fov * DEG) / 2);
      return { e: [v.x, Math.max(height(v.x, v.z), WATER_Y) + v.y, v.z], f, r, u: v3cross(r, f), tv, th: tv * AR, water: v !== V1 && v !== V2 };
    });
    const D = VG.dist;
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
      const x = G0 + i * GS, z = G0 + j * GS, s = seenPt(x, Math.max(VG.h[j * GN + i], WATER_Y) + 0.3, z, 0.03) ? 1 : 0;
      VG.seen[j * GN + i] = s; D[j * GN + i] = s ? 0 : 1e9;
      // how near the nearest eye that might see it: far off, the land is under the haze of the pictures and may be finished in their blue
      let nd = 1e9; for (const c of VG.cams) nd = Math.min(nd, Math.hypot(x - c.e[0], z - c.e[2])); VG.sd[j * GN + i] = nd;
    }
    const dg = GS * 1.4142;
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { const k = j * GN + i; let d = D[k]; if (i > 0) d = Math.min(d, D[k - 1] + GS); if (j > 0) { d = Math.min(d, D[k - GN] + GS); if (i > 0) d = Math.min(d, D[k - GN - 1] + dg); if (i < GN - 1) d = Math.min(d, D[k - GN + 1] + dg); } D[k] = d; }
    for (let j = GN - 1; j >= 0; j--) for (let i = GN - 1; i >= 0; i--) { const k = j * GN + i; let d = D[k]; if (i < GN - 1) d = Math.min(d, D[k + 1] + GS); if (j < GN - 1) { d = Math.min(d, D[k + GN] + GS); if (i < GN - 1) d = Math.min(d, D[k + GN + 1] + dg); if (i > 0) d = Math.min(d, D[k + GN - 1] + dg); } D[k] = d; }
    return VG;
  }
  // how far a place lies from anything an easel sees (metres, from the grid)
  const farSeen = (x, z) => { visGrid(); const i = clamp(Math.round((x - G0) / GS), 0, GN - 1), j = clamp(Math.round((z - G0) / GS), 0, GN - 1); return VG.dist[j * GN + i]; };

  // ----- the plan of the place -----
  // The Seine runs west past the meadows of Petit Gennevilliers, where the easels stand, and under the road bridge (x 78).
  // Argenteuil lies on the far bank behind its trees: the church on its west side (x -168), the works and their chimneys upstream
  // to the east, the vines climbing behind the roofs to the hill of Orgemont and its mill in the north west, the railway from Paris
  // along the foot of the hill. On this bank the open plain of Gennevilliers in strips of wheat, oats, asparagus, roots and vines,
  // the road from the bridge running south east, lanes from easel to easel, a few farms, villas and gardens by the water upstream.
  const LANES = [
    { p: [[78, -44], [82, -14], [96, 20], [124, 50], [160, 78], [200, 106], [232, 146], [248, 220], [262, 320], [282, 500], [300, 800]], w: 2.6 },   // the road from the bridge
    { p: [[28, 59], [12, 67], [-12, 76], [-36, 84], [-52, 90], [-58, 93]], w: 1.2 },   // from the poppies along the hedge to the knoll
    { p: [[-63, 89], [-60, 64], [-46, 38], [-24, 14], [2, 0]], w: 1.2 },               // down from the knoll to the lane of the meadows
    { p: [[14, 46], [40, 38], [70, 38], [96, 20]], w: 1.2 },                           // across to the road
    { p: [[2, 0], [-40, -6], [-90, -10], [-150, -12], [-220, -4], [-320, 12], [-480, 30], [-800, 44]], w: 1.4 },   // west through the fields behind the bank
    { p: [[-64, 99], [-84, 150], [-112, 220], [-150, 330], [-210, 520], [-270, 800]], w: 1.3 },                    // south west from the knoll
    { p: [[-84, 150], [-30, 186], [40, 204], [120, 196], [190, 178], [232, 146]], w: 1.2 },                         // round behind the poppy hill
    { p: [[200, 106], [250, 60], [330, 30], [480, 30], [800, 36]], w: 1.4 },                                        // east along the plain
  ];
  for (const L of LANES) { const xs = L.p.map((p) => p[0]), zs = L.p.map((p) => p[1]); L.bb = [Math.min(...xs) - 6, Math.max(...xs) + 6, Math.min(...zs) - 6, Math.max(...zs) + 6]; }
  // the town on the far bank: where its houses and gardens are, and the works
  const TOWN = [[40, -205, 80], [-80, -215, 70], [-175, -215, 85], [140, -195, 60], [245, -195, 50]];
  const inTown = (x, z) => { let k = 0; for (const t of TOWN) k = Math.max(k, 1 - Math.hypot(x - t[0], z - t[1]) / t[2]); return k + 0.25 * (vnoise(x * 0.04, z * 0.04, 411) - 0.5) > 0.05; };
  const ORG = [-160, -372];   // the top of the hill of Orgemont, the mill on it
  const orgemont = (x, z) => Math.exp(-(((x - ORG[0]) / 75) ** 2 + ((z - ORG[1]) / 60) ** 2));
  // the poppy field as a field: one piece of land round the slope the picture shows, with wandering edges
  const inPoppy = (x, z) => { const e = 7 * (vnoise(x * 0.05, z * 0.05, 412) - 0.5); return x > -2 + e && x < 140 + e && z > 50 + e && z < 158 + e && pathDist(x, z, LANES[1].p) > 3; };
  const lp = (cols, w) => { const f = pal(cols, 0.05, w); f.cols = cols; f.w = w; return f; };
  const KIND = {
    wheat: { p: lp(['#c8b46a', '#d4bc72', '#bca660', '#dcc67e', '#b8a858']), b: '#c4b068' },
    oats: { p: lp(['#b0b676', '#bcbe7e', '#a4ac6a', '#c6c48a']), b: '#b2b474' },
    green: { p: lp(['#8ca85a', '#98b062', '#7e9c50', '#a4b46a']), b: '#8ea858' },
    asp: { p: lp(['#7c9c80', '#8aa88a', '#6e8e74', '#98b090', '#b0a07c'], [3, 3, 2, 2, 2]), b: '#86a084' },
    vine: { p: lp(['#5c703e', '#6c7c48', '#4e6238', '#a08a68', '#8a7a5c'], [3, 3, 2, 2, 2]), b: '#727650' },
    roots: { p: lp(['#4e7a3c', '#5a8642', '#46703a', '#6a8c48']), b: '#527c3e' },
    past: { p: lp(['#78a04a', '#88aa54', '#6c9444', '#96b25e']), b: '#7ea24c' },
    stub: { p: lp(['#c8b88c', '#bcac80', '#d4c49a', '#b0a478']), b: '#c4b488' },
    plough: { p: lp(['#9c8466', '#a88e70', '#8e785e', '#b09878']), b: '#9c8668' },
    clover: { p: lp(['#6c9a4e', '#7aa456', '#8c9a6a', '#b48aa0'], [3, 3, 2, 1]), b: '#729c50' },
    wood: { p: lp(['#3e5e3a', '#4a6a40', '#365436', '#566e44']), b: '#42603a' },
    garden: { p: lp(['#6e9446', '#8aa456', '#a89a6a', '#5c8040']), b: '#749448' },
    street: { p: lp(['#c4b494', '#b8aa8c', '#d0c2a4', '#a89c84']), b: '#bcae90' },
    lane: { p: lp(['#d0c09c', '#c6b490', '#dacaa8', '#bca888']), b: '#ccbc98' },
    rough: { p: lp(['#5e8a3e', '#6c9444', '#4e7a3a', '#7e9a4a', '#8a9a5a']), b: '#628c40' },
    poppy: { p: lp(['#a39a62', '#b0a46a', '#989058', '#bcae74', '#8e8c56', '#7c8448'], [3, 3, 3, 2, 2, 2]), b: '#a29a64' },
  };
  const HAZE = hex('#7a92a8');
  for (const k in KIND) { const K = KIND[k]; K.b = hex(K.b); K.id = k; K.t = { id: k + '_far', b: mixc(K.b, HAZE, 0.55), p: pal(K.p.cols.map((c) => mixc(hex(c), HAZE, 0.55)), 0.05, K.p.w) }; }
  const PLAIN = [['wheat', 3], ['oats', 2], ['green', 1.4], ['asp', 2], ['roots', 1.4], ['stub', 1], ['plough', 1], ['clover', 1], ['past', 0.6], ['vine', 0.4]];
  const SLOPE = [['vine', 4], ['asp', 1.5], ['wheat', 1], ['stub', 0.6], ['plough', 0.6], ['past', 0.6]];
  const pick = (L, r) => { let s = 0; for (const e of L) s += e[1]; r *= s; for (const e of L) { r -= e[1]; if (r <= 0) return KIND[e[0]]; } return KIND[L[0][0]]; };
  // the strips: furlongs about 120 m across with wandering edges, each lying its own way, cut into strips of its own width
  let _lx = NaN, _lz = NaN, _lr = null, _la = 0;
  function strip(x, z) {
    const wx = x + 26 * (vnoise(x * 0.011, z * 0.011, 401) - 0.5), wz = z + 26 * (vnoise(x * 0.011 + 9, z * 0.011, 402) - 0.5);
    const fi = Math.floor(wx / 120), fj = Math.floor(wz / 120), h = hash2(fi, fj, 403);
    const th = (h < 0.62 ? Math.PI / 2 : 0) + (hash2(fi, fj, 406) - 0.5) * 0.6, w = 8 + 13 * hash2(fi, fj, 404);
    const ac = -x * Math.sin(th) + z * Math.cos(th), k = Math.floor(ac / w);
    // the balks: a strip of grass at the edge of a furlong
    const ex = Math.min(wx - fi * 120, (fi + 1) * 120 - wx, wz - fj * 120, (fj + 1) * 120 - wz);
    return { th, r: hash2(k, fi * 131 + fj, 405), balk: ex < 1.6, edge: ac - k * w < 0.9 };
  }
  // what the land is at (x, z) where no easel looks, or null where the painted ground must stay
  function landAt(x, z) {
    if (x === _lx && z === _lz) return _lr;
    _lx = x; _lz = z;
    if (riverD(x, z) < HALF + 6) return (_lr = null);
    const k = sstep(5, 28, farSeen(x, z));
    let tint = false;
    if (k < 1 && hash2(Math.floor(x * 1.7), Math.floor(z * 1.7), 410) > k) { if (VG.sd[clamp(Math.round((z - G0) / GS), 0, GN - 1) * GN + clamp(Math.round((x - G0) / GS), 0, GN - 1)] < 270) return (_lr = null); tint = true; }
    _lr = land0(x, z);
    return (_lr = tint ? _lr.t : _lr);
  }
  function land0(x, z) {
    for (const L of LANES) { if (x < L.bb[0] || x > L.bb[1] || z < L.bb[2] || z > L.bb[3]) continue; const d = pathDist(x, z, L.p); if (d < L.w + 0.6 * vnoise(x * 0.3, z * 0.3, 413)) { _la = pathAngle(x, z, L.p); return KIND.lane; } }
    const rz = riverZ(x), north = z < rz, r = Math.hypot(x, z);
    if (north) {
      if (inTown(x, z)) {
        const q = rz - HALF - z; let st = Math.abs(x - 78) < 3.5;
        for (const row of [16, 36, 58, 83, 110]) if (Math.abs(q - row) < 2.4) st = true;
        _la = st && Math.abs(x - 78) >= 3.5 ? 0.05 : Math.PI / 2; return st ? KIND.street : KIND.garden;
      }
      if (orgemont(x, z) > 0.55 && vnoise(x * 0.02, z * 0.02, 415) > 0.45) { _la = 0; return KIND.wood; }
      const s = strip(x, z); _la = s.th;
      if (s.balk) return KIND.past;
      return pick(z < rz - HALF - 140 || orgemont(x, z) > 0.2 ? SLOPE : PLAIN, s.r);
    }
    if (inPoppy(x, z)) { _la = 0.4; return KIND.poppy; }
    if (ridge(x, z) > 0.22) { _la = 0.5; return KIND.rough; }
    // the water meadows along the bank, and woods here and there far out
    if (z < rz + HALF + 24 + 10 * vnoise(x * 0.02, 0, 416)) { _la = pathAngle(x, z, RIVER); return KIND.past; }
    if (r > 230 && fbm(x * 0.006, z * 0.006, 2, 407) > 0.645) { _la = 0; return KIND.wood; }
    const s = strip(x, z); _la = s.th;
    if (s.balk) return KIND.past;
    return pick(PLAIN, s.r);
  }
  const RECOL = { meadow: 1, field: 1, ridge: 1, north: 1, hill: 1 };
  // the railway from Paris: in from the east along the foot of the hills behind the town, and away to the west. Points every 20 m, at the height of the rails,
  // on a bank that smooths the lie of the land (the sights run their train on it)
  const RAIL = (() => {
    const K = [[840, -236], [600, -252], [420, -262], [260, -272], [120, -284], [-40, -296], [-200, -304], [-360, -296], [-520, -282], [-840, -262]], pts = [];
    for (let i = 0; i < K.length - 1; i++) { const a = K[i], b = K[i + 1], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 20); for (let j = 0; j < n; j++) pts.push([a[0] + ((b[0] - a[0]) * j) / n, 0, a[1] + ((b[1] - a[1]) * j) / n]); }
    pts.push([K[K.length - 1][0], 0, K[K.length - 1][1]]);
    const g = pts.map((p) => height(clamp(p[0], -795, 795), clamp(p[2], -795, 795)));
    for (let i = 0; i < pts.length; i++) { let s = 0, n = 0; for (let j = Math.max(0, i - 3); j <= Math.min(pts.length - 1, i + 3); j++) { s += g[j]; n++; } pts[i][1] = Math.max(s / n, g[i] + 0.3) + 0.9; }
    for (let it = 0; it < 2; it++) for (let i = 1; i < pts.length - 1; i++) pts[i][1] = Math.max((pts[i - 1][1] + pts[i][1] * 2 + pts[i + 1][1]) / 4, g[i] + 0.9);
    return pts.map((p) => [+p[0].toFixed(1), +p[1].toFixed(2), +p[2].toFixed(1)]);
  })();
  const P = {
    meadow: pal(['#86a850', '#98b25a', '#7a9a4a', '#aab866', '#6c9048', '#bcb870'], 0.05, [3, 3, 3, 2, 2, 1]),
    ridge: pal(['#44703a', '#52803c', '#628a3a', '#385e38', '#789440', '#325646'], 0.05, [3, 3, 2, 2, 2, 1]),
    shade: pal(['#1f4a44', '#28544a', '#1a3e3c', '#2f5a48'], 0.04),
    sward: pal(['#2e562a', '#3a662e', '#487630', '#2c5240', '#5c8434', '#6e9038'], 0.05, [4, 4, 3, 2, 2, 1]),
    plain: pal(['#a39a62', '#b0a46a', '#989058', '#bcae74', '#8e8c56', '#a89c70', '#9a9a74'], 0.04, [3, 3, 3, 2, 2, 1, 1]),
    band: pal(['#6f7a40', '#7c8448', '#5f6c38', '#888a50', '#506034', '#93904e'], 0.04, [3, 3, 3, 2, 2, 1]),
    far: pal(['#7c8f72', '#88987a', '#70866a', '#92a080', '#84966e'], 0.04),
    straw: pal(['#b0a468', '#baae72', '#a49a5e', '#c2b67c'], 0.04),
    bank: pal(['#66843f', '#788f45', '#566f3b', '#909a4c', '#84804a'], 0.05),
    isle: pal(['#8a8048', '#9a8a50', '#7a7444', '#a09658'], 0.05),
    north: pal(['#7aa070', '#88aa78', '#6a9470', '#98b080', '#8aa068'], 0.05),
    path: pal(['#d8c8a8', '#e0d2b4', '#ccb894', '#e6dcc4', '#d4bca0'], 0.04),
    hill: pal(['#7a92a8', '#8aa0b4', '#6a84a0', '#96a6b0', '#8a9a8a'], 0.04),
  };
  const BASE = { meadow: hex('#88a852'), ridge: hex('#3c6032'), plain: hex('#a09860'), band: hex('#6c7840'), far: hex('#7e9074'), straw: hex('#b0a66a'), bank: hex('#64803f'), isle: hex('#8a804a'), north: hex('#7a9e70'), path: hex('#d6c6a6'), hill: hex('#7890a4') };
  // the poppy field is the whole slope. The poppies themselves come down the bank in a band that is narrow at the painter's feet and wide up the hill
  const inField = (x, z) => slope(x, z) > 0.13 && x < 128 + 14 * vnoise(x * 0.03, z * 0.03, 305) && z < 150;
  const inBand = (x, z, j) => {
    const a = along(V1, x, z);
    if (a < 4 || a > 84) return false;
    const q = across(V1, x, z) / a + (j || 0);
    return q < -0.17 + 0.52 * Math.exp(-(a - 6) / 3.2) && q > -0.27 - 0.55 * (1 - Math.exp(-Math.max(0, a - 6) / 1.8)) - 0.5 * sstep(9, 16, a);
  };
  const fieldKind = (x, z, j) => { if (inBand(x, z, j * 0.5)) return 'band'; const s = slope(x, z) + j; return s > 0.5 ? 'straw' : s > 0.36 ? 'far' : 'plain'; };
  // the ground close under the two easels of the meadows, where the grass is painted touch by touch
  const nearV1 = (x, z) => { const a = along(V1, x, z); return a > 3 && a < 36 && Math.abs(across(V1, x, z)) < 0.8 * a + 2; };
  const nearV2 = (x, z) => { const a = along(V2, x, z); return a > 0.8 && a < 17 && Math.abs(across(V2, x, z)) < 0.42 * a + 2.5; };
  // where her shadow falls: a patch on the camera's side of her, longer towards the eye
  const inShade = (x, z, r) => { const a = along(V2, x, z) - 10.5, c = across(V2, x, z) - 0.3; return a > -3.6 - r && a < 0.6 && Math.abs(c) < 1.1 + 0.7 * r; };
  let _zx = NaN, _zz = NaN, _zr = '';
  function zone(x, z) { if (x === _zx && z === _zz) return _zr; _zx = x; _zz = z; return (_zr = zone0(x, z)); }
  function zone0(x, z) {
    if (Math.hypot(x, z) > 262 + 30 * vnoise(x * 0.01, z * 0.01, 303)) return 'hill';
    const d = riverD(x, z);
    if (d < HALF + 9) return isle(x, z) > 0.4 ? 'isle' : 'bank';
    if (z < riverZ(x)) return 'north';
    if (pathDist(x, z, PATH) < 1.7 || pathDist(x, z, PATH2) < 1.3) return 'path';
    if (inField(x, z)) return 'field';
    return ridge(x, z) > 0.28 ? 'ridge' : 'meadow';
  }
  const ground = {
    col(x, z, rnd) {
      const zn = zone(x, z);
      // where no easel looks the land is the plain, the town and the hill; the same draws of chance either way
      if (RECOL[zn]) { const L = landAt(x, z); if (L) { if (zn === 'field' || zn === 'ridge') rnd(); return L.p(rnd); } }
      if (zn === 'field') return P[fieldKind(x, z, (rnd() - 0.5) * 0.06)](rnd);
      // under the woman with the parasol her shadow lies on the grass, blue green
      // and the grass before her is deep, as he has it against the light
      if (zn === 'ridge' && inShade(x, z, rnd())) return P.shade(rnd);
      if (zn === 'ridge' && nearV2(x, z)) return P.sward(rnd);
      return P[zn](rnd);
    },
    dir(x, z) { const zn = zone(x, z); if (RECOL[zn] && landAt(x, z)) return _la; return zn === 'bank' ? pathAngle(x, z, RIVER) : zn === 'path' ? pathAngle(x, z, PATH) : 0.4 + 0.6 * Math.sin(x * 0.017 + z * 0.021); },
    mask(x, z) { return riverD(x, z) < HALF - 2.5 && isle(x, z) < 0.44 ? 0 : nearV2(x, z) ? 0.12 : 1; },
  };
  function build(W) {
    const T = W.tasks, rnd = W.rnd, S = W.S;
    W.waterY = WATER_Y;
    T.push(() => W.fillTerrain(height, (x, z) => { const zn = zone(x, z); if (RECOL[zn]) { const L = landAt(x, z); if (L) return L.b; } return BASE[zn === 'field' ? fieldKind(x, z, 0) : zn]; }));
    // the ground in short touches laid every way, never in rows
    groundRings(W, ground, { cx: 0, cz: 10, r2: 320, jit: 1.5, len: [1.15, 4.8, 21], wid: [0.5, 1.8, 6.2], cells: [CELL.DAB, CELL.HEAVY, CELL.COMMA, CELL.COMMA_S, CELL.DAB, CELL.BLOCK],
      discs: [[0, 22, 62], [50, 86, 62], [-58, 84, 48], [34, -44, 46], [-62, -42, 50], [-12, -40, 40], [96, 30, 40]] });
    for (let i = 0; i < 3; i++) T.push(() => paintSky(W, { n: 5200 }));
    const leaf = (r, t) => jit(mixc(hex('#3f6e3c'), hex('#84a84e'), r() * (0.35 + 0.65 * t)), 0.05, r);
    const leafB = (r, t) => jit(mixc(hex('#3a6850'), hex('#6c9c70'), r() * t), 0.04, r);
    // the far bank: deep green below and within, olive and yellow green where the crowns take the light
    const leafD = (r, t) => jit(mixc(hex('#26442e'), hex('#84904a'), Math.pow(r(), 1.5) * (0.2 + 0.8 * t)), 0.05, r);
    const leafDB = (r, t) => jit(mixc(hex('#22424a'), hex('#547a5c'), Math.pow(r(), 1.5) * (0.2 + 0.8 * t)), 0.04, r);
    // the trees of the autumn picture: green and gold in summer, and in autumn the season turns them to flame
    const leafF = (r, t) => jit(mixc(hex('#6c8438'), hex('#b0ae4a'), r() * (0.4 + 0.6 * t)), 0.05, r);
    // the dark line of trees on the ridge above the poppies
    const leafR = (r, t) => jit(mixc(hex('#22382a'), hex('#46623a'), r() * (0.25 + 0.75 * t)), 0.04, r);
    const bark = pal(['#5a4a40', '#6a584a', '#4a3e38'], 0.04), barkP = pal(['#6a5a68', '#7a6672', '#5a4e60'], 0.04);
    // a tree as one mass of foliage: a crown r wide on a trunk h high, o.n dabs of o.size. No trunk when h is 0.
    // o.heart is the size of the solid heart of the crown (0 for none): kept small where the tree is seen from close by, so that it never shows as a flat shape
    const mass = (x, z, r, h, lf, o) => {
      o = o || {};
      const y = W.h(x, z), ry = o.ry || r * 0.8, ck = o.heart === undefined ? 0.58 : o.heart;
      if (h > 0.5) trunk(W, x, y, z, h + ry * 0.4, r * 0.045 + 0.1, o.bark || bark, [(rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5]);
      if (ck > 0) blobSolid(W, x, y + h + ry * 0.6, z, r * ck, ry * ck, r * ck, o.core || hex('#3a5e38'), 1);
      leafCloud(W, x, y + h + ry * 0.6, z, { n: o.n || Math.round(60 + r * 30), rx: r, ry, rz: r, size: o.size || r * 0.16, col: lf, aspect: o.aspect });
      if (!o.free) { W.caster({ k: 'ball', x, z, y: h + ry * 0.6, r: r * 0.95, v: 0.8 }); if (h > 0.5) W.collide(x, z, 0.6); }
    };
    // a standing figure in a score of touches, kept whole when the strokes are thinned.
    // o: dress, top, hat, band, parasol (colours), s (size), from (the easel's view she is painted for: the parasol is turned to it)
    const figure = (x, z, yaw, o) => {
      const s = o.s || 1, y = W.h(x, z);
      // with the living layer on (FOLK.live) she is not painted here: she goes on the world's list, W.folk, with the very colours and
      // seeds she would have had (the same draws of chance either way), and that layer draws her every frame, at this mark whenever a picture is taken
      const rec = typeof FOLK !== 'undefined' && FOLK.live ? { kind: 'figure', x, y, z, yaw, s, o, cols: [], seeds: [] } : null;
      const B = rec ? { add(...a) { rec.cols.push(a[11]); rec.seeds.push(S.rnd()); }, bill() { rec.seeds.push(S.rnd()); } } : S;
      if (rec) (W.folk || (W.folk = [])).push(rec);
      const k0 = S.n;
      for (let i = 0; i < 7; i++) { const a = yaw + i * 0.898, c = Math.cos(a), sn = Math.sin(a); B.add(x + c * 0.2 * s, y + 0.5 * s, z + sn * 0.2 * s, -c * 0.3, 1, -sn * 0.3, c, 0.3, sn, 1.04 * s, 0.4 * s, jit(o.dress, 0.05, rnd), 0.05, CELL.BLADE, 0, 0); }
      B.add(x, y + 0.76 * s, z, 0, 1, 0, 1, 0, 0, 0.74 * s, 0.42 * s, jit(o.dress, 0.04, rnd), 0, CELL.DAB, 0, FLAG_AXIAL);
      B.add(x, y + 1.2 * s, z, 0, 1, 0, 1, 0, 0, 0.56 * s, 0.36 * s, jit(o.top || o.dress, 0.04, rnd), 0, CELL.DAB, 0, FLAG_AXIAL);
      B.bill(x, y + 1.54 * s, z, 0, 0.21 * s, 0.2 * s, [0.84, 0.66, 0.54], 0, CELL.DOT, 0, false, 0, 1, 0, 0);
      B.bill(x, y + 1.67 * s, z, 0, 0.46 * s, 0.15 * s, o.hat || [0.85, 0.75, 0.45], 0, CELL.DAB, 0, false, 0, 1, 0, 0);
      if (o.band) B.bill(x, y + 1.63 * s, z, 0, 0.3 * s, 0.06 * s, o.band, 0, CELL.DAB, 0, false, 0, 1, 0, 0);
      if (o.parasol) { // over the shoulder: one round touch turned to the painter, a lighter one across its top
        const v = o.from, tl = Math.hypot(v.x - x, v.z - z) || 1, lx = -(v.z - z) / tl, lz = (v.x - x) / tl;
        const ax = x + lx * 0.5 * s, az = z + lz * 0.5 * s, ay = y + 1.72 * s;
        B.add((x + ax) / 2, y + 1.5 * s, (z + az) / 2, ax - x, 0.5 * s, az - z, 0, 1, 0, 0.7 * s, 0.03, [0.3, 0.26, 0.2], 0, CELL.LONG_B, 0, FLAG_AXIAL);
        const c1 = jit(o.parasol, 0.04, rnd);
        B.bill(ax, ay, az, 0.35, 0.92 * s, 0.68 * s, c1, 0, CELL.DOT, 0, false, 0, 1, 0, 0);
        const c2 = jit(mixc(o.parasol, [0.86, 0.9, 0.92], 0.45), 0.04, rnd);
        B.bill(ax - lx * 0.05 * s, ay + 0.13 * s, az - lz * 0.05 * s, 0.35, 0.56 * s, 0.24 * s, c2, 0, CELL.DAB, 0, false, 0, 1, 0, 0);
        if (rec) rec.cols.push(c1, c2);
      }
      S.mark(k0);
    };

    // ----- the poppy field -----
    // the flowers: thick and small up the bank, larger and fewer at the painter's feet, a stray one here and there in the grass
    const red = pal(['#b8200f', '#c82a14', '#a81c10', '#d23a1e', '#be2a1c'], 0.04);
    T.push(() => flowers(W, { x0: 26, x1: 112, z0: 60, z1: 132, step: 0.66, h: 0.42, size: 0.25, glow: 0.08, col: red,
      mask: (x, z) => {
        if (!inField(x, z)) return 0;
        if (!inBand(x, z, 0.06 * (vnoise(x * 0.2, z * 0.2, 306) - 0.5))) return 0.01;
        return along(V1, x, z) < 15 ? 0 : 0.8 * (0.45 + 0.55 * sstep(0.3, 0.6, vnoise(x * 0.07, z * 0.07, 306)));
      } }));
    T.push(() => flowers(W, { x0: 30, x1: 50, z0: 62, z1: 80, step: 0.42, h: 0.36, size: 0.2, glow: 0.08, col: red,
      mask: (x, z) => (along(V1, x, z) < 15 && inBand(x, z, 0.08 * (vnoise(x * 0.3, z * 0.3, 306) - 0.5)) ? 0.6 + 0.4 * sstep(0.35, 0.6, vnoise(x * 0.35, z * 0.35, 308)) : 0) }));
    // grass over the meadows, lower in the field. Under the two easels it is left out here and painted closely below
    T.push(() => paintCrop(W, { x0: -130, x1: 130, z0: -38, z1: 160, step: 1.9, h: 0.5, w: 0.085, cluster: 3, spread: 0.24, lean: 0.55,
      size: (x, z) => (zone(x, z) === 'field' ? 0.7 : 1),
      mask: (x, z) => { const zn = zone(x, z); return (zn !== 'field' && zn !== 'meadow' && zn !== 'ridge') || nearV1(x, z) || nearV2(x, z) ? 0 : 0.6; },
      col: (x, z, r) => { const zn = zone(x, z); if (RECOL[zn]) { const L = landAt(x, z); if (L) { if (zn === 'field') r(); return L.p(r); } } return zn === 'field' ? P[fieldKind(x, z, (r() - 0.5) * 0.1)](r) : P[zn](r); } }));
    T.push(() => paintCrop(W, { x0: 12, x1: 74, z0: 60, z1: 104, step: 0.8, h: 0.3, w: 0.1, cluster: 2, spread: 0.32, lean: 0.95, sway: 0.25, cells: [CELL.COMMA, CELL.COMMA_S, CELL.DAB, CELL.HEAVY, CELL.BLADE],
      mask: (x, z) => (nearV1(x, z) && inField(x, z) ? 0.85 : 0),
      col: (x, z, r) => (r() < 0.14 ? jit(hex('#5c6c44'), 0.05, r) : P[fieldKind(x, z, (r() - 0.5) * 0.1)](r)) }));
    T.push(() => flowers(W, { x0: -130, x1: 130, z0: -36, z1: 150, step: 2.3, h: 0.45, size: 0.17, mask: (x, z) => ((zone(x, z) === 'meadow' || zone(x, z) === 'ridge') && !nearV2(x, z) ? 0.5 : 0), col: pal(['#f6f0e4', '#f2d048', '#ffffff', '#e8b8d0', '#b8a0e0'], 0.04, [3, 3, 2, 1, 1]) }));
    // the skyline of the picture: a dark line of trees where the bank meets the sky, one of them taller, a house among them, and the walkers
    T.push(() => {
      const r2 = mulberry32(3301), eye = W.h(V1.x, V1.z) + V1.y, tx = 1.29 * Math.tan((V1.fov * DEG) / 2);
      // where the land ends against the sky for a place px across the picture (0 left, 1 right): [x, z, dx, dz]
      const crest = (px) => {
        const az = V1.yaw + Math.atan((px - 0.5) * 2 * tx), dx = Math.sin(az), dz = -Math.cos(az);
        let br = 60, be = -9;
        for (let r = 25; r < 150; r += 1.5) { const e = (W.h(V1.x + dx * r, V1.z + dz * r) - eye) / r; if (e > be) { be = e; br = r; } }
        return [V1.x + dx * br, V1.z + dz * br, dx, dz];
      };
      const onSky = (px, back, r, h, o) => { const c = crest(px); mass(c[0] + c[2] * back, c[1] + c[3] * back, r, h, leafR, Object.assign({ core: hex('#2c4832') }, o)); };
      for (const px of [0.02, 0.06, 0.1, 0.14, 0.185]) onSky(px, 3 + r2() * 5, 3 + r2() * 1.2, 1.6 + r2() * 1.4, { n: 110, size: 0.85 });
      onSky(0.335, 5, 3.9, 3.6, { n: 300, size: 0.9, ry: 5.6, bark: pal(['#3a3430', '#463c36'], 0.03) });
      onSky(0.29, 7, 2.6, 1.2, { n: 80, size: 0.8 });
      for (let px = 0.425; px < 1.0; px += 0.05) { if (Math.abs(px - 0.585) < 0.03) continue; onSky(px + (r2() - 0.5) * 0.015, 3 + r2() * 7, 2.7 + r2() * 0.9, 1.4 + r2() * 1.2, { n: 90, size: 0.85 }); }
      const hc = crest(0.585);
      house(W, { x: hc[0] + hc[2] * 14, z: hc[1] + hc[3] * 14, w: 5.4, d: 4.4, h: 3.2, rh: 2.0, yaw: V1.yaw, wall: pal(['#e6dcc4', '#dacfb6', '#eee6d2'], 0.03), wallBase: hex('#e0d6be'), roof: pal(['#b8705c', '#c07c66', '#a86654'], 0.04), roofBase: hex('#b47060'),
        windows: [{ side: -1, u: 0.3, v: 0.6 }, { side: -1, u: 0.7, v: 0.6 }], win: pal(['#56687c'], 0.03), door: pal(['#56687c'], 0.03), step: 0.8, len: 1.6, wid: 0.55 });
      // the mother and child in the grass before the painter, and the second pair coming over the bank
      figure(33.65, 68.7, 1.4, { dress: hex('#6a7088'), top: hex('#363e54'), hat: hex('#e2d29a'), band: hex('#3a3a44'), parasol: hex('#35606c'), s: 1.06, from: V1 });
      figure(34.55, 67.8, 1.9, { dress: hex('#efe8d6'), top: hex('#e2dac6'), hat: hex('#e8d8a0'), band: hex('#8a4a3a'), s: 0.64 });
      figure(56.8, 83.4, 1.2, { dress: hex('#343e58'), top: hex('#2a3248'), hat: hex('#e6d49a'), parasol: hex('#3f6f7c'), s: 1.22, from: V1 });
      figure(55.8, 84.4, 1.2, { dress: hex('#f0e9d8'), hat: hex('#e8d8a0'), s: 0.76 });
    });

    // ----- the ridge of the woman with the parasol -----
    // the grass is short and thick below the eye and tall and dark along the crest, with yellow flowers through it; the child stands half hidden behind it
    T.push(() => {
      const grass = pal(['#3d6a2e', '#4d7c32', '#5f8c36', '#7a9a3a', '#98a640', '#b4b24c', '#35604a', '#2e5648'], 0.05, [3, 4, 4, 3, 3, 2, 2, 1]);
      const inV = (x, z) => { const a = along(V2, x, z); return a > 1.4 && a < 17 && Math.abs(across(V2, x, z)) < 0.36 * a + 2; };
      const tufts = [CELL.COMMA, CELL.COMMA_S, CELL.BLADE, CELL.HEAVY, CELL.LONG_A];
      const gold = pal(['#f0d020', '#f6dc3a', '#e6c018', '#fae868'], 0.04), sunlit = pal(['#7e9634', '#8ea23a', '#9aa63e', '#6e8a30'], 0.05);
      paintCrop(W, { x0: -80, x1: -48, z0: 82, z1: 106, step: 0.4, h: 0.3, w: 0.11, cluster: 3, spread: 0.22, lean: 1.1, sway: 0.4, cells: tufts,
        size: (x, z) => 0.34 + 0.75 * sstep(4, 10, along(V2, x, z)),
        mask: (x, z) => (inV(x, z) ? 0.62 : 0),
        col: (x, z, r) => (inShade(x, z, r()) ? P.shade(r) : grass(r)) });
      // the tall weeds of the crest, dark against the sky
      paintCrop(W, { x0: -80, x1: -48, z0: 88, z1: 106, step: 0.5, h: 0.46, w: 0.12, cluster: 2, spread: 0.3, lean: 0.9, sway: 0.5, cells: tufts,
        mask: (x, z) => (inV(x, z) && along(V2, x, z) > 8.6 && Math.hypot(x + 62, z - 95.5) > 0.9 ? 0.36 : 0),
        col: (x, z, r) => (inShade(x, z, r()) ? P.shade(r) : r() < 0.16 ? sunlit(r) : grass(r)) });
      // yellow flowers at the height of the grass tops. They count as ground, so that the light behind them does not bleach them to white
      for (const b of [[3.4, 5.2, 0.19, 0.036], [5.2, 7.2, 0.27, 0.048], [7.2, 9.4, 0.42, 0.06], [9.4, 12.5, 0.56, 0.07]]) for (let z = 82; z < 106; z += 0.36) for (let x = -80; x < -48; x += 0.36) {
        const px = x + rnd() * 0.36, pz = z + rnd() * 0.36, a = along(V2, px, pz);
        if (a <= b[0] || a > b[1] || !inV(px, pz) || inShade(px, pz, 0.5) || rnd() > 0.8) continue;
        const sz = b[3] * (0.7 + rnd() * 0.7);
        S.bill(px, W.h(px, pz) + b[2] * (0.7 + rnd() * 0.6), pz, rnd() * 3, sz * 1.45, sz * 0.9, gold(rnd), 0.25, [CELL.DAB, CELL.COMMA, CELL.COMMA_S, CELL.DOT][(rnd() * 4) | 0], 0.06, false, 0, 0.6, 0, FLAG_FLOWER | FLAG_GROUND);
      }
      figure(-59.2, 96.1, 1.2, { dress: hex('#f2eee2'), top: hex('#ece6d8'), hat: hex('#e6d59a'), band: hex('#5a4a40'), s: 0.72 });
    });

    // ----- the banks -----
    T.push(() => {
      const r2 = mulberry32(3302);
      // the south bank below the easels: a wall of foliage that comes down to the water, the great left hand mass of the autumn picture
      for (let x = -89; x > -234; x -= 6 + r2() * 3) {
        const k = sstep(-95, -215, x);
        mass(x, riverZ(x) + HALF + 2.8 + r2() * 2.4, 4.8 + r2() * 1.8, 2.2 + r2() * 1.6, leafF, { n: Math.round((500 - 220 * sstep(-90, -125, x)) * (1 - 0.5 * k)), size: 0.46 + 0.64 * k, aspect: 1.55, heart: x > -112 ? 0 : 0.42 });
      }
      for (let x = -94; x > -238; x -= 7 + r2() * 4) {
        const k = sstep(-95, -215, x);
        mass(x, riverZ(x) + HALF + 13 + r2() * 6, 5.6 + r2() * 2, 7 + r2() * 4, leafF, { n: Math.round((430 - 190 * sstep(-94, -130, x)) * (1 - 0.5 * k)), size: 0.54 + 0.68 * k, aspect: 1.55, heart: x > -112 ? 0 : 0.42 });
      }
      for (let x = -86; x > -200; x -= 3.6 + r2() * 2.4) { const k = sstep(-95, -200, x); mass(x, riverZ(x) + HALF + 1.35 + r2() * 0.7, 2.5 + r2() * 1.3, 0, leafF, { n: Math.round(86 - 40 * k), size: 0.42 + 0.5 * k, ry: 2.2, free: true, heart: 0.4 }); }
      for (let x = -246; x > -452; x -= 12 + r2() * 9) mass(x, riverZ(x) + HALF + 5 + r2() * 9, 6 + r2() * 3, 4 + r2() * 4, leafF, { n: 44, size: 2.1, free: true });
      // the islet: poplars at its head, low growth along it, ivy dark at their feet
      [[-100, -85.5, 20], [-105.5, -87.5, 23], [-111, -84.5, 25.5], [-116.5, -87, 23.5], [-121.5, -85, 19.5]].forEach((q) => mass(q[0], q[1], 3.4, q[2] * 0.18, leafF, { ry: q[2] * 0.5, n: 330, size: 0.74, bark: barkP, free: true }));
      leafCloud(W, -119, W.h(-119, -85) + 6.5, -84.4, { n: 120, rx: 5, ry: 7.5, rz: 2.4, size: 0.6, col: (r) => jit(mixc(hex('#2c4e52'), hex('#3f6a58'), r()), 0.04, r), flags: 0 });
      for (let x = -97; x > -139; x -= 4.4 + r2() * 2.6) mass(x, -86 + (r2() - 0.5) * 6, 2.6 + r2() * 1.8, r2() * 1.6, leafF, { n: 90, size: 0.6, ry: 2.4, free: true });
      for (let x = -96; x > -140; x -= 3 + r2() * 1.6) mass(x, -78.8 - 5 * (((x + 118) / 23) ** 2) - r2() * 0.8, 2 + r2() * 0.9, 0, leafF, { n: 56, size: 0.56, ry: 1.7, free: true });
      // the south bank upstream, open, with a tree here and there
      for (let x = -40; x < 250; x += 16 + r2() * 22) {
        if (Math.abs(x - 78) < 22) continue;
        const z = riverZ(x) + HALF + 9 + r2() * 6;
        if (pathDist(x, z, PATH) < 3 || pathDist(x, z, PATH2) < 4 || Math.hypot(x - 29, z + 48) < 17) continue;
        roundTree(W, x, z, 3.2 + r2() * 2.4, 2.6 + r2() * 2, leaf, bark, hex('#3a5e38'));
      }
      // the far bank opposite the easels: one long dark mass, low at the water and tall behind, with a house showing through it
      const tall = (x) => (x < 14 ? sstep(-62, -40, x) : 0.45 + 0.25 * r2());
      for (let x = -90; x < 110; x += 5.6 + r2() * 2) {
        if (Math.abs(x - 78) < 6 || Math.abs(x + 63) < 6.5 || Math.abs(x - 31.5) < 7) continue;
        const t = tall(x), r = 4.6 + r2() * 1.6 + 0.8 * t;
        mass(x, riverZ(x) - HALF - 3.4 - r2() * 3, r, 0.4 + r2() * 0.8 + 1.2 * t, r2() < 0.65 ? leafD : leafDB, { n: 140, size: 1.2, ry: r * 0.95, core: hex('#2a4432'), free: true });
      }
      for (let x = -86; x < 112; x += 7.4 + r2() * 3) {
        if (Math.abs(x - 78) < 5) continue;
        const t = tall(x), behind = Math.abs(x + 63) < 7 || Math.abs(x - 31.5) < 7.5 ? 7 : 0;
        mass(x, riverZ(x) - HALF - 12.5 - behind - r2() * 6, 6.2 + r2() * 1.8, 2.5 + 8.5 * t + r2() * 2.5, r2() < 0.65 ? leafD : leafDB, { n: 170, size: 1.35, core: hex('#2a4432'), free: true });
      }
      house(W, { x: 31.5, z: -142, w: 10, d: 7, h: 5.4, rh: 2.6, yaw: 0.04, wall: pal(['#e0c070', '#d6b464', '#e8cc80', '#d2ae62'], 0.03), wallBase: hex('#dcbc6e'), roof: pal(['#8e90a4', '#9c9cae', '#807f98'], 0.03), roofBase: hex('#8c8ea2'),
        windows: [{ side: 1, u: 0.25, v: 0.62, w: 0.8, h: 1.1 }, { side: 1, u: 0.75, v: 0.62, w: 0.8, h: 1.1 }], win: pal(['#6a7078'], 0.03), door: pal(['#6a7078'], 0.03), step: 0.8, len: 1.6, wid: 0.55 });
      house(W, { x: -63, z: -143, w: 9, d: 6.5, h: 5, rh: 2.6, yaw: -0.08, wall: pal(['#d9d6cc', '#cfd0d0', '#e2ddd0'], 0.03), wallBase: hex('#d6d3ca'), roof: pal(['#7f869a', '#8c92a4', '#a08a88'], 0.04), roofBase: hex('#828a9c'),
        windows: [{ side: 1, u: 0.3, v: 0.6 }, { side: 1, u: 0.7, v: 0.6 }], win: pal(['#4e5a6a'], 0.03), door: pal(['#4e5a6a'], 0.03), step: 0.8, len: 1.6, wid: 0.55 });
      // poplars and round trees along the rest of the far bank, and here and there over the meadows
      for (let x = -300; x < 300; x += 8 + r2() * 9) {
        if (Math.abs(x - 78) < 12 || (x > -94 && x < 114)) continue;
        const z = riverZ(x) - HALF - 5 - r2() * 16;
        if (r2() < 0.45) poplar(W, x, z, 16 + r2() * 8, leafB, barkP, { from: 0.22, rad: 1.7, n: 130, shaft: 0.16 });
        else roundTree(W, x, z, 4 + r2() * 3, 2.4 + r2() * 2, r2() < 0.5 ? leaf : leafB, bark, hex('#3a6048'), 150);
      }
      for (let i = 0; i < 34; i++) { const a = r2() * TAU, rr = 150 + r2() * 100, x = Math.cos(a) * rr, z = 30 + Math.sin(a) * rr; if (z < riverZ(x) + HALF + 20 || inField(x, z) || slope(x, z) > 0.5 || ridge(x, z) > 0.2) continue; roundTree(W, x, z, 3.4 + r2() * 3, 2.4 + r2() * 2, leaf, bark, hex('#3a5e38'), 140); }
      // Argenteuil across the water: pale houses and a spire, blue with distance
      const wall = pal(['#dcd8d0', '#cfd0d4', '#e6dfd2', '#c8ccd6'], 0.03), roof = pal(['#8a94a8', '#9aa0b0', '#b08a80', '#7a88a0'], 0.04), win = pal(['#5a6a7e'], 0.03);
      for (let i = 0; i < 10; i++) {
        const x = -236 + i * 15 + r2() * 6, z = riverZ(x) - HALF - 26 - r2() * 26;
        house(W, { x, z, w: 9 + r2() * 5, d: 6, h: 4 + r2() * 3, rh: 2.6 + r2(), yaw: (r2() - 0.5) * 0.5, wall, wallBase: hex('#d8d4cc'), roof, roofBase: hex('#8c96a8'), windows: [{ side: 1, u: 0.3, v: 0.6 }, { side: 1, u: 0.7, v: 0.6 }], win, door: win, step: 0.9, len: 1.8, wid: 0.6 });
      }
      const sx = -168, sz = riverZ(-168) - HALF - 44;
      box(W, { x: sx, z: sz, w: 5, d: 5, y0: W.h(sx, sz) - 0.3, h: 15, wall, base: hex('#d4d0c8'), step: 0.9, len: 1.8, wid: 0.6 });
      pyramid(W, { x: sx, z: sz, w: 5.4, d: 5.4, y: W.h(sx, sz) + 14.6, h: 13, roof, base: hex('#8a94a8'), step: 0.9, len: 1.9, wid: 0.55 });
      W.caster({ k: 'pole', x: sx, z: sz, h: 22, r: 2.4 });
      // and the town again where the reach ends, as the autumn picture sees it down the water: a low pale line of walls and one spire, half lost in the air
      const wallF = pal(['#e2e2e4', '#d2d6de', '#ebe6dc', '#c6ccd8'], 0.03), roofF = pal(['#7e8aa4', '#8c96ae', '#a08a8a', '#72809c'], 0.04);
      [[-474, -90], [-480, -104], [-474, -124], [-466, -138], [-450, -150], [-430, -158], [-408, -160], [-386, -158], [-362, -158], [-338, -158], [-314, -156], [-292, -154]].forEach((p, i) => {
        house(W, { x: p[0] + (r2() - 0.5) * 6, z: p[1] - r2() * 8, w: 11 + r2() * 8, d: 8, h: 5 + r2() * 4, rh: 3 + r2() * 1.5, yaw: i < 4 ? 1.5 + (r2() - 0.5) * 0.4 : (r2() - 0.5) * 0.4, wall: wallF, wallBase: hex('#dcdcde'), roof: roofF, roofBase: hex('#9aa2b2'), step: 2.3, len: 4.2, wid: 1.6 });
      });
      box(W, { x: -483, z: -113, w: 4.6, d: 4.6, y0: W.h(-483, -113) - 0.3, h: 11.5, wall: wallF, base: hex('#d0d2da'), step: 2, len: 3.6, wid: 1.4 });
      pyramid(W, { x: -483, z: -113, w: 5, d: 5, y: W.h(-483, -113) + 11, h: 11, roof: pal(['#5e6c8a', '#6a7896', '#54627e'], 0.03), base: hex('#5e6c8a'), step: 2, len: 3.6, wid: 1.2 });
    });

    // ----- the road bridge: stone piers standing in their own reflections, the arches dark between them, a toll house at either end -----
    T.push(() => {
      const stone = pal(['#e9e0c8', '#dfd6bf', '#f1e9d4', '#d6d0c2', '#e4d8c2', '#cfcfd0'], 0.03), flank = pal(['#b4b2ae', '#a6a7ab', '#c0bcb0', '#9c9fac', '#aeaaa2', '#b8b0a8'], 0.03);
      const under = pal(['#4c5c62', '#3f5058', '#58665e', '#46545e'], 0.04), iron = pal(['#6f7c8a', '#7f8a96', '#5f6c7c'], 0.03);
      const bx = 78, z0 = -48, z1 = -140, span = 11.5, hw = 3.9, ySpring = WATER_Y + 3.4, yDeck = WATER_Y + 7.1, yTop = yDeck + 1.25, dabs = [CELL.DAB, CELL.HEAVY, CELL.COMMA, CELL.COMMA_S, CELL.BLOCK];
      for (let k = 1; k < 8; k++) box(W, { x: bx, z: z0 - k * span, w: 8.8, d: 2.6, y0: WATER_Y - 2.5, h: ySpring + 2.9 - WATER_Y, wall: stone, base: hex('#ddd4c0'), step: 0.7, len: 1.1, wid: 0.5, wobble: 0.004, jit: 1.4, cells: dabs });
      for (let k = 0; k < 8; k++) {
        const za = z0 - k * span - (k ? 1.3 : 0), zb = z0 - (k + 1) * span + (k < 7 ? 1.3 : 0), n = 6;
        const arc = (u) => ySpring + (yDeck - 0.5 - ySpring) * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2));
        for (let i = 0; i < n; i++) {
          const zA = lerp(za, zb, i / n), zB = lerp(za, zb, (i + 1) / n), yA = arc(i / n), yB = arc((i + 1) / n);
          // the two flanks above the curve of the vault
          let a = [bx - hw, yB, zB], b = [bx - hw, yA, zA], c = [bx - hw, yDeck, zA], d = [bx - hw, yDeck, zB];
          W.quad(a, b, c, d, hex('#aeaca8')); paintQuad(W, a, b, c, d, { step: 0.62, len: 1.0, wid: 0.46, along: 'u', col: flank, jit: 1.3, cells: dabs });
          a = [bx + hw, yA, zA]; b = [bx + hw, yB, zB]; c = [bx + hw, yDeck, zB]; d = [bx + hw, yDeck, zA];
          W.quad(a, b, c, d, hex('#aeaca8')); paintQuad(W, a, b, c, d, { step: 0.62, len: 1.0, wid: 0.46, along: 'u', col: flank, jit: 1.3, cells: dabs });
          // the underside
          a = [bx + hw, yA, zA]; b = [bx - hw, yA, zA]; c = [bx - hw, yB, zB]; d = [bx + hw, yB, zB];
          W.quad(a, b, c, d, hex('#44545a')); paintQuad(W, a, b, c, d, { step: 1.15, len: 1.9, wid: 0.75, along: 'u', col: under, jit: 0.6 });
        }
      }
      box(W, { x: bx, z: (z0 + z1) / 2, w: hw * 2 + 0.3, d: z0 - z1, y0: yDeck, h: yTop - yDeck, wall: flank, base: hex('#b2b0ac'), step: 0.7, len: 1.5, wid: 0.44, along: 'u', wobble: 0, weave: 0 });
      for (const sx of [-hw, hw]) for (let z = z0; z > z1; z -= 2.3) {
        S.add(bx + sx, yTop + 0.5, z, 0, 1, 0, 1, 0, 0, 1.05, 0.12, iron(rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL);
        for (let r = 0; r < 2; r++) S.add(bx + sx, yTop + 0.45 + r * 0.5, z - 1.15, 0, 0, 1, sx > 0 ? 1 : -1, 0, 0, 2.6, 0.1, iron(rnd), 0, CELL.LONG_B, 0, 0);
      }
      W.caster({ k: 'box', pts: [[bx - hw, z0], [bx + hw, z0], [bx + hw, z1], [bx - hw, z1]], h: 8.6, v: 0.7 });
      // The roadway. (The deck was a box of four walls open to the sky: seen from the air one looked down into the arches.) It lies level
      // with the tops of the two embankments, which it covers as well, and it holds her when she comes down on it (W.roof)
      {
        const gravel = pal(['#d6cdb8', '#cbc2ae', '#dfd7c4', '#bfb8a8', '#c9bda6'], 0.03), yR = yDeck + 0.42;
        const lay = (x0, x1, za, zb, y) => { const a = [x0, y, za], b = [x1, y, za], c = [x1, y, zb], d = [x0, y, zb];
          W.quad(a, b, c, d, hex('#cdc5b2')); W.quad(d, c, b, a, hex('#cdc5b2')); paintQuad(W, a, b, c, d, { step: 0.85, len: 1.5, wid: 0.55, along: 'v', col: gravel, jit: 0.9 }); };
        lay(bx - hw, bx + hw, -40, -146, yR);
        lay(bx - 4.6, bx + 4.6, -40, -49, yR - 0.01); lay(bx - 4.6, bx + 4.6, -139, -146, yR - 0.01);
        W.roof = (x, z) => (Math.abs(x - bx) < hw - 0.25 && z < -40.3 && z > -145.7 ? yR + 0.04 : null);
      }
      // embankments under the two ends of the deck
      box(W, { x: bx, z: -44.5, w: 9, d: 9, y0: W.h(bx, -44) - 0.4, h: yDeck + 0.4 - W.h(bx, -44), wall: stone, base: hex('#d8d0c0'), step: 0.7, len: 1.4, wid: 0.46 });
      box(W, { x: bx, z: -142.5, w: 9, d: 7, y0: W.h(bx, -142) - 0.4, h: yDeck + 0.4 - W.h(bx, -142), wall: stone, base: hex('#d8d0c0'), step: 0.7, len: 1.4, wid: 0.46 });
      const toll = { wall: pal(['#f0e8d6', '#e6dcc6', '#f6f0e2'], 0.03), wallBase: hex('#ece2ce'), roof: pal(['#9aa2b0', '#8a94a6', '#a8aeb8'], 0.03), roofBase: hex('#929cac'), win: pal(['#4e6074'], 0.03), door: pal(['#4e6074'], 0.03), hip: true, step: 0.6, len: 1.3, wid: 0.44 };
      house(W, Object.assign({ x: bx + 9, z: -41, w: 7, d: 6, h: 5.4, rh: 2.6, yaw: 0, windows: [{ side: 1, u: 0.3, v: 0.55 }, { side: 1, u: 0.7, v: 0.55 }, { side: -2, u: 0.5, v: 0.55 }] }, toll));
      for (const sx of [-8, 8]) house(W, Object.assign({ x: bx + sx, z: -141.4, w: 6.8, d: 6.2, h: yDeck + 3.5 - W.h(bx + sx, -141.4), rh: 3.4, yaw: 0, windows: [{ side: 1, u: 0.5, v: 0.6, w: 1.2, h: 2.2 }, { side: -2, u: 0.5, v: 0.6, w: 1.2, h: 2.2 }] }, toll, { wall: pal(['#e6d2a0', '#dcc690', '#eedcb0', '#d8c08c'], 0.03), wallBase: hex('#e2ce9c') }));
    });

    // ----- boats: two at their moorings below the bridge, a few sails on the stream, a skiff or two, and the floating studio -----
    T.push(() => {
      // a hull on the water: a long box with a pointed bow and a deck
      const hull = (x, z, yaw, L, B, y0, y1, bow, wall, base, deck, deckBase) => {
        const top = box(W, { x, z, w: L, d: B, y0, h: y1 - y0, yaw, wall, base, step: 0.3, len: 0.62, wid: 0.24, wobble: 0, weave: 0, jit: 0.5 });
        const p = (lx, lz, y) => { const q = rotXZ(x, z, lx, lz, yaw); return [q[0], y, q[1]]; };
        const a0 = p(L / 2, B / 2, y0), a1 = p(L / 2, B / 2, y1), b0 = p(L / 2, -B / 2, y0), b1 = p(L / 2, -B / 2, y1), t0 = p(L / 2 + bow, 0, y0), t1 = p(L / 2 + bow, 0, y1 + 0.12);
        W.quad(a0, t0, t1, a1, base); paintQuad(W, a0, t0, t1, a1, { step: 0.3, len: 0.56, wid: 0.24, along: 'u', col: wall, jit: 0.5 });
        W.quad(t0, b0, b1, t1, base); paintQuad(W, t0, b0, b1, t1, { step: 0.3, len: 0.56, wid: 0.24, along: 'u', col: wall, jit: 0.5 });
        W.quad(top[0], top[1], top[2], top[3], deckBase); W.tri(a1, b1, t1, deckBase);
        paintQuad(W, top[3], top[0], top[1], top[2], { step: 0.5, len: 0.8, wid: 0.3, along: 'u', col: deck, lift: 0.04 });
        return p;
      };
      const line = (a, b, wid, c, cell) => S.add((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, b[0] - a[0], b[1] - a[1], b[2] - a[2], 1, 0, 0, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), wid, c, 0, cell, 0, FLAG_AXIAL);
      // a sailing boat at her mooring: a white hull, the mast bare, the sail rolled along its boom
      const white = pal(['#f6f1e4', '#ece5d2', '#fffaf0', '#dcd8d0', '#e6dec8'], 0.03), cream = pal(['#d2b46c', '#c8a85e', '#dcc07c', '#c4a468'], 0.03), canvas = pal(['#f2ead6', '#e8dfc6', '#faf4e4'], 0.03);
      const moored = (x, z, yaw, s) => {
        const kf = S.n;
        const y1 = WATER_Y + 0.4 + 0.5 * s, L = 5.0 * s, p = hull(x, z, yaw, L, 1.5 * s, WATER_Y - 0.25, y1, 1.0 * s, white, hex('#e8e1d0'), cream, hex('#cdb06a'));
        const top = WATER_Y + 5.7 * s, m = p(0.9 * s, 0, y1), k0 = S.n;
        line(p(-L / 2, 0.78 * s, WATER_Y + 0.06), p(L / 2 + 0.6 * s, 0.4 * s, WATER_Y + 0.06), 0.13, [0.36, 0.4, 0.52], CELL.LONG_A);   // the shadow she lays on the water
        line(p(-L / 2, 0.75 * s, y1 + 0.02), p(L / 2, 0.75 * s, y1 + 0.02), 0.07, [0.74, 0.62, 0.38], CELL.LONG_B);                     // the gunwale
        { const w = p(-1.15 * s, 0, y1 + 0.06); S.add(w[0], w[1], w[2], Math.cos(yaw), 0, Math.sin(yaw), 0, 1, 0, 1.9 * s, 0.72 * s, [0.34, 0.38, 0.46], 0, CELL.BLOCK, 0, FLAG_FLAT); }   // the well
        line(m, [m[0] + 0.06, top, m[2]], 0.17 * s, [0.74, 0.6, 0.33], CELL.HEAVY);
        line(p(0.75 * s, 0, y1 + 0.5 * s), p(-2.2 * s, 0, y1 + 0.7 * s), 0.08 * s, [0.6, 0.48, 0.3], CELL.LONG_B);
        line(p(0.6 * s, 0, y1 + 0.66 * s), p(-2.1 * s, 0, y1 + 0.88 * s), 0.27 * s, canvas(rnd), CELL.LONG_A);
        line([m[0], top - 0.15, m[2]], p(L / 2 + 0.95 * s, 0, y1 + 0.15), 0.05 * s, [0.5, 0.44, 0.34], CELL.LONG_B);
        line([m[0], top - 0.5, m[2]], p(-L / 2 + 0.1, 0, y1 + 0.1), 0.045 * s, [0.5, 0.44, 0.34], CELL.LONG_B);
        S.mark(k0);
        if (S.float) S.float(kf);
        W.collide(x, z, 2 * s);
      };
      moored(30.5, -68.4, 0.06, 0.88);
      moored(31.5, -70.6, -0.05, 0.92);
      const hullP = pal(['#f4f0e6', '#e8e2d4', '#c8ccd4', '#fffaf0'], 0.03), sail = pal(['#fbf6ea', '#f2ecdc', '#fffdf6', '#e6e2da'], 0.03), red = pal(['#c8503c', '#b84434', '#d86048'], 0.04);
      [[66, -80, 0.0, 1], [14, -88, 0.3, 0.85], [150, -96, -0.1, 0.95], [108, -92, 0.2, 0.9], [130, -84, -0.15, 1], [58, -66, -0.2, 0.9]].forEach((b, i, _a, kb = S.n) => sailboat(W, b[0], b[1], b[2], b[3], { hull: i === 5 ? red : hullP, hullBase: i === 5 ? hex('#b04a3a') : hex('#dcd8d0'), sail, sails: i % 3 === 1 ? 1 : 2 }) || (S.float && S.float(kb)));
      { const kr = S.n; rowboat(W, 8, -60, 0.5, 0.9, pal(['#3a5a7a', '#4a6a88', '#2e4a68'], 0.04), 2); if (S.float) S.float(kr); }
      { const kr = S.n; rowboat(W, -34, -74, -0.2, 0.9, pal(['#8a3a30', '#9a463a'], 0.04), 1); if (S.float) S.float(kr); }
      // the studio boat, lying out on the stream: a dark hull, the green cabin with its door to the bow, a pole at the cabin's corner
      const sx = -71.2, sz = -64.4, yaw = 1.26, c = Math.cos(yaw), s = Math.sin(yaw), yd = WATER_Y + 0.5;
      const ks = S.n, dark = pal(['#1e2a3c', '#27354a', '#18222e', '#2f3e4e'], 0.03), green = pal(['#6cba92', '#7cc8a0', '#5eac88', '#90d2ac', '#58a690', '#80c2ae'], 0.04);
      const p = hull(sx, sz, yaw, 6.2, 2.3, WATER_Y - 0.3, yd, 1.3, dark, hex('#1d2836'), pal(['#59665f', '#4c5a58', '#66706a'], 0.03), hex('#4f5c58'));
      const cc = p(-0.9, 0, 0), cw = 3.7, cd = 1.9, ch = 1.5;
      box(W, { x: cc[0], z: cc[2], w: cw, d: cd, y0: yd, h: ch, yaw, wall: green, base: hex('#62ae88'), step: 0.34, len: 0.8, wid: 0.3, along: 'v', wobble: 0.006, weave: 0.2, jit: 0.9, cells: [CELL.DAB, CELL.HEAVY, CELL.COMMA, CELL.COMMA_S, CELL.BLOCK] });
      gableRoof(W, { x: cc[0], z: cc[2], w: cw, d: cd, y: yd + ch, rh: 0.26, yaw, over: 0.28, roof: pal(['#dccab4', '#d2c0aa', '#e4d4c0', '#cdb8a8'], 0.03), base: hex('#d6c4b0'), gable: green, gableBase: hex('#62ae88'), step: 0.4, len: 0.9, wid: 0.3, along: 'u' });
      const door = p(-0.9 + cw / 2, 0, yd + 0.68), w1 = p(-0.9 - 0.9, cd / 2, yd + 0.9), w2 = p(-0.9 + 0.8, cd / 2, yd + 0.9);
      panel(W, door[0], door[1], door[2], c, s, 1.05, 1.3, hex('#3a2428'), 0);
      panel(W, w1[0], w1[1], w1[2], -s, c, 0.52, 0.62, hex('#2c3a4a'), 0);
      panel(W, w2[0], w2[1], w2[2], -s, c, 0.52, 0.62, hex('#2c3a4a'), 0);
      line(p(-0.9 + cw / 2 + 0.3, cd / 2 + 0.05, yd), p(-0.9 + cw / 2 + 0.33, cd / 2 + 0.05, yd + 3.0), 0.07, [0.4, 0.36, 0.32], CELL.HEAVY);
      if (S.float) S.float(ks);
      W.collide(sx, sz, 3);
    });
    // reeds along the near shore, a few on the far one, and the river itself
    T.push(() => paintCrop(W, { x0: -260, x1: 260, z0: -150, z1: -40, step: 1.1, h: 0.95, w: 0.075, cluster: 5, spread: 0.26, lean: 0.4, sway: 0.5,
      mask: (x, z) => {
        const d = riverD(x, z);
        if (d < HALF - 2.4 || d > HALF + 2.5 || Math.abs(x - 78) < 7 || pathDist(x, z, PATH2) < 6 || Math.hypot(x - V3.x, z - V3.z) < 9 || Math.hypot(x - V5.x, z + 53) < 9) return 0;
        if (z > riverZ(x) && x < -85 && x > -205) return 0;   // under the autumn trees the leaves themselves come down to the water
        return z < riverZ(x) ? 0.16 : 0.5;
      }, col: (x, z, r) => jit(mixc(hex('#4f7a40'), hex('#8aa850'), r()), 0.04, r) }));
    waterRings(W, { cx: -45, cz: -78, r1: 96, r2: 250, step: 1.05, col: pal(['#9a9c9a', '#a6a8a6', '#8e949a', '#b0aea8'], 0.05), dir: (x, z) => pathAngle(x, z, RIVER), jit: 0.22, mask: (x, z) => riverD(x, z) < HALF + 1, box: [-430, 430, -180, -44] });
    // a few strokes of clear blue laid flat on the still water of the channel below the easels, where the autumn picture has them between the two reflections
    T.push(() => {
      const r2 = mulberry32(3305), blue = pal(['#5a84c0', '#6f96c8', '#4a74b0', '#86a8d0'], 0.04);
      for (let x = -80; x > -300; x -= 0.25 + r2() * 0.45) {
        const k = sstep(-80, -220, x), z = riverZ(x) + HALF - 8.7 - r2() * (x > -142 ? 9 : 32), sz = 1 + 4.5 * k;
        if (W.h(x, z) > WATER_Y - 0.2 || r2() > 0.75 - 0.3 * k) continue;
        S.add(x, WATER_Y + 0.1, z, 1, 0, (r2() - 0.5) * 0.12, 0, 1, 0, (0.8 + r2() * 0.6) * sz, (0.13 + r2() * 0.07) * sz, blue(r2), 0, r2() < 0.5 ? CELL.LONG_A : CELL.HEAVY, 0, FLAG_FLAT);
      }
    });
    T.push(() => { for (const s of CH.spots) { if (s.noEasel) continue; const e = s.easel || [s.x + 1.2, s.z + 0.6]; easelProp(W, e[0], e[1], s.view.yaw); } });
    // ----- the hidden regatta (a6): four sails on the stream, and across the water the boatyard, its red roofs and its trees, a pale hull drawn up on the slip -----
    // laid last, so that every stroke before it keeps its draws. Out of sight of the other easels: the bridge and the bank hide it from them
    T.push(() => {
      const r3 = mulberry32(3311), hy = WATER_Y, inVH = (x, z) => Math.abs(Math.atan2(x - VH.x, VH.z - z) - VH.yaw) < 0.5;
      const sail = pal(['#f0e2bc', '#ecdcb2', '#f4e8c6'], 0.015), sailS = pal(['#d6caa6', '#cec2a0'], 0.015);
      const hullW = pal(['#f0ebde', '#e4ddcc', '#d6d4d0', '#f6f2e6'], 0.03), crew = pal(['#2c3448', '#3a4258', '#e8e0cc'], 0.04);
      // the light of the picture comes over the painter's shoulder: the sails are turned half to him, half to the sun
      const sunA = (72 + ((0.572 - 0.25) / 0.5) * 218) * DEG, sun = [Math.sin(sunA), 0, -Math.cos(sunA)];
      // a sail as a flat triangle filled row by row with short upright touches that never cross its edges: tack, clew, head
      const sheet = (A, B, H, s, col, colS, nrm) => {
        W.tri(A, B, H, mixc(col(r3), [0.82, 0.78, 0.7], 0.25));
        const rows = Math.max(3, Math.round((H[1] - A[1]) / (0.55 * s)));
        for (let j = 0; j < rows; j++) {
          const v = (j + 0.5) / rows, L = [A[0] + (H[0] - A[0]) * v, A[1] + (H[1] - A[1]) * v, A[2] + (H[2] - A[2]) * v], R = [B[0] + (H[0] - B[0]) * v, B[1] + (H[1] - B[1]) * v, B[2] + (H[2] - B[2]) * v];
          const w = Math.hypot(R[0] - L[0], R[2] - L[2]), n = Math.max(1, Math.round(w / (0.5 * s))), sw = Math.min(0.56 * s, (w / n) * 1.35), m = Math.min(0.5, (sw * 0.5) / (w || 1));
          for (let i = 0; i < n; i++) {
            // kept inside the edges: short where the sail narrows, a little tilt
            const u = m + (1 - 2 * m) * ((i + 0.25 + r3() * 0.5) / n), len = Math.min(1.3 * s, ((H[1] - A[1]) / rows) * 2.3), lean = (r3() - 0.5) * 0.3;
            const px = L[0] + (R[0] - L[0]) * u, py = L[1] + (R[1] - L[1]) * u, pz = L[2] + (R[2] - L[2]) * u;
            const c = r3() < 0.1 ? colS(r3) : col(r3);
            S.add(px, py, pz, ((R[0] - L[0]) / (w || 1)) * lean, 1, ((R[2] - L[2]) / (w || 1)) * lean, nrm[0], nrm[1], nrm[2], len, sw, c, 0.02, [CELL.DAB, CELL.HEAVY, CELL.LONG_A][(r3() * 3) | 0], 0.08, 0);
          }
        }
        // the edges drawn once with the side of the brush, so that the sail stands clean against the sky
        for (const e of [[A, H], [B, H], [A, B]]) {
          const d = [e[1][0] - e[0][0], e[1][1] - e[0][1], e[1][2] - e[0][2]], dl = Math.hypot(d[0], d[1], d[2]), k = Math.max(1, Math.round(dl / (1.2 * s)));
          for (let i = 0; i < k; i++) { const t = (i + 0.5) / k; S.add(e[0][0] + d[0] * t, e[0][1] + d[1] * t, e[0][2] + d[2] * t, d[0], d[1], d[2], nrm[0], nrm[1], nrm[2], (dl / k) * 1.05, 0.16 * s, col(r3), 0.02, CELL.LONG_A, 0.08, 0); }
        }
      };
      // a racing boat broadside to the eye: a low white hull, the mast, the mainsail aft of it to the right and the jib before it
      const racer = (x, z, s, turn) => {
        const yaw = VH.yaw + Math.PI + turn, c = Math.cos(yaw), sn = Math.sin(yaw), k0 = S.n;
        box(W, { x, z, w: 5.4 * s, d: 1.4 * s, y0: hy - 0.25, h: 0.7 * s, yaw, wall: hullW, base: hex('#dcd8cc'), step: 0.32 * s, len: 0.9 * s, wid: 0.26 * s, wobble: 0, weave: 0 });
        const to = [VH.x - x, 0, VH.z - z], tl = Math.hypot(to[0], to[2]), nrm = v3norm([0.6 * to[0] / tl + sun[0], 0.5, 0.6 * to[2] / tl + sun[2]]);
        const mx = x + c * 0.6 * s, mz = z + sn * 0.6 * s, y0 = hy + 0.75 * s, top = hy + 7.9 * s;
        S.add(mx, (y0 + top) / 2, mz, 0, 1, 0, 1, 0, 0, top - y0, 0.09 * s, [0.42, 0.36, 0.3], 0, CELL.HEAVY, 0, FLAG_AXIAL);
        sheet([mx - c * 0.1 * s, y0, mz - sn * 0.1 * s], [mx - c * 3.6 * s, y0 + 0.35 * s, mz - sn * 3.6 * s], [mx - c * 0.05 * s, top - 0.2 * s, mz - sn * 0.05 * s], s, sail, sailS, nrm);
        sheet([mx + c * 3.1 * s, y0 - 0.1 * s, mz + sn * 3.1 * s], [mx + c * 0.45 * s, y0 + 0.25 * s, mz + sn * 0.55 * s], [mx + c * 0.4 * s, y0 + 0.66 * (top - y0), mz + sn * 0.4 * s], s, sailS, sail, nrm);
        person(W, x - c * 1.7 * s, z - sn * 1.7 * s, yaw, { dress: crew(r3), top: hex('#2e3650'), hat: hex('#e6d8a8'), y: hy + 0.45 * s, s: 0.85 * s });
        S.mark(k0);
        if (S.float) S.float(k0);
      };
      [[164, -89.5, 1.4, 0.1], [189, -87.3, 0.75, -0.06], [148.7, -78.5, 0.9, 0.12], [143.2, -73.1, 1.5, -0.08]].forEach((b) => racer(b[0], b[1], b[2], b[3]));
      // the water in front, laid across the eye in long flat slabs as he lays it, so that the reflections break into bars
      paintWater(W, { x0: 106, x1: 240, z0: -104, z1: -58, step: 1.05, mask: inVH, len: 2.6, wid: 0.5, jit: 0.12, slide: 0.3, dir: VH.yaw, col: pal(['#9aa4ac', '#a8b0b4', '#8e9aa8', '#b4b8b4', '#98a8b8'], 0.04),
        cells: [CELL.LONG_A, CELL.HEAVY, CELL.BLOCK, CELL.LONG_B], size: (x, z) => 0.6 + 0.012 * Math.hypot(x - VH.x, z - VH.z) });
      // and between them bars of the blue grey of the river itself, which give back nothing
      { const blueG = pal(['#7f93ac', '#8c9eb4', '#7488a4', '#98a8b8', '#8698b0'], 0.035);
        for (let z = -104; z < -60; z += 1.6) for (let x = 106; x < 240; x += 1.6) {
          const px = x + r3() * 1.6, pz = z + r3() * 1.6, d = Math.hypot(px - VH.x, pz - VH.z), sz = 0.6 + 0.012 * d;
          if (W.h(px, pz) > hy - 0.1 || r3() > 0.5 || !inVH(px, pz)) continue;
          const a = VH.yaw + (r3() - 0.5) * 0.1;
          S.add(px, hy + 0.09 + r3() * 0.03, pz, Math.cos(a), 0, Math.sin(a), 0, 1, 0, 2.4 * sz * (0.6 + r3() * 0.8), 0.42 * sz, blueG(r3), 0, [CELL.LONG_A, CELL.HEAVY, CELL.BLOCK][(r3() * 3) | 0], 0, FLAG_FLAT);
        } }
      // the boatyard on the bank: the big house with its red hip roof near the water, a second one further up among the trees
      const roofR = pal(['#c85a36', '#d46c44', '#bc5232', '#dc7c52', '#c86440'], 0.04), wallR = pal(['#c08058', '#c88c62', '#b47250', '#d09a70', '#ac7c60'], 0.04);
      const winR = pal(['#4a3a44', '#3e3a4c'], 0.03);
      house(W, { x: 144.4, z: -53.6, w: 5.4, d: 4.6, h: 3.8, rh: 2.4, yaw: 2.05, hip: true, wall: wallR, wallBase: hex('#c47a4c'), roof: roofR, roofBase: hex('#c4542e'),
        windows: [{ side: 1, u: 0.25, v: 0.55 }, { side: 1, u: 0.75, v: 0.55 }, { side: 1, u: 0.5, v: 0.3, door: true }], win: winR, door: winR, step: 0.42, len: 0.95, wid: 0.36 });
      house(W, { x: 171.7, z: -53.5, w: 6.2, d: 5, h: 4.8, rh: 2.6, yaw: 1.95, wall: pal(['#e0b07c', '#d8a070', '#e8c090'], 0.04), wallBase: hex('#dcaa78'), roof: roofR, roofBase: hex('#c4542e'),
        windows: [{ side: 1, u: 0.3, v: 0.6 }, { side: 1, u: 0.7, v: 0.6 }], win: winR, door: winR, step: 0.5, len: 1.1, wid: 0.4 });
      // the trees: deep green with yellow green where the light takes them, one tall and dark among them
      const leafY = (r, t) => jit(mixc(hex('#2e4c2e'), hex('#8a9c48'), Math.pow(r(), 1.3) * (0.3 + 0.7 * t)), 0.05, r);
      const leafT = (r, t) => jit(mixc(hex('#1e3a2c'), hex('#4e6e3a'), r() * (0.3 + 0.7 * t)), 0.04, r);
      mass(178.9, -57, 2.8, 3.4, leafT, { ry: 7.4, n: 280, size: 0.8, core: hex('#22402e'), free: true });
      [[212.3, -62.7, 4.2, 2.8], [201.9, -60.1, 3.8, 2.6], [196.3, -57.4, 3.4, 1.8], [188, -59.5, 3.2, 1.6], [166.4, -50.4, 3.8, 2.8], [159.7, -50, 3.4, 2.6], [151, -49, 3.2, 2.2], [186, -52, 4, 3.2], [138.5, -50.5, 2.2, 0.6]].forEach((q) =>
        mass(q[0], q[1], q[2], q[3], leafY, { n: Math.round(70 + q[2] * 30), size: 0.62 + q[2] * 0.06, core: hex('#2e4a30'), free: true }));
      // low growth along the water's edge, light and yellow green
      const shrub = (r, t) => jit(mixc(hex('#5c7c34'), hex('#a8b456'), r() * (0.4 + 0.6 * t)), 0.05, r);
      for (let x = 128; x < 196; x += 2.2 + r3() * 2.4) { const z = riverZ(x) + HALF - 1.8 + r3() * 3; if (Math.abs(x - 163) < 4) continue; leafCloud(W, x, W.h(x, z) + 0.6, z, { n: 26, rx: 1.4 + r3(), ry: 0.8, rz: 1.2, size: 0.42, col: shrub }); }
      paintCrop(W, { x0: 112, x1: 215, z0: -64, z1: -44, step: 0.85, h: 0.75, w: 0.1, cluster: 2, spread: 0.3, lean: 0.7, sway: 0.4, cells: [CELL.COMMA, CELL.COMMA_S, CELL.DAB, CELL.HEAVY, CELL.BLADE],
        mask: (x, z) => (W.h(x, z) > hy + 0.1 && inVH(x, z) ? 0.7 : 0), col: (x, z, r) => (r() < 0.3 ? jit(hex('#4e6e34'), 0.05, r) : shrub(r, r())) });
      // the pale hull drawn up on the slip, her bow on the bank, and the bare mast of a boat moored beside it
      box(W, { x: 164, z: -60.6, w: 11, d: 2.4, y0: hy - 0.1, h: 2.3, yaw: 1.66, wall: pal(['#f4f0e4', '#ece6d6', '#faf6ee', '#e6e2da'], 0.03), base: hex('#e6e0d2'), step: 0.32, len: 1.1, wid: 0.3, along: 'u', wobble: 0 });
      { const km = S.n; S.add(155.2, hy + 4.4, -60.6, 0.03, 1, 0, 1, 0, 0, 8.8, 0.13, [0.52, 0.42, 0.3], 0, CELL.HEAVY, 0, FLAG_AXIAL); if (S.float) S.float(km); }
      // the men on the bank by the big house
      person(W, 135.5, -55.3, 2.0, { dress: hex('#e8e2d2'), top: hex('#3a4a6a'), hat: hex('#2e3240'), s: 1.05 });
      person(W, 150.5, -56.2, 2.2, { dress: hex('#3c4660'), top: hex('#3c4660'), hat: hex('#e2d4a4'), s: 0.95 });
    });
    // ===================== the place round the pictures =====================
    // laid after everything else, so that every stroke before keeps its draws; nothing here stands where an easel looks (unseen, seenPt)
    T.push(() => {
      const r4 = mulberry32(3401), main = CH.spots.filter((s) => !s.hidden);
      // the straight ways she flies from easel to easel, and on to the hidden one and the frame: nothing tall within reach of them
      const AIR = [];
      for (let i = 0; i < main.length - 1; i++) AIR.push([main[i].x, main[i].z, main[i + 1].x, main[i + 1].z]);
      AIR.push([main[2].x, main[2].z, CH.spots[5].x, CH.spots[5].z], [main[main.length - 1].x, main[main.length - 1].z, CH.door.x, CH.door.z]);
      const tallOK = (x, z, r) => { for (const a of AIR) if (distSeg(x, z, a[0], a[1], a[2], a[3]) < 11 + (r || 0)) return false; return true; };
      const inWalk = (x, z) => Math.hypot(x - CH.center[0], z - CH.center[1]) < CH.radius + 40;
      const leafG = (r, t) => jit(mixc(hex('#3a6234'), hex('#8aa44e'), r() * (0.35 + 0.65 * t)), 0.05, r);
      const leafH = (r, t) => jit(mixc(hex('#34582e'), hex('#6e9040'), r() * (0.3 + 0.7 * t)), 0.05, r);
      const leafO = (r, t) => jit(mixc(hex('#4a6e36'), hex('#9cae58'), r() * (0.3 + 0.7 * t)), 0.05, r);
      const barkT = pal(['#5a4a40', '#6a584a', '#4a3e38'], 0.04), barkPo = pal(['#6a5a68', '#7a6672', '#5a4e60'], 0.04);
      const tree = (x, z, r, h, lf, n) => { if (!tallOK(x, z, r) || !unseen(x, z, r * 2, r * 2, h + r * 1.7)) return false; mass(x, z, r, h, lf, { n: n || Math.round(50 + r * 18), size: r * 0.2, heart: 0.5 }); return true; };

      // ----- the hedges along the lanes, a gap at every gate, and here and there an elm standing out of them -----
      const hedgeCol = (r, t) => jit(mixc(hex('#2e5230'), hex('#7a9a48'), r() * (0.3 + 0.7 * t)), 0.05, r);
      const hedge = (pts, side, from, to, trees) => {
        let acc = 0;
        for (let k = 0; k < pts.length - 1; k++) {
          const a = pts[k], b = pts[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
          for (let s = 0; s < L; s += 3.0 + r4() * 0.8) {
            acc += 3.2;
            const u = (acc % 70) / 70; if (u > 0.9) continue;   // a gate
            const x = a[0] + dx * s - dz * side, z = a[1] + dz * s + dx * side;
            if (acc < from || acc > to || !unseen(x, z, 3, 3, 2.6)) continue;
            if (trees && r4() < 0.07) { tree(x, z, 3.6 + r4() * 1.6, 3 + r4() * 2, leafH); continue; }
            leafCloud(W, x, W.h(x, z) + 0.9, z, { n: 9, rx: 1.8, ry: 1.0, rz: 1.8, size: 0.66, col: hedgeCol, sway: 0.15 });
          }
        }
      };
      hedge(LANES[1].p, 3.2, 8, 1e9, true);      // the lane from the poppies to the knoll, the hedge on its sunny side
      hedge(LANES[2].p, -2.8, 6, 1e9, true);
      hedge(LANES[3].p, 2.6, 0, 1e9, false);
      hedge(LANES[6].p, 2.8, 0, 1e9, true);
      hedge(LANES[6].p, -2.8, 0, 1e9, false);
      hedge(LANES[5].p, 2.6, 0, 260, true);
      hedge(LANES[4].p, 3.0, 40, 330, true);
      // the bounds of the parish where she may walk: a hedgerow with its trees on the open sides, broken where a lane goes through
      for (let a = 0; a < TAU; a += 3.2 / 156) {
        const R = 156 + 9 * (vnoise(a * 3, 0, 420) - 0.5), x = CH.center[0] + Math.sin(a) * R, z = CH.center[1] - Math.cos(a) * R;
        if (z < riverZ(x) + HALF + 12 || inPoppy(x, z)) continue;
        let gap = false; for (const L of LANES) if (pathDist(x, z, L.p) < 5) gap = true;
        if (gap || !unseen(x, z, 3, 3, 2.6)) continue;
        if (r4() < 0.09) { tree(x, z, 4 + r4() * 2, 3.5 + r4() * 2.5, leafH); continue; }
        leafCloud(W, x, W.h(x, z) + 1.0, z, { n: 10, rx: 1.9, ry: 1.1, rz: 1.9, size: 0.68, col: hedgeCol, sway: 0.15 });
      }

      // ----- the promenade under its trees, along the towpath, and the poplars of the road -----
      for (let x = -52; x < 72; x += 8.5 + r4() * 2) { if (Math.abs(x - 2) < 7) continue; const z = -34.5 + 0.06 * x + r4() * 1.5; tree(x, z, 3.8 + r4(), 4.2 + r4() * 1.5, leafG, 110); }
      { const R = LANES[0].p; let acc = 0;
        for (let k = 1; k < R.length - 1; k++) { const a = R[k], b = R[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
          for (let s = 0; s < L; s += 13) { acc++; if (acc > 26) break; for (const sd of [-5.5, 5.5]) { const x = a[0] + dx * s - dz * sd, z = a[1] + dz * s + dx * sd; if (tallOK(x, z, 2) && unseen(x, z, 3, 3, 22)) poplar(W, x, z, 17 + r4() * 6, leafB, barkPo, { from: 0.22, rad: 1.6, n: 110, shaft: 0.16 }); } } } }

      // ----- the crops near the walk: wheat and oats standing, the rows of the vines and the feathers of the asparagus, poppies in the corn -----
      const cropAt = (x, z) => { const zn = zone(x, z); if (!RECOL[zn]) return null; const L = landAt(x, z); return L && unseen1(x, z) ? L : null; };
      const unseen1 = (x, z) => farSeen(x, z) > 6;
      paintCrop(W, { x0: -190, x1: 200, z0: -30, z1: 200, step: 2.3, h: 0.95, w: 0.11, cluster: 2, spread: 0.4, lean: 0.35, sway: 0.6, cells: [CELL.LONG_A, CELL.BLADE, CELL.EAR, CELL.COMMA],
        mask: (x, z) => { if (!inWalk(x, z)) return 0; const L = cropAt(x, z); return L && (L.id === 'wheat' || L.id === 'oats') ? 0.7 : 0; },
        col: (x, z, r) => (_lr ? _lr.p(r) : null) });
      paintCrop(W, { x0: -190, x1: 200, z0: -30, z1: 200, step: 2.0, h: 0.55, w: 0.16, cluster: 3, spread: 0.5, lean: 0.9, sway: 0.5, cells: [CELL.COMMA, CELL.COMMA_S, CELL.DAB, CELL.BLADE],
        mask: (x, z) => { if (!inWalk(x, z)) return 0; const L = cropAt(x, z); return L && (L.id === 'asp' || L.id === 'roots') ? 0.6 : L && L.id === 'vine' && strip(x, z).edge ? 1 : 0; },
        col: (x, z, r) => (_lr ? _lr.p(r) : null) });
      flowers(W, { x0: -190, x1: 200, z0: -30, z1: 200, step: 1.6, h: 0.55, size: 0.26, glow: 0.08, col: pal(['#b8200f', '#c82a14', '#a81c10', '#d23a1e'], 0.04),
        mask: (x, z) => { if (!inWalk(x, z)) return 0; const L = cropAt(x, z); return !L ? 0 : L.id === 'poppy' ? 0.55 * sstep(0.35, 0.6, vnoise(x * 0.06, z * 0.06, 421)) + 0.05 : L.id === 'wheat' && strip(x, z).edge ? 0.5 : 0; } });

      // ----- farms on the plain: the house, the barn, a walled yard, a stack, the orchard -----
      const tile = pal(['#b8705c', '#c07c66', '#a86654', '#9a5e50'], 0.04), slate = pal(['#7f869a', '#8c92a4', '#727a90', '#9298a8'], 0.04);
      const plaster = pal(['#e6dcc4', '#dacfb6', '#eee6d2', '#d8c8a8'], 0.03), stoneW = pal(['#d6ccb4', '#cabfa6', '#ded4be', '#b8ae98'], 0.03), winD = pal(['#4e5a6a', '#56687c'], 0.03);
      const shed = (x, z, w, d, h, rh, yaw, wall, roof, big) => {
        if (!unseen(x, z, w + 2, d + 2, h + rh)) return false;
        const st = big ? 1.6 : 1.25;
        house(W, { x, z, w, d, h, rh, yaw, wall, wallBase: mulc(wall(r4), 0.97), roof, roofBase: roof(r4), windows: [{ side: 1, u: 0.3, v: 0.55 }, { side: 1, u: 0.7, v: 0.55 }, { side: -1, u: 0.5, v: 0.55 }], win: winD, door: winD, step: st, len: st * 2, wid: st * 0.75 });
        return true;
      };
      const farm = (x, z, yaw) => {
        const c = Math.cos(yaw), s = Math.sin(yaw), at = (lx, lz) => [x + lx * c - lz * s, z + lx * s + lz * c];
        let p = at(0, -9); if (!shed(p[0], p[1], 12, 7, 5, 3, yaw, plaster, tile)) return;
        p = at(-11, 4); shed(p[0], p[1], 7, 16, 5.5, 3.6, yaw, stoneW, tile);
        p = at(9, 6); shed(p[0], p[1], 6, 9, 3.6, 2.4, yaw, stoneW, slate);
        const wl = [at(-15, 13), at(13, 13), at(13, -2)];
        for (let k = 0; k < wl.length - 1; k++) { const a = wl[k], b = wl[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); box(W, { x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, w: L, d: 0.6, y0: W.h((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) - 0.3, h: 2.1, yaw: Math.atan2(b[1] - a[1], b[0] - a[0]), wall: stoneW, base: hex('#cfc4ac'), step: 1.2, len: 2.0, wid: 0.7 }); }
        for (let i = 0; i < 7; i++) { const q = at(-26 + (i % 4) * 8 + r4() * 2, 22 + Math.floor(i / 4) * 8 + r4() * 2); tree(q[0], q[1], 2.4 + r4() * 0.8, 1.4 + r4() * 0.6, leafO, 50); }
      };
      farm(-205, 72, 0.15); farm(-128, 238, -0.3); farm(196, 262, 0.4); farm(-300, 180, 0.6); farm(330, 120, -0.2);

      // ----- the villas of Petit Gennevilliers by the water upstream, each in its garden -----
      const villa = pal(['#f0e6d0', '#e8dcc0', '#f4ecdc', '#e0d0b0'], 0.03);
      [[118, -16, 0.1], [146, -8, -0.05], [176, -6, 0.08], [208, 2, 0.15], [242, 10, 0.1]].forEach((v) => {
        if (!unseen(v[0], v[1], 12, 12, 11)) return;
        house(W, { x: v[0], z: v[1], w: 9, d: 7.5, h: 6.5, rh: 3.2, yaw: v[2], hip: true, wall: villa, wallBase: hex('#ece2cc'), roof: slate, roofBase: hex('#828a9c'), windows: [{ side: -1, u: 0.25, v: 0.6 }, { side: -1, u: 0.75, v: 0.6 }, { side: -1, u: 0.5, v: 0.2, door: true }, { side: 1, u: 0.3, v: 0.6 }, { side: 1, u: 0.7, v: 0.6 }], win: pal(['#5a6a7c'], 0.03), door: pal(['#5a6a7c'], 0.03), shut: pal(['#5f8a6a', '#6a947a'], 0.03), step: 0.6, len: 1.2, wid: 0.42 });
        for (let i = 0; i < 4; i++) { const a = r4() * TAU, d = 10 + r4() * 6; tree(v[0] + Math.cos(a) * d, v[1] + Math.sin(a) * d * 0.7 + 4, 3 + r4() * 1.5, 2.5 + r4() * 2, leafG, 70); }
        fence(W, [[v[0] - 12, v[1] - 11], [v[0] + 12, v[1] - 11]], pal(['#e8e4dc', '#d8d4cc'], 0.03), 1.1);
      });

      // ----- Argenteuil on the far bank: the quay, the streets climbing behind it, the Grande Rue from the bridge, the church and the works -----
      const wallsT = pal(['#e2dccc', '#d8d0bc', '#ece4d2', '#d0c6b0', '#e4d4b0', '#cfd0d0'], 0.03), roofsT = pal(['#8a94a8', '#9aa0b0', '#7e889e', '#b8705c', '#a86654', '#c08068'], 0.04, [2, 2, 1, 3, 3, 2]);
      const town = (x, z, yaw, w, d, h) => {
        if (!inTown(x, z) || riverD(x, z) < HALF + 10) return false;
        const rh = 2.4 + r4() * 1.4;
        if (!unseen(x, z, w + 1, d + 1, h + rh, yaw)) return false;
        house(W, { x, z, w, d, h, rh, yaw, wall: wallsT, wallBase: hex('#dcd4c0'), roof: roofsT, roofBase: hex('#8c94a6'), windows: [{ side: 1, u: 0.25, v: 0.62 }, { side: 1, u: 0.75, v: 0.62 }, { side: -1, u: 0.5, v: 0.62 }], win: winD, door: winD, step: 1.8, len: 3.2, wid: 1.25 });
        return true;
      };
      let nTown = 0;
      for (const row of [26, 46, 70, 96, 124]) for (let x = -290; x < 250; x += 0) {
        const w = 8 + r4() * 6, z = riverZ(x) - HALF - row - r4() * 4;
        if (!(x < -90 && row < 40) && Math.hypot(x + 168, z + 194) > 22 && Math.abs(x - 78) > 9 && r4() > 0.12 && town(x, z, (r4() - 0.5) * 0.3, w, 6.5 + r4() * 2, 5 + r4() * 4)) {
          nTown++;
          if (r4() < 0.4) tree(x + (r4() - 0.5) * 6, z - 9 - r4() * 4, 3 + r4() * 1.5, 2.5 + r4() * 2, leafG, 60);
        }
        x += w + 1 + (r4() < 0.25 ? 6 + r4() * 8 : 0);
      }
      for (let z = -152; z > -300; z -= 0) { const d = 9 + r4() * 5; for (const sd of [-9, 9]) if (town(78 + sd, z, Math.PI / 2, d, 7, 6 + r4() * 3)) nTown++; z -= d + 1; }
      // the church: the nave east of the old tower and spire
      if (unseen(-153.5, -194, 23, 11, 16)) {
        box(W, { x: -153.5, z: -194, w: 22, d: 10, y0: W.h(-153.5, -194) - 0.3, h: 11, wall: stoneW, base: hex('#d4cab4'), step: 1.0, len: 2.0, wid: 0.8 });
        gableRoof(W, { x: -153.5, z: -194, w: 22, d: 10, y: W.h(-153.5, -194) + 10.7, rh: 5, roof: slate, base: hex('#7f869a'), gable: stoneW, gableBase: hex('#d4cab4'), step: 1.0, len: 2.0, wid: 0.8 });
      }
      // the works upstream: long sheds and two brick chimneys
      const brick = pal(['#a8584a', '#b46450', '#9a4e44', '#b8705a'], 0.04);
      for (const c of [[232, -184, 30], [262, -168, 26]]) {
        if (!unseen(c[0], c[1], 4, 4, c[2] + 1)) continue;
        const y0 = W.h(c[0], c[1]) - 0.3;
        tower(W, { x: c[0], z: c[1], y0, y1: y0 + c[2], r0: 1.5, r1: 0.95, sides: 7, wall: brick, base: hex('#a4564a'), step: 0.8, len: 1.6, wid: 0.6, along: 'v' });
        W.caster({ k: 'pole', x: c[0], z: c[1], h: c[2], r: 1.2 });
      }
      [[244, -170, 30, 12, 0.1], [226, -200, 24, 10, 0.05], [270, -192, 20, 12, -0.1]].forEach((b) => shed(b[0], b[1], b[2], b[3], 7, 3, b[4], pal(['#c8b8a0', '#bcae96', '#d2c4ac'], 0.03), slate, true));

      // ----- the hill of Orgemont: vines up its flanks, a wood on its shoulder, and the mill on the top -----
      { const mx = ORG[0], mz = ORG[1] + 6, y0 = W.h(mx, mz) - 0.3;
        if (unseen(mx, mz, 14, 14, 16)) {
          tower(W, { x: mx, z: mz, y0, y1: y0 + 9.5, r0: 3.2, r1: 2.5, sides: 9, wall: plaster, base: hex('#e0d6c0'), step: 0.9, len: 1.8, wid: 0.7, along: 'v' });
          tower(W, { x: mx, z: mz, y0: y0 + 9.5, y1: y0 + 12.5, r0: 2.9, r1: 0.4, sides: 9, wall: pal(['#6a5a4a', '#7a6650', '#5e5044'], 0.04), base: hex('#6a5a4a'), step: 0.7, len: 1.4, wid: 0.6, along: 'v' });
          // four sails turned to the south west wind, as a cross of long lattice strokes
          const hx = mx + 2.9 * Math.sin(-2.4), hz = mz - 2.9 * Math.cos(-2.4), hy = y0 + 10.6, fx = Math.sin(-2.4), fz = -Math.cos(-2.4), tx = -fz, tz = fx;
          for (let k = 0; k < 4; k++) {
            const a = 0.5 + (k * Math.PI) / 2, ux = tx * Math.cos(a), uy = Math.sin(a), uz = tz * Math.cos(a);
            for (let j = 0; j < 4; j++) { const t = 1.6 + j * 1.9; S.add(hx + ux * t, hy + uy * t, hz + uz * t, ux, uy, uz, fx, 0, fz, 2.2, 1.2, [0.9, 0.86, 0.78], 0, CELL.BLOCK, 0, FLAG_FLAT); }
            S.add(hx + ux * 4.4, hy + uy * 4.4, hz + uz * 4.4, ux, uy, uz, fx, 0, fz, 8.8, 0.14, [0.38, 0.3, 0.24], 0, CELL.LONG_B, 0, FLAG_FLAT);
          }
          W.caster({ k: 'pole', x: mx, z: mz, h: 12, r: 3 });
        } }
      // ----- woods and tree lines out to the edge of the land, so that it goes on wherever she looks -----
      for (let z = -760; z < 780; z += 34) for (let x = -760; x < 780; x += 34) {
        const px = x + (r4() - 0.5) * 20, pz = z + (r4() - 0.5) * 20, r = Math.hypot(px, pz);
        if (r < 170 || riverD(px, pz) < HALF + 8) continue;
        const L = landAt(px, pz), zn = zone(px, pz);
        if (!L || !RECOL[zn] || inTown(px, pz)) continue;
        const wood = L.id === 'wood', edge = !wood && strip(px, pz).balk;
        if (!wood && !(edge && r4() < 0.4) && r4() > 0.02) continue;
        const rr = wood ? 9 + r4() * 6 : 5 + r4() * 3, h = wood ? 3 + r4() * 3 : 2 + r4() * 3;
        if (!tallOK(px, pz, rr) || !unseen(px, pz, rr * 2, rr * 2, h + rr * 1.6)) continue;
        const y = W.h(px, pz);
        leafCloud(W, px, y + h + rr * 0.5, pz, { n: wood ? 18 : 12, rx: rr, ry: rr * 0.7, rz: rr, size: rr * 0.32, col: wood ? leafD : leafH, sway: 0.1 });
      }
      // villages on the rim of the plain, a tower in each
      [[430, 380, 0.3], [-470, 330, -0.2], [-380, -470, 0.1], [400, -470, 0.2], [60, 600, 0]].forEach((v, vi) => {
        const r5 = mulberry32(3500 + vi);
        for (let i = 0; i < 7; i++) { const x = v[0] + (r5() - 0.5) * 60, z = v[1] + (r5() - 0.5) * 40, w = 9 + r5() * 6;
          if (!unseen(x, z, w, 8, 10)) continue;
          house(W, { x, z, w, d: 7, h: 5 + r5() * 3, rh: 3, yaw: v[2] + (r5() - 0.5) * 0.3, wall: wallsT, wallBase: hex('#dcd4c0'), roof: roofsT, roofBase: hex('#8c94a6'), step: 2.6, len: 4.4, wid: 1.7 }); }
        if (unseen(v[0], v[1], 6, 6, 26)) { box(W, { x: v[0], z: v[1], w: 5, d: 5, y0: W.h(v[0], v[1]) - 0.3, h: 14, wall: stoneW, base: hex('#d0c6b0'), step: 1.6, len: 3, wid: 1.2 }); pyramid(W, { x: v[0], z: v[1], w: 5.6, d: 5.6, y: W.h(v[0], v[1]) + 13.7, h: 9, roof: slate, base: hex('#7f869a'), step: 1.6, len: 3, wid: 1.0 }); }
      });

      // ----- the railway from Paris along the foot of the hill: its bank of ballast and its two rails -----
      const ballast = pal(['#8a8478', '#9a9488', '#7c766c', '#a49a88'], 0.04), steel = [0.32, 0.3, 0.32];
      for (let i = 0; i < RAIL.length - 1; i++) {
        const a = RAIL[i], b = RAIL[i + 1], L = Math.hypot(b[0] - a[0], b[2] - a[2]), dx = (b[0] - a[0]) / L, dz = (b[2] - a[2]) / L;
        for (let s = 0; s < L; s += 2.2) {
          const t = s / L, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t, y = a[1] + (b[1] - a[1]) * t;
          if (Math.abs(x) > 790 || Math.abs(z) > 790 || !unseen(x, z, 6, 6, 4)) continue;
          const g = W.h(x, z);
          // the bank: two sloping touches down to the ground on either side where the line runs above it
          for (const sd of [-1, 1]) { const off = 2.2 + Math.max(0, y - g) * 1.2; S.add(x - dz * sd * off * 0.7, (y + g) / 2, z + dx * sd * off * 0.7, -dz * sd, (g - y), dx * sd, -dz * sd * 0.5, 1, dx * sd * 0.5, Math.hypot(off, y - g) * 1.1, 2.6, ballast(r4), 0, CELL.BLOCK, 0, 0); }
          S.add(x, y + 0.05, z, dx, 0, dz, 0, 1, 0, 2.6, 3.0, ballast(r4), 0, CELL.BLOCK, 0, FLAG_FLAT);
          for (const sd of [-0.72, 0.72]) S.add(x - dz * sd, y + 0.22, z + dx * sd, dx, 0, dz, 0, 1, 0, 2.5, 0.16, steel, 0, CELL.LONG_B, 0, FLAG_FLAT);
        }
      }
    });
  }
  const CH = {
    id: 'argenteuil', seed: 7002, build, height,
    start: { x: 0, z: 26, yaw: 0.2 }, center: [0, 30], radius: 150,
    sunPath: { rise: 72, set: 290, maxEl: 58 }, wind: [0.85, 0.5], canvas: '#ece6d6', brushRot: 0.2, edge: 0.72,
    water: { tint: '#8ea2b4', refl: 0.98 }, t0: 0.36,
    swatch: ['#e8402e', '#8fb24e', '#fbf6ea', '#7ab0d8'],
    phases: [
      { leaf: 1, flower: 1, cover: 0.57 },
      { autumn: AUT, leaf: 0.97, flower: 0.1, cover: 0.66, mist: 0.15, fog: 0.7, sat: 1.04 },
    ],
    atmo(e, t, ph) {
      const au = clamp(ph.autumn / AUT, 0, 1), day = clamp(e.sunI, 0, 1), cream = [1.0, 0.965, 0.88];
      // the clouds of the Seine valley are cream more than white, and the sky pales to cream where it comes down to the land
      e.cloudLit = mixc(e.cloudLit, mulc(cream, lum3(e.cloudLit) * 1.02), 0.6 * day);
      e.sky[3] = mixc(e.sky[3], mulc(cream, lum3(e.sky[3]) * 1.03), 0.5 * day);
      e.sky[2] = mixc(e.sky[2], [0.87, 0.92, 0.96], 0.3 * day); e.sky[1] = mixc(e.sky[1], [0.78, 0.87, 0.97], 0.25 * day);
      // an autumn morning: a pale sky, more cream than blue
      if (au > 0.02) {
        const k = au * day;
        e.sky[0] = mixc(e.sky[0], [0.66, 0.77, 0.9], 0.55 * k); e.sky[1] = mixc(e.sky[1], [0.84, 0.88, 0.93], 0.6 * k);
        e.sky[2] = mixc(e.sky[2], [0.96, 0.93, 0.87], 0.6 * k); e.sky[3] = mixc(e.sky[3], [0.99, 0.94, 0.85], 0.6 * k);
        e.cloudShade = mixc(e.cloudShade, [0.84, 0.83, 0.86], 0.6 * k);
        e.waterRefl = lerp(0.98, 1.15, k);   // the still water gives the trees back almost whole
        e.cloudShadow *= 1 - 0.7 * k;
      }
      // the regatta's early afternoon: a soft even light under a grey blue sky with long streaks of cloud
      const reg = (1 - au) * sstep(0.535, 0.555, t) * (1 - sstep(0.6, 0.625, t));
      if (reg > 0.01) {
        e.sky[0] = mixc(e.sky[0], [0.5, 0.58, 0.7], 0.85 * reg); e.sky[1] = mixc(e.sky[1], [0.58, 0.65, 0.75], 0.85 * reg);
        e.sky[2] = mixc(e.sky[2], [0.66, 0.71, 0.78], 0.85 * reg); e.sky[3] = mixc(e.sky[3], [0.74, 0.77, 0.8], 0.85 * reg);
        e.cloudLit = mixc(e.cloudLit, [0.76, 0.78, 0.8], 0.8 * reg); e.cloudShade = mixc(e.cloudShade, [0.56, 0.62, 0.72], 0.8 * reg);
        e.sun = mulc(e.sun, 1 - 0.25 * reg); e.amb = mulc(e.amb, 1 + 0.08 * reg);
      }
      // a summer evening on the river: no fire in the west. The sky closes, and the light goes blue and violet over the water
      const dusk = (1 - au) * sstep(0.62, 0.69, t) * (1 - sstep(0.775, 0.815, t));
      if (dusk > 0.01) {
        e.sky[0] = mixc(e.sky[0], [0.46, 0.53, 0.7], 0.85 * dusk); e.sky[1] = mixc(e.sky[1], [0.6, 0.64, 0.76], 0.85 * dusk);
        e.sky[2] = mixc(e.sky[2], [0.72, 0.72, 0.8], 0.85 * dusk); e.sky[3] = mixc(e.sky[3], [0.8, 0.76, 0.8], 0.85 * dusk);
        e.cloudLit = mixc(e.cloudLit, [0.82, 0.82, 0.88], 0.85 * dusk); e.cloudShade = mixc(e.cloudShade, [0.5, 0.54, 0.68], 0.8 * dusk);
        e.cover = lerp(e.cover, 0.84, dusk); e.cloudShadow *= 1 - 0.7 * dusk;
        e.sun = mulc(e.sun, 1 - 0.88 * dusk); e.sunI *= 1 - 0.7 * dusk;
        e.amb = mulc(mixc(e.amb, [0.5, 0.56, 0.84], 0.45 * dusk), 1 + 0.12 * dusk);
        e.glow = mixc(e.glow, [0.74, 0.72, 0.84], 0.85 * dusk); e.glowP *= 1 - 0.8 * dusk;
        e.fog = mixc(e.fog, [0.6, 0.64, 0.76], 0.85 * dusk); e.haze = mixc(e.haze, [0.6, 0.64, 0.76], 0.85 * dusk); e.fogD *= 1 + 1.5 * dusk;
        const g = e.grade;
        g.sat *= 1 - 0.4 * dusk; g.veil = [lerp(g.veil[0], 0.9, dusk), lerp(g.veil[1], 0.89, dusk), lerp(g.veil[2], 1, dusk), lerp(g.veil[3], 0.3, dusk)];
      }
    },
    spots: [
      { x: 30, z: 58, view: V1 },
      { x: -62, z: 95.5, noEasel: true, view: V2 },
      { x: 27, z: -45, view: V3 },
      { x: -62, z: -46.5, view: V4 },
      { x: -83, z: -46.5, view: V5 },
      // hidden: on the east bank upstream of the bridge, where the river leaves the meadows
      { x: 101, z: -53.5, hidden: true, easel: [100.2, -55.4], view: VH },
    ],
    effects: [
      { id: 'a1', spot: 0, phase: 0, t0: 0.4, t1: 0.62 },
      { id: 'a2', spot: 1, phase: 0, t0: 0.42, t1: 0.62 },
      { id: 'a3', spot: 2, phase: 0, t0: 0.33, t1: 0.47 },
      { id: 'a4', spot: 3, phase: 1, t0: 0.29, t1: 0.4 },
      { id: 'a5', spot: 4, phase: 0, t0: 0.66, t1: 0.76 },
      { id: 'a6', spot: 5, phase: 0, t0: 0.53, t1: 0.65, hidden: true },
    ],
    need: 3, door: { x: 104, z: 22, yaw: 1.2 },
    _vis: () => visGrid(), _land: landAt,
    // where the ways of the land run, for the sights: polylines in the order of travel, absolute heights, beginning and ending out of sight
    lines: {
      rail: RAIL,
      fairway: RIVER.map((p) => [p[0], WATER_Y, p[1]]),
      towpath: [[-420, riverZ(-420) + HALF + 9]].concat(PATH, [[420, riverZ(420) + HALF + 9]]).map((p) => [p[0], +height(p[0], p[1]).toFixed(2), p[1]]),
      road: [[78, -300], [78, -150]].map((p) => [p[0], +height(p[0], p[1]).toFixed(2), p[1]]).concat([[78, WATER_Y + 8.4, -142], [78, WATER_Y + 8.4, -48]], LANES[0].p.map((p) => [p[0], +height(p[0], p[1]).toFixed(2), p[1]])),
    },
  };
  return CH;
})();
