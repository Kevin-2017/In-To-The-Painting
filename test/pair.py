# pairs a still of the game with the original it answers to: python3 test/pair.py out.png shot1:orig1 shot2:orig2 ...
import sys
from PIL import Image
out = sys.argv[1]; pairs = [a.split(':') for a in sys.argv[2:]]
cw, ch = 620, 414
sheet = Image.new('RGB', (cw * 2 + 6, (ch + 6) * len(pairs)), (30, 30, 30))
for i, (shot, orig) in enumerate(pairs):
    a = Image.open('/home/claude/monet/shots/%s.png' % shot).convert('RGB')
    W, H = a.size; fh = H * 0.86; fw = fh * 1.5
    a = a.crop((int((W - fw) / 2), int((H - fh) / 2), int((W + fw) / 2), int((H + fh) / 2))).resize((cw, ch), Image.LANCZOS)
    sheet.paste(a, (0, i * (ch + 6)))
    if orig:
        o = Image.open('/home/claude/monet/orig/final/%s.jpg' % orig).convert('RGB'); o.thumbnail((cw, ch), Image.LANCZOS)
        sheet.paste(o, (cw + 6 + (cw - o.size[0]) // 2, i * (ch + 6) + (ch - o.size[1]) // 2))
sheet.save(out); print(sheet.size)
