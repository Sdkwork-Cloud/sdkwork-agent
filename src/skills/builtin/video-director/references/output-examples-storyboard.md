# Output Examples - Storyboard

Storyboard and shot examples.

---

## Complete Example: Autumn Park Scene

### Scene 1: Park Meeting

```json
{
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
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440012",
      "uuid": "550e8400-e29b-41d4-a716-446655440012",
      "type": "FILM_SHOT",
      "sceneUuid": "550e8400-e29b-41d4-a716-446655440009",
      "index": 3,
      "shotScale": "OVER_THE_SHOULDER",
      "cameraMovement": "STATIC",
      "cameraAngle": "EYE_LEVEL",
      "durationSeconds": 6,
      "timeRange": "7-13s",
      "description": "过肩镜头，从小明的肩膀看小红",
      "action": "小明翻开相册",
      "dialogue": "小明：你看这张！这是在巴黎埃菲尔铁塔下面拍的，当时刚好赶上日落，太美了！",
      "dialogueItems": [
        {
          "characterUuid": "550e8400-e29b-41d4-a716-446655440003",
          "text": "你看这张！这是在巴黎埃菲尔铁塔下面拍的，当时刚好赶上日落，太美了！",
          "timeRange": "8-12s"
        }
      ],
      "lighting": "自然光",
      "sound": {
        "ambience": "环境音继续",
        "sfx": ["翻书声"],
        "music": "背景音乐继续"
      },
      "characterUuids": ["550e8400-e29b-41d4-a716-446655440003", "550e8400-e29b-41d4-a716-446655440004"],
      "propUuids": ["550e8400-e29b-41d4-a716-446655440005"],
      "videoGeneration": {
        "mode": "TEXT_TO_VIDEO",
        "product": "SINGLE",
        "modelId": "default",
        "prompt": {
          "base": "过肩镜头，从小明的肩膀看小红，男孩翻开相册，秋日午后，温馨氛围，对话场景"
        },
        "status": "PENDING",
        "referenceImages": []
      },
      "createdAt": 1771101370686,
      "updatedAt": 1771101370686
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440013",
      "uuid": "550e8400-e29b-41d4-a716-446655440013",
      "type": "FILM_SHOT",
      "sceneUuid": "550e8400-e29b-41d4-a716-446655440009",
      "index": 4,
      "shotScale": "CLOSE_UP",
      "cameraMovement": "STATIC",
      "cameraAngle": "EYE_LEVEL",
      "durationSeconds": 5,
      "timeRange": "13-18s",
      "description": "近景，小红的表情",
      "action": "小红凑过去看相册，眼睛里闪烁着好奇的光芒",
      "dialogue": "小红：哇，真的好美！你当时一定很激动吧？",
      "dialogueItems": [
        {
          "characterUuid": "550e8400-e29b-41d4-a716-446655440004",
          "text": "哇，真的好美！你当时一定很激动吧？",
          "timeRange": "14-17s"
        }
      ],
      "lighting": "自然光",
      "sound": {
        "ambience": "环境音继续",
        "sfx": [],
        "music": "背景音乐继续"
      },
      "characterUuids": ["550e8400-e29b-41d4-a716-446655440004"],
      "propUuids": ["550e8400-e29b-41d4-a716-446655440005"],
      "videoGeneration": {
        "mode": "TEXT_TO_VIDEO",
        "product": "SINGLE",
        "modelId": "default",
        "prompt": {
          "base": "近景，女孩的表情，眼睛里闪烁着好奇的光芒，温馨氛围，秋日午后"
        },
        "status": "PENDING",
        "referenceImages": []
      },
      "createdAt": 1771101372686,
      "updatedAt": 1771101372686
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440036",
      "uuid": "550e8400-e29b-41d4-a716-446655440036",
      "type": "FILM_SHOT",
      "sceneUuid": "550e8400-e29b-41d4-a716-446655440009",
      "index": 5,
      "shotScale": "EXTREME_CLOSE_UP",
      "cameraMovement": "STATIC",
      "cameraAngle": "EYE_LEVEL",
      "durationSeconds": 4,
      "timeRange": "18-22s",
      "description": "特写，相册中的照片",
      "action": "相册中的埃菲尔铁塔照片",
      "dialogue": "",
      "dialogueItems": [],
      "lighting": "自然光",
      "sound": {
        "ambience": "环境音继续",
        "sfx": [],
        "music": "背景音乐轻柔"
      },
      "characterUuids": [],
      "propUuids": ["550e8400-e29b-41d4-a716-446655440005"],
      "videoGeneration": {
        "mode": "TEXT_TO_VIDEO",
        "product": "SINGLE",
        "modelId": "default",
        "prompt": {
          "base": "特写，相册中的埃菲尔铁塔照片，日落时分，金色光芒，温馨怀旧"
        },
        "status": "PENDING",
        "referenceImages": []
      },
      "createdAt": 1771101374686,
      "updatedAt": 1771101374686
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440037",
      "uuid": "550e8400-e29b-41d4-a716-446655440037",
      "type": "FILM_SHOT",
      "sceneUuid": "550e8400-e29b-41d4-a716-446655440009",
      "index": 6,
      "shotScale": "MEDIUM",
      "cameraMovement": "DOLLY_OUT",
      "cameraAngle": "EYE_LEVEL",
      "durationSeconds": 5,
      "timeRange": "22-27s",
      "description": "中景，两人一起看相册",
      "action": "两人头靠在一起看相册，微笑着",
      "dialogue": "",
      "dialogueItems": [],
      "lighting": "金色午后阳光",
      "sound": {
        "ambience": "环境音继续",
        "sfx": [],
        "music": "温馨的背景音乐"
      },
      "characterUuids": ["550e8400-e29b-41d4-a716-446655440003", "550e8400-e29b-41d4-a716-446655440004"],
      "propUuids": ["550e8400-e29b-41d4-a716-446655440005"],
      "videoGeneration": {
        "mode": "TEXT_TO_VIDEO",
        "product": "SINGLE",
        "modelId": "default",
        "prompt": {
          "base": "中景，两个朋友头靠在一起看相册，微笑着，缓慢拉远镜头，金色午后阳光，温馨氛围"
        },
        "status": "PENDING",
        "referenceImages": []
      },
      "createdAt": 1771101376686,
      "updatedAt": 1771101376686
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440038",
      "uuid": "550e8400-e29b-41d4-a716-446655440038",
      "type": "FILM_SHOT",
      "sceneUuid": "550e8400-e29b-41d4-a716-446655440009",
      "index": 7,
      "shotScale": "WIDE",
      "cameraMovement": "STATIC",
      "cameraAngle": "EYE_LEVEL",
      "durationSeconds": 3,
      "timeRange": "27-30s",
      "description": "远景，整个公园的景色",
      "action": "",
      "dialogue": "",
      "dialogueItems": [],
      "lighting": "金色午后阳光",
      "sound": {
        "ambience": "鸟鸣声、风声",
        "sfx": [],
        "music": "温馨的背景音乐渐弱"
      },
      "characterUuids": [],
      "propUuids": [],
      "videoGeneration": {
        "mode": "TEXT_TO_VIDEO",
        "product": "SINGLE",
        "modelId": "default",
        "prompt": {
          "base": "秋日午后的公园远景，金色阳光，温馨宁静的氛围，电影质感"
        },
        "status": "PENDING",
        "referenceImages": []
      },
      "createdAt": 1771101378686,
      "updatedAt": 1771101378686
    }
  ]
}
```

---

## Key Shot Types Demonstrated

| Shot Index | Shot Scale | Camera Movement | Camera Angle | Purpose |
|------------|------------|-----------------|--------------|---------|
| 1 | WIDE | STATIC | EYE_LEVEL | 建立场景 |
| 2 | MEDIUM | DOLLY_IN | EYE_LEVEL | 介绍人物，拉近关系 |
| 3 | OVER_THE_SHOULDER | STATIC | EYE_LEVEL | 对话场景 |
| 4 | CLOSE_UP | STATIC | EYE_LEVEL | 情感表达 |
| 5 | EXTREME_CLOSE_UP | STATIC | EYE_LEVEL | 强调细节 |
| 6 | MEDIUM | DOLLY_OUT | EYE_LEVEL | 拉远，展示关系 |
| 7 | WIDE | STATIC | EYE_LEVEL | 收尾，回到场景 |

---

## Example 2: Suspense Scene - Dark Alley

```json
{
  "shots": [
    {
      "id": "shot-suspense-1",
      "uuid": "shot-suspense-1",
      "type": "FILM_SHOT",
      "sceneUuid": "scene-suspense-1",
      "index": 1,
      "shotScale": "EXTREME_WIDE",
      "cameraMovement": "STATIC",
      "cameraAngle": "HIGH_ANGLE",
      "durationSeconds": 4,
      "timeRange": "0-4s",
      "description": "极远景，从高处俯瞰黑暗小巷",
      "action": "",
      "dialogue": "",
      "lighting": "昏暗的街灯",
      "sound": {
        "ambience": "雨声、风声",
        "sfx": [],
        "music": "悬疑的背景音乐"
      },
      "videoGeneration": {
        "mode": "TEXT_TO_VIDEO",
        "product": "SINGLE",
        "prompt": {
          "base": "极远景，从高处俯瞰雨夜的黑暗小巷，街灯闪烁，悬疑氛围，电影质感"
        }
      }
    },
    {
      "id": "shot-suspense-2",
      "uuid": "shot-suspense-2",
      "type": "FILM_SHOT",
      "sceneUuid": "scene-suspense-1",
      "index": 2,
      "shotScale": "MEDIUM",
      "cameraMovement": "TRACKING",
      "cameraAngle": "EYE_LEVEL",
      "durationSeconds": 5,
      "timeRange": "4-9s",
      "description": "跟拍镜头，跟随主角走进小巷",
      "action": "主角紧张地走进黑暗小巷",
      "dialogue": "",
      "lighting": "街灯光线",
      "sound": {
        "ambience": "雨声继续",
        "sfx": ["脚步声"],
        "music": "悬疑音乐渐强"
      },
      "videoGeneration": {
        "mode": "TEXT_TO_VIDEO",
        "product": "SINGLE",
        "prompt": {
          "base": "跟拍镜头，跟随主角走进黑暗小巷，雨夜，紧张氛围，电影质感"
        }
      }
    },
    {
      "id": "shot-suspense-3",
      "uuid": "shot-suspense-3",
      "type": "FILM_SHOT",
      "sceneUuid": "scene-suspense-1",
      "index": 3,
      "shotScale": "CLOSE_UP",
      "cameraMovement": "STATIC",
      "cameraAngle": "LOW_ANGLE",
      "durationSeconds": 3,
      "timeRange": "9-12s",
      "description": "近景，低角度，主角紧张的表情",
      "action": "主角环顾四周，表情紧张",
      "dialogue": "",
      "lighting": "从下往上的街灯光线",
      "sound": {
        "ambience": "雨声继续",
        "sfx": ["心跳声"],
        "music": "悬疑音乐"
      },
      "videoGeneration": {
        "mode": "TEXT_TO_VIDEO",
        "product": "SINGLE",
        "prompt": {
          "base": "近景，低角度，主角紧张的表情，雨夜，街灯光线，悬疑氛围"
        }
      }
    },
    {
      "id": "shot-suspense-4",
      "uuid": "shot-suspense-4",
      "type": "FILM_SHOT",
      "sceneUuid": "scene-suspense-1",
      "index": 4,
      "shotScale": "MEDIUM",
      "cameraMovement": "STATIC",
      "cameraAngle": "DUTCH_ANGLE",
      "durationSeconds": 4,
      "timeRange": "12-16s",
      "description": "中景，荷兰角，神秘人出现",
      "action": "神秘人从小巷深处走出",
      "dialogue": "",
      "lighting": "昏暗的光线",
      "sound": {
        "ambience": "雨声继续",
        "sfx": ["脚步声"],
        "music": "悬疑音乐达到高潮"
      },
      "videoGeneration": {
        "mode": "TEXT_TO_VIDEO",
        "product": "SINGLE",
        "prompt": {
          "base": "中景，荷兰角，神秘人从小巷深处走出，雨夜，悬疑氛围，电影质感"
        }
      }
    }
  ]
}
```
