# Negative Prompts Library

Comprehensive collection of negative prompts organized by category and platform.

## Universal Negative Prompts

**Standard Universal Set:**
```
ugly, deformed, noisy, blurry, distorted, out of focus, 
bad anatomy, extra limbs, poorly drawn face, poorly drawn hands, 
missing fingers, duplicate, watermark, signature, text, logo, 
cropped, worst quality, low quality, normal quality, 
jpeg artifacts, error, username, artist name
```

**Enhanced Universal Set:**
```
ugly, deformed, noisy, blurry, distorted, out of focus, 
bad anatomy, extra limbs, poorly drawn face, poorly drawn hands, 
missing fingers, extra fingers, fused fingers, mutated hands,
missing arms, extra arms, missing legs, extra legs, 
fused fingers, too many fingers, long neck, cross-eyed,
mutated, poorly drawn, bad proportions, duplicate, 
watermark, signature, text, logo, cropped, out of frame,
worst quality, low quality, normal quality, jpeg artifacts,
error, username, artist name, fake, abstract, surreal
```

## Category-Specific Negative Prompts

### 1. Portrait & Character

**Facial Features:**
```
mutated face, extra face, double face, crossed eyes,
asymmetrical eyes, deformed iris, deformed pupils,
bad teeth, missing teeth, crooked teeth, extra nose,
mutated nose, fused nose, missing nose, bad ears,
extra ears, missing ears, fused ears, bad mouth,
extra mouth, missing mouth, fused mouth
```

**Body & Anatomy:**
```
bad anatomy, extra limbs, missing limbs, floating limbs,
disconnected limbs, malformed limbs, extra arms,
missing arms, extra legs, missing legs, extra fingers,
missing fingers, fused fingers, too many fingers,
mutated hands, poorly drawn hands, poorly drawn face,
mutation, deformed, extra nipples, bad feet,
extra feet, missing feet, fused feet
```

**Skin & Texture:**
```
wrinkles, acne, scars, blemishes, skin spots,
uneven skin tone, plastic skin, doll-like skin,
waxy skin, oily skin, dry skin, pale skin,
unnatural skin color
```

**Hair:**
```
bad hair, missing hair, extra hair, floating hair,
disconnected hair, unrealistic hair, plastic hair,
doll hair, wig-like hair, messy hair, tangled hair
```

### 2. Hands & Fingers

**Comprehensive Hand Negatives:**
```
poorly drawn hands, mutated hands, extra hands,
missing hands, floating hands, disconnected hands,
bad hands, fused hands, too many hands,
bad fingers, extra fingers, missing fingers,
fused fingers, too many fingers, mutated fingers,
long fingers, short fingers, extra thumb,
missing thumb, extra wrist, missing wrist
```

### 3. Landscape & Environment

**Atmospheric Issues:**
```
unnatural sky, fake clouds, painted clouds,
cartoon sky, gradient sky, blotchy sky,
unnatural colors, oversaturated, undersaturated,
posterized, banding, artifacts, compression
```

**Nature Elements:**
```
plastic trees, fake grass, painted flowers,
unnatural water, flat water, mirror water,
cartoon rocks, fake mountains, unnatural terrain,
repeating patterns, tiling artifacts
```

**Architecture:**
```
leaning buildings, distorted perspective,
impossible architecture, floating buildings,
collapsing structures, unrealistic proportions,
cartoon buildings, toy-like buildings
```

### 4. Animals & Creatures

**Anatomy Issues:**
```
mutated animal, deformed animal, extra legs,
missing legs, extra head, missing head,
unnatural proportions, unrealistic anatomy,
cartoon animal, toy-like, plastic texture,
fake fur, painted texture
```

**Specific Features:**
```
crossed eyes, uneven eyes, extra eyes,
missing eyes, misaligned features, asymmetrical face,
unnatural pose, floating, disconnected parts
```

### 5. Objects & Products

**Physical Issues:**
```
unrealistic proportions, impossible geometry,
levitating objects, clipping, z-fighting,
low poly, untextured, flat shading,
plastic look, toy-like, miniature appearance
```

**Surface Issues:**
```
noisy surface, blotchy texture, pixelated,
compression artifacts, jagged edges, aliasing,
moire pattern, banding, posterization
```

### 6. Artistic & Style

**Unwanted Styles:**
```
cartoon, anime, 3d render, cgi, digital art,
illustration, painting, drawing, sketch,
watercolor, oil painting, acrylic, pastel,
crayon, marker, pencil, ink
```

**Quality Issues:**
```
lowres, low resolution, bad quality,
pixelated, blurry, out of focus, noisy,
grainy, artifacts, compression, jpeg,
watermark, signature, text, logo
```

**Modern Issues:**
```
ai generated look, ai artifacts, telltale ai,
uncanny valley, plastic look, doll-like,
wax figure, mannequin, puppet-like,
marionette, robotic, artificial
```

## Platform-Specific Formats

### Midjourney

**Syntax:**
```
--no [negative prompts]
```

**Standard:**
```
--no text, watermark, signature, blurry, deformed, 
ugly, bad anatomy, extra limbs
```

**Portrait:**
```
--no text, watermark, deformed face, bad face,
extra face, crossed eyes, bad teeth
```

**Hands:**
```
--no bad hands, extra fingers, missing fingers,
fused fingers, mutated hands
```

### Stable Diffusion / Automatic1111

**Syntax:**
```
[Positive prompt] ### [Negative prompt]
```

**Standard:**
```
(Positive prompt) ### 
(negative prompt:1.3), (worst quality:1.4), 
(low quality:1.4), (normal quality:1.4),
bad anatomy, extra limbs, missing limbs,
floating limbs, disconnected limbs,
malformed hands, blurry, jpeg artifacts
```

**With Emphasis:**
```
(bad anatomy:1.5), (worst quality:1.4), 
(low quality:1.4), (mutation:1.3),
(deformed:1.3), (extra limbs:1.4),
(missing fingers:1.4), (bad hands:1.4)
```

### Kling (可灵)

**Syntax:**
```
Negative prompt field or appended with "without"
```

**Standard:**
```
without text, watermark, blurry, deformed,
unnatural motion, glitch, artifacts
```

**Video-Specific:**
```
without flickering, jittery motion, 
unnatural movement, morphing errors,
temporal inconsistencies, ghosting
```

### Jimeng (即梦)

**Syntax:**
```
Negative prompt field (text input)
```

**Standard:**
```
水印, 模糊, 变形, 低质量, 多余的手指,
糟糕的手, 多余的肢体, 文字, 签名
```

**English:**
```
watermark, blurry, deformed, low quality,
extra fingers, bad hands, extra limbs,
text, signature
```

### DALL-E 3

**Syntax:**
```
Integrated - mention in positive prompt what to avoid
```

**Approach:**
```
high quality, professional, no text, no watermark,
no signature, no blur, anatomically correct
```

## Specialized Negative Prompts

### Photorealistic

**Target:** Eliminate artificial/cartoon look
```
cartoon, anime, sketch, drawing, illustration,
3d render, cgi, digital art, painting,
artwork, filter, effect, processed,
plastic, doll, toy, miniature, model,
uncanny valley, artificial, fake
```

### Artistic/Painterly

**Target:** Maintain artistic integrity without artifacts
```
photograph, photo, realistic, 3d render,
cgi, digital, computer generated, ai look,
watermark, text, logo, cropped,
compressed, artifacts, noise, grain
```

### Technical/Architectural

**Target:** Accurate proportions and geometry
```
leaning, distorted perspective, impossible geometry,
unrealistic proportions, floating elements,
clipping, z-fighting, texture stretching,
low poly, untextured, flat lighting
```

### Product Photography

**Target:** Professional commercial look
```
text, watermark, logo, brand name, label,
price tag, barcode, qr code, sticker,
reflection of photographer, dust, scratches,
uneven lighting, color cast, distorted
```

### Nature/Landscape

**Target:** Realistic natural scenes
```
unnatural colors, oversaturated, undersaturated,
fake sky, painted clouds, plastic plants,
toy landscape, miniature effect, tilt-shift,
unnatural water, mirror reflection, tiling
```

## Weighted Negative Prompts (Stable Diffusion)

### Syntax
```
(prompt:weight)
```

### Standard Weights
```
(worst quality:1.4), (low quality:1.4),
(normal quality:1.2), (bad anatomy:1.3),
(extra limbs:1.3), (missing fingers:1.4),
(mutation:1.2), (deformed:1.2)
```

### Aggressive Weights
```
(bad anatomy:1.5), (worst quality:1.5),
(low quality:1.5), (extra limbs:1.5),
(missing fingers:1.5), (mutation:1.4),
(deformed:1.4), (bad hands:1.5)
```

## Progressive Negative Strategy

### Level 1: Basic (Start Here)
```
ugly, deformed, 
