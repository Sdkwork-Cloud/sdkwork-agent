---
name: add-subtitles
version: '1.0.0'
author: sdkwork.com
description: Generate subtitle files and timing from dialogue. Use for accessibility and international distribution.
category: post-production
license: Apache-2.0
compatibility: Works with subtitle systems
metadata:
  tags: subtitles captions accessibility timing
---

# Add Subtitles

## Purpose

Create subtitle files with accurate timing from dialogue, supporting multiple formats and languages for accessibility and distribution.

## When to Use

- Accessibility compliance
- International distribution
- Social media versions
- Deaf/hard-of-hearing access
- Language learning

## Inputs

- `dialogue` (array, required): Dialogue with timing
- `language` (string, optional): Target language (default: 'en')
- `format` (string, optional): 'srt' | 'vtt' | 'ass' (default: 'srt')

## Outputs

```json
{
  "subtitles": {
    "format": "srt",
    "language": "en",
    "entries": [
      {
        "index": 1,
        "start": "00:00:06,000",
        "end": "00:00:09,500",
        "text": "It's really you..."
      },
      {
        "index": 2,
        "start": "00:00:10,000",
        "end": "00:00:13,000",
        "text": "Emma... it's been a while."
      }
    ]
  },
  "specifications": {
    "maxCharsPerLine": 42,
    "maxLines": 2,
    "minDuration": "1s",
    "maxDuration": "7s",
    "readingSpeed": "15_chars_per_second"
  }
}
```

## Subtitle Formats

- **SRT**: SubRip Text (universal)
- **VTT**: WebVTT (web)
- **ASS**: Advanced SubStation (styled)
- **SCC**: Scenarist Closed Caption
- **STL**: EBU Subtitle

## Instructions

1. Extract dialogue timing
2. Break lines appropriately
3. Set entry duration
4. Ensure readability
5. Check reading speed
6. Format for target system
7. Validate timing
8. Export file

## Examples

### Example 1: Simple SRT

**Input:**

```
Dialogue: [
  {text: "It's really you...", start: 6.0, end: 9.5},
  {text: "Emma... it's been a while.", start: 10.0, end: 13.0}
]
```

**Output:**

```json
{
  "subtitleFile": {
    "format": "SRT",
    "filename": "episode_01_en.srt",
    "content": "1\n00:00:06,000 --> 00:00:09,500\nIt's really you...\n\n2\n00:00:10,000 --> 00:00:13,000\nEmma... it's been a while."
  },
  "entries": [
    {
      "index": 1,
      "startTime": "00:00:06,000",
      "endTime": "00:00:09,500",
      "duration": "3.5s",
      "text": "It's really you...",
      "lines": 1,
      "chars": 18,
      "readingSpeed": "5.1_chars_per_second"
    },
    {
      "index": 2,
      "startTime": "00:00:10,000",
      "endTime": "00:00:13,000",
      "duration": "3s",
      "text": "Emma... it's been a while.",
      "lines": 1,
      "chars": 26,
      "readingSpeed": "8.7_chars_per_second"
    }
  ],
  "compliance": {
    "maxCharsPerLine": 42,
    "maxLines": 2,
    "minDisplay": "1s",
    "maxDisplay": "7s",
    "readingSpeed": "15_cps_max",
    "status": "compliant"
  }
}
```

### Example 2: Styled ASS

**Input:**

```
Dialogue: Same as above
Format: ASS
Style: Dramatic
```

**Output:**

```json
{
  "subtitleFile": {
    "format": "ASS",
    "filename": "episode_01_styled.ass",
    "header": "[Script Info]...",
    "styles": {
      "Default": {
        "font": "Arial",
        "size": 24,
        "color": "#FFFFFF",
        "outline": "#000000",
        "alignment": "bottom_center"
      },
      "Emphasis": {
        "font": "Arial",
        "size": 26,
        "color": "#FFFF00",
        "bold": true
      }
    }
  }
}
```

## Error Handling

- Returns basic subtitles if timing unclear
- Flags reading speed issues
- Warns about line length
- Suggests text edits
