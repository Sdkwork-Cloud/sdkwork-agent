# Frame Control Guide
Guidelines for first/last frame generation (首尾帧).

---

## What is Frame Control?

Frame control (首尾帧) allows you to define the exact starting and ending points of the video. The AI will generate a smooth transition between the first and last frames.

---

## Detection Keywords

Detect these keywords to trigger frame control mode:
- "首尾帧", "first frame", "last frame", "start/end"
- User provides descriptions for both start and end

---

## First/Last Frame Object Structure

```json
{
  "first_frame": {
    "prompt": "first frame description",
    "image": "path/to/first-image.jpg"
  },
  "last_frame": {
    "prompt": "last frame description",
    "image": "path/to/last-image.jpg"
  }
}
```

**Fields:**
- `first_frame.prompt`: Required - description of the starting state
- `first_frame.image`: Optional - reference image for first frame
- `last_frame.prompt`: Required - description of the ending state
- `last_frame.image`: Optional - reference image for last frame

---

## Example: Text-Only Frame Control

**Input:** "首帧：猫坐着，尾帧：猫跳起来"

**Output:**

```json
{
  "platforms": ["default"],
  "prompts": {
    "default": {
      "type": "video",
      "prompt": "An orange tabby cat in a living room, smooth transition from sitting to jumping, consistent character and environment, cinematic",
      "style": "cinematic photorealistic",
      "duration": "5s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "first_frame": {
        "prompt": "Orange tabby cat sitting calmly on the floor, relaxed"
      },
      "last_frame": {
        "prompt": "Orange tabby cat jumping up into the air, paws outstretched"
      },
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  }
}
```

---

## Example: Frame Control with Reference Images

**Input:** "@first.jpg 首帧：猫坐着，@last.jpg 尾帧：猫跳起来"

**Output:**

```json
{
  "platforms": ["default"],
  "prompts": {
    "default": {
      "type": "video",
      "prompt": "An orange tabby cat in a living room, smooth transition from first frame to last frame, consistent character and environment, cinematic",
      "style": "cinematic photorealistic",
      "duration": "5s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "reference_images": ["first.jpg", "last.jpg"],
      "first_frame": {
        "prompt": "Orange tabby cat sitting calmly on the floor, relaxed",
        "image": "first.jpg"
      },
      "last_frame": {
        "prompt": "Orange tabby cat jumping up into the air, paws outstretched",
        "image": "last.jpg"
      },
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  }
}
```

---

## Key Requirements

### 1. Clear Start and End States
- Clearly define what the first frame looks like
- Clearly define what the last frame looks like
- Both should be distinct but related

### 2. Smooth Transition
- The start and end should be logically connected
- The motion between them should make sense
- Consistent characters and environment

### 3. Consistency
- Same character design in both frames
- Same environment/setting
- Same art style
- Same lighting (unless change is intentional)

---

## Tips & Best Practices

1. **Make it logical:** The transition should make sense
2. **Keep it short:** 3-8 seconds works best for frame control
3. **Describe the motion:** What happens between start and end?
4. **Maintain consistency:** Same character, same environment
5. **Use natural motion:** Avoid unnatural or impossible transitions
6. **Always set `first_frame` and `last_frame`:** Include both in output

---

## Common Transition Types

| Transition | Description |
|-----------|-------------|
| **Position Change** | Subject moves from Point A to Point B |
| **Action** | Subject goes from resting to active (sitting → jumping) |
| **Camera Move** | Camera moves from one view to another |
| **Time of Day** | Scene changes from day to night |
| **Season Change** | Environment changes from one season to another |
| **Appearance Change** | Subject changes appearance (e.g., character growth) |

---

## What to Avoid

❌ **Avoid:**
- Drastic, illogical changes
- Completely different characters between frames
- Completely different environments
- Impossible physics or motion
- Too long duration for a simple transition

✅ **Prefer:**
- Logical, natural transitions
- Consistent characters and environment
- Clear start and end states
- Smooth, believable motion
- 3-8 second duration
