# Video Prep - Basics
Fundamentals of generating images optimized for video conversion.

---

## Why This Matters

Images generated for video conversion need special considerations:

- Video AI needs clear subject boundaries
- Motion requires natural starting poses
- Lighting must be consistent for temporal coherence
- Complex backgrounds can cause artifacts
- Character design consistency across views is critical

---

## Specialized Content Types for Video Production

### 1. Character Portrait (Front View / 定妆照)

**Purpose:** Single front view of character for reference and close-up shots

**Key Requirements:**

- Full body visible from head to toe
- Front view only, facing camera directly
- Neutral facial expression
- Relaxed, natural standing pose
- Arms relaxed at sides (or natural position)
- Clean white or neutral background
- Even lighting from all sides (no dramatic shadows)
- Detailed costume, hair, and accessories visible

**Prompt Keywords:**

```
Full-body character reference, front view, standing straight,
neutral expression, looking at camera, clean white background,
even studio lighting, professional character design, highly detailed
```

**Negative Prompt Keywords:**

```
side view, back view, three-quarter view, dynamic pose,
action pose, smiling, frowning, background clutter, shadows
```

---

### 2. Character Turnaround (Three Views / 三视图)

**Purpose:** Multiple views of character for 3D modeling and full-body animation

**Key Requirements:**

- All three views in one image: front, side (profile), back
- All figures same height and scale
- Same character, same costume, same lighting across all views
- Neutral pose in all views
- Clean white background
- Professional animation reference sheet style
- Clear outlines, consistent design

**Prompt Keywords:**

```
Character design turnaround sheet, three views: front, side, back,
all figures same scale, same character, consistent design,
clean white background, professional animation reference,
clear outlines, highly detailed
```

**Negative Prompt Keywords:**

```
inconsistent proportions, different scales, dynamic poses,
action, background clutter, color variations between views,
different characters
```

---

### 3. Scene Design (Environment / 场景)

**Purpose:** Background plate for character placement and camera motion

**Key Requirements:**

- Clear space in center for character placement
- Simple foreground elements that won't block movement
- Single primary light source, consistent direction
- Wide shot showing full depth of scene
- Clear foreground/midground/background layers
- Avoid complex overlapping elements in center
- No human figures or animals (unless part of static environment)

**Prompt Keywords:**

```
[Scene description], clear space in center for character,
single primary light source from [direction],
wide shot showing full depth, clear depth layers,
simple foreground, no people, no characters,
cinematic composition, highly detailed
```

**Negative Prompt Keywords:**

```
human figures, people, characters, animals,
complex overlapping elements in center,
multiple conflicting light sources
```

---

### 4. Background Plate (纯背景)

**Purpose:** Clean background without any characters

**Key Requirements:**

- No people, no characters, no animals
- Complete environment visible
- Clear depth layers
- Consistent lighting
- Space for character placement (if needed)

**Prompt Keywords:**

```
[Environment description], empty scene, no people,
no characters, no animals, complete environment,
clear background
```

---

### 5. Character + Scene Combo (人物+场景)

**Purpose:** Character in environment, ready for camera motion

**Key Requirements:**

- Character clearly separated from background
- Space around character for movement
- Single consistent light source
- Character's shadow matches light direction
- Simple background elements
- Clear depth layers

---

### 6. Product Reference (产品定妆照)

**Purpose:** Prop or weapon reference for animation

**Key Requirements:**

- Multiple views in one image (front, side, angled)
- Same object in all views
- Clean white background
- Even studio lighting
- Detailed textures and materials visible

---

## Key Requirements (General)

### 1. Clear Subject Separation

**Good:**

- Subject clearly separated from background
- Distinct edges and silhouettes
- Minimal overlapping elements

**Avoid:**

- Subject blending into background
- Complex foreground/background interweaving
- Multiple subjects overlapping

**Prompt Tips:**

```
Clear subject against simple background
Well-defined silhouette
Subject separated from environment
```

### 2. Natural Pose for Animation

**Good:**

- Balanced, natural standing/sitting pose
- Weight distributed naturally
- Limbs in relaxed positions
- Face with neutral or slight expression

**Avoid:**

- Extreme poses difficult to animate from
- Unbalanced positions
- Frozen action poses

**Prompt Tips:**

```
Natural relaxed pose
Balanced stance
Calm expression
Resting position
```

### 3. Consistent Lighting

**Good:**

- Single primary light source
- Clear light direction
- Soft shadows (easier for video AI)
- Consistent across entire image

**Avoid:**

- Multiple conflicting light sources
- Harsh shadows from multiple directions
- Inconsistent lighting on subject vs background

**Prompt Tips:**

```
Single light source from [direction]
Soft natural lighting
Consistent illumination
Golden hour lighting
```

### 4. Motion-Friendly Composition

**Good:**

- Space around subject for movement
- Room for camera motion
- Clear foreground/midground/background layers
- Natural depth

**Avoid:**

- Tight cropping
- Cluttered composition
- Flat 2D look

**Prompt Tips:**

```
Spacious composition
Room for movement
Clear depth layers
Wide angle with subject in frame
```

### 5. Simple Background

**Good:**

- Clean, uncluttered background
- Subtle texture or gradient
- Minimal detail that could cause artifacts

**Avoid:**

- Busy, detailed backgrounds
- Many small objects
- Complex patterns

**Prompt Tips:**

```
Simple clean background
Subtle gradient backdrop
Minimalist environment
Uncluttered setting
```

---

## Subject-Specific Guidelines

### People/Characters

**Best for Video:**

- Standing or sitting naturally
- Slight turn (3/4 view) works well
- Hands visible but not complex
- Hair in natural position

**Prompt Example:**

```
Young woman standing naturally, relaxed pose, slight smile,
clear silhouette against soft background, natural lighting from left,
cinematic portrait, photorealistic
```

### Animals

**Best for Video:**

- Natural resting or alert pose
- Clear body outline
- Fur/feathers in natural position
- Eyes visible

**Prompt Example:**

```
Golden retriever sitting alert, clear outline,
soft grass background, natural daylight,
well-defined silhouette, photorealistic
```

### Objects

**Best for Video:**

- Clear object boundaries
- Simple surface textures
- Consistent material appearance
- Good contrast with background

**Prompt Example:**

```
Vintage ceramic vase on wooden table,
clean background, soft studio lighting,
clear object edges, product photography
```

### Landscapes

**Best for Video:**

- Clear horizon line
- Defined foreground elements
- Atmospheric depth
- Natural elements (water, clouds, trees)

**Prompt Example:**

```
Mountain lake at sunrise, clear horizon,
foreground wildflowers, misty background,
natural lighting, landscape photography
```

---

## Aspect Ratios for Video

### Recommended Ratios

| Ratio | Use Case                |
| ----- | ----------------------- |
| 16:9  | Standard video, YouTube |
| 9:16  | TikTok, Reels, Shorts   |
| 1:1   | Instagram square        |
| 21:9  | Cinematic video         |

### Midjourney Parameters

```
--ar 16:9  (standard video)
--ar 9:16  (vertical video)
--ar 21:9  (cinematic)
```

---

## Common Mistakes to Avoid

### 1. Too Much Detail

```
❌ Bad: Every strand of hair visible, intricate patterns everywhere
✅ Good: Natural hair flow, simple textures
```

### 2. Extreme Poses

```
❌ Bad: Mid-jump action pose, extreme angle
✅ Good: Natural standing, balanced position
```

### 3. Complex Backgrounds

```
❌ Bad: Busy street with many people and objects
✅ Good: Simple street scene with clear subject
```

### 4. Multiple Light Sources

```
❌ Bad: Neon lights from multiple directions
✅ Good: Single primary light with soft fill
```

---

## Video Platform Considerations

### Kling (可灵)

- Prefers clear subject separation
- Works best with natural poses
- Consistent lighting is critical

### Runway

- Good with cinematic images
- Handles moderate complexity
- Lighting consistency important

### Pika

- Works well with simple compositions
- Clear subjects preferred
- Natural lighting recommended

---

## Quick Reference: Content Type Checklist

| Content Type                          | Must Have                                                       | Should Have                                                 |
| ------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| **定妆照 (Character Portrait)**       | Full body, front view, neutral expression, clean background     | Even lighting, detailed costume, no side/back views         |
| **三视图 (Turnaround)**               | 3 views (front/side/back), same scale, same character           | Clean white background, consistent design, no dynamic poses |
| **场景 (Scene)**                      | Clear center space, no characters, single light source          | Wide shot, clear depth layers, simple foreground            |
| **纯背景 (Background Only)**          | No people/characters, complete environment, consistent lighting | Clear depth layers, space for character                     |
| **人物+场景 (Character + Scene)**     | Character separated, space around, consistent light/shadow      | Clear depth, simple background elements                     |
| **产品定妆照 (Product Reference)**    | Multiple views, same object, clean background                   | Even studio lighting, detailed textures                     |
