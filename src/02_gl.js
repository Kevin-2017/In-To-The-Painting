// ---------- WebGL2 helpers ----------
function glShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    throw new Error('shader compile failed\n' + log + '\n' + src.split('\n').map((l, i) => (i + 1) + ' ' + l).join('\n'));
  }
  return s;
}
function glProgram(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, glShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, glShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('program link failed ' + gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    const name = info.name.replace(/\[0\]$/, '');
    u[name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}
function glBuffer(gl, target, data, usage) {
  const b = gl.createBuffer();
  gl.bindBuffer(target, b);
  gl.bufferData(target, data, usage || gl.STATIC_DRAW);
  return b;
}

// ---------- brush stroke atlas ----------
// 2 columns x 8 rows, each cell 512 x 128.
// R = paint height along the bristles, G = bristle id (which bristles carry the second colour),
// B = slope of the paint across the stroke (for raking light), A = soft coverage with dry gaps.
const ATLAS_W = 1024, ATLAS_H = 1024, CELL_W = 512, CELL_H = 128;
const CELL = { LONG_A: 0, LONG_B: 1, HEAVY: 2, LEAF: 3, COMMA: 4, COMMA_S: 5, DAB: 6, DOT: 7, BLADE: 8, DRY: 9, BLOCK: 10, ARC: 11, EAR: 12, TWIN: 13, TWIG: 14, RECT: 15 };

function buildAtlasPixels() {
  const W = CELL_W, H = CELL_H, N = ATLAS_W * ATLAS_H;
  const hgt = new Float32Array(N).fill(0.5), alp = new Float32Array(N), idc = new Float32Array(N).fill(0.5), out = new Uint8Array(N * 4);
  const n1 = (x, seed) => vnoise(x, 0.5, seed);
  // every cell is written pixel by pixel in stroke space: u runs along the stroke from where the brush
  // lands to where it lifts, v runs across it from -1 to 1
  // o: w(u) half width profile, curve, padX, padY, rag (edge), ragS, ragT (start and tail), dry, dryFrom, bristle, load, soft
  function cell(i, o) {
    const ox = (i % 2) * W, oy = Math.floor(i / 2) * H, seed = 100 + i * 37;
    const padX = o.padX === undefined ? 16 : o.padX, padY = o.padY === undefined ? 12 : o.padY;
    const curve = (o.curve || 0) * H, half = H / 2 - padY - Math.abs(curve) * 0.5;
    const rag = o.rag === undefined ? 0.16 : o.rag, ragS = o.ragS === undefined ? 0.05 : o.ragS, ragT = o.ragT === undefined ? 0.22 : o.ragT;
    const dry = o.dry === undefined ? 0.6 : o.dry, dryFrom = o.dryFrom === undefined ? 0.45 : o.dryFrom, soft = o.soft || 0.34;
    const bf = o.bristle || 40;
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const u = (px - padX) / (W - 2 * padX);
      if (u < -0.02 || u > 1.02) continue;
      const cy = H / 2 + curve * (0.5 - (1 - (2 * u - 1) * (2 * u - 1)));
      const v = (py - cy) / half, av = Math.abs(v);
      const shape = o.shape ? o.shape(u, v) : null; // optional override: {w, v, id}
      const w = shape ? shape.w : o.w(u), vv = shape && shape.v !== undefined ? shape.v : v, avv = Math.abs(vv);
      if (w <= 0 || avv > w * 1.4 + 0.05) continue;
      // ragged sides, ragged start, a tail that breaks up as the brush runs dry
      const side = vv > 0 ? 17.3 : 3.1;
      const edge = w * (1 + rag * (n1(u * 10 + side, seed) - 0.55)) - avv;
      let a = sstep(0, Math.min(soft, 0.6 * w), edge);
      const uS = ragS * n1(vv * 9 + 3, seed + 1) * 1.6, uT = 1 - ragT * Math.pow(n1(vv * 12 + 7, seed + 2), 1.4) - 0.01;
      a *= sstep(uS, uS + 0.035, u) * (1 - sstep(uT - 0.07, uT, u));
      if (a <= 0.001) continue;
      const streak = vnoise(vv * bf * 1.15 + 5, u * 2.4, seed + 3);
      const dryAmt = dry * sstep(dryFrom, 1.0, u);
      a *= sstep(dryAmt - 0.1, dryAmt + 0.06, streak * 0.75 + 0.25 * vnoise(vv * 9, u * 7, seed + 4) + (1 - dryAmt) * 0.25);
      // height of the paint: fine bristle furrows, broader swells, more paint where the stroke begins, thinner at the rim
      let h = 0.5 + (vnoise(vv * bf + 11, u * 1.7, seed + 5) - 0.5) * 0.38 + (vnoise(vv * bf * 0.3, u * 1.1, seed + 6) - 0.5) * 0.34
        + (o.load === undefined ? 0.12 : o.load) * (1 - sstep(0.0, 0.3, u)) - 0.3 * sstep(0.62, 1.0, avv / w) + 0.1 * sstep(uT - 0.12, uT - 0.03, u);
      const k = (oy + py) * ATLAS_W + ox + px;
      hgt[k] = clamp(h, 0, 1); alp[k] = clamp(a, 0, 1);
      // broad bands across the bristles decide which part of the brush carries the second colour
      idc[k] = shape && shape.id !== undefined ? shape.id : clamp(0.5 + (vnoise(vv * 2.3 + seed, u * 0.8 + 3, seed + 7) - 0.5) * 1.6 + (vnoise(vv * 9 + 2, u * 1.5, seed + 8) - 0.5) * 0.3, 0, 1);
    }
  }
  const body = (rise, fall) => (u) => Math.min(sstep(-0.01, rise, u) * 0.999 + 0.001, 1 - 0.55 * sstep(fall, 1.0, u));
  cell(CELL.LONG_A, { w: body(0.07, 0.72), dry: 0.62 });
  cell(CELL.LONG_B, { w: (u) => 0.72 * body(0.1, 0.6)(u), dry: 0.85, dryFrom: 0.3, rag: 0.26, ragT: 0.32 });
  cell(CELL.HEAVY, { w: body(0.05, 0.86), dry: 0.34, dryFrom: 0.6, padY: 8, load: 0.2, ragT: 0.14 });
  cell(CELL.LEAF, { w: (u) => Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 0.75), dry: 0.2, dryFrom: 0.7, ragT: 0.06, ragS: 0.02 });
  cell(CELL.COMMA, { w: body(0.08, 0.6), curve: 0.34, dry: 0.6 });
  cell(CELL.COMMA_S, { w: body(0.08, 0.66), curve: -0.26, dry: 0.55 });
  cell(CELL.DAB, { w: (u) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 2.6)), 0.5), dry: 0.3, dryFrom: 0.62, padX: 24, padY: 8, ragT: 0.1, load: 0.2 });
  cell(CELL.DOT, { w: (u) => Math.sqrt(Math.max(0, 1 - (2 * u - 1) * (2 * u - 1))), dry: 0.08, dryFrom: 0.8, padX: 28, padY: 8, ragT: 0.03, ragS: 0.02, rag: 0.1, load: 0.05 });
  cell(CELL.BLADE, { w: (u) => (1 - 0.86 * clamp(u, 0, 1)) * sstep(-0.01, 0.05, u), dry: 0.5, dryFrom: 0.5, ragT: 0.12 });
  cell(CELL.DRY, { w: body(0.08, 0.7), dry: 1.0, dryFrom: 0.12, rag: 0.3, ragT: 0.4 });
  cell(CELL.BLOCK, { w: (u) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 7)), 0.3), dry: 0.24, dryFrom: 0.7, padX: 22, padY: 8, ragT: 0.07, rag: 0.12 });
  cell(CELL.ARC, { w: (u) => 0.8 * body(0.08, 0.66)(u), curve: 0.5, dry: 0.45, padY: 10 });
  // a stalk written as short overlapping touches
  cell(CELL.EAR, { padY: 8, dry: 0.25, dryFrom: 0.8, ragT: 0.04, ragS: 0.02, shape: (u, v) => {
    const n = 6, k = Math.floor(clamp(u, 0, 0.9999) * n), f = u * n - k;
    const off = (hash2(k, 3, 91) - 0.5) * 0.5, tilt = (hash2(k, 5, 91) - 0.5) * 0.9;
    const wd = (0.3 + 0.24 * (k / (n - 1))) * Math.pow(Math.sin(Math.PI * clamp(f * 0.86 + 0.07, 0, 1)), 0.5);
    return { w: wd, v: v - off - tilt * (f - 0.5), id: hash2(k, 7, 91) };
  } });
  cell(CELL.TWIN, { dry: 0.6, shape: (u, v) => ({ w: 0.36 * body(0.08, 0.68)(v > 0 ? u : u * 0.92 + 0.02), v: v > 0 ? v - 0.52 : v + 0.52 }) });
  cell(CELL.TWIG, { dry: 0.3, dryFrom: 0.7, ragT: 0.05, rag: 0.3, shape: (u, v) => {
    const main = v - 0.34 * Math.sin(u * 5.2 + 1);
    const br = u > 0.4 && u < 0.82 ? v + 0.75 * (u - 0.4) / 0.42 - 0.2 * Math.sin(u * 5.2 + 1) * (1 - (u - 0.4) / 0.42) : 9;
    return Math.abs(br) < Math.abs(main) ? { w: 0.1, v: br } : { w: 0.15 * (1 - 0.5 * u), v: main };
  } });
  cell(CELL.RECT, { w: () => 0.97, dry: 0.03, dryFrom: 0.9, ragT: 0.02, ragS: 0.012, rag: 0.07, padX: 12, padY: 7, load: 0.02, soft: 0.12 });

  for (let y = 0; y < ATLAS_H; y++) for (let x = 0; x < ATLAS_W; x++) {
    const i = y * ATLAS_W + x, up = y > 1 ? i - 2 * ATLAS_W : i, dn = y < ATLAS_H - 2 ? i + 2 * ATLAS_W : i;
    const slope = (hgt[dn] * alp[dn] - hgt[up] * alp[up]) * 1.1;
    out[i * 4] = Math.round(hgt[i] * 255);
    out[i * 4 + 1] = Math.round(idc[i] * 255);
    out[i * 4 + 2] = Math.round(clamp(0.5 + slope, 0, 1) * 255);
    out[i * 4 + 3] = Math.round(alp[i] * 255);
  }
  return out;
}

// ---------- the painted ground: a tiling field of small overlapping dabs ----------
// R = brightness of each dab, G = bristle height inside it, B = hue offset of each dab, A = 0 where bare canvas shows
function buildBrushPixels(size) {
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const rnd = mulberry32(4242);
  const count = Math.round((size * size) / 105);
  for (let k = 0; k < count; k++) {
    const x = rnd() * size, y = rnd() * size, ang = (rnd() - 0.5) * 1.1, len = size * (0.055 + rnd() * 0.06), wid = size * (0.018 + rnd() * 0.016);
    const val = Math.round(30 + rnd() * 195), hue = Math.round(rnd() * 255), nb = 6, bow = (rnd() - 0.5) * wid * 0.8;
    const br = [];
    for (let j = 0; j < nb; j++) br.push([rnd() * len * 0.14, rnd() * len * 0.22, Math.round(clamp(128 + (rnd() - 0.5) * 170 - (j === 0 || j === nb - 1 ? 46 : 0), 0, 255))]);
    for (let wx = -1; wx <= 1; wx++) for (let wy = -1; wy <= 1; wy++) {
      const px = x + wx * size, py = y + wy * size;
      if (px < -len || px > size + len || py < -len || py > size + len) continue;
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
      for (let j = 0; j < nb; j++) {
        const yy = ((j + 0.5) / nb - 0.5) * wid;
        ctx.strokeStyle = 'rgb(' + val + ',' + br[j][2] + ',' + hue + ')'; ctx.lineWidth = (wid / nb) * 2.0; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-len / 2 + br[j][0], yy); ctx.quadraticCurveTo(0, yy + bow, len / 2 - br[j][1], yy); ctx.stroke();
      }
      ctx.restore();
    }
  }
  return new Uint8Array(ctx.getImageData(0, 0, size, size).data.buffer);
}

// tiling noise texture: R broad blotches, G mid, B streaks stretched along x, A fine grain
function buildNoisePixels(size) {
  const d = new Uint8Array(size * size * 4);
  function tn(x, y, px, py, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const w = (a, p) => ((a % p) + p) % p;
    const a = hash2(w(ix, px), w(iy, py), seed), b = hash2(w(ix + 1, px), w(iy, py), seed);
    const c = hash2(w(ix, px), w(iy + 1, py), seed), e = hash2(w(ix + 1, px), w(iy + 1, py), seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, fx = x / size, fy = y / size;
    const r = tn(fx * 4, fy * 4, 4, 4, 1) * 0.6 + tn(fx * 8, fy * 8, 8, 8, 2) * 0.4;
    const g = tn(fx * 16, fy * 16, 16, 16, 3) * 0.6 + tn(fx * 32, fy * 32, 32, 32, 4) * 0.4;
    const b = tn(fx * 6, fy * 48, 6, 48, 5) * 0.55 + tn(fx * 12, fy * 96, 12, 96, 6) * 0.45;
    const a = hash2(x, y, 7);
    d[i] = r * 255; d[i + 1] = g * 255; d[i + 2] = b * 255; d[i + 3] = a * 255;
  }
  return d;
}
