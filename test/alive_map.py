# top down plan of one world for the living world agent: land, water, colliders, easels, strings of light, birds
# python3 test/alive_map.py in.json out.png     north (minus z) is up, x grows to the right
import sys, json
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1]))
n, x0, z0, span = d['n'], d['x0'], d['z0'], d['span']
S = int(d.get('px', 1000))
k = S / span
hs, wy = d['h'], d['waterY']
im = Image.new('RGB', (n, n))
px = im.load()
lo, hi = min(hs), max(hs)
for j in range(n):
    for i in range(n):
        h = hs[j * n + i]
        if wy is not None and h < wy - 0.02:
            dep = min(1.0, (wy - h) / 6.0)
            px[i, j] = (int(150 - 60 * dep), int(190 - 50 * dep), int(225 - 25 * dep))
        else:
            t = (h - (wy if wy is not None else lo)) / max(1e-3, hi - (wy if wy is not None else lo))
            t = max(0.0, min(1.0, t)) ** 0.6
            px[i, j] = (int(196 - 70 * t), int(214 - 60 * t), int(160 - 70 * t))
im = im.resize((S, S), Image.BILINEAR)
g = ImageDraw.Draw(im)
P = lambda x, z: ((x - x0) * k, (z - z0) * k)
def circ(x, z, r, **kw):
    a, b = P(x, z); rr = r * k
    g.ellipse([a - rr, b - rr, a + rr, b + rr], **kw)
# contour lines every 4 m, drawn as dots where the height crosses
cx, cz = d['center']
circ(cx, cz, d['radius'], outline=(120, 60, 60))
for c in d['colliders']:
    circ(c[0], c[1], max(c[2], 0.6), fill=(96, 120, 92), outline=(70, 90, 70))
if d.get('deck'):
    for q in d['deck']:
        a, b = P(q[0], q[1]); g.point([a, b], fill=(150, 110, 70))
for i, s in enumerate(d['spots']):
    col = (200, 40, 160) if s.get('hidden') else (220, 30, 30)
    circ(s['x'], s['z'], 2.2, fill=col)
    circ(s['x'], s['z'], 12, outline=col)
    a, b = P(s['x'], s['z']); g.text((a + 6, b - 14), ('H' if s.get('hidden') else 'E') + str(i), fill=(120, 0, 0))
st = d['start']; circ(st['x'], st['z'], 1.8, fill=(30, 30, 30)); a, b = P(st['x'], st['z']); g.text((a + 5, b + 3), 'start', fill=(0, 0, 0))
if d.get('door'):
    a, b = P(d['door']['x'], d['door']['z']); g.rectangle([a - 4, b - 4, a + 4, b + 4], outline=(160, 120, 0), width=2); g.text((a + 6, b + 3), 'door', fill=(110, 80, 0))
cols = {'arc': (240, 170, 0), 'lead': (230, 60, 200), 'loop': (0, 120, 230), 'ring': (250, 110, 20), 'fill': (240, 170, 0)}
for si, s in enumerate(d.get('strings', [])):
    col = cols.get(s['kind'], (240, 170, 0))
    pts = [P(m[0], m[2]) for m in s['m']]
    g.line(pts + ([pts[0]] if s.get('closed') else []), fill=col, width=1)
    for (a, b), m in zip(pts, s['m']):
        g.ellipse([a - 2.5, b - 2.5, a + 2.5, b + 2.5], fill=col, outline=(90, 60, 0))
    a, b = pts[0]; g.text((a + 5, b - 12), 'S%d %s %d' % (si, s['kind'], len(pts)), fill=(90, 50, 0))
for bi, b_ in enumerate(d.get('birds', [])):
    a, b = P(b_['x'], b_['z'])
    g.ellipse([a - 4, b - 4, a + 4, b + 4], fill=(250, 250, 250), outline=(0, 0, 0))
    circ(b_['x'], b_['z'], 9, outline=(60, 60, 60))
    g.text((a + 6, b + 2), 'B%d %s x%d' % (bi, b_['kind'], b_['n']), fill=(0, 0, 60))
# scale bar and frame
g.line([10, S - 12, 10 + 50 * k, S - 12], fill=(0, 0, 0), width=2); g.text((12, S - 26), '50 m', fill=(0, 0, 0))
g.text((8, 6), '%s   x %.0f..%.0f   z %.0f..%.0f' % (d['id'], x0, x0 + span, z0, z0 + span), fill=(0, 0, 0))
im.save(sys.argv[2])
