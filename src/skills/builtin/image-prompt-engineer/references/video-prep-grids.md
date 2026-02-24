# Video Prep - Grids
Grid/宫格 images for video generation, including time-segmented and story progression modes.

---

## Grid Images for Video (宫格图片)

Grid/宫格 images are popular for video generation, showing multiple panels of the same character or scene in sequence.

---

## Two Main Grid Types

| Type                                  | Description                                                      | Use Case                         |
| ------------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| **Time-Segmented Grid (按时间分段)**  | Each panel represents a specific time segment (e.g., 0-3s, 3-6s) | Precise timing control for video |
| **Story Progression Grid (剧情规划)** | Panels show story beats without explicit time                    | Flexible narrative flow          |

---

## Common Grid Types

| Grid Type        | Rows × Columns | Panels | Typical Duration | Use Case                     |
| ---------------- | -------------- | ------ | ---------------- | ---------------------------- |
| **九宫格 (3×3)** | 3 × 3          | 9      | 9-18 seconds     | Most common, full sequence   |
| **2×2 宫格**     | 2 × 2          | 4      | 4-8 seconds      | Comparison or short sequence |
| **4×4 宫格**     | 4 × 4          | 16     | 16-32 seconds    | Longer storyboard            |
| **1×2 宫格**     | 1 × 2          | 2      | 2-4 seconds      | Side-by-side comparison      |
| **2×1 宫格**     | 2 × 1          | 2      | 2-4 seconds      | Top-bottom comparison        |
| **1×3 宫格**     | 1 × 3          | 3      | 3-6 seconds      | Horizontal sequence          |
| **3×1 宫格**     | 3 × 1          | 3      | 3-6 seconds      | Vertical sequence            |

---

## Default Behavior

**If NO grid dimensions specified but grid/宫格 keywords detected: DEFAULT to 3×3 (九宫格).**

**If NO duration specified: Use story progression mode by default.**

---

## Time-Segmented Grid (按时间分段)

Detect these keywords to trigger time-segmented mode:

- "0-3秒", "1-3秒", "3-6秒", "6-9秒", etc.
- "时间分段", "time segments", "timed panels"
- "时长", "duration", "seconds"

### Time Allocation Guidelines

| Total Duration | Grid Size | Panel Duration |
| -------------- | --------- | -------------- |
| 4-6 seconds    | 2×2       | 1-1.5s/panel   |
| 9-12 seconds   | 3×3       | 1-1.5s/panel   |
| 16-24 seconds  | 4×4       | 1-1.5s/panel   |

### Example Time-Segmented Prompt Structure

```
3x3 storyboard grid, nine panels, time-segmented,
Panel 1 (0-1s): [Scene description for first second],
Panel 2 (1-2s): [Scene description for second second],
Panel 3 (2-3s): [Scene description for third second],
Panel 4 (3-4s): [Scene description for fourth second],
Panel 5 (4-5s): [Scene description for fifth second],
Panel 6 (5-6s): [Scene description for sixth second],
Panel 7 (6-7s): [Scene description for seventh second],
Panel 8 (7-8s): [Scene description for eighth second],
Panel 9 (8-9s): [Scene description for ninth second],
consistent style across all panels, clean white borders between panels,
professional storyboard for video generation
```

---

## Story Progression Grid (剧情规划)

Use when NO time segments specified. Focus on story beats rather than timing.

### Story Beat Structure for 3×3 Grid

| Panel | Story Beat     | Typical Content               |
| ----- | -------------- | ----------------------------- |
| 1     | Setup          | Establish scene and character |
| 2     | Development    | Introduce action or conflict  |
| 3     | Rising Action  | Build tension                 |
| 4     | Climax Prep    | Lead to peak moment           |
| 5     | Climax         | Peak action or emotion        |
| 6     | Falling Action | Resolution begins             |
| 7     | Resolution     | Outcome revealed              |
| 8     | Epilogue       | Aftermath                     |
| 9     | Closing        | Final shot                    |

---

## Key Requirements for Grid Images

### 1. Consistent Style Across Panels

- Same art style in all panels
- Same character design (if character)
- Same lighting and color palette
- Consistent camera angle (or intentional variation)

### 2. Clear Panel Separation

- Clean white borders between panels
- Distinct separation, no bleeding
- Equal panel sizes

### 3. Content Guidelines

- Each panel tells a small part of the story
- Clear progression or variation
- Same subject (character/scene) throughout
- Natural transitions between panels
- If time-segmented: Each panel clearly labeled with time range

---

## Grid Prompt Keywords

**Always add these to grid image prompts:**

- "multiple panels", "grid layout", "[ROWS]×[COLUMNS] grid"
- "nine panels", "four panels", "sixteen panels"
- "consistent style across all panels"
- "same character in each panel"
- "clean white borders between panels"
- "storyboard style", "sequence of images"

**For time-segmented grids add:**

- "time-segmented", "timed panels", "each panel represents [X] seconds"
- "Panel 1 (0-1s):", "Panel 2 (1-2s):", etc.

**For story progression grids add:**

- "story beats", "narrative sequence", "progression of scenes"

---

## Grid-Specific Negative Prompts

**Add these to avoid common issues:**

- "no overlapping panels", "no bleeding between panels"
- "no inconsistent styles", "no different characters"
- "no text in panels", "no watermarks"
- "no panel size variation"

---

## Example Grid Prompts

### 3×3 Time-Segmented Grid (九宫格, 按时间分段)

```
3x3 storyboard grid, nine panels, time-segmented,
Panel 1 (0-1s): Young woman standing at bus stop, looking at watch, morning light,
Panel 2 (1-2s): Bus approaching in distance, woman smiles,
Panel 3 (2-3s): Bus arrives, doors opening, woman steps forward,
Panel 4 (3-4s): Woman boarding bus, holding handrail,
Panel 5 (4-5s): Woman finding seat by window,
Panel 6 (5-6s): Woman looking out window at passing city,
Panel 7 (6-7s): Woman taking phone out of bag,
Panel 8 (7-8s): Woman checking messages on phone,
Panel 9 (8-9s): Woman smiling at phone, bus continuing journey,
consistent style across all panels, same character, same costume,
clean white borders between panels, professional storyboard, cinematic photorealistic
```

### 3×3 Story Progression Grid (九宫格, 剧情规划)

```
3x3 storyboard grid, nine panels, story progression,
Panel 1: Setup - Female warrior standing at castle gate, dawn light,
Panel 2: Development - Gate opens, she draws her sword,
Panel 3: Rising Action - She charges into battle, enemies ahead,
Panel 4: Climax Prep - She faces the enemy leader,
Panel 5: Climax - Epic sword fight, sparks flying,
Panel 6: Falling Action - Enemy defeated, she stands victorious,
Panel 7: Resolution - She kneels, exhausted but triumphant,
Panel 8: Epilogue - Sun rises over battlefield,
Panel 9: Closing - She looks toward the horizon, hope in her eyes,
consistent style across all panels, same character, same costume,
clean white borders between panels, professional storyboard, cinematic photorealistic
```

### 2×2 Time-Segmented Grid (2×2宫格, 按时间分段)

```
2x2 grid layout, four panels, time-segmented, 4 seconds total,
Panel 1 (0-1s): Cat sitting on windowsill, watching birds outside,
Panel 2 (1-2s): Cat's ears perk up, eyes widen,
Panel 3 (2-3s): Cat crouches, ready to pounce,
Panel 4 (3-4s): Cat leaps toward window, paws outstretched,
consistent style across all panels, same orange tabby cat,
clean white borders between panels, cute and adorable, photorealistic
```

### 4×4 Story Progression Grid (4×4宫格, 剧情规划)

```
4x4 storyboard grid, sixteen panels, narrative sequence,
Panel 1: Character wakes up in mysterious forest,
Panel 2: Character stands up, looks around confused,
Panel 3: Character finds a glowing crystal on ground,
Panel 4: Character picks up crystal, it pulses with light,
Panel 5: Forest path appears before character,
Panel 6: Character starts walking down the path,
Panel 7: Character encounters magical creatures,
Panel 8: Character befriends the creatures,
Panel 9: Creatures lead character to ancient temple,
Panel 10: Character enters temple,
Panel 11: Character solves ancient puzzle,
Panel 12: Temple door opens revealing treasure,
Panel 13: Character collects the treasure,
Panel 14: Character exits temple,
Panel 15: Character waves goodbye to creature friends,
Panel 16: Character walks into sunset, mission complete,
consistent style across all panels, same character, same costume,
clean white borders between panels, fantasy illustration style
```

---

## Quick Reference: Grid Content Type Checklist

| Content Type                          | Must Have                                                       | Should Have                                                 |
| ------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| **宫格-按时间分段 (Time-Segmented)**  | [ROWS]×[COLUMNS] grid, time-segmented, Panel X (start-end):     | Clean borders, consistent style, same character/scene       |
| **宫格-剧情规划 (Story Progression)** | [ROWS]×[COLUMNS] grid, story progression, Panel X: [Beat] -     | Clean borders, consistent style, same character/scene       |

---

## Grid-Specific Checks (Checklist)

- [ ] Grid dimensions correctly detected (or default 3x3)?
- [ ] Grid mode determined (time-segmented or story progression)?
- [ ] "multiple panels" or "grid layout" in prompt?
- [ ] "consistent style across all panels" in prompt?
- [ ] "clean white borders between panels" in prompt?
- [ ] Same character/scene in all panels?
- [ ] No overlapping or bleeding panels?
- [ ] If time-segmented: Panels labeled "Panel X (start-end):"?
- [ ] If story progression: Panels labeled with story beats (Setup, Development, etc.)?
- [ ] `"video_ready": true` set in output?
