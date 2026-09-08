# 音频来源与处理记录

## 结果概览

当前发布包提供 63 个演奏位置，但实际包含 51 个独立预渲染采样：

| 乐器 | 独立采样数 | 音区锚点 | 处理后目录 |
|---|---:|---|---|
| 钢琴 | 21 | C3、C4、C5 | `audios/piano-*.mp3` |
| 弦乐 | 15 | G3、D4、A4 | `audios/violin-*.mp3` |
| 单簧管 | 15 | G3、D4、A4 | `audios/clarinet-*.mp3` |

63 的计算方式是 3 种乐器 × 3 个音区 × 7 个按键。弦乐和单簧管的音区锚点按天然音域设置，相邻音区存在重叠，因此 21 个演奏位置对应 15 个独立音名。项目不在播放时对采样进行升降调。

## 上游来源

### 钢琴

- 项目：[nbrosowsky/tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)
- 采样来源：上游 `samples/piano` 音频文件
- 许可证：采样按 [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) 使用
- 发布范围：A3、B3、C3、D3、E3、F3、G3；A4、B4、C4、D4、E4、F4、G4；A5、B5、C5、D5、E5、F5、G5，共 21 个

### 弦乐

- 项目：[gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts)
- 音色：Musyng Kite violin
- 许可证：音色资源按 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) 使用
- 发布范围：G3、A3、B3；C4、D4、E4、F4、G4、A4、B4；C5、D5、E5、F5、G5，共 15 个

### 单簧管

- 项目：[gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts)
- 音色：Musyng Kite clarinet
- 许可证：音色资源按 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) 使用
- 发布范围：G3、A3、B3；C4、D4、E4、F4、G4、A4、B4；C5、D5、E5、F5、G5，共 15 个

## 处理方式

源素材在发布前按项目的静态网页播放需求统一处理：

- 22050 Hz
- 单声道
- 16-bit PCM 中间格式
- 峰值约 -3 dBFS
- MP3 64 kbps 输出
- 钢琴最长 1.8 秒、弦乐最长 1.6 秒、单簧管最长 1.5 秒
- 尾部约 60 ms 淡出
- 不使用播放时 pitch-shift；每个可用音名对应一个预渲染音频

处理后的 MP3 位于 `audios/`，同时被编码进 `audio-data.js`，用于在浏览器中优先以内嵌数据播放，并保留本地文件回退路径。

## 追溯说明

发布副本只提交处理后的运行时资产，不提交上游完整音源目录和内部转换脚本。若需要复核音频来源，应以本文件的上游链接、音名范围和许可证说明为入口，并结合 `audios/` 中的文件名逐项核对。

