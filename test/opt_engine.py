"""Shared engine for the alternative trailer scores (opt_*.py): piano part from a verified public-domain score,
a chamber group (strings, harp, flute, clarinet, pizzicato) whose chords are taken from the piano's own notes,
GeneralUser GS v2.0.3 through tinysoundfont, room reverb, loudness to -16 LUFS under a peak limiter.
Grid: 72 beats a minute, 4/4, a bar 10/3 s, 52.0 s."""
import json, os, sys
import numpy as np
from scipy.signal import fftconvolve, butter, lfilter
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.io import wavfile
import tinysoundfont, pyloudnorm

DIR = '/home/claude/monet'
SF = sys.argv[sys.argv.index('--sf') + 1] if '--sf' in sys.argv else '/tmp/sf/gu/GeneralUser-GS.sf2'
SR, LEN = 48000, 52.0
NS = int(round(SR * LEN))
BAR = 10.0 / 3.0
BEAT = BAR / 4.0
def T(fbar, beat=0.0): return (fbar - 1) * BAR + beat * BEAT

PRESET = {'piano': 0, 'pad': 49, 'vln': 48, 'vc': 42, 'cb': 43, 'pizz': 45, 'harp': 46, 'fl': 73, 'cl': 71}
GAIN = {'piano': 0.0, 'pad': -5.0, 'vln': -3.0, 'vc': -4.0, 'cb': -9.0, 'pizz': -6.0, 'harp': -5.0, 'fl': -8.0, 'cl': -8.0}
PAN = {'piano': 0.0, 'pad': 0.0, 'vln': -0.35, 'vc': 0.35, 'cb': 0.25, 'pizz': 0.2, 'harp': -0.45, 'fl': 0.3, 'cl': 0.15}

def mido_bars(midi, beats_per_bar_q, voices=(1, 2)):
    """Notes of a LilyPond MIDI file by bar: {bar: [(offset_q, dur_q, key, voice)]}, quarter-note units, duplicates removed."""
    import mido
    m = mido.MidiFile(midi); tpb = m.ticks_per_beat; best = {}
    for ti, tr in enumerate(m.tracks):
        t = 0; on = {}
        for msg in tr:
            t += msg.time
            if msg.type == 'note_on' and msg.velocity > 0: on.setdefault(msg.note, []).append(t)
            elif msg.type in ('note_off', 'note_on') and on.get(msg.note):
                s = on[msg.note].pop(0); d = t - s
                if (s, msg.note) not in best or d > best[(s, msg.note)][1]: best[(s, msg.note)] = (s, d, msg.note, ti)
    bars = {}
    for s, d, n, ti in sorted(best.values()):
        q = s / tpb; b = int(q // beats_per_bar_q + 1e-9) + 1
        bars.setdefault(b, []).append((round(q - (b - 1) * beats_per_bar_q, 4), round(d / tpb, 4), n, ti))
    return bars

def verify(NOTES, PLAN, src_bars):
    ok = True; lines = []
    for f, ab in PLAN.items():
        mine = sorted((round(o, 3), round(d, 3), k) for (o, d, k, v) in NOTES[ab])
        src = sorted((round(o, 3), round(d, 3), k) for (o, d, k, v) in src_bars[ab])
        same = mine == src; ok &= same
        lines.append(f'film bar {f:2d} = bar {ab:3d}: {len(mine):2d} notes, source {len(src):2d}, identical {same}')
    print('\n'.join(lines)); print('all identical' if ok else 'MISMATCH')
    return ok

class Score:
    def __init__(self, seed=1):
        self.piano = []   # (on, off, key, vel, voice, nominal_on, nominal_end)
        self.parts = {k: [] for k in PRESET if k != 'piano'}
        self.rng = np.random.default_rng(seed)

    def lay_piano(self, items, pedal_changes, hum=0.004):
        """items: (on_s, end_s, key, vel, voice); the sustain pedal holds each note to the first change at or after its end."""
        ch = sorted(pedal_changes) + [LEN + 10]
        for (on, end, k, v, voice) in items:
            cp = next(c for c in ch if c >= end - 1e-6 and c > on + 1e-6)
            off = cp + 0.03 if cp < LEN else LEN
            h = 0.0 if hum == 0 else float(self.rng.normal(0, hum))
            self.piano.append((max(0.0, on + h), off, k, int(max(18, min(112, v))), voice, on, end))

    def add(self, part, t0, t1, keys, vel, roll=0.0):
        keys = [keys] if isinstance(keys, (int, np.integer)) else list(keys)
        for i, k in enumerate(keys): self.parts[part].append((t0 + i * roll, t1, int(k), int(max(10, min(120, vel)))))

    def sounding(self, t0, t1):
        """weights of the piano's pitches sounding (as written) in [t0, t1)"""
        w = {}
        for (_, _, k, _, _, on, end) in self.piano:
            ov = min(end, t1) - max(on, t0)
            if ov > 1e-4: w[k] = w.get(k, 0) + ov
        return w

    def chord(self, t0, t1, n=4, lo=55, hi=74):
        w = self.sounding(t0, t1)
        if not w: return None, []
        bass = min(w)
        pcw = {}
        for k, x in w.items(): pcw[k % 12] = pcw.get(k % 12, 0) + x
        pcs = [bass % 12] + [p for p, _ in sorted(pcw.items(), key=lambda z: -z[1]) if p != bass % 12][:n - 1]
        voic = sorted({lo + ((p - lo) % 12) for p in pcs})
        voic = [v if v <= hi else v - 12 for v in voic]
        cel = bass
        while cel > 50: cel -= 12
        while cel < 36: cel += 12
        return cel, sorted(set(voic))

    def strings_bed(self, t0, t1, vel, segs=2, cello=True, pad=True, cvel=None):
        d = (t1 - t0) / segs
        for i in range(segs):
            a, b = t0 + i * d, t0 + (i + 1) * d
            c, v = self.chord(a, b)
            if c is None: continue
            vv = vel(a) if callable(vel) else vel
            if pad: self.add('pad', a, b, v, vv)
            if cello: self.add('vc', a, b, c, (cvel or vv) + 2)

    def melody(self, t0, t1, part, vel, shift=12, mindur=0.2, top=True):
        """double the right hand's top line (notes of voice 1 lasting at least mindur s) between t0 and t1"""
        on = {}
        for (_, _, k, _, voice, n_on, n_end) in self.piano:
            if voice == 1 and t0 - 1e-6 <= n_on < t1 - 1e-6 and n_end - n_on >= mindur:
                if n_on not in on or k > on[n_on][0]: on[n_on] = (k, n_end)
        for t in sorted(on):
            k, e = on[t]
            vv = vel(t) if callable(vel) else vel
            self.add(part, t, min(e, t1 + 0.4), k + shift, vv)

    def cuts(self, times, vbase, vstep):
        """the eight cuts: a plucked chord on each beat (harp), a pizzicato bass, and the strings' chord, from the piano's
        notes sounding at that beat"""
        for i, t in enumerate(times):
            c, v = self.chord(t, t + BEAT * 0.6)
            vel = vbase + vstep * i
            self.add('harp', t, t + BEAT * 0.9, [c + 12] + v[:3], vel - 4, roll=0.018)
            self.add('pizz', t, t + BEAT * 0.5, [c, c + 12], vel)
            self.add('vln', t, t + BEAT * 0.9, [x + 12 for x in v[-3:]], vel - 6)

    # -------------------------------------------------- rendering
    def render(self, notes, preset):
        syn = tinysoundfont.Synth(samplerate=SR); sf = syn.sfload(SF)
        for ch in range(16): syn.program_select(ch, sf, 0, preset)
        ev = []; busy = [[] for _ in range(16)]
        for (on, off, k, v) in sorted(notes):
            ch = next(c for c in range(16) if all(not (kk == k and e > on) for (kk, e) in busy[c]))
            busy[ch].append((k, off))
            ev.append((int(round(on * SR)), 1, ch, k, v)); ev.append((int(round(off * SR)), 0, ch, k, 0))
        ev.sort(key=lambda e: (e[0], e[1]))
        tot = NS + SR * 4; out = np.zeros((tot, 2), np.float32); pos = 0
        for (s, typ, ch, k, v) in ev + [(tot, -1, 0, 0, 0)]:
            s = min(s, tot)
            if s > pos:
                out[pos:s] = np.frombuffer(syn.generate(s - pos), dtype=np.float32).reshape(-1, 2); pos = s
            if typ == 1: syn.noteon(ch, k, int(v))
            elif typ == 0: syn.noteoff(ch, k)
        return out[:NS].astype(np.float64)

    def mix_and_write(self, name, chamber_env, hits, fade_from=49.6):
        t = np.arange(NS) / SR
        stems = {'piano': self.render([(a, b, k, v) for (a, b, k, v, *_r) in self.piano], 0)}
        for k, ns in self.parts.items():
            if ns: stems[k] = self.render(ns, PRESET[k])
        envc = np.interp(t, *zip(*chamber_env))[:, None]
        dry = np.zeros((NS, 2)); send = np.zeros((NS, 2))
        for k, x in stems.items():
            if k != 'piano': x = x * envc
            y = x * np.array([min(1, 1 - PAN[k]), min(1, 1 + PAN[k])]) * 10 ** (GAIN[k] / 20)
            dry += y; send += y * {'piano': 0.30, 'harp': 0.45}.get(k, 0.5)
        ir = reverb_ir()
        wet = np.stack([fftconvolve(send[:, i], ir[:, i])[:NS] for i in (0, 1)], axis=1)
        mix = dry + wet * 0.42
        fo = np.clip((t - fade_from) / (LEN - 0.02 - fade_from), 0, 1)
        mix *= (0.5 + 0.5 * np.cos(np.pi * fo))[:, None]; mix[t >= LEN - 0.02] = 0
        meter = pyloudnorm.Meter(SR); y = mix
        for _ in range(4):
            y = y * 10 ** ((-16.0 - meter.integrated_loudness(y)) / 20)
            need = np.minimum(1.0, 0.88 / np.maximum(np.abs(y).max(axis=1), 1e-9))
            w = int(0.006 * SR) | 1
            y = y * uniform_filter1d(minimum_filter1d(need, w), w)[:, None]
        L = meter.integrated_loudness(y); peak = float(np.abs(y).max())
        wavfile.write(f'{DIR}/shots/music/opt_{name}.wav', SR, np.round(np.clip(y, -1, 1) * 32767).astype(np.int16))
        per = []
        for f in range(1, 16):
            a, b = int(T(f) * SR), int(min(T(f + 1), LEN) * SR)
            per.append(round(meter.integrated_loudness(y[a:b]), 1))
        # measured onsets (rise of 20 ms energy, 10 ms hop) near each hit point
        m = y.mean(axis=1); h = int(0.01 * SR)
        e = np.sqrt(uniform_filter1d(m ** 2, 2 * h)[::h] + 1e-12); db = 20 * np.log10(e)
        flux = np.maximum(0, db[2:] - db[:-2]); tt = np.arange(len(flux)) * 0.01 + 0.01
        pk = [i for i in range(1, len(flux) - 1) if flux[i] >= flux[i - 1] and flux[i] > flux[i + 1] and flux[i] > 1.5]
        ptimes = tt[pk]
        for hgt in hits['events']:
            j = np.argmin(np.abs(ptimes - hgt['time'])) if len(ptimes) else None
            hgt['measuredOnset'] = round(float(ptimes[j]), 3) if j is not None else None
        hits.update({'length': 52, 'bpm': 72, 'barSeconds': 3.3333, 'barLines': [round(T(f), 3) for f in range(1, 17)],
                     'integratedLUFS': round(L, 2), 'samplePeak': round(peak, 3), 'barLUFS': per,
                     'firstNote': round(min(p[0] for p in self.piano), 3)})
        json.dump(hits, open(f'{DIR}/shots/music/opt_{name}.json', 'w'), indent=1, ensure_ascii=False)
        print(f'{name}: {L:.2f} LUFS, peak {peak:.3f}, first note {hits["firstNote"]} s, last 0.3 s peak {np.abs(y[-int(0.3 * SR):]).max():.4f}')
        print('bar LUFS', per)
        for hgt in hits['events']:
            print(f"  {hgt['time']:6.2f}  {hgt['event'][:38]:38s} {hgt['bar']:>12s}  onset {hgt['measuredOnset']}")
        return L, peak

def reverb_ir(rt=2.1, length=2.6, seed=7):
    r = np.random.default_rng(seed); n = int(length * SR); t = np.arange(n) / SR
    ir = r.standard_normal((n, 2)) * np.exp(-6.91 * t / rt)[:, None]
    b, a = butter(1, 5200 / (SR / 2), 'low'); ir = lfilter(b, a, ir, axis=0)
    b, a = butter(1, 180 / (SR / 2), 'high'); ir = lfilter(b, a, ir, axis=0)
    ir = np.vstack([np.zeros((int(0.022 * SR), 2)), ir])
    for d, g in [(0.011, 0.5), (0.017, 0.4), (0.029, 0.33), (0.041, 0.25)]:
        i = int(d * SR); ir[i, 0] += g * 4; ir[i + 37, 1] += g * 4
    return ir / np.sqrt((ir ** 2).sum(axis=0)).max()

EVENTS = [(0.0, 'Impression, Sunrise, still'), (3.333, 'she flies in over the harbour'), (6.667, 'CUT chalk cliffs'),
          (10.0, 'CUT arch at Etretat'), (13.333, 'the world repaints itself'), (17.167, 'CUT Seine, sailboats'),
          (20.0, 'CUT poppy field (bloom)'), (22.5, 'CUT Woman with a Parasol'), (25.0, 'white flash, two prints')] + \
         [(26.667 + i * 0.8333, f'haystack cut {i + 1}') for i in range(8)] + \
         [(33.333, 'summit: starlings'), (36.667, 'calm, water garden'), (40.0, 'night on the pond, piano alone'),
          (43.0, 'pictures hang into a wall'), (46.667, 'title on the last chord')]

def ensure_midi(composer_dir, lyfile, out_dir):
    """the source MIDI, rebuilt from the Mutopia Project's LilyPond file if it is not in /tmp"""
    import subprocess, glob
    midi = os.path.join(out_dir, 'src.midi')
    if os.path.exists(midi): return midi
    os.makedirs(out_dir, exist_ok=True)
    repo = '/tmp/mut/repo'
    if not os.path.exists(repo):
        subprocess.run(['git', 'clone', '--depth', '1', '--filter=blob:none', '--sparse',
                        'https://github.com/MutopiaProject/MutopiaProject.git', repo], check=True)
    subprocess.run(['git', '-C', repo, 'sparse-checkout', 'add', composer_dir], check=True)
    import lilypond
    bindir = os.path.dirname(str(lilypond.executable()))
    src = os.path.join(out_dir, 'src.ly')
    open(src, 'w').write(open(os.path.join(repo, composer_dir, lyfile)).read())
    subprocess.run([os.path.join(bindir, 'convert-ly'), '-e', src], check=True, capture_output=True)
    subprocess.run([os.path.join(bindir, 'lilypond'), '-dno-print-pages', '-o', os.path.join(out_dir, 'src'), src], check=True, capture_output=True)
    return midi
