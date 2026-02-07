---
name: extract-emotional-arcs
version: '1.0.0'
author: sdkwork.com
description: Extract emotional arcs and character journeys throughout the script. Use for performance direction and emotional pacing.
category: narrative
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: emotions arcs journey feelings development
---

# Extract Emotional Arcs

## Purpose

Analyze script to map emotional arcs for characters and the overall story, tracking emotional progression and key turning points.

## When to Use

- Directing performances
- Planning emotional pacing
- Music and sound design
- Editing rhythm
- Understanding character development

## Inputs

- `script` (string, required): Full script content
- `characters` (array, optional): Specific characters to analyze
- `granularity` (string, optional): 'scene' | 'beat' | 'moment' (default: 'scene')

## Outputs

```json
{
  "characterArcs": [
    {
      "character": "EMMA",
      "overallArc": "hopeful_to_hurt_to_healed",
      "emotions": [
        {
          "scene": 1,
          "emotion": "nostalgic_hopeful",
          "intensity": 6,
          "triggers": ["seeing_marcus", "memories"],
          "expression": "tentative_smile, searching_eyes"
        },
        {
          "scene": 3,
          "emotion": "betrayed_angry",
          "intensity": 9,
          "triggers": ["revelation", "past_pain"],
          "expression": "tears, raised_voice, defensive_posture"
        },
        {
          "scene": 8,
          "emotion": "forgiving_peaceful",
          "intensity": 7,
          "triggers": ["understanding", "acceptance"],
          "expression": "softened_gaze, genuine_smile"
        }
      ],
      "turningPoints": [
        {
          "scene": 3,
          "type": "negative_climax",
          "description": "Discovers truth about breakup"
        },
        {
          "scene": 7,
          "type": "positive_shift",
          "description": "Chooses forgiveness"
        }
      ]
    }
  ],
  "storyArc": {
    "shape": "rise_fall_rise",
    "emotionalTone": "bittersweet_redemption",
    "intensityProgression": [4, 6, 9, 5, 7, 8, 6, 7],
    "keyMoments": [
      {
        "scene": 1,
        "moment": "reunion",
        "emotion": "hopeful_nostalgia"
      },
      {
        "scene": 3,
        "moment": "conflict_peak",
        "emotion": "painful_confrontation"
      },
      {
        "scene": 8,
        "moment": "resolution",
        "emotion": "peaceful_closure"
      }
    ]
  }
}
```

## Arc Types

- **rise**: Building positive emotion
- **fall**: Descending into negative emotion
- **rise_fall**: Peak then decline
- **fall_rise**: Recovery arc
- **rise_fall_rise**: Complete journey
- **flat**: Consistent emotion
- **volatile**: Rapid changes

## Instructions

1. Identify emotional beats in each scene
2. Track character emotions throughout
3. Map emotional triggers and causes
4. Identify turning points and climaxes
5. Analyze emotional intensity patterns
6. Determine overall arc shapes
7. Note physical expressions of emotion
8. Build emotional journey maps

## Examples

### Example 1: Romance Reunion

**Input:**

```
Scene 1: Emma hopeful but nervous seeing Marcus
Scene 2: Warm conversation, growing comfort
Scene 3: Argument about past, Emma hurt and angry
Scene 4: Emma alone, crying, processing
Scene 5: Marcus explains, Emma resistant
Scene 6: Emma begins to understand
Scene 7: Emma chooses to forgive
Scene 8: Peaceful reconciliation
```

**Output:**

```json
{
  "characterArcs": [
    {
      "character": "EMMA",
      "overallArc": "hopeful_to_devastated_to_healed",
      "emotions": [
        {
          "scene": 1,
          "emotion": "hopeful_apprehensive",
          "intensity": 5,
          "triggers": ["unexpected_reunion"],
          "expression": "tentative_approach, hopeful_eyes"
        },
        {
          "scene": 3,
          "emotion": "betrayed_furious",
          "intensity": 9,
          "triggers": ["truth_revealed", "old_wounds"],
          "expression": "tears, shaking, angry_voice"
        },
        {
          "scene": 8,
          "emotion": "peaceful_forgiving",
          "intensity": 7,
          "triggers": ["understanding", "choosing_love"],
          "expression": "soft_smile, open_posture"
        }
      ],
      "turningPoints": [
        {
          "scene": 3,
          "type": "negative_climax",
          "description": "Learns why Marcus really left"
        },
        {
          "scene": 7,
          "type": "positive_shift",
          "description": "Decides to forgive and move forward"
        }
      ]
    }
  ],
  "storyArc": {
    "shape": "rise_fall_rise",
    "emotionalTone": "bittersweet_hope",
    "intensityProgression": [5, 6, 9, 4, 6, 7, 8, 7]
  }
}
```

## Error Handling

- Returns basic arcs if emotions unclear
- Flags characters with flat arcs
- Warns about missing emotional resolution
- Identifies inconsistent emotional beats
