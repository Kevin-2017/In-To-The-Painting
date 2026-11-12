// The director: runs inside the page of a built game and plays a storyboard shot frame by frame.
// It takes the game's own loop away, then for every frame sets the hour, the season, her place and the camera from the shot,
// steps the game by exactly one frame and paints it. Nothing in the game is changed but a few live methods of the Game.
//
// A shot (all times are seconds of the shot's own clock, 0 at its first recorded frame):
//   world      index of the world (0 coast, 1 argenteuil, 2 fields, 3 pond)
//   len        frames recorded
//   runup      seconds stepped unrecorded before the first frame (default 2), so cloth, water and birds are in motion
//   time0      the game clock (g.time) at the first frame (default 60): the same shot always gives the same frames
//   clock      the hour: a number, or [[s, t], ...] (t may run past 1 into the next day; linear between keys, eased if clockEase)
//   season     the season index: a number, or [[s, phase], ...] (a step at each key; the land turns over in about a second)
//   snap       true: a change of season is a hard cut of the land
//   spot       an easel index for the game (settle, her stance, hiding her in a view without show), with viewK
//   viewK      a number or [[s, k], ...]
//   caps       ids of paintings counted as caught (default none)
//   frameFrac  how much of the height the composed 3:2 picture fills at an easel (default 1: the full height)
//   cam        { keys: [{ s, x, y, z, yaw, pitch, fov, roll, abs, stop } | { s, easel: i, dz?, dy? }], look: 'her' | [x, y, z], lookUp }
//              or { game: true, yaw, pitch } for the game's own camera (easels with viewK, the repainting)
//              y is above the ground at that key unless abs. Hermite spline through the keys; stop: true eases in and out of a key
//   her        { keys: [{ s, x, z, alt | ay, heading }], flaps: [s, ...] } or { spot: i } or { hide: true }
//   trans      { to: worldIndex, at: s } the repainting begins at s (it runs 8.6 s with its own camera)
//   beams      true: the beams of light over the easels (off by default)
window.DIRECTOR = (() => {
  const A = window.__ruhua, g = A.game, R = g.R;
  const real = { update: g.update, updatePlayer: g.updatePlayer, advanceTime: g.advanceTime, updateSpots: g.updateSpots, spotFound: g.spotFound };
  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  let shot = null, S = 0, fps = 30, cache = null, PH0 = null;

  // ---- curves ----
  // cubic Hermite through keys [{s, v: [..]}]: tangents from the neighbours, linear past the ends, zero at a key marked stop
  function hermite(keys, s) {
    const n = keys.length;
    if (n === 1) return keys[0].v.slice();
    const tan = (i) => {
      if (keys[i].stop) return keys[i].v.map(() => 0);
      const a = keys[Math.max(0, i - 1)], b = keys[Math.min(n - 1, i + 1)];
      return a.v.map((x, j) => (b.v[j] - x) / (b.s - a.s));
    };
    if (s <= keys[0].s) { const m = keys[0].stop ? keys[0].v.map(() => 0) : keys[0].v.map((x, j) => (keys[1].v[j] - x) / (keys[1].s - keys[0].s)); return keys[0].v.map((x, j) => x + m[j] * (s - keys[0].s)); }
    if (s >= keys[n - 1].s) { const k0 = keys[n - 2], k1 = keys[n - 1], m = k1.stop ? k1.v.map(() => 0) : k1.v.map((x, j) => (x - k0.v[j]) / (k1.s - k0.s)); return k1.v.map((x, j) => x + m[j] * (s - k1.s)); }
    let i = 0; while (s > keys[i + 1].s) i++;
    const a = keys[i], b = keys[i + 1], h = b.s - a.s, u = (s - a.s) / h, ma = tan(i), mb = tan(i + 1);
    const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
    return a.v.map((x, j) => h00 * x + h10 * h * ma[j] + h01 * b.v[j] + h11 * h * mb[j]);
  }
  // piecewise linear (eased if asked) through [[s, v], ...]
  function piece(keys, s, eased) {
    if (typeof keys === 'number') return keys;
    if (s <= keys[0][0]) return keys[0][1];
    for (let i = 0; i + 1 < keys.length; i++) {
      const [s0, v0] = keys[i], [s1, v1] = keys[i + 1];
      if (s <= s1) { let u = (s - s0) / (s1 - s0); if (eased) u = u * u * (3 - 2 * u); return lerp(v0, v1, u); }
    }
    return keys[keys.length - 1][1];
  }
  function step(keys, s) { if (typeof keys === 'number') return keys; let v = keys[0][1]; for (const k of keys) if (s >= k[0]) v = k[1]; return v; }

  // where the eye stands at an easel once it has settled, and the lens that frames the composed picture on this screen
  function easelPose(i, ch) {
    const sp = (ch || g.ch).spots[i], v = sp.view, lens = (v.fov || 55) * DEG;
    const fov = Math.min(126 * DEG, 2 * Math.atan((Math.tan(lens / 2) * 0.86) / g.frameH()));
    return { x: v.x, y: g.groundAt(g.cur, v.x, v.z) + v.y, z: v.z, yaw: v.yaw, pitch: v.pitch, fov: fov / DEG };
  }

  // turn a shot into curves once
  function compile(sh) {
    const c = {};
    if (sh.cam && sh.cam.keys) {
      let prevYaw = null;
      c.cam = sh.cam.keys.map((k) => {
        let x = k.x, y = k.y, z = k.z, yaw = k.yaw || 0, pitch = k.pitch || 0, fov = k.fov || 60;
        if (k.easel !== undefined) {
          const e = easelPose(k.easel);
          const f = [Math.sin(e.yaw) * Math.cos(e.pitch), Math.sin(e.pitch), -Math.cos(e.yaw) * Math.cos(e.pitch)], dz = k.dz || 0, dx = k.dx || 0;
          x = e.x + f[0] * dz + Math.cos(e.yaw) * dx; y = e.y + f[1] * dz + (k.dy || 0); z = e.z + f[2] * dz + Math.sin(e.yaw) * dx;
          yaw = e.yaw + (k.dyaw || 0); pitch = e.pitch + (k.dpitch || 0); fov = k.fov || e.fov;
        } else if (!k.abs) y = g.groundAt(g.cur, x, z) + y;
        if (prevYaw !== null) yaw = prevYaw + angDiff(yaw, prevYaw);
        prevYaw = yaw;
        return { s: k.s, stop: !!k.stop, v: [x, y, z, yaw, pitch, fov, k.roll || 0] };
      });
      if (sh.cam.look && sh.cam.look !== 'her') c.look = sh.cam.look.map ? sh.cam.look : null;
    }
    if (sh.her && sh.her.keys) {
      c.her = sh.her.keys.map((k) => ({ s: k.s, stop: !!k.stop, v: [k.x, k.z, k.ay !== undefined ? k.ay : NaN, k.alt || 0] }));
      // a key with an absolute height (ay) is turned into a height above the ground there
      if (sh.her.absolute) { for (const k of c.her) k.v.splice(3, 1); c.herAbs = true; } // heights kept above the sea, not above the land under her
      else {
        for (const k of c.her) if (!isNaN(k.v[2])) k.v[3] = Math.max(0, k.v[2] - g.groundAt(g.cur, k.v[0], k.v[1]));
        for (const k of c.her) k.v.splice(2, 1);
      }
    }
    return c;
  }

  function camAt(s) {
    const v = hermite(cache.cam, s), o = { x: v[0], y: v[1], z: v[2], yaw: v[3], pitch: v[4], fov: v[5], roll: v[6], abs: true };
    let look = shot.cam.look === 'her' ? [g.pl.x, g.pl.y + 1.1 + (shot.cam.lookUp || 0), g.pl.z] : shot.cam.look;
    if (shot.cam.look === 'herSmooth' && cache.her) {
      const tau = shot.cam.tau || 1, n = 24; let w = 0; look = [0, 0, 0];
      for (let i = 0; i < n; i++) {
        const dt = (i / n) * 3 * tau, q = herAt(s - dt), wi = Math.exp(-dt / tau), y = cache.herAbs ? hermite(cache.her, s - dt)[2] : g.groundAt(g.cur, q.x, q.z) + q.alt;
        look[0] += q.x * wi; look[1] += (y + 1.1 + (shot.cam.lookUp || 0)) * wi; look[2] += q.z * wi; w += wi;
      }
      look = look.map((v) => v / w);
      look[0] = g.pl.x; look[2] = g.pl.z; // only her height is smoothed: across the frame she goes where she goes
    }
    if (look) {
      const dx = look[0] - o.x, dy = look[1] - o.y, dz = look[2] - o.z, k = shot.cam.lookK === undefined ? 1 : piece(shot.cam.lookK, s, true);
      const ly = Math.atan2(dx, -dz) + (shot.cam.yawOff || 0), lp = Math.atan2(dy, Math.hypot(dx, dz)) + (shot.cam.pitchOff || 0);
      o.yaw = o.yaw + angDiff(ly, o.yaw) * k; o.pitch = lerp(o.pitch, lp, k);
    }
    // never under the land or the water
    const floor = g.groundAt(g.cur, o.x, o.z) + 0.35; if (o.y < floor) o.y = floor;
    return o;
  }

  // ---- her ----
  function herAt(s) {
    const v = hermite(cache.her, s), e = 1 / 60, a = hermite(cache.her, s - e), b = hermite(cache.her, s + e);
    const alt = cache.herAbs ? v[2] - g.groundAt(g.cur, v[0], v[1]) : v[2];
    return { x: v[0], z: v[1], alt: Math.max(0, alt), vx: (b[0] - a[0]) / (2 * e), vz: (b[1] - a[1]) / (2 * e), valt: (b[2] - a[2]) / (2 * e) };
  }
  function drive(dt) {
    const p = g.pl, H = shot.her || {};
    if (shot._transDone && !g.trans) { p.vx = p.vz = 0; p.valt = 0; p.alt = 0; p.y = p.yAbs = g.groundAt(g.cur, p.x, p.z); g.sliding = false; return; } // landed in the new world: she stands
    const atSpot = H.spot !== undefined ? H.spot : (H.spotFrom !== undefined && S >= H.spotFrom[0] ? H.spotFrom[1] : undefined);
    if (atSpot !== undefined) {
      const sp = g.ch.spots[atSpot], v = sp.view;
      p.x = sp.x; p.z = sp.z; p.alt = 0; p.vx = p.vz = 0; p.valt = 0; const ph = v.pose === undefined ? v.yaw : v.pose; p.heading += angDiff(ph, p.heading) * Math.min(1, dt * 3);
      p.y = p.yAbs = g.groundAt(g.cur, p.x, p.z);
    } else if (cache.her) {
      const q = herAt(S), hs = Math.hypot(q.vx, q.vz);
      p.x = q.x; p.z = q.z; p.alt = q.alt < 0.07 ? 0 : q.alt; p.vx = q.vx; p.vz = q.vz; p.valt = p.alt > 0 ? q.valt : 0;
      p.y = p.yAbs = g.groundAt(g.cur, p.x, p.z) + p.alt;
      const hk = H.keys.find((k) => k.heading !== undefined && Math.abs(k.s - S) < 1e-6);
      if (hs > 0.4) p.heading += angDiff(Math.atan2(p.vx, -p.vz), p.heading) * Math.min(1, dt * 8);
      else if (H.heading !== undefined) p.heading = H.heading;
      if (hk) p.heading = hk.heading;
      const inAir = p.alt > 0.06;
      if (!inAir) p.step = (p.step || 0) + hs * dt * 1.5;
      const leanT = inAir ? clamp(hs / 15, 0, 1) * 0.5 + clamp(-p.valt / 16, -0.15, 0.36) : 0;
      g.lean += (leanT - g.lean) * Math.min(1, dt * 4);
      // the beats of the parasol
      let fk = 0; for (const tf of H.flaps || []) if (S >= tf) fk = Math.max(fk, 1 - (S - tf) * 2.6);
      g.flapK = Math.max(0, fk);
      // the ribbons of light off the rim of the parasol, as the game lays them
      const sp3 = Math.hypot(hs, inAir ? p.valt : 0);
      g.trailT = (g.trailT || 0) - dt;
      if (g.trailT <= 0) {
        g.trailT = 0.035;
        const on = inAir && sp3 > 6 ? clamp((sp3 - 6) / 7, 0, 1) * (H.ribbons === undefined ? 1 : piece(H.ribbons, S)) : 0, a = g.hero.tipL, b = g.hero.tipR;
        g.trail.unshift([a[0], a[1], a[2], b[0], b[1], b[2], g.hero.ready ? on : 0]);
        while (g.trail.length > 16) g.trail.pop();
      }
    }
    else if (cache.cam) { const c = hermite(cache.cam, S); p.x = c[0]; p.z = c[2]; p.alt = 0; p.vx = p.vz = 0; p.valt = 0; p.y = p.yAbs = g.groundAt(g.cur, p.x, p.z); } // hidden: she keeps under the eye (the fireflies keep to her)
    g.sliding = !!H.slide && p.alt < 0.06 && Math.hypot(p.vx, p.vz) > 4.2;
    if (g.sliding) g.slideCol = H.slideCol || [0.86, 0.93, 1.0];
  }

  // ---- the frame ----
  function apply(s) {
    S = s;
    g.viewK = shot.viewK === undefined ? (shot.spot !== undefined ? 1 : 0) : piece(shot.viewK, s, true);
    const sp = shot.spot === undefined ? -1 : step(shot.spot, s);
    g.spot = sp; if (sp >= 0) g.lastSpot = sp;
    const ph = shot.season === undefined ? 0 : step(shot.season, s);
    if (ph !== g.phase) { g.phase = g.prevPhase = ph; if (shot.snap) g.phShown = null; }
  }
  function fix() {
    // what the game's own update would have changed back
    g.viewK = shot.viewK === undefined ? (shot.spot !== undefined ? 1 : 0) : piece(shot.viewK, S, true);
    g.freeK = shot.her && shot.her.hide ? 1 : 0; g.free = false;
    g.fovK = 0; g.auto = false; g.doorOn = false;
    if (shot.cam && shot.cam.keys) { const c = camAt(S); g.debugCam = c; g.roll = c.roll; }
    else { g.debugCam = null; g.roll = 0; }
  }
  function tick(s, render) {
    apply(s);
    if (shot.trans && !shot._transDone && s >= shot.trans.at - 1e-6) { shot._transDone = true; g.startTransition(shot.trans.to); }
    real.update.call(g, (shot.speed || 1) / fps);
    fix();
    if (!render) return null;
    g.render();
    return true;
  }
  function grab(type, q) { return R.canvas.toDataURL(type || 'image/jpeg', q || 0.94); }

  return {
    setup({ w, h, q }) {
      A.skipRender = true;
      g.update = function () {}; // the page's own loop steps nothing from now on
      g.advanceTime = function () { if (!shot) return; let t = piece(shot.clock === undefined ? 0.4 : shot.clock, S, shot.clockEase); g.t = t - Math.floor(t); };
      g.updatePlayer = function (dt) { if (shot) drive(dt); };
      g.updateSpots = function () {};
      g.quality = q === undefined ? 2 : q; g.autoQuality = false;
      g.trackFps = function () {};
      // the beams of light over the easels are the game's way of pointing: off in the film unless a shot asks for them
      const bg = g.buildGlows;
      g.buildGlows = function (q, env) {
        if (!shot || shot.beams || !this.ch) return bg.call(this, q, env);
        const sp = this.ch.spots; this.ch.spots = [];
        try { return bg.call(this, q, env); } finally { this.ch.spots = sp; }
      };
      this.size(w, h);
      // the defaults of a season, for blending two of them
      return { w: R.fbW, h: R.fbH };
    },
    size(w, h) { g.resize(w, h, 1); fps = 30; return [R.fbW, R.fbH]; },
    fps(v) { fps = v; },
    // load the world of a shot and set everything to its first moment, minus the run up
    prepare(sh, from) {
      shot = JSON.parse(JSON.stringify(sh)); shot._transDone = false;
      if (g.mode === 'trans' || g.trans) { g.trans = null; g.mode = 'play'; }
      if (g.wi !== sh.world) g.showWorld(sh.world);
      g.mode = 'play'; g.frameFrac = sh.frameFrac || 1;
      g.caps = {}; for (const id of sh.caps || []) g.caps[id] = '1';
      cache = compile(shot);
      let s0 = (from === undefined ? 0 : from) - (sh.runup === undefined ? 2 : sh.runup);
      if (sh.trans && (from || 0) > sh.trans.at) s0 = Math.min(s0, sh.trans.at - 1 / fps); // a frame inside the repainting is reached through all of it
      g.time = (sh.time0 === undefined ? 60 : sh.time0) + s0 * (sh.speed || 1); g.flowPhase[0] = g.flowPhase[1] = g.time * 0.05;
      g.trail.length = 0; g.lean = 0; g.flapK = 0; g.pending = null; g.flash = 0; g.rush = 1;
      S = s0; g.advanceTime(0);
      const ph = shot.season === undefined ? 0 : step(shot.season, s0); g.phase = g.prevPhase = ph; g.phShown = null;
      if (shot.cam && shot.cam.game) { g.camYaw = shot.cam.yaw || 0; g.camPitch = shot.cam.pitch === undefined ? -0.06 : shot.cam.pitch; g.camDD = undefined; }
      apply(s0); drive(0); fix();
      return { s0, wi: g.wi, strokes: g.cur.S.n };
    },
    // step from wherever the clock is to just before s, unrecorded
    runTo(s) { let k = 0; while (S + 1 / fps < s - 1e-6) { tick(S + 1 / fps, false); k++; } return k; },
    // one recorded frame at local time s (s is the next step after the last), returned as a data url
    frame(s, type, q) {
      const t0 = performance.now(); tick(s, true); R.gl.finish(); const t1 = performance.now();
      const url = grab(type, q);
      return { url, ms: Math.round(t1 - t0), grabMs: Math.round(performance.now() - t1), t: +g.t.toFixed(4), ph: g.phase, mode: g.mode, pl: [+g.pl.x.toFixed(1), +g.pl.y.toFixed(1), +g.pl.z.toFixed(1)], cam: g.cam.pos.map((v) => +v.toFixed(1)), sun: g.envNow ? [+(Math.atan2(g.envNow.sunDir[0], -g.envNow.sunDir[2])).toFixed(2), +g.envNow.sunEl.toFixed(1)] : null };
    },
    // what a world holds, for placing cameras
    info() {
      const ch = g.ch, W = g.cur;
      return { id: ch.id, wi: g.wi, center: ch.center, radius: ch.radius, maxAlt: ch.maxAlt, waterY: W.waterY, start: ch.start, door: ch.door, wind: ch.wind, t0: ch.t0, title: ch.title,
        phases: ch.phases.map((p, i) => ({ i, name: p.name, year: p.year })), strokes: W.S.n,
        spots: ch.spots.map((s, i) => ({ i, x: s.x, z: s.z, hidden: !!s.hidden, gy: +g.groundAt(W, s.x, s.z).toFixed(2), view: s.view, pose: easelPose(i) })),
        effects: ch.effects.map((e) => ({ id: e.id, spot: e.spot, phase: e.phase, t0: e.t0, t1: e.t1, hidden: !!e.hidden, name: e.name, title: e.title })),
        sights: (A.SIGHTS && A.SIGHTS.list(ch)) || [], lines: ch.lines || null };
    },
    ground(pts) { return pts.map(([x, z]) => +g.groundAt(g.cur, x, z).toFixed(2)); },
    sightsNow() { return (A.SIGHTS && A.SIGHTS.now(g).map((s) => ({ id: s.id, x: +s.x.toFixed(1), y: +s.y.toFixed(1), z: +s.z.toFixed(1), k: s.k }))) || []; },
    // a shot stepped without painting: for each frame her place on the screen (y up, a part of the frame's height from its middle)
    // and the camera's height and pitch
    measure(sh, s0, s1) {
      this.prepare(sh, s0); this.runTo(s0);
      const out = [];
      for (let k = Math.round(s0 * fps); k <= Math.round(s1 * fps); k++) {
        tick(k / fps, false);
        const c = g.debugCam; if (!c) { out.push(null); continue; }
        const cp = Math.cos(c.pitch), f = [Math.sin(c.yaw) * cp, Math.sin(c.pitch), -Math.cos(c.yaw) * cp], rl = Math.hypot(f[0], f[2]) || 1;
        const r = [-f[2] / rl, 0, f[0] / rl], u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
        const d = [g.pl.x - c.x, g.pl.y + 1.1 - c.y, g.pl.z - c.z], z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
        const t = Math.tan((c.fov * Math.PI / 180) / 2);
        out.push({ k, sy: z > 0.1 ? ((d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / z / t) / 2 : null, sx: z > 0.1 ? ((d[0] * r[0] + d[2] * r[2]) / z / t / 1.7778) / 2 : null, cy: c.y, pitch: c.pitch, py: g.pl.y });
      }
      return out;
    },
    state() { return { t: g.t, phase: g.phase, mode: g.mode, wi: g.wi, time: g.time, S }; },
  };
})();
