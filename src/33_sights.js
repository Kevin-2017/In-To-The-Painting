// ---------- sights: what happens in a world at its own hours ----------
// A train over the bridge at noon, the boats coming home at dusk, a flock turning over the stacks: things seen from far off that are
// worth going to, and that are there only at their hour and season. Each set of sights is one object handed to SIGHTS.add:
//   worlds    the chapters it belongs to, by ch.id ('coast', 'argenteuil', 'fields', 'pond')
//   list(ch)  every sight this set can show in that chapter: [{ id, name: { zh, en }, hint: { zh, en } }]
//             (id unique in the game; name a few words; hint one short line that says when and where, for the album after the ending)
//   enter(g)  the chapter has just been shown
//   update(g, dt)             once a frame while she plays, and on the title (g.mode === 'title')
//   draw(S, g, env, t)        its strokes of this frame, into the dynamic buffer S
//   glows(R, g, env, t)       its lights of this frame (R.glow)
//   now(g)    the sights showing at this moment: [{ id, x, y, z, r, k, sky }]  where it is (metres; for something in the sky a point
//             about 800 m out in its direction, with sky: true), how large (r, metres), how fully it is there (k, 0 to 1)
// All but worlds are optional. A set that throws is dropped for the rest of the visit, so one fault cannot stop the game.
const SIGHTS = (() => {
  const sets = [];
  let cur = [], out = [];
  const guard = (s, fn, a, b, c, d) => { if (!s[fn] || s.dead) return undefined; try { return s[fn](a, b, c, d); } catch (e) { s.dead = true; if (typeof console !== 'undefined') console.warn('sights: ' + fn, e); return undefined; } };
  return {
    live: true, sets,
    add(set) { sets.push(set); },
    enter(g) { cur = g && g.ch ? sets.filter((s) => (s.worlds || []).includes(g.ch.id)) : []; for (const s of cur) { s.dead = false; guard(s, 'enter', g); } },
    update(g, dt) { if (!this.live) return; for (const s of cur) guard(s, 'update', g, dt); },
    draw(S, g, env, t) { if (!this.live) return; for (const s of cur) guard(s, 'draw', S, g, env, t); },
    glows(R, g, env, t) { if (!this.live) return; for (const s of cur) guard(s, 'glows', R, g, env, t); },
    // every sight of a chapter, for the album
    list(ch) { let a = []; for (const s of sets) if ((s.worlds || []).includes(ch.id)) { const l = guard(s, 'list', ch); if (l) a = a.concat(l); } return a; },
    // the ones showing now (the same array every call: read it, do not keep it)
    now(g) { out.length = 0; if (!this.live) return out; for (const s of cur) { const l = guard(s, 'now', g); if (l) for (const x of l) out.push(x); } return out; },
  };
})();
