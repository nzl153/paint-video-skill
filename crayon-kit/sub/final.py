# 整片字幕层：每帧一张透明 PNG（可续跑），再叠到成片上
import json, os, sys, subprocess, shutil
from multiprocessing import Pool
from PIL import Image
from sub import render

FPS = 24
V = sys.argv[sys.argv.index('--base') + 1] if '--base' in sys.argv else '../out/video.mp4'
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else '../out/video_sub.mp4'
N = len([f for f in os.listdir('../out/frames') if f.endswith('.jpg')])
S = json.load(open('specs.json', encoding='utf-8'))
os.makedirs('ov_full', exist_ok=True)
BLANK = 'ov_full/blank.png'

def active(t):
    return any(b.get('t0', s['t0']) - .05 <= t <= b.get('t1', s['t1']) + .05 for s in S for b in s['blocks'])

def job(i):
    p = f'ov_full/o{i:05d}.png'
    if os.path.exists(p) and os.path.getsize(p) > 0: return
    t = i / FPS
    if not active(t): shutil.copyfile(BLANK, p); return
    render(t, S).save(p + '.tmp.png'); os.replace(p + '.tmp.png', p)

if __name__ == '__main__':
    if not os.path.exists(BLANK): Image.new('RGBA', (1920, 1080), (0, 0, 0, 0)).save(BLANK)
    with Pool(6) as pool:
        for k, _ in enumerate(pool.imap_unordered(job, range(N), chunksize=8)):
            if k % 500 == 0: print(k, flush=True)
    miss = [i for i in range(N) if not os.path.exists(f'ov_full/o{i:05d}.png')]
    print('missing', len(miss))
    if not miss and '--encode' in sys.argv:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', V, '-framerate', str(FPS), '-i', 'ov_full/o%05d.png',
                        '-filter_complex', '[0:v][1:v]overlay=0:0:shortest=1,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium',
                        '-color_range', 'tv', '-movflags', '+faststart', '-c:a', 'copy', OUT], check=True)
        print('wrote', OUT)
