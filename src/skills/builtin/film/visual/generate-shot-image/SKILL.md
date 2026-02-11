---
name: generate-shot-image
version: '1.0.0'
author: sdkwork.com
description: Generate image prompts for specific shots and compositions. Use for precise visual planning and reference.
category: visual
license: Apache-2.0
compatibility: Works with any AI image generator
metadata:
  tags: shot image generation composition camera angle
---

# Generate Shot Image

## Purpose

Create detailed image generation prompts for specific shots, camera angles, and compositions to visualize exact framing and camera positions.

## When to Use

- Shot visualization
- Camera angle reference
- Composition planning
- Director-cinematographer communication
- Storyboard enhancement

## Inputs

- `shot` (object, required): Shot specifications
- `composition` (object, optional): Framing and layout details
- `reference` (string, optional): Reference image or style

## Outputs

```json
{
  "prompts": [
    {
      "type": "primary",
      "prompt": "Cinematic two-shot over shoulder, woman and man sitting across from each other at coffee shop table, warm afternoon light from window, shallow depth of field, 50mm lens, eye-level camera, intimate spacing, film look, warm color grading",
      "negativePrompt": "wide angle, distorted, harsh flash, cold lighting",
      "aspectRatio": "16:9",
      "cameraInfo": {
        "angle": "eye_level",
        "lens": "50mm",
        "distance": "4_feet"
      }
    }
  ],
  "composition": {
    "framing": "two_shot_medium",
    "subjectPlacement": "rule_of_thirds",
    "depth": "shallow",
    "leadingLines": "table_edge"
  },
  "technical": {
    "focalLength": "50mm",
    "aperture": "f/2.0",
    "focus": "both_subjects",
    "movement": "static"
  }
}
```

## Shot Types

- **wide**: Full scene context
- **medium**: Waist up
- **close_up**: Face/emotion
- **extreme_close_up**: Detail
- **two_shot**: Two characters
- **over_shoulder**: POV shot
- **point_of_view**: Character view

## Instructions

1. Identify shot type and framing
2. Specify camera position
3. Describe lens and aperture
4. Note subject placement
5. Add lighting details
6. Include technical specs
7. Create negative prompts
8. Generate variations

## Examples

### Example 1: Two-Shot Dialogue

**Input:**

```json
{
  "shot": {
    "type": "two_shot",
    "subjects": ["Emma", "Marcus"],
    "setting": "Coffee shop table"
  }
}
```

**Output:**

```json
{
  "prompts": [
    {
      "type": "primary",
      "prompt": "Cinematic two-shot, man and woman sitting across from each other at small round table in cozy coffee shop, warm afternoon light from large window behind, shallow depth of field, 50mm lens, eye-level camera angle, intimate 4-foot distance between subjects, soft focus background, film photography look, warm brown and cream tones, professional cinematography",
      "negativePrompt": "wide angle distortion, harsh lighting, cold colors, empty background, modern sterile",
      "aspectRatio": "16:9"
    },
    {
      "type": "alternative_angle",
      "prompt": "Same scene from 45-degree angle, showing both profiles, coffee cups on table between them, warm window light creating rim lighting on hair, 50mm lens, cinematic composition",
      "aspectRatio": "16:9"
    }
  ],
  "composition": {
    "shotType": "two_shot_medium",
    "framing": "waist_up",
    "subjectPlacement": "balanced_left_right",
    "tablePosition": "foreground_leading_lines",
    "background": "softly_blurred_coffee_shop",
    "depthOfField": "shallow_f/2.0"
  },
  "camera": {
    "position": "eye_level",
    "height": "5.5_feet",
    "distance": "6_feet_from_subjects",
    "angle": "straight_on",
    "lens": "50mm_standard",
    "aperture": "f/2.0"
  },
  "lighting": {
    "key": "window_light_camera_right",
    "fill": "ambient_bounce",
    "rim": "subtle_from_window",
    "quality": "soft_warm"
  }
}
```

### Example 2: Close-Up Emotional

**Input:**

```json
{
  "shot": {
    "type": "close_up",
    "subject": "Emma",
    "emotion": "tearful realization"
  }
}
```

**Output:**

```json
{
  "prompts": [
    {
      "type": "primary",
      "prompt": "Cinematic close-up of woman's face, single tear on cheek, emotional vulnerable expression, soft natural lighting, shallow depth of field, 85mm lens, eye-level, eyes in sharp focus, film grain texture, warm color tones, intimate portrait photography",
      "negativePrompt": "wide angle, distorted, harsh flash, multiple people, busy background",
      "aspectRatio": "16:9"
    },
    {
      "type": "choker",
      "prompt": "Extreme close-up of woman's eyes, glistening with tears, shallow depth of field, 100mm macro lens, intense emotional focus, soft lighting, cinematic",
      "aspectRatio": "2.39:1"
    }
  ],
  "composition": {
    "framing": "choker_close_up",
    "headroom": "minimal",
    "eyeline": "slight_low_angle",
    "focus": "critical_on_eyes",
    "noseRoom": "generous"
  },
  "camera": {
    "lens": "85mm_portrait",
    "aperture": "f/1.8",
    "distance": "3_feet",
    "height": "slight_low",
    "movement": "locked_off"
  },
  "lighting": {
    "key": "soft_source_45_degrees",
    "ratio": "3:1",
    "fill": "minimal",
    "catchlights": "present_in_eyes"
  }
}
```

## Error Handling

- Returns basic composition if shot unclear
- Flags lens/angle mismatches
- Warns about impossible framings
- Suggests alternatives
