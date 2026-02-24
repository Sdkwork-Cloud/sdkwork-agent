# Output Examples - Universal Reference

Universal reference (图片+视频+音频) examples. 即梦 Seedance 2.0 标准。

---

## Example 1: Descriptive Syntax (Recommended)

**Input:** "@图片1 作为男主角，@图片2 作为当前场景。参考视频 @视频1 的拍摄手法，使用背景音乐 @音频1"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@图片1 作为男主角，@图片2 作为当前场景。参考视频 @视频1 的拍摄手法，使用背景音乐 @音频1。男主角在当前场景中，精准复刻图片1的人物特征和图片2的场景，参考视频1的拍摄手法和音频1的音乐节奏，角色零突变，跨镜头一致性保持，原生音画同步，10秒",
      "style": "cinematic photorealistic",
      "duration": "10s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent style"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片1 作为男主角：男主角的形象描述"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片2 作为当前场景：当前场景的描述"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440002",
      "type": "VIDEO",
      "scene": "REFERENCE",
      "prompt": "视频1 参考拍摄手法：拍摄手法参考的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440003",
      "type": "AUDIO",
      "scene": "BACKGROUND",
      "prompt": "音频1 作为背景音乐：背景音乐的提示词"
    }
  ]
}
```

---

## Example 2: Image + Video Reference

**Input:** "@图片1 作为风格参考，@视频1 参考动作。结合这两个"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@图片1 作为风格参考，@视频1 参考动作。结合图片1的视觉风格和视频1的动作，精准复刻，一致的角色和环境，角色零突变，跨镜头一致性保持，8秒",
      "style": "cinematic photorealistic",
      "duration": "8s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent style"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片1 作为风格参考：生成风格参考图片的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "VIDEO",
      "scene": "REFERENCE",
      "prompt": "视频1 参考动作：生成运动参考视频的提示词"
    }
  ]
}
```

---

## Example 3: All Three Reference Types

**Input:** "@图片1 作为视觉参考，@视频1 参考运镜，@音频1 作为背景音乐。三者结合"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@图片1 作为视觉参考，@视频1 参考运镜，@音频1 作为背景音乐。结合图片1的视觉、视频1的运镜、音频1的节奏和氛围，精准复刻，一致的风格和角色，角色零突变，跨镜头一致性保持，原生音画同步，10秒",
      "style": "cinematic photorealistic",
      "duration": "10s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent references"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片1 作为视觉参考：生成视觉参考图片的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "VIDEO",
      "scene": "REFERENCE",
      "prompt": "视频1 参考运镜：生成运动参考视频的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440002",
      "type": "AUDIO",
      "scene": "BACKGROUND",
      "prompt": "音频1 作为背景音乐：生成背景音乐/音频的提示词"
    }
  ]
}
```

---

## 即梦 Seedance 2.0 标识符规范

| 素材类型 | 标准标识符 | 用途说明示例 |
|---------|-----------|-------------|
| 图片 | `@图片1`、`@图片2` | `作为首帧`、`作为男主角`、`作为场景`、`参考风格` |
| 视频 | `@视频1`、`@视频2` | `参考运镜`、`参考动作`、`参考镜头语言` |
| 音频 | `@音频1`、`@音频2` | `用于配乐`、`作为背景音乐`、`参考节奏` |
| 文本 | `@文本1`、`@文本2` | `作为剧本`、`作为剧情描述` |

**注意：** 不要使用文件名作为标识符（如 `@style.jpg`），应该使用简单标识符（如 `@图片1`）。
