---
name: estimate-generation-time
version: '1.0.0'
author: sdkwork.com
description: Estimate time required for AI content generation based on complexity and resources. Use for production scheduling.
category: quality
license: Apache-2.0
compatibility: Works with any production workflow
metadata:
  tags: time estimation scheduling generation duration
---

# Estimate Generation Time

## Purpose

Calculate estimated time required for AI content generation based on shot complexity, method selection, and available resources.

## When to Use

- Production scheduling
- Timeline planning
- Resource allocation
- Deadline estimation
- Workflow optimization

## Inputs

- `project` (object, required): Project specifications
- `resources` (object, optional): Available resources
- `parallelization` (boolean, optional): Allow parallel processing (default: true)

## Outputs

```json
{
  "timeEstimate": {
    "total": "4_hours_30_minutes",
    "breakdown": {
      "videoGeneration": "3_hours",
      "imageGeneration": "45_minutes",
      "audioGeneration": "30_minutes",
      "postProcessing": "15_minutes"
    },
    "criticalPath": ["videoGeneration", "postProcessing"],
    "parallelizable": ["imageGeneration", "audioGeneration"]
  }
}
```

## Time Factors

- **Shot count**: Number of shots
- **Complexity**: Detail level
- **Method**: Generation approach
- **Resolution**: Output quality
- **Iterations**: Revisions
- **Queue time**: Processing wait

## Instructions

1. Analyze project scope
2. Count shots by type
3. Assign complexity scores
4. Select generation methods
5. Calculate base times
6. Add queue estimates
7. Plan parallel work
8. Generate schedule

## Examples

### Example 1: Scene Generation Timeline

**Input:**

```
Project: 8-minute episode
Shots: 45 total
Resources: Standard GPU
```

**Output:**

```json
{
  "generationEstimate": {
    "project": "Episode 1 - The Reunion",
    "totalDuration": "6_hours_45_minutes",
    "wallClockTime": "3_hours_30_minutes",
    "parallelization": "enabled"
  },
  "breakdown": {
    "videoGeneration": {
      "estimatedTime": "4_hours_30_minutes",
      "shots": [
        {
          "type": "text_to_video",
          "count": 20,
          "timePerShot": "6_minutes",
          "total": "2_hours",
          "parallelizable": true
        },
        {
          "type": "image_to_video",
          "count": 15,
          "timePerShot": "8_minutes",
          "total": "2_hours",
          "parallelizable": true
        },
        {
          "type": "complex_multi_reference",
          "count": 10,
          "timePerShot": "18_minutes",
          "total": "1_hour_30_minutes",
          "parallelizable": false
        }
      ],
      "bottleneck": "complex_shots_sequential"
    },
    "imageGeneration": {
      "estimatedTime": "45_minutes",
      "shots": 15,
      "timePerImage": "3_minutes",
      "parallelizable": true,
      "canRunWith": "video_generation"
    },
    "audioGeneration": {
      "estimatedTime": "30_minutes",
      "breakdown": {
        "voiceSynthesis": "15_minutes",
        "musicGeneration": "10_minutes",
        "soundEffects": "5_minutes"
      },
      "parallelizable": true,
      "dependencies": ["video_complete"]
    },
    "postProcessing": {
      "estimatedTime": "1_hour",
      "breakdown": {
        "sceneAssembly": "30_minutes",
        "colorGrading": "15_minutes",
        "finalExport": "15_minutes"
      },
      "dependencies": ["all_generation_complete"],
      "parallelizable": false
    }
  },
  "schedule": {
    "phase1": {
      "name": "Generation",
      "duration": "2_hours",
      "tasks": ["Generate simple shots (parallel)", "Generate reference images (parallel)"]
    },
    "phase2": {
      "name": "Complex Generation",
      "duration": "1_hour_30_minutes",
      "tasks": ["Generate complex multi-reference shots (sequential)"],
      "dependencies": ["phase1"]
    },
    "phase3": {
      "name": "Audio",
      "duration": "30_minutes",
      "tasks": ["Generate voice, music, effects"],
      "dependencies": ["phase1"],
      "parallelWith": ["phase2"]
    },
    "phase4": {
      "name": "Post-Production",
      "duration": "1_hour",
      "tasks": ["Assemble scenes", "Color grade", "Export final"],
      "dependencies": ["phase2", "phase3"]
    }
  },
  "optimization": {
    "suggestions": [
      "Run simple video and image generation in parallel",
      "Start audio generation while complex videos render",
      "Use batch processing for similar shots"
    ],
    "potentialSavings": "45_minutes",
    "optimizedTime": "2_hours_45_minutes_wall_clock"
  }
}
```

## Error Handling

- Returns basic estimate if project unclear
- Flags resource constraints
- Warns about timeline risks
- Suggests optimizations
