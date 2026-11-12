// ---------- math & helpers ----------
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => t * t * (3 - 2 * t);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iy, seed) {
  let h = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// fractal noise, 0..1
function fbm(x, y, oct, seed) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, (seed | 0) + i * 17); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}

// ---------- colour ----------
function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function mulc(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
// turn a colour around the grey axis (a small angle gives the neighbouring hue)
function hueRot(c, a) {
  const k = 0.57735, ca = Math.cos(a), sa = Math.sin(a), d = k * (c[0] + c[1] + c[2]) * (1 - ca);
  return [c[0] * ca + k * (c[2] - c[1]) * sa + k * d, c[1] * ca + k * (c[0] - c[2]) * sa + k * d, c[2] * ca + k * (c[1] - c[0]) * sa + k * d];
}
// broken colour: every touch drifts in value, in hue and a little in strength
function jit(c, amt, rnd) {
  const h = hueRot(c, (rnd() - 0.5) * amt * 4.4);
  const l = 1 + (rnd() - 0.5) * amt * 2.6, g = (h[0] + h[1] + h[2]) / 3, sat = 1 + (rnd() - 0.5) * amt * 4;
  return [clamp((g + (h[0] - g) * sat) * l, 0, 1), clamp((g + (h[1] - g) * sat) * l, 0, 1), clamp((g + (h[2] - g) * sat) * l, 0, 1)];
}
// palette picker: pal(['#aabbcc', ...], weights?, jitter) -> fn(rnd) -> [r,g,b]
function pal(cols, jitter, weights) {
  const cs = cols.map((c) => (typeof c === 'string' ? hex(c) : c));
  let cum = null;
  if (weights) { cum = []; let s = 0; for (const w of weights) { s += w; cum.push(s); } for (let i = 0; i < cum.length; i++) cum[i] /= s; }
  const j = jitter === undefined ? 0.08 : jitter;
  return function (rnd) {
    let i;
    if (cum) { const r = rnd(); i = 0; while (i < cum.length - 1 && r > cum[i]) i++; } else i = Math.floor(rnd() * cs.length) % cs.length;
    return j > 0 ? jit(cs[i], j, rnd) : cs[i];
  };
}

// ---------- vectors ----------
function v3norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function v3cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function v3dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function v3sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function v3add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function v3scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
function v3lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

// direction on the sky dome from azimuth (0 = north = -z, clockwise seen from above) and elevation, in degrees
function skyDir(azDeg, elDeg) {
  const a = azDeg * DEG, e = elDeg * DEG;
  return [Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)];
}

// quaternion from an orthonormal basis (columns ax, ay, az), written into out[o..o+3]
function quatFromAxes(ax, ay, az, out, o) {
  const m00 = ax[0], m10 = ax[1], m20 = ax[2];
  const m01 = ay[0], m11 = ay[1], m21 = ay[2];
  const m02 = az[0], m12 = az[1], m22 = az[2];
  const tr = m00 + m11 + m22;
  let x, y, z, w, s;
  if (tr > 0) { s = Math.sqrt(tr + 1) * 2; w = 0.25 * s; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s; }
  else if (m00 > m11 && m00 > m22) { s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (m21 - m12) / s; x = 0.25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s; }
  else if (m11 > m22) { s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (m02 - m20) / s; x = (m01 + m10) / s; y = 0.25 * s; z = (m12 + m21) / s; }
  else { s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = 0.25 * s; }
  out[o] = x; out[o + 1] = y; out[o + 2] = z; out[o + 3] = w;
}

// ---------- matrices (column major) ----------
function mat4Perspective(out, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
  return out;
}
function mat4View(out, eye, r, u, f) { // r,u,f = right, up, forward (unit)
  out[0] = r[0]; out[1] = u[0]; out[2] = -f[0]; out[3] = 0;
  out[4] = r[1]; out[5] = u[1]; out[6] = -f[1]; out[7] = 0;
  out[8] = r[2]; out[9] = u[2]; out[10] = -f[2]; out[11] = 0;
  out[12] = -(r[0] * eye[0] + r[1] * eye[1] + r[2] * eye[2]);
  out[13] = -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]);
  out[14] = f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2];
  out[15] = 1;
  return out;
}
function mat4Mul(out, a, b) {
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
    out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
    out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
    out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
    out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
  return out;
}
function angDiff(a, b) { // shortest signed difference a - b
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
  return d;
}
