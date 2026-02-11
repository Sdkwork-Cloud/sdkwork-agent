---
name: generate-scene-image
version: '1.0.0'
author: sdkwork.com
description: Generate image prompts for scene visualization and concept art. Use for visual development and reference creation.
category: visual
license: Apache-2.0
compatibility: Works with any AI image generator
metadata:
  tags: image generation prompt scene concept art
---

# Generate Scene Image

## Purpose

Create detailed image generation prompts for visualizing scenes, generating concept art, and creating reference images for production.

## When to Use

- Concept art creation
- Visual reference for crew
- Location scouting preparation
- Set design visualization
- Mood board creation

## Inputs

- `scene` (object, required): Scene information
- `style` (string, optional): 'cinematic' | 'realistic' | 'illustrated' | 'moody' (default: 'cinematic')
- `purpose` (string, optional): 'concept' | 'reference' | 'mood' | 'presentation' (default: 'concept')

## Outputs

```json
{
  "prompts": [
    {
      "type": "master",
      "prompt": "Cinematic wide shot of cozy coffee shop interior, warm golden hour lighting streaming through large windows, vintage decor, wooden tables, soft atmosphere, 35mm film look, shallow depth of field, color grading warm browns and creams, professional cinematography",
      "negativePrompt": "harsh lighting, cold colors, modern sterile, empty, dark",
      "aspectRatio": "16:9",
      "style": "cinematic_photography"
    },
    {
      "type": "detail",
      "prompt": "Close-up detail of weathered wooden coffee table surface, warm afternoon light, coffee cup with steam, vintage aesthetic, shallow depth of field, film grain texture",
      "aspectRatio": "1:1"
    }
  ],
  "lighting": {
    "timeOfDay": "late_afternoon",
    "quality": "soft_golden",
    "direction": "side_lighting_windows",
    "colorTemp": "3200K_warm"
  },
  "mood": "intimate_nostalgic",
  "colorPalette": ["warm_brown", "cream", "soft_gold", "deep_amber"],
  "technical": {
    "camera": "35mm",
    "lens": "50mm",
    "aperture": "f/2.0",
    "filmStock": "Kodak_Vision3"
  }
}
```

## Prompt Components

- **Subject**: Main focus of image
- **Setting**: Environment and location
- **Lighting**: Quality, direction, color
- **Style**: Visual aesthetic
- **Mood**: Emotional tone
- **Technical**: Camera and lens specs

## Instructions

1. Analyze scene requirements
2. Identify key visual elements
3. Describe lighting conditions
4. Specify color palette
5. Add technical specifications
6. Create negative prompts
7. Adjust for purpose
8. Generate multiple variations

## Examples

### Example 1: Coffee Shop Scene

**Input:**

```json
{
  "scene": {
    "location": "Coffee Shop",
    "time": "Late afternoon",
    "mood": "Intimate, nostalgic",
    "keyElements": ["warm lighting", "vintage decor", "wooden furniture"]
  }
}
```

**Output:**

```json
{
  "prompts": [
    {
      "type": "establishing",
      "prompt": "Cinematic establishing shot of charming neighborhood coffee shop exterior, late afternoon golden hour, warm sunlight filtering through trees, inviting atmosphere, vintage storefront, people sitting at outdoor tables, 35mm anamorphic lens, shallow depth of field, warm color grading, professional film photography",
      "negativePrompt": "harsh midday sun, cold sterile modern building, empty street, neon lights",
      "aspectRatio": "2.39:1",
      "priority": "high"
    },
    {
      "type": "interior_wide",
      "prompt": "Wide interior shot of cozy coffee shop, warm afternoon light streaming through large windows, vintage wooden furniture, exposed brick walls, soft atmospheric haze, customers at tables, barista behind counter, 35mm film look, shallow depth of field, warm brown and cream color palette, cinematic composition",
      "negativePrompt": "fluorescent lighting, modern minimalist, empty, dark shadows",
      "aspectRatio": "16:9"
    },
    {
      "type": "detail_atmosphere",
      "prompt": "Detail shot of sunlit coffee cup on wooden table, steam rising, warm golden light, vintage ceramic, cozy atmosphere, shallow depth of field, soft bokeh background, film grain texture, intimate mood",
      "aspectRatio": "4:5"
    }
  ],
  "lighting": {
    "timeOfDay": "golden_hour_late_afternoon",
    "quality": "soft_warm",
    "direction": "side_lighting_through_windows",
    "colorTemperature": "3200K",
    "mood": "intimate_nostalgic"
  },
  "colorPalette": {
    "primary": ["warm_brown", "deep_amber", "cream"],
    "secondary": ["soft_gold", "weathered_wood"],
    "avoid": ["cool_blues", "harsh_whites"]
  },
  "technical": {
    "camera": "ARRI_Alexa",
    "lens": "35mm_anamorphic",
    "aperture": "f/2.8",
    "filmStock": "Kodak_Vision3_500T",
    "grain": "subtle"
  },
  "moodKeywords": ["intimate", "nostalgic", "warm", "inviting", "comfortable"]
}
```

### Example 2: Dramatic Night Scene

**Input:**

```json
{
  "scene": {
    "location": "Rainy city street",
    "time": "Night",
    "mood": "Moody, mysterious, noir",
    "keyElements": ["rain", "neon lights", "reflections", "shadows"]
  }
}
```

**Output:**

```json
{
  "prompts": [
    {
      "type": "atmosphere",
      "prompt": "Cinematic night scene of rain-soaked city street, neon signs reflecting in wet pavement, moody atmospheric lighting, film noir aesthetic, shadows and highlights, 35mm film look, high contrast, blue and orange color grading, mysterious atmosphere, shallow depth of field",
      "negativePrompt": "daylight, clear sky, bright cheerful, modern clean, sunny",
      "aspectRatio": "2.39:1"
    },
    {
      "type": "detail",
      "prompt": "Close-up of raindrops on window with blurred neon lights in background, bokeh circles, moody blue and purple tones, cinematic shallow depth of field, atmospheric, film grain",
      "aspectRatio": "16:9"
    }
  ],
  "lighting": {
    "timeOfDay": "night",
    "sources": ["neon_signs", "street_lights", "building_windows"],
    "quality": "high_contrast_moody",
    "colorTemperature": "mixed_3200K_5600K"
  },
  "colorPalette": {
    "primary": ["deep_blue", "neon_pink", "orange_glow"],
    "shadows": "rich_blacks",
    "highlights": "neon_accents"
  },
  "moodKeywords": ["noir", "mysterious", "atmospheric", "cinematic", "moody"]
}
```

## Error Handling

- Returns basic prompts if scene unclear
- Flags complex lighting scenarios
- Warns about style conflicts
- Suggests alternative approaches
