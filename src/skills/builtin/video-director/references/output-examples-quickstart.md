# Output Examples - Quick Start

Quick reference for common output formats.

---

## Example 1: Short Idea to Full Project

**User Input:** "两个朋友在公园长椅上聊天，一人兴奋地分享旅行经历，另一人认真倾听"

**Output (Full Project):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "type": "FILM_PROJECT",
  "name": "秋日回忆",
  "description": "两个朋友在公园分享旅行经历",
  "status": "DRAFT",
  "totalDurationSeconds": 30,
  "userInput": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "uuid": "550e8400-e29b-41d4-a716-446655440001",
    "type": "FILM_USER_INPUT",
    "inputKind": "REQUIREMENT",
    "rawText": "两个朋友在公园长椅上聊天，一人兴奋地分享旅行经历，另一人认真倾听",
    "detectedLanguage": "zh",
    "completenessScore": 60,
    "createdAt": 1771101306021,
    "updatedAt": 1771101306021
  },
  "script": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "uuid": "550e8400-e29b-41d4-a716-446655440002",
    "type": "FILM_SCRIPT",
    "title": "秋日回忆",
    "genres": ["剧情", "友情"],
    "styleTags": ["电影写实", "温馨"],
    "content": "【场景1】 秋日公园长椅 - 外景 - 下午 - 晴朗\n\n【场景描述】\n秋日午后的公园，金色阳光透过梧桐树叶洒下斑驳的光影，地上散落着金黄的落叶。公园中央的小径旁，有一张老旧的木质长椅，椅面上有岁月的痕迹。远处隐约传来喷泉的水声和孩子们的笑声，氛围温馨而宁静。\n\n【角色】\n- 小明：坐在长椅左侧，背着双肩包，手里拿着一本旅行相册，神情兴奋\n- 小红：坐在长椅右侧，身体微微倾向小明，认真倾听的表情\n\n【动作】\n小明从背包里拿出一本棕色皮质的旅行相册，翻开，指向其中一张照片。小红凑过去看，眼睛里闪烁着好奇的光芒。\n\n【对话】\n小明：你看这张！这是在巴黎埃菲尔铁塔下面拍的，当时刚好赶上日落，太美了！\n小红：哇，真的好美！你当时一定很激动吧？\n\n【情感/氛围】\n温馨、怀旧、友情",
    "evaluation": {
      "score": 78,
      "grade": "Good",
      "dimensions": {
        "structure": 80,
        "characters": 75,
        "sceneDescription": 85,
        "dialogue": 72,
        "pacing": 78,
        "visualPotential": 85
      },
      "strengths": ["场景描写生动，有画面感", "视觉潜力好"],
      "weaknesses": ["对话可以更自然"],
      "suggestions": ["优化对话，增加口语化表达"]
    },
    "isStandardized": true,
    "isOptimized": true,
    "version": "1.0.0",
    "createdAt": 1771101306021,
    "updatedAt": 1771101306021
  },
  "characters": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "uuid": "550e8400-e29b-41d4-a716-446655440003",
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
      "referencePrompt": "28岁阳光男孩，黑色短发，棕色眼睛，穿着休闲夹克，微笑着有酒窝，电影质感，4K，高质量",
      "sceneUuids": ["550e8400-e29b-41d4-a716-446655440009"],
      "shotUuids": ["550e8400-e29b-41d4-a716-446655440010", "550e8400-e29b-41d4-a716-446655440011"],
      "createdAt": 1771101321203,
      "updatedAt": 1771101321203,
      "interactionSettings": {
        "voiceId": ""
      }
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "uuid": "550e8400-e29b-41d4-a716-446655440004",
      "type": "FILM_CHARACTER",
      "name": "小红",
      "characterType": "HUMAN",
      "status": "ACTIVE",
      "description": "27岁，温柔善良的女孩",
      "appearance": {
        "gender": "Female",
        "ageGroup": "Adult",
        "hairStyle": "长发",
        "hairColor": "深棕色",
        "eyeColor": "黑色",
        "height": "中等",
        "build": "苗条",
        "distinctiveFeatures": "笑起来眼睛弯弯的"
      },
      "personality": {
        "traits": ["温柔", "善良", "善于倾听"],
        "background": "小明的好朋友"
      },
      "costume": {
        "main": "米色毛衣、休闲裤、小白鞋",
        "accessories": []
      },
      "referencePrompt": "27岁温柔女孩，深棕色长发，黑色眼睛，穿着米色毛衣，微笑着眼睛弯弯的，电影质感，4K，高质量",
      "sceneUuids": ["550e8400-e29b-41d4-a716-446655440009"],
      "shotUuids": ["550e8400-e29b-41d4-a716-446655440010", "550e8400-e29b-41d4-a716-446655440011"],
      "createdAt": 1771101321204,
      "updatedAt": 1771101321204,
      "interactionSettings": {
        "voiceId": ""
      }
    }
  ],
  "props": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440005",
      "uuid": "550e8400-e29b-41d4-a716-446655440005",
      "type": "FILM_STORY_PROP",
      "name": "旅行相册",
      "role": "STORY",
      "category": "信物/纪念品",
      "description": "棕色皮质封面的旧相册，记录了小明的欧洲之旅",
      "appearance": {
        "material": "皮质",
        "color": "棕色",
        "condition": "旧，有使用痕迹",
        "distinctiveFeatures": "封面上有烫金的 'Travel Memories' 字样"
      },
      "storySignificance": "承载着小明的旅行回忆，推动两人情感发展",
      "interactions": ["小明从背包中拿出", "翻开相册", "指向照片"],
      "visualTags": ["怀旧", "温馨"],
      "referencePrompt": "一本旧的棕色皮质旅行相册，封面有烫金文字，有些磨损，内页贴满旅行照片，温馨怀旧，特写镜头，电影质感，4K，高质量",
      "characterUuids": ["550e8400-e29b-41d4-a716-446655440003"],
      "sceneUuids": ["550e8400-e29b-41d4-a716-446655440009"],
      "shotUuids": ["550e8400-e29b-41d4-a716-446655440011"],
      "createdAt": 1771101339203,
      "updatedAt": 1771101339203
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440006",
      "uuid": "550e8400-e29b-41d4-a716-446655440006",
      "type": "FILM_STORY_PROP",
      "name": "双肩背包",
      "role": "CHARACTER",
      "category": "日常用品",
      "description": "小明的黑色双肩背包",
      "appearance": {
        "material": "尼龙",
        "color": "黑色",
        "condition": "良好",
        "distinctiveFeatures": ""
      },
      "storySignificance": "装着旅行相册",
      "interactions": ["小明从背包中拿出相册"],
      "visualTags": [],
      "referencePrompt": "黑色双肩背包，放在长椅上，电影质感，4K，高质量",
      "characterUuids": ["550e8400-e29b-41d4-a716-446655440003"],
      "sceneUuids": ["550e8400-e29b-41d4-a716-446655440009"],
      "shotUuids": [],
      "createdAt": 1771101339204,
      "updatedAt": 1771101339204
    }
  ],
  "locations": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440007",
      "uuid": "550e8400-e29b-41d4-a716-446655440007",
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
      "spatialLayout": "公园中央的一片开阔草地，中间有一条蜿蜒的小径，小径旁有一张木质长椅，周围是高大的梧桐树，地上散落着金黄的落叶",
      "keyFeatures": ["老旧的木质长椅", "高大的梧桐树", "地上散落的落叶", "远处的喷泉"],
      "visualDescription": "秋日午后的公园，金色阳光透过梧桐树叶洒下，木质长椅上散落着金黄的落叶",
      "referencePrompt": "秋日午后的公园，金色阳光透过梧桐树叶洒下，木质长椅上散落着金黄的落叶，远处有喷泉，温馨宁静的氛围，电影质感，4K，高质量",
      "sceneUuids": ["550e8400-e29b-41d4-a716-446655440009"],
      "createdAt": 1771101331065,
      "updatedAt": 1771101331065
    }
  ],
  "scenes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440009",
      "uuid": "550e8400-e29b-41d4-a716-446655440009",
      "type": "FILM_SCENE",
      "index": 1,
      "title": "公园相遇",
      "locationUuid": "550e8400-e29b-41d4-a716-446655440007",
      "summary": "小明和小红在公园长椅上聊天，小明分享旅行经历",
      "moodTags": ["温馨", "愉快"],
      "durationSeconds": 30,
      "visualPrompt": "两个朋友在秋日公园长椅上聊天，温馨氛围，电影质感",
      "characterUuids": ["550e8400-e29b-41d4-a716-446655440003", "550e8400-e29b-41d4-a716-446655440004"],
      "propUuids": ["550e8400-e29b-41d4-a716-446655440005", "550e8400-e29b-41d4-a716-446655440006"],
      "shotUuids": ["550e8400-e29b-41d4-a716-446655440010", "550e8400-e29b-41d4-a716-446655440011", "550e8400-e29b-41d4-a716-446655440012", "550e8400-e29b-41d4-a716-446655440013"],
      "createdAt": 1771101359139,
      "updatedAt": 1771101359139
    }
  ],
  "shots": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "uuid": "550e8400-e29b-41d4-a716-446655440010",
      "type": "FILM_SHOT",
      "sceneUuid": "550e8400-e29b-41d4-a716-446655440009",
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
        "ambience": "鸟鸣声、风声、远处喷泉声",
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
          "base": "秋日午后的公园远景，金色阳光透过梧桐树叶洒下，温馨宁静的氛围，电影质感"
        },
        "status": "PENDING",
        "referenceImages": []
      },
      "createdAt": 1771101366611,
      "updatedAt": 1771101366611
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440011",
      "uuid": "550e8400-e29b-41d4-a716-446655440011",
      "type": "FILM_SHOT",
      "sceneUuid": "550e8400-e29b-41d4-a716-446655440009",
      "index": 2,
      "shotScale": "MEDIUM",
      "cameraMovement": "DOLLY_IN",
      "cameraAngle": "EYE_LEVEL",
      "durationSeconds": 4,
      "timeRange": "3-7s",
      "description": "中景，小明和小红坐在公园长椅上",
      "action": "小明从背包里拿出旅行相册",
      "dialogue": "",
      "dialogueItems": [],
      "lighting": "自然光",
      "sound": {
        "ambience": "环境音继续",
        "sfx": ["背包拉链声"],
        "music": "背景音乐继续"
      },
      "characterUuids": ["550e8400-e29b-41d4-a716-446655440003", "550e8400-e29b-41d4-a716-446655440004"],
      "propUuids": ["550e8400-e29b-41d4-a716-446655440005", "550e8400-e29b-41d4-a716-446655440006"],
      "videoGeneration": {
        "mode": "TEXT_TO_VIDEO",
        "product": "SINGLE",
        "modelId": "default",
        "prompt": {
          "base": "中景，两个年轻人坐在公园长椅上，男孩从背包里拿出相册，缓慢推近镜头，秋日午后，温馨氛围"
        },
        "status": "PENDING",
        "referenceImages": []
      },
      "createdAt": 1771101368686,
      "updatedAt": 1771101368686
    }
  ],
  "soundtrack": {
    "overallStyle": "温馨、抒情",
    "tracks": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440014",
        "timeRange": "0-30s",
        "style": "温馨抒情",
        "instrumentation": "钢琴、小提琴",
        "description": "轻柔的背景音乐，贯穿整个视频"
      }
    ]
  },
  "mediaResources": [],
  "settings": {
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
  },
  "videoPromptEngineerInput": {
    "mode": "multi-frame",
    "platforms": ["kling", "jimeng"],
    "frames": [
      {
        "time": "0-3s",
        "prompt": "秋日午后的公园远景，金色阳光，温馨宁静，电影质感"
      },
      {
        "time": "3-7s",
        "prompt": "中景，两个年轻人坐在公园长椅上，男孩从背包里拿出相册，缓慢推近镜头，秋日午后，温馨氛围"
      }
    ]
  },
  "createdAt": 1771101306021,
  "updatedAt": 1771101306083
}
```

---

## Example 2: Script Only (Modular Output)

```json
{
  "userInput": {
    "id": "uuid-v4",
    "uuid": "uuid-v4",
    "type": "FILM_USER_INPUT",
    "inputKind": "REQUIREMENT",
    "rawText": "两个朋友在公园长椅上聊天",
    "detectedLanguage": "zh",
    "completenessScore": 50,
    "createdAt": 1771101306021,
    "updatedAt": 1771101306021
  },
  "script": {
    "id": "uuid-v4",
    "uuid": "uuid-v4",
    "type": "FILM_SCRIPT",
    "title": "公园聊天",
    "genres": ["剧情", "友情"],
    "styleTags": ["电影写实", "温馨"],
    "content": "【场景1】 公园长椅 - 外景 - 下午 - 晴朗\n\n【场景描述】\n温馨的公园场景...",
    "evaluation": {
      "score": 75,
      "grade": "Good",
      "strengths": [],
      "weaknesses": [],
      "suggestions": []
    },
    "isStandardized": true,
    "isOptimized": true,
    "version": "1.0.0",
    "createdAt": 1771101306021,
    "updatedAt": 1771101306021
  }
}
```

---

## Example 3: Characters Only (Modular Output)

```json
{
  "userInput": { ... },
  "characters": [
    {
      "id": "uuid-v4",
      "uuid": "uuid-v4",
      "type": "FILM_CHARACTER",
      "name": "小明",
      "characterType": "HUMAN",
      "status": "ACTIVE",
      "description": "28岁，热爱旅行的阳光男孩",
      "appearance": { ... },
      "personality": { ... },
      "costume": { ... },
      "referencePrompt": "...",
      "sceneUuids": [],
      "shotUuids": [],
      "createdAt": 1771101321203,
      "updatedAt": 1771101321203,
      "interactionSettings": { "voiceId": "" }
    }
  ]
}
```

---

## Example 4: Locations Only (Modular Output)

```json
{
  "userInput": { ... },
  "locations": [
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
      "referencePrompt": "...",
      "sceneUuids": [],
      "createdAt": 1771101331065,
      "updatedAt": 1771101331065
    }
  ]
}
```
