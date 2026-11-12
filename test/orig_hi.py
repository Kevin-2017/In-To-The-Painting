# Stitch tiles orig/hiraw/<id>_t*.png (top to bottom, same x region) into
# orig/hiraw/<id>.png, then crop to match orig/final/<id>.jpg and save orig/hi/<id>.jpg
import sys, glob, json, os, re
import numpy as np, cv2
R = '/home/claude/monet/orig/'

def group(files):
    # tiles of one scroll position, named ..._x<X>_y<Y>.png with viewport coordinates
    import re
    ims = []
    for f in files:
        m = re.search(r'_x(\d+)_y(\d+)\.png$', f)
        ims.append((int(m.group(1)), int(m.group(2)), cv2.imread(f)))
    x0 = min(a for a, _, _ in ims); y0 = min(b for _, b, _ in ims)
    W = max(a + im.shape[1] for a, _, im in ims) - x0
    H = max(b + im.shape[0] for _, b, im in ims) - y0
    can = np.zeros((H, W, 3), np.uint8)
    for a, b, im in ims:
        can[b - y0:b - y0 + im.shape[0], a - x0:a - x0 + im.shape[1]] = im
    return can

def stitch(i):
    if i in HORIZ:
        # tiles go left to right: stitch the transposed tiles
        tiles = sorted(glob.glob(R + 'hiraw/%s_t*.png' % i))
        tmp = []
        for t in tiles:
            q = t.replace('hiraw/', 'hiraw/T_'); tmp.append(q)
            cv2.imwrite(q, cv2.transpose(cv2.imread(t)))
        HORIZ.discard(i)
        acc = stitch('T_' + i)
        for q in tmp: os.remove(q)
        os.remove(R + 'hiraw/T_%s.png' % i)
        acc = cv2.transpose(acc)
        cv2.imwrite(R + 'hiraw/%s.png' % i, acc)
        return acc
    gs = sorted(set(re.sub(r'_x\d+_y\d+\.png$', '', f) for f in glob.glob(R + 'hiraw/%s_g*_x*_y*.png' % i)))
    if gs:
        acc = group(glob.glob(gs[0] + '_x*'))
        for g in gs[1:]:
            b = group(glob.glob(g + '_x*'))
            x0, x1 = int(acc.shape[1] * .1), int(acc.shape[1] * .9)
            tpl = b[:40, x0:x1]
            res = cv2.matchTemplate(acc[:, x0:x1], tpl, cv2.TM_SQDIFF)
            mn, _, loc, _ = cv2.minMaxLoc(res)
            y = loc[1]; ov = acc.shape[0] - y
            print('  %s at y=%d overlapMAD=%.2f' % (os.path.basename(g), y, np.abs(acc[y:].astype(int) - b[:ov].astype(int)).mean()))
            acc = np.vstack([acc[:y], b])
        cv2.imwrite(R + 'hiraw/%s.png' % i, acc)
        return acc
    tiles = sorted(glob.glob(R + 'hiraw/%s_t*.png' % i))
    if not tiles:
        return cv2.imread(R + 'hiraw/%s.png' % i)
    def cols(im):
        return im
    acc = cols(cv2.imread(tiles[0]))
    for t in tiles[1:]:
        b = cols(cv2.imread(t))
        if abs(b.shape[1] - acc.shape[1]) > 6:
            raise SystemExit('width mismatch ' + t)
        w = min(b.shape[1], acc.shape[1]); acc = acc[:, :w]; b = b[:, :w]
        th = min(40, b.shape[0])
        # match the top strip of b (painting columns only) inside acc
        x0, x1 = int(acc.shape[1] * .1), int(acc.shape[1] * .9)
        tpl = b[:th, x0:x1]
        res = cv2.matchTemplate(acc[:, x0:x1], tpl, cv2.TM_SQDIFF)
        mn, _, loc, _ = cv2.minMaxLoc(res)
        y = loc[1]
        mad = mn / tpl.size
        ov = acc.shape[0] - y
        d = np.abs(acc[y:].astype(int) - b[:ov].astype(int)).mean()
        print('  %s at y=%d overlap=%d msd=%.1f overlapMAD=%.2f' % (os.path.basename(t), y, ov, mad, d))
        acc = np.vstack([acc[:y], b])
    cv2.imwrite(R + 'hiraw/%s.png' % i, acc)
    return acc

def box(img):
    m = (img.max(axis=2) > 40)
    rows = np.where(m.mean(axis=1) > .5)[0]
    cols = np.where(m.mean(axis=0) > .5)[0]
    return rows[0], rows[-1] + 1, cols[0], cols[-1] + 1

def crop(i, img):
    F = cv2.imread(R + 'final/%s.jpg' % i)
    fh, fw = F.shape[:2]
    y0, y1, x0, x1 = box(img)
    B = img[y0:y1, x0:x1]
    bh, bw = B.shape[:2]
    best = None
    smax = min(bw / fw, bh / fh)
    for s in np.linspace(smax * .80, smax, 161):
        W, H = int(round(bw / s)), int(round(bh / s))
        if W < fw or H < fh: continue
        Bs = cv2.resize(B, (W, H), interpolation=cv2.INTER_AREA)
        res = cv2.matchTemplate(Bs, F, cv2.TM_SQDIFF)
        mn, _, loc, _ = cv2.minMaxLoc(res)
        if best is None or mn < best[0]: best = (mn, s, loc)
    _, s, (ox, oy) = best
    cx, cy = int(round(ox * s)), int(round(oy * s))
    cw, ch = int(round(fw * s)), int(round(fh * s))
    cw = min(cw, bw - cx); ch = min(ch, bh - cy)
    C = B[cy:cy + ch, cx:cx + cw]
    small = cv2.resize(C, (fw, fh), interpolation=cv2.INTER_AREA)
    mad = np.abs(small.astype(int) - F.astype(int)).mean()
    bl = lambda x: cv2.GaussianBlur(x, (0, 0), 2).astype(int)
    bmad = np.abs(bl(small) - bl(F)).mean()
    ar = (cw / ch) / (fw / fh) - 1
    cv2.imwrite(R + 'hi/%s.jpg' % i, C, [cv2.IMWRITE_JPEG_QUALITY, 88])
    print('%s box=%dx%d crop=%dx%d at (%d,%d) scale=%.3f MAD=%.2f blurMAD=%.2f aspect=%+.2f%%' % (i, bw, bh, cw, ch, cx, cy, s, mad, bmad, ar * 100))
    mp = R + 'hi/meta.json'
    meta = json.load(open(mp)) if os.path.exists(mp) else {}
    meta[i] = [cw, ch]
    json.dump(dict(sorted(meta.items())), open(mp, 'w'))
    return mad

HORIZ = set(a[1:] for a in sys.argv[1:] if a[0] == '=')
for i in [a.lstrip('=') for a in sys.argv[1:]]:
    crop(i, stitch(i))
