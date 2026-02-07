---
name: generate-background-music
version: '1.0.0'
author: sdkwork.com
description: Generate music direction and prompts for background score. Use for scoring and music production.
category: audio
license: Apache-2.0
compatibility: Works with music generation systems
metadata:
  tags: music background score soundtrack emotional
---

# Generate Background Music

## Purpose

Create detailed music direction for background scoring, including emotional tone, instrumentation, and timing for scenes.

## When to Use

- Film scoring
- Music generation
- Temp track creation
- Composer briefings
- Audio post-production

## Inputs

- `scene` (object, required): Scene description and emotion
- `duration` (number, required): Music duration in seconds
- `style` (string, optional): Music style preference (default: 'cinematic')

## Outputs

```json
{
  "musicDirection": {
    "emotion": "bittersweet_nostalgia",
    "intensity": 6,
    "arc": "gentle_build_to_emotional_peak",
    "style": "cinematic_orchestral",
    "tempo": "slow_andante",
    "key": "G_major_to_E_minor"
  },
  "instrumentation": {
    "primary": ["solo_piano", "strings"],
    "secondary": ["soft_brass", "harp"],
    "texture": "sparse_to_rich",
    "dynamics": "piano_to_mezzo_forte"
  },
  "structure": {
    "intro": "0-10s_piano_solo",
    "build": "10-30s_strings_enter",
    "peak": "30-45s_full_ensemble",
    "release": "45-60s_piano_return"
  },
  "prompts": [
    {
      "type": "ai_generation",
      "prompt": "Bittersweet cinematic orchestral music, solo piano opening, gentle strings entering, emotional but restrained, nostalgic atmosphere, 60 seconds, G major transitioning to E minor, film score quality"
    }
  ],
  "referenceTracks": ["similar_emotional_scores"],
  "technical": {
    "bpm": 72,
    "timeSignature": "4/4",
    "dynamicsRange": "pp_to_mf"
  }
}
```

## Music Elements

- **Emotion**: Primary feeling to convey
- **Tempo**: Speed (BPM)
- **Key**: Musical key and modulations
- **Instrumentation**: Instruments to use
- **Dynamics**: Volume changes
- **Texture**: Density of sound

## Instructions

1. Analyze scene emotion
2. Determine musical arc
3. Choose instrumentation
4. Plan structure and timing
5. Set tempo and key
6. Create generation prompts
7. Note reference tracks
8. Provide technical specs

## Examples

### Example 1: Reunion Scene

**Input:**

```
Scene: Emotional reunion after years apart
Duration: 60 seconds
Emotion: Bittersweet, hopeful
```

**Output:**

```json
{
  "musicDirection": {
    "primaryEmotion": "bittersweet_hope",
    "secondaryEmotions": ["nostalgia", "tenderness", "caution"],
    "intensity": 6,
    "arc": "gentle_introduction_building_to_warm_embrace",
    "narrative": "recognition_to_connection_to_hope"
  },
  "instrumentation": {
    "primary": ["solo_piano", "chamber_strings"],
    "supporting": ["soft_harp", "warm_brass_pads"],
    "texture": "intimate_to_rich",
    "soloFeature": "piano_melody_with_string_harmonies"
  },
  "structure": {
    "sections": [
      {
        "name": "Recognition",
        "time": "0-15s",
        "description": "Solo piano, tentative melody",
        "dynamics": "piano",
        "emotion": "hesitant_wonder"
      },
      {
        "name": "Connection",
        "time": "15-40s",
        "description": "Strings enter, harmony builds",
        "dynamics": "piano_to_mezzo_piano",
        "emotion": "warming_embrace"
      },
      {
        "name": "Hope",
        "time": "40-60s",
        "description": "Full ensemble, gentle resolution",
        "dynamics": "mezzo_forte",
        "emotion": "bittersweet_optimism"
      }
    ]
  },
  "musicalElements": {
    "tempo": "Andante",
    "bpm": 76,
    "timeSignature": "4/4",
    "key": "G_major_with_E_minor_moments",
    "harmonicProgression": "I-vi-IV-V_with_modal_interchange",
    "rhythm": "flowing_eighth_notes",
    "melody": "lyrical_singing_quality"
  },
  "prompts": [
    {
      "type": "ai_generation",
      "prompt": "Bittersweet romantic cinematic score, solo piano melody with gentle string accompaniment, nostalgic and hopeful, 76 BPM, G major, intimate to warm, 60 seconds, film music quality, emotional but restrained"
    },
    {
      "type": "composer_brief",
      "prompt": "Theme for reunion scene: Start with tentative piano, build with strings, end on hopeful but uncertain note. Reference: themes from 'Before Sunrise' or 'Eternal Sunshine'"
    }
  ],
  "referenceTracks": ["Before Sunrise - main theme", "Eternal Sunshine - spotless mind theme"],
  "technical": {
    "mixNotes": "Keep piano prominent, strings supportive, avoid overwhelming dialogue",
    "frequencyRange": "focus_on_midrange_warmth",
    "dynamics": "gentle_swells_not_jarring"
  }
}
```

### Example 2: Tension Scene

**Input:**

```
Scene: Building suspense, character searching
Duration: 45 seconds
Emotion: Suspense, mystery
```

**Output:**

```json
{
  "musicDirection": {
    "primaryEmotion": "building_suspense",
    "intensity": 7,
    "arc": "subtle_tension_mounting",
    "style": "minimalist_thriller"
  },
  "instrumentation": {
    "primary": ["low_strings", "subtle_synth"],
    "effects": ["ambient_textures", "subtle_pulses"],
    "texture": "sparse_ominous",
    "avoid": ["melody", "resolution"]
  },
  "structure": {
    "intro": "0-10s_low_drone",
    "build": "10-30s_adding_pulses",
    "climax": "30-45s_peak_tension"
  },
  "prompts": [
    {
      "type": "ai_generation",
      "prompt": "Suspenseful minimalist thriller music, low string drones, subtle electronic pulses, building tension, no melody, ominous atmosphere, 45 seconds, cinematic"
    }
  ]
}
```

## Error Handling

- Returns basic direction if scene unclear
- Flags impossible durations
- Warns about instrumentation conflicts
- Suggests alternative approaches
