---
name: filter-sensitive-content
version: '1.0.0'
author: sdkwork.com
description: Filter and flag sensitive content for different audiences and markets. Use for content rating and regional compliance.
category: compliance
license: Apache-2.0
compatibility: Works with all content types
metadata:
  tags: sensitive content filter rating regional compliance
---

# Filter Sensitive Content

## Purpose

Identify, flag, and filter sensitive content for different audiences, markets, and platform requirements to ensure appropriate distribution.

## When to Use

- Regional distribution
- Content rating
- Audience targeting
- Platform compliance
- Cultural adaptation

## Inputs

- `content` (object, required): Content to filter
- `targetMarket` (string, required): Target region/market
- `audience` (string, optional): Target audience (default: 'general')

## Outputs

```json
{
  "filterReport": {
    "market": "global",
    "rating": "PG",
    "flags": [
      {
        "type": "emotional_content",
        "severity": "low",
        "action": "none_required"
      }
    ],
    "recommendations": ["Content suitable for general audiences"]
  }
}
```

## Sensitive Categories

- **Political**: Political content
- **Religious**: Religious themes
- **Cultural**: Cultural sensitivity
- **Social**: Social issues
- **Historical**: Historical events
- **Regional**: Market-specific

## Instructions

1. Identify target market
2. Analyze content themes
3. Check cultural sensitivity
4. Review historical context
5. Assess social issues
6. Flag sensitive elements
7. Recommend filters
8. Generate rating

## Examples

### Example 1: Global Distribution

**Input:**

```
Content: Romance drama
Market: Global
Audience: General
```

**Output:**

```json
{
  "contentFiltering": {
    "content": "The Reunion - Episode 1",
    "assessmentDate": "2024-01-29",
    "targetMarkets": ["Global", "North America", "Europe", "Asia"],
    "universalRating": "PG"
  },
  "sensitivityAnalysis": {
    "politicalContent": {
      "level": "none",
      "flags": [],
      "notes": "No political themes or references"
    },
    "religiousContent": {
      "level": "none",
      "flags": [],
      "notes": "No religious themes or symbols"
    },
    "culturalSensitivity": {
      "level": "low",
      "flags": [],
      "notes": "Universal romance themes, culturally neutral",
      "considerations": [
        "Western coffee shop setting is globally recognizable",
        "Relationship dynamics are universal"
      ]
    },
    "socialIssues": {
      "level": "low",
      "identified": ["relationship_breakdown", "communication_issues"],
      "handling": "respectful",
      "notes": "Depicts healthy conflict resolution"
    },
    "historicalReferences": {
      "level": "none",
      "flags": [],
      "notes": "Contemporary setting, no historical events"
    }
  },
  "marketSpecific": {
    "northAmerica": {
      "rating": "PG",
      "contentDescriptors": ["Thematic Elements"],
      "warnings": [],
      "status": "approved"
    },
    "europe": {
      "rating": "PG",
      "bbfc": "PG",
      "fsk": "6",
      "warnings": [],
      "status": "approved"
    },
    "asia": {
      "rating": "G",
      "notes": "Generally acceptable across Asian markets",
      "considerations": [
        "Conservative markets may prefer less physical affection",
        "Consider alternative edit for most conservative regions"
      ]
    },
    "middleEast": {
      "rating": "PG",
      "notes": "Generally acceptable",
      "considerations": [
        "Some markets may require modest dress verification",
        "Content is relationship-focused, not explicit"
      ]
    }
  },
  "flags": [
    {
      "category": "emotional_intensity",
      "timestamp": "Scene 5",
      "description": "Argument scene with raised voices",
      "severity": "low",
      "action": "none_required",
      "notes": "Handled respectfully, shows healthy conflict"
    }
  ],
  "recommendations": {
    "edits": [],
    "warnings": [],
    "contentNotes": [
      "Suitable for all major markets without modification",
      "Universal themes transcend cultural boundaries"
    ],
    "alternativeVersions": {
      "conservative": "Not required",
      "extended": "Available if desired"
    }
  },
  "distributionClearance": {
    "global": "approved",
    "streaming": "approved",
    "theatrical": "approved",
    "broadcast": "approved",
    "mobile": "approved"
  }
}
```

## Error Handling

- Returns basic filter if market unclear
- Flags required modifications
- Provides regional guidance
- Suggests alternatives
