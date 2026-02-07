---
name: annotate-shot-actions
version: '1.0.0'
author: sdkwork.com
description: Annotate shots with character actions and blocking instructions. Use for choreography and actor movement planning.
category: scene
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: actions blocking choreography movement staging
---

# Annotate Shot Actions

## Purpose

Add detailed action annotations and blocking instructions to shots, helping actors and directors plan character movements and interactions.

## When to Use

- Blocking rehearsals
- Stunt coordination
- Complex movement planning
- Actor preparation
- Spatial relationship design

## Inputs

- `shot` (object, required): Shot information
- `characters` (array, required): Characters in shot
- `space` (object, optional): Set/location dimensions and features

## Outputs

```json
{
  "shot": {
    "number": 2,
    "type": "wide"
  },
  "actionAnnotations": {
    "characters": [
      {
        "name": "EMMA",
        "startingPosition": "doorway",
        "endingPosition": "table_center",
        "movement": {
          "type": "walk",
          "path": "direct_to_table",
          "speed": "hesitant",
          "distance": "12_feet",
          "duration": "5_seconds"
        },
        "actions": [
          {
            "time": "0s",
            "action": "pause_at_door",
            "duration": "1s",
            "notes": "take_breath"
          },
          {
            "time": "1s",
            "action": "walk_forward",
            "duration": "4s"
          },
          {
            "time": "5s",
            "action": "sit_chair",
            "duration": "2s",
            "notes": "graceful_but_nervous"
          }
        ],
        "props": ["handbag", "phone"],
        "interactions": ["acknowledges_Marcus_with_look"]
      }
    ],
    "blocking": {
      "spatialLayout": "Emma_approaches_from_left",
      "powerDynamic": "equal_but_tense",
      "proximity": "intimate_table_distance",
      "sightlines": ["Emma_to_Marcus", "Marcus_to_Emma"]
    },
    "choreographyNotes": "Emma's hesitation shows internal conflict. Movement should feel natural, not staged."
  }
}
```

## Action Types

- **walk**: Standard locomotion
- **run**: Fast movement
- **sit**: Taking a seat
- **stand**: Rising from seated
- **gesture**: Hand/arm movement
- **interact**: Object or person interaction
- **react**: Response to stimulus
- **transition**: Movement between positions

## Instructions

1. Map character starting positions
2. Plan movement paths
3. Time actions to dialogue
4. Consider spatial relationships
5. Note prop interactions
6. Plan sight lines
7. Ensure safety clearance
8. Create rehearsal notes

## Examples

### Example 1: Approach and Sit

**Input:**

```
Shot: Wide shot
Action: Emma enters, approaches table, sits
Characters: Emma, Marcus (seated)
```

**Output:**

```json
{
  "shot": {
    "number": 2,
    "type": "wide"
  },
  "actionAnnotations": {
    "characters": [
      {
        "name": "EMMA",
        "startingPosition": "cafe_entrance",
        "endingPosition": "chair_across_from_Marcus",
        "movement": {
          "type": "walk",
          "path": "straight_line_to_table",
          "speed": "deliberate_but_hesitant",
          "distance": "15_feet",
          "duration": "6_seconds"
        },
        "actions": [
          {
            "time": "0s",
            "action": "enter_through_door",
            "duration": "1s",
            "notes": "door_chimes_sound"
          },
          {
            "time": "1s",
            "action": "pause_scan_room",
            "duration": "1s",
            "notes": "spot_Marcus"
          },
          {
            "time": "2s",
            "action": "walk_toward_table",
            "duration": "4s",
            "notes": "maintain_eye_contact"
          },
          {
            "time": "6s",
            "action": "pull_out_chair",
            "duration": "1s"
          },
          {
            "time": "7s",
            "action": "sit_down",
            "duration": "2s",
            "notes": "place_handbag_on_floor"
          }
        ],
        "props": ["handbag"],
        "interactions": ["eye_contact_with_Marcus"]
      },
      {
        "name": "MARCUS",
        "startingPosition": "seated_at_table",
        "endingPosition": "seated_at_table",
        "movement": {
          "type": "static",
          "notes": "remains_seated_throughout"
        },
        "actions": [
          {
            "time": "1s",
            "action": "look_up_from_coffee",
            "duration": "0.5s"
          },
          {
            "time": "2s",
            "action": "track_Emma_with_eyes",
            "duration": "4s"
          },
          {
            "time": "6s",
            "action": "set_down_coffee_cup",
            "duration": "1s"
          }
        ],
        "props": ["coffee_cup"]
      }
    ],
    "blocking": {
      "spatialLayout": "cafe_table_center_frame",
      "Emma_enters": "frame_left",
      "table_position": "center",
      "Marcus_position": "facing_camera",
      "Emma_final_position": "back_to_camera_angle",
      "powerDynamic": "shifts_as_Emma_approaches"
    },
    "timing": {
      "totalDuration": "9_seconds",
      "dialogueStart": "8_seconds"
    },
    "safety": {
      "clearance": "3_feet_camera_to_table",
      "markers": "tape_for_Emma_stop_point"
    }
  }
}
```

### Example 2: Complex Interaction

**Input:**

```
Shot: Medium two-shot
Action: Argument escalates with physical movement
```

**Output:**

```json
{
  "shot": {
    "number": 5,
    "type": "medium_two_shot"
  },
  "actionAnnotations": {
    "characters": [
      {
        "name": "EMMA",
        "movement": {
          "type": "escalating_confrontation",
          "phases": [
            {
              "time": "0-10s",
              "position": "seated",
              "energy": "controlled_anger"
            },
            {
              "time": "10-15s",
              "position": "stands_up",
              "energy": "rising"
            },
            {
              "time": "15-20s",
              "position": "leans_forward",
              "energy": "peak_confrontation"
            }
          ]
        },
        "actions": [
          {
            "time": "10s",
            "action": "push_chair_back_stand",
            "duration": "2s"
          },
          {
            "time": "15s",
            "action": "lean_across_table",
            "duration": "1s",
            "notes": "invade_personal_space"
          },
          {
            "time": "17s",
            "action": "point_finger_accusing",
            "duration": "3s"
          }
        ],
        "gestures": ["pointing", "emphatic_hand_movements"]
      }
    ],
    "blocking": {
      "spatialArc": "Emma_moves_from_defensive_to_aggressive",
      "table": "barrier_then_platform",
      "proximity": "starts_4_feet_ends_2_feet",
      "safety": "maintain_6_inches_minimum_distance"
    },
    "choreographyNotes": "Emma's movement shows emotional escalation. Start contained, end explosive. Safety first - no actual contact."
  }
}
```

## Error Handling

- Returns basic blocking if space unclear
- Flags safety concerns
- Warns about complex choreography
- Suggests rehearsal time
