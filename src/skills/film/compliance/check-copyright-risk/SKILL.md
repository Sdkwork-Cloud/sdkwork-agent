---
name: check-copyright-risk
version: '1.0.0'
author: sdkwork.com
description: Check content for potential copyright and trademark issues. Use for legal compliance.
category: compliance
license: Apache-2.0
compatibility: Works with all content types
metadata:
  tags: copyright trademark legal IP intellectual property
---

# Check Copyright Risk

## Purpose

Analyze content for potential copyright, trademark, and intellectual property risks including music, images, brands, and text.

## When to Use

- Pre-publication review
- Legal compliance
- Risk assessment
- IP clearance
- Content validation

## Inputs

- `content` (object, required): Content to check
- `checkType` (string, optional): 'basic' | 'comprehensive' (default: 'comprehensive')
- `territories` (array, optional): Target markets (default: ['global'])

## Outputs

```json
{
  "copyrightReport": {
    "riskLevel": "low",
    "issues": [
      {
        "type": "music",
        "risk": "low",
        "description": "Original score, no issues"
      }
    ],
    "clearance": {
      "music": "original",
      "images": "AI_generated",
      "brands": "none_visible"
    }
  }
}
```

## Copyright Categories

- **Music**: Audio tracks
- **Images**: Visual content
- **Video**: Footage
- **Text**: Scripts, dialogue
- **Brands**: Trademarks
- **Characters**: IP rights

## Instructions

1. Inventory all assets
2. Check music sources
3. Review image rights
4. Identify brands
5. Verify text originality
6. Assess character IP
7. Calculate risk levels
8. Generate clearance

## Examples

### Example 1: AI-Generated Content

**Input:**

```
Content: AI-generated short drama
Assets: AI video, original music, original script
```

**Output:**

```json
{
  "copyrightAssessment": {
    "content": "The Reunion - Episode 1",
    "overallRisk": "low",
    "riskScore": 15,
    "assessmentDate": "2024-01-29",
    "territories": ["Global"]
  },
  "assetAnalysis": {
    "videoContent": {
      "source": "AI_generated",
      "risk": "low",
      "notes": "Original AI-generated visuals, no third-party footage",
      "recommendations": [
        "Keep generation prompts and parameters for documentation",
        "Document AI tools used"
      ]
    },
    "audioMusic": {
      "source": "AI_generated_original",
      "risk": "very_low",
      "notes": "Original score generated for this production",
      "rights": "full_ownership",
      "documentation": "Keep generation records"
    },
    "audioDialogue": {
      "source": "AI_synthesis",
      "risk": "low",
      "notes": "AI-generated voices, no celebrity impersonation",
      "voiceRights": "synthetic_no_issue"
    },
    "script": {
      "source": "original",
      "risk": "very_low",
      "notes": "Original screenplay",
      "similarityCheck": "no_significant_matches"
    },
    "brandsAndLogos": {
      "identified": ["generic_coffee_shop_sign"],
      "risk": "very_low",
      "notes": "No real brands visible, generic signage only"
    },
    "locations": {
      "type": "fictional_composite",
      "risk": "very_low",
      "notes": "AI-generated locations, no identifiable real places"
    }
  },
  "riskFactors": {
    "highRisk": [],
    "mediumRisk": [],
    "lowRisk": [
      {
        "factor": "AI_generation_training_data",
        "description": "Potential uncertainty about training data rights",
        "mitigation": "Use platforms with clear commercial terms",
        "status": "acceptable_with_documentation"
      }
    ],
    "negligible": ["Original creative content", "No third-party assets", "No recognizable IP"]
  },
  "recommendations": {
    "documentation": [
      "Keep records of all AI generation parameters",
      "Document tools and platforms used",
      "Save original generation outputs"
    ],
    "bestPractices": [
      "Use AI platforms with clear commercial licenses",
      "Avoid prompts referencing copyrighted works",
      "Generate original rather than derivative content"
    ],
    "insurance": "Consider E&O insurance for commercial distribution"
  },
  "clearanceStatus": {
    "canPublish": true,
    "conditions": ["maintain_documentation"],
    "warnings": [],
    "territoryRestrictions": []
  }
}
```

## Error Handling

- Returns basic assessment if content unclear
- Flags high-risk items
- Provides mitigation strategies
- Suggests alternatives
