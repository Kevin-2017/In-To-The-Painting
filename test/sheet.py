# contact sheet: python3 test/sheet.py out.png cols cellw name_0.png name_1.png ...
import sys
from PIL import Image
out, cols, cw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ims = [Image.open(p).convert('RGB') for p in sys.argv[4:]]
ch = int(ims[0].size[1] * cw / ims[0].size[0])
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cw + (cols - 1) * 4, rows * ch + (rows - 1) * 4), (16, 16, 16))
for i, im in enumerate(ims):
    sheet.paste(im.resize((cw, ch), Image.LANCZOS), ((i % cols) * (cw + 4), (i // cols) * (ch + 4)))
sheet.save(out)
