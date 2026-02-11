---
name: generate-cover-image
version: '1.0.0'
author: sdkwork.com
description: Generate cover image and thumbnail for video content. Use for platform publishing and marketing.
category: publishing
license: Apache-2.0
compatibility: Works with image generation systems
metadata:
  tags: cover image thumbnail marketing platform
---

# Generate Cover Image

## Purpose

Create compelling cover images and thumbnails optimized for different platforms to maximize click-through rates and viewer engagement.

## When to Use

- Platform publishing
- Marketing materials
- Social media
- Video thumbnails
- Promotional content

## Inputs

- `video` (object, required): Video content information
- `platform` (string, required): 'youtube' | 'tiktok' | 'instagram' | 'generic'
- `style` (string, optional): 'cinematic' | 'dramatic' | 'mysterious' | 'romantic' (default: 'cinematic')

## Outputs

```json
{
  "coverImages": [
    {
      "platform": "youtube",
      "dimensions": "1280x720",
      "prompt": "Cinematic thumbnail of emotional reunion scene, close-up of two faces, warm lighting, text overlay space at top, high contrast, engaging composition",
      "textSafeZones": {
        "top": "title_area",
        "bottom": "branding_area"
      }
    }
  ],
  "specifications": {
    "resolution": "1280x720",
    "format": "JPG",
    "maxSize": "2MB"
  }
}
```

## Platform Specifications

- **YouTube**: 1280x720, 16:9
- **TikTok**: 1080x1920, 9:16
- **Instagram**: 1080x1080, 1:1
- **Generic**: 1920x1080, 16:9

## Instructions

1. Analyze video content
2. Identify key visual
3. Choose platform specs
4. Design composition
5. Add text zones
6. Optimize contrast
7. Generate variations
8. Export formats

## Examples

### Example 1: YouTube Thumbnail

**Input:**

```
Video: Romance reunion scene
Platform: YouTube
Style: Emotional
```

**Output:**

```json
{
  "coverGeneration": {
    "platform": "youtube",
    "specifications": {
      "dimensions": "1280x720",
      "aspectRatio": "16:9",
      "format": "JPG",
      "maxFileSize": "2MB",
      "minResolution": "1280x720"
    },
    "prompts": [
      {
        "type": "primary",
        "prompt": "Cinematic YouTube thumbnail, emotional close-up of man and woman facing each other, intense eye contact, warm golden lighting, shallow depth of field, high contrast, engaging composition, professional photography, text-safe areas at top and bottom, 1280x720, 16:9 aspect ratio",
        "focus": "emotional_connection",
        "colors": "warm_gold_cream_high_contrast"
      },
      {
        "type": "alternative",
        "prompt": "Dramatic thumbnail, silhouette of couple against window light, mysterious atmosphere, high contrast, intriguing composition, cinematic, 1280x720",
        "focus": "intrigue_mystery"
      }
    ],
    "composition": {
      "ruleOfThirds": "faces_at_intersections",
      "textSafeZone": {
        "top": "15%_of_height",
        "bottom": "20%_of_height",
        "purpose": "title_and_branding"
      },
      "focalPoint": "eye_contact_between_characters",
      "background": "softly_blurred_coffee_shop"
    },
    "optimization": {
      "contrast": "high_for_mobile_visibility",
      "readability": "clear_at_small_sizes",
      "emotion": "clearly_conveyed",
      "clickAppeal": "curiosity_and_emotion"
    }
  }
}
```

## Error Handling

- Returns generic specs if platform unclear
- Flags resolution issues
- Warns about text placement
- Suggests alternatives
