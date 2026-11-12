#!/usr/bin/env python3
"""The key frame sheet: one row per shot, its key frames side by side, each labelled with the shot, the film frame and second.
  python3 film/tools/keys.py [--src 640x360] [--cell 300] [--out film/out/keys_v1.png]
Key frames are whatever frames of each shot have been rendered at that size (render.mjs --keys), in order."""
import argparse, glob, json, os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

FILM = '/home/claude/monet/film'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='640x360')
    ap.add_argument('--cell', type=int, default=300)
    ap.add_argument('--out', default=FILM + '/out/keys_v1.png')
    ap.add_argument('--only', default=None, help='comma separated frame lists per shot id, e.g. s01_wake:45,150,285')
    a = ap.parse_args()
    B = json.loads(subprocess.run(['node', '-e', "import('%s/board.mjs').then((m) => process.stdout.write(JSON.stringify(m.default)))" % FILM], capture_output=True, text=True, check=True).stdout)
    only = {}
    if a.only:
        for part in a.only.split(';'):
            k, v = part.split(':')
            only[k] = [int(x) for x in v.split(',')]
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import assemble
    import numpy as np
    W0, H0 = (int(v) for v in a.src.split('x'))
    asm = assemble.Assembler(B, a.src, (W0, H0))
    rows = [({'id': 'opening', 'world': 0, 'start': 0, 'len': 92, 'layer': True}, [8, 30, 50])]
    for sh in B['shots']:
        files = sorted(glob.glob('%s/frames/%s/%s/f*.jpg' % (FILM, a.src, sh['id'])))
        ks = [int(re.search(r'f(\d+)\.jpg', f).group(1)) for f in files]
        want = only.get(sh['id']) or sh.get('keys') or [int(u * (sh['len'] - 1) + 0.5) for u in (0.1, 0.5, 0.9)]
        pick = [k for k in want if k in ks]
        rows.append((sh, pick))
    cw, ch = a.cell, a.cell * 9 // 16
    lab = 34
    ncol = max(3, max(len(p) for _, p in rows))
    W = 230 + ncol * (cw + 6)
    H = sum(ch + lab + 8 for _ in rows) + 10
    sheet = Image.new('RGB', (W, H), (24, 24, 28))
    dr = ImageDraw.Draw(sheet)
    f1 = ImageFont.truetype(FONT, 15)
    f2 = ImageFont.truetype(FONT, 12)
    y = 6
    for sh, pick in rows:
        s0, s1 = sh['start'] / 30.0, (sh['start'] + sh['len']) / 30.0
        dr.text((8, y + 6), sh['id'], font=f1, fill=(240, 230, 200))
        dr.text((8, y + 28), 'layers only' if sh.get('layer') else 'world %d' % sh['world'], font=f2, fill=(190, 190, 190))
        dr.text((8, y + 46), 'frames %d to %d' % (sh['start'], sh['start'] + sh['len']), font=f2, fill=(190, 190, 190))
        dr.text((8, y + 64), '%.2f s to %.2f s' % (s0, s1), font=f2, fill=(190, 190, 190))
        dr.text((8, y + 82), 'bar %.2f to %.2f' % (sh['start'] / 100 + 1, (sh['start'] + sh['len']) / 100 + 1), font=f2, fill=(190, 190, 190))
        x = 230
        for k in pick:
            g = sh['start'] + k
            # the frame of the film as it will be: the shot, the dissolve, the originals and the words over it
            img, _ = asm.compose(g)
            im = Image.fromarray((img * 255).astype(np.uint8)).resize((cw, ch), Image.LANCZOS)
            sheet.paste(im, (x, y))
            dr.text((x + 2, y + ch + 3), 'f%d  %.2fs  (shot +%d)' % (g, g / 30.0, k), font=f2, fill=(220, 220, 220))
            x += cw + 6
        y += ch + lab + 8
    sheet.save(a.out)
    print('wrote', a.out, sheet.size)


if __name__ == '__main__':
    main()
