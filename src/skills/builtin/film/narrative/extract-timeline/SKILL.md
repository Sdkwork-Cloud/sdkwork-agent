---
name: extract-timeline
version: '1.0.0'
author: sdkwork.com
description: Extract chronological timeline and temporal structure from script. Use to understand story progression and time management.
category: narrative
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: timeline chronology time progression structure
---

# Extract Timeline

## Purpose

Analyze script to extract the chronological timeline, temporal structure, and time progression throughout the story.

## When to Use

- Understanding story chronology
- Planning flashbacks and time jumps
- Costume and makeup continuity
- Props aging and changes
- Lighting and atmosphere consistency

## Inputs

- `script` (string, required): Full script content
- `detectFlashbacks` (boolean, optional): Identify flashback sequences (default: true)
- `trackTimeMarkers` (boolean, optional): Extract explicit time references (default: true)

## Outputs

```json
{
  "timeline": {
    "storyDuration": "2_weeks",
    "screenTime": "8_minutes",
    "structure": "linear",
    "timeJumps": [
      {
        "from": "Scene 3",
        "to": "Scene 4",
        "jump": "3_days_later",
        "type": "forward"
      }
    ]
  },
  "scenes": [
    {
      "number": 1,
      "storyTime": "Day 1 - Morning",
      "screenPosition": "0:00-0:45",
      "temporalContext": "present",
      "timeMarkers": ["morning", "breakfast_time"]
    }
  ],
  "timePeriods": [
    {
      "period": "Present Day",
      "scenes": [1, 2, 3, 5, 6, 7, 8],
      "duration": "2_weeks"
    },
    {
      "period": "Flashback - 5 Years Ago",
      "scenes": [4],
      "duration": "1_day"
    }
  ],
  "continuityNotes": [
    "Scene 4 flashback: Characters should appear younger",
    "3-day jump between Scenes 3-4: Consider weather changes"
  ]
}
```

## Timeline Types

- **linear**: Chronological order
- **non_linear**: Time jumps and flashbacks
- **parallel**: Multiple timelines
- **circular**: Returns to starting point
- **fragmented**: Disjointed time periods

## Instructions

1. Identify explicit time markers in scenes
2. Detect flashback indicators
3. Map chronological story order
4. Calculate time jumps between scenes
5. Track character aging or changes
6. Note continuity requirements
7. Identify parallel timelines
8. Build temporal structure map

## Examples

### Example 1: Linear Timeline

**Input:**

```
Scene 1: INT. COFFEE SHOP - MORNING
Scene 2: EXT. PARK - AFTERNOON (Same day)
Scene 3: INT. APARTMENT - NIGHT (Same day)
Scene 4: INT. OFFICE - THREE DAYS LATER
Scene 5: EXT. RESTAURANT - EVENING (Next day)
```

**Output:**

```json
{
  "timeline": {
    "storyDuration": "5_days",
    "screenTime": "8_minutes",
    "structure": "linear_with_gaps"
  },
  "scenes": [
    {
      "number": 1,
      "storyTime": "Day 1 - Morning",
      "screenPosition": "0:00-1:30",
      "temporalContext": "present"
    },
    {
      "number": 2,
      "storyTime": "Day 1 - Afternoon",
      "screenPosition": "1:30-3:00",
      "temporalContext": "present"
    },
    {
      "number": 3,
      "storyTime": "Day 1 - Night",
      "screenPosition": "3:00-4:30",
      "temporalContext": "present"
    },
    {
      "number": 4,
      "storyTime": "Day 4 - Daytime",
      "screenPosition": "4:30-6:00",
      "temporalContext": "present",
      "timeJump": "3_days_forward"
    },
    {
      "number": 5,
      "storyTime": "Day 5 - Evening",
      "screenPosition": "6:00-8:00",
      "temporalContext": "present"
    }
  ],
  "timeJumps": [
    {
      "from": "Scene 3",
      "to": "Scene 4",
      "jump": "3_days",
      "type": "forward"
    }
  ],
  "continuityNotes": ["3-day jump: Consider costume changes, weather, character emotional state"]
}
```

### Example 2: Non-Linear with Flashback

**Input:**

```
Scene 1: INT. COFFEE SHOP - PRESENT DAY
Scene 2: FLASHBACK - INT. COLLEGE DORM - 5 YEARS AGO
Scene 3: RETURN TO PRESENT - INT. COFFEE SHOP
```

**Output:**

```json
{
  "timeline": {
    "storyDuration": "5_years",
    "screenTime": "6_minutes",
    "structure": "non_linear_flashback"
  },
  "scenes": [
    {
      "number": 1,
      "storyTime": "Present Day",
      "screenPosition": "0:00-2:00",
      "temporalContext": "present"
    },
    {
      "number": 2,
      "storyTime": "5 Years Ago",
      "screenPosition": "2:00-4:00",
      "temporalContext": "flashback",
      "flashbackIndicators": ["college_setting", "younger_appearance", "past_tense_dialogue"]
    },
    {
      "number": 3,
      "storyTime": "Present Day - Continued",
      "screenPosition": "4:00-6:00",
      "temporalContext": "present"
    }
  ],
  "timePeriods": [
    {
      "period": "Present Day",
      "scenes": [1, 3],
      "duration": "few_hours"
    },
    {
      "period": "Past - College Years",
      "scenes": [2],
      "duration": "1_day",
      "yearsAgo": 5
    }
  ],
  "continuityNotes": [
    "Flashback scene: Characters need younger appearance, different clothing style",
    "5-year gap: Consider technology changes (phones, etc.)"
  ]
}
```

## Error Handling

- Returns basic timeline if time markers unclear
- Flags conflicting time references
- Warns about unclear flashback transitions
- Identifies potential continuity issues
