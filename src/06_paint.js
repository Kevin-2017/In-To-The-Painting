// ---------- painters shared by the worlds. Colours here are local colours: the light comes later, in the shader ----------
function distSeg(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az, wx = px - ax, wz = pz - az;
  const t = clamp((wx * vx + wz * vz) / (vx * vx + vz * vz || 1), 0, 1);
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}
function pathDist(px, pz, pts) {
  let d = 1e9;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distSeg(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  return d;
}
function pathAngle(px, pz, pts) {
  let d = 1e9, a = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dd = distSeg(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (dd < d) { d = dd; a = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]); }
  }
  return a;
}
function contourAngle(W, x, z) {
  W.normalAt(x, z, _N);
  if (Math.abs(_N[0]) + Math.abs(_N[2]) < 0.015) return W.rnd() * TAU;
  return Math.atan2(_N[0], -_N[2]);
}

// ground strokes in three sizes: small touches where the walker goes (o.discs: [[x, z, r], ...]), larger ones around, the largest far off.
// g: {col(x,z,rnd), dir(x,z), mask(x,z,k)}
function groundRings(W, g, o) {
  W.ground = g;
  const cx = o.cx || 0, cz = o.cz || 0, r2 = o.r2;
  const discs = o.discs || [[cx, cz, o.r1]];
  const steps = o.steps || [1.0, 3.0, 10], lens = o.len || [1.4, 5.4, 21], wids = o.wid || [0.56, 1.9, 6.2], lifts = [0.05, 0.22, 0.7];
  const cells = o.cells || [CELL.DAB, CELL.HEAVY, CELL.COMMA, CELL.COMMA_S, CELL.LONG_A, CELL.BLOCK];
  const fine = (x, z) => { for (const d of discs) if ((x - d[0]) * (x - d[0]) + (z - d[1]) * (z - d[1]) < d[2] * d[2]) return true; return false; };
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const d of discs) { x0 = Math.min(x0, d[0] - d[2]); x1 = Math.max(x1, d[0] + d[2]); z0 = Math.min(z0, d[1] - d[2]); z1 = Math.max(z1, d[1] + d[2]); }
  const part = (k, ax, bx, az, bz, test) => W.tasks.push(() => paintGround(W, {
    x0: ax, x1: bx, z0: az, z1: bz, step: steps[k], len: lens[k], wid: wids[k], lift: lifts[k], dir: g.dir, jit: o.jit === undefined ? 0.5 : o.jit, cells,
    mask: (x, z) => (test(x, z) ? (g.mask ? g.mask(x, z, k) : 1) : 0), col: g.col,
  }));
  const n = Math.max(1, Math.ceil((x1 - x0) / 90));
  for (let i = 0; i < n; i++) part(0, x0 + ((x1 - x0) * i) / n, x0 + ((x1 - x0) * (i + 1)) / n, z0, z1, fine);
  const mid = (x, z) => !fine(x, z) && Math.hypot(x - cx, z - cz) < r2;
  part(1, cx - r2, cx, cz - r2, cz + r2, mid); part(1, cx, cx + r2, cz - r2, cz + r2, mid);
  const E = TERRAIN_R - 6, far = (x, z) => Math.hypot(x - cx, z - cz) >= r2;
  part(2, -E, 0, -E, E, far); part(2, 0, E, -E, E, far);
}

// the sky: neutral strokes on the dome. The shader gives them the colour of the hour and of the clouds that pass
function paintSky(W, o) {
  const S = W.S, rnd = W.rnd, R = 900, n = o.n || 5200;
  const sinMin = Math.sin(-4 * DEG);
  const cells = o.cells || [CELL.HEAVY, CELL.DAB, CELL.DAB, CELL.BLOCK, CELL.COMMA, CELL.COMMA_S];
  for (let i = 0; i < n; i++) {
    const y = sinMin + (1 - sinMin) * Math.pow(rnd(), o.bias || 1.25);
    const az = rnd() * TAU, c = Math.sqrt(Math.max(0, 1 - y * y));
    const d = [Math.sin(az) * c, y, -Math.cos(az) * c];
    // short touches laid every way, as he hatched a sky: nearer the level by the horizon, freer overhead, with a lean to one side
    let bx = -d[2], bz = d[0]; const bl = Math.hypot(bx, bz) || 1; bx /= bl; bz /= bl;
    const ux = -d[0] * d[1], uy = 1 - d[1] * d[1], uz = -d[2] * d[1];
    const spread = o.jit === undefined ? 0.9 + 2.0 * clamp(y * 2.2, 0, 1) : o.jit;
    const ang = (o.lean === undefined ? 0.3 : o.lean) + (rnd() - 0.5) * spread, ca = Math.cos(ang), sa = Math.sin(ang);
    const tx = bx * ca + ux * sa, ty = uy * sa, tz = bz * ca + uz * sa;
    const rr = R * (1 + (rnd() - 0.5) * 0.034), g = 0.5 + (rnd() - 0.5) * 0.08;
    S.add(d[0] * rr, d[1] * rr, d[2] * rr, tx, ty, tz, -d[0], -d[1], -d[2],
      (o.len || 31) * (0.6 + rnd() * 0.5 + rnd() * rnd() * 0.5), (o.wid || 17) * (0.65 + rnd() * 0.5 + rnd() * rnd() * 0.4),
      [g + (rnd() - 0.5) * 0.05, g, g + (rnd() - 0.5) * 0.05], -(o.slide || 60) * (0.6 + rnd() * 0.8), cells[(rnd() * cells.length) | 0], 0, FLAG_DOME);
  }
}
// o: x0,x1,z0,z1, step, len, wid, col(rnd), dir, jit, mask, size(x,z), slide
function paintWater(W, o) {
  const S = W.S, rnd = W.rnd, wy = W.waterY, step = o.step;
  const cells = o.cells || [CELL.LONG_A, CELL.HEAVY, CELL.DAB, CELL.COMMA_S, CELL.LONG_B];
  for (let z = o.z0; z < o.z1; z += step) for (let x = o.x0; x < o.x1; x += step) {
    const px = x + rnd() * step, pz = z + rnd() * step;
    if (o.mask && !o.mask(px, pz)) continue;
    if (Math.abs(px) > TERRAIN_R - 3 || Math.abs(pz) > TERRAIN_R - 3 || W.h(px, pz) > wy - 0.08) continue;
    const a = (typeof o.dir === 'function' ? o.dir(px, pz) : (o.dir || 0)) + (rnd() - 0.5) * (o.jit === undefined ? 0.3 : o.jit);
    const sz = o.size ? o.size(px, pz) : 1, len = o.len * sz * (0.6 + rnd() * 0.9);
    S.add(px, wy + 0.03 + rnd() * 0.05, pz, Math.cos(a), 0, Math.sin(a), 0, 1, 0, len, o.wid * sz * (0.7 + rnd() * 0.6), o.col(rnd), -(o.slide === undefined ? 0.7 : o.slide) * len, cells[(rnd() * cells.length) | 0], 0, FLAG_WATER);
  }
}
function waterRings(W, o) {
  const cx = o.cx || 0, cz = o.cz || 0, r1 = o.r1, r2 = o.r2, T = W.tasks;
  const ring = (step, len, wid, x0, x1, z0, z1, rin, rout) => T.push(() => paintWater(W, { x0, x1, z0, z1, step, len, wid, col: o.col, dir: o.dir, jit: o.jit, slide: o.slide,
    mask: (x, z) => { const r = Math.hypot(x - cx, z - cz); return r >= rin && r < rout && (!o.mask || o.mask(x, z)); } }));
  const b = o.box || [-TERRAIN_R + 6, TERRAIN_R - 6, -TERRAIN_R + 6, TERRAIN_R - 6];
  const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  ring(o.step || 0.85, 1.5, 0.36, cl(cx - r1, b[0], b[1]), cl(cx, b[0], b[1]), cl(cz - r1, b[2], b[3]), cl(cz + r1, b[2], b[3]), 0, r1);
  ring(o.step || 0.85, 1.5, 0.36, cl(cx, b[0], b[1]), cl(cx + r1, b[0], b[1]), cl(cz - r1, b[2], b[3]), cl(cz + r1, b[2], b[3]), 0, r1);
  ring(2.8, 5.4, 1.1, cl(cx - r2, b[0], b[1]), cl(cx + r2, b[0], b[1]), cl(cz - r2, b[2], b[3]), cl(cz + r2, b[2], b[3]), r1, r2);
  ring(9.5, 21, 3.6, b[0], b[1], b[2], b[3], r2, 1e9);
}

// ---------- vegetation ----------
// leaves hung on a trunk; each dab remembers which way is out, so the shader can light the crown
function leafCloud(W, cx, cy, cz, o) {
  const S = W.S, rnd = W.rnd;
  const cells = o.cells || [CELL.DAB, CELL.COMMA, CELL.COMMA_S, CELL.HEAVY];
  if (o.core) blobSolid(W, cx, cy, cz, o.rx * 0.58, o.ry * 0.58, o.rz * 0.58, o.core, o.evergreen ? 0 : 1);
  for (let i = 0; i < o.n; i++) {
    let x = rnd() * 2 - 1, y = rnd() * 2 - 1, z = rnd() * 2 - 1;
    const l = Math.hypot(x, y, z) || 1, r = 0.5 + 0.5 * Math.pow(rnd(), 0.6);
    x = (x / l) * r; y = (y / l) * r; z = (z / l) * r;
    if (y < 0 && rnd() < 0.45) y = -y;
    const sz = o.size * (0.55 + rnd() * 0.8);
    S.bill(cx + x * o.rx, cy + y * o.ry, cz + z * o.rz, (rnd() - 0.5) * 0.9, sz * (o.aspect || 1.8), sz, o.col(rnd, y * 0.5 + 0.5), o.sway === undefined ? 0.2 : o.sway, cells[(rnd() * cells.length) | 0], 0, false,
      x * o.rx, y * o.ry + 0.3 * o.ry, z * o.rz, o.flags === undefined ? FLAG_LEAF : o.flags);
  }
}
function twigs(W, x, y, z, n, len, col) {
  const S = W.S, rnd = W.rnd;
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU, out = 0.3 + rnd() * 0.6, l = len * (0.6 + rnd() * 0.7);
    S.add(x + Math.cos(a) * out * l * 0.42, y + l * 0.4, z + Math.sin(a) * out * l * 0.42, Math.cos(a) * out, 1, Math.sin(a) * out, 1, 0, 0, l, 0.07 + rnd() * 0.05, col(rnd), 0.2, rnd() < 0.5 ? CELL.TWIG : CELL.LONG_B, 0, FLAG_AXIAL);
  }
}
function roundTree(W, x, z, r, h, leaf, bark, core, n) {
  const y = W.h(x, z), rnd = W.rnd;
  trunk(W, x, y, z, h + r * 0.4, r * 0.1 + 0.1, bark, [(rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5]);
  twigs(W, x, y + h, z, 9, r * 1.25, bark);
  twigs(W, x, y + h + r * 0.45, z, 8, r * 0.9, bark);
  leafCloud(W, x, y + h + r * 0.5, z, { n: n || Math.round(80 + r * 40), rx: r, ry: r * 0.8, rz: r, size: r * 0.22, col: leaf, core });
  W.caster({ k: 'ball', x, z, y: h + r * 0.5, r: r * 0.95, v: 0.8 }); W.caster({ k: 'pole', x, z, h, r: 0.25, v: 0.8 });
  W.collide(x, z, 0.6);
}
// the tall poplars of the Epte: a thin shaft and a feathered spindle of leaves
function poplar(W, x, z, h, leaf, bark, o) {
  o = o || {};
  const y = W.h(x, z), rnd = W.rnd, S = W.S, from = o.from === undefined ? 0.42 : o.from, rad = o.rad || 1.7;
  const lean = [(rnd() - 0.5) * 0.8, (rnd() - 0.5) * 0.8];
  trunk(W, x, y, z, h * 0.97, o.shaft || 0.12, bark, lean, Math.round(h / 1.5));
  for (let i = 0; i < 7; i++) { const t = from + (1 - from) * rnd(); twigs(W, x + lean[0] * t, y + t * h - 0.6, z + lean[1] * t, 1, 1.5, bark); }
  const n = o.n || Math.round(h * 12);
  for (let i = 0; i < n; i++) {
    const u = Math.pow(rnd(), 0.9), t = from + (1 - from) * u;
    const r = rad * Math.pow(Math.sin(Math.PI * clamp(0.1 + 0.86 * u, 0, 1)), 0.8) * Math.sqrt(rnd()), a = rnd() * TAU;
    const ox = Math.cos(a) * r, oz = Math.sin(a) * r, s = (0.3 + rnd() * 0.34) * (0.75 + rad * 0.16);
    S.bill(x + lean[0] * t + ox, y + t * h, z + lean[1] * t + oz, (rnd() - 0.5) * 0.9, s * 1.8, s, leaf(rnd, u), 0.35, rnd() < 0.5 ? CELL.DAB : CELL.COMMA, 0, false, ox, 0.4 + u * 0.7, oz, FLAG_LEAF);
  }
  W.caster({ k: 'ball', x, z, y: h * (from + 1) / 2, r: rad * 0.85, v: 0.75 }); W.caster({ k: 'pole', x, z, h: h * 0.6, r: 0.2, v: 0.8 });
  W.collide(x, z, 0.4);
}
function bush(W, x, z, r, leaf, core) {
  leafCloud(W, x, W.h(x, z) + r * 0.55, z, { n: Math.round(26 + r * 22), rx: r, ry: r * 0.62, rz: r, size: r * 0.26, col: leaf, core });
  W.caster({ k: 'ball', x, z, y: r * 0.5, r: r * 0.9, v: 0.75 });
}
// a weeping willow: curtains of yellow green strokes hanging to the water
function willow(W, x, z, h, r, leaf, bark) {
  const y = W.h(x, z), rnd = W.rnd, S = W.S;
  trunk(W, x, y, z, h * 0.62, 0.4, bark, [(rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.6], 4);
  twigs(W, x, y + h * 0.55, z, 9, h * 0.4, bark);
  blobSolid(W, x, y + h * 0.72, z, r * 0.5, h * 0.2, r * 0.5, [0.2, 0.32, 0.16], 1);
  const n = Math.round(r * r * 9);
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU, q = Math.sqrt(rnd()), rr = r * q;
    const top = y + h * 0.66 + (1 - q * q) * h * 0.34;
    const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, floor = Math.max(W.h(px, pz), W.waterY === null ? -1e9 : W.waterY) + 0.25;
    const L = Math.max(1.2, (top - floor) * (0.35 + 0.65 * rnd()) * (0.4 + 0.6 * q));
    S.add(px, top - L * 0.5, pz, (rnd() - 0.5) * 0.12, -1, (rnd() - 0.5) * 0.12, Math.cos(a), 0.3, Math.sin(a), L, 0.2 + rnd() * 0.16, leaf(rnd, q), 0.5, rnd() < 0.6 ? CELL.LONG_B : CELL.BLADE, 0, FLAG_AXIAL | FLAG_LEAF);
  }
  W.caster({ k: 'ball', x, z, y: h * 0.55, r: r * 0.92, v: 0.72 });
  W.collide(x, z, 0.8);
}
// upright crop: grass, wheat, reeds. o: x0,x1,z0,z1, step, mask, h, w, col(x,z,rnd), sway, cells, lean, cluster, spread, flags
function paintCrop(W, o) {
  const S = W.S, rnd = W.rnd, step = o.step;
  const cells = o.cells || [CELL.LONG_A, CELL.COMMA, CELL.COMMA_S, CELL.BLADE, CELL.HEAVY];
  const cl = o.cluster || 1, spread = o.spread === undefined ? 0.22 : o.spread, lean = o.lean === undefined ? 0.3 : o.lean;
  const wd = o.wind || W.wind || [0.8, 0.5], flags = o.flags === undefined ? (FLAG_AXIAL | FLAG_GROUND | FLAG_GRASS) : o.flags;
  for (let z = o.z0; z < o.z1; z += step) for (let x = o.x0; x < o.x1; x += step) {
    const bx = x + rnd() * step, bz = z + rnd() * step;
    const m = o.mask ? o.mask(bx, bz) : 1;
    if (m <= 0 || (m < 1 && rnd() > m)) continue;
    const sz = o.size ? o.size(bx, bz) : 1;
    const bend = 0.2 + 0.4 * vnoise(bx * 0.045, bz * 0.045, 55);
    for (let k = 0; k < cl; k++) {
      const px = bx + (cl > 1 ? (rnd() - 0.5) * spread * 2 : 0), pz = bz + (cl > 1 ? (rnd() - 0.5) * spread * 2 : 0);
      const c = o.col(px, pz, rnd);
      if (!c) continue;
      const h = o.h * sz * (0.7 + rnd() * 0.6), y = W.h(px, pz);
      const lx = wd[0] * bend + (rnd() - 0.5) * lean, lz = wd[1] * bend + (rnd() - 0.5) * lean;
      S.add(px + lx * h * 0.4, y + h * 0.48 - 0.03, pz + lz * h * 0.4, lx, 1, lz, 1, 0, 0, h * 1.08, o.w * sz * (0.7 + rnd() * 0.6), c, o.sway === undefined ? 0.3 : o.sway, cells[(rnd() * cells.length) | 0], 0, flags);
    }
  }
}
// flowers as dabs of pure colour held just above the grass. o: x0,x1,z0,z1, step, mask, h, size, col(rnd), season (comes and goes), glow
function flowers(W, o) {
  const S = W.S, rnd = W.rnd, step = o.step, fl = o.season === false ? 0 : FLAG_FLOWER;
  for (let z = o.z0; z < o.z1; z += step) for (let x = o.x0; x < o.x1; x += step) {
    const px = x + rnd() * step, pz = z + rnd() * step;
    const m = o.mask ? o.mask(px, pz) : 1;
    if (m <= 0 || (m < 1 && rnd() > m)) continue;
    const y = W.h(px, pz) + o.h * (0.7 + rnd() * 0.6), s = o.size * (0.7 + rnd() * 0.7);
    S.bill(px, y, pz, rnd() * 3, s * (o.aspect || 1.45), s * 0.9, o.col(rnd), 0.25, [CELL.DAB, CELL.COMMA, CELL.COMMA_S, CELL.DOT][(rnd() * 4) | 0], o.glow === undefined ? 0.1 : o.glow, false, 0, 0.6, 0, fl);
  }
}
// the round leaves of the water lilies, and their flowers
function lilyPads(W, cx, cz, r, n, pad, bloom, ang) {
  const S = W.S, rnd = W.rnd, wy = W.waterY, ca = Math.cos(ang || 0), sa = Math.sin(ang || 0);
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU, q = Math.sqrt(rnd()) * r, lx = Math.cos(a) * q * 1.6, lz = Math.sin(a) * q * 0.7, x = cx + lx * ca - lz * sa, z = cz + lx * sa + lz * ca;
    if (W.h(x, z) > wy - 0.1) continue;
    const s = 0.45 + rnd() * 0.5, ang = rnd() * TAU;
    // a leaf lies flat on the water and keeps to it: seen across the pond it is a long thin ellipse
    S.add(x, wy + 0.07 + rnd() * 0.03, z, Math.cos(ang), 0, Math.sin(ang), 0, 1, 0, s * 1.3, s, pad(rnd), 0, rnd() < 0.7 ? CELL.DOT : CELL.DAB, 0, FLAG_FLAT);
    if (rnd() < 0.3) { const bs = 0.13 + rnd() * 0.1; S.bill(x + (rnd() - 0.5) * 0.3, wy + 0.13, z + (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.8, bs * 1.5, bs, bloom(rnd), 0, rnd() < 0.5 ? CELL.DAB : CELL.COMMA, 0.16, false, 0, 0.6, 0, FLAG_FLOWER); }
  }
}

// ---------- built things ----------
function house(W, o) {
  const y0 = (o.y0 === undefined ? W.h(o.x, o.z) : o.y0) - 0.3, yaw = o.yaw || 0;
  box(W, { x: o.x, z: o.z, w: o.w, d: o.d, y0, h: o.h + 0.3, yaw, wall: o.wall, base: o.wallBase, step: o.step || 0.5, len: o.len || 1.15, wid: o.wid || 0.4, along: o.along, cells: o.cells });
  if (o.hip) pyramid(W, { x: o.x, z: o.z, w: o.w + 0.8, d: o.d + 0.8, y: y0 + o.h + 0.3, h: o.rh, yaw, roof: o.roof, base: o.roofBase, step: o.step || 0.5, len: o.len || 1.15, wid: o.wid || 0.4 });
  else gableRoof(W, { x: o.x, z: o.z, w: o.w, d: o.d, y: y0 + o.h + 0.3, rh: o.rh, yaw, roof: o.roof, base: o.roofBase, gable: o.wall, gableBase: o.wallBase, step: o.step || 0.5, len: o.len || 1.15, wid: o.wid || 0.4, along: o.roofAlong || 'v', over: o.over });
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const w of o.windows || []) {
    const side = w.side || 1;
    let lx, lz, nx, nz;
    if (Math.abs(side) === 1) { lx = (w.u - 0.5) * o.w; lz = (side * o.d) / 2; nx = -s * side; nz = c * side; }
    else { lx = (Math.sign(side) * o.w) / 2; lz = (w.u - 0.5) * o.d; nx = c * Math.sign(side); nz = s * Math.sign(side); }
    const p = rotXZ(o.x, o.z, lx, lz, yaw), py = y0 + 0.3 + w.v * o.h, ww = w.w || 0.9, wh = w.h || 1.25;
    if (w.door) { panel(W, p[0], y0 + 0.3 + wh / 2, p[1], nx, nz, ww, wh, o.door(W.rnd), 0); continue; }
    panel(W, p[0], py, p[1], nx, nz, ww, wh, o.win(W.rnd), 0);
    if (o.shut) {
      const tx = -nz, tz = nx;
      panel(W, p[0] + tx * (ww * 0.5 + 0.2), py, p[1] + tz * (ww * 0.5 + 0.2), nx, nz, 0.36, wh, o.shut(W.rnd), 0);
      panel(W, p[0] - tx * (ww * 0.5 + 0.2), py, p[1] - tz * (ww * 0.5 + 0.2), nx, nz, 0.36, wh, o.shut(W.rnd), 0);
    }
  }
  const hw = o.w / 2, hd = o.d / 2;
  W.caster({ k: 'box', pts: [[hw, hd], [hw, -hd], [-hw, -hd], [-hw, hd]].map((l) => rotXZ(o.x, o.z, l[0], l[1], yaw)), h: o.h + o.rh * 0.6 });
  const L = Math.max(o.w, o.d), Sd = Math.min(o.w, o.d), n = Math.max(1, Math.round(L / Sd)), span = L - Sd;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? (i / (n - 1) - 0.5) * span : 0;
    const p = o.w >= o.d ? rotXZ(o.x, o.z, t, 0, yaw) : rotXZ(o.x, o.z, 0, t, yaw);
    W.collide(p[0], p[1], Sd * 0.5 + 0.25);
  }
}
// a grainstack: a low round body under a full thatched cap, laid in short crossed touches
function haystack(W, x, z, s, straw, base) {
  const y0 = W.h(x, z) - 0.3, R = 3.1 * s, bodyH = 2.3 * s, capH = 3.3 * s, rnd = W.rnd;
  const prof = [[0, 0.88], [0.2, 0.95], [0.38, 1.0], [0.45, 1.06], [0.62, 0.84], [0.8, 0.5], [0.93, 0.2], [1.0, 0.03]]; // height fraction, radius fraction
  const H = bodyH + capH, sides = 14;
  for (let k = 0; k < prof.length - 1; k++) {
    const a = prof[k], b = prof[k + 1], cap = k >= 3;
    tower(W, { x, z, y0: y0 + a[0] * H, y1: y0 + b[0] * H, r0: R * a[1], r1: R * b[1], sides, wall: straw, base, step: cap ? 0.32 : 0.3, len: cap ? 0.7 : 0.6, wid: 0.27, along: 'v', jit: cap ? 0.9 : 1.6,
      cells: [CELL.HEAVY, CELL.DAB, CELL.COMMA, CELL.COMMA_S, CELL.LONG_A] });
  }
  // loose straw at the foot
  for (let i = 0; i < 40; i++) { const a = rnd() * TAU, r = R * (0.9 + rnd() * 0.5); W.S.add(x + Math.cos(a) * r, y0 + 0.36, z + Math.sin(a) * r, Math.cos(a + 1.3), 0.12, Math.sin(a + 1.3), 0, 1, 0, 0.7 + rnd() * 0.5, 0.2, straw(rnd), 0, CELL.LONG_B, 0, FLAG_GROUND); }
  W.caster({ k: 'cone', x, z, r: R * 1.1, h: H * 0.96 });
  W.collide(x, z, R * 1.14);
}
// a small sailing boat on the water. o: hull, sail (palettes), sails 1 or 2
function sailboat(W, x, z, yaw, s, o) {
  const wy = W.waterY, c = Math.cos(yaw), sn = Math.sin(yaw), rnd = W.rnd;
  box(W, { x, z, w: 5.2 * s, d: 1.5 * s, y0: wy - 0.25, h: 0.85 * s, yaw, wall: o.hull, base: o.hullBase || [0.2, 0.2, 0.24], step: 0.4, len: 1.2, wid: 0.28, wobble: 0 });
  const mx = x + c * 0.5 * s, mz = z + sn * 0.5 * s, top = wy + 7.6 * s;
  W.S.add(mx, wy + 3.9 * s, mz, 0, 1, 0, 1, 0, 0, 7.6 * s, 0.1 * s, [0.3, 0.26, 0.22], 0, CELL.HEAVY, 0, FLAG_AXIAL);
  const sail = (ax, bx, cy) => { // triangle in the plane of the boat: foot from ax to bx along the hull, peak at the mast
    const a = [mx + c * ax * s, wy + 1.0 * s, mz + sn * ax * s], b = [mx + c * bx * s, wy + 1.0 * s, mz + sn * bx * s], p = [mx + sn * 0.2, wy + cy * s, mz - c * 0.2];
    W.tri(a, b, p, [0.86, 0.84, 0.8]);
    paintQuad(W, a, b, p, p, { step: 0.42 * s, len: 1.2 * s, wid: 0.34 * s, along: 'v', col: o.sail, lift: 0.04, jit: 0.3 });
    paintQuad(W, b, a, p, p, { step: 0.6 * s, len: 1.2 * s, wid: 0.34 * s, along: 'v', col: o.sail, lift: 0.04, jit: 0.3 });
  };
  if (o.furled) { // at her mooring: the sail rolled along the boom, the mast bare
    const a = [mx - c * 0.2 * s, wy + 1.5 * s, mz - sn * 0.2 * s], b = [mx - c * 3.1 * s, wy + 1.75 * s, mz - sn * 3.1 * s];
    W.S.add((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, b[0] - a[0], b[1] - a[1], b[2] - a[2], 0, 1, 0, 3.0 * s, 0.34 * s, o.sail(rnd), 0, CELL.LONG_A, 0, FLAG_AXIAL);
    W.S.add(mx + c * 1.2 * s, wy + 4.2 * s, mz + sn * 1.2 * s, c * 2.4 * s, -6.4 * s, sn * 2.4 * s, 1, 0, 0, 6.9 * s, 0.05 * s, [0.34, 0.3, 0.26], 0, CELL.LONG_B, 0, FLAG_AXIAL);
  } else {
    sail(-0.1, -2.9, 7.3);
    if ((o.sails || 2) > 1) sail(0.25, 2.5, 6.0);
  }
  W.collide(x, z, 2 * s);
}
function rowboat(W, x, z, yaw, s, col, crew) {
  const wy = W.waterY, S = W.S, rnd = W.rnd, c = Math.cos(yaw), sn = Math.sin(yaw);
  box(W, { x, z, w: 4.2 * s, d: 1.3 * s, y0: wy - 0.2, h: 0.6 * s, yaw, wall: col, base: [0.16, 0.18, 0.24], step: 0.4, len: 1.1, wid: 0.26, wobble: 0 });
  for (let i = 0; i < (crew || 0); i++) {
    const px = x + c * (i ? -1.0 : 0.6) * s, pz = z + sn * (i ? -1.0 : 0.6) * s;
    S.add(px, wy + (i ? 0.9 : 1.2) * s, pz, 0, 1, 0, 1, 0, 0, (i ? 0.9 : 1.5) * s, 0.42 * s, col(rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL);
    S.bill(px, wy + (i ? 1.45 : 2.05) * s, pz, 0, 0.34 * s, 0.32 * s, col(rnd), 0, CELL.DOT, 0, false, 0, 1, 0, 0);
  }
}
// a standing figure in a few strokes. o: dress, top, hat (colours), parasol (colour or null)
// (when the living layer is on, FOLK.live, nothing is painted here: the figure is put on the world's list, W.folk, with the very
// colours it would have had, and that layer draws it every frame, at this mark and in this pose whenever a picture is being taken)
function person(W, x, z, yaw, o) {
  const rnd = W.rnd, y = o.y === undefined ? W.h(x, z) : o.y, s = o.s || 1;
  const rec = typeof FOLK !== 'undefined' && FOLK.live ? { x, y, z, yaw, s, o, cols: [], seeds: [] } : null;
  // the same draws of chance either way, of colour and of each stroke's own seed, so that the rest of the world is painted exactly as before
  const S = rec ? { add(...a) { rec.cols.push(a[11]); rec.seeds.push(W.S.rnd()); }, bill() { rec.seeds.push(W.S.rnd()); } } : W.S;
  if (rec) (W.folk || (W.folk = [])).push(rec);
  for (let i = 0; i < 4; i++) { const a = yaw + i * 1.57; S.add(x + Math.cos(a) * 0.14 * s, y + 0.5 * s, z + Math.sin(a) * 0.14 * s, Math.cos(a) * 0.16, 1, Math.sin(a) * 0.16, Math.cos(a), 0.2, Math.sin(a), 1.0 * s, 0.34 * s, jit(o.dress, 0.04, rnd), 0.05, CELL.BLADE, 0, 0); }
  S.add(x, y + 1.18 * s, z, 0, 1, 0, 1, 0, 0, 0.5 * s, 0.34 * s, jit(o.top || o.dress, 0.04, rnd), 0, CELL.DAB, 0, FLAG_AXIAL);
  S.bill(x, y + 1.52 * s, z, 0, 0.2 * s, 0.2 * s, [0.86, 0.68, 0.56], 0, CELL.DOT, 0, false, 0, 1, 0, 0);
  S.bill(x, y + 1.64 * s, z, 0, 0.42 * s, 0.14 * s, o.hat || [0.85, 0.75, 0.45], 0, CELL.DAB, 0, false, 0, 1, 0, 0);
  if (o.parasol) {
    const px = x + Math.cos(yaw) * 0.25 * s, pz = z + Math.sin(yaw) * 0.25 * s, py = y + 2.15 * s;
    S.add(px, y + 1.75 * s, pz, 0, 1, 0, 1, 0, 0, 0.9 * s, 0.03, [0.3, 0.26, 0.2], 0, CELL.LONG_B, 0, FLAG_AXIAL);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; S.add(px + Math.cos(a) * 0.3 * s, py - 0.07 * s, pz + Math.sin(a) * 0.3 * s, Math.cos(a), -0.35, Math.sin(a), Math.cos(a) * 0.35, 1, Math.sin(a) * 0.35, 0.62 * s, 0.34 * s, jit(o.parasol, 0.05, rnd), 0, CELL.LEAF, 0, 0); }
  }
}
// rail and post fence along a polyline
function fence(W, pts, colFn, h) {
  const S = W.S, rnd = W.rnd; h = h || 1.0;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 2.2));
    const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
    for (let i = 0; i <= n; i++) {
      const x = a[0] + (b[0] - a[0]) * (i / n), z = a[1] + (b[1] - a[1]) * (i / n), y = W.h(x, z);
      S.add(x, y + h * 0.5, z, (rnd() - 0.5) * 0.12, 1, (rnd() - 0.5) * 0.12, 1, 0, 0, h * (0.9 + rnd() * 0.25), 0.13, colFn(rnd), 0, CELL.HEAVY, 0, FLAG_AXIAL);
      if (i < n) {
        const x2 = x + dx * (L / n) * 0.5, z2 = z + dz * (L / n) * 0.5, y2 = W.h(x2, z2);
        for (let r = 0; r < 2; r++) S.add(x2, y2 + h * (0.42 + r * 0.38) + (rnd() - 0.5) * 0.06, z2, dx, (rnd() - 0.5) * 0.06, dz, -dz, 0, dx, (L / n) * 1.12, 0.1, colFn(rnd), 0, CELL.LONG_B, 0, 0);
      }
    }
  }
}
// the little easel that marks a place where he stood
function easelProp(W, x, z, yaw, y0) {
  const S = W.S, y = y0 === undefined ? W.h(x, z) : y0, nx = Math.sin(yaw), nz = -Math.cos(yaw), tx = -nz, tz = nx, wood = [0.42, 0.32, 0.22];
  const k0 = S.n;
  for (let k = -1; k <= 1; k += 2) S.add(x + tx * k * 0.3, y + 0.8, z + tz * k * 0.3, tx * k * -0.14 + nx * 0.12, 1, tz * k * -0.14 + nz * 0.12, 1, 0, 0, 1.7, 0.07, wood, 0, CELL.HEAVY, 0, FLAG_AXIAL);
  S.add(x - nx * 0.4, y + 0.78, z - nz * 0.4, nx * 0.42, 1, nz * 0.42, 1, 0, 0, 1.6, 0.07, wood, 0, CELL.HEAVY, 0, FLAG_AXIAL);
  S.add(x + nx * 0.06, y + 1.25, z + nz * 0.06, tx, 0, tz, -nx, 0.15, -nz, 0.7, 0.5, [0.93, 0.9, 0.82], 0, CELL.RECT, 0.25, 0);
  S.mark(k0);
}
// birds as two wing strokes
function drawBird(S, x, y, z, heading, flap, size, col) {
  const sx = Math.cos(heading), sz = Math.sin(heading);
  const c = Math.cos(flap), s = Math.sin(flap);
  for (let k = -1; k <= 1; k += 2) {
    const ax = sx * c * k, ay = s, az = sz * c * k;
    S.add(x + ax * size * 0.45, y + ay * size * 0.45, z + az * size * 0.45, ax, ay, az, 0, 1, 0, size, size * 0.42, col, 0, CELL.LEAF, 0, 0);
  }
}
