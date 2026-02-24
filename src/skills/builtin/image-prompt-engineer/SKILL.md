---
name: image-prompt-engineer
description: |
  Generate professional, platform-optimized AI image prompts with style detection, multi-platform support, and image-to-video preparation, including grid images for video generation. Also optimize user-provided prompts (shorten, enhance, adapt to platforms).
  Use when:
  - User needs AI image generation prompts
  - User provides existing prompts that need optimization
  - User specifies platform (Midjourney, Jimeng, NanoBanana)
  - User wants specific style (photorealistic, cinematic, anime, etc.)
  - User mentions image-to-video conversion needs
  - User wants character reference sheets, turnarounds, or scene plates
  - User wants grid images (九宫格, 3x3, 2x2, 4x4, etc.) for video generation
  - User wants portraits, landscapes, products, animals, architecture, fantasy, sci-fi, etc.
---

# Image Prompt Engineer

Professional, platform-optimized AI image prompt generator and optimizer.

## Quick Start

1. Read `references/input-guidelines.md` to understand user intent
2. Read `references/output-examples-quickstart.md` for JSON format and quick reference
3. Follow complete workflow in `references/core-workflow.md`
4. Load category-specific example files as needed (see Progressive Loading Strategy below)

---

## Progressive Loading Strategy (Critical - Read First)

### Core Principle

**Never load all reference files upfront.** Load only what's needed based on user input to minimize token consumption.

### Three-Layer Architecture

| Layer                          | What's Loaded                                       | When to Load                                      |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------- |
| **Layer 1 (Always Load)**      | SKILL.md (frontmatter + body)                       | Always available in context                       |
| **Layer 2 (Conditional Load)** | `output-examples-quickstart.md`, `core-workflow.md` | Load on first use of skill                        |
| **Layer 3 (On-Demand Only)**   | All other reference files                           | Load ONLY when user input triggers specific needs |

### Which Files to Load When?

| User Input Contains                                                      | Load These Files (in addition to Layer 2)                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Basic/simple prompt (default)                                            | `output-examples-basics.md`                                   |
| 定妆照、三视图、场景、视频制作                                           | `output-examples-video-production.md`, `video-prep-basics.md` |
| 宫格、九宫格、storyboard                                                 | `output-examples-grids.md`, `video-prep-grids.md`             |
| 时尚、团体、cosplay、风景、动物、产品、美食                              | `output-examples-categories.md`                               |
| 头像、PFP、图标、壁纸、海报、表情包                                      | `advanced-generation-guide.md`                                |
| 微距、鱼眼、移轴、长曝光、双重曝光、红外、HDR                            | `advanced-generation-guide.md`                                |
| 鸟瞰、虫视、荷兰角、过肩                                                 | `advanced-generation-guide.md`                                |
| 伦勃朗光、蝴蝶光、轮廓光、剪影、黄金时段、蓝色时段                       | `advanced-generation-guide.md`                                |
| 像素艺术、低多边形、蒸汽朋克、赛博朋克、新艺术、装饰艺术、浮世绘、蒸汽波 | `advanced-generation-guide.md`                                |
| 春、夏、秋、冬、雨、雪、雾                                               | `advanced-generation-guide.md`                                |
| 单色、双色调、复古、柔和、鲜艳/霓虹                                      | `advanced-generation-guide.md`                                |
| Need style guidance                                                      | `style-reference.md`, `cinematic-language.md`                 |
| Need negative prompts                                                    | `negative-prompts-library.md`                                 |
| Specific platform (midjourney/jimeng/nano)                               | Corresponding `platform-*.md`                                 |

### Smart Loading Guidelines

1. **Start Minimal:** Load only `output-examples-quickstart.md` + `core-workflow.md` initially
2. **Detect Needs:** Analyze user input to identify what category they're asking for
3. **Load Selectively:** Only load the specific example file(s) matching their needs
4. **Avoid Overload:** NEVER load all 5 output-example files at once
5. **Lazy Load:** Load platform/style guides only if explicitly needed

### Token-Saving Benefits

- Single example file: ~100-200 lines vs 850+ lines of original
- 70-80% token reduction on average
- Same functionality, smarter loading

## Two Main Modes

| Mode                         | Trigger                                                                                               | What to Do                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Generate New Prompt**      | User describes what they want ("a cat on a window")                                                   | Generate new optimized prompt from scratch                         |
| **Optimize Existing Prompt** | User provides a prompt ("a beautiful cat with amazing details 8K masterpiece trending on artstation") | Optimize the existing prompt (enhance, shorten, adapt to platform) |

---

## Core Workflow (Critical - Always Follow)

### Step 0: Detect Mode (Generate or Optimize)

First, determine if user is providing a prompt to optimize:

- **Optimize Mode:** If input contains adjectives like "beautiful", "amazing", "masterpiece", "trending on artstation", "8K", or looks like an existing prompt
- **Generate Mode:** All other cases (user describes what they want)

---

### Step 1: If Optimize Mode - Process User's Prompt

#### 1.1 Analyze the Prompt

| Issue                  | Detection                                                                   | Action                                                |
| ---------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Too Long**           | >200 words (Midjourney), >100 words (Jimeng), >50 words (NanoBanana)        | Shorten, remove fluff, keep only essential elements   |
| **Too Short**          | <20 words                                                                   | Enhance: add lighting, environment, mood, composition |
| **Bad Adjectives**     | "beautiful", "amazing", "stunning", "masterpiece", "trending on artstation" | Replace with specific descriptions                    |
| **Technical Overload** | "35mm lens f/1.8 ISO 100", excessive specs                                  | Simplify, keep only relevant specs                    |
| **Platform-Specific**  | Contains "--ar", platform-specific keywords                                 | Adapt to target platform or remove if wrong platform  |

#### 1.2 Platform Length Guidelines

| Platform       | Ideal Length | Max Length |
| -------------- | ------------ | ---------- |
| **Midjourney** | 50-150 words | 200 words  |
| **Jimeng**     | 50-100 words | 150 words  |
| **NanoBanana** | 20-50 words  | 80 words   |
| **Default**    | 80-200 words | 300 words  |

#### 1.3 What to Keep When Optimizing

- ✅ **Subject:** What is it? (cat, woman, mountain)
- ✅ **Action:** What is it doing? (sitting, walking, standing)
- ✅ **Environment:** Where is it? (window, forest, city)
- ✅ **Lighting:** How is it lit? (sunset, neon, studio)
- ✅ **Mood:** What's the feeling? (peaceful, dramatic, mysterious)
- ✅ **Style:** Art style? (photorealistic, anime, oil painting)

#### 1.4 What to Remove When Optimizing

- ❌ Vague adjectives: "beautiful", "amazing", "stunning"
- ❌ Hype words: "masterpiece", "trending on artstation"
- ❌ Over-specs: "8K", "4K", "highly detailed" (unless platform-specific)
- ❌ Contradictions: "photorealistic cartoon"
- ❌ Platform-specific params for wrong platform

#### 1.5 Example Optimization

**Before (Bad):**

```
"Make me a beautiful picture of a cat with amazing details and stunning quality, masterpiece, 8K, trending on artstation"
```

**After (Optimized):**

```
"Orange tabby cat sitting on windowsill, afternoon sunlight streaming in, soft fur texture, peaceful atmosphere, photorealistic"
```

---

### Step 2: If Generate Mode - Detect Content Type

First, identify what the user wants to generate:

| Content Type                 | Keywords                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **People & Portraits**       | 人物, 人像, 肖像, portrait, face, woman, man, girl, boy, fashion, cosplay, group                                                                           |
| **Landscapes & Nature**      | 风景, 山水, landscape, nature, mountain, forest, ocean, sunset, sunrise, weather                                                                           |
| **Animals & Pets**           | 动物, 宠物, animal, pet, dog, cat, bird, wildlife, dragon                                                                                                  |
| **Products & Objects**       | 产品, 物品, product, object, food, car, vehicle, weapon, prop                                                                                              |
| **Architecture & Interiors** | 建筑, 室内, architecture, building, house, city, room, interior                                                                                            |
| **Fantasy & Sci-Fi**         | 奇幻, 科幻, fantasy, sci-fi, magic, space, cyberpunk, alien, robot                                                                                         |
| **Special Types**            | 头像, PFP, avatar, icon, UI, 壁纸, wallpaper, poster, cover, 表情包, emoji, sticker                                                                        |
| **Photo Techniques**         | 微距, macro, 鱼眼, fisheye, 移轴, tilt-shift, 长曝光, long exposure, 双重曝光, double exposure, 红外, infrared, HDR                                        |
| **Perspectives**             | 鸟瞰, aerial, drone, 虫视, worm's eye, 荷兰角, dutch angle, 过肩, over-the-shoulder                                                                        |
| **Lighting**                 | 伦勃朗光, Rembrandt, 蝴蝶光, butterfly, 轮廓光, rim, 剪影, silhouette, 黄金时段, golden hour, 蓝色时段, blue hour                                          |
| **Art Styles Extended**      | 像素, pixel art, 低多边形, low poly, 蒸汽朋克, steampunk, 赛博朋克, cyberpunk, 新艺术, art nouveau, 装饰艺术, art deco, 浮世绘, ukiyo-e, 蒸汽波, vaporwave |
| **Season/Weather**           | 春 spring, 夏 summer, 秋 autumn, 冬 winter, 雨 rain, 雪 snow, 雾 fog                                                                                       |
| **Color Schemes**            | 单色, monochromatic, 双色调, duotone, 复古, vintage, 柔和, pastel, 鲜艳, vibrant, neon                                                                     |

---

### Step 3: Detect Platform(s)

| Platform       | Keywords                 | Default Behavior                                       |
| -------------- | ------------------------ | ------------------------------------------------------ |
| **Midjourney** | midjourney, mj, --ar     | Use comma-separated keywords, add --ar --v 6.1 --s 250 |
| **Jimeng**     | jimeng, 即梦, 剪映       | Chinese-English hybrid                                 |
| **NanoBanana** | nano, banana, nanobanana | Simple, 1-2 sentences                                  |
| **Default**    | (no platform)            | Natural language narrative                             |

**If user says "all platforms" or "所有平台":** Generate for: default, midjourney, jimeng, nano-banana

---

### Step 4: Detect Style

| Style               | Keywords                          | Default if none: **cinematic photorealistic** |
| ------------------- | --------------------------------- | --------------------------------------------- |
| Photorealistic      | 写实, 照片, photorealistic, photo |
| Cinematic           | 电影, cinematic, 电影感, movie    |
| Anime               | 动漫, anime, manga, 卡通, cartoon |
| Oil Painting        | 油画, oil painting                |
| Watercolor          | 水彩, watercolor, 水墨            |
| Fantasy             | 奇幻, fantasy, 魔幻               |
| Sci-Fi              | 科幻, sci-fi, cyberpunk, 赛博朋克 |
| Chinese Traditional | 国画, 山水, 水墨画, 古风          |

---

### Step 5: Check for Video Production Keywords

| Type       | Keywords                                     | Action                                           |
| ---------- | -------------------------------------------- | ------------------------------------------------ |
| 定妆照     | 定妆照, character reference, reference sheet | Read video-prep-basics.md, set video_ready: true |
| 三视图     | 三视图, turnaround, three views              | Read video-prep-basics.md, set video_ready: true |
| 场景       | 场景, scene, environment                     | Read video-prep-basics.md, set video_ready: true |
| 纯背景     | 纯背景, background plate                     | Read video-prep-basics.md, set video_ready: true |
| 人物+场景  | 人物+场景, character + scene                 | Read video-prep-basics.md, set video_ready: true |
| 产品定妆照 | 产品定妆照, product reference                | Read video-prep-basics.md, set video_ready: true |

---

### Step 6: Check for Grid/宫格 Keywords

#### Grid Dimensions

| Grid Type             | Keywords                         | Default if none: **3×3 (九宫格)** |
| --------------------- | -------------------------------- | --------------------------------- |
| 九宫格                | 九宫格, 9宫格, 3x3, nine grid    |                                   |
| 2×2                   | 2x2, 2宫格, 二宫格, four grid    |                                   |
| 4×4                   | 4x4, 4宫格, 四宫格, sixteen grid |                                   |
| 1×2 / 2×1 / 1×3 / 3×1 | 1x2, 2x1, 1x3, 3x1, 1行2列       |                                   |
| Custom                | 2行3列, 3行4列, 5x5              |                                   |

#### Grid Mode

| Mode                             | Keywords                                                 | Default if no time keywords: **Story Progression** |
| -------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| **Time-Segmented (按时间分段)**  | 0-3秒, 1-3秒, 时间分段, time segments, duration, seconds | Format: "Panel X (start-end): [description]"       |
| **Story Progression (剧情规划)** | 剧情规划, story beats, (no time keywords)                | Format: "Panel X: [Beat] - [description]"          |

**Always set `video_ready: true` for grids.**

**For grid images, read `video-prep-grids.md` for detailed guidelines.**

---

### Step 6.5: Check for Advanced Generation Keywords

Detect these advanced keywords and load `advanced-generation-guide.md` for detailed guidance:

| Category           | Keywords to Detect                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Special Types**  | 头像, PFP, avatar, icon, UI, 壁纸, wallpaper, poster, cover, 表情包, emoji, sticker                                                                        |
| **Photo Tech**     | 微距, macro, 鱼眼, fisheye, 移轴, tilt-shift, 长曝光, long exposure, 双重曝光, double exposure, 红外, infrared, HDR                                        |
| **Perspective**    | 鸟瞰, aerial, drone, 虫视, worm's eye, 荷兰角, dutch angle, 过肩, over-the-shoulder                                                                        |
| **Lighting**       | 伦勃朗光, Rembrandt, 蝴蝶光, butterfly, 轮廓光, rim, 剪影, silhouette, 黄金时段, golden hour, 蓝色时段, blue hour                                          |
| **Art Styles**     | 像素, pixel art, 低多边形, low poly, 蒸汽朋克, steampunk, 赛博朋克, cyberpunk, 新艺术, art nouveau, 装饰艺术, art deco, 浮世绘, ukiyo-e, 蒸汽波, vaporwave |
| **Season/Weather** | 春 spring, 夏 summer, 秋 autumn, 冬 winter, 雨 rain, 雪 snow, 雾 fog                                                                                       |
| **Color**          | 单色, monochromatic, 双色调, duotone, 复古, vintage, 柔和, pastel, 鲜艳, vibrant, neon                                                                     |

---

### Step 7: Handle Vague/Short Input

If input &lt;10 words or unclear:

- **Smart Enhancement (Recommended):** Automatically add lighting, environment, mood
- Example: "一只猫" → "一只可爱的橘猫在午后的阳光下，慵懒地躺在窗台上"
- Use default cinematic photorealistic style

---

### Step 8: Generate Prompts & Output JSON

## Output Format (MUST Follow Exactly)

```json
{
  "platforms": ["platform-name"],
  "prompts": {
    "platform-name": {
      "type": "image",
      "prompt": "optimized prompt text here",
      "style": "detected-style",
      "parameters": "--ar 16:9 --v 6.1 --s 250",
      "negative": "text, watermark, blurry, deformed",
      "video_ready": true
    }
  }
}
```

**Required Fields:**

- `platforms`: Array (lowercase, hyphenated: `midjourney`, `jimeng`, `nano-banana`, `default`)
- `type`: Always `"image"`
- `prompt`: Required - the actual prompt
- `style`: Required - detected or default

**Optional Fields:**

- `parameters`: Platform-specific
- `negative`: Negative prompt
- `video_ready`: boolean (for video-ready content)

**DO NOT include:**

- `elements` field or any extra fields

---

## Common Use Cases Covered

| Category                     | Examples                                                                |
| ---------------------------- | ----------------------------------------------------------------------- |
| **People & Portraits**       | Headshots, full body, groups, fashion, cosplay                          |
| **Landscapes & Nature**      | Mountains, forests, oceans, sunsets, weather                            |
| **Animals & Pets**           | Dogs, cats, wildlife, fantasy creatures                                 |
| **Products & Objects**       | Product shots, props, food, vehicles                                    |
| **Architecture & Interiors** | Buildings, rooms, cities, interiors                                     |
| **Fantasy & Sci-Fi**         | Magic, space, cyberpunk, dragons, aliens                                |
| **Art Styles**               | Anime, oil painting, watercolor, digital art, noir + 8+ extended styles |
| **Video Production**         | Character sheets, turnarounds, scene plates, grids                      |
| **Grid/Storyboards**         | 3×3九宫格, 2×2, 4×4, time-segmented or story progression                |
| **Special Types**            | Avatars, icons, wallpapers, posters, emojis/stickers                    |
| **Photo Techniques**         | Macro, fisheye, tilt-shift, long exposure, double exposure, HDR         |
| **Advanced Lighting**        | Rembrandt, butterfly, rim, silhouette, golden/blue hour                 |
| **Perspectives**             | Aerial, worm's eye, dutch angle, over-the-shoulder                      |
| **Season/Weather**           | Spring, summer, autumn, winter, rain, snow, fog                         |
| **Color Schemes**            | Monochromatic, duotone, vintage, pastel, vibrant/neon                   |
| **Prompt Optimization**      | Shorten too-long prompts, enhance too-short prompts, adapt to platforms |

---

## References (Load As Needed For More Detail - Follow Progressive Loading)

### Core Workflow

- `references/core-workflow.md` - Complete step-by-step workflow

### Output Examples (Load Category-Specific Only)

- `references/output-examples-quickstart.md` - Quick reference + JSON structure (ALWAYS LOAD FIRST)
- `references/output-examples-basics.md` - Examples 1-12 (Basic usage)
- `references/output-examples-video-production.md` - Examples 13-18 (Video prep: 定妆照、三视图、场景)
- `references/output-examples-grids.md` - Examples 19-26 (宫格: 按时间分段 + 剧情规划)
- `references/output-examples-categories.md` - Examples 27-34 (时尚、团体、cosplay、风景、动物、产品、美食)

### Video Production Guides (Split for Progressive Loading)

- `references/video-prep-basics.md` - Video prep fundamentals (定妆照、三视图、场景、纯背景等)
- `references/video-prep-grids.md` - Grid/宫格 specific guidelines

### Advanced Generation Guide

- `references/advanced-generation-guide.md` - Special types, photo techniques, perspectives, lighting, extended styles, color schemes, season/weather

### Specialized Guides

- `references/style-reference.md` - Style detection and 10+ style guides
- `references/cinematic-language.md` - Natural language prompt guidance
- `references/negative-prompts-library.md` - Common exclusions
- `references/platform-midjourney.md` - Midjourney guide
- `references/platform-jimeng.md` - Jimeng guide
- `references/platform-nano-banana.md` - NanoBanana guide
- `references/extension-guide.md` - Add new platforms
- `assets/templates/` - 10 prompt templates
