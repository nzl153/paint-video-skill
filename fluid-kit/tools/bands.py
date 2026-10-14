# 各段落的响度和四个频段的能量对比：python -I tools/bands.py a.wav b.wav ...
import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
import warnings; warnings.filterwarnings('ignore')
SEC = [0, 16, 32, 40, 48, 64, 80, 91]
B = {'low<120': butter(4, 120, 'low', fs=44100, output='sos'), 'mid150-1k': butter(4, [150, 1000], 'band', fs=44100, output='sos'),
     'pres2-5k': butter(4, [2000, 5000], 'band', fs=44100, output='sos'), 'hi>7k': butter(4, 7000, 'high', fs=44100, output='sos')}
for f in sys.argv[1:]:
    r, d = wavfile.read(f); x = d.astype(np.float64).mean(1) / 32768
    print(f)
    fb = {k: sosfilt(s, x) for k, s in B.items()}
    for a, b in zip(SEC, SEC[1:]):
        seg = slice(a * r, b * r); rms = lambda y: 10 * np.log10(np.mean(y[seg] ** 2) + 1e-12)
        print(f'  {a:2d}-{b:2d}s  all {rms(x):6.1f}  ' + '  '.join(f'{k} {rms(v):6.1f}' for k, v in fb.items()))
