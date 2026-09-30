"""皮影短片的锣鼓：全部用代码合成，只有打击乐。

    python sound/synth.py [--end=15] [--out=out/sound.wav]

拍号和画面共用：96 BPM，第 b 拍在 b*0.625 秒（src/config.js 的 bpm/offset）。
乐器都是「几个衰减的正弦分音 + 一点噪声」：
  梆子 bang   硬木，短而亮
  碎鼓 dan    板鼓，高、紧、干
  堂鼓 tang   低沉的鼓身，给「锵」垫底
  小锣 xiao   打下去音高往上挑（京剧小锣的特征）；slide=-1 改成往下滑，用来逗
  大锣 da     音高往下沉，余音长
  钹   bo     金属噪声；choke=True 捂住只剩半声
  锵   qiang  钹 + 大锣 + 堂鼓 一起
"""
import os, sys, wave
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

SR = 48000
BPM, OFF = 96, 0.0
BEAT = 60 / BPM
BT = lambda b: OFF + b * BEAT
args = dict(a.lstrip('-').split('=', 1) for a in sys.argv[1:] if '=' in a)
END = float(args.get('end', 60))
OUT = args.get('out', 'out/sound.wav')
rng = np.random.default_rng(7)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def hp(x, f):
    return sosfilt(butter(2, f, 'hp', fs=SR, output='sos'), x)


def lp(x, f):
    return sosfilt(butter(2, f, 'lp', fs=SR, output='sos'), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], 'bp', fs=SR, output='sos'), x)


def partials(t, f0, ratios, amps, decays, glide=None):
    """glide(t) -> 音高倍率，积分成相位，这样滑音不会跳"""
    mul = glide(t) if glide else np.ones_like(t)
    phase = np.cumsum(mul) / SR
    out = np.zeros_like(t)
    for r, a, d in zip(ratios, amps, decays):
        out += a * np.sin(2 * np.pi * f0 * r * phase + rng.uniform(0, 6.28)) * np.exp(-t / d)
    return out


def bang(v=1.0):
    t = t_(0.3)
    f = 1180 * rng.uniform(.98, 1.02)
    x = partials(t, f, [1, 2.71, 5.3], [1, .32, .12], [.05, .022, .012])
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t / .0025) * .5
    return v * .8 * (x + click)


def dan(v=1.0):
    t = t_(0.25)
    f = 470 * rng.uniform(.97, 1.03)
    body = partials(t, f, [1, 1.58, 2.2], [1, .45, .2], [.06, .035, .02], glide=lambda t: 1 + .35 * np.exp(-t / .012))
    snap = bp(rng.standard_normal(len(t)), 1800, 6000) * np.exp(-t / .025) * .7
    return v * .55 * (body + snap)


def tang(v=1.0):
    t = t_(0.8)
    body = partials(t, 92, [1, 1.6, 2.3], [1, .35, .15], [.28, .12, .06], glide=lambda t: 1 + .5 * np.exp(-t / .03))
    thump = lp(rng.standard_normal(len(t)), 500) * np.exp(-t / .03) * .8
    return v * .9 * (body + thump)


def xiao(v=1.0, slide=1):
    dur = 1.4 if slide < 0 else 0.9
    t = t_(dur)
    if slide > 0:
        g = lambda t: 1 + .09 * (1 - np.exp(-t / .07))          # 往上挑
    else:
        g = lambda t: 1 - .32 * (1 - np.exp(-t / .45))          # 往下滑「当～」
    x = partials(t, 640, [1, 1.47, 2.09, 2.95, 3.9], [1, .5, .35, .2, .1], [.45, .3, .2, .12, .08], glide=g)
    hit = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / .004) * .4
    return v * .5 * (x + hit)


def da(v=1.0, decay=1.8):
    t = t_(decay * 1.6)
    ratios = [1, 1.43, 1.93, 2.61, 3.27, 4.1]
    x = partials(t, 205, ratios, [1, .7, .5, .35, .22, .12], [decay, decay * .8, decay * .6, decay * .45, decay * .3, decay * .2],
                 glide=lambda t: 1 - .1 * (1 - np.exp(-t / .5)))
    x += partials(t, 207.5, ratios[:3], [.5, .35, .2], [decay, decay * .8, decay * .6])   # 轻微拍频，锣身在「嗡」
    hit = lp(rng.standard_normal(len(t)), 2000) * np.exp(-t / .01) * .5
    return v * .45 * (x + hit)


def bo(v=1.0, choke=False):
    d = .09 if choke else .75
    t = t_(d * 2.2)
    noise = hp(rng.standard_normal(len(t)), 2800) * (np.exp(-t / d) * .8 + np.exp(-t / .02) * .6)
    ring = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / (d * rng.uniform(.5, 1.1)))
               for f in rng.uniform(3200, 8800, 14)) * .06
    return v * .42 * (noise * .5 + ring)


def qiang(v=1.0, choke=False, decay=1.8):
    parts = [bo(v, choke), da(v * (.5 if choke else 1), decay=.22 if choke else decay), tang(v * .8)]
    n = max(len(p) for p in parts)
    return sum(np.pad(p, (0, n - len(p))) for p in parts)


def roll(b0, b1, v0=.4, v1=.9, rate=16):
    """碎鼓滚奏：每拍 rate/4 下，力度从 v0 走到 v1"""
    out, b, step = [], b0, 4 / rate
    while b < b1 - 1e-6:
        k = (b - b0) / max(b1 - b0, 1e-6)
        out.append((BT(b), dan, dict(v=v0 + (v1 - v0) * k)))
        b += step
    return out


def whoosh(dur=1.2, v=1.0):
    """被甩向灯：一声往上扬的「呼」"""
    t = t_(dur)
    n = rng.standard_normal(len(t))
    lo = bp(n, 300, 900) * (1 - t / dur)
    hi = bp(n, 1500, 4500) * (t / dur)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return v * .5 * (lo + hi) * env


def accel_roll(b0, b1, v0=.25, v1=1.0, r0=4, r1=24):
    """越滚越快越响的碎鼓，在 b1 前停住（不落音）"""
    out, b = [], b0
    while b < b1 - 1e-6:
        k = (b - b0) / (b1 - b0)
        out.append((BT(b), dan, dict(v=v0 + (v1 - v0) * k ** 1.3)))
        b += 4 / (r0 + (r1 - r0) * k ** 1.2)
    return out


def breath(dur=1.6, v=1.0):
    """幕后那个人松劲时吐的一口气"""
    t = t_(dur)
    n = bp(rng.standard_normal(len(t)), 250, 1800)
    env = np.clip(t / .25, 0, 1) * np.exp(-np.clip(t - .25, 0, None) / .45)
    return v * .22 * n * env


# ---------- 音轨 ----------
L = int(END * SR) + SR * 3
mixL, mixR = np.zeros(L), np.zeros(L)


def put(time, sound, pan=0.0):
    i = int(time * SR)
    if i >= L:
        return
    s = sound[:L - i]
    gl, gr = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    mixL[i:i + len(s)] += s * gl
    mixR[i:i + len(s)] += s * gr


PAN = {bang: .35, dan: 0, tang: 0, xiao: -.3, da: -.1, bo: .15, qiang: 0, whoosh: 0}

# 灯：点着那一下的「呼」，之后一直有灯芯噼啪
def ignite():
    t = t_(1.2)
    x = lp(rng.standard_normal(len(t)), 700) * np.sin(np.pi * np.clip(t / 1.2, 0, 1)) ** 2
    return x * .25


def crackle(t0, t1, level=1.0):
    n = rng.poisson((t1 - t0) * 7)
    for tt in np.sort(rng.uniform(t0, t1, n)):
        m = int(SR * .004)
        c = hp(rng.standard_normal(m), 1500) * np.exp(-np.arange(m) / (SR * .0007)) * rng.uniform(.03, .12) * level
        put(tt, c, rng.uniform(-.3, .3))


CUES = []
CUES += [(.3, ignite, {})]
CUES += [(BT(4), bang, dict(v=.8)), (BT(6), bang, dict(v=1))]
# 出场：碎鼓踩着脚步，每半拍一下，最后一小节渐强，再一串滚奏推进「锵」
for i in range(15):
    b = 8 + i * .5
    CUES.append((BT(b), dan, dict(v=(.75 if b == int(b) else .5) * (1 + .35 * max(0, b - 12) / 3))))
CUES += roll(15.5, 16, .55, .95)
CUES += [(BT(16), qiang, dict(v=1))]
# 耍一段：锵 台 | 梆子 台 | 梆子 台 | 滚奏 → 半声锵
CUES += [(BT(17), xiao, dict(v=.8)), (BT(18), bang, dict(v=1)), (BT(18), dan, dict(v=.8)),
         (BT(19), xiao, dict(v=.8)), (BT(20), bang, dict(v=1)), (BT(20), tang, dict(v=.7)),
         (BT(21), xiao, dict(v=.75))]
CUES += roll(21.5, 22, .4, .8)
CUES += [(BT(22), qiang, dict(v=.75, choke=True))]

# 发现：两下轻梆子（甩胳膊）；拍 30 第四根杆子接上，小锣往下滑
CUES += [(BT(26), bang, dict(v=.45)), (BT(27), bang, dict(v=.5)), (BT(30), xiao, dict(v=.9, slide=-1))]
# 拔河：拽一下一声钹（带堂鼓），中间碎鼓两下；拍 37 转身一声小锣
for y in (32, 34, 36):
    CUES += [(BT(y), bo, dict(v=.9)), (BT(y), tang, dict(v=.6)), (BT(y + 1), dan, dict(v=.5)), (BT(y + 1.5), dan, dict(v=.55))]
CUES += [(BT(37.5), xiao, dict(v=.8))]
# 被倒着拖：碎鼓每四分之一拍一下，越来越响
CUES += roll(38, 40, .35, .8, rate=16)
# 翻跟头：一串快滚，落地一声梆子
CUES += roll(40, 40.8, .5, .9, rate=32) + [(BT(40.85), bang, dict(v=1))]
# 被甩向灯：呼——；拍 44 拍回幕上，全片最重的一声锵
CUES += [(BT(42), whoosh, dict(dur=BT(44) - BT(42), v=1)), (BT(44), qiang, dict(v=1.25))]
# 晕：两声歪歪扭扭的小锣
CUES += [(BT(45.5), xiao, dict(v=.5, slide=-1)), (BT(46.75), bang, dict(v=.35))]
# 僵持：鼓从慢到快一路滚上去，拍 55 戛然而止
CUES += accel_roll(48, 55)

# 幕后：全静，只剩灯芯。拍 68 那人吐一口气，拍 70 一声很轻的小锣
CUES += [(BT(68.2), breath, dict(v=1)), (BT(70), xiao, dict(v=.32))]
# 合手：碎鼓轻轻起，一路推到拍 80 满满一声锵
for i in range(15):
    b = 72.5 + i * .5
    CUES.append((BT(b), dan, dict(v=(.3 + .45 * i / 14) * (1 if b == int(b) else .7))))
CUES += roll(79.5, 80, .6, .95) + [(BT(80), qiang, dict(v=1.15, decay=3.2))]
# 谢幕：拍 88 小锣（鞠躬），拍 94 最后一声梆子
CUES += [(BT(88), xiao, dict(v=.7)), (BT(94), bang, dict(v=.75))]

for time, fn, kw in CUES:
    if time < END:
        put(time, fn(**kw), PAN.get(fn, 0))
crackle(.35, BT(56)); crackle(BT(56), BT(76), 1.7); crackle(BT(76), BT(90)); crackle(BT(90), BT(95.5), .5)

# 舞台混响：一小段衰减噪声当冲激响应
ir_t = t_(1.3)
ir = lp(rng.standard_normal(len(ir_t)), 5000) * np.exp(-ir_t / .32)
ir /= np.sqrt(np.sum(ir ** 2))
wet = .16
outL = mixL + wet * fftconvolve(mixL, ir)[:L]
outR = mixR + wet * fftconvolve(mixR, np.roll(ir, 37))[:L]
st = np.stack([outL, outR], 1)[:int(END * SR)]
st *= .95 / max(np.abs(st).max(), 1e-9)
st = np.tanh(st * 1.3) / np.tanh(1.3) * .9
pcm = (st * 32767).astype(np.int16)
os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'{OUT}  {END:.1f}s  peak {np.abs(st).max():.2f}')
