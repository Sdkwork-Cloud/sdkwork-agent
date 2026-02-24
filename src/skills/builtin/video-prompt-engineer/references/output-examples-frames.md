# Output Examples - Frames

First/last frame (首尾帧) examples. 即梦 Seedance 2.0 标准。

---

## Example 1: Text-Only Frame Control

**Input:** "首帧：猫坐着，尾帧：猫跳起来"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_FRAME",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "一只橘猫在客厅里，从坐着平滑过渡到跳起来，一致的角色和环境，角色零突变，跨镜头一致性保持，电影级，5秒",
      "style": "cinematic photorealistic",
      "duration": "5s",
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
      "scene": "FIRST_FRAME",
      "prompt": "首帧：橘猫安静地坐在地板上，放松状态"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "LAST_FRAME",
      "prompt": "尾帧：橘猫跳到空中，爪子伸展"
    }
  ]
}
```

---

## Example 2: Frame Control with Reference Images

**Input:** "@图片1 首帧：猫坐着，@图片2 尾帧：猫跳起来"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_FRAME",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@图片1 首帧：猫坐着，@图片2 尾帧：猫跳起来。一只橘猫在客厅里，从首帧平滑过渡到尾帧，精准复刻图片1和图片2，一致的角色和环境，角色零突变，跨镜头一致性保持，电影级，5秒",
      "style": "cinematic photorealistic",
      "duration": "5s",
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
      "scene": "FIRST_FRAME",
      "prompt": "图片1 首帧：橘猫安静地坐在地板上，放松状态"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "LAST_FRAME",
      "prompt": "图片2 尾帧：橘猫跳到空中，爪子伸展"
    }
  ]
}
```

---

## 即梦 Seedance 2.0 标识符规范

| 素材类型 | 标准标识符 | 用途说明示例 |
|---------|-----------|-------------|
| 图片 | `@图片1`、`@图片2` | `作为首帧`、`作为尾帧` |

**注意：** 不要使用文件名作为标识符（如 `@first.jpg`），应该使用简单标识符（如 `@图片1`）。

**两种入口模式：**
- 首尾帧入口：只有首帧/尾帧 + 文本（使用 `VIDEO_FRAME`）
- 全能参考入口：图+视频+音频+文本任意组合（使用 `VIDEO_UNIVERSAL`）
