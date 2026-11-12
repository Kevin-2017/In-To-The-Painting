// ---------- Giverny, the fields: grainstacks and poplars, the same motif under changing light ----------
const W_FIELDS = (() => {
  // the first two are the pair he painted: the large stack, and a smaller one a little further off to its left
  const STACKS = [[-12, 4, 1.25], [-20.3, 12.1, 0.78], [-78, 34, 1.0], [-96, -46, 0.9], [-58, 86, 0.95]];
  const RIVER = [[-420, -170], [-200, -150], [-120, -128], [-60, -141], [0, -123], [60, -135], [130, -118], [220, -131], [420, -110]];
  const WATER_Y = -1.1;
  const riverD = (x, z) => pathDist(x, z, RIVER);

  // ---------- the place: Giverny about 1890, turned so that the Epte runs along the north and the hill rises in the south ----------
  // The village is strung along its road at the foot of the hill, the church at its west end. Below it lies the Clos Morin with the stacks,
  // then the water meadows and the Epte with its poplars. Strip fields climb the hill and fill the plain to the east, where a ditch lined with
  // pollard willows closes the land. Beyond, all round, the hills of the Seine valley, fields and woods gone blue with distance
  const ROAD = [[-320, 214], [-240, 156], [-160, 116], [-90, 105], [-20, 103], [40, 106], [90, 104], [140, 99], [200, 106], [270, 124], [360, 150]];
  const LANE_S = [[52, 105], [56, 80], [58, 52], [50, 30], [34, 18], [23, 14]]; // from the village down to the Clos Morin and the stacks
  const LANE_N = [[24, 7], [30, -20], [36, -50], [42, -80], [47, -105]]; // over the meadows to the Epte
  const TOWPATH = [[-70, -121], [-30, -110], [0, -105], [60, -117], [130, -100], [220, -113], [330, -97]]; // the path along the south bank
  const LANE_E = [[100, -103], [106, -60], [112, -14], [117, 26], [118, 60], [112, 99]]; // through the east fields, by the frame, up to the road
  const RU = [[154, -114], [158, -70], [162, -20], [166, 30], [172, 80], [184, 132], [200, 190]]; // the ditch of pollard willows in the east
  const CHURCH = [-36, 122];
  const WAYS = [[ROAD, 3.0], [LANE_S, 1.7], [LANE_N, 1.4], [TOWPATH, 1.1], [LANE_E, 1.5]].map((w) => { const m = w[1] + 3; w.push([Math.min(...w[0].map((p) => p[0])) - m, Math.max(...w[0].map((p) => p[0])) + m, Math.min(...w[0].map((p) => p[1])) - m, Math.max(...w[0].map((p) => p[1])) + m]); return w; });
  const wayD = (w, x, z) => (x < w[2][0] || x > w[2][1] || z < w[2][2] || z > w[2][3] ? 99 : pathDist(x, z, w[0]));
  const roadZ = (x) => { for (let i = 0; i < ROAD.length - 1; i++) { const a = ROAD[i], b = ROAD[i + 1]; if (x >= a[0] && x <= b[0]) return a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0])); } return x < 0 ? ROAD[0][1] : ROAD[ROAD.length - 1][1]; };
  // what the easels see must stay as it was painted: the wedge of each view (widened for wide screens, and a margin), and the bank of the hidden one
  let _sect = null;
  function sects() {
    if (_sect) return _sect;
    return (_sect = CH.spots.filter((s) => !s.hidden).map((s) => { const v = s.view; return { x: v.x, z: v.z, yaw: v.yaw, half: Math.atan(Math.tan((v.fov * DEG) / 2) * 2.0) + 4 * DEG }; }));
  }
  let _gx = NaN, _gz = NaN, _gr = 0;
  function guard(x, z) { if (x === _gx && z === _gz) return _gr; _gx = x; _gz = z; return (_gr = guard0(x, z)); }
  function guard0(x, z) { // 1 where an easel sees, falling to 0 a few degrees outside
    let g = 0;
    for (const s of sects()) {
      const dx = x - s.x, dz = z - s.z;
      if (dx * dx + dz * dz < 9) return 1;
      const a = Math.abs(angDiff(Math.atan2(dx, -dz), s.yaw));
      g = Math.max(g, 1 - sstep(s.half, s.half + 7 * DEG, a));
    }
    // the land behind the wood is out of sight of the first easel, up to where the far hills rise
    if (x < -172 && x * x + z * z < 240 * 240 && z > -150) g = 0;
    if (g < 1 && Math.hypot(Math.max(0, Math.abs(x - RISE[0]) - 5.5), z - RISE[1]) < 19) g = 1;
    return g;
  }
  const h1 = (n, s) => hash2(Math.floor(n), 7 + (s | 0), 911);
  // the open land is cut in strips that run up and down the hill: which strip, how far from its border, which way it runs, what grows there
  const CROPS = ['plough', 'stub', 'oats', 'lucerne', 'beet', 'pasture', 'clover', 'plough', 'stub', 'pasture'];
  const _st = { k: 0, j: 0, edge: 0, ang: 0, crop: 'pasture' };
  function strip(x, z) {
    const u = x + 14 * Math.sin(z * 0.011) + 7 * Math.sin(z * 0.031 + 1.3), W0 = 27, i = Math.floor(u / W0), lu = u - i * W0, cut = W0 * (0.3 + 0.4 * h1(i, 1));
    const k = lu < cut ? 2 * i : 2 * i + 1, l0 = lu < cut ? lu : lu - cut, wk = lu < cut ? cut : W0 - cut;
    const L = 46 + 80 * h1(k, 2), off = h1(k, 3) * L, j = Math.floor((z + off) / L), lv = z + off - j * L;
    _st.k = k; _st.j = j; _st.edge = Math.min(l0, wk - l0, lv, L - lv);
    _st.ang = Math.atan2(1, -0.154 * Math.cos(z * 0.011) - 0.217 * Math.cos(z * 0.031 + 1.3));
    const hill = sstep(roadZ(x) + 40, roadZ(x) + 170, z);
    let c = CROPS[Math.floor(hash2(k, j, 913) * CROPS.length)];
    if (hill > 0.5 && hash2(k, j, 914) < 0.35 * hill) c = hash2(k, j, 915) < 0.5 ? 'orchard' : 'pasture';
    _st.crop = c;
    return _st;
  }
  // the Clos Morin: in the views it keeps the shape it was painted with; seen from elsewhere it is a field with straight sides and rounded corners
  function inClos(x, z, gw) {
    const n = 14 * (vnoise(x * 0.02, z * 0.02, 204) - 0.5), e = Math.hypot((x + 40) / 1.35, z - 16);
    if (gw >= 1) return e < 78 + n;
    const ax = Math.abs(x + 40) / 105, az = Math.abs(z - 16) / (z > 16 ? 70 : 78), s = 78 * Math.pow(ax ** 5 + az ** 5, 0.2);
    return lerp(s, e, gw) < 78 + n * 0.4;
  }
  // a low hedge along a way side or a field border. The leaves come and go with the year, the twiggy heart stays through the winter
  const HEDGE = pal(['#5e8a48', '#6c9450', '#4e7a44', '#7a9c58', '#88a460', '#5a7c5c'], 0.05), HEDGE_SH = pal(['#5a6a68', '#62647c', '#5a6658', '#6a6274', '#74646a', '#7a6a62'], 0.05);
  function hedge(W, pts, o) {
    const S = W.S, R = o.rnd, hh = o.h || 1.7, wd = o.w || 1.2;
    for (let s = 0; s < pts.length - 1; s++) {
      const a = pts[s], b = pts[s + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, nx = -dz, nz = dx;
      for (let d = R() * 1.1; d < L; d += 1.0 + R() * 0.5) {
        const x = a[0] + dx * d, z = a[1] + dz * d;
        if (o.skip && o.skip(x, z)) continue;
        const y = W.h(x, z), hl = hh * (0.75 + 0.5 * vnoise(x * 0.12, z * 0.12, 931));
        for (let i = 0; i < 4; i++) { // two touches of leaf over two of the heart, which stands through the winter
          const side = (R() - 0.5) * 2, up = i >= 2 ? 0.2 + 0.5 * R() : 0.6 + 0.45 * R(), sz = (i >= 2 ? 0.42 : 0.5) * (0.8 + 0.5 * R()) * (wd / 1.2);
          const px = x + nx * side * wd * 0.5 + dx * (R() - 0.5), pz = z + nz * side * wd * 0.5 + dz * (R() - 0.5);
          S.bill(px, y + up * hl, pz, (R() - 0.5) * 0.9, sz * 1.7, sz, i >= 2 ? HEDGE_SH(R) : HEDGE(R), 0.15, CELLS[(R() * 4) | 0], 0, false, nx * side, up, nz * side, i >= 2 ? 0 : FLAG_LEAF);
        }
      }
    }
  }
  // a pollard willow of the ditches: a squat trunk, a knuckle, and a burst of thin rods with grey green leaves
  const WILLOW = pal(['#8aa478', '#9cb088', '#7c9a7a', '#a6b890', '#88a08c'], 0.05), RODS = pal(['#8a6a5a', '#9a7a5e', '#7a5a56', '#a4825a'], 0.05);
  function pollard(W, x, z, R) {
    const y = W.h(x, z), h = 2.2 + R() * 0.8;
    trunk(W, x, y, z, h, 0.36, BARK, [(R() - 0.5) * 0.5, (R() - 0.5) * 0.5], 3);
    twigs(W, x, y + h - 0.2, z, 12, 2.4, RODS);
    leafCloud(W, x, y + h + 1.1, z, { n: 58, rx: 1.9, ry: 1.5, rz: 1.9, size: 0.5, col: (r) => WILLOW(r), sway: 0.3 });
    W.caster({ k: 'ball', x, z, y: h + 1.1, r: 1.8, v: 0.7 }); W.collide(x, z, 0.5);
  }
  // a clump of wood on the far hills, a few broad touches round a heart
  const FAR_WOOD = pal(['#6a8a7c', '#5e7e86', '#748c8a', '#6a7a96', '#7c9286'], 0.05);
  function farWood(W, x, z, r, h, R) {
    const y = W.h(x, z);
    blobSolid(W, x, y + h * 0.45, z, r * 0.8, h * 0.5, r * 0.8, hex('#5c7480'), 0);
    for (let i = 0, n = Math.round(10 + r * 1.2); i < n; i++) {
      const a = R() * TAU, q = r * Math.sqrt(R()) * 0.9, v = 0.3 + 0.7 * R(), sz = r * (0.28 + 0.2 * R());
      W.S.bill(x + Math.cos(a) * q, y + v * h, z + Math.sin(a) * q, (R() - 0.5) * 0.9, sz * 1.7, sz, R() < 0.5 ? FAR_WOOD(R) : jit(hex('#8aa070'), 0.05, R), 0.1, CELLS[(R() * 4) | 0], 0, false, Math.cos(a) * q, v * h, Math.sin(a) * q, R() < 0.4 ? FLAG_LEAF : 0);
    }
  }
  // a grassy bank in the east meadow, off every path: she stands on its top for the painter, who looks up at her from its northern foot.
  // It runs from east to west, and its top lies on a point of the ground's mesh, so that the mesh keeps the whole of its height
  const RISE = [129.22, -70.95, 3.8];
  function rise(x, z) { // 1 along the top, falling evenly to 0 at the foot
    const dx = Math.max(0, Math.abs(x - RISE[0]) - 5.5), d = Math.hypot(dx, z - RISE[1]);
    return d < 15 ? Math.pow(1 - d / 15, 1.25) : 0;
  }
  // the view of her there. She faces the left of the picture, the wind blows the way she faces, and the sun of noon stands behind her on the right
  const VR = { x: 129.22, y: 1.4, z: -81.45, yaw: 3.1416, pitch: 0.196, fov: 21, show: true, pose: 1.5708, act: 2, breeze: 4.2, gale: [1, 0] };
  function height(x, z) {
    let h = 0.5 * (fbm(x * 0.012 + 3, z * 0.012 + 9, 3, 201) - 0.5) * 2 + 0.25 * Math.sin(x * 0.04) * Math.sin(z * 0.033);
    const d = riverD(x, z);
    h -= 3.4 * (1 - sstep(5.5, 11.5, d));
    // low blue hills behind the trees, to the west and north
    const r = Math.hypot(x, z), az = Math.atan2(x, -z);
    h += (20 + 30 * Math.pow(Math.max(0, Math.cos(az + 1.25)), 1.5)) * sstep(250, 440, r) * (1 - 0.8 * sstep(470, 700, r)) * (0.6 + 0.7 * fbm(x * 0.005, z * 0.005, 3, 202));
    h += RISE[2] * rise(x, z);
    // the hill that rises behind the village, with its strip fields and the wood along its crest, and the ditch of the willows in the east.
    // Where an easel looks the ground keeps the height it was painted with
    const g = guard(x, z);
    if (g < 1) {
      const rz = roadZ(x), k = sstep(rz + 8, rz + 200, z), d = pathDist(x, z, RU);
      let e = 56 * Math.pow(k, 1.15) * (0.75 + 0.5 * fbm(x * 0.006 + 2, z * 0.006, 3, 941)) + 2.2 * k * Math.sin(z * 0.045 + x * 0.004);
      if (d < 4.5) e -= 1.1 * (1 - sstep(1.2, 4.5, d)) * sstep(24, 34, riverD(x, z)) * (1 - k);
      // in the wedge the hidden painting looks along, the hill keeps below the line of its bank
      const vx = x - VR.x, vz = z - VR.z, vd = Math.hypot(vx, vz), vw = 1 - sstep(26 * DEG, 36 * DEG, Math.abs(angDiff(Math.atan2(vx, -vz), VR.yaw)));
      if (vw > 0) e = lerp(e, Math.min(e, Math.max(0, 0.1 * vd - 8)), vw);
      h += (1 - g) * e;
    }
    return h;
  }
  const P = {
    stubble: pal(['#d6d08a', '#e0d898', '#ccce80', '#c2d088', '#e6d6a4', '#e0bca8', '#d0d8a4', '#d8c0c6', '#c2c6da'], 0.05, [3, 3, 3, 1.6, 2.4, 1.4, 1, 0.45, 0.3]),
    rose: pal(['#e2c6a0', '#dcb8a2', '#e6d0a8', '#d6b4b0', '#d8cc92', '#ccb6ca'], 0.05, [3, 3, 2, 1.4, 3, 0.6]),
    lush: pal(['#bccc7a', '#b2c67c', '#c8d088', '#a8c074', '#d2d490', '#b8c4b0'], 0.05, [3, 3, 2, 2, 2, 0.5]),
    grass: pal(['#98b254', '#aaba5e', '#86a44c', '#bcc46c', '#7c9c52', '#c8bc74'], 0.05, [3, 3, 3, 2, 2, 1]),
    bank: pal(['#7c9a4c', '#8ea654', '#6c8c48', '#a2b060', '#5f8a4c', '#8890a4'], 0.05, [3, 3, 3, 2, 2, 0.6]),
    hill: pal(['#7a92a8', '#8aa0b4', '#6a84a0', '#96a6b0', '#8a9a8a', '#9292b6'], 0.04),
    far: pal(['#9ab068', '#a8b870', '#8aa460', '#b8b878'], 0.05),
    stub: pal(['#d4cc84', '#dcd490', '#c4c276', '#b8c676'], 0.04),
  };
  const BASE = { stubble: hex('#d0ca86'), grass: hex('#96ae54'), bank: hex('#6c8e46'), hill: hex('#7890a4'), far: hex('#98ac66') };
  // the quilt: every kind of ground its own palette (local colours; the season and the light come in the shader)
  const Q = {
    road: pal(['#e2d4b6', '#d6c4a8', '#eadcc4', '#ccb8aa', '#dccab8', '#c4b0a0'], 0.04, [3, 3, 2, 1, 2, 1]),
    verge: pal(['#86a850', '#96b05a', '#78984c', '#a4b464', '#8ca07c'], 0.05),
    meadow: pal(['#8cb05c', '#9cbc64', '#7aa458', '#b0c070', '#88a890', '#a4b878'], 0.05, [3, 3, 2, 2, 0.6, 1]),
    pasture: pal(['#a0b85c', '#94b058', '#b0bc68', '#88a854', '#bcc070'], 0.05),
    plough: pal(['#c4a48c', '#b89c86', '#ccb096', '#aa968e', '#bea690', '#d2b69c'], 0.04, [3, 3, 2, 1, 2, 1]),
    stub: pal(['#dccc8a', '#e4d498', '#d0c07c', '#e6d0a4', '#d8c09c'], 0.04),
    oats: pal(['#d4c470', '#c8c06c', '#dccc80', '#bcbc6c', '#d0b878'], 0.04),
    lucerne: pal(['#6e9a50', '#7ca458', '#628e4c', '#8a9cb4', '#78a060'], 0.05, [3, 3, 2, 0.6, 2]),
    beet: pal(['#5e8c68', '#6a9670', '#548060', '#7c9a84', '#a49488'], 0.05, [3, 3, 2, 1, 1.4]),
    clover: pal(['#a4b070', '#b0b47c', '#c4a4a0', '#98a86c', '#c8b0b4'], 0.05, [3, 2, 1.2, 2, 1]),
    orchard: pal(['#a4bc68', '#98b45e', '#b4c474', '#8cac5c'], 0.05),
    garden: pal(['#7c9c58', '#a0a868', '#8c8a6c', '#b49a80', '#6c9a64', '#c0a88c'], 0.05),
    yard: pal(['#d4c4aa', '#c8b8a2', '#bcac9c', '#ccbca0', '#a8a088'], 0.04),
  };
  const QB = {}; for (const k in Q) QB[k] = Q[k](mulberry32(5));
  const HAZE = hex('#8c9cb4');
  // the old zones are kept wherever an easel looks; c: and f: are the near and the far strips of the quilt
  const crop = (zn) => (zn.charCodeAt(1) === 58 ? zn.slice(2) : zn);
  let _zx = NaN, _zz = NaN, _zr = '', _zang = 0;
  function zone(x, z) { if (x === _zx && z === _zz) return _zr; _zx = x; _zz = z; return (_zr = zone0(x, z)); }
  let _ox = NaN, _oz = NaN, _or = '';
  function old0(x, z) { if (x === _ox && z === _oz) return _or; _ox = x; _oz = z; return (_or = old00(x, z)); }
  function old00(x, z) {
    const r = Math.hypot(x, z);
    if (r > 255 + 30 * vnoise(x * 0.01, z * 0.01, 203)) return 'hill';
    if (riverD(x, z) < 16) return 'bank';
    const n = 14 * (vnoise(x * 0.02, z * 0.02, 204) - 0.5);
    if (Math.hypot((x + 40) / 1.35, z - 16) < 78 + n) return 'stubble';
    return r > 190 ? 'far' : 'grass';
  }
  function zone0(x, z) {
    if (isOld(x, z)) return old0(x, z);
    const gw = guard(x, z);
    if (riverD(x, z) < 16) return 'bank';
    for (const w of WAYS) { const d = wayD(w, x, z); if (d < w[1] + 1.4) return d < w[1] ? 'road' : 'verge'; }
    const r = Math.hypot(x, z);
    if (r > 255 + 30 * vnoise(x * 0.01, z * 0.01, 203)) { const st = strip(x * 0.7, z * 0.7); _zang = st.ang; return st.edge < 0.6 ? 'f:verge' : 'f:' + st.crop; }
    const dz = z - roadZ(x);
    if (Math.hypot(x - CHURCH[0], z - CHURCH[1]) < 15) return 'yard';
    if (dz > -16 && dz < 36 && x > -170 && x < 165) { const c = hash2(Math.floor((x + 9 * Math.sin(z * 0.1)) / 19), dz > 0 ? 1 : 0, 953); return dz > 0 && dz < 11 && c < 0.45 ? 'yard' : c < 0.6 ? 'orchard' : c < 0.85 ? 'garden' : 'pasture'; }
    if (inClos(x, z, gw)) return 'stubble';
    if (z < RIVER_Z(x) || (riverD(x, z) < 80 && z < -42 + 14 * Math.sin(x * 0.013))) return 'meadow';
    const st = strip(x, z);
    _zang = st.ang;
    return st.edge < 0.9 ? 'verge' : 'c:' + st.crop;
  }
  function oldCol(x, z, rnd) {
    const zn = old0(x, z);
    // the cut field is not one colour: it drifts from straw to rose, and to green where the grass comes back
    if (zn === 'stubble') { const v = vnoise(x * 0.045 + 7, z * 0.045 + 3, 205); return v > 0.6 && rnd() < 0.45 ? P.rose(rnd) : v < 0.36 && rnd() < 0.35 ? P.lush(rnd) : P.stubble(rnd); }
    return P[zn](rnd);
  }
  let PR = mulberry32(4401); // chance for all that is new, apart from the stream the paintings were laid with
  const isOld = (x, z) => { const gw = guard(x, z); return gw > 0 && (gw >= 1 || vnoise(x * 0.25, z * 0.25, 951) < gw); };
  // run an old task exactly as before, but keep only its strokes where an easel looks (the others still draw their seeds)
  function keepOld(W, fn) {
    const S = W.S;
    W.S = {
      add(x, y, z, dx, dy, dz, nx, ny, nz, len, wid, c, mo, cell, glow, fl) { if (isOld(x, z)) S.add(x, y, z, dx, dy, dz, nx, ny, nz, len, wid, c, mo, cell, glow, fl); else S.rnd(); },
      bill(x, y, z, roll, len, wid, c, mo, cell, glow, dome, px, py, pz, ex) { if (isOld(x, z)) S.bill(x, y, z, roll, len, wid, c, mo, cell, glow, dome, px, py, pz, ex); else S.rnd(); },
    };
    try { fn(); } finally { W.S = S; }
  }
  function withRnd(W, fn) { const r0 = W.rnd; W.rnd = PR; try { fn(); } finally { W.rnd = r0; } }
  const ground = {
    col(x, z, rnd) {
      // the old colour is always drawn, so that the stream of chance runs as it did for everything painted after the ground
      const o = oldCol(x, z, rnd);
      if (isOld(x, z)) return o;
      const zn = zone(x, z);
      if (zn === 'stubble') return oldCol(x, z, PR);
      if (P[zn]) return P[zn](PR);
      const c = Q[crop(zn)](PR);
      if (zn.charCodeAt(0) === 102) return mixc(c, HAZE, 0.25 + 0.4 * sstep(255, 520, Math.hypot(x, z)));
      return c;
    },
    dir(x, z) {
      const zn = zone(x, z);
      if (zn === 'bank') return pathAngle(x, z, RIVER);
      if (zn === 'road') { let b = 1e9, a = 0; for (const w of WAYS) { const d = pathDist(x, z, w[0]); if (d < b) { b = d; a = pathAngle(x, z, w[0]); } } return a; }
      if (zn.charCodeAt(1) === 58) return _zang; // the way the strip runs, found with its zone
      return 0.25 + 0.5 * Math.sin(x * 0.02 + z * 0.013);
    },
    mask(x, z) { return riverD(x, z) < 6.4 ? 0 : 1; },
  };
  const baseOf = (x, z) => { const zn = zone(x, z); if (BASE[zn]) return BASE[zn]; const c = QB[crop(zn)]; return zn.charCodeAt(0) === 102 ? mixc(c, HAZE, 0.4) : c; };

  // how thick the grass and the crops stand on each kind of ground, and in what colours
  const CROP_M = { grass: 0.85, stubble: 0.22, meadow: 0.66, 'c:pasture': 0.5, pasture: 0.55, verge: 0.75, 'c:lucerne': 0.45, 'c:clover': 0.4, 'c:beet': 0.28, 'c:stub': 0.2, orchard: 0.5, garden: 0.3, yard: 0.04 };
  const CROP_C = { meadow: (r) => P.grass(r), 'c:pasture': (r) => P.grass(r), pasture: (r) => P.grass(r), verge: (r) => (r() < 0.3 ? P.bank(r) : P.grass(r)),
    'c:lucerne': (r) => (r() < 0.12 ? jit(hex('#9a88c0'), 0.06, r) : Q.lucerne(r)), 'c:clover': (r) => (r() < 0.2 ? jit(hex('#d4a0a8'), 0.06, r) : Q.clover(r)), 'c:beet': (r) => Q.beet(r),
    'c:stub': (r) => P.stub(r), orchard: (r) => P.grass(r), garden: (r) => Q.garden(r), yard: (r) => P.grass(r) };
  const FLOWERS = pal(['#e8483a', '#f6f0e4', '#f2d048', '#e87868', '#ffffff'], 0.04, [3, 2, 2, 1, 1]);
  const FLOWER_M = { grass: 0.6, stubble: 0.12, meadow: 0.5, verge: 0.8, 'c:pasture': 0.35, pasture: 0.35, 'c:clover': 0.3, orchard: 0.3, garden: 0.4 };

  // ---------- painters of this world ----------
  const CELLS = [CELL.HEAVY, CELL.DAB, CELL.COMMA, CELL.COMMA_S, CELL.DAB, CELL.BLOCK], HATCHES = [CELL.LONG_A, CELL.COMMA, CELL.COMMA_S, CELL.HEAVY, CELL.LONG_B];
  // the place a view sees at f metres ahead and r metres to its right, and the other way round
  const ahead = (v, f, r) => [v.x + Math.sin(v.yaw) * f + Math.cos(v.yaw) * r, v.z - Math.cos(v.yaw) * f + Math.sin(v.yaw) * r];
  const seen = (v, x, z) => [(x - v.x) * Math.sin(v.yaw) - (z - v.z) * Math.cos(v.yaw), (x - v.x) * Math.cos(v.yaw) + (z - v.z) * Math.sin(v.yaw)];
  // the wedge of ground an easel looks across: 1 inside, thinning towards its far end
  function wedge(x, z, v, d0, d1, half) {
    const dx = x - v.x, dz = z - v.z, d = Math.hypot(dx, dz);
    if (d < d0 || d > d1 || Math.abs(angDiff(Math.atan2(dx, -dz), v.yaw)) > half) return 0;
    return 1 - 0.55 * sstep(d1 * 0.6, d1, d);
  }

  // a grainstack in coats. Underneath, the dark warm thatch that winter leaves bare. Over it the straw of the summer: laid broadly first, so that the
  // thatch does not show through, then in small touches, then hatched with thin ones. The season takes the straw away again: most of it turns with
  // the autumn and is gone with the leaves, the rest sinks under the snow
  const PROF = [[0, 0.88], [0.2, 0.95], [0.38, 1.0], [0.45, 1.06], [0.62, 0.84], [0.8, 0.5], [0.93, 0.2], [1.0, 0.03]]; // height fraction, radius fraction
  const THATCH = pal(['#9a6a54', '#a8745a', '#8a5c50', '#7c5458', '#b08060', '#6e4c5c', '#5e4a66'], 0.05, [3, 3, 3, 2, 2, 1, 1]);
  const FOOT = pal(['#7a4c48', '#6a4450', '#8a5446', '#5c4660'], 0.05);
  const STRAW_BODY = pal(['#d6a888', '#d0a288', '#ca9e8e', '#d8ae8c', '#c09aa0'], 0.04, [3, 3, 2, 2, 0.8]);
  const STRAW_CAP = pal(['#e4c098', '#e0b890', '#dab08e', '#e6c8a0', '#d2a8a4'], 0.04, [3, 3, 2, 2, 0.8]);
  const HATCH = pal(['#f0d2a8', '#e8c098', '#e4b094', '#dcaeb0', '#ccaec4', '#f2dcb8', '#d8b4a4', '#c8b4cc'], 0.05, [3, 3, 2, 2, 1, 2, 2, 1]);
  function stack(W, x, z, s, fine) {
    const S = W.S, rnd = W.rnd, y0 = W.h(x, z) - 0.3, R = 3.1 * s, H = 5.6 * s;
    for (let k = 0; k < PROF.length - 1; k++) tower(W, { x, z, y0: y0 + PROF[k][0] * H, y1: y0 + PROF[k + 1][0] * H, r0: R * PROF[k][1], r1: R * PROF[k + 1][1], sides: 14, wall: null, base: k >= 3 ? hex('#b89480') : hex('#a07868') });
    // one coat of touches all round. o: step, len, wid, lift, col(rnd, v), flag(rnd), cells, jit [on the body, on the cap] and lean (how the touches lie to the
    // run of the thatch), twist(rnd, v): how far a touch of the cap is turned on its own length, away from the sky (snow lies only on what faces the sky)
    const coat = (o) => {
      const cells = o.cells || CELLS, jit = o.jit || [2.8, 1.2], lean = o.lean || 0;
      for (let k = 0; k < PROF.length - 1; k++) {
        const a = PROF[k], b = PROF[k + 1], dh = (b[0] - a[0]) * H, dr = (b[1] - a[1]) * R, sl = Math.hypot(dh, dr), rows = Math.max(1, Math.round(sl / o.step)), cap = k >= 3;
        for (let j = 0; j < rows; j++) {
          const n = Math.max(3, Math.round((TAU * R * (a[1] + (b[1] - a[1]) * ((j + 0.5) / rows))) / o.step));
          for (let i = 0; i < n; i++) {
            const u = (j + rnd()) / rows, v = a[0] + (b[0] - a[0]) * u, r = R * (a[1] + (b[1] - a[1]) * u) + o.lift, ang = ((i + rnd()) / n) * TAU, ca = Math.cos(ang), sa = Math.sin(ang);
            const phi = lean + (rnd() - 0.5) * (cap ? jit[1] : jit[0]), cp = Math.cos(phi), sp = Math.sin(phi), mx = ca * dr / sl, my = dh / sl, mz = sa * dr / sl;
            const th = cap && o.twist ? o.twist(rnd, v) : 0, ct = Math.cos(th), st = Math.sin(th);
            S.add(x + ca * r, y0 + v * H, z + sa * r, mx * cp - sa * sp, my * cp, mz * cp + ca * sp, (ca * dh / sl) * ct + (-sa * cp - mx * sp) * st, (-dr / sl) * ct - my * sp * st, (sa * dh / sl) * ct + (ca * cp - mz * sp) * st,
              o.len * (0.7 + rnd() * 0.6), o.wid * (0.7 + rnd() * 0.6), o.col(rnd, v), 0, cells[(rnd() * cells.length) | 0], 0, o.flag(rnd));
          }
        }
      }
    };
    const year = (r) => (r() < 0.5 ? FLAG_GRASS : FLAG_LEAF), straw = (r, v) => (v > 0.45 ? STRAW_CAP(r) : STRAW_BODY(r));
    // the straw lies well clear of the thatch, whose turned touches stand a little proud of the stack
    coat({ step: fine ? 0.27 : 0.42, len: fine ? 0.78 : 0.9, wid: fine ? 0.22 : 0.36, lift: 0.05, col: (r, v) => (v < 0.16 && r() < 0.5 ? FOOT(r) : THATCH(r)), flag: () => 0,
      twist: (r, v) => (r() < 0.1 + 0.45 * ((v - 0.45) / 0.55) ? 0 : (r() < 0.5 ? -1 : 1) * (1.15 + 0.3 * r())) });
    coat({ step: fine ? 0.36 : 0.34, len: fine ? 1.0 : 0.9, wid: fine ? 0.46 : 0.42, lift: 0.17, col: straw, flag: (r) => (r() < 0.2 ? FLAG_GRASS : FLAG_LEAF), jit: [1.8, 0.9], cells: [CELL.HEAVY, CELL.DAB, CELL.BLOCK, CELL.DAB] });
    if (fine) {
      coat({ step: 0.18, len: 0.44, wid: 0.17, lift: 0.21, col: straw, flag: year, jit: [2.0, 1.0] });
      coat({ step: 0.24, len: 0.4, wid: 0.09, lift: 0.25, col: (r) => HATCH(r), flag: year, jit: [1.2, 0.7], lean: 0.7, cells: HATCHES });
    }
    // loose straw at the foot
    for (let i = 0; i < 46; i++) { const a = rnd() * TAU, r = R * (0.9 + rnd() * 0.5); S.add(x + Math.cos(a) * r, y0 + 0.36, z + Math.sin(a) * r, Math.cos(a + 1.3), 0.12, Math.sin(a + 1.3), 0, 1, 0, 0.5 + rnd() * 0.5, 0.17, STRAW_CAP(rnd), 0, CELL.LONG_B, 0, FLAG_GROUND); }
    W.caster({ k: 'cone', x, z, r: R * 1.1, h: H * 0.96 }); W.caster({ k: 'ball', x, z, y: H * 0.3, r: R * 0.98 });
    W.collide(x, z, R * 1.14);
  }

  // a clump of the far wood: a cool heart that stands through the year, cool touches in its shade, and over its lit crown the leaves that turn and fall
  const HEART = pal(['#93a882', '#8aa08c', '#9498a0', '#88a47c', '#9aa294'], 0.04), COOL = pal(['#86a8a2', '#8eaab2', '#8a92b6', '#7a9c8e', '#98a4c0', '#94b0b6'], 0.05);
  const BARK = pal(['#7a6a78', '#8a7682', '#6a5e70', '#94808a'], 0.04);
  function copse(W, x, z, r, h, leaf, o) {
    o = o || {};
    const S = W.S, rnd = W.rnd, y = W.h(x, z), n = o.n || Math.round(r * h * 1.5), size = o.size || r * 0.26;
    blobSolid(W, x, y + h * 0.5, z, r * 0.64, h * 0.44, r * 0.64, o.heart || HEART(rnd), 0);
    for (let i = 0; i < n; i++) {
      const top = rnd() < 0.66, v = top ? 0.34 + 0.66 * Math.pow(rnd(), 0.7) : 0.06 + 0.7 * rnd(), a = rnd() * TAU;
      const q = r * Math.sqrt(Math.max(0.05, 1 - Math.pow(Math.max(0, v - 0.4) / 0.62, 2))) * (0.62 + 0.46 * rnd()), ox = Math.cos(a) * q, oz = Math.sin(a) * q, sz = size * (0.6 + rnd() * 0.8);
      S.bill(x + ox, y + v * h, z + oz, (rnd() - 0.5) * 0.9, sz * 1.7, sz, top ? leaf(rnd, v) : COOL(rnd), 0.15, CELLS[(rnd() * 4) | 0], 0, false, ox, top ? (v - 0.3) * h * 1.2 : (v - 0.1) * h * 0.9, oz, top ? FLAG_LEAF : 0);
    }
    if (!o.bare) for (let i = 0; i < 2; i++) { const a = rnd() * TAU; trunk(W, x + Math.cos(a) * r * 0.4, y, z + Math.sin(a) * r * 0.4, h * 0.45, 0.16, BARK, [0, 0], 3); }
    W.caster({ k: 'ball', x, z, y: h * 0.5, r: r * 0.9, v: 0.8 });
    W.collide(x, z, Math.max(0.5, r * 0.4));
  }

  // one of the tall pruned poplars of the Epte: a pale shaft that leans a little, tufts of leaves close against it, its plume far overhead
  const SHAFT = pal(['#9a8cae', '#9286a8', '#a294b0', '#8a80a8', '#a898ac'], 0.035), TUFT = pal(['#5c6a8c', '#506e7c', '#66709a', '#4c7068', '#6a7c94', '#5a8060', '#6a8a5c'], 0.05);
  function shaft(W, a, b, r0, r1) { // a length of the shaft between two centres, six sided: solid underneath, upright touches over it
    for (let i = 0; i < 6; i++) {
      const t0 = ((i + 1) / 6) * TAU, t1 = (i / 6) * TAU;
      const p = [a[0] + Math.cos(t0) * r0, a[1], a[2] + Math.sin(t0) * r0], q = [a[0] + Math.cos(t1) * r0, a[1], a[2] + Math.sin(t1) * r0];
      const c = [b[0] + Math.cos(t1) * r1, b[1], b[2] + Math.sin(t1) * r1], d = [b[0] + Math.cos(t0) * r1, b[1], b[2] + Math.sin(t0) * r1];
      W.quad(p, q, c, d, hex('#9288aa'));
      paintQuad(W, p, q, c, d, { step: 0.4, len: 0.62, wid: 0.17, along: 'v', col: SHAFT, jit: 0.5, lift: 0.04, cells: [CELL.HEAVY, CELL.LONG_A, CELL.DAB, CELL.COMMA] });
    }
  }
  function pruned(W, x, z, h, lx, lz, leaf) { // lx, lz: lean, in metres for each metre of height
    const S = W.S, rnd = W.rnd, y = W.h(x, z) - 0.25, n = 9, at = (t) => [x + lx * t * h, y + t * h, z + lz * t * h];
    for (let i = 0; i < n; i++) shaft(W, at((i / n) * 0.6), at(((i + 1) / n) * 0.6), 0.21 - 0.09 * (i / n), 0.21 - 0.09 * ((i + 1) / n));
    const m0 = at(0.6);
    trunk(W, m0[0], m0[1], m0[2], h * 0.38, 0.09, SHAFT, [lx * h * 0.38, lz * h * 0.38], 6);
    for (let k = 0, tufts = Math.round(h * 1.3); k < tufts; k++) {
      const t = 0.13 + 0.5 * Math.pow(rnd(), 0.8), c = at(t), a = rnd() * TAU, off = 0.12 + rnd() * 0.36, cx = c[0] + Math.cos(a) * off, cz = c[2] + Math.sin(a) * off, rr = 0.3 + rnd() * 0.35 + 0.35 * t;
      for (let i = 0, m = 10 + Math.round(rnd() * 8); i < m; i++) {
        const b = rnd() * TAU, q = rr * Math.sqrt(rnd()), ox = Math.cos(b) * q, oz = Math.sin(b) * q, oy = (rnd() - 0.5) * rr * 2.2, sz = 0.15 + rnd() * 0.15, cool = rnd() < 0.75;
        S.bill(cx + ox, c[1] + oy, cz + oz, (rnd() - 0.5) * 0.9, sz * 1.8, sz, cool ? TUFT(rnd) : leaf(rnd, t), 0.3, rnd() < 0.5 ? CELL.DAB : CELL.COMMA, 0, false, cx + ox - c[0], 0.3 + oy, cz + oz - c[2], cool ? 0 : FLAG_LEAF);
      }
    }
    for (let i = 0; i < 170; i++) { // the plume
      const u = Math.pow(rnd(), 0.9), t = 0.6 + 0.4 * u, c = at(t), r = 1.6 * Math.pow(Math.sin(Math.PI * clamp(0.1 + 0.86 * u, 0, 1)), 0.8) * Math.sqrt(rnd()), a = rnd() * TAU, ox = Math.cos(a) * r, oz = Math.sin(a) * r, s = 0.34 + rnd() * 0.34;
      S.bill(c[0] + ox, c[1], c[2] + oz, (rnd() - 0.5) * 0.9, s * 1.8, s, leaf(rnd, u), 0.35, rnd() < 0.5 ? CELL.DAB : CELL.COMMA, 0, false, ox, 0.4 + u * 0.7, oz, FLAG_LEAF);
    }
    W.caster({ k: 'pole', x, z, h: h * 0.6, r: 0.3, v: 0.8 }); W.caster({ k: 'ball', x: x + lx * h * 0.8, z: z + lz * h * 0.8, y: h * 0.8, r: 1.4, v: 0.7 });
    W.collide(x, z, 0.5);
  }
  // a poplar of the line that goes away behind them, seen whole: a thin stem, and a long feathered head of leaves round a slim heart
  function plume(W, x, z, h, rad, leaf, n) {
    const S = W.S, rnd = W.rnd, y = W.h(x, z), cy = y + h * 0.58, ry = h * 0.42;
    trunk(W, x, y, z, h * 0.5, 0.2, BARK, [(rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.6], 5);
    blobSolid(W, x, cy, z, rad * 0.42, ry * 0.8, rad * 0.42, hex('#a4b466'), 1);
    for (let i = 0; i < n; i++) {
      let px = rnd() * 2 - 1, py = rnd() * 2 - 1, pz = rnd() * 2 - 1;
      const l = Math.hypot(px, py, pz) || 1, r = 0.35 + 0.65 * Math.sqrt(rnd()), sz = rad * (0.11 + 0.1 * rnd());
      px = (px / l) * r; py = (py / l) * r; pz = (pz / l) * r;
      S.bill(x + px * rad, cy + py * ry, z + pz * rad, (rnd() - 0.5) * 0.9, sz * 1.8, sz, leaf(rnd, py * 0.5 + 0.5), 0.3, CELLS[(rnd() * 4) | 0], 0, false, px * rad, py * ry * 0.5 + 0.3 * rad, pz * rad, FLAG_LEAF);
    }
    W.caster({ k: 'ball', x, z, y: h * 0.6, r: rad * 0.9, v: 0.75 });
    W.collide(x, z, 0.5);
  }

  function build(W) {
    PR = mulberry32(4401);
    const T = W.tasks, rnd = W.rnd, V0 = CH.spots[0].view, V1 = CH.spots[1].view;
    W.waterY = WATER_Y;
    T.push(() => W.fillTerrain(height, baseOf));
    groundRings(W, ground, { cx: -10, cz: -30, r2: 330, len: [1.0, 5.0, 20], wid: [0.45, 1.8, 6.0], discs: [[-8, 6, 78], [-70, 20, 62], [52, 40, 52], [112, 34, 34], [-80, -50, 50], [-20, -70, 56], [40, -100, 50], [-55, 86, 30]] });
    // across the field where the first easel looks, the ground is laid in smaller touches still, every way
    T.push(() => paintGround(W, { x0: V0.x - 48, x1: V0.x + 3, z0: V0.z - 41, z1: V0.z + 11, step: 0.5, len: 0.56, wid: 0.22, lift: 0.09, dir: ground.dir, jit: 2.7, cells: CELLS, col: ground.col,
      mask: (x, z) => { for (let i = 0; i < 2; i++) if (Math.hypot(x - STACKS[i][0], z - STACKS[i][1]) < STACKS[i][2] * 2.9) return 0; return wedge(x, z, V0, 9, 47, 0.57); } }));
    // and so is the bank across the water from the second
    T.push(() => paintGround(W, { x0: V1.x - 28, x1: V1.x + 24, z0: V1.z - 30, z1: V1.z - 8, step: 0.42, len: 0.5, wid: 0.2, lift: 0.08, dir: ground.dir, jit: 2.4, cells: CELLS, col: ground.col,
      mask: (x, z) => { const q = seen(V1, x, z); return q[0] > 13.6 && q[0] < 24 && Math.abs(q[1]) < 18 && height(x, z) > WATER_Y + 0.05 ? 1 : 0; } }));
    for (let i = 0; i < 3; i++) T.push(() => paintSky(W, { n: 5200 }));
    // the grainstacks
    T.push(() => STACKS.forEach((s, i) => stack(W, s[0], s[1], s[2], i < 2)));
    // the wood and the farm roofs behind them
    T.push(() => {
      const leaf = (r, t) => jit(mixc(hex('#7c9e56'), hex('#c0cc74'), r() * (0.4 + 0.6 * t)), 0.04, r), blue = (r, t) => jit(mixc(hex('#6a9a80'), hex('#a6c498'), r() * t), 0.04, r);
      const r2 = mulberry32(2301);
      // the farm: a long low house seen between the two stacks, another to the right of the large one, two more among the trees
      const FARM = [[-118, -23, -1.15, 16, 2.7, 2.6], [-103, -88, -0.82, 13, 2.8, 2.8], [-156, 18, 1.3, 12, 3.2, 3.4], [-144, 74, 0.1, 13, 3.2, 3.4]];
      const clear = (x, z) => { for (const f of FARM) if (Math.hypot(x - f[0], z - f[1]) < 15) return false; return riverD(x, z) > 14; };
      for (let i = 0; i < 78; i++) {
        const z = -190 + i * 5.1 + r2() * 4, x = -124 - r2() * 34 + 12 * Math.sin(z * 0.02), pick = r2(), a = r2(), b = r2();
        if (!clear(x, z)) continue;
        if (pick < 0.42) poplar(W, x, z, 13 + a * 6, b < 0.5 ? leaf : blue, BARK, { from: 0.16, rad: 1.6, n: 170, shaft: 0.16 });
        else copse(W, x, z, 4.6 + a * 3, 9 + b * 6, pick < 0.8 ? leaf : blue);
      }
      // a nearer row closes the wood into one band behind the stacks, and a tall mass stands at the shoulder of the large one
      for (let z = 46; z > -118; z -= 5.2 + r2() * 2.4) {
        const x = -119 - r2() * 9 + 5 * Math.sin(z * 0.05), a = r2(), b = r2();
        if (clear(x, z)) copse(W, x, z, 5 + a * 2.6, 9.5 + b * 5.5, b < 0.7 ? leaf : blue);
      }
      copse(W, -99, -68, 7.4, 15.5, blue, { n: 170 });
      for (let i = 0; i < 26; i++) {
        const a = r2() * TAU, rr = 150 + r2() * 90, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        if (x < -100 || riverD(x, z) < 22) continue;
        roundTree(W, x, z, 3 + r2() * 3, 2.2 + r2() * 2, leaf, BARK, hex('#6a946c'));
      }
      const wall = pal(['#e6dcc4', '#d8ccb4', '#eee4d0', '#dcd0c8'], 0.03), roof = pal(['#a8848a', '#b4908c', '#9c7c8c', '#b89a94', '#9488a0', '#b08478'], 0.04), win = pal(['#5a6a7a'], 0.03);
      for (const f of FARM)
        house(W, { x: f[0], z: f[1], w: f[3], d: 6.5, h: f[4], rh: f[5], yaw: f[2], wall, wallBase: hex('#e0d6be'), roof, roofBase: hex('#a88a8e'), windows: [{ side: 1, u: 0.3, v: 0.55 }, { side: 1, u: 0.7, v: 0.55 }], win, door: win, step: 0.8, len: 1.7, wid: 0.55 });
    });
    // poplars along the Epte, on the far bank, following its turns
    T.push(() => {
      const leaf = (r, t) => jit(mixc(hex('#84a450'), hex('#d0cc6c'), r() * (0.35 + 0.65 * t)), 0.05, r);
      const r2 = mulberry32(2302);
      for (let x = -150; x < 190; x += 7.5 + r2() * 1.5) {
        let best = 1e9, bz = 0;
        for (let z = -175; z < -100; z += 0.5) { const d = Math.abs(riverD(x, z) - 11.5); if (d < best && z < RIVER_Z(x)) { best = d; bz = z; } }
        const px = x + r2() * 1.2, pz = bz + r2() * 1.2, h = 21 + r2() * 5;
        if (px > 34 && px < 59) continue; // here stand the four he painted
        poplar(W, px, pz, h, leaf, BARK, { from: 0.4, rad: 1.7, n: Math.hypot(px - 50, pz + 124) < 48 ? 430 : 200 });
      }
      for (let i = 0; i < 40; i++) {
        const x = -160 + r2() * 360, z = RIVER_Z(x) - 20 - r2() * 40, r = 2 + r2() * 2.2, q = seen(V1, x, z);
        if (q[0] > 0 && q[0] < 54 && Math.abs(q[1]) < 17) continue; // nothing tall close behind the four trees: the water under them keeps the sky
        bush(W, x, z, r, leaf, hex('#6a9458'));
      }
      // the four trees, evenly along the bank across the water from the second easel; the outer ones lean out a little, as the eye that looks up at them wants
      [-7.5, -2.5, 2.5, 7.5].forEach((s, i) => { const p = ahead(V1, 17, s), k = s * 0.0065; pruned(W, p[0], p[1], 24 + (i % 2) * 1.5, Math.cos(V1.yaw) * k, Math.sin(V1.yaw) * k, leaf); });
      // low growth along the top of the bank behind them
      for (let s = -17; s <= 17; s += 2.3 + r2() * 0.8) { const p = ahead(V1, 23 + 4 * r2(), s); copse(W, p[0], p[1], 1.5 + r2() * 0.8, 0.9 + r2() * 0.6, leaf, { bare: true, size: 0.4, n: 26, heart: hex('#6f9070') }); }
      // and the line of poplars the river carries away behind them, going off to the right and coming back along the far meadow
      const LINE = [[13, -171], [17, -180], [22, -191], [28, -205], [37, -222], [48, -241], [62, -265], [79, -291], [97, -322], [115, -357], [131, -394]];
      for (let k = 0; k < LINE.length - 1; k++) {
        const a = LINE[k], b = LINE[k + 1], m = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / (5.5 + k * 0.9)));
        for (let j = 0; j < m; j++) plume(W, lerp(a[0], b[0], j / m) + r2() * 1.5, lerp(a[1], b[1], j / m) + r2() * 1.5, Math.max(17, 21 - k * 0.8) + r2() * 1.5, k < 5 ? 3.9 : 3.5, leaf, k < 5 ? 280 : 130);
      }
      for (const p of [[137, -436], [126, -469], [100, -494], [64, -513], [18, -527], [-33, -537], [-88, -545], [-147, -549], [-208, -551], [-271, -551]])
        plume(W, p[0] + r2() * 6, p[1] + r2() * 6, 18 + r2() * 5, 4.4, leaf, 70);
    });
    // grass, reeds on the banks (kept short under the four trees), and what flowers the late summer leaves
    // (the old lawn's grass is laid as it always was, and kept only where an easel looks: elsewhere the quilt has its own, laid at the end)
    T.push(() => keepOld(W, () => paintCrop(W, { x0: -170, x1: 150, z0: -112, z1: 140, step: 1.86, h: 0.34, w: 0.09, cluster: 3, spread: 0.2, lean: 0.5,
      mask: (x, z) => { const zn = old0(x, z); return zn === 'grass' ? 0.85 : zn === 'stubble' ? 0.22 : 0; }, col: (x, z, r) => (old0(x, z) === 'grass' ? P.grass(r) : P.stub(r)) })));
    T.push(() => paintCrop(W, { x0: -190, x1: 220, z0: -168, z1: -100, step: 1.0, h: 0.95, w: 0.075, cluster: 5, spread: 0.26, lean: 0.4, sway: 0.5,
      size: (x, z) => { const q = seen(V1, x, z); return q[0] > 8 ? 0.4 + 0.6 * sstep(15, 30, Math.abs(q[1])) : 1; },
      mask: (x, z) => { const d = riverD(x, z); return d > 7.4 && d < 11.5 ? 0.8 : 0; }, col: (x, z, r) => (r() < 0.14 ? jit(hex('#7c84a8'), 0.05, r) : jit(mixc(hex('#5c8444'), hex('#98ac58'), r()), 0.04, r)) }));
    T.push(() => keepOld(W, () => flowers(W, { x0: -150, x1: 150, z0: -100, z1: 140, step: 2.6, h: 0.5, size: 0.2,
      mask: (x, z) => (wedge(x, z, V0, 0, 75, 0.66) > 0 ? 0 : old0(x, z) === 'grass' ? 0.6 : old0(x, z) === 'stubble' ? 0.12 : 0), col: FLOWERS })));
    // the Epte
    waterRings(W, { cx: 20, cz: -130, r1: 110, r2: 260, col: pal(['#8c9cac', '#98a8b4', '#8494a8', '#a4b0b8', '#9c98b0'], 0.05), dir: (x, z) => pathAngle(x, z, RIVER), jit: 0.25, mask: (x, z) => riverD(x, z) < 12, box: [-430, 430, -200, -90] });
    T.push(() => { for (const s of CH.spots) { const e = s.easel || [s.x + 1.2, s.z + 0.6]; easelProp(W, e[0], e[1], s.view.yaw); } });
    // the wide touches of the meadow that fell on the bank would stand up like boards before an eye that looks along its slope: they are made small
    T.push(() => {
      const S = W.S;
      for (let i = 0; i < S.n; i++) {
        const o = i * 4;
        if (S.sca[o] > 2 && Math.floor(S.sca[o + 2] / 16) === FLAG_GROUND && rise(S.pos[o], S.pos[o + 2]) > 0) { S.sca[o] *= 0.2; S.sca[o + 1] *= 0.22; S.pos[o + 1] = W.h(S.pos[o], S.pos[o + 2]) + 0.07; }
        else if (S.sca[o] > 1.1 && rise(S.pos[o], S.pos[o + 2]) > 0) { S.sca[o] *= 0.32; S.sca[o + 1] *= 0.5; } // nor may anything else lie there as a plank
      }
    });
    // the bank as he painted it: long grass gone pink and yellow in the wind, thick with flowers, and a dark bush at the picture's left.
    // What lies close under the painter's eye is made small, so that through his long lens it stays a texture of touches
    const dcam = (x, z) => Math.hypot(x - VR.x, z - VR.z);
    T.push(() => paintCrop(W, { x0: RISE[0] - 22, x1: RISE[0] + 22, z0: RISE[1] - 16, z1: RISE[1] + 5, step: 0.36, h: 0.5, w: 0.055, cluster: 4, spread: 0.2, lean: 0.6, sway: 0.6,
      size: (x, z) => clamp(dcam(x, z) / 10, 0.3, 1), mask: (x, z) => (rise(x, z) > 0.02 ? 0.9 : 0),
      col: (x, z, r) => { const u = r(); return u < 0.3 ? jit(hex('#e9b7a6'), 0.06, r) : u < 0.5 ? jit(hex('#e6cf7a'), 0.06, r) : u < 0.62 ? jit(hex('#f0d9cf'), 0.05, r) : P.grass(r); } }));
    const BLOOM = pal(['#ee9aa8', '#f6c6c8', '#f0cf5e', '#ea8756', '#fff3e2', '#d86a8a', '#b9a2da'], 0.05, [3, 2, 3, 2, 2, 1, 1]);
    for (const b of [[0, 5.5, 0.05, 0.4], [5.5, 9, 0.085, 0.5], [9, 40, 0.14, 0.55]]) T.push(() => flowers(W, { x0: RISE[0] - 22, x1: RISE[0] + 22, z0: RISE[1] - 16, z1: RISE[1] + 5, step: 0.4, h: b[3], size: b[2],
      mask: (x, z) => { const d = dcam(x, z); return rise(x, z) > 0.02 && d >= b[0] && d < b[1] ? 0.8 : 0; }, col: BLOOM }));
    T.push(() => bush(W, RISE[0] + 4.4, RISE[1] - 1.4, 2.0, pal(['#3e6a34', '#4c7a3a', '#2f5a30', '#5c8440'], 0.04), hex('#34582e')));
    place(W);
  }
  // ---------- the place around the paintings ----------
  // the straight ways she flies between the easels and to the frame: nothing tall stands near them
  const AIR = [[17, 11, 50, -120.5], [50, -120.5, 129.2, -71], [50, -120.5, 118, 34], [58, 40, 17, 11]];
  const open_ = (x, z, m) => { for (const a of AIR) if (distSeg(x, z, a[0], a[1], a[2], a[3]) < m) return false; return true; };
  // the hidden view looks south over its bank: what stands in that wedge must stay below the bank's line
  const underBank = (x, z, top) => { const dx = x - VR.x, dz = z - VR.z, d = Math.hypot(dx, dz); return !top || Math.abs(angDiff(Math.atan2(dx, -dz), VR.yaw)) > 36 * DEG || top < 0.1 * d - 4; };
  const free = (x, z, m, top) => guard(x, z) <= 0 && open_(x, z, m) && underBank(x, z, top);
  const offWays = (x, z, m) => { for (const w of WAYS) if (wayD(w, x, z) < w[1] + m) return false; return true; };
  function place(W) {
    const T0 = W.tasks, R = mulberry32(2390), T = { push: (f) => T0.push(() => withRnd(W, f)) };
    const V0 = CH.spots[0].view, fresh = (f) => (x, z) => (isOld(x, z) ? 0 : f(x, z));
    // the grass and the crops of the quilt, the oats still standing, the flowers of the verges and meadows
    T.push(() => paintCrop(W, { x0: -170, x1: 165, z0: -112, z1: 140, step: 2.0, h: 0.34, w: 0.09, cluster: 3, spread: 0.2, lean: 0.5,
      mask: fresh((x, z) => CROP_M[zone(x, z)] || 0), col: (x, z, r) => { const zn = zone(x, z); return zn === 'grass' ? P.grass(r) : zn === 'stubble' ? P.stub(r) : CROP_C[zn] ? CROP_C[zn](r) : P.grass(r); } }));
    T.push(() => paintCrop(W, { x0: -170, x1: 165, z0: -112, z1: 140, step: 1.7, h: 0.85, w: 0.08, cluster: 4, spread: 0.3, lean: 0.4, sway: 0.5,
      mask: fresh((x, z) => (zone(x, z) === 'c:oats' ? 0.8 : 0)), col: (x, z, r) => (r() < 0.15 ? P.stub(r) : jit(hex('#d8c878'), 0.06, r)) }));
    T.push(() => flowers(W, { x0: -150, x1: 165, z0: -100, z1: 140, step: 2.6, h: 0.5, size: 0.2,
      mask: fresh((x, z) => (wedge(x, z, V0, 0, 75, 0.66) > 0 ? 0 : FLOWER_M[zone(x, z)] || 0)), col: FLOWERS }));
    const appleLeaf = (r, t) => jit(mixc(hex('#7ca050'), hex('#b8c46c'), r() * (0.3 + 0.7 * t)), 0.05, r);
    // hedges: round the Clos Morin where no easel looks, along the lane through the east fields, and the banks of the hill
    T.push(() => {
      const skip = (x, z) => !free(x, z, 5) || !offWays(x, z, 1.2);
      hedge(W, [[-150, 84], [-110, 88], [-60, 90], [-10, 90], [30, 88], [56, 84]], { rnd: R, skip, h: 1.9 });
      hedge(W, [[72, 88], [70, 60], [69, 20], [69, -10], [64, -40], [52, -58]], { rnd: R, skip, h: 1.8 });
      hedge(W, [[123, 96], [124, 60], [123, 28], [118, -14], [112, -58]], { rnd: R, skip, h: 1.6, w: 1.0 });
      hedge(W, [[100, 96], [98, 66], [104, 40]], { rnd: R, skip, h: 1.5, w: 1.0 });
      for (const off of [70]) {
        const pts = []; for (let x = -260; x <= 300; x += 20) pts.push([x, roadZ(x) + off + 6 * Math.sin(x * 0.02)]);
        hedge(W, pts, { rnd: R, skip: (x, z) => skip(x, z) || hash2(Math.floor(x / 37), off, 961) < 0.3, h: 2.1, w: 1.4 });
      }
    });
    // the water meadows: cattle fences between the pastures, pollard willows along the ditches
    T.push(() => {
      const wood = pal(['#8a7a70', '#9a8a7a', '#7a6c66', '#a49484'], 0.04);
      const runs = [[[-6, -62], [30, -66]], [[52, -70], [100, -64]], [[100, -64], [140, -58]], [[20, -66], [20, -94]], [[86, -66], [84, -96]]];
      for (const r of runs) { const pts = []; for (let i = 0; i <= 8; i++) { const x = lerp(r[0][0], r[1][0], i / 8), z = lerp(r[0][1], r[1][1], i / 8); pts.push([x, z]); }
        for (let i = 0; i < pts.length - 1; i++) if (free(pts[i][0], pts[i][1], 3) && free(pts[i + 1][0], pts[i + 1][1], 3) && offWays(pts[i][0], pts[i][1], 1) && offWays(pts[i + 1][0], pts[i + 1][1], 1)) fence(W, [pts[i], pts[i + 1]], wood, 1.15); }
      for (let z = -108; z < 140; z += 10 + R() * 3) { const x = lerp(154, 200, clamp((z + 112) / 300, 0, 1)) + 6 * Math.sin(z * 0.02) - 4; if (free(x, z, 9, 6)) pollard(W, x + R() * 1.5, z, R); }
      for (let x = -4; x < 140; x += 12 + R() * 6) { const z = -88 + 8 * Math.sin(x * 0.05); if (free(x, z, 12, 6) && offWays(x, z, 3) && Math.hypot(x - RISE[0], z - RISE[1]) > 22) pollard(W, x, z, R); }
    });
    // the village along its road under the hill, the church at its west end
    T.push(() => {
      const wall = pal(['#e8dcc4', '#e0d0b8', '#ecdcc8', '#d8c8b4', '#e4d4c0', '#e2c8b6'], 0.03), stone = pal(['#d8ccb4', '#cabca6', '#e0d4bc', '#bcb0a0'], 0.04);
      const roofs = [pal(['#6c7088', '#7a7c94', '#5e6480', '#8a86a0'], 0.04), pal(['#b08070', '#a47468', '#bc8c78', '#9c7c80'], 0.04), pal(['#a89070', '#9c8466', '#b49c78', '#8c7c6c'], 0.04)];
      const win = pal(['#5a6a7a', '#4e5c70'], 0.03), shut = pal(['#6a8aa0', '#7a9a8c', '#8a8aa0'], 0.04);
      const C = CHURCH;
      // the church: nave, a square tower with a slate spire, a churchyard wall and its yews
      const cy = W.h(C[0], C[1]);
      house(W, { x: C[0], z: C[1], w: 18, d: 8, h: 7, rh: 5, yaw: 0, wall: stone, wallBase: hex('#d4c8b0'), roof: roofs[0], roofBase: hex('#7a7e96'), windows: [{ side: 1, u: 0.25, v: 0.6, w: 0.8, h: 2.2 }, { side: 1, u: 0.55, v: 0.6, w: 0.8, h: 2.2 }, { side: -1, u: 0.4, v: 0.6, w: 0.8, h: 2.2 }, { side: 1, u: 0.85, v: 0.4, door: 1, w: 1.4, h: 2.6 }], win, door: pal(['#6a5048'], 0.03), step: 0.65, len: 1.4, wid: 0.5 });
      const tx = C[0] + 11.5, tz = C[1];
      box(W, { x: tx, z: tz, w: 6, d: 6, y0: cy - 0.3, h: 16, wall: stone, base: hex('#d0c4ac'), step: 0.7, len: 1.4, wid: 0.5, wobble: 0.01 });
      for (const sd of [[0, 3.2, 0, 1], [0, -3.2, 0, -1], [3.2, 0, 1, 0], [-3.2, 0, -1, 0]]) panel(W, tx + sd[0], cy + 13.6, tz + sd[1], sd[2], sd[3], 1.0, 2.0, [0.24, 0.24, 0.32], 0);
      pyramid(W, { x: tx, z: tz, w: 6.8, d: 6.8, y: cy + 15.7, h: 11, roof: roofs[0], base: hex('#6e7490'), step: 0.6, len: 1.3, wid: 0.45 });
      W.caster({ k: 'box', pts: [[tx + 3, tz + 3], [tx + 3, tz - 3], [tx - 3, tz - 3], [tx - 3, tz + 3]], h: 22 }); W.collide(tx, tz, 4.3);
      for (const w of [[C[0] - 13, C[1] - 13, C[0] + 20, C[1] - 13], [C[0] - 13, C[1] - 13, C[0] - 13, C[1] + 12]]) {
        const L = Math.hypot(w[2] - w[0], w[3] - w[1]), a = Math.atan2(w[3] - w[1], w[2] - w[0]);
        box(W, { x: (w[0] + w[2]) / 2, z: (w[1] + w[3]) / 2, w: L, d: 0.5, y0: W.h((w[0] + w[2]) / 2, (w[1] + w[3]) / 2) - 0.4, h: 1.7, yaw: a, wall: stone, base: hex('#c8bca4'), step: 0.9, len: 1.6, wid: 0.5 });
      }
      const yew = (r, t) => jit(mixc(hex('#3e5a4a'), hex('#5c7a5a'), r() * t), 0.05, r);
      cypress(W, C[0] - 8, C[1] - 8, 7.5, 1.6, yew, hex('#3a5040')); cypress(W, C[0] + 3, C[1] - 9, 6.5, 1.5, yew, hex('#3a5040'));
      // the houses: long low farmhouses along the road, a few standing gable on, garden walls between them, a chimney each
      const houses = [];
      for (let x = -150; x < 158; x += 13 + R() * 12) for (const side of [1, -1]) {
        if (side < 0 && R() < 0.55) continue;
        const a = pathAngle(x, roadZ(x), ROAD), set = side > 0 ? 8 + R() * 5 : 7 + R() * 2, hx = x - Math.sin(a) * set * side, hz = roadZ(x) + Math.cos(a) * set * side;
        if (Math.abs(x - 54) < 11 || Math.abs(x - 112) < 9 || Math.hypot(hx - C[0], hz - C[1]) < 22 || Math.abs(x - 78) < 16) continue;
        if (!free(hx, hz, 13, 11) || !offWays(hx, hz, 3)) continue;
        if (houses.some((p) => Math.hypot(p[0] - hx, p[1] - hz) < 13)) continue;
        const gable = R() < 0.3, w = gable ? 7 + R() * 2 : 9 + R() * 7, d = gable ? 9 + R() * 3 : 6 + R() * 1.4, h = 3.6 + R() * 2.6, rh = 3 + R() * 1.4, yaw = a + (gable ? Math.PI / 2 : 0) + (R() - 0.5) * 0.08;
        const roof = roofs[R() < 0.4 ? 0 : R() < 0.75 ? 1 : 2];
        house(W, { x: hx, z: hz, w, d, h, rh, yaw, wall, wallBase: hex('#e0d4bc'), roof, roofBase: mulc(roof(mulberry32(3)), 0.9), shut: R() < 0.5 ? shut : null,
          windows: [{ side: 1, u: 0.3, v: 0.55 }, { side: 1, u: 0.72, v: 0.55 }, { side: -1, u: 0.3, v: 0.55 }, { side: -1, u: 0.72, v: 0.55 }], win, door: pal(['#6a5a50', '#5a6a5c'], 0.03), step: 1.1, len: 1.8, wid: 0.62 });
        const cp = rotXZ(hx, hz, w * 0.3, 0, yaw), ry = W.h(hx, hz) - 0.3 + h + 0.3 + rh;
        box(W, { x: cp[0], z: cp[1], w: 0.8, d: 0.8, y0: ry - 1.2, h: 2.0, yaw, wall: stone, base: hex('#b8a898'), step: 0.5, len: 0.9, wid: 0.4 });
        houses.push([hx, hz]);
        // a garden wall along the road beside it
        if (side > 0 && R() < 0.6) { const q = rotXZ(hx, hz, w / 2 + 6, -d / 2 - 1.5 + 0, a); if (free(q[0], q[1], 10) && offWays(q[0], q[1], 1)) box(W, { x: q[0], z: q[1], w: 10, d: 0.5, y0: W.h(q[0], q[1]) - 0.4, h: 1.8, yaw: a, wall: stone, base: hex('#c8bca4'), step: 1.1, len: 2.0, wid: 0.66 }); }
      }
      // the long pink house with green shutters at the east end of the village
      const mx = 78, mz = roadZ(78) + 12;
      house(W, { x: mx, z: mz, w: 24, d: 7.5, h: 6.4, rh: 3.6, yaw: pathAngle(78, roadZ(78), ROAD), wall: pal(['#e8b4a8', '#e4aca0', '#eebcb0', '#dca8a4'], 0.03), wallBase: hex('#e0b0a4'), roof: roofs[1], roofBase: hex('#a07468'),
        shut: pal(['#4e8a5c', '#5a9464'], 0.03), windows: [0.12, 0.28, 0.44, 0.6, 0.76, 0.9].flatMap((u) => [{ side: -1, u, v: 0.3 }, { side: -1, u, v: 0.72 }]), win, door: pal(['#4e8a5c'], 0.03), step: 1.0, len: 1.9, wid: 0.66 });
    });
    // orchards behind the houses and on the hill, apple trees in loose rows
    T.push(() => {
      let n = 0;
      for (let z = 92; z < 330 && n < 62; z += 8.5) for (let x = -200; x < 260 && n < 62; x += 8.5) {
        const px = x + (R() - 0.5) * 3, pz = z + (R() - 0.5) * 3, zn = zone(px, pz);
        if ((zn !== 'orchard' && zn !== 'c:orchard') || !free(px, pz, 8, 6) || !offWays(px, pz, 2.5) || Math.hypot(px - CHURCH[0], pz - CHURCH[1]) < 18) continue;
        const near = pz < roadZ(px) + 45;
        roundTree(W, px, pz, 1.7 + R() * 0.9, 1.5 + R() * 0.6, appleLeaf, BARK, hex('#86a060'), near ? 40 : 16); n++;
      }
    });
    // the wood along the crest of the hill and the far woods of the valley, all round where no easel looks
    T.push(() => {
      for (let x = -330; x < 460; x += 16 + R() * 10) {
        const z = roadZ(x) + 205 + 25 * Math.sin(x * 0.013) + R() * 20;
        if (free(x, z, 0, 18 + height(x, z))) farWood(W, x, z, 9 + R() * 7, 11 + R() * 6, R);
      }
      for (let i = 0; i < 70; i++) {
        const a = R() * TAU, r = 280 + R() * 330, x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (Math.abs(x) > 760 || Math.abs(z) > 760 || !free(x, z, 0, 17 + height(x, z)) || z > roadZ(x) + 160) continue;
        farWood(W, x, z, 10 + R() * 12, 10 + R() * 6, R);
      }
      // and a few poplars and trees standing in the open fields of the plain and the hill, to measure the distance by
      const leaf = (r, t) => jit(mixc(hex('#84a450'), hex('#d0cc6c'), r() * (0.35 + 0.65 * t)), 0.05, r);
      for (const p of [[150, 70], [134, -30], [96, 40], [-170, 160], [-60, 180], [40, 170], [180, 160], [230, 40], [260, -40], [210, -70]])
        if (free(p[0], p[1], 14, 9) && offWays(p[0], p[1], 3)) roundTree(W, p[0], p[1], 3 + R() * 1.5, 3 + R(), leaf, BARK, hex('#6a946c'), 70);
    });
    // where she walks the new ways the ground is laid in small touches, as round the easels: the large touches of the middle distance
    // that fell there give up their places to them
    T.push(() => {
      const S = W.S, DISCS = [[-8, 6, 78], [-70, 20, 62], [52, 40, 52], [112, 34, 34], [-80, -50, 50], [-20, -70, 56], [40, -100, 50], [-55, 86, 30]];
      const walk = (x, z) => {
        if ((x + 10) * (x + 10) + (z + 30) * (z + 30) > 172 * 172 || isOld(x, z)) return false;
        for (const d of DISCS) if ((x - d[0]) * (x - d[0]) + (z - d[1]) * (z - d[1]) < d[2] * d[2]) return false;
        return wayD(WAYS[0], x, z) < 15 || wayD(WAYS[1], x, z) < 7 || wayD(WAYS[3], x, z) < 6 || wayD(WAYS[4], x, z) < 7 || Math.hypot(x - CHURCH[0], z - CHURCH[1]) < 20;
      };
      const spare = [];
      for (let i = 0; i < S.n; i++) { const o = i * 4; if (S.sca[o] > 3.4 && S.sca[o] < 7.6 && Math.floor(S.sca[o + 2] / 16) === FLAG_GROUND && walk(S.pos[o], S.pos[o + 2])) spare.push(i); }
      const S2 = { add(x, y, z, dx, dy, dz, nx, ny, nz, len, wid, c, mo, cell, glow, fl) { const n = S.n, re = spare.length > 0; if (re) S.n = spare.pop(); S.add(x, y, z, dx, dy, dz, nx, ny, nz, len, wid, c, mo, cell, glow, fl); if (re) S.n = n; } };
      W.S = S2;
      try { paintGround(W, { x0: -170, x1: 165, z0: -110, z1: 140, step: 1.3, len: 1.6, wid: 0.62, lift: 0.05, dir: ground.dir, jit: 0.5, cells: [CELL.DAB, CELL.HEAVY, CELL.COMMA, CELL.COMMA_S, CELL.LONG_A, CELL.BLOCK], mask: (x, z) => (walk(x, z) ? ground.mask(x, z) : 0), col: ground.col }); } finally { W.S = S; }
      for (const i of spare) S.sca[i * 4] = S.sca[i * 4 + 1] = 0; // any left over
    });
    // a few people about the village and the lanes (the living layer takes them over)
    T.push(() => {
      const ppl = [[-12, roadZ(-12) + 1, 1.57, { dress: [0.36, 0.34, 0.44], top: [0.8, 0.78, 0.74], hat: [0.3, 0.28, 0.3] }], [30, roadZ(30) + 18, 0.6, { dress: [0.52, 0.42, 0.5], top: [0.9, 0.86, 0.8], hat: [0.95, 0.92, 0.86] }],
        [57, 72, -1.6, { dress: [0.62, 0.36, 0.3], top: [0.92, 0.88, 0.8], hat: [0.85, 0.75, 0.45] }]];
      for (const p of ppl) if (guard(p[0], p[1]) <= 0) person(W, p[0], p[1], p[2], p[3]);
    });
  }
  function RIVER_Z(x) { // centre line of the river at this x
    for (let i = 0; i < RIVER.length - 1; i++) { const a = RIVER[i], b = RIVER[i + 1]; if (x >= a[0] && x <= b[0]) return a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0])); }
    return -130;
  }
  const CH = {
    id: 'fields', seed: 7003, build, height,
    start: { x: 58, z: 40, yaw: -1.25 }, center: [-10, -30], radius: 168,
    // he set his easel against the light: the sun comes round from the left in the morning, stands over the large stack in the afternoon and goes down beyond it, just out of the picture
    sunPath: { rise: 201, set: 321, maxEl: 48 }, wind: [0.9, 0.35], canvas: '#ece6d6', brushRot: 0.3, edge: 0.72,
    water: { tint: '#d8e0ea', refl: 1.0 }, t0: 0.3,
    phases: [
      { leaf: 1, flower: 1, cover: 0.3, fog: 1.35, el: 0.8 },
      { autumn: 1, leaf: 0.9, flower: 0.08, cover: 0.4, fog: 1.3 },
      { leaf: 0.03, flower: 0, snow: 1, cover: 0.3, fog: 3.0, el: 0.5 },
      { autumn: 1, leaf: 0.03, flower: 0, snow: 0.45, cover: 0.2, fog: 3.0, mist: 2.8, sun: 0.85, el: 0.57, lift: 0.03, veil: [1.0, 0.92, 0.88, 0.5] },
    ],
    // the air over the fields is full of light: the sky pales to cream long before it reaches the hills, and the shadows are blue
    atmo(e, t, ph) {
      const day = clamp(e.sunI, 0, 1), up = sstep(0, 0.5, e.sunI), cream = [1.0, 0.96, 0.86], eve = sstep(0.5, 0.62, t);
      const mist = clamp(ph.mist / 2.5, 0, 1), snow = clamp(ph.snow, 0, 1) * (1 - mist), fall = clamp(ph.autumn, 0, 1) * (1 - snow) * (1 - mist), plain = (1 - snow) * (1 - mist);
      e.sky[3] = mixc(e.sky[3], mulc(cream, lum3(e.sky[3]) * 1.05), 0.75 * day); e.sky[2] = mixc(e.sky[2], mulc(cream, lum3(e.sky[2]) * 1.05), 0.5 * day);
      e.sky[1] = mixc(e.sky[1], [0.84, 0.9, 0.98], 0.4 * day); e.sky[0] = mixc(e.sky[0], [0.7, 0.82, 0.97], 0.3 * day);
      e.fog = mixc(e.fog, mixc(e.sky[3], [0.8, 0.82, 0.96], 0.4), 0.5 * day);
      e.amb = mixc(e.amb, mulc([0.8, 1.0, 1.52], lum3(e.amb) * 0.9), 0.7 * day);
      // the morning air is milky; by noon the sky is a soft blue violet with white cloud in it (rose cloud in autumn)
      const milk = day * plain * (1 - sstep(0.38, 0.47, t)), noon = day * plain * sstep(0.42, 0.48, t) * (1 - sstep(0.6, 0.66, t));
      e.sky[1] = mixc(e.sky[1], [0.9, 0.92, 0.92], 0.4 * milk); e.grade.lift += 0.025 * milk;
      e.sky[0] = mixc(e.sky[0], mixc([0.5, 0.62, 0.9], [0.46, 0.5, 0.8], fall), 0.5 * noon); e.sky[1] = mixc(e.sky[1], mixc([0.62, 0.68, 0.88], [0.56, 0.6, 0.84], fall), 0.6 * noon);
      e.sky[2] = mixc(e.sky[2], mixc([0.76, 0.8, 0.9], [0.72, 0.74, 0.84], fall), 0.6 * noon);
      e.cover = lerp(e.cover, 0.56, noon); e.cloudLit = mixc(e.cloudLit, [1.0, 0.9, 0.88], 0.6 * noon * fall); e.cloudShade = mixc(e.cloudShade, [0.8, 0.76, 0.88], 0.5 * noon * fall);
      e.grade.sat *= 1 - 0.1 * noon * fall; e.grade.lift += 0.03 * noon * fall;
      const low = clamp(1 - e.sunEl / 14, 0, 1) * up;
      // the end of a summer day: the high sky a pale green over the rose, the glow wide and soft rather than a furnace
      const k1 = low * (1 - fall) * plain;
      e.sky[1] = mixc(e.sky[1], [0.74, 0.84, 0.76], 0.4 * k1); e.sky[0] = mixc(e.sky[0], [0.56, 0.7, 0.8], 0.4 * k1); e.glowP *= 1 - 0.4 * k1;
      // an autumn afternoon wears on in rose and violet
      const k6 = fall * eve * up * (1 - low);
      e.sky[2] = mixc(e.sky[2], [0.94, 0.82, 0.8], 0.5 * k6); e.sky[1] = mixc(e.sky[1], [0.74, 0.76, 0.92], 0.4 * k6);
      e.glow = mixc(e.glow, [1.0, 0.76, 0.72], 0.7 * k6); e.glowP *= 1 - 0.45 * k6; e.sun = mulc(e.sun, 1 - 0.25 * k6);
      // the end of an autumn day: green and yellow above the rose, no furnace anywhere. The hills are a dark blue violet band, the air between is violet too,
      // and whatever stands against the light glows with what is left of it
      const k2 = low * fall * eve;
      if (k2 > 0.004) {
        e.sky[0] = mixc(e.sky[0], [0.56, 0.74, 0.68], 0.9 * k2); e.sky[1] = mixc(e.sky[1], [0.62, 0.8, 0.7], 0.95 * k2);
        e.sky[2] = mixc(e.sky[2], [0.84, 0.78, 0.68], 0.95 * k2); e.sky[3] = mixc(e.sky[3], [0.82, 0.66, 0.64], 0.95 * k2);
        e.glow = mixc(e.glow, [0.78, 0.63, 0.44], 0.85 * k2); e.glowT = lerp(e.glowT, 9, k2); e.glowP = lerp(e.glowP, 0.24, k2);
        e.fog = mixc(e.fog, [0.32, 0.36, 0.44], 0.9 * k2); e.fogD *= 1 + 0.8 * k2; e.haze = mixc(e.haze, [0.5, 0.46, 0.56], 0.7 * k2); e.scatter *= 1 - 0.75 * k2;
        e.amb = mixc(e.amb, [0.56, 0.5, 0.74], 0.6 * k2); e.sun = mulc(e.sun, 1 - 0.7 * k2); e.grade.sat = lerp(e.grade.sat, 0.8, k2);
      }
      // a winter morning is rose and peach, not blue: the snow is cream where the low sun reaches it and blue where it does not
      const k3 = snow * day * (1 - eve) * clamp(1.5 - e.sunEl / 30, 0, 1);
      if (k3 > 0.004) {
        e.sky[0] = mixc(e.sky[0], [0.88, 0.82, 0.82], 0.6 * k3); e.sky[1] = mixc(e.sky[1], [0.94, 0.85, 0.78], 0.85 * k3);
        e.sky[2] = mixc(e.sky[2], [1.0, 0.86, 0.72], 0.85 * k3); e.sky[3] = mixc(e.sky[3], [0.99, 0.86, 0.76], 0.8 * k3);
        e.fog = mixc(e.fog, [0.96, 0.88, 0.84], 0.6 * k3); e.haze = mixc(e.haze, [0.93, 0.86, 0.84], 0.6 * k3);
        e.sun = mixc(e.sun, mulc([1.0, 0.86, 0.66], lum3(e.sun) * 1.12), 0.8 * k3); e.amb = mixc(e.amb, mulc([0.86, 0.9, 1.08], lum3(e.amb) * 0.92), 0.7 * k3);
      }
      // a winter sunset: the sun is already down behind the hill when its glow fills the sky. Nothing is lit any more, the stacks are dark against it
      // and take its orange only on their rims, and the snow is the colour of the shade
      const k4 = snow * eve * up * sstep(0.69, 0.735, t);
      if (k4 > 0.004) {
        const az = Math.atan2(e.sunDir[0], -e.sunDir[2]) / DEG, el = e.sunEl - 9 * k4;
        e.sunDir = skyDir(az, el); e.sunEl = el;
        e.sky[0] = mixc(e.sky[0], [0.4, 0.46, 0.66], 0.9 * k4); e.sky[1] = mixc(e.sky[1], [0.43, 0.5, 0.68], 0.95 * k4);
        e.sky[2] = mixc(e.sky[2], [0.45, 0.5, 0.68], 0.95 * k4); e.sky[3] = mixc(e.sky[3], [0.52, 0.5, 0.64], 0.9 * k4);
        e.glow = mixc(e.glow, [0.95, 0.6, 0.3], 0.85 * k4); e.glowT = lerp(e.glowT, 4.5, k4); e.glowP = lerp(e.glowP, 0.8, k4);
        e.fog = mixc(e.fog, [0.44, 0.47, 0.6], 0.9 * k4); e.haze = mixc(e.haze, [0.46, 0.5, 0.66], 0.8 * k4); e.scatter *= 1 - 0.6 * k4;
        e.amb = mixc(e.amb, [0.46, 0.5, 0.74], 0.85 * k4); e.sun = mulc(e.sun, 1 - 0.45 * k4);
        e.grade.sat = lerp(e.grade.sat, 0.86, k4); e.grade.bright *= 1 - 0.04 * k4;
      }
      // mist: one rose and orange haze from the ground to the top of the sky, lilac in its shadows, the sun a pale place in it
      const k5 = mist * day;
      if (k5 > 0.004) {
        e.sky[0] = mixc(e.sky[0], [0.7, 0.61, 0.55], 0.95 * k5); e.sky[1] = mixc(e.sky[1], [0.72, 0.62, 0.55], 0.95 * k5);
        e.sky[2] = mixc(e.sky[2], [0.73, 0.62, 0.57], 0.95 * k5); e.sky[3] = mixc(e.sky[3], [0.72, 0.61, 0.58], 0.95 * k5);
        e.fog = mixc(e.fog, [0.66, 0.56, 0.52], 0.95 * k5); e.haze = mixc(e.haze, [0.68, 0.57, 0.55], 0.9 * k5); e.scatter = lerp(e.scatter, 0.14, k5);
        e.glow = mixc(e.glow, [1.0, 0.84, 0.58], 0.7 * k5); e.glowT = lerp(e.glowT, 9, k5); e.glowP = lerp(e.glowP, 0.2, k5); e.glowW = lerp(e.glowW, 0.3, k5);
        e.amb = mixc(e.amb, [0.44, 0.38, 0.52], 0.8 * k5); e.sun = mixc(e.sun, mulc([1.0, 0.7, 0.6], lum3(e.sun) * 0.7), 0.8 * k5);
        e.grade.soft += 0.45 * k5; e.grade.bright *= 1 - 0.06 * k5; e.grade.contrast *= 1 - 0.1 * k5;
      }
    },
    // in the mist the smaller stack is lost: a bank of it lies about that corner of the field. Its touches are flat and soft and of the colour the air has
    // in that quarter, so that what stands inside is gone as the far trees are gone
    dyn(S, t, W, fade, g, env) {
      const k = clamp((env.mist - 1.8) / 0.9, 0, 1) * fade;
      if (k < 0.02) return;
      const s = STACKS[1], y0 = W.h(s[0], s[1]), R = 3.1 * s[2], H = 5.6 * s[2], c = g.cam.pos, sd = env.sunDir;
      const dx = s[0] - c[0], dy = y0 + H * 0.5 - c[1], dz = s[1] - c[2], back = Math.max(0, (dx * sd[0] + dy * sd[1] + dz * sd[2]) / (Math.hypot(dx, dy, dz) || 1)), sc = Math.pow(back, 5) * env.scatter;
      const air = [env.fog[0] + env.glow[0] * sc, env.fog[1] + env.glow[1] * sc, env.fog[2] + env.glow[2] * sc];
      for (let i = 0; i < 300; i++) {
        const a = i * 2.39996 + 0.2 * Math.sin(t * 0.05 + i), v = Math.pow((i * 0.7548777) % 1, 1.4), u = (i * 0.5698403) % 1, q = R * (1.34 - 0.86 * v * v) * (0.9 + 0.3 * u), w = 0.98 + 0.03 * Math.sin(i * 1.7);
        S.bill(s[0] + Math.cos(a) * q - c[0], y0 + 0.2 + v * H * 1.18 + 0.15 * Math.sin(t * 0.09 + i * 2.1) - c[1], s[1] + Math.sin(a) * q - c[2], Math.sin(i * 3.1) * 0.7, (1.8 + 0.5 * u) * k, (1.1 + 0.35 * ((i * 0.31) % 1)) * k,
          [air[0] * w, air[1] * w, air[2] * 1.04 * w], 0, i % 3 ? CELL.DAB : CELL.HEAVY, 0.2, true, 0, 0, 0, 0);
      }
    },
    spots: [
      { x: 17, z: 11, view: { x: 6.5, y: 4.0, z: 15, yaw: -1.1746, pitch: -0.03, fov: 40 } },
      { x: 50, z: -120.5, view: { x: 48.5, y: 0.95, z: -127.3, yaw: -0.197, pitch: 0.163, fov: 50 } },
      // on the bank in the east meadow she is the picture herself: seen from its foot, in profile against the sky, the wind at her back
      { x: RISE[0], z: RISE[1], hidden: true, easel: [131.3, -82.6], view: VR },
    ],
    effects: [
      { id: 'f1', spot: 0, phase: 0, t0: 0.3, t1: 0.41 }, { id: 'f2', spot: 0, phase: 1, t0: 0.735, t1: 0.776 },
      { id: 'f3', spot: 0, phase: 2, t0: 0.295, t1: 0.41 }, { id: 'f4', spot: 0, phase: 2, t0: 0.715, t1: 0.776 },
      { id: 'f5', spot: 0, phase: 3, t0: 0.648, t1: 0.71 },
      { id: 'f6', spot: 1, phase: 0, t0: 0.44, t1: 0.6 }, { id: 'f7', spot: 1, phase: 1, t0: 0.4, t1: 0.6 }, { id: 'f8', spot: 1, phase: 1, t0: 0.68, t1: 0.735 },
      { id: 'f9', spot: 2, phase: 0, t0: 0.47, t1: 0.6, hidden: true },
    ],
    swatch: ['#e0b262', '#f0a04a', '#f4f6ff', '#8aae52'],
    need: 4, door: { x: 118, z: 34, yaw: 1.2 },
    // where the ways run, for the sights (polylines in the order of travel, absolute heights): the village road from west to east, the lane from
    // the village down to the stacks, the lane on over the meadows to the Epte, the path along its south bank, and the track through the east fields
    get lines() {
      if (_lines) return _lines;
      const dense = (pts) => { const o = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10)); for (let j = 0; j < n; j++) { const x = lerp(a[0], b[0], j / n), z = lerp(a[1], b[1], j / n); o.push([+x.toFixed(1), +(height(x, z) + 0.05).toFixed(2), +z.toFixed(1)]); } } const e = pts[pts.length - 1]; o.push([e[0], +(height(e[0], e[1]) + 0.05).toFixed(2), e[1]]); return o; };
      return (_lines = { road: dense(ROAD), lane: dense(LANE_S), meadow: dense(LANE_N), towpath: dense(TOWPATH), track: dense(LANE_E) });
    },
  };
  let _lines = null;
  return CH;
})();
