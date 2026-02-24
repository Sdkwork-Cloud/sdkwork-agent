---
name: Data Structure Reference
description: Complete data structure definition for FILM_PROJECT
version: 1.0
category: Reference
---

# Data Structure Reference

Complete definition of the `FILM_PROJECT` data structure.

---

## Enums

### Shot Scale
| Value | Description |
|-------|-------------|
| `EXTREME_WIDE` | 极远景 |
| `WIDE` | 远景 |
| `FULL` | 全景 |
| `MEDIUM` | 中景 |
| `MEDIUM_CLOSE_UP` | 中近景 |
| `CLOSE_UP` | 近景 |
| `EXTREME_CLOSE_UP` | 特写 |
| `OVER_THE_SHOULDER` | 过肩镜头 |

### Camera Movement
| Value | Description |
|-------|-------------|
| `STATIC` | 静态 |
| `PAN_LEFT` | 向左平移 |
| `PAN_RIGHT` | 向右平移 |
| `TILT_UP` | 向上俯仰 |
| `TILT_DOWN` | 向下俯仰 |
| `ZOOM_IN` | 推近 |
| `ZOOM_OUT` | 拉远 |
| `DOLLY_IN` | 向前轨道移动 |
| `DOLLY_OUT` | 向后轨道移动 |
| `TRACKING` | 跟拍 |
| `ORBIT` | 环绕 |
| `HANDHELD` | 手持 |
| `AERIAL` | 航拍 |

### Camera Angle
| Value | Description |
|-------|-------------|
| `EYE_LEVEL` | 平视 |
| `LOW_ANGLE` | 低角度 |
| `HIGH_ANGLE` | 高角度 |
| `BIRDS_EYE` | 鸟瞰 |
| `DUTCH_ANGLE` | 荷兰角 |

### Time Of Day
| Value | Description |
|-------|-------------|
| `DAWN` | 黎明 |
| `EARLY_MORNING` | 清晨 |
| `MORNING` | 上午 |
| `MIDDAY` | 正午 |
| `AFTERNOON` | 下午 |
| `SUNSET` | 黄昏 |
| `EVENING` | 傍晚 |
| `NIGHT` | 夜晚 |
| `LATE_NIGHT` | 深夜 |

### Weather
| Value | Description |
|-------|-------------|
| `SUNNY` | 晴朗 |
| `CLOUDY` | 多云 |
| `RAINY` | 下雨 |
| `SNOWY` | 下雪 |
| `FOGGY` | 雾天 |
| `WINDY` | 大风 |

### Season
| Value | Description |
|-------|-------------|
| `SPRING` | 春 |
| `SUMMER` | 夏 |
| `AUTUMN` | 秋 |
| `WINTER` | 冬 |

### Video Generation Mode
| Value | Description |
|-------|-------------|
| `TEXT_TO_VIDEO` | 文生视频 |
| `IMAGE_TO_VIDEO` | 图生视频 |
| `FRAME_CONTROL` | 首尾帧控制 |
| `MULTI_FRAME` | 多帧/分镜 |
| `UNIVERSAL_REFERENCE` | 全能参考 |

### Prop Role
| Value | Description |
|-------|-------------|
| `STORY` | 故事关键道具 |
| `ATMOSPHERE` | 氛围道具 |
| `CHARACTER` | 角色道具 |
| `ACTION` | 动作道具 |

---

## Root Object: FILM_PROJECT

```json
{
  "id": "uuid-v4",
  "uuid": "uuid-v4",
  "type": "FILM_PROJECT",
  "name": "string",
  "description": "string",
  "status": "DRAFT",
  "totalDurationSeconds": 30,
  "userInput": {},
  "script": {},
  "characters": [],
  "props": [],
  "locations": [],
  "scenes": [],
  "shots": [],
  "soundtrack": {},
  "mediaResources": [],
  "settings": {},
  "videoPromptEngineerInput": {},
  "createdAt": 1771101306021,
  "updatedAt": 1771101306083
}
```

---

## FILM_USER_INPUT

```json
{
  "id": "uuid-v4",
  "uuid": "uuid-v4",
  "type": "FILM_USER_INPUT",
  "inputKind": "REQUIREMENT",
  "rawText": "string",
  "detectedLanguage": "zh",
  "completenessScore": 85,
  "createdAt": 1771101306021,
  "updatedAt": 1771101306021
}
```

---

## FILM_SCRIPT

```json
{
  "id": "uuid-v4",
  "uuid": "uuid-v4",
  "type": "FILM_SCRIPT",
  "title": "string",
  "genres": ["剧情", "友情"],
  "styleTags": ["电影写实", "温馨"],
  "content": "string (完整剧本内容)",
  "evaluation": {
    "score": 78,
    "grade": "Good",
    "dimensions": {
      "structure": 80,
      "characters": 75,
      "sceneDescription": 82,
      "dialogue": 70,
      "pacing": 78,
      "visualPotential": 85
    },
    "strengths": ["场景描写生动"],
    "weaknesses": ["对话略显生硬"],
    "suggestions": ["优化对话"]
  },
  "isStandardized": true,
  "isOptimized": true,
  "sceneOrder": ["scene-uuid-1"],
  "version": "1.0.0",
  "createdAt": 1771101306021,
  "updatedAt": 1771101306021
}
```

---

## FILM_CHARACTER

```json
{
  "id": "uuid-v4",
  "uuid": "uuid-v4",
  "type": "FILM_CHARACTER",
  "name": "小明",
  "characterType": "HUMAN",
  "status": "ACTIVE",
  "description": "28岁，热爱旅行的阳光男孩",
  "appearance": {
    "gender": "Male",
    "ageGroup": "Adult",
    "hairStyle": "短发",
    "hairColor": "黑色",
    "eyeColor": "棕色",
    "height": "中等",
    "build": "匀称",
    "distinctiveFeatures": "笑起来有酒窝"
  },
  "personality": {
    "traits": ["开朗", "热情", "喜欢分享"],
    "background": "刚从欧洲旅行回来"
  },
  "costume": {
    "main": "休闲夹克、牛仔裤、运动鞋",
    "accessories": ["双肩背包"]
  },
  "referencePrompt": "角色参考图生成提示词",
  "sceneUuids": ["scene-uuid-1"],
  "shotUuids": ["shot-uuid-1", "shot-uuid-2"],
  "createdAt": 1771101321203,
  "updatedAt": 1771101321203,
  "interactionSettings": {
    "voiceId": ""
  }
}
```

---

## FILM_STORY_PROP

```json
{
  "id": "uuid-v4",
  "uuid": "uuid-v4",
  "type": "FILM_STORY_PROP",
  "name": "旅行相册",
  "role": "STORY",
  "category": "信物/纪念品",
  "description": "棕色皮质封面的旧相册",
  "appearance": {
    "material": "皮质",
    "color": "棕色",
    "condition": "旧，有使用痕迹",
    "distinctiveFeatures": "封面上有烫金的 'Travel Memories' 字样"
  },
  "storySignificance": "承载着小明的旅行回忆",
  "interactions": ["小明从背包中拿出", "翻开相册"],
  "visualTags": ["怀旧", "温馨"],
  "referencePrompt": "道具参考图生成提示词",
  "characterUuids": ["char-uuid-1"],
  "sceneUuids": ["scene-uuid-1"],
  "shotUuids": ["shot-uuid-2"],
  "createdAt": 1771101339203,
  "updatedAt": 1771101339203
}
```

---

## FILM_LOCATION

```json
{
  "id": "uuid-v4",
  "uuid": "uuid-v4",
  "type": "FILM_LOCATION",
  "name": "秋日公园长椅",
  "indoor": false,
  "locationType": "自然场景",
  "timeOfDay": "AFTERNOON",
  "season": "AUTUMN",
  "weather": "SUNNY",
  "atmosphere": "温馨、宁静",
  "atmosphereTags": ["温馨", "宁静", "怀旧"],
  "lightingStyle": "自然光，金色午后阳光",
  "colorPalette": "暖色调，金黄色、橙色、棕色",
  "spatialLayout": "公园中央的一片开阔草地，中间有一条蜿蜒的小径",
  "keyFeatures": ["老旧的木质长椅", "高大的梧桐树", "地上散落的落叶"],
  "visualDescription": "秋日午后的公园，金色阳光透过梧桐树叶洒下",
  "referencePrompt": "场景参考图生成提示词",
  "sceneUuids": ["scene-uuid-1"],
  "createdAt": 1771101331065,
  "updatedAt": 1771101331065
}
```

---

## FILM_SCENE

```json
{
  "id": "uuid-v4",
  "uuid": "uuid-v4",
  "type": "FILM_SCENE",
  "index": 1,
  "title": "公园相遇",
  "locationUuid": "location-uuid-1",
  "summary": "小明和小红在公园长椅上聊天",
  "moodTags": ["温馨", "愉快"],
  "durationSeconds": 30,
  "visualPrompt": "分镜视频生成提示词",
  "characterUuids": ["char-uuid-1", "char-uuid-2"],
  "propUuids": ["prop-uuid-1", "prop-uuid-2"],
  "shotUuids": ["shot-uuid-1", "shot-uuid-2"],
  "createdAt": 1771101359139,
  "updatedAt": 1771101359139
}
```

---

## FILM_SHOT

```json
{
  "id": "uuid-v4",
  "uuid": "uuid-v4",
  "type": "FILM_SHOT",
  "sceneUuid": "scene-uuid-1",
  "index": 1,
  "shotScale": "WIDE",
  "cameraMovement": "STATIC",
  "cameraAngle": "EYE_LEVEL",
  "durationSeconds": 3,
  "timeRange": "0-3s",
  "description": "远景，展示整个秋日公园的景色",
  "action": "",
  "dialogue": "",
  "dialogueItems": [],
  "lighting": "金色午后阳光",
  "sound": {
    "ambience": "鸟鸣声、风声",
    "sfx": [],
    "music": "温馨的背景音乐"
  },
  "characterUuids": [],
  "propUuids": [],
  "videoGeneration": {
    "mode": "TEXT_TO_VIDEO",
    "product": "SINGLE",
    "modelId": "default",
    "prompt": {
      "base": "秋日午后的公园远景，金色阳光，温馨宁静，电影质感"
    },
    "status": "PENDING",
    "referenceImages": []
  },
  "createdAt": 1771101366611,
  "updatedAt": 1771101366611
}
```

---

## Soundtrack

```json
{
  "overallStyle": "温馨、抒情",
  "tracks": [
    {
      "id": "uuid-v4",
      "timeRange": "0-30s",
      "style": "温馨抒情",
      "instrumentation": "钢琴、小提琴",
      "description": "轻柔的背景音乐，贯穿整个视频"
    }
  ]
}
```

---

## Settings

```json
{
  "defaultLanguage": "zh-CN",
  "defaultImageModelId": "default",
  "defaultVideoModelId": "default",
  "platforms": ["kling", "jimeng"],
  "aspectRatio": "16:9",
  "resolution": "1080P",
  "frameRate": 24,
  "quality": "standard",
  "generationSettings": {
    "autoGenerateImages": false,
    "autoGenerateVideos": false,
    "parallelGeneration": true,
    "maxConcurrentTasks": 3
  }
}
```
