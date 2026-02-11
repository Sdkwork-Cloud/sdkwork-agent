---
name: normalize-script
description: Normalize and standardize script format, structure, and formatting. Use to ensure scripts follow industry standards and are ready for production.
license: Apache-2.0
compatibility: Works with any script format
metadata:
  version: '1.0.0'
  author: sdkwork.com
  category: script
  tags: normalize format standardize structure cleanup
---

# Normalize Script

## Purpose

Standardize script format, structure, and presentation to ensure consistency and industry compliance.

## When to Use

- Receiving scripts in various formats
- Preparing scripts for production
- Converting between script formats
- Cleaning up generated or imported scripts
- Standardizing team submissions

## Inputs

- `script` (string, required): Raw script content
- `format` (string, optional): Target format (screenplay/teleplay/short-film)
- `options` (object, optional):
  - `sceneNumbers` (boolean): Add scene numbering
  - `pageNumbers` (boolean): Add page numbers
  - `characterList` (boolean): Generate character list

## Outputs

```json
{
  "normalizedScript": "Standardized script text...",
  "format": "screenplay",
  "statistics": {
    "scenes": 8,
    "characters": 3,
    "dialogueLines": 45,
    "actionLines": 23,
    "estimatedDuration": "4.5_minutes"
  },
  "structure": {
    "acts": [
      {
        "number": 1,
        "scenes": [1, 2, 3],
        "pages": "1-2"
      }
    ]
  },
  "characters": [
    {
      "name": "ALEX",
      "speakingLines": 20,
      "firstAppearance": "Scene 1"
    }
  ],
  "warnings": ["Scene 5: Long action paragraph (8 lines)"]
}
```

## Script Format Standards

### Screenplay Format

- 12pt Courier font
- 1.5 inch left margin
- 1 inch right margin
- Character names: ALL CAPS, centered
- Dialogue: indented 2.5 inches
- Action: left-aligned, full width
- Scene headings: ALL CAPS, left-aligned

### Short Film Format

- Simplified scene headings
- Streamlined action lines
- Focus on visual storytelling
- Minimal parentheticals

## Instructions

1. Parse input script structure
2. Identify scenes, characters, and dialogue
3. Apply standard formatting rules
4. Fix common formatting errors:
   - Inconsistent character names
   - Missing scene headings
   - Improper spacing
   - Mixed formats
5. Add optional elements (numbering, lists)
6. Calculate statistics
7. Generate warnings for issues

## Examples

### Example 1: Cleanup Generated Script

**Input:**

```
Scene 1 - Coffee Shop

Alex walks in and sees Jordan.

Alex: Hey, long time no see.

Jordan: Yeah, it's been what, five years?

Alex: About that. You look good.
```

**Output:**

```
INT. COFFEE SHOP - DAY

Alex (30s, professional) enters the bustling coffee shop.
He freezes when he sees JORDAN (30s, artistic) behind the counter.

                    ALEX
          Hey. Long time no see.

                    JORDAN
          Yeah. It's been... what, five
          years?

                    ALEX
          About that. You look good.
```

### Example 2: Format Conversion

**Input:** (Teleplay format)

```
TEASER

FADE IN:

INT. APARTMENT - NIGHT

Sarah enters...
```

**Output:** (Short film format)

```
FADE IN:

INT. APARTMENT - NIGHT

Sarah (28) enters her dark apartment...
```

## Common Issues Fixed

| Issue                | Fix Applied                    |
| -------------------- | ------------------------------ |
| Inconsistent spacing | Standardized to single spacing |
| Missing sluglines    | Added proper scene headings    |
| Mixed case names     | Converted to ALL CAPS          |
| Overly long action   | Broken into paragraphs         |
| Unclear transitions  | Added standard transitions     |
