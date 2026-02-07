---
name: translate-subtitles
version: '1.0.0'
author: sdkwork.com
description: Translate subtitle files to target languages while preserving timing. Use for international distribution.
category: post-production
license: Apache-2.0
compatibility: Works with subtitle translation systems
metadata:
  tags: subtitles translation localization language
---

# Translate Subtitles

## Purpose

Translate subtitle content to target languages while preserving timing, line breaks, and reading speed requirements.

## When to Use

- International distribution
- Multi-language releases
- Localization
- Global accessibility
- Regional markets

## Inputs

- `subtitles` (object, required): Source subtitle file
- `targetLanguage` (string, required): Language code
- `preserveTiming` (boolean, optional): Keep original timing (default: true)

## Outputs

```json
{
  "translation": {
    "sourceLanguage": "en",
    "targetLanguage": "es",
    "entries": [
      {
        "index": 1,
        "start": "00:00:06,000",
        "end": "00:00:09,500",
        "original": "It's really you...",
        "translated": "Eres tú de verdad...",
        "lines": 1,
        "chars": 21
      }
    ]
  },
  "adaptations": [
    {
      "type": "cultural_reference",
      "original": "coffee shop",
      "adapted": "cafetería",
      "reason": "regional_usage"
    }
  ]
}
```

## Translation Considerations

- **Length**: Translated text may be longer
- **Reading speed**: Adjust timing if needed
- **Cultural references**: Adapt appropriately
- **Line breaks**: Reformat for readability
- **Idioms**: Find equivalent expressions

## Instructions

1. Parse source subtitles
2. Translate content
3. Check text length
4. Adjust line breaks
5. Verify reading speed
6. Adapt cultural references
7. Maintain timing
8. Export translated file

## Examples

### Example 1: Spanish Translation

**Input:**

```
Source: English subtitles
Target: Spanish (es)
```

**Output:**

```json
{
  "translation": {
    "source": "en",
    "target": "es",
    "metadata": {
      "translator": "Professional localization",
      "date": "2024-01-29",
      "reviewStatus": "pending"
    },
    "entries": [
      {
        "index": 1,
        "timing": {
          "start": "00:00:06,000",
          "end": "00:00:09,500",
          "preserved": true
        },
        "original": {
          "text": "It's really you...",
          "chars": 18,
          "readingSpeed": "5.1_cps"
        },
        "translated": {
          "text": "Eres tú de verdad...",
          "chars": 20,
          "readingSpeed": "5.7_cps",
          "lines": 1
        },
        "quality": {
          "lengthRatio": 1.11,
          "speedChange": "+0.6_cps",
          "status": "acceptable"
        }
      },
      {
        "index": 2,
        "original": "Emma... it's been a while.",
        "translated": "Emma... ha pasado tiempo.",
        "notes": "Shortened to fit timing"
      }
    ]
  },
  "adaptations": [
    {
      "type": "idiom",
      "original": "It's been a while",
      "translated": "Ha pasado tiempo",
      "alternative": "Hace tiempo que no nos vemos",
      "chosen": "shorter_for_timing"
    }
  ],
  "technical": {
    "maxLengthExceeded": 0,
    "timingAdjustments": 0,
    "readingSpeedIssues": 0,
    "compliance": "full"
  }
}
```

## Error Handling

- Preserves timing by default
- Flags length issues
- Warns about reading speed
- Suggests text shortening
