# 第三方声明

本仓库是 A Band of One 的电脑浏览器发布副本。网页代码和文档由本项目维护，按仓库根目录的 MIT License 发布；随网页提供的音频采样属于第三方声音资产，不能仅依据本项目的 MIT License 使用。

本发布版保留了 `audio-data.js` 中的内嵌音频数据，同时提供 `audios/*.mp3` 作为本地回退文件。这两种形式来自同一批经过处理的声音资产，应一并遵守下列来源和许可证要求。

## 音频资产

### 钢琴

- 来源项目：[nbrosowsky/tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)
- 上游采样目录：`samples/piano`
- 许可证：采样按 [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) 使用；上游代码按其仓库声明执行。
- 本发布包范围：21 个钢琴音频，另以内嵌形式出现在 `audio-data.js`。

### 弦乐与单簧管

- 来源项目：[gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts)
- 音色集合：Musyng Kite 中的 violin 与 clarinet
- 许可证：音色资源按 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) 使用；不要将上游仓库的软件许可证误写为音色资源许可证。
- 本发布包范围：15 个弦乐音频、15 个单簧管音频，另以内嵌形式出现在 `audio-data.js`。

详细的音名清单、处理参数、输出路径和校验信息见 [docs/AUDIO_SOURCES.md](docs/AUDIO_SOURCES.md)。

## 项目内容边界

- `index.html`、`app.js`、`fx.js`、`audio-data.js` 中的项目自有逻辑与文档采用 MIT License。
- `audios/` 中的 MP3 和 `audio-data.js` 中对应的内嵌音频数据是第三方来源的处理后副本，按照各自上游许可使用。
- 本 README 不包含未随发布包提供的源采样目录、转换脚本或内部协作过程文件。

