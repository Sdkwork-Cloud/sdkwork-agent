---
name: adjust-video-rhythm
version: '1.0.0'
author: sdkwork.com
description: Adjust video pacing and rhythm through editing techniques. Use for pacing optimization and emotional impact.
category: post-production
license: Apache-2.0
compatibility: Works with video editing systems
metadata:
  tags: rhythm pacing editing timing tempo
---

# Adjust Video Rhythm

## Purpose

Optimize video pacing and rhythm through editing adjustments, timing changes, and pacing techniques to enhance emotional impact.

## When to Use

- Pacing optimization
- Rhythm adjustments
- Emotional enhancement
- Viewer engagement
- Final polish

## Inputs

- `video` (object, required): Video to adjust
- `targetPacing` (string, required): 'faster' | 'slower' | 'more_dynamic' | 'more_contemplative'
- `focusAreas` (array, optional): Specific scenes to adjust

## Outputs

```json
{
  "rhythmAdjustments": {
    "overallPacing": "more_contemplative",
    "changes": [
      {
        "scene": 1,
        "currentDuration": "45s",
        "adjustedDuration": "52s",
        "techniques": ["extend_pauses", "add_moment_holds"]
      }
    ]
  },
  "techniques": {
    "lengthening": ["Extend reaction shots", "Add breath moments", "Hold on emotional beats"],
    "shortening": ["Tighten dialogue gaps", "Remove unnecessary beats"]
  }
}
```

## Rhythm Techniques

- **Pacing**: Overall speed
- **Timing**: Cut points
- **Holds**: Extended moments
- **Breaths**: Pause beats
- **Accelerations**: Faster sections

## Instructions

1. Analyze current pacing
2. Identify target rhythm
3. Plan adjustments
4. Apply lengthening
5. Apply shortening
6. Balance dynamics
7. Review flow
8. Final timing

## Examples

### Example 1: Slow Down for Emotion

**Input:**

```
Video: Reunion scene
Current: 45 seconds
Target: More contemplative
```

**Output:**

```json
{
  "rhythmAnalysis": {
    "currentPacing": "moderate",
    "issues": [
      "Rushes through emotional beats",
      "Not enough time for reactions",
      "Dialogue feels hurried"
    ]
  },
  "adjustments": [
    {
      "location": "Scene 1 - Recognition moment",
      "current": "2s_hold",
      "adjusted": "4s_hold",
      "technique": "extend_reaction_shot",
      "reason": "Allow emotional moment to land"
    },
    {
      "location": "Scene 1 - After 'It's really you'",
      "current": "immediate_cut",
      "adjusted": "2s_breath_pause",
      "technique": "add_breath_moment",
      "reason": "Let silence speak"
    },
    {
      "location": "Scene 3 - Argument peak",
      "current": "quick_cuts",
      "adjusted": "sustained_shot",
      "technique": "hold_on_intensity",
      "reason": "Build tension through duration"
    }
  ],
  "newTiming": {
    "totalDuration": "52_seconds",
    "increase": "7_seconds",
    "percentage": "+15%"
  },
  "techniquesApplied": [
    {
      "technique": "extended_holds",
      "description": "Hold on emotional reactions 2-4 seconds longer",
      "impact": "Allows audience to feel with characters"
    },
    {
      "technique": "breath_moments",
      "description": "Add 1-2 second pauses after key lines",
      "impact": "Creates space for subtext"
    },
    {
      "technique": "sustained_intensity",
      "description": "Stay on shots during emotional peaks",
      "impact": "Builds tension without cutting"
    }
  ],
  "pacingCurve": [
    { "time": "0-15s", "pace": "slow_contemplative" },
    { "time": "15-35s", "pace": "building_tension" },
    { "time": "35-52s", "pace": "emotional_peak" }
  ]
}
```

## Error Handling

- Returns basic adjustments if video unclear
- Flags impossible timing changes
- Warns about over-extension
- Suggests alternatives
