# Universal Reference Guide (全能智能参考指南)

Guidelines for multi-modal reference (图片、视频、音频). 即梦 Seedance 2.0 全能智能参考标准。

---

## What is Universal Reference?

Universal reference (全能参考) allows combining multiple reference types: images, videos, and audio in a single generation request.

**即梦 Seedance 2.0 核心特性：**
- 支持文本、图片、视频、音频四种模态输入
- 最多可接入12份参考素材
- 精准复刻画面构图、角色特征、运镜逻辑、音乐氛围
- 角色零突变 - 跨镜头角色一致性保持
- 原生音画同步 - 毫秒级匹配
- 自分镜与自运镜 - 自动规划镜头动作
- **可参考万物** - 动作、特效、形式、运镜、人物、场景、声音
- **强创意生成** + **指令响应精准**
- **音色更准、声音更真** - 人声参考、口型同步、方言保留、歌声还原、情感表达
- **原生音画像素级对齐** - 面部表情与音频节奏精准对齐

---

## 两种入口模式

| 入口类型 | 使用场景 | 触发条件 | Product |
|---------|---------|---------|---------|
| **首尾帧入口** | 只上传首帧图 + prompt | 只有首帧/尾帧 + 文本 | `VIDEO_FRAME` |
| **全能参考入口** | 多模态组合输入 | 图+视频+音频+文本任意组合 | `VIDEO_UNIVERSAL` |

**注意：** 智能多帧和主体参考在 Seedance 2.0 中无法选中。

---

## Detection Keywords

Detect these keywords to trigger universal reference mode:

- "@视频", "参考视频", "reference video"
- "@音频", "参考音频", "reference audio"
- Multiple `@` references combined
- User provides image + video + audio references
- "全能", "多模态", "12份参考", "Seedance", "角色零突变", "音画同步", "自分镜", "自运镜"

---

## Reference Syntax

### 1. @标识符 语法（即梦 Seedance 2.0 标准规范）

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

### 2. 可参考万物

Seedance 2.0 可以参考任何内容：
- **动作** - 角色动作、打斗动作、连续动作
- **特效** - 视觉特效、画面风格
- **形式** - 画面构图、画面形式
- **运镜** - 镜头语言、运镜轨迹
- **人物** - 角色特征、长相、服装、表情
- **场景** - 环境氛围、场景构图
- **声音** - 音乐节奏、音效、人声

用自然语言描述你想要的画面和动作，明确是参考，还是编辑。

### 3. Multiple References (Descriptive Syntax - Preferred)

```
@[ref1] [description1], @[ref2] [description2]. [main prompt that references them]
```

**Examples:**

```
@图片1 作为男主角，@图片2 是当前场景。参考视频 @视频1 的拍摄手法，使用背景音乐 @音频1
@图片1 作为主角形象，@图片2 作为背景环境。参考 @视频1 的镜头语言
@图片1 作为男主角，@图片2 作为女主角。在 @图片3 的场景中，按照 @音频1 的节奏进行
```

### 4. Multiple References (Simple Syntax - Legacy)

```
@reference1 @reference2 @reference3 [prompt text]
```

**Examples:**

```
@图片1 @图片2 结合这两张图片
@视频1 @音频1 视频风格 + 音频节奏
@图片1 @视频1 @音频1 三者结合
```

---

## 特殊使用方式（不设限，仅供参考）

### 1. 有首帧/尾帧图？还想参考视频动作？

**提示词写法：**
```
@图片1 作为首帧，参考@视频1 的打斗动作
```

**示例 Input:**
```
@图片1 作为首帧，参考@视频1 的打斗动作。生成仙侠决斗视频
```

---

### 2. 想延长一个已有的视频？

**提示词写法：**
说明延长时间，如"将@视频1 延长 5s"

**重要注意：** 此时选择的生成时长应为"新增部分"的时长（例如延长 5s，生成长度也选 5s）

**示例 Input:**
```
将@视频1 延长5s，生成更完整的场景
```

---

### 3. 想融合多个视频？

**提示词写法：**
说明合成逻辑，如："我要在@视频1 和@视频2 之间加一个场景，内容为xxx"

**示例 Input:**
```
我要在@视频1 和@视频2 之间加一个场景，内容为男主角在花园中漫步
```

---

### 4. 没音频素材？可以直接参考视频里的声音

**提示词写法：**
```
@视频1 作为参考，生成一个类似的视频，参考视频里的声音
```

**示例 Input:**
```
@视频1 作为参考，生成一个类似的视频，参考视频里的声音
```

---

### 5. 想生成连续动作？

**提示词写法：**
可以在提示词中加入连续性描述，如："角色从跳跃直接过渡到翻滚，保持动作连贯流畅"

**示例 Input:**
```
角色从跳跃直接过渡到翻滚，保持动作连贯流畅。@图片1 @图片2 @图片3
```

---

## Reference Types (Assets 结构)

使用统一的 `assets` 数组管理所有参考类型，每个资产包含：
- `uuid`: UUID v4 唯一标识符
- `type`: `IMAGE`, `VIDEO`, `AUDIO`
- `scene`: `REFERENCE`, `BACKGROUND`, `MAIN`, `FIRST_FRAME`, `LAST_FRAME`, `FRAME_X_Ys`
- `prompt`: 生成该资产的提示词

### 1. Image References (图片参考)

**Purpose:** Visual reference for character, scene, style, composition
**Type:** `IMAGE`
**Scene:** `REFERENCE` (角色/场景/服装/道具参考), `FIRST_FRAME`, `LAST_FRAME`

**即梦 Seedance 2.0 图片参考类型：**
- 角色图片：锁定人物长相、服装纹理、表情习惯
- 场景图片：复刻画面构图、环境氛围
- 服装参考：精准复刻服装纹理和样式
- 道具参考：确保道具一致性

### 2. Video References (视频参考)

**Purpose:** Reference for motion, style, pacing, camera work
**Type:** `VIDEO`
**Scene:** `REFERENCE`

**即梦 Seedance 2.0 视频参考类型：**
- 运镜参考：精准复刻运镜轨迹
- 动作参考：复刻动作细节
- 分镜参考：自分镜与自运镜
- 声音参考：参考视频里的声音（无需单独音频素材）

### 3. Audio References (音频参考)

**Purpose:** Reference for timing, pacing, mood, rhythm, voice, melody, accent
**Type:** `AUDIO`
**Scene:** `BACKGROUND`

**即梦 Seedance 2.0 音频参考类型：**
- 背景音乐：匹配音乐节奏
- 环境音效：增强氛围
- 人声参考：嘴型精准同步、面部表情与音频节奏精准对齐
- **音色更准、声音更真** - 核心音频特性：
  - **人声参考 + 口型同步**：精准复刻音色，嘴型与语音完全匹配
  - **哼唱旋律生成歌曲**：根据哼唱旋律生成完整歌曲，画面同步
  - **方言/口音保留**：精准保留地方方言、口音特征
  - **歌声还原**：高质量还原歌唱音色和情感
  - **情感表达**：音频情感与面部表情精准匹配

**提示词示例：**
- `@音频1 参考音色和说话内容，音色更准、声音更真`
- `@音频1 参考哼唱旋律，生成完整歌曲`
- `@音频1 参考方言口音，精准保留`

---

## Key Principles

### 1. Reference Priority

When multiple references are provided:
- Image references: Visual style, character, scene, composition
- Video references: Motion, camera work, pacing
- Audio references: Timing, rhythm, mood

### 2. 即梦 Seedance 2.0 核心原则

- **角色零突变**：跨镜头角色一致性保持，同一角色使用同一张参考图
- **原生音画同步**：毫秒级音画像素级对齐，嘴型精准同步
- **精准复刻**：画面构图、角色特征、运镜逻辑、音乐氛围
- **自分镜与自运镜**：自动规划镜头动作
- **可参考万物**：动作、特效、形式、运镜、人物、场景、声音
- **强创意生成** + **指令响应精准**：用自然语言描述即可

### 3. Consistency

- Maintain consistency across all references
- Resolve conflicts (e.g., if image and video show different characters)
- Ask for clarification if references are conflicting

### 4. Clear Description

- Describe how the references should be used
- Explain what aspects to take from each reference
- Specify the relationship between references

---

## Tips & Best Practices

### 即梦 Seedance 2.0 全能智能参考最佳实践

1. **角色参考优先**：先提供角色图片，锁定人物特征
2. **场景参考补充**：再提供场景图片，复刻环境氛围
3. **运镜参考增强**：如有需要，提供运镜参考视频
4. **音频参考点睛**：最后添加音频参考，实现音画同步
5. **参考数量控制**：建议3-8份参考素材，最多12份
6. **角色一致性**：同一角色使用同一张参考图，确保零突变
7. **使用 VIDEO_UNIVERSAL**：对于多模态参考，必须设置 product: "VIDEO_UNIVERSAL"
8. **@对象标清楚**：素材多的时候，建议多检查一下各个 @对象有没有标清楚
9. **别搞混素材**：别把图、视频、角色搞混了
10. **延长视频注意时长**：延长视频时，生成时长应为"新增部分"的时长
11. **无音频素材时**：可以直接参考视频里的声音

### 通用最佳实践

1. **Be clear about each reference's purpose:** What to take from each?
2. **Keep references consistent:** They should work together
3. **Describe the integration:** How do they combine?
4. **Use assets array:** Include all references in the `assets` array with proper UUID
5. **Handle conflicts:** If references conflict, ask or make a logical choice
6. **Use the @ syntax:** Follow the `@identifier [purpose]` format

---

## Common Reference Combinations

| Combination               | Use Case                             |
| ------------------------- | ------------------------------------ |
| **Image + Image**         | Combine two visual styles or scenes  |
| **Image + Video**         | Visual from image, motion from video |
| **Image + Audio**         | Visual from image, timing from audio |
| **Video + Audio**         | Motion from video, pacing from audio |
| **Image + Video + Audio** | Full multi-modal reference           |
| **首帧 + 视频动作** | 首帧图 + 视频动作参考 |
| **3-8 References**        | 即梦 Seedance 2.0 推荐配置          |
| **Up to 12 References**   | 即梦 Seedance 2.0 最大支持          |

---

## What to Avoid

❌ **Avoid:**

- Conflicting references (e.g., two completely different characters)
- Unclear how references should be used
- Ignoring reference conflicts
- Forgetting to set the `assets` array
- Using old `reference_images`/`reference_videos`/`reference_audio` fields
- More than 12 references (即梦 Seedance 2.0 上限)
- 使用智能多帧或主体参考（Seedance 2.0 无法选中）
- 使用文件名作为标识符（应该用 @图片1、@视频1 等简单标识符）

✅ **Prefer:**

- 2-8 complementary references
- Clear purpose for each reference
- Descriptions of how to integrate them
- Consistent style/subject across references
- Using `assets` array with proper UUID
- Setting `product: "VIDEO_UNIVERSAL"` for multi-modal references
- Role consistency (same reference image for the same character)
- 在提示词中直接使用 `@标识符 用途说明` 来指定每个素材
- 素材多的时候，多检查一下各个 @对象有没有标清楚
