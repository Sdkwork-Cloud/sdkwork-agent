---
name: generate-title-and-synopsis
version: '1.0.0'
author: sdkwork.com
description: Generate compelling title and synopsis for video content. Use for platform metadata and discovery.
category: publishing
license: Apache-2.0
compatibility: Works with any content
metadata:
  tags: title synopsis description metadata SEO
---

# Generate Title and Synopsis

## Purpose

Create compelling, SEO-optimized titles and synopses that accurately represent content while maximizing discoverability and viewer interest.

## When to Use

- Platform publishing
- SEO optimization
- Content discovery
- Marketing copy
- Metadata creation

## Inputs

- `content` (object, required): Content information
- `platform` (string, optional): Target platform (default: 'generic')
- `tone` (string, optional): 'dramatic' | 'intriguing' | 'emotional' | 'neutral' (default: 'emotional')

## Outputs

```json
{
  "title": {
    "main": "The Reunion: Five Years Later",
    "variations": ["They Meet Again After 5 Years", "A Second Chance at Love"]
  },
  "synopsis": {
    "short": "Two former lovers reunite after five years apart. Can they overcome the past and find their way back to each other?",
    "medium": "Emma and Marcus haven't seen each other in five years. When a chance encounter brings them together at their old coffee shop, old feelings resurface along with painful memories. As they confront the truth about their past separation, they must decide if love is worth a second chance.",
    "long": "Complete synopsis..."
  },
  "seo": {
    "keywords": ["romance", "second chance", "reunion", "love story"],
    "hashtags": ["#ShortDrama", "#Romance", "#LoveStory"]
  }
}
```

## Title Elements

- **Hook**: Attention-grabbing
- **Clarity**: Clear subject
- **Length**: Platform-appropriate
- **Keywords**: SEO-friendly
- **Emotion**: Evokes feeling

## Instructions

1. Analyze content themes
2. Identify key hooks
3. Draft title options
4. Write synopses
5. Optimize for SEO
6. Check platform limits
7. Test variations
8. Finalize copy

## Examples

### Example 1: Romance Title

**Input:**

```
Content: Reunion romance, 8 minutes
Themes: Second chance, forgiveness
```

**Output:**

```json
{
  "titleOptions": {
    "primary": {
      "title": "The Reunion: Five Years Later",
      "length": 32,
      "rationale": "Clear, emotional, hints at time gap"
    },
    "alternatives": [
      {
        "title": "They Meet Again After 5 Years",
        "length": 29,
        "tone": "intriguing"
      },
      {
        "title": "A Second Chance at Love",
        "length": 24,
        "tone": "hopeful"
      },
      {
        "title": "The Coffee Shop Reunion",
        "length": 24,
        "tone": "specific_setting"
      }
    ],
    "platformOptimized": {
      "youtube": "The Reunion: Five Years Later (A Second Chance Romance)",
      "tiktok": "They meet again after 5 years... 💔",
      "instagram": "The Reunion: A Second Chance at Love"
    }
  },
  "synopsis": {
    "ultraShort": {
      "length": "50_chars",
      "text": "Two former lovers reunite. Can they forgive the past?"
    },
    "short": {
      "length": "150_chars",
      "text": "Emma and Marcus haven't seen each other in five years. When fate brings them back together, old feelings resurface. Can love get a second chance?"
    },
    "medium": {
      "length": "300_chars",
      "text": "Five years ago, Emma and Marcus parted ways with broken hearts. Now, a chance encounter at their favorite coffee shop brings them face to face. As they confront the truth about their past, they must decide if some loves are worth fighting for. A touching story about forgiveness, second chances, and the enduring power of love."
    },
    "long": {
      "length": "500_chars",
      "text": "Complete detailed synopsis..."
    }
  },
  "seoOptimization": {
    "keywords": [
      "romance",
      "second chance love",
      "reunion story",
      "short drama",
      "love story",
      "emotional",
      "forgiveness"
    ],
    "hashtags": {
      "universal": ["#ShortDrama", "#Romance", "#LoveStory"],
      "platformSpecific": {
        "tiktok": ["#ForYou", "#FYP", "#Viral"],
        "instagram": ["#Reels", "#InstaDrama"]
      }
    },
    "searchTerms": ["second chance romance", "reunion love story", "emotional short film"]
  },
  "metadata": {
    "genre": "Romance/Drama",
    "mood": "Bittersweet, Hopeful",
    "themes": ["Second Chances", "Forgiveness", "Love"],
    "targetAudience": "Young Adults, Romance Fans"
  }
}
```

## Error Handling

- Returns basic titles if content unclear
- Flags length violations
- Warns about SEO issues
- Suggests improvements
