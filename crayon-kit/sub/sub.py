# 歌词字幕层（蜡笔版）：每帧是 t 的纯函数，输出 1920x1080 RGBA，再用 ffmpeg 叠到成片上
# 字和底衬都按 crayon.js 的纸齿算法抠出跳白，并以同样的 BOIL=8 换种子，所以字会跟画面一起轻轻抖
import re, math, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# 这首歌的所有设定都在 song.json（照 song.example.json 写）：歌词文件、字体、节拍、怎么拆句、叠字的拍点
HERE = os.path.dirname(os.path.abspath(__file__))
SONG = json.load(open(os.path.join(HERE, 'song.json'), encoding='utf-8'))
rel = lambda p: p if os.path.isabs(p) else os.path.join(HERE, p)
W, H, BOIL = 1920, 1080, 8
FONT = rel(SONG['font'])
LRC = rel(SONG['lrc'])
BPM, OFF = SONG['bpm'], SONG.get('offset', 0)
BT = lambda b: OFF + b * 60 / BPM
HB = 30 / BPM                                     # 半拍
SPLIT = SONG.get('split', {})                     # 每句拆成两个半句（从右往左两列），没写的从中间拆
BEATWORD = SONG.get('beatwords', {})              # 叠字：每个字落在自己那半拍上，值是最后一个字的时刻（第一遍）

def load_lyrics():
    out = []
    for ln in open(LRC, encoding='utf-8'):
        m = re.match(r'\[(\d+):(\d+\.\d+)\](.*)', ln.strip())
        if not m: continue
        t = int(m[1]) * 60 + float(m[2]); s = m[3].strip()
        if t < SONG.get('start', 0) or not s: continue
        out.append((t, s))
    return out

def ease(x): x = min(max(x, 0), 1); return x * x * (3 - 2 * x)
def rgb(c): c = c.lstrip('#'); return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)

# ---------- 纸齿：照 crayon.js makeMasks 的配方（纤维噪声 + 中噪声 + 大噪声 + 白噪声），按覆盖率切阈值 ----------
def value_noise(S, gx, gy, rng):
    g = rng.random((gy + 1, gx + 1)); g[:, -1] = g[:, 0]; g[-1, :] = g[0, :]
    y, x = np.mgrid[0:S, 0:S] / S
    fx, fy = x * gx, y * gy; ix, iy = fx.astype(int), fy.astype(int); ux, uy = fx - ix, fy - iy
    sx, sy = ux * ux * (3 - 2 * ux), uy * uy * (3 - 2 * uy)
    a = g[iy, ix] + (g[iy, ix + 1] - g[iy, ix]) * sx; b = g[iy + 1, ix] + (g[iy + 1, ix + 1] - g[iy + 1, ix]) * sx
    return a + (b - a) * sy

_TOOTH = None
def tooth_field():
    """8 个方向的纸齿场（1024 见方），和画面蜡层同一个配方"""
    global _TOOTH
    if _TOOTH is None:
        S, rng = 512, np.random.default_rng(1234)
        v = .42 * value_noise(S, 160, 12, rng) + .2 * value_noise(S, 24, 24, rng) + .13 * value_noise(S, 5, 5, rng) + .25 * rng.random((S, S))
        v = np.tile(v, (3, 3))
        _TOOTH = []
        for k in range(8):
            im = Image.fromarray(((v - v.min()) / (v.max() - v.min()) * 65535).astype('uint16').astype('int32'), 'I').rotate(k * 22.5 + 8, resample=Image.BILINEAR)
            c = np.asarray(im, dtype=float)[256:1280, 256:1280] / 65535
            _TOOTH.append(c)
    return _TOOTH

def tooth(shape, seed, cov):
    """取一块纸齿并切成覆盖率 cov 的遮罩（0..1，边缘 soft）"""
    rng = np.random.default_rng(seed); f = tooth_field()[rng.integers(8)]
    h, w = shape; oy, ox = rng.integers(0, 1024 - h), rng.integers(0, 1024 - w)
    c = f[oy:oy + h, ox:ox + w]
    th = np.quantile(c, 1 - cov); soft = .035
    return np.clip((c - th + soft) / (2 * soft), 0, 1)

_font = {}
def font(size):
    if size not in _font: _font[size] = ImageFont.truetype(FONT, size)
    return _font[size]

def block_time(spec, blk):
    bs = spec['blocks']; k = bs.index(blk); n = len(bs)
    return blk.get('t0', spec['t0'] + k * (spec['t1'] - spec['t0']) / n), blk.get('t1', spec['t1'])

def char_times(blk, b0, per):
    """每个字开始写的时刻：默认在 reveal 里均匀铺开；叠字按拍"""
    n = len(blk['text'])
    if 'beats' in blk: return blk['beats']
    rv = blk.get('reveal', 1.0)
    return [b0 + (rv - per) * i / max(n - 1, 1) for i in range(n)]

def render_block(spec, blk, t, bid):
    b0, b1 = block_time(spec, blk)
    if t < b0 - .05 or t > b1 + .05: return None
    size = blk['size']; text = blk['text']; n = len(text); step = size * 1.04
    boil = math.floor(t * BOIL + 1e-6)
    pad = int(size * .45)
    bw, bh = size + 2 * pad, int((n - 1) * step) + size + 2 * pad
    ox, oy = int(blk['x'] - size / 2 - pad), int(blk['y'] - size / 2 - pad)
    per = .22
    cts = char_times(blk, b0, per)
    glyph = np.zeros((bh, bw))
    full = np.zeros((bh, bw))                      # 整句写完的样子，底衬按它的形状画，不跟着字一个个冒
    for i, ch in enumerate(text):
        rng = np.random.default_rng(bid * 1000 + i * 37 + boil * 7919)
        g = Image.new('L', (size * 2, size * 2), 0)
        ImageDraw.Draw(g).text((size, size), ch, font=font(size), fill=255, anchor='mm')
        g = g.rotate(rng.uniform(-1.2, 1.2), resample=Image.BILINEAR)
        gm = np.asarray(g, dtype=float) / 255
        cx = blk['x'] - ox + rng.uniform(-1.6, 1.6); cy = blk['y'] + i * step - oy + rng.uniform(-1.6, 1.6)
        x0, y0 = int(cx - size), int(cy - size)
        sl = (slice(max(y0, 0), min(y0 + 2 * size, bh)), slice(max(x0, 0), min(x0 + 2 * size, bw)))
        gs = gm[sl[0].start - y0:sl[0].stop - y0, sl[1].start - x0:sl[1].stop - x0]
        full[sl] = np.maximum(full[sl], gs)
        k = ease((t - cts[i]) / per)
        if k <= 0: continue
        if k < 1:   # 蜡笔从上往下写出来，写字的前沿是毛的
            L = gs.shape[0]; pos = np.arange(L)[:, None] + np.random.default_rng(i + boil).random((1, gs.shape[1])) * 10
            gs = gs * np.clip((k * (L + 30) - 15 - pos) / 6, 0, 1)
        glyph[sl] = np.maximum(glyph[sl], gs)
    if glyph.max() == 0 and t < b0 + .3: return None
    ink, halo = rgb(blk['color']), rgb(blk['halo'])
    if 'swap' in blk:   # 镜头里换了底色（夜景里砸进暖色分格）：字色跟着换，0.15 秒过渡
        ts, c2, h2 = blk['swap']; k = ease((t - ts) / .15)
        ink, halo = ink + (rgb(c2) - ink) * k, halo + (rgb(h2) - halo) * k
    seed = bid * 100003 + boil * 104729
    # 字：line 档覆盖率，笔画略加粗，蜡只沾在纸齿上
    ga = np.asarray(Image.fromarray((glyph * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5 if size >= 80 else 3)), dtype=float) / 255
    a = ga * (.55 + .45 * tooth(ga.shape, seed, .9))      # 笔画实心为主，只在表面带一层纸纹
    # 底衬：整句字形往外胀、糊开再切，边缘带纸齿毛边；heavy 档
    fm = Image.fromarray((full * 255).astype('uint8')).filter(ImageFilter.MaxFilter(int(size * .12) | 1)).filter(ImageFilter.GaussianBlur(size * .16))
    fu = np.asarray(fm, dtype=float) / 255
    edge = tooth(fu.shape, seed + 5, .5)
    ha = np.clip((fu + .12 * edge - .22) / .1, 0, 1) * tooth(fu.shape, seed + 9, blk.get('halo_cov', .9))
    # 底衬跟字一起出现：先于第一个字半拍铺开
    ha *= ease((t - (cts[0] - .15)) / .35) * blk.get('halo_op', .92)
    # 退场：在切镜之前擦掉（成块掉蜡 + 变淡），不拖进下一个镜头
    out = (t - (b1 - .4)) / .4
    if out > 0:
        er = np.random.default_rng(bid).random((a.shape[0] // 6 + 1, a.shape[1] // 6 + 1))
        er = np.asarray(Image.fromarray((er * 255).astype('uint8')).resize((a.shape[1], a.shape[0]), Image.BICUBIC), dtype=float) / 255
        keep = np.clip((er - out + .15) / .3, 0, 1) * (1 - ease(out) * .6)
        a *= keep; ha *= keep
    tot = a + ha * (1 - a)
    img = np.zeros((bh, bw, 4))
    img[..., :3] = (ink * a[..., None] + halo * (ha * (1 - a))[..., None]) / np.clip(tot, 1e-6, 1)[..., None]
    img[..., 3] = tot * 255
    return Image.fromarray(img.clip(0, 255).astype('uint8'), 'RGBA'), (ox, oy)

def render(t, specs):
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for i, s in enumerate(specs):
        for j, b in enumerate(s['blocks']):
            r = render_block(s, b, t, i * 7 + j + 3)
            if r is None: continue
            tmp = Image.new('RGBA', (W, H), (0, 0, 0, 0)); tmp.paste(r[0], r[1])
            layer = Image.alpha_composite(layer, tmp)
    return layer
