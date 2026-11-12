#!/usr/bin/env python3
"""The strip: one composited frame of the film every N frames (default 15, half a second), eight to a row (four seconds),
each labelled with its frame, second and bar, and the shot it comes from.
  python3 film/tools/strip.py [--src 640x360] [--every 15] [--cell 320] [--out film/out/strip_v2.png] [--small 1600]"""
import argparse, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import assemble

FILM = '/home/claude/monet/film'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='640x360')
    ap.add_argument('--every', type=int, default=15)
    ap.add_argument('--cols', type=int, default=8)
    ap.add_argument('--cell', type=int, default=320)
    ap.add_argument('--out', default=FILM + '/out/strip_v2.png')
    ap.add_argument('--small', type=int, default=1600)
    a = ap.parse_args()
    B = assemble.board()
    W0, H0 = (int(v) for v in a.src.split('x'))
    asm = assemble.Assembler(B, a.src, (W0, H0))
    frames = list(range(0, B['frames'], a.every))
    cw, ch, lab, gap = a.cell, a.cell * 9 // 16, 18, 4
    rows = (len(frames) + a.cols - 1) // a.cols
    sheet = Image.new('RGB', (a.cols * (cw + gap) + gap, rows * (ch + lab + gap) + gap), (22, 22, 26))
    dr = ImageDraw.Draw(sheet)
    fnt = ImageFont.truetype(FONT, 12)
    for n, f in enumerate(frames):
        img, live = asm.compose(f)
        im = Image.fromarray((img * 255).astype(np.uint8)).resize((cw, ch), Image.LANCZOS)
        x, y = gap + (n % a.cols) * (cw + gap), gap + (n // a.cols) * (ch + lab + gap)
        sheet.paste(im, (x, y))
        bar, beat = f // 100 + 1, (f % 100) // 25 + 1
        dr.text((x + 2, y + ch + 2), 'f%d %.1fs b%d.%d %s' % (f, f / 30.0, bar, beat, '+'.join(s.split('_')[0] for s in live)), font=fnt, fill=(215, 215, 215))
    sheet.save(a.out)
    s = min(1.0, a.small / sheet.size[0])
    small = a.out.replace('.png', '_s.png')
    sheet.resize((int(sheet.size[0] * s), int(sheet.size[1] * s)), Image.LANCZOS).save(small)
    print('wrote', a.out, sheet.size, small)


if __name__ == '__main__':
    main()
