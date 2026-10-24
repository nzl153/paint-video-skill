# Sound design for the relay: hooves, a soft turn of the page on every change of style,
# a shutter for Muybridge, room tone at the counter, and the bite. Mixed under the score.
# python -I music/sfx.py  (run from the project root) -> out/sfx.wav, out/mix.wav
import subprocess
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
BEAT = 0.6
DUR = 43 * BEAT + 0.1
rng = np.random.default_rng(13)
out = np.zeros(int(SR * DUR))

# Kept in step with engine/timeline.mjs.
INTRO, BITE = 6, 39
STEPS = [0] + [INTRO + i for i in range(12)] + [18 + i * 0.5 for i in range(12)] + [24, 25] + [26 + i for i in range(8)] + [34, 35]
LEG_OFF = [0.0, 0.36, 0.11, 0.47]


def band(x, lo, hi):
    return sosfilt(butter(4, [lo, hi], 'band', fs=SR, output='sos'), x)


def add(t0, x):
    i = int(t0 * SR)
    if i >= len(out):
        return
    out[i:i + len(x)] += x[: len(out) - i]


def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(1, t / attack) * np.exp(-t * decay)


# Hooves: a dull thud on dirt for every footfall; tiny and woody in the bakery (gingerbread on paper).
for beat in range(43):
    for k, off in enumerate(LEG_OFF):
        t0 = (beat + off) * BEAT
        if t0 >= DUR - 0.2:
            continue
        bakery = beat < INTRO or beat >= 34
        if bakery:
            m = int(SR * 0.05)
            tick = band(rng.uniform(-1, 1, m), 1800, 5000) * env(m, 0.001, 90)
            add(t0, tick * (0.05 if beat < INTRO else 0.035) * min(1, (beat + 1) / 4))
        else:
            m = int(SR * 0.12)
            tt = np.arange(m) / SR
            thud = np.sin(2 * np.pi * (80 + 40 * np.exp(-tt * 40)) * tt) * env(m, 0.002, 30)
            grit = band(rng.uniform(-1, 1, m), 300, 2500) * env(m, 0.001, 60)
            add(t0, (thud * 0.16 + grit * 0.05) * (0.8 + 0.2 * (k % 2)))

# Every change of style in the hole: a short whip of air that rises into a snap, with a low thump
# under it. The ring catching up a beat later gets a lighter, shorter one.
def whip(length, gain, thump):
    n = int(SR * length)
    t = np.arange(n) / SR
    k = t / length
    x = rng.normal(0, 1, n)
    y = np.zeros(n)
    blocks = 10
    for bi in range(blocks):
        a, e = bi * n // blocks, (bi + 1) * n // blocks
        c = 800 * (8 ** ((bi + 0.5) / blocks))
        y[a:e] = band(x[max(0, a - 600):e], c * 0.6, min(c * 1.7, 18000))[-(e - a):]
    sig = y * (k ** 1.5) * np.minimum(1, (1 - k) / 0.08) * gain
    m = int(SR * 0.006)
    snap = band(rng.uniform(-1, 1, m), 2000, 12000) * np.linspace(1, 0, m) * gain * 2.2
    sig[-m:] += snap
    m2 = int(SR * 0.14)
    tt = np.arange(m2) / SR
    low = np.sin(2 * np.pi * (70 + 60 * np.exp(-tt * 35)) * tt) * np.exp(-tt * 20) * thump
    return sig, low


for i, sb in enumerate(STEPS[1:], 1):
    fast = 18 <= sb < 24
    sig, low = whip(0.07 if fast else 0.11, 0.22, 0.32)
    add(sb * BEAT - len(sig) / SR, sig)
    add(sb * BEAT, low)
    if i + 1 < len(STEPS) and STEPS[i + 1] != sb:
        sig2, _ = whip(0.05, 0.1, 0)
        add(STEPS[i + 1] * BEAT + 0.015 - len(sig2) / SR * 0.3, sig2 * 0.8)

# Muybridge: the shutter, a click and a clack.
for dt, g in ((0, 0.25), (0.045, 0.18)):
    m = int(SR * 0.03)
    add(24 * BEAT + dt, band(rng.uniform(-1, 1, m), 1500, 8000) * env(m, 0.0005, 160) * g)

# Room tone at the counter.
for t0, t1 in ((0, 6 * BEAT + 0.3), (34 * BEAT, DUR)):
    n = int(SR * (t1 - t0))
    x = band(rng.normal(0, 1, n), 80, 1400) * 0.02
    tt = np.arange(n) / SR
    add(t0, x * np.minimum(1, tt / 0.6) * np.minimum(1, (tt[-1] - tt) / 0.8))

# The bite.
T = BITE * BEAT
for k in range(9):
    m = int(SR * rng.uniform(0.02, 0.05))
    add(T + k * 0.022 + rng.uniform(0, 0.01), band(rng.uniform(-1, 1, m), 1500, 9000) * env(m, 0.0005, 70) * (0.5 - 0.035 * k))
m = int(SR * 0.28)
add(T + 0.05, band(rng.normal(0, 1, m), 400, 3500) * env(m, 0.002, 14) * 0.18)
m = int(SR * 0.15)
tt = np.arange(m) / SR
add(T, np.sin(2 * np.pi * (90 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 18) * 0.3)
for k in range(14):
    m = int(SR * 0.012)
    add(T + 0.25 + rng.uniform(0, 0.6), band(rng.uniform(-1, 1, m), 2500, 10000) * env(m, 0.0005, 300) * rng.uniform(0.04, 0.12))

out = out / max(1e-6, np.abs(out).max()) * 0.5
wavfile.write('out/sfx.wav', SR, (out * 32767).astype(np.int16))
# Two-pass loudnorm in linear mode: one gain for the whole film, so the quiet opening stays quiet.
import json
pre = '[1:a]volume=0.75[s];[0:a][s]amix=inputs=2:normalize=0,alimiter=limit=0.89'
probe = subprocess.run(['ffmpeg', '-v', 'info', '-i', 'out/music.wav', '-i', 'out/sfx.wav', '-filter_complex',
                        pre + ',loudnorm=I=-16:TP=-1.5:LRA=20:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
m = json.loads(probe[probe.rindex('{'):probe.rindex('}') + 1])
ln = (f"loudnorm=I=-16:TP=-1.5:LRA=20:linear=true:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
      f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}")
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', 'out/music.wav', '-i', 'out/sfx.wav', '-filter_complex', pre + ',' + ln,
                '-ar', '44100', 'out/mix.wav'], check=True)
print('-> out/sfx.wav, out/mix.wav')
