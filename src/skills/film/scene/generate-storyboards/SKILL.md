---
name: generate-storyboards
version: '1.0.0'
author: sdkwork.com
description: Generate storyboard descriptions and visual frames for key scenes. Use for visual planning and team communication.
category: scene
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: storyboard frames visual composition shots
---

# Generate Storyboards

## Purpose

Create detailed storyboard descriptions for key scenes, including visual composition, camera angles, and action beats.

## When to Use

- Visual pre-planning
- Director-cinematographer communication
- Complex sequence planning
- Stunt or VFX shot preparation
- Client/stakeholder presentations

## Inputs

- `sceneOutline` (object, required): Scene outline with shot list
- `style` (string, optional): 'cinematic' | 'minimal' | 'detailed' (default: 'cinematic')
- `includeCameraInfo` (boolean, optional): Include camera technical details (default: true)

## Outputs

```json
{
  "storyboards": [
    {
      "frameNumber": 1,
      "shotReference": "Shot 1",
      "description": "Wide establishing shot of cozy coffee shop exterior. Morning light, warm tones. Emma approaches from left.",
      "composition": {
        "framing": "wide",
        "subject": "coffee_shop_building",
        "position": "center",
        "movement": "Emma enters frame left"
      },
      "camera": {
        "angle": "eye_level",
        "height": "6_feet",
        "lens": "24mm",
        "movement": "static"
      },
      "lighting": "natural_morning_sun",
      "mood": "hopeful_nostalgic",
      "action": "Emma walks toward entrance",
      "dialogue": "",
      "duration": "3s"
    }
  ],
  "totalFrames": 6,
  "keyTransitions": ["Frame 2-3: Match cut on movement"],
  "visualThemes": ["warmth", "intimacy", "hesitation"]
}
```

## Frame Elements

- **Composition**: Subject placement and framing
- **Camera**: Angle, height, lens, movement
- **Lighting**: Key light, mood, atmosphere
- **Action**: Character movement and interaction
- **Dialogue**: Spoken lines in frame
- **Transitions**: How frames connect

## Instructions

1. Review scene outline and shots
2. Identify key visual moments
3. Describe composition for each frame
4. Specify camera and lighting
5. Note character actions
6. Plan transitions between frames
7. Establish visual themes
8. Create cohesive visual narrative

## Examples

### Example 1: Reunion Scene

**Input:**

```
Scene: Coffee shop reunion
Shot 1: Establishing
Shot 2: Emma enters, sees Marcus
Shot 3: Two-shot dialogue
Shot 4: Close-up Emma emotional
```

**Output:**

```json
{
  "storyboards": [
    {
      "frameNumber": 1,
      "description": "Wide exterior shot of charming neighborhood coffee shop. Golden morning light filters through trees. Emma walks toward entrance, small coffee shop sign visible. Warm, inviting atmosphere.",
      "composition": {
        "framing": "wide",
        "subject": "coffee_shop",
        "position": "center",
        "foreground": "tree_branches",
        "background": "street_scene"
      },
      "camera": {
        "angle": "slight_low",
        "height": "5_feet",
        "lens": "28mm",
        "movement": "static"
      },
      "lighting": "golden_hour_natural",
      "mood": "hopeful_beginning",
      "duration": "3s"
    },
    {
      "frameNumber": 2,
      "description": "Interior wide. Emma enters through door, backlit by morning sun. She pauses, scanning the room. Marcus sits at corner table, visible in background. Depth created by tables and customers.",
      "composition": {
        "framing": "wide",
        "subject": "Emma",
        "position": "left_third",
        "depth": "Marcus_in_background"
      },
      "camera": {
        "angle": "eye_level",
        "height": "5.5_feet",
        "lens": "35mm",
        "movement": "pan_right_with_Emma"
      },
      "lighting": "backlit_doorway_warm_interior",
      "mood": "anticipation",
      "action": "Emma enters, looks around",
      "duration": "5s"
    },
    {
      "frameNumber": 3,
      "description": "Two-shot over table. Emma and Marcus face each other. Coffee cups between them. Shallow depth of field softens background. Intimate spacing, slight tension in body language.",
      "composition": {
        "framing": "medium_two_shot",
        "subjects": ["Emma", "Marcus"],
        "position": "balanced",
        "foreground": "coffee_cups"
      },
      "camera": {
        "angle": "slight_high",
        "height": "6_feet",
        "lens": "50mm",
        "movement": "static"
      },
      "lighting": "soft_window_light",
      "mood": "intimate_tense",
      "dialogue": "Awkward reunion conversation",
      "duration": "15s"
    },
    {
      "frameNumber": 4,
      "description": "Close-up Emma. Eyes glistening with held-back emotion. Soft focus on background. Warm light catches her face. Moment of vulnerability and strength.",
      "composition": {
        "framing": "close_up",
        "subject": "Emma_face",
        "position": "slight_left",
        "focus": "eyes"
      },
      "camera": {
        "angle": "eye_level",
        "height": "5.5_feet",
        "lens": "85mm",
        "movement": "static"
      },
      "lighting": "soft_key_light",
      "mood": "vulnerable_hopeful",
      "dialogue": "Five years...",
      "duration": "4s"
    }
  ],
  "visualThemes": ["warmth", "intimacy", "emotional_vulnerability"],
  "colorPalette": ["warm_browns", "soft_golds", "cream"]
}
```

## Error Handling

- Returns basic frames if input limited
- Flags complex shots needing pre-vis
- Warns about missing visual information
- Suggests alternative compositions
