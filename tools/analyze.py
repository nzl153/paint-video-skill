# 节拍、小节能量、段落边界。只用 numpy/scipy/matplotlib，ffmpeg 解码。
# 用法：python analyze.py <音频文件> [输出目录]  →  beats.json + energy.png
import subprocess, numpy as np, json, os, sys
from scipy.signal import stft, find_peaks
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
SR = 22050
AUDIO = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else '.'
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', AUDIO,
                      '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
y = np.frombuffer(raw, np.float32); dur = len(y) / SR
HOP = 512
f, t, Z = stft(y, SR, nperseg=2048, noverlap=2048 - HOP)
M = np.log1p(np.abs(Z) * 100)
flux = np.maximum(0, np.diff(M, axis=1)).sum(0); flux = np.r_[0, flux]
flux = (flux - flux.mean()) / flux.std()
fps = SR / HOP
# 速度：起音包络自相关，60–180 BPM
ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
lags = np.arange(len(ac)); bpm_l = 60 * fps / np.maximum(lags, 1)
ok = (bpm_l > 60) & (bpm_l < 180)
lag = lags[ok][np.argmax(ac[ok])]; bpm = 60 * fps / lag
# 细化并找相位
best = None
for b in np.linspace(bpm - 2, bpm + 2, 81):
    per = 60 / b * fps
    for ph in np.linspace(0, per, 40, endpoint=False):
        idx = (np.arange(ph, len(flux), per)).astype(int)
        sc = flux[idx].mean()
        if best is None or sc > best[0]: best = (sc, b, ph)
_, bpm, ph = best
beats = np.arange(ph, len(flux), 60 / bpm * fps) / fps
# 每拍能量与低频（鼓）能量
rms = np.sqrt(np.convolve(y ** 2, np.ones(HOP) / HOP, 'same'))[::HOP]
low = np.abs(Z[(f < 150)]).sum(0); high = np.abs(Z[(f > 2000)]).sum(0)
def per_beat(x):
    return np.array([x[int(a * fps):int(b * fps)].mean() for a, b in zip(beats[:-1], beats[1:])])
e_b, l_b, h_b = per_beat(rms[:len(flux)]), per_beat(low), per_beat(high)
# 段落：按 4 小节（16 拍）块比较特征，新奇度峰值当边界
feat = np.log1p(np.abs(Z[:200]))
seg = []
blk = 8  # 8 拍 = 2 小节
bt = beats
for i in range(0, len(bt) - blk, blk):
    a, b = int(bt[i] * fps), int(bt[i + blk] * fps)
    seg.append(np.r_[feat[:, a:b].mean(1), np.log(l_b[i:i + blk].mean() + 1e-6), np.log(e_b[i:i + blk].mean() + 1e-6) * 5])
seg = np.array(seg); seg = (seg - seg.mean(0)) / (seg.std(0) + 1e-6)
nov = np.r_[0, np.linalg.norm(np.diff(seg, axis=0), axis=1)]
pk, _ = find_peaks(nov, distance=3, prominence=nov.std() * .6)
bounds = [round(float(bt[p * blk]), 2) for p in pk]
print(f'时长 {dur:.2f}s  BPM {bpm:.2f}  首拍 {beats[0]:.3f}s  拍数 {len(beats)}')
print('段落边界(秒):', bounds)
print('每 2 小节能量（秒: 能量 / 低频）:')
for i in range(0, len(bt) - blk, blk):
    print(f'  {bt[i]:6.2f}  {e_b[i:i+blk].mean()*100:5.1f}  {np.log1p(l_b[i:i+blk].mean()):5.2f}  {np.log1p(h_b[i:i+blk].mean()):5.2f}')
json.dump({'bpm': bpm, 'beats': [round(float(b), 3) for b in beats], 'bounds': bounds, 'duration': dur},
          open(os.path.join(OUT, 'beats.json'), 'w'), indent=1)
fig, ax = plt.subplots(3, 1, figsize=(18, 7), sharex=True)
tt = np.arange(len(rms)) * HOP / SR
ax[0].plot(tt, rms, lw=.5); ax[0].set_ylabel('rms')
ax[1].plot(t, np.log1p(low), lw=.5, c='brown'); ax[1].set_ylabel('low<150')
ax[2].plot(t, np.log1p(high), lw=.5, c='teal'); ax[2].set_ylabel('high>2k')
for a in ax:
    for b in bounds: a.axvline(b, c='r', lw=1)
ax[2].set_xticks(np.arange(0, dur, 5)); ax[2].grid(axis='x', alpha=.3)
plt.tight_layout(); plt.savefig(os.path.join(OUT, 'energy.png'), dpi=80)

