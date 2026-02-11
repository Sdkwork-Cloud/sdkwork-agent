---
name: annotate-shot-camera
version: '1.0.0'
author: sdkwork.com
description: Annotate shots with detailed camera instructions and technical specifications. Use for cinematography planning and camera team communication.
category: scene
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: camera cinematography technical specifications movement
---

# Annotate Shot Camera

## Purpose

Add detailed camera annotations to shots including technical specifications, movement instructions, and equipment requirements for the camera team.

## When to Use

- Camera team briefings
- Cinematography planning
- Complex camera movement design
- Equipment preparation
- Shot coordination

## Inputs

- `shot` (object, required): Basic shot information
- `style` (string, optional): 'handheld' | 'gimbal' | 'dolly' | 'static' | 'mixed' (default: 'mixed')
- `complexity` (string, optional): 'simple' | 'moderate' | 'complex' (default: 'moderate')

## Outputs

```json
{
  "shot": {
    "number": 2,
    "type": "tracking"
  },
  "cameraAnnotations": {
    "movement": {
      "type": "tracking",
      "path": "parallel_to_subject",
      "speed": "match_walking_pace",
      "startPosition": "3_feet_left",
      "endPosition": "3_feet_left",
      "distance": "12_feet_travel"
    },
    "support": {
      "primary": "dolly_with_tracks",
      "backup": "gimbal",
      "stabilization": "fluid_head"
    },
    "lens": {
      "focalLength": "35mm",
      "aperture": "f/2.8",
      "focus": "rack_from_background_to_subject",
      "filter": "polarizer"
    },
    "framing": {
      "shotType": "medium",
      "subjectPosition": "left_third",
      "headroom": "standard",
      "leadRoom": "generous"
    },
    "timing": {
      "duration": "8_seconds",
      "startCue": "Emma_begins_walking",
      "endCue": "Emma_stops_at_door",
      "speedRamp": "none"
    }
  },
  "equipment": {
    "camera": "ARRI Alexa Mini LF",
    "lens": "35mm Signature Prime",
    "support": ["dolly", "8_feet_tracks", "fluid_head"],
    "accessories": ["follow_focus", "wireless_video", "polarizer"]
  },
  "crew": {
    "operator": 1,
    "focusPuller": 1,
    "dollyGrip": 1,
    "utility": 1
  },
  "setupTime": "45_minutes",
  "rehearsals": "2_walkthroughs",
  "notes": "Coordinate with actor on walking speed. Smooth movement essential."
}
```

## Camera Movement Types

- **static**: No movement, locked off
- **pan**: Horizontal rotation
- **tilt**: Vertical rotation
- **dolly**: Forward/backward movement
- **truck**: Side-to-side movement
- **crane**: Vertical arc movement
- **handheld**: Operator-held
- **gimbal**: Stabilized movement
- **drone**: Aerial movement

## Instructions

1. Analyze shot requirements
2. Determine movement type
3. Plan camera path
4. Select appropriate support
5. Choose lens and settings
6. Calculate timing
7. List equipment needs
8. Plan crew assignments

## Examples

### Example 1: Dolly Shot

**Input:**

```json
{
  "shot": {
    "type": "dolly_in",
    "description": "Push in on Emma's realization"
  }
}
```

**Output:**

```json
{
  "shot": {
    "number": 4,
    "type": "dolly_in"
  },
  "cameraAnnotations": {
    "movement": {
      "type": "dolly_forward",
      "startDistance": "8_feet",
      "endDistance": "3_feet",
      "speed": "slow_creep",
      "duration": "6_seconds",
      "easing": "smooth_acceleration"
    },
    "support": {
      "primary": "dolly_with_tracks",
      "trackLength": "6_feet",
      "surface": "smooth_floor"
    },
    "lens": {
      "focalLength": "50mm",
      "aperture": "f/2.0",
      "focus": "hold_on_eyes_throughout",
      "depthOfField": "shallow"
    },
    "framing": {
      "startFrame": "medium",
      "endFrame": "close_up",
      "subject": "Emma_center",
      "composition": "maintain_eyeline"
    },
    "timing": {
      "startCue": "Emma_begins_realization",
      "endCue": "peak_emotional_moment",
      "hold": "2_seconds_at_end"
    }
  },
  "equipment": ["Dolly system", "6 feet track", "50mm lens", "Follow focus", "Wireless video feed"],
  "crew": {
    "operator": 1,
    "focusPuller": 1,
    "dollyGrip": 1
  },
  "setupTime": "30_minutes",
  "rehearsals": "3_runs",
  "notes": "Critical focus on eyes throughout move. Rehearse timing with actor."
}
```

### Example 2: Handheld Scene

**Input:**

```json
{
  "shot": {
    "type": "handheld",
    "description": "Chaotic argument scene"
  }
}
```

**Output:**

```json
{
  "shot": {
    "number": 7,
    "type": "handheld"
  },
  "cameraAnnotations": {
    "movement": {
      "type": "handheld_reactive",
      "style": "documentary",
      "energy": "high",
      "breathing": "subtle",
      "response": "follow_action"
    },
    "support": {
      "primary": "handheld",
      "stabilization": "in_body",
      "rig": "shoulder_rig_optional"
    },
    "lens": {
      "focalLength": "24mm",
      "aperture": "f/4.0",
      "focus": "zone_focus",
      "depthOfField": "deep"
    },
    "framing": {
      "style": "loose_composition",
      "adaptation": "responsive_to_action",
      "safety": "frame_for_movement"
    },
    "timing": {
      "duration": "continuous",
      "coverage": "entire_argument",
      "cuts": "in_camera_editing"
    }
  },
  "equipment": ["Camera body only", "24mm lens", "Shoulder rig (optional)", "Extra batteries"],
  "crew": {
    "operator": 1,
    "focusPuller": 0
  },
  "setupTime": "10_minutes",
  "notes": "Stay loose and reactive. Don't over-stabilize - keep energy."
}
```

## Error Handling

- Returns basic annotations if shot unclear
- Flags complex movements needing pre-vis
- Warns about equipment conflicts
- Suggests alternatives for constraints
