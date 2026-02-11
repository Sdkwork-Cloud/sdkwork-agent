---
name: apply-visual-style
version: '1.0.0'
author: sdkwork.com
description: Apply visual style and color grading to video. Use for final look and aesthetic consistency.
category: post-production
license: Apache-2.0
compatibility: Works with color grading systems
metadata:
  tags: color grading visual style LUT aesthetic
---

# Apply Visual Style

## Purpose

Apply consistent visual style, color grading, and aesthetic treatments to video for final look and mood.

## When to Use

- Color grading
- Look development
- Style consistency
- Mood enhancement
- Final polish

## Inputs

- `video` (object, required): Video to grade
- `style` (string, required): Target visual style
- `reference` (string, optional): Reference image or description

## Outputs

```json
{
  "colorGrading": {
    "lut": "warm_romantic",
    "primary": {
      "lift": ["0.02", "0.01", "0.00"],
      "gamma": ["1.05", "1.02", "0.98"],
      "gain": ["1.10", "1.05", "1.00"]
    },
    "curves": {
      "shadows": "lifted_warm",
      "highlights": "compressed_soft"
    },
    "saturation": {
      "overall": 0.95,
      "skinTone": 0.9
    }
  },
  "look": {
    "style": "warm_romantic",
    "characteristics": ["lifted_shadows", "warm_mids", "soft_highlights"]
  }
}
```

## Style Elements

- **LUT**: Color lookup table
- **Curves**: Tonal adjustments
- **Primaries**: Lift/gamma/gain
- **Saturation**: Color intensity
- **Grain**: Film texture

## Instructions

1. Analyze source footage
2. Define target style
3. Apply base LUT
4. Adjust primaries
5. Fine-tune curves
6. Balance saturation
7. Add texture/grain
8. Final review

## Examples

### Example 1: Warm Romantic Look

**Input:**

```
Video: Romance scene
Style: Warm, nostalgic
Reference: "Before Sunrise"
```

**Output:**

```json
{
  "colorGrade": {
    "look": {
      "name": "warm_romantic_nostalgic",
      "description": "Lifted shadows, warm mids, soft romantic feel",
      "reference": "Before Sunrise cinematography"
    },
    "primaryCorrections": {
      "lift": {
        "red": 0.02,
        "green": 0.01,
        "blue": 0.0,
        "note": "Warm lifted blacks"
      },
      "gamma": {
        "red": 1.05,
        "green": 1.02,
        "blue": 0.98,
        "note": "Warm midtones"
      },
      "gain": {
        "red": 1.08,
        "green": 1.04,
        "blue": 1.0,
        "note": "Warm highlights"
      }
    },
    "curves": {
      "rgb": "slight_s_curve",
      "red": "lifted_shadows",
      "green": "neutral",
      "blue": "pulled_down_mids"
    },
    "hueSaturation": {
      "skinTones": {
        "hue": 0,
        "saturation": -5,
        "note": "Natural skin"
      },
      "shadows": {
        "saturation": -10,
        "note": "Desaturate shadows"
      },
      "highlights": {
        "saturation": -5,
        "note": "Soft highlights"
      }
    },
    "texture": {
      "grain": "subtle_35mm",
      "intensity": 0.15,
      "size": "medium"
    },
    "effects": {
      "vignette": {
        "amount": 0.1,
        "feather": 0.6,
        "note": "Subtle focus on center"
      },
      "glow": {
        "amount": 0.05,
        "note": "Soft romantic glow"
      }
    }
  },
  "sceneAdjustments": [
    {
      "scene": 1,
      "note": "Base grade works well",
      "adjustment": "none"
    },
    {
      "scene": 3,
      "note": "Argument scene needs contrast",
      "adjustment": "increase_contrast_10%"
    }
  ]
}
```

## Error Handling

- Returns basic grade if style unclear
- Flags incompatible looks
- Warns about over-processing
- Suggests alternatives
