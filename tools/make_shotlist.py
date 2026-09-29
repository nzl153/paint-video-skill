# 逐镜表：每镜用拍号写起止，换算成秒，生成 SHOTLIST.md（给人看）和 src/shotlist_data.js（给代码读）
# 用法：改下面的 BPM/OFF/DUR 和 S，在项目根目录跑 python make_shotlist.py
# 拍号 b → 秒：OFF + b * 60/BPM。BPM 和 OFF（第 0 拍的时刻）来自 analyze.py 的 beats.json
import json, os
BPM, OFF, DUR = 68, .45, 149.57
BT = lambda b: OFF + b * 60 / BPM
END = (DUR - OFF) * BPM / 60

C1 = [49.5, 53.5, 57.5, 61, 65.5]                              # 例：副歌每句的起点（弱起的句子从半拍开始）
C2 = [b + 64 for b in C1]                                      # 例：副歌第二遍整体晚 64 拍

S = [
    # 段落, b0, b1, 景别, 画面
    ('前奏', 0, 16, '全景', '白纸上蜡笔一层层画出小镇，最后推向一扇窗'),
    ('主歌', 16, 36, '全景', '……'),
    # 一镜分成几格、最后一格落在重拍上时，切点往后挪半拍（40.6 而不是 40），否则那格一帧都不显示
    ('预副歌', 36, 40.6, '分格', '三格一拍砸下来一格'),
    ('预副歌', 40.6, 49.5, '特写', '……'),
    ('副歌一', C1[0], C1[1], '全景', '……'),
    # ……
    ('尾奏', C1[1], END, '拉远', '……'),
]

root = os.path.dirname(os.path.abspath(__file__))
rows = []
for i, (sec, b0, b1, size, desc) in enumerate(S, 1):
    rows.append({'n': i, 'sec': sec, 'b0': b0, 'b1': b1, 't0': round(BT(b0) if b0 else 0, 3), 't1': round(min(BT(b1), DUR), 3), 'size': size, 'desc': desc})
for a, b in zip(rows, rows[1:]): assert a['b1'] == b['b0'], (a, b)

# 体检：镜头长度分布
lens = [r['t1'] - r['t0'] for r in rows]
print(f'{len(rows)} 镜，最短 {min(lens):.2f}s，最长 {max(lens):.2f}s，平均 {sum(lens) / len(lens):.2f}s')

with open(os.path.join(root, 'SHOTLIST.md'), 'w', encoding='utf-8') as f:
    f.write(f'# 逐镜表\n\n由 `make_shotlist.py` 生成。{BPM} BPM，拍号 b → 秒 = {OFF} + b × {60 / BPM:.3f}。\n\n')
    f.write('| 镜 | 段落 | 拍 | 秒 | 景别 | 画面 |\n|---|---|---|---|---|---|\n')
    for r in rows: f.write(f"| {r['n']} | {r['sec']} | {r['b0']}–{r['b1']:.4g} | {r['t0']:.2f}–{r['t1']:.2f} | {r['size']} | {r['desc']} |\n")
os.makedirs(os.path.join(root, 'src'), exist_ok=True)
with open(os.path.join(root, 'src', 'shotlist_data.js'), 'w', encoding='utf-8') as f:
    f.write('// 由 make_shotlist.py 生成，别手改\n')
    f.write('const SHOTLIST = ' + json.dumps([{k: r[k] for k in ('n', 'b0', 'b1', 't0', 't1')} for r in rows]) + ';\n')
    f.write('const S = n => SHOTLIST[n - 1];\n')
