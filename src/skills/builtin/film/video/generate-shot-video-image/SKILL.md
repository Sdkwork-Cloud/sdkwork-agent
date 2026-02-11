---
name: generate-shot-video-image
version: '1.0.0'
author: sdkwork.com
description: Generate video prompts from reference images for image-to-video AI models. Use for animating still images and creating video from visuals.
category: video
license: Apache-2.0
compatibility: Works with image-to-video AI models
metadata:
  tags: video generation image-to-video animation motion
---

# Generate Shot Video (Image)

## Purpose

Create optimized prompts for image-to-video AI models to animate still images and generate video content from visual references.

## When to Use

- Animating concept art
- Bringing storyboards to life
- Image-to-video generation
- Motion design from stills
- Visual effects creation

## Inputs

- `image` (string, required): Reference image path or description
- `motionType` (string, optional): Type of motion to add (default: 'subtle')
- `duration` (number, optional): Target duration in seconds (default: 4)

## Outputs

```json
{
  "prompts": [
    {
      "type": "image_to_video",
      "prompt": "Gentle subtle motion, soft breeze moving hair and fabric, atmospheric dust particles floating, warm lighting subtly shifting, very slow cinematic movement, 24fps, smooth professional motion, maintain composition",
      "motionIntensity": "subtle",
      "focusAreas": ["hair", "fabric", "particles"]
    }
  ],
  "motionPlan": {
    "primary": "gentle_breeze_effects",
    "secondary": ["subtle_light_shift", "atmospheric_particles"],
    "camera": "static_with_micro_movement"
  },
  "technical": {
    "frameRate": "24fps",
    "motionSmoothness": "high",
    "duration": "4_seconds"
  },
  "negativePrompt": "fast movement, jerky motion, distorted, morphing, changing composition"
}
```

## Motion Types

- **subtle**: Minimal movement, atmospheric
- **gentle**: Soft natural motion
- **dynamic**: Active movement
- **dramatic**: Intense motion
- **cinematic**: Film-style movement

## Instructions

1. Analyze reference image
2. Identify animatable elements
3. Plan motion hierarchy
4. Describe motion quality
5. Specify temporal aspects
6. Maintain composition
7. Create motion prompts
8. Optimize for video models

## Examples

### Example 1: Portrait Animation

**Input:**

```
Image: Portrait of woman in natural light
Motion: Subtle breathing and atmosphere
```

**Output:**

```json
{
  "prompts": [
    {
      "type": "subtle_life",
      "prompt": "Very gentle subtle motion, natural breathing rhythm, soft hair movement from slight breeze, eye blinks naturally, subtle skin texture shifts, atmospheric dust particles in light, warm lighting very slowly shifting, 24fps cinematic, minimal motion, maintain sharp focus on face",
      "motionIntensity": "very_subtle",
      "duration": 4
    }
  ],
  "motionPlan": {
    "facial": ["natural_blinking", "subtle_expression_shifts", "breathing_chest_movement"],
    "hair": "gentle_breeze_movement",
    "environment": ["dust_particles_floating", "light_quality_shifting"],
    "camera": "micro_movement_breathing"
  },
  "technical": {
    "frameRate": "24fps",
    "motionSmoothness": "very_high",
    "duration": "4_seconds",
    "focus": "maintain_sharp"
  },
  "negativePrompt": "fast movement, distorted face, morphing, changing features, blurry, excessive motion"
}
```

### Example 2: Landscape Animation

**Input:**

```
Image: Forest scene with sunlight
Motion: Wind and light movement
```

**Output:**

```json
{
  "prompts": [
    {
      "type": "environmental",
      "prompt": "Gentle wind moving through trees, leaves rustling naturally, grass swaying softly, sunbeams shifting subtly through canopy, atmospheric particles floating in light, clouds moving slowly in sky, 24fps smooth natural motion, cinematic quality",
      "motionIntensity": "gentle",
      "duration": 4
    }
  ],
  "motionPlan": {
    "foreground": ["grass_swaying_wind", "leaves_rustling"],
    "midground": ["branches_swaying", "foliage_movement"],
    "background": ["clouds_drifting", "light_beams_shifting"],
    "camera": "static"
  }
}
```

## Error Handling

- Returns static prompt if image unclear
- Flags motion conflicts
- Warns about complex animations
- Suggests simpler motions
