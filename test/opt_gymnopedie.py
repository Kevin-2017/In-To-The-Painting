#!/usr/bin/env python3
"""Option: Satie, Gymnopedie No. 1 (1888), 3/4: one bar of the piece to one bar of the film (a quarter = 54, Satie's
"Lent et douloureux"). Bars 1, 4-8, 35-39, 4, 45-47 (45-47 are the second ending).
Notes: Mutopia Project (Evin Robertson, from the Dover edition), Mutopia-2014/12/14-37, Public Domain; MIDI by LilyPond 2.25.12.
Run: python3 test/opt_gymnopedie.py"""
import sys; sys.path.insert(0, '/home/claude/monet/test')
from opt_engine import *

midi = ensure_midi('ftp/SatieE/gymnopedie_1', 'gymnopedie_1.ly', '/tmp/gym')
grid = mido_bars(midi, 3)
PLAN = {1: 1, 2: 4, 3: 5, 4: 6, 5: 7, 6: 8, 7: 35, 8: 36, 9: 37, 10: 38, 11: 39, 12: 4, 13: 45, 14: 46, 15: 47}
NOTES = {ab: grid[ab] for ab in PLAN.values()}
Q = 4.0 / 3.0
PV = {1: 44, 2: 46, 3: 50, 4: 52, 5: 54, 6: 54, 7: 62, 8: 64, 9: 66, 10: 72, 11: 84, 12: 50, 13: 40, 14: 40, 15: 46}
S = Score(1888)
items = []
for f, ab in PLAN.items():
    for (o, d, k, voice) in NOTES[ab]:
        on = 0.30 + o * Q * (BAR - 0.30) / 4 if f == 1 else T(f, o * Q)
        end = T(f, min(o + d, 3) * Q)
        v = PV[f] + (6 if voice == 1 and k >= 69 else 0) + (4 if o == 0 else 0)
        if f in (11, 15) and len(NOTES[ab]) > 4: on += 0.02 * sorted(x[2] for x in NOTES[ab]).index(k)  # spread the big chords
        items.append((on, end, k, v, voice))
S.lay_piano(items, [T(f) for f in range(1, 15)])            # Satie's pedal: one per bar

S.strings_bed(T(2), T(7), lambda t: 44 + 1.5 * (t - T(2)) / BAR, segs=1)   # 3.33: the strings enter
S.melody(T(3), T(7), 'cl', 48, shift=-12, mindur=0.5)                      # 6.67: the tune (clarinet an octave under it)
c, v = S.chord(T(4), T(4, 1)); S.add('harp', T(4), T(4, 3), [c + 12] + v, 50, roll=0.04)   # 10.0: harp
S.melody(T(5), T(7), 'vln', 56, shift=0, mindur=0.5)                       # 13.33: the violins take the tune
S.strings_bed(T(7), T(9), 66, segs=1)                                      # 20.0: the bloom
S.melody(T(7), T(9), 'vln', 72, shift=0, mindur=0.5); S.melody(T(7), T(9), 'fl', 56, shift=0, mindur=0.5)
for f in (7, 8):
    c, v = S.chord(T(f), T(f, 1)); S.add('harp', T(f), T(f, 4), [c + 12] + v + [v[-1] + 12], 60, roll=0.04)
S.strings_bed(T(9), T(11), 70, segs=4)
S.cuts([T(9, i) for i in range(8)], 60, 2.5)
S.strings_bed(T(11), T(13), lambda t: 90 if t < T(12) else 70, segs=1)     # 33.33: D major, the fullest chord of the piece
S.add('cb', T(11), T(12), 38, 90)
S.add('vln', T(11), T(12, 2), [N for N in (74, 78, 81)], 92); S.add('fl', T(11), T(12), 81, 62)
c, v = S.chord(T(11), T(12)); S.add('harp', T(11), T(12), [c - 12, c] + v + [x + 12 for x in v], 88, roll=0.03)
for k in S.parts: S.parts[k] = [(a, min(b, T(12, 3.9)), kk, vv) for (a, b, kk, vv) in S.parts[k]]

def where(t):
    f = min(15, int((t + 0.005) / BAR) + 1); b = max(0.0, (t - T(f)) / BEAT) / Q
    return f'{PLAN[f]} beat {b + 1:.3g}'
DOES = {3.333: 'Dmaj7, the strings enter', 6.667: 'Gmaj7, the tune begins on beat 2 (7.78 s), clarinet with it',
        10.0: 'new chord, harp', 13.333: 'new chord, violins take the tune', 20.0: 'A/E, violins + flute sing, harp',
        33.333: 'D major, tutti (the cadence of the first part)', 36.667: 'Dmaj7, strings fade by 39.8',
        40.0: 'piano alone (second ending)', 46.667: 'the final D minor chord'}
hits = {'piece': 'Satie, Gymnopedie No. 1', 'source': 'Mutopia Project, Mutopia-2014/12/14-37, Public Domain',
        'sourceBars': {str(f): b for f, b in PLAN.items()}, 'meterNote': '3/4: one bar of the piece = one film bar; a quarter = 4/3 film beats',
        'events': [{'time': t, 'event': e, 'bar': where(t), 'music': DOES.get(t, 'cut: harp + pizzicato + strings chord on the film beat' if 'haystack' in e else '')} for t, e in EVENTS]}
if '--verify' in sys.argv: verify(NOTES, PLAN, grid)
S.mix_and_write('gymnopedie', [(0, 1), (T(11) - 0.03, 1), (T(11), 1.3), (T(12), 1.15), (T(12, 0.5), 1.05), (T(12, 2.5), 0.4), (T(12, 3.8), 0), (LEN, 0)], hits)
