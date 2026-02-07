---
name: expand-shot-details
version: '1.0.0'
author: sdkwork.com
description: Expand shot descriptions with detailed technical specifications. Use for cinematography planning and crew communication.
category: scene
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: shots technical cinematography camera specifications
---

# Expand Shot Details

## Purpose

Take basic shot descriptions and expand them with detailed technical specifications for cinematography, lighting, and production requirements.

## When to Use

- Detailed cinematography planning
- Equipment list creation
- Crew briefing documents
- Complex shot preparation
- Technical specification sheets

## Inputs

- `shot` (object, required): Basic shot information
- `detailLevel` (string, optional): 'standard' | 'advanced' | 'comprehensive' (default: 'standard')
- `includeEquipment` (boolean, optional): List required equipment (default: true)

## Outputs

```json
{
  "shot": {
    "number": 1,
    "type": "close_up",
    "description": "Emma's emotional reaction"
  },
  "specifications": {
    "camera": {
      "model": "ARRI Alexa Mini LF",
      "resolution": "4.5K",
      "frameRate": "24fps",
      "codec": "ProRes 4444 XQ"
    },
    "lens": {
      "focalLength": "85mm",
      "aperture": "f/2.0",
      "filter": "1/4 Black Pro Mist",
      "focus": "rack from background to Emma"
    },
    "movement": {
      "type": "static",
      "support": "tripod",
      "notes": "Lock off for performance"
    },
    "composition": {
      "framing": "tight_close_up",
      "headroom": "minimal",
      "eyeline": "slight_low",
      "ruleOfThirds": "eyes_on_top_line"
    },
    "lighting": {
      "keyLight": "soft_source_camera_left",
      "fillLight": "minimal_bounce",
      "backLight": "subtle_rim",
      "colorTemp": "3200K"
    }
  },
  "equipment": [
    "ARRI Alexa Mini LF",
    "85mm Master Prime",
    "1/4 Black Pro Mist filter",
    "Heavy duty tripod",
    "1K soft key light",
    "Bounce card"
  ],
  "setupTime": "45_minutes",
  "notes": "Critical performance moment, prioritize actor comfort"
}
```

## Technical Specifications

- **Camera**: Model, resolution, frame rate
- **Lens**: Focal length, aperture, filters
- **Movement**: Type, support, speed
- **Lighting**: Key, fill, back, color temp
- **Composition**: Framing, headroom, eyeline
- **Audio**: Microphone type, placement

## Instructions

1. Analyze shot type and purpose
2. Determine appropriate camera specs
3. Select lens based on framing needs
4. Plan camera movement
5. Design lighting setup
6. List required equipment
7. Estimate setup time
8. Note special considerations

## Examples

### Example 1: Emotional Close-Up

**Input:**

```json
{
  "shot": {
    "type": "close_up",
    "description": "Emma's face as she receives devastating news"
  }
}
```

**Output:**

```json
{
  "shot": {
    "number": 1,
    "type": "close_up",
    "description": "Emma's face as she receives devastating news"
  },
  "specifications": {
    "camera": {
      "model": "Sony Venice 2",
      "resolution": "6K",
      "frameRate": "24fps",
      "codec": "X-OCN XT"
    },
    "lens": {
      "focalLength": "100mm",
      "aperture": "f/2.8",
      "filter": "1/8 Black Pro Mist",
      "focus": "critical_eye_focus"
    },
    "movement": {
      "type": "static",
      "support": "heavy_tripod",
      "notes": "Absolutely locked off for micro-expressions"
    },
    "composition": {
      "framing": "choker_close_up",
      "headroom": "minimal",
      "eyeline": "level",
      "noseRoom": "generous"
    },
    "lighting": {
      "keyLight": "large_soft_source_45_degrees",
      "intensity": "f/2.8_key",
      "fillLight": "negative_fill_camera_right",
      "ratio": "4:1",
      "colorTemp": "3200K_warm"
    }
  },
  "equipment": [
    "Sony Venice 2 body",
    "100mm Cine lens",
    "1/8 Black Pro Mist filter",
    "Sachtler heavy tripod",
    "8x8 Ultra Bounce frame",
    "1.2K HMI with Chimera",
    "4x4 Black solid (negative fill)"
  ],
  "setupTime": "1_hour",
  "crew": {
    "camera": 2,
    "lighting": 3,
    "sound": 1
  },
  "notes": "Critical emotional beat. Allow actor time to prepare. Minimal crew on set."
}
```

### Example 2: Tracking Shot

**Input:**

```json
{
  "shot": {
    "type": "tracking",
    "description": "Follow Emma through crowded market"
  }
}
```

**Output:**

```json
{
  "shot": {
    "type": "tracking",
    "description": "Follow Emma through crowded market"
  },
  "specifications": {
    "camera": {
      "model": "ARRI Alexa 35",
      "resolution": "4.6K",
      "frameRate": "24fps",
      "stabilization": "active"
    },
    "lens": {
      "focalLength": "35mm",
      "aperture": "f/4.0",
      "focus": "follow_focus_on_Emma"
    },
    "movement": {
      "type": "tracking",
      "support": "gimbal_stabilizer",
      "speed": "walking_pace",
      "path": "weave_through_crowd"
    },
    "composition": {
      "framing": "medium",
      "subject": "Emma_center_frame",
      "background": "moving_crowd_blur"
    },
    "lighting": {
      "type": "natural_available",
      "enhancement": "minimal_reflector_bounce",
      "exposure": "protect_highlights"
    }
  },
  "equipment": [
    "ARRI Alexa 35",
    "35mm Signature Prime",
    "DJI Ronin 2 gimbal",
    "Easy Rig support",
    "Wireless follow focus",
    "1x1 LED panel (backup)"
  ],
  "setupTime": "30_minutes",
  "rehearsals": "3_walkthroughs_minimum",
  "notes": "Coordinate with extras. Clear path essential. Safety meeting required."
}
```

## Error Handling

- Returns basic specs if shot unclear
- Flags equipment conflicts
- Warns about complex setups
- Suggests alternatives for budget constraints
