# 《一滴墨》的混音配置：python -I tools/mixdesk.py music/mix.py（路径相对本文件）
# 先渲分轨和参考版：node tools/audio.mjs --stems
# eq 每项：('hp'|'lp', 频率) 或 ('peak'|'low'|'high', 频率, dB, Q)；分轨渲染时留了 -6 dB 余量，gain 先补回来
import os
MIX = dict(
    stems='../out/stems', out='../out/yidimo_mix.wav',
    ref='../out/yidimo_ref.wav', regions=[0, 16, 32, 40, 48, 64, 91],  # 各段相对响度对齐乐谱自带的总线版
    tracks=dict(
        drums=dict(gain=6,
                   eq=[('hp', 32), ('peak', 62, 3, 1.1), ('peak', 380, -4, 1.3), ('peak', 4500, 2, 0.9), ('high', 9000, 1.5)],
                   comp=dict(thr=-16, ratio=3, att=12, rel=120, makeup=2),
                   par=dict(comp=dict(thr=-30, ratio=8, att=2, rel=80, makeup=14), eq=[('lp', 9000)], gain=-9),
                   sat=dict(drive=4, mix=0.35), send=dict(room=-14, hall=-28)),
        strings=dict(gain=6, eq=[('hp', 70), ('peak', 300, -1.5, 1), ('high', 9000, 2)],
                     comp=dict(thr=-20, ratio=2, att=30, rel=250, rms=True), send=dict(hall=-9), width=1.15),
        guitar=dict(gain=6, eq=[('hp', 90), ('peak', 250, -3, 1.2), ('peak', 1600, 1.5, 1), ('lp', 7500)],
                    sat=dict(drive=3, mix=0.5), send=dict(room=-20, hall=-24)),
        bass=dict(gain=6, eq=[('hp', 35), ('peak', 90, 1.5, 1), ('peak', 800, 2, 1.2)],
                  comp=dict(thr=-22, ratio=4, att=8, rel=120), sat=dict(drive=8, mix=0.4), eq2=[('lp', 4500)], width=0.3),
        brass=dict(gain=6, eq=[('hp', 60), ('peak', 250, -2, 1), ('high', 5000, -3)],
                   comp=dict(thr=-24, ratio=2, att=40, rel=300, rms=True), send=dict(hall=-5)),
    ),
    # hall：设了 HALL_IR 就用真实厅堂 IR（成片用的是 Samplicity 免费库 https://samplicity.com/bricasti-m7-impulse-responses/ 里 Bricasti M7 的「1 Halls 10 Concert Hall, 44K L.wav」），没设就代码合成
    # room：代码合成的短房间
    reverbs=dict(hall=dict(ir=dict(file=os.environ['HALL_IR'], pre=0.015) if os.environ.get('HALL_IR') else dict(rt60=2.4, pre=0.02), eq=[('hp', 250), ('lp', 7500)], ret=0),
                 room=dict(ir=dict(rt60=0.7, pre=0.004, lo_mul=1.0, hi_mul=0.6), eq=[('hp', 200), ('lp', 9000)], ret=0)),
    master=dict(eq=[('hp', 25)],
                comp=dict(thr=-14, ratio=2, att=30, rel=200, rms=True, sc_hp=120),
                eq2=[('low', 90, 0.5), ('high', 11000, 1)], ceil=-1.5, rel=80),
    lufs=-16, fade=3,
)
