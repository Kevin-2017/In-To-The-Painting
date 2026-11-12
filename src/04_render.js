// ---------- renderer ----------
const MAX_STROKES = 300000;
const MAX_DYN = 4096;
const MAX_GLOW = 512;
const TERRAIN_N = 200, TERRAIN_R = 800, TERRAIN_P = 1.6;
const MAX_TOUCH = 40000;
const FLAG_DOME = 1, FLAG_AXIAL = 2, FLAG_BILL = 4, FLAG_WATER = 8, FLAG_LEAF = 16, FLAG_FLOWER = 32, FLAG_GROUND = 64, FLAG_GRASS = 128, FLAG_FLAT = 256, FLAG_FLOAT = 512; // FLAT: lies where it was laid and does not turn to the eye. FLOAT: rides the water
const SHADOW_RES = 1024, REFL_W = 640, REFL_H = 360;

const TERRAIN_G = (() => {
  const g = new Float32Array(TERRAIN_N + 1);
  for (let i = 0; i <= TERRAIN_N; i++) { const u = (i / TERRAIN_N) * 2 - 1; g[i] = Math.sign(u) * TERRAIN_R * Math.pow(Math.abs(u), TERRAIN_P); }
  return g;
})();
function terrainIndex(x) {
  const u = Math.sign(x) * Math.pow(Math.min(Math.abs(x) / TERRAIN_R, 1), 1 / TERRAIN_P);
  let i = Math.floor(((u + 1) / 2) * TERRAIN_N);
  if (i < 0) i = 0; else if (i > TERRAIN_N - 1) i = TERRAIN_N - 1;
  if (x < TERRAIN_G[i] && i > 0) i--; else if (x > TERRAIN_G[i + 1] && i < TERRAIN_N - 1) i++;
  return i;
}
function meshHeight(heights, x, z) {
  const i = terrainIndex(x), j = terrainIndex(z);
  const x0 = TERRAIN_G[i], x1 = TERRAIN_G[i + 1], z0 = TERRAIN_G[j], z1 = TERRAIN_G[j + 1];
  const tx = clamp((x - x0) / (x1 - x0), 0, 1), tz = clamp((z - z0) / (z1 - z0), 0, 1);
  const W = TERRAIN_N + 1;
  const h00 = heights[j * W + i], h10 = heights[j * W + i + 1], h01 = heights[(j + 1) * W + i], h11 = heights[(j + 1) * W + i + 1];
  return tx >= tz ? h00 + (h10 - h00) * tx + (h11 - h10) * tz : h00 + (h11 - h01) * tx + (h01 - h00) * tz;
}

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = this.gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.pStroke = glProgram(gl, GLSL_STROKE_VS, GLSL_STROKE_FS);
    this.pTouch = glProgram(gl, GLSL_TOUCH_VS, GLSL_STROKE_FS);
    this.pTerrain = glProgram(gl, GLSL_TERRAIN_VS, GLSL_TERRAIN_FS);
    this.pSky = glProgram(gl, GLSL_SKY_VS, GLSL_SKY_FS);
    this.pSolid = glProgram(gl, GLSL_SOLID_VS, GLSL_SOLID_FS);
    this.pWater = glProgram(gl, GLSL_WATER_VS, GLSL_WATER_FS);
    this.pShadow = glProgram(gl, GLSL_SHADOW_VS, GLSL_SHADOW_FS);
    this.pGlow = glProgram(gl, GLSL_GLOW_VS, GLSL_GLOW_FS);
    this.pPost = glProgram(gl, GLSL_POST_VS, GLSL_POST_FS);
    this.pFig = glProgram(gl, GLSL_FIG_VS, GLSL_FIG_FS);

    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const tex = (w, h, data, mip, repeat) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      if (mip) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (!repeat) { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); }
      return t;
    };
    this.texAtlas = tex(ATLAS_W, ATLAS_H, buildAtlasPixels(), true, false);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAX_LOD, 3);
    this.texNoise = tex(256, 256, buildNoisePixels(256), true, true);
    this.texBrush = tex(512, 512, buildBrushPixels(512), true, true);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1));

    // shadow map: top down, darkness in red
    this.texShadow = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texShadow);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, SHADOW_RES, SHADOW_RES, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.fboShadow = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboShadow);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texShadow, 0);
    this.shadowData = new Float32Array(3 * 3 * 24000);
    this.bufShadow = glBuffer(gl, gl.ARRAY_BUFFER, this.shadowData, gl.DYNAMIC_DRAW);
    this.vaoShadow = gl.createVertexArray();
    gl.bindVertexArray(this.vaoShadow);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufShadow);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    // mirror image for the water
    this.texRefl = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texRefl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, REFL_W, REFL_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.reflDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.reflDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, REFL_W, REFL_H);
    this.fboRefl = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboRefl);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texRefl, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.reflDepth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.bufCorner = glBuffer(gl, gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]));
    this.bufTri = glBuffer(gl, gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]));
    this.vaoTri = gl.createVertexArray();
    gl.bindVertexArray(this.vaoTri);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTri);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.bufQuad = glBuffer(gl, gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
    this.vaoQuad = gl.createVertexArray();
    gl.bindVertexArray(this.vaoQuad);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufQuad);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const mk = (n) => glBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(n * 4), gl.DYNAMIC_DRAW);
    this.strokeBufs = [0, 1].map(() => [mk(MAX_STROKES), mk(MAX_STROKES), mk(MAX_STROKES), mk(MAX_STROKES)]);
    this.strokeCount = [0, 0];
    this.vaoStroke = this._strokeVao(this.strokeBufs[0], this.strokeBufs[1]);
    this.dynBufs = [mk(MAX_DYN), mk(MAX_DYN), mk(MAX_DYN), mk(MAX_DYN)];
    this.vaoDyn = this._strokeVao(this.dynBufs, this.dynBufs);
    this.dynCount = 0;

    // the small touches of the near ground: only a place in the tile and two chances each
    {
      const r = mulberry32(90917), d = new Float32Array(MAX_TOUCH * 4);
      for (let i = 0; i < MAX_TOUCH * 4; i++) d[i] = r();
      this.bufTouch = glBuffer(gl, gl.ARRAY_BUFFER, d);
      this.vaoTouch = gl.createVertexArray();
      gl.bindVertexArray(this.vaoTouch);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCorner);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTouch);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(1, 1);
      this.ground = [0, 1].map(() => {
        const th = gl.createTexture(), tc = gl.createTexture();
        for (const t of [th, tc]) {
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        return { th, tc, ok: false, x0: 0, z0: 0, span: 1, hn: 1 };
      });
    }

    this.glowData = new Float32Array(MAX_GLOW * 10);
    this.bufGlow = glBuffer(gl, gl.ARRAY_BUFFER, this.glowData, gl.DYNAMIC_DRAW);
    this.vaoGlow = gl.createVertexArray();
    gl.bindVertexArray(this.vaoGlow);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCorner);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufGlow);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 40, 0); gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 40, 16); gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 40, 32); gl.vertexAttribDivisor(3, 1);
    this.glowCount = 0;

    const W = TERRAIN_N + 1;
    const xz = new Float32Array(W * W * 2);
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { xz[(j * W + i) * 2] = TERRAIN_G[i]; xz[(j * W + i) * 2 + 1] = TERRAIN_G[j]; }
    const idx = new Uint32Array(TERRAIN_N * TERRAIN_N * 6);
    let k = 0;
    for (let j = 0; j < TERRAIN_N; j++) for (let i = 0; i < TERRAIN_N; i++) {
      const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
      idx[k++] = a; idx[k++] = b; idx[k++] = d; idx[k++] = a; idx[k++] = d; idx[k++] = c;
    }
    this.terrainIdxCount = idx.length;
    this.bufTerrainXZ = glBuffer(gl, gl.ARRAY_BUFFER, xz);
    this.terrainBufs = [mk(W * W), mk(W * W)];
    this.terrainNBufs = [mk(W * W), mk(W * W)];
    this.vaoTerrain = gl.createVertexArray();
    gl.bindVertexArray(this.vaoTerrain);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTerrainXZ);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    [this.terrainBufs[0], this.terrainBufs[1], this.terrainNBufs[0], this.terrainNBufs[1]].forEach((b, i) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.enableVertexAttribArray(1 + i); gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, 0, 0);
    });
    this.bufTerrainIdx = glBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, idx);

    this.solids = [0, 1].map(() => {
      const vao = gl.createVertexArray(), buf = gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
      return { vao, buf, count: 0 };
    });
    // the walker: remodelled every frame
    this.figBuf = gl.createBuffer(); this.vaoFig = gl.createVertexArray(); this.figCount = 0;
    gl.bindVertexArray(this.vaoFig);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.figBuf);
    gl.bufferData(gl.ARRAY_BUFFER, HERO_MAX * 48, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 4; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 48, i * 12); }
    gl.bindVertexArray(null);

    this.fbo = null; this.fbW = 0; this.fbH = 0; this.msaa = 4; this.msFbo = null; this.fbSamples = -1;
    this.view = new Float32Array(16); this.proj = new Float32Array(16); this.vp = new Float32Array(16); this.vpMain = new Float32Array(16);
    this.skyArr = new Float32Array(12);
    // the moving air and water: how far the clouds have gone (in turns of their noise), and the glide home when she settles
    this.settle = 0; this.cloudO = 0; this.cloudT = null; this.glide = null; this.cloudOff = [0, 0]; this.flowCfg = Renderer.FLOW.default; this.flowKey = null;
  }

  // what flows in this world, found by its chapter (f.flowId if the game gives it, else the chapter whose wind this is)
  _flowFor(f) {
    let key = f.flowId;
    if (key === undefined) {
      if (this.flowKey && this.flowKey[0] === f.windDir) return this.flowCfg;
      key = null;
      if (typeof WORLDS !== 'undefined') for (const ch of WORLDS) if (ch && ch.wind === f.windDir) { key = ch.id; break; }
      this.flowKey = [f.windDir];
    } else if (this.flowKey && this.flowKey[1] === key) return this.flowCfg;
    else this.flowKey = [null, key];
    const c = Object.assign({}, Renderer.FLOW.default, Renderer.FLOW[key] || {});
    // the clouds go with the wind, along one of eight ways, so that a whole turn of their noise brings the painted sky back
    const w = f.windDir || [1, 0], a = Math.round(Math.atan2(-w[1], -w[0]) / (Math.PI / 4)) * (Math.PI / 4);
    c.lat = [Math.round(Math.cos(a)), Math.round(Math.sin(a))];
    const sl = Math.hypot(c.swell[0], c.swell[1]) || 1; c.sd = [c.swell[0] / sl, c.swell[1] / sl];
    this.flowCfg = c;
    return c;
  }
  // once a frame: the clouds travel (faster while the hours fly), and when she settles at an easel they run on to where they were painted
  _flowStep(f) {
    const c = this._flowFor(f), s = clamp(f.settle || 0, 0, 1), t = f.time || 0, L = c.lat, per = Math.hypot(L[0], L[1]);
    const rate = (c.cloudV / per) * Math.min(10, 1 + Math.max(0, (f.rush || 1) - 1) * 0.3);
    let dt = this.cloudT === null ? -1 : t - this.cloudT;
    this.cloudT = t;
    if (!(dt >= 0 && dt < 0.5)) { this.cloudO = (t * c.cloudV) / per; this.glide = null; dt = 0; } // a jump in the clock: a still, or a pause
    this.cloudO += rate * dt * (1 - s);
    if (s > 0) {
      let g = this.glide;
      if (!g || this.cloudO > g.T + 1e-6) g = this.glide = { from: this.cloudO, T: Math.ceil(this.cloudO - 1e-6), s0: s };
      const k = g.s0 >= 0.999 ? 1 : clamp((s - g.s0) / (1 - g.s0), 0, 1), want = g.from + (g.T - g.from) * ease(k);
      if (want > this.cloudO) this.cloudO = want;
      if (s >= 0.999) this.cloudO = g.T;
    } else this.glide = null;
    const fr = this.cloudO - Math.floor(this.cloudO);
    this.cloudOff[0] = L[0] * fr; this.cloudOff[1] = L[1] * fr;
    this.settle = s;
  }

  _strokeVao(A, B) {
    const gl = this.gl, vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCorner);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (let s = 0; s < 2; s++) {
      const bufs = s === 0 ? A : B;
      for (let i = 0; i < 4; i++) {
        const loc = 1 + s * 4 + i;
        gl.bindBuffer(gl.ARRAY_BUFFER, bufs[i]);
        gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(loc, 1);
      }
    }
    return vao;
  }
  uploadWorld(slot, W) {
    const gl = this.gl, b = this.strokeBufs[slot], S = W.S;
    this.reflForce = 6; this.shKey = null; // a new world: its mirror and its shadows are made afresh
    gl.bindBuffer(gl.ARRAY_BUFFER, b[0]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.pos);
    gl.bindBuffer(gl.ARRAY_BUFFER, b[1]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.quat);
    gl.bindBuffer(gl.ARRAY_BUFFER, b[2]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.sca);
    gl.bindBuffer(gl.ARRAY_BUFFER, b[3]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.col);
    this.strokeCount[slot] = S.n;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.terrainBufs[slot]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, W.terrain);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.terrainNBufs[slot]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, W.terrainN);
    const s = this.solids[slot];
    gl.bindBuffer(gl.ARRAY_BUFFER, s.buf); gl.bufferData(gl.ARRAY_BUFFER, W.solid.subarray(0, Math.max(7, W.solidN * 7)), gl.STATIC_DRAW);
    s.count = W.solidN;
    const g = this.ground[slot], b2 = W.baked;
    g.ok = !!b2;
    if (b2) {
      gl.bindTexture(gl.TEXTURE_2D, g.th);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, b2.hn, b2.hn, 0, gl.RED, gl.FLOAT, b2.h);
      gl.bindTexture(gl.TEXTURE_2D, g.tc);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, b2.cn, b2.cn, 0, gl.RGBA, gl.UNSIGNED_BYTE, b2.c);
      g.x0 = b2.x0; g.z0 = b2.z0; g.span = b2.span; g.hn = b2.hn;
    }
  }
  clearSolids(slot) { this.solids[slot].count = 0; }
  uploadDyn(S) {
    const gl = this.gl, b = this.dynBufs, n = Math.min(S.n, MAX_DYN);
    if (n > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b[0]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.pos, 0, n * 4);
      gl.bindBuffer(gl.ARRAY_BUFFER, b[1]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.quat, 0, n * 4);
      gl.bindBuffer(gl.ARRAY_BUFFER, b[2]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.sca, 0, n * 4);
      gl.bindBuffer(gl.ARRAY_BUFFER, b[3]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.col, 0, n * 4);
    }
    this.dynCount = n;
  }
  uploadFigure(d, n) {
    const gl = this.gl;
    this.figCount = n;
    if (n > 0) { gl.bindBuffer(gl.ARRAY_BUFFER, this.figBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, d, 0, n * 12); }
  }
  beginGlows() { this.glowCount = 0; }
  glow(x, y, z, kind, r, g, b, w, h) {
    if (this.glowCount >= MAX_GLOW) return;
    const o = this.glowCount++ * 10, d = this.glowData;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = kind; d[o + 4] = r; d[o + 5] = g; d[o + 6] = b; d[o + 7] = 1; d[o + 8] = w; d[o + 9] = h;
  }

  resize(w, h) {
    const gl = this.gl;
    this.reflForce = 6;
    w = Math.max(2, w | 0); h = Math.max(2, h | 0);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    const samples = Math.min(this.msaa, gl.getParameter(gl.MAX_SAMPLES) || 0);
    if (this.fbW === w && this.fbH === h && this.fbSamples === samples) return;
    if (this.fbo) { gl.deleteFramebuffer(this.fbo); gl.deleteTexture(this.fbTex); gl.deleteRenderbuffer(this.fbDepth); }
    if (this.msFbo) { gl.deleteFramebuffer(this.msFbo); gl.deleteRenderbuffer(this.msColor); gl.deleteRenderbuffer(this.msDepth); this.msFbo = null; }
    this.fbW = w; this.fbH = h; this.fbSamples = samples;
    this.fbTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fbTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.fbDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.fbDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fbTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.fbDepth);
    if (samples > 1) {
      this.msColor = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.msColor);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, w, h);
      this.msDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.msDepth);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
      this.msFbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFbo);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.msColor);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.msDepth);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.deleteFramebuffer(this.msFbo); gl.deleteRenderbuffer(this.msColor); gl.deleteRenderbuffer(this.msDepth); this.msFbo = null;
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // uniforms of the hour, for whichever program asks for them
  _env(P, f) {
    const gl = this.gl, u = P.u, e = f.env;
    if (u.uSunDir) gl.uniform3fv(u.uSunDir, e.sunDir);
    if (u.uSun) gl.uniform3fv(u.uSun, e.sun);
    if (u.uAmb) gl.uniform3fv(u.uAmb, e.amb);
    if (u.uSky) { for (let i = 0; i < 4; i++) { this.skyArr[i * 3] = e.sky[i][0]; this.skyArr[i * 3 + 1] = e.sky[i][1]; this.skyArr[i * 3 + 2] = e.sky[i][2]; } gl.uniform3fv(u.uSky, this.skyArr); }
    if (u.uHaze) gl.uniform3fv(u.uHaze, e.haze);
    if (u.uGlowCol) gl.uniform3fv(u.uGlowCol, e.glow);
    if (u.uGlow) gl.uniform3f(u.uGlow, e.glowT, e.glowP, e.glowW);
    if (u.uCloudLit) gl.uniform3fv(u.uCloudLit, e.cloudLit);
    if (u.uCloudShade) gl.uniform3fv(u.uCloudShade, e.cloudShade);
    const fc = this.flowCfg, s1 = 1 - this.settle;
    if (u.uCloud) gl.uniform4f(u.uCloud, e.cover, Math.min(0.85, e.cloudShadow * (1 + (fc.shadow - 1) * s1)), this.cloudOff[0], this.cloudOff[1]);
    if (u.uShade) gl.uniform2f(u.uShade, 0.5 - fc.shadeW * s1, 0.72 - fc.shadeE * s1);
    if (u.uFlowA) gl.uniform4f(u.uFlowA, this.settle, fc.current, fc.sign, fc.roll);
    if (u.uSwell) gl.uniform4f(u.uSwell, fc.sd[0], fc.sd[1], fc.k, fc.amp);
    if (u.uGust) gl.uniform4f(u.uGust, fc.gust, fc.gustV, fc.gustS, fc.foam);
    if (u.uWaterY) gl.uniform1f(u.uWaterY, f.water ? f.water.y : -1e5);
    if (u.uWindDir) gl.uniform2f(u.uWindDir, f.windDir[0], f.windDir[1]);
    if (u.uFogCol) gl.uniform3fv(u.uFogCol, e.fog);
    if (u.uFog) gl.uniform4f(u.uFog, e.fogD, e.mist, e.mistBase, e.scatter);
    if (u.uSeason) gl.uniform4f(u.uSeason, e.autumn, e.leaf, e.snow, e.flower);
    if (u.uHero) gl.uniform4fv(u.uHero, f.hero);
    if (u.uWave) gl.uniform4f(u.uWave, f.wave[0], f.wave[1], f.wave[2], 0);
    if (u.uFront) gl.uniform2f(u.uFront, f.front[0], f.front[1]);
    if (u.uNoise) gl.uniform1i(u.uNoise, 0);
    if (u.uBrush) gl.uniform1i(u.uBrush, 3);
    if (u.uShadow) gl.uniform1i(u.uShadow, 4);
    if (u.uReflTex) gl.uniform1i(u.uReflTex, 5);
    if (u.uShadowMap) gl.uniform4f(u.uShadowMap, f.shadowOrigin[0], f.shadowOrigin[1], 1 / f.shadowSize, f.shadowStrength);
    if (u.uCanvas) gl.uniform3fv(u.uCanvas, f.canvas);
    if (u.uWater) gl.uniform4f(u.uWater, f.water ? f.water.tint[0] : 0.3, f.water ? f.water.tint[1] : 0.4, f.water ? f.water.tint[2] : 0.5, f.water ? f.water.refl : 0);
    if (u.uTime) gl.uniform1f(u.uTime, f.time);
  }

  // flat shapes of shadow seen from straight above
  _shadows(f) {
    const gl = this.gl, d = this.shadowData, L = f.env.sunDir;
    let n = 0;
    const max = d.length / 3 - 60;
    const ly = Math.max(L[1], 0.06);
    let sx = -L[0] / ly, sz = -L[2] / ly;
    const sl = Math.hypot(sx, sz), cap = 9;
    if (sl > cap) { sx *= cap / sl; sz *= cap / sl; }
    const px = sl > 1e-4 ? -sz / sl : 1, pz = sl > 1e-4 ? sx / sl : 0; // across the shadow
    const tri = (ax, az, bx, bz, cx, cz, v) => { d[n * 3] = ax; d[n * 3 + 1] = az; d[n * 3 + 2] = v; n++; d[n * 3] = bx; d[n * 3 + 1] = bz; d[n * 3 + 2] = v; n++; d[n * 3] = cx; d[n * 3 + 1] = cz; d[n * 3 + 2] = v; n++; };
    const stretch = Math.sqrt(1 + Math.min(sl, cap) * Math.min(sl, cap));
    // What stands still (trees, houses, stacks) is laid out again only when the sun has moved enough to shift a shadow by a
    // hand's breadth or the world has changed; what moves (her, the people, the boats) is laid out every frame after it.
    // While the day runs at an easel the sun moves every frame, so there nothing is different from before
    const stat = f.casters[0] || [], keep = this.shKey === stat && this.shLen === stat.length && Math.abs(sx - this.shSx) < 0.002 && Math.abs(sz - this.shSz) < 0.002;
    if (keep) { sx = this.shSx; sz = this.shSz; }
    let n0 = 0;
    for (let li = keep ? 1 : 0; li < f.casters.length; li++) {
      if (li === 1) {
        if (keep) { n = this.shN; n0 = n; } // the still part lies in the buffer already
        else { this.shN = n; this.shKey = stat; this.shLen = stat.length; this.shSx = sx; this.shSz = sz; }
      }
      for (const c of f.casters[li]) {
      if (n > max) break;
      const v = c.v === undefined ? 1 : c.v;
      if (c.k === 'cone') {
        const ax = c.x + sx * c.h, az = c.z + sz * c.h, m = 10;
        for (let i = 0; i < m; i++) {
          const a0 = (i / m) * TAU, a1 = ((i + 1) / m) * TAU;
          const x0 = c.x + Math.cos(a0) * c.r, z0 = c.z + Math.sin(a0) * c.r, x1 = c.x + Math.cos(a1) * c.r, z1 = c.z + Math.sin(a1) * c.r;
          tri(c.x, c.z, x0, z0, x1, z1, v); tri(x0, z0, x1, z1, ax, az, v);
        }
      } else if (c.k === 'ball') {
        const cx = c.x + sx * c.y, cz = c.z + sz * c.y, m = 12, ux = sl > 1e-4 ? sx / sl : 0, uz = sl > 1e-4 ? sz / sl : 1;
        for (let i = 0; i < m; i++) {
          const a0 = (i / m) * TAU, a1 = ((i + 1) / m) * TAU;
          const e0 = Math.cos(a0) * c.r * stretch, f0 = Math.sin(a0) * c.r, e1 = Math.cos(a1) * c.r * stretch, f1 = Math.sin(a1) * c.r;
          tri(cx, cz, cx + ux * e0 + px * f0, cz + uz * e0 + pz * f0, cx + ux * e1 + px * f1, cz + uz * e1 + pz * f1, v);
        }
      } else if (c.k === 'pole') {
        const ex = c.x + sx * c.h, ez = c.z + sz * c.h, r = c.r;
        tri(c.x - px * r, c.z - pz * r, c.x + px * r, c.z + pz * r, ex + px * r, ez + pz * r, v);
        tri(c.x - px * r, c.z - pz * r, ex + px * r, ez + pz * r, ex - px * r, ez - pz * r, v);
      } else if (c.k === 'box') {
        const p = c.pts, ox = sx * c.h, oz = sz * c.h;
        for (let i = 0; i < p.length; i++) {
          const a = p[i], b = p[(i + 1) % p.length];
          tri(a[0], a[1], b[0], b[1], b[0] + ox, b[1] + oz, v); tri(a[0], a[1], b[0] + ox, b[1] + oz, a[0] + ox, a[1] + oz, v);
        }
        for (let i = 1; i < p.length - 1; i++) { tri(p[0][0], p[0][1], p[i][0], p[i][1], p[i + 1][0], p[i + 1][1], v); tri(p[0][0] + ox, p[0][1] + oz, p[i][0] + ox, p[i][1] + oz, p[i + 1][0] + ox, p[i + 1][1] + oz, v); }
      }
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboShadow);
    gl.viewport(0, 0, SHADOW_RES, SHADOW_RES);
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    if (n > 0) {
      gl.useProgram(this.pShadow.p);
      gl.uniform4f(this.pShadow.u.uShadowMap, f.shadowOrigin[0], f.shadowOrigin[1], 1 / f.shadowSize, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufShadow);
      if (n > n0) gl.bufferSubData(gl.ARRAY_BUFFER, n0 * 12, d, n0 * 3, (n - n0) * 3); // only what was laid out again
      gl.enable(gl.BLEND); gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(this.vaoShadow);
      gl.drawArrays(gl.TRIANGLES, 0, n);
      gl.disable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
    }
    gl.depthMask(true);
    gl.bindTexture(gl.TEXTURE_2D, this.texShadow);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  // one view of the world. mirror: the upside down view that the water shows
  _scene(f, mirror) {
    const gl = this.gl;
    const w = mirror ? REFL_W : this.fbW, h = mirror ? REFL_H : this.fbH;
    const ms = !mirror && !!this.msFbo;
    const cam = f.cam;
    let pos = cam.pos, fwd = cam.fwd, right = cam.right, up = cam.up;
    if (mirror) {
      const wy = f.water.y;
      pos = [cam.pos[0], 2 * wy - cam.pos[1], cam.pos[2]];
      fwd = [cam.fwd[0], -cam.fwd[1], cam.fwd[2]]; up = [cam.up[0], -cam.up[1], cam.up[2]]; right = [cam.right[0], -cam.right[1], cam.right[2]];
    }
    const aspect = this.fbW / this.fbH;
    const tanY = Math.tan(cam.fov / 2), tanX = tanY * aspect;
    mat4Perspective(this.proj, cam.fov, aspect, 0.4, 2600);
    // with the mirrored basis this equals the main view of the world reflected in the water plane
    mat4View(this.view, pos, right, up, fwd);
    mat4Mul(this.vp, this.proj, this.view);
    if (!mirror) this.vpMain.set(this.vp);
    const clipY = mirror ? f.water.y - 0.02 : -1e6;

    gl.bindFramebuffer(gl.FRAMEBUFFER, mirror ? this.fboRefl : (ms ? this.msFbo : this.fbo));
    gl.viewport(0, 0, w, h);
    gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    gl.depthMask(true); gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);

    // sky
    let P = this.pSky;
    gl.useProgram(P.p); this._env(P, f);
    gl.disable(gl.DEPTH_TEST);
    gl.uniform3fv(P.u.uCamF, fwd); gl.uniform3fv(P.u.uCamR, right); gl.uniform3fv(P.u.uCamU, up);
    gl.uniform2f(P.u.uTan, tanX, tanY);
    gl.uniform1f(P.u.uBlank, f.blank);
    gl.bindVertexArray(this.vaoTri); gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.0, 2.0);
    // ground
    P = this.pTerrain;
    gl.useProgram(P.p); this._env(P, f);
    gl.uniformMatrix4fv(P.u.uViewProj, false, this.vp); gl.uniform3fv(P.u.uCamPos, pos);
    gl.uniform1f(P.u.uMixT, f.mixT); gl.uniform1f(P.u.uBlank, f.blank); gl.uniform1f(P.u.uClipY, clipY);
    gl.uniform2f(P.u.uBrushRot, Math.cos(f.brushRot), Math.sin(f.brushRot));
    gl.bindVertexArray(this.vaoTerrain);
    gl.drawElements(gl.TRIANGLES, this.terrainIdxCount, gl.UNSIGNED_INT, 0);
    // water sheet
    if (f.water && !mirror) {
      P = this.pWater;
      gl.useProgram(P.p); this._env(P, f);
      gl.uniformMatrix4fv(P.u.uViewProj, false, this.vp); gl.uniform3fv(P.u.uCamPos, pos);
      gl.uniform1f(P.u.uWaterY, f.water.y); gl.uniform2f(P.u.uRes, w, h); gl.uniform1f(P.u.uBlank, f.blank);
      // is any of the water in sight? Asked of the sheet itself; the answer comes a frame or two later (see draw)
      const wq = this.waterQ || (this.waterQ = { q: gl.createQuery(), pending: false });
      const ask = !!wq.q && !wq.pending;
      if (ask) gl.beginQuery(gl.ANY_SAMPLES_PASSED, wq.q);
      gl.bindVertexArray(this.vaoQuad); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (ask) { gl.endQuery(gl.ANY_SAMPLES_PASSED); wq.pending = true; }
    }
    // solid underpainting
    P = this.pSolid;
    gl.useProgram(P.p); this._env(P, f);
    gl.uniformMatrix4fv(P.u.uViewProj, false, this.vp); gl.uniform3fv(P.u.uCamPos, pos);
    gl.uniform1f(P.u.uClipY, clipY);
    for (let s = 0; s < 2; s++) {
      const so = this.solids[s];
      if (so.count === 0 || f.solidAppear[s] <= 0.001) continue;
      gl.uniform1f(P.u.uAppear, f.solidAppear[s]);
      // each of the two worlds of a repainting has its own centre and its own front
      const sw = f.solidWave[s];
      if (P.u.uWave) gl.uniform4f(P.u.uWave, sw[0], sw[1], sw[2], 0);
      if (P.u.uFront) gl.uniform2f(P.u.uFront, sw[3], sw[4]);
      gl.bindVertexArray(so.vao); gl.drawArrays(gl.TRIANGLES, 0, so.count);
    }
    // the walker
    if (this.figCount > 0) {
      P = this.pFig;
      gl.useProgram(P.p); this._env(P, f);
      gl.uniformMatrix4fv(P.u.uViewProj, false, this.vp); gl.uniform3fv(P.u.uCamPos, pos);
      gl.uniform1f(P.u.uClipY, clipY);
      gl.bindVertexArray(this.vaoFig); gl.drawArrays(gl.TRIANGLES, 0, this.figCount);
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);

    // strokes
    P = this.pStroke;
    gl.useProgram(P.p); this._env(P, f);
    gl.uniformMatrix4fv(P.u.uViewProj, false, this.vp);
    gl.uniform3fv(P.u.uCamPos, pos); gl.uniform3fv(P.u.uCamRight, right); gl.uniform3fv(P.u.uCamUp, up);
    gl.uniform1f(P.u.uMorph, f.morph); gl.uniform1f(P.u.uDir, f.dir); gl.uniform1f(P.u.uMirror, mirror ? 1 : 0);
    gl.uniform3fv(P.u.uWaveA, f.waveA); gl.uniform3fv(P.u.uWaveB, f.waveB); gl.uniform3fv(P.u.uPivot, f.pivot);
    // the mirror is painted with fewer, larger touches. (f.mirrorThin: fewer still while she roams on the lower settings; at an
    // easel it is 0.45 on every setting, as it always was)
    const mt = f.mirrorThin || 0.45, thin = mirror ? mt : 1;
    gl.uniform1f(P.u.uSizeBoost, f.sizeBoost * (mirror ? 1.3 * Math.sqrt(0.45 / mt) : 1));
    gl.uniform4fv(P.u.uStyleA, f.styleA); gl.uniform4fv(P.u.uStyleB, f.styleB);
    gl.uniform2f(P.u.uFlowPhase, f.flowPhase[0], f.flowPhase[1]);
    gl.uniform2f(P.u.uWindDir, f.windDir[0], f.windDir[1]);
    gl.uniform2f(P.u.uNear, f.nearDist, f.nearMin);
    gl.uniform4fv(P.u.uTilt, f.tilt); gl.uniform1f(P.u.uVib, f.vib);
    gl.uniform1f(P.u.uRelief, f.relief); gl.uniform1f(P.u.uEdge, f.edge); gl.uniform1f(P.u.uClipY, clipY);
    gl.uniform1i(P.u.uAtlas, 1);
    gl.uniform1f(P.u.uA2C, ms ? 1 : 0);
    { // the lie of the ground under the water, for how deep it is
      const tg0 = this.ground[f.touchSlot || 0];
      gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, tg0.ok ? tg0.th : null); gl.activeTexture(gl.TEXTURE0);
      if (P.u.uGroundH) gl.uniform1i(P.u.uGroundH, 6);
      if (P.u.uGround) gl.uniform4f(P.u.uGround, tg0.x0, tg0.z0, 1 / tg0.span, tg0.ok ? tg0.hn : 0);
    }
    if (ms) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    const count = Math.floor(f.strokeCount * thin);
    if (count > 0) { gl.bindVertexArray(this.vaoStroke); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count); }
    if (this.dynCount > 0) {
      gl.uniform1f(P.u.uMorph, 0); gl.uniform1f(P.u.uDir, 0); gl.uniform1f(P.u.uSizeBoost, 1);
      gl.uniform4f(P.u.uStyleA, 1, 1, 1, 0); gl.uniform4f(P.u.uStyleB, 1, 1, 1, 0);
      gl.uniform2f(P.u.uNear, f.nearDist, 1);
      gl.uniform4f(P.u.uTilt, 0, 0, 1, 1);
      if (P.u.uHero) gl.uniform4f(P.u.uHero, 0, 0, 0, 0); // what is painted on her is not darkened by her own shadow
      gl.bindVertexArray(this.vaoDyn); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.dynCount);
    }
    // the small touches of the near ground
    const tg = this.ground[f.touchSlot || 0];
    if (!mirror && f.touch > 0.01 && tg.ok && f.touchCount > 0) {
      P = this.pTouch;
      gl.useProgram(P.p); this._env(P, f);
      gl.uniformMatrix4fv(P.u.uViewProj, false, this.vp); gl.uniform3fv(P.u.uCamPos, pos);
      gl.uniform4f(P.u.uGround, tg.x0, tg.z0, 1 / tg.span, tg.hn);
      gl.uniform1f(P.u.uWaterY, f.water ? f.water.y : -1e5);
      gl.uniform2f(P.u.uWindDir, f.windDir[0], f.windDir[1]); gl.uniform1f(P.u.uFovK, f.fovK);
      gl.uniform4fv(P.u.uTilt, f.tilt); gl.uniform1f(P.u.uVib, f.vib);
      gl.uniform1f(P.u.uRelief, f.relief); gl.uniform1f(P.u.uEdge, f.edge); gl.uniform1f(P.u.uClipY, clipY);
      gl.uniform1i(P.u.uAtlas, 1); gl.uniform1f(P.u.uA2C, ms ? 1 : 0);
      gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, tg.th); gl.uniform1i(P.u.uGroundH, 6);
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, tg.tc); gl.uniform1i(P.u.uGroundC, 7);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindVertexArray(this.vaoTouch);
      // two sheets of them: a wide one for the middle of the near ground, and a close crowd right under the eye
      const k = f.touchSize, n = Math.min(MAX_TOUCH, f.touchCount);
      gl.uniform4f(P.u.uTile, 46, 0.4 * k[0], 0.17 * k[1], f.touch); gl.uniform4f(P.u.uLaw, 10, 0.5, 4.5, 8); gl.uniform3f(P.u.uThin, 10, 19, 0.5);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, Math.round(n * 0.58));
      gl.uniform4f(P.u.uTile, 17, 0.3 * k[0], 0.125 * k[1], f.touch); gl.uniform4f(P.u.uLaw, 7.5, 0.24, 0.8, 1.8); gl.uniform3f(P.u.uThin, 90, 99, 1);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, Math.round(n * 0.42));
    }
    if (ms) gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);

    if (this.glowCount > 0) {
      P = this.pGlow;
      gl.useProgram(P.p);
      gl.uniformMatrix4fv(P.u.uViewProj, false, this.vp);
      gl.uniform3fv(P.u.uCamPos, pos); gl.uniform3fv(P.u.uCamRight, right); gl.uniform3fv(P.u.uCamUp, up);
      gl.uniform1f(P.u.uClipY, clipY);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
      gl.bindVertexArray(this.vaoGlow);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.glowCount);
      gl.disable(gl.BLEND); gl.depthMask(true);
    }
    if (ms) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msFbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbo);
      gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    }
  }

  draw(f) {
    const gl = this.gl;
    if (!this.fbo) return;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texNoise);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.texAtlas);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.texBrush);
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, null);
    this._flowStep(f);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufGlow);
    if (this.glowCount > 0) gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.glowData, 0, this.glowCount * 10);
    this._shadows(f);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, this.texShadow);
    // The mirror is a second painting of the whole world. It is left out while no water is in sight (the sheet of water is asked
    // each frame whether any of it was drawn), except at an easel, during a repainting and for a few frames after a new world
    // or a new size: there it is always painted, so no picture can differ
    const wq = this.waterQ;
    if (wq && wq.pending && gl.getQueryParameter(wq.q, gl.QUERY_RESULT_AVAILABLE)) { this.waterSeen = !!gl.getQueryParameter(wq.q, gl.QUERY_RESULT); wq.pending = false; }
    if (this.reflForce > 0) this.reflForce--;
    this.mirrored = !!f.water && (this.waterSeen !== false || f.settle > 0.01 || f.morph > 0 || this.reflForce > 0 || !!f.mirrorAlways);
    if (this.mirrored) this._scene(f, true);
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, this.texRefl);
    this._scene(f, false);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.disable(gl.DEPTH_TEST);
    const P = this.pPost, g = f.env.grade;
    gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.fbTex);
    if (f.bloom > 0) gl.generateMipmap(gl.TEXTURE_2D);
    gl.uniform1i(P.u.uScene, 2); gl.uniform1f(P.u.uBloom, f.bloom);
    gl.uniform2f(P.u.uPx, 1 / this.fbW, 1 / this.fbH);
    gl.uniform4f(P.u.uGrade, g.sat, g.bright, g.contrast, g.lift);
    gl.uniform4f(P.u.uVeil, g.veil[0], g.veil[1], g.veil[2], g.veil[3]);
    gl.uniform3fv(P.u.uCanvas, f.canvas);
    gl.uniform1f(P.u.uWhite, f.white); gl.uniform1f(P.u.uEmboss, f.emboss); gl.uniform1f(P.u.uVig, f.vig);
    gl.uniform1f(P.u.uSoft, g.soft); gl.uniform1f(P.u.uWeave, f.weave);
    gl.bindVertexArray(this.vaoTri);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
}

// what flows in each world. current: m/s mid stream, sign: which way along the painted touches it runs; swell: the way the crests
// run (towards the shore), k: wave number, amp: height in m; roll: how much a moored hull rolls of itself; gust: strength, gustV: m/s,
// gustS: 1 / size of a gust in m; foam: surf on the shore; cloudV: noise units a second; shadow: cloud shadows while she roams, against the painted
Renderer.FLOW = {
  default: { current: 0.2, sign: 1, swell: [1, 0.3], k: 0.9, amp: 0.03, roll: 0.5, gust: 1, gustV: 4.5, gustS: 0.02, foam: 0, cloudV: 0.006, shadow: 1.7, shadeW: 0.07, shadeE: 0.12 },
  coast: { current: 0.1, swell: [-0.25, 1], k: 0.2, amp: 0.22, roll: 1, foam: 1, gustV: 6 },
  argenteuil: { current: 0.55, sign: -1, swell: [0.85, 0.5], k: 0.9, amp: 0.035, roll: 0.45 }, // the Seine runs west here, down from Paris
  fields: { current: 0.45, swell: [0.9, 0.35], k: 1.0, amp: 0.025, roll: 0.35 },
  pond: { current: 0.04, swell: [0.7, 0.4], k: 1.3, amp: 0.008, roll: 0.15, gust: 0.7, cloudV: 0.0045 },
};
