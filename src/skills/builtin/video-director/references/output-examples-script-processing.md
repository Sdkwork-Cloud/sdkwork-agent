# Output Examples - Script Processing

Script processing examples.

---

## Example 1: Short Idea to Full Script

**User Input:** "两个朋友在公园长椅上聊天"

**Processed Script:**

```json
{
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
    "sceneOrder": ["550e8400-e29b-41d4-a716-446655440009"],
    "version": "1.0.0",
    "createdAt": 1771101306021,
    "updatedAt": 1771101306021
  }
}
```

---

## Example 2: Story to Script

**User Input (Story):**
"小明刚从欧洲旅行回来，约了好朋友小红在公园见面。他带着一本旅行相册，想和小红分享旅途的趣事。两人坐在秋日公园的长椅上，阳光洒在他们身上，氛围温馨而美好。小明兴奋地讲述着在巴黎的经历，小红认真地倾听着，时不时发出惊叹。"

**Processed Script:**

```json
{
  "script": {
    "id": "script-2",
    "uuid": "script-2",
    "type": "FILM_SCRIPT",
    "title": "秋日回忆",
    "genres": ["剧情", "友情"],
    "styleTags": ["电影写实", "温馨"],
    "content": "【场景1】 秋日公园长椅 - 外景 - 下午 - 晴朗\n\n【场景描述】\n秋日午后的公园，金色阳光透过梧桐树叶洒下斑驳的光影，地上散落着金黄的落叶。公园中央的小径旁，有一张老旧的木质长椅，椅面上有岁月的痕迹。远处隐约传来喷泉的水声和孩子们的笑声，氛围温馨而宁静。\n\n【角色】\n- 小明：28岁，阳光男孩，刚从欧洲旅行回来，背着双肩包\n- 小红：27岁，温柔女孩，小明的好朋友\n\n【动作】\n小明和小红坐在长椅上，小明从背包里拿出一本棕色皮质的旅行相册，翻开，指向其中一张照片。小红凑过去看，眼睛里闪烁着好奇的光芒。\n\n【对话】\n小明：小红，你看这张！这是在巴黎埃菲尔铁塔下面拍的，当时刚好赶上日落，整个天空都是金黄色的，太美了！\n小红：哇，真的好美！你当时一定很激动吧？\n小明：当然！我在那儿站了好久，舍不得离开。你看这张，这是在罗马斗兽场...\n\n【情感/氛围】\n温馨、怀旧、友情、愉快",
    "evaluation": {
      "score": 82,
      "grade": "Good",
      "dimensions": {
        "structure": 85,
        "characters": 80,
        "sceneDescription": 85,
        "dialogue": 80,
        "pacing": 80,
        "visualPotential": 85
      },
      "strengths": ["故事完整", "场景描写生动", "人物关系清晰"],
      "weaknesses": ["可以增加更多细节"],
      "suggestions": ["增加更多视觉细节"]
    },
    "isStandardized": true,
    "isOptimized": true,
    "sceneOrder": ["scene-1"],
    "version": "1.0.0",
    "createdAt": 1771101306021,
    "updatedAt": 1771101306021
  }
}
```
