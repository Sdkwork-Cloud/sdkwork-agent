---
name: image-prompt-optimizer
description: Professional prompt optimizer for AI image generation models. Creates high-quality, detailed prompts optimized for DALL-E 3, Midjourney v6, Stable Diffusion XL, Ideogram, Firefly, and other leading image generators. Transforms basic concepts into production-ready prompts with proper technical specifications.
license: MIT
metadata:
  author: sdkwork-browser-agent
  version: '2.0.0'
  category: ai-optimization
  tags: image generation prompt dalle midjourney sdxl ideogram firefly professional optimization
compatibility: Optimized for DALL-E 3, Midjourney v6, Stable Diffusion XL, Ideogram, Adobe Firefly, and major image generation models
---

# Professional Image Prompt Optimizer

Creates production-quality prompts for AI image generation with technical precision and artistic expertise.

## When to Use

- Creating images for professional use (marketing, design, content)
- Need specific artistic style or technical quality
- Optimizing for particular AI model capabilities
- Generating consistent character/scene series
- Creating high-resolution commercial artwork
- Achieving photorealistic or specific aesthetic results

## Parameters

### Core Parameters

- `description` (string, required): Core subject and scene description
- `style` (string, optional): Primary artistic style
  - "photorealistic", "cinematic", "digital-art", "oil-painting"
  - "anime", "manga", "3d-render", "concept-art"
  - "watercolor", "sketch", "vector", "minimalist"
- `quality` (string, optional): Production quality level
  - "draft" - Quick concept exploration
  - "standard" - Balanced quality (default)
  - "high" - Professional production
  - "masterpiece" - Maximum detail and refinement

### Technical Parameters

- `aspectRatio` (string, optional): Image proportions
  - "1:1" - Square (social media)
  - "16:9" - Widescreen (presentations, video)
  - "9:16" - Portrait (mobile, stories)
  - "4:3" - Classic (documents)
  - "21:9" - Cinematic (ultra-wide)
  - "3:2" - Photo standard
- `resolution` (string, optional): Detail level hint
  - "4k", "8k", "16k", "32k"

### Artistic Parameters

- `lighting` (string, optional): Lighting setup
  - "natural", "studio", "dramatic", "soft", "neon"
  - "golden-hour", "blue-hour", "magic-hour"
  - "rim-light", "backlit", "volumetric"
- `mood` (string, optional): Emotional atmosphere
  - "epic", "serene", "mysterious", "cheerful", "melancholic"
  - "dramatic", "whimsical", "nostalgic", "futuristic"
- `composition` (string, optional): Framing and layout
  - "close-up", "medium-shot", "wide-shot", "extreme-close-up"
  - "rule-of-thirds", "centered", "symmetrical", "dynamic"
  - "aerial", "birdseye", "worms-eye", "eye-level"

### Model-Specific Parameters

- `targetModel` (string, optional): Optimize for specific model
  - "dalle3" - OpenAI DALL-E 3
  - "midjourney" - Midjourney v6
  - "sdxl" - Stable Diffusion XL
  - "ideogram" - Ideogram 2.0
  - "firefly" - Adobe Firefly
  - "flux" - Black Forest Labs Flux
  - "imagen3" - Google Imagen 3
- `negativePrompt` (string, optional): Elements to exclude

### Advanced Parameters

- `camera` (string, optional): Camera/lens simulation
  - "dslr", "mirrorless", "large-format"
  - "50mm", "35mm", "85mm", "24mm", "telephoto"
  - "macro", "fisheye", "tilt-shift"
- `colorGrading` (string, optional): Color treatment
  - "vibrant", "muted", "monochrome", "sepia"
  - "teal-orange", "film-noir", "cyberpunk"
- `texture` (string, optional): Surface qualities
  - "smooth", "rough", "glossy", "matte", "metallic"

## Examples

### Professional Product Photography

```yaml
skill: image-prompt-optimizer
parameters:
  description: 'Luxury wristwatch on marble surface'
  style: 'photorealistic'
  quality: 'masterpiece'
  lighting: 'studio'
  camera: 'macro'
  aspectRatio: '1:1'
  targetModel: 'dalle3'
```

**Output:**

```
Ultra-high-resolution product photography of a luxury Swiss wristwatch with intricate mechanical movement visible through sapphire crystal caseback, placed on polished white Calacatta marble surface with subtle grey veining, professional studio lighting setup with softbox creating elegant highlights on polished stainless steel case and leather strap, macro lens perspective at f/2.8 for shallow depth of field, watch positioned at 10:10 showing detailed dial with applied indices and dauphine hands, subtle reflection on marble, neutral grey gradient background, commercial advertising quality, photorealistic 8K resolution, sharp focus on watch face, professional color grading with slight warmth
```

### Cinematic Character Portrait

```yaml
skill: image-prompt-optimizer
parameters:
  description: 'Warrior princess in mystical forest'
  style: 'cinematic'
  mood: 'epic'
  lighting: 'magic-hour'
  composition: 'medium-shot'
  aspectRatio: '16:9'
  targetModel: 'midjourney'
```

**Output:**

```
Cinematic medium shot of an ethereal warrior princess standing in an ancient mystical forest during magic hour, golden sunlight filtering through massive twisted oak trees creating volumetric god rays, she wears intricately detailed elven armor with Celtic knot engravings and flowing emerald cape, long silver hair braided with small flowers, holding a glowing crystal sword, shallow depth of field with bokeh background, rule of thirds composition, film grain texture, anamorphic lens flares, color grading with teal shadows and warm highlights, epic fantasy cinematography style, 8K resolution, dramatic lighting, highly detailed textures on armor and environment, professional movie still quality
```

### Architectural Visualization

```yaml
skill: image-prompt-optimizer
parameters:
  description: 'Modern glass house on cliff overlooking ocean'
  style: '3d-render'
  quality: 'high'
  lighting: 'golden-hour'
  composition: 'wide-shot'
  aspectRatio: '21:9'
  camera: '24mm'
  targetModel: 'sdxl'
```

**Output:**

```
Architectural visualization of a stunning modern minimalist glass house cantilevered over a dramatic ocean cliff, floor-to-ceiling transparent walls reflecting golden hour sunset, infinity pool merging with horizon, warm interior lighting visible through glass, wide-angle 24mm lens perspective emphasizing dramatic architecture and vast ocean view, ultra-wide cinematic 21:9 composition, photorealistic 3D render with ray-traced reflections and global illumination, detailed landscape with wind-swept coastal vegetation, crashing waves on rocks below, volumetric sunset atmosphere, professional architectural photography style, 8K resolution, sharp focus throughout, neutral density filter for balanced exposure
```

### Anime Style Illustration

```yaml
skill: image-prompt-optimizer
parameters:
  description: 'Cyberpunk girl in neon city'
  style: 'anime'
  mood: 'mysterious'
  lighting: 'neon'
  composition: 'close-up'
  aspectRatio: '9:16'
  targetModel: 'midjourney'
```

**Output:**

```
Stunning anime-style close-up portrait of a cyberpunk girl with heterochromatic eyes glowing in neon light, short pink hair with holographic hair clips, futuristic street fashion with LED accents, standing in rain-soaked Tokyo alley with vibrant neon signs in Japanese characters reflecting in puddles, cyan and magenta color palette with high contrast, vertical 9:16 composition optimized for mobile, detailed cel-shaded art style with soft gradients, atmospheric perspective with bokeh lights in background, rain droplets on face and clothing, mysterious expression, professional anime illustration quality, sharp linework, vibrant colors, 4K resolution, trending on ArtStation
```

### Food Photography

```yaml
skill: image-prompt-optimizer
parameters:
  description: 'Gourmet burger with fries'
  style: 'photorealistic'
  quality: 'high'
  lighting: 'natural'
  composition: 'close-up'
  aspectRatio: '4:3'
  texture: 'glossy'
```

**Output:**

```
Mouth-watering food photography of a gourmet artisanal burger with thick juicy beef patty, melted aged cheddar cheese dripping down sides, crispy bacon strips, fresh lettuce, ripe tomato slice, and special sauce on toasted brioche bun with sesame seeds, served with golden crispy french fries in rustic metal basket, close-up 45-degree angle shot, natural window lighting from side creating appetizing highlights on glossy ingredients, shallow depth of field focusing on burger texture, wooden table surface with subtle grain, professional restaurant menu photography style, vibrant color saturation emphasizing freshness, 4K resolution, appetizing steam rising, editorial food photography quality
```

## Model-Specific Optimization

### DALL-E 3

- Natural language descriptions work best
- Handles complex scenes and relationships well
- Good at text in images
- Supports precise spatial descriptions

### Midjourney v6

- Artistic style keywords very effective
- Use `--ar` parameter for aspect ratios
- Version 6 excels at photorealism
- Stylize parameter controls artistic intensity

### Stable Diffusion XL

- Detailed prompts with weights work well
- Supports negative prompts effectively
- Good with specific artist references
- ControlNet compatible for precise control

### Ideogram 2.0

- Excellent text rendering in images
- Good for logos and typography
- Handles complex compositions
- Strong prompt adherence

### Adobe Firefly

- Commercial-safe training data
- Good for professional/business use
- Supports style references
- Integrated with Creative Cloud

### Flux (Black Forest Labs)

- High-quality photorealistic results
- Excellent prompt adherence
- Good for complex scenes
- Strong detail generation

## Technical Specifications

### Resolution Keywords

- "4K UHD" - 3840x2160
- "8K UHD" - 7680x4320
- "16K" - 15360x8640
- "32K" - 30720x17280

### Camera Settings

- "f/1.4", "f/2.8", "f/8" - Aperture for depth of field
- "ISO 100", "ISO 800" - Sensitivity
- "1/1000s", "1/60s" - Shutter speed

### Lens Types

- "50mm prime" - Standard perspective
- "35mm wide" - Environmental context
- "85mm portrait" - Compression and bokeh
- "24mm ultra-wide" - Dramatic perspective
- "100mm macro" - Extreme detail

## Best Practices

1. **Start with Subject**: Clear description of main subject
2. **Add Environment**: Context and setting details
3. **Specify Lighting**: Time of day, light sources, mood
4. **Include Style**: Artistic medium and technique
5. **Add Technical**: Camera, lens, quality modifiers
6. **Use Negative Prompts**: Exclude unwanted elements
7. **Reference Artists**: "in the style of [artist]" when appropriate
8. **Iterate**: Refine based on results

## Output Format

Returns a comprehensive prompt with:

- Subject description with details
- Environmental context
- Lighting specifications
- Camera and technical settings
- Style and artistic direction
- Quality boosters
- Model-specific optimizations

## Notes

- Prompts are tailored to target model strengths
- Balances detail with coherence
- Includes professional photography terminology
- Optimized for commercial/production use
- Supports iterative refinement workflow
