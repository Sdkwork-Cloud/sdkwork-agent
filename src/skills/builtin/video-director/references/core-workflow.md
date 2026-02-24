# Core Workflow

Complete workflow for video director agent.

---

## 0. Detect Output Mode

First, determine if user wants modular output.

**Detection Keywords:**

| Mode | Keywords |
|------|----------|
| Script Only | "只剧本", "script only", "仅剧本", "output script" |
| Characters Only | "只角色", "characters only", "仅角色", "output characters" |
| Props Only | "只道具", "props only", "仅道具", "output props" |
| Locations Only | "只场景", "locations only", "仅场景", "output locations" |
| Storyboard Only | "只分镜", "storyboard only", "仅分镜", "shots only" |

**If no specific mode, default to Full Project.**

---

## 1. Process User Input

### 1.1 Detect Input Type

| Input Type | Detection | Action |
|------------|-----------|--------|
| **Short Idea** | < 50 words, simple description | Expand to complete story → Generate script |
| **Story/Novel** | Complete narrative, characters, plot | Extract elements → Generate script |
| **Existing Script** | Script format (INT./EXT., scene headings) | Evaluate → Optimize (if needed) |

### 1.2 Evaluate Script (if applicable)

Score dimensions (0-100):
- **Structure (25%):** Opening, development, climax, resolution
- **Characters (20%):** Personality, motivation, growth
- **Scene Description (20%):** Detail, atmosphere, visual potential
- **Dialogue (15%):** Natural, character-appropriate, plot-driving
- **Pacing (10%):** Rhythm, tension, duration
- **Visual Potential (10%):** Suitable for visualization

**Grades:**
- 90-100: Excellent
- 70-89: Good
- 50-69: Fair
- 0-49: Poor

### 1.3 Generate/Optimize Script

Follow standard script format:
```
【场景编号】 场景名 - 内/外景 - 时间 - 天气

【场景描述】
详细描述

【角色】
- 角色1：状态
- 角色2：状态

【动作】
动作描述

【对话】
角色1：台词
角色2：台词

【情感/氛围】
情感基调
```

---

## 2. Design Elements

### 2.1 Character Design

For each character, define:
- Basic info: name, age, gender
- Appearance: face, hair, eyes, body type, distinctive features
- Personality: traits, background
- Costume: main outfit, accessories
- Reference prompt for image generation
- Associated scenes/shots

### 2.2 Location Design

For each location, define:
- Name, type (indoor/outdoor)
- Time of day, weather, season
- Atmosphere, lighting style, color palette
- Spatial layout, key features
- Reference prompt for image generation
- Associated scenes

### 2.3 Prop Design

For each prop, define:
- Name, category, role
- Appearance: material, color, condition
- Story significance, interactions
- Reference prompt for image generation
- Associated characters/scenes/shots

---

## 3. Create Storyboard

### 3.1 Create Scenes

Each scene includes:
- Index, title, location UUID
- Summary, mood tags
- Duration
- Character/prop associations
- Visual prompt

### 3.2 Create Shots

Each shot includes:
- Scene UUID, index
- Shot scale, camera movement, camera angle
- Duration (seconds), time range
- Description, action, dialogue
- Lighting, sound design
- Character/prop associations
- Video generation configuration (mode, prompt, etc.)

---

## 4. Add Sound Design (Optional)

- Overall soundtrack style
- Track list with time ranges, style, description
- Ambience, SFX, music for each shot

---

## 5. Output JSON

### 5.1 Full Project Mode

Output complete `FILM_PROJECT` structure with all fields.

### 5.2 Modular Output Modes

- **Script Only:** `{ userInput, script }`
- **Characters Only:** `{ userInput, characters }`
- **Props Only:** `{ userInput, props }`
- **Locations Only:** `{ userInput, locations }`
- **Storyboard Only:** `{ userInput, scenes, shots }`

---

## Key Principles

1. **Always generate UUID v4** for all objects
2. **Maintain referential integrity** (UUID references between objects)
3. **Include timestamps** (createdAt, updatedAt) as milliseconds since epoch
4. **Follow data structure** from `data-structure-reference.md`
