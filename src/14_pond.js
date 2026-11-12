// ---------- Giverny, the water garden, 1899 to 1926: the bridge, the lilies, and the eye that changed ----------
const W_POND = (() => {
  const WATER_Y = -0.25;
  const lobe = (x, z, cx, cz, rx, rz) => Math.hypot((x - cx) / rx, (z - cz) / rz);
  // below 1 is water: a long basin, a smaller one to the west, and the neck between them that the bridge crosses
  const pondF = (x, z) => Math.min(lobe(x, z, 8, 0, 40, 21.5), lobe(x, z, -42, 2, 19, 12.5), lobe(x, z, -27, 1, 9, 8.6)) + 0.1 * (vnoise(x * 0.07 + 3, z * 0.07, 501) - 0.5);
  // ----- the country round the gardens. In this world north (minus z) is the water meadows and the Epte, south the hill and the village.
  // The house and the flower garden lie south of the water garden, and between the two run the railway from Vernon to Gisors and the road
  const RAIL_Z = 37.8, WALL_Z = 42.75, FENCE_Z = 35.6, FENCE_X = 68, FENCE_N = -44;
  // the road keeps beside the railway, and west of the farm it steps aside round an old poplar
  const roadZ = (x) => 40.9 + 2.4 * sstep(-84, -95, x);
  // the Ru, the brook he led off the Epte to feed the pond: it comes in over the sluice at the eastern end
  const RU = [[44.5, -8], [52, -14.5], [62, -22], [76, -30.5], [92, -42], [108, -56], [124, -70], [140, -86], [156, -104]];
  const ruD = (x, z) => (x < 40 || z > -2 ? 99 : pathDist(x, z, RU));
  // the Epte among its poplars, along the northern edge of the meadows
  const epteZ = (x) => -95 + 5 * Math.sin(x * 0.02 + 1.3) + 2.5 * Math.sin(x * 0.055 + 0.4) - 4 * Math.exp(-(((x + 9) / 25) ** 2)) - 4.5 * Math.exp(-(((x - 66) / 20) ** 2));
  const epteK = (x) => 1 - sstep(175, 215, Math.abs(x));
  // the hill the village climbs, south west of the house: by its bearing from the middle of the world, and how far out
  const hillK = (x, z) => { const a = Math.atan2(z - 34, x) / DEG, r = Math.hypot(x, z - 34); return sstep(112, 125, a) * (1 - sstep(140, 152, a)) * sstep(122, 230, r); };
  function height(x, z) {
    const f = pondF(x, z), r = Math.hypot(x, z - 30);
    let h = 0.55 + 0.5 * (fbm(x * 0.02 + 1, z * 0.02 + 4, 3, 502) - 0.5) - 3.0 * (1 - sstep(0.9, 1.07, f)) + (12 + 14 * fbm(x * 0.004, z * 0.004 + 3, 3, 503)) * sstep(240, 420, r) * (1 - 0.8 * sstep(470, 700, r));
    if (x < -10 && z > 60) h += 16 * hillK(x, z);
    if (z < -78 && z > -112) { const k = epteK(x) * (1 - sstep(3.4, 8, Math.abs(z - epteZ(x)))); if (k > 0) h = lerp(h, -0.95, k); }
    return h;
  }
  const BX = -28, ZA = -10.8, ZB = 12.6, HW = 1.15;
  const deckY = (z) => 0.62 + 2.35 * Math.sin((Math.PI * (z - ZA)) / (ZB - ZA));
  const inBed = (x, z) => z > 46 && z < 110 && Math.abs(x) > 5 && Math.abs(x) < 58 && ((Math.abs(x) - 5) % 4.4) < 1.9;
  // west of the middle walk the beds are one field of irises, and a path of red earth runs through it
  const inIris = (x, z) => z > 46 && z < 110 && x > -58 && x < -5;
  const onRed = (x, z) => z > 45.6 && z < 110.4 && x > -31.4 && x < -28.9;
  // the hidden easel of the weeping willow (1918 to 1919), alone in the east meadow beyond the end of the pond.
  // The eye stands under its crown and looks south at the trunk. at(d, s) is the place d metres ahead of the eye and s metres to the right of it
  const WV = { x: 88, y: 1.6, z: 6, yaw: 2.97, pitch: 0.11, fov: 42 };
  const WF = [Math.sin(WV.yaw), -Math.cos(WV.yaw)], WR = [Math.cos(WV.yaw), Math.sin(WV.yaw)];
  const at = (d, s) => [WV.x + d * WF[0] + s * WR[0], WV.z + d * WF[1] + s * WR[1]];
  const WC = at(8.5, 1.5);
  const underWillow = (x, z) => Math.hypot(x - WC[0], z - WC[1]) < 12.5 + 2.5 * vnoise(x * 0.2, z * 0.2, 508);
  const P = {
    lawn: pal(['#7fae4c', '#92bc56', '#6c9c46', '#a4c462', '#5e9044', '#b4c86a'], 0.05, [3, 3, 3, 2, 2, 1]),
    bank: pal(['#4f8a44', '#5e9a4a', '#427a40', '#74a852', '#3a6e42'], 0.05),
    path: pal(['#dcc8b4', '#e4d2c0', '#d0b8a4', '#eadccc', '#d8c0b4'], 0.04),
    earth: pal(['#6e9a48', '#84a850', '#8a7a58', '#5e8a44', '#a09060'], 0.05),
    iris: pal(['#3f6e3c', '#4f8444', '#544aa8', '#6458bc', '#7466cc', '#35603a', '#8470d0', '#443c94', '#6a9a48'], 0.05, [3, 3, 2, 2, 2, 2, 1, 1, 1]),
    red: pal(['#a8503c', '#b8604a', '#96443a', '#c87458', '#8a3e36', '#b06c6a', '#d08a6c'], 0.05, [3, 3, 2, 2, 2, 1, 1]),
    bed: pal(['#5f8f4e', '#567f46'], 0.04),
    far: pal(['#86a878', '#7a9e80', '#92b080', '#6e9478'], 0.05),
    wil: pal(['#c08a48', '#cca050', '#a8784a', '#a8964a', '#dcc888', '#9a6a48'], 0.05, [3, 3, 2, 2, 1, 2]),
    wid: pal(['#3a5a40', '#2e4e4c', '#3e5a48', '#4a4466', '#345448', '#5a4a3a'], 0.05, [3, 3, 3, 1, 3, 1]),
    wgr: pal(['#5a7a3a', '#6a8a3c', '#4a6a44', '#8a8a44'], 0.05),
  };
  const BASE = { wil: hex('#a88a4a'), wid: hex('#4a5040'), lawn: hex('#7cac4c'), bank: hex('#4c8644'), path: hex('#dac6b2'), earth: hex('#6c9648'), iris: hex('#4c5e62'), red: hex('#a4553f'), bed: hex('#3c5e4a'), far: hex('#84a67a') };
  Object.assign(P, {
    road: pal(['#dcc6a8', '#e6d4b8', '#ccb498', '#d6bcb0', '#eadcc6', '#bea490'], 0.04, [3, 3, 2, 2, 2, 1]),
    ballast: pal(['#8e8698', '#a096a4', '#7e788a', '#aaa0a8', '#746e7e', '#9a8a84'], 0.04, [3, 3, 2, 2, 1, 1]),
    hay: pal(['#a6b45a', '#b8bc6a', '#94a852', '#c8c076', '#86a04c', '#d4c884', '#9cb070'], 0.05, [3, 3, 3, 2, 2, 1, 2]),
    pasture: pal(['#5c9a48', '#6aa64e', '#4e8c46', '#7aae58', '#88b660', '#5a9070'], 0.05, [3, 3, 3, 2, 1, 1]),
    vegA: pal(['#5a8a6a', '#4a7a5c', '#6a9a78', '#7aa080', '#4e8070'], 0.05), vegB: pal(['#8a6a50', '#9a7a5c', '#7a5c48', '#a88868', '#6e8a48'], 0.05, [3, 3, 2, 1, 1]),
    vegC: pal(['#6a9a40', '#7aa848', '#5a8a3c', '#9ab858', '#c8b860'], 0.05, [3, 3, 2, 2, 1]),
    yard: pal(['#d8ccb4', '#cec0a6', '#e2d6c0', '#c4b4a0', '#b8b098'], 0.04),
    wpath: pal(['#d8c8a8', '#e0d0b4', '#ccbc9c', '#c8c094', '#b8b880'], 0.05, [3, 3, 2, 1, 1]),
  });
  Object.assign(BASE, { road: hex('#d6c0a4'), ballast: hex('#8a8494'), hay: hex('#a8b25c'), pasture: hex('#5e9a4a'), vegA: hex('#5a8a68'), vegB: hex('#86684e'), vegC: hex('#6a9a42'), yard: hex('#d4c6ae'), wpath: hex('#d4c4a4') });
  // the footpaths out of the water garden: through the north gate down to the Epte, through the east gate into the meadow
  const WALKS = [[[4, -27], [2, -36], [0, -44], [-4, -58], [1, -72], [-1, -86]], [[58, 0], [68, 0], [77, -5], [84, -16], [88, -30]]];
  // the kitchen garden and the orchard west of the flowers, the farmyard and the studio behind them, the crossing keeper's house by the road
  const POT = [-98, -66, 66, 96], ORCH = [-98, -66, 96, 116], YARD = [-68, -44, 112, 137];
  const inR = (r, x, z) => x > r[0] && x < r[1] && z > r[2] && z < r[3];
  function zoneG(x, z) {
    const zn = zone(x, z);
    if (zn === 'bed' || zn === 'bank' || zn === 'wil' || zn === 'wid' || zn === 'far') return zn;
    if (z > 36.2 && z < 39.4 && Math.abs(x) < 400) return inCone(x, z, false) ? zn : 'ballast';
    const rz = roadZ(x);
    // (where the bridge easel sees past its left edge, on a wide screen, the road is grassed over)
    if (Math.abs(z - rz) < 1.5 + 0.25 * vnoise(x * 0.3, 1, 512) && Math.abs(x) < 400) return inCone(x, z, false) ? zn : 'road';
    if (zn !== 'lawn') return zn;
    if (pathDist(x, z, WALKS[0]) < 0.8 + 0.3 * vnoise(x * 0.2, z * 0.2, 513) || pathDist(x, z, WALKS[1]) < 0.7 + 0.3 * vnoise(x * 0.2, z * 0.2, 513)) return 'wpath';
    if (inR(POT, x, z)) { const s = Math.floor((x - POT[0]) / 2.3); return Math.abs(z - 80) < 0.8 ? 'wpath' : s % 3 === 0 ? 'vegB' : s % 3 === 1 ? 'vegA' : 'vegC'; }
    if (inR(YARD, x, z)) return 'yard';
    if (Math.hypot(x - 89.5, z - 14.6) < 34) return 'lawn';
    if (z < FENCE_N || (x > FENCE_X && z < 30)) return x > FENCE_X || vnoise(x * 0.025, z * 0.025, 514) > 0.42 ? 'hay' : 'pasture';
    if (x < -66 && z > 70) return 'pasture';
    return zn;
  }
  let _zx = NaN, _zz = NaN, _zr = '';
  function zone(x, z) { if (x === _zx && z === _zz) return _zr; _zx = x; _zz = z; return (_zr = zone0(x, z)); }
  function zone0(x, z) {
    const f = pondF(x, z);
    if (f < 1.0) return 'bed';
    if (f < 1.24) return 'bank';
    if (f < 1.38) return 'path';
    if (Math.hypot(x, z - 30) > 232) return 'far';
    if (z > 42 && z < 114 && Math.abs(x) < 62) return Math.abs(x) < 2.6 || Math.abs(z - 44) < 1.6 || Math.abs(z - 112) < 1.6 ? 'path' : onRed(x, z) ? 'red' : inIris(x, z) ? 'iris' : 'earth';
    if (Math.abs(x) < 1.8 && z > 28 && z <= 42) return 'path';
    // under the willow the ground is dappled: warm where the sun comes through, deep green and violet where it does not
    if (underWillow(x, z)) return vnoise(x * 0.26, z * 0.26, 509) + 0.3 * vnoise(x * 0.9, z * 0.9, 510) > 0.64 + 0.14 * clamp((x - WC[0]) / 8, -1, 1) ? 'wil' : 'wid';
    return 'lawn';
  }
  const wetAt = (x, z) => (ruD(x, z) < 1.2 && pondF(x, z) > 0.98) || (z < -80 && z > -110 && epteK(x) > 0.5 && Math.abs(z - epteZ(x)) < 4.6);
  const ground = {
    col(x, z, rnd) { return P[zoneG(x, z)](rnd); },
    dir(x, z) { const zn = zoneG(x, z); return zn === 'bank' || zn === 'path' ? Math.atan2(z, x * 0.3) + 1.57 : zn === 'earth' || zn === 'red' || zn.charAt(0) === 'v' ? 1.57 : zn === 'road' || zn === 'ballast' ? 0 : 0.3 + 0.6 * Math.sin(x * 0.02 + z * 0.017); },
    // once the first touches are down (late), the water of the Epte and the Ru is no ground either (all but nothing, so that the draws of colour stay as they were)
    mask(x, z) { return pondF(x, z) < 0.97 ? 0 : ground.late && wetAt(x, z) ? 0.001 : 1; },
  };
  // a touch lying flat keeps this much of its size at that distance from the eye: near paint is broken into smaller touches
  const near = (d) => 0.22 + 0.78 * sstep(1.5, 17, d);
  // the place on the water that a point of the picture looks at from an easel (px, py run from 0 to 1 across and down the canvas).
  // Returns x, z, the width of the canvas there in metres, and the distance from the eye
  function seen(W, v, px, py) {
    const cp = Math.cos(v.pitch), f = [Math.sin(v.yaw) * cp, Math.sin(v.pitch), -Math.cos(v.yaw) * cp], r = [Math.cos(v.yaw), 0, Math.sin(v.yaw)], u = v3cross(r, f);
    const tv = 0.86 * Math.tan((v.fov * DEG) / 2), a = (px * 2 - 1) * tv * 1.5, b = (1 - py * 2) * tv;
    const d = [f[0] + a * r[0] + b * u[0], f[1] + b * u[1], f[2] + a * r[2] + b * u[2]];
    const s = (WATER_Y - Math.max(W.h(v.x, v.z), WATER_Y) - v.y) / Math.min(d[1], -0.004);
    return [v.x + d[0] * s, v.z + d[2] * s, 3 * tv * s, s * Math.hypot(d[0], d[1], d[2])];
  }
  // an island of water lilies: small round leaves crowded together, cool ones underneath and sunlit ones on top, with a few flowers.
  // rx along the island, rz across it, turned by ang; n leaves of about size s; fl flowers to a leaf.
  // o: pad, under, bloom (palettes), bs (size of a flower against its leaf), late (the share of flowers that only come with the years).
  // fk: flowers face the eye and shrink less than leaves when they are near, so an island made for an easel gives the factor that evens them out
  function island(W, cx, cz, rx, rz, ang, n, s, fl, o, fk) {
    const S = W.S, rnd = W.rnd, ca = Math.cos(ang), sa = Math.sin(ang), ph = rnd() * TAU;
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, q = Math.sqrt(rnd()) * (0.74 + 0.26 * Math.sin(a * 3 + ph) + (rnd() < 0.1 ? 0.6 * rnd() : 0));
      const lx = Math.cos(a) * q * rx, lz = Math.sin(a) * q * rz, x = cx + lx * ca - lz * sa, z = cz + lx * sa + lz * ca;
      if (W.h(x, z) > WATER_Y - 0.12) continue;
      const low = rnd() < 0.36, k = s * (0.7 + 0.6 * rnd()) * (low ? 1.25 : 1), d = rnd() * TAU;
      // a leaf lies flat on the water and keeps to it. Leaf and flower are leaves to the seasons too, and redden in the autumn of the last years
      S.add(x, WATER_Y + (low ? 0.06 : 0.085) + rnd() * 0.02, z, Math.cos(d), 0, Math.sin(d), 0, 1, 0, k * 1.3, k * (0.78 + 0.2 * rnd()), (low ? o.under : o.pad)(rnd), 0, rnd() < 0.7 ? CELL.DOT : CELL.DAB, 0, FLAG_FLAT | FLAG_LEAF);
      if (rnd() < fl) {
        const b = (o.bs || 0.3) * (fk || 1) * s * (0.75 + 0.6 * rnd());
        S.bill(x + (rnd() - 0.5) * k * 0.5, WATER_Y + 0.1 + b * 0.4, z + (rnd() - 0.5) * k * 0.5, (rnd() - 0.5) * 0.9, b * 1.5, b, o.bloom(rnd), 0, rnd() < 0.5 ? CELL.DAB : CELL.COMMA, 0.15, false, 0, 0.6, 0, FLAG_LEAF | (rnd() < (o.late || 0) ? FLAG_FLOWER : 0));
      }
    }
  }
  // reeds and blades standing in the shallows
  function reeds(W, cx, cz, rx, rz, n, h, col) {
    const S = W.S, rnd = W.rnd;
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, q = Math.sqrt(rnd()), x = cx + Math.cos(a) * q * rx, z = cz + Math.sin(a) * q * rz, y = Math.max(W.h(x, z), WATER_Y);
      const k = h * (0.55 + 0.75 * rnd()) * (1 - 0.4 * q * q), lx = (rnd() - 0.5) * 0.5, lz = (rnd() - 0.5) * 0.5;
      S.add(x + lx * k * 0.4, y + k * 0.48, z + lz * k * 0.4, lx, 1, lz, 1, 0, 0, k * 1.06, 0.07 + rnd() * 0.07, col(rnd), 0.4, rnd() < 0.6 ? CELL.BLADE : CELL.LONG_B, 0, FLAG_AXIAL | FLAG_GRASS);
    }
  }
  // a weeping willow whose curtain is laid in short touches, one under the other, so that it hangs without ruling lines down the canvas.
  // ox, oz: how far it leans out over the water. The trunk slants, and the curtain hangs from where it ends. thin: finer strands of that width, and no body of green behind them
  function weeping(W, x, z, h, r, leaf, bark, ox, oz, thin) {
    const y = W.h(x, z), rnd = W.rnd, S = W.S, cx = x + (ox || 0), cz = z + (oz || 0);
    trunk(W, x, y, z, h * 0.62, 0.4, bark, ox || oz ? [ox * 0.9, oz * 0.9] : [(rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.6], 5);
    twigs(W, cx, y + h * 0.55, cz, 9, h * 0.4, bark);
    blobSolid(W, cx, y + h * 0.72, cz, r * 0.5, h * 0.2, r * 0.5, [0.2, 0.3, 0.17], 1);
    // the body of green inside the curtain. The water takes its colour from it
    if (!thin) blobSolid(W, cx, y + h * 0.58, cz, r * 0.72, h * 0.28, r * 0.72, [0.31, 0.45, 0.2], 1);
    const n = Math.round(r * r * (thin ? 6.5 : 4.8)), wk = thin || 1, cells = [CELL.LONG_B, CELL.BLADE, CELL.COMMA, CELL.LONG_A, CELL.COMMA_S];
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, q = Math.sqrt(rnd()), px = cx + Math.cos(a) * r * q, pz = cz + Math.sin(a) * r * q;
      const top = y + h * 0.66 + (1 - q * q) * h * 0.34, floor = Math.max(W.h(px, pz), WATER_Y) + 0.25;
      const L = Math.max(1.2, (top - floor) * (0.35 + 0.65 * rnd()) * (0.4 + 0.6 * q));
      let yy = top, dx = 0, dz = 0;
      while (yy > top - L + 0.4) {
        const seg = Math.min(1.3 + rnd() * 1.7, yy - (top - L) + 0.3), sx = (rnd() - 0.5) * 0.34, sz = (rnd() - 0.5) * 0.34;
        S.add(px + dx + sx * seg * 0.5, yy - seg * 0.5, pz + dz + sz * seg * 0.5, sx, -1, sz, Math.cos(a), 0.3, Math.sin(a), seg * 1.12, (0.2 + rnd() * 0.2) * wk, leaf(rnd, q, (top - yy) / L), 0.5, cells[(rnd() * cells.length) | 0], 0, FLAG_AXIAL | FLAG_LEAF);
        dx += sx * seg; dz += sz * seg; yy -= seg * 0.94;
      }
    }
    W.caster({ k: 'ball', x: cx, z: cz, y: h * 0.55, r: r * 0.92, v: 0.72 });
    W.collide(x, z, 0.8);
  }
  // a tree of the flower garden as he painted them over the irises: a thin dark trunk and a low crown of hanging touches.
  // The touches face the easel at (ex, ez), so that seen from there against the light they keep their dark. dens: touches to a square metre of crown, big: their size
  function gardenTree(W, x, z, r, h, col, bark, ex, ez, dens, big) {
    const y = W.h(x, z), rnd = W.rnd, S = W.S, el = Math.hypot(ex - x, ez - z) || 1, tx = ((ex - x) / el) * 0.8, tz = ((ez - z) / el) * 0.8;
    trunk(W, x, y, z, h + r * 0.3, 0.085, bark, [(rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.7], Math.round(h / 1.1));
    twigs(W, x, y + h, z, 7, r * 1.1, bark);
    blobSolid(W, x, y + h + r * 0.45, z, r * 0.62, r * 0.3, r * 0.62, [0.2, 0.17, 0.14], 1);
    const n = Math.round(r * r * dens);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, q = Math.sqrt(rnd()), u = rnd(), s = (0.22 + rnd() * 0.18) * big;
      S.bill(x + Math.cos(a) * q * r, y + h + r * (0.1 + 0.75 * u * (1 - 0.6 * q * q)) - 0.35 * r * q * (1 - u), z + Math.sin(a) * q * r, 1.57 + (rnd() - 0.5) * 0.8, s * 2.7, s, col(rnd, u), 0.3,
        [CELL.COMMA, CELL.DAB, CELL.COMMA_S, CELL.LONG_A][(rnd() * 4) | 0], 0, false, tx, 0.6, tz, FLAG_LEAF);
    }
    W.caster({ k: 'ball', x, z, y: h + r * 0.4, r: r * 0.9, v: 0.7 }); W.caster({ k: 'pole', x, z, h, r: 0.12, v: 0.7 });
    W.collide(x, z, 0.35);
  }
  function footbridge(W) {
    const S = W.S, rnd = W.rnd, n = 18;
    // in 1899 the rails were a pale blue green, grey lilac in their shadows
    const paint = pal(['#8fb8a2', '#a2c8b2', '#7aa892', '#b6d2c2', '#8aa4ae', '#6c9884'], 0.04), baseC = hex('#7ea892');
    const vine = (r) => jit(mixc(hex('#3f7a40'), hex('#8ab858'), r()), 0.04, r);
    for (let i = 0; i < n; i++) {
      const z0 = lerp(ZA, ZB, i / n), z1 = lerp(ZA, ZB, (i + 1) / n), y0 = deckY(z0), y1 = deckY(z1), L = Math.hypot(z1 - z0, y1 - y0);
      const a = [BX - HW, y0, z0], b = [BX + HW, y0, z0], c = [BX + HW, y1, z1], d = [BX - HW, y1, z1];
      // the bridge is a leaf to the seasons as well: in the autumn of the last years it reddens and half of it is gone, as he painted it then
      const q0 = S.n;
      W.leafy = 1; W.quad(a, b, c, d, baseC); W.leafy = 0;
      paintQuad(W, a, d, c, b, { step: 0.45, len: 1.15, wid: 0.3, along: 'v', col: paint, lift: 0.04 });
      for (let k = q0; k < S.n; k++) S.sca[k * 4 + 2] += 16 * FLAG_LEAF;
      for (const sx of [-1, 1]) {
        const px = BX + sx * HW, k0 = S.n;
        S.add(px, (y0 + y1) / 2 - 0.12, (z0 + z1) / 2, 0, y1 - y0, z1 - z0, sx, 0, 0, L * 1.16, 0.38, paint(rnd), 0, CELL.HEAVY, 0, FLAG_LEAF);
        S.add(px, y0 + 0.56, z0, 0, 1, 0, sx, 0, 0, 1.16, 0.15, paint(rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL | FLAG_LEAF);
        S.add(px, (y0 + y1) / 2 + 1.08, (z0 + z1) / 2, 0, y1 - y0, z1 - z0, sx, 0, 0, L * 1.14, 0.21, paint(rnd), 0, CELL.LONG_A, 0, FLAG_LEAF);
        S.add(px, (y0 + y1) / 2 + 0.56, (z0 + z1) / 2, 0, y1 - y0, z1 - z0, sx, 0, 0, L * 1.12, 0.13, paint(rnd), 0, CELL.LONG_A, 0, FLAG_LEAF);
        S.mark(k0);
        // the trellis above, and the wisteria that came to hang from it. Neither was there in 1899: they carry the flower flag, and come with the years
        const ty = (y0 + y1) / 2 + 3.0 + 0.5 * Math.sin((Math.PI * (i + 0.5)) / n);
        S.add(px, ty, (z0 + z1) / 2, 0, (y1 - y0) * 0.6, z1 - z0, sx, 0, 0, L * 1.1, 0.07, paint(rnd), 0, CELL.LONG_B, 0, FLAG_FLOWER);
        if (i % 3 === 0) S.add(px, (y0 + 1.1 + ty) / 2, z0, 0, 1, 0, sx, 0, 0, ty - y0 - 1.0, 0.06, paint(rnd), 0, CELL.LONG_B, 0, FLAG_AXIAL | FLAG_FLOWER);
        for (let k = 0; k < 7; k++) {
          const u = rnd(), c2 = rnd() < 0.8 ? jit(mixc(hex('#a48ad8'), hex('#d8c4ee'), rnd()), 0.04, rnd) : jit(hex('#ece4f6'), 0.02, rnd);
          S.bill(px + (rnd() - 0.5) * 0.5, ty - 0.15 - rnd() * 0.8, lerp(z0, z1, u), (rnd() - 0.5) * 0.7 + 1.57, 0.21, 0.1, c2, 0.3, rnd() < 0.5 ? CELL.DAB : CELL.COMMA, 0.05, false, 0, 0.6, 0, FLAG_FLOWER);
          if (k < 3) S.bill(px + (rnd() - 0.5) * 0.6, ty + (rnd() - 0.5) * 0.4, lerp(z0, z1, rnd()), rnd() * 3, 0.38, 0.2, vine(rnd), 0.3, CELL.COMMA, 0, false, 0, 0.6, 0, FLAG_LEAF | FLAG_FLOWER);
          // its leaves trail down to the rail, and in the last years they bury the bridge
          S.bill(px + (rnd() - 0.5) * 0.8, ty + 0.3 - rnd() * 2.7, lerp(z0, z1, rnd()), 1.57 + (rnd() - 0.5) * 1.4, 0.6, 0.28, vine(rnd), 0.3, rnd() < 0.5 ? CELL.COMMA : CELL.ARC, 0, false, 0, 0.6, 0, FLAG_LEAF | FLAG_FLOWER);
        }
      }
    }
    W.caster({ k: 'box', pts: [[BX - HW, ZA], [BX + HW, ZA], [BX + HW, ZB], [BX - HW, ZB]], h: 2.4, v: 0.55 });
  }
  // the weeping willow he painted in the last year of the war: a twisting red brown trunk a little left of the middle, forked high into boughs that sweep to the right,
  // and curtains of fronds over everything, yellow green where the sun comes through from the right and blue violet in the shade to the left.
  // Laid out from the hidden easel: d is the depth ahead of the eye, s the offset to the right, h the height above the ground
  function mourning(W) {
    const S = W.S, rnd = W.rnd, v = WV, tv = 0.86 * Math.tan((v.fov * DEG) / 2), yE = W.h(v.x, v.z) + v.y;
    // the sun at the moment of the picture, late in a day of 1917: from the south west, half way up the sky
    const sa = 242 * DEG, se = 48 * DEG, sun = [Math.sin(sa) * Math.cos(se), Math.sin(se), -Math.cos(sa) * Math.cos(se)];
    const P3 = (d, s, h) => { const p = at(d, s); return [p[0], W.h(p[0], p[1]) + h, p[1]]; };
    const pxOf = (d, s) => 0.5 + s / (3 * tv * Math.max(d, 0.5));
    const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    // a normal that faces the eye and turns towards the sun by w, or away from it when w is negative
    const facing = (p, w) => { const c = norm([v.x - p[0], yE - p[1], v.z - p[2]]); return norm([c[0] + sun[0] * w, c[1] * 0.3 + sun[1] * w, c[2] + sun[2] * w]); };
    // the trunk and the boughs: each a line of points (d, s, h) and its width at the start and at the end
    const barkS = pal(['#5a3448', '#4a3456', '#6a3a44', '#3e3058', '#583050'], 0.05), barkM = pal(['#9a4634', '#aa5238', '#8a4038', '#b8664a', '#7a3e40'], 0.05);
    const barkL = pal(['#c0664a', '#d07a58', '#b85c40', '#d89078', '#c87050'], 0.05), moss = pal(['#4a6a5a', '#3a5a6c', '#5a7a4a'], 0.05);
    const limbs = [
      { w: [1.05, 0.6], pts: [[10, -0.7, -0.2], [10.1, -0.45, 1.4], [9.9, -0.5, 2.7], [9.8, -0.62, 3.7], [9.9, -0.9, 4.4], [10, -1.1, 5.0], [10.1, -1.0, 5.5]] },
      { w: [0.4, 0.14], pts: [[10.1, -1.0, 5.4], [10.2, -1.5, 6.3], [10.3, -1.9, 7.4], [10.4, -2.4, 8.4]] },
      { w: [0.46, 0.12], pts: [[10.1, -1.0, 5.2], [10.3, 0.2, 5.7], [10.6, 1.6, 5.95], [11, 2.9, 5.85], [11.3, 3.9, 5.45], [11.5, 4.5, 4.9], [11.6, 4.8, 4.0], [11.7, 4.9, 3.2]] },
      { w: [0.3, 0.09], pts: [[9.9, -0.75, 4.4], [10, 0.3, 4.75], [10.2, 1.3, 4.95], [10.4, 2.1, 4.75], [10.5, 2.6, 4.35]] },
      { w: [0.26, 0.08], pts: [[10.1, -0.9, 5.6], [10.3, -0.2, 6.5], [10.5, 0.6, 7.4], [10.7, 1.2, 8.4]] },
    ];
    limbs.forEach((L, li) => {
      const P = L.pts.map((q) => P3(q[0], q[1], q[2]));
      let tot = 0; for (let i = 1; i < P.length; i++) tot += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]);
      let run = 0;
      for (let i = 1; i < P.length; i++) {
        const a = P[i - 1], b = P[i], sl = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), dir = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
        const wa = lerp(L.w[0], L.w[1], run / tot), wb = lerp(L.w[0], L.w[1], (run + sl) / tot);
        // the underpainting, so that nothing shows through the bark
        const qa = [a[0] + WF[0] * 0.12, a[1], a[2] + WF[1] * 0.12], qb = [b[0] + WF[0] * 0.12, b[1], b[2] + WF[1] * 0.12], bc = li ? [0.3, 0.17, 0.2] : [0.4, 0.21, 0.19];
        const A = [qa[0] - WR[0] * wa * 0.42, qa[1], qa[2] - WR[1] * wa * 0.42], B = [qa[0] + WR[0] * wa * 0.42, qa[1], qa[2] + WR[1] * wa * 0.42];
        const C = [qb[0] + WR[0] * wb * 0.42, qb[1], qb[2] + WR[1] * wb * 0.42], D = [qb[0] - WR[0] * wb * 0.42, qb[1], qb[2] - WR[1] * wb * 0.42];
        W.quad(A, B, C, D, bc); W.quad(D, C, B, A, bc);
        for (let t = 0; t < sl; t += 0.28) {
          const u = t / sl, w = lerp(wa, wb, u), ns = Math.max(2, Math.round(w / 0.085));
          for (let j = 0; j < ns; j++) {
            const o = (j + 0.5) / ns - 0.5 + (rnd() - 0.5) * 0.12, th = o * 2.6, ct = Math.cos(th), st = Math.sin(th);
            const n = [-WF[0] * ct + WR[0] * st, 0.12, -WF[1] * ct + WR[1] * st];
            const x = lerp(a[0], b[0], u) + WR[0] * o * w - WF[0] * w * 0.3 * ct, y = lerp(a[1], b[1], u), z = lerp(a[2], b[2], u) + WR[1] * o * w - WF[1] * w * 0.3 * ct;
            const tw = (rnd() - 0.5) * 0.5, dx = dir[0] + WR[0] * tw, dz = dir[2] + WR[1] * tw;
            const r0 = rnd(), col = r0 < 0.07 ? moss : o < -0.18 || (li && r0 < 0.5) ? barkS : o > 0.2 && !li ? barkL : barkM;
            S.add(x, y, z, dx, dir[1], dz, n[0], n[1], n[2], (0.38 + rnd() * 0.36) * clamp(w * 2.2, 0.55, 1), 0.09 + rnd() * 0.07, col(rnd), li ? 0.15 : 0, [CELL.HEAVY, CELL.LONG_A, CELL.COMMA, CELL.LONG_B][(rnd() * 4) | 0], 0, 0);
          }
        }
        run += sl;
      }
    });
    const foot = P3(10, -0.7, 0);
    W.caster({ k: 'pole', x: foot[0], z: foot[2], h: 5.4, r: 0.33, v: 0.8 });
    W.collide(foot[0], foot[2], 0.5);
    // behind the curtain a body of deep green, so that no sky comes through it
    const backL = P3(14.5, -3.5, 0), backR = P3(14.5, 3.5, 0);
    blobSolid(W, backL[0], backL[1] + 3.6, backL[2], 3.8, 3.8, 1.2, [0.16, 0.24, 0.24], 1);
    blobSolid(W, backR[0], backR[1] + 3.6, backR[2], 3.8, 3.8, 1.2, [0.36, 0.4, 0.18], 1);
    // the fronds: strands that fall from the crown and wander as they fall, with short touches across them
    const lit = pal(['#a8c040', '#98b83c', '#bcc84c', '#84ac40', '#d0d468', '#6e9c3c', '#b4b048', '#5a9448', '#c8c860', '#4a8a7a'], 0.05, [3, 3, 3, 2, 1, 2, 1, 1, 1, 1]);
    const mid = pal(['#4e8250', '#3e7266', '#628a40', '#3a6a72', '#6e9a4a', '#4e7a80'], 0.05);
    const shd = pal(['#46608a', '#4e6a90', '#62609e', '#3e6a60', '#4a7a76', '#5a8a86', '#3a4c78', '#5a7e58', '#3c5478', '#8aa8b8'], 0.05, [3, 2, 2, 3, 3, 2, 2, 2, 2, 1]);
    const warm = pal(['#e0c050', '#e8d068', '#d0b040', '#d8d060', '#ecd878'], 0.05);
    const cells = [CELL.LONG_A, CELL.LONG_B, CELL.ARC, CELL.COMMA_S, CELL.HEAVY, CELL.ARC, CELL.COMMA];
    // where the trunk stands in the picture, from its height: the curtain before it is thin, so that it stands clear
    const T0 = limbs[0].pts, trunkU = (h) => { let i = 1; while (i < T0.length - 1 && T0[i][2] < h) i++; const a = T0[i - 1], b = T0[i]; return pxOf(10, lerp(a[1], b[1], clamp((h - a[2]) / (b[2] - a[2]), 0, 1))); };
    for (let i = 0; i < 1350; i++) {
      let d, s;
      // the last two hundred fill the back of the curtain, so that the far ground does not show through
      if (i >= 1150) { d = 12 + 5 * rnd(); s = (rnd() * 2 - 1) * 1.5 * tv * d; } else if (rnd() < 0.74) { d = 4 + 13.5 * Math.pow(rnd(), 0.8); s = (rnd() * 2 - 1) * 1.2 * 1.5 * tv * d; }
      else { const a = rnd() * TAU, q = Math.sqrt(rnd()); d = 8.5 + Math.cos(a) * q * 9.5; s = 1.5 + Math.sin(a) * q * 13; }
      const q = Math.hypot((d - 8.5) / 9.5, (s - 1.5) / 13), u = d > 0.5 ? pxOf(d, s) : 0.5 + Math.sign(s);
      if (q > 1.05 || Math.hypot(d, s) < 4.2) continue;
      const p0 = at(d, s), g = Math.max(W.h(p0[0], p0[1]), WATER_Y);
      let top = g + 10.4 - 4.4 * q * q + (rnd() - 0.5) * 0.8;
      // before the boughs the curtain starts lower, so that they show through at the top of the picture
      if (d < 9.8 && u > 0.33 && u < 0.88) top = Math.min(top, g + 3.5 + rnd() * 1.1);
      // the hem of the curtain runs level across the picture, a little above its foot: the near strands end higher
      const end = rnd() < 0.88 ? g + Math.max(0.08, 1.6 - 0.11 * d) + (rnd() - 0.5) * 0.45 : lerp(g + 1, top - 1.5, rnd());
      const k = clamp(d / 10, 0.5, 1.5) / 1.3, sunny = rnd() < 0.8 * sstep(0.3, 0.66, u + (rnd() - 0.5) * 0.12);
      const col = sunny ? lit : rnd() < 0.3 + 0.6 * sstep(0.4, 0.7, u) ? mid : shd, wN = sunny ? 0.9 + 0.6 * rnd() : u > 0.5 ? 0.3 * rnd() : 0.35 - 1.1 * rnd();
      let y = top, ox = 0, oz = 0, ang = (rnd() - 0.5) * 0.5;
      while (y > end) {
        const seg = Math.min((0.7 + rnd() * 0.5) * k, y - end + 0.2);
        ang = clamp(ang * 0.75 + (rnd() - 0.5) * 0.6, -0.45, 0.45);
        const fw = (rnd() - 0.5) * 0.3, dl = [WR[0] * Math.sin(ang) + WF[0] * fw, -Math.cos(ang), WR[1] * Math.sin(ang) + WF[1] * fw];
        const cx = p0[0] + ox + dl[0] * seg * 0.5, cy = y + dl[1] * seg * 0.5, cz = p0[1] + oz + dl[2] * seg * 0.5, n = facing([cx, cy, cz], wN);
        const dd = (cx - v.x) * WF[0] + (cz - v.z) * WF[1], ss = (cx - v.x) * WR[0] + (cz - v.z) * WR[1], hT = ((cy - yE) * 10) / Math.max(dd, 0.5) + v.y;
        const clear = dd < 9.75 && hT < 5.7 && Math.abs(pxOf(dd, ss) - trunkU(hT)) < 0.05 && rnd() < 0.85;
        if (!clear) {
          S.add(cx, cy, cz, dl[0], dl[1], dl[2], n[0], n[1], n[2], seg * 1.35, (0.17 + rnd() * 0.12) * k, (sunny && u > 0.58 && cy - g < 3.2 && rnd() < 0.55 ? warm : col)(rnd), 0.45, cells[(rnd() * cells.length) | 0], 0, FLAG_LEAF);
          if (rnd() < 0.22) {
            const a2 = ang + (rnd() - 0.5) * 1.6;
            S.add(cx + (rnd() - 0.5) * 0.3 * k * WR[0], cy + (rnd() - 0.5) * 0.3, cz + (rnd() - 0.5) * 0.3 * k * WR[1], WR[0] * Math.sin(a2), -Math.cos(a2), WR[1] * Math.sin(a2), n[0], n[1], n[2], (0.36 + rnd() * 0.24) * k, (0.14 + rnd() * 0.08) * k, col(rnd), 0.45, rnd() < 0.5 ? CELL.DAB : CELL.COMMA_S, 0, FLAG_LEAF);
          }
        }
        ox += dl[0] * seg; oz += dl[2] * seg; y += dl[1] * seg * 0.95;
      }
    }
    // the pale flowers at its foot and in the shade to the left
    const pale = pal(['#dce6ee', '#b8c8dc', '#eef0f0', '#9ab4c8', '#7a9ab8', '#c8d0e8'], 0.04);
    for (const c of [[10, 0.7, 0.35, 0.5, 26], [7.5, -2.9, 0.6, 0.9, 30], [8, -3.6, 0.3, 0.6, 16]]) {
      for (let i = 0; i < c[4]; i++) {
        const p = P3(c[0] + (rnd() - 0.5) * 0.8, c[1] + (rnd() - 0.5) * c[3] * 1.6, c[2] * (0.4 + rnd()));
        S.bill(p[0], p[1], p[2], rnd() * 3, 0.24, 0.17, pale(rnd), 0.2, rnd() < 0.5 ? CELL.DAB : CELL.COMMA, 0.05, false, 0, 0, 0, 0);
      }
    }
    // the dappled ground in fine touches, laid a little above the coarser ones of the meadow so that they cover them. Finest where the picture looks
    const nn = [0, 1, 0];
    for (let z = WC[1] - 15; z < WC[1] + 15; z += 0.3) for (let x = WC[0] - 15; x < WC[0] + 15; x += 0.3) {
      const gx = x + rnd() * 0.3, gz = z + rnd() * 0.3, d = (gx - v.x) * WF[0] + (gz - v.z) * WF[1], s = (gx - v.x) * WR[0] + (gz - v.z) * WR[1];
      const seen = d > 3 && d < 17 && Math.abs(s) < 0.62 * d + 1, r0 = rnd();
      if (!underWillow(gx, gz) || (!seen && r0 > 0.3)) continue;
      const sz = seen ? clamp(d / 10, 0.5, 1.3) : 1.8, a = Math.atan2(WR[1], WR[0]) + (vnoise(gx * 0.3, gz * 0.3, 511) - 0.5) * 1.2 + (rnd() - 0.5) * 0.8;
      W.normalAt(gx, gz, nn);
      const dx = Math.cos(a), dz = Math.sin(a), dy = -(dx * nn[0] + dz * nn[2]) / nn[1];
      S.add(gx, W.h(gx, gz) + 0.4, gz, dx, dy, dz, nn[0], nn[1], nn[2], 0.7 * sz * (0.7 + rnd() * 0.6), 0.26 * sz * (0.7 + rnd() * 0.6), P[zone(gx, gz)](rnd), 0,
        [CELL.DAB, CELL.HEAVY, CELL.COMMA, CELL.COMMA_S, CELL.BLOCK][(rnd() * 5) | 0], 0, FLAG_GROUND);
    }
  }
  // ================= the place: what lies round the gardens, painted after everything that the easels see =================
  // the eye of each easel that looks out over the land, and the bearings (degrees, atan2 of dz and dx) its canvas spans with a margin.
  // Nothing that stands up is put inside them. The iris walk looks over the house: low things behind the house stay hidden by it
  // (on a phone held long, up to 2.2 times as wide as high)
  const CONES = [[-31.7, 51.5, -2, 100], [88, 6, 38, 122], [-9.2, 0.9, 137, 223]];
  function inCone(x, z, tall) {
    for (const c of CONES) {
      let b = Math.atan2(z - c[1], x - c[0]) / DEG; if (b < 0) b += 360;
      if (b > c[2] && b < c[3]) {
        if (c[0] === -31.7 && !tall && b > 54 && b < 80 && z > 131) continue;
        // the bridge easel sees the ground beyond the pond only past the left foot of the bridge
        if (c[0] === -9.2 && !tall && b > 153) continue;
        return true;
      }
    }
    return false;
  }
  // the easels that look down on the water see in it what stands beyond the far bank: the eye, its height over the water, the slope of the top of its picture,
  // and its bearings. How tall a thing may stand at (x, z) and stay out of their mirrors
  const MIRRORS = [[12, 23.4, 3.3, 0.064, -128, -38], [50.4, 0, 4.2, 0.069, 135, 225]];
  function tallest(x, z) {
    let hm = 1e9;
    for (const m of MIRRORS) {
      let b = Math.atan2(z - m[1], x - m[0]) / DEG; if (m[4] > 0 && b < 0) b += 360;
      if (b > m[4] && b < m[5]) hm = Math.min(hm, 0.85 * m[3] * Math.hypot(x - m[0], z - m[1]) - m[2]);
    }
    return hm;
  }
  const lowLift = (x, z) => { for (const d of [[4, 4, 60], [-46, 4, 40], [40, 26, 34], [-24, 70, 46], [16, 84, 46], [0, 40, 24]]) if ((x - d[0]) ** 2 + (z - d[1]) ** 2 < d[2] * d[2]) return 0.1; return 0.4; };
  // a stroke lying on the ground along (dx, dz), above the touches of the ground there
  function lay(W, x, z, a, len, wid, col, cell, flags, extra) {
    const S = W.S, dx = Math.cos(a), dz = Math.sin(a);
    W.normalAt(x, z, _N);
    const dy = -(dx * _N[0] + dz * _N[2]) / _N[1];
    S.add(x, W.h(x, z) + lowLift(x, z) + (extra || 0), z, dx, dy, dz, _N[0], _N[1], _N[2], len, wid, col, 0, cell, 0, flags === undefined ? FLAG_GROUND : flags);
  }
  // a clipped hedge along a line: a dark body and leaves over it
  function hedge(W, pts, h, th, leaf, core) {
    const S = W.S, rnd = W.rnd;
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      for (let t = 1; t < L; t += 2.2) { const x = a[0] + ux * t, z = a[1] + uz * t; blobSolid(W, x, W.h(x, z) + h * 0.45, z, 1.5, h * 0.45, 1.5 * Math.abs(uz) + th * 0.45, core, 1); }
      for (let i = 0, n = Math.round(L * 15); i < n; i++) {
        const t = rnd() * L, o = (rnd() - 0.5) * th, x = a[0] + ux * t - uz * o, z = a[1] + uz * t + ux * o, u = Math.pow(rnd(), 0.7), s = 0.24 + rnd() * 0.18;
        S.bill(x, W.h(x, z) + h * u, z, (rnd() - 0.5) * 0.9, s * 1.8, s, leaf(rnd, u), 0.15, rnd() < 0.5 ? CELL.DAB : CELL.COMMA, 0, false, -uz * o, u, ux * o, FLAG_LEAF);
      }
      W.caster({ k: 'box', pts: [[a[0] - uz * th, a[1] + ux * th], [b[0] - uz * th, b[1] + ux * th], [b[0] + uz * th, b[1] - ux * th], [a[0] + uz * th, a[1] - ux * th]], h, v: 0.6 });
    }
  }
  // a cottage of the Vexin: rough cast walls, a tiled or slated roof, shutters, a chimney
  const WALLS = [pal(['#e8d8bc', '#f0e2c8', '#dccaa8', '#e4d0c0'], 0.04), pal(['#e6c8b0', '#f0d4c0', '#dab8a0', '#eccab8'], 0.04), pal(['#d8d0c0', '#e4dccc', '#cac2b2', '#d4c8c0'], 0.04)];
  const WBASE = [hex('#e4d4b8'), hex('#e6c6ae'), hex('#d6cec0')];
  const ROOFS = [pal(['#a8584a', '#b8664e', '#985046', '#c07a5e', '#8e4a48'], 0.04), pal(['#7a7c8c', '#8a8a98', '#6c7080', '#8e8496'], 0.04), pal(['#9a6a52', '#a8785a', '#8a5e50'], 0.04)];
  const RBASE = [hex('#a45a4a'), hex('#7a7c8c'), hex('#966654')];
  const SHUT = [pal(['#3f7a5c', '#4a8a68'], 0.03), pal(['#6a86a0', '#7a96ae'], 0.03), pal(['#8a7058', '#9a7c60'], 0.03), pal(['#c8c0a8', '#d8d0b8'], 0.03)];
  function cottage(W, x, z, yaw, w, d, h, kind, far) {
    const rnd = W.rnd, wk = kind % 3, rk = (kind >> 2) % 3, st = far ? 0.75 : 0.5, n = Math.max(1, Math.round(w / 2.6));
    const wins = [];
    for (let i = 0; i < n; i++) { wins.push({ side: 1, u: (i + 0.5) / n, v: 0.55, w: 0.8, h: 1.1 }); if (h > 5) wins.push({ side: 1, u: (i + 0.5) / n, v: 0.22, w: 0.8, h: 1.0 }); wins.push({ side: -1, u: (i + 0.5) / n, v: 0.55, w: 0.8, h: 1.1 }); }
    if (n > 1) wins[0] = { side: 1, u: 0.5 / n, door: true, w: 1.0, h: 2.0 };
    house(W, { x, z, w, d, h, rh: d * 0.55 + 0.6, yaw, wall: WALLS[wk], wallBase: WBASE[wk], roof: ROOFS[rk], roofBase: RBASE[rk], windows: wins, win: pal(['#4a4e5e', '#5a5e6e', '#c8ccd0'], 0.03), shut: SHUT[(kind >> 1) & 3], door: pal(['#5a4a40', '#3f5a4c'], 0.03), step: st, len: far ? 1.6 : 1.2, wid: far ? 0.55 : 0.42 });
    // a chimney at one gable
    const c = rotXZ(x, z, w * 0.36 * (rnd() < 0.5 ? -1 : 1), 0, yaw), y0 = W.h(x, z) + h + d * 0.55;
    box(W, { x: c[0], z: c[1], w: 0.7, d: 0.7, y0: y0 - 0.6, h: 1.6, yaw, wall: pal(['#b07060', '#c08070', '#9a6458'], 0.04), base: hex('#a86a5c'), step: 0.35, len: 0.5, wid: 0.3 });
  }
  // the garden of the house is closed to the road by a low wall with green railings
  function railing(W, x0, x1, z) {
    const S = W.S, rnd = W.rnd, green = pal(['#3f7a5c', '#4a8a68', '#346a50', '#5a9474'], 0.03);
    box(W, { x: (x0 + x1) / 2, z, w: x1 - x0, d: 0.42, y0: W.h((x0 + x1) / 2, z) - 0.2, h: 0.85, wall: pal(['#e0c8b8', '#ead6c6', '#d4b8a8', '#c8b0a4'], 0.04), base: hex('#dcc4b4'), step: 0.42, len: 0.9, wid: 0.34, wobble: 0.004 });
    for (let x = x0 + 0.15; x < x1; x += 0.32) S.add(x, W.h(x, z) + 1.12, z, 0, 1, 0, 0, 0, 1, 0.95, 0.06, green(rnd), 0, CELL.LONG_B, 0, FLAG_AXIAL);
    for (let x = x0; x < x1; x += 1.6) S.add(x + 0.8, W.h(x, z) + 1.58, z, 1, 0, 0, 0, 0.3, 1, 1.75, 0.08, green(rnd), 0, CELL.LONG_B, 0, 0);
    W.collide((x0 + x1) / 2, z, 0.1);
  }
  function pillar(W, x, z, h) { box(W, { x, z, w: 0.62, d: 0.62, y0: W.h(x, z) - 0.2, h, wall: pal(['#e0c8b8', '#ead6c6', '#d4b8a8'], 0.04), base: hex('#dcc4b4'), step: 0.3, len: 0.6, wid: 0.3 }); W.collide(x, z, 0.4); }
  // ruts and the crown of grass between them, sleepers and rails, the white gates of the crossing
  function roadAndRail(W) {
    const S = W.S, rnd = W.rnd, rut = pal(['#b49a84', '#a88e7c', '#c0a890', '#9a8478', '#b8a49c'], 0.05), mid = pal(['#8aa858', '#9ab460', '#7a9a50', '#b4b870'], 0.05);
    const verge = pal(['#6e9c48', '#84aa52', '#5e8c44', '#a4b45e'], 0.05), dust = P.road;
    for (let x = -230; x < 230; x += 0.7) {
      const px = x + rnd() * 0.7, rz = roadZ(px), a = Math.atan2(roadZ(px + 1) - rz, 1);
      if (inCone(px, rz, false)) continue;
      lay(W, px, rz - 0.72 + (rnd() - 0.5) * 0.24, a + (rnd() - 0.5) * 0.15, 1.0 + rnd() * 0.5, 0.3, rut(rnd), CELL.LONG_A);
      lay(W, px, rz + 0.72 + (rnd() - 0.5) * 0.24, a + (rnd() - 0.5) * 0.15, 1.0 + rnd() * 0.5, 0.3, rut(rnd), CELL.LONG_A);
      if (rnd() < 0.6) lay(W, px, rz + (rnd() - 0.5) * 0.3, a + (rnd() - 0.5) * 0.6, 0.6 + rnd() * 0.4, 0.22, (Math.abs(px) < 4 ? dust : mid)(rnd), CELL.COMMA, FLAG_GROUND);
      if (rnd() < 0.5) lay(W, px, rz + (rnd() < 0.5 ? -1 : 1) * (1.15 + rnd() * 0.3), a + (rnd() - 0.5) * 0.4, 0.7 + rnd() * 0.5, 0.36, dust(rnd), CELL.DAB);
    }
    // grass and flowers on the verges
    paintCrop(W, { x0: -230, x1: 230, z0: 35.4, z1: 46.5, step: 0.9, h: 0.45, w: 0.08, cluster: 3, spread: 0.25, lean: 0.4,
      mask: (x, z) => { const d = Math.abs(z - roadZ(x)); return (d > 1.75 && d < 2.6 && z > 39.3) || (z > 35.9 && z < 36.4) ? 0.7 : 0; }, col: (x, z, r) => verge(r) });
    const sleeper = pal(['#6a5446', '#5a4a40', '#7a6252', '#4e4038'], 0.05), steel = pal(['#7a7a88', '#8c8a98', '#a8a4b0', '#62626e'], 0.03);
    for (let x = -260; x < 260; x += 0.72) {
      if (Math.abs(x) < 2.6) continue;
      lay(W, x, RAIL_Z, 1.5708 + (rnd() - 0.5) * 0.04, 2.5, 0.26, sleeper(rnd), CELL.BLOCK, FLAG_GROUND, 0.06);
    }
    for (const side of [-1, 1]) for (let x = -260; x < 260; x += 2.0) {
      const z = RAIL_Z + side * 0.72, y = W.h(x, z) + lowLift(x, z) + 0.2;
      S.add(x + 1, y, z, 1, 0, 0, 0, 1, side * 0.6, 2.3, 0.1, steel(rnd), 0, CELL.LONG_B, 0, 0);
    }
    // the crossing: planks between the rails, and the gates folded back against the posts
    const white = pal(['#f2eee4', '#e8e4dc', '#fbf8f0'], 0.02), red = pal(['#c04838', '#b03c34'], 0.03);
    for (let x = -2.4; x < 2.4; x += 0.35) lay(W, x, RAIL_Z, 1.5708, 2.7, 0.3, pal(['#8a7462', '#9a8472'], 0.04)(rnd), CELL.BLOCK, FLAG_GROUND, 0.1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = sx * 2.5, pz = RAIL_Z + sz * 2.15, y = W.h(px, pz);
      S.add(px, y + 0.65, pz, 0, 1, 0, 1, 0, 0, 1.35, 0.16, white(rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL);
      for (let k = 0; k < 4; k++) S.add(px + sx * (0.45 + k * 0.5), y + 0.95, pz, 1, 0, 0, 0, 0, 1, 0.55, 0.11, (k % 2 ? red : white)(rnd), 0, CELL.LONG_B, 0, 0);
      S.add(px + sx * 1.1, y + 0.55, pz, sx, 0.7, 0, 0, 0, 1, 1.2, 0.06, white(rnd), 0, CELL.LONG_B, 0, 0);
      W.collide(px, pz, 0.2);
    }
  }
  // the Ru: a brook of moving water strokes, reeds on its banks, the sluice where it falls into the pond and a plank bridge where the path crosses it
  function brook(W) {
    const S = W.S, rnd = W.rnd, wc = pal(['#6a8a98', '#7a9aa4', '#5a7a8c', '#8aa8b0', '#9ab4b8', '#4e6e7c'], 0.05);
    for (let i = 0; i < RU.length - 1; i++) {
      const a = RU[i], b = RU[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      for (let t = 0; t < L; t += 0.3) for (let k = 0; k < 3; k++) {
        const o = (rnd() - 0.5) * 2.1, x = a[0] + Math.cos(ang) * t - Math.sin(ang) * o, z = a[1] + Math.sin(ang) * t + Math.cos(ang) * o;
        if (pondF(x, z) < 1.02) continue;
        const len = 0.8 + rnd() * 0.8;
        S.add(x, W.h(x, z) + 0.13, z, Math.cos(ang), 0, Math.sin(ang), 0, 1, 0, len, 0.18 + rnd() * 0.12, wc(rnd), -0.6 * len, [CELL.LONG_A, CELL.COMMA, CELL.DAB][(rnd() * 3) | 0], 0, FLAG_WATER);
      }
    }
    paintCrop(W, { x0: 40, x1: 160, z0: -106, z1: -4, step: 0.7, h: 1.0, w: 0.08, cluster: 4, spread: 0.24, lean: 0.4, sway: 0.5,
      mask: (x, z) => { const d = ruD(x, z); return d > 1.1 && d < 2.2 && pondF(x, z) > 1.05 ? 0.55 * sstep(0.25, 0.55, vnoise(x * 0.15, z * 0.15, 515)) + 0.15 : 0; },
      col: (x, z, r) => jit(mixc(hex('#3f7a40'), hex('#a8b858'), r()), 0.04, r) });
    // the sluice: two posts in the banks, a beam across and the board that holds the water back
    const wood = pal(['#6a5a4c', '#7a685a', '#5a4c44', '#8a7866'], 0.04);
    const sp = [46.6, -9.7], sa = Math.atan2(-6.5, 7.5) + 1.5708, ux = Math.cos(sa), uz = Math.sin(sa), y0 = W.h(sp[0], sp[1]);
    for (const s of [-1, 1]) S.add(sp[0] + ux * s * 1.3, y0 + 0.5, sp[1] + uz * s * 1.3, 0, 1, 0, 1, 0, 0, 1.5, 0.22, wood(rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL);
    S.add(sp[0], y0 + 1.15, sp[1], ux, 0, uz, -uz, 0.2, ux, 2.9, 0.2, wood(rnd), 0, CELL.HEAVY, 0, 0);
    for (let k = 0; k < 4; k++) S.add(sp[0] + ux * (k - 1.5) * 0.55, y0 + 0.55, sp[1] + uz * (k - 1.5) * 0.55, 0, 1, 0, -uz, 0, ux, 0.9, 0.5, wood(rnd), 0, CELL.BLOCK, 0, 0);
    S.add(sp[0] - uz * 0.3, WATER_Y + 0.12, sp[1] + ux * 0.3, -uz, 0, ux, 0, 1, 0, 1.2, 1.6, [0.86, 0.9, 0.92], -0.5, CELL.DAB, 0.1, FLAG_WATER);
    // planks across where the path round the pond meets it
    const bp = [52.6, -15], ba = Math.atan2(-6.5, 7.5);
    for (let k = -2; k <= 2; k++) S.add(bp[0] + Math.cos(ba) * k * 0.32, W.h(bp[0], bp[1]) + 0.45, bp[1] + Math.sin(ba) * k * 0.32, -Math.sin(ba), 0, Math.cos(ba), 0, 1, 0, 3.4, 0.3, wood(rnd), 0, CELL.BLOCK, 0, 0);
  }
  // the Epte: its moving water, reeds, and a long line of poplars on its near bank, pollard willows here and there
  function epte(W) {
    const S = W.S, rnd = W.rnd, wc = pal(['#7a96a8', '#86a2ae', '#6a88a0', '#9ab0b8', '#8a9cb4'], 0.05);
    for (let x = -215; x < 215; x += 0.9) for (let k = 0; k < 4; k++) {
      const px = x + rnd() * 0.9, ez = epteZ(px), pz = ez + (rnd() - 0.5) * 7.5 * epteK(px);
      if (epteK(px) < 0.4 || W.h(px, pz) > WATER_Y - 0.15) continue;
      const a = Math.atan2(epteZ(px + 1) - ez, 1), len = 1.4 + rnd() * 1.4;
      S.add(px, WATER_Y + 0.04, pz, Math.cos(a), 0, Math.sin(a), 0, 1, 0, len, 0.25 + rnd() * 0.15, wc(rnd), -0.8 * len, [CELL.LONG_A, CELL.COMMA, CELL.LONG_B][(rnd() * 3) | 0], 0, FLAG_WATER);
    }
    paintCrop(W, { x0: -215, x1: 215, z0: -112, z1: -80, step: 0.9, h: 1.1, w: 0.08, cluster: 4, spread: 0.26, lean: 0.4, sway: 0.5,
      mask: (x, z) => { const d = Math.abs(z - epteZ(x)); return epteK(x) > 0.3 && d > 4.4 && d < 6.6 ? 0.6 * sstep(0.3, 0.6, vnoise(x * 0.09, z * 0.2, 516)) + 0.1 : 0; },
      col: (x, z, r) => jit(mixc(hex('#3f7a40'), hex('#a8b858'), r()), 0.04, r) });
    const pl = (r, t) => jit(mixc(hex('#3a6a44'), hex('#9ab858'), r() * (0.3 + 0.7 * t)), 0.05, r), bark = pal(['#6a5a68', '#7a6672', '#5a4e60'], 0.04);
    const wl = (r, t) => jit(mixc(hex('#7a9a6a'), hex('#c4cc9a'), r() * (0.3 + 0.7 * t)), 0.05, r), pb = pal(['#5a4a40', '#6a5848'], 0.04);
    for (let x = -196; x < 196; x += 8.5 + rnd() * 3) {
      const z = epteZ(x) + 7 + rnd() * 1.5;
      if (inCone(x, z, true) || Math.abs(x) < 3) continue;
      // poplars where no mirror of an easel would show them; elsewhere alders and pollard willows, as low as the mirrors ask
      const hm = tallest(x, z), y = W.h(x, z);
      if (hm > 27 && rnd() < 0.82) poplar(W, x, z, 20 + rnd() * 6, pl, bark, { from: 0.18, rad: 1.8, n: 150, shaft: 0.16 });
      else if (hm > 5.6) { trunk(W, x, y, z, 2.6, 0.35, pb, [0, 0], 2); leafCloud(W, x, y + 3.6, z, { n: 70, rx: 2.4, ry: 1.6, rz: 2.4, size: 0.5, col: wl, core: hex('#4a6a4c') }); W.collide(x, z, 0.5); }
      else if (hm > 2.6) bush(W, x, z, Math.min(2.2, hm * 0.42), wl, hex('#4a6a4c'));
      const fz = epteZ(x) - 7 - rnd() * 3;
      if (rnd() < 0.5 && tallest(x + 4, fz) > 26) poplar(W, x + 4, fz, 18 + rnd() * 6, pl, bark, { from: 0.2, rad: 1.7, n: 110, shaft: 0.15 });
    }
    // a footbridge over the Epte where the path from the north gate comes down to it
    const wood = pal(['#7a685a', '#6a5a4c', '#8a7866'], 0.04), x0 = -1, z0 = epteZ(-1);
    for (let k = -3; k <= 3; k++) S.add(x0 + k * 0.32, WATER_Y + 0.75, z0, 0, 0.02, 1, 0, 1, 0, 11, 0.3, wood(rnd), 0, CELL.BLOCK, 0, 0);
    for (const s of [-1, 1]) { S.add(x0 + s * 1.15, WATER_Y + 1.55, z0, 0, 0, 1, s, 0, 0, 11, 0.1, wood(rnd), 0, CELL.LONG_B, 0, 0); for (let k = -2; k <= 2; k++) S.add(x0 + s * 1.15, WATER_Y + 1.1, z0 + k * 2.6, 0, 1, 0, 1, 0, 0, 0.9, 0.1, wood(rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL); }
  }
  // the kitchen garden in its rows, the orchard, the farmyard with the big studio, the greenhouse and a barn, the crossing keeper's house
  function farm(W) {
    const S = W.S, rnd = W.rnd;
    const cab = pal(['#5a8a7a', '#6a9a8a', '#4a7a6c', '#7aa49a', '#8aaaa0'], 0.05), lettuce = pal(['#8ab858', '#9cc460', '#7aa84c', '#b4d070'], 0.05);
    const bean = pal(['#3f7a40', '#4a8a44', '#5a9a4a'], 0.05), bloom = pal(['#f0e8d8', '#e85a48', '#f2c84a'], 0.04);
    for (let x = POT[0] + 1.15; x < POT[1]; x += 2.3) {
      const s = Math.round((x - POT[0] - 1.15) / 2.3), kind = s % 3;
      for (let z = POT[2] + 0.6; z < POT[3] - 0.4; z += kind === 2 ? 1.6 : 0.7) {
        if (Math.abs(z - 80) < 1.0) continue;
        const px = x + (rnd() - 0.5) * 0.4, y = W.h(px, z);
        if (kind === 2) { // beans on their sticks
          S.add(px, y + 0.9, z, (rnd() - 0.5) * 0.2, 1, 0, 1, 0, 0, 1.8, 0.05, [0.48, 0.38, 0.28], 0, CELL.LONG_B, 0, FLAG_AXIAL);
          for (let k = 0; k < 4; k++) S.bill(px + (rnd() - 0.5) * 0.4, y + 0.4 + rnd() * 1.3, z + (rnd() - 0.5) * 0.4, rnd() * 3, 0.36, 0.22, rnd() < 0.15 ? bloom(rnd) : bean(rnd), 0.2, CELL.COMMA, 0, false, 0, 0.6, 0, FLAG_LEAF);
        } else if (kind === 1) { for (let k = 0; k < 3; k++) S.bill(px + (rnd() - 0.5) * 0.5, y + 0.22, z + (rnd() - 0.5) * 0.3, rnd() * 3, 0.42, 0.3, cab(rnd), 0.05, CELL.DAB, 0, false, 0, 0.6, 0, FLAG_LEAF); }
        else S.bill(px, y + 0.14, z, rnd() * 3, 0.32, 0.24, lettuce(rnd), 0.05, CELL.DOT, 0, false, 0, 0.6, 0, FLAG_LEAF);
      }
    }
    const leaf = (r, t) => jit(mixc(hex('#4a7a3c'), hex('#9ab858'), r() * (0.3 + 0.7 * t)), 0.05, r), bark = pal(['#5a4a40', '#6a5848', '#4a3e36'], 0.04);
    const fruit = pal(['#f4e6ea', '#f8f0f0', '#e8c0c8', '#d84a3a', '#e8b040'], 0.04, [3, 3, 2, 1, 1]);
    for (let z = 99.5; z < 115; z += 7.5) for (let x = -94; x < -67; x += 7.5) {
      const px = x + (rnd() - 0.5) * 1.5, pz = z + (rnd() - 0.5) * 1.5, y = W.h(px, pz);
      trunk(W, px, y, pz, 2.2, 0.16, bark, [(rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.6], 2); twigs(W, px, y + 1.9, pz, 6, 1.8, bark);
      leafCloud(W, px, y + 2.9, pz, { n: 90, rx: 2.3, ry: 1.5, rz: 2.3, size: 0.45, col: leaf, core: hex('#3e6a3a') });
      for (let k = 0; k < 14; k++) { const a = rnd() * TAU, q = Math.sqrt(rnd()); S.bill(px + Math.cos(a) * q * 2.2, y + 2.4 + rnd() * 1.6, pz + Math.sin(a) * q * 2.2, rnd() * 3, 0.24, 0.18, fruit(rnd), 0.2, CELL.DOT, 0.05, false, 0, 0.6, 0, FLAG_FLOWER); }
      W.caster({ k: 'ball', x: px, z: pz, y: 2.9, r: 2.2, v: 0.7 }); W.collide(px, pz, 0.3);
    }
    // the big studio he built in 1915, its north light in the roof; the greenhouse; a barn; the house by the crossing
    house(W, { x: -52, z: 125, w: 16, d: 9, h: 6.8, rh: 2.6, yaw: 0, wall: pal(['#ece2d2', '#f4ecdc', '#ded2c0', '#e8dcd4'], 0.03), wallBase: hex('#e8dece'), roof: pal(['#8a96a8', '#a8b8c8', '#7a8698', '#c4d0dc'], 0.03), roofBase: hex('#8a96a6'),
      windows: [0.15, 0.38, 0.62, 0.85].map((u) => ({ side: -1, u, v: 0.45, w: 2.2, h: 3.4 })).concat([{ side: 1, u: 0.5, door: true, w: 1.6, h: 2.6 }]), win: pal(['#c8d4dc', '#b8c8d4', '#d8e0e4'], 0.02), door: pal(['#3f7a5c'], 0.03), step: 0.55, len: 1.3, wid: 0.44 });
    const glass = pal(['#c8dce0', '#d8e8ec', '#b0c8d0', '#e8f0f0', '#a8c4c0'], 0.03);
    box(W, { x: -54, z: 114.5, w: 8, d: 3.6, y0: W.h(-54, 114.5) - 0.2, h: 2.4, wall: glass, base: hex('#b8ccd0'), step: 0.45, len: 0.9, wid: 0.4 });
    gableRoof(W, { x: -54, z: 114.5, w: 8, d: 3.6, y: W.h(-54, 114.5) + 2.2, rh: 1.2, roof: glass, base: hex('#c0d4d8'), step: 0.45, len: 0.9, wid: 0.4, over: 0.1 });
    W.collide(-56, 114.5, 1.9); W.collide(-52, 114.5, 1.9);
    house(W, { x: -63, z: 131, w: 8, d: 5, h: 3.8, rh: 2.6, yaw: 0, wall: pal(['#c8b8a0', '#d4c4ac', '#b8a890'], 0.04), wallBase: hex('#c4b49c'), roof: ROOFS[0], roofBase: RBASE[0], windows: [{ side: -1, u: 0.5, door: true, w: 2.2, h: 2.6 }], door: pal(['#6a5040'], 0.03), step: 0.55 });
    cottage(W, -72, 62, 0, 7, 5, 4.4, 1);
    // woodpile and washing line by the barn
    const logs = pal(['#8a6a50', '#9a7a5c', '#c8a880', '#7a5c48'], 0.05);
    for (let k = 0; k < 24; k++) S.bill(-59.5 + (k % 8) * 0.38, W.h(-58, 135) + 0.25 + Math.floor(k / 8) * 0.35, 135, 0, 0.36, 0.34, logs(rnd), 0, CELL.DOT, 0, false, 0, 0.6, 0, 0);
    const linen = pal(['#f6f2ea', '#eef0f4', '#f0e4d8', '#c8d4e4'], 0.03);
    for (let k = 0; k < 6; k++) S.add(-72 + k * 1.1, W.h(-70, 66) + 1.4, 66.5, 0, 1, 0, 0, 0, 1, 0.8, 0.7, linen(rnd), 0.3, CELL.RECT, 0, 0);
  }
  // the village climbing the hill south west of the house, and its church: the tower is the landmark to steer by
  function village(W) {
    const rnd = W.rnd, r2 = mulberry32(5601), placed = [];
    const free = (x, z, r) => { for (const c of W.colliders) if (Math.hypot(c.x - x, c.z - z) < r + c.r) return false; for (const p of placed) if (Math.hypot(p[0] - x, p[1] - z) < r + p[2]) return false; return !inCone(x, z, true); };
    // the church of Sainte Radegonde: nave, choir and a square tower under its spire
    const cx = -96, cz = 172, cy = W.h(cx, cz), stone = pal(['#d8ccb4', '#e2d6c0', '#c8bca4', '#d0c0b0', '#b8b0a4'], 0.04);
    box(W, { x: cx + 6, z: cz, w: 15, d: 7.5, y0: cy - 0.3, h: 7, wall: stone, base: hex('#d4c8b0'), step: 0.6, len: 1.3, wid: 0.5 });
    gableRoof(W, { x: cx + 6, z: cz, w: 15, d: 7.5, y: cy + 6.7, rh: 4.2, roof: ROOFS[1], base: RBASE[1], gable: stone, gableBase: hex('#d4c8b0'), step: 0.6, len: 1.3, wid: 0.5 });
    box(W, { x: cx - 3.4, z: cz, w: 4.6, d: 4.6, y0: cy - 0.3, h: 15, wall: stone, base: hex('#d0c4ac'), step: 0.5, len: 1.1, wid: 0.45 });
    pyramid(W, { x: cx - 3.4, z: cz, w: 5, d: 5, y: cy + 14.7, h: 9, roof: ROOFS[1], base: RBASE[1], step: 0.5, len: 1.2, wid: 0.42 });
    panel(W, cx - 3.4, cy + 11.5, cz - 2.3, 0, -1, 0.9, 1.6, [0.3, 0.3, 0.36], 0);
    W.collide(cx + 6, cz, 4); W.collide(cx - 3.4, cz, 3); placed.push([cx, cz, 12]);
    // the churchyard wall and its yews
    hedge(W, [[cx - 9, cz - 8], [cx + 16, cz - 8]], 1.4, 0.8, (r, t) => jit(mixc(hex('#2a4a3a'), hex('#4a6a48'), r() * t), 0.04, r), [0.16, 0.24, 0.18]);
    // houses along the village street, their fronts on it, then more up the hill
    const STREET = [[-26, 140], [-48, 138.5], [-70, 131], [-90, 119], [-106, 104], [-124, 94], [-160, 88], [-210, 84]];
    for (let i = 0; i < STREET.length - 1; i++) {
      const a = STREET[i], b = STREET[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, yaw = Math.atan2(uz, ux);
      for (let t = 4; t < L; t += 11 + r2() * 5) {
        const w = 7 + r2() * 4, d = 5 + r2() * 1.5, o = d / 2 + 2.6, px = a[0] + ux * t, pz = a[1] + uz * t;
        // on the far side of the street, the side away from the gardens
        const s = Math.hypot(px - uz * o, pz + ux * o - 34) > Math.hypot(px + uz * o, pz - ux * o - 34) ? 1 : -1, sx = px - s * uz * o, sz = pz + s * ux * o;
        if (!free(sx, sz, w * 0.6)) continue;
        cottage(W, sx, sz, yaw, w, d, 4.2 + r2() * 2, (r2() * 12) | 0, false); placed.push([sx, sz, w * 0.6]);
      }
    }
    for (let i = 0; i < 60 && placed.length < 26; i++) {
      const a = (100 + r2() * 46) * DEG, r = 140 + r2() * 85, x = Math.cos(a) * r, z = 34 + Math.sin(a) * r, w = 7 + r2() * 5;
      if (!free(x, z, w * 0.7)) continue;
      cottage(W, x, z, Math.atan2(z - 34, x) + 1.5708 + (r2() - 0.5) * 0.4, w, 5 + r2() * 2, 4 + r2() * 2.5, (r2() * 12) | 0, true); placed.push([x, z, w * 0.7]);
    }
    // gardens and trees between the houses
    const leaf = (r, t) => jit(mixc(hex('#3e6e3c'), hex('#8ab056'), r() * (0.3 + 0.7 * t)), 0.05, r), bark = pal(['#4e4238', '#5e4e40'], 0.04);
    for (let i = 0; i < 40; i++) {
      const a = (98 + r2() * 50) * DEG, r = 128 + r2() * 95, x = Math.cos(a) * r, z = 34 + Math.sin(a) * r;
      if (!free(x, z, 4)) continue;
      roundTree(W, x, z, 2.6 + r2() * 2, 3 + r2() * 3, leaf, bark, hex('#3a6a3c'), 110); placed.push([x, z, 3]);
    }
  }
  // the bounds: the wall and railings of the flower garden, its hedges, the fence of the water garden with its gates, the hedge and trees of the east meadow
  function bounds(W) {
    const green = pal(['#3f6a50', '#4a7a5c', '#36604a', '#5a8466'], 0.04);
    railing(W, -62.5, -2.6, WALL_Z); railing(W, 2.6, 62.5, WALL_Z);
    pillar(W, -2.6, WALL_Z, 1.9); pillar(W, 2.6, WALL_Z, 1.9);
    const hleaf = (r, t) => jit(mixc(hex('#2f5a36'), hex('#7aa250'), r() * (0.25 + 0.75 * t)), 0.05, r), hcore = [0.18, 0.28, 0.17];
    hedge(W, [[-62.9, 43.2], [-62.9, 117.5], [-58.5, 118.5]], 1.7, 1.0, hleaf, hcore);
    hedge(W, [[62.9, 43.2], [62.9, 50]], 1.7, 1.0, hleaf, hcore);
    // the water garden is fenced, with a gate at the crossing, one to the meadow in the east and one to the river in the north
    fence(W, [[-46, FENCE_Z], [-1.8, FENCE_Z]], green, 1.15); fence(W, [[1.8, FENCE_Z], [FENCE_X, FENCE_Z], [FENCE_X, 1.6]], green, 1.15);
    fence(W, [[FENCE_X, -1.6], [FENCE_X, FENCE_N], [1.6, FENCE_N]], green, 1.15); fence(W, [[-1.6, FENCE_N], [-60, FENCE_N]], green, 1.15);
    const gate = pal(['#e8e4da', '#f2eee4'], 0.02);
    for (const g of [[0, FENCE_Z, 0], [FENCE_X, 0, 1.5708], [0, FENCE_N, 0]]) for (const s of [-1, 1]) {
      const x = g[0] + Math.cos(g[2]) * s * 1.8, z = g[1] + Math.sin(g[2]) * s * 1.8;
      W.S.add(x, W.h(x, z) + 0.8, z, 0, 1, 0, 1, 0, 0, 1.6, 0.18, gate(W.rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL);
    }
    // the far edge of the east meadow: a thorn hedge with an oak or an ash standing out of it
    const pts = [];
    for (let a = -62; a <= -8; a += 4) pts.push([Math.cos(a * DEG) * 124, 34 + Math.sin(a * DEG) * 124]);
    const tl = (r, t) => jit(mixc(hex('#3a6a3e'), hex('#94b45a'), r() * (0.3 + 0.7 * t)), 0.05, r), bark = pal(['#4e4238', '#5e4e40', '#40362e'], 0.04);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (ruD(m[0], m[1]) < 6) continue;
      hedge(W, [a, b], 2.0, 1.2, hleaf, hcore);
      if (i % 2 === 0 && !inCone(m[0], m[1], true) && tallest(m[0] + 3, m[1] - 1) > 15) roundTree(W, m[0] + 3, m[1] - 1, 4.5 + W.rnd() * 2, 6 + W.rnd() * 3, tl, bark, hex('#35603a'), 230);
    }
    // pollard willows along the Ru
    const wl = (r, t) => jit(mixc(hex('#7a9a6a'), hex('#c4cc9a'), r() * (0.3 + 0.7 * t)), 0.05, r), pb = pal(['#5a4a40', '#6a5848'], 0.04);
    for (const p of [[66, -22.5], [84, -38.5], [101, -47], [118, -64]]) {
      const y = W.h(p[0], p[1]);
      if (tallest(p[0], p[1]) < 6.2) { if (tallest(p[0], p[1]) > 2.6) bush(W, p[0], p[1], 1.4, wl, hex('#4a6a4c')); continue; }
      trunk(W, p[0], y, p[1], 2.8, 0.4, pb, [0, 0], 2); twigs(W, p[0], y + 2.6, p[1], 10, 2.2, pb);
      leafCloud(W, p[0], y + 3.9, p[1], { n: 90, rx: 2.6, ry: 1.7, rz: 2.6, size: 0.5, col: wl, core: hex('#4a6a4c') }); W.collide(p[0], p[1], 0.5);
    }
  }
  // the hay meadows beyond the fences, with their flowers; and on the skyline all round, the lines of trees that close the valley
  function meadows(W) {
    const rnd = W.rnd, hayC = (x, z, r) => (zoneG(x, z) === 'hay' ? P.hay(r) : P.pasture(r));
    const meadow = (x, z) => { const zn = zoneG(x, z); return zn === 'hay' || zn === 'pasture'; };
    paintCrop(W, { x0: -130, x1: 130, z0: -112, z1: 30, step: 2.4, h: 0.7, w: 0.09, cluster: 3, spread: 0.3, lean: 0.5, mask: (x, z) => (meadow(x, z) && !inCone(x, z, false) ? 0.85 : 0), col: hayC });
    flowers(W, { x0: -130, x1: 130, z0: -112, z1: 30, step: 1.9, h: 0.6, size: 0.17, glow: 0.1, mask: (x, z) => (meadow(x, z) && !inCone(x, z, false) ? 0.3 * sstep(0.35, 0.7, vnoise(x * 0.05, z * 0.05, 517)) : 0),
      col: pal(['#f2d040', '#f6e070', '#e8402e', '#f6f2ea', '#c8b8ee', '#f05a3a'], 0.04, [3, 2, 2, 3, 1, 1]) });
    const far = (r, t) => jit(mixc(hex('#6a8a80'), hex('#a4b49a'), r() * (0.3 + 0.7 * t)), 0.05, r), farD = (r, t) => jit(mixc(hex('#5a7a7a'), hex('#8aa094'), r() * t), 0.05, r);
    for (let a = 0; a < 360; a += 2.2 + rnd() * 1.6) {
      const r = 200 + rnd() * 30, x = Math.cos(a * DEG) * r, z = 34 + Math.sin(a * DEG) * r;
      if (inCone(x, z, true)) continue;
      const hm = tallest(x, z);
      if (hm < 5) continue;
      const y = W.h(x, z), s = Math.min(4 + rnd() * 4, hm / 1.8), tall = rnd() < 0.3 && hm > 21;
      leafCloud(W, x, y + (tall ? 10 + s * 0.5 : s * 0.9), z, { n: 40, rx: tall ? 2.2 : s, ry: tall ? 9 : s * 0.7, rz: tall ? 2.2 : s, size: s * 0.36, col: rnd() < 0.5 ? far : farD, core: hex('#6a8478') });
    }
  }
  // a few people on the road and about the farm. The living layer takes them over
  function folk(W) {
    person(W, -20, roadZ(-20) - 0.5, 0.2, { dress: [0.3, 0.32, 0.4], top: [0.82, 0.8, 0.76], hat: [0.86, 0.8, 0.6] });
    person(W, 40, roadZ(40) + 0.6, 3.1, { dress: [0.46, 0.38, 0.3], top: [0.4, 0.42, 0.52], hat: [0.3, 0.28, 0.26] });
    person(W, -80, 72, 1.6, { dress: [0.5, 0.42, 0.36], top: [0.86, 0.84, 0.8], hat: [0.88, 0.82, 0.62] });
  }
  // what was laid before the place was painted and now lies under its water, its rails and its walls is taken away: its touches shrink to nothing
  function clear(W, n0) {
    const S = W.S, P4 = S.pos, SC = S.sca;
    const trunks = W.colliders.filter((c) => c.r < 0.9 && c.z > 33 && c.z < 47);
    const box2 = [[-61, -43, 120, 130], [-58.5, -49.5, 112.3, 116.7], [-67.5, -58.5, 128, 134], [-76, -68, 59, 65], [-99, -65, 65.5, 96.5]];
    for (let i = 0; i < n0; i++) {
      const o = i * 4, x = P4[o], y = P4[o + 1], z = P4[o + 2], fl = Math.floor(SC[o + 2] / 16);
      if (SC[o] === 0) continue;
      const g = W.h(x, z);
      let kill = false;
      if (y < g + 2.5 && wetAt(x, z) && y > WATER_Y - 0.12) kill = true;
      else if (z > 35.9 && z < roadZ(x) + 1.55 && Math.abs(x) < 300 && y < g + 4.5 && !(fl & FLAG_GROUND && !(fl & FLAG_GRASS)) && !trunks.some((c) => Math.hypot(c.x - x, c.z - z) < 0.7)) kill = true;
      else if (fl & (FLAG_GRASS | FLAG_FLOWER) && y < g + 1.5) {
        for (const b of box2) if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) kill = true;
        if (!kill && (pathDist(x, z, WALKS[0]) < 0.8 || pathDist(x, z, WALKS[1]) < 0.7)) kill = true;
      }
      if (kill) { SC[o] = 0; SC[o + 1] = 0; }
    }
    ground.late = true; W._pondN0 = n0; W._pondS0 = W.solidN; W._pondC0 = W.casters.length;
  }
  function build(W) {
    const T = W.tasks, rnd = W.rnd, S = W.S, V = CH.spots.map((s) => s.view);
    W.waterY = WATER_Y;
    W.deck = (x, z) => (Math.abs(x - BX) < HW + 0.25 && z > ZA && z < ZB ? deckY(z) + 0.05 : null);
    T.push(() => W.fillTerrain(height, (x, z) => BASE[zoneG(x, z)]));
    groundRings(W, ground, { cx: 0, cz: 30, r2: 300, discs: [[4, 4, 60], [-46, 4, 40], [40, 26, 34], [-24, 70, 46], [16, 84, 46], [0, 40, 24]] });
    for (let i = 0; i < 3; i++) T.push(() => paintSky(W, { n: 5200 }));
    T.push(() => footbridge(W));
    const leaf = (r, t) => jit(mixc(hex('#3f743c'), hex('#84b04e'), r() * (0.35 + 0.65 * t)), 0.05, r);
    const leafB = (r, t) => jit(mixc(hex('#356a4c'), hex('#6aa070'), r() * t), 0.04, r);
    const leafL = (r, t) => jit(mixc(hex('#7a9c50'), hex('#d6d8a2'), r() * (0.3 + 0.7 * t)), 0.05, r);   // a crown full of light, cream and yellow green
    const leafV = (r, t) => jit(mixc(hex('#3f5e6c'), hex('#84a0a8'), r() * t), 0.05, r);                 // trees seen across the water: blue green and slate
    const leafD = (r, t) => jit(mixc(hex('#2a4840'), hex('#4c7250'), r() * t), 0.04, r);                 // and the darkest of them, against the light
    const wleaf = (r, q) => jit(mixc(hex('#5a8a3c'), hex('#b4c85a'), r() * (0.4 + 0.6 * q)), 0.05, r);
    // the curtain behind the bridge: yellow green, paler towards its tips, a touch of cream here and there
    const wleafL = (r, q, u) => (r() < 0.07 ? jit(hex('#dccfa4'), 0.04, r) : jit(mixc(hex('#5c8c3a'), hex('#c2d064'), clamp(r() * (0.45 + 0.55 * q) + 0.25 * (u || 0), 0, 1)), 0.05, r));
    const wleafD = (r, q, u) => jit(mixc(hex('#2f5038'), hex('#6c8c48'), r() * (0.25 + 0.5 * q) + 0.15 * (u || 0)), 0.05, r); // a willow in its own shade
    const bark = pal(['#4e4238', '#5e4e40', '#40362e'], 0.04), barkP = pal(['#6a5a68', '#7a6672', '#5a4e60'], 0.04);
    // willows that lean over the water. The tall ones stand behind the bridge and hang their curtain over it
    T.push(() => {
      for (const w of [[-10, -28.5, 13, 8, wleafD], [18, -23.8, 12, 8, wleafD], [-70, -2, 10, 6, wleaf]]) willow(W, w[0], w[1], w[2], w[3], w[4], bark);
      for (const w of [[-62.5, 9, 18.5, 9], [-41, 18.5, 14.5, 8], [-55, -11.5, 11, 7.5]]) weeping(W, w[0], w[1], w[2], w[3], wleafL, bark);
      // two at the eastern end reach far out: their branches hang into the corners of the long panels
      weeping(W, 40.5, -14.6, 13, 8.5, wleafD, bark, -0.8, 3.4, 0.4);
      weeping(W, 39, 14.2, 12, 8.5, wleafD, bark, -0.5, -1.5, 0.4);
    });
    // the green wall of the garden: tall trees and poplars closing the view on every side
    T.push(() => {
      const r2 = mulberry32(5501);
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * TAU + r2() * 0.08, rr = 74 + r2() * 30 + (Math.sin(a) > 0.5 ? 60 : 0), x = Math.cos(a) * rr * 1.25, z = Math.sin(a) * rr + (Math.sin(a) > 0.5 ? 22 : -4);
        if (zone(x, z) === 'earth' || zone(x, z) === 'iris' || zone(x, z) === 'red' || zone(x, z) === 'path' || pondF(x, z) < 1.5) continue;
        if (r2() < 0.3) poplar(W, x, z, 17 + r2() * 8, r2() < 0.5 ? leaf : leafB, barkP, { from: 0.2, rad: 1.9, n: 190, shaft: 0.16 });
        else roundTree(W, x, z, 5 + r2() * 3.4, 3 + r2() * 2.6, r2() < 0.6 ? leaf : leafB, bark, hex('#35603a'), 260);
      }
      // the high green behind the bridge, so that the arch stands against leaves and not against the sky
      for (let i = 0; i < 16; i++) {
        const x = -66 - r2() * 22, z = -30 + i * 4.2 + r2() * 3;
        if (pondF(x, z) < 1.45) continue;
        if (i % 3 === 0) poplar(W, x, z, 22 + r2() * 6, leaf, barkP, { from: 0.16, rad: 2.4, n: 260, shaft: 0.18 }); else roundTree(W, x, z, 6.5 + r2() * 3, 6 + r2() * 5, r2() < 0.6 ? leaf : leafB, bark, hex('#35603a'), 330);
      }
      // and higher crowns still at the western end, the ones to the north full of light
      for (const t of [[-68.5, 5, 8, 12.5, leaf], [-66, 15.5, 8.5, 13, leaf], [-62.5, 25, 7.5, 11.5, leafB], [-50, -19.5, 6.5, 9, leafB]]) roundTree(W, t[0], t[1], t[2], t[3], t[4], bark, hex('#35603a'), 300);
      for (const t of [[-64.5, -17, 7.5, 11.5], [-67.5, -6.5, 8.5, 13], [-39, -15.5, 6.5, 8]]) {   // these three in smaller touches: they are the pale blossom at the top of the canvas
        const y = W.h(t[0], t[1]);
        trunk(W, t[0], y, t[1], t[3] + t[2] * 0.4, t[2] * 0.1 + 0.1, bark, [0.3, -0.2]); twigs(W, t[0], y + t[3], t[1], 9, t[2] * 1.25, bark);
        leafCloud(W, t[0], y + t[3] + t[2] * 0.5, t[1], { n: 620, rx: t[2], ry: t[2] * 0.8, rz: t[2], size: t[2] * 0.13, col: leafL, core: hex('#4a6e40') });
        W.caster({ k: 'ball', x: t[0], z: t[1], y: t[3] + t[2] * 0.5, r: t[2] * 0.95, v: 0.8 }); W.collide(t[0], t[1], 0.6);
      }
      // tall dark poplars where the long basin ends, either side of the bridge: from the eastern end their reflections stand at the left and right of the water
      for (const t of [[-16, -22, 31], [-20.5, -20.5, 35], [-25, -19, 31], [-15.5, 23, 30], [-20.5, 21.5, 34]]) poplar(W, t[0], t[1], t[2], leafD, barkP, { from: 0.1, rad: 3.2, n: 360, shaft: 0.24 });
      // great trees on the long banks. The lilies of the wide water lie in their reflections
      for (const t of [[-8, -31.5, 7, 12], [-2, -33, 7.5, 13.5], [4.5, -32.5, 7, 12.5], [11, -32.5, 6.5, 10.5], [24.5, -31.5, 7, 12.5], [-11, 31, 7, 12], [-5.5, 33.5, 6.5, 11]]) roundTree(W, t[0], t[1], t[2], t[3], leafV, bark, hex('#39555e'), 300);
      for (const t of [[-5, -36.5, 25], [1.5, -37.5, 27], [8, -36.5, 24], [21, -35, 26], [-8.5, 35.5, 24]]) poplar(W, t[0], t[1], t[2], leafV, barkP, { from: 0.14, rad: 2.6, n: 260, shaft: 0.2 });
      for (let i = 0; i < 46; i++) { const a = r2() * TAU, rr = 34 + r2() * 26, x = 4 + Math.cos(a) * rr * 1.6, z = Math.sin(a) * rr; if (pondF(x, z) < 1.42 || pondF(x, z) > 2.3 || (z > 20 && Math.abs(x - 12) < 16) || (x > 40 && Math.abs(z) < 12) || zone(x, z) === 'path') continue; bush(W, x, z, 1.8 + r2() * 2, r2() < 0.5 ? leaf : leafB, hex('#3c6a3e')); }
      // bamboo at the western end
      paintCrop(W, { x0: -84, x1: -64, z0: -16, z1: 20, step: 0.9, h: 5.2, w: 0.11, cluster: 3, spread: 0.3, lean: 0.25, sway: 0.5, mask: (x, z) => (pondF(x, z) > 1.3 ? 0.8 : 0), col: (x, z, r) => jit(mixc(hex('#4f8a44'), hex('#9ac060'), r()), 0.04, r), flags: FLAG_AXIAL | FLAG_GROUND });
    });
    // reeds, iris and grasses along the bank
    const reed = (r) => jit(mixc(hex('#4a8438'), hex('#b2c65c'), r()), 0.04, r);
    T.push(() => paintCrop(W, { x0: -66, x1: 54, z0: -26, z1: 26, step: 0.8, h: 0.9, w: 0.075, cluster: 5, spread: 0.24, lean: 0.4, sway: 0.5,
      mask: (x, z) => { const f = pondF(x, z); return f > 0.98 && f < 1.16 && !(z > 18 && Math.abs(x - 12) < 9) && !(x > 44 && Math.abs(z) < 7) && Math.abs(x - BX) > 2.2 ? 0.6 * sstep(0.3, 0.6, vnoise(x * 0.11, z * 0.11, 505)) : 0; },
      col: (x, z, r) => jit(mixc(hex('#3f7a40'), hex('#8ab050'), r()), 0.04, r) }));
    T.push(() => flowers(W, { x0: -66, x1: 54, z0: -26, z1: 26, step: 0.9, h: 0.85, size: 0.2, glow: 0.12, season: false, mask: (x, z) => { const f = pondF(x, z); return f > 1.0 && f < 1.2 ? 0.34 * sstep(0.4, 0.7, vnoise(x * 0.11, z * 0.11, 505)) : 0; },
      col: pal(['#7a5ad0', '#9a7ae0', '#f2d040', '#5a48b8', '#e8a0c8', '#f6f2e8'], 0.04, [3, 3, 2, 2, 1, 1]) }));
    T.push(() => {
      // tall reeds at the feet of the bridge, the clump he kept at the right of the picture, and the ones that stand before the easel at the eastern end
      reeds(W, -25.4, -6.4, 2.2, 1.7, 240, 2.3, reed); reeds(W, -31.5, -7.6, 3.2, 1.3, 150, 1.7, reed); reeds(W, -31.5, 11.6, 3.2, 1.3, 150, 1.7, reed); reeds(W, -24.6, 9.4, 1.6, 1.2, 70, 1.3, reed);
      reeds(W, 47.5, 2.6, 1.3, 3.2, 170, 1.3, (r) => jit(mixc(hex('#3a6834'), hex('#90a84c'), r()), 0.04, r));
    });
    T.push(() => paintCrop(W, { x0: -100, x1: 100, z0: -70, z1: 44, step: 2.2, h: 0.4, w: 0.085, cluster: 3, spread: 0.22, lean: 0.5, mask: (x, z) => (zone(x, z) === 'lawn' || zone(x, z) === 'wil' || zone(x, z) === 'wid' ? 0.6 : 0), col: (x, z, r) => (zone(x, z) === 'lawn' ? P.lawn : P.wgr)(r) }));
    // the water lilies: islands of round leaves. Before each easel they lie where his canvas has them, so those are given by their place in the picture
    T.push(() => {
      const under = pal(['#3f7a5c', '#4a8a64', '#356e60', '#4f8f78', '#42806a', '#55789a'], 0.05, [3, 3, 2, 2, 2, 1]);
      const A = { pad: pal(['#ccd098', '#dcd6ac', '#b8c684', '#e6d0b4', '#eecabc', '#a8bc78', '#e0d8b4', '#98b06c'], 0.05, [3, 3, 3, 2, 2, 3, 2, 2]), under: pal(['#6e9454', '#7ea060', '#628450', '#8c9868'], 0.05),
        bloom: pal(['#f6c8d4', '#fbe8ec', '#f0a0b8', '#fff6e0', '#f6e070', '#e87898', '#ffffff'], 0.04, [3, 3, 2, 2, 1, 1, 2]), bs: 0.55, late: 0.3 };          // 1899: pale leaves, rose and white flowers
      const B = { pad: pal(['#8cba6c', '#9cc474', '#7aae68', '#a8c878', '#6aa070', '#b4cc84', '#84b890', '#c4d48c'], 0.05, [3, 3, 3, 2, 2, 2, 1, 1]), under,
        bloom: pal(['#fff6e0', '#f6e070', '#ffffff', '#fbe8a0', '#f6c8d4'], 0.04, [3, 2, 2, 2, 1]), bs: 0.34, late: 0.4 };                                           // 1906: green islands, white and yellow
      const B2 = Object.assign({}, B, { bloom: pal(['#e87898', '#f0a0b8', '#d85070', '#f6c8d4', '#fbe8ec'], 0.04, [3, 2, 2, 2, 1]), bs: 0.42 });                     // and the rose ones he kept in the near corner
      const C = { pad: pal(['#7aa878', '#8ab884', '#6a9a80', '#9ab87c', '#84a8a0', '#a8b890', '#b0a8c8', '#98c0a0'], 0.05, [3, 3, 3, 2, 2, 2, 1, 1]), under,
        bloom: pal(['#fbe8ec', '#ffffff', '#f6c8d4', '#f6e070', '#f0a0b8', '#e8d8f4'], 0.04, [3, 2, 2, 1, 1, 1]), bs: 0.36, late: 0.4 };                             // the long panels: blue greens, lilac, a few white
      // px, py: the middle of the island in the picture; w, h: half its width and height there; cover: how closely the leaves crowd; tf: the length of a leaf against the width of the canvas
      const isle = (v, px, py, w, h, cover, tf, fl, o) => {
        const c = seen(W, v, px, py), a = seen(W, v, px, Math.max(py - h, 0.004)), b = seen(W, v, px, py + h), k = near(c[3]);
        const s = clamp((tf * c[2]) / k, 0.3, 0.85), rx = w * c[2], rz = Math.hypot(a[0] - b[0], a[1] - b[1]) / 2;
        island(W, c[0], c[1], rx, rz, v.yaw, Math.min(760, Math.round((cover * Math.PI * rx * rz) / (0.7 * s * s * k * k))), s, fl, o, k / (0.61 + 0.39 * sstep(1.5, 17, c[3])));
      };
      // before the bridge: bands across the water, one behind the other, with the dark of the reflections between them
      isle(V[0], 0.5, 0.535, 0.62, 0.013, 0.45, 0.02, 0.3, A); isle(V[0], 0.46, 0.625, 0.6, 0.03, 0.9, 0.022, 0.34, A); isle(V[0], 0.56, 0.755, 0.62, 0.045, 1.2, 0.03, 0.36, A);
      isle(V[0], 0.44, 0.88, 0.6, 0.034, 1.2, 0.04, 0.36, A); isle(V[0], 0.6, 0.99, 0.56, 0.022, 1.0, 0.046, 0.3, A);
      isle(V[0], 0.3, 0.685, 0.22, 0.012, 0.25, 0.026, 0.3, A); isle(V[0], 0.78, 0.82, 0.2, 0.012, 0.25, 0.034, 0.3, A); isle(V[0], 0.2, 0.935, 0.2, 0.012, 0.3, 0.042, 0.3, A);
      // looked down on from the south bank: islands to the upper right and the lower left, single leaves between them
      isle(V[1], 0.1, 0.06, 0.13, 0.04, 0.9, 0.02, 0.2, B2); isle(V[1], 0.62, 0.04, 0.32, 0.034, 0.8, 0.019, 0.14, B); isle(V[1], 0.74, 0.255, 0.29, 0.046, 1.4, 0.024, 0.2, B);
      isle(V[1], 0.78, 0.42, 0.27, 0.06, 1.4, 0.03, 0.2, B); isle(V[1], 0.93, 0.575, 0.1, 0.034, 1.1, 0.034, 0.16, B); isle(V[1], 0.1, 0.665, 0.16, 0.085, 1.4, 0.04, 0.2, B2);
      isle(V[1], 0.13, 0.9, 0.17, 0.085, 0.45, 0.046, 0.12, B2); isle(V[1], 0.57, 0.83, 0.3, 0.11, 0.16, 0.046, 0.2, B2); isle(V[1], 0.34, 0.5, 0.2, 0.1, 0.03, 0.036, 0.1, B);
      // from the eastern end, the wide water of the last panels: groups low to the left and right, thin bands further out, single leaves over the middle
      isle(V[2], 0.15, 0.78, 0.24, 0.17, 0.6, 0.032, 0.1, C); isle(V[2], 0.85, 0.7, 0.2, 0.13, 0.6, 0.03, 0.1, C); isle(V[2], 0.52, 0.91, 0.11, 0.045, 0.45, 0.034, 0.3, C);
      isle(V[2], 0.24, 0.46, 0.2, 0.036, 0.5, 0.024, 0.1, C); isle(V[2], 0.74, 0.37, 0.24, 0.04, 0.6, 0.022, 0.1, C); isle(V[2], 0.44, 0.215, 0.36, 0.028, 0.26, 0.018, 0.08, C);
      isle(V[2], 0.62, 0.085, 0.42, 0.028, 0.14, 0.015, 0.06, C); isle(V[2], 0.5, 0.62, 0.3, 0.12, 0.05, 0.028, 0.14, C);
      // and the rest of the pond
      const r2 = mulberry32(5502);
      for (let i = 0; i < 40; i++) {
        const x = -62 + r2() * 110, z = -18 + r2() * 36, s = 0.5 + r2() * 0.2;
        if (pondF(x, z) > 0.86 || (x > -30 && x < -12) || (x > 0 && x < 31 && z > -6) || (x > 14 && Math.abs(z) < 19)) continue;
        island(W, x, z, 1.6 + r2() * 2.6, 0.8 + r2() * 1.2, (r2() - 0.5) * 0.6 + (x < -6 ? 1.57 : 0), Math.round(30 + r2() * 50), s, 0.2, r2() < 0.5 ? B : C);
      }
    });
    // his boat, moored where he liked to look at the bridge
    T.push(() => {
      const k0 = S.n;
      rowboat(W, -7.4, 2.5, 0.08, 1.0, pal(['#4a6a5a', '#587a66', '#3e5c50', '#6a8a70'], 0.04), 0);
      easelProp(W, -8.6, 2.4, -1.57, WATER_Y + 0.4);
      if (S.float) S.float(k0);
    });
    // the flower garden: beds in long rows, the rose arches over the middle walk, the pink house at the end
    T.push(() => {
      const iris = pal(['#5c4ccc', '#7460dc', '#4a3cb4', '#8c7ce8', '#6a50c8', '#8a6cd4', '#4844b4', '#a898ec', '#7848b4', '#9c78d8', '#e4e0fa', '#8450b8', '#3c38a4', '#9a64c4'], 0.05, [3, 3, 2, 2, 3, 2, 2, 1, 2, 1, 1, 2, 2, 1]);
      const irisR = pal(['#8c4cac', '#a25cb8', '#7c44ac', '#b074c8', '#9068cc', '#6c4cc0', '#c48cd4', '#7860d8', '#dcb8e4'], 0.05, [3, 3, 2, 2, 2, 2, 1, 1, 1]);
      const rows = [pal(['#e8507a', '#f07a98', '#d83a66', '#f6a8bc'], 0.04), pal(['#f2c83a', '#f6dc6a', '#f08a3a', '#fff0b0'], 0.04), pal(['#f6f2ea', '#e8e0f4', '#c8b8ee', '#ffffff'], 0.03), pal(['#e8402e', '#f05a3a', '#f6803c'], 0.04)];
      const blade = (r) => jit(mixc(hex('#3a7438'), hex('#86b04e'), r()), 0.04, r);
      // one plant of a bed: a tuft of green blades, and its flowers held above them
      const plant = (x, z, h, fs, col, nb, nf) => {
        const y = W.h(x, z);
        for (let k = 0; k < nb; k++) { const lx = (rnd() - 0.5) * 0.5, lz = (rnd() - 0.5) * 0.5, bh = h * (0.75 + 0.4 * rnd()); S.add(x + (rnd() - 0.5) * 0.24 + lx * bh * 0.4, y + bh * 0.48, z + (rnd() - 0.5) * 0.24 + lz * bh * 0.4, lx, 1, lz, 1, 0, 0, bh, 0.09 + rnd() * 0.06, blade(rnd), 0.25, rnd() < 0.5 ? CELL.BLADE : CELL.LONG_A, 0, FLAG_AXIAL | FLAG_GROUND); }
        for (let k = 0; k < nf; k++) { const s = fs * (0.7 + 0.7 * rnd()); S.bill(x + (rnd() - 0.5) * 0.4, y + h * (0.8 + 0.45 * rnd()), z + (rnd() - 0.5) * 0.4, rnd() * 3, s * 1.45, s * 0.9, col(rnd), 0.25, [CELL.DAB, CELL.COMMA, CELL.COMMA_S, CELL.DOT][(rnd() * 4) | 0], 0.12, false, 0, 0.6, 0, 0); }
      };
      const sow = (x0, x1, step, mask, h, fs, colAt, nb, nf) => { for (let z = 46; z < 110; z += step) for (let x = x0; x < x1; x += step) { const px = x + rnd() * step, pz = z + rnd() * step, m = mask(px, pz); if (m > 0 && rnd() < m) plant(px, pz, h, fs, colAt(px, pz), nb, nf); } };
      // the irises: thickest before the easel, where they fill the lower half of the canvas; a thinner sowing between the beds makes one field of them
      const dv = (x, z) => Math.hypot(x - V[3].x, z - V[3].z), field = (x, z) => (onRed(x, z) || dv(x, z) < 2.8 ? 0 : inBed(x, z) ? 1 : 0.4);
      // blue violet in front and to the left, red violet and rose towards the back and the right, as the light found them
      const irisAt = (x, z) => (rnd() < clamp(0.12 + 0.5 * vnoise(x * 0.09, z * 0.09, 507) + (z - 58) / 70, 0.05, 0.85) ? irisR : iris);
      sow(-58, -5, 0.42, (x, z) => (dv(x, z) < 11 ? field(x, z) : 0), 0.7, 0.21, irisAt, 2, 3);
      sow(-58, -5, 0.7, (x, z) => (dv(x, z) >= 11 && dv(x, z) < 32 ? field(x, z) * 0.9 : 0), 0.7, 0.27, irisAt, 1, 2);
      sow(-58, -5, 0.95, (x, z) => (dv(x, z) >= 32 ? field(x, z) * 0.8 : 0), 0.7, 0.3, irisAt, 1, 1);
      // a mixed border to the east
      sow(5, 58, 0.72, (x, z) => (inBed(x, z) ? 0.8 : 0), 0.62, 0.24, (x) => rows[Math.floor((x - 5) / 4.4) % 4], 1, 1);
      // the red path, laid in again so that it holds between the flowers
      paintGround(W, { x0: -31.4, x1: -28.9, z0: 45.6, z1: 110.4, step: 0.5, len: 1.0, wid: 0.42, lift: 0.07, dir: 1.57, jit: 0.9, cells: [CELL.DAB, CELL.HEAVY, CELL.COMMA, CELL.BLOCK], col: (x, z, r) => P.red(r) });
      const iron = pal(['#3f7a5c', '#4a8a68', '#346a50'], 0.03), rose = pal(['#f0a0b4', '#f6c0cc', '#e87894', '#fbe0e4', '#d85a7a'], 0.04);
      for (let z = 50; z < 110; z += 7.5) {
        for (let k = 0; k < 10; k++) {
          const a0 = (k / 10) * Math.PI, a1 = ((k + 1) / 10) * Math.PI, R = 2.9, x0 = Math.cos(a0) * R, y0 = 0.6 + Math.sin(a0) * 3.3, x1 = Math.cos(a1) * R, y1 = 0.6 + Math.sin(a1) * 3.3;
          S.add((x0 + x1) / 2, (y0 + y1) / 2, z, x1 - x0, y1 - y0, 0, 0, 0, 1, Math.hypot(x1 - x0, y1 - y0) * 1.15, 0.09, iron(rnd), 0, CELL.LONG_B, 0, FLAG_AXIAL);
          for (let j = 0; j < 5; j++) S.bill((x0 + x1) / 2 + (rnd() - 0.5) * 0.7, (y0 + y1) / 2 + (rnd() - 0.5) * 0.7, z + (rnd() - 0.5) * 0.7, rnd() * 3, 0.34, 0.26, j < 3 ? rose(rnd) : jit(mixc(hex('#3f7a40'), hex('#7aa850'), rnd()), 0.04, rnd), 0.25, CELL.DAB, j < 3 ? 0.1 : 0, false, 0, 0.6, 0, j < 3 ? 0 : FLAG_LEAF);
        }
      }
      // the trees over the irises: thin trunks before the easel, their crowns closing the top of the canvas, dark red and green
      const crown = (r, u) => { const k = r(); return jit(k < 0.45 ? mixc(hex('#401c1e'), hex('#723226'), r()) : k < 0.9 ? mixc(hex('#27502a'), hex('#5c8c3a'), r() * (0.35 + 0.65 * u)) : hex('#9cb854'), 0.05, r); };
      const barkR = pal(['#5a2e36', '#6c3a3c', '#4a2a34', '#7a4640'], 0.04);
      for (const t of [[-22.4, 55.3, 3.3, 3.5], [-24.5, 61.2, 3.5, 3.7], [-19.4, 60.6, 3.2, 3.6], [-26, 67.8, 3.6, 3.9], [-10.7, 60.9, 3.4, 3.8], [-19, 69.7, 3.6, 4.0], [-23.7, 77.8, 3.8, 4.2], [-10.8, 69.1, 3.6, 4.0], [-36, 60.5, 3.4, 3.7], [-15, 80, 3.6, 4.2], [-37, 78, 3.5, 4],
        [-28.3, 60, 3.6, 3.6], [-28.3, 71.5, 3.8, 4.0], [-16.4, 55.2, 3.4, 3.6], [-26.2, 55.9, 3.2, 3.4]]) gardenTree(W, t[0], t[1], t[2], t[3], crown, barkR, V[3].x, V[3].z, 32, 1);
      // and more of them further off, in fewer and larger touches: their crowns hang lower in the picture and close it down to the house
      for (const t of [[-5.5, 66, 3.6, 3.8], [-6, 78, 3.8, 4.0], [-12, 88, 3.8, 4.0], [-20, 92, 3.8, 4.0], [-8, 57, 3.4, 3.7]]) gardenTree(W, t[0], t[1], t[2], t[3], crown, barkR, V[3].x, V[3].z, 17, 1.4);
      const tr = mulberry32(5503);
      for (const t of [[-36, 92], [-26, 102], [-46, 66], [-8, 100], [22, 62], [14, 84], [38, 78], [30, 100], [46, 58]]) roundTree(W, t[0] + tr() * 1.5, t[1] + tr() * 1.5, 3 + tr() * 1.2, 4.4 + tr() * 1.4, leaf, barkP, hex('#3a6a3c'), 330);
      house(W, { x: 0, z: 124, w: 42, d: 8, h: 6.4, rh: 4.2, yaw: 0, wall: pal(['#e8b0a0', '#f0c0b0', '#dca090', '#f4ccbc'], 0.03), wallBase: hex('#e6b0a0'), roof: pal(['#7a8494', '#8a92a0', '#6c7888'], 0.03), roofBase: hex('#7c8696'),
        windows: [0.08, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92].map((u) => ({ side: -1, u, v: 0.62, w: 1.1, h: 1.7 })).concat([{ side: -1, u: 0.5, v: 0.3, door: true, w: 1.4, h: 2.3 }]),
        win: pal(['#f4f0e0', '#e8e4d4'], 0.02), shut: pal(['#3f7a5c', '#4a8a68', '#346a50'], 0.03), door: pal(['#3f7a5c'], 0.03), step: 0.6, len: 1.4, wid: 0.46 });
    });
    // the water: touches laid across the way each easel looks, so that they lie level in its picture
    const wcol = pal(['#7a9aa0', '#86a69c', '#6a8e98', '#94b0a4', '#7a94b0', '#8a90b4'], 0.05);
    T.push(() => paintWater(W, { x0: -66, x1: 52, z0: -26, z1: 26, step: 1.05, len: 1.25, wid: 0.27, col: wcol, dir: (x) => (x < -6 || x > 28 ? 1.57 : 0.05), jit: 0.5, slide: 0.5, mask: (x, z) => pondF(x, z) < 1.0, size: () => 0.74 }));
    // and many more, small and short, over the water each canvas holds. n touches; tl and tw are the length and the thickness of one as the canvas shows it,
    // against the width of the canvas, at the bottom of the picture. Towards the top they are smaller, as the water goes away. One in five is laid down the canvas, for the reflections
    T.push(() => {
      const cells = [CELL.DAB, CELL.COMMA, CELL.COMMA_S, CELL.HEAVY, CELL.LONG_A, CELL.DAB];
      const wash = (v, n, tl, tw, y0, col) => {
        const eye = Math.max(W.h(v.x, v.z), WATER_Y) + v.y - WATER_Y;
        for (let i = 0; i < n; i++) {
          const py = lerp(y0, 1.08, rnd()), c = seen(W, v, -0.2 + 1.4 * rnd(), py);
          if (pondF(c[0], c[1]) > 1.0 || W.h(c[0], c[1]) > WATER_Y - 0.08) continue;
          // a touch on the water turns to the eye as the eye sinks towards the level, so its thickness is not always foreshortened
          const k = near(c[3]), sl = eye / c[3], turn = 0.92 * (1 - sstep(0.2, 0.8, sl)), far = 0.45 + 0.55 * clamp(py, 0, 1);
          const a = v.yaw + (rnd() < 0.2 ? 1.57 : 0) + (rnd() - 0.5) * 1.0;
          const len = clamp((tl * far * c[2]) / k, 0.4, 2.2) * (0.6 + 0.8 * rnd()), wid = clamp((tw * far * c[2]) / (k * lerp(sl, 1, turn)), 0.12, 0.6) * (0.7 + 0.6 * rnd());
          S.add(c[0], WATER_Y + 0.03 + rnd() * 0.05, c[1], Math.cos(a), 0, Math.sin(a), 0, 1, 0, len, wid, col(rnd), -0.5 * len, cells[(rnd() * cells.length) | 0], 0, FLAG_WATER);
        }
      };
      wash(V[0], 1500, 0.045, 0.009, 0.5, pal(['#8a9a6a', '#96a070', '#7a8a5c', '#a09468', '#8a7e5c', '#9aa47a'], 0.05));   // olive and brown under the willows
      wash(V[1], 1900, 0.05, 0.012, 0, pal(['#8a9cc0', '#96a8c8', '#7c92b8', '#a4b2cc', '#8c90c4', '#9c98c8'], 0.05));       // blue and lilac under the open sky
      wash(V[2], 2100, 0.05, 0.012, 0, pal(['#8e9cc0', '#9aa6c8', '#8290b8', '#a8b0cc', '#948ec4', '#a49ac8'], 0.05));
    });
    T.push(() => { for (const s of CH.spots) if (!s.noEasel) { const e = s.easel || [s.x + 1.2, s.z + 0.6]; easelProp(W, e[0], e[1], s.view.yaw); } });
    // last of all, so that everything above keeps its own draws: the willow of the hidden easel
    T.push(() => mourning(W));
    // and then the country round it all, which no easel sees
    T.push(() => clear(W, S.n));
    T.push(() => roadAndRail(W)); T.push(() => brook(W)); T.push(() => epte(W)); T.push(() => bounds(W)); T.push(() => farm(W)); T.push(() => village(W)); T.push(() => meadows(W)); T.push(() => folk(W));
    T.push(() => { if (typeof window !== 'undefined' && window.__pondHide) { for (let i = W._pondN0; i < S.n; i++) { S.sca[i * 4] = 0; S.sca[i * 4 + 1] = 0; } W.solidN = W._pondS0; W.casters.length = W._pondC0; } });
  }
  const CH = {
    id: 'pond', seed: 7004, build, height,
    start: { x: 30, z: 40, yaw: -0.75 }, center: [0, 34], radius: 118,
    sunPath: { rise: 80, set: 280, maxEl: 60 }, wind: [0.7, 0.4], canvas: '#e6e4d8', brushRot: 0.5, edge: 0.78,
    water: { tint: '#46748a', refl: 0.92 }, t0: 0.38, maxAlt: 30,
    swatch: ['#f0a0b8', '#5a9a6a', '#7a5ad0', '#3f8a6e'],
    // the trellis and its wisteria are flowers to the season: none in 1899, more with every year. In 1917 the sun stands higher, so that late in the day its gold still lies low on the water
    phases: [
      { year: '1899', cover: 0.4, flower: -0.1, veil: [1.1, 0.97, 0.78, 0.8], lift: 0.05 },
      { year: '1907', cover: 0.55, flower: 0.8, veil: [0.95, 1.04, 0.88, 0.8], lift: 0.06 },
      { year: '1917', cover: 0.6, flower: 0.9, len: 1.3, wid: 1.3, sat: 0.72, veil: [0.94, 0.94, 1.06, 0.3], el: 1.42, lift: 0.07 },
      { year: '1922', cover: 0.35, flower: 1, autumn: 0.85, leaf: 0.62, len: 1.6, wid: 1.5, soft: 0.8, sat: 0.8, veil: [1.04, 0.97, 0.76, 0.4], lift: 0.08 },
      { year: '1926', cover: 0.3, flower: 1, len: 1.15, wid: 1.15, sat: 0.62, veil: [0.96, 0.98, 1.06, 0.3], lift: 0.09 },
    ],
    // each of the years has its own air. They are told apart by the lift of their darks (0.05, 0.06 ... 0.09), which this hook then sets itself
    atmo(e, t, ph) {
      const yr = (i) => clamp(1 - Math.abs(ph.lift - 0.05 - 0.01 * i) * 100, 0, 1), day = clamp(e.sunI, 0, 1);
      const k07 = yr(1) * day, k17 = yr(2) * day, k22 = yr(3) * day, k26 = yr(4) * day;
      e.grade.lift = 0.05;
      // the water of the long panels is all mirror; under the willows of 1899 it takes their green; in 1922 it is dark
      e.waterRefl = 0.92 + (0.3 * yr(0) + 0.5 * yr(1) + 0.5 * yr(2) - 0.2 * yr(3) + 0.7 * yr(4)) * day;
      // 1907: a high pale sky, blue leaning to lilac, its cloud soft. The water is the colour of it
      if (k07 > 0.01) {
        e.sky[0] = mixc(e.sky[0], [0.44, 0.64, 0.92], 0.7 * k07); e.sky[1] = mixc(e.sky[1], [0.62, 0.74, 0.95], 0.7 * k07); e.sky[2] = mixc(e.sky[2], [0.78, 0.78, 0.96], 0.7 * k07);
        e.cloudLit = mixc(e.cloudLit, [0.9, 0.9, 0.98], 0.7 * k07); e.cloudShade = mixc(e.cloudShade, [0.72, 0.7, 0.92], 0.8 * k07);
        e.fog = mixc(e.fog, [0.74, 0.72, 0.9], 0.6 * k07); e.fogD *= 1 + 1.5 * k07; e.grade.bright *= 1 - 0.1 * k07;
      }
      // 1917: by day a dusk blue sky with white and rose cloud. Late in the day lilac and rose, and the gold of the sun
      if (k17 > 0.01) {
        const eve = sstep(0.6, 0.665, t), noon = k17 * (1 - eve), k = k17 * eve, v = ph.veil;
        e.sky[0] = mixc(e.sky[0], [0.26, 0.29, 0.5], 0.85 * noon); e.sky[1] = mixc(e.sky[1], [0.36, 0.39, 0.58], 0.85 * noon); e.sky[2] = mixc(e.sky[2], [0.58, 0.58, 0.72], 0.8 * noon); e.sky[3] = mixc(e.sky[3], [0.74, 0.72, 0.8], 0.8 * noon);
        e.cloudLit = mixc(e.cloudLit, [1.0, 0.96, 0.95], noon); e.cloudShade = mixc(e.cloudShade, [0.86, 0.72, 0.8], 0.9 * noon); e.cover = lerp(e.cover, 0.7, noon); e.grade.bright *= 1 - 0.06 * noon;
        e.sky[0] = mixc(e.sky[0], [0.34, 0.31, 0.5], 0.85 * k); e.sky[1] = mixc(e.sky[1], [0.44, 0.37, 0.55], 0.85 * k); e.sky[2] = mixc(e.sky[2], [0.52, 0.4, 0.52], 0.85 * k); e.sky[3] = mixc(e.sky[3], [0.56, 0.42, 0.5], 0.85 * k);
        e.haze = mixc(e.haze, [0.6, 0.45, 0.56], 0.7 * k); e.fog = mixc(e.fog, mixc([0.68, 0.68, 0.8], [0.56, 0.44, 0.58], eve), 0.7 * k17); e.fogD *= 1 + 2.5 * k17;
        e.amb = mixc(e.amb, mulc([0.62, 0.52, 0.8], lum3(e.amb) * 0.8), 0.6 * k);
        e.glow = mixc(e.glow, [1.3, 0.96, 0.2], 0.9 * k); e.glowT = lerp(e.glowT, 15, k); e.glowP = lerp(e.glowP, 0.95, k);
        e.cloudLit = mixc(e.cloudLit, [0.96, 0.72, 0.5], 0.6 * k); e.cloudShade = mixc(e.cloudShade, [0.5, 0.4, 0.56], 0.7 * k); e.cover = lerp(e.cover, 0.26, k);
        e.grade.veil = [lerp(v[0], 1.06, k), lerp(v[1], 0.98, k), lerp(v[2], 0.84, k), lerp(v[3], 0.5, k)]; e.grade.bright *= 1 - 0.22 * k; e.grade.sat *= 1 + 0.3 * k;
      }
      // 1922: his eyes were failing. Everything is ochre, red and brown, and the far side of the pond is lost in it
      if (k22 > 0.01) {
        for (let i = 0; i < 4; i++) e.sky[i] = mixc(e.sky[i], [1.0, 0.8, 0.28], 0.9 * k22);
        e.haze = mixc(e.haze, [0.7, 0.44, 0.2], 0.8 * k22); e.fog = mixc(e.fog, [0.46, 0.26, 0.14], 0.85 * k22); e.fogD *= 1 + 3 * k22;
        e.amb = mixc(e.amb, mulc([0.6, 0.36, 0.32], lum3(e.amb) * 0.8), 0.8 * k22); e.sun = mixc(e.sun, mulc([1.0, 0.8, 0.32], lum3(e.sun) * 1.1), 0.8 * k22);
        e.cloudLit = mixc(e.cloudLit, [1.0, 0.8, 0.34], 0.8 * k22); e.cloudShade = mixc(e.cloudShade, [0.64, 0.3, 0.16], 0.8 * k22);
        e.grade.bright *= 1 - 0.13 * k22; e.grade.contrast += 0.32 * k22;
      }
      // 1926: the morning panels. Lilac and blue with hardly a cloud, and a mist that takes the far bank
      if (k26 > 0.01) {
        const k = k26 * (1 - 0.45 * sstep(0.38, 0.5, t));
        e.sky[0] = mixc(e.sky[0], [0.66, 0.65, 0.86], 0.85 * k); e.sky[1] = mixc(e.sky[1], [0.68, 0.66, 0.87], 0.85 * k); e.sky[2] = mixc(e.sky[2], [0.7, 0.68, 0.87], 0.85 * k); e.sky[3] = mixc(e.sky[3], [0.72, 0.69, 0.86], 0.85 * k);
        e.amb = mulc(e.amb, 1 + 0.25 * k);
        e.haze = mixc(e.haze, [0.72, 0.7, 0.88], 0.8 * k); e.fog = mixc(e.fog, [0.72, 0.7, 0.88], 0.8 * k); e.fogD *= 1 + 3 * k;
        e.cloudLit = mixc(e.cloudLit, [0.86, 0.83, 0.95], 0.8 * k); e.cloudShade = mixc(e.cloudShade, [0.68, 0.66, 0.86], 0.8 * k); e.glowP *= 1 - 0.5 * k;
        e.grade.bright *= 1 - 0.1 * k; e.grade.contrast -= 0.06 * k;
      }
    },
    spots: [
      { x: -9.8, z: 0.5, noEasel: true, view: { x: -9.2, y: 1.85, z: 0.9, yaw: -1.5708, pitch: -0.045, fov: 43 } },
      { x: 12, z: 24.6, view: { x: 12, y: 2.5, z: 23.4, yaw: 0.12, pitch: -0.5, fov: 50 } },
      { x: 51.6, z: 0, view: { x: 50.4, y: 3.65, z: 0, yaw: -1.5708, pitch: -0.47, fov: 46 } },
      { x: -30, z: 50, view: { x: -31.7, y: 1.5, z: 51.5, yaw: 2.42, pitch: -0.05, fov: 55 } },
      // hidden: under the weeping willow in the east meadow, beyond the end of the pond
      { x: 88.1, z: 5.4, hidden: true, easel: [at(-0.9, 0.6)[0], at(-0.9, 0.6)[1]], view: WV },
    ],
    effects: [
      { id: 'p1', spot: 0, phase: 0, t0: 0.38, t1: 0.62 },
      { id: 'p2', spot: 3, phase: 0, t0: 0.4, t1: 0.64 },
      { id: 'p3', spot: 1, phase: 1, t0: 0.4, t1: 0.64 },
      { id: 'p4', spot: 2, phase: 2, t0: 0.42, t1: 0.6 },
      { id: 'p5', spot: 2, phase: 2, t0: 0.66, t1: 0.71 },
      { id: 'p6', spot: 0, phase: 3, t0: 0.36, t1: 0.66 },
      { id: 'p7', spot: 2, phase: 4, t0: 0.262, t1: 0.37 },
      { id: 'p8', spot: 4, phase: 2, t0: 0.62, t1: 0.72, hidden: true },
    ],
    need: 5, door: null,
  };
  // the ways of the place, for the sights: the railway, the road, and the walk from easel to easel (absolute heights)
  const lineOf = (pts, up) => pts.map((p) => [p[0], +(height(p[0], p[1]) + up).toFixed(2), p[1]]);
  const xs = []; for (let x = -260; x <= 260; x += 20) xs.push(x);
  CH.lines = {
    rail: lineOf(xs.map((x) => [x, RAIL_Z]), 0.65),
    road: lineOf(xs.map((x) => [x, roadZ(x)]), 0.45),
    walk: lineOf([[30, 40.9], [2, 40.9], [0, 36], [0, 29], [12, 26.6], [30, 25.2], [44, 20], [56, 9], [53, 0], [56, 9], [44, 20], [30, 25.2], [0, 29], [0, 44], [-30, 44], [-30, 50]], 0.1),
    paths: WALKS.map((w) => lineOf(w, 0.1)),
  };
  return CH;
})();
