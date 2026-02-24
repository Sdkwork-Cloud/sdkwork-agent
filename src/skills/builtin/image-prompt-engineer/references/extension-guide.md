# Extension Guide: Adding New Platforms

This guide explains how to extend the image-prompt-engineer skill to support new AI image generation platforms.

## Quick Start: Add a New Platform

**NO NEED TO MODIFY SKILL.md** - Just create one file!

### Step 1: Create Platform Reference File

Create a new file in `references/`:
```
references/platform-{platform-name}.md
```

### Step 2: Add Detection Keywords

At the TOP of your new file, add a comment with detection keywords:

```markdown
<!--
DETECTION_KEYWORDS: "myplatform", "mp", "my platform"
-->
```

That's it! The system will automatically detect the platform from user input.

---

## Platform Reference File Template

Use this template for `references/platform-{name}.md`:

```markdown
<!--
DETECTION_KEYWORDS: "yourplatform", "yp", "shortname"
-->

# {Platform Name} Platform Guide

## Overview

**Best For:** What this platform excels at
**Strengths:** Key advantages
**Type:** Image / Video / Both

## Prompt Structure

### Basic Syntax
```
[Subject], [Details], [Environment], [Style], [Quality]
```

## Key Rules

- Rule 1
- Rule 2
- Rule 3

## Parameters

| Parameter | Description | Values |
|-----------|-------------|--------|
| `--param` | What it does | value1, value2 |

## Negative Prompts

Common negative prompts for this platform:
```
text, watermark, blurry
```

## Best Practices

### Do
- Best practice 1
- Best practice 2

### Don't
- Bad practice 1
- Bad practice 2

## Example Prompt

```
Your example prompt here
--parameters
```
```

---

## Example: Adding "Stable Diffusion"

### 1. Create File

`references/platform-stable-diffusion.md`

```markdown
<!--
DETECTION_KEYWORDS: "stable diffusion", "sd", "stable"
-->

# Stable Diffusion Platform Guide

## Overview

**Best For:** Fine-grained control, custom models, open source flexibility
**Strengths:** Highly customizable, community models, full control
**Type:** Image

## Prompt Structure

### Basic Syntax
```
[Subject], [Details], [Environment], [Style], [Quality]
```

## Key Rules

- Use descriptive natural language
- Be specific about styles and artists
- Weight keywords with `(word:1.2)` syntax

## Parameters

| Parameter | Description |
|-----------|-------------|
| CFG Scale | How closely to follow prompt (7-12 default) |
| Steps | Sampling steps (20-50) |
| Sampler | Euler a, DPM++ 2M Karras, etc. |

## Negative Prompts

```
text, watermark, blurry, low quality, deformed, bad anatomy
```

## Best Practices

### Do
- Use artist references
- Specify art style clearly
- Use quality boosters at end

### Don't
- Be too vague
- Contradict yourself
- Overload with too many concepts

## Example Prompt

```
A serene Japanese garden with cherry blossoms, koi pond, wooden bridge, misty morning, soft lighting, in the style of Studio Ghibli, highly detailed, 8K
Negative prompt: text, watermark, blurry, modern elements
```
```

That's all! The system will automatically detect "stable diffusion" or "sd" in user input and load this file.

---

## Supported Platforms (Current)

| Platform | File |
|----------|------|
| Midjourney | `references/platform-midjourney.md` |
| Jimeng | `references/platform-jimeng.md` |
| NanoBanana | `references/platform-nano-banana.md` |
| Kling | `references/platform-kling.md` |

---

## Output Format Consistency

All platforms MUST follow the same JSON output structure:

```json
{
  "platforms": ["platform-name"],
  "prompts": {
    "platform-name": {
      "type": "image",
      "prompt": "optimized prompt",
      "style": "detected-style",
      "parameters": "--params",
      "negative": "what to exclude"
    }
  }
}
```

See `output-examples.md` for 12 complete examples.

---

## Quality Checklist for New Platforms

- [ ] Detection keywords in HTML comment at top
- [ ] Prompt structure clearly defined
- [ ] Negative prompt examples provided
- [ ] Common use cases documented
- [ ] Best practices listed
- [ ] Example prompt included
