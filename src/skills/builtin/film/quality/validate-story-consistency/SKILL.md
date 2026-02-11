---
name: validate-story-consistency
version: '1.0.0'
author: sdkwork.com
description: Validate story consistency across scenes including plot logic and narrative flow. Use for quality assurance.
category: quality
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: consistency validation story plot logic
---

# Validate Story Consistency

## Purpose

Analyze story for consistency issues including plot logic, narrative flow, and continuity across scenes.

## When to Use

- Script review
- Quality assurance
- Development editing
- Plot hole detection
- Narrative validation

## Inputs

- `script` (string, required): Full script content
- `checkLevel` (string, optional): 'basic' | 'detailed' | 'comprehensive' (default: 'detailed')

## Outputs

```json
{
  "consistencyReport": {
    "status": "issues_found",
    "score": 85,
    "issues": [
      {
        "type": "timeline",
        "severity": "medium",
        "location": "Scene 4",
        "description": "Time jump unclear - 3 days mentioned but no visual indicators",
        "suggestion": "Add visual cue for time passage"
      }
    ],
    "checks": {
      "plotLogic": "passed",
      "timeline": "warning",
      "characterMotivation": "passed",
      "causeEffect": "passed"
    }
  }
}
```

## Consistency Checks

- **Plot Logic**: Cause and effect
- **Timeline**: Chronological consistency
- **Character Motivation**: Believable actions
- **Cause/Effect**: Logical consequences
- **World Rules**: Internal consistency

## Instructions

1. Parse full script
2. Map plot points
3. Check timeline
4. Verify motivations
5. Test cause/effect
6. Identify issues
7. Suggest fixes
8. Generate report

## Examples

### Example 1: Timeline Issue

**Input:**

```
Script: Romance with 5-year gap
Check: Comprehensive
```

**Output:**

```json
{
  "validationReport": {
    "overallScore": 87,
    "status": "minor_issues",
    "categories": {
      "plotLogic": {
        "score": 95,
        "status": "excellent",
        "notes": "Clear cause and effect throughout"
      },
      "timeline": {
        "score": 75,
        "status": "needs_attention",
        "issues": [
          {
            "type": "time_jump_clarity",
            "scene": "Scene 4",
            "issue": "Flashback to 5 years ago lacks clear transition",
            "current": "Dialogue mentions '5 years ago' but visual transition is subtle",
            "recommendation": "Add stronger visual cue - different lighting, costume, or title card",
            "severity": "medium"
          }
        ]
      },
      "characterMotivation": {
        "score": 90,
        "status": "good",
        "notes": "Emma's actions are believable given her history"
      },
      "causeEffect": {
        "score": 92,
        "status": "good",
        "notes": "Revelation in Scene 5 properly explains Scene 3 behavior"
      }
    },
    "recommendations": [
      {
        "priority": "high",
        "issue": "Flashback transition",
        "action": "Add visual title card '5 Years Ago' or distinct color grading"
      },
      {
        "priority": "medium",
        "issue": "Marcus's explanation",
        "action": "Consider adding one more clue in Scene 2 to foreshadow revelation"
      }
    ]
  }
}
```

## Error Handling

- Returns basic report if script unclear
- Flags critical inconsistencies
- Warns about potential issues
- Suggests priority fixes
