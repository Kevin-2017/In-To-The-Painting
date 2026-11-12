#!/usr/bin/env python3
"""Option: Debussy, Clair de lune (Suite bergamasque, L. 75, 1890/1905), 9/8: one bar of the piece to one bar of the
film (a dotted quarter = 54). Bars 1-4, 35-43, 71-72.
Notes: Mutopia Project (Keith OHara, from E. Fromont 1905), Mutopia-2010/12/21-1778, Public Domain; MIDI by LilyPond 2.25.12.
Run: python3 test/opt_clair.py   (writes shots/music/opt_clair.wav and .json)"""
import sys; sys.path.insert(0, '/home/claude/monet/test')
from opt_engine import *

midi = ensure_midi('ftp/DebussyC/L75/debussy_Ste_Bergamesq_Clair', 'debussy_Ste_Bergamesq_Clair.ly', '/tmp/clair')
grid = mido_bars(midi, 4.5)   # 9/8: 4.5 quarters a bar
PLAN = {1: 1, 2: 2, 3: 3, 4: 4, 5: 35, 6: 36, 7: 37, 8: 38, 9: 39, 10: 40, 11: 41, 12: 42, 13: 43, 14: 71, 15: 72}
NOTES = {ab: grid[ab] for ab in PLAN.values()}
Q = 4.0 / 4.5                  # film beats per quarter of the piece
PV = {1: 42, 2: 46, 3: 48, 4: 50, 5: 54, 6: 60, 7: 66, 8: 70, 9: 72, 10: 76, 11: 90, 12: 66, 13: 30, 14: 38, 15: 44}
DOT = [0, 4 / 3, 8 / 3]        # the dotted-quarter beats, in film beats
PED = {1: [0], 2: [0], 3: [0], 4: [0], 5: DOT, 6: DOT, 7: DOT, 8: DOT, 9: DOT, 10: DOT, 11: DOT, 12: DOT, 13: DOT, 14: [0], 15: []}
S = Score(1890)
items = []
for f, ab in PLAN.items():
    for (o, d, k, voice) in NOTES[ab]:
        on, end = T(f, o * Q), T(f, min(o + d, 4.5) * Q)
        v = PV[f]
        if f == 12: v = 70 - int(o * 4)            # dim.
        if d >= 1.0 and voice == 1: v += 6
        if o == 0: v += 6
        if f == 15: on += 0.025 * sorted(x[2] for x in NOTES[ab]).index(k)   # the rolled last chord
        items.append((on, end, k, v, voice))
S.lay_piano(items, [T(f, b) for f, bs in PED.items() for b in bs])

S.strings_bed(T(2), T(5), lambda t: 44 + 2 * (t - T(2)) / BAR, segs=3)  # 3.33: the strings enter
S.melody(T(3), T(5), 'cl', 50, shift=-12, mindur=0.25)                   # 6.67: the clarinet joins the top line
c, v = S.chord(T(4), T(4, 1)); S.add('harp', T(4), T(4, 3), [c + 12] + v + [v[-1] + 12], 52, roll=0.04)  # 10.0: harp
S.strings_bed(T(5), T(7), lambda t: 54 + 2.5 * (t - T(5)), segs=6)      # 13.33: Db, the arpeggios whirl, cresc.
S.melody(T(5), T(7), 'vln', 60, shift=0, mindur=0.8)
c, v = S.chord(T(5), T(5, 1)); S.add('harp', T(5), T(5, 3), [c + 12] + v + [v[-1] + 12], 58, roll=0.03)
S.strings_bed(T(7), T(9), 70, segs=6)                                    # 20.0: En animant, the bloom
S.melody(T(7), T(11), 'vln', 78, shift=-12, mindur=0.8); S.melody(T(7), T(9), 'fl', 60, shift=-12, mindur=0.8)
for i in range(4):
    a = T(7) + i * 2 * BEAT; c, v = S.chord(a, a + 2 * BEAT)
    S.add('harp', a, a + 2 * BEAT, [c + 12] + v, 62, roll=0.035)
S.strings_bed(T(9), T(11), 72, segs=6, pad=True)
S.cuts([T(9, i) for i in range(8)], 62, 2.5)                             # 26.67: a plucked chord on every film beat
S.strings_bed(T(11), T(13), lambda t: 94 if t < T(12) else 74, segs=6)   # 33.33: the summit (Debussy's f)
c, v = S.chord(T(11), T(11, 1.3))
S.add('cb', T(11), T(12), c - 12 if c - 12 >= 28 else c, 92)
S.melody(T(11), T(12), 'vln', 96, shift=-12, mindur=0.5); S.melody(T(11), T(12), 'fl', 66, shift=-12, mindur=0.5)
S.add('harp', T(11), T(12), [c - 12, c] + v + [x + 12 for x in v], 92, roll=0.03)
for k in S.parts: S.parts[k] = [(a, min(b, T(12, 3.9)), kk, vv) for (a, b, kk, vv) in S.parts[k]]

def where(t):
    f = min(15, int((t + 0.005) / BAR) + 1); e = max(0.0, (t - T(f)) / BEAT) / Q * 2
    return f'{PLAN[f]} 8th {e + 1:.3g}'
DOES = {3.333: 'new chord, the strings enter', 6.667: 'next phrase (duplets), the clarinet joins the top line',
        10.0: 'Ab7, the harp enters', 13.333: 'Db, the flowing arpeggios begin (cresc.)', 20.0: 'En animant: E major, violins and flute sing',
        33.333: 'Debussy\'s f: the summit, tutti', 36.667: 'dim., strings fade by 39.8', 40.0: 'Calmato, pp, piano alone',
        43.333: '', 46.667: 'the final rolled Db chord'}
hits = {'piece': 'Debussy, Clair de lune (Suite bergamasque)', 'source': 'Mutopia Project, Mutopia-2010/12/21-1778, Public Domain',
        'sourceBars': {str(f): b for f, b in PLAN.items()}, 'meterNote': '9/8: one bar of the piece = one film bar; a dotted quarter = 4/3 film beats',
        'events': [{'time': t, 'event': e, 'bar': where(t), 'music': DOES.get(t, 'cut: harp + pizzicato + strings chord on the film beat' if 'haystack' in e else '')} for t, e in EVENTS]}
if '--verify' in sys.argv: verify(NOTES, PLAN, grid)
S.mix_and_write('clair', [(0, 1), (T(11) - 0.03, 1), (T(11), 1.3), (T(12), 1.15), (T(12, 0.5), 1.05), (T(12, 2.5), 0.4), (T(12, 3.8), 0), (LEN, 0)], hits)
