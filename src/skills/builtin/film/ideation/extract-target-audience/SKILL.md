---
name: extract-target-audience
description: Identify target demographic, psychographic, and viewing preferences from content or requirements. Use to tailor content for specific audience segments.
license: Apache-2.0
compatibility: Requires demographic analysis capabilities
metadata:
  version: '1.0.0'
  author: sdkwork.com
  category: ideation
  tags: audience demographic target viewer segmentation
---

# Extract Target Audience

## Purpose

Analyze content and requirements to identify optimal target audience segments for short drama.

## When to Use

- Defining audience for new content
- Analyzing existing content appeal
- Platform-specific optimization
- Marketing and distribution planning

## Inputs

- `content` (string, required): Content description, synopsis, or script
- `platform` (string, optional): Target platform (TikTok, YouTube, Instagram, etc.)
- `region` (string, optional): Geographic region for localization

## Outputs

```json
{
  "primaryAudience": {
    "ageRange": "18-34",
    "gender": "female_skewed",
    "interests": ["romance", "relationships", "emotional_stories"],
    "confidence": 0.89
  },
  "secondaryAudiences": [
    {
      "ageRange": "35-44",
      "gender": "balanced",
      "appeal": "nostalgia_themes"
    }
  ],
  "psychographics": {
    "values": ["authenticity", "emotional_connection"],
    "lifestyle": "urban_professional",
    "contentPreferences": {
      "duration": "3-5_minutes",
      "tone": "emotional_uplifting",
      "format": "vertical_video"
    }
  },
  "platformOptimization": {
    "TikTok": {
      "hook": "first_3_seconds",
      "pacing": "fast",
      "engagement": "high"
    }
  },
  "contentWarnings": [],
  "recommendations": ["Focus on emotional moments for sharing", "Use trending audio for discovery"]
}
```

## Audience Segments

| Segment     | Age   | Characteristics                          |
| ----------- | ----- | ---------------------------------------- |
| Gen Z       | 13-24 | Mobile-first, authentic, short attention |
| Millennials | 25-40 | Nostalgic, values-driven, shareable      |
| Gen X       | 41-56 | Story-focused, quality over quantity     |
| Boomers     | 57+   | Traditional narratives, longer form      |

## Instructions

1. Analyze content themes and tone
2. Identify age-appropriate elements
3. Determine gender appeal balance
4. Map to platform demographics
5. Identify psychographic patterns
6. Generate platform-specific recommendations
7. Flag any content warnings

## Examples

### Example 1: Young Romance

**Input:** "A story about college students falling in love through social media challenges"

**Output:**

```json
{
  "primaryAudience": {
    "ageRange": "18-24",
    "gender": "female_skewed",
    "interests": ["romance", "social_media", "trends"]
  },
  "psychographics": {
    "lifestyle": "college_student",
    "contentPreferences": {
      "format": "vertical_video",
      "pacing": "fast_with_slow_moments"
    }
  },
  "platformOptimization": {
    "TikTok": {
      "hook": "challenge_participation",
      "engagement": "very_high"
    }
  }
}
```

### Example 2: Family Drama

**Input:** "A story about three generations of women dealing with family secrets"

**Output:**

```json
{
  "primaryAudience": {
    "ageRange": "35-54",
    "gender": "female",
    "interests": ["family_drama", "relationships", "mystery"]
  },
  "secondaryAudiences": [
    {
      "ageRange": "25-34",
      "appeal": "relatable_family_dynamics"
    }
  ],
  "psychographics": {
    "values": ["family", "tradition", "truth"],
    "contentPreferences": {
      "duration": "5-8_minutes",
      "tone": "emotional_dramatic"
    }
  }
}
```
