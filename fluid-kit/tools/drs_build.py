# DRSKit 13 轨 → 每件鼓一组立体声单下击打 + index.json（按力度排序）
# python -I tools/drs_build.py <解压后的 DRSKit 目录> samples/drs
# 近距麦只定极性（不挪时间，保留真实麦距），再按固定声像和电平混成立体声
import sys, os, re, json, numpy as np
from scipy.io import wavfile
import warnings; warnings.filterwarnings('ignore')
src, dst = sys.argv[1], sys.argv[2]
CH = ['AmbL','AmbR','Hihat','Kdrum_back','Kdrum_front','OHL','OHR','Ride','Snare_bottom','Snare_top','Tom1','Tom2','Tom3']
# 声像按鼓手视角：踩镲在左，叮叮镲和落地嗵鼓在右
MIX = {'AmbL': (-8, -1), 'AmbR': (-8, 1), 'OHL': (-4, -1), 'OHR': (-4, 1), 'Hihat': (-3, -0.5), 'Ride': (-6, 0.5),
       'Kdrum_back': (0, 0), 'Kdrum_front': (-2, 0), 'Snare_top': (0, 0), 'Snare_bottom': (-6, 0),
       'Tom1': (0, -0.25), 'Tom2': (0, 0.2), 'Tom3': (0, 0.5)}
CLOSE = {'Kdrum_without_contact': ['Kdrum_back', 'Kdrum_front'], 'Snare': ['Snare_top', 'Snare_bottom'], 'Snare_rim': ['Snare_top', 'Snare_bottom'],
         'Tom1': ['Tom1'], 'Tom2': ['Tom2'], 'Tom3': ['Tom3'], 'Hihat_closed': ['Hihat'], 'Hihat_open': ['Hihat'], 'Hihat_semi_open': ['Hihat'],
         'Hihat_foot': ['Hihat'], 'Ride_tip': ['Ride'], 'Ride_tip_bell': ['Ride'],
         'Crash_left_shank': [], 'Crash_left_tip': [], 'Crash_right_shank': [], 'Crash_right_tip': []}
OUT = {'Kdrum_without_contact': 'kick', 'Snare': 'snare', 'Snare_rim': 'rim', 'Tom1': 'tom1', 'Tom2': 'tom2', 'Tom3': 'tom3',
       'Hihat_closed': 'hat', 'Hihat_open': 'hatopen', 'Hihat_semi_open': 'hatsemi', 'Hihat_foot': 'hatfoot', 'Ride_tip': 'ride', 'Ride_tip_bell': 'bell',
       'Crash_left_shank': 'crashL', 'Crash_left_tip': 'crashLtip', 'Crash_right_shank': 'crashR', 'Crash_right_tip': 'crashRtip'}

from scipy.signal import butter, sosfilt
LP = butter(4, 300, 'low', fs=44100, output='sos')
def align(ref, x):
    # 不挪时间（保留真实麦距），只定极性：取和头顶麦相加后 300Hz 以下更厚的那个
    n = min(len(ref), len(x), 4410)
    e = {s: float(np.sum(sosfilt(LP, ref[:n] + s * x[:n]) ** 2)) for s in (1, -1)}
    s = max(e, key=e.get); return 0, s, 10 * np.log10(e[s] / e[-s])

idx = {}
for inst, name in OUT.items():
    xml = open(f'{src}/{inst}/{inst}.xml').read()
    hits = [(float(p), f) for p, f in re.findall(r'<sample name="[^"]+" power="([\d.e-]+)">\s*<audiofile channel="AmbL" file="([^"]+)"', xml)]
    hits.sort()
    loud = wavfile.read(f'{src}/{inst}/{hits[-1][1]}')[1]
    ohm = loud[:, CH.index('OHL')] + loud[:, CH.index('OHR')]
    ohm = ohm * 10 ** (-4 / 20)
    fix = {}
    for c in CLOSE[inst]:
        L, s, gain = align(ohm, loud[:, CH.index(c)]); fix[c] = (L, s); ohm = ohm + s * loud[:, CH.index(c)] * 10 ** (MIX[c][0] / 20); print(f'{name:9s} {c:13s} sign {s:+.0f}  +{gain:.1f} dB LF')
    outs = []
    for p, f in hits:
        d = wavfile.read(f'{src}/{inst}/{f}')[1].astype(np.float64)
        st = np.zeros((len(d) + 200, 2))
        for i, c in enumerate(CH):
            g, pan = MIX[c]; x = d[:, i] * 10 ** (g / 20)
            L, s = fix.get(c, (0, 1)); x = s * np.concatenate([np.zeros(L), x, np.zeros(200 - L)])
            a = (pan + 1) * np.pi / 4; st[:, 0] += x * np.cos(a); st[:, 1] += x * np.sin(a)
        outs.append((p, st))
    peak = max(np.abs(st).max() for _, st in outs); g = 10 ** (-1 / 20) / peak
    os.makedirs(f'{dst}/{name}', exist_ok=True); lst = []
    for k, (p, st) in enumerate(outs):
        st *= g; env = np.abs(st).max(1)
        last = np.nonzero(env > 10 ** (-70 / 20))[0]; end = min(len(st), (last[-1] if len(last) else 0) + 2205)
        st = st[:end]; fl = min(2205, end); st[-fl:] *= np.linspace(1, 0, fl)[:, None]
        fn = f'{k + 1:02d}.wav'; wavfile.write(f'{dst}/{name}/{fn}', 44100, (st * 32767).astype(np.int16))
        lst.append({'f': fn, 'p': p, 'pk': round(float(20 * np.log10(np.abs(st).max() + 1e-9)), 1)})
    idx[name] = lst; print(name, len(lst), 'hits, pk', lst[0]['pk'], '→', lst[-1]['pk'], 'dB')
json.dump(idx, open(f'{dst}/index.json', 'w'), indent=0)
open(f'{dst}/README.txt', 'w', encoding='utf-8').write('DRSKit 2.1 by the DrumGizmo team (Deva & Lars Muldjord), drsdrums.dk. CC BY 4.0. 13 轨混成立体声，脚本 tools/drs_build.py\n')
