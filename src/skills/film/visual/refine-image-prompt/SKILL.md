---
name: refine-image-prompt
version: '1.0.0'
author: sdkwork.com
description: Refine and optimize image generation prompts for better results. Use to improve prompt quality and consistency.
category: visual
license: Apache-2.0
compatibility: Works with any AI image generator
metadata:
  tags: prompt optimization refinement improvement quality
---

# Refine Image Prompt

## Purpose

Analyze and refine image generation prompts to improve quality, consistency, and alignment with intended visual goals.

## When to Use

- Improving initial prompts
- Fixing inconsistent results
- Optimizing for specific platforms
- Standardizing prompt style
- Troubleshooting generation issues

## Inputs

- `prompt` (string, required): Original prompt to refine
- `issues` (array, optional): Known problems to address
- `targetPlatform` (string, optional): 'midjourney' | 'dalle' | 'stable_diffusion' | 'general' (default: 'general')

## Outputs

```json
{
  "originalPrompt": "A coffee shop scene with people",
  "refinedPrompt": "Cinematic interior of cozy neighborhood coffee shop, warm afternoon light streaming through large windows, vintage wooden furniture, soft atmospheric lighting, 35mm film photography, shallow depth of field, warm brown and cream color palette, professional cinematography, inviting atmosphere",
  "improvements": [
    "Added lighting specification",
    "Specified camera and lens",
    "Included color palette",
    "Added mood descriptors",
    "Enhanced detail level"
  ],
  "negativePrompt": "harsh lighting, cold sterile environment, modern minimalist, empty, dark shadows, wide angle distortion",
  "variations": [
    "Close-up detail version...",
    "Wide establishing version...",
    "Atmospheric mood version..."
  ],
  "tips": [
    "Use specific camera lenses for cinematic look",
    "Include lighting direction and quality",
    "Specify color temperature",
    "Add film stock references"
  ]
}
```

## Refinement Strategies

- **Add specificity**: Details about lighting, camera, style
- **Remove ambiguity**: Clarify vague terms
- **Structure properly**: Organize by subject, setting, style
- **Include technical specs**: Lens, aperture, film stock
- **Add mood descriptors**: Emotional tone and atmosphere

## Instructions

1. Analyze original prompt weaknesses
2. Identify missing elements
3. Add specific technical details
4. Structure for clarity
5. Create negative prompts
6. Generate variations
7. Provide optimization tips
8. Test and iterate

## Examples

### Example 1: Vague to Specific

**Input:**

```
Original: "A romantic scene in a restaurant"
Issues: ["too vague", "no lighting", "no style"]
```

**Output:**

```json
{
  "originalPrompt": "A romantic scene in a restaurant",
  "refinedPrompt": "Intimate dinner scene in upscale restaurant, soft candlelight and warm ambient lighting, couple at corner table, shallow depth of field, 50mm lens, bokeh from background lights, romantic atmosphere, warm golden tones, fine dining setting, cinematic film look, professional photography",
  "improvements": [
    "Specified lighting: candlelight and ambient",
    "Added camera: 50mm lens",
    "Included depth of field: shallow with bokeh",
    "Added atmosphere: romantic, intimate",
    "Specified color: warm golden tones",
    "Added style: cinematic film look"
  ],
  "negativePrompt": "harsh overhead lighting, fluorescent, empty restaurant, wide angle distortion, cold colors, bright flash",
  "variations": [
    {
      "type": "close_up",
      "prompt": "Close-up of couple holding hands across restaurant table, candlelight illuminating faces, shallow depth of field, 85mm lens, romantic soft focus, warm golden light, intimate moment"
    },
    {
      "type": "wide",
      "prompt": "Wide shot of elegant restaurant interior, couple at window table, city lights visible outside, warm ambient lighting, 35mm lens, atmospheric, romantic setting"
    }
  ],
  "optimizationTips": [
    "Always specify lighting quality and direction",
    "Include lens choice for depth of field control",
    "Add color temperature for mood",
    "Specify atmosphere and emotional tone",
    "Use film stock references for texture"
  ]
}
```

### Example 2: Technical Enhancement

**Input:**

```
Original: "Person walking in the rain at night"
Target: "midjourney"
```

**Output:**

```json
{
  "originalPrompt": "Person walking in the rain at night",
  "refinedPrompt": "Cinematic night scene, solitary figure walking through rain-soaked city street, neon signs reflecting in wet pavement, atmospheric fog, film noir aesthetic, 35mm anamorphic lens, high contrast lighting, blue and orange color grading, moody atmosphere, shallow depth of field, rain droplets visible, professional cinematography --ar 2.35:1 --style raw --v 6",
  "improvements": [
    "Added cinematic framing: 2.35:1 ratio",
    "Specified lens: 35mm anamorphic",
    "Enhanced lighting: high contrast, neon reflections",
    "Added atmosphere: fog, rain droplets",
    "Included color grading: blue and orange",
    "Added Midjourney parameters for quality"
  ],
  "negativePrompt": "daylight, sunny, clear weather, bright colors, modern clean look, wide angle distortion",
  "platformSpecific": {
    "midjourney": "Added --ar 2.35:1 --style raw --v 6",
    "dalle": "Focus on descriptive lighting and atmosphere",
    "stable_diffusion": "Include specific model trigger words"
  },
  "technicalSpecs": {
    "aspectRatio": "2.35:1_cinematic",
    "lens": "35mm_anamorphic",
    "lighting": "high_contrast_neon",
    "color": "teal_orange_grading",
    "atmosphere": "fog_rain_particles"
  }
}
```

### Example 3: Style Consistency

**Input:**

```
Original: "A scene from a movie"
Issues: ["inconsistent style", "no genre indicators"]
```

**Output:**

```json
{
  "originalPrompt": "A scene from a movie",
  "refinedPrompt": "Period drama scene, 1940s living room, elegant woman in vintage dress by window, soft natural light, muted color palette, 50mm vintage lens, shallow depth of field, film grain texture, warm sepia tones, classic Hollywood cinematography, nostalgic atmosphere",
  "improvements": [
    "Specified genre: period drama",
    "Added era: 1940s",
    "Described setting: living room",
    "Added costume detail: vintage dress",
    "Specified lens: 50mm vintage",
    "Added texture: film grain",
    "Defined palette: muted sepia tones"
  ],
  "styleGuidelines": {
    "genre": "period_drama",
    "era": "1940s",
    "cinematography": "classic_Hollywood",
    "color": "muted_sepia",
    "texture": "film_grain"
  },
  "consistencyChecks": [
    "All elements match 1940s era",
    "Color palette is cohesive",
    "Lighting matches period style",
    "Costume appropriate for setting"
  ]
}
```

## Error Handling

- Returns basic refinement if prompt too vague
- Flags platform-specific issues
- Warns about conflicting elements
- Suggests breaking into multiple prompts
