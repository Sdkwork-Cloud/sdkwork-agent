---
name: prepare-platform-upload
version: '1.0.0'
author: sdkwork.com
description: Prepare all assets and metadata for specific platform upload. Use for streamlined publishing.
category: publishing
license: Apache-2.0
compatibility: Works with all major platforms
metadata:
  tags: platform upload publishing preparation assets
---

# Prepare Platform Upload

## Purpose

Prepare complete upload packages optimized for specific platforms including all required assets, metadata, and settings.

## When to Use

- Platform publishing
- Bulk uploads
- Scheduled releases
- Multi-platform distribution
- Upload automation

## Inputs

- `content` (object, required): Content to upload
- `platform` (string, required): Target platform
- `schedule` (object, optional): Publishing schedule

## Outputs

```json
{
  "uploadPackage": {
    "platform": "youtube",
    "video": {
      "file": "episode_01_youtube.mp4",
      "title": "The Reunion: Five Years Later",
      "description": "Complete description...",
      "tags": ["romance", "short drama"],
      "thumbnail": "thumbnail_youtube.jpg",
      "category": "Entertainment",
      "privacy": "public",
      "schedule": "2024-02-01T10:00:00Z"
    },
    "settings": {
      "monetization": true,
      "comments": true,
      "subtitles": "episode_01_en.srt"
    }
  }
}
```

## Platform Requirements

- **YouTube**: Video, thumbnail, metadata
- **TikTok**: Video, caption, hashtags
- **Instagram**: Video, caption, hashtags
- **Generic**: Standard formats

## Instructions

1. Select target platform
2. Gather all assets
3. Format metadata
4. Set privacy options
5. Configure settings
6. Schedule if needed
7. Validate package
8. Prepare upload

## Examples

### Example 1: YouTube Upload

**Input:**

```
Content: Episode 1
Platform: YouTube
Schedule: Feb 1, 2024
```

**Output:**

```json
{
  "uploadPackage": {
    "platform": "YouTube",
    "status": "ready",
    "video": {
      "file": {
        "path": "episode_01_youtube_1080p.mp4",
        "size": "485MB",
        "duration": "8:24",
        "verified": true
      },
      "metadata": {
        "title": "The Reunion: Five Years Later | A Second Chance Romance",
        "description": "Five years ago, Emma and Marcus parted ways with broken hearts. Now, a chance encounter at their favorite coffee shop brings them face to face. 💔\n\nAs they confront the truth about their past separation, they must decide if some loves are worth fighting for.\n\n🎬 A touching short drama about forgiveness, second chances, and the enduring power of love.\n\n⏱️ Runtime: 8 minutes\n🎭 Genre: Romance/Drama\n\n#ShortDrama #Romance #LoveStory #SecondChance #Emotional",
        "tags": [
          "romance",
          "short drama",
          "love story",
          "second chance",
          "emotional",
          "reunion",
          "short film",
          "drama",
          "relationship",
          "forgiveness"
        ],
        "category": "Entertainment",
        "language": "English",
        "recordingDate": "2024-01-15"
      },
      "thumbnail": {
        "file": "thumbnail_youtube_1280x720.jpg",
        "uploaded": false
      },
      "subtitles": {
        "files": [
          {
            "language": "English",
            "file": "episode_01_en.srt"
          },
          {
            "language": "Spanish",
            "file": "episode_01_es.srt"
          }
        ]
      }
    },
    "settings": {
      "privacy": {
        "status": "scheduled",
        "publishAt": "2024-02-01T10:00:00Z",
        "timezone": "America/New_York"
      },
      "monetization": {
        "enabled": true,
        "ads": "standard"
      },
      "engagement": {
        "comments": "allowed",
        "ratings": "allowed",
        "embedding": true
      },
      "distribution": {
        "syndication": "everywhere",
        "license": "standard"
      },
      "advanced": {
        "category": "Entertainment",
        "comments": {
          "sort": "top",
          "moderation": "hold_potentially_inappropriate"
        },
        "cards": [
          {
            "type": "video",
            "time": "7:30",
            "content": "Next episode teaser"
          }
        ],
        "endScreen": {
          "elements": [
            {
              "type": "video",
              "position": "left",
              "content": "best_for_viewer"
            },
            {
              "type": "subscribe",
              "position": "right"
            }
          ]
        }
      }
    },
    "playlists": [
      {
        "name": "The Reunion - Full Series",
        "position": "1"
      },
      {
        "name": "Romance Short Dramas",
        "position": "end"
      }
    ],
    "validation": {
      "titleLength": 58,
      "titleValid": true,
      "descriptionLength": 487,
      "tagsCount": 10,
      "thumbnailValid": true,
      "allChecks": "passed"
    }
  }
}
```

## Error Handling

- Returns basic package if platform unclear
- Flags missing required fields
- Warns about limit violations
- Suggests corrections
