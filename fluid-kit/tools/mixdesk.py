# 混音台：干声分轨 → 每轨 EQ / 压缩 / 饱和 / 宽度 / 混响发送 → 总线粘合 → 按参考版分段对响度 → 限幅 → -16 LUFS
# python -I mixdesk.py <配置.py>        配置里一个 MIX 字典，例子见 music/mix.py
import sys, os, subprocess, runpy, numpy as np
from scipy.io import wavfile
from scipy.signal import sosfilt, fftconvolve, resample_poly
from scipy.ndimage import minimum_filter1d, uniform_filter1d
import warnings; warnings.filterwarnings('ignore')
SR = 44100
db = lambda x: 20 * np.log10(np.maximum(x, 1e-12))
un = lambda d: 10 ** (d / 20)


def biquad(kind, f, g=0., q=0.707):
    """RBJ cookbook。kind: peak / low(搁架) / high(搁架) / hp / lp"""
    A, w = 10 ** (g / 40), 2 * np.pi * f / SR
    c, s = np.cos(w), np.sin(w); al = s / (2 * q); sq = 2 * np.sqrt(A) * al
    b, a = {
        'peak': ([1 + al * A, -2 * c, 1 - al * A], [1 + al / A, -2 * c, 1 - al / A]),
        'low': ([A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)],
                [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq]),
        'high': ([A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)],
                 [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]),
        'hp': ([(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al]),
        'lp': ([(1 - c) / 2, 1 - c, (1 - c) / 2], [1 + al, -2 * c, 1 - al]),
    }[kind]
    return np.array([[*(np.array(b) / a[0]), 1, a[1] / a[0], a[2] / a[0]]])


def eq(x, bands):
    for b in bands: x = sosfilt(biquad(*b), x, axis=0)
    return x


def comp(x, thr=-18, ratio=3, att=10, rel=150, knee=6, makeup=0, mix=1, rms=False, sc_hp=0, B=32):
    """压缩。sc_hp：侦测信号先切低频（底鼓不推着整组呼吸）；mix<1 就是并行压缩"""
    det = sosfilt(biquad('hp', sc_hp), x, axis=0) if sc_hp else x
    m = len(x) // B; blk = det[:m * B].reshape(m, B, -1)
    lv = 10 * np.log10(np.mean(blk ** 2, axis=(1, 2)) * 2 + 1e-12) if rms else db(np.abs(blk).max(axis=(1, 2)))
    o = lv - thr; k = 1 / ratio - 1
    gr = np.where(o <= -knee / 2, 0, np.where(o >= knee / 2, k * o, k * (o + knee / 2) ** 2 / (2 * knee)))
    aa, ar = np.exp(-B / (SR * att / 1000)), np.exp(-B / (SR * rel / 1000))
    g = np.empty(m); y = 0.
    for i, v in enumerate(gr):
        kk = aa if v < y else ar; y = kk * y + (1 - kk) * v; g[i] = y
    gs = np.interp(np.arange(len(x)), np.arange(m) * B + B / 2, g)
    out = x * un(gs + makeup)[:, None]
    return out * mix + x * (1 - mix), gr.min(), g.mean()


def sat(x, drive=6, mix=1, bias=0.1):
    """4 倍过采样的 tanh 饱和，小信号增益为 1；bias 加一点偶次谐波（发暖）"""
    g = un(drive); u = resample_poly(x, 4, 1, axis=0); tb = np.tanh(g * bias)
    y = (np.tanh(g * (u + bias)) - tb) / (g * (1 - tb ** 2))
    y = resample_poly(y, 1, 4, axis=0)[:len(x)]
    return y * mix + x * (1 - mix)


def width(x, w=1., bal=0.):
    m, s = (x[:, 0] + x[:, 1]) / 2, (x[:, 0] - x[:, 1]) / 2 * w
    return np.stack([(m + s) * min(1, 1 - bal), (m - s) * min(1, 1 + bal)], 1)


def synth_ir(rt60=2.4, pre=0.02, seed=3, lo_mul=1.25, hi_mul=0.45):
    """代码合成的厅堂冲激响应：早期反射几下 + 去相关噪声尾巴，低频衰得慢、高频衰得快"""
    n = int(rt60 * 1.3 * SR); t = np.arange(n) / SR; rng = np.random.default_rng(seed)
    nz = rng.standard_normal((n, 2))
    lo = sosfilt(biquad('lp', 300), nz, axis=0); hi = sosfilt(biquad('hp', 4000), nz, axis=0); mid = nz - lo - hi
    env = lambda r: (10 ** (-3 * t / r))[:, None]
    tail = lo * env(rt60 * lo_mul) + mid * env(rt60) + hi * env(rt60 * hi_mul)
    tail *= np.minimum(1, t / 0.03)[:, None]  # 尾巴 30 ms 长起来
    for k in range(14):  # 早期反射
        d = int(SR * rng.uniform(0.004, 0.07)); tail[d, rng.integers(2)] += rng.uniform(0.3, 0.9) * (1 - d / (0.08 * SR)) * 8
    ir = np.concatenate([np.zeros((int(pre * SR), 2)), tail])
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def _wav(f):
    r, d = wavfile.read(f); d = d.astype(np.float64)
    if d.ndim == 1: d = np.stack([d, d], 1)
    return resample_poly(d[:, :2], SR, r, axis=0) if r != SR else d[:, :2]


def load_ir(spec):
    """返回 (左输入的响应, 右输入的响应)，各是立体声。file=单个立体声文件；l/r=真立体声成对文件；都没有就合成"""
    if 'l' in spec: a, b = _wav(spec['l']), _wav(spec['r'])
    elif 'file' in spec: a = _wav(spec['file']); b = a[:, ::-1]
    else: a = synth_ir(**spec); b = a[:, ::-1]
    pad = np.zeros((int(spec.get('pre', 0) * SR), 2)) if ('l' in spec or 'file' in spec) else np.zeros((0, 2))
    a, b = np.concatenate([pad, a]), np.concatenate([pad, b])
    k = np.sqrt((np.sum(a ** 2) + np.sum(b ** 2)) / 2); return a / k, b / k


def convolve(x, ir):
    a, b = ir; n = len(x)
    L = fftconvolve(x[:, 0], a[:, 0])[:n] + fftconvolve(x[:, 1], b[:, 0])[:n]
    R = fftconvolve(x[:, 0], a[:, 1])[:n] + fftconvolve(x[:, 1], b[:, 1])[:n]
    return np.stack([L, R], 1)


K = [biquad('high', 1681.97, 4.0, 0.7072), biquad('hp', 38.13, 0, 0.5003)]


def lufs(x):
    """BS.1770 积分响度（门限 -70 / 相对 -10）"""
    y = x
    for s in K: y = sosfilt(s, y, axis=0)
    hop, win = int(0.1 * SR), int(0.4 * SR)
    if len(y) < win: return -70.
    ms = np.array([np.mean(np.sum(y[i:i + win] ** 2, 1)) for i in range(0, len(y) - win + 1, hop)])
    l = -0.691 + 10 * np.log10(ms + 1e-12); g = l > -70
    if not g.any(): return -70.
    rel = -0.691 + 10 * np.log10(ms[g].mean()) - 10; g &= l > rel
    return -0.691 + 10 * np.log10(ms[g].mean())


def limiter(x, ceil=-1.5, rel=80, la=5):
    """前瞻限幅：按 4 倍过采样的峰值算要压多少，提前 la 毫秒平滑压下去，release 毫秒放回来"""
    B = 16; c = un(ceil); m = len(x) // B + 1
    pk = np.abs(resample_poly(np.pad(x, ((0, m * B - len(x)), (0, 0))), 4, 1, axis=0)).reshape(m, B * 4, 2).max(axis=(1, 2))
    req = np.minimum(1, c / np.maximum(pk, 1e-9)); L = max(1, int(la / 1000 * SR / B))
    h = minimum_filter1d(req, 2 * L + 1); h = np.minimum(uniform_filter1d(h, L), req)
    ar = np.exp(-B / (SR * rel / 1000)); g = np.empty(m); y = 1.
    for i, v in enumerate(h): y = v if v < y else ar * y + (1 - ar) * v; g[i] = y
    out = x * np.interp(np.arange(len(x)), np.arange(m) * B + B / 2, g)[:, None]
    return np.clip(out, -c, c), db(g.min())


def region_gain(x, regions, ref_rel, ramp=0.06):
    """每段乘一个增益，让各段相对响度对上参考版；在段落边界前 ramp 秒内过渡"""
    rel = [lufs(x[int(a * SR):int(b * SR)]) for a, b in zip(regions, regions[1:])]
    d = [r - (m - rel[1]) for r, m in zip(ref_rel, rel)]
    env = np.full(len(x), un(d[0]))
    for k, b in enumerate(regions[1:-1], 1):
        i0, i1 = int((b - ramp) * SR), int((b - 0.01) * SR)
        env[i0:i1] = np.linspace(un(d[k - 1]), un(d[k]), i1 - i0); env[i1:] = un(d[k])
    return x * env[:, None], d


def read(f):
    r, d = wavfile.read(f); assert r == SR, f
    return d.astype(np.float64) / (32768 if d.dtype == np.int16 else 1)


def main(cfg_path):
    here = os.path.dirname(os.path.abspath(cfg_path)); P = lambda p: os.path.join(here, p)
    M = runpy.run_path(cfg_path)['MIX']
    tracks = {nm: read(P(f"{M['stems']}/{nm}.wav")) for nm in M['tracks']}
    n = max(len(v) for v in tracks.values())
    RV = M['reverbs']; bus = np.zeros((n, 2)); rev = {k: np.zeros((n, 2)) for k in RV}
    for nm, t in M['tracks'].items():
        x = np.pad(tracks[nm], ((0, n - len(tracks[nm])), (0, 0))) * un(t.get('gain', 0))
        x = eq(x, t.get('eq', []))
        if 'comp' in t: x, gmin, gav = comp(x, **t['comp']); print(f'  {nm:8s} 压缩 最多 {gmin:5.1f} dB 平均 {gav:5.1f} dB')
        if 'par' in t:  # 并行压缩：重压一份混回去
            p, _, _ = comp(x, **t['par']['comp']); x = x + eq(p, t['par'].get('eq', [])) * un(t['par'].get('gain', -6))
        if 'sat' in t: x = sat(x, **t['sat'])
        x = eq(x, t.get('eq2', []))
        x = width(x, t.get('width', 1), t.get('bal', 0))
        bus += x
        for k, v in t.get('send', {}).items(): rev[k] += x * un(v)
        print(f'  {nm:8s} {lufs(x):6.1f} LUFS  峰值 {db(np.abs(x).max()):5.1f} dB')
    for k, R in RV.items():
        wet = convolve(eq(rev[k], R.get('eq', [('hp', 250), ('lp', 7000)])), load_ir(R['ir'])) * un(R.get('ret', 0))
        bus += wet; print(f'  混响 {k:6s} {lufs(wet):6.1f} LUFS')
    Mb = M['master']
    x = eq(bus, Mb.get('eq', []))
    if 'comp' in Mb: x, gmin, gav = comp(x, **Mb['comp']); print(f'  总线压缩 最多 {gmin:5.1f} dB 平均 {gav:5.1f} dB')
    x = eq(x, Mb.get('eq2', []))
    regs = M['regions']
    ref = read(P(M['ref']))
    rr = [lufs(ref[int(a * SR):int(b * SR)]) for a, b in zip(regs, regs[1:])]; ref_rel = [r - rr[1] for r in rr]
    target, ceil = M.get('lufs', -16), Mb.get('ceil', -1.5)
    corr = 0.
    for it in range(3):  # 限幅会拉低整体响度，补回去再限一次
        y, d = region_gain(x, regs, ref_rel)
        y *= un(target - lufs(y) + corr)
        y, gmin = limiter(y, ceil, Mb.get('rel', 80))
        corr += target - lufs(y)
    fade = M.get('fade', 3); y[-int(fade * SR):] *= np.linspace(1, 0, int(fade * SR))[:, None]
    out = P(M['out']); wavfile.write(out, SR, (y * 32767).astype(np.int16))
    got = [lufs(y[int(a * SR):int(b * SR)]) for a, b in zip(regs, regs[1:])]
    print(f'  限幅最多 {gmin:.1f} dB  整体 {lufs(y):.1f} LUFS  峰值 {db(np.abs(y).max()):.1f} dB')
    print('  各段相对（参考 / 现在）：' + '  '.join(f'{a}s {r:+.1f}/{g - got[1]:+.1f}' for a, r, g in zip(regs, ref_rel, got)))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-b:a', '256k', out[:-4] + '.mp3'])
    print('→', out)


if __name__ == '__main__':
    main(sys.argv[1])
