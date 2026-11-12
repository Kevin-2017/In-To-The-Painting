// ---------- the hour and the season ----------
// t runs 0..1 over a day: sunrise at 0.25, noon at 0.5, sunset at 0.75
const DAY = (() => {
  const K = (t, zen, up, low, hor, haze, sun, sunI, amb, ambI, glow, glowT, glowP, fog, fogD, mist, cl, cs, sat, bright) =>
    ({ t, zen: hex(zen), up: hex(up), low: hex(low), hor: hex(hor), haze: hex(haze), sun: hex(sun), sunI, amb: hex(amb), ambI, glow: hex(glow), glowT, glowP, fog: hex(fog), fogD, mist, cl: hex(cl), cs: hex(cs), sat, bright });
  return [
    K(0.00, '#0b1335', '#131f4c', '#1d2c5e', '#2c3d70', '#1c2850', '#000000', 0.0, '#5f78cc', 0.40, '#7088d0', 8, 0.05, '#1f2c58', 0.0018, 0.6, '#3a4a80', '#1b2650', 0.9, 0.96),
    K(0.155, '#0b1335', '#131f4c', '#1d2c5e', '#2c3d70', '#1c2850', '#000000', 0.0, '#5f78cc', 0.40, '#7088d0', 8, 0.05, '#1f2c58', 0.0018, 0.6, '#3a4a80', '#1b2650', 0.9, 0.96),
    K(0.19, '#2a3c6c', '#4a5c8e', '#8a7ea6', '#d0a094', '#7a7a9c', '#000000', 0.0, '#8090cc', 0.60, '#f0a888', 6, 0.25, '#8a8eb0', 0.0021, 1.2, '#b898a4', '#58608c', 0.88, 0.97),
    K(0.25, '#5a78aa', '#98a8c8', '#eec0a8', '#ffc08a', '#b4a6ba', '#ff9a5a', 0.72, '#9a9cd0', 0.70, '#ffa868', 10, 0.55, '#c4b4bc', 0.0022, 1.3, '#ffd0b0', '#8a88ac', 1.0, 1.0),
    K(0.31, '#6a94cc', '#a4c2e4', '#ecdfcc', '#f8e6bc', '#ccced4', '#ffdca8', 0.95, '#96a4e0', 0.72, '#ffe4b0', 14, 0.36, '#d6dae2', 0.0016, 0.9, '#fff4e2', '#a2aacc', 1.02, 1.02),
    K(0.40, '#5590d8', '#8ebcea', '#c0dcf0', '#dfeaec', '#ccdae0', '#fff2d6', 1.0, '#929ee8', 0.74, '#fff6dc', 18, 0.28, '#d4e0e8', 0.0011, 0.3, '#fffcf4', '#b0bad8', 1.06, 1.04),
    K(0.50, '#4a8adc', '#82b6ee', '#b6d4f0', '#dae8f0', '#d0dee6', '#fff8e6', 1.05, '#949ef0', 0.76, '#fffaea', 22, 0.24, '#d6e2ea', 0.0010, 0.1, '#ffffff', '#b6c0dc', 1.04, 1.04),
    K(0.62, '#4e88d2', '#88b6e6', '#c4d8ea', '#ece6d4', '#d4dad8', '#ffeec0', 1.02, '#989ae8', 0.74, '#fff0c8', 16, 0.3, '#e0e0dc', 0.0011, 0.15, '#fff8e6', '#aeb2d4', 1.08, 1.04),
    K(0.70, '#5c80be', '#a0aed0', '#ecceb0', '#ffd696', '#dcbea8', '#ffc884', 1.0, '#9c90d8', 0.74, '#ffd088', 10, 0.46, '#e8c8aa', 0.0013, 0.3, '#ffdcaa', '#a090bc', 1.12, 1.03),
    K(0.75, '#6474b0', '#b098c0', '#f4b090', '#ffa45c', '#c8928a', '#ff9450', 0.82, '#9a84cc', 0.72, '#ff9a50', 8, 0.58, '#dca696', 0.0015, 0.5, '#ffac7c', '#9474ac', 1.15, 1.0),
    K(0.80, '#44548e', '#7672a8', '#b890aa', '#e69a84', '#84749c', '#000000', 0.0, '#8880c8', 0.62, '#f0947a', 5, 0.3, '#9488ac', 0.0018, 0.8, '#d0929e', '#545088', 1.0, 0.97),
    K(0.87, '#0b1335', '#131f4c', '#1d2c5e', '#2c3d70', '#1c2850', '#000000', 0.0, '#5f78cc', 0.40, '#7088d0', 8, 0.05, '#1f2c58', 0.0018, 0.6, '#3a4a80', '#1b2650', 0.9, 0.96),
    K(1.00, '#0b1335', '#131f4c', '#1d2c5e', '#2c3d70', '#1c2850', '#000000', 0.0, '#5f78cc', 0.40, '#7088d0', 8, 0.05, '#1f2c58', 0.0018, 0.6, '#3a4a80', '#1b2650', 0.9, 0.96),
  ];
})();
const PHASE0 = { autumn: 0, leaf: 1, snow: 0, flower: 1, mist: 0, fog: 1, cover: 0.45, sun: 1, grey: 0, veil: [1, 1, 1, 0], soft: 0, len: 1, wid: 1, sat: 1, el: 1, lift: 0.035, amb: 1.25, year: '' };
const isNight = (t) => t < 0.185 || t > 0.815;

function mixPhase(a, b, k) {
  const o = {};
  for (const key in PHASE0) {
    const va = a[key] === undefined ? PHASE0[key] : a[key], vb = b[key] === undefined ? PHASE0[key] : b[key];
    if (key === 'veil') o.veil = [lerp(va[0], vb[0], k), lerp(va[1], vb[1], k), lerp(va[2], vb[2], k), lerp(va[3], vb[3], k)];
    else if (key === 'year') o.year = k < 0.5 ? va : vb;
    else o[key] = lerp(va, vb, k);
  }
  return o;
}

// everything the shaders need to know about this moment in this world
function atmosphere(ch, t, ph, time, out) {
  const e = out || {};
  let i = 0;
  while (i < DAY.length - 2 && t > DAY[i + 1].t) i++;
  const a = DAY[i], b = DAY[i + 1], k = ease(clamp((t - a.t) / (b.t - a.t), 0, 1));
  const m3 = (x, y) => [lerp(x[0], y[0], k), lerp(x[1], y[1], k), lerp(x[2], y[2], k)];
  const L = (key) => lerp(a[key], b[key], k);
  e.sky = [m3(a.zen, b.zen), m3(a.up, b.up), m3(a.low, b.low), m3(a.hor, b.hor)];
  e.haze = m3(a.haze, b.haze);
  const sunI = L('sunI') * ph.sun, ambI = L('ambI');
  e.sun = mulc(m3(a.sun, b.sun), sunI * 0.6);
  e.amb = mulc(m3(a.amb, b.amb), ambI * ph.amb); // the shade is full of light: his shadows are a colour, never a darkness
  e.glow = m3(a.glow, b.glow); e.glowT = L('glowT'); e.glowP = L('glowP') * (0.35 + 0.65 * ph.sun) * (1 - 0.45 * ph.grey); e.glowW = 1 - ph.grey; e.grey = ph.grey;
  e.fog = m3(a.fog, b.fog); e.fogD = L('fogD') * ph.fog; e.mist = L('mist') + ph.mist; e.mistBase = ch.mistBase || 0; e.scatter = 0.5 * (1 - 0.7 * ph.grey);
  e.cloudLit = m3(a.cl, b.cl); e.cloudShade = m3(a.cs, b.cs);
  e.cover = ph.cover; e.cloudShadow = 0.5 * clamp(sunI, 0, 1) * (1 - ph.grey);
  e.cloudOff = [time * 0.0016 * (ch.wind ? ch.wind[0] : 1), time * 0.0016 * (ch.wind ? ch.wind[1] : 0.3)];
  // a grey day: the sky closes, the sun only a brightness behind the cloud
  if (ph.grey > 0) {
    const g = lum3(e.sky[2]) * 1.02, grey = [g * 0.96, g * 0.98, g * 1.02];
    for (let s = 0; s < 4; s++) e.sky[s] = mixc(e.sky[s], grey, ph.grey * 0.8);
    e.amb = mixc(e.amb, mulc([1, 1, 1.04], lum3(e.amb) * 1.25), ph.grey * 0.8);
    e.cloudLit = mixc(e.cloudLit, [0.86, 0.87, 0.9], ph.grey * 0.7); e.cloudShade = mixc(e.cloudShade, [0.62, 0.64, 0.7], ph.grey * 0.7);
  }
  // snow on the ground throws light back up into the shadows
  if (ph.snow > 0) e.amb = mulc(e.amb, 1 + 0.18 * ph.snow);
  // the sun's road across this sky
  const p = ch.sunPath, day = (t - 0.25) / 0.5, maxEl = p.maxEl * ph.el;
  const el = (t >= 0.25 && t <= 0.75 ? maxEl * Math.sin(Math.PI * day) : -maxEl * 0.35 * Math.sin(Math.PI * clamp(t < 0.25 ? (0.25 - t) / 0.25 : (t - 0.75) / 0.25, 0, 1))) + 0.8;
  let u = clamp(day, -0.2, 1.2);
  if (t < 0.15) u = lerp(1.2, -0.2, (t + 0.15) / 0.3); else if (t > 0.85) u = lerp(1.2, -0.2, (t - 0.85) / 0.3);
  e.sunDir = skyDir(lerp(p.rise, p.set, u), el);
  e.sunEl = el; e.sunI = sunI; e.night = isNight(t) ? 1 : 0;
  e.autumn = ph.autumn; e.leaf = ph.leaf; e.snow = ph.snow; e.flower = ph.flower;
  e.grade = { sat: L('sat') * ph.sat, bright: L('bright'), contrast: 1.0, lift: ph.lift, veil: ph.veil, soft: ph.soft };
  e.waterRefl = undefined;
  if (ch.atmo) {
    // a world's own air is a thing of the day: in the dark before dawn and after dusk it gives way to the night
    const nk = clamp(Math.max((0.236 - t) / 0.04, (t - 0.764) / 0.04), 0, 1);
    const keep = nk > 0 ? { sky: e.sky.map((c) => c.slice()), fog: e.fog.slice(), haze: e.haze.slice(), amb: e.amb.slice(), cloudLit: e.cloudLit.slice(), cloudShade: e.cloudShade.slice() } : null;
    ch.atmo(e, t, ph);
    if (keep) {
      for (let i = 0; i < 4; i++) e.sky[i] = mixc(e.sky[i], keep.sky[i], nk);
      for (const key of ['fog', 'haze', 'amb', 'cloudLit', 'cloudShade']) e[key] = mixc(e[key], keep[key], nk);
    }
  }
  return e;
}
function lum3(c) { return c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; }
