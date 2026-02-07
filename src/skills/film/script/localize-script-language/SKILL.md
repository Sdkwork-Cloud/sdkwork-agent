---
name: localize-script-language
description: Adapt script for different languages, regions, and cultures while maintaining story integrity. Use for international distribution and localization.
license: Apache-2.0
compatibility: Requires cultural and linguistic knowledge
metadata:
  version: '1.0.0'
  author: sdkwork.com
  category: script
  tags: localize translate language culture region adaptation
---

# Localize Script Language

## Purpose

Adapt scripts for different languages, regions, and cultural contexts while preserving story essence.

## When to Use

- International distribution
- Multi-language productions
- Cultural adaptation
- Regional customization
- Platform-specific localization

## Inputs

- `script` (string, required): Original script
- `targetLocale` (string, required): Target language/region (e.g., "zh-CN", "es-MX", "ja-JP")
- `adaptationLevel` (string, optional): "translate" | "cultural" | "full"
- `constraints` (object, optional):
  - `preserveSetting` (boolean): Keep original location
  - `preserveNames` (boolean): Keep character names
  - `preserveReferences` (boolean): Keep cultural references

## Outputs

```json
{
  "localizedScript": "Adapted script in target language...",
  "locale": "zh-CN",
  "adaptations": {
    "language": "Simplified Chinese",
    "cultural": [
      {
        "type": "location",
        "original": "Coffee shop",
        "adapted": "茶馆 (Tea house)",
        "reason": "More culturally appropriate meeting place"
      },
      {
        "type": "dialogue",
        "original": "Hey, long time no see",
        "adapted": "好久不见",
        "notes": "Common Chinese greeting for reunions"
      },
      {
        "type": "reference",
        "original": "Thanksgiving dinner",
        "adapted": "春节团圆饭 (Spring Festival reunion dinner)",
        "reason": "Equivalent family gathering holiday"
      }
    ],
    "names": {
      "ALEX": "艾利克斯 (Ailikesi)",
      "JORDAN": "乔丹 (Qiaodan)"
    }
  },
  "warnings": ["Idiom 'break the ice' adapted to '打破沉默' - meaning preserved"],
  "statistics": {
    "translatedLines": 45,
    "culturalAdaptations": 8,
    "nameLocalizations": 2,
    "referenceChanges": 3
  }
}
```

## Adaptation Levels

### 1. Translation Only

- Direct translation of dialogue
- Keep all settings and references
- Minimal cultural changes
- Best for: Same cultural context, different language

### 2. Cultural Adaptation

- Translate dialogue naturally
- Adapt cultural references
- Modify settings if needed
- Keep core story identical
- Best for: Different cultural contexts

### 3. Full Localization

- Complete cultural transformation
- Change settings to local equivalents
- Adapt character behaviors
- Modify references and idioms
- Best for: Maximum local relevance

## Localization Elements

### Language

- Natural dialogue flow
- Appropriate register (formal/informal)
- Regional dialects if needed
- Subtitle-friendly phrasing

### Culture

- Holidays and celebrations
- Food and dining customs
- Social norms and etiquette
- Family structures
- Work culture

### Setting

- Location equivalents
- Architecture and environment
- Climate and seasons
- Urban vs. rural

### References

- Pop culture references
- Historical events
- Brand names
- Technology and media

## Instructions

1. **Analyze Original**
   - Identify cultural elements
   - Note idioms and references
   - Mark setting-specific details

2. **Language Translation**
   - Translate dialogue naturally
   - Maintain character voices
   - Preserve subtext and nuance

3. **Cultural Mapping**
   - Find equivalent concepts
   - Adapt or replace references
   - Modify settings if needed

4. **Name Handling**
   - Decide on localization strategy
   - Keep or translate names
   - Ensure pronounceability

5. **Review and Refine**
   - Check naturalness
   - Verify cultural accuracy
   - Ensure story integrity
   - Test with native speakers

## Examples

### Example 1: English to Chinese (Cultural)

**Original:**

```
INT. COFFEE SHOP - DAY

Alex enters Starbucks. He orders a Grande Americano.

                    ALEX
          Just a regular coffee. Black.

He sees Jordan behind the counter.

                    ALEX
          Jordan? Hey, long time no see!
```

**Localized (zh-CN):**

```
INT. 星巴克 - 白天

艾利克斯走进星巴克。他点了一杯大杯美式咖啡。

                    艾利克斯
          来杯普通的咖啡。黑咖啡。

他看到乔丹站在柜台后面。

                    艾利克斯
          乔丹？好久不见！

【注：保留星巴克品牌名，"long time no see"直译为"好久不见"，
这是中文里非常自然的表达】
```

### Example 2: Full Cultural Adaptation

**Original:**

```
They meet at a Thanksgiving dinner. Alex brings pumpkin pie.
```

**Localized (Japan):**

```
他们在新年会(お正月の集まり)上相遇。艾利克斯带来了年糕(お餅)。

【完全文化转换：感恩节→新年，南瓜派→年糕】
```

### Example 3: Idiom Adaptation

**Original:**

```
                    ALEX
          We really broke the ice, didn't we?
```

**Localized (Various):**

Spanish:

```
                    ALEX
          Realmente rompimos el hielo, ¿no?
```

French:

```
                    ALEX
          On a vraiment cassé la glace, hein ?
```

Korean:

```
                    ALEX
          우리 정말 어색함을 풀었네, 그치?
(Literal: We really dissolved the awkwardness, right?)
```

## Regional Variations

### Spanish

- es-ES (Spain): Formal, distinct idioms
- es-MX (Mexico): Different vocabulary
- es-AR (Argentina): Voseo form

### Chinese

- zh-CN (Mainland): Simplified, modern slang
- zh-TW (Taiwan): Traditional, different terms
- zh-HK (Hong Kong): Cantonese influence

### English

- en-US: American references
- en-GB: British spelling and terms
- en-AU: Australian expressions

## Common Adaptations

| Element      | Adaptation Strategy          |
| ------------ | ---------------------------- |
| Holidays     | Map to local equivalents     |
| Food         | Use familiar dishes          |
| Locations    | Keep or find equivalents     |
| Names        | Transliterate or localize    |
| Measurements | Convert to local units       |
| Currency     | Convert and contextualize    |
| Idioms       | Find equivalent expressions  |
| Humor        | Adapt to local sensibilities |
