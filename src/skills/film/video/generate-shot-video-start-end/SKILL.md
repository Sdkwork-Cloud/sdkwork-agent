---
name: generate-shot-video-start-end
version: '1.0.0'
author: sdkwork.com
description: Generate video prompts using start and end frame images for frame-interpolation AI models. Use for creating smooth transitions between keyframes.
category: video
license: Apache-2.0
compatibility: Works with frame-interpolation AI models
metadata:
  tags: video generation frame-interpolation start-end keyframes
---

# Generate Shot Video (Start-End)

## Purpose

Create optimized prompts for frame-interpolation AI models to generate smooth video transitions between start and end keyframes.

## When to Use

- Creating smooth camera movements
- Character motion between poses
- Transition effects
- Morphing sequences
- Keyframe animation

## Inputs

- `startFrame` (string, required): Starting image or description
- `endFrame` (string, required): Ending image or description
- `duration` (number, optional): Target duration in seconds (default: 2)
- `easing` (string, optional): 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' (default: 'ease_in_out')

## Outputs

```json
{
  "interpolation": {
    "start": "Woman standing at door, hand on handle",
    "end": "Woman inside room, door closed behind her",
    "frames": 48,
    "duration": "2_seconds"
  },
  "prompts": [
    {
      "type": "motion_description",
      "prompt": "Smooth natural movement of woman entering room, door closing motion, continuous fluid action, no jumps or cuts, realistic human movement, 24fps interpolation",
      "motionPath": "door_open_to_close"
    }
  ],
  "motionPlanning": {
    "primaryAction": "entering_room",
    "keyPoses": ["hand_on_handle", "door_opening", "stepping_through", "door_closing"],
    "timing": {
      "easeIn": "0.2_seconds",
      "mainAction": "1.6_seconds",
      "easeOut": "0.2_seconds"
    }
  },
  "technical": {
    "frameRate": "24fps",
    "totalFrames": 48,
    "interpolationQuality": "high",
    "easing": "ease_in_out"
  },
  "negativePrompt": "jump cuts, teleporting, morphing artifacts, unnatural movement, jerky motion"
}
```

## Interpolation Types

- **linear**: Constant speed
- **ease_in**: Accelerating
- **ease_out**: Decelerating
- **ease_in_out**: Smooth acceleration/deceleration
- **hold**: Pause at keyframes

## Instructions

1. Analyze start and end frames
2. Identify motion path
3. Plan key poses
4. Determine timing
5. Choose easing curve
6. Describe motion quality
7. Calculate frame count
8. Optimize for interpolation

## Examples

### Example 1: Door Entry

**Input:**

```
Start: Woman outside door, reaching for handle
End: Woman inside, door closed
Duration: 2 seconds
```

**Output:**

```json
{
  "interpolation": {
    "startFrame": "Woman standing outside closed door, hand reaching for handle",
    "endFrame": "Woman inside room, door closed behind her, turned to face interior",
    "motionType": "continuous_action",
    "frames": 48,
    "duration": "2_seconds"
  },
  "motionPlanning": {
    "sequence": [
      {
        "phase": "approach",
        "time": "0-0.3s",
        "action": "hand_reaches_handle"
      },
      {
        "phase": "open",
        "time": "0.3-0.8s",
        "action": "door_opens_smoothly"
      },
      {
        "phase": "enter",
        "time": "0.8-1.4s",
        "action": "woman_steps_through"
      },
      {
        "phase": "close",
        "time": "1.4-2.0s",
        "action": "door_closes_behind"
      }
    ],
    "easing": "ease_in_out",
    "naturalMotion": true
  },
  "prompts": [
    {
      "type": "interpolation_guidance",
      "prompt": "Smooth continuous motion of woman entering through door, natural human movement, door physics realistic, no teleportation or jumps, fluid 24fps motion",
      "focus": "natural_movement_physics"
    }
  ],
  "technical": {
    "frameRate": "24fps",
    "totalFrames": 48,
    "interpolationFrames": 46,
    "easingCurve": "ease_in_out_cubic",
    "quality": "high"
  }
}
```

### Example 2: Camera Movement

**Input:**

```
Start: Wide shot of room
End: Close-up of object on table
Duration: 3 seconds
```

**Output:**

```json
{
  "interpolation": {
    "startFrame": "Wide establishing shot of living room, all furniture visible",
    "endFrame": "Close-up of vintage watch on coffee table",
    "motionType": "camera_movement",
    "frames": 72,
    "duration": "3_seconds"
  },
  "motionPlanning": {
    "cameraPath": "smooth_push_in",
    "phases": [
      {
        "phase": "start_wide",
        "time": "0-0.5s",
        "action": "hold_on_wide"
      },
      {
        "phase": "push_in",
        "time": "0.5-2.5s",
        "action": "smooth_camera_movement_toward_table"
      },
      {
        "phase": "settle",
        "time": "2.5-3.0s",
        "action": "hold_on_close_up"
      }
    ],
    "focus": "rack_from_wide_to_watch"
  },
  "technical": {
    "frameRate": "24fps",
    "motion": "smooth_dolly_in",
    "easing": "ease_out",
    "focusPull": "coordinated_with_movement"
  }
}
```

## Error Handling

- Returns basic interpolation if frames unclear
- Flags impossible transitions
- Warns about motion complexity
- Suggests intermediate keyframes
