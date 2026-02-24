# Style Reference

Complete reference for photography, art, and cinematic styles with detection keywords.

## Style Detection

Detect style from user input keywords:

| Style | Keywords |
|-------|----------|
| Photorealistic | "写实", "照片", "photorealistic", "photo", "realistic", "真实" |
| Cinematic | "电影", "cinematic", "电影感", "movie", "film" |
| Anime | "动漫", "anime", "manga", "卡通", "cartoon" |
| Oil Painting | "油画", "oil painting", "painting" |
| Watercolor | "水彩", "watercolor", "水墨" |
| Digital Art | "数字艺术", "digital art", "concept art", "概念艺术" |
| Fantasy | "奇幻", "fantasy", "魔幻", "魔法" |
| Sci-Fi | "科幻", "sci-fi", "cyberpunk", "赛博朋克", "未来" |
| Film Noir | "黑色电影", "noir", "黑白" |
| Chinese Traditional | "国画", "山水", "水墨画", "工笔", "古风" |
| Portrait | "人像", "肖像", "portrait" |
| Landscape | "风景", "landscape", "山水" |

## Default Style

If NO style specified, use **Cinematic Photorealistic** as default:
- Natural cinematic lighting
- Photorealistic quality
- Professional photography aesthetic

## Style Prompts by Category

### Photography Styles

**Photorealistic (Default):**
```
photorealistic, highly detailed, professional photography, natural lighting, 8K resolution
```

**Portrait:**
```
portrait photography, 85mm lens, sharp focus on eyes, creamy bokeh, soft lighting, flattering angles
```

**Landscape:**
```
landscape photography, 16mm wide angle, deep depth of field, golden hour lighting, dramatic skies
```

**Street:**
```
street photography, 35mm lens, documentary style, candid, natural lighting, urban environment
```

**Macro:**
```
macro photography, extreme close-up, detailed texture, shallow depth of field, focus stacking
```

### Art Styles

**Oil Painting:**
```
oil painting style, rich colors, visible brushstrokes, canvas texture, classical art
```

**Watercolor:**
```
watercolor painting, soft edges, transparent layers, flowing colors, artistic
```

**Digital Art:**
```
digital art, clean lines, vibrant colors, polished finish, concept art
```

**Ink Wash:**
```
ink wash painting, black and white, flowing ink, negative space, traditional Asian art
```

### Cinematic Styles

**Cinematic (Default):**
```
cinematic, film-like, dramatic lighting, movie quality, professional cinematography
```

**Film Noir:**
```
film noir style, high contrast, dramatic shadows, black and white, detective aesthetic
```

**Sci-Fi:**
```
sci-fi aesthetic, neon lights, futuristic architecture, cool color palette, cyberpunk
```

**Fantasy:**
```
fantasy style, magical lighting, ethereal atmosphere, warm glow, mystical
```

**Horror:**
```
horror aesthetic, low key lighting, shadows, ominous atmosphere, gothic
```

### Chinese Traditional Styles

**Chinese Ink Wash (水墨画):**
```
traditional Chinese ink wash painting, 水墨画, flowing brushstrokes, minimal color, 留白 empty space
```

**Gongbi (工笔):**
```
Chinese gongbi painting, 工笔画, fine brushwork, detailed, vibrant traditional colors
```

**Landscape (山水画):**
```
Chinese landscape painting, 山水画, mountains and water, atmospheric perspective, scholarly elements
```

## Style Combinations

Styles can be combined:

**Cinematic + Photorealistic (Recommended Default):**
```
cinematic photorealistic, film-like quality, natural lighting, professional photography, 8K
```

**Fantasy + Digital Art:**
```
fantasy digital art, magical atmosphere, vibrant colors, concept art style
```

**Chinese Traditional + Watercolor:**
```
Chinese watercolor style, 水墨渲染, traditional aesthetics, flowing colors
```

## Platform-Specific Style Handling

### Midjourney
- Add style at the END of prompt
- Use `--s` parameter to control style strength
- `--s 250` for balanced, `--s 500+` for strong style

### Kling (Video)
- Style affects motion quality
- Cinematic style = smooth camera movements
- Documentary style = handheld feel

### Jimeng
- Chinese styles work best
- Add Chinese keywords for traditional styles
- Use `国画风格`, `水墨画`, `工笔` for traditional looks

### NanoBanana
- Keep style simple
- Just add style keyword at end
- "photorealistic", "artistic", "cartoon"
