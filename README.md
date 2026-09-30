# paint-video

中文 | [English](README.en.md)

让 AI agent 用代码画手绘动画短片和 MV 的 skill。

每一帧都是时间 t 的纯函数：用笔刷一笔一笔画出来，无头 Chrome 并行渲染成图片，ffmpeg 合成 MP4。画面里没有一张 AI 生图，全是代码画的。skill 里写的是做片子的整套方法和踩过的坑，agent 读了就能从一句话需求做到成片。

## 用它做的片子

### 《试拳》· 设色水墨打斗

19.5 秒，无声，雾山五行那一路的设色水墨。崖顶对峙，棍拳相撞，矮身钻过勾拳、拖棍擦地上挑，最后跃起抡棍带火砸下，火墨炸满屏。人物是毛笔勾线加平涂和暗面，动作走穿过关键帧的平滑曲线，脚一步一步踩实不打滑；接触点用探针算坐标对准。整部片子的代码在 `inkfight-kit/`。

![试拳](docs/inkfight.webp)

<details>
<summary>全片一览</summary>

![试拳全片](docs/inkfight_sheet.jpg)

</details>

### 《两只手》· 皮影短片

60 秒，没有歌。小将军要亮相，胳膊却被另一根杆子拽着满台跑；绕到幕后一看，两根杆子握在同一个人的两只手里。每片皮单独刻好镂空，再叠到透光的幕上；梆子、碎鼓、小锣、「锵」全部用 numpy 合成，按拍号和动作对齐。整部片子的代码、分镜和合成器都在 `piying-kit/`。

![两只手](docs/piying.webp)

<details>
<summary>全片一览</summary>

![两只手全片](docs/piying_sheet.jpg)

</details>

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

两部 MV 的歌有版权，仓库里不带音频和歌词。上面的预览都是无声画面；《两只手》的锣鼓是合成的，跑一下 `piying-kit/sound/synth.py` 就能生成。

## 它教给 agent 什么

- **四套画风引擎**
  - 水彩、水墨、版画：p5.js + p5.brush，基于 [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase)，每帧约 1 秒。
  - 蜡笔绘本：本仓库自写的 2D canvas 引擎 `crayon-kit/`，每帧 10–50ms。
  - 皮影：自写的 2D canvas 引擎 `piying-kit/`，每帧 2–10ms，锣鼓用代码合成。
  - 设色水墨打斗：自写的 2D canvas 引擎 `inkfight-kit/`，每帧 20–100ms。
- **导演手册**：景别、轴线和 30 度规则、剪辑点、「停、爆、停」的节奏、构图和视线、角色表演、动作戏原则，最后是一张分镜检查表。写给只会照指令做的模型也能用。
- **做片子的规矩**：每个镜头只让观众看一件事、先有原因再有反应；给「看懂」留时间；每个接缝都有转场；画面不写字；丰富但不廉价，不撒火花填空。
- **检查循环**：每做完一个镜头就渲出联系表、连续帧、局部放大图，用读图工具自己看，查瞬移、悬空的手、朝向、道具挡脸、颜色发脏。只读代码看不出动画好不好。
- **整首歌的 MV 流程**：节拍分析 → 用拍号写逐镜表（改剪辑只改一处）→ 先便宜地试风格 → 零件库 → 分批做、每批自检 → 局部返修 → ffmpeg 调色。
- **歌词字幕**：单独一层透明 PNG 叠上去，竖排、按半句出。蜡笔版的字也有纸纹、会随画面抖动；用「探针」记下每帧人物实际画在哪里，自动排版避开人物。
- **反面教材**：一支规矩全守却没戏的测试片，逐条写了为什么没戏。

## 目录

| 路径 | 内容 |
|---|---|
| `paint-video/` | skill 本体。`SKILL.md` 短片入门，`mv-workflow.md` 长片与 MV 流程，`crayon.md` 蜡笔画风，`piying.md` 皮影，`wushan.md` 设色打斗，`directing.md` 导演手册（分镜、景别、轴线、剪辑、节奏、表演，各画风通用） |
| `crayon-kit/` | 蜡笔引擎、角色（3 头身小人和呆头鸟）、零件库、16 秒 demo、歌词字幕工具 |
| `piying-kit/` | 皮影引擎、带操纵杆的关节小人、60 秒短片《两只手》全部代码和分镜、锣鼓合成器 |
| `inkfight-kit/` | 设色水墨引擎、勾线平涂的人体骨架、19.5 秒打斗短片《试拳》全部代码、算关节坐标的 `probe.mjs`、24 招的招式库 `moves.js`（`plan()` 按接触时刻拼招，附一段示范对打） |
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
- 皮影锣鼓合成：Python 3、numpy、scipy
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

16 秒 384 帧，4 个进程约 45 秒渲完。

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
| 皮影引擎 | 2–10ms | 60 秒 1440 帧，单进程直出 MP4 约 2 分钟 |
| 设色打斗引擎 | 20–100ms | 19.5 秒 468 帧，4 进程不到 1 分钟 |
| p5.brush 水彩 | 约 1–2 秒 | 2:09 的 MV 共 3102 帧，3 进程约 1.5–2 小时 |
| 字幕层 | — | 整片 6 进程加合成约 3–8 分钟 |

## 致谢

- [PDoomVideo](https://github.com/JohnHeibel/PDoomVideo)：Claude 在 Claude Code 里生成的两分半 MV，这套路线的起点（该仓库无许可证，本仓库没有使用它的代码）。
- [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase)（MIT）：p5.brush 底座，`crayon-kit/`、`piying-kit/`、`inkfight-kit/` 的 `render.mjs` 由它改来。
- [paint-mv-skills](https://github.com/lintsinghua/paint-mv-skills)（MIT）：歌词对时和音频分析的参考。
- 字体推荐 [马善政楷书](https://fonts.google.com/specimen/Ma+Shan+Zheng)、[龙藏体](https://fonts.google.com/specimen/Long+Cang)、[志莽行书](https://fonts.google.com/specimen/Zhi+Mang+Xing)，都是 OFL，需自行下载。

## 许可

MIT，见 [LICENSE](LICENSE)。
