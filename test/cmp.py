#!/usr/bin/env python3
# compares two sets of stills the way an eye across the room would: python3 test/cmp.py <prefixA> <prefixB> [limit]
# (files shots/<prefixA><id>.png against shots/<prefixB><id>.png; both are shrunk to 64 x 36 first, so the order in which
# overlapping strokes happen to be laid does not count, only what the picture looks like)
import sys, glob, os
from PIL import Image
import numpy as np
a, b = sys.argv[1], sys.argv[2]
limit = float(sys.argv[3]) if len(sys.argv) > 3 else 4.5
d = '/home/claude/monet/shots/'
bad = 0
for fa in sorted(glob.glob(d + a + '*.png') + glob.glob(d + a + '*.jpg')):
    k = os.path.basename(fa)[len(a):]
    fb = d + b + k
    if not os.path.exists(fb):
        print(k, 'missing in', b); bad += 1; continue
    A = np.asarray(Image.open(fa).convert('RGB').resize((64, 36), Image.BOX)).astype(float)
    B = np.asarray(Image.open(fb).convert('RGB').resize((64, 36), Image.BOX)).astype(float)
    D = np.abs(A - B).mean(axis=2)
    worst = np.unravel_index(D.argmax(), D.shape)
    ok = D.mean() <= limit and D.max() <= limit * 14
    bad += 0 if ok else 1
    print('%-14s mean %5.2f  worst cell %5.1f at (x %d%%, y %d%%)  %s' % (k, D.mean(), D.max(), worst[1] * 100 // 64, worst[0] * 100 // 36, 'ok' if ok else 'DIFFERS'))
print('differ:', bad)
sys.exit(1 if bad else 0)
