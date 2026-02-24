# Core Workflow

Complete workflow for generating image prompts.

## 0. Handle Vague or Short Input

If user input is too short (&lt;10 words) or unclear:

### Option A: Smart Enhancement (Recommended)

- Automatically add reasonable details (lighting, environment, mood)
- Use default cinematic photorealistic style
- Keep it natural, don't overcomplicate

**Example Enhancement:**

- Input: "一只猫"
- Enhanced: "一只可爱的橘猫在午后的阳光下，慵懒地躺在窗台上，毛发闪着金色的光泽"

### Option B: Clarify (Only if Truly Necessary)

- Ask user for more details only if the intent is completely ambiguous
- Prefer smart enhancement over clarification whenever possible

---

## 1. Understand User Input

First, read `input-guidelines.md` to understand user intent.

**Key Questions to Answer:**

- What is the main subject?
- What style does the user want?
- What platform(s) should be used?
- Are there any special requirements (image-to-video, aspect ratio, etc.)?
- Does user say "all platforms" or "所有平台"? If yes, generate for: default, midjourney, jimeng, nano-banana

**Detect Content Type:**

| Content Type                 | Keywords to Detect                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **People & Portraits**       | "人物", "人像", "肖像", "portrait", "face", "woman", "man", "girl", "boy", "fashion", "cosplay", "group photo"               |
| **Landscapes & Nature**      | "风景", "山水", "landscape", "nature", "mountain", "forest", "ocean", "sea", "sunset", "sunrise", "weather", "sky", "clouds" |
| **Animals & Pets**           | "动物", "宠物", "animal", "pet", "dog", "cat", "bird", "wildlife", "fantasy creature", "dragon"                              |
| **Products & Objects**       | "产品", "物品", "product", "object", "food", "car", "vehicle", "weapon", "prop", "still life"                                |
| **Architecture & Interiors** | "建筑", "室内", "architecture", "building", "house", "city", "room", "interior", "exterior"                                  |
| **Fantasy & Sci-Fi**         | "奇幻", "科幻", "fantasy", "sci-fi", "magic", "space", "cyberpunk", "alien", "robot"                                         |
| **Art Styles**               | "艺术", "风格", "anime", "oil painting", "watercolor", "digital art", "concept art", "noir", "comic", "cartoon"              |

**Check for Video Production Keywords:**

| Content Type                   | Keywords to Detect                                                      |
| ------------------------------ | ----------------------------------------------------------------------- |
| Character Portrait (定妆照)    | "定妆照", "character reference", "reference sheet", "front view"        |
| Character Turnaround (三视图)  | "三视图", "turnaround", "three views", "front side back"                |
| Scene Design (场景)            | "场景", "scene", "environment", "background plate"                      |
| Background Only (纯背景)       | "纯背景", "empty scene", "no people", "no characters"                   |
| Character + Scene (人物+场景)  | "人物+场景", "character + scene", "character in environment"            |
| Product Reference (产品定妆照) | "产品定妆照", "product reference", "prop reference", "weapon reference" |

**Check for Grid/宫格 Keywords:**

| Grid Type                 | Keywords to Detect                                  |
| ------------------------- | --------------------------------------------------- |
| **九宫格 (3x3, DEFAULT)** | "九宫格", "9宫格", "3x3", "nine grid", "grid image" |
| **2x2 宫格**              | "2x2", "2宫格", "二宫格", "四宫格", "four grid"     |
| **4x4 宫格**              | "4x4", "4宫格", "四宫格", "sixteen grid"            |
| **1x2 宫格**              | "1x2", "1行2列"                                     |
| **2x1 宫格**              | "2x1", "2行1列"                                     |
| **1x3 宫格**              | "1x3", "1行3列"                                     |
| **3x1 宫格**              | "3x1", "3行1列"                                     |
| **Custom Grid**           | "2行3列", "3行4列", "5x5", etc.                     |

**Check for Time-Segmented Grid Keywords:**

| Mode                  | Keywords to Detect                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Time-Segmented**    | "0-3秒", "1-3秒", "3-6秒", "时间分段", "time segments", "timed panels", "时长", "duration", "seconds", "0-1s", "1-2s", etc. |
| **Story Progression** | "剧情规划", "story beats", "narrative sequence", "progression of scenes" (DEFAULT if no time keywords)                      |

**Grid Detection Logic:**

1. If any grid/宫格 keywords detected:
   - Parse rows × columns from input
   - If NO dimensions specified → DEFAULT to **3x3 (九宫格)**
   - Record grid dimensions (e.g., "3x3", "2x2")

2. Check for time-segmented keywords:
   - If time keywords detected → Use **Time-Segmented Mode**
   - If NO time keywords detected → Use **Story Progression Mode (DEFAULT)**
   - Record the mode

3. For Time-Segmented Mode:
   - Parse duration from input (e.g., "9秒", "10 seconds")
   - If NO duration specified → Calculate based on grid size (3x3 = 9s, 2x2 = 4s, 4x4 = 16s)
   - Allocate equal time to each panel (1-1.5s per panel)
   - Format each panel as "Panel X (start-end): [description]"

4. For Story Progression Mode:
   - Structure panels by story beats (Setup → Development → Rising Action → Climax → Falling Action → Resolution → Epilogue → Closing)
   - Format each panel as "Panel X: [Story Beat] - [description]"

5. Add grid-specific keywords to prompt:
   - "multiple panels", "grid layout", "[ROWS]x[COLUMNS] grid"
   - "nine panels", "four panels", etc.
   - "consistent style across all panels", "same character in each panel"
   - "clean white borders between panels"
   - For time-segmented: "time-segmented", "timed panels"
   - For story progression: "story beats", "narrative sequence"

6. Set `"video_ready": true` in JSON output

If any of these keywords are detected:

- Read `references/image-to-video-prep.md` for specialized guidance
- Set `"video_ready": true in output

---

## 2. Detect Platform(s)

Detect platform from user input keywords:

| Platform   | Keywords                       |
| ---------- | ------------------------------ |
| Midjourney | "midjourney", "mj", "--ar"     |
| Jimeng     | "jimeng", "即梦", "剪映"       |
| NanoBanana | "nano", "banana", "nanobanana" |
| Kling      | "kling", "可灵" (video only)   |

**If NO platform detected:**

- Use `"default"` platform
- Generate universal, natural language prompt

**If MULTIPLE platforms detected:**

- Include all requested platforms in output

**Action:** Read corresponding `references/platform-{name}.md` for each detected platform.

---

## 3. Detect Style

Detect style from user input keywords. Read `style-reference.md` for complete list.

| Style               | Keywords                                      |
| ------------------- | --------------------------------------------- |
| Photorealistic      | "写实", "照片", "photorealistic", "realistic" |
| Cinematic           | "电影", "cinematic", "电影感", "movie"        |
| Anime               | "动漫", "anime", "卡通", "cartoon"            |
| Oil Painting        | "油画", "oil painting", "painting"            |
| Watercolor          | "水彩", "watercolor", "水墨"                  |
| Fantasy             | "奇幻", "fantasy", "魔幻"                     |
| Sci-Fi              | "科幻", "sci-fi", "cyberpunk", "赛博朋克"     |
| Chinese Traditional | "国画", "山水", "水墨画", "古风"              |

**Default Style:** If NO style specified, use **Cinematic Photorealistic**

---

## 4. Generate Prompt Content

### 4.1 Choose Template (Optional)

If appropriate, use templates from `assets/templates/`. Choose based on subject type:

| Subject Type                       | Template to Use              |
| ---------------------------------- | ---------------------------- |
| General purpose / unsure           | `base-template.md`           |
| Film-like, dramatic scenes         | `cinematic-template.md`      |
| Photography, realistic scenes      | `photorealistic-template.md` |
| Paintings, illustrations           | `artistic-template.md`       |
| People, faces, portraits           | `portrait-template.md`       |
| Nature, scenery, outdoors          | `landscape-template.md`      |
| Buildings, interiors, architecture | `architecture-template.md`   |
| Objects, items, products           | `product-template.md`        |
| Magic, mythical, fantasy           | `fantasy-template.md`        |
| Future, technology, sci-fi         | `sci-fi-template.md`         |

**How to use templates:**

1. Read the chosen template file
2. Follow its tier structure
3. Adapt to your specific subject and style
4. Adjust for target platform

### 4.2 Build Prompt Structure

**For Default Platform (Natural Language):**

- Read `cinematic-language.md` for guidance
- Use narrative, scene-based description
- Include: subject, environment, lighting, mood, composition

**For Midjourney:**

- Read `platform-midjourney.md`
- Use comma-separated keywords
- Subject first, style at end
- Add parameters: `--ar 16:9 --v 6.1 --s 250 --q 2`

**For Jimeng:**

- Read `platform-jimeng.md`
- Chinese-English hybrid
- Add Chinese keywords for traditional styles

**For NanoBanana:**

- Read `platform-nano-banana.md`
- Simple, 1-2 sentences
- Keep it minimal

### 4.3 Add Negative Prompts

Read `negative-prompts-library.md` for common exclusions.

**Always add:**

- `text, watermark, blurry, deformed` (English platforms)
- `水印, 文字, 模糊, 变形` (Chinese platforms)

---

## 5. Apply Image-to-Video Preparation

If user mentions "video", "animation", "image-to-video", or "适合做视频":

Read `image-to-video-prep.md` and apply:

1. Clear subject separation
2. Natural pose suitable for motion
3. Consistent lighting direction
4. Simple background (avoid overlapping elements)
5. Space around subject for movement

Set `"video_ready": true` in output.

---

## 6. Detect Parameters from Input

Look for these in user input:

**Aspect Ratio:**

- "16:9", "9:16", "2:3", "1:1", "21:9", "4:3"
- "wide", "landscape", "portrait", "square", "cinematic"

**Quality:**

- "8K", "4K", "high quality", "detailed"

**Style Strength:**

- "strong style", "subtle style"

---

## 7. Build JSON Output

Follow format from `output-examples.md`.

**Required Fields:**

```json
{
  "platforms": ["platform-name"],
  "prompts": {
    "platform-name": {
      "type": "image",
      "prompt": "optimized prompt text",
      "style": "detected-style"
    }
  }
}
```

**Optional Fields:**

- `"parameters"` - Platform-specific parameters
- `"negative"` - Negative prompt
- `"video_ready"` - true if optimized for video

---

## 8. Validate and Refine

### Basic Checks

- [ ] Platform detection correct
- [ ] Style detection correct
- [ ] Prompt follows platform guidelines
- [ ] Negative prompts included
- [ ] JSON format valid (see output-examples.md)
- [ ] No extra fields (no "elements" field)
- [ ] Platform names consistent (lowercase, hyphenated: midjourney, jimeng, nano-banana, default)

### Prompt Quality Checks

- [ ] Prompt is specific, not vague (avoid "beautiful", "nice")
- [ ] Includes lighting description
- [ ] Includes composition or mood
- [ ] Style is clear and consistent
- [ ] No contradictory elements
- [ ] Length appropriate for platform
  - Midjourney: 50-150 words
  - Jimeng: Chinese-English mix, 50-100 words
  - NanoBanana: 1-2 sentences, 20-50 words
  - Default: Narrative, 80-200 words

### Final Review

- Read the prompt aloud - does it paint a clear picture?
- Would you be able to visualize this scene?
- Is the tone consistent with the desired style?
