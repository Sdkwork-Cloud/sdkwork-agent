# Core Workflow

Complete workflow for generating video prompts.

---

## 0. Handle Vague or Short Input

If user input is too short (<10 words) or unclear:

### Option A: Smart Enhancement (Recommended)

- Automatically add reasonable details (camera motion, lighting, mood)
- Use default cinematic style
- Keep it natural, don't overcomplicate

**Example Enhancement:**

- Input: "一只猫"
- Enhanced: "一只可爱的橘猫在午后阳光下的窗台上，镜头缓慢推近，温暖柔和的光线"

### Option B: Clarify (Only if Truly Necessary)

- Ask user for more details only if the intent is completely ambiguous
- Prefer smart enhancement over clarification whenever possible

---

## 1. Understand User Input

First, read `input-guidelines.md` to understand user intent.

**Key Questions to Answer:**

- What is the main subject/scene?
- What generation mode is needed (text-to-video, image-to-video, etc.)?
- What platform(s) should be used?
- What are the video parameters (duration, aspect ratio, resolution, fps)?
- Are there any reference inputs (images, videos, audio)?

**重要平台规则：**

- **没有指定平台时：** 只返回 `["default"]`，不要返回所有平台
- **用户明确说 "all platforms" 或 "所有平台" 时：** 才返回所有平台 `["kling", "vidu", "jimeng", "sora", "google", "runway", "pika"]`
- **用户指定单个平台时：** 只返回该单个平台

---

## 2. Detect Generation Mode

### Text-to-Video (文生视频)

**Detection:** User provides text description only, no reference media
**Action:** Generate video prompt from text, focus on:

- Scene and character descriptions
- Action and movement
- Camera movement
- Lighting and atmosphere
- Pacing and timing

### Image-to-Video (图生视频)

**Detection:** "@图片", "图生视频", "image to video", user provides image reference
**Action:** Read `image-to-video-guide.md`, focus on:

- Maintaining consistency with reference image
- Adding natural, subtle motion
- Camera movement around subject
- Smooth transitions
- Add assets with `type: "IMAGE"`, `scene: "REFERENCE"`

### Frame Control (首尾帧)

**Detection:** "首尾帧", "first frame", "last frame", "start/end"
**Action:** Read `frame-control-guide.md`, focus on:

- Clear start and end states
- Smooth interpolation between frames
- Consistent characters and scene
- Logical motion arc
- Add assets with `scene: "FIRST_FRAME"` and `scene: "LAST_FRAME"`

### Multi-Frame (智能多帧/分镜)

**Detection:** "分镜", "storyboard", "多帧", "multi-frame", user provides multiple time-labeled images
**Action:** Read `multi-frame-guide.md`, focus on:

- Each frame has time label: "0-2s: [description]"
- Consistent style and characters across all frames
- Smooth transitions between frames
- Logical story progression
- Add assets with `scene: "FRAME_X_Ys"` (e.g., `FRAME_0_2S`)

### Universal Reference (全能参考)

**Detection:** "@视频", "参考视频", "参考音频", "reference video", "reference audio", "全能", "多模态", "12份参考", "Seedance", "角色零突变", "音画同步"
**Action:** Read `universal-reference-guide.md`, follow 即梦 Seedance 2.0 标准语法:

- 使用简单标识符：`@图片1`, `@视频1`, `@音频1`
- 明确说明每个素材的用途：`@图片1 作为首帧`, `@视频1 参考镜头语言`, `@音频1 用于配乐`
- 支持最多12份参考素材
- 新增音频特性：音色更准、声音更真、口型同步、方言保留、歌声还原、情感表达
- Add assets with appropriate `type` (IMAGE/VIDEO/AUDIO) and `scene`

### Dialogue & Emotion (对白与情感)

**Detection:** "对话", "说话", "对白", "台词", "情感", "表情", "情绪", "配音", "声音", "音色", "口型", "同步", "方言", "口音", "歌声", "唱歌", "外部配音", "elevenlabs", "polly", "synchronization", "lip sync", "dialogue", "emotion"
**Action:** Read `dialogue-emotion-guide.md`, follow 对白与情感标准语法:

- 对白节点：`[时间] [说话者]说："[对白内容]"，[情感描述]`
- 即梦平台：使用原生音画同步 + 口型精准同步
- 其他平台：需外部配音，详细描述面部表情和身体语言
- 添加 `dialogue` 节点提取和管理所有对白信息（id, speaker, text, emotion, start_time, end_time, notes, external_dubbing, dubbing_tool）
- 添加 `dialogue_summary` 节点提供对白摘要信息

---

## 3. Detect Platform and Apply Guidelines

### Platform-Specific Optimizations

Each platform has different strengths - optimize prompts accordingly:

| Platform          | Strengths                       | Optimization Focus                       |
| ----------------- | ------------------------------- | ---------------------------------------- |
| **可灵 (Kling)**  | Motion control, Chinese content | Strong motion descriptions, clear action |
| **Vidu**          | Cinematic quality, details      | Rich visual details, cinematic language  |
| **即梦 (Jimeng)** | Stability, CapCut integration   | Balanced, stable prompts                 |
| **Sora**          | Long videos, coherence          | Complex scenes, long durations           |
| **Google (Veo)**  | Character consistency           | Consistent character design              |
| **Runway**        | Professional tools              | Professional cinematography              |
| **Pika**          | Creativity, ease of use         | Creative, experimental ideas             |

Read the corresponding `platform-*.md` file for detailed guidelines.

---

## 4. Detect and Apply Video Parameters

### Duration

- **Short (2-5s):** Quick action, single shot
- **Medium (5-15s):** Scene with development
- **Long (15-60s+):** Multiple scenes, story arc

### Aspect Ratio

- **16:9:** Standard video, YouTube, landscape
- **9:16:** Vertical, TikTok, Reels, Shorts
- **1:1:** Square, Instagram
- **21:9:** Cinematic widescreen
- **4:3:** Traditional TV, vintage

### Resolution

- **720p:** Basic, fast generation
- **1080p:** Standard, recommended
- **4K:** High quality, slower
- **8K:** Ultra quality, very slow

### FPS (Frames Per Second)

- **24fps:** Cinematic, film look
- **30fps:** Standard video, smooth
- **60fps:** High motion, sports, action

---

## 5. Detect Camera Movement

### Common Camera Moves

| Move                  | Keywords                        | Effect                        |
| --------------------- | ------------------------------- | ----------------------------- |
| **推镜头 (Zoom In)**  | "zoom in", "推近", "dolly in"   | Subject gets closer, intimacy |
| **拉镜头 (Zoom Out)** | "zoom out", "拉远", "dolly out" | Reveal more context           |
| **横摇 (Pan)**        | "pan left", "pan right", "横摇" | Scan across scene             |
| **纵摇 (Tilt)**       | "tilt up", "tilt down", "纵摇"  | Look up/down                  |
| **跟拍 (Tracking)**   | "tracking", "following", "跟拍" | Move with subject             |
| **环绕 (Orbit)**      | "orbit", "arc around", "环绕"   | Circle around subject         |
| **手持 (Handheld)**   | "handheld", "shaky", "手持"     | Documentary, realistic        |
| **静态 (Static)**     | "static", "locked off", "静态"  | No movement, stable           |

---

## 6. Build the Video Prompt

### Essential Elements

1. **Subject/Scene:** What is happening?
2. **Action:** What is the movement?
3. **Environment:** Where is it happening?
4. **Lighting:** How is it lit?
5. **Mood/Atmosphere:** What's the feeling?
6. **Camera Movement:** How does the camera move?
7. **Style:** Art/visual style?
8. **Pacing:** How fast does it move?

### Prompt Structure Example

```
[Subject] [action] in [environment], [lighting], [mood], [camera movement], [style], [duration]
```

**Example:**

```
A young woman walking through a rain-soaked city at night, neon lights reflecting on wet pavement, camera slowly tracking alongside her, cinematic, moody, 10 seconds
```

---

## 7. Add Negative Prompt (Optional but Recommended)

Common negative prompts for video:

- "text, watermark, subtitles"
- "blurry, low quality, distorted"
- "bad anatomy, deformed, extra limbs"
- "inconsistent characters, changing appearance"
- "jerky motion, unnatural movement"
- "flickering, flashing"

---

## 8. Output JSON

Follow the exact format from SKILL.md, including:

- `platforms` array
- `type: "video"`
- All required fields
- Optional fields as needed
- `assets` array with all reference media, frames, first/last frames unified in one place

Assets 统一管理所有资源：

- `type`: IMAGE, VIDEO, AUDIO
- `scene`: FIRST_FRAME, LAST_FRAME, REFERENCE, FRAME_X_Ys, BACKGROUND, MAIN
- `prompt`: 生成该资源的提示词
