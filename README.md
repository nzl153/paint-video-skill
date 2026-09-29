# paint-video

一份让 AI agent 用代码画手绘动画短片和 MV 的 skill。每一帧都是时间的纯函数，逐帧画出来，无头 Chrome 并行渲染，ffmpeg 合成 MP4。画面里没有 AI 生图。

两套画风：

- **水彩 / 水墨**：p5.js + p5.brush，基于 [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase)。
- **蜡笔绘本**：自写的 2D canvas 蜡笔引擎，每帧 10–50ms，在 `crayon-kit/`。

用这套流程做过两支完整 MV（2 分多钟、三十多个镜头、带歌词字幕），以及三支十几秒的测试片。

## 目录

| 路径 | 内容 |
|---|---|
| `paint-video/` | skill 本体：`SKILL.md` 短片、`mv-workflow.md` 长片与 MV 流程、`crayon.md` 蜡笔画风 |
| `crayon-kit/` | 蜡笔引擎、角色和零件库、一段 16 秒 demo、歌词字幕工具 |
| `examples/brush/` | 两支 p5.brush 短片的场景代码：《拾星》、水墨《落款》 |
| `tools/` | 音乐节拍分析、拍号驱动的逐镜表模板 |

## 安装

```bash
git clone https://github.com/nzl153/paint-video-skill
```

把 `paint-video/` 复制到 agent 的 skills 目录（Claude Code 是 `~/.claude/skills/`，Codex 是 `~/.codex/skills/`）。仓库本身留着，skill 会去里面找 `crayon-kit/` 和范例。

需要 Node 18+、Chrome 或 Chromium、ffmpeg。字幕工具要 Python 3 和 numpy、Pillow，节拍分析还要 scipy、matplotlib。

## 试一下蜡笔 demo

```bash
cd crayon-kit
npm install
node render.mjs --sheet=1,4,8,12 --cols=4 --w=480 --out=out/check/sheet.jpg
node render.mjs --frames --workers=4
node render.mjs --encode --out=out/demo.mp4
```

然后对 agent 说「用蜡笔画风做一支 15 秒的短片」之类的话就行。

## 说明

- 仓库不含任何歌曲音频和歌词。做 MV 时音频、歌词文件放在自己的项目里，`.gitignore` 已经排除。
- 字体用 Google Fonts 上的 OFL 字体，自己下载放进项目的 `fonts/`。
- skill 里的默认审美偏「纸和墨」：低饱和暖色、手作痕迹、克制的动效。想要别的风格直接告诉 agent。
