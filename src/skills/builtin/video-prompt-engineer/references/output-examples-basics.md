# Output Examples - Basics

Text-to-video examples. 即梦 Seedance 2.0 标准。

---

## Example 1: Basic Text-to-Video (Cat on Windowsill)

**Input:** "一只猫在窗台上"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_TEXT",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "一只橘猫懒洋洋地坐在午后阳光下的窗台上，温暖柔和的光线，镜头缓慢推近，舒适的氛围，电影级写实风格，8秒",
      "style": "cinematic photorealistic",
      "duration": "8s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy"
    }
  }
}
```

---

## Example 2: Text-to-Video with Platform

**Input:** "用可灵，一个人在公园散步"

**Output:**

```json
{
  "platforms": ["kling"],
  "product": "VIDEO_TEXT",
  "prompts": {
    "kling": {
      "type": "video",
      "prompt": "一个人在公园里悠闲地散步，阳光透过树叶洒下，镜头缓慢跟拍，自然光线，温暖的氛围，电影级写实风格，10秒",
      "style": "cinematic photorealistic",
      "duration": "10s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, jerky motion"
    }
  }
}
```

---

## Example 3: Cinematic Scene

**Input:** "雨中的城市夜景，电影感"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_TEXT",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "霓虹灯下的雨夜城市，霓虹灯在潮湿的路面上反射，忧郁的氛围，电影级风格，12秒",
      "style": "cinematic",
      "duration": "12s",
      "aspect_ratio": "21:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted"
    }
  }
}
```

---

## Example 4: Anime Style

**Input:** "动漫风格，樱花飘落"

**Output:**

```json
{
  "platforms": ["default"],
  "product": "VIDEO_TEXT",
  "prompts": {
    "default": {
      "type": "video",
      "prompt": "樱花花瓣在风中轻轻飘落，春日的阳光，唯美浪漫的氛围，动漫风格，10秒",
      "style": "anime",
      "duration": "10s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, photorealistic"
    }
  }
}
```

---

## Example 5: Fantasy Style

**Input:** "奇幻风格，魔法森林"

**Output:**

```json
{
  "platforms": ["default"],
  "product": "VIDEO_TEXT",
  "prompts": {
    "default": {
      "type": "video",
      "prompt": "神秘的魔法森林，空气中漂浮着发光的魔法粒子，柔和的月光，奇幻风格，12秒",
      "style": "fantasy",
      "duration": "12s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, modern"
    }
  }
}
```

---

## 重要规则：文生视频必须包含风格说明

**所有文生视频的 prompt 都必须明确包含风格描述！**

### 正确示例（包含风格）：
```
一只猫在窗台上，电影级写实风格
樱花飘落，动漫风格
魔法森林，奇幻风格
```

### 错误示例（缺少风格）：
```
一只猫在窗台上
樱花飘落
魔法森林
```

---

## 常用风格列表

| 风格 | 中文描述 | 英文关键词 |
|------|---------|-----------|
| 电影级写实 | 电影级写实风格 | cinematic photorealistic |
| 电影感 | 电影级风格 | cinematic |
| 动漫 | 动漫风格 | anime |
| 奇幻 | 奇幻风格 | fantasy |
| 科幻 | 科幻风格 | sci-fi |
| 纪录片 | 纪录片风格 | documentary |
| 复古 | 复古风格 | vintage |
| 黑色电影 | 黑色电影风格 | film noir |
| 浪漫 | 浪漫风格 | romantic |

---

## 即梦 Seedance 2.0 纯文本生成提示

纯文本生成（VIDEO_TEXT）不需要使用 @ 标识符，直接用自然语言描述即可。

**注意：必须在 prompt 中明确包含风格说明！**

如需使用参考素材，请使用：
- 首尾帧入口（VIDEO_FRAME）：首帧/尾帧 + 文本
- 全能参考入口（VIDEO_UNIVERSAL）：图+视频+音频+文本任意组合
