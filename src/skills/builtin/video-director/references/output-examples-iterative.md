# 迭代式工作流程输出示例 (Iterative Workflow Output Examples)

本文件提供迭代式工作流程每个步骤的完整输出示例。

---

## 示例：温馨公园场景 - 完整迭代流程

用户输入："两个朋友在公园长椅上聊天，一人兴奋地分享旅行经历，另一人认真倾听"

---

### 步骤 0：确认工作模式

**输出：**
```
好的！我将使用迭代式工作流程来帮你完成这个视频项目。

我们将分5个步骤来完成：
1️⃣ 剧本处理与优化
2️⃣ 角色设计
3️⃣ 场景与道具设计
4️⃣ 分镜创作
5️⃣ 完整项目整合

是否现在开始第1步：剧本处理？
```

---

### 步骤 1：剧本处理（Step 1 - Script）

**输出：**
```json
{
  "step": 1,
  "stepName": "剧本处理",
  "status": "completed",
  "userInput": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "type": "FILM_USER_INPUT",
    "inputKind": "REQUIREMENT",
    "rawText": "两个朋友在公园长椅上聊天，一人兴奋地分享旅行经历，另一人认真倾听",
    "detectedLanguage": "zh",
    "completenessScore": 60,
    "createdAt": 1771101306021,
    "updatedAt": 1771101306021
  },
  "script": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "uuid": "550e8400-e29b-41d4-a716-446655440001",
    "type": "FILM_SCRIPT",
    "title": "秋日回忆",
    "genres": ["剧情", "友情"],
    "styleTags": ["电影写实", "温馨"],
    "content": "秋日回忆\n\nINT./EXT. 城市公园 - 下午\n\n金色的阳光透过泛黄的梧桐树叶洒落，在地上投下斑驳的光影。公园长椅上坐着两个人。\n\n李阳（25岁，阳光开朗）手里拿着一本旅行相册，兴奋地说着什么。\n\n张悦（24岁，温柔文静）坐在旁边，认真倾听，时不时点头微笑。\n\n李阳\n（激动地）\n你真该看看那里的日落！整个天空都染成了橙红色，就像...就像整个世界都在燃烧一样美！\n\n张悦\n（微笑）\n听起来真的很美。你拍了很多照片吧？\n\n李阳\n当然！来，我给你看...\n\n李阳翻开相册，一张一张地展示给张悦看。阳光照在相册上，照片里的风景格外美丽。\n\n张悦\n（指着一张照片）\n这张是在哪里拍的？\n\n李阳\n这是在山顶上！那天我们爬了三个小时才到山顶，但是看到这景色的那一刻，一切都值了！\n\n两个朋友继续聊着，笑声在公园里回荡。远处，一群鸽子飞过天空。\n\n（淡出）",
    "evaluation": {
      "score": 82,
      "grade": "Good",
      "strengths": ["场景描写生动", "人物性格鲜明", "情感氛围温馨"],
      "weaknesses": ["对话可以更丰富", "可以增加一些细节描写"],
      "suggestions": ["增加更多感官细节", "让对话更自然流畅"]
    },
    "isStandardized": true,
    "isOptimized": true,
    "version": "1.0.0",
    "createdAt": 1771101306021,
    "updatedAt": 1771101306021
  },
  "nextStep": {
    "step": 2,
    "stepName": "角色设计",
    "description": "基于剧本设计所有角色",
    "prompt": "是否继续进行第2步：角色设计？"
  }
}
```

**完成后询问：**
```
✅ 第1步完成！剧本已处理完毕。

是否继续进行第2步：角色设计？
```

---

### 步骤 2：角色设计（Step 2 - Characters）

**输出：**
```json
{
  "step": 2,
  "stepName": "角色设计",
  "status": "completed",
  "script": { ... },
  "characters": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "uuid": "550e8400-e29b-41d4-a716-446655440010",
      "type": "FILM_CHARACTER",
      "name": "李阳",
      "age": 25,
      "gender": "男",
      "role": "主角",
      "appearance": {
        "faceType": "方形脸",
        "hair": "黑色短发，微微凌乱",
        "eyes": "棕色眼睛，眼神明亮",
        "bodyType": "中等身材，略显健壮",
        "distinctiveFeatures": "左脸颊有一颗小痣"
      },
      "personality": {
        "tags": ["阳光开朗", "热情健谈", "热爱旅行"],
        "background": "刚从云南旅行回来，充满故事"
      },
      "clothing": {
        "main": "卡其色夹克，浅蓝色牛仔裤",
        "accessories": "棕色背包，手表"
      },
      "signatureActions": ["兴奋时挥手", "笑时露出虎牙"],
      "referenceImagePrompts": {
        "main": "25岁中国男性，方形脸，黑色短发，棕色眼睛，阳光开朗的表情，卡其色夹克，浅蓝色牛仔裤，公园背景，自然光照，电影写实风格，8k高清",
        "closeup": "25岁中国男性特写，方形脸，黑色短发，棕色眼睛，左脸颊小痣，阳光笑容，电影写实风格，8k高清"
      }
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440011",
      "uuid": "550e8400-e29b-41d4-a716-446655440011",
      "type": "FILM_CHARACTER",
      "name": "张悦",
      "age": 24,
      "gender": "女",
      "role": "主角",
      "appearance": {
        "faceType": "瓜子脸",
        "hair": "黑色长直发，披肩",
        "eyes": "黑色眼睛，温柔如水",
        "bodyType": "纤细苗条",
        "distinctiveFeatures": "戴细框眼镜"
      },
      "personality": {
        "tags": ["温柔文静", "善于倾听", "细心体贴"],
        "background": "李阳的好朋友，喜欢安静"
      },
      "clothing": {
        "main": "米白色毛衣，深灰色长裙",
        "accessories": "细框眼镜，珍珠耳钉"
      },
      "signatureActions": ["倾听时微微歪头", "微笑时嘴角上扬"],
      "referenceImagePrompts": {
        "main": "24岁中国女性，瓜子脸，黑色长直发，黑色眼睛，温柔表情，米白色毛衣，深灰色长裙，细框眼镜，公园背景，自然光照，电影写实风格，8k高清",
        "closeup": "24岁中国女性特写，瓜子脸，黑色长直发，黑色眼睛，细框眼镜，温柔微笑，电影写实风格，8k高清"
      }
    }
  ],
  "nextStep": {
    "step": 3,
    "stepName": "场景与道具设计",
    "description": "设计所有场景和道具",
    "prompt": "是否继续进行第3步：场景与道具设计？"
  }
}
```

**完成后询问：**
```
✅ 第2步完成！所有角色已设计完毕。

是否继续进行第3步：场景与道具设计？
```

---

### 步骤 3：场景与道具设计（Step 3 - Locations & Props）

**输出：**
```json
{
  "step": 3,
  "stepName": "场景与道具设计",
  "status": "completed",
  "script": { ... },
  "characters": [ ... ],
  "locations": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "uuid": "550e8400-e29b-41d4-a716-446655440020",
      "type": "FILM_LOCATION",
      "name": "城市公园",
      "locationType": "outdoor",
      "timeOfDay": "afternoon",
      "weather": "sunny",
      "season": "autumn",
      "atmosphere": "温馨、宁静、怀旧",
      "lightingStyle": "金色侧光，柔和温暖",
      "colorPalette": ["金色", "橙色", "棕色", "绿色"],
      "spatialLayout": "公园中央的开阔区域，周围有梧桐树，中间有一条小径，长椅位于树下",
      "keyFeatures": ["梧桐树", "木质长椅", "草地", "小径", "远处的鸽子"],
      "referenceImagePrompts": {
        "wide": "秋天的城市公园，金色阳光透过梧桐树叶，斑驳光影洒在草地上，木质长椅，远处有鸽子飞过，温馨宁静的氛围，电影写实风格，8k高清，宽景",
        "closeup": "秋天公园的木质长椅特写，金色阳光照射，周围有梧桐树叶，温馨氛围，电影写实风格，8k高清"
      }
    }
  ],
  "props": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "uuid": "550e8400-e29b-41d4-a716-446655440030",
      "type": "FILM_PROP",
      "name": "旅行相册",
      "category": "personal_item",
      "role": "关键道具，承载回忆",
      "appearance": {
        "material": "皮质封面",
        "color": "棕色",
        "condition": "略显旧，有使用痕迹",
        "distinctiveFeatures": "封面上有烫金的\"旅行\"二字"
      },
      "storyMeaning": "李阳旅行的见证，承载着珍贵的回忆",
      "interactionMethod": "翻开、展示照片、指认照片",
      "visualLabels": ["回忆", "旅行", "友谊"],
      "referenceImagePrompts": {
        "main": "棕色皮质旅行相册，封面上有烫金\"旅行\"二字，略显旧有使用痕迹，放在公园长椅上，金色阳光照射，电影写实风格，8k高清",
        "open": "翻开的旅行相册，展示着风景照片，金色阳光照在照片上，电影写实风格，8k高清"
      }
    }
  ],
  "nextStep": {
    "step": 4,
    "stepName": "分镜创作",
    "description": "创建逐镜头分镜脚本",
    "prompt": "是否继续进行第4步：分镜创作？"
  }
}
```

**完成后询问：**
```
✅ 第3步完成！所有场景和道具已设计完毕。

是否继续进行第4步：分镜创作？
```

---

### 步骤 4：分镜创作（Step 4 - Storyboard）

**输出：**
```json
{
  "step": 4,
  "stepName": "分镜创作",
  "status": "completed",
  "script": { ... },
  "characters": [ ... ],
  "locations": [ ... ],
  "props": [ ... ],
  "scenes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440040",
      "uuid": "550e8400-e29b-41d4-a716-446655440040",
      "type": "FILM_SCENE",
      "index": 1,
      "locationId": "550e8400-e29b-41d4-a716-446655440020",
      "summary": "秋日公园，两个朋友在长椅上聊天",
      "atmosphereTags": ["温馨", "宁静", "怀旧"],
      "durationSeconds": 30,
      "characterIds": ["550e8400-e29b-41d4-a716-446655440010", "550e8400-e29b-41d4-a716-446655440011"],
      "propIds": ["550e8400-e29b-41d4-a716-446655440030"],
      "visualPrompt": "秋天的城市公园，金色阳光透过梧桐树叶，两个朋友坐在木质长椅上聊天，温馨宁静的氛围"
    }
  ],
  "shots": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440050",
      "uuid": "550e8400-e29b-41d4-a716-446655440050",
      "type": "FILM_SHOT",
      "sceneId": "550e8400-e29b-41d4-a716-446655440040",
      "index": 1,
      "shotType": "极远景",
      "cameraMovement": "静态",
      "cameraAngle": "鸟瞰",
      "durationSeconds": 3,
      "timeRangeStart": 0,
      "timeRangeEnd": 3,
      "description": "俯瞰整个秋天的公园，展示环境",
      "action": "静止的航拍视角，展示整个公园",
      "dialogue": "",
      "lighting": "金色阳光，顶光",
      "soundDesign": {
        "ambient": "公园环境音，鸟鸣",
        "effects": [],
        "music": "轻柔的背景音乐开始"
      },
      "characterIds": [],
      "propIds": [],
      "videoGenerationConfig": {
        "mode": "text_to_video",
        "prompt": "极远景，鸟瞰角度，静态镜头，秋天的城市公园，金色阳光，梧桐树林，草地，小径，温馨宁静的氛围，电影写实风格，8k高清，时长3秒",
        "negativePrompt": "人物，建筑，现代设施，杂物",
        "model": "default",
        "aspectRatio": "16:9",
        "durationSeconds": 3
      }
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440051",
      "uuid": "550e8400-e29b-41d4-a716-446655440051",
      "type": "FILM_SHOT",
      "sceneId": "550e8400-e29b-41d4-a716-446655440040",
      "index": 2,
      "shotType": "全景",
      "cameraMovement": "平移",
      "cameraAngle": "平视",
      "durationSeconds": 4,
      "timeRangeStart": 3,
      "timeRangeEnd": 7,
      "description": "平移镜头展示长椅上的两个朋友",
      "action": "镜头从左向右平移，展示李阳和张悦坐在长椅上",
      "dialogue": "",
      "lighting": "金色侧光，柔和温暖",
      "soundDesign": {
        "ambient": "公园环境音",
        "effects": [],
        "music": "轻柔的背景音乐继续"
      },
      "characterIds": ["550e8400-e29b-41d4-a716-446655440010", "550e8400-e29b-41d4-a716-446655440011"],
      "propIds": ["550e8400-e29b-41d4-a716-446655440030"],
      "videoGenerationConfig": {
        "mode": "text_to_video",
        "prompt": "全景镜头，平移，平视角度，秋天的公园长椅上，25岁中国男性李阳（阳光开朗，卡其色夹克）和24岁中国女性张悦（温柔文静，米白色毛衣，细框眼镜）坐在一起，旁边放着棕色旅行相册，金色阳光透过梧桐树叶，斑驳光影，温馨氛围，电影写实风格，8k高清，时长4秒",
        "negativePrompt": "其他人物，杂物，现代建筑",
        "model": "default",
        "aspectRatio": "16:9",
        "durationSeconds": 4
      }
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440052",
      "uuid": "550e8400-e29b-41d4-a716-446655440052",
      "type": "FILM_SHOT",
      "sceneId": "550e8400-e29b-41d4-a716-446655440040",
      "index": 3,
      "shotType": "中景",
      "cameraMovement": "静态",
      "cameraAngle": "平视",
      "durationSeconds": 5,
      "timeRangeStart": 7,
      "timeRangeEnd": 12,
      "description": "李阳兴奋地说话",
      "action": "李阳兴奋地说着什么，手势丰富",
      "dialogue": "李阳：你真该看看那里的日落！整个天空都染成了橙红色，就像...就像整个世界都在燃烧一样美！",
      "lighting": "金色侧光",
      "soundDesign": {
        "ambient": "公园环境音",
        "effects": [],
        "music": "轻柔的背景音乐"
      },
      "characterIds": ["550e8400-e29b-41d4-a716-446655440010"],
      "propIds": [],
      "videoGenerationConfig": {
        "mode": "text_to_video",
        "prompt": "中景镜头，静态，平视角度，25岁中国男性李阳，方形脸，黑色短发，棕色眼睛，阳光开朗的表情，卡其色夹克，兴奋地说话，手势丰富，公园背景，金色阳光，电影写实风格，8k高清，时长5秒",
        "negativePrompt": "其他人物，杂物",
        "model": "default",
        "aspectRatio": "16:9",
        "durationSeconds": 5
      }
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440053",
      "uuid": "550e8400-e29b-41d4-a716-446655440053",
      "type": "FILM_SHOT",
      "sceneId": "550e8400-e29b-41d4-a716-446655440040",
      "index": 4,
      "shotType": "中近景",
      "cameraMovement": "静态",
      "cameraAngle": "平视",
      "durationSeconds": 4,
      "timeRangeStart": 12,
      "timeRangeEnd": 16,
      "description": "张悦认真倾听",
      "action": "张悦认真倾听，微微歪头，微笑",
      "dialogue": "张悦：听起来真的很美。你拍了很多照片吧？",
      "lighting": "金色侧光",
      "soundDesign": {
        "ambient": "公园环境音",
        "effects": [],
        "music": "轻柔的背景音乐"
      },
      "characterIds": ["550e8400-e29b-41d4-a716-446655440011"],
      "propIds": [],
      "videoGenerationConfig": {
        "mode": "text_to_video",
        "prompt": "中近景镜头，静态，平视角度，24岁中国女性张悦，瓜子脸，黑色长直发，黑色眼睛，细框眼镜，温柔文静的表情，米白色毛衣，认真倾听，微微歪头，微笑，公园背景，金色阳光，电影写实风格，8k高清，时长4秒",
        "negativePrompt": "其他人物，杂物",
        "model": "default",
        "aspectRatio": "16:9",
        "durationSeconds": 4
      }
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440054",
      "uuid": "550e8400-e29b-41d4-a716-446655440054",
      "type": "FILM_SHOT",
      "sceneId": "550e8400-e29b-41d4-a716-446655440040",
      "index": 5,
      "shotType": "特写",
      "cameraMovement": "静态",
      "cameraAngle": "平视",
      "durationSeconds": 4,
      "timeRangeStart": 16,
      "timeRangeEnd": 20,
      "description": "李阳翻开相册",
      "action": "李阳的手翻开旅行相册",
      "dialogue": "李阳：当然！来，我给你看...",
      "lighting": "金色阳光照在相册上",
      "soundDesign": {
        "ambient": "公园环境音",
        "effects": ["翻页声"],
        "music": "轻柔的背景音乐"
      },
      "characterIds": [],
      "propIds": ["550e8400-e29b-41d4-a716-446655440030"],
      "videoGenerationConfig": {
        "mode": "text_to_video",
        "prompt": "特写镜头，静态，平视角度，手翻开棕色皮质旅行相册，封面上有烫金\"旅行\"二字，金色阳光照在相册上，电影写实风格，8k高清，时长4秒",
        "negativePrompt": "人物脸部，其他杂物",
        "model": "default",
        "aspectRatio": "16:9",
        "durationSeconds": 4
      }
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440055",
      "uuid": "550e8400-e29b-41d4-a716-446655440055",
      "type": "FILM_SHOT",
      "sceneId": "550e8400-e29b-41d4-a716-446655440040",
      "index": 6,
      "shotType": "中景",
      "cameraMovement": "静态",
      "cameraAngle": "平视",
      "durationSeconds": 5,
      "timeRangeStart": 20,
      "timeRangeEnd": 25,
      "description": "两人一起看相册",
      "action": "李阳和张悦一起看着相册，李阳一张一张展示",
      "dialogue": "张悦：这张是在哪里拍的？\n李阳：这是在山顶上！那天我们爬了三个小时才到山顶，但是看到这景色的那一刻，一切都值了！",
      "lighting": "金色侧光",
      "soundDesign": {
        "ambient": "公园环境音",
        "effects": [],
        "music": "轻柔的背景音乐"
      },
      "characterIds": ["550e8400-e29b-41d4-a716-446655440010", "550e8400-e29b-41d4-a716-446655440011"],
      "propIds": ["550e8400-e29b-41d4-a716-446655440030"],
      "videoGenerationConfig": {
        "mode": "text_to_video",
        "prompt": "中景镜头，静态，平视角度，李阳和张悦坐在公园长椅上一起看着旅行相册，李阳一张一张展示照片，金色阳光，温馨氛围，电影写实风格，8k高清，时长5秒",
        "negativePrompt": "其他人物，杂物",
        "model": "default",
        "aspectRatio": "16:9",
        "durationSeconds": 5
      }
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440056",
      "uuid": "550e8400-e29b-41d4-a716-446655440056",
      "type": "FILM_SHOT",
      "sceneId": "550e8400-e29b-41d4-a716-446655440040",
      "index": 7,
      "shotType": "远景",
      "cameraMovement": "静态",
      "cameraAngle": "平视",
      "durationSeconds": 5,
      "timeRangeStart": 25,
      "timeRangeEnd": 30,
      "description": "淡出，结束",
      "action": "远景镜头，两个朋友继续聊天，远处一群鸽子飞过，画面淡出",
      "dialogue": "",
      "lighting": "金色阳光",
      "soundDesign": {
        "ambient": "公园环境音，逐渐减弱",
        "effects": ["鸽子翅膀声"],
        "music": "轻柔的背景音乐，逐渐减弱"
      },
      "characterIds": ["550e8400-e29b-41d4-a716-446655440010", "550e8400-e29b-41d4-a716-446655440011"],
      "propIds": ["550e8400-e29b-41d4-a716-446655440030"],
      "videoGenerationConfig": {
        "mode": "text_to_video",
        "prompt": "远景镜头，静态，平视角度，秋天的公园，两个朋友坐在长椅上聊天，远处一群鸽子飞过天空，金色阳光，温馨宁静的氛围，画面淡出，电影写实风格，8k高清，时长5秒",
        "negativePrompt": "其他人物，杂物，现代建筑",
        "model": "default",
        "aspectRatio": "16:9",
        "durationSeconds": 5
      }
    }
  ],
  "nextStep": {
    "step": 5,
    "stepName": "完整项目整合",
    "description": "整合所有内容为完整项目",
    "prompt": "是否继续进行第5步：完整项目整合？"
  }
}
```

**完成后询问：**
```
✅ 第4步完成！分镜已创作完毕。

是否继续进行第5步：完整项目整合？
```

---

### 步骤 5：完整项目整合（Step 5 - Complete Project）

**输出：**
```json
{
  "step": 5,
  "stepName": "完整项目整合",
  "status": "completed",
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "type": "FILM_PROJECT",
    "name": "秋日回忆",
    "description": "两个朋友在公园分享旅行经历",
    "status": "DRAFT",
    "totalDurationSeconds": 30,
    "userInput": { ... },
    "script": { ... },
    "characters": [ ... ],
    "props": [ ... ],
    "locations": [ ... ],
    "scenes": [ ... ],
    "shots": [ ... ],
    "soundtrack": {
      "id": "550e8400-e29b-41d4-a716-446655440060",
      "uuid": "550e8400-e29b-41d4-a716-446655440060",
      "type": "FILM_SOUNDTRACK",
      "ambientSounds": ["公园环境音", "鸟鸣"],
      "soundEffects": ["翻页声", "鸽子翅膀声"],
      "musicPlan": [
        {
          "shotId": "550e8400-e29b-41d4-a716-446655440050",
          "musicType": "background",
          "style": "轻柔钢琴",
          "mood": "温馨"
        }
      ],
      "syncStrategy": "音画同步，音乐随画面情绪变化"
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
      "shots": [
        {
          "shotId": "550e8400-e29b-41d4-a716-446655440050",
          "prompt": "极远景，鸟瞰角度，静态镜头，秋天的城市公园，金色阳光，梧桐树林，草地，小径，温馨宁静的氛围，电影写实风格，8k高清",
          "negativePrompt": "人物，建筑，现代设施，杂物",
          "style": "电影写实",
          "durationSeconds": 3
        }
      ]
    },
    "createdAt": 1771101306021,
    "updatedAt": 1771101306083
  }
}
```

**完成后提示：**
```
🎉 恭喜！所有步骤已完成！

完整的电影导演项目已生成，你现在可以：
- 直接使用这个项目进行视频制作
- 将分镜传递给 video-prompt-engineer 生成视频提示词
- 根据需要修改任何部分
```

---

## 迭代控制示例

### 示例 1：跳转到特定步骤

**用户输入：** "先做剧本"

**输出：**
```
好的！我们直接开始第1步：剧本处理。

[... 执行剧本处理 ...]

✅ 第1步完成！剧本已处理完毕。

接下来你想做什么？
- 继续第2步：角色设计
- 跳到其他步骤
- 先到这里
```

### 示例 2：修改已完成的部分

**用户输入：** "修改角色李阳，让他更年轻一点"

**输出：**
```
好的！我来修改李阳的角色设计。

[... 更新角色设计 ...]

✅ 已修改李阳的角色设计，年龄改为22岁，增加了更多青春气息。

是否继续进行下一步？
```

### 示例 3：暂停/退出

**用户输入：** "先到这里"

**输出：**
```
好的！我们先暂停在这里。

当前进度：
✅ 已完成：第1步（剧本处理）、第2步（角色设计）
⏸️ 待完成：第3步（场景与道具设计）、第4步（分镜创作）、第5步（完整项目整合）

已保存当前进度，下次可以继续！
```

---

## 完整模式示例（对比）

**用户输入：** "两个朋友在公园聊天，给我完整项目"

**输出：**
```
好的！我将一次性为你生成完整的电影导演项目。

[... 输出完整的 FILM_PROJECT JSON ...]

✅ 完整项目已生成！包含剧本、角色、道具、场景、分镜等所有内容。
```
