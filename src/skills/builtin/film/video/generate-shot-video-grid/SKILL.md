---
name: generate-shot-video-grid
version: '1.0.0'
author: sdkwork.com
description: Generate video prompts for grid-based multi-angle video generation. Use for creating multiple camera angles simultaneously.
category: video
license: Apache-2.0
compatibility: Works with grid-based AI video models
metadata:
  tags: video generation grid multi-angle camera coverage
---

# Generate Shot Video (Grid)

## Purpose

Create optimized prompts for grid-based AI video generation to produce multiple camera angles or variations simultaneously.

## When to Use

- Multi-angle coverage
- Simultaneous variations
- Coverage planning
- Virtual camera array
- Efficient batch generation

## Inputs

- `scene` (object, required): Scene description
- `gridLayout` (string, optional): '2x2' | '3x3' | '2x3' (default: '2x2')
- `angleVariation` (string, optional): 'subtle' | 'moderate' | 'dramatic' (default: 'moderate')

## Outputs

```json
{
  "grid": {
    "layout": "2x2",
    "cells": [
      {
        "position": "top_left",
        "angle": "wide_establishing",
        "prompt": "Wide establishing shot of coffee shop interior, full scene visible, warm lighting"
      },
      {
        "position": "top_right",
        "angle": "medium_two_shot",
        "prompt": "Medium two-shot of couple at table, intimate framing, shallow depth of field"
      },
      {
        "position": "bottom_left",
        "angle": "close_up_emma",
        "prompt": "Close-up of woman, emotional expression, soft lighting on face"
      },
      {
        "position": "bottom_right",
        "angle": "close_up_marcus",
        "prompt": "Close-up of man, listening intently, warm lighting"
      }
    ]
  },
  "masterPrompt": "Coffee shop scene with couple having conversation, warm afternoon light, cinematic quality, 24fps, smooth motion",
  "consistency": {
    "lighting": "matched_across_all_angles",
    "action": "synchronized_timing",
    "color": "consistent_grading"
  }
}
```

## Grid Layouts

- **2x2**: 4 angles (standard coverage)
- **2x3**: 6 angles (extended coverage)
- **3x3**: 9 angles (comprehensive)
- **1x4**: 4 horizontal variations
- **4x1**: 4 vertical variations

## Instructions

1. Define scene action
2. Choose grid layout
3. Plan angle distribution
4. Ensure consistency
5. Create cell prompts
6. Synchronize timing
7. Match lighting
8. Generate master prompt

## Examples

### Example 1: Standard Coverage

**Input:**

```
Scene: "Couple talking at coffee shop table"
Grid: "2x2"
```

**Output:**

```json
{
  "grid": {
    "layout": "2x2",
    "masterPrompt": "Coffee shop scene, couple having intimate conversation at table, warm afternoon light streaming through windows, cinematic 24fps motion, consistent across all angles",
    "cells": [
      {
        "id": "A1",
        "position": "top_left",
        "type": "establishing",
        "prompt": "Wide establishing shot, entire coffee shop interior visible, couple at center table, warm ambient lighting, 35mm lens perspective",
        "coverage": "master_shot"
      },
      {
        "id": "A2",
        "position": "top_right",
        "type": "two_shot",
        "prompt": "Medium two-shot over shoulder, both characters visible, intimate table framing, shallow depth of field, 50mm lens",
        "coverage": "dialogue_main"
      },
      {
        "id": "B1",
        "position": "bottom_left",
        "type": "single_emma",
        "prompt": "Close-up single on woman, emotional reaction, soft key light from window, 85mm lens, shallow depth of field",
        "coverage": "reaction_emma"
      },
      {
        "id": "B2",
        "position": "bottom_right",
        "type": "single_marcus",
        "prompt": "Close-up single on man, speaking or listening, matching lighting, 85mm lens, shallow depth of field",
        "coverage": "reaction_marcus"
      }
    ]
  },
  "consistencyRequirements": {
    "lighting": {
      "timeOfDay": "consistent_late_afternoon",
      "colorTemp": "3200K_warm",
      "quality": "soft_window_light"
    },
    "action": {
      "synchronization": "lip_sync_across_angles",
      "timing": "matched_gestures"
    },
    "environment": {
      "props": "consistent_placement",
      "background": "matching_details"
    }
  },
  "technical": {
    "frameRate": "24fps",
    "duration": "4_seconds_per_cell",
    "resolution": "consistent_across_grid"
  }
}
```

### Example 2: Movement Coverage

**Input:**

```
Scene: "Character walking through forest"
Grid: "1x3"
Variation: "dramatic"
```

**Output:**

```json
{
  "grid": {
    "layout": "1x3",
    "masterPrompt": "Woman walking through sunlit forest path, continuous movement, golden hour lighting, cinematic quality",
    "cells": [
      {
        "id": "1",
        "position": "left",
        "type": "front_tracking",
        "prompt": "Front tracking shot, walking toward camera, face visible, dappled light on face"
      },
      {
        "id": "2",
        "position": "center",
        "type": "profile_tracking",
        "prompt": "Side tracking shot, profile view, walking pace, trees passing in background"
      },
      {
        "id": "3",
        "position": "right",
        "type": "rear_follow",
        "prompt": "Following shot from behind, walking away, path ahead visible, atmospheric"
      }
    ]
  },
  "motionSync": {
    "walkingPace": "synchronized_across_all_angles",
    "footPlacement": "matched_timing",
    "environment": "consistent_forest_path"
  }
}
```

## Error Handling

- Returns basic grid if scene unclear
- Flags impossible angle combinations
- Warns about consistency challenges
- Suggests simpler layouts
