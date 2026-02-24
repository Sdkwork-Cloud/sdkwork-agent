# Negative Prompts Library
Common negative prompts for video generation.

---

## Core Negative Prompts (Always Include)

```
text, watermark, subtitles, captions,
blurry, low quality, distorted, pixelated,
bad anatomy, deformed, extra limbs, missing limbs,
inconsistent characters, changing appearance,
jerky motion, unnatural movement,
flickering, flashing, strobing,
overexposed, underexposed,
cartoon, 2d, flat,
ugly, gross, disgusting
```

---

## Subject-Specific Negative Prompts

### People/Characters
```
extra fingers, missing fingers, extra arms, extra legs,
facial distortion, distorted face, bad hands, bad feet,
inconsistent clothing, changing hair color,
cross-eyed, lazy eye, deformed face
```

### Animals
```
extra legs, missing legs, deformed anatomy,
extra tails, missing tails, inconsistent fur,
distorted face, bad paws, unnatural proportions
```

### Environments
```
text in scene, signs with text, billboards with text,
floating objects, impossible physics,
inconsistent lighting, multiple suns, multiple moons,
weather inconsistencies, conflicting seasons
```

---

## Motion-Specific Negative Prompts
```
jerky camera, shaky camera, chaotic movement,
camera cutting, camera jumps,
subject teleporting, subject disappearing,
unnatural speed, too fast, too slow,
freeze frames, sudden stops
```

---

## Quality-Specific Negative Prompts
```
low resolution, 360p, 480p,
jpeg artifacts, compression artifacts,
noise, grainy, dusty,
watermark, signature, logo,
copyright, trademark, branding
```

---

## Style-Specific Negative Prompts

### If You Want Photorealistic
```
cartoon, anime, comic, illustration,
drawing, painting, 2d, flat,
cgi, 3d render, plastic-looking
```

### If You Want Stylized
```
photorealistic, photo, realistic,
photography, raw photo, unedited
```

---

## Platform-Specific Negative Prompts

### Kling (可灵)
```
text, watermark, blurry, distorted,
bad anatomy, inconsistent characters,
jerky motion, unnatural movement
```

### Sora
```
text, watermark, low quality,
inconsistent characters, changing appearance,
impossible physics, illogical
```

### Runway
```
text, watermark, blurry, distorted,
bad anatomy, extra limbs
```

---

## Quick Reference: By Use Case

| Use Case | Negative Prompts to Add |
|----------|-------------------------|
| **General (Always)** | text, watermark, blurry, distorted, bad anatomy |
| **People** | extra fingers, bad hands, facial distortion |
| **Animals** | extra legs, deformed anatomy, bad paws |
| **Motion Focus** | jerky camera, teleporting, unnatural speed |
| **Photorealistic** | cartoon, anime, 2d, cgi |
| **Quality Focus** | low resolution, artifacts, noise |
