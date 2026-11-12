#!/usr/bin/env python3
"""Trailer score 2 for "入画 追光": Debussy, Premiere Arabesque (L. 66 No. 1, 1888-91), abridged to the picture
and arranged for piano with a small chamber group (strings, harp, flute, clarinet), on the film's grid of
72 beats a minute in 4/4 (a beat 5/6 s, a bar 10/3 s), 52.0 s.

Notes of the piano part: Mutopia Project, "Premiere Arabesque", typeset by Keith OHara from Durand et Fils (1904),
Mutopia-2011/10/25-1777, licence Public Domain (github.com/MutopiaProject/MutopiaProject,
ftp/DebussyC/L66/debussy_Arabesque_1/debussy_Arabesque_1.ly). Converted with convert-ly and rendered to MIDI with
LilyPond 2.25.12 (pip package "lilypond"); the bars used are copied below, unchanged (cross-staff duplicates removed).
With --verify, the table is checked again against that MIDI (/tmp/arab/a.midi).

Instruments: GeneralUser GS v2.0.3 SoundFont (github.com/mrbumpy409/GeneralUser-GS, its own licence permits use in
private or commercial music), played with tinysoundfont (pip). Room reverb, mix, loudness (BS.1770 via pyloudnorm)
and a lookahead peak limiter are done here in numpy.

Writes shots/music/trailer2.wav (48 kHz, 16 bit, stereo, 52.0 s) and shots/music/trailer2_hits.json.
Run: python3 test/trailer2_music.py [--sf PATH_TO_GeneralUser-GS.sf2] [--verify]
"""
import json, sys, os, math
import numpy as np
from scipy.signal import fftconvolve, butter, lfilter
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.io import wavfile
import tinysoundfont
import pyloudnorm

DIR = '/home/claude/monet'
SF = sys.argv[sys.argv.index('--sf') + 1] if '--sf' in sys.argv else '/tmp/sf/gu/GeneralUser-GS.sf2'
SR, LEN = 48000, 52.0
NS = int(round(SR * LEN))
BAR = 10.0 / 3.0
BEAT = BAR / 4.0
def T(fbar, beat=0.0):  # film bar from 1, beat from 0
    return (fbar - 1) * BAR + beat * BEAT

# ---- the piano part: Debussy's bars (real bar numbers of the piece), (onset in beats, length in beats, MIDI key, staff voice)
NOTES = {
      1: [(0.0, 0.3333, 61, 1), (0.3333, 0.3333, 64, 2), (0.6667, 0.3333, 69, 2), (1.0, 0.3333, 73, 1), (1.3333, 0.3333, 76, 1), (1.6667, 0.3333, 78, 1), (2.0, 0.3333, 80, 1), (2.3333, 0.3333, 75, 1), (2.6667, 0.3333, 71, 1), (3.0, 0.3333, 68, 2), (3.3333, 0.3333, 63, 2), (3.6667, 0.3333, 59, 1)],
      2: [(0.0, 0.3333, 57, 1), (0.3333, 0.3333, 61, 2), (0.6667, 0.3333, 66, 2), (1.0, 0.3333, 69, 1), (1.3333, 0.3333, 73, 1), (1.6667, 0.3333, 75, 1), (2.0, 0.3333, 76, 1), (2.3333, 0.3333, 71, 1), (2.6667, 0.3333, 68, 1), (3.0, 0.3333, 64, 2), (3.3333, 0.3333, 59, 2), (3.6667, 0.3333, 56, 1)],
      3: [(0.0, 2.0, 54, 2), (0.3333, 0.3333, 57, 2), (0.6667, 1.0, 61, 2), (1.0, 1.0, 73, 1), (1.3333, 0.3333, 66, 1), (1.6667, 1.3333, 69, 1), (2.0, 1.0, 78, 1), (2.0, 2.0, 52, 2), (2.3333, 0.3333, 57, 2), (2.6667, 1.0, 61, 2), (3.0, 2.0, 73, 1), (3.3333, 0.3333, 66, 1), (3.6667, 1.3333, 69, 1)],
      4: [(0.0, 2.0, 51, 2), (0.3333, 0.3333, 57, 2), (0.6667, 1.0, 61, 2), (1.0, 1.0, 73, 1), (1.3333, 0.3333, 66, 1), (1.6667, 1.3333, 69, 1), (2.0, 1.0, 78, 1), (2.0, 2.0, 49, 2), (2.3333, 0.3333, 57, 2), (2.6667, 1.0, 64, 2), (3.0, 2.0, 81, 1), (3.3333, 0.3333, 69, 1), (3.6667, 0.3333, 73, 1)],
      5: [(0.0, 0.3333, 47, 2), (0.3333, 0.3333, 54, 2), (0.6667, 0.3333, 57, 2), (1.0, 0.3333, 61, 2), (1.0, 2.3333, 81, 1), (1.3333, 0.3333, 63, 2), (1.6667, 0.3333, 66, 2), (2.0, 0.3333, 69, 2), (2.3333, 0.3333, 73, 2), (2.6667, 0.3333, 75, 2), (3.0, 0.3333, 73, 2), (3.3333, 0.3333, 71, 2), (3.3333, 0.3333, 80, 1), (3.6667, 0.3333, 69, 2), (3.6667, 0.3333, 78, 1)],
      6: [(0.0, 0.5, 40, 2), (0.5, 0.5, 47, 2), (1.0, 0.3333, 76, 1), (1.0, 0.5, 52, 2), (1.3333, 0.3333, 78, 1), (1.5, 0.5, 56, 2), (1.6667, 0.3333, 73, 1), (2.0, 0.3333, 76, 1), (2.0, 0.5, 59, 2), (2.3333, 0.3333, 71, 1), (2.5, 0.5, 56, 2), (2.6667, 0.3333, 73, 1), (3.0, 0.3333, 68, 1), (3.0, 0.5, 52, 2), (3.3333, 0.3333, 71, 1), (3.5, 0.5, 47, 2), (3.6667, 0.3333, 66, 1)],
      7: [(0.0, 0.3333, 68, 1), (0.0, 0.5, 40, 2), (0.3333, 0.3333, 64, 1), (0.5, 0.5, 49, 2), (0.6667, 0.3333, 68, 1), (1.0, 0.5, 52, 2), (1.0, 2.0, 63, 1), (1.5, 0.5, 56, 2), (2.0, 0.5, 61, 2), (2.5, 0.5, 56, 2), (3.0, 0.5, 52, 2), (3.0, 1.0, 61, 1), (3.5, 0.5, 47, 2)],
      10: [(0.0, 0.3333, 59, 1), (0.0, 0.5, 42, 2), (0.3333, 0.3333, 57, 1), (0.5, 0.5, 49, 2), (0.6667, 0.3333, 59, 1), (1.0, 0.5, 52, 2), (1.0, 1.5, 61, 1), (1.5, 0.5, 54, 2), (2.0, 0.5, 57, 2), (2.5, 0.5, 54, 2), (2.5, 0.5, 64, 1), (3.0, 0.5, 52, 2), (3.0, 0.5, 63, 1), (3.5, 0.5, 49, 2), (3.5, 0.5, 64, 1)],
      35: [(0.0, 0.3333, 71, 1), (0.0, 0.5, 47, 2), (0.0, 1.0, 75, 1), (0.3333, 0.3333, 66, 1), (0.6667, 0.3333, 69, 1), (1.0, 0.3333, 73, 1), (1.0, 0.5, 54, 2), (1.0, 1.0, 76, 1), (1.3333, 0.3333, 68, 1), (1.6667, 0.3333, 71, 1), (2.0, 0.3333, 75, 1), (2.0, 0.5, 57, 2), (2.0, 1.0, 78, 1), (2.3333, 0.3333, 69, 1), (2.6667, 0.3333, 73, 1), (3.0, 0.3333, 76, 1), (3.0, 0.5, 59, 2), (3.0, 1.0, 80, 1), (3.3333, 0.3333, 71, 1), (3.6667, 0.3333, 75, 1)],
      36: [(0.0, 0.3333, 78, 1), (0.0, 0.5, 63, 2), (0.0, 1.0, 81, 1), (0.3333, 0.3333, 73, 1), (0.6667, 0.3333, 76, 1), (1.0, 0.3333, 80, 1), (1.0, 0.5, 66, 2), (1.0, 1.0, 83, 1), (1.3333, 0.3333, 75, 1), (1.6667, 0.3333, 78, 1), (2.0, 0.3333, 81, 1), (2.0, 0.5, 69, 2), (2.0, 1.0, 85, 1), (2.3333, 0.3333, 76, 1), (2.6667, 0.3333, 80, 1), (3.0, 0.3333, 83, 1), (3.0, 0.5, 71, 2), (3.0, 1.0, 87, 1), (3.3333, 0.3333, 78, 1), (3.6667, 0.3333, 81, 1)],
      37: [(0.0, 0.5, 28, 2), (0.0, 2.0, 90, 1), (0.0, 4.0, 80, 1), (0.0, 4.0, 83, 1), (0.5, 0.5, 40, 2), (1.0, 0.5, 47, 2), (1.5, 0.5, 52, 2), (2.0, 0.5, 56, 2), (2.0, 2.0, 88, 1), (2.5, 0.5, 59, 2), (3.0, 0.5, 64, 2), (3.5, 0.5, 68, 2)],
      38: [(0.0, 4.3333, 76, 1), (2.0, 2.0, 64, 2)],
      105: [(0.0, 1.0, 64, 2), (0.3333, 0.3333, 83, 1), (0.6667, 0.3333, 76, 1), (1.0, 1.0, 71, 2), (1.3333, 0.3333, 85, 1), (1.6667, 0.3333, 80, 1), (2.0, 1.0, 76, 2), (2.3333, 0.3333, 88, 1), (2.6667, 0.3333, 83, 1), (3.0, 1.0, 80, 2), (3.3333, 0.3333, 90, 1), (3.6667, 0.3333, 85, 1)],
      106: [(0.0, 1.0, 76, 2), (0.0, 1.0, 83, 2), (0.0, 1.0, 88, 1), (0.0, 1.0, 92, 1), (1.0, 2.0, 76, 2), (1.0, 2.0, 83, 2), (1.0, 2.0, 88, 1), (1.0, 2.0, 92, 1), (3.0, 1.0, 76, 2), (3.0, 1.0, 83, 2), (3.0, 1.0, 88, 1), (3.0, 1.0, 92, 1)],
      107: [(0.0, 1.0, 40, 2), (0.0, 1.0, 52, 2), (0.0, 1.0, 64, 1)],
}

# film bar -> bar of the Arabesque
PLAN = {1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 10, 9: 35, 10: 36, 11: 37, 12: 38, 13: 105, 14: 106, 15: 107}

rng = np.random.default_rng(1891)

# ---- piano: dynamics, pedal and a little rubato
# base velocity per film bar (Debussy: p at the start, pp at bar 6, poco a poco cresc. from 10, cresc. in 35;
# he then has a diminuendo in 36 and p at 37; here the swell is carried on into 37, the summit of the film, see the report)
PV = {1: 50, 2: 50, 3: 52, 4: 56, 5: 60, 6: 52, 7: 56, 8: 60, 9: 62, 10: 74, 11: 88, 12: 60, 13: 44, 14: 38, 15: 44}
# pedal changes (beats) in each film bar; the pedal is held from the last change of bar 14 to the end
PED = {1: [0, 2], 2: [0, 2], 3: [0, 2], 4: [0, 2], 5: [0], 6: [0, 2], 7: [0, 2], 8: [0, 2],
       9: [0, 1, 2, 3], 10: [0, 1, 2, 3], 11: [0], 12: [0], 13: [0], 14: [0], 15: []}
changes = sorted(T(f, b) for f, bs in PED.items() for b in bs) + [LEN + 10]

def piano_time(f, beat):
    t = T(f, beat)
    if f == 1:  # first note at 0.30 s, the first bar eased so that bar 2 is on the grid
        t = 0.30 + beat * (BAR - 0.30) / 4.0
    return t

piano = []  # (on, off, key, vel)
for f, ab in PLAN.items():
    for (o, d, k, voice) in NOTES[ab]:
        on = piano_time(f, o)
        end_nom = T(f, min(o + d, 4.0))  # ties out of a bar end at its bar line
        # held by the pedal until the next change at or after the written end (and after the onset)
        cp = next(c for c in changes if c >= end_nom - 1e-6 and c > T(f, o) + 1e-6)
        off = cp + 0.03 if cp < LEN else LEN
        v = PV[f]
        if f in (9, 10):  # the rising B7: a crescendo beat by beat
            v = 62 + int(((f - 9) * 4 + o) * 2.0)
        if d >= 0.99 and voice == 1: v += 8          # the singing notes of the right hand a little forward
        if abs(o - round(o)) < 1e-3 and voice == 2 and k < 60: v += 3  # bass on the beat
        if f == 1 and o == 0: v += 4
        hum = rng.normal(0, 0.004) if o > 0 else rng.normal(0, 0.002)
        if f == 15: hum = 0
        piano.append((max(0.0, on + hum), off, k, int(max(20, min(110, v)))))

# ---- the chamber group (arranged here; the piano part above is Debussy's)
parts = {n: [] for n in ['pad', 'vln', 'vc', 'cb', 'pizz', 'harp', 'fl', 'cl']}
def add(part, f, beat, dur, keys, vel, roll=0.0):
    keys = [keys] if isinstance(keys, int) else keys
    for i, k in enumerate(keys):
        parts[part].append((T(f, beat) + i * roll, T(f, beat + dur), k, vel))
N = {}  # note names
for o in range(0, 8):
    for nm, pc in [('C', 0), ('C#', 1), ('D', 2), ('D#', 3), ('E', 4), ('F', 5), ('F#', 6), ('G', 7), ('G#', 8), ('A', 9), ('A#', 10), ('B', 11)]:
        N[nm + str(o)] = 12 * (o + 1) + pc
def K(s): return [N[x] for x in s.split()]

# bars 3-4: the strings steal in under the piano (slow strings, cello an octave under Debussy's bass)
add('vc', 3, 0, 2, N['F#2'], 46); add('vc', 3, 2, 2, N['E2'], 48)
add('vc', 4, 0, 2, N['D#2'], 50); add('vc', 4, 2, 2, N['C#2'], 52)
add('pad', 3, 0, 2, K('F#3 A3 C#4'), 44); add('pad', 3, 2, 2, K('E3 A3 C#4'), 46)
add('pad', 4, 0, 2, K('F#3 A3 C#4'), 50); add('pad', 4, 2, 2, K('E3 A3 C#4'), 52)
# bar 5: the lift (B9): strings open up, the flute doubles Debussy's A5 and its turn, and resolves to E5
add('vc', 5, 0, 4, N['B1'], 58); add('pad', 5, 0, 4, K('F#3 A3 D#4 F#4'), 58)
add('fl', 5, 1, 2.33, N['A5'], 62); add('fl', 5, 3.33, 0.34, N['G#5'], 60); add('fl', 5, 3.67, 0.33, N['F#5'], 56)
add('fl', 6, 0, 1.5, N['E5'], 50)
# bar 6: E major, the theme in the piano; strings hold the chord
add('vc', 6, 0, 4, N['E2'], 54); add('pad', 6, 0, 4, K('G#3 B3 E4'), 52)
# bars 7-8: the tune sung by the strings an octave above Debussy's melody (bar 7 and bar 10 of the piece), the clarinet
# with it at pitch, the harp rolling the left hand's chords under it
add('vln', 7, 0, 1 / 3, N['G#5'], 72); add('vln', 7, 1 / 3, 1 / 3, N['E5'], 66); add('vln', 7, 2 / 3, 1 / 3, N['G#5'], 70)
add('vln', 7, 1, 2, N['D#5'], 76); add('vln', 7, 3, 1, N['C#5'], 72)
add('cl', 7, 1, 2, N['D#4'], 58); add('cl', 7, 3, 1, N['C#4'], 56)
add('vln', 8, 0, 1 / 3, N['B4'], 70); add('vln', 8, 1 / 3, 1 / 3, N['A4'], 64); add('vln', 8, 2 / 3, 1 / 3, N['B4'], 68)
add('vln', 8, 1, 1.5, N['C#5'], 76); add('vln', 8, 2.5, 0.5, N['E5'], 74); add('vln', 8, 3, 0.5, N['D#5'], 72); add('vln', 8, 3.5, 0.5, N['E5'], 74)
add('cl', 8, 1, 1.5, N['C#4'], 58); add('cl', 8, 2.5, 0.5, N['E4'], 56); add('cl', 8, 3, 0.5, N['D#4'], 54); add('cl', 8, 3.5, 0.5, N['E4'], 56)
add('vc', 7, 0, 4, N['E2'], 60); add('vc', 8, 0, 4, N['F#2'], 62)
add('pad', 7, 0, 2, K('E3 G#3 C#4'), 54); add('pad', 7, 2, 2, K('E3 G#3 B3'), 54)
add('pad', 8, 0, 4, K('E3 A3 C#4'), 56)
add('harp', 7, 0, 2, K('E2 B2 G#3 C#4 E4'), 64, roll=0.035); add('harp', 7, 2, 2, K('B2 E3 G#3 B3 E4'), 60, roll=0.035)
add('harp', 8, 0, 2, K('F#2 C#3 A3 C#4 E4'), 66, roll=0.035); add('harp', 8, 2, 2, K('C#3 F#3 A3 C#4 E4'), 62, roll=0.035)
# bars 9-10: the eight cuts. Debussy's bars 35-36 rise through a new chord on every beat over a B pedal; each beat is
# marked by the strings playing that beat's chord, the harp plucking it and a pizzicato bass on the left hand's note.
for i in range(8):
    f, b = 9 + i // 4, i % 4
    ab = PLAN[f]
    rh = sorted({k for (o, d, k, v) in NOTES[ab] if b <= o < b + 1 - 1e-6 and v == 1})
    lh = [k for (o, d, k, v) in NOTES[ab] if abs(o - b) < 1e-6 and v == 2][0]
    vel = 60 + i * 2 + (6 if b == 0 else 0)  # the two downbeats a touch stronger
    add('vln', f, b, 0.9, rh, vel)
    add('harp', f, b, 0.9, [lh] + rh[:3], 54 + i * 1.5, roll=0.018)
    add('pizz', f, b, 0.5, [lh - 12, lh], 64 + i * 1.5)
add('vc', 9, 0, 8, N['B1'], 60)
add('fl', 10, 0, 1, N['A5'], 54); add('fl', 10, 1, 1, N['B5'], 56); add('fl', 10, 2, 1, N['C#6'], 58); add('fl', 10, 3, 1, N['D#6'], 60)
# bar 11: the summit, E major on the downbeat (Debussy's bar 37: F#6 resolving to E6 over G#5 B5, the left hand
# rising from E1); bars 11-12 its release
add('cb', 11, 0, 4, N['E1'], 92); add('vc', 11, 0, 8, N['E2'], 94)
add('pad', 11, 0, 8, K('E3 B3 E4 G#4 B4'), 92)
add('vln', 11, 0, 2, K('F#5 B5'), 98); add('vln', 11, 2, 5, K('E5 G#5'), 86)
add('fl', 11, 0, 2, N['F#6'], 70); add('fl', 11, 2, 2.5, N['E6'], 64)
add('cl', 11, 0, 6, N['G#4'], 66)
add('harp', 11, 0, 4, K('E1 B1 E2 B2 E3 G#3 B3 E4 G#4 B4 E5'), 92, roll=0.03)
add('harp', 12, 0, 4, K('E3 B3 E4 G#4 B4 E5 G#5'), 52, roll=0.05)
for k in list(parts):
    parts[k] = [(on, min(off, T(12, 3.9)), key, v) for (on, off, key, v) in parts[k]]

PRESET = {'pad': 49, 'vln': 48, 'vc': 42, 'cb': 43, 'pizz': 45, 'harp': 46, 'fl': 73, 'cl': 71}
# stem gain (dB) and pan (-1 left .. 1 right)
GAIN = {'piano': 0.0, 'pad': -5.0, 'vln': -3.0, 'vc': -4.0, 'cb': -9.0, 'pizz': -6.0, 'harp': -5.0, 'fl': -8.0, 'cl': -8.0}
PAN = {'piano': 0.0, 'pad': 0.0, 'vln': -0.35, 'vc': 0.35, 'cb': 0.25, 'pizz': 0.2, 'harp': -0.45, 'fl': 0.3, 'cl': 0.15}

def render(notes, preset):
    syn = tinysoundfont.Synth(samplerate=SR)
    sf = syn.sfload(SF)
    for ch in range(16):
        syn.program_select(ch, sf, 0, preset)
    ev = []
    held = [dict() for _ in range(16)]
    # allocate a channel per note so that a key struck again while it still sounds gets its own voice
    busy = [[] for _ in range(16)]
    for (on, off, k, v) in sorted(notes):
        ch = next(c for c in range(16) if all(not (kk == k and e > on) for (kk, e) in busy[c]))
        busy[ch].append((k, off))
        ev.append((int(round(on * SR)), 1, ch, k, v))
        ev.append((int(round(off * SR)), 0, ch, k, 0))
    ev.sort(key=lambda e: (e[0], e[1]))
    out = np.zeros((NS + SR * 4, 2), np.float32)
    pos = 0
    for (s, typ, ch, k, v) in ev + [(NS + SR * 4, -1, 0, 0, 0)]:
        s = min(s, NS + SR * 4)
        if s > pos:
            buf = np.frombuffer(syn.generate(s - pos), dtype=np.float32).reshape(-1, 2)
            out[pos:s] = buf
            pos = s
        if typ == 1: syn.noteon(ch, k, int(v))
        elif typ == 0: syn.noteoff(ch, k)
    return out[:NS].astype(np.float64)

def pan(x, p):
    return x * np.array([min(1.0, 1.0 - p), min(1.0, 1.0 + p)])

def env(points):  # piecewise linear gain (linear amplitude) over time
    t = np.arange(NS) / SR
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)[:, None]

def reverb_ir(rt=2.1, length=2.6, seed=7):
    r = np.random.default_rng(seed)
    n = int(length * SR); t = np.arange(n) / SR
    decay = np.exp(-6.91 * t / rt)
    ir = r.standard_normal((n, 2)) * decay[:, None]
    b, a = butter(1, 5200 / (SR / 2), 'low'); ir = lfilter(b, a, ir, axis=0)   # a darker tail
    b, a = butter(1, 180 / (SR / 2), 'high'); ir = lfilter(b, a, ir, axis=0)
    pre = int(0.022 * SR)
    ir = np.vstack([np.zeros((pre, 2)), ir])
    for d, g in [(0.011, 0.5), (0.017, 0.4), (0.029, 0.33), (0.041, 0.25)]:  # a few early reflections
        i = int(d * SR); ir[i, 0] += g * 4; ir[i + 37, 1] += g * 4
    return ir / np.sqrt((ir ** 2).sum(axis=0)).max()

def main():
    stems = {}
    stems['piano'] = render(piano, 0)
    for k, ns in parts.items():
        stems[k] = render(ns, PRESET[k])
    # the strings fade away in bar 12 so that the piano is alone again at bar 13
    fade12 = env([(0, 1), (T(11) - 0.03, 1), (T(11), 1.35), (T(12), 1.2), (T(12, 0.5), 1.1), (T(12, 2.5), 0.4), (T(12, 3.8), 0.0), (LEN, 0.0)])
    # (and bloom a little at the summit)
    for k in ['pad', 'vln', 'vc', 'cb', 'harp', 'fl', 'cl']:
        stems[k] = stems[k] * fade12
    dry = np.zeros((NS, 2)); send = np.zeros((NS, 2))
    WET = {'piano': 0.30, 'harp': 0.45}
    for k, x in stems.items():
        y = pan(x, PAN[k]) * 10 ** (GAIN[k] / 20)
        dry += y; send += y * WET.get(k, 0.5)
    ir = reverb_ir()
    wet = np.stack([fftconvolve(send[:, 0], ir[:, 0])[:NS], fftconvolve(send[:, 1], ir[:, 1])[:NS]], axis=1)
    mix = dry + wet * 0.42
    # end: silence by 52.0 s
    t = np.arange(NS) / SR
    fo = np.clip((t - 49.6) / (LEN - 0.02 - 49.6), 0, 1)
    mix *= (0.5 + 0.5 * np.cos(np.pi * fo))[:, None]
    mix[t >= LEN - 0.02] = 0
    # loudness to -16 LUFS under a lookahead limiter (ceiling 0.88)
    meter = pyloudnorm.Meter(SR)
    CEIL = 0.88
    y = mix.copy()
    for _ in range(4):
        L = meter.integrated_loudness(y)
        y = y * 10 ** ((-16.0 - L) / 20)
        a = np.abs(y).max(axis=1)
        need = np.minimum(1.0, CEIL / np.maximum(a, 1e-9))
        w = int(0.006 * SR) | 1
        g = uniform_filter1d(minimum_filter1d(need, w), w)
        y = y * g[:, None]
    L = meter.integrated_loudness(y)
    peak = np.abs(y).max()
    os.makedirs(DIR + '/shots/music', exist_ok=True)
    wavfile.write(DIR + '/shots/music/trailer2.wav', SR, np.round(np.clip(y, -1, 1) * 32767).astype(np.int16))
    print(f'integrated {L:.2f} LUFS, sample peak {peak:.3f}, length {len(y) / SR:.3f} s')
    print('bar  start   LUFS(bar)  rms dBFS')
    per = []
    for f in range(1, 16):
        a, b = int(T(f) * SR), int(min(T(f + 1), LEN) * SR)
        seg = y[a:b]
        lb = meter.integrated_loudness(seg) if b - a > SR // 2 else float('nan')
        per.append(round(lb, 1))
        print(f'{f:3d} {T(f):6.2f}  {lb:8.1f}  {20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-12):8.1f}')
    seg = y[int(LEN * SR) - int(0.3 * SR):]
    print('last 0.3 s peak', np.abs(seg).max())
    # onsets of the downbeats that matter (the piano's notes there, relative to the grid)
    worst = 0
    for f in [3, 5, 7, 9, 10, 11, 13, 15]:
        ons = [on for (on, off, k, v) in piano if abs(on - T(f)) < 0.1]
        if ons: worst = max(worst, max(abs(o - T(f)) for o in ons))
    print(f'largest piano deviation at the named downbeats {worst * 1000:.1f} ms')
    hits = {
        'piece': 'Debussy, Premiere Arabesque (L. 66 No. 1), bars 1-7, 10, 35-38, 105-107, arranged for piano and chamber group',
        'bpm': 72, 'beatsPerBar': 4, 'barSeconds': 3.3333, 'length': 52,
        'barLines': [round(T(f), 3) for f in range(1, 17)],
        'sourceBars': {str(f): ab for f, ab in PLAN.items()},
        'firstNote': round(min(p[0] for p in piano), 3),
        'stringsEnter': round(T(3), 3),
        'liftWorldChange': round(T(5), 3),
        'themeInE': round(T(6), 3),
        'fullChamber': round(T(7), 3),
        'cutsOnBeats': [round(T(9 + i // 4, i % 4), 3) for i in range(8)],
        'summit': round(T(11), 3),
        'stringsGoneBy': round(T(12, 3.8), 3),
        'pianoAloneAgain': round(T(13), 3),
        'lastChord': round(T(15), 3),
        'silenceBy': 52,
        'integratedLUFS': round(L, 2), 'samplePeak': round(float(peak), 3),
        'barLUFS': per,
    }
    json.dump(hits, open(DIR + '/shots/music/trailer2_hits.json', 'w'), indent=1)

def verify(midi='/tmp/arab/a.midi'):
    import mido
    m = mido.MidiFile(midi); tpb = m.ticks_per_beat; raw = []
    for tr in m.tracks:
        t = 0; on = {}
        for msg in tr:
            t += msg.time
            if msg.type == 'note_on' and msg.velocity > 0: on.setdefault(msg.note, []).append(t)
            elif msg.type in ('note_off', 'note_on') and on.get(msg.note):
                s = on[msg.note].pop(0); raw.append((s, t - s, msg.note))
    best = {}
    for s, d, n in raw:
        if (s, n) not in best or d > best[(s, n)][1]: best[(s, n)] = (s, d, n)
    def rb(q):
        if q < 372: return int(q // 4) + 1, q % 4
        if q < 374: return 94, q - 372
        return int((q + 2) // 4) + 1, (q + 2) % 4
    src = {}
    for s, d, n in best.values():
        b, o = rb(s / tpb); src.setdefault(b, set()).add((round(o, 3), round(d / tpb, 3), n))
    ok = True
    for f, ab in PLAN.items():
        mine = {(round(o, 3), round(d, 3), k) for (o, d, k, v) in NOTES[ab]}
        same = mine == src[ab]
        ok &= same
        print(f'film bar {f:2d} = Arabesque bar {ab:3d}: {len(mine):2d} notes, source {len(src[ab]):2d}, identical {same}')
    print('all identical' if ok else 'MISMATCH')

if __name__ == '__main__':
    if '--verify' in sys.argv: verify()
    else: main()
