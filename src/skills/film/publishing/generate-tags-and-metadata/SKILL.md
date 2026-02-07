---
name: generate-tags-and-metadata
version: '1.0.0'
author: sdkwork.com
description: Generate tags, categories, and metadata for video content. Use for platform optimization and discovery.
category: publishing
license: Apache-2.0
compatibility: Works with all platforms
metadata:
  tags: tags metadata categories SEO discovery
---

# Generate Tags and Metadata

## Purpose

Create comprehensive tags, categories, and metadata to optimize video discoverability and platform performance.

## When to Use

- Platform publishing
- SEO optimization
- Content categorization
- Discovery enhancement
- Analytics tracking

## Inputs

- `content` (object, required): Content information
- `platforms` (array, optional): Target platforms (default: ['youtube', 'generic'])
- `maxTags` (number, optional): Maximum tags to generate (default: 15)

## Outputs

```json
{
  "tags": {
    "primary": ["romance", "short drama", "love story"],
    "secondary": ["second chance", "emotional", "reunion"],
    "longTail": ["forgiveness story", "coffee shop romance"],
    "hashtags": ["#ShortDrama", "#Romance", "#LoveStory"]
  },
  "metadata": {
    "category": "Entertainment",
    "genre": "Romance/Drama",
    "mood": "Bittersweet",
    "themes": ["Love", "Forgiveness", "Second Chances"],
    "audience": "Young Adult"
  }
}
```

## Tag Types

- **Primary**: Core content tags
- **Secondary**: Supporting tags
- **Long-tail**: Specific phrases
- **Hashtags**: Social media
- **Categories**: Platform taxonomy

## Instructions

1. Analyze content themes
2. Identify core topics
3. Research popular tags
4. Create tag hierarchy
5. Optimize for platforms
6. Add categories
7. Set metadata
8. Validate coverage

## Examples

### Example 1: Romance Content

**Input:**

```
Content: Romance reunion story
Platforms: [youtube, tiktok, instagram]
```

**Output:**

```json
{
  "tagStrategy": {
    "universal": {
      "primary": ["romance", "short drama", "love story", "emotional", "relationship"],
      "secondary": ["second chance", "reunion", "forgiveness", "heartbreak", "hope"],
      "longTail": [
        "second chance romance",
        "reunion love story",
        "coffee shop meeting",
        "former lovers meet again"
      ]
    },
    "platformSpecific": {
      "youtube": {
        "tags": [
          "romance short film",
          "love story short",
          "emotional short drama",
          "relationship drama",
          "romantic story",
          "short movie",
          "indie film",
          "drama short"
        ],
        "category": "Entertainment",
        "playlist": "Romance Short Films"
      },
      "tiktok": {
        "hashtags": [
          "#ShortDrama",
          "#Romance",
          "#LoveStory",
          "#Emotional",
          "#SecondChance",
          "#ForYou",
          "#FYP",
          "#Viral",
          "#StoryTime",
          "#MiniSeries"
        ],
        "sounds": ["emotional", "romantic"]
      },
      "instagram": {
        "hashtags": [
          "#Reels",
          "#InstaDrama",
          "#RomanceReels",
          "#ShortFilm",
          "#LoveStory",
          "#DramaSeries",
          "#ContentCreator"
        ]
      }
    }
  },
  "metadata": {
    "content": {
      "type": "Short Drama",
      "genre": "Romance/Drama",
      "subGenre": "Contemporary Romance",
      "format": "Vertical Short",
      "duration": "8_minutes",
      "language": "English"
    },
    "audience": {
      "primary": "Young Adults 18-34",
      "secondary": "Romance Fans",
      "interests": ["Relationships", "Emotional Stories", "Short Form Content"],
      "mood": "Bittersweet, Hopeful"
    },
    "themes": [
      {
        "theme": "Second Chances",
        "keywords": ["redemption", "new beginning", "hope"]
      },
      {
        "theme": "Forgiveness",
        "keywords": ["healing", "understanding", "letting go"]
      },
      {
        "theme": "Love",
        "keywords": ["romance", "connection", "soulmates"]
      }
    ],
    "technical": {
      "quality": "HD",
      "aspectRatio": "9:16",
      "hasSubtitles": true,
      "languageVersions": ["English"]
    }
  },
  "seoRecommendations": {
    "titleKeywords": ["reunion", "second chance", "love"],
    "descriptionKeywords": ["romance", "emotional", "short drama"],
    "thumbnailText": "5 Years Later...",
    "searchOptimization": "Focus on 'second chance romance' and 'reunion story' search terms"
  }
}
```

## Error Handling

- Returns basic tags if content unclear
- Flags platform limit violations
- Warns about tag relevance
- Suggests alternatives
