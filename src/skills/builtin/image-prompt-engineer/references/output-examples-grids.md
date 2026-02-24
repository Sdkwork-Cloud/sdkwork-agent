# Output Examples - Grids (Examples 19-26)

Grid images (宫格) for video generation - both time-segmented and story progression.

---

## Example 19: 3×3 Time-Segmented Grid (九宫格, 按时间分段)

**Input:** "女战士九宫格，0-9秒，按时间分段，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "3x3 storyboard grid, nine panels, time-segmented, 9 seconds total, Panel 1 (0-1s): Female warrior standing at castle gate, dawn light, holding sword at side, Panel 2 (1-2s): Castle gate opens, warrior's eyes widen with determination, Panel 3 (2-3s): Warrior draws sword from sheath, metal glinting in sunlight, Panel 4 (3-4s): Warrior charges forward, battle cry, enemies visible in distance, Panel 5 (4-5s): Warrior clashes with enemy leader, swords sparking, Panel 6 (5-6s): Warrior dodges enemy strike, counterattacking, Panel 7 (6-7s): Enemy leader defeated, warrior standing victorious, Panel 8 (7-8s): Warrior kneels, exhausted but triumphant, sunrise behind, Panel 9 (8-9s): Warrior looks toward horizon, hope in her eyes, consistent style across all panels, same character, same costume, same lighting, clean white borders between panels, professional storyboard, cinematic photorealistic",
      "style": "cinematic photorealistic",
      "parameters": "--ar 1:1 --v 6.1 --s 750 --q 2",
      "negative": "text, watermark, signature, blurry, deformed, bad anatomy, extra limbs, inconsistent styles, different characters, overlapping panels, bleeding between panels, panel size variation, text in panels",
      "video_ready": true
    }
  }
}
```

---

## Example 20: 2×2 Time-Segmented Grid (2×2宫格, 按时间分段)

**Input:** "2x2宫格，猫咪扑鸟，4秒，按时间分段，用即梦"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "prompts": {
    "jimeng": {
      "type": "image",
      "prompt": "2x2 grid layout, four panels, time-segmented, 4 seconds total, Panel 1 (0-1s): Orange tabby cat sitting on windowsill, watching birds outside, ears forward, Panel 2 (1-2s): Cat's ears perk up, eyes widen with excitement, body tenses, Panel 3 (2-3s): Cat crouches low, hind legs ready to pounce, tail twitching, Panel 4 (3-4s): Cat leaps toward window, paws outstretched, mid-air, consistent style across all panels, same cat, same room, clean white borders between panels, cute and adorable, photorealistic",
      "style": "photorealistic",
      "negative": "水印, 文字, 模糊, 变形, 不一致的风格, 不同的猫, 重叠的宫格, 宫格之间颜色渗透",
      "video_ready": true
    }
  }
}
```

---

## Example 21: 4×4 Time-Segmented Grid (4×4宫格, 按时间分段)

**Input:** "4x4故事板宫格，16秒，角色冒险，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "4x4 storyboard grid, sixteen panels, time-segmented, 16 seconds total, Panel 1 (0-1s): Young adventurer wakes up in mysterious forest, confused, Panel 2 (1-2s): Adventurer stands up, looks around at ancient trees, Panel 3 (2-3s): Adventurer finds glowing crystal on ground, Panel 4 (3-4s): Adventurer picks up crystal, it pulses with blue light, Panel 5 (4-5s): Hidden forest path appears before adventurer, Panel 6 (5-6s): Adventurer starts walking down the magical path, Panel 7 (6-7s): Adventurer encounters friendly forest creatures, Panel 8 (7-8s): Adventurer smiles and befriends the creatures, Panel 9 (8-9s): Creatures lead adventurer to ancient temple, Panel 10 (9-10s): Adventurer enters the mysterious temple, Panel 11 (10-11s): Adventurer solves ancient stone puzzle, Panel 12 (11-12s): Temple door opens revealing golden treasure, Panel 13 (12-13s): Adventurer collects the ancient treasure, Panel 14 (13-14s): Adventurer exits temple, waving goodbye to creatures, Panel 15 (14-15s): Adventurer walks toward sunset, mission complete, Panel 16 (15-16s): Adventurer disappears into golden horizon, consistent style across all panels, same character, same costume, clean white borders between panels, fantasy illustration style, highly detailed",
      "style": "fantasy illustration",
      "parameters": "--ar 16:9 --v 6.1 --s 750 --q 2",
      "negative": "text, watermark, signature, blurry, deformed, bad anatomy, inconsistent character design, different characters, overlapping panels, bleeding between panels, text in panels",
      "video_ready": true
    }
  }
}
```

---

## Example 22: 1×3 Time-Segmented Grid (1×3宫格, 按时间分段)

**Input:** "1行3列宫格，日出过程，3秒，用nano"

**Output:**

```json
{
  "platforms": ["nano-banana"],
  "prompts": {
    "nano-banana": {
      "type": "image",
      "prompt": "1x3 grid layout, three panels, time-segmented, 3 seconds total, Panel 1 (0-1s): Mountain landscape before dawn, dark sky with faint stars, Panel 2 (1-2s): First light of sunrise, pink and orange hues on horizon, Panel 3 (2-3s): Sun fully risen, golden light over mountains, consistent style across all panels, same landscape, clean white borders between panels, landscape photography",
      "style": "photorealistic",
      "negative": "ugly, deformed, blurry, inconsistent styles, overlapping panels",
      "video_ready": true
    }
  }
}
```

---

## Example 23: 3×3 Story Progression Grid (九宫格, 剧情规划)

**Input:** "女战士九宫格，剧情规划，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "3x3 storyboard grid, nine panels, story progression, Panel 1: Setup - Female warrior standing at castle gate, dawn light, holding sword at side, Panel 2: Development - Castle gate opens, warrior's eyes widen with determination, Panel 3: Rising Action - Warrior draws sword, charges forward into battle, Panel 4: Climax Prep - Warrior faces enemy leader, both ready to strike, Panel 5: Climax - Epic sword fight, sparks flying, intense action, Panel 6: Falling Action - Enemy leader defeated, warrior stands victorious, Panel 7: Resolution - Warrior kneels, exhausted but triumphant, Panel 8: Epilogue - Sun rises over battlefield, peace restored, Panel 9: Closing - Warrior looks toward horizon, hope in her eyes, consistent style across all panels, same character, same costume, clean white borders between panels, professional storyboard, cinematic photorealistic",
      "style": "cinematic photorealistic",
      "parameters": "--ar 1:1 --v 6.1 --s 750 --q 2",
      "negative": "text, watermark, signature, blurry, deformed, bad anatomy, extra limbs, inconsistent styles, different characters, overlapping panels, bleeding between panels, panel size variation, text in panels",
      "video_ready": true
    }
  }
}
```

---

## Example 24: 2×2 Story Progression Grid (2×2宫格, 剧情规划)

**Input:** "2x2宫格，咖啡制作过程，用即梦"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "prompts": {
    "jimeng": {
      "type": "image",
      "prompt": "2x2 grid layout, four panels, story progression, Panel 1: Setup - Fresh coffee beans and grinder on clean counter, Panel 2: Development - Grinding coffee beans, aromatic powder falling, Panel 3: Climax - Pouring hot water over coffee grounds, golden crema forming, Panel 4: Resolution - Perfect cup of coffee with steam rising, ready to drink, consistent style across all panels, same kitchen setting, clean white borders between panels, warm cozy atmosphere, photorealistic",
      "style": "photorealistic",
      "negative": "水印, 文字, 模糊, 变形, 不一致的风格, 重叠的宫格, 宫格之间颜色渗透",
      "video_ready": true
    }
  }
}
```

---

## Example 25: 4×4 Story Progression Grid (4×4宫格, 剧情规划)

**Input:** "4x4故事板宫格，侦探破案，剧情规划，用midjourney"

**Output:**

```json
{
  "platforms": ["midjourney"],
  "prompts": {
    "midjourney": {
      "type": "image",
      "prompt": "4x4 storyboard grid, sixteen panels, story progression, Panel 1: Setup - Detective arrives at crime scene, rainy night, Panel 2: Development - Detective examines clues with magnifying glass, Panel 3: Rising Action - Detective finds mysterious letter, Panel 4: Climax Prep - Detective interviews suspect, tense confrontation, Panel 5: Climax - Detective discovers hidden evidence in old bookstore, Panel 6: Falling Action - Detective connects all clues, realization dawns, Panel 7: Resolution - Detective confronts real culprit, truth revealed, Panel 8: Epilogue - Culprit arrested, justice served, Panel 9: Detective returns to office, case files closed, Panel 10: Detective looks out window at city lights, Panel 11: New case file arrives on desk, Panel 12: Detective smirks, ready for next challenge, Panel 13: Detective packs briefcase, Panel 14: Detective walks into new crime scene, Panel 15: Detective examines first clue, Panel 16: Closing - Detective's silhouette against city skyline, consistent style across all panels, same character, film noir style, clean white borders between panels, highly detailed",
      "style": "film noir",
      "parameters": "--ar 16:9 --v 6.1 --s 750 --q 2",
      "negative": "text, watermark, signature, blurry, deformed, bad anatomy, inconsistent character design, different characters, overlapping panels, bleeding between panels, text in panels",
      "video_ready": true
    }
  }
}
```

---

## Example 26: 3×1 Story Progression Grid (3×1宫格, 剧情规划)

**Input:** "3行1列宫格，花朵开放，剧情规划，用nano"

**Output:**

```json
{
  "platforms": ["nano-banana"],
  "prompts": {
    "nano-banana": {
      "type": "image",
      "prompt": "3x1 grid layout, three panels, story progression, Panel 1: Setup - Tight flower bud, green stem, early morning, Panel 2: Development - Flower beginning to open, petals unfurling, Panel 3: Resolution - Fully bloomed flower, beautiful petals in full glory, consistent style across all panels, same flower, clean white borders between panels, nature photography",
      "style": "photorealistic",
      "negative": "ugly, deformed, blurry, inconsistent styles, overlapping panels",
      "video_ready": true
    }
  }
}
```
