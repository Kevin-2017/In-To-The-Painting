// ---------- the walker ----------
// Under the paint there is a figure. She is modelled fresh every frame in her own frame (right, up, forward), so that she can
// lean into her flight as one piece: a skirt that keeps the air it has passed through, a bodice and sleeves, a head under a
// straw hat, and the parasol that carries her. Then the brush goes over her again: the long strokes of the dress, the veil,
// the ribbons, the light on the ribs of the parasol.
const HERO_MAX = 9000, HERO_SC = 1.06;
const HERO_G = new Float32Array(30 * 26 * 3), HERO_N = new Float32Array(30 * 26 * 3), HERO_C = new Float32Array(30 * 26 * 3), HERO_L = new Float32Array(30), HERO_H = new Float32Array(26 * 3);
const HERO_SU = [1.04, 0.965, 0.865, 0.74, 0.6, 0.45, 0.3, 0.16, 0.04];
const HERO_SR = [0.104, 0.158, 0.208, 0.254, 0.3, 0.346, 0.392, 0.436, 0.478];
const HERO_TU = [1.02, 1.07, 1.14, 1.215, 1.285, 1.345, 1.385, 1.405];
const HERO_TX = [0.106, 0.118, 0.137, 0.152, 0.162, 0.158, 0.112, 0.05];
const HERO_TF = [0.086, 0.094, 0.108, 0.116, 0.104, 0.09, 0.07, 0.046];
const HERO_TC = [0, 0.004, 0.012, 0.018, 0.006, -0.004, -0.004, 0];
const HERO_WHITE = [[0.97, 0.96, 0.94], [0.9, 0.93, 1.0], [1.0, 0.97, 0.9], [0.93, 0.9, 0.99]];
const HERO_SKIN = [0.94, 0.77, 0.66], HERO_HAIR = [0.3, 0.19, 0.13], HERO_STRAW = [0.93, 0.8, 0.5], HERO_BLUE = [0.3, 0.44, 0.74], HERO_WOOD = [0.34, 0.25, 0.18];
const HERO_GREEN = [[0.46, 0.74, 0.44], [0.33, 0.62, 0.38], [0.4, 0.7, 0.42], [0.28, 0.56, 0.36]], HERO_UNDER = [[0.26, 0.54, 0.33], [0.19, 0.44, 0.29]];

class Hero {
  constructor() {
    this.d = new Float32Array(HERO_MAX * 12); this.n = 0;
    this.gait = 0; this.walk = 0; this.fly = 0; this.bank = 0; this.hPrev = null; this.slide = 0; this.breeze = 1; this.pose = 0; this.pose2 = 0; this.eye = null;
    this.w1 = [0, 0, 0]; this.w2 = [0, 0, 0];
    this.ox = 0; this.oy = 0; this.oz = 0; this.R = [1, 0, 0]; this.U = [0, 1, 0]; this.F = [0, 0, -1];
    this.gr = 0; this.gc = 0; this.cen = new Float32Array(27);
    this.tipL = [0, 0, 0]; this.tipR = [0, 0, 0]; this.hub = [0, 0, 0]; this.rp = 0.7; this.ready = false;
  }

  // what the cloth remembers: the air she moves through, felt at once near the waist and late at the hem
  step(dt, p, wind, time, inAir, sliding) {
    const hs = Math.hypot(p.vx, p.vz), gust = 0.55 + 0.45 * Math.sin(time * 0.7 + Math.sin(time * 0.23) * 2);
    const bz = 2.4 * gust * this.breeze; // where she is the picture, the wind is the wind of that picture
    const ax = wind[0] * bz - p.vx, ay = inAir ? -p.valt : 0, az = wind[1] * bz - p.vz;
    const k1 = Math.min(1, dt * 7), k2 = Math.min(1, dt * 2.4), a = this.w1, b = this.w2;
    a[0] += (ax - a[0]) * k1; a[1] += (ay - a[1]) * k1; a[2] += (az - a[2]) * k1;
    b[0] += (ax - b[0]) * k2; b[1] += (ay - b[1]) * k2; b[2] += (az - b[2]) * k2;
    this.fly += (clamp(p.alt / 1.4, 0, 1) - this.fly) * Math.min(1, dt * 6);
    this.walk += ((!inAir && !sliding ? clamp(hs / 1.6, 0, 1) : 0) - this.walk) * Math.min(1, dt * 6);
    this.slide += ((sliding && !inAir ? 1 : 0) - this.slide) * Math.min(1, dt * 5);
    if (!inAir && !sliding && hs > 0.05) this.gait += dt * 6 * Math.sqrt(hs / 1.4); // the faster she goes the longer her stride
    if (this.hPrev !== null && dt > 1e-4) this.bank += (clamp((angDiff(p.heading, this.hPrev) / dt) * 0.22, -0.45, 0.45) * (inAir ? 1 : 0.3) - this.bank) * Math.min(1, dt * 3);
    this.hPrev = p.heading;
  }

  grid(rows, cols) { this.gr = rows; this.gc = cols; }
  // a point of the surface being modelled, given in her own frame at her own size
  put(j, i, r, u, f, c, k) {
    const o = (j * this.gc + i) * 3, R = this.R, U = this.U, F = this.F;
    HERO_G[o] = this.ox + (R[0] * r + U[0] * u + F[0] * f) * HERO_SC;
    HERO_G[o + 1] = this.oy + (R[1] * r + U[1] * u + F[1] * f) * HERO_SC;
    HERO_G[o + 2] = this.oz + (R[2] * r + U[2] * u + F[2] * f) * HERO_SC;
    HERO_C[o] = c[0] * k; HERO_C[o + 1] = c[1] * k; HERO_C[o + 2] = c[2] * k;
  }
  // the same, given in the world
  putW(j, i, x, y, z, c, k) {
    const o = (j * this.gc + i) * 3;
    HERO_G[o] = x; HERO_G[o + 1] = y; HERO_G[o + 2] = z;
    HERO_C[o] = c[0] * k; HERO_C[o + 1] = c[1] * k; HERO_C[o + 2] = c[2] * k;
  }
  at(r, u, f) {
    const R = this.R, U = this.U, F = this.F;
    return [this.ox + (R[0] * r + U[0] * u + F[0] * f) * HERO_SC, this.oy + (R[1] * r + U[1] * u + F[1] * f) * HERO_SC, this.oz + (R[2] * r + U[2] * u + F[2] * f) * HERO_SC];
  }
  // the grid becomes triangles. thru: how much light comes through this cloth. ku, kv: how the brush runs over it.
  // hx, hy, hz: which way is out, for a sheet that has no inside
  flush(wrap, thru, ku, kv, hx, hy, hz) {
    const G = HERO_G, N = HERO_N, C = HERO_C, Lr = HERO_L, rows = this.gr, cols = this.gc, d = this.d, nq = wrap ? cols : cols - 1;
    if (this.n + (rows - 1) * nq * 6 > HERO_MAX) return;
    Lr[0] = 0;
    for (let j = 1; j < rows; j++) { const a = (j - 1) * cols * 3, b = j * cols * 3; Lr[j] = Lr[j - 1] + Math.hypot(G[b] - G[a], G[b + 1] - G[a + 1], G[b + 2] - G[a + 2]); }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const i0 = wrap ? (i + cols - 1) % cols : Math.max(i - 1, 0), i1 = wrap ? (i + 1) % cols : Math.min(i + 1, cols - 1), j0 = Math.max(j - 1, 0), j1 = Math.min(j + 1, rows - 1);
      const a = (j * cols + i0) * 3, b = (j * cols + i1) * 3, c = (j0 * cols + i) * 3, e = (j1 * cols + i) * 3, o = (j * cols + i) * 3;
      const ux = G[b] - G[a], uy = G[b + 1] - G[a + 1], uz = G[b + 2] - G[a + 2], vx = G[e] - G[c], vy = G[e + 1] - G[c + 1], vz = G[e + 2] - G[c + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
      if (l > 1e-12) { N[o] = nx / l; N[o + 1] = ny / l; N[o + 2] = nz / l; } else { N[o] = 0; N[o + 1] = 1; N[o + 2] = 0; }
    }
    // which way is out: the way the caller says, or away from the middle of the form
    const jm = rows >> 1, om = jm * cols * 3;
    let sg;
    if (hx !== undefined) sg = N[om] * hx + N[om + 1] * hy + N[om + 2] * hz;
    else {
      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < cols; i++) { const o = (jm * cols + i) * 3; cx += G[o]; cy += G[o + 1]; cz += G[o + 2]; }
      sg = N[om] * (G[om] - cx / cols) + N[om + 1] * (G[om + 1] - cy / cols) + N[om + 2] * (G[om + 2] - cz / cols);
    }
    if (sg < 0) for (let i = 0, m = rows * cols * 3; i < m; i++) N[i] = -N[i];
    let k = this.n * 12;
    const vert = (j, i, iu) => {
      const o = (j * cols + i) * 3;
      d[k] = G[o]; d[k + 1] = G[o + 1]; d[k + 2] = G[o + 2]; d[k + 3] = N[o]; d[k + 4] = N[o + 1]; d[k + 5] = N[o + 2];
      d[k + 6] = C[o]; d[k + 7] = C[o + 1]; d[k + 8] = C[o + 2]; d[k + 9] = Lr[j] * ku; d[k + 10] = (iu / cols) * kv; d[k + 11] = thru;
      k += 12;
    };
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < nq; i++) {
      const i1 = (i + 1) % cols;
      vert(j, i, i); vert(j, i1, i + 1); vert(j + 1, i1, i + 1); vert(j, i, i); vert(j + 1, i1, i + 1); vert(j + 1, i, i);
    }
    this.n = k / 12;
  }
  // a limb: a tube through a few points
  tube(pts, rad, cols, c, k, thru) {
    const n = pts.length, R = this.R, F = this.F;
    this.grid(n, cols);
    for (let j = 0; j < n; j++) {
      const a = pts[Math.max(j - 1, 0)], b = pts[Math.min(j + 1, n - 1)], p = pts[j], r = rad[j] * HERO_SC;
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
      const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let ax = ty * F[2] - tz * F[1], ay = tz * F[0] - tx * F[2], az = tx * F[1] - ty * F[0], al = Math.hypot(ax, ay, az);
      if (al < 0.2) { ax = ty * R[2] - tz * R[1]; ay = tz * R[0] - tx * R[2]; az = tx * R[1] - ty * R[0]; al = Math.hypot(ax, ay, az) || 1; }
      ax /= al; ay /= al; az /= al;
      const bx = ty * az - tz * ay, by = tz * ax - tx * az, bz = tx * ay - ty * ax;
      for (let i = 0; i < cols; i++) { const th = (i / cols) * TAU, ct = Math.cos(th) * r, st = Math.sin(th) * r; this.putW(j, i, p[0] + ax * ct + bx * st, p[1] + ay * ct + by * st, p[2] + az * ct + bz * st, c, k); }
    }
    this.flush(true, thru || 0, 1.2, 1);
  }
  // a rounded form with its own three directions and a size along each
  ball(c, A, ra, B, rb, E, re, rows, cols, col, k, shade) {
    this.grid(rows, cols);
    for (let j = 0; j < rows; j++) {
      const la = -Math.PI / 2 + 0.06 + (Math.PI - 0.12) * (j / (rows - 1)), cl = Math.cos(la), sl = Math.sin(la) * rb * HERO_SC;
      for (let i = 0; i < cols; i++) {
        const th = (i / cols) * TAU, a = Math.sin(th) * cl * ra * HERO_SC, e = Math.cos(th) * cl * re * HERO_SC;
        this.putW(j, i, c[0] + A[0] * a + B[0] * sl + E[0] * e, c[1] + A[1] * a + B[1] * sl + E[1] * e, c[2] + A[2] * a + B[2] * sl + E[2] * e, col, shade ? k * shade(th, la) : k);
      }
    }
    this.flush(true, 0, 2.4, 2);
  }

  // x, y, z: where her feet are. S takes the strokes that go over her
  build(S, x, y, z, heading, time, wind, lean, flap) {
    this.n = 0;
    const G = HERO_G, N = HERO_N, SC = HERO_SC, WH = HERO_WHITE, R = this.R, U = this.U, F = this.F, w1 = this.w1, w2 = this.w2, cen = this.cen;
    const fly = this.fly, wk = this.walk, ph = this.gait, L = lean || 0, fk = flap || 0;
    // where she is herself the picture she stands as she stood for it: both hands on the parasol held out before her,
    // its green underside to the painter, and her head turned to look at him
    const ps = this.pose * (1 - fly);
    // and the stance of the later picture: seen from the side, the parasol held low before her and leaning back over her shoulder,
    // the other arm at her side, a long scarf going out on the wind
    const p2 = this.pose2 * (1 - fly);
    const hx = Math.sin(heading), hz = -Math.cos(heading), cl = Math.cos(L), sl = Math.sin(L), cb = Math.cos(this.bank), sb = Math.sin(this.bank), rx = Math.cos(heading), rz = Math.sin(heading);
    const ux = hx * sl, uy = cl, uz = hz * sl;
    R[0] = rx * cb - ux * sb; R[1] = -uy * sb; R[2] = rz * cb - uz * sb;
    U[0] = ux * cb + rx * sb; U[1] = uy * cb; U[2] = uz * cb + rz * sb;
    F[0] = hx * cl; F[1] = -sl; F[2] = hz * cl;
    const sp = Math.sin(ph), cp = Math.cos(ph);
    this.ox = x; this.oy = y + 0.5 * Math.max(sl, 0) * fly + Math.abs(cp) * 0.02 * wk * SC; this.oz = z;
    const seg = (ax, ay, az, bx, by, bz, nx, ny, nz, wid, c, cell, flags, lenK) => S.add((ax + bx) / 2 + nx * 0.02, (ay + by) / 2 + ny * 0.02, (az + bz) / 2 + nz * 0.02, bx - ax, by - ay, bz - az, nx, ny, nz,
      Math.hypot(bx - ax, by - ay, bz - az) * (lenK || 1.06), wid, c, 0, cell, 0, flags || 0);

    // ----- the skirt: a bell that keeps the air it has passed through -----
    const NS = 9, NC = 24, kSp = 0.06 * wk - 0.42 * L; // how the back answers the lean of the whole body
    const fall = clamp(w2[1] / 9, -0.4, 1), fph = 0.45 * Math.sin(time * 1.1) + ph * 0.5;
    this.grid(NS, NC);
    for (let j = 0; j < NS; j++) {
      const s = j / (NS - 1), s2 = Math.pow(s, 1.7);
      const dx = lerp(w1[0], w2[0], s), dy = lerp(w1[1], w2[1], s), dz = lerp(w1[2], w2[2], s), dm = Math.hypot(dx, dz), th8 = Math.tanh(dm / 8);
      const dk = dm > 1e-3 ? (0.52 * th8 * s2) / dm : 0;
      const ox = dx * dk, oz = dz * dk, oy = (clamp(dy * 0.035, -0.06, 0.34) + 0.1 * th8) * s2;
      const rad = HERO_SR[j] * (1 + 0.3 * Math.max(fall, 0) * s - 0.14 * fly * s * (1 - Math.max(fall, 0)));
      const uj = HERO_SU[j], cf = -0.035 * sstep(0, 0.25, s) - 0.05 * s, cr = Math.sin(ph + 0.6) * 0.022 * wk * s;
      const kb = wk * 0.055 * Math.sin(Math.PI * clamp((s - 0.2) / 0.75, 0, 1)), fA = 0.012 + 0.085 * Math.pow(s, 1.4), flut = 0.014 * s2 * Math.min(1, dm / 4);
      for (let i = 0; i < NC; i++) {
        const th = (i / NC) * TAU, st = Math.sin(th), ct = Math.cos(th), wv = Math.cos(7 * th + fph + s * 1.3);
        const fold = 1 + fA * wv + 0.028 * s * s * Math.cos(12 * th - fph * 1.7 + 1.3);
        const dr = Math.atan2(Math.sin(th - 0.5), Math.cos(th - 0.5)), dl = Math.atan2(Math.sin(th + 0.5), Math.cos(th + 0.5));
        const knee = kb * (Math.max(0, sp) * Math.exp(-dr * dr * 3) + Math.max(0, -sp) * Math.exp(-dl * dl * 3));
        const rr = rad * fold * (1 + 0.16 * s * Math.max(0, -ct)) + knee;
        this.put(j, i, st * rr + cr, uj + 0.028 * s * s * ct + flut * Math.sin(time * 5.3 + i * 1.9), ct * rr + cf, WH[(i * 5 + j * 3) % 4], 1 - 0.3 * Math.pow(s, 0.7) * Math.max(0, -wv));
        const o = (j * NC + i) * 3; G[o] += ox; G[o + 1] += oy; G[o + 2] += oz;
      }
      const c = this.at(cr, uj, cf); cen[j * 3] = c[0] + ox; cen[j * 3 + 1] = c[1] + oy; cen[j * 3 + 2] = c[2] + oz;
    }
    this.flush(true, 0.3, 0.4, 1);
    // the brush over the dress: strokes of unequal length that widen to the hem, a few thin ones under the waist, and
    // short touches along the hem so that it is not cut with a knife
    for (let i = 0; i < NC; i += 3) {
      const h1 = hash2(i, 3, 61), h2 = hash2(i, 7, 61), j0 = h1 < 0.3 ? 7 : 8, j1 = 3 + Math.floor(h2 * 2.99), ie = (i + (h1 > 0.6 ? 1 : 0)) % NC;
      const a = (j0 * NC + i) * 3, b = (j1 * NC + ie) * 3, m = (6 * NC + i) * 3;
      seg(G[a], G[a + 1], G[a + 2], G[b], G[b + 1], G[b + 2], N[m], N[m + 1], N[m + 2], (0.11 + 0.09 * h2) * SC, WH[(i / 3 + 1) % 4], h1 < 0.5 ? CELL.BLADE : h1 < 0.8 ? CELL.LONG_A : CELL.COMMA);
      if (i % 6 === 3) { const c = (1 * NC + i) * 3, e = (4 * NC + i) * 3, m2 = (3 * NC + i) * 3; seg(G[e], G[e + 1], G[e + 2], G[c], G[c + 1], G[c + 2], N[m2], N[m2 + 1], N[m2 + 2], 0.07 * SC, WH[(i / 3 + 2) % 4], CELL.LONG_B); }
    }
    for (let i = 0; i < NC; i += 2) {
      const a = (8 * NC + i) * 3, b = (8 * NC + (i + 2) % NC) * 3, h = hash2(i, 11, 61);
      S.add((G[a] + G[b]) / 2 + N[a] * 0.012, (G[a + 1] + G[b + 1]) / 2 + 0.016 - 0.012 * h, (G[a + 2] + G[b + 2]) / 2 + N[a + 2] * 0.012, G[b] - G[a], G[b + 1] - G[a + 1] + (h - 0.5) * 0.03, G[b + 2] - G[a + 2], N[a], N[a + 1] + 0.3, N[a + 2],
        Math.hypot(G[b] - G[a], G[b + 1] - G[a + 1], G[b + 2] - G[a + 2]) * (1.0 + 0.25 * h), (0.045 + 0.025 * h) * SC, WH[(i / 2) % 4], 0, h < 0.5 ? CELL.DAB : CELL.HEAVY, 0, 0);
    }
    for (let i = 0; i < NC * 3; i++) HERO_H[i] = G[(NS - 1) * NC * 3 + i];
    // inside the bell: the petticoat, in shadow
    const c5 = [cen[15], cen[16], cen[17]], c8 = [cen[24], cen[25], cen[26]], PK = [0.03, 0.5, 0.78], PS = [0.94, 0.8, 0.64], PC = [0.74, 0.78, 0.92];
    this.grid(3, NC);
    for (let j = 0; j < 3; j++) {
      const tx = lerp(c8[0], c5[0], j / 2), ty = lerp(c8[1], c5[1], j / 2), tz = lerp(c8[2], c5[2], j / 2);
      for (let i = 0; i < NC; i++) this.putW(j, i, lerp(HERO_H[i * 3], tx, PK[j]), lerp(HERO_H[i * 3 + 1], ty, PK[j]), lerp(HERO_H[i * 3 + 2], tz, PK[j]), PC, PS[j]);
    }
    this.flush(true, 0.2, 0.5, 1);
    // her legs and boots: seen when the skirt streams out behind her
    let lx = c8[0] - c5[0], ly = c8[1] - c5[1], lz = c8[2] - c5[2];
    const ll = Math.hypot(lx, ly, lz) || 1; lx /= ll; ly /= ll; lz /= ll;
    for (let e = -1; e <= 1; e += 2) {
      const lift = Math.max(0, e * cp) * 0.05 * wk, fw = 0.03 + 0.12 * e * sp * wk, a0 = this.at(0.07 * e, 0.06 + lift, fw), kick = Math.sin(time * 2.1 + e) * 0.04;
      const a1 = [c8[0] + (R[0] * 0.06 * e + lx * 0.12 + F[0] * kick) * SC, c8[1] + (R[1] * 0.06 * e + ly * 0.12 + F[1] * kick) * SC, c8[2] + (R[2] * 0.06 * e + lz * 0.12 + F[2] * kick) * SC];
      const an = [lerp(a0[0], a1[0], fly), lerp(a0[1], a1[1], fly), lerp(a0[2], a1[2], fly)];
      const hip = [c5[0] + R[0] * 0.05 * e * SC, c5[1] + R[1] * 0.05 * e * SC, c5[2] + R[2] * 0.05 * e * SC];
      const kn = [(hip[0] + an[0]) / 2 + F[0] * 0.04 * SC, (hip[1] + an[1]) / 2 + F[1] * 0.04 * SC, (hip[2] + an[2]) / 2 + F[2] * 0.04 * SC];
      this.tube([hip, kn, an], [0.05, 0.042, 0.034], 6, [0.84, 0.85, 0.92], 0.8);
      let ex = lerp(F[0], an[0] - kn[0], fly), ey = lerp(F[1], an[1] - kn[1], fly), ez = lerp(F[2], an[2] - kn[2], fly);
      const el = Math.hypot(ex, ey, ez) || 1; ex /= el; ey /= el; ez /= el;
      let bx = ey * R[2] - ez * R[1], by = ez * R[0] - ex * R[2], bz = ex * R[1] - ey * R[0];
      const bl = Math.hypot(bx, by, bz) || 1; bx /= bl; by /= bl; bz /= bl;
      this.ball([an[0] + ex * 0.05 * SC, an[1] + ey * 0.05 * SC, an[2] + ez * 0.05 * SC], R, 0.042, [bx, by, bz], 0.046, [ex, ey, ez], 0.1, 5, 7, [0.24, 0.18, 0.21], 1);
    }

    // ----- the bodice -----
    const NT = HERO_TU.length;
    this.grid(NT, 12);
    for (let j = 0; j < NT; j++) {
      const u = HERO_TU[j], spf = (u - 1.03) * kSp + HERO_TC[j], tw = 0.09 * wk * sp * (u - 1.03) / 0.36, ctw = Math.cos(tw), stw = Math.sin(tw);
      for (let i = 0; i < 12; i++) {
        const th = (i / 12) * TAU, r0 = Math.sin(th) * HERO_TX[j], f0 = Math.cos(th) * HERO_TF[j];
        this.put(j, i, r0 * ctw + f0 * stw, u, f0 * ctw - r0 * stw + spf, WH[(i + j) % 2], 1);
      }
    }
    this.flush(true, 0.12, 1.2, 2);
    // the sash
    this.grid(3, 12);
    for (let j = 0; j < 3; j++) {
      const u = 0.99 + 0.04 * j, kx = [0.113, 0.114, 0.126][j], kf = [0.096, 0.094, 0.102][j];
      for (let i = 0; i < 12; i++) { const th = (i / 12) * TAU; this.put(j, i, Math.sin(th) * kx, u, Math.cos(th) * kf + (u - 1.03) * kSp, HERO_BLUE, i % 2 ? 1 : 0.86); }
    }
    this.flush(true, 0, 1.2, 2);

    // ----- head, hair, hat. She keeps her eyes on where she is going -----
    const ha = 0.5 * L + 0.04, cha = Math.cos(ha), sha = Math.sin(ha);
    const Uh = [U[0] * cha - F[0] * sha, U[1] * cha - F[1] * sha, U[2] * cha - F[2] * sha], Fp = [F[0] * cha + U[0] * sha, F[1] * cha + U[1] * sha, F[2] * cha + U[2] * sha];
    let hy = 0;
    if (ps > 0.01 && this.eye) { const ex = this.eye[0] - x, ez = this.eye[2] - z, el = Math.hypot(ex, ez) || 1; hy = clamp(Math.atan2((ex * rx + ez * rz) / el, (ex * hx + ez * hz) / el), -1.1, 1.1) * ps; }
    const chy = Math.cos(hy), shy = Math.sin(hy);
    const Rh = [R[0] * chy - Fp[0] * shy, R[1] * chy - Fp[1] * shy, R[2] * chy - Fp[2] * shy], Fh = [Fp[0] * chy + R[0] * shy, Fp[1] * chy + R[1] * shy, Fp[2] * chy + R[2] * shy];
    const nb = this.at(0, 1.4, (1.4 - 1.03) * kSp), off = (p, a, ka, b, kb2, c, kc) => [p[0] + (a[0] * ka + b[0] * kb2 + c[0] * kc) * SC, p[1] + (a[1] * ka + b[1] * kb2 + c[1] * kc) * SC, p[2] + (a[2] * ka + b[2] * kb2 + c[2] * kc) * SC];
    this.tube([off(nb, R, 0, Uh, -0.02, Fh, 0), off(nb, R, 0, Uh, 0.085, Fh, 0.004)], [0.043, 0.038], 8, HERO_SKIN, 0.96);
    const hc = off(nb, R, 0, Uh, 0.168, Fh, 0.014);
    // a face without features: the brim keeps her eyes in shade
    this.ball(hc, Rh, 0.08, Uh, 0.104, Fh, 0.09, 9, 12, HERO_SKIN, 1, (th, la) => 1 - 0.2 * Math.max(0, Math.cos(th)) * sstep(-0.1, 0.35, la));
    this.ball(off(hc, Rh, 0, Uh, 0.014, Fh, -0.024), Rh, 0.086, Uh, 0.106, Fh, 0.094, 7, 10, HERO_HAIR, 1);
    this.ball(off(hc, Rh, 0, Uh, -0.032, Fh, -0.105), Rh, 0.054, Uh, 0.05, Fh, 0.05, 5, 8, HERO_HAIR, 0.9);
    const Ut = [Uh[0] * 0.995 - Fh[0] * 0.1, Uh[1] * 0.995 - Fh[1] * 0.1, Uh[2] * 0.995 - Fh[2] * 0.1], Ft = [Fh[0] * 0.995 + Uh[0] * 0.1, Fh[1] * 0.995 + Uh[1] * 0.1, Fh[2] * 0.995 + Uh[2] * 0.1];
    const hb = off(hc, Rh, 0, Uh, 0.082, Fh, 0);
    this.grid(3, 16);
    for (let j = 0; j < 3; j++) {
      const rad = [0.078, 0.165, 0.25][j] * SC, drop = [0, 0.004, 0.026][j];
      for (let i = 0; i < 16; i++) {
        const th = (i / 16) * TAU, a = Math.sin(th) * rad, e = Math.cos(th) * rad, dd = -(drop + (j === 2 ? 0.014 * Math.cos(2 * th + 0.6) + 0.006 * Math.sin(time * 3 + th * 3) : 0)) * SC;
        this.putW(j, i, hb[0] + Rh[0] * a + Ft[0] * e + Ut[0] * dd, hb[1] + Rh[1] * a + Ft[1] * e + Ut[1] * dd, hb[2] + Rh[2] * a + Ft[2] * e + Ut[2] * dd, HERO_STRAW, i % 2 ? 1 : 0.9);
      }
    }
    this.flush(true, 0.35, 2, 2, Ut[0], Ut[1], Ut[2]);
    this.grid(4, 12);
    for (let j = 0; j < 4; j++) {
      const rad = [0.09, 0.086, 0.07, 0.012][j] * SC, hh = [0, 0.06, 0.073, 0.077][j] * SC;
      for (let i = 0; i < 12; i++) { const th = (i / 12) * TAU, a = Math.sin(th) * rad, e = Math.cos(th) * rad; this.putW(j, i, hb[0] + Rh[0] * a + Ft[0] * e + Ut[0] * hh, hb[1] + Rh[1] * a + Ft[1] * e + Ut[1] * hh, hb[2] + Rh[2] * a + Ft[2] * e + Ut[2] * hh, HERO_STRAW, 1.04); }
    }
    this.flush(true, 0, 2, 2);
    this.grid(2, 12);
    for (let j = 0; j < 2; j++) {
      const rad = [0.0935, 0.091][j] * SC, hh = [0.005, 0.034][j] * SC;
      for (let i = 0; i < 12; i++) { const th = (i / 12) * TAU, a = Math.sin(th) * rad, e = Math.cos(th) * rad; this.putW(j, i, hb[0] + Rh[0] * a + Ft[0] * e + Ut[0] * hh, hb[1] + Rh[1] * a + Ft[1] * e + Ut[1] * hh, hb[2] + Rh[2] * a + Ft[2] * e + Ut[2] * hh, [0.2, 0.25, 0.5], 1); }
    }
    this.flush(true, 0, 2, 2);
    { const p = off(hb, Rh, 0.088, Ut, 0.03, Ft, 0.035); S.bill(p[0], p[1], p[2], 0.4, 0.085 * SC, 0.08 * SC, [0.92, 0.26, 0.2], 0, CELL.DOT, 0.1, false, 0, 1, 0, 0); }
    { const p = off(hb, Rh, 0.07, Ut, 0.04, Ft, 0.07); S.bill(p[0], p[1], p[2], 1.2, 0.06 * SC, 0.055 * SC, [0.98, 0.62, 0.56], 0, CELL.DOT, 0.1, false, 0, 1, 0, 0); }

    // ----- the parasol: on her shoulder when she walks, ahead of her when she flies, and it beats like a wing when she climbs -----
    const tau = lerp(lerp((0.3 + Math.sin(time * 1.7) * 0.03) * (1 - fly) - 0.6 * L * fly, -0.3 + Math.sin(time * 1.7) * 0.02, ps), 0.7 + Math.sin(time * 1.7) * 0.02, p2);
    const side = lerp(lerp((0.14 + Math.sin(time * 1.3) * 0.02) * (1 - fly), 0.27, ps), -0.05, p2), cta = Math.cos(tau), sta = Math.sin(tau);
    let ax = U[0] * cta - F[0] * sta + R[0] * side, ay = U[1] * cta - F[1] * sta + R[1] * side, az = U[2] * cta - F[2] * sta + R[2] * side;
    const al = Math.hypot(ax, ay, az) || 1; ax /= al; ay /= al; az /= al;
    const shf = (1.335 - 1.03) * kSp;
    const hand = this.at(lerp(lerp(lerp(0.104, 0.12, fly), 0.035, ps), 0.07, p2), lerp(lerp(lerp(1.353, 1.86, fly) - 0.13 * fk * fly, 1.21, ps), 1.1, p2), lerp(lerp(lerp(0.167, 0.1, fly) + shf, 0.215, ps), 0.33, p2));
    const grip = lerp(lerp(lerp(0.98, 0.74, fly), 0.9, ps), 1.06, p2) * SC, hub = this.hub;
    hub[0] = hand[0] + ax * grip; hub[1] = hand[1] + ay * grip; hub[2] = hand[2] + az * grip;
    const Rp = (0.64 + 0.4 * fly) * (1 + 0.2 * fk) * lerp(1, 0.78, ps) * lerp(1, 0.9, p2) * SC, sag = Rp * (0.42 - 0.17 * fk);
    this.rp = Rp;
    let e1x = R[0], e1y = R[1], e1z = R[2];
    const ed = e1x * ax + e1y * ay + e1z * az; e1x -= ax * ed; e1y -= ay * ed; e1z -= az * ed;
    const e1l = Math.hypot(e1x, e1y, e1z) || 1; e1x /= e1l; e1y /= e1l; e1z /= e1l;
    const e2x = ay * e1z - az * e1y, e2y = az * e1x - ax * e1z, e2z = ax * e1y - ay * e1x;
    const NP = 6, NG = 20;
    for (let side2 = 0; side2 < 2; side2++) {
      const lift = side2 ? -0.014 * SC : 0;
      this.grid(NP, NG);
      for (let j = 0; j < NP; j++) {
        const t = j / (NP - 1);
        for (let i = 0; i < NG; i++) {
          const th = (i / NG) * TAU, odd = i % 2, rho = Rp * (0.04 + 0.96 * Math.pow(t, 0.9)) * (1 - (odd && j > 3 ? 0.03 * (j - 3) : 0)), drop = sag * Math.pow(t, 1.8) - (odd ? 0.014 * t * SC : 0) - lift;
          const ca = Math.cos(th) * rho, sa = Math.sin(th) * rho, g = Math.floor(i / 2);
          this.putW(j, i, hub[0] + e1x * ca + e2x * sa - ax * drop, hub[1] + e1y * ca + e2y * sa - ay * drop, hub[2] + e1z * ca + e2z * sa - az * drop,
            side2 ? HERO_UNDER[odd] : HERO_GREEN[odd + 2 * (g % 2)], side2 ? 1 : 1 - 0.1 * t * odd);
        }
      }
      if (!side2) {
        this.flush(true, 0.5, 1.0, 2, ax, ay, az);
        // light on the ribs, and a pale line round the rim
        for (let i = 0; i < NG; i += 2) {
          const a = (1 * NG + i) * 3, b = ((NP - 1) * NG + i) * 3, c = ((NP - 1) * NG + (i + 2) % NG) * 3, m = (3 * NG + i) * 3;
          seg(G[a], G[a + 1], G[a + 2], G[b], G[b + 1], G[b + 2], N[m], N[m + 1], N[m + 2], 0.045 * SC, [0.56, 0.78, 0.5], CELL.LONG_B, 0, 1.0);
          seg(G[b], G[b + 1], G[b + 2], G[c], G[c + 1], G[c + 2], N[b], N[b + 1], N[b + 2], 0.05 * SC, [0.74, 0.88, 0.62], i % 4 ? CELL.LONG_A : CELL.LONG_B, 0, 1.12);
        }
      } else this.flush(true, 0.95, 1.0, 2, -ax, -ay, -az);
    }
    this.tipL[0] = hub[0] - e1x * Rp - ax * sag; this.tipL[1] = hub[1] - e1y * Rp - ay * sag; this.tipL[2] = hub[2] - e1z * Rp - az * sag;
    this.tipR[0] = hub[0] + e1x * Rp - ax * sag; this.tipR[1] = hub[1] + e1y * Rp - ay * sag; this.tipR[2] = hub[2] + e1z * Rp - az * sag;
    const he = lerp(0.07, 0.03, fly) * SC;
    this.tube([[hand[0] - ax * he, hand[1] - ay * he, hand[2] - az * he], [hub[0] + ax * 0.07 * SC, hub[1] + ay * 0.07 * SC, hub[2] + az * 0.07 * SC]], [0.012, 0.009], 5, HERO_WOOD, 1);

    // ----- arms: one holds the parasol, the other swings as she walks and opens like a wing when she flies -----
    const shR = this.at(0.168, 1.335, shf), shL = this.at(-0.168, 1.335, shf);
    const elR = [(shR[0] + hand[0]) / 2 + (R[0] * 0.075 - U[0] * 0.06 * (1 - fly) + F[0] * 0.03) * SC, (shR[1] + hand[1]) / 2 + (R[1] * 0.075 - U[1] * 0.06 * (1 - fly) + F[1] * 0.03) * SC, (shR[2] + hand[2]) / 2 + (R[2] * 0.075 - U[2] * 0.06 * (1 - fly) + F[2] * 0.03) * SC];
    this.tube([shR, elR, hand], [0.054, 0.044, 0.032], 7, WH[1], 1, 0.15);
    this.ball(hand, R, 0.034, U, 0.04, F, 0.034, 4, 6, HERO_SKIN, 1);
    // (sliding, it goes out for balance)
    const sd = this.slide * (1 - fly), bal = Math.sin(time * 2.3) * 0.05;
    const hL = this.at(lerp(lerp(-0.215, -0.54, sd), -0.62, fly), lerp(lerp(0.94, 1.2 + bal, sd), 1.27, fly) - 0.1 * fk * fly, lerp(lerp(0.06 + 0.1 * sp * wk, 0.08, sd), -0.2, fly) + shf * fly);
    const eL = this.at(lerp(lerp(-0.235, -0.36, sd), -0.4, fly), lerp(lerp(1.13, 1.27, sd), 1.335, fly), lerp(lerp(-0.02 + 0.04 * sp * wk, 0.02, sd), -0.07, fly) + shf * fly);
    if (ps > 0.001) { const hp = this.at(-0.015, 1.14, 0.205), ep = this.at(-0.245, 1.12, 0.07); for (let i = 0; i < 3; i++) { hL[i] = lerp(hL[i], hp[i], ps); eL[i] = lerp(eL[i], ep[i], ps); } } // the other hand comes to the handle too
    this.tube([shL, eL, hL], [0.054, 0.044, 0.032], 7, WH[0], 1, 0.15);
    this.ball(hL, R, 0.034, U, 0.04, F, 0.034, 4, 6, HERO_SKIN, 1);

    // ----- what is only paint: the veil, the ribbons of the hat and of the sash. They go where the air takes them -----
    const dir = (w, g, kw) => { const dx = w[0] * kw, dy = Math.min(w[1] * kw, g * 0.6) - g, dz = w[2] * kw, l = Math.hypot(dx, dy, dz) || 1; return [dx / l, dy / l, dz / l]; };
    const m1 = Math.hypot(w1[0], w1[2]), m2 = Math.hypot(w2[0], w2[2]);
    const t1 = dir(w1, 2.6 - 1.5 * p2, 1), t2 = dir(w2, 2.6 - 1.5 * p2, 1), vl = (0.24 + Math.min(m1, 12) * 0.02) * (1 + 1.5 * p2) * SC, vl2 = (0.2 + Math.min(m2, 12) * 0.022) * (1 + 1.9 * p2) * SC;
    const vb = [0.6, 0.76, 0.95], vc = (c) => (p2 > 0.01 ? mixc(c, vb, 0.85 * p2) : c);
    for (let k = -1; k <= 1; k += 2) {
      const a0 = off(hb, Rh, 0.06 * k, Ut, -0.03, Ft, -0.21), wv = Math.sin(time * 4.2 + k * 1.9) * 0.04, wv2 = Math.sin(time * 3.1 + k * 2.3 + 1) * 0.08;
      const b0 = [a0[0] + t1[0] * vl + R[0] * wv, a0[1] + t1[1] * vl, a0[2] + t1[2] * vl + R[2] * wv], c0 = [b0[0] + t2[0] * vl2 + R[0] * wv2, b0[1] + t2[1] * vl2, b0[2] + t2[2] * vl2 + R[2] * wv2];
      S.add((a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2, (a0[2] + b0[2]) / 2, b0[0] - a0[0], b0[1] - a0[1], b0[2] - a0[2], -F[0], 0.4, -F[2], vl * 1.15, 0.1 * (1 + 0.5 * p2) * SC, vc(k > 0 ? [0.95, 0.96, 1.0] : [0.98, 0.97, 0.95]), 0, CELL.LONG_A, 0, 0);
      S.add((b0[0] + c0[0]) / 2, (b0[1] + c0[1]) / 2, (b0[2] + c0[2]) / 2, c0[0] - b0[0], c0[1] - b0[1], c0[2] - b0[2], -F[0], 0.4, -F[2], vl2 * 1.2, 0.085 * (1 + 0.6 * p2) * SC, vc(k > 0 ? [0.92, 0.95, 1.0] : [0.97, 0.96, 0.98]), 0, k > 0 ? CELL.COMMA : CELL.COMMA_S, 0, 0);
    }
    for (let k = -1; k <= 1; k += 2) { // the ribbons of the hat
      const a0 = off(hb, Rh, 0.03 * k, Ut, 0.02, Ft, -0.092), l = (0.24 + Math.min(m1, 12) * 0.022) * SC, wv = Math.sin(time * 5 + k) * 0.05;
      S.add(a0[0] + t1[0] * l * 0.5 + R[0] * wv, a0[1] + t1[1] * l * 0.5, a0[2] + t1[2] * l * 0.5 + R[2] * wv, t1[0] + R[0] * wv, t1[1], t1[2] + R[2] * wv, -F[0], 0.4, -F[2], l, 0.045 * SC, [0.2, 0.25, 0.5], 0, CELL.LONG_B, 0, FLAG_AXIAL);
    }
    const sb0 = this.at(0, 1.02, -0.1 + (1.02 - 1.03) * kSp), ts = dir(w1, 3.4, 0.6), ts2 = dir(w2, 3.4, 0.6);
    for (let k = -1; k <= 1; k += 2) { // the bow of the sash and its two ends
      const l = 0.46 * SC, wv = Math.sin(time * 3.3 + k * 1.4) * 0.04, tx = lerp(ts[0], ts2[0], 0.5) + R[0] * (0.16 * k + wv), ty = lerp(ts[1], ts2[1], 0.5), tz = lerp(ts[2], ts2[2], 0.5) + R[2] * (0.16 * k + wv);
      S.add(sb0[0] + tx * l * 0.5 - F[0] * 0.03, sb0[1] + ty * l * 0.5, sb0[2] + tz * l * 0.5 - F[2] * 0.03, tx, ty, tz, -F[0], 0.2, -F[2], l, 0.085 * SC, k > 0 ? HERO_BLUE : [0.4, 0.54, 0.82], 0, CELL.LONG_A, 0, 0);
      S.add(sb0[0] + R[0] * 0.075 * k * SC - F[0] * 0.035, sb0[1] + 0.015, sb0[2] + R[2] * 0.075 * k * SC - F[2] * 0.035, R[0] * k, 0.35, R[2] * k, -F[0], 0.2, -F[2], 0.17 * SC, 0.09 * SC, [0.36, 0.5, 0.8], 0, CELL.DAB, 0, 0);
    }
    if (p2 > 0.3) { const fp = this.at(0.1, 1.06, 0.13); S.bill(fp[0], fp[1], fp[2], 0.7, 0.1 * SC * p2, 0.09 * SC * p2, [0.92, 0.2, 0.2], 0, CELL.DOT, 0.1, false, 0, 1, 0, 0); } // a red flower at her waist
    this.ready = true;
  }
}
