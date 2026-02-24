---
name: video-prompt-engineer
description: |
  Professional video prompt generator and optimizer for multi-platform AI video generation.
  Supports:
  - Text-to-video (文生视频)
  - Image-to-video (图生视频)
  - First/last frame generation (首尾帧)
  - Reference image guided generation (参考图)
  - Intelligent multi-frame generation (智能多帧/分镜)
  - Universal reference (图片、视频、音频)
  - Multi-platform support (可灵, Vidu, 即梦, Sora, Google, Runway, Pika, etc.)

  Use when:
  - User wants AI video generation prompts
  - User provides images/videos/audio for reference
  - User specifies platform (Kling, Vidu, Jimeng, Sora, Google, Runway, Pika)
  - User wants storyboard or multi-frame video
  - User wants first/last frame control
  - User wants to optimize existing video prompts
---

# Video Prompt Engineer

Professional, platform-optimized AI video prompt generator and optimizer.

---

## Quick Start

1. Read `references/input-guidelines.md` to understand user intent
2. Read `references/output-examples-quickstart.md` for correct JSON format
3. Follow complete workflow in `references/core-workflow.md`
4. Load category-specific files as needed (see Progressive Loading Strategy below)

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

---

### Which Files to Load When?

| User Input Contains                          | Load These Files (in addition to Layer 2)                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Basic text-to-video                          | `output-examples-basics.md`                                                                         |
| Image-to-video, @图片, 图生视频              | `output-examples-image-to-video.md`, `image-to-video-guide.md`                                      |
| 首尾帧, first/last frame                     | `output-examples-frames.md`, `frame-control-guide.md`                                               |
| 多帧, 分镜, storyboard, multi-frame          | `output-examples-multi-frame.md`, `multi-frame-guide.md`                                            |
| 参考视频, 音频, reference video/audio        | `output-examples-universal.md`, `universal-reference-guide.md`                                      |
| **全能智能参考, 多模态, 12份参考**           | `output-examples-universal-reference.md`, `product-architecture.md`, `universal-reference-guide.md` |
| **对话, 情感, 说话, 对白, 台词, 口型, 配音** | `output-examples-dialogue-emotion.md`, `dialogue-emotion-guide.md`                                  |
| 可灵, Kling                                  | `platform-kling.md`                                                                                 |
| Vidu, 维度                                   | `platform-vidu.md`                                                                                  |
| 即梦, Jimeng, Seedance 2.0                   | `platform-jimeng.md`                                                                                |
| Sora                                         | `platform-sora.md`                                                                                  |
| Google, Veo                                  | `platform-google.md`                                                                                |
| Runway                                       | `platform-runway.md`                                                                                |
| Pika                                         | `platform-pika.md`                                                                                  |
| Need style guidance                          | `style-reference.md`, `cinematic-language.md`                                                       |
| Need negative prompts                        | `negative-prompts-library.md`                                                                       |

---

### Smart Loading Guidelines

1. **Start Minimal:** Load only `output-examples-quickstart.md` + `core-workflow.md` initially
2. **Detect Needs:** Analyze user input to identify what category they're asking for
3. **Load Selectively:** Only load the specific file(s) matching their needs
4. **Avoid Overload:** NEVER load all files at once
5. **Lazy Load:** Load platform/style guides only if explicitly needed

---

## Generation Modes

| Mode                                | Trigger                                                                                                                                                                                                                               | What to Do                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Text-to-Video (文生视频)**        | User provides text description only                                                                                                                                                                                                   | Generate video prompt from text                                                                 |
| **Image-to-Video (图生视频)**       | User provides image(s) or mentions "@图片"                                                                                                                                                                                            | Use image as reference for video generation                                                     |
| **Frame Control (首尾帧)**          | User mentions "first frame", "last frame", "首尾帧"                                                                                                                                                                                   | Generate prompts for first and last frames with smooth transition                               |
| **Multi-Frame (智能多帧/分镜)**     | User provides multiple images with time labels or mentions "分镜", "storyboard"                                                                                                                                                       | Generate multi-frame video with time-coded prompts                                              |
| **Universal Reference (全能参考)**  | User provides video/audio or mentions "参考视频", "参考音频"                                                                                                                                                                          | Support multi-modal reference inputs                                                            |
| **全能智能参考 (Seedance 2.0)**     | User mentions "全能", "多模态", "12份参考", "Seedance", "角色零突变", "音画同步"                                                                                                                                                      | Use VIDEO_UNIVERSAL product type with multi-modal assets                                        |
| **Dialogue & Emotion (对白与情感)** | User mentions "对话", "说话", "对白", "台词", "情感", "表情", "情绪", "配音", "声音", "音色", "口型", "同步", "方言", "口音", "歌声", "唱歌", "外部配音", "elevenlabs", "polly", "synchronization", "lip sync", "dialogue", "emotion" | Add dialogue, emotion, lip sync with platform-specific strategy, support external dubbing tools |
| **Prompt Optimization**             | User provides an existing video prompt                                                                                                                                                                                                | Optimize and adapt to target platform                                                           |

---

## Core Workflow (Critical - Always Follow)

### Step 0: Detect Mode

First, determine what mode user is requesting:

| Mode                    | Detection Keywords                                                                                                                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **全能智能参考**        | "全能", "多模态", "12份参考", "Seedance", "角色零突变", "音画同步", "自分镜", "自运镜"                                                                                                                                  |
| **Dialogue & Emotion**  | "对话", "说话", "对白", "台词", "情感", "表情", "情绪", "配音", "声音", "音色", "口型", "同步", "方言", "口音", "歌声", "唱歌", "外部配音", "elevenlabs", "polly", "synchronization", "lip sync", "dialogue", "emotion" |
| **Text-to-Video**       | User provides text only, no images/videos/audio                                                                                                                                                                         |
| **Image-to-Video**      | "@图片", "图生视频", "image to video", user provides image reference                                                                                                                                                    |
| **Frame Control**       | "首尾帧", "first frame", "last frame", "start/end"                                                                                                                                                                      |
| **Multi-Frame**         | "分镜", "storyboard", "多帧", "multi-frame", user provides multiple time-labeled images                                                                                                                                 |
| **Universal Reference** | "@视频", "参考视频", "参考音频", "reference video", "reference audio"                                                                                                                                                   |
| **Optimize**            | User provides what looks like an existing video prompt                                                                                                                                                                  |

---

### Step 1: Detect Platform(s)

| Platform          | Keywords                  | Default Behavior                     |
| ----------------- | ------------------------- | ------------------------------------ |
| **可灵 (Kling)**  | 可灵, kling, KlingAI      | Chinese focus, strong motion control |
| **Vidu (维度)**   | vidu, 维度, ViduAI        | High quality, cinematic              |
| **即梦 (Jimeng)** | 即梦, jimeng, 剪映        | Seamless with CapCut, stable         |
| **Sora**          | sora, openai sora         | OpenAI, long videos, high coherence  |
| **Google (Veo)**  | google, veo, gemini video | Google, consistent characters        |
| **Runway**        | runway, runwayml          | Professional tools, Gen-3            |
| **Pika**          | pika, pikapika            | Easy to use, creative                |
| **Default**       | (no platform)             | Balanced, multi-platform compatible  |

**重要规则：**

- **没有指定平台时：** 只返回 `["default"]`，不要返回所有平台
- **用户明确说 "all platforms" 或 "所有平台" 时：** 才返回所有平台 `["kling", "vidu", "jimeng", "sora", "google", "runway", "pika"]`
- **用户指定单个平台时：** 只返回该单个平台

---

### Step 2: Detect Video Parameters

| Parameter         | Detection                                                      | Default                      |
| ----------------- | -------------------------------------------------------------- | ---------------------------- |
| **Duration**      | "5秒", "10 seconds", "30s"                                     | 5-10 seconds                 |
| **Aspect Ratio**  | "16:9", "9:16", "1:1", "21:9"                                  | 16:9                         |
| **Resolution**    | "720p", "1080p", "4K"                                          | 1080p                        |
| **FPS**           | "24fps", "30fps", "60fps"                                      | 24fps (cinematic) or 30fps   |
| **Camera Motion** | "推镜头", "zoom in", "pan", "tracking", "dolly"                | Natural/smooth camera motion |
| **Style**         | "电影", "动漫", "写实", "cinematic", "anime", "photorealistic" | Cinematic photorealistic     |

---

### Step 3: Detect Generation Type

#### Text-to-Video (文生视频)

**⚠️ 重要规则：所有文生视频的 prompt 都必须明确包含风格说明！**

Focus on:

- Scene description
- Character actions
- Camera movement
- Lighting and mood
- Duration and pacing
- **EXPLICIT STYLE INSTRUCTION (必须明确包含风格描述)** - e.g., "电影级写实风格", "动漫风格", "奇幻风格"

**正确示例（包含风格）：**

- "一只猫在窗台上，电影级写实风格"
- "樱花飘落，动漫风格"
- "魔法森林，奇幻风格"

**错误示例（缺少风格）：**

- "一只猫在窗台上" ❌
- "樱花飘落" ❌
- "魔法森林" ❌

#### Image-to-Video (图生视频)

Focus on:

- Maintaining consistency with reference image
- Adding natural motion
- Camera movement around subject
- Smooth transitions

#### Frame Control (首尾帧)

Focus on:

- Clear start and end states
- Smooth interpolation between frames
- Consistent character/scene
- Logical motion arc

#### Multi-Frame (智能多帧/分镜)

Focus on:

- Each frame has time label: "0-2s: [description]", "2-4s: [description]"
- Consistent style and characters across all frames
- Smooth transitions between frames
- Logical story progression

#### Universal Reference (全能参考 / 即梦 Seedance 2.0)

**即梦 Seedance 2.0 两种入口模式：**

| 入口类型     | Product           | 触发条件                  |
| ------------ | ----------------- | ------------------------- |
| 首尾帧入口   | `VIDEO_FRAME`     | 只有首帧/尾帧 + 文本      |
| 全能参考入口 | `VIDEO_UNIVERSAL` | 图+视频+音频+文本任意组合 |

**注意：** 智能多帧和主体参考在 Seedance 2.0 中无法选中。

**@标识符 语法（即梦 Seedance 2.0 标准规范）：**

使用简单的标识符，明确说明每个素材的用途：

```
@图片1 作为首帧，@视频1 参考镜头语言，@音频1 用于配乐
```

**标识符命名规范：**

- 图片：`@图片1`、`@图片2`、`@图片3`...
- 视频：`@视频1`、`@视频2`、`@视频3`...
- 音频：`@音频1`、`@音频2`、`@音频3`...
- 文本：`@文本1`、`@文本2`、`@文本3`...

**用途说明示例：**

- `作为首帧`、`作为男主角`、`作为场景`
- `参考打斗动作`、`参考镜头语言`、`参考运镜`
- `用于配乐`、`作为背景音乐`
- `作为剧本`、`作为剧情描述`

**示例：**

- `@图片1 作为首帧，@视频1 参考打斗动作
- `@图片1 作为男主角，@图片2 作为场景，@音频1 用于配乐
- `@视频1 作为参考，生成一个类似的视频`
- `将@视频1 延长5s，生成更完整的场景`

**可参考万物：**

- 动作、特效、形式、运镜、人物、场景、声音
- 用自然语言描述你想要的画面和动作，明确是参考，还是编辑

**特殊使用方式：**

1. 有首帧/尾帧图 + 想参考视频动作：`@图片1 作为首帧，参考@视频1 的打斗动作`
2. 延长已有视频：`将@视频1 延长5s`（生成长度选新增部分时长）
3. 融合多个视频：`我要在@视频1 和@视频2 之间加一个场景`
4. 无音频素材：直接参考视频里的声音
5. 连续动作：`角色从跳跃直接过渡到翻滚，保持动作连贯流畅。@图片1 @图片2 @图片3`

**重要提示：**

- 素材多的时候，建议多检查一下各个 @对象有没有标清楚
- 别把图、视频、角色搞混了
- 不要使用文件名作为标识符，应该用 @图片1、@视频1 等简单标识符

---

### Step 4: Handle Vague/Short Input

If input <10 words or unclear:

- **Smart Enhancement:** Automatically add camera motion, lighting, mood, and **EXPLICIT STYLE INSTRUCTION**
- Example: "一只猫" → "一只可爱的橘猫在午后阳光下的窗台上，镜头缓慢推近，温暖柔和的光线，电影级写实风格"
- **Always include style!** Use default cinematic style if no style specified

---

### Step 5: Generate Prompts & Output JSON

## Output Format (MUST Follow Exactly)

```json
{
  "platforms": ["platform-name"],
  "product": "VIDEO_TEXT",
  "prompts": {
    "platform-name": {
      "type": "video",
      "prompt": "optimized video prompt text here",
      "style": "detected-style",
      "duration": "5s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "what to exclude"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "FIRST_FRAME",
      "prompt": "生成首帧图片的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "LAST_FRAME",
      "prompt": "生成末帧图片的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440002",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "生成参考图片的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440003",
      "type": "IMAGE",
      "scene": "FRAME_0_2S",
      "prompt": "生成0-2秒分镜的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440004",
      "type": "VIDEO",
      "scene": "REFERENCE",
      "prompt": "生成参考视频的提示词"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440005",
      "type": "AUDIO",
      "scene": "BACKGROUND",
      "prompt": "生成背景音乐的提示词"
    }
  ]
}
```

---

### Required Fields

- `platforms`: Array (lowercase, hyphenated: `kling`, `vidu`, `jimeng`, `sora`, `google`, `runway`, `pika`, `default`)
- `product`: GenerationProduct type (see below)
- `type`: Always `"video"`
- `prompt`: Required - the actual video prompt
- `style`: Required - detected or default

### Optional Fields

- `duration`: Video duration (e.g., "5s", "10s")
- `aspect_ratio`: Aspect ratio (e.g., "16:9", "9:16", "1:1")
- `resolution`: Resolution (e.g., "720p", "1080p", "4K")
- `fps`: Frames per second (e.g., 24, 30, 60)
- `negative`: Negative prompt
- `assets`: Array of asset objects (统一管理所有资源)

---

## GenerationProduct (产品类型)

根据用户输入自动检测并设置 `product` 字段：

| Product ID        | Product Name            | Detection Keywords                                        |
| ----------------- | ----------------------- | --------------------------------------------------------- |
| `VIDEO_TEXT`      | 文生视频                | 纯文本描述，无图片/视频/音频参考                          |
| `VIDEO_IMAGE`     | 图生视频                | "@图片", "图生视频", "image to video"                     |
| `VIDEO_FRAME`     | 首尾帧生成              | "首尾帧", "first frame", "last frame"                     |
| `VIDEO_MULTI`     | 多帧/分镜生成           | "分镜", "storyboard", "多帧", "multi-frame"               |
| `VIDEO_UNIVERSAL` | 全能智能参考/多模态参考 | "全能", "universal", "多模态", 同时包含图片+视频+音频参考 |
| `VIDEO_REFERENCE` | 参考视频生成            | "@视频", "参考视频", "reference video"                    |
| `VIDEO_STYLE`     | 风格迁移生成            | "风格", "style transfer"                                  |
| `VIDEO_EXTEND`    | 视频扩展生成            | "扩展", "extend", "延长"                                  |
| `VIDEO_EDIT`      | 视频编辑生成            | "编辑", "edit", "修改"                                    |

### 检测优先级

1. VIDEO_UNIVERSAL (全能智能参考) - 检测到多个不同类型参考时
2. VIDEO_MULTI (分镜)
3. VIDEO_FRAME (首尾帧)
4. VIDEO_REFERENCE (参考视频)
5. VIDEO_IMAGE (图生视频)
6. VIDEO_TEXT (文生视频) - 默认

---

### Assets 资产管理说明

`assets` 数组统一管理所有类型的资源，每个资源对象包含：

| 字段     | 类型   | 说明                                                                                      |
| -------- | ------ | ----------------------------------------------------------------------------------------- |
| `uuid`   | string | 唯一标识符，格式：UUID v4（如 `550e8400-e29b-41d4-a716-446655440000`）                    |
| `type`   | string | 资源类型: `IMAGE`, `VIDEO`, `AUDIO`                                                       |
| `scene`  | string | 场景标识: `FIRST_FRAME`, `LAST_FRAME`, `REFERENCE`, `FRAME_X_Ys`, `BACKGROUND`, `MAIN` 等 |
| `prompt` | string | 生成该资源的提示词                                                                        |

#### Assets Type 类型

- `IMAGE` - 图片资源
- `VIDEO` - 视频资源
- `AUDIO` - 音频资源

#### Assets Scene 场景标识

- `FIRST_FRAME` - 首帧
- `LAST_FRAME` - 末帧
- `REFERENCE` - 参考资源
- `FRAME_X_Ys` - 分镜（如 `FRAME_0_2S` 表示0-2秒）
- `BACKGROUND` - 背景
- `MAIN` - 主要资源

---

## Common Use Cases Covered

| Category                   | Examples                                                |
| -------------------------- | ------------------------------------------------------- |
| **Text-to-Video**          | Story descriptions, scene animations, character actions |
| **Image-to-Video**         | Animate a single image, add motion to photo             |
| **Frame Control**          | Define start and end points, smooth transition          |
| **Multi-Frame/Storyboard** | Time-coded frames, storyboard panels, scene changes     |
| **Universal Reference**    | Combine images, videos, audio as references             |
| **Platform-Specific**      | Kling, Vidu, Jimeng, Sora, Google, Runway, Pika         |
| **Styles**                 | Cinematic, anime, photorealistic, fantasy, sci-fi       |
| **Camera Work**            | Zoom, pan, tracking, dolly, handheld, static            |
| **Prompt Optimization**    | Improve existing prompts, adapt to platforms            |

---

## References (Load As Needed For More Detail - Follow Progressive Loading)

### Core Workflow

- `references/core-workflow.md` - Complete step-by-step workflow

### Output Examples (Load Category-Specific Only)

- `references/output-examples-quickstart.md` - Quick reference + JSON structure (ALWAYS LOAD FIRST)
- `references/output-examples-basics.md` - Text-to-video examples
- `references/output-examples-image-to-video.md` - Image-to-video examples
- `references/output-examples-frames.md` - First/last frame examples
- `references/output-examples-multi-frame.md` - Multi-frame/storyboard examples
- `references/output-examples-universal.md` - Universal reference examples
- `references/output-examples-universal-reference.md` - 即梦 Seedance 2.0 全能智能参考示例
- `references/output-examples-dialogue-emotion.md` - Dialogue & Emotion examples (对白与情感示例)

### Generation Guides

- `references/image-to-video-guide.md` - Image-to-video best practices
- `references/frame-control-guide.md` - First/last frame techniques
- `references/multi-frame-guide.md` - Multi-frame and storyboard guidance
- `references/universal-reference-guide.md` - Universal reference syntax and usage
- `references/dialogue-emotion-guide.md` - Dialogue & Emotion guide (对白与情感指南)

### Platform Guides

- `references/platform-kling.md` - 可灵 Kling guide
- `references/platform-vidu.md` - Vidu 维度 guide
- `references/platform-jimeng.md` - 即梦 Jimeng guide
- `references/platform-sora.md` - Sora guide
- `references/platform-google.md` - Google Veo guide
- `references/platform-runway.md` - Runway guide
- `references/platform-pika.md` - Pika guide

### Specialized Guides

- `references/style-reference.md` - Style detection and guides
- `references/cinematic-language.md` - Cinematic video prompt guidance
- `references/camera-movement-guide.md` - Camera techniques and terminology
- `references/negative-prompts-library.md` - Common video exclusions
- `references/extension-guide.md` - Add new platforms
- `assets/templates/` - Video prompt templates
