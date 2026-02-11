---
name: check-character-continuity
version: '1.0.0'
author: sdkwork.com
description: Check character continuity including appearance, behavior, and development consistency. Use for quality control.
category: quality
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: character continuity consistency behavior development
---

# Check Character Continuity

## Purpose

Validate character continuity across scenes including physical appearance, behavior patterns, emotional development, and consistency.

## When to Use

- Character tracking
- Continuity checking
- Development validation
- Quality assurance
- Casting consistency

## Inputs

- `script` (string, required): Full script content
- `characters` (array, optional): Specific characters to check
- `checkType` (string, optional): 'appearance' | 'behavior' | 'all' (default: 'all')

## Outputs

```json
{
  "continuityReport": {
    "character": "Emma",
    "checks": {
      "appearance": {
        "status": "consistent",
        "issues": []
      },
      "behavior": {
        "status": "warning",
        "issues": [
          {
            "scene": 5,
            "issue": "Sudden confidence shift without clear trigger",
            "severity": "low"
          }
        ]
      }
    }
  }
}
```

## Continuity Aspects

- **Appearance**: Physical description
- **Behavior**: Actions and reactions
- **Speech**: Dialogue patterns
- **Emotions**: Emotional consistency
- **Relationships**: Interactions
- **Development**: Growth arc

## Instructions

1. Extract character data
2. Track appearances
3. Monitor behavior
4. Check speech patterns
5. Validate emotions
6. Review relationships
7. Assess development
8. Generate report

## Examples

### Example 1: Character Arc Validation

**Input:**

```
Script: Romance with Emma and Marcus
Character: Emma
Check: All aspects
```

**Output:**

```json
{
  "characterContinuity": {
    "character": "Emma",
    "overallScore": 92,
    "status": "excellent",
    "aspects": {
      "physicalAppearance": {
        "score": 100,
        "status": "perfect",
        "notes": "Consistent description throughout",
        "details": {
          "age": "28 (consistent)",
          "hair": "mentioned consistently",
          "clothing": "appropriate for scenes"
        }
      },
      "behaviorPatterns": {
        "score": 88,
        "status": "good",
        "notes": "Generally consistent with minor issue",
        "patterns": {
          "nervousHabit": "adjusts_hair (Scenes 1, 3, 5)",
          "communicationStyle": "indirect_then_direct (consistent_arc)",
          "decisionMaking": "cautious_then_decisive (proper_progression)"
        },
        "issues": [
          {
            "scene": 5,
            "type": "behavior_shift",
            "description": "Suddenly confrontational without clear trigger moment",
            "current": "Direct attack on Marcus",
            "expected": "Build hesitation before confrontation",
            "severity": "low",
            "suggestion": "Add 2-3 lines of internal struggle before outburst"
          }
        ]
      },
      "emotionalConsistency": {
        "score": 95,
        "status": "excellent",
        "arc": "hopeful_to_hurt_to_healed",
        "validation": "Emotional journey is believable and well-paced",
        "keyTransitions": [
          {
            "from": "Scene 2",
            "to": "Scene 3",
            "emotion": "warmth_to_hurt",
            "valid": true,
            "reason": "Revelation provides clear trigger"
          },
          {
            "from": "Scene 6",
            "to": "Scene 7",
            "emotion": "anger_to_understanding",
            "valid": true,
            "reason": "Marcus's explanation is convincing"
          }
        ]
      },
      "dialogueConsistency": {
        "score": 90,
        "status": "good",
        "voice": "consistent_intelligent_emotional",
        "patterns": [
          "Uses ellipses when emotional",
          "Asks questions when uncertain",
          "Short sentences when angry"
        ],
        "notes": "Voice remains consistent throughout"
      }
    },
    "recommendations": [
      {
        "priority": "low",
        "aspect": "behavior",
        "suggestion": "Add small hesitation beat before Scene 5 confrontation",
        "rationale": "Strengthens character consistency"
      }
    ]
  }
}
```

## Error Handling

- Returns basic check if character unclear
- Flags major inconsistencies
- Warns about development gaps
- Suggests fixes
