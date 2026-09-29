# paint-video

让 AI agent 用代码画手绘动画短片和 MV 的 skill。

每一帧都是时间 t 的纯函数：用笔刷一笔一笔画出来，无头 Chrome 并行渲染成图片，ffmpeg 合成 MP4。画面里没有一张 AI 生图，全是代码画的。skill 里写的是做片子的整套方法和踩过的坑，agent 读了就能从一句话需求做到成片。

## 用它做的片子

### 《呆头鸟》· 蜡笔绘本 MV

2 分 29 秒，36 个镜头。油画棒蜡笔加连环画分格，江南小镇从清晨到夜里，男主一慌就「噗」地变成一只呆头鸟。从剧本到带字幕的成片不到 2 小时。

![呆头鸟](docs/daitouniao.webp)

<details>
<summary>全片一览</summary>

![呆头鸟全片](docs/daitouniao_sheet.jpg)

</details>

### 《琵琶曲》· 水彩 MV

2 分 09 秒，39 个镜头。丰子恺式的笔刷小人，不画五官；灯会一段换成剪影配暖光，结尾拉远成一幅画卷。

![琵琶曲](docs/pipa.webp)

<details>
<summary>全片一览</summary>

![琵琶曲全片](docs/pipa_sheet.jpg)

</details>

### 《落款》· 水墨短片

16.8 秒。一滴墨落成远山，小红块走到哪里，芦苇和河就画到哪里，最后坐下成了整幅画的印。场景代码在 `examples/brush/ink.js`。

![落款](docs/luokuan.webp)

### 《拾星》· 水彩短片

14.5 秒，第一支测试片。Clawd 捧着空罐子接住掉下来的星星，一罐星光把夜色一点点焐暖。场景代码在 `examples/brush/stars.js`。

![拾星](docs/shixing.webp)

两部 MV 的歌有版权，仓库里不带音频和歌词，上面的预览都是无声画面。

## 它教给 agent 什么

- **两套画风引擎**
  - 水彩、水墨、版画：p5.js + p5.brush，基于 [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase)，每帧约 1 秒。
  - 蜡笔绘本：本仓库自写的 2D canvas 引擎 `crayon-kit/`，每帧 10–50ms。
- **做片子的规矩**：每个镜头只让观众看一件事、先有原因再有反应；给「看懂」留时间；每个接缝都有转场；画面不写字；丰富但不廉价，不撒火花填空。
- **检查循环**：每做完一个镜头就渲出联系表、连续帧、局部放大图，用读图工具自己看，查瞬移、悬空的手、朝向、道具挡脸、颜色发脏。只读代码看不出动画好不好。
- **整首歌的 MV 流程**：节拍分析 → 用拍号写逐镜表（改剪辑只改一处）→ 先便宜地试风格 → 零件库 → 分批做、每批自检 → 局部返修 → ffmpeg 调色。
- **歌词字幕**：单独一层透明 PNG 叠上去，竖排、按半句出。蜡笔版的字也有纸纹、会随画面抖动；用「探针」记下每帧人物实际画在哪里，自动排版避开人物。
- **反面教材**：一支规矩全守却没戏的测试片，逐条写了为什么没戏。

## 目录

| 路径 | 内容 |
|---|---|
| `paint-video/` | skill 本体。`SKILL.md` 短片入门，`mv-workflow.md` 长片与 MV 流程，`crayon.md` 蜡笔画风 |
| `crayon-kit/` | 蜡笔引擎、角色（3 头身小人和呆头鸟）、零件库、16 秒 demo、歌词字幕工具 |
| `examples/brush/` | 《拾星》《落款》的场景代码，放进 ClaudeAnimationBase 就能跑 |
| `tools/` | `analyze.py` 节拍与段落分析，`make_shotlist.py` 拍号逐镜表模板 |
| `docs/` | README 用的预览图 |

## 安装

```bash
git clone https://github.com/nzl153/paint-video-skill
```

把 `paint-video/` 复制到 agent 的 skills 目录：Claude Code 是 `~/.claude/skills/`，Codex 是 `~/.codex/skills/`。仓库本身留着，skill 会去里面找 `crayon-kit/` 和范例。

需要：

- Node 18+、Chrome 或 Chromium、ffmpeg（在 PATH 里）
- 字幕工具：Python 3、numpy、Pillow
- 节拍分析：再加 scipy、matplotlib
- 水彩画风：另外 clone [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) 并 `npm install`

## 先跑一下蜡笔 demo

```bash
cd crayon-kit
npm install
node render.mjs --sheet=1,4,8,12 --cols=4 --w=480 --out=out/check/sheet.jpg    # 联系表
node render.mjs --loop=cast --sheet=1 --cols=1 --w=960 --out=out/check/cast.jpg # 人设表
node render.mjs --frames --workers=4                                            # 渲全部帧
node render.mjs --encode --out=out/demo.mp4                                     # 合成
```

16 秒 384 帧，4 个进程几十秒就渲完。

## 怎么用

装好之后直接跟 agent 说要什么，比如：

- 「用蜡笔绘本风格做一支 15 秒的短片：小狗追着一片落叶跑，最后叶子落在它鼻子上。」
- 「做一支水墨短片，16 秒左右，一只鹤从画纸里走出来。」
- 「这首歌（附音频和 LRC 歌词）做成一支横屏 MV，先给我剧本。」

agent 会先写分镜给你看，再一个镜头一个镜头地做，每个镜头渲出来自己检查过才往下走。长片会分批给你看静帧拼图，你点头了再渲动态。

## 性能参考

RTX 4060 笔记本上实测：

| | 每帧 | 例子 |
|---|---|---|
| 蜡笔引擎 | 10–70ms | 2:29 的 MV 共 3590 帧，4 进程约 4 分钟 |
| p5.brush 水彩 | 约 1–2 秒 | 2:09 的 MV 共 3102 帧，3 进程约 1.5–2 小时 |
| 字幕层 | — | 整片 6 进程加合成约 3–8 分钟 |

## 致谢

- [PDoomVideo](https://github.com/JohnHeibel/PDoomVideo)：Claude 在 Claude Code 里生成的两分半 MV，这套路线的起点（该仓库无许可证，本仓库没有使用它的代码）。
- [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase)（MIT）：p5.brush 底座，`crayon-kit/render.mjs` 由它改来。
- [paint-mv-skills](https://github.com/lintsinghua/paint-mv-skills)（MIT）：歌词对时和音频分析的参考。
- 字体推荐 [马善政楷书](https://fonts.google.com/specimen/Ma+Shan+Zheng)、[龙藏体](https://fonts.google.com/specimen/Long+Cang)、[志莽行书](https://fonts.google.com/specimen/Zhi+Mang+Xing)，都是 OFL，需自行下载。

## 许可

MIT，见 [LICENSE](LICENSE)。
