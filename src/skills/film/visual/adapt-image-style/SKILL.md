---
name: adapt-image-style
version: '1.0.0'
author: sdkwork.com
description: Adapt image prompts to different visual styles and aesthetics. Use for style exploration and variation generation.
category: visual
license: Apache-2.0
compatibility: Works with any AI image generator
metadata:
  tags: style adaptation aesthetic variation transformation
---

# Adapt Image Style

## Purpose

Transform image prompts to match different visual styles, aesthetics, and artistic approaches while maintaining the core subject and composition.

## When to Use

- Exploring visual options
- Creating style variations
- Matching brand aesthetics
- Adapting to different platforms
- Mood exploration

## Inputs

- `prompt` (string, required): Original prompt
- `targetStyle` (string, required): Desired style
- `preserveElements` (array, optional): Elements to maintain (default: ['composition', 'subject'])

## Outputs

```json
{
  "originalPrompt": "Cinematic coffee shop scene, warm lighting",
  "adaptedPrompts": [
    {
      "style": "noir",
      "prompt": "Film noir coffee shop scene, high contrast black and white, dramatic shadows, venetian blind light patterns, moody atmosphere, 1940s aesthetic, cigarette smoke, venetian blinds, chiaroscuro lighting, cinematic",
      "keyChanges": ["monochrome", "high contrast", "dramatic shadows"]
    },
    {
      "style": "anime",
      "prompt": "Anime style coffee shop scene, soft pastel colors, detailed background art, cinematic composition, Studio Ghibli inspired, warm lighting, cozy atmosphere, illustrated, 2D animation style",
      "keyChanges": ["illustrated style", "pastel colors", "anime aesthetic"]
    },
    {
      "style": "vintage",
      "prompt": "1970s vintage photograph coffee shop, film grain, warm faded colors, Kodachrome aesthetic, soft focus, nostalgic atmosphere, analog photography, sepia tones",
      "keyChanges": ["film grain", "faded colors", "analog look"]
    }
  ],
  "styleCharacteristics": {
    "noir": {
      "lighting": "high_contrast_dramatic",
      "color": "monochrome_or_desaturated",
      "mood": "mysterious_tense"
    },
    "anime": {
      "rendering": "illustrated_2D",
      "color": "vibrant_pastel",
      "detail": "stylized_clean"
    },
    "vintage": {
      "texture": "film_grain",
      "color": "faded_warm",
      "quality": "analog_imperfect"
    }
  }
}
```

## Style Categories

- **Cinematic**: Film looks, camera styles
- **Artistic**: Painting, illustration styles
- **Vintage**: Era-specific aesthetics
- **Modern**: Contemporary looks
- **Genre**: Horror, romance, sci-fi
- **Cultural**: Regional aesthetics

## Instructions

1. Analyze original prompt elements
2. Identify style characteristics
3. Transform visual descriptors
4. Adjust lighting and color
5. Modify texture and detail
6. Maintain core composition
7. Generate style variations
8. Document key changes

## Examples

### Example 1: Coffee Shop Scene Variations

**Input:**

```
Original: "Cinematic two-shot in coffee shop, warm afternoon light, couple at table"
Target Styles: ["noir", "anime", "vintage_70s"]
```

**Output:**

```json
{
  "originalPrompt": "Cinematic two-shot in coffee shop, warm afternoon light, couple at table",
  "adaptations": [
    {
      "style": "film_noir",
      "prompt": "Film noir scene in dimly lit coffee shop, high contrast black and white, dramatic venetian blind shadows across couple at table, smoke in air, 1940s aesthetic, chiaroscuro lighting, mystery and tension, cigarette smoke wisps, sharp shadows, cinematic noir photography",
      "characteristics": {
        "color": "monochrome_high_contrast",
        "lighting": "dramatic_directional_shadows",
        "atmosphere": "smoky_mysterious",
        "era": "1940s",
        "mood": "tense_dramatic"
      },
      "preserved": ["two_shot", "coffee_shop", "couple_at_table"]
    },
    {
      "style": "anime_studio_ghibli",
      "prompt": "Studio Ghibli anime style coffee shop scene, soft watercolor backgrounds, warm afternoon light filtering through windows, couple at wooden table, detailed hand-painted aesthetic, cozy atmosphere, pastel color palette, 2D illustrated, Miyazaki inspired, gentle lighting",
      "characteristics": {
        "rendering": "2D_hand_painted",
        "color": "soft_pastel_warm",
        "detail": "detailed_backgrounds_soft_characters",
        "atmosphere": "whimsical_cozy",
        "reference": "Studio_Ghibli"
      },
      "preserved": ["coffee_shop", "couple", "warm_light"]
    },
    {
      "style": "vintage_1970s",
      "prompt": "1970s vintage photograph coffee shop interior, Kodachrome film look, warm faded colors, soft grain texture, couple at formica table, analog photography aesthetic, nostalgic atmosphere, slightly desaturated, film imperfections, vintage color palette",
      "characteristics": {
        "texture": "film_grain_soft",
        "color": "faded_warm_kodachrome",
        "quality": "analog_imperfect",
        "era": "1970s",
        "mood": "nostalgic_warm"
      },
      "preserved": ["coffee_shop", "couple", "table"]
    }
  ],
  "transformationGuide": {
    "lighting": {
      "original": "warm_afternoon_natural",
      "noir": "dramatic_directional_shadows",
      "anime": "soft_diffused_painterly",
      "vintage": "warm_faded_natural"
    },
    "color": {
      "original": "warm_browns_creams",
      "noir": "monochrome_high_contrast",
      "anime": "pastel_soft_vibrant",
      "vintage": "faded_kodachrome_warm"
    },
    "atmosphere": {
      "original": "intimate_romantic",
      "noir": "mysterious_tense",
      "anime": "whimsical_gentle",
      "vintage": "nostalgic_comfortable"
    }
  }
}
```

### Example 2: Portrait Style Adaptations

**Input:**

```
Original: "Professional headshot portrait, soft lighting, neutral background"
Target Styles: ["impressionist", "cyberpunk", "renaissance"]
```

**Output:**

```json
{
  "adaptations": [
    {
      "style": "impressionist_painting",
      "prompt": "Impressionist oil painting portrait, visible brushstrokes, soft dappled light, pastel color palette, Monet inspired, painterly texture, loose brushwork, atmospheric, 19th century art style, soft edges",
      "characteristics": {
        "technique": "visible_brushstrokes",
        "light": "dappled_soft",
        "texture": "painterly_oil",
        "edges": "soft_blended"
      }
    },
    {
      "style": "cyberpunk_digital",
      "prompt": "Cyberpunk portrait, neon lighting, holographic elements, futuristic aesthetic, high contrast, cyan and magenta color scheme, digital art style, tech implants, glowing accents, Blade Runner inspired, dystopian atmosphere",
      "characteristics": {
        "lighting": "neon_high_contrast",
        "color": "cyan_magenta_purple",
        "elements": "futuristic_tech",
        "atmosphere": "dystopian_neon"
      }
    },
    {
      "style": "renaissance_master",
      "prompt": "Renaissance oil painting portrait, chiaroscuro lighting, rich deep colors, classical composition, Leonardo da Vinci inspired, sfumato technique, dignified pose, dark background, masterful detail, 16th century style",
      "characteristics": {
        "technique": "sfumato_chiaroscuro",
        "light": "dramatic_directional",
        "color": "rich_deep_earth_tones",
        "composition": "classical_balanced"
      }
    }
  ]
}
```

## Error Handling

- Returns closest match if style unclear
- Flags incompatible combinations
- Warns about lost elements
- Suggests alternative styles
