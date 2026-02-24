# Output Examples - Categories (Examples 27-34)
Fashion portraits, group photos, cosplay, landscapes, animals, products, food photography.
Load this file when user requests these specific categories.

---

## Example 27: Fashion Portrait (时尚人像)

**Input:** "时尚女性人像，杂志风格，85mm镜头，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Fashion portrait of elegant woman in her 20s, wearing designer minimalist clothing, soft natural lighting from window, shallow depth of field, 85mm lens aesthetic, editorial magazine style, clean modern aesthetic, confident expression, professional fashion photography",
      "style": "fashion editorial",
      "parameters": "--ar 3:4 --v 6.1 --s 250 --q 2",
      "negative": "text, watermark, signature, blurry, distorted, bad anatomy, over-edited"
    }
  }
}
```

---

## Example 28: Group Photo (团体照)

**Input:** "三个朋友合影，户外咖啡馆，轻松氛围，用即梦"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "prompts": {
    "jimeng": {
      "type": "image",
      "prompt": "三个年轻朋友在户外咖啡馆合影，轻松愉快的氛围，桌上有咖啡杯和甜点，午后阳光温暖，背景是街道和绿植，自然笑容，友情氛围，photorealistic, highly detailed",
      "style": "photorealistic",
      "negative": "水印, 文字, 模糊, 变形, 不自然的表情"
    }
  }
}
```

---

## Example 29: Cosplay Character (角色扮演)

**Input:** "赛博朋克角色cosplay，霓虹灯光，夜景，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Cyberpunk cosplay character, neon-lit alleyway at night, glowing cybernetic implants, futuristic clothing with LED accents, rain-soaked pavement reflecting neon signs in pink and blue, holographic advertisements in background, Blade Runner aesthetic, dramatic lighting, highly detailed, 8K resolution",
      "style": "cyberpunk",
      "parameters": "--ar 16:9 --v 6.1 --s 500 --q 2",
      "negative": "text, watermark, signature, blurry, deformed, bad anatomy, daytime"
    }
  }
}
```

---

## Example 30: Mountain Sunset (山巅日落)

**Input:** "阿尔卑斯山日落，云海，壮观风景，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Alpine mountain sunset, snow-capped peaks above sea of clouds, golden hour light casting warm orange and pink glow, dramatic sky with wispy clouds, majestic landscape, National Geographic style, highly detailed, 8K resolution",
      "style": "landscape photography",
      "parameters": "--ar 16:9 --v 6.1 --s 250 --q 2",
      "negative": "text, watermark, signature, blurry, people, buildings, animals"
    }
  }
}
```

---

## Example 31: Ocean Storm (海洋风暴)

**Input:** "暴风雨中的大海，巨浪，戏剧感，用即梦"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "prompts": {
    "jimeng": {
      "type": "image",
      "prompt": "暴风雨中的大海，巨浪滔天，乌云密布， dramatic lighting, 海浪冲击礁石，飞溅的浪花， dramatic sky, 强烈的对比， cinematic atmosphere, landscape photography, highly detailed",
      "style": "dramatic landscape",
      "negative": "水印, 文字, 模糊, 变形, 船只, 人物"
    }
  }
}
```

---

## Example 32: Wildlife (野生动物)

**Input:** "森林中的狼，月光，神秘氛围，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Majestic grey wolf in ancient forest at night, moonlight filtering through trees, mystical atmosphere, soft blue light, piercing eyes, detailed fur texture, National Geographic wildlife photography, highly detailed, 8K resolution",
      "style": "wildlife photography",
      "parameters": "--ar 16:9 --v 6.1 --s 250 --q 2",
      "negative": "text, watermark, signature, blurry, people, buildings, domestic animals"
    }
  }
}
```

---

## Example 33: Product Photography (产品摄影)

**Input:** " luxury watch 产品摄影，黑色背景，专业打光，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Luxury Swiss watch on black velvet surface, professional studio lighting, soft reflections, macro shot showing intricate details of movement, polished metal and leather strap, commercial product photography, minimalist composition, highly detailed, 8K resolution",
      "style": "product photography",
      "parameters": "--ar 1:1 --v 6.1 --s 250 --q 2",
      "negative": "text, watermark, signature, blurry, hands, people, background clutter"
    }
  }
}
```

---

## Example 34: Food Photography (美食摄影)

**Input:** "日式拉面，美食摄影，温暖光线，用nano"

**Output:**

```json
{
  "platforms": ["nano-banana"],
  "prompts": {
    "nano-banana": {
      "type": "image",
      "prompt": "Japanese ramen bowl, steaming hot, soft-boiled egg, bamboo shoots, green onions, nori, rich broth, warm lighting, food photography, appetizing",
      "style": "food photography",
      "negative": "ugly, deformed, blurry, people, hands"
    }
  }
}
```
