---
name: Universal Reference Examples
description: 即梦 Seedance 2.0 全能智能参考/多模态参考示例
version: 2.1
category: Output Examples
---

# Output Examples - Universal Reference (全能智能参考)

即梦 Seedance 2.0 全能智能参考/多模态参考示例。

**即梦 Seedance 2.0 标准规范：**
- 使用简单标识符：`@图片1`、`@图片2`、`@视频1`、`@音频1` 等
- 明确说明用途：`作为首帧`、`参考镜头语言`、`用于配乐` 等
- 用自然语言描述你想要的画面和动作，明确是参考，还是编辑

**两种入口模式：**
- **首尾帧入口**：只上传首帧图 + prompt（首帧 + 文本）
- **全能参考入口**：多模态组合输入（图+视频+音频+文本任意组合）

**注意：** 智能多帧和主体参考在 Seedance 2.0 中无法选中。

---

## Example 1: 首帧图 + 视频动作参考（全能参考入口）

**Input:** "@图片1 作为首帧，@视频1 参考打斗动作。生成仙侠决斗视频"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@图片1 作为首帧，@视频1 参考打斗动作。男主角在雨夜仙侠场景中进行决斗，精准复刻图片1的首帧画面和视频1的打斗动作，角色零突变，跨镜头一致性保持，原生音画同步，15秒",
      "style": "cinematic xianxia",
      "duration": "15s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "FIRST_FRAME",
      "prompt": "图片1 作为首帧：男主角在雨夜仙侠场景中的起始画面"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "VIDEO",
      "scene": "REFERENCE",
      "prompt": "视频1 参考打斗动作：参考其打斗动作"
    }
  ]
}
```

---

## Example 2: 延长已有视频

**Input:** "将@视频1 延长5s，生成更完整的场景"

**注意：** 生成时长应为"新增部分"的时长（例如延长5s，生成长度也选5s）

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_EXTEND",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "将@视频1 延长5s，生成更完整的场景。保持画面风格和角色一致性，前后无缝衔接，5秒",
      "style": "consistent with reference video",
      "duration": "5s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "VIDEO",
      "scene": "REFERENCE",
      "prompt": "视频1：需要延长的原始视频"
    }
  ]
}
```

---

## Example 3: 融合多个视频

**Input:** "我要在@视频1 和@视频2 之间加一个场景，内容为男主角在花园中漫步"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "我要在@视频1 和@视频2 之间加一个场景，内容为男主角在花园中漫步。保持角色一致性，场景过渡自然流畅，30秒",
      "style": "cinematic",
      "duration": "30s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "VIDEO",
      "scene": "REFERENCE",
      "prompt": "视频1：前一个场景"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "VIDEO",
      "scene": "REFERENCE",
      "prompt": "视频2：后一个场景"
    }
  ]
}
```

---

## Example 4: 参考视频里的声音（无音频素材）

**Input:** "@视频1 作为参考，生成一个类似的视频，参考视频里的声音"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@视频1 作为参考，生成一个类似的视频，参考视频里的声音。精准复刻视频1的画面风格、运镜逻辑和声音节奏，原生音画同步，10秒",
      "style": "consistent with reference video",
      "duration": "10s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "VIDEO",
      "scene": "REFERENCE",
      "prompt": "视频1：参考其画面和声音"
    }
  ]
}
```

---

## Example 5: 生成连续动作（多张参考图）

**Input:** "角色从跳跃直接过渡到翻滚，保持动作连贯流畅。@图片1 @图片2 @图片3"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "角色从跳跃直接过渡到翻滚，保持动作连贯流畅。@图片1 @图片2 @图片3。精准复刻三张参考图的角色特征和动作姿态，角色零突变，动作过渡自然流畅，8秒",
      "style": "cinematic action",
      "duration": "8s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片1：角色跳跃姿态"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片2：角色过渡姿态"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440002",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片3：角色翻滚姿态"
    }
  ]
}
```

---

## Example 6: 角色图片 + 场景图片 + 音频参考

**Input:** "@图片1 作为男主角，@图片2 作为场景，@音频1 用于配乐。生成一段仙侠决斗的视频"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@图片1 作为男主角，@图片2 作为场景，@音频1 用于配乐。男主角在雨夜仙侠场景中进行决斗，精准复刻图片1的人物特征和图片2的环境氛围，参考音频1的音乐节奏，角色零突变，跨镜头一致性保持，原生音画同步，15秒",
      "style": "cinematic xianxia",
      "duration": "15s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片1 作为男主角：古装仙侠服饰，英气逼人，眼神锐利"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片2 作为场景：雨夜仙侠场景，古风建筑，雨水飘落，灯笼闪烁，神秘氛围"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440002",
      "type": "AUDIO",
      "scene": "BACKGROUND",
      "prompt": "音频1 用于配乐：古风仙侠音乐，古筝、笛子等乐器，节奏舒缓，氛围神秘"
    }
  ]
}
```

---

## Example 7: 剧本 + 参考图片（一键剧本转短剧）

**Input:** "@文本1 作为剧本，@图片1 作为主角形象。生成短剧视频"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@文本1 作为剧本，@图片1 作为主角形象。根据仙侠剧本第一集生成短剧视频，精准复刻图片1的人物形象，自分镜与自运镜，自动规划镜头动作，角色零突变，跨镜头一致性保持，原生音画同步，60秒",
      "style": "cinematic xianxia drama",
      "duration": "60s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片1 作为主角形象：古装仙侠服饰，俊朗外貌，气质不凡"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "VIDEO",
      "scene": "REFERENCE",
      "prompt": "文本1 作为剧本：仙侠剧本第一集的情节和对话"
    }
  ]
}
```

---

## Example 8: 最多12份参考素材（即梦Seedance 2.0 最大支持）

**Input:** "@图片1 作为主角，@图片2 作为配角，@图片3 作为客厅场景，@图片4 作为花园场景，@视频1 参考运镜，@视频2 参考打斗动作，@图片5 作为服装参考，@图片6 作为道具参考，@图片7 作为氛围参考，@音频1 作为背景音乐，@音频2 作为环境音效，@文本1 作为剧情描述。生成完整视频"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@图片1 作为主角，@图片2 作为配角，@图片3 作为客厅场景，@图片4 作为花园场景，@视频1 参考运镜，@视频2 参考打斗动作，@图片5 作为服装参考，@图片6 作为道具参考，@图片7 作为氛围参考，@音频1 作为背景音乐，@音频2 作为环境音效，@文本1 作为剧情描述。根据剧情描述生成完整视频，精准复刻12份参考素材：角色特征、场景环境、运镜轨迹、动作细节、服装道具、氛围音乐，角色零突变，跨镜头一致性保持，原生音画同步，自动生成匹配的背景音乐与环境音效，60秒",
      "style": "cinematic",
      "duration": "60s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片1 作为主角"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片2 作为配角"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440002",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片3 作为客厅场景"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440003",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片4 作为花园场景"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440004",
      "type": "VIDEO",
      "scene": "REFERENCE",
      "prompt": "视频1 参考运镜"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440005",
      "type": "VIDEO",
      "scene": "REFERENCE",
      "prompt": "视频2 参考打斗动作"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440006",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片5 作为服装参考"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440007",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片6 作为道具参考"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440008",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片7 作为氛围参考"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440009",
      "type": "AUDIO",
      "scene": "BACKGROUND",
      "prompt": "音频1 作为背景音乐"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440010",
      "type": "AUDIO",
      "scene": "BACKGROUND",
      "prompt": "音频2 作为环境音效"
    }
  ]
}
```

---

## 即梦Seedance 2.0 提示词生成规则

### 1. @标识符 语法（标准规范）

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

### 2. 两种入口模式

| 入口类型 | Product | 触发条件 |
|---------|---------|---------|
| 首尾帧入口 | `VIDEO_FRAME` | 只有首帧/尾帧 + 文本 |
| 全能参考入口 | `VIDEO_UNIVERSAL` | 图+视频+音频+文本任意组合 |

### 3. 可参考万物

Seedance 2.0 可以参考任何内容：
- 动作
- 特效
- 形式
- 运镜
- 人物
- 场景
- 声音

用自然语言描述你想要的画面和动作，明确是参考，还是编辑。

### 4. 重要提示

- 素材多的时候，建议多检查一下各个 @对象有没有标清楚
- 别把图、视频、角色搞混了
- 延长视频时，生成时长应为"新增部分"的时长
- 没有音频素材时，可以直接参考视频里的声音

---

## Example 9: 音色更准、声音更真（人声参考 + 口型同步）

**Input:** "@图片1 作为说话者，@音频1 参考音色和说话内容。生成一段人物说话的视频"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@图片1 作为说话者，@音频1 参考音色和说话内容。人物自然说话，精准复刻图片1的人物特征，参考音频1的音色和说话内容，音色更准、声音更真，嘴型精准同步，面部表情与音频节奏精准对齐，原生音画像素级对齐，角色零突变，跨镜头一致性保持，原生音画同步，10秒",
      "style": "photorealistic",
      "duration": "10s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent character, bad lip sync"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片1 作为说话者：人物形象，自然的面部表情"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "AUDIO",
      "scene": "BACKGROUND",
      "prompt": "音频1 参考音色和说话内容：人声说话，音色真实自然"
    }
  ]
}
```

---

## Example 10: 哼唱旋律生成歌曲 + 画面同步

**Input:** "@音频1 作为哼唱旋律，@图片1 作为场景。生成一段音乐视频"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@音频1 作为哼唱旋律，@图片1 作为场景。根据哼唱旋律生成完整歌曲，音色更准、声音更真，精准复刻图片1的场景，画面与音乐节奏完美同步，自动生成匹配的背景音乐与环境音效，原生音画同步，30秒",
      "style": "cinematic music video",
      "duration": "30s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, inconsistent rhythm"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "AUDIO",
      "scene": "BACKGROUND",
      "prompt": "音频1 作为哼唱旋律：自然的人声哼唱"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片1 作为场景：美丽的自然风景"
    }
  ]
}
```

---

## Example 11: 方言/口音保留 + 音色还原

**Input:** "@音频1 参考方言口音，@图片1 作为说话者。生成一段用方言说话的视频"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@音频1 参考方言口音，@图片1 作为说话者。人物用方言自然说话，精准复刻图片1的人物特征，参考音频1的方言口音，音色更准、声音更真，方言/口音完美保留，嘴型精准同步，原生音画像素级对齐，角色零突变，15秒",
      "style": "photorealistic",
      "duration": "15s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, bad accent"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "AUDIO",
      "scene": "BACKGROUND",
      "prompt": "音频1 参考方言口音：方言说话，自然的口音特征"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片1 作为说话者：人物形象"
    }
  ]
}
```

---

## Example 12: 歌声还原 + 情感表达

**Input:** "@音频1 作为歌声参考，@图片1 作为歌手形象。生成一段歌手唱歌的视频"

**Output:**

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "@音频1 作为歌声参考，@图片1 作为歌手形象。歌手深情演唱，精准复刻图片1的歌手形象，参考音频1的歌声，音色更准、声音更真，歌声完美还原，情感表达自然流畅，嘴型精准同步，面部表情与音乐节奏精准对齐，原生音画像素级对齐，角色零突变，30秒",
      "style": "cinematic music performance",
      "duration": "30s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted, bad anatomy, bad singing"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "AUDIO",
      "scene": "BACKGROUND",
      "prompt": "音频1 作为歌声参考：歌声演唱，情感丰富"
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "图片1 作为歌手形象：歌手形象，自然的表情"
    }
  ]
}
```

---

## 即梦Seedance 2.0 提示词生成规则

### 1. @标识符 语法（标准规范）

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
- `参考音色`、`参考口音`、`参考歌声`

### 2. 两种入口模式

| 入口类型 | Product | 触发条件 |
|---------|---------|---------|
| 首尾帧入口 | `VIDEO_FRAME` | 只有首帧/尾帧 + 文本 |
| 全能参考入口 | `VIDEO_UNIVERSAL` | 图+视频+音频+文本任意组合 |

### 3. 可参考万物

Seedance 2.0 可以参考任何内容：
- 动作
- 特效
- 形式
- 运镜
- 人物
- 场景
- 声音
- **音色** - 音色更准、声音更真
- **口音/方言** - 完美保留方言特征
- **歌声** - 歌声还原、情感表达

用自然语言描述你想要的画面和动作，明确是参考，还是编辑。

### 4. 重要提示

- 素材多的时候，建议多检查一下各个 @对象有没有标清楚
- 别把图、视频、角色搞混了
- 延长视频时，生成时长应为"新增部分"的时长
- 没有音频素材时，可以直接参考视频里的声音
- **音色更准、声音更真**：使用音频参考时，在提示词中明确说明
- **嘴型精准同步**：原生音画像素级对齐，面部表情与音频节奏精准对齐
- **方言/口音保留**：完美保留方言特征和口音特点
- **歌声还原**：歌声完美还原，情感表达自然流畅

---

## 即梦Seedance 2.0 全能智能参考核心特性

| 特性 | 说明 |
|------|------|
| **多模态输入** | 支持文本、图片、视频、音频四种模态 |
| **最多12份参考** | 可同时接入最多12份参考素材 |
| **精准复刻** | 画面构图、角色特征、运镜逻辑、音乐氛围 |
| **角色零突变** | 跨镜头角色一致性保持 |
| **原生音画同步** | 毫秒级匹配，嘴型精准同步 |
| **音色更准、声音更真** | 精准还原音色，声音真实自然 |
| **嘴型精准同步** | 原生音画像素级对齐，面部表情与音频节奏精准对齐 |
| **方言/口音保留** | 完美保留方言特征和口音特点 |
| **歌声还原** | 歌声完美还原，情感表达自然流畅 |
| **自动音效** | 自动生成匹配的背景音乐与环境音效 |
| **自分镜与自运镜** | 自动规划镜头动作 |
| **可参考万物** | 动作、特效、形式、运镜、人物、场景、声音、音色、口音、歌声 |
| **强创意生成** | 创意能力强 |
| **指令响应精准** | 理解力很棒 |
| **生成速度** | 提升超10倍 |
| **可用率** | 提升至90%以上 |
