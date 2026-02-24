# Output Examples - Multi-Frame

Multi-frame/storyboard (智能多帧/分镜) examples. 即梦 Seedance 2.0 标准。

---

**重要注意：** 智能多帧和主体参考在 Seedance 2.0 中无法选中！如果需要多帧参考，请使用全能参考入口（VIDEO_UNIVERSAL）。

---

## Example 1: Text-Only Multi-Frame (Legacy)

**Input:** "0-2s: 猫坐着，2-4s: 猫站起来，4-6s: 猫跳起来"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_MULTI",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "一只橘猫在客厅里，动作之间平滑过渡，一致的角色和环境，角色零突变，跨镜头一致性保持，电影级，6秒",
      "style": "cinematic photorealistic",
      "duration": "6s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "FRAME_0_2S",
      "prompt": "0-2s 分镜：橘猫坐在地板上，平静放松"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "FRAME_2_4S",
      "prompt": "2-4s 分镜：橘猫站起来，伸展腿"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440002",
      "type": "IMAGE",
      "scene": "FRAME_4_6S",
      "prompt": "4-6s 分镜：橘猫跳到空中，爪子伸展"
    }
  ]
}
```

---

## Example 2: Multi-Frame with Reference Images (Legacy)

**Input:** "@图片1 0-2s: 猫坐着，@图片2 2-4s: 猫站起来，@图片3 4-6s: 猫跳起来"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_MULTI",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@图片1 0-2s: 猫坐着，@图片2 2-4s: 猫站起来，@图片3 4-6s: 猫跳起来。一只橘猫在客厅里，帧之间平滑过渡，一致的角色，角色零突变，跨镜头一致性保持，电影级，6秒",
      "style": "cinematic photorealistic",
      "duration": "6s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "FRAME_0_2S",
      "prompt": "图片1 0-2s 分镜：橘猫坐在地板上，平静放松"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "FRAME_2_4S",
      "prompt": "图片2 2-4s 分镜：橘猫站起来，伸展腿"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440002",
      "type": "IMAGE",
      "scene": "FRAME_4_6S",
      "prompt": "图片3 4-6s 分镜：橘猫跳到空中，爪子伸展"
    }
  ]
}
```

---

## 即梦 Seedance 2.0 标识符规范

| 素材类型 | 标准标识符 | 用途说明示例 |
|---------|-----------|-------------|
| 图片 | `@图片1`、`@图片2`、`@图片3` | `作为分镜1`、`作为分镜2` |

**注意：** 
1. 不要使用文件名作为标识符（如 `@frame1.jpg`），应该使用简单标识符（如 `@图片1`）。
2. 智能多帧和主体参考在 Seedance 2.0 中无法选中！
3. 如果需要多帧参考，请使用全能参考入口（VIDEO_UNIVERSAL）。
