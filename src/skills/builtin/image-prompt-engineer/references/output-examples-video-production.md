# Output Examples - Video Production (Examples 13-18)

Character sheets, turnarounds, scene plates for video production.

---

## Example 13: Character Portrait (Front View / 定妆照)

**Input:** "年轻女战士定妆照，正面，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Full-body character reference sheet of female warrior in her 20s, front view, standing straight, arms relaxed at sides, neutral facial expression, looking directly at camera, detailed facial features, clear hair texture, complete costume design showing front details, tactical armor with leather and metal accents, utility belt with pouches, functional boots, full body visible from head to toe, clean white background, professional character design reference, highly detailed, photorealistic, 8K resolution, sharp focus, even lighting from all sides",
      "style": "photorealistic",
      "parameters": "--ar 2:3 --v 6.1 --s 250 --q 2",
      "negative": "text, watermark, signature, blurry, distorted, bad anatomy, extra limbs, side view, back view, three-quarter view, dynamic pose, action pose, smiling, frowning, background clutter, shadows",
      "video_ready": true
    }
  }
}
```

---

## Example 14: Character Turnaround (Three Views / 三视图)

**Input:** "男刺客三视图，正面侧面背面，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Character design turnaround sheet, male assassin character in his 30s, three views in one image: front view, side view (profile), back view, all figures same height and scale, standing neutral pose, wearing black stealth assassin costume with hood, detailed costume design showing all angles, hidden weapons visible at sides, sleek leather armor, quiet and menacing appearance, clean white background, professional animation reference sheet, clear outlines, consistent design across all views, highly detailed, 8K resolution",
      "style": "concept art",
      "parameters": "--ar 16:9 --v 6.1 --s 500 --q 2",
      "negative": "text, watermark, signature, blurry, distorted, bad anatomy, extra limbs, inconsistent proportions, different scales, dynamic poses, action, background clutter, color variations between views",
      "video_ready": true
    }
  }
}
```

---

## Example 15: Scene Design (Environment / 场景)

**Input:** "赛博朋克巷弄场景，适合做视频，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Cyberpunk alleyway scene at night, narrow street between towering neon-lit buildings, wet pavement reflecting colorful neon signs in pink, blue, and magenta, holographic advertisements glowing in air, steam rising from manholes, rain falling gently, scattered trash and debris on ground, clear space for character placement in center, single primary light source from neon signs above, simple foreground elements that won't block movement, consistent lighting direction, wide shot showing full alley depth, Blade Runner 2049 aesthetic, highly detailed, cinematic composition",
      "style": "sci-fi cinematic",
      "parameters": "--ar 16:9 --v 6.1 --s 500 --q 2",
      "negative": "text, watermark, signature, blurry, deformed, human figures, people, characters, animals, complex overlapping elements in center, strong shadows that would obscure motion",
      "video_ready": true
    }
  }
}
```

---

## Example 16: Character + Scene Combo (人物+场景)

**Input:** "古风侠客站在山巅，场景和人物，适合视频，用即梦"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "prompts": {
    "jimeng": {
      "type": "image",
      "prompt": "古风侠客，身着青色长袍，腰佩长剑，站在山巅巨石之上，身姿挺拔，衣袂随风轻扬。背景是壮阔的云海山峦，清晨的金色阳光从画面左侧照射，在人物右侧拉出长长的影子。人物与背景分离清晰，周围有足够空间便于动作，画面呈现中国传统水墨画风格，留白构图，意境深远，traditional Chinese aesthetics, highly detailed",
      "style": "chinese traditional",
      "negative": "水印, 文字, 模糊, 变形, 复杂重叠的背景元素, 多个光源, 不一致的光影方向",
      "video_ready": true
    }
  }
}
```

---

## Example 17: Product Reference (产品定妆照)

**Input:** "科幻武器定妆照，多个角度，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "Futuristic sci-fi energy rifle reference sheet, multiple views in one image: front view, side view, angled view, same object in all views, sleek futuristic design with glowing blue energy core, clean lines, matte black finish with metallic accents, detailed engravings and control panels, professional product photography, clean white seamless background, even studio lighting, no harsh shadows, sharp focus on all details, 8K resolution, photorealistic",
      "style": "photorealistic product photography",
      "parameters": "--ar 16:9 --v 6.1 --s 250 --q 2",
      "negative": "text, watermark, signature, blurry, distorted, inconsistent proportions, different objects, hands, people, backgrounds, clutter",
      "video_ready": true
    }
  }
}
```

---

## Example 18: Background Plate (纯背景)

**Input:** "中世纪城堡大厅背景，纯背景，无人，用nano"

**Output:**

```json
{
  "platforms": ["nano-banana"],
  "prompts": {
    "nano-banana": {
      "type": "image",
      "prompt": "Medieval castle great hall, stone walls, high ceilings with wooden beams, large windows on left letting in warm sunlight, tapestries on walls, empty space in center, clear background, no people, no characters",
      "style": "photorealistic",
      "video_ready": true
    }
  }
}
```
