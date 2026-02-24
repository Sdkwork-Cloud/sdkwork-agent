# Output Examples - Basics (Examples 1-12)

Basic usage, multi-platform, simple portraits and landscapes.

---

## Example 1: Default (No Platform, No Style)

**Input:** "一只白猫在窗边晒太阳"

**Output:**

```json
{
  "platforms": ["default"],
  "prompts": {
    "default": {
      "type": "image",
      "prompt": "午后的阳光透过玻璃窗洒进来，一只白色的猫咪蜷缩在窗台上晒太阳。温暖的金色光线在它柔软的毛发上形成光晕，猫咪眯着眼睛享受这份惬意。窗外的树影轻轻摇曳，在猫咪身上投下斑驳的光影。",
      "style": "cinematic photorealistic"
    }
  }
}
```

---

## Example 2: With Style (Anime)

**Input:** "一只白猫在窗边晒太阳，动漫风格"

**Output:**

```json
{
  "platforms": ["default"],
  "prompts": {
    "default": {
      "type": "image",
      "prompt": "午后的阳光洒进房间，一只可爱的白色猫咪趴在窗台上打盹。柔和的光线勾勒出它毛茸茸的轮廓，半眯的眼睛透着满足。窗外是蓝天白云，整个画面温馨治愈。",
      "style": "anime"
    }
  }
}
```

---

## Example 3: Midjourney + Fantasy

**Input:** "森林中的精灵，奇幻风格，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Ethereal elf in ancient forest, delicate features with pointed ears, flowing silver hair adorned with flowers, translucent wings catching dappled sunlight, moss-covered ancient trees, magical glowing particles, fantasy style, ethereal atmosphere, warm mystical glow, highly detailed, cinematic composition",
      "style": "fantasy",
      "parameters": "--ar 2:3 --v 6.1 --s 500 --q 2",
      "negative": "text, watermark, blurry, deformed, bad anatomy"
    }
  }
}
```

---

## Example 4: Midjourney + Chinese Traditional

**Input:** "山水画风格，远山如黛，云雾缭绕，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Traditional Chinese landscape painting, 山水画, towering mountains fading into mist, 远山如黛, ancient pine trees on cliff edges, 云雾缭绕, waterfall cascading into valley, minimalist composition with empty space, 留白, ink wash style, 水墨渲染, traditional Chinese aesthetics, classical scroll painting",
      "style": "chinese traditional",
      "parameters": "--ar 16:9 --v 6.1 --s 750 --q 2",
      "negative": "text, watermark, modern elements, bright colors, photorealistic"
    }
  }
}
```

---

## Example 5: Jimeng + Chinese Traditional

**Input:** "古风美女，水墨画风格，用即梦"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "prompts": {
    "jimeng": {
      "type": "image",
      "prompt": "古典美女，身着淡雅汉服，手持团扇，眉目如画，气质温婉。背景是朦胧的山水，水墨渲染，意境深远。水墨画风格，国画技法，留白构图，传统美学，工笔与写意结合，highly detailed",
      "style": "chinese traditional",
      "negative": "水印, 文字, 现代元素, 模糊, 变形"
    }
  }
}
```

---

## Example 6: NanoBanana + Photorealistic

**Input:** "一杯咖啡，照片风格，用nano"

**Output:**

```json
{
  "platforms": ["nano-banana"],
  "prompts": {
    "nano-banana": {
      "type": "image",
      "prompt": "Coffee cup on wooden table, steam rising, warm lighting, photorealistic",
      "style": "photorealistic",
      "negative": "ugly, deformed, blurry"
    }
  }
}
```

---

## Example 7: Multiple Platforms + Style

**Input:** "赛博朋克风格，雨夜霓虹城市，生成midjourney和jimeng的"

**Output:**

```json
{
  "platforms": ["midjourney", "jimeng"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Cyberpunk city street at night, towering buildings with neon signs, rain creating reflections on wet ground, holographic advertisements, flying vehicles, neon blue and magenta lights, sci-fi aesthetic, Blade Runner style, atmospheric, highly detailed",
      "style": "sci-fi",
      "parameters": "--ar 21:9 --v 6.1 --s 500 --q 2",
      "negative": "text, watermark, daytime, blurry, natural lighting"
    },
    "jimeng": {
      "type": "image",
      "prompt": "赛博朋克城市夜景，霓虹灯闪烁，高楼林立，雨水打湿地面形成倒影，科幻氛围，未来感，cyberpunk style, highly detailed",
      "style": "sci-fi",
      "negative": "水印, 文字, 白天, 模糊"
    }
  }
}
```

---

## Example 8: Image-to-Video Ready

**Input:** "一个女孩站在海边，适合做视频，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Young woman standing on beach, natural relaxed pose, clear silhouette against ocean sky, soft golden hour lighting from left, simple clean background, space around subject for movement, cinematic, photorealistic",
      "style": "cinematic photorealistic",
      "parameters": "--ar 16:9 --v 6.1 --s 250 --q 2",
      "negative": "text, watermark, blurry, complex background, overlapping elements",
      "video_ready": true
    }
  }
}
```

---

## Example 9: Midjourney Portrait

**Input:** "年轻男性肖像，85mm镜头，电影感，midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Portrait of young man in his 20s, sharp focus on eyes, soft lighting from window, cinematic color grading, natural expression, 85mm lens aesthetic, shallow depth of field, professional portrait photography",
      "style": "cinematic photorealistic",
      "parameters": "--ar 3:4 --v 6.1 --s 250 --q 2",
      "negative": "text, watermark, blurry, distorted face, bad anatomy"
    }
  }
}
```

---

## Example 10: Jimeng Landscape

**Input:** "江南水乡，烟雨朦胧，用即梦"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "prompts": {
    "jimeng": {
      "type": "image",
      "prompt": "江南水乡，白墙黑瓦，小桥流水，乌篷船，石板路，烟雨朦胧，水墨画风格，意境深远，传统中国美学，留白构图，highly detailed",
      "style": "chinese traditional",
      "negative": "水印, 文字, 现代元素, 模糊, 变形"
    }
  }
}
```

---

## Example 11: NanoBanana Simple Object

**Input:** "红色苹果，简洁，nano"

**Output:**

```json
{
  "platforms": ["nano-banana"],
  "prompts": {
    "nano-banana": {
      "type": "image",
      "prompt": "Red apple on white background, clean, simple",
      "style": "photorealistic"
    }
  }
}
```

---

## Example 12: All Platforms

**Input:** "一只金毛犬在草地上，生成所有平台的"

**Output:**

```json
{
  "platforms": ["default", "midjourney", "jimeng", "nano-banana"],
  "prompts": {
    "default": {
      "type": "image",
      "prompt": "阳光明媚的午后，一只金毛犬在绿油油的草地上欢快地奔跑。它的毛发在阳光下闪着金色的光芒，尾巴快乐地摇摆着，脸上洋溢着幸福的笑容。背景是蓝天白云和远处的树木，整个画面充满了生机和活力。",
      "style": "cinematic photorealistic"
    },
    "midjourney": {
      "type": "image",
      "prompt": "Golden retriever dog running on green grass, sunny day, happy expression, floppy ears, golden fur glowing in sunlight, shallow depth of field, professional pet photography, National Geographic style",
      "style": "photorealistic",
      "parameters": "--ar 16:9 --v 6.1 --s 250 --q 2",
      "negative": "text, watermark, blurry, deformed"
    },
    "jimeng": {
      "type": "image",
      "prompt": "金毛犬在草地上奔跑，阳光明媚，快乐表情，photorealistic, highly detailed",
      "style": "photorealistic",
      "negative": "水印, 文字, 模糊, 变形"
    },
    "nano-banana": {
      "type": "image",
      "prompt": "Golden retriever running on grass, sunny day, photorealistic",
      "style": "photorealistic"
    }
  }
}
```
