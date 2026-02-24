# Input Guidelines

How to understand and interpret user input for video generation.

---

## Understanding User Intent

### Key Questions to Answer

1. **What does the user want to generate?**
   - Is it a scene, character, story, or something else?
   - What's the main subject?

2. **What generation mode is needed?**
   - Text-to-video (only text)
   - Image-to-video (image reference)
   - Frame control (first/last frame)
   - Multi-frame (storyboard)
   - Universal reference (images + video + audio)

3. **What platform should be used?**
   - Look for platform keywords: 可灵, kling, vidu, 维度, 即梦, jimeng, sora, google, runway, pika
   - If no platform specified, use default (balanced)

4. **What are the video parameters?**
   - Duration: "5秒", "10 seconds", "30s"
   - Aspect ratio: "16:9", "9:16", "1:1"
   - Resolution: "720p", "1080p", "4K"
   - FPS: "24fps", "30fps"

5. **What style is requested?**
   - Cinematic, anime, photorealistic, fantasy, sci-fi, etc.
   - If no style specified, use cinematic photorealistic

6. **Are there reference inputs?**
   - Look for `@` syntax (即梦 Seedance 2.0 标准): `@图片1`, `@视频1`, `@音频1` (简单标识符，不是文件名)
   - Look for keywords: "参考", "reference", "使用这张图片", "全能", "多模态", "12份参考", "Seedance"
   - 明确说明每个素材的用途: `@图片1 作为首帧`, `@视频1 参考镜头语言`, `@音频1 用于配乐`
   - 音频特性: "音色更准", "声音更真", "口型同步", "方言", "歌声"

---

## Common Input Patterns

### Pattern 1: Simple Text-to-Video

**Input:** "一只猫在窗台上"
**Interpretation:** Text-to-video, default platform, 5-10s, 16:9, cinematic

### Pattern 2: Text + Platform

**Input:** "用可灵生成，一只猫在窗台上"
**Interpretation:** Text-to-video, Kling platform

### Pattern 3: Image Reference

**Input:** "@cat.jpg 让这只猫动起来"
**Interpretation:** Image-to-video, use cat.jpg as reference

### Pattern 4: First/Last Frame

**Input:** "首帧：猫坐着，尾帧：猫跳起来"
**Interpretation:** Frame control, define start and end

### Pattern 5: Multi-Frame with Time

**Input:** "0-2s: 猫坐着，2-4s: 猫站起来，4-6s: 猫跳起来"
**Interpretation:** Multi-frame, time-coded segments

### Pattern 6: Multiple References

**Input:** "@img1 @img2 结合这两张图片生成视频"
**Interpretation:** Universal reference, use both images

---

## Handling Ambiguity

### When to Ask for Clarification

Ask only if:

- The request is completely unclear ("生成视频" with no details)
- Critical parameters are missing and can't be reasonably inferred
- Conflicting requirements are given

### When to Smartly Infer

Use defaults and smart enhancement for:

- Short input ("一只猫") → Add camera motion, lighting, mood
- Missing duration → 5-10 seconds
- Missing aspect ratio → 16:9
- Missing style → Cinematic photorealistic
- Missing platform → Default (balanced)

---

## Chinese-Specific Understanding

### Common Chinese Terms

| Chinese Term  | English Meaning            |
| ------------- | -------------------------- |
| 视频          | video                      |
| 生成          | generate                   |
| 动画          | animation                  |
| 动起来        | make it move, animate      |
| 参考          | reference                  |
| 分镜          | storyboard, shot breakdown |
| 首帧/第一帧   | first frame                |
| 尾帧/最后一帧 | last frame                 |
| 镜头          | camera, shot               |
| 推镜头        | zoom in, dolly in          |
| 拉镜头        | zoom out, dolly out        |
| 横摇          | pan                        |
| 纵摇          | tilt                       |
| 跟拍          | tracking shot              |
