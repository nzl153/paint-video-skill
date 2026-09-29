# 自动排版：每句两列竖排（从右往左读），在它显示的时间里找不压人物、画面最空的位置；白天、夜景各一套字色。
# 人物位置来自 probe.mjs 从渲染器直接记下的包围盒（boxes.json），不靠猜颜色。结果写 specs.json，再人工覆盖。
import json, os
import numpy as np
from PIL import Image, ImageFilter
from sub import load_lyrics, SPLIT, BEATWORD, HB, SONG

FR = '../out/frames/f%05d.jpg'
FPS = 24
MAIN = SONG.get('size', 112)
END = SONG['end']                              # 最后一句结束的时刻
REP = SONG.get('repeat')                       # 副歌第二遍：{"from": 第二遍开始之后的某个时刻, "shift": 比第一遍晚几秒}
DAY, NIGHT = SONG.get('day', {'ink': '#3b2c26', 'halo': '#f6eedb'}), SONG.get('night', {'ink': '#fbe7bf', 'halo': '#1f2748'})
NIGHT_FROM = SONG.get('night_from')            # 从这一刻起全是夜景；按场景定，不按局部亮度，月亮和灯晕会骗人

def second(t0): return REP['shift'] if REP and t0 > REP['from'] else 0
BOX = json.load(open('boxes.json'))
BT_KEYS = sorted(float(k) for k in BOX)
OVR = json.load(open('override.json', encoding='utf-8')) if os.path.exists('override.json') else {}

_cache = {}
def frame(t):
    i = int(round(t * FPS))
    if i not in _cache:
        _cache[i] = np.asarray(Image.open(FR % i).convert('RGB').resize((480, 270)), dtype=float) / 255
    return _cache[i]

def busy(im):
    g = Image.fromarray((im.mean(2) * 255).astype('uint8'))
    e = np.asarray(g.filter(ImageFilter.FIND_EDGES), dtype=float) / 255
    return np.asarray(Image.fromarray(((e > .1) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(6)), dtype=float) / 255

def boxes(t0, t1):
    ks = [k for k in BT_KEYS if t0 - .1 <= k <= t1 + .3]
    out = []
    for k in ks: out += BOX[f'{k:.3f}']
    return out

def hits(r, bs, pad):
    return [b for b in bs if not (r[2] < b[2] - pad or r[0] > b[4] + pad or r[3] < b[3] - pad or r[1] > b[5] + pad)]

def col_rect(x, y, n, size):
    st = size * 1.04
    return (x - size * .6, y - size * .6, x + size * .6, y + (n - 1) * st + size * .6)

def overlap(r, b, pad):
    return max(0, min(r[2], b[4] + pad) - max(r[0], b[2] - pad)) * max(0, min(r[3], b[5] + pad) - max(r[1], b[3] - pad))

def score(rects, Bm, bs, hard=True):
    s = 0
    for r in rects:
        if r[0] < 50 or r[1] < 40 or r[2] > 1870 or r[3] > 1040: return None
        hb = [b for b in hits(r, bs, 28) if b[1] == 'hard']
        if hb and hard: return None
        s += sum(overlap(r, b, 28) for b in hb) / ((r[2] - r[0]) * (r[3] - r[1])) * 8
        s += len([b for b in hits(r, bs, 10) if b[1] == 'soft']) * 4
        a = Bm[int(r[1] / 4):int(r[3] / 4), int(r[0] / 4):int(r[2] / 4)]
        s += a.mean() * 4
    return s

def place(halves, size, t0, t1, prefer, hard=True):
    """两列一起找：第二列在第一列左边，顶端对齐（第二列可以往下错半格）"""
    fr = [frame(t) for t in np.arange(t0, t1 + .01, .25)]
    Bm = sum(busy(f) for f in fr) / len(fr); bs = boxes(t0, t1)
    gap = size * 1.22
    best = None
    for x in range(1860 - int(size * .6), 60, -20):
        for y in range(60 + int(size * .6), 1040, 20):
            for dy in (0, size * .52):
                rects = [col_rect(x - i * gap, y + (dy if i else 0), len(h), size) for i, h in enumerate(halves)]
                s = score(rects, Bm, bs, hard)
                if s is None: continue
                s += abs(x - prefer) / 1920 * .35 + y / 1080 * .15      # 同一段尽量待在同一侧
                if best is None or s < best[0]: best = (s, x, y, dy)
    return best, fr

def main():
    L = load_lyrics(); specs = []; prefer = 1700
    for k, (t0, s) in enumerate(L):
        nxt = L[k + 1][0] if k + 1 < len(L) else END
        t1 = min(nxt, t0 + 3.9) - .05
        cut = SPLIT.get(s, (len(s) + 1) // 2); halves = [s[:cut], s[cut:]]
        o = OVR.get(str(k), {})
        size = o.get('size', MAIN)
        if 'x' in o: x, y, dy = o['x'], o['y'], o.get('dy', 0); fr = [frame(t0 + .5), frame(t1 - .3)]
        else:
            p = None
            for sz in (size, 100, 90):
                p, fr = place(halves, sz, t0, t1 + .1, prefer)
                if p: size = sz; break
            if not p:
                size = 90; p, fr = place(halves, size, t0, t1 + .1, prefer, hard=False)
                print(k, s, '没有完全空的位置，按最少遮挡放，要人工看')
            _, x, y, dy = p
        prefer = x
        gap = size * 1.22
        blocks = []
        for j, h in enumerate(halves):
            bx, by = x - j * gap, y + (dy if j else 0)
            r = col_rect(bx, by, len(h), size)
            pal = NIGHT if NIGHT_FROM is not None and t0 >= NIGHT_FROM else DAY
            blk = dict(text=h, x=int(bx), y=int(by), size=size, color=pal['ink'], halo=pal['halo'])
            if j == 1: blk['t0'] = round(t0 + (t1 - t0) * (.45 if len(halves[0]) <= 5 else .55), 2)
            for w, last in BEATWORD.items():
                if h.endswith(w):
                    last = last + second(t0)
                    nb = len(h) - len(w)
                    pre = [round(t0 + (t1 - t0) * .45 + i * .16, 2) for i in range(nb)]
                    beats = [round(last - (len(w) - 1 - i) * HB - .06, 2) for i in range(len(w))]
                    blk['beats'] = pre + beats; blk['t0'] = pre[0] if pre else beats[0]
            for w, end in SONG.get('reveal_end', {}).items():   # 这半句要写到某一拍才写完（比如点题的词卡在变身那一拍）
                if h.endswith(w): blk['reveal'] = round(end + second(t0) - blk['t0'] + .22, 2)
            for kk in ('swap', 'color', 'halo'):
                if kk in o: blk[kk] = o[kk]
            blocks.append(blk)
        specs.append(dict(k=k, t0=round(t0, 2), t1=round(t1, 2), blocks=blocks))
        print(k, s, size, x, y)
    json.dump(specs, open('specs.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
