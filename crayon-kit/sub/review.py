# 审稿图：每句取三个时刻（前半句刚写完 / 两列都在 / 快退场），字幕叠在成片帧上，12 张一页
import json, os, sys
from PIL import Image, ImageDraw
from sub import render
FR = '../out/frames/f%05d.jpg'
S = json.load(open('specs.json', encoding='utf-8'))
ks = [int(x) for x in sys.argv[1].split(',')] if len(sys.argv) > 1 else range(len(S))
tag = sys.argv[2] if len(sys.argv) > 2 else 'rev'
def shot(k, t):
    im = Image.open(FR % int(round(t * 24))).convert('RGBA')
    im = Image.alpha_composite(im, render(t, S)).convert('RGB').resize((640, 360))
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 96, 18], fill='black'); d.text((4, 3), f'{k} @{t:.2f}', fill='white'); return im
ims = []
os.makedirs('../out/check', exist_ok=True)
for k in ks:
    s = S[k]; b = s['blocks']
    ims += [shot(k, b[0].get('t0', s['t0']) + 1.0), shot(k, (b[-1]['t0'] + s['t1']) / 2 + .5), shot(k, s['t1'] + .1)]
for g in range(0, len(ims), 12):
    part = ims[g:g + 12]; sh = Image.new('RGB', (1920, 360 * ((len(part) + 2) // 3)))
    for i, im in enumerate(part): sh.paste(im, ((i % 3) * 640, (i // 3) * 360))
    sh.save(f'../out/check/{tag}_{g // 12}.jpg', quality=85)
print('ok')
