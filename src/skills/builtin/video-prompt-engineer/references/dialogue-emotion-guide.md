# Dialogue & Emotion Guide (对白与情感指南)

Guidelines for adding dialogue, emotion, and audio synchronization to video prompts.

---

## 概述

本指南提供在视频提示词中添加对白、情感和音画同步的标准规范，支持多种平台的能力。

**核心原则：**

1. **prompt 中必须包含对话、情感和音效描述** - 无论平台是否支持音画同步，prompt 本身要完整，通过阅读提示词带画面感
2. **保留 dialogue 节点** - 用于提取和管理对白信息，方便外部配音使用
3. **音效描述** - 在 prompt 中添加环境音效、背景音乐等描述

---

## 各平台音画同步能力

| 平台                               | 音画同步        | 说话能力              | 情感表达                  | 口型同步        | 方言保留         |
| ---------------------------------- | --------------- | --------------------- | ------------------------- | --------------- | ---------------- |
| \*\*即梦 Seedance 2.0              | ✅ 原生音画同步 | ✅ 音色更准、声音更真 | ✅ 音频情感与面部表情匹配 | ✅ 嘴型精准同步 | ✅ 方言/口音保留 |
| \*\*可灵/Sora/Veo/Vidu/Runway/Pika | ⚠️ 基础支持     | ⚠️ 需外部配音         | ✅ 面部表情描述           | ❌ 不支持       | ❌ 不支持        |

---

## prompt 中的对话、情感和音效描述规范

### 1. prompt 必须包含的元素：

- **场景描述**
- **对话内容**（带时间标签）
- **情感描述**（面部表情 + 身体语言）
- **音效描述**（环境音效、背景音乐）

### 2. 标准 prompt 结构

```
[场景描述]，[音效：描述]。[时间1-时间2] [说话者]说："[对白内容]"，[情感描述：面部表情+身体语言]。[时间2-时间3] [说话者]说："[对白内容]"，[情感描述]。[音效：后续音效描述]
```

### 3. 音效描述词汇库

**环境音效：**

- 咖啡店：轻柔的背景音乐、悠扬的钢琴声、咖啡杯碰撞声、雨声、鸟鸣声、风声、海浪声、城市喧嚣、脚步声、门铃声、电话铃声

**人声相关：**

- 说话声、笑声、哭声、叹息声、呼吸声、掌声、欢呼声

**音乐：**

- 欢快的音乐、悲伤的音乐、紧张的音乐、温馨的音乐、浪漫的音乐、激昂的音乐

---

## 对白节点设计

### 1. 对白节点用于描述视频中的对话场景，包含：

- 时间标签：对白发生的时间段
- 说话者：谁在说话
- 对白内容：具体说话的文字
- 情感：说话时的情感状态
- 口型：嘴型同步要求

### 2. 对白节点语法

```
[时间] [说话者]说："[对白内容]"，[情感描述]，[口型要求]
```

### 3. 示例

```
0-3s 男主角说："你好，很高兴见到你。"，微笑着，温和友好
3-6s 女主角说："我也很高兴！"，开心地，眼睛弯起
```

---

## 情感表达词汇库

### 基础情感

- **开心/高兴：** smiling, happy, joyful, cheerful
- **悲伤/难过：** sad, sorrowful, tearful
- **愤怒/生气：** angry, furious, frustrated
- **惊讶/吃惊：** surprised, shocked, astonished
- **害怕/恐惧：** afraid, scared, frightened
- **平静/镇定：** calm, peaceful, composed
- **紧张/焦虑：** nervous, anxious, worried
- **兴奋/激动：** excited, thrilled, enthusiastic

### 面部表情

- 微笑：smiling, grinning, smirking
- 皱眉：frowning, furrowing brows
- 张嘴：mouth open, mouth slightly open
- 闭眼：eyes closed, eyes shut
- 眨眼：blinking, winking
- 咬唇：biting lip, pursing lips

### 身体语言

- 点头：nodding, nodding head
- 摇头：shaking head
- 手势：gesturing, hand movements
- 身体前倾：leaning forward
- 身体后仰：leaning back

---

## 各平台提示词策略

### 1. 即梦 Seedance 2.0 专属

**特点：** 原生音画同步 + 口型精准同步

**提示词结构：**

```
[场景描述]，[音效：描述]。[时间标签] [说话者]说："[对白]"，[情感]，音色更准、声音更真，嘴型精准同步，面部表情与音频节奏精准对齐，原生音画像素级对齐
```

**示例：**

```
温馨的咖啡店场景，暖色调灯光，木质桌椅，窗外飘着细雨，音效：轻柔的背景音乐、咖啡杯碰撞声、雨声。1.5-4.5s 女主温柔地说："我喜欢你很久了，愿意做我的男朋友吗？"，紧张又期待，温柔的语气，眼中带光，微笑着。5-8s 男主激动地说："我愿意！我也喜欢你很久了！"，激动、感动，声音带着哽咽，眼泪在眼眶中打转，感动地点头。音色更准、声音更真，嘴型精准同步，面部表情与音频节奏精准对齐，原生音画像素级对齐，10秒
```

### 2. 可灵/Sora/Veo/Vidu/Runway/Pika（需外部配音）

**特点：** 无原生音画同步，需外部配音工具

**提示词结构：**

```
[场景描述]，[音效：描述]。[说话者]说："[对白]"，[情感描述]，面部表情：[表情]，身体语言：[动作]
```

**示例：**

```
温馨的咖啡店场景，暖色调灯光，木质桌椅，窗外飘着细雨，音效：轻柔的背景音乐、咖啡杯碰撞声、雨声。1.5-4.5s 女主温柔地说："我喜欢你很久了，愿意做我的男朋友吗？"，紧张又期待，温柔的语气，眼中带光，面部表情：微笑，眼睛湿润，身体语言：双手紧握，身体微微前倾。5-8s 男主激动地说："我愿意！我也喜欢你很久了！"，激动、感动，声音带着哽咽，眼泪在眼眶中打转，面部表情：眼中含泪，嘴角上扬，身体语言：感动地点头，双手激动地握住女主的手。10秒
```

---

## Dialogue 节点设计

### 1. Dialogue 节点结构

在输出中可添加 `dialogue` 节点，专门用于提取和管理所有对白信息，方便不支持音画同步的产品进行配音处理（人工配音或 AI 生成配音）：

```json
{
  "dialogue": [
    {
      "id": "d1",
      "speaker": "男主角",
      "text": "你好，很高兴见到你。",
      "emotion": "微笑、友好",
      "start_time": "0s",
      "end_time": "3s",
      "notes": "自然、温和的语气",
      "external_dubbing": true,
      "dubbing_tool": "elevenlabs"
    },
    {
      "id": "d2",
      "speaker": "女主角",
      "text": "我也很高兴！",
      "emotion": "开心、兴奋",
      "start_time": "3s",
      "end_time": "6s",
      "notes": "明亮、欢快的语气",
      "external_dubbing": true,
      "dubbing_tool": "elevenlabs"
    }
  ]
}
```

### 2. Dialogue 节点属性说明

| 属性               | 说明                 | 类型    | 示例                           |
| ------------------ | -------------------- | ------- | ------------------------------ |
| `id`               | 对白唯一标识符       | string  | "d1", "d2"                     |
| `speaker`          | 说话者               | string  | "男主角"                       |
| `text`             | 对白文本内容         | string  | "你好，很高兴见到你。"         |
| `emotion`          | 情感状态描述         | string  | "微笑、友好"                   |
| `start_time`       | 开始时间             | string  | "0s", "0.5s"                   |
| `end_time`         | 结束时间             | string  | "3s", "3.5s"                   |
| `notes`            | 配音注意事项（可选） | string  | "自然、温和的语气"             |
| `external_dubbing` | 是否需要外部配音     | boolean | true                           |
| `dubbing_tool`     | 推荐配音工具（可选） | string  | "elevenlabs", "polly", "azure" |
| `voice_id`         | 音色ID（可选）       | string  | "voice-123"                    |
| `accent`           | 方言/口音（可选）    | string  | "东北方言", "广东话"           |
| `is_singing`       | 是否是唱歌（可选）   | boolean | false                          |

---

## 外部配音工具支持

### 1. Assets 扩展属性

在 assets 数组中支持 audio 类型的资产可添加以下属性：

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "type": "AUDIO",
  "scene": "DIALOGUE",
  "prompt": "男主角的配音：你好，很高兴见到你。",
  "speaker": "男主角",
  "dialogue": "你好，很高兴见到你。",
  "emotion": "微笑、友好",
  "start_time": "0s",
  "end_time": "3s",
  "external_dubbing": true
}
```

### 2. Assets 属性说明

| 属性               | 说明         | 类型    | 示例                       |
| ------------------ | ------------ | ------- | -------------------------- |
| `speaker`          | 说话者       | string  | "男主角"                   |
| `dialogue`         | 对白内容     | string  | "你好，很高兴见到你。"     |
| `emotion`          | 情感状态     | string  | "微笑、友好"               |
| `start_time`       | 开始时间     | string  | "0s"                       |
| `end_time`         | 结束时间     | string  | "3s"                       |
| `external_dubbing` | 是否外部配音 | boolean | true                       |
| `dubbing_tool`     | 配音工具     | string  | "elevenlabs, polly, azure" |
| `voice_id`         | 音色ID       | string  | "voice-123"                |

---

## 完整示例

### 示例 1：即梦 Seedance 2.0 原生音画同步

```json
{
  "platforms": ["jimeng"],
  "product": "VIDEO_UNIVERSAL",
  "prompts": {
    "jimeng": {
      "type": "video",
      "prompt": "温馨的咖啡店场景，暖色调灯光，木质桌椅，窗外飘着细雨，音效：轻柔的背景音乐、咖啡杯碰撞声、雨声。1.5-4.5s 女主温柔地说：\"我喜欢你很久了，愿意做我的男朋友吗？\"，紧张又期待，温柔的语气，眼中带光，微笑着。5-8s 男主激动地说：\"我愿意！我也喜欢你很久了！\"，激动、感动，声音带着哽咽，眼泪在眼眶中打转，感动地点头。音色更准、声音更真，嘴型精准同步，面部表情与音频节奏精准对齐，原生音画像素级对齐，10秒",
      "style": "photorealistic",
      "duration": "10s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "咖啡店背景参考图"
    }
  ],
  "dialogue": [
    {
      "id": "d1",
      "speaker": "女主角",
      "text": "我喜欢你很久了，愿意做我的男朋友吗？",
      "emotion": "紧张又期待",
      "start_time": "1.5s",
      "end_time": "4.5s",
      "notes": "温柔的语气，眼中带光",
      "external_dubbing": false
    },
    {
      "id": "d2",
      "speaker": "男主角",
      "text": "我愿意！我也喜欢你很久了！",
      "emotion": "激动、感动",
      "start_time": "5s",
      "end_time": "8s",
      "notes": "声音带着哽咽，眼泪在眼眶中打转",
      "external_dubbing": false
    }
  ]
}
```

### 示例 2：可灵 + 外部配音

```json
{
  "platforms": ["kling"],
  "product": "VIDEO_TEXT",
  "prompts": {
    "kling": {
      "type": "video",
      "prompt": "温馨的咖啡店场景，暖色调灯光，木质桌椅，窗外飘着细雨，音效：轻柔的背景音乐、咖啡杯碰撞声、雨声。1.5-4.5s 女主温柔地说：\"我喜欢你很久了，愿意做我的男朋友吗？\"，紧张又期待，温柔的语气，眼中带光，面部表情：微笑，眼睛湿润，身体语言：双手紧握，身体微微前倾。5-8s 男主激动地说：\"我愿意！我也喜欢你很久了！\"，激动、感动，声音带着哽咽，眼泪在眼眶中打转，面部表情：眼中含泪，嘴角上扬，身体语言：感动地点头，双手激动地握住女主的手。10秒",
      "style": "photorealistic",
      "duration": "10s",
      "aspect_ratio": "16:9",
      "resolution": "1080p",
      "fps": 24,
      "negative": "text, watermark, blurry, distorted"
    }
  },
  "assets": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "IMAGE",
      "scene": "REFERENCE",
      "prompt": "咖啡店背景参考图"
    }
  ],
  "dialogue": [
    {
      "id": "d1",
      "speaker": "女主角",
      "text": "我喜欢你很久了，愿意做我的男朋友吗？",
      "emotion": "紧张又期待",
      "start_time": "1.5s",
      "end_time": "4.5s",
      "notes": "温柔的语气，眼中带光",
      "external_dubbing": true,
      "dubbing_tool": "elevenlabs"
    },
    {
      "id": "d2",
      "speaker": "男主角",
      "text": "我愿意！我也喜欢你很久了！",
      "emotion": "激动、感动",
      "start_time": "5s",
      "end_time": "8s",
      "notes": "声音带着哽咽，眼泪在眼眶中打转",
      "external_dubbing": true,
      "dubbing_tool": "elevenlabs"
    }
  ]
}
```

---

## 检测关键词

### 检测用户输入中检测到以下关键词时，启用对白和情感模式：

- "对话"、"说话"、"对白"、"台词"
- "情感"、"表情"、"情绪"
- "配音"、"声音"、"音色"
- "口型"、"同步"
- "方言"、"口音"
- "歌声"、"唱歌"
- "外部配音"、"elevenlabs"、"polly"
- "音效"、"背景音乐"、"环境音"
- "synchronization"、"lip sync"、"dialogue"、"emotion"、"sound effect"
  "total_count": 2,
  "speakers": ["男主角", "女主角"],
  "needs_external_dubbing": true,
  "total_dialogue_duration": "6s",
  "recommended_dubbing_tool": "elevenlabs"
  }
  }

```

---

## 检测关键词

### 检测用户输入中检测到以下关键词时，启用对白和情感模式：

- "对话"、"说话"、"对白"、"台词"
- "情感"、"表情"、"情绪"
- "配音"、"声音"、"音色"
- "口型"、"同步"
- "方言"、"口音"
- "歌声"、"唱歌"
- "外部配音"、"elevenlabs"、"polly"
- "synchronization"、"lip sync"、"dialogue"、"emotion"
```
