# Base Template

Universal starting point for any image generation prompt.

## Template Structure

```
[Subject], [Subject Details], [Subject State],
[Environment], [Time], [Atmosphere],
[Lighting Source], [Lighting Quality], [Shadows],
[Camera Angle], [Lens], [Depth of Field], [Composition],
[Art Style], [Medium], [Color Palette],
[Resolution], [Quality Boosters]
```

## Tier Breakdown

### Tier 1: Subject Definition
**Purpose:** Clearly establish the main subject

**Elements:**
- **Primary Subject:** What is the focus? (person, animal, object, scene)
- **Physical Details:** Appearance, attributes, features
- **State/Action:** What are they doing? Emotion, pose, activity
- **Relationships:** How do they relate to other elements?

**Example:**
```
Elderly craftsman, weathered hands with visible veins,
focused expression, carefully carving wooden sculpture
```

### Tier 2: Environment
**Purpose:** Set the spatial context

**Elements:**
- **Location:** Indoor/outdoor, specific place type
- **Time:** Time of day, season, era
- **Atmosphere:** Weather, mood, air quality
- **Background:** Depth layers, surrounding elements

**Example:**
```
Rustic woodworking workshop, late afternoon golden hour,
dust motes dancing in sunbeams, tools organized on walls,
wood shavings scattered on worn wooden floor
```

### Tier 3: Lighting
**Purpose:** Create photorealistic illumination

**Elements:**
- **Source:** Window light, sun, artificial, mixed
- **Quality:** Hard vs soft, direct vs diffused
- **Direction:** Front, side, back, top, bottom
- **Color Temperature:** Warm, cool, mixed
- **Shadows:** Direction, softness, color

**Example:**
```
Warm window light streaming from left side,
golden hour quality creating long soft shadows,
cool fill light from blue sky visible through window,
rim light outlining subject from behind
```

### Tier 4: Camera & Composition
**Purpose:** Apply photographic/cinematic techniques

**Elements:**
- **Angle:** Eye-level, low, high, bird's eye, worm's eye
- **Lens:** Focal length affects perspective and compression
- **Depth of Field:** Shallow (subject isolated) vs deep (all sharp)
- **Focus:** What's sharp? Bokeh quality?
- **Composition:** Rule of thirds, leading lines, framing

**Example:**
```
Eye-level shot, 50mm lens for natural perspective,
shallow depth of field f/2.8 isolating craftsman,
sharp focus on hands and face, creamy bokeh background,
rule of thirds with subject on left third
```

### Tier 5: Style & Medium
**Purpose:** Define aesthetic direction

**Elements:**
- **Art Style:** Photorealistic, painterly, stylized, abstract
- **Medium:** Photography, oil painting, watercolor, 3D render
- **Texture:** Surface qualities, material properties
- **Color Palette:** Dominant colors, mood, harmony
- **Mood/Emotion:** Atmosphere, feeling, narrative

**Example:**
```
Photorealistic style, documentary photography aesthetic,
warm earthy color palette with golden highlights,
contemplative and peaceful mood,
texture emphasis on wood grain and worn surfaces
```

### Tier 6: Quality
**Purpose:** Ensure technical excellence

**Elements:**
- **Resolution:** 8K, 4K, high resolution
- **Detail Level:** Intricate, detailed, fine textures
- **Rendering:** Photorealistic, octane render, unreal engine
- **Professional Quality:** Masterpiece, award-winning, professional

**Example:**
```
8K resolution, highly detailed, intricate textures,
photorealistic rendering, professional photography quality,
masterful composition and lighting
```

## Complete Example

**Input:** "A craftsman working in his workshop"

**Full Prompt:**
```
Elderly craftsman, weathered hands with visible veins and calluses,
focused intent expression, carefully carving intricate wooden sculpture,
rustic woodworking workshop, late afternoon golden hour sun,
dust motes dancing in warm sunbeams, tools organized on pegboard walls,
wood shavings scattered on worn wooden floor, vintage workbench cluttered,
warm window light streaming from left side creating long soft shadows,
cool fill light from blue sky visible through window,
gentle rim light outlining subject from behind,
eye-level documentary shot, 50mm lens for natural perspective,
shallow depth of field f/2.8 isolating craftsman from background,
sharp focus on hands and face, creamy bokeh background,
rule of thirds composition with subject on left third,
photorealistic documentary photography style,
warm earthy color palette with golden highlights and rich wood tones,
contemplative and peaceful mood conveying mastery and dedication,
8K resolution, highly detailed textures on skin and wood grain,
professional photography quality, masterful composition,
national geographic style
```

## Platform Parameters

### Midjourney
```
--ar 3:4 --v 6.1 --s 250 --q 2
--no text, watermark, blurry, deformed
```

### Kling
```
Duration: 5s
Motion: Subtle hand movements, dust particles floating
Camera: Slight push-in
```

### Jimeng
```
Style: Photorealistic
Resolution: High
Quality: Professional
```

### Nano Banana
```
Simplified: "Craftsman carving wood in sunlit workshop, detailed, photorealistic"
```

## Customization Guide

### For Different Subjects

**Portrait:**
- Emphasize Tier 1 (facial features, expression)
- Use portrait aspect ratio (2:3)
- Shallow depth of field

**Landscape:**
- Emphasize Tier 2 (environment, scale)
- Use landscape aspect ratio (16:9)
- Deep depth of field

**Product:**
- Emphasize Tier 1 (object details)
- Clean, controlled environment
- Professional lighting setup
- Square or product aspect ratio

**Architecture:**
- Emphasize Tier 2 and 4 (space and perspective)
- Use wide angle or tilt-shift
- Deep depth of field
- Geometric composition

### For Different Styles

**Photorealistic:**
- Specific camera and lens
- Natural lighting
- Quality boosters
- Photographic references

**Artistic:**
- Art movement references
- Painterly descriptions
- Stylized lighting
- Expressive composition

**Cinematic:**
- Wide aspect ratio
- Dramatic lighting
- Color grading references
- Movie-like composition

**Abstract:**
- Focus on shapes and colors
- Unusual perspectives
- Experimental techniques
- Emotional descriptions

## Physics Checklist

Before using this template, verify:

- [ ] Light source direction is consistent
- [ ] Shadows match the light source
- [ ] Scale relationships are believable
- [ ] Atmospheric perspective is applied if needed
- [ ] Material properties match the lighting
- [ ] Camera perspective is physically possible

## Common Enhancements

**For More Drama:**
- Add "dramatic", "cinematic", "moody"
- Use strong contrast lighting
- Add rim light or silhouette

**For More Detail:**
- Add specific texture descriptions
- Use macro lens specification
- Add "intricate", "detailed", "fine"

**For Better Composition:**
- Specify "rule of thirds"
- Add "leading lines"
- Use "symmetrical" or "asymmetrical"

**For Specific Mood:**
- Add emotional adjectives
- Specify color temperature
- Describe atmosphere

## Negative Prompts

**Universal:**
```
ugly, deformed, noisy, blurry, distorted, bad anatomy,
extra limbs, watermark, text, logo
```

**For This Style:**
```
cartoon, anime, illustration, painting, artificial
```

---

**Usage:** Fill in each tier with specific details relevant to your subject. Adjust parameters based on platform and desired output.
