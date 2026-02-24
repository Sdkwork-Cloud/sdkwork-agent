# Multi-Frame Guide
Guidelines for multi-frame and storyboard video generation.

---

## What is Multi-Frame Generation?

Multi-frame (智能多帧/分镜) generation creates videos with explicit time-coded segments. Each frame has its own description and optional reference image.

---

## Detection Keywords

Detect these keywords to trigger multi-frame mode:
- "分镜", "storyboard", "多帧", "multi-frame"
- User provides multiple time-labeled descriptions or images
- Format: "0-2s: [description]", "2-4s: [description]"

---

## Frame Object Structure

Each frame in the `frames` array should have:

```json
{
  "time": "0-2s",
  "prompt": "description of this frame",
  "image": "path/to/reference-image.jpg"
}
```

**Fields:**
- `time`: Required - time range for this frame (e.g., "0-2s", "2-4s")
- `prompt`: Required - description of what happens in this frame
- `image`: Optional - reference image for this frame

---

## Time Label Format

**Standard Format:**
```
[start]-[end]s
```

**Examples:**
- "0-2s" - 0 to 2 seconds
- "2-4s" - 2 to 4 seconds
- "4-6s" - 4 to 6 seconds
- "6-8s" - 6 to 8 seconds
- "8-10s" - 8 to 10 seconds

---

## Example: Text-Only Multi-Frame

**Input:** "0-2s: 猫坐着，2-4s: 猫站起来，4-6s: 猫跳起来"

**Output:**
```json
{
  "platforms": ["default"],
  "prompts": {
    "default": {
      "type": "video",
      "prompt": "An orange tabby cat in a living room, smooth transitions between actions, consistent character and environment, cinematic",
      "style": "cinematic photorealistic",
      "duration": "6s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "frames": [
        {
          "time": "0-2s",
          "prompt": "Orange tabby cat sitting on the floor, calm and relaxed"
        },
        {
          "time": "2-4s",
          "prompt": "Orange tabby cat standing up, stretching legs"
        },
        {
          "time": "4-6s",
          "prompt": "Orange tabby cat jumping up into the air, paws outstretched"
        }
      ],
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  }
}
```

---

## Example: Multi-Frame with Reference Images

**Input:** "@frame1.jpg 0-2s: 猫坐着，@frame2.jpg 2-4s: 猫站起来，@frame3.jpg 4-6s: 猫跳起来"

**Output:**
```json
{
  "platforms": ["default"],
  "prompts": {
    "default": {
      "type": "video",
      "prompt": "An orange tabby cat in a living room, smooth transitions between frames, consistent character, cinematic",
      "style": "cinematic photorealistic",
      "duration": "6s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "reference_images": ["frame1.jpg", "frame2.jpg", "frame3.jpg"],
      "frames": [
        {
          "time": "0-2s",
          "prompt": "Orange tabby cat sitting on the floor, calm and relaxed",
          "image": "frame1.jpg"
        },
        {
          "time": "2-4s",
          "prompt": "Orange tabby cat standing up, stretching legs",
          "image": "frame2.jpg"
        },
        {
          "time": "4-6s",
          "prompt": "Orange tabby cat jumping up into the air, paws outstretched",
          "image": "frame3.jpg"
        }
      ],
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  }
}
```

---

## Storyboard Structure (3×3 Grid)

For storyboard-style multi-frame (compatible with image-prompt-engineer grid format):

| Panel | Story Beat | Content |
|-------|------------|---------|
| 1 | Setup | Establish scene and character |
| 2 | Development | Introduce action or conflict |
| 3 | Rising Action | Build tension |
| 4 | Climax Prep | Lead to peak moment |
| 5 | Climax | Peak action or emotion |
| 6 | Falling Action | Resolution begins |
| 7 | Resolution | Outcome revealed |
| 8 | Epilogue | Aftermath |
| 9 | Closing | Final shot |

---

## Key Requirements

### 1. Consistent Style Across Frames
- Same art style in all frames
- Same character design (if character)
- Same lighting and color palette
- Consistent environment

### 2. Smooth Transitions
- Natural progression between frames
- Logical flow of action
- Smooth camera movement (if applicable)

### 3. Clear Time Labels
- Each frame has a clear time range
- Time ranges should be sequential and non-overlapping
- Equal or logical duration per frame

---

## Tips & Best Practices

1. **Keep frame durations consistent:** 1-2 seconds per frame works well
2. **Maintain character consistency:** Same character design throughout
3. **Describe the transitions:** How to get from Frame A to Frame B
4. **Use logical progression:** Story beats should make sense
5. **Keep the same environment:** Don't change the setting drastically
6. **Smooth camera movement:** If camera moves, describe it clearly
7. **Always set `frames` array:** Include all frame objects in output

---

## Common Frame Duration Patterns

| Total Duration | Frame Count | Duration per Frame |
|---------------|------------|-------------------|
| 4 seconds | 2 frames | 2s/frame |
| 6 seconds | 3 frames | 2s/frame |
| 8 seconds | 4 frames | 2s/frame |
| 9 seconds | 3-9 frames | 1-3s/frame |
| 12 seconds | 6 frames | 2s/frame |
| 16 seconds | 8 frames | 2s/frame |

---

## What to Avoid

❌ **Avoid:**
- Overlapping time ranges
- Drastic changes in character design
- Completely different environments between frames
- Too many frames in too short a time
- Confusing or illogical progression
- Inconsistent art styles

✅ **Prefer:**
- Sequential, non-overlapping time ranges
- Consistent character and environment
- Smooth, logical transitions
- 2-3 seconds per frame
- Clear story progression
- Same art style throughout
