---
name: check-content-safety
version: '1.0.0'
author: sdkwork.com
description: Check content for safety issues including violence, explicit content, and sensitive topics. Use for platform compliance.
category: compliance
license: Apache-2.0
compatibility: Works with all platforms
metadata:
  tags: safety content moderation violence explicit sensitive
---

# Check Content Safety

## Purpose

Analyze content for safety issues including violence, explicit material, sensitive topics, and platform guideline compliance.

## When to Use

- Pre-publication review
- Platform compliance
- Content moderation
- Safety assessment
- Risk evaluation

## Inputs

- `content` (object, required): Content to check
- `platform` (string, optional): Target platform (default: 'universal')
- `strictness` (string, optional): 'low' | 'medium' | 'high' (default: 'medium')

## Outputs

```json
{
  "safetyReport": {
    "status": "approved",
    "score": 95,
    "categories": {
      "violence": {
        "level": "none",
        "status": "pass"
      },
      "explicit": {
        "level": "none",
        "status": "pass"
      },
      "language": {
        "level": "mild",
        "status": "pass"
      }
    }
  }
}
```

## Safety Categories

- **Violence**: Physical harm
- **Explicit**: Sexual content
- **Language**: Profanity
- **Hate**: Discriminatory content
- **Dangerous**: Harmful acts
- **Sensitive**: Triggers

## Instructions

1. Analyze content
2. Check violence levels
3. Review explicit content
4. Assess language
5. Identify triggers
6. Compare guidelines
7. Calculate score
8. Generate report

## Examples

### Example 1: Romance Content Check

**Input:**

```
Content: Romance reunion story
Platform: Universal
Strictness: Medium
```

**Output:**

```json
{
  "safetyAssessment": {
    "content": "The Reunion - Episode 1",
    "overallStatus": "approved",
    "safetyScore": 98,
    "rating": "PG",
    "suitableFor": ["General Audiences", "Young Adults"],
    "reviewDate": "2024-01-29"
  },
  "categoryAnalysis": {
    "violence": {
      "level": "none",
      "status": "pass",
      "details": "No physical violence depicted",
      "notes": "Verbal confrontation in Scene 5 is emotional but not violent"
    },
    "sexualContent": {
      "level": "none",
      "status": "pass",
      "details": "No sexual content or nudity",
      "notes": "Romantic themes are chaste and appropriate"
    },
    "profanity": {
      "level": "none",
      "status": "pass",
      "details": "No profanity used",
      "notes": "Language is clean throughout"
    },
    "substanceUse": {
      "level": "mild",
      "status": "pass",
      "details": "Coffee and alcohol mentioned in background",
      "notes": "Social drinking in background, not focal"
    },
    "frighteningContent": {
      "level": "none",
      "status": "pass",
      "details": "No horror or frightening elements"
    },
    "discriminatoryContent": {
      "level": "none",
      "status": "pass",
      "details": "No hate speech or discrimination"
    },
    "dangerousBehavior": {
      "level": "none",
      "status": "pass",
      "details": "No dangerous activities depicted"
    }
  },
  "sensitiveTopics": {
    "identified": ["past_relationship_trauma", "abandonment_issues"],
    "handling": "respectful",
    "warnings": [],
    "recommendations": [
      "Content deals with emotional themes that may resonate with viewers who have experienced relationship difficulties"
    ]
  },
  "platformCompliance": {
    "youtube": {
      "status": "approved",
      "monetization": "suitable",
      "ageRestriction": "none"
    },
    "tiktok": {
      "status": "approved",
      "forYouPage": "eligible"
    },
    "instagram": {
      "status": "approved",
      "explorePage": "eligible"
    }
  },
  "recommendations": {
    "contentRating": "PG",
    "viewerDiscretion": "None required",
    "parentalGuidance": "Suitable for ages 13+",
    "additionalNotes": "Content is wholesome and appropriate for general audiences"
  }
}
```

## Error Handling

- Returns basic assessment if content unclear
- Flags potential violations
- Provides severity ratings
- Suggests modifications
