---
name: generate-scene-outline
version: '1.0.0'
author: sdkwork.com
description: Generate detailed scene outline with shot list and visual direction. Use for pre-visualization and production planning.
category: scene
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: scene outline shots visual direction breakdown
---

# Generate Scene Outline

## Purpose

Create a detailed scene outline including shot list, visual direction, and production notes for each scene in the script.

## When to Use

- Pre-visualization planning
- Shot list creation
- Director's preparation
- Cinematography planning
- Production scheduling

## Inputs

- `script` (string, required): Full script content
- `sceneNumber` (number, optional): Specific scene to outline (default: all scenes)
- `detailLevel` (string, optional): 'basic' | 'standard' | 'detailed' (default: 'standard')

## Outputs

```json
{
  "scenes": [
    {
      "number": 1,
      "heading": "INT. COFFEE SHOP - DAY",
      "duration": "45_seconds",
      "shots": [
        {
          "shotNumber": 1,
          "type": "establishing",
          "description": "Wide shot of coffee shop exterior",
          "camera": "static",
          "duration": "3_seconds",
          "notes": "Establishes location"
        },
        {
          "shotNumber": 2,
          "type": "wide",
          "description": "Interior, Emma enters",
          "camera": "pan_right",
          "duration": "5_seconds"
        },
        {
          "shotNumber": 3,
          "type": "medium",
          "description": "Emma spots Marcus",
          "camera": "static",
          "duration": "3_seconds"
        },
        {
          "shotNumber": 4,
          "type": "two_shot",
          "description": "Emma approaches table",
          "camera": "tracking",
          "duration": "8_seconds"
        },
        {
          "shotNumber": 5,
          "type": "close_up",
          "description": "Emma's face, hesitant",
          "camera": "static",
          "duration": "4_seconds"
        },
        {
          "shotNumber": 6,
          "type": "over_shoulder",
          "description": "Dialogue exchange",
          "camera": "static",
          "duration": "22_seconds",
          "coverage": ["OTS_Emma", "OTS_Marcus", "singles"]
        }
      ],
      "totalShots": 6,
      "estimatedSetupTime": "2_hours",
      "keyVisualElements": ["warm_lighting", "cozy_atmosphere", "intimate_spacing"],
      "notes": "Key emotional scene, prioritize performance coverage"
    }
  ]
}
```

## Shot Types

- **establishing**: Location/setting wide shot
- **wide**: Full scene context
- **medium**: Waist up, interaction
- **close_up**: Face/emotion
- **extreme_close_up**: Detail/texture
- **two_shot**: Two characters
- **over_shoulder**: POV behind character
- **point_of_view**: Character's view
- **insert**: Detail/prop
- **aerial**: Bird's eye view

## Instructions

1. Parse scene content and dialogue
2. Determine narrative beats
3. Plan shot progression
4. Consider camera movement
5. Estimate shot durations
6. Plan coverage for dialogue
7. Note visual requirements
8. Calculate setup complexity

## Examples

### Example 1: Simple Dialogue Scene

**Input:**

```
INT. COFFEE SHOP - DAY

Emma enters, spots Marcus. She approaches.

EMMA
Marcus?

MARCUS
Emma... it's been a while.

They sit. Awkward silence.

EMMA
Five years.

MARCUS
I know. I'm sorry.
```

**Output:**

```json
{
  "scenes": [
    {
      "number": 1,
      "heading": "INT. COFFEE SHOP - DAY",
      "duration": "45_seconds",
      "shots": [
        {
          "shotNumber": 1,
          "type": "establishing",
          "description": "Coffee shop exterior, Emma approaches",
          "camera": "static",
          "duration": "3s",
          "notes": "Optional - can start interior"
        },
        {
          "shotNumber": 2,
          "type": "wide",
          "description": "Interior, Emma enters through door",
          "camera": "pan_with_action",
          "duration": "4s"
        },
        {
          "shotNumber": 3,
          "type": "medium",
          "description": "Emma scans room, sees Marcus",
          "camera": "static",
          "duration": "3s"
        },
        {
          "shotNumber": 4,
          "type": "reaction",
          "description": "Marcus looks up, surprised",
          "camera": "static",
          "duration": "2s"
        },
        {
          "shotNumber": 5,
          "type": "two_shot",
          "description": "Emma approaches table",
          "camera": "tracking",
          "duration": "5s"
        },
        {
          "shotNumber": 6,
          "type": "medium",
          "description": "Emma speaks - 'Marcus?'",
          "camera": "static",
          "duration": "3s"
        },
        {
          "shotNumber": 7,
          "type": "medium",
          "description": "Marcus responds",
          "camera": "static",
          "duration": "4s"
        },
        {
          "shotNumber": 8,
          "type": "two_shot",
          "description": "They sit, awkward silence",
          "camera": "static",
          "duration": "6s"
        },
        {
          "shotNumber": 9,
          "type": "close_up",
          "description": "Emma - 'Five years'",
          "camera": "static",
          "duration": "3s"
        },
        {
          "shotNumber": 10,
          "type": "close_up",
          "description": "Marcus - 'I know. I'm sorry'",
          "camera": "static",
          "duration": "4s",
          "notes": "Hold on reaction"
        }
      ],
      "totalShots": 10,
      "estimatedSetupTime": "2.5_hours",
      "coverageStrategy": "Master + singles for dialogue",
      "notes": "Intimate scene, prioritize emotional close-ups"
    }
  ]
}
```

## Error Handling

- Returns basic outline if script unclear
- Flags scenes requiring complex setups
- Warns about insufficient coverage
- Identifies potential continuity issues
