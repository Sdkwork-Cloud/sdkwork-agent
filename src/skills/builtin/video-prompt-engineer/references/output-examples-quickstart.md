# Output Examples - Quick Reference

Quick reference and JSON structure guide for video prompts. 即梦 Seedance 2.0 标准。

---

## Quick Reference

All examples are organized by category:

| File to Load                                  | Content                         |
| --------------------------------------------- | ------------------------------- |
| `output-examples-basics.md`                   | Text-to-video examples          |
| `output-examples-image-to-video.md`           | Image-to-video examples         |
| `output-examples-frames.md`                   | First/last frame examples       |
| `output-examples-multi-frame.md`              | Multi-frame/storyboard examples |
| `output-examples-universal.md`                | Universal reference examples    |
| `output-examples-universal-reference.md`      | 即梦 Seedance 2.0 全能智能参考示例 |

---

## 即梦 Seedance 2.0 标识符规范

| 素材类型 | 标准标识符 | 错误写法 |
|---------|-----------|---------|
| 图片 | `@图片1`、`@图片2` | `@cat.jpg`、`@男主角.jpg` |
| 视频 | `@视频1`、`@视频2` | `@video.mp4`、`@参考视频.mp4` |
| 音频 | `@音频1`、`@音频2` | `@music.mp3`、`@背景音乐.mp3` |
| 文本 | `@文本1`、`@文本2` | `@script.txt`、`@剧本.txt` |

**用途说明示例：**
- `作为首帧`、`作为男主角`、`作为场景`
- `参考打斗动作`、`参考镜头语言`、`参考运镜`
- `用于配乐`、`作为背景音乐`
- `作为剧本`、`作为剧情描述`

---

## JSON Structure Reference

**ALL examples follow this EXACT structure:**

```json
{
  "platforms": ["platform-name"],
  "product": "VIDEO_TEXT",
  "prompts": {
    "platform-name": {
      "type": "video",
      "prompt": "video prompt text here",
      "style": "style-name",
      "duration": "5s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "what to exclude"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "FIRST_FRAME",
      "prompt": "生成首帧图片的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "LAST_FRAME",
      "prompt": "生成末帧图片的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440002",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "生成参考图片的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440003",
      "type": "IMAGE",
      "scene": "FRAME_0_2S",
      "prompt": "生成0-2秒分镜的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440004",
      "type": "VIDEO",
      "scene": "REFERENCE",
      "prompt": "生成参考视频的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440005",
      "type": "AUDIO",
      "scene": "BACKGROUND",
      "prompt": "生成背景音乐的提示词"
    }
  ]
}
```

---

### Field Rules

- `platforms`: Array of platform names (lowercase, hyphenated: `kling`, `vidu`, `jimeng`, `sora`, `google`, `runway`, `pika`, `default`)
- `product`: GenerationProduct type (required, see below)
- `type`: Always `"video"`
- `prompt`: Required - the actual video prompt text
- `style`: Required - detected or default style
- `duration`: Optional - video duration (e.g., "5s", "10s")
- `aspect_ratio`: Optional - aspect ratio (e.g., "16:9", "9:16", "1:1")
- `resolution`: Optional - resolution (e.g., "720p", "1080p", "4K")
- `fps`: Optional - frames per second (e.g., 24, 30, 60)
- `negative`: Optional - negative prompt
- `assets`: Optional - array of asset objects (统一管理所有资源)

---

## GenerationProduct (产品类型)

| Product ID        | Product Name            | Description                        |
| ----------------- | ----------------------- | ---------------------------------- |
| `VIDEO_TEXT`      | 文生视频                | 从文本描述生成视频                 |
| `VIDEO_IMAGE`     | 图生视频                | 从图片生成视频                     |
| `VIDEO_FRAME`     | 首尾帧生成              | 从首尾帧生成过渡视频               |
| `VIDEO_MULTI`     | 多帧/分镜生成           | 从多个时间标签帧生成视频           |
| `VIDEO_UNIVERSAL` | 全能智能参考/多模态参考 | 多模态参考生成（即梦Seedance 2.0） |
| `VIDEO_REFERENCE` | 参考视频生成            | 基于参考视频生成                   |
| `VIDEO_STYLE`     | 风格迁移生成            | 基于风格参考生成视频               |
| `VIDEO_EXTEND`    | 视频扩展生成            | 扩展现有视频时长                   |
| `VIDEO_EDIT`      | 视频编辑生成            | 编辑/修改现有视频                  |

---

### Assets 资产管理说明

`assets` 数组统一管理所有类型的资源，每个资源对象包含：

| 字段     | 类型   | 说明                                                                                      |
| -------- | ------ | ----------------------------------------------------------------------------------------- |
| `uuid`   | string | 唯一标识符，格式：UUID v4（如 `550e8400-e29b-41d4-a716-446655440000`）                    |
| `type`   | string | 资源类型: `IMAGE`, `VIDEO`, `AUDIO`                                                       |
| `scene`  | string | 场景标识: `FIRST_FRAME`, `LAST_FRAME`, `REFERENCE`, `FRAME_X_Ys`, `BACKGROUND`, `MAIN` 等 |
| `prompt` | string | 生成该资源的提示词                                                                        |

#### Assets Type 类型

- `IMAGE` - 图片资源
- `VIDEO` - 视频资源
- `AUDIO` - 音频资源

#### Assets Scene 场景标识

- `FIRST_FRAME` - 首帧
- `LAST_FRAME` - 末帧
- `REFERENCE` - 参考资源
- `FRAME_X_Ys` - 分镜（如 `FRAME_0_2S` 表示0-2秒）
- `BACKGROUND` - 背景
- `MAIN` - 主要资源

---

### Platform Names

| Display Name | Platform ID |
| ------------ | ----------- |
| 可灵         | `kling`     |
| Vidu         | `vidu`      |
| 即梦         | `jimeng`    |
| Sora         | `sora`      |
| Google (Veo) | `google`    |
| Runway       | `runway`    |
| Pika         | `pika`      |
| Default      | `default`   |

---

## Which Example File to Load?

| User Input Contains              | Load This File                      |
| -------------------------------- | ----------------------------------- |
| Basic text-to-video              | `output-examples-basics.md`         |
| Image-to-video, @图片            | `output-examples-image-to-video.md` |
| 首尾帧, first/last frame         | `output-examples-frames.md`         |
| 多帧, 分镜, storyboard           | `output-examples-multi-frame.md`    |
| 参考视频, 音频                   | `output-examples-universal.md`      |
| 全能智能参考, 多模态, 12份参考    | `output-examples-universal-reference.md` |
