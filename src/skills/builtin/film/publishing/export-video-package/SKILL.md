---
name: export-video-package
version: '1.0.0'
author: sdkwork.com
description: Export complete video package with all formats and assets for distribution. Use for platform publishing.
category: publishing
license: Apache-2.0
compatibility: Works with video export systems
metadata:
  tags: export package distribution formats assets
---

# Export Video Package

## Purpose

Export complete video package with all required formats, resolutions, and assets for multi-platform distribution.

## When to Use

- Final delivery
- Platform publishing
- Distribution preparation
- Asset archiving
- Multi-format export

## Inputs

- `video` (object, required): Master video file
- `platforms` (array, required): Target platforms
- `includeAssets` (boolean, optional): Include additional assets (default: true)

## Outputs

```json
{
  "exportPackage": {
    "master": {
      "file": "episode_01_master.mp4",
      "resolution": "1920x1080",
      "codec": "H.264",
      "bitrate": "10Mbps"
    },
    "formats": [
      {
        "platform": "youtube",
        "file": "episode_01_youtube.mp4",
        "specs": "1080p, H.264, AAC"
      },
      {
        "platform": "tiktok",
        "file": "episode_01_tiktok.mp4",
        "specs": "1080x1920, H.264"
      }
    ],
    "assets": {
      "thumbnail": "cover_1280x720.jpg",
      "subtitles": "episode_01_en.srt",
      "metadata": "episode_01_metadata.json"
    }
  }
}
```

## Export Formats

- **Master**: Highest quality
- **YouTube**: 1080p H.264
- **TikTok**: 1080x1920 vertical
- **Instagram**: Multiple ratios
- **Generic**: MP4 H.264

## Instructions

1. Prepare master file
2. Define platform specs
3. Create format variations
4. Generate thumbnails
5. Export subtitles
6. Compile metadata
7. Package assets
8. Verify delivery

## Examples

### Example 1: Multi-Platform Export

**Input:**

```
Video: Episode 1 master
Platforms: [youtube, tiktok, instagram]
Assets: All
```

**Output:**

```json
{
  "exportPackage": {
    "project": "The Reunion - Episode 1",
    "masterFile": {
      "filename": "episode_01_master_prores.mov",
      "format": "ProRes 422 HQ",
      "resolution": "1920x1080",
      "frameRate": "24fps",
      "colorSpace": "Rec. 709",
      "audio": "48kHz 24-bit stereo",
      "size": "4.2GB"
    },
    "deliverables": {
      "videoFormats": [
        {
          "platform": "YouTube",
          "filename": "episode_01_youtube_1080p.mp4",
          "specifications": {
            "resolution": "1920x1080",
            "aspectRatio": "16:9",
            "codec": "H.264",
            "bitrate": "8 Mbps",
            "audio": "AAC 128kbps",
            "duration": "8:24"
          },
          "size": "485MB"
        },
        {
          "platform": "TikTok",
          "filename": "episode_01_tiktok_1080p.mp4",
          "specifications": {
            "resolution": "1080x1920",
            "aspectRatio": "9:16",
            "codec": "H.264",
            "bitrate": "6 Mbps",
            "audio": "AAC 128kbps",
            "duration": "8:24"
          },
          "size": "365MB",
          "notes": "Reframed from master"
        },
        {
          "platform": "Instagram Reels",
          "filename": "episode_01_instagram_1080p.mp4",
          "specifications": {
            "resolution": "1080x1920",
            "aspectRatio": "9:16",
            "codec": "H.264",
            "bitrate": "5 Mbps",
            "maxFileSize": "100MB",
            "audio": "AAC 128kbps"
          },
          "size": "98MB",
          "notes": "Compressed for platform limit"
        }
      ],
      "imageAssets": [
        {
          "type": "thumbnail_youtube",
          "filename": "thumbnail_youtube_1280x720.jpg",
          "dimensions": "1280x720",
          "format": "JPG",
          "size": "180KB"
        },
        {
          "type": "cover_tiktok",
          "filename": "cover_tiktok_1080x1920.jpg",
          "dimensions": "1080x1920",
          "format": "JPG",
          "size": "220KB"
        },
        {
          "type": "poster",
          "filename": "poster_1920x1080.jpg",
          "dimensions": "1920x1080",
          "format": "JPG",
          "size": "450KB"
        }
      ],
      "textAssets": [
        {
          "type": "subtitles_english",
          "filename": "episode_01_en.srt",
          "format": "SRT",
          "language": "English",
          "encoding": "UTF-8"
        },
        {
          "type": "subtitles_spanish",
          "filename": "episode_01_es.srt",
          "format": "SRT",
          "language": "Spanish",
          "encoding": "UTF-8"
        },
        {
          "type": "metadata",
          "filename": "episode_01_metadata.json",
          "format": "JSON",
          "includes": ["title", "synopsis", "tags", "credits"]
        }
      ]
    },
    "qualityControl": {
      "videoChecked": true,
      "audioSynced": true,
      "subtitlesVerified": true,
      "thumbnailsReviewed": true,
      "metadataComplete": true
    },
    "delivery": {
      "method": "cloud_storage",
      "location": "/exports/episode_01/",
      "totalSize": "1.2GB",
      "files": 12
    }
  }
}
```

## Error Handling

- Returns basic export if specs unclear
- Flags format incompatibilities
- Warns about size limits
- Suggests optimizations
