// ---------- the Normandy coast, 1867 to 1886: the harbour at dawn, the terrace, the cliff walk, the arch at Etretat ----------
const W_COAST = (() => {
  const WATER_Y = -1.0;
  const CO = [[-420, -70], [-240, -64], [-208, -44], [-168, 0], [-126, -22], [-98, -30], [-80, -42], [-64, -30], [-20, -24], [8, -31], [52, -31], [66, -25], [92, -36], [176, -36], [192, -8], [240, 44], [320, 96], [420, 120]];
  const HL = [[-420, 34], [-232, 32], [-212, 28], [-198, 1.0], [-132, 1.0], [-116, 22], [-100, 25], [-46, 22], [-24, 6], [82, 5.5], [95, 1.5], [176, 1.5], [200, 2.6], [420, 4]];
  const along = (pts, x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (x <= b[0]) { const k = (x - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * (k * k * (3 - 2 * k)); } }
    return pts[pts.length - 1][1];
  };
  const coastZ = (x) => along(CO, x), landH = (x) => along(HL, x);
  const faceW = (x, hl) => (hl > 9 ? 7 : hl > 3.2 ? 6 : x > 92 && x < 178 ? 3 : 18); // cliff, bluff, quay wall, beach
  function height(x, z) {
    const s = z - coastZ(x), hl = landH(x), w = faceW(x, hl);
    // the cliffs belong to the shore: inland the plateau and the valleys settle to one rolling country
    const inland = lerp(hl, 9, sstep(46, 150, s)) + (hl > 9 ? 2 : 3.5) * sstep(10, 120, s) + 1.4 * (fbm(x * 0.012, z * 0.012, 3, 401) - 0.5) * sstep(4, 30, s)
      + 5.0 * Math.exp(-(((x + 50) / 10) ** 2 + ((z + 16) / 8) ** 2)) // the knoll that the cliff walk climbs to, the two figures on its seaward shoulder
      + (16 + 22 * fbm(x * 0.004 + 2, z * 0.004, 3, 402)) * sstep(230, 400, s) * (1 - 0.7 * sstep(470, 700, s));
    return lerp(-4.2, inland, sstep(-w * 0.45, w, s));
  }
  // where on the face the land reaches a given height
  function faceS(x, y) {
    const w = faceW(x, landH(x));
    let a = -w * 0.45, b = w;
    for (let i = 0; i < 14; i++) { const m = (a + b) / 2; if (height(x, coastZ(x) + m) < y) a = m; else b = m; }
    return (a + b) / 2;
  }
  const fr = (v) => v - Math.floor(v);
  const P = {
    grass: pal(['#8cae54', '#a6c060', '#7c9e50', '#bcc86c', '#c8c078', '#d4b88c', '#d8a898', '#98b47c'], 0.05, [3, 3, 2, 2, 2, 1, 1, 1]),
    // the cliff top in the wind: yellow green with straw, pink, ochre and a few blue flicks
    turf: pal(['#7a8650', '#869056', '#6c7a48', '#94965a', '#727e4a', '#a8946a', '#b88a74', '#74828e', '#566a3e'], 0.05, [4, 4, 3, 3, 2, 2, 1, 1, 2]),
    straw: pal(['#b8a472', '#c0957a', '#c48a86', '#b08e5e', '#c8b888', '#9a9a5c', '#8c9c54', '#b4849a', '#8490a2'], 0.05, [4, 3, 3, 3, 1, 3, 3, 1, 1]),
    // chalk as he painted it: never white. Warm greys and ochres that the light keeps, and that the shade turns to violet and blue
    chalk: pal(['#9a8f96', '#8e8a9e', '#a39686', '#b3a184', '#7f8798', '#958a8c', '#a89a72', '#869080'], 0.03, [3, 3, 3, 2, 2, 2, 1, 1]),
    pebble: pal(['#8f7468', '#84685f', '#9a7e70', '#77656c', '#8b7280', '#a08672', '#6c5f66'], 0.04),
    quay: pal(['#a8a8a8', '#b8b4ac', '#989ca0', '#c4beb4', '#a09890'], 0.04),
    shore: pal(['#8a8e90', '#7c8488', '#989890', '#84807a', '#72787e'], 0.04),
    terrace: pal(['#a39b8a', '#968f82', '#ada28e', '#8a8884', '#9d9394', '#90887e'], 0.03),
    bed: pal(['#2f5a34', '#3a6a3a', '#27503a'], 0.04),
    sea: pal(['#7a9a90', '#6a8e8a'], 0.04),
    hill: pal(['#8aa0a8', '#7a94a0', '#96a8a4', '#88a090'], 0.04),
  };
  const BASE = { grass: hex('#84ae50'), turf: hex('#7e8854'), chalk: hex('#9c9290'), pebble: hex('#8a7268'), quay: hex('#aaa8a4'), shore: hex('#84888a'), terrace: hex('#9c9486'), bed: hex('#2c4a30'), sea: hex('#74968e'), hill: hex('#869ca4') };
  // the sea is not one colour along this coast: grey green in the harbour, dark blue green off the terrace, turquoise under the cliff walk, blue and violet at Etretat
  const SEA = {
    harbour: pal(['#a8ccc0', '#b8d8c8', '#98c0bc', '#c8e0cc', '#a0c8cc', '#d8e8d0'], 0.05),
    dark: pal(['#365660', '#284650', '#1e3a46', '#12262e'], 0.04),
    terrace: pal(['#3e7884', '#4a8690', '#2e6676', '#5a94a0', '#356e88', '#6aa4a8', '#244e66'], 0.05),
    cliff: pal(['#c8eeb4', '#b4e6ac', '#dcf4c0', '#a8dcb8', '#e8f2c8', '#94d0b4', '#c0e8d0'], 0.05),
    etretat: pal(['#4a80a0', '#5a8eaa', '#3c6e92', '#6a9ab4', '#4a7088', '#7890b4', '#8aa8c0', '#39607e', '#c49aa8', '#a88cb4'], 0.05),
  };
  let _sx = 0, _sz = 0;
  const seaAt = (x, z) => { _sx = x; _sz = z; return true; }; // the painter of water asks where before it asks what colour
  const seaCol = (rnd) => { const x = _sx + (vnoise(_sx * 0.03, _sz * 0.03, 431) - 0.5) * 50; return (x > 150 ? SEA.harbour : x > -45 ? SEA.terrace : x > -128 ? SEA.cliff : SEA.etretat)(rnd); };
  // the terrace: a pale path between beds of flowers, laid out for the eye at the window
  const TX0 = 15, TX1 = 47, TZ0 = -22.5, TZ1 = -3.6;
  const inRound = (x, z) => Math.hypot((x - 30.45) / 2.2, (z + 15.3) / 2.4) < 1;
  const bed = (x, z) => {
    if (x < 19 || x > 43.5 || z < -21.9 || z > -8.5) return false;
    if (inRound(x, z)) return true;                                               // the round bed in the middle
    if (x < (z > -10.5 ? 28.8 : 28.8 - 0.468 * (-10.5 - z))) return true;         // the long bed on the left
    if (z < -13 && x > 33.75 + 0.367 * (-13.2 - z)) return true;                  // the bed on the right, under the fence
    return z > -11.6 && z < -10.4 && x < 31.5;                                    // the low border at our feet
  };
  const steep = (x, z) => Math.hypot(height(x + 1.5, z) - height(x - 1.5, z), height(x, z + 1.5) - height(x, z - 1.5)) / 3;
  const contour = (x, z) => Math.atan2(height(x, z + 1.5) - height(x, z - 1.5), height(x + 1.5, z) - height(x - 1.5, z)) + Math.PI / 2;
  let _zx = NaN, _zz = NaN, _zr = '';
  function zone(x, z) { if (x === _zx && z === _zz) return _zr; _zx = x; _zz = z; return (_zr = zone0(x, z)); }
  function zone0(x, z) {
    const s = z - coastZ(x), hl = landH(x);
    if (s > 250) return 'hill';
    const h = height(x, z);
    if (h < WATER_Y + 0.12) return 'sea';
    if (h > 1.6 && s < 130 && steep(x, z) > 0.8) return 'chalk';
    if (x > -205 && x < -122 && s < 36 && hl < 3.3) return 'pebble';
    if (x > 93 && x < 178 && s < 34) return 'quay';
    if (x >= 178 && s < 46) return 'shore';
    if (x > TX0 && x < TX1 && z > TZ0 && z < TZ1) return bed(x, z) ? 'bed' : 'terrace';
    if (hl > 12 && s < 80) return 'turf';
    return 'grass';
  }
  let _rings = false; // true once the wide ground strokes are laid: the cliff walk is left bare for them and gets its own smaller touches
  const walk = (x, z) => x > -70 && x < -34 && z > -31 && z < -3;
  const ground = {
    // the open sward takes the use of the land it lies in (a field, a lane, a garden), wherever no easel's eye can see it
    col(x, z, rnd) { const zn = zone(x, z); if (zn === 'grass' || zn === 'hill') { const u = use(x, z); if (u) return LU[u](rnd); } return zn === 'turf' && rnd() < 0.12 + 0.46 * vnoise(x * 0.09, z * 0.09, 433) + 0.3 * sstep(-56, -76, x) ? P.straw(rnd) : P[zn](rnd); },
    dir(x, z) { const zn = zone(x, z); if (zn === 'grass' || zn === 'hill') { const u = use(x, z); if (u) return useDir(u, x, z); } return zn === 'chalk' ? contour(x, z) : zn === 'pebble' || zn === 'sea' ? 0.05 : zn === 'quay' || zn === 'shore' ? 0 : zn === 'terrace' ? 2.4 * Math.sin(x * 1.3 + z * 0.7) : 0.3 + 0.6 * Math.sin(x * 0.02 + z * 0.017); },
    mask(x, z) { const zn = zone(x, z); return zn === 'sea' || zn === 'bed' || (!_rings && zn === 'turf' && walk(x, z)) ? 0 : 1; },
  };
  const ROCK = [CELL.DAB, CELL.HEAVY, CELL.COMMA, CELL.COMMA_S, CELL.BLOCK];
  // local colour of the rock at a height, under a top: ochre and a little green where the sun finds the brow, seams of ochre and of blue flint in the body, weed and wet at the foot
  const chalk = (rnd, y, top) => {
    const band = vnoise(y * 0.7, top * 0.31, 411), k = clamp((y - (top - 7)) / 7, 0, 1);
    let c = P.chalk(rnd);
    if (y < 2.4) c = mixc(c, hex('#3d5058'), 0.72 - 0.12 * Math.max(y, 0));
    else if (band > 0.7) c = mixc(c, hex('#c69a56'), 0.55);
    else if (band < 0.22) c = mixc(c, hex('#6f7896'), 0.6);
    if (k > 0 && rnd() < 0.35 + 0.65 * k) c = mixc(c, rnd() < 0.28 ? hex('#8f9a5e') : rnd() < 0.5 ? hex('#d98f45') : hex('#d9b566'), k * 0.85);
    return jit(c, 0.03, rnd);
  };
  // the Needle and the door are older and darker than the cliffs behind the beaches: brown violet in the body, the brow burnt ochre
  const STONE = pal(['#6e6470', '#665e6c', '#746a66', '#5e6274', '#7a6e62', '#585a6a', '#6a6e60'], 0.03, [3, 3, 2, 2, 2, 1, 1]);
  const stone = (rnd, y, top, f0) => {
    const band = vnoise(y * 0.5, 7.7, 419), k = clamp((y - top * f0) / (top * (1 - f0) * 0.7), 0, 1);
    let c = STONE(rnd);
    if (y < 2.6) c = mixc(c, hex('#2e3e48'), 0.7 - 0.1 * Math.max(y, 0));
    else if (band > 0.72) c = mixc(c, hex('#a8824e'), 0.5);
    else if (band < 0.24) c = mixc(c, hex('#4e5878'), 0.55);
    if (k > 0 && rnd() < 0.3 + 0.7 * k) c = mixc(c, rnd() < 0.2 ? hex('#8f9a5e') : rnd() < 0.5 ? hex('#d98f45') : hex('#dcb860'), 0.3 + 0.6 * k);
    return jit(c, 0.025, rnd);
  };
  // a standing rock built ring over ring. Each ring has its own centre and its own rough outline, so that nothing about it is turned on a lathe
  function crag(W, rings, n, wall, base, o) {
    const rnd = W.rnd, V = rings.map((g, j) => { const pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU + j * 0.23, r = g[3] * (1 + (rnd() - 0.5) * o.rough); pts.push([g[0] + Math.cos(a) * r, g[1], g[2] + Math.sin(a) * r]); } return pts; });
    for (let j = 0; j < V.length - 1; j++) for (let i = 0; i < n; i++) {
      const a = V[j][(i + 1) % n], b = V[j][i], c = V[j + 1][i], d = V[j + 1][(i + 1) % n];
      W.quad(a, b, c, d, base);
      paintQuad(W, a, b, c, d, { step: o.step, len: o.len, wid: o.wid, along: 'u', jit: 0.8, cells: ROCK, lift: 0.06, col: (r, u, v) => wall(r, a[1] + v * (d[1] - a[1])) });
    }
    return V[V.length - 1];
  }
  // a boulder: a dark heart and a skin of dabs that know which way is out
  function boulder(W, x, y, z, rx, ry, rz, col, n) {
    blobSolid(W, x, y, z, rx * 0.88, ry * 0.88, rz * 0.88, [0.3, 0.28, 0.35], 0);
    const S = W.S, rnd = W.rnd;
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, e = Math.acos(1 - rnd() * 1.5), nx = Math.cos(a) * Math.sin(e), ny = Math.cos(e), nz = Math.sin(a) * Math.sin(e), s = 0.17 + rnd() * 0.17;
      S.bill(x + nx * rx, y + ny * ry, z + nz * rz, (rnd() - 0.5) * 2.4, s * 1.7, s, col(rnd, ny), 0, ROCK[(rnd() * 5) | 0], 0, false, nx, ny + 0.001, nz, 0);
    }
    W.collide(x, z, Math.max(rx, rz) * 0.8);
  }
  // a ship of masts and yards, dark against the morning. fat: how broad the spars are drawn, for ships that must be read through the mist
  function tallShip(W, x, z, yaw, s, col, fat) {
    const c = Math.cos(yaw), sn = Math.sin(yaw), S = W.S, rnd = W.rnd, wy = W.waterY, f = fat || 1;
    box(W, { x, z, w: 22 * s, d: 4.6 * s, y0: wy - 0.4, h: 3.0 * s, yaw, wall: col, base: col(rnd), step: 0.9, len: 2.2, wid: 0.6, wobble: 0 });
    for (let m = -1; m <= 1; m++) {
      const mx = x + c * m * 6.4 * s, mz = z + sn * m * 6.4 * s, mh = (20 - Math.abs(m) * 3) * s;
      S.add(mx, wy + 2.6 * s + mh / 2, mz, (rnd() - 0.5) * 0.03, 1, 0, 1, 0, 0, mh, 0.22 * s * f, col(rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL);
      for (let k = 0; k < 3; k++) S.add(mx, wy + 2.6 * s + mh * (0.38 + k * 0.24), mz, c, 0, sn, -sn, 0.2, c, (7.5 - k * 1.7) * s, 0.2 * s * (1 + (f - 1) * 0.6), col(rnd), 0, CELL.LONG_B, 0, 0);
      S.add(mx + c * 3 * s, wy + 2.6 * s + mh * 0.5, mz + sn * 3 * s, c * 6 * s, -mh, sn * 6 * s, 1, 0, 0, Math.hypot(6 * s, mh), 0.07 * s * f, col(rnd), 0, CELL.LONG_B, 0, FLAG_AXIAL);
    }
    W.collide(x, z, 4 * s);
  }
  function smoke(W, x, y, z, n, size, col, wind) {
    for (let i = 0; i < n; i++) { const t = i / n, k = W.rnd(); W.S.bill(x + wind[0] * t * size * 7 + (k - 0.5) * size, y + t * size * 3.2 + k * size, z + wind[1] * t * size * 7, k * 3, size * (1.2 + t * 2.2), size * (0.8 + t * 1.3), col(W.rnd), -size * 1.5, CELL.DAB, 0, false, 0, 1, 0, 0); }
  }
  function steamer(W, x, z, yaw, s, col, fat, smk) {
    const wy = W.waterY, c = Math.cos(yaw), sn = Math.sin(yaw);
    box(W, { x, z, w: 26 * s, d: 5 * s, y0: wy - 0.4, h: 2.6 * s, yaw, wall: col, base: col(W.rnd), step: 1.0, len: 2.4, wid: 0.6, wobble: 0 });
    tower(W, { x, z, y0: wy + 2.2 * s, y1: wy + 8 * s, r0: 1.1 * s, r1: 1.0 * s, sides: 6, wall: col, base: col(W.rnd), step: 0.9, len: 1.8, wid: 0.5 });
    for (const m of [-8, 8]) W.S.add(x + c * m * s, wy + 7 * s, z + sn * m * s, 0, 1, 0, 1, 0, 0, 10 * s, 0.16 * s * (fat || 1), col(W.rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL);
    smoke(W, x, wy + 9 * s, z, smk ? 14 : 9, (smk ? 2.8 : 2.2) * s, smk || pal(['#8a8a9a', '#9a96a4', '#7a7c90', '#aaa4ac'], 0.03), [0.9, 0.3]);
  }
  // sheer legs on a pontoon: two spars meeting high over the water, a third to hold them, and the tackle hanging from the head
  function sheers(W, x, z, yaw, s, col) {
    const wy = W.waterY, S = W.S, rnd = W.rnd, c = Math.cos(yaw), sn = Math.sin(yaw);
    box(W, { x, z, w: 16 * s, d: 6 * s, y0: wy - 0.4, h: 2.2 * s, yaw, wall: col, base: col(rnd), step: 1.0, len: 2.2, wid: 0.6, wobble: 0 });
    const top = [x + c * 2 * s, wy + 17 * s, z + sn * 2 * s];
    for (const k of [[-1, -4.6], [-1, 4.6], [-7.5, 0]]) {
      const b = [x + c * k[0] * s - sn * k[1] * s, wy + 1.8 * s, z + sn * k[0] * s + c * k[1] * s];
      S.add((b[0] + top[0]) / 2, (b[1] + top[1]) / 2, (b[2] + top[2]) / 2, top[0] - b[0], top[1] - b[1], top[2] - b[2], 1, 0, 0, Math.hypot(top[0] - b[0], top[1] - b[1], top[2] - b[2]), 0.5 * s, col(rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL);
    }
    S.add(top[0] + c * 0.6 * s, top[1] - 3.4 * s, top[2] + sn * 0.6 * s, 0, 1, 0, 1, 0, 0, 6.4 * s, 0.26 * s, col(rnd), 0, CELL.LONG_B, 0, FLAG_AXIAL);
    W.collide(x, z, 5 * s);
  }
  function beachBoat(W, x, z, yaw, col, trim) {
    const y0 = W.h(x, z) - 0.15;
    box(W, { x, z, w: 5.4, d: 1.9, y0, h: 1.1, yaw, wall: col, base: col(W.rnd), step: 0.4, len: 1.3, wid: 0.3, wobble: 0.02, along: 'u', weave: 0 });
    const c = Math.cos(yaw), s = Math.sin(yaw);
    W.S.add(x, y0 + 1.16, z, c, 0, s, 0, 1, 0, 5.2, 0.5, trim(W.rnd), 0, CELL.LONG_A, 0, 0);
    W.collide(x, z, 1.6);
    W.caster({ k: 'box', pts: [[2.7, 0.9], [2.7, -0.9], [-2.7, -0.9], [-2.7, 0.9]].map((l) => rotXZ(x, z, l[0], l[1], yaw)), h: 1.2, v: 0.8 });
  }
  // a flag on its pole: blocks of colour from the hoist to the fly. k: size, taper: how the fly narrows
  function flag(W, x, z, h, cols, k, taper) {
    const S = W.S, y = W.h(x, z), wd = W.wind, l = Math.hypot(wd[0], wd[1]) || 1, wx = wd[0] / l, wz = wd[1] / l;
    const k0 = S.n;
    S.add(x, y + h / 2, z, 0, 1, 0, 1, 0, 0, h, 0.09, [0.42, 0.38, 0.32], 0, CELL.HEAVY, 0, FLAG_AXIAL);
    cols.forEach((c, i) => S.add(x + wx * (0.4 + i * 0.66) * k, y + h - 0.72 * k, z + wz * (0.4 + i * 0.66) * k, wx, 0, wz, -wz, 0, wx, 0.72 * k, 1.3 * k * (taper ? taper[i] : 1), c, 0.5 + i * 0.25, CELL.BLOCK, 0.08, 0));
    S.mark(k0);
  }
  // a wicker chair with its back to us, and whoever sits in it. o: top (colour of the coat or bodice), hat, parasol, skirt
  function sitter(W, x, z, yaw, o) {
    const S = W.S, rnd = W.rnd, y = W.h(x, z), fx = Math.sin(yaw), fz = -Math.cos(yaw), tx = Math.cos(yaw), tz = Math.sin(yaw);
    const wick = pal(['#8a6436', '#96703e', '#7a562e'], 0.03), bx = x - fx * 0.3, bz = z - fz * 0.3;
    // the tub of the chair from behind: one rounded back of wicker, darker in its weave, a rim that catches the light, an arm on either side, thin legs
    S.bill(bx, y + 0.63, bz, 0, 0.7, 0.5, wick(rnd), 0, CELL.BLOCK, 0, false, 0, 1, 0, 0);
    for (let i = 0; i < 4; i++) S.bill(bx + tx * (i - 1.5) * 0.15, y + 0.6 + (i % 2) * 0.08, bz + tz * (i - 1.5) * 0.15, 0.8 * (i % 2 ? 1 : -1), 0.3, 0.07, [0.36, 0.25, 0.14], 0, CELL.LONG_B, 0, false, 0, 1, 0, 0);
    S.add(bx, y + 0.88, bz, tx, 0, tz, -fx, 0.3, -fz, 0.66, 0.09, [0.8, 0.64, 0.4], 0, CELL.LONG_A, 0, 0);
    for (const k of [-1, 1]) {
      S.bill(x + tx * k * 0.34 + fx * 0.05, y + 0.6, z + tz * k * 0.34 + fz * 0.05, 0, 0.2, 0.34, wick(rnd), 0, CELL.DAB, 0, false, 0, 1, 0, 0);
      S.add(bx + tx * k * 0.24, y + 0.2, bz + tz * k * 0.24, 0, 1, 0, 1, 0, 0, 0.4, 0.05, [0.3, 0.22, 0.14], 0, CELL.LONG_B, 0, FLAG_AXIAL);
    }
    if (!o) return;
    if (o.skirt) for (let i = 0; i < 5; i++) { const a = yaw + 2.2 + i * 0.5; S.add(x + Math.cos(a) * 0.38, y + 0.3, z + Math.sin(a) * 0.38, Math.cos(a) * 0.5, -1, Math.sin(a) * 0.5, Math.cos(a), 0.4, Math.sin(a), 0.62, 0.3, jit(o.skirt, 0.04, rnd), 0.04, CELL.BLADE, 0, 0); }
    S.add(x, y + 1.0, z, 0, 1, 0, 1, 0, 0, 0.6, 0.46, jit(o.top, 0.03, rnd), 0, CELL.DAB, 0, FLAG_AXIAL);
    S.bill(x, y + 1.32, z, 0, 0.19, 0.19, [0.84, 0.66, 0.54], 0, CELL.DOT, 0, false, 0, 1, 0, 0);
    S.bill(x, y + 1.43, z, 0, 0.46, 0.15, o.hat, 0, CELL.DAB, 0, false, 0, 1, 0, 0);
    if (o.parasol) { // held back over the shoulder, so that from behind it is nearly all we see of her
      const ax = -fx * 0.5, ay = 0.86, az = -fz * 0.5, px = x - fx * 0.2, py = y + 1.34, pz = z - fz * 0.2;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU, rx = tx * Math.cos(a) + fx * 0.86 * Math.sin(a), ry = 0.5 * Math.sin(a), rz = tz * Math.cos(a) + fz * 0.86 * Math.sin(a);
        S.add(px + rx * 0.22, py + ry * 0.22, pz + rz * 0.22, rx - ax * 0.3, ry - ay * 0.3, rz - az * 0.3, ax + rx * 0.3, ay + ry * 0.3, az + rz * 0.3, 0.45, 0.28, jit(o.parasol, 0.04, rnd), 0, CELL.LEAF, 0, 0);
      }
    }
  }
  function build(W) {
    const T = W.tasks, rnd = W.rnd;
    W.waterY = WATER_Y;
    _hf = (x, z) => W.h(x, z); _vis = null; EYES.length = 0;
    T.push(() => W.fillTerrain(height, (x, z) => BASE[zone(x, z)]));
    _rings = false;
    groundRings(W, ground, { cx: -20, cz: 20, r2: 330, discs: [[146, -14, 48], [90, -4, 34], [32, -8, 46], [-18, -6, 40], [-72, -14, 50], [-112, -6, 34], [-162, 8, 52], [-140, 28, 26]] });
    T.push(() => { _rings = true; });
    // the turf of the cliff walk: small crossed touches, since the eye at the easel rests on it
    T.push(() => paintGround(W, { x0: -70, x1: -34, z0: -31, z1: -3, step: 0.42, len: 0.62, wid: 0.25, lift: 0.06, dir: ground.dir, jit: 2.6, cells: [CELL.DAB, CELL.HEAVY, CELL.COMMA, CELL.COMMA_S, CELL.LONG_A], mask: (x, z) => (zone(x, z) === 'turf' ? 1 : 0), col: ground.col }));
    for (let i = 0; i < 3; i++) T.push(() => paintSky(W, { n: 5200 }));
    // the chalk: short touches laid one over another wherever the land stands steep, the more of them the steeper it stands
    T.push(() => {
      const S = W.S, g = 0.8;
      for (const bx of [[-264, -192, -72, 64], [-136, -30, -52, 70]]) for (let z = bx[2]; z < bx[3]; z += g) for (let x = bx[0]; x < bx[1]; x += g) {
        if (zone(x + g / 2, z + g / 2) !== 'chalk') continue;
        const n = Math.min(3, Math.max(1, Math.round(Math.hypot(1, steep(x + g / 2, z + g / 2)) * 0.7)));
        for (let k = 0; k < n; k++) {
          const px = x + rnd() * g, pz = z + rnd() * g, y = W.h(px, pz), a = contour(px, pz) + (rnd() - 0.5) * 0.9;
          W.normalAt(px, pz, _N);
          S.add(px + _N[0] * 0.12, y + 0.1, pz + _N[2] * 0.12, Math.cos(a), (rnd() - 0.5) * 1.3, Math.sin(a), _N[0], _N[1] * 0.4, _N[2], 0.6 + rnd() * 0.6, 0.3 + rnd() * 0.28, chalk(rnd, y, landH(px) + 1), 0, ROCK[(rnd() * 5) | 0], 0, 0);
        }
      }
    });
    // Etretat: the Needle, and the wall of the Porte d'Aval pierced by the sea, standing out in the bay before the beach
    T.push(() => {
      const base = hex('#5e5864'), brow = pal(['#c9a24a', '#d4b05a', '#b8963e', '#9aa04e', '#d8b870', '#a8a058'], 0.05);
      // the Needle: a sugar loaf of chalk that leans a little as it rises
      const NX = -181.7, NZ = -77.3, NT = 41;
      crag(W, [[NX, -4, NZ, 8.8], [NX + 0.3, 4, NZ, 8.6], [NX - 0.2, 12, NZ + 0.2, 7.1], [NX + 0.5, 20, NZ + 0.3, 6.5], [NX + 1.2, 28, NZ + 0.3, 4.7], [NX + 1.5, 34, NZ + 0.2, 3.3], [NX + 2.0, 38.5, NZ + 0.2, 1.8], [NX + 2.2, NT, NZ + 0.2, 0.3]], 10,
        (r, y) => stone(r, y, NT + 3, 0.5), base, { rough: 0.34, step: 1.0, len: 1.9, wid: 0.8 });
      W.collide(NX, NZ, 8.5);
      // the wall: u runs along it from the foot of the leaning leg to the landward end, w across it towards the beach
      const OX = -150.9, OZ = -73.9, ux = 0.97, uz = 0.242, L = 36;
      const lin = (pts, u) => { for (let i = 0; i < pts.length - 1; i++) if (u <= pts[i + 1][0]) return lerp(pts[i][1], pts[i + 1][1], clamp((u - pts[i][0]) / (pts[i + 1][0] - pts[i][0]), 0, 1)); return pts[pts.length - 1][1]; };
      const TOP = [[0, -1], [1.2, 8], [2.4, 16], [3.6, 22.5], [7, 29], [11, 34], [14, 39], [17, 45], [22, 48.5], [29, 50], [33.5, 48.5], [36, 42]];
      const DOOR = [[6.2, -4], [7.0, 6], [8.0, 13], [9.4, 18.5], [11, 21.5], [12.4, 20.5], [13.4, 16], [14.0, 9], [14.4, -4]];
      const top = (u) => lin(TOP, u), foot = (u) => (u > 6.2 && u < 14.4 ? lin(DOOR, u) : -4);
      const front = (u) => 5.2 + 0.8 * Math.sin(u * 0.35 + 1) + 0.25 * Math.sin(u * 1.1), back = (u) => -5.2 - 1.2 * Math.sin(u * 0.7 + 2) - 0.7 * Math.sin(u * 1.9);
      const at = (u, w, y) => [OX + ux * u - uz * w, y, OZ + uz * u + ux * w];
      const face = (a, b, c, d, fine, col) => { W.quad(a, b, c, d, base); paintQuad(W, a, b, c, d, { step: fine ? 1.0 : 1.6, len: fine ? 1.9 : 2.6, wid: fine ? 0.8 : 1.05, along: 'u', jit: 0.8, cells: ROCK, lift: 0.06, col }); };
      const n = 34;
      for (let i = 0; i < n; i++) {
        const u0 = (i / n) * L, u1 = ((i + 1) / n) * L, t0 = top(u0), t1 = top(u1), b0 = foot(u0), b1 = foot(u1), tm = Math.max(t0, t1, 30);
        const wall = (r, u, v) => stone(r, lerp(lerp(b0, b1, u), lerp(t0, t1, u), v), tm, 0.8), under = (r) => jit(mixc(STONE(r), hex('#39445e'), 0.6), 0.03, r);
        face(at(u0, front(u0), b0), at(u1, front(u1), b1), at(u1, front(u1), t1), at(u0, front(u0), t0), true, wall);    // the face to the beach
        face(at(u1, back(u1), b1), at(u0, back(u0), b0), at(u0, back(u0), t0), at(u1, back(u1), t1), false, wall);       // the face to the open sea
        face(at(u0, front(u0), t0), at(u1, front(u1), t1), at(u1, back(u1), t1), at(u0, back(u0), t0), true, (r) => brow(r)); // the brow, dry grass in the sun
        if (b0 > -4 || b1 > -4) face(at(u1, front(u1), b1), at(u0, front(u0), b0), at(u0, back(u0), b0), at(u1, back(u1), b1), true, under); // the vault of the door
      }
      { const a = at(L, front(L), -4), b = at(L, back(L), -4), c = at(L, back(L), top(L)), d = at(L, front(L), top(L)); face(a, b, c, d, true, (r, p, v) => stone(r, lerp(-4, top(L), v), top(L), 0.8)); }
      for (const u of [3, 9, 18, 24, 30]) { const p = at(u, 0, 0); if (u !== 9) W.collide(p[0], p[2], u < 6 ? 4.5 : 6); }
      // dark rocks where the shingle runs into the water on our right
      const dkp = pal(['#4a4254', '#544a52', '#3e3c4e', '#5c5058', '#463f48', '#3a4450'], 0), dk = (r, ny) => jit(mixc(dkp(r), hex('#9a8262'), ny > 0.45 ? 0.5 * r() : 0), 0.04, r);
      for (const b of [[-149.4, 1.4, 2.3, 1.8, 2.0, 300], [-146.2, -0.4, 2.9, 1.75, 2.4, 380], [-148.4, -3.6, 1.9, 1.2, 1.6, 170], [-143.6, 2.6, 1.9, 1.3, 1.6, 150], [-151.6, 2.6, 1.0, 0.6, 0.9, 60]]) boulder(W, b[0], Math.max(W.h(b[0], b[1]), WATER_Y - 0.4) + b[3] * 0.62, b[1], b[2], b[3], b[4], dk, b[5]);
    });
    // Le Havre: the quay, masts and funnels and cranes losing themselves in the morning
    T.push(() => {
      const dark = pal(['#3a4a5e', '#44546a', '#324054', '#4c5a70'], 0.03), stone = pal(['#b4b0a8', '#a4a4a4', '#c4beb2'], 0.03);
      for (let x = 100; x < 172; x += 9) { const z = coastZ(x) + 2.2; W.S.add(x, W.h(x, z) + 0.4, z, 0, 1, 0, 1, 0, 0, 0.9, 0.4, dark(rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL); }
      const ghost = pal(['#52647a', '#5a6c82', '#4a5c72', '#62748a'], 0.03); // the far ships are paler: half of them is already air
      // every hull rides the water: what is painted between k0 and the call to flt floats
      let k0 = W.S.n; tallShip(W, 287, -74, 0.25, 1.0, dark, 1.8); flt(W, k0); k0 = W.S.n; tallShip(W, 342, -56, -0.4, 1.25, ghost, 2.2); flt(W, k0); k0 = W.S.n; tallShip(W, 252, -78, 0.9, 0.8, dark, 1.4); flt(W, k0); k0 = W.S.n; tallShip(W, 384, -40, 1.5, 1.5, ghost, 2.4); flt(W, k0);
      k0 = W.S.n; tallShip(W, 352, -74, 2.3, 1.15, ghost, 2.2); flt(W, k0);
      k0 = W.S.n; steamer(W, 341, 35, 0.5, 0.9, ghost, 2.4); flt(W, k0);
      k0 = W.S.n; sheers(W, 275.6, 36.5, 0.36, 0.95, dark); flt(W, k0); k0 = W.S.n; sheers(W, 250, 48.6, 0.5, 0.85, dark); flt(W, k0);
      for (const c of [[350, 120, 34], [372, 131, 40], [330, 124, 30], [400, 136, 36], [310, 114, 26]]) {
        const y = W.h(c[0], c[1]);
        tower(W, { x: c[0], z: c[1], y0: y - 0.5, y1: y + c[2], r0: 1.5, r1: 0.9, sides: 6, wall: dark, base: dark(rnd), step: 1.0, len: 2.2, wid: 0.6 });
        smoke(W, c[0], y + c[2] + 1, c[1], 10, 2.6, pal(['#7a8298', '#8a8ea0', '#6a7490', '#9a98a8'], 0.03), [0.9, 0.3]);
      }
      for (const c of [[322, 112, 0.5], [344, 108, -0.4], [366, 120, 0.8], [392, 126, 0.2]]) { // cranes and sheds
        const y = W.h(c[0], c[1]);
        W.S.add(c[0], y + 8, c[1], 0, 1, 0, 1, 0, 0, 16, 0.9, dark(rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL);
        W.S.add(c[0] + Math.cos(c[2]) * 5, y + 17, c[1] + Math.sin(c[2]) * 5, Math.cos(c[2]) * 10, 5, Math.sin(c[2]) * 10, 0, 0, 1, 12, 0.7, dark(rnd), 0, CELL.LONG_B, 0, FLAG_AXIAL);
        house(W, { x: c[0] + 9, z: c[1] + 8, w: 16, d: 8, h: 5, rh: 2.4, yaw: c[2], wall: dark, wallBase: dark(rnd), roof: dark, roofBase: dark(rnd), step: 1.1, len: 2.2, wid: 0.6 });
      }
      // the boats of that morning: one near and dark with two men in it, one behind it paler, one nearly gone
      k0 = W.S.n; rowboat(W, 212.5, -28.6, 1.75, 1.05, pal(['#1c2a32', '#22323a', '#16242c'], 0.03), 2); flt(W, k0);
      k0 = W.S.n; rowboat(W, 238.4, -36.9, 2.0, 0.92, pal(['#3c5260', '#465c68'], 0.03), 1); flt(W, k0);
      k0 = W.S.n; rowboat(W, 277.6, -45.6, 1.6, 0.9, pal(['#50646e', '#5a6e78'], 0.03), 1); flt(W, k0);
      { // what the near boat puts down on the water under itself
        const S = W.S, sh = pal(['#16262e', '#1e3038', '#122028'], 0.03), v = CH.spots[0].view.yaw, c = Math.cos(v), s = Math.sin(v);
        for (let i = 0; i < 14; i++) { const o = (rnd() - 0.5) * 3.6, d = 0.5 + rnd() * 2.6, len = 0.9 + rnd() * 1.3; S.add(212.5 + c * o - s * d, WATER_Y + 0.12, -28.6 + s * o + c * d, c, 0, s, 0, 1, 0, len, 0.2 + rnd() * 0.16, sh(rnd), -len * 0.5, rnd() < 0.5 ? CELL.HEAVY : CELL.LONG_A, 0, FLAG_GROUND); }
      }
      house(W, { x: 132, z: 6, w: 22, d: 9, h: 6, rh: 3, yaw: 0.05, wall: stone, wallBase: hex('#b0aca4'), roof: pal(['#7a8494', '#8a92a0'], 0.03), roofBase: hex('#808a98'), windows: [{ side: -1, u: 0.2, v: 0.5 }, { side: -1, u: 0.5, v: 0.5 }, { side: -1, u: 0.8, v: 0.5 }], win: pal(['#4a5a6e'], 0.03), door: pal(['#4a5a6e'], 0.03), step: 0.8, len: 1.7, wid: 0.5 });
    });
    // the terrace at Sainte-Adresse as it lay under the window: flags, beds of flowers round a pale path, wicker chairs, a couple at the fence
    T.push(() => {
      const S = W.S, dark = pal(['#26342e', '#1e2c28', '#2e3c34', '#22302e'], 0.03);
      fence(W, [[TX0 + 0.3, -21.6], [TX1 - 0.3, -21.6]], dark, 1.0);
      // the fence is grown through with green: a dark band between the garden and the sea
      for (let x = TX0 + 0.3; x < TX1 - 0.3; x += 0.22) for (let k = 0; k < 3; k++) { const s = 0.26 + rnd() * 0.14; S.bill(x + rnd() * 0.22, W.h(x, -21.7) + 0.14 + k * 0.3 + rnd() * 0.2, -21.7 - rnd() * 0.4, (rnd() - 0.5) * 1.2, s * 1.6, s, dark(rnd), 0.1, rnd() < 0.5 ? CELL.DAB : CELL.COMMA, 0, false, 0, 1, 0, 0); }
      for (const g of [35.2, 36.5]) S.add(g, W.h(g, -21.6) + 1.0, -21.6, 0, 1, 0, 1, 0, 0, 2.0, 0.14, dark(rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL); // the gate in the fence
      S.add(35.85, W.h(35.85, -21.6) + 1.94, -21.6, 1, 0, 0, 0, 0, 1, 1.5, 0.14, dark(rnd), 0, CELL.LONG_A, 0, 0);
      flag(W, 22.8, -21.0, 6.6, [hex('#d2382e'), hex('#f0c63a'), hex('#d2382e')], 1.3, [1, 0.86, 0.7]);
      flag(W, 34.7, -21.0, 6.4, [hex('#3a58a4'), hex('#f4f0e6'), hex('#d83a30')], 1.14);
      // the beds: dark earth and leaves first, flowers on top of them
      const green = pal(['#1c3a24', '#24482c', '#16301e', '#2e5632', '#102618', '#365e34'], 0.04), earth = hex('#1c3424');
      for (let z = TZ0; z < TZ1; z += 0.5) for (let x = TX0; x < TX1; x += 0.5) {
        if (!bed(x + 0.25, z + 0.25)) continue;
        const q = (dx, dz) => [x + dx, W.h(x + dx, z + dz) + 0.07, z + dz];
        W.quad(q(0, 0), q(0.5, 0), q(0.5, 0.5), q(0, 0.5), earth);
      }
      for (let z = TZ0; z < TZ1; z += 0.22) for (let x = TX0; x < TX1; x += 0.22) {
        const px = x + rnd() * 0.22, pz = z + rnd() * 0.22;
        if (!bed(px, pz)) continue;
        const s = 0.13 + rnd() * 0.13;
        S.bill(px, W.h(px, pz) + 0.08 + rnd() * rnd() * 0.7, pz, (rnd() - 0.5) * 1.6, s * 1.7, s, green(rnd), 0.12, rnd() < 0.5 ? CELL.DAB : CELL.COMMA, 0, false, 0, 1, 0, 0);
      }
      paintCrop(W, { x0: 19, x1: 28, z0: -21.9, z1: -9, step: 0.5, h: 0.85, w: 0.06, cluster: 2, spread: 0.1, lean: 0.25, mask: (x, z) => (bed(x, z) ? 0.6 : 0), col: (x, z, r) => green(r), flags: FLAG_AXIAL | FLAG_GROUND }); // sword leaves
      const hot = pal(['#e83a2c', '#f0562e', '#d82c34', '#f2783a'], 0.04), nas = pal(['#f2783a', '#f6a03c', '#f2c83a', '#e8562a'], 0.04), pale = pal(['#fffaf0', '#f6e870', '#f4c8d0', '#ffffff'], 0.03);
      let fx = 0, fz = 0; // geraniums in the round bed, nasturtiums at our feet, everything together in the long beds
      flowers(W, { x0: TX0, x1: TX1, z0: TZ0, z1: TZ1, step: 0.2, h: 0.5, size: 0.1, glow: 0.14, season: false, mask: (x, z) => { fx = x; fz = z; return bed(x, z) ? (inRound(x, z) ? 0.85 : 0.45) : 0; },
        col: (r) => (inRound(fx, fz) ? (r() < 0.86 ? hot(r) : pale(r)) : fz > -11.8 && fx > 27 ? nas(r) : r() < 0.45 ? hot(r) : r() < 0.8 ? nas(r) : pale(r)) });
      for (let i = 0; i < 22; i++) { // gladioli standing over the long bed
        const x = 23.6 + rnd() * 3.2, z = -19.2 + rnd() * 6.2, y = W.h(x, z), hh = 1.0 + rnd() * 0.5;
        if (!bed(x, z)) continue;
        S.add(x, y + hh * 0.5, z, (rnd() - 0.5) * 0.2, 1, (rnd() - 0.5) * 0.2, 1, 0, 0, hh, 0.05, green(rnd), 0.2, CELL.LONG_A, 0, FLAG_AXIAL);
        for (let k = 0; k < 5; k++) S.bill(x + (rnd() - 0.5) * 0.08, y + hh * (0.5 + k * 0.12), z + (rnd() - 0.5) * 0.08, rnd() * 3, 0.15, 0.1, hot(rnd), 0.2, CELL.DAB, 0.16, false, 0, 0.6, 0, 0);
      }
      // the couple at the fence, and the two who sit and look at the sea
      person(W, 28.0, -19.0, 0.2, { dress: hex('#f2ecdc'), top: hex('#ece4d2'), hat: hex('#f0e6c0'), parasol: hex('#ecd070') });
      person(W, 29.4, -19.2, 0.1, { dress: hex('#2a303e'), top: hex('#232834'), hat: hex('#1e222c') });
      S.add(29.4, W.h(29.4, -19.2) + 1.76, -19.2, 0, 1, 0, 1, 0, 0, 0.28, 0.2, [0.12, 0.13, 0.17], 0, CELL.BLOCK, 0, FLAG_AXIAL);
      sitter(W, 31.1, -11.9, 0.0, { top: hex('#dfe4ea'), hat: hex('#f0e6c8'), skirt: hex('#e4e8ee'), parasol: hex('#f6f2e6') });
      sitter(W, 32.7, -12.4, -0.15, { top: hex('#39404e'), hat: hex('#e9d9a2') });
      sitter(W, 29.2, -12.4, 0.5, null); sitter(W, 33.4, -11.6, -0.5, null);
    });
    // the Channel full of sails: a lugger under dark canvas, a few yachts, and far out a line of sails and steamers under their smoke
    T.push(() => {
      const hull = pal(['#3a4658', '#4a566a', '#2e3a4c', '#5a4a44'], 0.03), sail = pal(['#f8f2e2', '#efe6d0', '#e6d2a8', '#fffaf0'], 0.03), tan = pal(['#7a5a48', '#6a4e42', '#8a6650'], 0.04);
      const fleet = [[4, -80, 3.0, 1.15, 1], [-24, -150, 0.2, 0.9, 0], [14, -200, -0.1, 1.0, 1], [58, -165, 0.3, 0.9, 0], [-62, -235, 0.1, 1.2, 0], [86, -250, 0.2, 1.3, 1], [36, -300, 0.0, 1.4, 0], [-20, -330, 0.1, 1.5, 1],
        [120, -420, 0.2, 1.8, 0], [-120, -470, -0.1, 2.0, 1], [60, -520, 0.1, 2.2, 0], [-40, -560, 0.0, 2.2, 1], [210, -560, 0.3, 2.4, 0], [-230, -540, 0.2, 2.4, 0], [300, -600, 0.1, 2.6, 1],
        [160, -330, 0.2, 1.6, 0], [182, -262, -0.2, 1.4, 0], [176, -190, 0.3, 1.2, 0], [224, -356, 0.1, 1.8, 0], [130, -230, 0.0, 1.2, 0]];
      fleet.forEach((b, i) => { const k0 = W.S.n; sailboat(W, b[0], b[1], b[2], b[3], { hull, sail: b[4] ? tan : sail, sails: i % 3 === 0 ? 1 : 2 }); flt(W, k0); });
      const far = pal(['#243040', '#2c3a4c', '#1e2a3a'], 0.03), soot = pal(['#5a5a6c', '#66647a', '#4e5062', '#74707e'], 0.03);
      for (const b of [[20, -470, 0.05, 1.5], [-150, -450, -0.05, 1.6], [215, -470, 0.1, 1.5], [-300, -440, 0.0, 1.5], [330, -500, 0.05, 1.7], [90, -420, 0.2, 1.3]]) { const k0 = W.S.n; steamer(W, b[0], b[1], b[2], b[3], far, 2, soot); flt(W, k0); }
    });
    // the cliff walk at Pourville: wind in the grass, two figures at the edge
    T.push(() => {
      person(W, -57.3, -22.9, 1.3, { dress: hex('#eef0f2'), top: hex('#e2e6ee'), hat: hex('#f0e4b8'), parasol: hex('#e79aa2') });
      person(W, -58.9, -23.2, 1.2, { dress: hex('#5a6a8a'), top: hex('#4a5878'), hat: hex('#e8dcb0'), s: 0.9 });
      const leaf = (r, t) => jit(mixc(hex('#3f6e3c'), hex('#84a84e'), r() * (0.35 + 0.65 * t)), 0.05, r), bark = pal(['#5a4a40', '#6a584a'], 0.04), r2 = mulberry32(4401);
      for (let i = 0; i < 70; i++) {
        const x = -250 + r2() * 480, z = coastZ(x) + 46 + r2() * 150, zn = zone(x, z);
        if ((zn !== 'grass' && zn !== 'turf') || (x > 2 && x < 60 && z < 20)) continue;
        if (r2() < 0.25) bush(W, x, z, 1.6 + r2() * 1.6, leaf, hex('#44703a')); else roundTree(W, x, z, 3 + r2() * 2.8, 2.2 + r2() * 2, leaf, bark, hex('#3a5e38'), 130);
      }
      // houses of the village behind the beach and behind the terrace
      const wall = pal(['#f0e8d8', '#e4dccc', '#f6f0e4', '#d8ccb8'], 0.03), roof = pal(['#8a94a6', '#9aa0ae', '#b8806c', '#7c8698'], 0.04), win = pal(['#5a6a7e'], 0.03);
      const hs = [[-176, 52, 0.2], [-158, 60, -0.1], [-140, 56, 0.3], [-190, 70, 0.5], [-124, 68, -0.3], [-162, 82, 0.1], [10, 30, 0.1], [36, 34, -0.1], [62, 30, 0.2], [-4, 52, 0.4], [84, 44, -0.2]];
      for (const h of hs) house(W, { x: h[0], z: h[1], w: 11, d: 7, h: 4.4, rh: 3.4, yaw: h[2], wall, wallBase: hex('#ece4d4'), roof, roofBase: hex('#8c96a6'), windows: [{ side: -1, u: 0.25, v: 0.55 }, { side: -1, u: 0.75, v: 0.55 }, { side: -1, u: 0.5, v: 0.5, door: true, w: 1, h: 2 }], win, door: win, step: 0.7, len: 1.5, wid: 0.5 });
    });
    const sward = (x, z) => { const zn = zone(x, z); return zn === 'grass' || zn === 'turf'; };
    T.push(() => paintCrop(W, { x0: -250, x1: 95, z0: -44, z1: 60, step: 1.7, h: 0.55, w: 0.085, cluster: 3, spread: 0.24, lean: 0.7, sway: 0.5,
      mask: (x, z) => (sward(x, z) && z - coastZ(x) < 90 ? 0.75 : 0), col: ground.col }));
    // the grass of the cliff walk, thick where he stood in it
    T.push(() => paintCrop(W, { x0: -84, x1: -34, z0: -31, z1: -6, step: 0.7, h: 0.5, w: 0.07, cluster: 2, spread: 0.3, lean: 0.9, sway: 0.5, mask: (x, z) => (zone(x, z) === 'turf' ? 0.8 : 0), col: (x, z, r) => (r() < 0.3 ? P.straw(r) : ground.col(x, z, r)) }));
    T.push(() => flowers(W, { x0: -250, x1: 95, z0: -44, z1: 60, step: 2.1, h: 0.5, size: 0.17, mask: (x, z) => (sward(x, z) && z - coastZ(x) < 80 ? 0.55 : 0), col: pal(['#f6f0e4', '#f2d048', '#ffffff', '#e8a0b8', '#f08a50'], 0.04, [3, 3, 2, 1, 1]) }));
    // boats drawn up on the shingle
    T.push(() => {
      const cols = [pal(['#2e4a6a', '#3a587a'], 0.04), pal(['#7a3a2e', '#8a463a'], 0.04), pal(['#3a5a4a', '#46685a'], 0.04), pal(['#2a2e3a', '#363a48'], 0.04)], trim = pal(['#e8e0cc', '#d8c8a0'], 0.03);
      [[-176, 9, 0.5], [-172, 15, 0.9], [-184, 6, 0.2], [-190, -2, -0.3], [-139, 1, 1.2]].forEach((b, i) => beachBoat(W, b[0], b[1], b[2], cols[i % 4], trim));
    });
    // the sea: long flat touches far out, short ones wherever an easel looks down on it, and a hem of foam along the shore
    const near = (x, z) => (x > 166 && x < 460 && z > -120) || (x > -216 && x < -122 && z > -100 && z < 10) || (x > -110 && x < -40 && z > -74 && z < -22);
    waterRings(W, { cx: -20, cz: -90, r1: 1, r2: 300, col: seaCol, mask: (x, z) => seaAt(x, z) && !near(x, z), dir: 0.04, jit: 0.2, slide: 0.9 });
    T.push(() => paintWater(W, { x0: -216, x1: -122, z0: -64, z1: 10, step: 1.0, len: 1.7, wid: 0.4, col: SEA.etretat, dir: 0.04, jit: 0.25, slide: 0.9 }));
    T.push(() => paintWater(W, { x0: -216, x1: -122, z0: -100, z1: -64, step: 1.8, len: 3.2, wid: 0.7, col: SEA.etretat, dir: 0.04, jit: 0.25, slide: 0.9 }));
    T.push(() => paintWater(W, { x0: -110, x1: -40, z0: -74, z1: -22, step: 1.0, len: 1.7, wid: 0.4, col: SEA.cliff, dir: 0.04, jit: 0.25, slide: 0.9 }));
    { // the harbour basin as he looked down on it: short dashes laid across the eye, dark ones among them, most of them near us on the left
      const hv = CH.spots[0].view.yaw;
      let hx = 0, hz = 0;
      const hmask = (x, z) => { hx = x; hz = z; return true; }, hcol = (r) => (r() < 0.1 + 0.24 * clamp(1 - Math.hypot(hx - 198, hz + 42) / 40, 0, 1) ? SEA.dark(r) : SEA.harbour(r));
      for (const b of [[166, 240, -72, 52, 1.0, 1.7, 0.34], [166, 330, -120, -72, 2.3, 4.2, 0.8], [240, 330, -72, 76, 2.3, 4.2, 0.8], [330, 460, -120, 126, 4.4, 8.5, 1.6]]) T.push(() => paintWater(W, { x0: b[0], x1: b[1], z0: b[2], z1: b[3], step: b[4], len: b[5], wid: b[6], col: hcol, mask: hmask, dir: hv, jit: 0.25, slide: 0.9, cells: [CELL.LONG_A, CELL.LONG_B, CELL.HEAVY, CELL.COMMA_S, CELL.LONG_A] }));
    }
    T.push(() => {
      const S = W.S, foam = pal(['#fffdf6', '#f4f2ec', '#e8f0ee'], 0.02);
      for (let x = -262; x < 200; x += 0.62) {
        const px = x + rnd() * 0.6, s = faceS(px, WATER_Y), n = landH(px) < 3.3 ? 3 : 1;
        for (let k = 0; k < n; k++) {
          const ss = s - 0.3 - rnd() * (n > 1 ? 5 : 1.4), len = 0.7 + rnd() * 1.0;
          S.add(px, WATER_Y + 0.1, coastZ(px) + ss, 1, 0, coastZ(px + 1) - coastZ(px), 0, 1, 0, len, 0.13 + rnd() * 0.14, foam(rnd), -len * 0.8, rnd() < 0.5 ? CELL.LONG_B : CELL.COMMA, 0.05, 0);
        }
      }
      // the road of sparkle that runs in over the bay at Etretat, between the Needle and the door
      const v = CH.spots[3].view, lit = pal(['#fffdf2', '#f6f4e6', '#eef2ee', '#fff6dc'], 0.02);
      for (let i = 0; i < 210; i++) {
        const d = 11 + 44 * Math.pow(rnd(), 0.8), a = v.yaw - 0.2 + (rnd() + rnd() - 1) * 0.2, x = v.x + Math.sin(a) * d, z = v.z - Math.cos(a) * d, len = 0.4 + rnd() * 0.7 + d * 0.012;
        if (W.h(x, z) > WATER_Y - 0.15) continue;
        S.add(x, WATER_Y + 0.14, z, 1, 0, (rnd() - 0.5) * 0.3, 0, 1, 0, len, 0.1 + rnd() * 0.1 + d * 0.002, lit(rnd), -len * 0.6, rnd() < 0.5 ? CELL.LONG_B : CELL.COMMA_S, 0.12, 0);
      }
    });
    // the easels stand a step aside, where the eye at the easel does not see them
    T.push(() => CH.spots.forEach((s, i) => { const e = s.easel || [s.x + (i === 2 ? 0.4 : 1.2), s.z + (i === 2 ? 4.6 : 0.6)]; easelProp(W, e[0], e[1], s.view.yaw); }));
    varengeville(W);
    shore(W);
  }
  // ---------- hidden: the fisherman's cottage on the cliffs at Varengeville, on the cliff top west of the cove ----------
  // the eye stands high in the scrub and looks down over it at the little house on the brink, the sea standing up behind it
  const VC = { x: -230, y: 4.2, z: -10, yaw: 0.2, pitch: -0.134, fov: 28 };
  const DIP = 2.07; // the sea ends in a line a little under the true level of the eye
  const HOUSE6 = [-226.74, -46.86, -0.5];
  // the sails of that sea, seen from the cliff top: bearing from the middle of the picture (degrees), distance, height of the sail (m).
  // They are drawn every frame, and only for an eye near that cliff top, so that no other picture of this coast gets them
  const SAILS6 = [[-14.5, 760, 6.4], [-13.4, 720, 7.2], [2.4, 790, 6.4], [6.8, 660, 11.6], [7.5, 640, 10.4], [10.6, 500, 12], [10.1, 790, 7.0], [12.4, 720, 7.8], [14.7, 730, 6.6], [16.0, 790, 5.8]].map((b) => {
    const a = VC.yaw + b[0] * DEG;
    return [-230 + b[1] * Math.sin(a), -10 - b[1] * Math.cos(a), b[2], Math.sin(b[0] * 7.1) * 0.5 + 0.5];
  });
  const relAz = (x, z) => { let a = Math.atan2(x - VC.x, VC.z - z) - VC.yaw; while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const dVC = (x, z) => Math.hypot(x - VC.x, z - VC.z);
  // the scrub as Monet saw it from his eye: for each bearing (degrees from the middle of the picture) the angle under the horizon where its top meets the sea, and how far off that top is
  const SIL = [[-26, 2.6, 44], [-17.8, 2.8, 42], [-14, 2.9, 40], [-12, 3.9, 33], [-6, 4.3, 32], [-1, 3.6, 31], [2, 3.1, 30], [4.5, 4.2, 30], [8.5, 4.9, 31], [10.5, 6.2, 30], [12.6, 8.0, 28], [15.5, 10.0, 26], [26, 10.6, 24]];
  const silAt = (u, j) => { if (u <= SIL[0][0]) return SIL[0][j]; for (let i = 0; i < SIL.length - 1; i++) { const a = SIL[i], b = SIL[i + 1]; if (u <= b[0]) return lerp(a[j], b[j], (u - a[0]) / (b[0] - a[0])); } return SIL[SIL.length - 1][j]; };
  // single bushes that stand up out of the scrub: one before the house's left corner, one beside it on the right, one big one at the left of the picture (x, z, radius, height)
  const CLUMPS = [[-230.0, -42.0, 2.6, 1.3], [-226.0, -41.6, 1.8, 0.7], [-222.2, -42.6, 2.8, 1.6], [-219.6, -40.0, 2.2, 1.0], [-234.8, -36.0, 3.6, 0.9], [-227.4, -30.5, 3.0, 0.6], [-219.0, -40.5, 2.4, 1.1], [-216.6, -38.0, 2.0, 0.8]];
  // how high the scrub stands over the ground: it rises away from the eye towards that edge, in round clumps
  function scrubH(x, z) {
    const d = dVC(x, z), u = relAz(x, z) / DEG;
    if (d < 7.5 || Math.abs(u) > 23) return 0;
    const hd = Math.hypot(x - HOUSE6[0], z - HOUSE6[1]);
    if (hd < 4.3) return 0;
    const eye = W_h(VC.x, VC.z) + VC.y, gy = W_h(x, z);
    let bump = 0;
    for (const c of CLUMPS) { const r = Math.hypot(x - c[0], z - c[1]) / c[2]; if (r < 1) bump = Math.max(bump, c[3] * (1 - r * r)); }
    const D = silAt(u, 2) + 3 * (vnoise(x * 0.2, z * 0.2, 463) - 0.5), zn = zone(x, z);
    if (d > D || (zn !== 'turf' && zn !== 'grass')) return gy > 20 && bump > 0.3 ? bump : 0; // a bush may hang over the brink
    const top = eye - D * Math.tan((silAt(u, 1) + DIP) * DEG) - (D - d) * Math.tan(4.5 * DEG) + 1.8 * (fbm(x * 0.3, z * 0.3, 3, 461) - 0.5) + 0.3 * (vnoise(x * 0.7, z * 0.7, 462) - 0.5);
    return clamp(top - gy + bump, 0.35, 4.8) * sstep(7.5, 9.5, d);
  }
  let W_h = (x, z) => height(x, z);
  function varengeville(W) {
    const T = W.tasks;
    W_h = (x, z) => W.h(x, z);
    // the wide touches of the plateau would lie as planks under the long lens: in front of this eye they are made small
    T.push(() => {
      const S = W.S;
      for (let i = 0; i < S.n; i++) {
        const o = i * 4, x = S.pos[o], z = S.pos[o + 2];
        if (x > -205 || x < -275 || z < -62 || z > 6) continue;
        const fl = Math.floor(S.sca[o + 2] / 16);
        if (fl & (FLAG_FLOWER | FLAG_GRASS)) { if (dVC(x, z) < 75) { S.sca[o] *= 0.5; S.sca[o + 1] *= 0.6; } continue; }
        if (!(fl & FLAG_GROUND)) continue;
        const t = Math.max(0.16, 0.016 * dVC(x, z));
        if (S.sca[o] > t) { const k = t / S.sca[o]; S.sca[o] = t; S.sca[o + 1] = Math.min(S.sca[o + 1] * Math.max(k, 0.3), t * 0.7); }
      }
    });
    // the cottage: pink ochre stone, an orange roof of old tiles, a chimney of brick on the ridge
    T.push(() => {
      const wall = pal(['#e2b49a', '#d8a68c', '#e8c0a4', '#cc9a84', '#dcae8a', '#c8a0a0'], 0.04, [3, 3, 2, 2, 2, 1]);
      const roof = pal(['#d88a5e', '#e09a6e', '#cc7c58', '#e8b088', '#b87470', '#d49880', '#c08a7a', '#dc9466'], 0.04, [3, 3, 3, 2, 1, 2, 1, 2]);
      const brick = pal(['#c8603e', '#b8543a', '#d47454', '#a84c3c'], 0.04), dark = pal(['#5a3a3e', '#6a4440', '#4e3a48'], 0.03);
      const hx = HOUSE6[0], hz = HOUSE6[1], hy = HOUSE6[2], H = 2.7, RH = 2.4;
      house(W, { x: hx, z: hz, w: 6.6, d: 4.2, h: H, rh: RH, yaw: hy, wall, wallBase: hex('#b88c7c'), roof, roofBase: hex('#b8603e'),
        windows: [{ side: 1, u: 0.3, v: 0.5, w: 0.7, h: 0.9 }, { side: 1, u: 0.62, v: 0.4, door: true, w: 0.9, h: 1.8 }, { side: -2, u: 0.55, v: 0.55, w: 0.6, h: 0.8 }], win: dark, door: dark,
        step: 0.2, len: 0.42, wid: 0.18, over: 0.35 });
      { // the long wall toward us lies in the shade of the eave: red brown and violet
        const shade = pal(['#9a5e58', '#8a5a62', '#a86a5c', '#7a5a6a', '#b07a6a'], 0.04), y0 = W.h(hx, hz), nx = -Math.sin(hy), nz = Math.cos(hy), tx = Math.cos(hy), tz = Math.sin(hy), rnd = W.rnd;
        for (let v = 0.1; v < H; v += 0.17) for (let u = -3.2; u < 3.2; u += 0.19) {
          const a = u + (rnd() - 0.5) * 0.12, px = hx + tx * a + nx * 2.17, pz = hz + tz * a + nz * 2.17, k = clamp((v - 0.2) / H, 0, 1);
          W.S.add(px, y0 + v + (rnd() - 0.5) * 0.1, pz, tx + (rnd() - 0.5) * 0.9, (rnd() - 0.5) * 0.9, tz, nx, 0, nz, 0.3, 0.14, k > 0.75 ? jit(hex('#6a4a5a'), 0.04, rnd) : shade(rnd), 0, CELL.DAB, 0, 0);
        }
      }
      const c = rotXZ(hx, hz, -0.4, 0.2, hy), y = W.h(hx, hz) + H + RH - 0.9;
      box(W, { x: c[0], z: c[1], w: 0.95, d: 0.7, y0: y, h: 1.7, yaw: hy, wall: brick, base: hex('#a85440'), step: 0.16, len: 0.34, wid: 0.15, wobble: 0 });
      W.S.add(c[0], y + 1.72, c[1], Math.cos(hy), 0, Math.sin(hy), 0, 1, 0, 1.05, 0.8, hex('#8a4a3c'), 0, CELL.BLOCK, 0, 0);
    });
    // the scrub: a dark green body under a skin of small touches, green, yellow and pink in the sun, blue and violet in its hollows
    T.push(() => {
      const S = W.S, rnd = W.rnd, under = [0.2, 0.3, 0.17];
      const g = 1.0;
      for (let z = -60; z < 0; z += g) for (let x = -262; x < -200; x += g) {
        const h00 = scrubH(x, z), h10 = scrubH(x + g, z), h11 = scrubH(x + g, z + g), h01 = scrubH(x, z + g);
        if (h00 + h10 + h11 + h01 <= 0) continue;
        const p = (px, pz, h) => [px, W.h(px, pz) + Math.max(h - 0.25, -0.2), pz];
        W.quad(p(x, z, h00), p(x, z + g, h01), p(x + g, z + g, h11), p(x + g, z, h10), under);
      }
      const LIT = pal(['#8aa055', '#98a85a', '#a6b462', '#b8b868', '#ccbe72', '#7a9450', '#a8b07a', '#d4aa90', '#88a07a', '#c89ca4', '#d8c88a'], 0.04, [5, 4, 4, 4, 3, 3, 2, 3, 2, 2, 1]);
      const DEEP = pal(['#46683e', '#3a5e42', '#527448', '#44605c', '#5c6480', '#557446', '#6a7650', '#7a6880'], 0.04, [4, 3, 3, 2, 2, 3, 3, 1]);
      const cells = [CELL.DAB, CELL.COMMA, CELL.COMMA_S, CELL.HEAVY, CELL.COMMA];
      for (let z = -60; z < 0;) {
        const dz = 0.64 * (0.016 * Math.abs(z - VC.z) + 0.08);
        for (let x = -262; x < -200;) {
          const d = dVC(x, z), sl = 0.016 * d + 0.08, st = 0.64 * sl;
          const px = x + rnd() * st, pz = z + rnd() * dz;
          x += st;
          const h = scrubH(px, pz);
          if (h <= 0.05) continue;
          const y0 = W.h(px, pz), n = rnd() < 0.3 ? 2 : 1;
          for (let k = 0; k < n; k++) {
            const q = k === 0 ? 0.82 + rnd() * 0.22 : Math.pow(rnd(), 0.6), top = q > 0.78, u = relAz(px, pz) / DEG;
            const s = sl * (0.36 + rnd() * 0.3), tl = u < -4 ? 0.7 + (rnd() - 0.5) * 1.4 : (rnd() - 0.5) * 2.6;
            const crown = clamp((fbm(px * 0.3, pz * 0.3, 3, 461) - 0.38) * 3, 0, 1), sun = crown * (u < -8 ? 0.7 : 1) * (0.7 + 0.5 * vnoise(px * 0.32, pz * 0.32, 464)) * (0.45 + 0.55 * sstep(11, 24, d));
            const lit = clamp((top ? 0.1 + 0.85 * sun : 0.04 + 0.3 * sun) + (rnd() - 0.5) * 0.24, 0, 1);
            S.bill(px + (rnd() - 0.5) * st, y0 + h * q, pz + (rnd() - 0.5) * st, tl, s * 1.75, s, mixc(DEEP(rnd), LIT(rnd), lit), 0.12, cells[(rnd() * cells.length) | 0], 0, false, (rnd() - 0.5) * 0.8, 1, (rnd() - 0.5) * 0.8, FLAG_LEAF);
          }
          // red poppies and a few yellow ones low in the near scrub
          if (d < 15 && Math.abs(relAz(px, pz)) < 0.21 && rnd() < 0.45 * (1 - sstep(11, 15, d))) {
            const fs = sl * (0.35 + rnd() * 0.25);
            S.bill(px, y0 + h * (0.8 + rnd() * 0.3), pz, rnd() * 3, fs * 1.3, fs, rnd() < 0.75 ? jit(hex('#d8442e'), 0.06, rnd) : rnd() < 0.6 ? jit(hex('#ec7a3e'), 0.05, rnd) : jit(hex('#e8c050'), 0.05, rnd), 0.1, CELL.DAB, 0.08, false, 0, 1, 0, 0);
          }
        }
        z += dz;
      }
    });
  }
  // ---------- one shore: the country round the easels ----------
  // Le Havre and its streets behind the quay, the villas of Sainte-Adresse on the slope behind the terrace, the two lights of La Heve on the cap,
  // the open fields of the Caux on the cliff tops in long strips, farms in their squares of beeches, Etretat in its valley with its church
  // and its boats hauled up on the shingle, the church of Varengeville on the brink, and woods along the far rise where the walk ends.
  // A road runs through all of it, and a footpath goes from each easel to the next. What the eye of any easel sees is left as it was painted:
  // every touch here asks first whether one of those eyes could see it.
  let _hf = (x, z) => height(x, z), _vis = null;
  const EYES = [];
  function eyes() {
    if (EYES.length) return EYES;
    // the title looks through the eye of the harbour, swinging 0.06 either way: that easel's frame is widened by as much
    const t = CH.title, v0 = CH.spots[0].view, same = t.x === v0.x && t.z === v0.z && t.y === v0.y && t.pitch === v0.pitch && t.fov === v0.fov && t.yaw === v0.yaw;
    const vs = CH.spots.map((s, i) => [s.view, i === 0 && same ? 0.07 : 0]);
    if (!same) vs.push([t, 0.07]);
    for (const [v, wide] of vs) {
      const cp = Math.cos(v.pitch), sp = Math.sin(v.pitch), cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), half = (v.fov * DEG) / 2;
      EYES.push({ x: v.x, y: _hf(v.x, v.z) + v.y, z: v.z, f: [sy * cp, sp, -cy * cp], r: [cy, sy], u: [-sy * sp, cp, cy * sp], th: Math.tan(Math.atan(Math.tan(half) * 16 / 9) + 0.14 + wide), tv: Math.tan(half + 0.12) });
    }
    return EYES;
  }
  // could the eye of any easel (or of the title) see this point?
  function seen(x, y, z) {
    for (const e of eyes()) {
      const dx = x - e.x, dy = y - e.y, dz = z - e.z, f = dx * e.f[0] + dy * e.f[1] + dz * e.f[2];
      if (f <= 0.3) continue;
      if (Math.abs((dx * e.r[0] + dz * e.r[1]) / f) > e.th || Math.abs((dx * e.u[0] + dy * e.u[1] + dz * e.u[2]) / f) > e.tv) continue;
      const L = Math.hypot(dx, dz);
      let hid = false;
      for (let t = 1.5; t < L - 2.5; t += 0.8 + t * 0.035) { const k = t / L; if (_hf(e.x + dx * k, e.z + dz * k) > e.y + dy * k + 0.2) { hid = true; break; } }
      if (!hid) return true;
    }
    return false;
  }
  // the same for the ground, on a grid of 3 m, grown by two cells since a touch laid in one cell reaches into the next
  const VX0 = -560, VZ0 = -130, VG = 3, VNX = 374, VNZ = 192;
  function visGrid() {
    if (_vis) return _vis;
    const v = new Uint8Array(VNX * VNZ), out = new Uint8Array(VNX * VNZ);
    for (let j = 0; j < VNZ; j++) for (let i = 0; i < VNX; i++) {
      const x = VX0 + (i + 0.5) * VG, z = VZ0 + (j + 0.5) * VG, s = z - coastZ(x);
      if (s < -4 || s > 450) { v[j * VNX + i] = 1; continue; } // the sea is never touched
      const h = _hf(x, z);
      v[j * VNX + i] = h > WATER_Y + 0.05 && seen(x, h + 0.8, z) ? 1 : 0;
    }
    for (let j = 0; j < VNZ; j++) for (let i = 0; i < VNX; i++) {
      let s = 0;
      for (let b = Math.max(0, j - 2); b <= Math.min(VNZ - 1, j + 2) && !s; b++) for (let a = Math.max(0, i - 2); a <= Math.min(VNX - 1, i + 2); a++) if (v[b * VNX + a]) { s = 1; break; }
      out[j * VNX + i] = s;
    }
    return (_vis = out);
  }
  const seenG = (x, z) => { const i = Math.floor((x - VX0) / VG), j = Math.floor((z - VZ0) / VG); return i < 0 || j < 0 || i >= VNX || j >= VNZ || visGrid()[j * VNX + i] === 1; };
  // the ways. The road: from the streets of Le Havre along the back of Sainte-Adresse, over the cliff top fields, down the valley into Etretat,
  // and up again by the head of the valley to the church of Varengeville
  const ROAD = [[214, 104], [196, 72], [178, 40], [162, 18], [130, 15], [100, 15], [72, 16], [44, 22], [18, 22], [-6, 20], [-30, 25], [-56, 34], [-84, 48], [-106, 66], [-124, 86], [-142, 94],
    [-156, 76], [-162, 56], [-168, 42], [-178, 62], [-192, 90], [-212, 100], [-230, 82], [-242, 54], [-248, 28], [-252, 8], [-254, -10], [-251, -22]];
  // the footpath, in the order a walker takes the easels: along the quay, up to the terrace, round behind it and along the cliff tops,
  // down the side of the valley to the shingle at Etretat, and by the head of the valley up onto the western cliff
  const PATH = [[171.5, -30], [150, -26], [124, -22], [104, -16], [88, -10], [68, -5], [50, -1], [36, 0], [22, 0], [6, -4], [-10, -6], [-24, -1], [-38, 6], [-52, 6], [-60, 0], [-65, -10], [-67, -18],
    [-72, -15], [-84, -13], [-100, -10], [-112, -3], [-118, 14], [-121, 36], [-127, 58], [-137, 72], [-148, 62], [-153, 44], [-158, 28], [-164, 20], [-172, 24], [-176, 46], [-186, 72], [-204, 92],
    [-224, 82], [-236, 58], [-240, 34], [-236, 14], [-231, -2]];
  // the way the fishing boats take out of the harbour basin to the open sea
  const FAIR = [[430, 96], [372, 48], [318, -4], [268, -40], [214, -66], [150, -130], [40, -280], [-120, -480]];
  const AIR = []; // the straight air ways between one easel and the next
  const hash = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
  const TOWN = (x, z) => (x > 92 && x < 214 && z > 12 && z < 104 ? 'town' : x > -26 && x < 92 && z > 4 && z < 74 ? 'garden' : x > -204 && x < -126 && z > 30 && z < 112 ? 'village' : null);
  const CROPS = ['wheat', 'wheat', 'oats', 'pasture', 'pasture', 'clover', 'flax', 'plough', 'wheat', 'pasture'];
  const LU = {
    lane: pal(['#c8b490', '#bca684', '#d4c4a0', '#a8987c', '#b8a08a'], 0.04),
    town: pal(['#9c9086', '#8e8680', '#a89c8c', '#7e7a78', '#b4a690', '#6e7a5a'], 0.04),
    garden: pal(['#4e7a3c', '#5e8a44', '#6e9a4c', '#86a858', '#a0a868', '#c89a7a', '#3e6a3a'], 0.05),
    village: pal(['#5e8a44', '#7a9a50', '#a89c8c', '#c8b490', '#9aa860', '#4e7a3c'], 0.05),
    verge: pal(['#8cae54', '#a6c060', '#bcc86c', '#d8a898', '#f0e8c8'], 0.05),
    wheat: pal(['#c8b46c', '#d0bc78', '#bca866', '#d6c286', '#b4a060', '#a8a860'], 0.04),
    oats: pal(['#b8bc80', '#c4c48a', '#acb478', '#c8c898', '#a0b070'], 0.04),
    pasture: pal(['#6e9a48', '#7ea850', '#5e8a44', '#8cb058', '#9ab866', '#70a050'], 0.05),
    clover: pal(['#5e8a4a', '#6a9450', '#4e7e48', '#a88a94', '#7a9a58'], 0.04, [3, 3, 2, 1, 2]),
    flax: pal(['#7a9a84', '#88a096', '#6e8e78', '#90a8a4', '#8a9a72'], 0.04),
    plough: pal(['#a08a6a', '#94806a', '#ac9474', '#8a7a66', '#9a8c70'], 0.04),
    wood: pal(['#2e5038', '#3a5c3e', '#264434', '#46663e', '#34504a', '#4a5a5e'], 0.05),
  };
  // woods: in patches over the far rise, thicker the further inland, and a belt of them where the walk comes to its end
  const wooded = (x, z, s) => s > 150 && (vnoise(x * 0.011, z * 0.011, 471) > 0.62 - 0.22 * sstep(190, 330, s) || Math.abs(Math.hypot(x - CH.center[0], z - CH.center[1]) - CH.radius - 8) < 16 + 10 * vnoise(x * 0.03, z * 0.03, 472));
  let _ux = NaN, _uz = NaN, _ur = null;
  function use(x, z) { if (x === _ux && z === _uz) return _ur; _ux = x; _uz = z; return (_ur = use0(x, z)); }
  function use0(x, z) {
    if (seenG(x, z)) return null;
    const s = z - coastZ(x);
    if (s < 22 || s > 440) return null;
    if (pathDist(x, z, ROAD) < 2.3) return 'lane';
    const t = TOWN(x, z);
    if (t) return t;
    if (s < 34) return 'verge';
    if (wooded(x, z, s)) return 'wood';
    const u = x + 9 * Math.sin(z * 0.011 + 1.3), i = Math.floor(u / 23);
    if (u / 23 - i < 0.06) return 'verge'; // a headland of grass and flowers between two strips
    const j = Math.floor((s + 60 * hash(i, 7)) / 74);
    return CROPS[(hash(i, j) * CROPS.length) | 0];
  }
  function useDir(u, x, z) {
    if (u === 'lane') return pathAngle(x, z, ROAD);
    if (u === 'town') return 0;
    if (u === 'pasture' || u === 'garden' || u === 'village' || u === 'verge' || u === 'wood') return 0.3 + 0.6 * Math.sin(x * 0.02 + z * 0.017);
    return Math.PI / 2 + 0.1 * Math.sin(z * 0.011 + 1.3); // the furrows run with the strip
  }
  // may something of this height and reach stand here? out of every easel's eye, off the ways, off the air ways, clear of the places the people and birds use
  const KEEP = [[112, -24.5], [141, -26], [126, -32.4], [146, -12], [-141.6, 9.6], [-140, 7.4], [-137.2, 5.2], [-18, -6], [9, -9], [2, 8], [150, -22]];
  let _dropped = 0;
  function may(x, z, h, r) {
    const why = may0(x, z, h, r);
    if (why) _dropped++;
    return !why;
  }
  function may0(x, z, h, r) {
    if (pathDist(x, z, ROAD) < r + 2.6 || pathDist(x, z, PATH) < r + 1.4) return 'way';
    for (const k of KEEP) if (Math.hypot(x - k[0], z - k[1]) < r + 4) return 'folk';
    for (const s of CH.spots) if (Math.hypot(x - s.x, z - s.z) < r + 9) return 'easel';
    if (Math.hypot(x - CH.door.x, z - CH.door.z) < r + 9) return 'door';
    if (h > 3) for (const a of AIR) { // beside the way, not beyond its ends: behind an easel she lands, she does not fly through
      const vx = a[2] - a[0], vz = a[3] - a[1], t = ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz);
      if (t > 0 && t < 1 && distSeg(x, z, a[0], a[1], a[2], a[3]) < r + (h > 12 ? 40 : 16)) return 'air';
    }
    const y = _hf(x, z);
    if (seen(x, y + h, z)) return 'seen';
    for (const c of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) if (seen(x + c[0] * r, y + h * 0.85, z + c[1] * r) || seen(x + c[0] * r, y + 0.4, z + c[1] * r)) return 'seen';
    return '';
  }
  const flt = (W, k0) => { if (W.S.float) W.S.float(k0); };
  function shore(W) {
    const T = W.tasks, rnd = W.rnd, S = W.S;
    AIR.length = 0;
    const sp = CH.spots;
    const mains = sp.filter((s) => !s.hidden); // the hidden easel has no air way to it
    for (let i = 0; i < mains.length; i++) { const a = mains[i], b = mains[(i + 1) % mains.length]; AIR.push([a.x, a.z, b.x, b.z]); }
    // open land, cheaply: not the sea, the quay, the shingle or the terrace, and not the steep face of the chalk
    const onLand = (x, z) => {
      if (W.h(x, z) < WATER_Y + 0.3) return false;
      const s = z - coastZ(x);
      if ((x > 93 && x < 178 && s < 34) || (x >= 178 && s < 46) || (x > -205 && x < -122 && s < 36 && landH(x) < 3.3) || (x > TX0 && x < TX1 && z > TZ0 && z < TZ1)) return false;
      W.normalAt(x, z, _N);
      return _N[1] > 0.78;
    };
    // the ways: a road of two ruts with grass between, and a footpath trodden pale
    T.push(() => {
      const lane = LU.lane, rut = pal(['#8a7660', '#7e6c5a', '#96806a'], 0.04), mid = pal(['#8cae54', '#9ab860', '#a8b46a'], 0.05), trod = pal(['#c4b494', '#b8a888', '#d0c4a4', '#a89c80', '#bcae8c'], 0.04);
      const lay = (pts, half, fine, col) => {
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, ang = Math.atan2(dz, dx);
          for (let d = 0; d < L; d += fine) for (let o = -half; o <= half + 0.01; o += fine * 0.8) {
            const x = a[0] + dx * d - dz * o + (rnd() - 0.5) * 0.3, z = a[1] + dz * d + dx * o + (rnd() - 0.5) * 0.3;
            if (!onLand(x, z) || seenG(x, z)) continue;
            const y = W.h(x, z), c = col(rnd, o / (half || 1)), a2 = ang + (rnd() - 0.5) * 0.3;
            W.normalAt(x, z, _N);
            const ex = Math.cos(a2), ez = Math.sin(a2), ey = -(ex * _N[0] + ez * _N[2]) / _N[1];
            S.add(x, y + 0.07, z, ex, ey, ez, _N[0], _N[1], _N[2], fine * (1.6 + rnd() * 0.8), fine * (0.55 + rnd() * 0.3), c, 0, rnd() < 0.5 ? CELL.LONG_A : CELL.HEAVY, 0, FLAG_GROUND);
          }
        }
      };
      lay(ROAD, 1.8, 0.85, (r, k) => (Math.abs(Math.abs(k) - 0.55) < 0.2 ? rut(r) : Math.abs(k) < 0.25 && r() < 0.6 ? mid(r) : lane(r)));
      lay(PATH, 0.35, 0.5, (r) => trod(r));
    });
    // the wheat and the oats standing in their strips, with poppies here and there
    T.push(() => {
      const ripe = pal(['#e0c070', '#d8b860', '#ecd088', '#c8a850', '#f0d898', '#c09848'], 0.05), oat = pal(['#d4cc90', '#c8c488', '#e0d8a8', '#b8bc80'], 0.05);
      paintCrop(W, { x0: -470, x1: 214, z0: -40, z1: 300, step: 3.0, h: 0.95, w: 0.14, cluster: 2, spread: 0.6, lean: 0.4, sway: 0.6,
        mask: (x, z) => { const u = use(x, z); return (u === 'wheat' || u === 'oats') && !(landH(x) > 12 && z - coastZ(x) < 80) && onLand(x, z) ? 1 : 0; }, col: (x, z, r) => (use(x, z) === 'oats' ? oat(r) : ripe(r)) });
      flowers(W, { x0: -470, x1: 214, z0: -40, z1: 300, step: 4.2, h: 0.85, size: 0.24, mask: (x, z) => { const u = use(x, z); return u !== 'wheat' && u !== 'flax' ? 0 : !onLand(x, z) ? 0 : u === 'wheat' ? 0.5 : 0.6; },
        col: (r) => (use(_ux, _uz) === 'flax' ? jit(hex('#8aa8e0'), 0.05, r) : jit(hex('#e0402c'), 0.06, r)) });
    });
    const slate = pal(['#6a7488', '#7a8496', '#5e687c', '#8a90a0'], 0.04), tile = pal(['#b8806c', '#c48a70', '#a8705e', '#cc9878'], 0.04), thatch = pal(['#a08a5e', '#b09868', '#8e7a52', '#c0a874'], 0.05);
    const plaster = pal(['#d8cebc', '#e0d4c0', '#cfc4b0', '#d6c8b0', '#c8c0b4'], 0.025), stoneW = pal(['#aca494', '#a09a8c', '#b4ac9c', '#989286'], 0.025), brick = pal(['#b8664e', '#a85a48', '#c47458', '#9c6a5a', '#8a8a8a'], 0.04);
    const timber = pal(['#dcd0b6', '#d2c6aa', '#6a4a36', '#d8ccb0', '#5a3e30', '#e0d4bc'], 0.025), win = pal(['#4a5a6e', '#3e4c5e'], 0.03), shut = pal(['#5a7a6a', '#4e6e8a'], 0.04);
    const home = (x, z, w, d, h, rh, yaw, wall, roof, o) => {
      if (!may(x, z, h + rh, Math.max(w, d) / 2 + 0.6)) return false;
      const ws = [];
      for (let k = 0; k < Math.max(1, Math.round(w / 3.2)); k++) ws.push({ side: -1, u: (k + 0.5) / Math.max(1, Math.round(w / 3.2)), v: h > 7 ? 0.7 : 0.55 }, { side: 1, u: (k + 0.5) / Math.max(1, Math.round(w / 3.2)), v: h > 7 ? 0.7 : 0.55 });
      if (h > 7) for (let k = 0; k < Math.round(w / 3.2); k++) ws.push({ side: -1, u: (k + 0.5) / Math.round(w / 3.2), v: 0.3 }, { side: 1, u: (k + 0.5) / Math.round(w / 3.2), v: 0.3 });
      ws.push({ side: 1, u: 0.5, v: 0.4, door: true, w: 1.1, h: 2.1 });
      house(W, { x, z, w, d, h, rh, yaw, wall, wallBase: wall(rnd), roof, roofBase: roof(rnd), windows: ws, win, door: win, shut: o && o.shut ? shut : null, hip: o && o.hip, step: o && o.fine ? 0.8 : 0.95, len: o && o.fine ? 1.6 : 1.9, wid: 0.58 });
      return true;
    };
    const chimney = (x, z, y, puff) => { S.add(x, y + 0.9, z, 0, 1, 0, 1, 0, 0, 1.8, 0.6, brick(rnd), 0, CELL.BLOCK, 0, FLAG_AXIAL); if (puff) smoke(W, x, y + 2.2, z, 7, 0.9, pal(['#c8c8cc', '#b8b8c0', '#d4d0d0'], 0.03), W.wind); };
    // a church: the nave, a tower at its west end and a spire of slate over it
    const church = (x, z, yaw, L, tw, th, sh, wall) => {
      if (!may(x, z, th + sh, L / 2 + 2)) return false;
      const c = Math.cos(yaw), s = Math.sin(yaw), y = W.h(x, z);
      house(W, { x, z, w: L, d: L * 0.42, h: 6.5, rh: 4.2, yaw, wall, wallBase: wall(rnd), roof: slate, roofBase: hex('#6a7488'), windows: [{ side: -1, u: 0.3, v: 0.5, w: 0.9, h: 2.4 }, { side: -1, u: 0.55, v: 0.5, w: 0.9, h: 2.4 }, { side: -1, u: 0.8, v: 0.5, w: 0.9, h: 2.4 }, { side: 1, u: 0.3, v: 0.5, w: 0.9, h: 2.4 }, { side: 1, u: 0.55, v: 0.5, w: 0.9, h: 2.4 }, { side: 1, u: 0.8, v: 0.5, w: 0.9, h: 2.4 }], win, door: win, step: 0.7, len: 1.5, wid: 0.5 });
      const tx = x - c * (L / 2 + tw / 2 - 0.4), tz = z - s * (L / 2 + tw / 2 - 0.4);
      box(W, { x: tx, z: tz, w: tw, d: tw, y0: y - 0.4, h: th + 0.4, yaw, wall, base: wall(rnd), step: 0.7, len: 1.5, wid: 0.5 });
      for (const k of [-1, 1]) panel(W, tx - s * k * (tw / 2 + 0.05), y + th - 2.2, tz + c * k * (tw / 2 + 0.05), -s * k, c * k, 0.9, 1.8, win(rnd), 0);
      pyramid(W, { x: tx, z: tz, w: tw + 0.5, d: tw + 0.5, y: y + th, h: sh, yaw, roof: slate, base: hex('#5e687c'), step: 0.6, len: 1.3, wid: 0.45 });
      S.add(tx, y + th + sh + 0.7, tz, 0, 1, 0, 1, 0, 0, 1.6, 0.1, [0.3, 0.28, 0.26], 0, CELL.HEAVY, 0, FLAG_AXIAL);
      W.collide(tx, tz, tw * 0.7);
      return true;
    };
    // Le Havre behind its quay: tall houses of grey stone and plaster under slate in rows along the streets, a church tower over them
    T.push(() => {
      for (const row of [[27, 0], [42, Math.PI], [58, 0], [76, 0]]) for (let x = 98; x < 212; x += 9.6) {
        if (Math.abs(x - 126) < 5 || Math.abs(x - 160) < 5 || rnd() < 0.08) continue;
        const h = 8 + rnd() * 4, wall = rnd() < 0.5 ? stoneW : plaster, px = x + (rnd() - 0.5) * 0.8;
        if (home(px, row[0] + (rnd() - 0.5) * 0.6, 9, 8, h, 3.4, row[1] + (rnd() - 0.5) * 0.05, wall, slate) && rnd() < 0.5) chimney(px + 2.5, row[0] - 1, W.h(px, row[0]) + h + 2.4, rnd() < 0.4);
      }
      church(104, 104, Math.PI / 2 + 0.05, 22, 5.5, 21, 10, stoneW);
      person(W, 112, 18.5, 1.6, { dress: hex('#3a4258'), top: hex('#2e3446'), hat: hex('#262a34') });
      person(W, 170, 24, -1.2, { dress: hex('#d8cfc0'), top: hex('#b84c40'), hat: hex('#e8dcc0'), parasol: hex('#3a4a6a') });
    });
    // Sainte-Adresse: villas in their gardens on the slope, the house of the terrace behind it, and the two lights of La Heve on the cap
    T.push(() => {
      const leaf = (r, t) => jit(mixc(hex('#2f5a34'), hex('#7aa04c'), r() * (0.3 + 0.7 * t)), 0.05, r), bark = pal(['#5a4a40', '#6a584a'], 0.04);
      home(31, 12, 11, 6.5, 7, 3.2, 0, plaster, slate, { hip: true, shut: true, fine: true });
      for (const v of [[54, 34, 0.1], [72, 42, -0.2], [20, 44, 0.2], [46, 54, 0.0], [-14, 36, 0.3], [8, 62, -0.1], [70, 62, 0.2], [90, 30, -0.3], [-18, 58, 0.15], [32, 72, 0.1]]) {
        const tiles = rnd() < 0.5;
        if (home(v[0], v[1], 10 + rnd() * 3, 7 + rnd() * 1.5, 5.5 + rnd() * 1.5, 3.2, v[2], rnd() < 0.7 ? plaster : brick, tiles ? tile : slate, { hip: rnd() < 0.5, shut: true }) && rnd() < 0.7) {
          const a = rnd() * TAU, tx = v[0] + Math.cos(a) * 9, tz = v[1] + Math.sin(a) * 8;
          if (may(tx, tz, 8, 3)) roundTree(W, tx, tz, 2.6 + rnd(), 3 + rnd() * 2, leaf, bark, hex('#2e4a30'), 70);
        }
      }
      for (const L of [[-6, 92], [14, 98]]) { // the lights of La Heve
        if (!may(L[0], L[1], 26, 3)) continue;
        const y = W.h(L[0], L[1]);
        tower(W, { x: L[0], z: L[1], y0: y - 0.4, y1: y + 20, r0: 2.6, r1: 1.9, sides: 4, wall: stoneW, base: hex('#b8b0a2'), step: 0.7, len: 1.5, wid: 0.5 });
        tower(W, { x: L[0], z: L[1], y0: y + 20, y1: y + 22.4, r0: 1.4, r1: 1.3, sides: 8, wall: pal(['#e8e4d8', '#f4f0e4'], 0.02), base: hex('#e8e4d8'), step: 0.4, len: 0.8, wid: 0.3 });
        S.add(L[0], y + 23.2, L[1], 0, 1, 0, 1, 0, 0, 1.4, 1.9, [0.3, 0.32, 0.36], 0, CELL.BLOCK, 0, FLAG_AXIAL);
        home(L[0] + 7, L[1] + 4, 9, 6, 4, 3, 0, plaster, slate);
        W.collide(L[0], L[1], 2.6);
      }
    });
    // Etretat: the houses along its street and before the shingle, its church at the head of the village, and on the beach the boats hauled up,
    // the capstans that haul them, and old hulls roofed with thatch for sheds
    T.push(() => {
      for (const v of [[-192, 40, 0.0], [-181, 39, 0.05], [-150, 42, -0.1], [-136, 46, -0.3], [-172, 68, 0.3], [-150, 78, 0.2], [-182, 92, 0.4], [-140, 80, -0.2], [-196, 56, 0.1], [-130, 98, -0.4], [-188, 108, 0.2], [-160, 104, 0.1], [-198, 76, 0.5]]) {
        const fl = rnd() < 0.5;
        if (home(v[0], v[1], 8 + rnd() * 3, 6 + rnd(), 4 + rnd() * 2.5, 3.6, v[2], fl ? brick : timber, rnd() < 0.3 ? thatch : slate, { shut: true }) && rnd() < 0.6) chimney(v[0] + 2, v[1], W.h(v[0], v[1]) + 7.6, rnd() < 0.5);
      }
      church(-172, 124, 0.08, 20, 5.5, 17, 9, stoneW);
      const caloge = (x, z, yaw) => {
        if (!may(x, z, 2.6, 3.6)) return;
        const y = W.h(x, z);
        box(W, { x, z, w: 6.4, d: 2.6, y0: y - 0.2, h: 1.4, yaw, wall: pal(['#3a3a44', '#4a4038', '#2e3440'], 0.04), base: [0.2, 0.2, 0.22], step: 0.4, len: 1.1, wid: 0.3 });
        gableRoof(W, { x, z, w: 6.4, d: 2.6, y: y + 1.2, rh: 1.3, yaw, roof: thatch, base: hex('#8e7a52'), gable: pal(['#3a3a44'], 0.04), gableBase: [0.2, 0.2, 0.22], step: 0.4, len: 1.0, wid: 0.32 });
        W.collide(x, z, 2.4);
      };
      caloge(-177, 31, 0.3); caloge(-189, 31, 0.15); caloge(-136, 33, -0.4); // (all of these stand on the level shingle: the cliffs at both ends of the beach begin at about x -200 and x -130)
      const wood = pal(['#5a4636', '#6a5240', '#4e3e30'], 0.04);
      for (const c of [[-183, 21], [-194, 13], [-196, 4], [-133, 13]]) { // capstans, each with its bar across
        if (!may(c[0], c[1], 1.2, 1)) continue;
        const y = W.h(c[0], c[1]), a = rnd() * Math.PI;
        tower(W, { x: c[0], z: c[1], y0: y - 0.1, y1: y + 0.95, r0: 0.45, r1: 0.4, sides: 6, wall: wood, base: wood(rnd), step: 0.25, len: 0.5, wid: 0.2 });
        S.add(c[0], y + 0.9, c[1], Math.cos(a), 0, Math.sin(a), 0, 1, 0, 3.2, 0.1, wood(rnd), 0, CELL.HEAVY, 0, 0);
        W.collide(c[0], c[1], 0.7);
      }
      const cols = [pal(['#2e4a6a', '#3a587a'], 0.04), pal(['#7a3a2e', '#8a463a'], 0.04), pal(['#3a5a4a', '#46685a'], 0.04), pal(['#c8a040', '#b89038'], 0.04)], trim = pal(['#e8e0cc', '#d8c8a0'], 0.03);
      [[-193, 18, 0.4], [-194, 8, 0.15], [-186, 26, 0.6], [-133.5, 18, 1.2], [-146, 30, 1.0]].forEach((b, i) => { if (may(b[0], b[1], 1.3, 2.8)) beachBoat(W, b[0], b[1], b[2], cols[i % 4], trim); });
      person(W, -186, 23, 2.2, { dress: hex('#3c4a5e'), top: hex('#8a6a4a'), hat: hex('#2e3440') });
      person(W, -160, 66, 0.4, { dress: hex('#2a2a32'), top: hex('#e6e0d0'), hat: hex('#f0ece0') });
    });
    // Varengeville: the church on the brink of the western cliff in its yard of graves, and a few cottages back from it
    T.push(() => {
      const flint = pal(['#8a8a90', '#7a7c84', '#9a968e', '#6e7078', '#a8a294'], 0.04);
      if (church(-258, -40, 0.12, 15, 4.4, 13, 7, flint)) {
        const c = Math.cos(0.12), s = Math.sin(0.12), wl = [];
        for (const p of [[-13, -9], [13, -9], [13, 9], [-13, 9], [-13, -9]]) wl.push([-258 + p[0] * c - p[1] * s, -40 + p[0] * s + p[1] * c]);
        fence(W, wl, pal(['#7a7c84', '#8a8a90'], 0.04), 0.9);
        for (let i = 0; i < 9; i++) { // crosses
          const gx = -258 + (rnd() - 0.5) * 20, gz = -40 + (rnd() < 0.5 ? -6.5 : 6.5) + (rnd() - 0.5) * 2.5, y = W.h(gx, gz);
          S.add(gx, y + 0.5, gz, 0, 1, 0, 1, 0, 0, 1.0, 0.1, [0.82, 0.8, 0.76], 0, CELL.HEAVY, 0, FLAG_AXIAL);
          S.add(gx, y + 0.75, gz, 1, 0, 0, 0, 0, 1, 0.5, 0.09, [0.82, 0.8, 0.76], 0, CELL.LONG_B, 0, 0);
        }
        cypress(W, -268, -46, 6, 1.1, pal(['#2e4a34', '#36523a', '#28402e'], 0.04), hex('#22382a'));
      }
      for (const v of [[-262, -14, 0.2], [-268, 6, 0.1], [-244, 24, 0.4]]) if (home(v[0], v[1], 8, 5.5, 3.6, 3.4, v[2], timber, thatch)) chimney(v[0] + 2, v[1], W.h(v[0], v[1]) + 6.6, true);
      person(W, -250, -27, 2.5, { dress: hex('#2a2a32'), top: hex('#303040'), hat: hex('#1e1e26') });
    });
    // the farms of the Caux, each in its square of beeches on a bank, the house and barn inside among apple trees; rows of trees along the road;
    // and the woods along the far rise, where the walk comes to its end
    T.push(() => {
      const beech = (r, t) => jit(mixc(hex('#2e5032'), hex('#86a650'), r() * (0.3 + 0.7 * t)), 0.05, r), apple = (r, t) => (r() < 0.12 ? jit(hex('#f0e0e4'), 0.04, r) : jit(mixc(hex('#3e6a36'), hex('#8aac58'), r() * t), 0.05, r));
      const bark = pal(['#5a4a40', '#6a584a', '#4e4038'], 0.04);
      for (const F of [[-66, 132, 62, 50], [52, 142, 58, 48], [-228, 156, 58, 48], [-150, 196, 50, 42]]) {
        const [fx, fz, fw, fd] = F;
        for (let i = 0, n = Math.round((fw + fd) * 2 / 11.5); i < n; i++) {
          let u = (i / n) * (fw + fd) * 2, x, z;
          if (u < fw) { x = fx - fw / 2 + u; z = fz - fd / 2; } else if ((u -= fw) < fd) { x = fx + fw / 2; z = fz - fd / 2 + u; } else if ((u -= fd) < fw) { x = fx + fw / 2 - u; z = fz + fd / 2; } else { x = fx - fw / 2; z = fz + fd / 2 - (u - fw); }
          if (may(x, z, 11, 3.5)) roundTree(W, x + (rnd() - 0.5) * 2, z + (rnd() - 0.5) * 2, 3 + rnd() * 0.8, 5.5 + rnd() * 2, beech, bark, hex('#2a4430'), 44);
        }
        if (home(fx - 6, fz - 4, 16, 6.5, 3.8, 4.4, 0.05, timber, thatch)) chimney(fx - 1, fz - 4, W.h(fx - 6, fz - 4) + 7.6, true);
        home(fx + 12, fz + 8, 14, 7, 4, 4, Math.PI / 2, pal(['#8a6a54', '#9a7a60', '#7a5e4a'], 0.04), thatch);
        for (let k = 0; k < 6; k++) { const x = fx - fw * 0.35 + rnd() * fw * 0.3, z = fz + 4 + rnd() * fd * 0.32; if (may(x, z, 4, 2)) roundTree(W, x, z, 1.7, 1.3, apple, bark, hex('#2e4a30'), 26); }
      }
      // an avenue along the road where it crosses the open cliff tops
      for (const seg of [[-30, 25, -106, 66], [-192, 90, -248, 28], [44, 17, 100, 15]]) {
        const L = Math.hypot(seg[2] - seg[0], seg[3] - seg[1]), dx = (seg[2] - seg[0]) / L, dz = (seg[3] - seg[1]) / L;
        for (let d = 6; d < L - 4; d += 15) { const x = seg[0] + dx * d - dz * 5, z = seg[1] + dz * d + dx * 5; if (may(x, z, 9, 2.5)) roundTree(W, x, z, 2.3 + rnd() * 0.5, 4.5 + rnd() * 1.5, beech, bark, hex('#2a4430'), 84); }
      }
      // the woods: soft clumps of crowns wherever the ground is wood, bluer the further off
      const wr = mulberry32(4711);
      for (let i = 0, got = 0; i < 2600 && got < 170; i++) {
        const px = -540 + wr() * 1080, z = coastZ(px) + 150 + wr() * 290;
        if (use(px, z) !== 'wood') continue;
        const s0 = z - coastZ(px), r = 6 + wr() * 5, h = r * 0.9;
        if (!may(px, z, h * 1.6, r)) continue;
        got++;
        const far = clamp((s0 - 200) / 160, 0, 1), y = W.h(px, z);
        leafCloud(W, px, y + h * 0.8, z, { n: 20, rx: r, ry: h, rz: r, size: 2.5, aspect: 1.5, core: hex('#2a4636'), col: (rr, t) => jit(mixc(mixc(hex('#2e5038'), hex('#7a9a5c'), rr() * t), hex('#7a90a0'), far * 0.4), 0.04, rr) });
      }
    });
    // along the ways the ground is walked on and seen close: the wide touches laid for the distance are drawn in, and small ones laid among them
    T.push(() => {
      const near = (x, z) => pathDist(x, z, PATH) < 9 || pathDist(x, z, ROAD) < 7;
      for (let i = 0; i < S.n; i++) {
        const o = i * 4;
        if (S.sca[o] < 2.4 || !(Math.floor(S.sca[o + 2] / 16) & FLAG_GROUND)) continue;
        const x = S.pos[o], z = S.pos[o + 2];
        if (z - coastZ(x) < 0 || seenG(x, z) || !near(x, z)) continue;
        S.sca[o] = 2.4; S.sca[o + 1] = Math.min(S.sca[o + 1], 1.0); S.pos[o + 1] = W.h(x, z) + 0.08;
      }
      for (const [pts, half] of [[PATH, 8], [ROAD, 5.5]]) for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
        for (let d = 0; d < L; d += 1.45) for (let o = -half; o <= half; o += 1.45) {
          const x = a[0] + dx * d - dz * o + (rnd() - 0.5) * 1.45, z = a[1] + dz * d + dx * o + (rnd() - 0.5) * 1.45;
          if (Math.abs(o) < 2.2 || !onLand(x, z) || seenG(x, z)) continue;
          const y = W.h(x, z), c = ground.col(x, z, rnd), a2 = ground.dir(x, z) + (rnd() - 0.5) * 0.8;
          W.normalAt(x, z, _N);
          const ex = Math.cos(a2), ez = Math.sin(a2), ey = -(ex * _N[0] + ez * _N[2]) / _N[1];
          S.add(x, y + 0.06, z, ex, ey, ez, _N[0], _N[1], _N[2], 1.2 + rnd() * 0.6, 0.45 + rnd() * 0.25, c, 0, [CELL.DAB, CELL.HEAVY, CELL.COMMA, CELL.LONG_A][(rnd() * 4) | 0], 0, FLAG_GROUND);
        }
      }
    });
    // a fence along the cliff path wherever it runs near the brink
    T.push(() => {
      const post = pal(['#5a4a3e', '#6a5848', '#4e4036'], 0.04);
      for (let i = 0; i < PATH.length - 1; i++) {
        const a = PATH[i], b = PATH[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
        let run = [];
        const flush = () => { if (run.length > 1) fence(W, run, post, 1.0); run = []; };
        for (let d = 0; d <= L; d += 2.2) {
          // the side towards the sea
          const nx = dz, nz = -dx, sgn = nz < 0 ? 1 : -1, x = a[0] + dx * d + nx * sgn * 1.8, z = a[1] + dz * d + nz * sgn * 1.8;
          const s = z - coastZ(x), hl = landH(x), ok = hl > 12 && s < 20 && s > 4 && !seenG(x, z) && !seen(x, W.h(x, z) + 1.2, z) && Math.hypot(x - sp[2].x, z - sp[2].z) > 8;
          if (ok) run.push([x, z]); else flush();
        }
        flush();
      }
    });
  }
  const CH = {
    id: 'coast', seed: 7001, build, height,
    start: { x: 150, z: -22, yaw: 1.5 }, center: [-22, -12], radius: 236,
    sunPath: { rise: 104, set: 395, maxEl: 54 }, wind: [0.9, 0.3], canvas: '#e8e4da', brushRot: 0.1, edge: 0.74,
    water: { tint: '#2f6872', refl: 0.84 }, t0: 0.25, maxAlt: 60,
    swatch: ['#f08a4a', '#7aa0b8', '#f2ecdc', '#86b050'],
    title: { x: 179, z: -38, y: 8.5, yaw: 1.929, pitch: -0.057, fov: 58, t0: 0.262, t1: 0.283 },
    phases: [
      { cover: 0.34, mist: 1.3, sun: 0.6, sat: 1.02, el: 0.63 },
      { cover: 0.44 },
    ],
    // the air of the Channel, hour by hour. km: how much of the morning of mist is in it
    atmo(e, t, ph) {
      const km = clamp(ph.mist / 1.3, 0, 1), kc = 1 - km;
      const sky = (a, b, c, d, k) => { e.sky[0] = mixc(e.sky[0], a, k); e.sky[1] = mixc(e.sky[1], b, k); e.sky[2] = mixc(e.sky[2], c, k); e.sky[3] = mixc(e.sky[3], d, k); };
      const cloud = (lit, shade, cover, k) => { e.cloudLit = mixc(e.cloudLit, lit, k); e.cloudShade = mixc(e.cloudShade, shade, k); e.cover = lerp(e.cover, cover, k); };
      // the sun keeps its own time here. In the mist it comes up and then hangs low over the harbour while he paints it; and every evening it is slow to go down behind the sea
      let tau = t;
      if (t > 0.25 && t < 0.39) tau = lerp(t, t < 0.268 ? lerp(0.25, 0.2745, (t - 0.25) / 0.018) : t < 0.32 ? 0.2745 + (t - 0.268) * 0.2 : lerp(0.2849, 0.39, (t - 0.32) / 0.07), km);
      else if (t > 0.741 && t < 0.8) tau = t < 0.776 ? 0.741 + (t - 0.741) * 0.2 : lerp(0.748, 0.8, (t - 0.776) / 0.024);
      if (tau !== t) {
        const p = CH.sunPath, day = (tau - 0.25) / 0.5, mx = p.maxEl * ph.el;
        const el = (tau <= 0.75 ? mx * Math.sin(Math.PI * day) : -mx * 0.35 * Math.sin(Math.PI * clamp((tau - 0.75) / 0.25, 0, 1))) + 0.8;
        e.sunDir = skyDir(lerp(p.rise, p.set, day), el); e.sunEl = el;
      }
      e.waterRefl = lerp(0.5, 0.84, km);
      e.dash = 0; e.streak = 0;
      if (km > 0.001) {
        // the mist gathers with the dawn and thins as the morning goes on; the night before it is clear enough to see the masts by
        const up = sstep(0.215, 0.255, t), off = sstep(0.31, 0.4, t);
        e.fogD = lerp(e.fogD, lerp(lerp(0.0026, 0.007, up), 0.0032, off), km); e.mist = lerp(e.mist - ph.mist, 0.5, km);
        // the harbour on the morning of the Impression: a blue green haze over everything, rose and orange high in the sky, the sun a small orange coin with nothing round it
        const kI = km * sstep(0.215, 0.245, t) * (1 - sstep(0.32, 0.4, t));
        if (kI > 0.001) {
          const air = [0.49, 0.58, 0.57];
          sky([0.7, 0.58, 0.53], [0.82, 0.62, 0.5], [0.54, 0.585, 0.57], air, kI);
          e.fog = mixc(e.fog, air, kI); e.haze = mixc(e.haze, air, kI);
          e.amb = mixc(e.amb, [0.6, 0.72, 0.8], kI); e.sun = mixc(e.sun, [0.24, 0.16, 0.11], kI);
          e.glow = mixc(e.glow, [0.03, 0.03, 0.03], kI); e.glowP *= 1 - kI; e.glowW = lerp(e.glowW, 1, kI); e.grey = lerp(e.grey, 1, kI);
          cloud([0.95, 0.63, 0.49], [0.8, 0.6, 0.54], 0.2, kI);
          e.scatter *= 1 - kI; e.cloudShadow *= 1 - kI; e.waterRefl = lerp(e.waterRefl, 0.96, kI);
          e.dash = kI * sstep(-1.2, 1.5, e.sunEl) * (1 - sstep(13, 19, e.sunEl)); e.streak = kI;
        }
        // and the rest of that day: a soft sky, the blue milky, the light without edges
        const kD = km * off * (1 - sstep(0.69, 0.725, t));
        if (kD > 0.001) {
          sky([0.56, 0.64, 0.74], [0.66, 0.72, 0.78], [0.76, 0.79, 0.8], [0.8, 0.81, 0.8], 0.5 * kD);
          e.fog = mixc(e.fog, [0.74, 0.78, 0.8], 0.6 * kD); e.grey = lerp(e.grey, 0.45, kD);
          cloud([0.92, 0.92, 0.93], [0.7, 0.72, 0.77], 0.4, 0.6 * kD);
        }
      }
      if (kc > 0.001) {
        // a clear day: pale and grey blue over the terrace in the morning, high and bright over the cliff walk at noon, deep behind the Needle in the afternoon
        const k2 = kc * sstep(0.34, 0.4, t) * (1 - sstep(0.455, 0.49, t)), k3 = kc * sstep(0.455, 0.49, t) * (1 - sstep(0.55, 0.585, t)), k4 = kc * sstep(0.55, 0.585, t) * (1 - sstep(0.64, 0.69, t));
        if (k2 > 0.001) { sky([0.38, 0.43, 0.6], [0.45, 0.5, 0.64], [0.55, 0.6, 0.68], [0.62, 0.66, 0.7], 0.9 * k2); cloud([0.88, 0.89, 0.9], [0.62, 0.65, 0.72], 0.5, k2); e.amb = mixc(e.amb, [0.6, 0.7, 0.72], 0.4 * k2); e.waterRefl = lerp(e.waterRefl, 0.26, k2); }
        if (k3 > 0.001) { sky([0.36, 0.56, 0.8], [0.46, 0.64, 0.8], [0.58, 0.7, 0.78], [0.62, 0.72, 0.76], 0.9 * k3); cloud([1, 1, 0.98], [0.8, 0.82, 0.87], 0.46, k3); e.amb = mixc(e.amb, [0.62, 0.74, 0.74], 0.5 * k3); e.waterRefl = lerp(e.waterRefl, 0.6, k3); }
        if (k4 > 0.001) { sky([0.22, 0.4, 0.7], [0.34, 0.5, 0.75], [0.54, 0.65, 0.78], [0.68, 0.74, 0.76], 0.75 * k4); cloud([0.97, 0.94, 0.83], [0.68, 0.7, 0.76], 0.5, k4); }
      }
      // the day of the cottage on the cliff: a paler, softer blue, warm white clouds, and the sea showing its own green more than the sky. Only round the hour of that picture
      const kV = kc * sstep(0.512, 0.522, t) * (1 - sstep(0.545, 0.56, t));
      if (kV > 0.001) { sky([0.36, 0.56, 0.86], [0.44, 0.62, 0.88], [0.56, 0.7, 0.9], [0.72, 0.8, 0.88], 0.9 * kV); cloud([1, 0.97, 0.92], [0.84, 0.82, 0.88], 0.4, kV); e.waterRefl = lerp(e.waterRefl, 0.34, kV); e.amb = mixc(e.amb, [0.62, 0.84, 0.78], 0.55 * kV); }
      // sunset behind the sea: the rocks stand blue and violet against it, the clouds lie in bars of yellow and rose, the sea is as pale as the sky, the sun is a red coin
      const kE = sstep(0.69, 0.728, t);
      if (kE > 0.001) {
        sky([0.56, 0.62, 0.62], [0.68, 0.69, 0.63], [0.86, 0.78, 0.66], [0.82, 0.7, 0.68], 0.8 * kE);
        cloud([0.98, 0.86, 0.62], [0.82, 0.62, 0.64], 0.52, kE);
        e.fog = mixc(e.fog, [0.8, 0.71, 0.69], 0.8 * kE);
        e.amb = mixc(e.amb, [0.36, 0.44, 0.7], 0.7 * kE);
        e.glow = mixc(e.glow, [0.5, 0.4, 0.45], 0.9 * kE); e.glowP *= 1 - kE; e.glowW = lerp(e.glowW, 1, kE); e.grey = Math.max(e.grey, 0.85 * kE);
        e.waterRefl = lerp(e.waterRefl, 0.97, kE);
      }
    },
    dyn(S, t, W, fade, g, env) {
      if (env.sunI >= 0.1) for (let i = 0; i < 7; i++) { // gulls
        const a = t * (0.12 + i * 0.013) + i * 2.1, R = 26 + i * 9, cx = [150, 30, -80, -180][i % 4], cz = [-70, -60, -60, -50][i % 4];
        drawBird(S, cx + Math.cos(a) * R, 14 + i * 2.2 + Math.sin(t * 0.4 + i) * 3, cz + Math.sin(a) * R * 0.7, a + Math.PI / 2, Math.sin(t * 4.4 + i * 1.7) * 0.5, 1.5 * fade, [0.92, 0.93, 0.95]);
      }
      // the white sails off the cliff top of the cottage
      if (g && g.cam) {
        const cp = g.cam.pos, kd = (1 - sstep(30, 60, Math.hypot(cp[0] - VC.x, cp[2] - VC.z))) * fade;
        if (kd > 0.01) for (let i = 0; i < SAILS6.length; i++) {
          const b = SAILS6[i], H = b[2] * kd, x = b[0], z = b[1], y = WATER_Y;
          S.bill(x, y + 0.25 * H, z, 0.02, 0.62 * H, 0.13 * H, [0.32, 0.36, 0.44], 0, CELL.HEAVY, 0, false, 0, 1, 0, 0);
          S.bill(x - 0.08 * H, y + 0.62 * H, z, 1.62 + 0.1 * b[3], 0.78 * H, 0.42 * H, [0.98, 0.97, 0.93], 0, CELL.DAB, 0.25, false, -0.8, 0.4, 0.4, 0);
          S.bill(x + 0.2 * H, y + 0.5 * H, z, 1.5 - 0.1 * b[3], 0.55 * H, 0.26 * H, [0.94, 0.93, 0.9], 0, CELL.COMMA, 0.15, false, 0.6, 0.4, 0.4, 0);
        }
      }
      // the sun's colour on the harbour water: orange strokes one under another, as he set them down that morning
      const k = (env.dash || 0) * fade;
      if (k > 0.02 && W && g && g.cam) {
        const d = env.sunDir, hl = Math.hypot(d[0], d[2]) || 1, sx = d[0] / hl, sz = d[2] / hl, cam = g.cam.pos, H = cam[1] - WATER_Y;
        if (H > 0.6) for (let i = 0; i < 22; i++) {
          const h1 = fr(Math.sin(i * 12.9898) * 43758.5453), h2 = fr(Math.sin(i * 78.233) * 12345.678);
          const dist = H / Math.tan((Math.max(env.sunEl, 0.5) + 1.3 + i * 0.44 + i * i * 0.012) * DEG);
          const side = ((h1 - 0.5) * 0.03 * (1 + i * 0.07) + Math.sin(t * 0.6 + i * 2.4) * 0.003) * dist;
          const px = cam[0] + sx * dist - sz * side, pz = cam[2] + sz * dist + sx * side;
          if (dist > 400 || W.h(px, pz) > WATER_Y - 0.1) continue;
          const tw = 0.82 + 0.18 * Math.sin(t * 1.7 + i * 1.9);
          S.bill(px, WATER_Y + 0.3, pz, (h2 - 0.5) * 0.1, dist * (0.036 + 0.028 * h2) * tw * k, dist * (0.0075 + 0.0035 * h1) * k, [1.0, 0.22 + 0.08 * h1, 0.05], 0, i % 3 ? CELL.HEAVY : CELL.LONG_A, Math.min(1.7, 0.1 + 0.013 * dist), false, 0, 1, 0, 0);
        }
      }
      // and its colour in the sky: streaks of orange and rose, each a few dry touches dragged side by side, high up and mostly to the right
      const ks = (env.streak || 0) * fade;
      if (ks > 0.02) for (let i = 0; i < 44; i++) {
        const c = i >> 2, j = i & 3, h1 = fr(Math.sin(c * 12.9898 + 3) * 43758.5453), h2 = fr(Math.sin(c * 78.233 + 1) * 12345.678), h3 = fr(Math.sin(c * 39.425 + 2) * 24634.633);
        const q1 = fr(Math.sin(i * 5.317 + 7) * 9631.77), q2 = fr(Math.sin(i * 3.971 + 4) * 5113.31);
        const az = (84 + 68 * Math.pow(h1, 0.75) + (q1 - 0.5) * 5) * DEG, el = (10.5 + 11.5 * h2 + (j - 1.5) * 0.5 + (q2 - 0.5) * 0.5) * DEG, tl = (h3 - 0.5) * 0.3 - 0.05 + (q1 - 0.5) * 0.12;
        const dx = Math.sin(az) * Math.cos(el), dy = Math.sin(el), dz = -Math.cos(az) * Math.cos(el), R = 884 - i * 0.03;
        S.add(dx * R, dy * R, dz * R, Math.cos(az) * Math.cos(tl), Math.sin(tl), Math.sin(az) * Math.cos(tl), -dx, -dy, -dz, (55 + 100 * h3) * (0.6 + 0.8 * q2), (5 + 8 * q1) * ks, [0.92 - 0.12 * q2, 0.6 + 0.04 * q2, 0.46 + 0.1 * q2], 0, [CELL.DRY, CELL.LONG_B, CELL.DRY, CELL.LONG_A][j], 0.2, FLAG_DOME);
      }
    },
    spots: [
      { x: 171.5, z: -30, view: { x: 179, y: 8.5, z: -38, yaw: 1.929, pitch: -0.057, fov: 58 } },
      { x: 31, z: -3.4, view: { x: 31, y: 3.3, z: -5.9, yaw: 0.0, pitch: -0.188, fov: 58 } },
      { x: -66.5, z: -22, view: { x: -74, y: 2.6, z: -21, yaw: 1.15, pitch: -0.18, fov: 58 } },
      { x: -168, z: 12, view: { x: -155.5, y: 2.0, z: 14, yaw: 0.05, pitch: 0.15, fov: 58 } },
      { x: -230, z: -9, hidden: true, easel: [-228.7, -7.6], view: VC },
    ],
    effects: [
      { id: 'c1', spot: 0, phase: 0, t0: 0.258, t1: 0.318 },
      { id: 'c2', spot: 1, phase: 1, t0: 0.4, t1: 0.47 },
      { id: 'c3', spot: 2, phase: 1, t0: 0.48, t1: 0.56 },
      { id: 'c4', spot: 3, phase: 1, t0: 0.575, t1: 0.635 },
      { id: 'c5', spot: 3, phase: -1, t0: 0.735, t1: 0.775 },
      { id: 'c6', spot: 4, phase: 1, t0: 0.495, t1: 0.595, hidden: true },
    ],
    need: 3, door: { x: -138, z: 24, yaw: -0.6 },
    // where the ways run, for the sights: in the order of travel, with absolute heights
    lines: {
      road: ROAD.map((p) => [p[0], height(p[0], p[1]), p[1]]),
      path: PATH.map((p) => [p[0], height(p[0], p[1]), p[1]]),
      fairway: FAIR.map((p) => [p[0], WATER_Y, p[1]]),
    },
    _dev: { use, seen, seenG, may0, setHf(f) { _hf = f; _vis = null; EYES.length = 0; AIR.length = 0; }, dropped: () => _dropped },
  };
  return CH;
})();
