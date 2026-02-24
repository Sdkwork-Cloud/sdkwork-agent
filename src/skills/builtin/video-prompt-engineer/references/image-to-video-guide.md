# Image-to-Video Guide
Guidelines for generating video from reference images.

---

## What is Image-to-Video?

Image-to-video (图生视频) uses one or more reference images as the starting point for video generation. The AI maintains consistency with the reference while adding natural motion.

---

## Detection Keywords

Detect these keywords to trigger image-to-video mode:
- "@图片", "图生视频", "image to video"
- User provides image references
- "使用这张图片", "animate this image", "让这张图动起来"

---

## Key Principles

### 1. Maintain Consistency
- Keep the same character design
- Maintain the same environment/scene
- Preserve the art style
- Keep consistent lighting

### 2. Add Natural Motion
- Subtle, believable movement
- Avoid excessive or unnatural motion
- Keep the motion appropriate for the subject

### 3. Smooth Transitions
- Natural camera movement
- Smooth changes between states
- Logical progression of action

---

## What to Describe in the Prompt

### For Single Image Reference

**Include:**
- What motion should happen? (walking, blinking, wind, etc.)
- How should the camera move? (zoom, pan, tracking, etc.)
- What's the duration?
- What's the mood/atmosphere?

**Example Prompt Structure:**
```
Based on the reference image, [subject] [action/motion], [camera movement], [lighting/mood], [style consistent with reference], [duration]
```

---

## Example: Single Image-to-Video

**Input:** "@cat.jpg 让这只猫动起来"

**Output:**
```json
{
  "platforms": ["default"],
  "prompts": {
    "default": {
      "type": "video",
      "prompt": "Based on the reference image, the orange tabby cat on the windowsill blinks slowly, looks around, then stretches lazily, camera slow push-in, warm afternoon lighting, cozy atmosphere, consistent with reference image, 8 seconds",
      "style": "photorealistic",
      "duration": "8s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "reference_images": ["cat.jpg"],
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent with reference"
    }
  }
}
```

---

## For Multiple Image References

When multiple images are provided:

**Syntax:**
```
@img1 @img2 @img3 [prompt describing how they connect]
```

**Prompt Focus:**
- How do the images relate to each other?
- What's the sequence/progression?
- How to transition between them?
- Maintain consistency across all images

---

## Example: Multiple Image Reference

**Input:** "@img1.jpg @img2.jpg 从第一张图过渡到第二张图"

**Output:**
```json
{
  "platforms": ["default"],
  "prompts": {
    "default": {
      "type": "video",
      "prompt": "Smooth transition from the first reference image to the second reference image, natural progression, consistent characters and style, smooth camera movement, 6 seconds",
      "style": "cinematic photorealistic",
      "duration": "6s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "reference_images": ["img1.jpg", "img2.jpg"],
      "negative": "text, watermark, blurry, distorted, inconsistent characters"
    }
  }
}
```

---

## Common Motion Types by Subject

| Subject | Good Motions |
|---------|-------------|
| **人物/Portrait** | Blinking, breathing, slight head turn, looking around, subtle smile |
| **动物/Animal** | Blinking, breathing, ear twitch, tail wag, looking around |
| **风景/Landscape** | Clouds moving, trees swaying, water flowing, wind effects |
| **城市/City** | Traffic moving, people walking, lights changing |
| **水/Water** | Waves, ripples, flowing, reflections moving |
| **植物/Plants** | Leaves swaying, flowers blooming, grass blowing |

---

## Camera Movement for Image-to-Video

**Recommended (Subtle):**
- Slow zoom in/out
- Gentle pan
- Slow tracking
- Subtle dolly

**Avoid (Too Distracting):**
- Rapid zooms
- Chaotic camera movement
- Extreme angles
- Too much motion

---

## Tips & Best Practices

1. **Start with subtle motion:** Don't over-animate
2. **Describe the motion clearly:** What should move, how should it move?
3. **Keep consistent:** Maintain the reference image's style and content
4. **Use the reference image's composition:** Don't change the framing too much
5. **Keep it short:** 5-10 seconds works best for image-to-video
6. **Always set `reference_images`:** Include the image path(s) in the output

---

## What to Avoid

❌ **Avoid:**
- Changing the character's appearance drastically
- Completely altering the environment
- Excessive, unnatural motion
- Rapid, jarring camera movements
- Losing the essence of the reference image

✅ **Prefer:**
- Subtle, natural motion
- Maintaining character consistency
- Smooth, controlled camera movement
- Preserving the reference's style and mood
