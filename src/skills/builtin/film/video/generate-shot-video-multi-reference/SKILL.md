---
name: generate-shot-video-multi-reference
version: '1.0.0'
author: sdkwork.com
description: Generate video prompts using multiple reference images for consistent character and scene generation. Use for maintaining continuity across shots.
category: video
license: Apache-2.0
compatibility: Works with multi-reference AI video models
metadata:
  tags: video generation multi-reference consistency continuity
---

# Generate Shot Video (Multi-Reference)

## Purpose

Create optimized prompts for AI video models that support multiple reference images to maintain character and scene consistency across generated videos.

## When to Use

- Character consistency across shots
- Scene continuity
- Style matching
- Reference-based generation
- Complex visual narratives

## Inputs

- `references` (array, required): Array of reference image paths or descriptions
- `primaryAction` (string, required): Main action to depict
- `consistencyLevel` (string, optional): 'strict' | 'moderate' | 'loose' (default: 'moderate')

## Outputs

```json
{
  "references": {
    "character": ["character_front_view.jpg", "character_profile.jpg"],
    "scene": ["location_establishing.jpg"],
    "style": ["reference_style.jpg"]
  },
  "prompts": [
    {
      "type": "multi_reference",
      "prompt": "Character from reference images performing action: walking through scene location, maintaining consistent appearance and clothing from character references, matching lighting and atmosphere from scene reference, adopting visual style from style reference, smooth natural movement, 24fps cinematic quality",
      "consistency": "high",
      "focus": "character_continuity"
    }
  ],
  "consistencyPlan": {
    "character": {
      "appearance": "maintain_from_references",
      "clothing": "match_reference_exactly",
      "features": "consistent_across_generation"
    },
    "environment": {
      "lighting": "match_scene_reference",
      "atmosphere": "consistent_tone",
      "details": "maintain_key_elements"
    },
    "style": {
      "rendering": "match_style_reference",
      "color": "consistent_palette",
      "quality": "maintain_level"
    }
  },
  "technical": {
    "referenceWeight": "high",
    "consistencyStrength": 0.8,
    "frameRate": "24fps"
  }
}
```

## Reference Types

- **character**: Character appearance references
- **scene**: Location and environment
- **style**: Visual style and aesthetic
- **lighting**: Lighting conditions
- **mood**: Atmosphere and tone

## Instructions

1. Organize reference images by type
2. Identify consistency priorities
3. Describe primary action
4. Plan reference weighting
5. Specify consistency strength
6. Create unified prompt
7. Set technical parameters
8. Validate reference compatibility

## Examples

### Example 1: Character Continuity

**Input:**

```
References: [
  "emma_front.jpg",
  "emma_side.jpg",
  "coffee_shop_scene.jpg"
]
Action: "Emma sits down at table"
```

**Output:**

```json
{
  "references": {
    "character": {
      "front": "emma_front.jpg",
      "profile": "emma_side.jpg",
      "priority": "highest"
    },
    "scene": {
      "location": "coffee_shop_scene.jpg",
      "priority": "high"
    }
  },
  "prompts": [
    {
      "type": "character_continuity",
      "prompt": "Character matching reference images exactly: same facial features, hairstyle, clothing, and appearance as character references, sitting down at table in coffee shop location matching scene reference, smooth natural sitting motion, maintaining consistent character identity throughout, 24fps cinematic",
      "consistency": "strict",
      "referenceWeight": 0.9
    }
  ],
  "consistencyPlan": {
    "facialFeatures": {
      "source": "character_references",
      "priority": "critical",
      "maintenance": "exact_match"
    },
    "clothing": {
      "source": "character_references",
      "priority": "high",
      "maintenance": "consistent_style_color"
    },
    "environment": {
      "source": "scene_reference",
      "priority": "high",
      "maintenance": "matching_atmosphere"
    }
  },
  "technical": {
    "referenceStrength": 0.85,
    "consistencyEnforcement": "strict",
    "frameRate": "24fps",
    "duration": "3_seconds"
  }
}
```

### Example 2: Style Matching

**Input:**

```
References: [
  "style_reference_noir.jpg",
  "character_main.jpg",
  "location_alley.jpg"
]
Action: "Character walks through alley"
```

**Output:**

```json
{
  "references": {
    "style": {
      "aesthetic": "style_reference_noir.jpg",
      "priority": "highest"
    },
    "character": {
      "appearance": "character_main.jpg",
      "priority": "high"
    },
    "location": {
      "setting": "location_alley.jpg",
      "priority": "medium"
    }
  },
  "prompts": [
    {
      "type": "style_priority",
      "prompt": "Scene rendered in noir style matching reference: high contrast black and white, dramatic shadows, cinematic lighting, character from reference walking through alley location, maintaining noir aesthetic throughout, film grain texture, 24fps",
      "styleWeight": 0.9,
      "characterWeight": 0.7
    }
  ],
  "styleParameters": {
    "lighting": "high_contrast_dramatic",
    "color": "monochrome",
    "texture": "film_grain",
    "atmosphere": "noir_moody"
  }
}
```

## Error Handling

- Returns basic prompt if references incompatible
- Flags consistency conflicts
- Warns about reference overload
- Suggests reference prioritization
