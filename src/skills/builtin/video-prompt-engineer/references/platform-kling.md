# Platform Guide - 可灵 (Kling)
Kling (可灵) video generation platform guide.

---

## Platform Overview

**Company:** KlingAI (可灵AI)
**Strengths:**
- Excellent motion control and physics
- Strong Chinese language understanding
- Good character consistency
- Fast generation speed
- Stable and reliable

**Best For:**
- Action and motion-heavy content
- Chinese-themed content
- Quick iterations
- Character-driven stories

---

## Prompt Guidelines

### Language Preference

Kling works well with both Chinese and English, but Chinese often gives better results for Chinese content.

**Recommended:** Mix Chinese and English for best results
```
一只可爱的橘猫在午后的窗台上，慵懒地躺着，fur texture detailed, soft natural lighting
```

---

### What Kling Does Well

**Motion & Physics:**
- Natural-looking movement
- Good physics simulation
- Smooth transitions
- Complex action sequences

**Character Consistency:**
- Maintains character design across video
- Consistent facial features
- Stable clothing and accessories

---

### Prompt Structure for Kling

**Recommended Structure:**
```
[Subject] [action] in [environment], [lighting], [mood], [camera movement], [style]
```

**Example:**
```
一位年轻女性在雨中的城市街道上行走，霓虹灯光反射在湿地上，镜头缓慢跟拍，电影感，10秒
```

---

## Key Parameters

### Duration
- **Minimum:** 2 seconds
- **Maximum:** 60 seconds (depending on plan)
- **Recommended:** 5-15 seconds for best quality

### Aspect Ratios
- **16:9** (landscape, default)
- **9:16** (vertical, portrait)
- **1:1** (square)
- **21:9** (cinematic)

### Resolutions
- **720p** (fast)
- **1080p** (recommended)
- **4K** (high quality, slower)

---

## Negative Prompts for Kling

**Always include these in negative prompt:**
```
text, watermark, subtitles, blurry, low quality, distorted, bad anatomy, deformed, extra limbs, inconsistent characters, jerky motion, unnatural movement, flickering, flashing
```

---

## Common Use Cases & Examples

### Use Case 1: Character Walking
**Input:** "用可灵，一个人在公园散步"
**Output:**
```json
{
  "platforms": ["kling"],
  "prompts": {
    "kling": {
      "type": "video",
      "prompt": "一个人在公园里悠闲地散步，阳光透过树叶洒下，镜头缓慢跟拍，自然光线，温暖的氛围，10秒",
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

### Use Case 2: Action Sequence
**Input:** "用可灵，武术动作场面"
**Output:**
```json
{
  "platforms": ["kling"],
  "prompts": {
    "kling": {
      "type": "video",
      "prompt": "武术大师在竹林中练习功夫，动作流畅自然，镜头灵活移动，动态构图，戏剧感光线，8秒",
      "style": "cinematic",
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

## Tips & Best Practices

1. **Be specific about motion:** Kling excels at motion - describe it clearly
2. **Use Chinese for Chinese content:** Better understanding of cultural context
3. **Keep it 5-15 seconds:** Optimal balance of quality and speed
4. **Include camera movement:** Makes the video more dynamic
5. **Describe lighting:** Important for mood and atmosphere
6. **Avoid extreme durations:** Too short (<2s) or too long (>30s) can have issues

---

## What to Avoid

❌ **Avoid:**
- Extremely complex scenes with too many elements
- Rapid, chaotic camera movements
- Unrealistic physics expectations
- Too many characters interacting simultaneously

✅ **Prefer:**
- Clear, focused subjects
- Smooth, controlled camera movement
- Natural, believable motion
- 1-3 main characters
