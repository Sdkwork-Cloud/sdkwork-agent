# Output Examples - Image-to-Video

Image-to-video examples. 即梦 Seedance 2.0 标准。

---

## Example 1: Single Image Reference

**Input:** "@图片1 让这只猫动起来"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_IMAGE",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@图片1 让这只猫动起来。基于参考图片，橘猫慢慢眨眼，环顾四周，然后懒洋洋地伸展，镜头缓慢推近，温暖的午后光线，舒适的氛围，与参考图片一致，角色零突变，8秒",
      "style": "photorealistic",
      "duration": "8s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent with reference"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片1：一只橘猫在午后阳光下的窗台上，温暖的光线，舒适的氛围，写实风格"
    }
  ]
}
```

---

## Example 2: Multiple Image References

**Input:** "@图片1 @图片2 从第一张过渡到第二张"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_IMAGE",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@图片1 @图片2 从第一张过渡到第二张。从第一个参考图片平滑过渡到第二个参考图片，自然进展，一致的角色和风格，平滑的镜头运动，角色零突变，6秒",
      "style": "cinematic photorealistic",
      "duration": "6s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, inconsistent characters"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片1：第一个参考场景描述"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片2：第二个参考场景描述"
    }
  ]
}
```

---

## 即梦 Seedance 2.0 标识符规范

| 素材类型 | 标准标识符 | 用途说明示例 |
|---------|-----------|-------------|
| 图片 | `@图片1`、`@图片2` | `作为首帧`、`作为参考`、`让这只猫动起来` |

**注意：** 不要使用文件名作为标识符（如 `@cat.jpg`），应该使用简单标识符（如 `@图片1`）。
