---
name: generate-shot-video-text
version: '1.0.0'
author: sdkwork.com
description: Generate video prompts from text descriptions for text-to-video AI models. Use for creating video content from script descriptions.
category: video
license: Apache-2.0
compatibility: Works with text-to-video AI models
metadata:
  tags: video generation text-to-video prompt AI
---

# Generate Shot Video (Text)

## Purpose

Create optimized prompts for text-to-video AI models to generate video content from textual scene descriptions.

## When to Use

- Text-to-video generation
- Quick video prototyping
- Content creation from scripts
- Visualizing written descriptions
- AI video production

## Inputs

- `description` (string, required): Text description of the scene/action
- `duration` (number, optional): Target duration in seconds (default: 4)
- `style` (string, optional): 'cinematic' | 'realistic' | 'animated' (default: 'cinematic')

## Outputs

```json
{
  "prompts": [
    {
      "type": "primary",
      "prompt": "Cinematic shot of woman walking through sunlit forest, dappled light filtering through trees, gentle breeze moving hair and leaves, slow walking pace, peaceful atmosphere, shallow depth of field, 24fps, smooth camera movement tracking alongside, warm afternoon light, professional cinematography",
      "duration": 4,
      "motion": "slow_walking_tracking_shot"
    }
  ],
  "motionDescriptors": [
    "slow fluid movement",
    "gentle breeze effects",
    "natural walking pace",
    "smooth camera tracking"
  ],
  "technical": {
    "frameRate": "24fps",
    "motion": "smooth",
    "camera": "tracking",
    "duration": "4_seconds"
  },
  "negativePrompt": "fast jerky movement, blurry, distorted, unnatural motion, shaky camera"
}
```

## Motion Elements

- **Subject movement**: Walking, running, gesturing
- **Camera movement**: Pan, tilt, track, dolly
- **Environmental motion**: Wind, water, particles
- **Temporal flow**: Speed, pacing, rhythm

## Instructions

1. Analyze the text description
2. Identify key motions
3. Describe camera movement
4. Add environmental details
5. Specify temporal aspects
6. Include technical specs
7. Create negative prompts
8. Optimize for video models

## Examples

### Example 1: Walking Scene

**Input:**

```
Description: "Emma walks through a sunlit forest, feeling peaceful"
Duration: 4 seconds
```

**Output:**

```json
{
  "prompts": [
    {
      "type": "primary",
      "prompt": "Cinematic tracking shot of young woman walking slowly through beautiful sunlit forest, golden afternoon light filtering through tree canopy creating dappled patterns on ground, gentle breeze rustling leaves and moving her hair, peaceful serene expression, shallow depth of field, smooth camera movement tracking alongside at walking pace, 24fps cinematic motion, warm natural lighting, professional film quality",
      "duration": 4,
      "motionIntensity": "gentle",
      "cameraMovement": "smooth_tracking"
    },
    {
      "type": "alternative",
      "prompt": "Wide establishing shot of woman walking away from camera into sunlit forest path, long shadows, atmospheric dust particles in light beams, slow peaceful walking pace, cinematic composition, 24fps",
      "duration": 4
    }
  ],
  "motionBreakdown": {
    "subject": "natural_walking_pace",
    "camera": "smooth_tracking_sideways",
    "environment": [
      "leaves_rustling_gentle_breeze",
      "hair_moving_naturally",
      "light_dappling_animated"
    ]
  },
  "technicalSpecs": {
    "frameRate": "24fps_cinematic",
    "motionBlur": "natural",
    "stabilization": "smooth_professional",
    "duration": "4_seconds"
  },
  "negativePrompt": "fast movement, jerky motion, blurry, distorted, shaky camera, unnatural walking, teleporting, morphing"
}
```

### Example 2: Emotional Close-Up

**Input:**

```
Description: "Close-up of Emma's face as tears form, emotional moment"
Duration: 3 seconds
```

**Output:**

```json
{
  "prompts": [
    {
      "type": "primary",
      "prompt": "Cinematic close-up of woman's face, single tear forming and rolling down cheek, subtle emotional expression, eyes glistening, soft natural lighting on face, shallow depth of field, 85mm lens perspective, smooth subtle motion, 24fps, very slow gentle movement, intimate emotional moment, professional cinematography",
      "duration": 3,
      "focus": "critical_on_eyes"
    }
  ],
  "motionDescriptors": [
    "very slow subtle motion",
    "tear rolling naturally",
    "minimal camera movement",
    "gentle breathing motion"
  ],
  "negativePrompt": "fast movement, exaggerated motion, blurry face, distorted features, multiple faces, morphing"
}
```

## Error Handling

- Returns basic prompt if description unclear
- Flags complex motions needing simplification
- Warns about temporal inconsistencies
- Suggests shorter durations for complex scenes
