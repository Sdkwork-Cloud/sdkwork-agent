---
name: detect-plot-holes
version: '1.0.0'
author: sdkwork.com
description: Detect plot holes, logical inconsistencies, and narrative gaps in story. Use for story development and quality control.
category: quality
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: plot holes logic inconsistencies narrative gaps
---

# Detect Plot Holes

## Purpose

Identify plot holes, logical inconsistencies, unanswered questions, and narrative gaps that could confuse viewers or weaken the story.

## When to Use

- Story development
- Script editing
- Quality assurance
- Plot validation
- Pre-production review

## Inputs

- `script` (string, required): Full script content
- `sensitivity` (string, optional): 'low' | 'medium' | 'high' (default: 'medium')

## Outputs

```json
{
  "plotHoleReport": {
    "holes": [
      {
        "type": "unexplained_motivation",
        "severity": "high",
        "location": "Scene 5",
        "description": "Marcus's reason for leaving never fully explained",
        "impact": "Weakens emotional resolution",
        "suggestion": "Add specific reason in Scene 7 dialogue"
      }
    ],
    "unansweredQuestions": [
      "Why didn't Emma try to contact Marcus?",
      "What happened to Marcus's job?"
    ]
  }
}
```

## Plot Hole Types

- **Unexplained Motivation**: Why characters act
- **Missing Information**: Gaps in backstory
- **Logical Inconsistency**: Contradictions
- **Unanswered Questions**: Loose ends
- **Impossible Events**: Physics/logic breaks
- **Convenience**: Too coincidental

## Instructions

1. Map complete plot
2. Identify motivations
3. Check cause/effect
4. Find missing info
5. Test logic chains
6. List questions
7. Assess severity
8. Suggest fixes

## Examples

### Example 1: Motivation Gap

**Input:**

```
Script: Romance reunion story
Sensitivity: High
```

**Output:**

```json
{
  "plotHoleAnalysis": {
    "overallRisk": "medium",
    "criticalIssues": 1,
    "minorIssues": 3,
    "holes": [
      {
        "id": "hole_001",
        "type": "unexplained_motivation",
        "severity": "high",
        "location": "Throughout, especially Scene 7",
        "description": "Marcus's specific reason for leaving is vague - 'family issues' is too generic",
        "currentExplanation": "'I had family issues to deal with'",
        "problem": "Doesn't justify 5 years of no contact",
        "impact": "Weakens forgiveness arc - Emma accepts too easily",
        "viewerQuestion": "Why didn't he at least send a letter?",
        "suggestions": [
          {
            "option": "Specific family emergency",
            "detail": "Sick parent requiring full-time care abroad",
            "strength": "Explains urgency and communication difficulty"
          },
          {
            "option": "Misunderstanding",
            "detail": "Thought Emma didn't want him (misread signal)",
            "strength": "Creates parallel to Emma's hurt"
          }
        ]
      },
      {
        "id": "hole_002",
        "type": "unanswered_question",
        "severity": "medium",
        "question": "Why didn't Emma try to find Marcus in 5 years?",
        "current": "Not addressed",
        "impact": "Makes Emma seem passive",
        "suggestion": "Add line about trying social media but he disappeared"
      },
      {
        "id": "hole_003",
        "type": "convenience",
        "severity": "low",
        "location": "Scene 1",
        "description": "Running into each other at same coffee shop after 5 years",
        "probability": "Low but possible",
        "suggestion": "Acceptable coincidence for story setup"
      }
    ],
    "recommendations": [
      {
        "priority": "critical",
        "hole": "hole_001",
        "action": "Revise Scene 7 dialogue to give specific compelling reason",
        "impact": "High - strengthens entire emotional arc"
      },
      {
        "priority": "medium",
        "hole": "hole_002",
        "action": "Add one line in Scene 3 about Emma's attempts to find him",
        "impact": "Medium - adds character depth"
      }
    ]
  }
}
```

## Error Handling

- Returns basic analysis if script unclear
- Flags critical holes
- Prioritizes by severity
- Suggests concrete fixes
