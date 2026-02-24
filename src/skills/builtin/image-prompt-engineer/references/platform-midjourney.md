<!--
DETECTION_KEYWORDS: "midjourney", "mj", "--ar"
-->

# Midjourney Platform Guide

Complete guide for optimizing prompts for Midjourney AI image generation.

## Overview

**Best For:** High artistic quality, complex compositions, stylized images, detailed illustrations
**Strengths:** Exceptional aesthetic sense, understands artistic styles, excellent composition
**Version:** 6.1 (latest as of 2024)

## Prompt Structure

### Basic Syntax
```
[Subject], [Description], [Environment], [Lighting], [Style], [Quality] --parameters
```

### 6-Tier Architecture for Midjourney

**Tier 1 - Subject:**
```
Majestic white tiger with piercing blue eyes, powerful muscular build,
frozen breath visible in cold air, alert predatory stance
```

**Tier 2 - Environment:**
```
Snow-covered Siberian forest at twilight, ancient pine trees heavy with snow,
frozen lake in background, aurora borealis in dark purple sky
```

**Tier 3 - Lighting:**
```
Dramatic rim lighting from aurora above, cool blue key light on fur,
warm reflections from ice below, strong contrast between light and shadow
```

**Tier 4 - Camera:**
```
Eye-level shot, 85mm portrait lens, shallow depth of field f/1.8,
sharp focus on eyes, soft bokeh background, rule of thirds composition
```

**Tier 5 - Style:**
```
Hyper-realistic wildlife photography, National Geographic style,
cinematic color grading, cool winter palette with warm accents
```

**Tier 6 - Quality:**
```
8K resolution, intricate fur texture, photorealistic, 
award-winning wildlife photograph, masterful composition
```

**Complete Prompt:**
```
Majestic white tiger with piercing blue eyes, powerful muscular build,
frozen breath visible in cold air, alert predatory stance,
snow-covered Siberian forest at twilight, ancient pine trees heavy with snow,
frozen lake in background, aurora borealis in dark purple sky,
dramatic rim lighting from aurora above, cool blue key light on fur,
warm reflections from ice below, strong contrast between light and shadow,
eye-level shot, 85mm portrait lens, shallow depth of field f/1.8,
sharp focus on eyes, soft bokeh background, rule of thirds composition,
hyper-realistic wildlife photography, National Geographic style,
cinematic color grading, cool winter palette with warm accents,
8K resolution, intricate fur texture, photorealistic,
award-winning wildlife photograph, masterful composition
--ar 3:4 --v 6.1 --s 250 --q 2
```

## Parameters Reference

### Aspect Ratio (--ar)
Controls output dimensions.

| Ratio | Use Case |
|-------|----------|
| 1:1 | Square (default) |
| 16:9 | Landscape, widescreen |
| 9:16 | Portrait, mobile |
| 21:9 | Cinematic widescreen |
| 3:4 | Portrait photography |
| 4:3 | Classic photography |
| 2:3 | Tall portrait |
| 5:4 | Large format photo |

**Examples:**
```
--ar 16:9  (Landscape)
--ar 9:16  (Portrait)
--ar 21:9  (Cinematic)
```

### Version (--v)
Midjourney model version.

| Version | Characteristics |
|---------|----------------|
| 6.1 | Latest, best coherence, best aesthetics |
| 6.0 | Previous version, still excellent |
| 5.2 | Legacy, different aesthetic |
| niji 6 | Anime/cartoon specialized |

**Recommendation:** Use `--v 6.1` for most cases

### Stylize (--s)
Controls aesthetic strength (0-1000).

| Value | Effect |
|-------|--------|
| 0-50 | Very literal, less artistic |
| 100-250 | Balanced (default 100) |
| 250-500 | Strong artistic interpretation |
| 500-750 | Very stylized |
| 750-1000 | Maximum artistic interpretation |

**By Content Type:**
- Photorealistic: `--s 100-250`
- Artistic: `--s 500-750`
- Abstract: `--s 750-1000`

### Chaos (--c)
Controls variation in results (0-100).

| Value | Effect |
|-------|--------|
| 0 | Consistent, predictable results |
| 25 | Moderate variation |
| 50 | High variation |
| 100 | Maximum randomness |

**Use Cases:**
- Concept exploration: `--c 25-50`
- Consistent character: `--c 0`
- Creative ideas: `--c 25`

### Quality (--q)
Rendering quality time (0.25 to 2).

| Value | Effect |
|-------|--------|
| 0.25 | Fast, lower quality |
| 0.5 | Quick drafts |
| 1 | Standard quality |
| 2 | Maximum quality (2x GPU time) |

**Recommendation:** Use `--q 2` for final images, `--q 0.5` for exploration

### Image Weight (--iw)
For image prompts, controls influence of reference image (0-2).

| Value | Effect |
|-------|--------|
| 0.25 | Minimal image influence |
| 0.5 | Moderate influence |
| 1 | Standard influence |
| 2 | Strong image influence |

**Syntax:**
```
[image URL] [prompt] --iw 1.5
```

### No (--no)
Negative prompting (what to exclude).

**Syntax:**
```
--no text, watermark, signature, blurry, deformed
```

**Common Negative Prompts:**
```
--no text, watermark, signature, blurry, low quality, deformed, 
ugly, bad anatomy, extra limbs, missing fingers, cropped
```

### Style (--style)
Override default aesthetic.

| Value | Effect |
|-------|--------|
| raw | Less Midjourney aesthetic, more literal |
| cute | Niji 6 only - cute style |
| scenic | Niji 6 only - scenic style |

### Tile (--tile)
Creates seamless repeating patterns.

**Use Cases:**
- Textures
- Wallpapers
- Fabrics
- Backgrounds

### Repeat (--r)
Runs job multiple times (1-40).

**Use Case:** Generate many variations quickly

## Advanced Features

### Image Prompting
Use images as inspiration or reference.

**Basic:**
```
[image URL] [text prompt]
```

**With Weight:**
```
[image URL] [text prompt] --iw 1.5
```

**Multiple Images:**
```
[image1 URL] [image2 URL] [text prompt] --iw 1
```

### Multi-Prompts
Separate concepts with :: to assign different weights.

**Syntax:**
```
hot::2 dog  (hot is twice as important)
```

**Example:**
```
cup cake::2 illustration::1  (emphasizes cup more than cake)
```

### Permutations
Generate multiple variations efficiently.

**Syntax:**
```
{red, blue, green} car  (generates 3 prompts)
```

**Example:**
```
a {photograph, painting, sketch} of a cat --ar 16:9
(Generates 3 separate jobs)
```

## Parameter Combinations by Use Case

### Portrait Photography
```
--ar 2:3 --v 6.1 --s 250 --q 2
--no blurry, distorted face, bad anatomy
```

### Landscape Photography
```
--ar 16:9 --v 6.1 --s 100 --q 2
--no watermark, text
```

### Cinematic Scene
```
--ar 21:9 --v 6.1 --s 500 --c 10
--no text, modern elements
```

### Concept Art
```
--ar 16:9 --v 6.1 --s 750 --c 25
--no blurry, low detail
```

### Product Photography
```
--ar 1:1 --v 6.1 --s 100 --q 2 --style raw
--no text, watermark, background clutter
```

### Abstract Art
```
--ar 1:1 --v 6.1 --s 1000 --c 50
```

### Character Design
```
--ar 2:3 --v 6.1 --s 500 --c 0
--no blurry, deformed hands, extra limbs
```

## Best Practices

### 1. Prompt Length
- **Sweet spot:** 50-150 words
- **Too short:** Lacks detail and direction
- **Too long:** May confuse the model (max ~600 characters effective)

### 2. Word Order
- Most important concepts first
- Subject at the beginning
- Style/quality at the end

### 3. Specificity
- Use specific nouns: "golden retriever" not "dog"
- Use specific styles: "Art Nouveau" not "artistic"
- Use specific artists: "in the style of James Jean" not "painterly"

### 4. Avoid
- Vague terms: "beautiful", "nice", "good"
- Contradictory descriptions
- Overly complex sentences
- Copyrighted character names (use descriptions instead)

### 5. Do Use
- Clear subject definitions
- Specific lighting descriptions
- Camera/lens specifications
- Art style references
- Quality boosters at end

## Common Patterns

### Photography Prompt Pattern
```
[Subject] in [environment], [lighting], [camera specs], 
[photography style], [quality] --ar [ratio] --v 6.1
```

### Illustration Prompt Pattern
```
[Subject], [description], [art style] by [artist reference], 
[color palette], [composition], [quality] --ar [ratio] --s [value]
```

### Character Prompt Pattern
```
[Character type], [physical description], [clothing], [expression], 
[pose], [background], [lighting], [art style], [quality] 
--ar 2:3 --c 0
```

### Architecture Prompt Pattern
```
[Building type], [architectural style], [materials], [setting], 
[time of day], [lighting], [camera angle], [quality] 
--ar 16:9 --s 100
```

## Troubleshooting

### Common Issues and Solutions
