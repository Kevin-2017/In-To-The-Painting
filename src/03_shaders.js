// ---------- GLSL ----------
const GLSL_COMMON = `
vec3 hueRot(vec3 c, float a) {
  const vec3 k = vec3(0.57735);
  float ca = cos(a), sa = sin(a);
  return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca);
}
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float lum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }
`;

// the hour, the weather and the season, shared by everything that is painted. TEX is defined by each stage.
const GLSL_ENV = `
uniform vec3 uSunDir, uSun, uAmb;
uniform vec3 uSky[4];          // zenith, upper, lower, horizon
uniform vec3 uHaze, uGlowCol, uCloudLit, uCloudShade, uFogCol;
uniform vec3 uGlow;            // tightness, strength, how white the heart of the sun is
uniform vec4 uCloud;           // cover, shadow strength, drift x, drift y
uniform vec4 uFog;             // density, mist, mist base height, scatter towards the sun
uniform vec4 uSeason;          // autumn, leaves, snow, flowers
uniform vec4 uHero;            // where the walker's feet are, and how dark the ground is under her
uniform vec4 uWave;            // a repainting: its centre x, z, 1 / reach
uniform vec2 uFront;           // what lies between these two fronts is there; the rest is bare canvas
uniform sampler2D uNoise;
vec3 skyGrad(vec3 d) {
  float e = d.y; vec3 c;
  if (e < 0.0) c = mix(uSky[3], uHaze, smoothstep(0.0, -0.12, e));
  else if (e < 0.12) c = mix(uSky[3], uSky[2], e / 0.12);
  else if (e < 0.45) c = mix(uSky[2], uSky[1], (e - 0.12) / 0.33);
  else c = mix(uSky[1], uSky[0], smoothstep(0.45, 1.0, e));
  // the air near the sun takes the sun's colour instead of burning out to white
  float s = max(dot(d, uSunDir), 0.0);
  float a = pow(s, uGlow.x) * uGlow.y + pow(s, uGlow.x * 0.12) * uGlow.y * 0.22;
  c = mix(c, uGlowCol * 1.03, clamp(a, 0.0, 0.86));
  c = mix(c, mix(uGlowCol, vec3(1.0, 0.97, 0.84), 0.55 * uGlow.z), pow(s, 700.0) * 0.75);
  return mix(c, 0.8 + 0.2 * tanh((c - 0.8) / 0.2), step(0.8, c));
}
// the clouds travel: uCloud.zw is how far they have gone, a whole number of turns of the noise when she has settled. The small
// shapes inside them go three times as far, so that both come round together and a settled sky is the painted one
float cloudDens(vec2 p) { return TEX(uNoise, p + uCloud.zw).r * 0.62 + TEX(uNoise, p * 2.9 + 0.37 + uCloud.zw * 3.0).g * 0.38; }
vec3 skyColor(vec3 d) {
  vec3 c = skyGrad(d);
  if (d.y > -0.02 && uCloud.x > 0.01) {
    vec2 p = d.xz / (max(d.y, 0.0) + 0.24) * 0.085;
    float n = cloudDens(p), th = 1.0 - uCloud.x;
    float cl = smoothstep(th - 0.1, th + 0.1, n) * smoothstep(-0.02, 0.1, d.y);
    vec2 sd = normalize(uSunDir.xz + 1e-4) * 0.014;
    float lit = clamp((n - cloudDens(p + sd)) * 9.0 + 0.5 + 0.3 * uSunDir.y, 0.0, 1.0);
    vec3 cc = mix(uCloudShade, uCloudLit, lit);
    cc += uGlowCol * pow(max(dot(d, uSunDir), 0.0), 6.0) * uGlow.y * 0.45;
    c = mix(c, cc, cl * 0.92);
  }
  return c;
}
uniform vec2 uShade;           // where a cloud's shadow begins and ends in its noise: wider and sharper while she roams
float cloudShadow(vec2 xz) { return 1.0 - uCloud.y * smoothstep(uShade.x, uShade.y, TEX(uNoise, xz * 0.0019 + uCloud.zw * 2.0).r); }
float fogAmt(vec3 p, vec3 cam) {
  float dist = length(p - cam);
  float h = max((p.y + cam.y) * 0.5 - uFog.z, 0.0);
  float dens = uFog.x * (1.0 + uFog.y * exp(-h * 0.11));
  return 1.0 - exp(-pow(dist * dens, 1.25));
}
vec3 fogTint(vec3 vd) { return uFogCol + uGlowCol * pow(max(dot(vd, uSunDir), 0.0), 5.0) * uFog.w; }
// light the way he saw it: no shadow is grey. The shaded side keeps its own colour, takes the hue of the sky,
// and where it turns to the ground it catches the warmth the sunlit earth throws back
vec3 shadeC(vec3 alb, vec3 n, float sh, float trans) {
  float lit = smoothstep(-0.22, mix(0.5, 0.26, clamp(n.y, 0.0, 1.0)), dot(n, uSunDir)) * sh;
  float l = lum(alb), al = lum(uAmb);
  // the shade gives up some of its own colour for the sky's, leaning to violet: on a yellow field the shadow is blue, not grey
  vec3 skyT = uAmb / max(al, 1e-3);
  vec3 shade = mix(alb, vec3(l), 0.18) * al * mix(vec3(1.0), skyT, 0.72) + skyT * (al * l * 0.24);
  shade += alb * uSun * vec3(1.0, 0.74, 0.5) * ((0.3 + 0.7 * max(uSunDir.y, 0.0)) * (1.0 - n.y) * 0.34);
  // when the sun is low the whole air glows, and whatever stands up in it burns a little with the colour of the sky
  shade += alb * uGlowCol * ((1.0 - smoothstep(0.0, 0.4, uSunDir.y)) * smoothstep(-0.12, 0.02, uSunDir.y) * (1.0 - 0.45 * n.y) * 0.42);
  shade = mix(vec3(lum(shade)), shade, 1.3) * (0.84 + 0.16 * n.y);
  // in the light the sky's blue gives way to the sun: lights stay warm and keep their colour, shadows stay cool and full
  vec3 c = shade * (1.0 - 0.5 * lit) + (alb * 0.94 + l * 0.08) * uSun * (lit * 1.2);
  c += alb * uSun * trans;
  return c;
}
// how far out a place lies from where a repainting begins: the ground by its distance, then the sky from the horizon up.
// One painting goes and the next comes as a front that runs out from her feet over this measure
float waveS(vec2 xz) { return sqrt(clamp(length(xz - uWave.xy) * uWave.z, 0.0, 1.0)) * 0.75; }
float waveSky(float y) { return 0.75 + 0.25 * clamp(y * 1.2, 0.0, 1.0); }
float waveVis(float s) { return smoothstep(uFront.x - 0.012, uFront.x + 0.012, s) * (1.0 - smoothstep(uFront.y - 0.012, uFront.y + 0.012, s)); }
// where she stands the ground is a little darker, with no edge to it: it is what sets her on the earth
float heroAO(vec3 p) {
  vec2 d = p.xz - uHero.xz;
  return 1.0 - uHero.w * exp(-dot(d, d) * 2.0) * (1.0 - smoothstep(0.3, 1.3, abs(p.y - uHero.y)));
}
// highlights are pressed gently together instead of cut off, the way paint has no white brighter than white
vec3 tone(vec3 c) { return mix(c, 0.7 + 0.3 * tanh((c - 0.7) * 3.0), step(0.7, c)); }
vec3 snowAlb(float r) { return mix(vec3(0.84, 0.89, 0.98), vec3(0.99, 0.94, 0.9), r); }
`;

// the water moves under what floats on it: a long swell (or a ripple on the river) and the slow roll of a hull at its mooring.
// Everything here is zero when she has settled at an easel (uFlowA.x = 1), so a settled view is the painted one
const GLSL_SWELL = `
uniform vec4 uFlowA;   // settle, current in m/s, which way the current runs along the strokes, roll of what floats
uniform vec4 uSwell;   // the way the crests run (x, z), wave number, height
// the rise of the water above its rest (0 .. height) and its slope, at xz
vec3 swell(vec2 xz, float t) {
  vec2 d1 = uSwell.xy, d2 = vec2(d1.x * 0.94 - d1.y * 0.34, d1.x * 0.34 + d1.y * 0.94);
  float k = uSwell.z, w = sqrt(9.8 * k);
  float a1 = dot(xz, d1) * k - w * t, a2 = dot(xz, d2) * k * 1.37 - w * 1.17 * t + 1.3;
  float h = uSwell.w * (0.31 * sin(a1) + 0.19 * sin(a2) + 0.5);
  vec2 g = uSwell.w * (0.31 * k * cos(a1) * d1 + 0.19 * k * 1.37 * cos(a2) * d2);
  return vec3(h, g);
}
// where a floating thing goes: up and down with the water, leaning with its slope, and rolling a little of its own
vec3 floatOff(vec3 p, float t, float wy, vec2 wd) {
  float s1 = 1.0 - uFlowA.x;
  if (s1 < 0.001) return vec3(0.0);
  vec3 sw = swell(p.xz, t);
  float up = p.y - wy;
  float roll = uFlowA.w * (0.03 * sin(t * 0.83 + dot(p.xz, vec2(0.021, 0.033))) + 0.018 * sin(t * 1.41 + p.x * 0.017 + 2.0));
  vec2 perp = vec2(-wd.y, wd.x);
  return vec3((-sw.yz * 1.6 + perp * roll) * up, sw.x).xzy * s1;
}
`;

const GLSL_STROKE_VS = `#version 300 es
precision highp float;
#define TEX(s, uv) textureLod(s, uv, 0.0)
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aPosA;   // xyz, motion (>0 sway amplitude, <0 slide length)
layout(location=2) in vec4 aQuatA;  // orientation; for camera facing dabs: roll, pivot xyz
layout(location=3) in vec4 aScaA;   // length, width, cell + 16 * flags, seed
layout(location=4) in vec4 aColA;   // local colour, glow
layout(location=5) in vec4 aPosB;
layout(location=6) in vec4 aQuatB;
layout(location=7) in vec4 aScaB;
layout(location=8) in vec4 aColB;
uniform mat4 uViewProj;
uniform vec3 uCamPos, uCamRight, uCamUp;
uniform float uTime, uMorph, uDir, uSizeBoost, uMirror, uVib;
uniform vec3 uWaveA, uWaveB, uPivot;   // where the old painting lets go from and the new one settles from (x, z, 1 / reach), and whom the paint circles
uniform vec4 uStyleA, uStyleB;     // lenMul, widMul, wind, flow
uniform vec4 uTilt;                // how far a touch turns to face the eye, how far off the level it lies, and its length and width when it does
uniform vec2 uFlowPhase, uWindDir, uNear;
uniform sampler2D uShadow, uReflTex;
uniform vec4 uShadowMap;           // origin x, z, 1 / size, strength
uniform vec4 uWater;               // water tint, reflectivity
uniform sampler2D uGroundH;        // the baked height of the ground, to know how deep the water is
uniform vec4 uGround;              // its origin x, z, 1 / span, size (0: none)
uniform float uWaterY;
uniform vec4 uGust;                // gusts: strength, speed in m/s, scale, foam on the shore
out vec2 vUv;
flat out float vCell;
out vec3 vCol;
out vec3 vCol2;
out float vWy;
out float vTex;
${GLSL_COMMON}
${GLSL_ENV}
${GLSL_SWELL}
vec3 qrot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
float h11(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
float depthAt(vec2 xz) {
  if (uGround.w < 0.5) return 9.0;
  ivec2 q = ivec2(clamp((xz - uGround.xy) * uGround.z, 0.0, 0.9999) * uGround.w);
  return uWaterY - texelFetch(uGroundH, q, 0).r;
}
// a gust is a patch of stronger wind that runs over the land with the wind (0 .. 1)
float gustAt(vec2 xz) { return smoothstep(0.36, 0.7, TEX(uNoise, (xz - uWindDir * (uTime * uGust.y)) * uGust.z).r); }

// centre of the stroke; off is the offset of this corner, n its normal, f1 f2 the decoded flags
vec3 place(vec4 P, vec4 Q, vec4 S, vec4 st, float phase, out vec3 off, out vec3 n, out vec4 f1, out vec4 f2, out float cell) {
  float fl = floor(S.z / 16.0 + 0.01);
  cell = S.z - fl * 16.0;
  float dome = mod(fl, 2.0), axial = mod(floor(fl * 0.5), 2.0), bill = mod(floor(fl * 0.25), 2.0), water = mod(floor(fl * 0.125), 2.0);
  float leaf = mod(floor(fl / 16.0), 2.0), flower = mod(floor(fl / 32.0), 2.0), ground = mod(floor(fl / 64.0), 2.0), grass = mod(floor(fl / 128.0), 2.0), lies = mod(floor(fl / 256.0), 2.0), floats = mod(floor(fl / 512.0), 2.0);
  f1 = vec4(dome, axial, bill, water); f2 = vec4(leaf, flower, ground, grass);
  vec3 c = P.xyz + uCamPos * dome;
  float seed = S.w, r1 = h11(seed * 57.3 + 1.7);
  vec2 prop = mix(st.xy, vec2(1.0), 0.55 * axial);
  float len = S.x * prop.x * uSizeBoost, wid = S.y * prop.y * uSizeBoost;
  // the seasons: leaves fall one by one, flowers come and go, grass sinks under snow
  float keep = mix(1.0, smoothstep(r1 - 0.1, r1 + 0.02, uSeason.y), leaf);
  keep *= mix(1.0, smoothstep(r1 - 0.06, r1 + 0.02, uSeason.w), flower);
  keep *= mix(1.0, 1.0 - 0.8 * smoothstep(r1 * 0.7, r1 * 0.7 + 0.3, uSeason.z), grass);
  keep *= 1.0 - water * uMirror;
  len *= keep; wid *= keep;
  // close to the eye the paint breaks into smaller touches
  float nearK = smoothstep(1.5, uNear.x, length(c - uCamPos));
  float surf = (1.0 - dome) * (1.0 - axial) * (1.0 - bill);
  float shrink = mix(1.0, mix(uNear.y, 1.0, nearK), surf) * mix(1.0, mix(0.5 + 0.5 * uNear.y, 1.0, nearK), bill * (1.0 - dome));
  // nothing is painted right against the eye
  shrink *= mix(smoothstep(0.7, 2.2, length(c - uCamPos)), 1.0, dome);
  len *= shrink; wid *= shrink * mix(1.0, mix(0.6, 1.0, nearK), axial * (1.0 - dome));
  vec3 ax, ay, ax0, toCam = uCamPos - c;
  if (bill > 0.5) {
    float roll = Q.x;
    vec3 pv = Q.yzw;
    n = vec3(0.0, 1.0, 0.0);
    if (dot(pv, pv) > 1e-6) {
      vec2 sp = vec2(dot(pv, uCamRight), dot(pv, uCamUp));
      if (dot(sp, sp) > 1e-8) roll += atan(sp.y, sp.x) + 1.5708;
      n = normalize(pv);
    }
    float ca = cos(roll), sa = sin(roll);
    ax = uCamRight * ca + uCamUp * sa;
    ay = uCamUp * ca - uCamRight * sa;
    ax0 = ax;
  } else {
    ax = qrot(Q, vec3(1.0, 0.0, 0.0));
    ay = qrot(Q, vec3(0.0, 1.0, 0.0));
    n = qrot(Q, vec3(0.0, 0.0, 1.0));
    ax0 = ax;
    if (axial > 0.5) {
      vec3 s = cross(ax, toCam);
      float l = length(s);
      if (l > 1e-4) ay = s / l;
      n = normalize(vec3(toCam.x, 0.0, toCam.z) / max(length(toCam.xz), 1e-3) * 0.55 + vec3(0.0, 0.83, 0.0));
    } else {
      if (uMirror < 0.5 && dot(n, toCam) < 0.0) n = -n;
      // a touch of paint lies on the canvas, not on the ground: seen from the side it turns to face the eye,
      // so the far field is made of dabs and not of slivers. The light still falls on it as on the ground
      vec3 v = toCam / max(length(toCam), 1e-3);
      float nv = dot(n, v);
      float k = uTilt.x * (1.0 - smoothstep(0.2, 0.8, abs(nv))) * step(cell, 14.5) * (1.0 - dome) * (1.0 - lies);
      if (k > 0.002) {
        vec3 n2 = normalize(mix(nv < 0.0 ? -n : n, v, k));
        float level = max(ground, water);
        vec3 a2 = ax - n2 * dot(ax, n2);
        float al = length(a2);
        a2 = al > 1e-3 ? a2 / al : ay;
        vec3 lev = cross(vec3(0.0, 1.0, 0.0), v);
        float ll = length(lev);
        if (level > 0.5 && ll > 1e-3) {
          lev /= ll;
          float roll = (r1 - 0.5) * uTilt.y * (1.0 - 0.85 * water);
          vec3 want = lev * cos(roll) + cross(n2, lev) * sin(roll);
          if (dot(want, a2) < 0.0) want = -want;
          a2 = mix(a2, want, k);
          len *= mix(1.0, uTilt.z, k); wid *= mix(1.0, uTilt.w, k);
          c.y += wid * 0.26 * k;
        }
        ax = normalize(a2 - n2 * dot(a2, n2));
        ay = cross(n2, ax);
      }
    }
  }
  float motion = P.w;
  if (motion < 0.0) {
    float sp = 0.6 + 0.8 * h11(seed * 91.7 + 0.3);
    float ph = fract(phase * sp + seed * 7.31);
    float on = smoothstep(0.0, 0.15, st.w);
    // what slides keeps its own road: the clouds go round the sky together, the water along its current
    vec3 road = dome > 0.5 ? normalize(cross(vec3(0.0, 1.0, 0.0), P.xyz) + vec3(1e-4, 0.0, 0.0)) : ax0;
    vec3 slide = road * ((ph - 0.5) * (-motion) * on);
    float fade = mix(1.0, smoothstep(0.0, 0.2, ph) * (1.0 - smoothstep(0.8, 1.0, ph)), on);
    if (water > 0.5 && uFlowA.x < 0.999) {
      // while she roams the water runs: each touch is carried down the current, fastest where it is deep, and is given
      // back to the water before it has gone far, while another comes up behind it. Settled, it is the painted touch again
      float v = uFlowA.y * (0.3 + 0.7 * smoothstep(0.15, 1.6, depthAt(c.xz))) * (0.8 + 0.4 * h11(seed * 13.1 + 0.7));
      float L = max(-motion * 1.6, 1.2), pn = fract(uTime * v / L + seed * 7.31);
      vec3 cur = normalize(vec3(ax0.x, 0.0, ax0.z) + vec3(1e-5, 0.0, 0.0)) * uFlowA.z;
      slide = mix(cur * ((pn - 0.5) * L), slide, uFlowA.x);
      fade = mix(smoothstep(0.0, 0.2, pn) * (1.0 - smoothstep(0.8, 1.0, pn)), fade, uFlowA.x);
    }
    c += slide;
    wid *= fade; len *= mix(0.55, 1.0, fade);
  }
  // the water rises and falls with the swell
  if (water > 0.5) c.y += swell(c.xz, uTime).x * (1.0 - uFlowA.x);
  off = ax * (aCorner.x * len) + ay * (aCorner.y * wid);
  if (motion > 0.0) {
    float hh = aCorner.x + 0.5;
    float gust = sin(dot(c.xz, uWindDir) * 0.21 - uTime * 1.6 + seed * 1.3) * 0.65
               + sin(dot(c.xz, vec2(-uWindDir.y, uWindDir.x)) * 0.09 + uTime * 0.83 + seed * 4.0) * 0.35;
    if (uFlowA.x < 0.999) {
      // while she roams the wind comes in gusts that run over the land: the grass lies down under each and rises after it
      float G = gustAt(c.xz);
      gust = mix((0.1 + 1.5 * G + 0.3 * sin(uTime * 2.1 + seed * 6.3 + G * 3.0)) * uGust.x, gust, uFlowA.x);
    }
    off.xz += uWindDir * (gust * motion * st.z * mix(hh * hh, 0.6, bill));
  }
  // what floats rides the water, every corner on its own, so that a hull leans and a mast swings
  if (floats > 0.5) c += floatOff(c + off, uTime, uWaterY, uWindDir);
  return c;
}

vec3 paint(vec4 P, vec4 S, vec4 C, vec3 c, vec3 n, vec4 f1, vec4 f2) {
  float seed = S.w, r1 = h11(seed * 57.3 + 1.7), r2 = h11(seed * 23.1 + 4.2);
  vec3 alb = C.rgb;
  vec3 vd = normalize(c - uCamPos);
  if (f1.x > 0.5) {
    // the sky paints itself from the hour; glowing strokes on the dome keep their own colour
    if (C.a > 0.01) return alb * (0.8 + C.a);
    vec3 d = normalize(P.xyz);
    vec3 col = skyColor(normalize(d + vec3(r1 - 0.5, (r2 - 0.5) * 0.5, r2 - 0.5) * 0.05));
    return hueRot(col, (r1 - 0.5) * 0.2) * (0.955 + 0.09 * r2) * mix(vec3(1.0), alb * 2.0, 0.15);
  }
  if (f1.w > 0.5) {
    // water: a broken mirror of whatever stands above it
    vec4 cp = uViewProj * vec4(c, 1.0);
    vec2 suv = cp.xy / cp.w * 0.5 + 0.5;
    suv += vec2((r1 - 0.5) * 0.03 + sin(uTime * 0.7 + seed * 40.0) * 0.004, (r2 - 0.5) * 0.07);
    vec3 refl = TEX(uReflTex, clamp(suv, 0.003, 0.997)).rgb;
    float fres = 0.3 + 0.7 * pow(1.0 - max(-vd.y, 0.0), 3.0);
    vec3 base = uWater.rgb * (uAmb * 0.95 + uSun * 0.3 * max(uSunDir.y, 0.0));
    vec3 col = mix(base, refl, fres * uWater.a);
    col = mix(col, col * alb * 1.7, 0.4);
    vec3 r = reflect(vd, normalize(vec3((r1 - 0.5) * 0.16, 1.0, (r2 - 0.5) * 0.5)));
    float g = pow(max(dot(r, uSunDir), 0.0), 90.0) * (0.55 + 0.45 * sin(uTime * 3.0 + seed * 90.0));
    col += (uSun * 0.5 + uGlowCol) * g * 0.75;
    float s1 = 1.0 - uFlowA.x;
    if (s1 > 0.001) {
      // the crests of the swell catch the sky, the troughs keep the deep colour; near the shore they break into foam that runs in
      float cr = uSwell.w > 1e-4 ? swell(c.xz, uTime).x / uSwell.w : 0.5;
      col *= 1.0 + (cr - 0.5) * 0.4 * s1;
      col = mix(col, uSun * 0.8 + uAmb * 0.9, smoothstep(0.82, 1.0, cr) * smoothstep(0.08, 0.2, uSwell.w) * 0.45 * s1); // white horses on the tops of a big swell
      if (uGust.w > 0.001) {
        float dep = depthAt(c.xz), w = sqrt(9.8 * uSwell.z);
        float band = pow(0.5 + 0.5 * sin(dep * 3.2 + uTime * w + r1 * 0.3), 3.0) * (1.0 - smoothstep(0.2, 1.5, dep));
        float edge = (1.0 - smoothstep(0.12, 0.5, dep)) * (0.45 + 0.55 * sin(uTime * w * 0.5 + r2 * 1.5));
        float foam = clamp(max(band, edge), 0.0, 1.0) * uGust.w * s1;
        col = mix(col, (uSun * 1.1 + uAmb * 0.95) * vec3(1.0, 1.0, 0.98), foam * 0.85);
      }
    }
    return mix(col, fogTint(vd), fogAmt(c, uCamPos));
  }
  float veg = max(f2.x, max(f2.y, f2.w));
  // autumn turns the leaves, straw comes into the grass, snow settles on whatever faces the sky
  alb = mix(alb, mix(vec3(0.96, 0.62, 0.2), vec3(0.86, 0.3, 0.14), r2), f2.x * uSeason.x * (0.5 + 0.5 * r1));
  alb = mix(alb, vec3(0.8, 0.68, 0.36), f2.w * uSeason.x * 0.5);
  alb = mix(alb, vec3(0.82, 0.6, 0.34), f2.z * uSeason.x * 0.34 * r1);  // the fallen year lies on the ground too
  float snowy = smoothstep(0.25, 0.7, uSeason.z * 1.25 - r1 * 0.45) * smoothstep(0.2, 0.7, n.y) * (1.0 - f2.x) * (1.0 - f2.y) * mix(1.0, f2.w, f1.y);
  alb = mix(alb, snowAlb(r2), snowy);
  float sh = cloudShadow(c.xz);
  if (f2.z > 0.5) {
    vec2 uv = (c.xz - uShadowMap.xy) * uShadowMap.z + 0.5;
    if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) sh *= 1.0 - uShadowMap.w * textureLod(uShadow, uv, 1.0).r;
  }
  float back = max(dot(vd, uSunDir), 0.0);
  vec3 col = shadeC(alb, n, sh, veg * pow(back, 3.0) * 0.6 * sh);
  // a rim of fire on things seen against the light
  col += (uSun + uGlowCol * 0.3) * (0.35 + lum(alb)) * pow(1.0 - abs(dot(n, vd)), 2.0) * back * back * 1.9 * (1.0 - f2.z);
  col += alb * C.a * 0.8;
  col *= heroAO(c);
  if (P.w > 0.0 && uFlowA.x < 0.999) {
    // a gust turns the grass and the leaves over: their pale side catches the light as it runs across
    float sheen = gustAt(c.xz) * (1.0 - uFlowA.x) * uGust.x * 0.3 * max(f2.w, max(f2.x * 0.75, f1.y * 0.5));
    col = mix(col, col * 1.28 + vec3(0.03, 0.035, 0.02), sheen);
  }
  return mix(col, fogTint(vd), fogAmt(c, uCamPos));
}

void main() {
  float cellA = 0.0, cellB = 0.0;
  vec3 offA = vec3(0.0), offB = vec3(0.0), nA = vec3(0.0, 1.0, 0.0), nB = vec3(0.0, 1.0, 0.0), cA = vec3(0.0), cB = vec3(0.0);
  vec4 a1 = vec4(0.0), a2 = vec4(0.0), b1 = vec4(0.0), b2 = vec4(0.0);
  // Outside a repainting only one of the two paintings is on the canvas, so the other is not worked out at all; and a touch that
  // lies wholly outside the view is dropped before any of the work is done on it. Neither changes a single touch that is seen
  bool both = uMorph > 0.0005;
  bool useA = both || uDir < 0.5, useB = both || uDir >= 0.5;
  if (!both) {
    vec4 P0 = useA ? aPosA : aPosB, S0 = useA ? aScaA : aScaB;
    vec3 c0 = P0.xyz + uCamPos * mod(floor(S0.z / 16.0 + 0.01), 2.0);
    // as far as any corner of it can be from where it is stored: its size at its largest, its slide or its sway, the swell
    float reach = (S0.x + S0.y) * 2.2 + abs(P0.w) * 3.0 + 4.0;
    vec4 q = uViewProj * vec4(c0, 1.0);
    float mx = reach * (length(vec3(uViewProj[0][0], uViewProj[1][0], uViewProj[2][0])) + 1.0);
    float my = reach * (length(vec3(uViewProj[0][1], uViewProj[1][1], uViewProj[2][1])) + 1.0);
    if (q.w < -reach || abs(q.x) > q.w + mx || abs(q.y) > q.w + my) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vUv = vec2(0.0); vCell = 0.0; vCol = vec3(0.0); vCol2 = vec3(0.0); vWy = 0.0; vTex = 0.0;
      return;
    }
  }
  if (useA) cA = place(aPosA, aQuatA, aScaA, uStyleA, uFlowPhase.x, offA, nA, a1, a2, cellA);
  if (useB) cB = place(aPosB, aQuatB, aScaB, uStyleB, uFlowPhase.y, offB, nB, b1, b2, cellB);
  float id = float(gl_InstanceID);
  float st = h11(id * 0.137 + 0.71);
  float st2 = h11(id * 0.731 + 3.3);
  // a repainting. Each touch lets go of the old picture when the front that runs out from her feet reaches it, and comes
  // down into the new one when that picture's front reaches its place there: the ground near her first, the far ground
  // after, the sky last. In between it goes round her on the wind, rising and drawing in, one flock of paint
  float m = 0.0;
  if (uMorph > 0.0005) {
    bool fromA = uDir < 0.5;
    vec3 cF = fromA ? cA : cB, cT = fromA ? cB : cA;
    float dF = fromA ? a1.x : b1.x, dT = fromA ? b1.x : a1.x;
    float sF = mix(sqrt(clamp(length(cF.xz - uWaveA.xy) * uWaveA.z, 0.0, 1.0)) * 0.75, 0.75 + 0.25 * clamp(normalize((fromA ? aPosA : aPosB).xyz).y * 1.2, 0.0, 1.0), dF);
    float sT = mix(sqrt(clamp(length(cT.xz - uWaveB.xy) * uWaveB.z, 0.0, 1.0)) * 0.75, 0.75 + 0.25 * clamp(normalize((fromA ? aPosB : aPosA).xyz).y * 1.2, 0.0, 1.0), dT);
    float tA = 0.03 + 0.40 * sF + (st - 0.5) * 0.03, tB = 0.53 + 0.40 * sT + (st2 - 0.5) * 0.03;
    m = clamp((uMorph - tA) / max(tB - tA, 0.06), 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);
  }
  float w = mix(m, 1.0 - m, uDir);
  vec3 c = mix(cA, cB, w);
  vec3 off = mix(offA, offB, w);
  float arc = sin(m * 3.14159265);
  if (arc > 0.0001) {
    vec3 rel = c - uPivot;
    float ang = arc * (1.1 + 2.3 * st2);
    float ca = cos(ang), sa = sin(ang);
    rel.xz = vec2(ca * rel.x - sa * rel.z, sa * rel.x + ca * rel.z) * (1.0 - arc * (0.22 + 0.3 * st));
    rel.y += arc * (4.0 + 26.0 * st2);
    c = uPivot + rel;
    float ext = length(off) * 2.0;
    float lim = min(1.0, length(c - uCamPos) * 0.16 / max(ext, 0.001));
    off *= mix(1.0, lim, smoothstep(0.0, 0.35, arc)) * (1.0 - 0.35 * arc);
  }
  vec3 p = c + off;
  vec3 col = vec3(0.0);
  if (w < 0.999) col += paint(aPosA, aScaA, aColA, cA, nA, a1, a2) * (1.0 - w);
  if (w > 0.001) col += paint(aPosB, aScaB, aColB, cB, nB, b1, b2) * w;
  col = tone(col);
  float thin = mix(max(a1.x, a1.w * 0.5), max(b1.x, b1.w * 0.5), w);
  vTex = 1.0 - 0.7 * thin;
  // broken colour: each touch leans a little warm or cool of the thing it paints, and now and then one answers
  // with the colour of the light or of the shade, at the same brightness, so the eye does the mixing
  float hv = h11(id * 0.917 + 5.1), hw = h11(id * 0.271 + 9.7), vib = uVib * vTex;
  col = hueRot(col, (hv - 0.5) * 0.34 * vib);
  vec3 tint = hv < 0.5 ? uAmb + 0.02 : uSun + uGlowCol * 0.4 + 0.02;
  col = mix(col, tint * (lum(col) / max(lum(tint), 1e-3)), 0.3 * step(0.88, hw) * vib);
  col *= 1.0 + (h11(id * 0.519 + 2.9) - 0.5) * 0.1 * vib;
  vCol = col;
  // the second colour on the brush: a neighbouring hue, a little lighter or darker
  vCol2 = hueRot(col, (h11(id * 0.377 + 1.3) - 0.5) * 0.55 * vTex) * (1.0 + (h11(id * 0.713 + 2.1) - 0.45) * 0.3 * vTex);
  vCell = w < 0.5 ? cellA : cellB;
  vec2 uv = aCorner + 0.5;
  if (st2 > 0.5) uv.y = 1.0 - uv.y;
  vUv = uv;
  vWy = p.y;
  gl_Position = uViewProj * vec4(p, 1.0);
}`;

// the near ground: a crowd of small touches that goes with the eye. They are not stored anywhere: each is found again
// from its number, set on the ground from a baked height, and takes its colour from the same palette as the strokes around it
const GLSL_TOUCH_VS = `#version 300 es
precision highp float;
#define TEX(s, uv) textureLod(s, uv, 0.0)
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aT;     // a place in the tile (0..1), two chances
uniform mat4 uViewProj;
uniform vec3 uCamPos;
uniform vec4 uTile;                // tile size, length, width, how much of it is there
uniform vec4 uLaw;                 // below this distance a touch shrinks with it, down to this fraction; it appears between these two distances
uniform vec3 uThin;                // between these two distances the touches thin out to this fraction
uniform vec4 uGround;              // origin x, z of the baked ground, 1 / span, height texture size
uniform sampler2D uGroundH, uGroundC, uShadow;
uniform vec4 uShadowMap;
uniform float uWaterY, uVib, uTime, uFovK;
uniform vec2 uWindDir;
uniform vec4 uTilt;
uniform vec4 uGust, uFlowA;
out vec2 vUv;
flat out float vCell;
out vec3 vCol;
out vec3 vCol2;
out float vWy;
out float vTex;
${GLSL_COMMON}
${GLSL_ENV}
float h11(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
float gh(vec2 xz) {
  vec2 p = (xz - uGround.xy) * uGround.z * uGround.w - 0.5;
  vec2 i = floor(p), f = p - i;
  ivec2 q = ivec2(i), m = ivec2(int(uGround.w) - 1);
  float a = texelFetch(uGroundH, clamp(q, ivec2(0), m), 0).r, b = texelFetch(uGroundH, clamp(q + ivec2(1, 0), ivec2(0), m), 0).r;
  float c = texelFetch(uGroundH, clamp(q + ivec2(0, 1), ivec2(0), m), 0).r, d = texelFetch(uGroundH, clamp(q + ivec2(1, 1), ivec2(0), m), 0).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  float T = uTile.x, r1 = aT.z, r2 = aT.w, r3 = h11(r1 * 91.3 + r2 * 17.7), r4 = h11(r2 * 53.1 + r1 * 7.9);
  vec2 xz = uCamPos.xz + mod(aT.xy * T - uCamPos.xz + T * 0.5, T) - T * 0.5;
  float y = gh(xz), e = 0.7;
  vec3 n = normalize(vec3(gh(xz - vec2(e, 0.0)) - gh(xz + vec2(e, 0.0)), 2.0 * e, gh(xz - vec2(0.0, e)) - gh(xz + vec2(0.0, e))));
  ivec2 cs = textureSize(uGroundC, 0);
  vec2 cu = clamp((xz + (vec2(r3, r4) - 0.5) * 2.6 - uGround.xy) * uGround.z, 0.0, 0.9999);
  vec4 gc = texelFetch(uGroundC, ivec2(cu * vec2(cs)), 0);
  vec3 c = vec3(xz.x, y, xz.y);
  vec3 toCam = uCamPos - c;
  float dist = length(toCam);
  vec3 v = toCam / max(dist, 1e-3);
  // gone at the rim of the tile, under water, on bare rock faces, and thinned out as the larger strokes take over
  float rim = max(abs(xz.x - uCamPos.x), abs(xz.y - uCamPos.z));
  float keep = gc.a * uTile.w * (1.0 - smoothstep(T * 0.34, T * 0.47, rim)) * step(uWaterY + 0.04, y) * smoothstep(0.45, 0.7, n.y) * smoothstep(uLaw.z, uLaw.w, dist);
  float far = smoothstep(uThin.x, uThin.y, dist);
  keep *= step(r4, mix(1.0, uThin.z, far));
  float ws = waveS(xz) + (r3 - 0.5) * 0.04;
  keep *= step(uFront.x, ws) * step(ws, uFront.y);
  // where the ground is green a good part of the touches stand up as blades of grass, lean with the wind and let the low sun through
  // (grass grows where the ground under it is green, not where a neighbouring touch happens to be)
  vec4 g0 = texelFetch(uGroundC, ivec2(clamp((xz - uGround.xy) * uGround.z, 0.0, 0.9999) * vec2(cs)), 0);
  float veg = smoothstep(0.1, 0.22, g0.g - g0.b) * smoothstep(-0.12, 0.0, g0.g - g0.r) * (1.0 - smoothstep(0.2, 0.6, uSeason.z));
  float blade = step(h11(r1 * 37.7 + r2 * 61.3), 0.6 * veg);
  gc.rgb = mix(gc.rgb, g0.rgb, blade);
  vec3 p;
  float trans = 0.0;
  if (blade > 0.5) {
    float hh = aCorner.x + 0.5;
    float bl = (0.2 + 0.26 * r2) * keep * mix(1.0, 1.5, far) * uFovK, bw = bl * (0.13 + 0.09 * r3);
    vec3 up = normalize(vec3((r1 - 0.5) * 0.9, 1.0, (r4 - 0.5) * 0.9));
    vec3 sd = cross(up, v);
    float sl = length(sd);
    sd = sl > 1e-3 ? sd / sl : vec3(1.0, 0.0, 0.0);
    float gust = sin(dot(xz, uWindDir) * 0.21 - uTime * 1.6 + r1 * 8.0) * 0.65 + sin(dot(xz, vec2(-uWindDir.y, uWindDir.x)) * 0.09 + uTime * 0.83 + r2 * 25.0) * 0.35;
    float lay = gust * 0.5 + 0.2;
    if (uFlowA.x < 0.999) {
      float G = smoothstep(0.36, 0.7, TEX(uNoise, (xz - uWindDir * (uTime * uGust.y)) * uGust.z).r);
      lay = mix((0.1 + 1.1 * G + 0.18 * sin(uTime * 2.1 + r1 * 8.0 + G * 3.0)) * uGust.x, lay, uFlowA.x);
      trans += G * 0.25 * (1.0 - uFlowA.x) * uGust.x;
    }
    p = c + up * (hh * bl) + sd * (aCorner.y * bw);
    p.xz += uWindDir * (lay * hh * hh * bl * 0.6);
    trans += pow(max(dot(-v, uSunDir), 0.0), 3.0) * 0.55;
    n = normalize(n + v * 0.35);
  } else {
  float len = uTile.y * (0.6 + 0.8 * r3), wid = uTile.z * (0.7 + 0.6 * r2);
  float sz = keep * clamp(dist / uLaw.x, uLaw.y, 1.0) * mix(1.0, 1.3, far);
  len *= sz; wid *= sz;
  // laid any way on the ground, then turned to the eye like every other touch
  float ang = r1 * 6.2831853;
  vec3 ax = vec3(cos(ang), 0.0, sin(ang));
  ax = normalize(ax - n * dot(ax, n));
  vec3 ay = cross(n, ax);
  float nv = dot(n, v);
  float k = uTilt.x * (1.0 - smoothstep(0.2, 0.8, abs(nv)));
  if (k > 0.002) {
    vec3 n2 = normalize(mix(n, v, k));
    vec3 a2 = ax - n2 * dot(ax, n2);
    a2 = normalize(a2);
    vec3 lev = cross(vec3(0.0, 1.0, 0.0), v);
    float ll = length(lev);
    if (ll > 1e-3) {
      lev /= ll;
      float roll = (r1 - 0.5) * uTilt.y * 1.5;
      vec3 want = lev * cos(roll) + cross(n2, lev) * sin(roll);
      if (dot(want, a2) < 0.0) want = -want;
      a2 = mix(a2, want, k);
      c.y += wid * 0.26 * k;
    }
    ax = normalize(a2 - n2 * dot(a2, n2));
    ay = cross(n2, ax);
  }
  p = c + ax * (aCorner.x * len) + ay * (aCorner.y * wid) + n * 0.03;
  }
  vec3 alb = gc.rgb * mix(1.0, 0.9 + 0.3 * r3, blade);
  alb = mix(alb, mix(vec3(0.82, 0.6, 0.34), vec3(0.8, 0.68, 0.36), blade), uSeason.x * mix(0.34 * r1, 0.5, blade));
  float snowy = smoothstep(0.25, 0.7, uSeason.z * 1.25 - r1 * 0.45) * smoothstep(0.2, 0.7, n.y);
  alb = mix(alb, snowAlb(r2), snowy);
  float sh = cloudShadow(c.xz);
  vec2 uv = (c.xz - uShadowMap.xy) * uShadowMap.z + 0.5;
  if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) sh *= 1.0 - uShadowMap.w * textureLod(uShadow, uv, 1.0).r;
  vec3 col = shadeC(alb, n, sh, trans * sh) * heroAO(c);
  col = tone(mix(col, fogTint(-v), fogAmt(c, uCamPos)));
  float id = float(gl_InstanceID);
  float hv = h11(id * 0.917 + 5.1), hw = h11(id * 0.271 + 9.7);
  col = hueRot(col, (hv - 0.5) * 0.34 * uVib);
  vec3 tint = hv < 0.5 ? uAmb + 0.02 : uSun + uGlowCol * 0.4 + 0.02;
  col = mix(col, tint * (lum(col) / max(lum(tint), 1e-3)), 0.3 * step(0.88, hw) * uVib);
  col *= 1.0 + (h11(id * 0.519 + 2.9) - 0.5) * 0.1 * uVib;
  vCol = col;
  vTex = 1.0;
  vCol2 = hueRot(col, (h11(id * 0.377 + 1.3) - 0.5) * 0.55) * (1.0 + (h11(id * 0.713 + 2.1) - 0.45) * 0.3);
  // dab, heavy, comma, comma, block, long
  float pick = floor(r2 * 5.999);
  vCell = blade > 0.5 ? (r2 < 0.55 ? 8.0 : r2 < 0.8 ? 4.0 : 5.0) : pick < 1.0 ? 6.0 : pick < 2.0 ? 2.0 : pick < 3.0 ? 4.0 : pick < 4.0 ? 5.0 : pick < 5.0 ? 10.0 : 0.0;
  vec2 uvq = aCorner + 0.5;
  if (r3 > 0.5) uvq.y = 1.0 - uvq.y;
  vUv = uvq;
  vWy = p.y;
  gl_Position = uViewProj * vec4(p, 1.0);
}`;

const GLSL_STROKE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
flat in float vCell;
in vec3 vCol;
in vec3 vCol2;
in float vWy;
in float vTex;
uniform sampler2D uAtlas;
uniform float uA2C, uRelief, uEdge, uClipY;
out vec4 o;
${GLSL_COMMON}
void main() {
  if (vWy < uClipY) discard;
  float ci = floor(vCell + 0.5);
  vec2 cell = vec2(mod(ci, 2.0), floor(ci * 0.5));
  vec2 uv = (cell + clamp(vUv, 0.004, 0.996)) * vec2(0.5, 0.125);
  vec4 t = texture(uAtlas, uv);
  vec2 sv = vec2(dFdx(vUv.y), dFdy(vUv.y));
  float sl = max(length(sv), 1e-6);
  float soft = smoothstep(3.0, 20.0, 1.0 / sl) * uEdge;
  float a = smoothstep(mix(0.40, 0.06, soft), mix(0.50, 0.94, soft), t.a);
  float n = h21(gl_FragCoord.xy);
  if (uA2C > 0.5) {
    a = clamp(a + (n - 0.5) * 0.25 * step(0.02, a) * step(a, 0.98), 0.0, 1.0);
    if (a < 0.03) discard;
  } else {
    if (a < mix(0.5, 0.04 + 0.92 * n, soft)) discard;
    a = 1.0;
  }
  vec3 col = mix(vCol, vCol2, smoothstep(0.52, 0.7, t.g));
  col *= 1.0 + (0.18 * t.r - 0.09) * vTex;
  float lit = -(t.b - 0.5) * 2.0 * dot(sv / sl, vec2(-0.7071, 0.7071)) * uRelief * vTex;
  col *= 1.0 + clamp(lit, -0.22, 0.26);
  o = vec4(col, a);
}`;

// everything painted flat is covered by a field of small dabs: broken colour, bristle relief, specks of toned canvas
const GLSL_DABS = `
vec3 dabs(vec3 c, vec4 b, float hueAmt, float valAmt, float relief, vec3 canvas) {
  c = hueRot(c, (b.b - 0.5) * hueAmt) * (1.0 - valAmt * 0.5 + valAmt * b.r);
  float rel = (dFdx(b.g) - dFdy(b.g)) * relief;
  c *= 1.0 + clamp(rel, -0.2, 0.24);
  return mix(mix(c, canvas, 0.3) * 1.04, c, smoothstep(0.1, 0.6, b.a));
}
`;

const GLSL_TERRAIN_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aXZ;
layout(location=1) in vec4 aA;   // height, rgb
layout(location=2) in vec4 aB;
layout(location=3) in vec4 aNA;  // normal
layout(location=4) in vec4 aNB;
uniform mat4 uViewProj;
uniform vec3 uCamPos;
uniform float uMixT;
out vec3 vCol;
out vec3 vW;
out vec3 vN;
out float vDist;
void main() {
  vec4 d = mix(aA, aB, uMixT);
  vec3 p = vec3(aXZ.x, d.x, aXZ.y);
  vCol = d.yzw; vW = p; vN = mix(aNA.xyz, aNB.xyz, uMixT);
  vDist = length(p - uCamPos);
  gl_Position = uViewProj * vec4(p, 1.0);
}`;

const GLSL_TERRAIN_FS = `#version 300 es
precision highp float;
#define TEX(s, uv) texture(s, uv)
in vec3 vCol;
in vec3 vW;
in vec3 vN;
in float vDist;
uniform sampler2D uBrush, uShadow;
uniform vec3 uCanvas, uCamPos;
uniform float uBlank, uClipY;
uniform vec2 uBrushRot;
uniform vec4 uShadowMap;
out vec4 o;
${GLSL_COMMON}
${GLSL_ENV}
${GLSL_DABS}
void main() {
  if (vW.y < uClipY) discard;
  vec2 p = vec2(uBrushRot.x * vW.x + uBrushRot.y * vW.z, -uBrushRot.y * vW.x + uBrushRot.x * vW.z);
  vec4 b0 = mix(texture(uBrush, p * 0.29 + 0.13), texture(uBrush, p * 0.105), smoothstep(2.5, 9.0, vDist));
  vec4 b1 = texture(uBrush, p * 0.027 + 0.31);
  vec4 b2 = texture(uBrush, p * 0.0065 + 0.67);
  vec4 b = mix(mix(b0, b1, smoothstep(12.0, 40.0, vDist)), b2, smoothstep(80.0, 230.0, vDist));
  vec3 n = normalize(vN);
  vec3 alb = vCol * (0.9 + 0.2 * texture(uNoise, vW.xz * 0.0041).r);
  alb = mix(alb, vec3(0.82, 0.6, 0.34), uSeason.x * 0.2 * step(0.02, alb.g - alb.b));
  float sn = smoothstep(0.25, 0.7, uSeason.z * 1.25 - b.r * 0.45) * smoothstep(0.2, 0.7, n.y);
  alb = mix(alb, snowAlb(b.b), sn);
  float sh = cloudShadow(vW.xz);
  vec2 uv = (vW.xz - uShadowMap.xy) * uShadowMap.z + 0.5;
  if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) sh *= 1.0 - uShadowMap.w * texture(uShadow, uv).r;
  vec3 c = shadeC(alb, n, sh, 0.0) * heroAO(vW);
  c = dabs(c, b, 0.4, 0.2, 0.18, uCanvas);
  vec3 vd = normalize(vW - uCamPos);
  c = tone(mix(c, fogTint(vd), fogAmt(vW, uCamPos)));
  c = mix(uCanvas * (0.97 + 0.06 * b.g), c, waveVis(waveS(vW.xz) + (b.r - 0.5) * 0.06) * (1.0 - uBlank));
  o = vec4(c, 1.0);
}`;

const GLSL_SKY_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aP;
out vec2 vP;
void main() { vP = aP; gl_Position = vec4(aP, 0.0, 1.0); }`;

const GLSL_SKY_FS = `#version 300 es
precision highp float;
#define TEX(s, uv) texture(s, uv)
in vec2 vP;
uniform vec3 uCamF, uCamR, uCamU;
uniform vec2 uTan;
uniform vec3 uCanvas;
uniform float uBlank;
uniform sampler2D uBrush;
out vec4 o;
${GLSL_COMMON}
${GLSL_ENV}
${GLSL_DABS}
void main() {
  vec3 d = normalize(uCamF + vP.x * uTan.x * uCamR + vP.y * uTan.y * uCamU);
  vec3 c = skyColor(d);
  float az = atan(d.x, -d.z) / 6.2831853;
  vec2 uc = vec2(az * 14.0, asin(clamp(d.y, -1.0, 1.0)) * 2.23);
  vec2 gx = dFdx(uc), gy = dFdy(uc);
  gx.x -= 14.0 * floor(gx.x / 14.0 + 0.5); gy.x -= 14.0 * floor(gy.x / 14.0 + 0.5);
  vec4 bc = textureGrad(uBrush, uc, gx, gy);
  vec4 bp = texture(uBrush, d.xz / (0.4 + abs(d.y)) * 1.9);
  vec4 b = mix(bc, bp, smoothstep(0.5, 0.82, d.y));
  c = dabs(c, b, 0.22, 0.1, 0.12, uCanvas);
  c = mix(uCanvas * (0.97 + 0.06 * b.g), c, waveVis(waveSky(d.y) + (b.r - 0.5) * 0.05) * (1.0 - uBlank));
  o = vec4(c, 1.0);
}`;

const GLSL_SOLID_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aCol;   // rgb, 1 for the heart of a tree's foliage, +2 for what floats
uniform mat4 uViewProj;
uniform vec3 uCamPos;
uniform float uTime, uWaterY;
uniform vec2 uWindDir;
out vec3 vCol;
out vec3 vW;
out float vDist;
out float vLeaf;
${GLSL_SWELL}
void main() {
  float fl = step(1.5, aCol.a);
  vec3 p = aPos;
  if (fl > 0.5) p += floatOff(p, uTime, uWaterY, uWindDir);
  vCol = aCol.rgb; vW = p; vLeaf = aCol.a - 2.0 * fl;
  vDist = length(p - uCamPos);
  gl_Position = uViewProj * vec4(p, 1.0);
}`;

const GLSL_SOLID_FS = `#version 300 es
precision highp float;
#define TEX(s, uv) texture(s, uv)
in vec3 vCol;
in vec3 vW;
in float vDist;
in float vLeaf;
uniform sampler2D uBrush;
uniform vec3 uCanvas, uCamPos;
uniform float uAppear, uClipY, uMirror;
out vec4 o;
${GLSL_COMMON}
${GLSL_ENV}
${GLSL_DABS}
void main() {
  if (vW.y < uClipY) discard;
  float nz = texture(uNoise, vW.xz * 0.37 + vW.y * 0.23).a;
  if (nz > uAppear * 1.02 - 0.01) discard;
  float ws = waveS(vW.xz) + (nz - 0.5) * 0.05;
  if (ws < uFront.x || ws > uFront.y) discard;
  if (vLeaf > 0.5 && nz > uSeason.y * 1.4 - 0.2) discard;
  vec3 nn = normalize(cross(dFdx(vW), dFdy(vW)));
  vec3 vd = normalize(vW - uCamPos);
  if (dot(nn, vd) > 0.0) nn = -nn;
  vec2 tan2 = vec2(-nn.z, nn.x);
  float tl = length(tan2);
  vec2 p = abs(nn.y) > 0.6 || tl < 1e-4 ? vW.xz : vec2(dot(vW.xz, tan2 / tl), vW.y);
  vec4 b = mix(texture(uBrush, p * 0.2), texture(uBrush, p * 0.055 + 0.4), smoothstep(14.0, 50.0, vDist));
  vec3 alb = vCol;
  alb = mix(alb, vec3(0.8, 0.5, 0.16), vLeaf * uSeason.x * 0.7);
  alb = mix(alb, snowAlb(b.b), smoothstep(0.25, 0.7, uSeason.z * 1.25 - b.r * 0.45) * smoothstep(0.3, 0.7, nn.y) * (1.0 - vLeaf));
  vec3 c = shadeC(alb, nn, cloudShadow(vW.xz), 0.0);
  c = dabs(c, b, 0.5, 0.26, 0.4, uCanvas);
  c = tone(mix(c, fogTint(vd), fogAmt(vW, uCamPos)));
  o = vec4(c, 1.0);
}`;

// the walker: a modelled figure, lit by the same hour as everything else and gone over with the same brush
const GLSL_FIG_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec3 aCol;
layout(location=3) in vec3 aPaint;  // where the brush is on her (two coordinates), and how much light comes through the cloth
uniform mat4 uViewProj;
out vec3 vW;
out vec3 vN;
out vec3 vCol;
out vec3 vPaint;
void main() { vW = aPos; vN = aNrm; vCol = aCol; vPaint = aPaint; gl_Position = uViewProj * vec4(aPos, 1.0); }`;

const GLSL_FIG_FS = `#version 300 es
precision highp float;
#define TEX(s, uv) texture(s, uv)
in vec3 vW;
in vec3 vN;
in vec3 vCol;
in vec3 vPaint;
uniform sampler2D uBrush;
uniform vec3 uCamPos;
uniform float uClipY;
out vec4 o;
${GLSL_COMMON}
${GLSL_ENV}
void main() {
  if (vW.y < uClipY) discard;
  vec3 vd = normalize(vW - uCamPos);
  vec3 n = normalize(vN);
  float f = dot(n, vd);
  if (f > 0.0) n = normalize(n - 2.0 * f * vd);   // the inside of a cloth is seen as its other face, with no seam where it turns
  vec4 b = texture(uBrush, vPaint.xy), b2 = texture(uBrush, vPaint.xy * 0.31 + 0.4);
  vec3 alb = hueRot(vCol, (b2.b - 0.5) * 0.14) * (0.95 + 0.1 * b2.r);
  float sh = cloudShadow(vW.xz);
  // thin cloth lets the sun through: the far side of the skirt glows, and the parasol is a green lamp over her head
  float thru = vPaint.z * max(-dot(n, uSunDir), 0.0);
  vec3 c = shadeC(alb, n, sh, thru * 0.6 * sh);
  float back = max(dot(vd, uSunDir), 0.0);
  c += (uSun + uGlowCol * 0.3) * (0.35 + lum(alb)) * pow(1.0 - abs(dot(n, vd)), 2.5) * back * back * 1.6;
  // the brush on her: broken colour, and ridges of paint that catch the light
  c = hueRot(c, (b.b - 0.5) * 0.26) * (0.91 + 0.18 * b.r);
  c *= 1.0 + clamp((dFdx(b.g) - dFdy(b.g)) * 0.5, -0.14, 0.18);
  c = tone(mix(c, fogTint(vd), fogAmt(vW, uCamPos)));
  o = vec4(c, 1.0);
}`;

// the water itself: a sheet that mirrors the upside down world, broken into wide flat touches
const GLSL_WATER_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aP;
uniform mat4 uViewProj;
uniform vec3 uCamPos;
uniform float uWaterY;
out vec3 vW;
void main() {
  vW = vec3(uCamPos.x + aP.x * 1600.0, uWaterY, uCamPos.z + aP.y * 1600.0);
  gl_Position = uViewProj * vec4(vW, 1.0);
}`;

const GLSL_WATER_FS = `#version 300 es
precision highp float;
#define TEX(s, uv) texture(s, uv)
in vec3 vW;
uniform sampler2D uBrush, uReflTex;
uniform vec3 uCanvas, uCamPos;
uniform vec2 uRes;
uniform vec4 uWater;
uniform float uBlank, uTime;
out vec4 o;
${GLSL_COMMON}
${GLSL_ENV}
void main() {
  vec3 vd = normalize(vW - uCamPos);
  float dist = length(vW - uCamPos);
  vec2 p = vW.xz + vec2(uTime * 0.11, uTime * 0.03);
  vec4 b = mix(texture(uBrush, p * vec2(0.06, 0.2)), texture(uBrush, p * vec2(0.013, 0.045) + 0.3), smoothstep(18.0, 80.0, dist));
  vec2 suv = gl_FragCoord.xy / uRes + (vec2(b.b, b.r) - 0.5) * vec2(0.03, 0.09);
  vec3 refl = texture(uReflTex, clamp(suv, 0.003, 0.997)).rgb;
  float fres = 0.3 + 0.7 * pow(1.0 - max(-vd.y, 0.0), 3.0);
  vec3 base = uWater.rgb * (uAmb * 0.95 + uSun * 0.3 * max(uSunDir.y, 0.0));
  vec3 c = mix(base, refl, fres * uWater.a);
  c = hueRot(c, (b.b - 0.5) * 0.3) * (0.9 + 0.2 * b.g);
  vec3 r = reflect(vd, normalize(vec3((b.b - 0.5) * 0.14, 1.0, (b.r - 0.5) * 0.45)));
  c += (uSun * 0.5 + uGlowCol) * pow(max(dot(r, uSunDir), 0.0), 120.0) * 0.55;
  c = tone(mix(c, fogTint(vd), fogAmt(vW, uCamPos)));
  c = mix(uCanvas * (0.97 + 0.06 * b.g), c, waveVis(waveS(vW.xz) + (b.r - 0.5) * 0.06) * (1.0 - uBlank));
  o = vec4(c, 1.0);
}`;

const GLSL_SHADOW_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aP;   // x, z, darkness
uniform vec4 uShadowMap;
out float vV;
void main() { vV = aP.z; gl_Position = vec4((aP.xy - uShadowMap.xy) * uShadowMap.z * 2.0, 0.0, 1.0); }`;
const GLSL_SHADOW_FS = `#version 300 es
precision highp float;
in float vV;
out vec4 o;
void main() { o = vec4(vV, 0.0, 0.0, 1.0); }`;

const GLSL_GLOW_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 iPos;   // xyz, kind: 0 round, 1 pillar, +2 follows the dome
layout(location=2) in vec4 iCol;
layout(location=3) in vec2 iSize;
uniform mat4 uViewProj;
uniform vec3 uCamPos, uCamRight, uCamUp;
out vec2 vUv;
out vec3 vCol;
flat out float vKind;
out float vWy;
void main() {
  float kind = iPos.w;
  float dome = step(1.5, kind);
  kind -= dome * 2.0;
  vec3 c = iPos.xyz + uCamPos * dome;
  vec3 p;
  if (kind > 0.5) {
    vec3 s = cross(vec3(0.0, 1.0, 0.0), uCamPos - c);
    float l = length(s);
    vec3 ax = l > 1e-4 ? s / l : vec3(1.0, 0.0, 0.0);
    p = c + ax * (aCorner.x * iSize.x) + vec3(0.0, 1.0, 0.0) * ((aCorner.y + 0.5) * iSize.y);
  } else {
    p = c + uCamRight * (aCorner.x * iSize.x) + uCamUp * (aCorner.y * iSize.y);
  }
  vUv = aCorner + 0.5; vCol = iCol.rgb; vKind = kind; vWy = p.y;
  gl_Position = uViewProj * vec4(p, 1.0);
}`;

const GLSL_GLOW_FS = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vCol;
flat in float vKind;
in float vWy;
uniform float uClipY;
out vec4 o;
void main() {
  if (vWy < uClipY) discard;
  float a;
  if (vKind > 0.5) {
    float x = vUv.x * 2.0 - 1.0;
    a = exp(-x * x * 5.0) * pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.04, vUv.y);
  } else {
    float d = length(vUv * 2.0 - 1.0);
    a = max(exp(-d * d * 3.6) - 0.0273, 0.0);
  }
  o = vec4(vCol * a, 1.0);
}`;

const GLSL_POST_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aP;
out vec2 vUv;
void main() { vUv = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`;

const GLSL_POST_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform vec2 uPx;
uniform vec4 uGrade;   // saturation, brightness, contrast, lift
uniform vec4 uVeil;    // a tint laid over everything, and how strongly
uniform vec3 uCanvas;
uniform float uWhite, uEmboss, uVig, uSoft, uWeave, uBloom;
out vec4 o;
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
  float r = 1.3 + uSoft * 2.2;
  vec3 c0 = textureLod(uScene, vUv, 0.0).rgb;
  vec3 cl = textureLod(uScene, vUv - vec2(uPx.x * r, 0.0), 0.0).rgb, cr = textureLod(uScene, vUv + vec2(uPx.x * r, 0.0), 0.0).rgb;
  vec3 cd = textureLod(uScene, vUv - vec2(0.0, uPx.y * r), 0.0).rgb, cu = textureLod(uScene, vUv + vec2(0.0, uPx.y * r), 0.0).rgb;
  vec3 c = mix(c0, (c0 * 2.0 + cl + cr + cd + cu) / 6.0, clamp(0.3 + uSoft, 0.0, 1.0));
  float relief = clamp(((luma(cr) - luma(cl)) - (luma(cu) - luma(cd))) * uEmboss, -0.16, 0.16);
  c *= 1.0 + relief;
  if (uBloom > 0.001) {
    // light spreads: the bright places lend a little of themselves to what is near
    vec3 bl = textureLod(uScene, vUv, 3.5).rgb * 0.3 + textureLod(uScene, vUv, 5.0).rgb * 0.4 + textureLod(uScene, vUv, 6.5).rgb * 0.3;
    c = mix(c, bl, 0.05 * uBloom) + max(bl - 0.72, 0.0) * (0.3 * uBloom);
  }
  float l = luma(c);
  c = mix(vec3(l), c, uGrade.x);
  // colour that has little of it gets a little more, and the middle of the scale is drawn out: the darks go down into
  // blue and violet instead of into milk, the lights stay where they are
  float chroma = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  c = mix(vec3(luma(c)), c, 1.0 + 0.2 * (1.0 - chroma));
  c = (c - 0.5) * uGrade.z + 0.5;
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.24);
  c = c * uGrade.y + uGrade.w * (1.0 - c);
  c = mix(c, c * uVeil.rgb, uVeil.a);
  vec2 fc = gl_FragCoord.xy * uWeave;
  float weave = sin(fc.x * 2.1) * sin(fc.y * 2.1);
  float grain = h21(floor(gl_FragCoord.xy) + 0.5) - 0.5;
  float tex = weave * 0.022 + grain * 0.03;
  c *= 1.0 + tex;
  c = mix(c, uCanvas * (1.0 + tex * 1.6), uWhite);
  vec2 q = vUv - 0.5;
  c *= 1.0 - uVig * dot(q, q) * 1.5;
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
