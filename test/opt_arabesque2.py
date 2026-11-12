#!/usr/bin/env python3
"""Option: Debussy, Premiere Arabesque (L. 66 No. 1), recut so that the theme arrives on the cut to the cliffs (6.67 s).
Notes: Mutopia Project (Keith OHara, from Durand 1904), Public Domain; rendered to MIDI by LilyPond 2.25.12.
Run: python3 test/opt_arabesque2.py   (writes shots/music/opt_arabesque2.wav and .json)"""
import sys; sys.path.insert(0, '/home/claude/monet/test')
from opt_engine import *

midi = ensure_midi('ftp/DebussyC/L66/debussy_Arabesque_1', 'debussy_Arabesque_1.ly', '/tmp/arab')
grid = mido_bars(midi, 4)
def realbar(b):  # bar 94 is a 2/4 bar, so bars from 95 on start two beats earlier in the 4-beat grid
    if b <= 93: return grid[b]
    out = []
    for gb in (b - 1, b):
        for (o, d, k, v) in grid.get(gb, []):
            q = (gb - 1) * 4 + o; r0 = (b - 1) * 4 - 2
            if r0 - 1e-6 <= q < r0 + 4 - 1e-6: out.append((round(q - r0, 4), d, k, v))
    return out
PLAN = {1: 1, 2: 5, 3: 6, 4: 7, 5: 10, 6: 11, 7: 12, 8: 13, 9: 35, 10: 36, 11: 37, 12: 38, 13: 105, 14: 106, 15: 107}
NOTES = {ab: realbar(ab) for ab in PLAN.values()}

PV = {1: 50, 2: 58, 3: 50, 4: 54, 5: 58, 6: 62, 7: 66, 8: 70, 9: 66, 10: 74, 11: 88, 12: 60, 13: 44, 14: 38, 15: 44}
PED = {1: [0, 2], 2: [0], 3: [0, 2], 4: [0, 2], 5: [0, 2], 6: [0, 2], 7: [0, 2], 8: [0, 2], 9: [0, 1, 2, 3], 10: [0, 1, 2, 3],
       11: [0], 12: [0], 13: [0], 14: [0], 15: []}
S = Score(1891)
items = []
for f, ab in PLAN.items():
    for (o, d, k, voice) in NOTES[ab]:
        on = 0.30 + o * (BAR - 0.30) / 4 if f == 1 else T(f, o)
        end = T(f, min(o + d, 4.0))
        v = PV[f] if f not in (9, 10) else 64 + int(((f - 9) * 4 + o) * 2.0)
        if d >= 0.99 and voice == 1: v += 8
        if abs(o - round(o)) < 1e-3 and voice == 2 and k < 60: v += 3
        if o == 0 and 2 <= f <= 8: v += 8  # each film bar's downbeat clearly struck
        items.append((on, end, k, v, voice))
S.lay_piano(items, [T(f, b) for f, bs in PED.items() for b in bs])

# chamber group
S.strings_bed(T(2), T(3), 50, segs=1)                          # 3.33: the strings enter on the B9
S.melody(T(2), T(3), 'fl', 60, shift=0)                         # the flute doubles Debussy's high A and its turn
S.strings_bed(T(3), T(5), 52)                                  # 6.67: the theme in E, strings under it
for f in (3, 4, 5):                                            # a soft harp roll marks the cuts at 6.67, 10.0, 13.33
    c, v = S.chord(T(f), T(f, 1)); S.add('harp', T(f), T(f, 2), [c + 12] + v, 56, roll=0.03)
S.melody(T(4), T(5), 'vln', 64, shift=12)                       # 10.0: the violins take up the tune an octave above
S.strings_bed(T(5), T(7), lambda t: 56 + 2 * (t - T(5)))        # 13.33: F#m7, poco a poco cresc.
S.melody(T(5), T(7), 'cl', 58, shift=0)
S.melody(T(6), T(7), 'vln', 66, shift=12)
S.strings_bed(T(7), T(9), 68)                                  # 20.0: the bloom
S.melody(T(7), T(9), 'vln', 76, shift=12); S.melody(T(7), T(9), 'cl', 60, shift=0)
for i in range(4):
    a = T(7) + i * 2 * BEAT; c, v = S.chord(a, a + 2 * BEAT)
    S.add('harp', a, a + 2 * BEAT, [c + 12] + v + [v[-1] + 12 if v else c + 24], 62, roll=0.035)
S.add('vc', T(9), T(11), S.chord(T(9), T(9, 1))[0], 60)
S.cuts([T(9, i) for i in range(8)], 62, 2.5)                    # 26.67: the eight cuts
S.strings_bed(T(11), T(12, 4), 92, segs=1)                      # 33.33: the summit
S.add('cb', T(11), T(12), 28, 92)
S.melody(T(11), T(12), 'vln', 96, shift=-12, mindur=0.5); S.melody(T(11), T(12), 'fl', 66, shift=-12, mindur=0.5)
c, v = S.chord(T(11), T(12))
S.add('harp', T(11), T(12), [c - 12, c, c + 7] + v + [x + 12 for x in v], 92, roll=0.03)
S.add('harp', T(12), T(12, 4), v + [x + 12 for x in v], 52, roll=0.05)
for k in S.parts: S.parts[k] = [(a, min(b, T(12, 3.9)), kk, vv) for (a, b, kk, vv) in S.parts[k]]

def where(t):
    f = min(15, int((t + 0.005) / BAR) + 1); b = max(0.0, (t - T(f)) / BEAT)
    return f'{PLAN[f]} beat {b + 1:.3g}'
DOES = {3.333: 'B9: new bass and harmony, strings enter (flute on the high A at 4.17)',
        6.667: 'bar 6, the theme in E, pp', 10.0: 'violins take the tune', 13.333: 'F#m7, new harmony, poco a poco cresc.',
        20.0: 'A major bloom: violins + clarinet sing, harp', 33.333: 'E major summit, tutti',
        36.667: 'release, strings fade by 39.8', 40.0: 'piano alone, the ending arpeggio', 46.667: 'final low E, ringing'}
hits = {'piece': 'Debussy, Premiere Arabesque (L. 66 No. 1)', 'source': 'Mutopia Project, Mutopia-2011/10/25-1777, Public Domain',
        'sourceBars': {str(f): b for f, b in PLAN.items()},
        'events': [{'time': t, 'event': e, 'bar': where(t), 'music': DOES.get(t, 'cut: chord + bass on the beat' if 'haystack' in e else '')} for t, e in EVENTS]}
if '--verify' in sys.argv:
    verify(NOTES, PLAN, {b: realbar(b) for b in PLAN.values()})
S.mix_and_write('arabesque2', [(0, 1), (T(11) - 0.03, 1), (T(11), 1.35), (T(12), 1.2), (T(12, 0.5), 1.1), (T(12, 2.5), 0.4), (T(12, 3.8), 0), (LEN, 0)], hits)
