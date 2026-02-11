---
name: optimize-generation-cost
version: '1.0.0'
author: sdkwork.com
description: Optimize content generation costs by prioritizing shots and selecting efficient methods. Use for budget management.
category: quality
license: Apache-2.0
compatibility: Works with any production workflow
metadata:
  tags: cost optimization budget efficiency generation
---

# Optimize Generation Cost

## Purpose

Analyze production requirements and optimize costs for AI-generated content by prioritizing shots, selecting efficient methods, and managing resources.

## When to Use

- Budget planning
- Resource allocation
- Cost optimization
- Production planning
- Efficiency analysis

## Inputs

- `project` (object, required): Project specifications
- `budget` (number, optional): Target budget
- `priority` (string, optional): 'quality' | 'cost' | 'balanced' (default: 'balanced')

## Outputs

```json
{
  "costOptimization": {
    "estimatedCost": 850,
    "optimizedCost": 620,
    "savings": 230,
    "strategies": [
      {
        "strategy": "reuse_backgrounds",
        "savings": 120,
        "impact": "low"
      },
      {
        "strategy": "simplify_complex_shots",
        "savings": 80,
        "impact": "medium"
      }
    ],
    "priorities": {
      "high": ["hero_shots", "emotional_closeups"],
      "medium": ["establishing_shots"],
      "low": ["background_elements"]
    }
  }
}
```

## Cost Factors

- **Shot complexity**: Detail level
- **Generation method**: AI model costs
- **Resolution**: Output quality
- **Duration**: Length of content
- **Iterations**: Revisions needed

## Instructions

1. Analyze project scope
2. Calculate base costs
3. Identify optimization areas
4. Prioritize shots
5. Select efficient methods
6. Plan resource reuse
7. Estimate savings
8. Generate report

## Examples

### Example 1: Scene Cost Optimization

**Input:**

```
Project: 8-minute short drama
Shots: 45 total
Budget: $500 target
```

**Output:**

```json
{
  "costAnalysis": {
    "originalEstimate": {
      "total": 875,
      "breakdown": {
        "videoGeneration": 600,
        "imageGeneration": 150,
        "audioGeneration": 75,
        "postProcessing": 50
      }
    },
    "optimizedPlan": {
      "total": 485,
      "savings": 390,
      "percentage": 45
    }
  },
  "optimizationStrategies": [
    {
      "category": "shotPrioritization",
      "savings": 150,
      "actions": [
        {
          "action": "Reduce establishing shots from 8 to 4",
          "shotsAffected": 4,
          "savings": 80,
          "qualityImpact": "minimal - story still clear"
        },
        {
          "action": "Use static shots instead of complex camera moves",
          "shotsAffected": 6,
          "savings": 70,
          "qualityImpact": "low - intimacy actually improved"
        }
      ]
    },
    {
      "category": "resourceReuse",
      "savings": 120,
      "actions": [
        {
          "action": "Reuse coffee shop background for 3 scenes",
          "savings": 90,
          "qualityImpact": "none - same location"
        },
        {
          "action": "Use same character model with clothing variations",
          "savings": 30,
          "qualityImpact": "none - appropriate for story"
        }
      ]
    },
    {
      "category": "methodOptimization",
      "savings": 80,
      "actions": [
        {
          "action": "Use text-to-video for simple shots instead of image-to-video",
          "shotsAffected": 10,
          "savings": 50,
          "qualityImpact": "low - acceptable for background shots"
        },
        {
          "action": "Generate 2-second loops for ambient shots",
          "shotsAffected": 4,
          "savings": 30,
          "qualityImpact": "none - appropriate for atmosphere"
        }
      ]
    },
    {
      "category": "audioOptimization",
      "savings": 40,
      "actions": [
        {
          "action": "Use AI voice synthesis for narration only",
          "savings": 25,
          "qualityImpact": "none - no dialogue in this scene"
        },
        {
          "action": "Reuse ambient tracks across scenes",
          "savings": 15,
          "qualityImpact": "none - same location"
        }
      ]
    }
  ],
  "prioritizedShots": {
    "tier1_essential": {
      "count": 15,
      "budget": 300,
      "shots": ["emotional_closeups", "key_story_beats", "character_reactions"],
      "quality": "highest"
    },
    "tier2_important": {
      "count": 18,
      "budget": 150,
      "shots": ["dialogue_coverage", "scene_transitions"],
      "quality": "high"
    },
    "tier3_supporting": {
      "count": 12,
      "budget": 35,
      "shots": ["establishing_shots", "atmosphere"],
      "quality": "acceptable"
    }
  },
  "recommendations": [
    "Focus budget on emotional close-ups",
    "Reuse backgrounds wherever possible",
    "Use simpler generation methods for background elements",
    "Consider 2-second loops for atmospheric shots"
  ]
}
```

## Error Handling

- Returns basic estimate if project unclear
- Flags impossible budgets
- Warns about quality trade-offs
- Suggests alternatives
