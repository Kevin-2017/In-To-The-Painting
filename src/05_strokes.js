// ---------- stroke buffers ----------
class Strokes {
  constructor(max) {
    this.max = max; this.n = 0; this.dropped = 0;
    this.pos = new Float32Array(max * 4);
    this.quat = new Float32Array(max * 4);
    this.sca = new Float32Array(max * 4);
    this.col = new Float32Array(max * 4);
    this.keep = new Uint8Array(max); // strokes that must survive thinning: windows, doors, stars, small props
    this.rnd = mulberry32(777);
  }
  clear() { this.n = 0; }
  // oriented stroke: long axis d, face normal n (made perpendicular here)
  add(x, y, z, dx, dy, dz, nx, ny, nz, len, wid, c, motion, cell, glow, flags) {
    if (this.n >= this.max) { this.dropped++; return; }
    const i = this.n++ * 4;
    let l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
    let k = nx * dx + ny * dy + nz * dz; nx -= dx * k; ny -= dy * k; nz -= dz * k;
    l = Math.hypot(nx, ny, nz);
    if (l < 1e-5) {
      if (Math.abs(dy) < 0.9) { nx = -dz; ny = 0; nz = dx; } else { nx = 1; ny = 0; nz = 0; k = dx; nx -= dx * k; ny -= dy * k; nz -= dz * k; }
      l = Math.hypot(nx, ny, nz) || 1;
    }
    nx /= l; ny /= l; nz /= l;
    const ax = ny * dz - nz * dy, ay = nz * dx - nx * dz, az = nx * dy - ny * dx; // width axis = n x d
    setQuat(this.quat, i, dx, dy, dz, ax, ay, az, nx, ny, nz);
    this.pos[i] = x; this.pos[i + 1] = y; this.pos[i + 2] = z; this.pos[i + 3] = motion || 0;
    this.sca[i] = len; this.sca[i + 1] = wid; this.sca[i + 2] = (cell || 0) + 16 * (flags || 0); this.sca[i + 3] = this.rnd();
    this.col[i] = c[0]; this.col[i + 1] = c[1]; this.col[i + 2] = c[2]; this.col[i + 3] = glow || 0;
  }
  // camera facing dab; roll in radians
  bill(x, y, z, roll, len, wid, c, motion, cell, glow, dome, px, py, pz, extra) {
    if (this.n >= this.max) { this.dropped++; return; }
    const i = this.n++ * 4;
    this.quat[i] = roll; this.quat[i + 1] = px || 0; this.quat[i + 2] = py || 0; this.quat[i + 3] = pz || 0;
    this.pos[i] = x; this.pos[i + 1] = y; this.pos[i + 2] = z; this.pos[i + 3] = motion || 0;
    this.sca[i] = len; this.sca[i + 1] = wid; this.sca[i + 2] = (cell || 0) + 16 * (FLAG_BILL | (dome ? FLAG_DOME : 0) | (extra || 0)); this.sca[i + 3] = this.rnd();
    this.col[i] = c[0]; this.col[i + 1] = c[1]; this.col[i + 2] = c[2]; this.col[i + 3] = glow || 0;
  }
  mark(from) { for (let i = from; i < this.n; i++) this.keep[i] = 1; }
  // what was painted from this index on rides the water (a hull, its mast and sail, a buoy): the shader lifts and rolls it with the swell.
  // The solid underpainting laid down with those strokes floats with them
  float(from) {
    const S = this.sca, F = 16 * FLAG_FLOAT;
    for (let i = from; i < this.n; i++) { const o = i * 4 + 2; if (!(Math.floor(S[o] / 16) & FLAG_FLOAT)) S[o] += F; }
    if (this.world) this.world._floatSolids(from);
  }
  swap(i, j) {
    const P = this.pos, Q = this.quat, S = this.sca, C = this.col, a = i * 4, b = j * 4;
    for (let k = 0; k < 4; k++) {
      let t = P[a + k]; P[a + k] = P[b + k]; P[b + k] = t;
      t = Q[a + k]; Q[a + k] = Q[b + k]; Q[b + k] = t;
      t = S[a + k]; S[a + k] = S[b + k]; S[b + k] = t;
      t = C[a + k]; C[a + k] = C[b + k]; C[b + k] = t;
    }
    const t = this.keep[i]; this.keep[i] = this.keep[j]; this.keep[j] = t;
  }
  // kept strokes first, the rest in random order, so a prefix of the buffer is an even thinning and morph partners are scattered
  // the order the strokes are drawn in. Those marked to be kept come first. The rest follow in the order of their own seeds (not
  // in an order drawn afresh for the whole buffer): so a stroke keeps its place whatever is added to the world after it, and the part
  // of a painting that is drawn at the lower qualities, and the part that is mirrored in the water, stay the same when the land
  // elsewhere is reworked. (The seeds are as good as random, so the order is still a shuffle.)
  shuffle() {
    const n = this.n;
    let front = 0;
    for (let i = 0; i < n; i++) if (this.keep[i]) { if (i !== front) this.swap(i, front); front++; }
    const m = n - front;
    if (m < 2) return;
    // a counting sort on the seed, 65536 steps fine: stable, so equal steps stay in the order they were laid
    const NB = 65536, count = new Uint32Array(NB + 1), bucket = new Uint16Array(m), S = this.sca;
    for (let i = 0; i < m; i++) { const b = Math.min(NB - 1, Math.max(0, Math.floor(S[(front + i) * 4 + 3] * NB))); bucket[i] = b; count[b + 1]++; }
    for (let b = 0; b < NB; b++) count[b + 1] += count[b];
    const dest = new Uint32Array(m);
    for (let i = 0; i < m; i++) dest[i] = count[bucket[i]]++;
    for (const A of [this.pos, this.quat, this.sca, this.col]) {
      const T = A.slice(front * 4, n * 4);
      for (let i = 0; i < m; i++) { const s = i * 4, d = (front + dest[i]) * 4; A[d] = T[s]; A[d + 1] = T[s + 1]; A[d + 2] = T[s + 2]; A[d + 3] = T[s + 3]; }
    }
    // (the keep marks of this part are all zero, so they need no moving)
  }
  // unused tail: zero sized strokes parked on a ring high up, so partners fly in from the sky
  pad(rnd) {
    for (let i = this.n; i < this.max; i++) {
      const o = i * 4, a = rnd() * TAU, r = 120 + rnd() * 300;
      this.pos[o] = Math.cos(a) * r; this.pos[o + 1] = 40 + rnd() * 120; this.pos[o + 2] = Math.sin(a) * r; this.pos[o + 3] = 0;
      this.quat[o] = 0; this.quat[o + 1] = 0; this.quat[o + 2] = 0; this.quat[o + 3] = 0;
      this.sca[o] = 0; this.sca[o + 1] = 0; this.sca[o + 2] = CELL.DAB + 16 * FLAG_BILL; this.sca[o + 3] = rnd();
      this.col[o] = 0.5; this.col[o + 1] = 0.5; this.col[o + 2] = 0.5; this.col[o + 3] = 0;
    }
  }
}
function setQuat(out, o, m00, m10, m20, m01, m11, m21, m02, m12, m22) {
  const tr = m00 + m11 + m22;
  let x, y, z, w, s;
  if (tr > 0) { s = Math.sqrt(tr + 1) * 2; w = 0.25 * s; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s; }
  else if (m00 > m11 && m00 > m22) { s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (m21 - m12) / s; x = 0.25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s; }
  else if (m11 > m22) { s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (m02 - m20) / s; x = (m01 + m10) / s; y = 0.25 * s; z = (m12 + m21) / s; }
  else { s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = 0.25 * s; }
  out[o] = x; out[o + 1] = y; out[o + 2] = z; out[o + 3] = w;
}

// ---------- a painted world under construction ----------
class World {
  constructor(seed) {
    this.S = new Strokes(MAX_STROKES);
    this.S.world = this;
    this._sm = []; this._smN = -1; // where the solids stood each time the strokes moved on, so that S.float can find a hull's solids
    this.rnd = mulberry32(seed);
    const W = TERRAIN_N + 1;
    this.heights = new Float32Array(W * W);
    this.terrain = new Float32Array(W * W * 4);
    this.solid = new Float32Array(7 * 3 * 4096);
    this.solidN = 0; this.leafy = 0;
    this.glows = [];       // static lights: {x,y,z,kind,c,w,h,flick,dome}
    this.colliders = [];   // circles {x,z,r}
    this.light = v3norm([-0.45, 0.75, 0.45]);
    this.shadow = { tint: [1, 1, 1], amt: 0, warm: 0, cast: 0 }; // light is no longer baked: strokes keep their local colour
    this.ground = null;
    this.terrainN = new Float32Array(W * W * 4);
    this.casters = [];     // shapes that throw shadows on the ground
    this.waterY = null;
    this.tasks = [];
    this._n = [0, 1, 0];
  }
  h(x, z) { return meshHeight(this.heights, x, z); }
  normalAt(x, z, out) {
    const e = 1.2;
    const hx = this.h(x + e, z) - this.h(x - e, z), hz = this.h(x, z + e) - this.h(x, z - e);
    const l = Math.hypot(hx, 2 * e, hz);
    out[0] = -hx / l; out[1] = (2 * e) / l; out[2] = -hz / l;
    return out;
  }
  fillTerrain(heightFn, colorFn) {
    const W = TERRAIN_N + 1;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const x = TERRAIN_G[i], z = TERRAIN_G[j], k = j * W + i;
      const hgt = heightFn(x, z);
      this.heights[k] = hgt;
      const c = colorFn(x, z);
      this.terrain[k * 4] = hgt; this.terrain[k * 4 + 1] = c[0]; this.terrain[k * 4 + 2] = c[1]; this.terrain[k * 4 + 3] = c[2];
    }
    // smooth normals from the neighbouring heights
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const i0 = Math.max(i - 1, 0), i1 = Math.min(i + 1, W - 1), j0 = Math.max(j - 1, 0), j1 = Math.min(j + 1, W - 1);
      const dx = (this.heights[j * W + i1] - this.heights[j * W + i0]) / (TERRAIN_G[i1] - TERRAIN_G[i0]);
      const dz = (this.heights[j1 * W + i] - this.heights[j0 * W + i]) / (TERRAIN_G[j1] - TERRAIN_G[j0]);
      const l = Math.hypot(dx, 1, dz), k = (j * W + i) * 4;
      this.terrainN[k] = -dx / l; this.terrainN[k + 1] = 1 / l; this.terrainN[k + 2] = -dz / l; this.terrainN[k + 3] = 0;
    }
  }
  // the lie of the land and the colours of its ground, set down small for the touches that follow the eye
  bake(ch) {
    const g = this.ground;
    if (!g) return;
    const span = 2 * (ch.radius + 34), x0 = ch.center[0] - span / 2, z0 = ch.center[1] - span / 2, hn = 512, cn = 256;
    const h = new Float32Array(hn * hn), c = new Uint8Array(cn * cn * 4), rnd = mulberry32(ch.seed + 77);
    for (let j = 0; j < hn; j++) for (let i = 0; i < hn; i++) h[j * hn + i] = this.h(x0 + ((i + 0.5) / hn) * span, z0 + ((j + 0.5) / hn) * span);
    for (let j = 0; j < cn; j++) for (let i = 0; i < cn; i++) {
      const x = x0 + ((i + rnd()) / cn) * span, z = z0 + ((j + rnd()) / cn) * span, k = (j * cn + i) * 4;
      const m = g.mask ? g.mask(x, z, 0) : 1, col = m > 0 ? g.col(x, z, rnd) : null;
      if (!col) { c[k + 3] = 0; continue; }
      c[k] = clamp(col[0], 0, 1) * 255; c[k + 1] = clamp(col[1], 0, 1) * 255; c[k + 2] = clamp(col[2], 0, 1) * 255; c[k + 3] = clamp(m, 0, 1) * 255;
    }
    this.baked = { x0, z0, span, hn, cn, h, c };
  }
  // the solids laid down since the strokes reached that index, and lying where those strokes lie (whatever else was laid at the same
  // count, the end of the thing before, stays where it is)
  _floatSolids(from) {
    const m = this._sm, S = this.S, P = S.pos, D = this.solid;
    let start = this.solidN;
    for (let i = 0; i < m.length; i += 2) if (m[i] >= from) { start = m[i + 1]; break; }
    if (start >= this.solidN || from >= S.n) return;
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let i = from; i < S.n; i++) { const o = i * 4; x0 = Math.min(x0, P[o]); x1 = Math.max(x1, P[o]); y0 = Math.min(y0, P[o + 1]); y1 = Math.max(y1, P[o + 1]); z0 = Math.min(z0, P[o + 2]); z1 = Math.max(z1, P[o + 2]); }
    const e = 1.5, inBox = (v) => D[v * 7] > x0 - e && D[v * 7] < x1 + e && D[v * 7 + 1] > y0 - e && D[v * 7 + 1] < y1 + e && D[v * 7 + 2] > z0 - e && D[v * 7 + 2] < z1 + e;
    for (let t = start - (start % 3); t + 2 < this.solidN; t += 3) {
      if (!inBox(t) || !inBox(t + 1) || !inBox(t + 2)) continue;
      for (let v = t; v < t + 3; v++) if (D[v * 7 + 6] < 1.5) D[v * 7 + 6] += 2;
    }
  }
  caster(c) { this.casters.push(c); }
  collide(x, z, r) { this.colliders.push({ x, z, r }); }
  glow(x, y, z, c, w, h, o) { this.glows.push(Object.assign({ x, y, z, c, w, h: h === undefined ? w : h, kind: 0, flick: 0, dome: 0 }, o || {})); }

  // --- solid underpainting ---
  _v(p, c, sh) {
    if ((this.solidN + 1) * 7 > this.solid.length) { const n = new Float32Array(this.solid.length * 2); n.set(this.solid); this.solid = n; }
    if (this._smN !== this.S.n) { this._sm.push(this.S.n, this.solidN); this._smN = this.S.n; }
    const o = this.solidN++ * 7, s = this.solid;
    s[o] = p[0]; s[o + 1] = p[1]; s[o + 2] = p[2]; s[o + 3] = c[0] * sh; s[o + 4] = c[1] * sh; s[o + 5] = c[2] * sh; s[o + 6] = this.leafy;
  }
  // light and shade the impressionist way: turned from the light a colour cools towards the shadow tint, facing it it warms
  lit(c, lf) {
    const s = this.shadow, k = (1 - lf) * s.amt, w = lf * s.warm;
    return [(c[0] + (c[0] * s.tint[0] - c[0]) * k) * (1 + w * 0.1), (c[1] + (c[1] * s.tint[1] - c[1]) * k) * (1 + w * 0.06), (c[2] + (c[2] * s.tint[2] - c[2]) * k) * (1 - w * 0.05)];
  }
  facing(n) { return sstep(-0.25, 0.55, v3dot(n, this.light)); }
  tri(a, b, c, col) {
    const n = v3norm(v3cross(v3sub(b, a), v3sub(c, a)));
    this._v(a, col, 0.97); this._v(b, col, 0.97); this._v(c, col, 0.97);
  }
  quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
}

// ---------- painting primitives ----------
const _N = [0, 1, 0];

// strokes lying on the ground. o: x0,x1,z0,z1, step, mask(x,z), dir (angle | fn | 'contour'), jit, len, wid, col(x,z,rnd), cells, lift, size(x,z), motion
function paintGround(W, o) {
  const rnd = W.rnd, S = W.S, step = o.step;
  const cells = o.cells || [CELL.LONG_A, CELL.LONG_B, CELL.HEAVY];
  const jitA = o.jit === undefined ? 0.5 : o.jit;
  for (let z = o.z0; z < o.z1; z += step) for (let x = o.x0; x < o.x1; x += step) {
    const px = x + rnd() * step, pz = z + rnd() * step;
    const m = o.mask ? o.mask(px, pz) : 1;
    if (m <= 0 || (m < 1 && rnd() > m)) continue;
    if (Math.abs(px) > TERRAIN_R - 2 || Math.abs(pz) > TERRAIN_R - 2) continue;
    const y = W.h(px, pz);
    W.normalAt(px, pz, _N);
    let a;
    if (o.dir === 'contour') a = Math.atan2(_N[0], -_N[2]) + (Math.abs(_N[0]) + Math.abs(_N[2]) < 0.02 ? rnd() * TAU : 0);
    else a = typeof o.dir === 'function' ? o.dir(px, pz) : (o.dir || 0);
    a += (rnd() - 0.5) * jitA;
    let dx = Math.cos(a), dz = Math.sin(a);
    const dy = -(dx * _N[0] + dz * _N[2]) / _N[1]; // keep the stroke in the tangent plane
    const c = o.col(px, pz, rnd);
    if (!c) continue;
    const sz = o.size ? o.size(px, pz) : 1;
    S.add(px, y + (o.lift === undefined ? 0.05 : o.lift) * sz * (0.6 + rnd() * 1.1), pz, dx, dy, dz, _N[0], _N[1], _N[2],
      o.len * sz * (0.7 + rnd() * 0.6), o.wid * sz * (0.7 + rnd() * 0.6), c, o.motion || 0, cells[(rnd() * cells.length) | 0], o.glow || 0, o.flags === undefined ? FLAG_GROUND : o.flags);
  }
}

// strokes on a bilinear patch a,b,c,d (a to b is u, a to d is v). Normal = (b-a) x (d-a).
// o: step, along 'u'|'v', jit, len, wid, col(rnd,u,v), cells, lift, glow
function paintQuad(W, a, b, c, d, o) {
  const rnd = W.rnd, S = W.S;
  const ab = v3sub(b, a), ad = v3sub(d, a);
  const n = v3norm(v3cross(ab, ad));
  const lu = Math.hypot(ab[0], ab[1], ab[2]), lv = Math.hypot(ad[0], ad[1], ad[2]);
  const un = v3scale(ab, 1 / (lu || 1)), vn = v3scale(ad, 1 / (lv || 1));
  const nu = Math.max(1, Math.round(lu / o.step)), nv = Math.max(1, Math.round(lv / o.step));
  const cells = o.cells || [CELL.LONG_A, CELL.HEAVY, CELL.BLOCK];
  const lift0 = o.lift === undefined ? 0.05 : o.lift;
  const jitA = o.jit === undefined ? 0.26 : o.jit;
  const lf = W.facing(n), wseed = rnd() * 50;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const u = (i + rnd()) / nu, v = (j + rnd()) / nv, lift = lift0 + rnd() * 0.04;
    const w00 = (1 - u) * (1 - v), w10 = u * (1 - v), w11 = u * v, w01 = (1 - u) * v;
    const px = a[0] * w00 + b[0] * w10 + c[0] * w11 + d[0] * w01 + n[0] * lift;
    const py = a[1] * w00 + b[1] * w10 + c[1] * w11 + d[1] * w01 + n[1] * lift;
    const pz = a[2] * w00 + b[2] * w10 + c[2] * w11 + d[2] * w01 + n[2] * lift;
    const ang = (rnd() - 0.5) * jitA + (o.angle || 0), ca = Math.cos(ang), sa = Math.sin(ang);
    // basket weave: patches of strokes laid one way, then the other
    let alongV = o.along === 'v';
    if (o.weave && vnoise(u * lu * 0.4 + wseed, v * lv * 0.4, 77) < o.weave) alongV = !alongV;
    const p = alongV ? vn : un, q = alongV ? un : vn;
    let col = o.col(rnd, u, v);
    if (!col) continue;
    if (!o.noLit) col = W.lit(col, lf);
    S.add(px, py, pz, p[0] * ca + q[0] * sa, p[1] * ca + q[1] * sa, p[2] * ca + q[2] * sa, n[0], n[1], n[2],
      o.len * (0.7 + rnd() * 0.6), o.wid * (0.7 + rnd() * 0.6), col, 0, cells[(rnd() * cells.length) | 0], o.glow || 0, 0);
  }
}

// rotate a local footprint point into the world
function rotXZ(x, z, lx, lz, yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); return [x + lx * c - lz * s, z + lx * s + lz * c]; }

// box walls: solid + strokes. o: x,z,w,d,y0,h,yaw, wall(rnd,u,v), base (solid colour), step,len,wid, along, cells, noSolid
// returns the four top corners (order ++, +-, --, -+)
function box(W, o) {
  const yaw = o.yaw || 0, y0 = o.y0, y1 = o.y0 + o.h;
  const L = [[o.w / 2, o.d / 2], [o.w / 2, -o.d / 2], [-o.w / 2, -o.d / 2], [-o.w / 2, o.d / 2]];
  const P = L.map((l) => rotXZ(o.x, o.z, l[0], l[1], yaw));
  // nothing he painted stands quite straight: let the tops of the walls lean a little
  const wob = Math.min(0.22, (o.wobble === undefined ? 0.028 : o.wobble) * o.h), rnd = W.rnd;
  const T = P.map((p) => [p[0] + (rnd() - 0.5) * 2 * wob, y1 + (rnd() - 0.5) * wob, p[1] + (rnd() - 0.5) * 2 * wob]);
  for (let i = 0; i < 4; i++) {
    const p = P[i], q = P[(i + 1) % 4];
    const a = [p[0], y0, p[1]], b = [q[0], y0, q[1]], c = T[(i + 1) % 4], d = T[i];
    if (!o.noSolid) W.quad(a, b, c, d, o.base);
    if (o.wall) paintQuad(W, a, b, c, d, { step: o.step || 0.5, len: o.len || 1.05, wid: o.wid || 0.36, along: o.along || 'u', col: o.wall, cells: o.cells, jit: o.jit, lift: 0.05, weave: o.weave === undefined ? 0.34 : o.weave });
  }
  return T;
}

// gable roof with the ridge along local x. o: x,z,w,d,y,rh,yaw,over, roof(rnd,u,v), base, gable(rnd), gableBase, step,len,wid, along
function gableRoof(W, o) {
  const yaw = o.yaw || 0, ov = o.over === undefined ? 0.4 : o.over, y = o.y, yr = o.y + o.rh, hw = o.w / 2, hd = o.d / 2;
  const pt = (lx, yy, lz) => { const p = rotXZ(o.x, o.z, lx, lz, yaw); return [p[0], yy, p[1]]; };
  const eaveDrop = ov * (o.rh / hd);
  const slopes = [
    [pt(-hw - ov, y - eaveDrop, hd + ov), pt(hw + ov, y - eaveDrop, hd + ov), pt(hw + ov, yr, 0), pt(-hw - ov, yr, 0)],
    [pt(hw + ov, y - eaveDrop, -hd - ov), pt(-hw - ov, y - eaveDrop, -hd - ov), pt(-hw - ov, yr, 0), pt(hw + ov, yr, 0)],
  ];
  for (const s of slopes) {
    W.quad(s[0], s[1], s[2], s[3], o.base);
    paintQuad(W, s[0], s[1], s[2], s[3], { step: o.step || 0.55, len: o.len || 1.1, wid: o.wid || 0.36, along: o.along || 'v', col: o.roof, cells: o.cells, jit: o.jit, lift: 0.06 });
  }
  const gables = [[pt(hw, y, hd), pt(hw, y, -hd), pt(hw, yr, 0)], [pt(-hw, y, -hd), pt(-hw, y, hd), pt(-hw, yr, 0)]];
  for (const g of gables) {
    W.tri(g[0], g[1], g[2], o.gableBase || o.base);
    if (o.gable) paintQuad(W, g[0], g[1], g[2], g[2], { step: o.step || 0.55, len: o.len || 1.0, wid: o.wid || 0.36, along: 'u', col: o.gable, lift: 0.05 });
  }
}

// pyramid or spire on a rectangular footprint. o: x,z,w,d,y,h,yaw, roof, base, step,len,wid
function pyramid(W, o) {
  const yaw = o.yaw || 0;
  const L = [[o.w / 2, o.d / 2], [o.w / 2, -o.d / 2], [-o.w / 2, -o.d / 2], [-o.w / 2, o.d / 2]];
  const P = L.map((l) => { const p = rotXZ(o.x, o.z, l[0], l[1], yaw); return [p[0], o.y, p[1]]; });
  const apex = [o.x, o.y + o.h, o.z];
  for (let i = 0; i < 4; i++) {
    const a = P[i], b = P[(i + 1) % 4];
    W.tri(a, b, apex, o.base);
    paintQuad(W, a, b, apex, apex, { step: o.step || 0.55, len: o.len || 1.1, wid: o.wid || 0.36, along: 'v', col: o.roof, cells: o.cells, lift: 0.06 });
  }
}

// tapered round tower / cone / stack. o: x,z,y0,y1,r0,r1,sides, wall, base, step,len,wid, along
function tower(W, o) {
  const n = o.sides || 8;
  for (let i = 0; i < n; i++) {
    const t0 = ((i + 1) / n) * TAU, t1 = (i / n) * TAU;
    const a = [o.x + Math.cos(t0) * o.r0, o.y0, o.z + Math.sin(t0) * o.r0], b = [o.x + Math.cos(t1) * o.r0, o.y0, o.z + Math.sin(t1) * o.r0];
    const c = [o.x + Math.cos(t1) * o.r1, o.y1, o.z + Math.sin(t1) * o.r1], d = [o.x + Math.cos(t0) * o.r1, o.y1, o.z + Math.sin(t0) * o.r1];
    if (!o.noSolid) W.quad(a, b, c, d, o.base);
    if (o.wall) paintQuad(W, a, b, c, d, { step: o.step || 0.55, len: o.len || 1.1, wid: o.wid || 0.36, along: o.along || 'v', col: o.wall, cells: o.cells, jit: o.jit, lift: 0.06 });
  }
}

// low poly ellipsoid core that keeps foliage from being see through
function blobSolid(W, cx, cy, cz, rx, ry, rz, col, leafy) {
  const nu = 7, nv = 4;
  const pt = (i, j) => { const th = (i / nu) * TAU, ph = (j / nv) * Math.PI; return [cx + Math.cos(th) * Math.sin(ph) * rx, cy + Math.cos(ph) * ry, cz + Math.sin(th) * Math.sin(ph) * rz]; };
  W.leafy = leafy ? 1 : 0;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) W.quad(pt(i + 1, j), pt(i, j), pt(i, j + 1), pt(i + 1, j + 1), col);
  W.leafy = 0;
}

// upright trunk made of camera turning strokes
function trunk(W, x, y0, z, h, r, col, lean, segs) {
  const S = W.S, rnd = W.rnd, n = segs || Math.max(2, Math.round(h / 1.4));
  const lx = lean ? lean[0] : 0, lz = lean ? lean[1] : 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, seg = h / n;
    S.add(x + lx * t, y0 + t * h, z + lz * t, lx + (rnd() - 0.5) * 0.25, h, lz + (rnd() - 0.5) * 0.25, 1, 0, 0,
      seg * 1.5, r * 2.3 * (1.1 - 0.35 * t), col(rnd), 0, rnd() < 0.5 ? CELL.HEAVY : CELL.LONG_A, 0, FLAG_AXIAL);
  }
}

// cloud of camera facing dabs. o: n, rx,ry,rz, size, col(rnd,t) with t = height 0..1, cells, sway, aspect, core
function foliage(W, cx, cy, cz, o) {
  const S = W.S, rnd = W.rnd;
  const cells = o.cells || [CELL.DAB, CELL.COMMA, CELL.COMMA_S, CELL.HEAVY];
  if (o.core) blobSolid(W, cx, cy, cz, o.rx * 0.7, o.ry * 0.7, o.rz * 0.7, mulc(o.core, 1.22));
  for (let i = 0; i < o.n; i++) {
    // points biased to the shell
    let x = rnd() * 2 - 1, y = rnd() * 2 - 1, z = rnd() * 2 - 1;
    const l = Math.hypot(x, y, z) || 1, r = 0.55 + 0.45 * Math.pow(rnd(), 0.6);
    x = (x / l) * r; y = (y / l) * r; z = (z / l) * r;
    if (y < 0 && rnd() < 0.45) y = -y; // more paint on the crown than underneath
    const t = y * 0.5 + 0.5;
    const sz = o.size * (0.55 + rnd() * 0.8);
    const nd = (x * W.light[0] + y * W.light[1] + z * W.light[2]) / (Math.hypot(x, y, z) || 1);
    const col = W.lit(o.col(rnd, t), sstep(-0.6, 0.7, nd));
    S.bill(cx + x * o.rx, cy + y * o.ry, cz + z * o.rz, (rnd() - 0.5) * (o.swirl === undefined ? 0.9 : o.swirl), sz * (o.aspect || 1.8), sz, col, o.sway || 0, cells[(rnd() * cells.length) | 0], o.glow || 0, 0,
      o.free ? 0 : x * o.rx, o.free ? 0.6 : y * o.ry + 0.001, o.free ? 0 : z * o.rz, o.flags === undefined ? FLAG_LEAF : o.flags);
  }
}

// the flame shaped cypress
function cypress(W, x, z, h, r, colFn, core) {
  const S = W.S, rnd = W.rnd, y0 = W.h(x, z);
  const prof = (t) => r * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.75) * (1 - 0.25 * t);
  // core cones
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t0 = ((i + 1) / n) * TAU, t1 = (i / n) * TAU;
    for (let s = 0; s < 5; s++) {
      const ta = s / 5, tb = (s + 1) / 5, ra = prof(ta) * 0.7 + (s === 0 ? 0.3 : 0), rb = prof(tb) * 0.7;
      W.quad([x + Math.cos(t0) * ra, y0 + ta * h, z + Math.sin(t0) * ra], [x + Math.cos(t1) * ra, y0 + ta * h, z + Math.sin(t1) * ra],
        [x + Math.cos(t1) * rb, y0 + tb * h, z + Math.sin(t1) * rb], [x + Math.cos(t0) * rb, y0 + tb * h, z + Math.sin(t0) * rb], core);
    }
  }
  const count = Math.round(h * r * 10.5);
  for (let i = 0; i < count; i++) {
    const t = Math.pow(rnd(), 0.85), ph = rnd() * TAU, rr = prof(t) * (0.75 + rnd() * 0.3);
    const px = x + Math.cos(ph) * rr, pz = z + Math.sin(ph) * rr, py = y0 + t * h;
    const tw = 0.5 + rnd() * 0.5; // spiral twist like licking flames
    const len = (1.8 + rnd() * 2.1) * (0.6 + 0.4 * (1 - t)) * (h / 20 + 0.45);
    S.add(px, py + len * 0.3, pz, -Math.sin(ph) * tw + Math.cos(ph) * 0.22, 1.7, Math.cos(ph) * tw + Math.sin(ph) * 0.22, Math.cos(ph), 0, Math.sin(ph),
      len, len * (0.2 + rnd() * 0.12), colFn(rnd, t), 0.25 + 0.6 * t, rnd() < 0.6 ? CELL.BLADE : CELL.COMMA, 0, FLAG_AXIAL);
  }
  W.collide(x, z, r * 0.55);
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

// rectangle of paint on a wall (window, door, shutter). centre p, wall normal (nx,nz), size w x h
function panel(W, px, py, pz, nx, nz, w, h, c, glow, cell) {
  W.S.keep[W.S.n] = 1;
  W.S.add(px + nx * 0.19, py, pz + nz * 0.19, 0, 1, 0, nx, 0, nz, h, w, c, 0, cell === undefined ? CELL.RECT : cell, glow || 0, 0);
}
