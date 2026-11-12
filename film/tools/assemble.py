#!/usr/bin/env python3
"""The assembler: lays the rendered shots end to end (cuts and dissolves), puts the layers over them (the original paintings,
the words, the wall of her pictures, the title) and the music under them, and writes an H.264 film with ffmpeg.

  python3 film/tools/assemble.py [--src 640x360] [--size 640x360] [--fps 30] [--from F] [--to F] [--out film/out/x.mp4]
                                 [--stills F,F,...] [--silent]

--src   which rendered frames to use (film/frames/<src>/<shot>/f<k>.jpg); a missing frame takes the nearest one rendered
--fps   15 for an animatic (every other frame of the film's 30)
--stills writes single composited frames (film/out/still_<F>.png) instead of a film
Frames are numbers of the film at 30 a second throughout.
"""
import argparse, json, os, subprocess, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = '/home/claude/monet'
FILM = ROOT + '/film'
FFMPEG = '/usr/local/bin/ffmpeg'
SERIF_SC = ('/usr/share/fonts/opentype/noto/NotoSerifCJK-Light.ttc', 2)
SERIF_SC_REG = ('/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc', 2)
LATIN_IT = '/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyrepagella-italic.otf'
LATIN = '/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyrepagella-regular.otf'
LATIN_BOLD = '/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyrepagella-bold.otf'
PAINTINGS = ['c1', 'c2', 'c3', 'c4', 'c5', 'a1', 'a2', 'a3', 'a4', 'a5', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']


def board():
    out = subprocess.run(['node', '-e', "import('%s/board.mjs').then((m) => process.stdout.write(JSON.stringify(m.default)))" % FILM], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def sstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a))) if b != a else (1.0 if x >= b else 0.0)
    return t * t * (3 - 2 * t)


def envelope(L, f):
    """how much of a layer is there at film frame f: in over fadeIn, out over fadeOut, up to peak"""
    a, b = L['from'], L['to']
    if f < a or f >= b:
        return 0.0
    fi, fo = L.get('fadeIn', L.get('fade', 0)), L.get('fadeOut', L.get('fade', 0))
    k = 1.0
    if fi > 0:
        k = min(k, sstep(a, a + fi, f))
    if fo > 0:
        k = min(k, 1 - sstep(b - fo, b, f))
    return k * L.get('peak', 1.0)


class Assembler:
    def __init__(self, B, src, size):
        self.B = B
        self.src = src
        self.W, self.H = size
        self.cache = {}
        self.font_cache = {}

    # ---- the rendered shots ----
    def shot_frame(self, sh, k):
        d = '%s/frames/%s/%s' % (FILM, self.src, sh['id'])
        for dk in [0, -1, 1, -2, 2, -3, 3, -4, 4]:
            p = '%s/f%05d.jpg' % (d, k + dk)
            if os.path.exists(p):
                im = Image.open(p).convert('RGB')
                if im.size != (self.W, self.H):
                    im = im.resize((self.W, self.H), Image.LANCZOS)
                return np.asarray(im, dtype=np.float32) / 255.0
        return None

    def base(self, f):
        live = [sh for sh in self.B['shots'] if sh['start'] <= f < sh['start'] + sh['len']]
        live.sort(key=lambda s: s['start'])
        img = np.zeros((self.H, self.W, 3), np.float32)
        if not live:
            return img, []
        a = self.shot_frame(live[0], f - live[0]['start'])
        if a is not None:
            img = a
        if len(live) > 1:
            b_sh = live[1]
            b = self.shot_frame(b_sh, f - b_sh['start'])
            end_a = live[0]['start'] + live[0]['len']
            k = (f - b_sh['start'] + 0.5) / max(1, end_a - b_sh['start'])
            k = k * k * (3 - 2 * k)
            if b is not None:
                img = img * (1 - k) + b * k
        return img, [s['id'] for s in live]

    # ---- pictures ----
    def frame_box(self):
        """the 3:2 picture that an easel composes, at the full height of the film"""
        h = self.H
        w = int(round(h * 1.5))
        return ((self.W - w) // 2, 0, w, h)

    def picture(self, src, fit, box):
        key = (src, fit, box)
        if key in self.cache:
            return self.cache[key]
        im = Image.open(src if src.startswith('/') else ROOT + '/' + src).convert('RGB')
        x, y, w, h = box
        iw, ih = im.size
        if fit == 'cover':
            s = max(w / iw, h / ih)
        else:
            s = min(w / iw, h / ih)
        nw, nh = int(round(iw * s)), int(round(ih * s))
        im = im.resize((nw, nh), Image.LANCZOS)
        canvas = np.zeros((self.H, self.W, 3), np.float32)
        mask = np.zeros((self.H, self.W), np.float32)
        ox, oy = x + (w - nw) // 2, y + (h - nh) // 2
        sx0, sy0 = max(0, -ox), max(0, -oy)
        dx0, dy0 = max(0, ox), max(0, oy)
        cw, chh = min(nw - sx0, self.W - dx0), min(nh - sy0, self.H - dy0)
        arr = np.asarray(im, dtype=np.float32) / 255.0
        canvas[dy0:dy0 + chh, dx0:dx0 + cw] = arr[sy0:sy0 + chh, sx0:sx0 + cw]
        mask[dy0:dy0 + chh, dx0:dx0 + cw] = 1.0
        self.cache[key] = (canvas, mask, (ox, oy, nw, nh))
        return self.cache[key]

    def layer_image(self, img, L, f):
        k = envelope(L, f)
        if k <= 0:
            return img
        box = self.frame_box() if L.get('fit', 'frame').startswith('frame') else (0, 0, self.W, self.H)
        fit = 'cover' if L.get('fit', 'frame') in ('frame', 'frame-cover', 'cover') else 'contain'
        pic, mask, (ox, oy, nw, nh) = self.picture(L['src'], fit, box)
        zm = L.get('zoom')
        if zm:
            # held close on a point of the picture (the sun), drawing back to the whole of it; that point stays where it lies in the whole
            z = 1 + (zm['s0'] - 1) * (1 - sstep(zm['from'], zm['to'], f))
            if z > 1.001:
                ax, ay = ox + zm['cx'] * nw, oy + zm['cy'] * nh
                bw, bh = nw * z, nh * z
                box2 = (int(round(ax - zm['cx'] * bw)), int(round(ay - zm['cy'] * bh)), int(round(bw)), int(round(bh)))
                pic, mask, (ox, oy, nw, nh) = self.picture(L['src'], 'contain', box2)
                del self.cache[(L['src'], 'contain', box2)]
        m = mask.copy()
        if L.get('feather'):
            key = ('feather', L['src'], fit, box, L['feather'])
            if key not in self.cache:
                r = L['feather'] * nw
                inner = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(int(r) // 2 * 2 + 1)) if r >= 3 else Image.fromarray((mask * 255).astype(np.uint8))
                self.cache[key] = np.asarray(inner.filter(ImageFilter.GaussianBlur(r / 2)), dtype=np.float32) / 255.0 * mask
            m = self.cache[key].copy()
        rv = L.get('reveal')
        if rv:
            # a disc of the picture that opens from a point of it (the sun) until it holds all of it
            # first only the disc of r0 (a part of the picture's width) for a while, then it opens with a slow start
            h0, h1 = rv.get('hold', [rv['from'], rv['from']])
            r0 = rv.get('r0', 0.0) * nw * sstep(h0, h0 + 8, f)
            u = sstep(h1, rv['to'], f) ** 1.6
            cx, cy = ox + rv['cx'] * nw, oy + rv['cy'] * nh
            R = r0 + max(nw, nh) * 1.7 * u + 1
            yy, xx = np.ogrid[:self.H, :self.W]
            d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
            soft = max(3.0 * self.H / 360.0, R * 0.35)
            m = m * np.clip((R - d) / soft, 0, 1)
            if f < rv['from']:
                m = m * 0
        if L.get('under', 'black') == 'black':
            if L.get('sides'):
                # the dark beside the picture opens into the world on its own, before the picture lets go
                ks = k * (1 - sstep(L['sides'][0], L['sides'][1], f))
                a = (m * k + (1 - m) * ks)[..., None]
                return img * (1 - a) + pic * (m * k)[..., None]
            comp = pic * m[..., None]   # what is not the picture is dark
            return img * (1 - k) + comp * k
        return img * (1 - k * m[..., None]) + pic * (k * m[..., None])

    # ---- words ----
    def font(self, spec, size):
        key = (spec, size)
        if key not in self.font_cache:
            if isinstance(spec, tuple):
                self.font_cache[key] = ImageFont.truetype(spec[0], size, index=spec[1])
            else:
                self.font_cache[key] = ImageFont.truetype(spec, size)
        return self.font_cache[key]

    def spaced(self, draw, xy, text, font, fill, spacing):
        """text with letter spacing, centred on xy[0]"""
        widths = [draw.textlength(ch, font=font) for ch in text]
        total = sum(widths) + spacing * (len(text) - 1)
        x = xy[0] - total / 2
        for ch, w in zip(text, widths):
            draw.text((x, xy[1]), ch, font=font, fill=fill)
            x += w + spacing
        return total

    def words(self, L):
        key = ('words', json.dumps(L, sort_keys=True))
        if key in self.cache:
            return self.cache[key]
        W, H, u = self.W, self.H, self.H / 1080.0
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        dr = ImageDraw.Draw(im)
        if L['type'] == 'title':
            # English leads: the name in spaced capitals with weight and air, the Chinese name small under it, then one line
            en = self.font(LATIN_BOLD, int(112 * u))
            y0 = H * L.get('y', 0.36)
            self.spaced(dr, (W / 2, y0), L['en'], en, (250, 244, 230, 255), 26 * u)
            if L.get('zh'):
                self.spaced(dr, (W / 2, y0 + 160 * u), L['zh'], self.font(SERIF_SC_REG, int(56 * u)), (244, 238, 224, 240), 18 * u)
            if L.get('sub'):
                self.spaced(dr, (W / 2, y0 + (262 if L.get('zh') else 172) * u), L['sub'], self.font(LATIN_IT, int(56 * u)), (242, 234, 216, 240), 2 * u)
        else:
            pos = L.get('pos', 'low')
            zs, es = (66, 46) if pos != 'address' else (44, 40)
            y0 = H * L.get('y', 0.70 if pos == 'low' else 0.835 if pos == 'catch' else 0.752 if pos == 'notch' else 0.86)
            if L.get('zh'):
                self.spaced(dr, (W / 2, y0), L['zh'], self.font(SERIF_SC_REG, int(zs * u)), (252, 248, 238, 255), 10 * u)
            if L.get('en') and not L.get('zh') and pos != 'address':  # (low and catch)
                # an English line alone is the main line: larger, upright
                self.spaced(dr, (W / 2, y0 + 20 * u), L['en'], self.font(LATIN, int(L.get('size', 64) * u)), (252, 248, 238, 255), 2 * u)
            elif L.get('en'):
                self.spaced(dr, (W / 2, y0 + (zs + 30) * u if L.get('zh') else y0), L['en'], self.font(LATIN_IT if pos != 'address' else LATIN, int(es * u)), (246, 240, 226, 240), 1.5 * u if pos != 'address' else 6 * u)
        # a soft dark breath behind the letters so that they hold on sky and on snow alike
        a = np.asarray(im, dtype=np.float32) / 255.0
        sh = Image.fromarray((a[..., 3] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10 * u))
        sh = np.asarray(sh, dtype=np.float32) / 255.0 * 0.75
        if L.get('plate'):
            # where the picture behind is restless (the moon's road): a soft dark plate under the whole line
            ys, xs = np.where(a[..., 3] > 0.05)
            if len(ys):
                pl = self.rr_mask((xs.min() - 60 * u, ys.min() - 22 * u, xs.max() + 60 * u, ys.max() + 22 * u), 40 * u)
                sh = np.clip(sh + self.blur(pl, 26 * u) * L['plate'], 0, 0.92)
        self.cache[key] = (a[..., :3], a[..., 3], sh)
        return self.cache[key]

    def layer_words(self, img, L, f):
        k = envelope(L, f)
        if k <= 0:
            return img
        rgb, al, sh = self.words(L)
        img = img * (1 - (sh * k)[..., None])
        return img * (1 - (al * k)[..., None]) + rgb * (al * k)[..., None]

    # ---- the wall of her pictures ----
    def wall_pics(self):
        if 'wall' in self.cache:
            return self.cache['wall']
        pics = []
        for pid in PAINTINGS:
            for p in ['%s/out/pics/%s.jpg' % (FILM, pid), '%s/orig/final/%s.jpg' % (ROOT, pid)]:
                if os.path.exists(p):
                    pics.append(Image.open(p).convert('RGB'))
                    break
        self.cache['wall'] = pics
        return pics

    def layer_wall(self, img, L, f):
        if f < L['from'] or f >= L['to']:
            return img
        pics = self.wall_pics()
        W, H, u = self.W, self.H, self.H / 1080.0
        cols, rows = L.get('cols', 7), L.get('rows', 4)
        gap = 14 * u
        # the wall draws back a little as it fills
        z = 1.08 - 0.08 * sstep(L['from'], L['from'] + L['hang'] * len(pics) + 30, f)
        cw = (W * 0.86 * z - gap * (cols - 1)) / cols
        chh = cw / 1.5
        if chh * rows + gap * (rows - 1) > H * 0.86 * z:
            chh = (H * 0.86 * z - gap * (rows - 1)) / rows
            cw = chh * 1.5
        tw, th = cw * cols + gap * (cols - 1), chh * rows + gap * (rows - 1)
        x0, y0 = (W - tw) / 2, (H - th) / 2
        dim = 1.0
        if 'dimFrom' in L:
            dim = 1 - (1 - L.get('dim', 0.3)) * sstep(L['dimFrom'], L['dimFrom'] + 20, f)
        out = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
        # the night behind the wall goes darker as the pictures come
        back = 1 - 0.45 * sstep(L['from'], L['from'] + 40, f) * dim
        out = Image.fromarray((np.asarray(out, dtype=np.float32) * back).astype(np.uint8))
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        shadow = Image.new('L', (W, H), 0)
        sd = ImageDraw.Draw(shadow)
        order = list(range(cols * rows))
        # the hanging order: from the middle outwards, like a wall being filled
        cx, cy = (cols - 1) / 2, (rows - 1) / 2
        order.sort(key=lambda i: ((i % cols - cx) ** 2 + ((i // cols - cy) * 1.6) ** 2, i))
        for n, cell in enumerate(order[:len(pics)]):
            t0 = L['from'] + n * L['hang']
            if f < t0:
                continue
            k = sstep(t0, t0 + 8, f)
            c, r = cell % cols, cell // cols
            x = x0 + c * (cw + gap)
            y = y0 + r * (chh + gap) - (1 - k) * 18 * u
            pic = pics[n]
            pw, ph = pic.size
            s = min(cw / pw, chh / ph)
            iw, ih = max(1, int(pw * s)), max(1, int(ph * s))
            px, py = int(x + (cw - iw) / 2), int(y + (chh - ih) / 2)
            key = ('wp', n, iw, ih)
            if key not in self.cache:
                self.cache[key] = pic.resize((iw, ih), Image.LANCZOS)
            a = int(255 * k * dim)
            frame = Image.new('RGBA', (iw + int(6 * u), ih + int(6 * u)), (236, 222, 186, a))
            layer.alpha_composite(frame, (px - int(3 * u), py - int(3 * u)))
            tile = self.cache[key].convert('RGBA')
            tile.putalpha(a)
            layer.alpha_composite(tile, (px, py))
            sd.rectangle([px - 2 * u, py + 4 * u, px + iw + 6 * u, py + ih + 10 * u], fill=int(150 * k * dim))
        shadow = shadow.filter(ImageFilter.GaussianBlur(8 * u))
        out = out.convert('RGBA')
        out.alpha_composite(Image.merge('RGBA', [Image.new('L', (W, H), 0)] * 3 + [shadow]))
        out.alpha_composite(layer)
        res = np.asarray(out.convert('RGB'), dtype=np.float32) / 255.0
        ko = 1.0
        if L.get('fadeOut'):
            ko = 1 - sstep(L['to'] - L['fadeOut'], L['to'], f)
        return img * (1 - ko) + res * ko

    # ---- the catch: her picture and his, side by side as two prints, over the scene blurred and darkened ----
    def catch_still(self, L):
        key = ('catch', json.dumps(L, sort_keys=True))
        if key in self.cache:
            return self.cache[key]
        W, H, u = self.W, self.H, self.H / 1080.0
        fr = lambda p: Image.open('%s/frames/%s/%s' % (FILM, self.src, p)).convert('RGB').resize((W, H), Image.LANCZOS)
        bg = fr(L['bg']).filter(ImageFilter.GaussianBlur(28 * u))
        bg = Image.fromarray((np.asarray(bg, dtype=np.float32) * 0.36).astype(np.uint8)).convert('RGBA')
        x, y, w, h = L['mine']['crop']
        sx = W / 1920.0
        mine = fr(L['mine']['src']).crop((int(x * sx), int(y * sx), int((x + w) * sx), int((y + h) * sx)))
        his = Image.open(ROOT + '/' + L['orig']).convert('RGB')
        ph = int(H * L.get('height', 0.64))
        pics = [p.resize((int(p.size[0] * ph / p.size[1]), ph), Image.LANCZOS) for p in (mine, his)]
        mat, gap = int(22 * u), int(64 * u)
        tw = sum(p.size[0] + 2 * mat for p in pics) + gap
        x0, y0 = (W - tw) // 2, int(88 * u)
        shadow = Image.new('L', (W, H), 0)
        sd = ImageDraw.Draw(shadow)
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        dr = ImageDraw.Draw(layer)
        fnt = self.font(LATIN_IT, int(40 * u))
        xx = x0
        for p, lab in zip(pics, L['labels']):
            pw = p.size[0] + 2 * mat
            sd.rectangle([xx + 6 * u, y0 + 12 * u, xx + pw + 6 * u, y0 + ph + 2 * mat + 14 * u], fill=170)
            dr.rectangle([xx, y0, xx + pw, y0 + ph + 2 * mat], fill=(242, 236, 222, 255))
            layer.paste(p, (xx + mat, y0 + mat))
            tl = dr.textlength(lab, font=fnt)
            dr.text((xx + pw / 2 - tl / 2, y0 + ph + 2 * mat + 14 * u), lab, font=fnt, fill=(244, 238, 226, 255))
            xx += pw + gap
        bg.alpha_composite(Image.merge('RGBA', [Image.new('L', (W, H), 0)] * 3 + [shadow.filter(ImageFilter.GaussianBlur(14 * u))]))
        bg.alpha_composite(layer)
        self.cache[key] = bg.convert('RGB')
        return self.cache[key]

    def layer_catch(self, img, L, f):
        if f < L['from'] or f >= L['to']:
            return img
        im = self.catch_still(L)
        z = 1 + L.get('push', 0.02) * (f - L['from']) / max(1, L['to'] - L['from'] - 1)
        if z > 1.0005:
            W, H = self.W, self.H
            cw, ch = W / z, H / z
            im = im.resize((W, H), Image.LANCZOS, box=((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2))
        return np.asarray(im, dtype=np.float32) / 255.0

    # ---- the end: her pictures hang round one empty golden frame, and through it the night goes on. Then they let go,
    # the name is unveiled as the frame's upper edge comes down, and the frame closes into the button ----
    def rr_mask(self, box, r, ss=3):
        """a rounded rectangle as a mask of the whole picture, its edge smooth (0 to 1)"""
        x0, y0, x1, y1 = box
        m = np.zeros((self.H, self.W), np.float32)
        if x1 - x0 < 0.5 or y1 - y0 < 0.5:
            return m
        ix0, iy0, ix1, iy1 = int(math.floor(x0)) - 2, int(math.floor(y0)) - 2, int(math.ceil(x1)) + 2, int(math.ceil(y1)) + 2
        w, h = ix1 - ix0, iy1 - iy0
        im = Image.new('L', (w * ss, h * ss), 0)
        r = max(0.0, min(r, (x1 - x0) / 2, (y1 - y0) / 2))
        ImageDraw.Draw(im).rounded_rectangle([(x0 - ix0) * ss, (y0 - iy0) * ss, (x1 - ix0) * ss, (y1 - iy0) * ss], radius=r * ss, fill=255)
        a = np.asarray(im.resize((w, h), Image.BOX), dtype=np.float32) / 255.0
        sx0, sy0, dx0, dy0 = max(0, -ix0), max(0, -iy0), max(0, ix0), max(0, iy0)
        cw, chh = min(w - sx0, self.W - dx0), min(h - sy0, self.H - dy0)
        if cw > 0 and chh > 0:
            m[dy0:dy0 + chh, dx0:dx0 + cw] = a[sy0:sy0 + chh, sx0:sx0 + cw]
        return m

    def blur(self, m, r):
        return np.asarray(Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255.0

    def end_geom(self, L):
        key = ('endgeom', L['from'])
        if key in self.cache:
            return self.cache[key]
        W, H, u = self.W, self.H, self.H / 1080.0
        cols, rows, gap = 7, 5, 14 * u
        cw = (W * 0.86 - gap * (cols - 1)) / cols
        chh = cw / 1.5
        tw, th = cw * cols + gap * (cols - 1), chh * rows + gap * (rows - 1)
        x0, y0 = (W - tw) / 2, (H - th) / 2
        cell = lambda c, r: (x0 + c * (cw + gap), y0 + r * (chh + gap))
        # the frame takes the nine cells of the middle; the three under it are left open for a line of words
        fx0, fy0 = cell(2, 1)
        fx1, fy1 = cell(4, 3)
        frame = (fx0, fy0, fx1 + cw, fy1 + chh)
        cx, cy = (frame[0] + frame[2]) / 2, (frame[1] + frame[3]) / 2
        slots = [(c, r) for r in range(rows) for c in range(cols) if not (2 <= c <= 4 and r >= 1)]
        pics = []
        for pid in L['pics']:
            pics.append(Image.open('%s/out/pics/%s.jpg' % (FILM, pid)).convert('RGB'))
        # hung from the frame outwards
        dist = [math.hypot(cell(c, r)[0] + cw / 2 - cx, (cell(c, r)[1] + chh / 2 - cy) * 1.3) for c, r in slots]
        rank = sorted(range(len(slots)), key=lambda i: (round(dist[i], 1), i))
        order = [0] * len(slots)
        for n, i in enumerate(rank):
            order[i] = n
        pw, phh, pcy = 760 * u, 136 * u, 712 * u
        G = dict(cw=cw, chh=chh, cell=cell, frame=frame, slots=slots, pics=pics, order=order, pill=(W / 2 - pw / 2, pcy - phh / 2, W / 2 + pw / 2, pcy + phh / 2))
        self.cache[key] = G
        return G

    def end_label(self, L):
        """what is written on the button (a small triangle and the words, dark on the gold), and the line under it"""
        key = ('endlabel', L['button'], L.get('small', ''))
        if key in self.cache:
            return self.cache[key]
        W, H, u = self.W, self.H, self.H / 1080.0
        G = self.end_geom(L)
        px0, py0, px1, py1 = G['pill']
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        dr = ImageDraw.Draw(im)
        fnt = self.font(LATIN_BOLD, int(70 * u))
        sp = 1.5 * u
        widths = [dr.textlength(ch, font=fnt) for ch in L['button']]
        tw = sum(widths) + sp * (len(widths) - 1)
        tri_w, tri_h, tri_gap = 36 * u, 44 * u, 28 * u
        x = W / 2 - (tri_w + tri_gap + tw) / 2
        cy = (py0 + py1) / 2
        ink = (30, 32, 54, 255)
        ss = 4
        tri = Image.new('L', (int(tri_w * ss) + 8, int(tri_h * ss) + 8), 0)
        ImageDraw.Draw(tri).polygon([(2, 2), (2 + tri_w * ss, 2 + tri_h * ss / 2), (2, 2 + tri_h * ss)], fill=255)
        tri = tri.resize((int(tri_w) + 2, int(tri_h) + 2), Image.LANCZOS)
        im.paste(Image.new('RGBA', tri.size, ink), (int(x), int(cy - tri_h / 2)), tri)
        x += tri_w + tri_gap
        box = dr.textbbox((0, 0), 'Sthj', font=fnt)
        ty = cy - (box[1] + box[3]) / 2 - 2 * u
        for ch, w in zip(L['button'], widths):
            dr.text((x, ty), ch, font=fnt, fill=ink)
            x += w + sp
        lab = np.asarray(im, dtype=np.float32) / 255.0
        sm = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        if L.get('small'):
            tws = self.spaced(ImageDraw.Draw(sm), (W / 2, py1 + 38 * u), L['small'], self.font(LATIN, int(50 * u)), (246, 238, 220, 255), 2.5 * u)
        sm = np.asarray(sm, dtype=np.float32) / 255.0
        sm_sh = self.blur(sm[..., 3], 9 * u) * 0.8
        if L.get('small'):
            plate = self.rr_mask((W / 2 - tws / 2 - 70 * u, py1 + 26 * u, W / 2 + tws / 2 + 70 * u, py1 + 112 * u), 40 * u)
            sm_sh = np.clip(sm_sh + self.blur(plate, 22 * u) * 0.9, 0, 0.93)
        self.cache[key] = (lab[..., :3], lab[..., 3], sm[..., :3], sm[..., 3], sm_sh)
        return self.cache[key]

    def layer_end(self, img, L, f):
        if f < L['from'] or f >= L['to']:
            return img
        W, H, u = self.W, self.H, self.H / 1080.0
        G = self.end_geom(L)
        cw, chh, cell = G['cw'], G['chh'], G['cell']
        n = len(G['slots'])
        t_h, ev = L['hang']['at'], L['hang']['every']
        rel, (m0, m1) = L['release'], L['morph']
        gold = np.array([255, 198, 92], np.float32) / 255.0
        # the wall draws back a little as it fills, about the middle of the picture
        z = 1.045 - 0.045 * sstep(L['from'], t_h + ev * n + 20, f)
        zx = lambda x: W / 2 + (x - W / 2) * z
        zy = lambda y: H / 2 + (y - H / 2) * z
        k = sstep(m0, m1, f)                      # 0 the frame, 1 the button
        appear = sstep(L['from'], L['from'] + 12, f)
        F, P = G['frame'], G['pill']
        F = (zx(F[0]), zy(F[1]), zx(F[2]), zy(F[3]))
        rect = tuple(F[i] + (P[i] - F[i]) * k for i in range(4))
        rad = 5 * u + ((P[3] - P[1]) / 2 - 5 * u) * k
        tb = 9 * u                                # the moulding
        m_out = self.rr_mask(rect, rad)
        m_in = self.rr_mask((rect[0] + tb, rect[1] + tb, rect[2] - tb, rect[3] - tb), rad - tb)
        # the night round the frame goes down while the pictures are up; what is inside the frame keeps its light
        dark = 0.52 * sstep(L['from'], L['from'] + 20, f) * (1 - sstep(rel, rel + 16, f))
        if dark > 0.002:
            img = img * (1 - dark * (1 - m_in * appear))[..., None]
        if k < 0.999:                             # what the frame holds is lit a little, like a picture under its lamp
            img = img * (1 + 0.22 * (1 - k) * appear * m_in)[..., None]
        if k < 0.999:                             # the depth of the frame: a shade along its inner edge
            inner = m_in * (1 - self.blur(m_in, 12 * u)) * 2
            img = img * (1 - 0.42 * (1 - k) * appear * np.clip(inner, 0, 1))[..., None]
        # ---- the pictures ----
        if f < rel + 26:
            out = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).convert('RGBA')
            layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            shadow = Image.new('L', (W, H), 0)
            sd = ImageDraw.Draw(shadow)
            pcx, pcy = (P[0] + P[2]) / 2, (P[1] + P[3]) / 2
            for i, (c, r) in enumerate(G['slots']):
                t0 = t_h + G['order'][i] * ev
                if f < t0:
                    continue
                a = sstep(t0, t0 + 8, f)
                # they let go from the frame outwards (so the middle is clear when the name comes), and lean a little towards the button
                t1 = rel + G['order'][i] * 0.5
                lv = sstep(t1, t1 + 10, f)
                x, y = cell(c, r)
                x, y, w, h = zx(x), zy(y) - (1 - a) * 18 * u, cw * z, chh * z
                if lv > 0:
                    s = 1 - 0.07 * lv
                    mx, my = x + w / 2, y + h / 2
                    mx, my = mx + (pcx - mx) * 0.10 * lv, my + (pcy - my) * 0.10 * lv
                    w, h = w * s, h * s
                    x, y = mx - w / 2, my - h / 2
                al = int(255 * a * (1 - lv))
                if al <= 0:
                    continue
                iw, ih = max(1, int(round(w))), max(1, int(round(h)))
                key = ('ep', i, iw, ih)
                if key not in self.cache:
                    if len([kk for kk in self.cache if isinstance(kk, tuple) and kk[0] == 'ep']) > 400:
                        for kk in [kk for kk in self.cache if isinstance(kk, tuple) and kk[0] == 'ep']:
                            del self.cache[kk]
                    self.cache[key] = G['pics'][i].resize((iw, ih), Image.LANCZOS).convert('RGBA')
                px, py, b = int(round(x)), int(round(y)), int(round(3 * u))
                layer.alpha_composite(Image.new('RGBA', (iw + 2 * b, ih + 2 * b), (236, 222, 186, al)), (px - b, py - b))
                tile = self.cache[key].copy()
                tile.putalpha(al)
                layer.alpha_composite(tile, (px, py))
                sd.rectangle([px - 2 * u, py + 4 * u, px + iw + 6 * u, py + ih + 10 * u], fill=int(150 * a * (1 - lv)))
            out.alpha_composite(Image.merge('RGBA', [Image.new('L', (W, H), 0)] * 3 + [shadow.filter(ImageFilter.GaussianBlur(8 * u))]))
            out.alpha_composite(layer)
            img = np.asarray(out.convert('RGB'), dtype=np.float32) / 255.0
        # ---- the name: unveiled above the frame's upper edge as it comes down ----
        if f >= m0:
            rgb, al, sh = self.words({'type': 'title', 'en': L['title'], 'y': L.get('titleY', 0.435)})
            if k < 0.999:
                yy = np.arange(H, dtype=np.float32)[:, None]
                rv = np.clip((rect[1] - 8 * u - yy) / (14 * u), 0, 1)
                al, sh = al * rv, sh * rv
            img = img * (1 - sh[..., None])
            img = img * (1 - al[..., None]) + rgb * al[..., None]
        # ---- the gold: its glow, the moulding that fills as it closes, the rings that go out from the button ----
        pulse = L.get('pulse', 50)
        ph = ((f - m1) % pulse) / float(pulse) if f >= m1 else 0.0
        glow_a = 0.30 * appear
        if f >= m1:
            glow_a = 0.34 + 0.22 * (0.5 + 0.5 * math.cos(2 * math.pi * ph)) + 0.5 * math.exp(-(f - m1) / 7.0)
        elif k > 0:
            glow_a = 0.30 + 0.25 * k
        fill = sstep(0.5, 1.0, k)
        ring = np.clip(m_out - m_in * (1 - fill), 0, 1) * appear
        if k >= 0.999 and ('endglow', 1) in self.cache:
            gl = self.cache[('endglow', 1)]
        else:
            # the light the gold gives: from the moulding while it is a frame, from the whole of it once it is the button
            gl = self.blur(ring, 22 * u) * (1.5 - 0.75 * fill) + self.blur(ring, 80 * u) * (0.9 - 0.4 * fill)
            if k >= 0.999:
                self.cache[('endglow', 1)] = gl
        img = 1 - (1 - img) * (1 - gold[None, None, :] * np.clip(gl * glow_a, 0, 1)[..., None])
        if f >= m1:
            for dph in (0.0,):
                p = ph
                e = (4 + 50 * (1 - (1 - p) ** 2)) * u
                wd = 3 * u
                r_o = self.rr_mask((P[0] - e, P[1] - e, P[2] + e, P[3] + e), (P[3] - P[1]) / 2 + e)
                r_i = self.rr_mask((P[0] - e + wd, P[1] - e + wd, P[2] + e - wd, P[3] + e - wd), (P[3] - P[1]) / 2 + e - wd)
                ra = np.clip(r_o - r_i, 0, 1) * 0.62 * (1 - p) ** 1.6
                img = img * (1 - ra[..., None]) + gold[None, None, :] * ra[..., None]
        yy = np.arange(H, dtype=np.float32)[:, None]
        shade = 1.07 - 0.16 * np.clip((yy - rect[1]) / max(1.0, rect[3] - rect[1]), 0, 1)   # lighter above, as a thing lit from the sky
        gcol = np.clip(gold[None, None, :] * shade[..., None], 0, 1)
        img = img * (1 - ring[..., None]) + gcol * ring[..., None]
        if k < 0.6:                               # a bright line inside the moulding
            li = self.rr_mask((rect[0] + 3 * u, rect[1] + 3 * u, rect[2] - 3 * u, rect[3] - 3 * u), rad - 3 * u) - self.rr_mask((rect[0] + 5 * u, rect[1] + 5 * u, rect[2] - 5 * u, rect[3] - 5 * u), rad - 5 * u)
            la = np.clip(li, 0, 1) * 0.55 * appear * (1 - k / 0.6)
            img = img * (1 - la[..., None]) + np.array([1.0, 0.93, 0.72], np.float32)[None, None, :] * la[..., None]
        # ---- the words on the button, and the line under it ----
        lrgb, lal, srgb, sal, ssh = self.end_label(L)
        ka = sstep(0.78, 1.0, k)
        if ka > 0:
            img = img * (1 - (lal * ka)[..., None]) + lrgb * (lal * ka)[..., None]
        ks = sstep(m1 + 6, m1 + 22, f)
        if ks > 0:
            img = img * (1 - (ssh * ks)[..., None])
            img = img * (1 - (sal * ks)[..., None]) + srgb * (sal * ks)[..., None]
        return img

    def compose(self, f):
        img, live = self.base(f)
        for L in self.B['layers']:
            if L.get('off'):
                continue
            t = L['type']
            if t == 'image':
                img = self.layer_image(img, L, f)
            elif t in ('text', 'title'):
                img = self.layer_words(img, L, f)
            elif t == 'wall':
                img = self.layer_wall(img, L, f)
            elif t == 'catch':
                img = self.layer_catch(img, L, f)
            elif t == 'end':
                img = self.layer_end(img, L, f)
            elif t == 'flash':
                # the game's flash when a painting is caught: white, gone in a few frames
                n = L['to'] - L['from']
                if L['from'] <= f < L['to']:
                    k = 1 - (f - L['from']) / float(n)
                    img = img * (1 - k) + k
            elif t == 'fade':
                img = img * (1 - sstep(L['from'], L['to'], f))
        return np.clip(img, 0, 1), live


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='640x360')
    ap.add_argument('--size', default=None)
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--from', dest='f0', type=int, default=0)
    ap.add_argument('--to', dest='f1', type=int, default=None)
    ap.add_argument('--out', default=FILM + '/out/test.mp4')
    ap.add_argument('--stills', default=None)
    ap.add_argument('--silent', action='store_true')
    ap.add_argument('--crf', type=int, default=18)
    ap.add_argument('--bv', default=None, help='a video bit rate (e.g. 12M) in place of crf, to keep the file under a size')
    a = ap.parse_args()
    B = board()
    size = tuple(int(v) for v in (a.size or a.src).split('x'))
    A = Assembler(B, a.src, size)
    if a.stills:
        for f in [int(v) for v in a.stills.split(',')]:
            img, live = A.compose(f)
            p = '%s/out/still_%05d.png' % (FILM, f)
            Image.fromarray((img * 255).astype(np.uint8)).save(p)
            print('still', f, live, p)
        return
    f1 = a.f1 if a.f1 is not None else B['frames']
    step = max(1, 30 // a.fps)
    cmd = [FFMPEG, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % size, '-r', str(a.fps), '-i', '-']
    if not a.silent:
        cmd += ['-ss', '%.4f' % (a.f0 / 30.0), '-i', ROOT + '/' + B['music']]
    cmd += ['-c:v', 'libx264', '-preset', 'slow'] + (['-b:v', a.bv, '-maxrate', a.bv.replace('M', '') + 'M', '-bufsize', str(int(float(a.bv.rstrip('M')) * 2)) + 'M'] if a.bv else ['-crf', str(a.crf)]) + [ '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart']
    if not a.silent:
        cmd += ['-c:a', 'aac', '-b:a', '192k', '-shortest']
    cmd += [a.out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = 0
    for f in range(a.f0, f1, step):
        img, live = A.compose(f)
        p.stdin.write((img * 255).astype(np.uint8).tobytes())
        n += 1
        if n % 30 == 0:
            print('frame', f, live, flush=True)
    p.stdin.close()
    p.wait()
    print('wrote', a.out, n, 'frames')


if __name__ == '__main__':
    main()
