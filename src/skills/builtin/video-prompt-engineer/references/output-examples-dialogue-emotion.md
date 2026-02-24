# Dialogue & Emotion Output Examples

This document provides complete output examples with dialogue and emotion support for video prompt generation across different platforms.

---

## Example 1: 即梦原生音画同步（基础对话）

**Input Content:**
> 一个温馨的咖啡店场景，女主向男主表白，男主感动得热泪盈眶

**Output:**

```json
{
  "prompt": "温馨的咖啡店场景，暖色调灯光，木质桌椅，窗外飘着细雨，音效：轻柔的背景音乐、咖啡杯碰撞声、雨声。1.5-4.5s 女主温柔地说：\"我喜欢你很久了，愿意做我的男朋友吗？\"，紧张又期待，温柔的语气，眼中带光，微笑着。5-8s 男主激动地说：\"我愿意！我也喜欢你很久了！\"，激动、感动，声音带着哽咽，眼泪在眼眶中打转，感动地点头。相机缓慢推进，捕捉两人细腻的面部表情变化。音色更准、声音更真，嘴型精准同步，面部表情与音频节奏精准对齐，原生音画像素级对齐。",
  "negative_prompt": "模糊，低质量，扭曲的面部，奇怪的手，过度曝光，文字，水印，logo",
  "generation_product": "VIDEO_UNIVERSAL",
  "model_family": "SEEDANCE",
  "model": "seedance_2_0",
  "aspect_ratio": "16:9",
  "duration": 10.0,
  "style": "CINEMATIC",
  "camera": {
    "movement": "ZOOM_IN_SLOW",
    "angle": "EYE_LEVEL",
    "lens": "50mm"
  },
  "lighting": {
    "type": "WARM",
    "intensity": "MEDIUM",
    "time_of_day": "AFTERNOON"
  },
  "assets": [
    {
      "id": "coffee_shop",
      "type": "IMAGE",
      "url": "https://example.com/coffee-shop.jpg",
      "description": "温馨咖啡店背景参考图",
      "weight": 0.8
    },
    {
      "id": "dialogue_scene",
      "type": "DIALOGUE",
      "description": "表白对话场景"
    }
  ],
  "dialogue": [
    {
      "id": "d1",
      "speaker": "女主",
      "text": "我喜欢你很久了，愿意做我的男朋友吗？",
      "emotion": "紧张又期待",
      "start_time": 1.5,
      "end_time": 4.5,
      "notes": "温柔的语气，眼中带光",
      "external_dubbing": false
    },
    {
      "id": "d2",
      "speaker": "男主",
      "text": "我愿意！我也喜欢你很久了！",
      "emotion": "激动、感动",
      "start_time": 5.0,
      "end_time": 8.0,
      "notes": "声音带着哽咽，眼泪在眼眶中打转",
      "external_dubbing": false
    }
  ]
}
```

**Platform Strategy:**
- **即梦 Seedance 2.0:** 使用原生音画同步，prompt 中包含完整对话、情感和音效描述，同时保留 dialogue 节点

---

## Example 2: 即梦两人对话场景

**Input Content:**
> 两个朋友在公园长椅上聊天，一人兴奋地分享旅行经历，另一人认真倾听

**Output:**

```json
{
  "prompt": "阳光明媚的公园，绿树成荫，长椅上坐着两位年轻女性，音效：鸟鸣声、风声、远处孩子们的嬉笑声。0.5-3.5s 女生A兴奋地说：\"你知道吗？我昨天在山顶看到了绝美日出！\"，兴奋、激动，语速稍快，手势丰富，手舞足蹈，眉飞色舞。4-5.5s 女生B好奇地说：\"真的吗？快给我讲讲！\"，好奇、期待，身体前倾，眼睛睁大，专注的神情。6-10s 女生A陶醉地说：\"整个天空从橙红变成金黄，云朵像被点燃了一样！\"，陶醉、赞叹，眼中闪烁着光芒，语气充满赞叹。背景中有行人走过，鸽子在地上觅食，营造出轻松愉快的氛围。音色更准、声音更真，嘴型精准同步，原生音画像素级对齐。",
  "negative_prompt": "模糊，低质量，扭曲，文字，水印，logo",
  "generation_product": "VIDEO_UNIVERSAL",
  "model_family": "SEEDANCE",
  "model": "seedance_2_0",
  "aspect_ratio": "16:9",
  "duration": 12.0,
  "style": "REALISTIC",
  "camera": {
    "movement": "PAN_SLOW",
    "angle": "EYE_LEVEL",
    "lens": "35mm"
  },
  "lighting": {
    "type": "NATURAL",
    "intensity": "BRIGHT",
    "time_of_day": "MORNING"
  },
  "assets": [
    {
      "id": "park_scene",
      "type": "DIALOGUE",
      "description": "公园对话场景"
    }
  ],
  "dialogue": [
    {
      "id": "d1",
      "speaker": "女生A",
      "text": "你知道吗？我昨天在山顶看到了绝美日出！",
      "emotion": "兴奋、激动",
      "start_time": 0.5,
      "end_time": 3.5,
      "notes": "语速稍快，手势丰富",
      "external_dubbing": false
    },
    {
      "id": "d2",
      "speaker": "女生B",
      "text": "真的吗？快给我讲讲！",
      "emotion": "好奇、期待",
      "start_time": 4.0,
      "end_time": 5.5,
      "notes": "身体前倾，眼睛睁大",
      "external_dubbing": false
    },
    {
      "id": "d3",
      "speaker": "女生A",
      "text": "整个天空从橙红变成金黄，云朵像被点燃了一样！",
      "emotion": "陶醉、赞叹",
      "start_time": 6.0,
      "end_time": 10.0,
      "notes": "眼中闪烁着光芒，语气充满赞叹",
      "external_dubbing": false
    }
  ]
}
```

**Platform Strategy:**
- **即梦 Seedance 2.0:** 原生支持多人对话，精准口型同步，prompt 中包含完整对话和音效

---

## Example 3: 可灵外部配音模式

**Input Content:**
> 科技公司CEO在产品发布会上介绍新产品，台下观众热烈反应

**Output:**

```json
{
  "prompt": "现代化的产品发布会现场，聚光灯聚焦在舞台中央，音效：庄重的开场音乐、观众的掌声、背景音乐。0.5-4s CEO自信地说：\"各位来宾，大家好！今天，我非常荣幸地向大家介绍我们公司的最新产品。\"，自信、热情，微笑开场，环顾全场，面部表情：自信的微笑，眼神坚定，身体语言：手势有力，站姿挺拔。4.5-8s CEO自豪地说：\"这款产品融合了我们三年来的技术积累，将彻底改变用户的体验。\"，自豪、坚定，语气加重，手势强调，面部表情：自豪的神情，眉头微扬，身体语言：指着身后的大屏幕。8.5-11s CEO激动地说：\"现在，让我们一起来看看它的强大功能！\"，激动、期待，手臂一挥，指向大屏幕，面部表情：眼睛发亮，嘴角上扬，身体语言：手臂大幅度挥出。身后的大屏幕展示着产品的3D动画。台下坐着众多观众，专注地聆听，不时点头。灯光专业，氛围正式而热烈。",
  "negative_prompt": "模糊，低质量，扭曲的面部，文字，水印，logo，观众看向镜头",
  "generation_product": "VIDEO_UNIVERSAL",
  "model_family": "KLING",
  "model": "kling_1_5",
  "aspect_ratio": "16:9",
  "duration": 15.0,
  "style": "PROFESSIONAL",
  "camera": {
    "movement": "DOLLY_IN",
    "angle": "EYE_LEVEL",
    "lens": "85mm"
  },
  "lighting": {
    "type": "STAGE",
    "intensity": "BRIGHT",
    "time_of_day": "INDOOR"
  },
  "assets": [
    {
      "id": "stage_reference",
      "type": "IMAGE",
      "url": "https://example.com/stage.jpg",
      "description": "舞台场景参考",
      "weight": 0.7
    },
    {
      "id": "keynote_dialogue",
      "type": "DIALOGUE",
      "description": "产品发布会演讲"
    }
  ],
  "dialogue": [
    {
      "id": "d1",
      "speaker": "CEO",
      "text": "各位来宾，大家好！今天，我非常荣幸地向大家介绍我们公司的最新产品。",
      "emotion": "自信、热情",
      "start_time": 0.5,
      "end_time": 4.0,
      "notes": "微笑开场，环顾全场",
      "external_dubbing": true,
      "dubbing_tool": "ELEVEN_LABS",
      "voice_id": "male_professional_001",
      "accent": "neutral"
    },
    {
      "id": "d2",
      "speaker": "CEO",
      "text": "这款产品融合了我们三年来的技术积累，将彻底改变用户的体验。",
      "emotion": "自豪、坚定",
      "start_time": 4.5,
      "end_time": 8.0,
      "notes": "语气加重，手势强调",
      "external_dubbing": true,
      "dubbing_tool": "ELEVEN_LABS",
      "voice_id": "male_professional_001"
    },
    {
      "id": "d3",
      "speaker": "CEO",
      "text": "现在，让我们一起来看看它的强大功能！",
      "emotion": "激动、期待",
      "start_time": 8.5,
      "end_time": 11.0,
      "notes": "手臂一挥，指向大屏幕",
      "external_dubbing": true,
      "dubbing_tool": "ELEVEN_LABS",
      "voice_id": "male_professional_001"
    }
  ]
}
```

**Platform Strategy:**
- **可灵 Kling:** prompt 中包含完整对话、情感和音效描述，详细描述面部表情和身体语言，同时使用外部配音

---

## Example 4: Sora 情感表达场景

**Input Content:**
> 父亲在女儿婚礼上致辞，既开心又不舍，情感复杂

**Output:**

```json
{
  "prompt": "温馨华丽的婚礼现场，宾客满座，音效：温馨的婚礼背景音乐、轻柔的钢琴声、宾客的啜泣声。1-7s 父亲感慨地说：\"今天，我既开心又有些不舍。开心的是看到我最爱的女儿找到了她的幸福，不舍的是那个在我怀里撒娇的小女孩，如今要开始她新的人生了。\"，激动、欣慰、不舍，声音略带哽咽，不时擦拭眼角，面部表情：眼中含泪，嘴角却带着微笑，复杂的情感交织，身体语言：握着女儿的手，肩膀微微颤抖。8-11s 父亲郑重地说：\"女婿，我把女儿交给你了，希望你们永远幸福。\"，郑重、托付，拍拍女婿的肩膀，眼神坚定，面部表情：郑重的神情，眼神中充满信任，身体语言：拍女婿肩膀，然后双手交握。女儿站在一旁，美丽的新娘，也感动得红了眼眶。灯光温暖，氛围感人。",
  "negative_prompt": "模糊，低质量，扭曲，文字，水印，logo，宾客看向镜头，过度戏剧化",
  "generation_product": "VIDEO_UNIVERSAL",
  "model_family": "SORA",
  "model": "sora_1_0",
  "aspect_ratio": "16:9",
  "duration": 12.0,
  "style": "CINEMATIC",
  "camera": {
    "movement": "SLOW_TRACKING",
    "angle": "EYE_LEVEL",
    "lens": "85mm"
  },
  "lighting": {
    "type": "WARM",
    "intensity": "MEDIUM",
    "time_of_day": "EVENING"
  },
  "assets": [
    {
      "id": "wedding_dialogue",
      "type": "DIALOGUE",
      "description": "婚礼父亲致辞"
    }
  ],
  "dialogue": [
    {
      "id": "d1",
      "speaker": "父亲",
      "text": "今天，我既开心又有些不舍。开心的是看到我最爱的女儿找到了她的幸福，不舍的是那个在我怀里撒娇的小女孩，如今要开始她新的人生了。",
      "emotion": "激动、欣慰、不舍",
      "start_time": 1.0,
      "end_time": 7.0,
      "notes": "声音略带哽咽，不时擦拭眼角",
      "external_dubbing": true,
      "dubbing_tool": "AZURE_TTS",
      "voice_id": "male_warm_001"
    },
    {
      "id": "d2",
      "speaker": "父亲",
      "text": "女婿，我把女儿交给你了，希望你们永远幸福。",
      "emotion": "郑重、托付",
      "start_time": 8.0,
      "end_time": 11.0,
      "notes": "拍拍女婿的肩膀，眼神坚定",
      "external_dubbing": true,
      "dubbing_tool": "AZURE_TTS",
      "voice_id": "male_warm_001"
    }
  ]
}
```

**Platform Strategy:**
- **Sora:** prompt 中包含完整对话、情感和音效描述，着重描述复杂的情感表达和微表情变化，使用外部配音工具

---

## Example 5: 即梦方言/口音保留

**Input Content:**
> 四川茶馆里，两位老人用四川话摆龙门阵，气氛轻松愉快

**Output:**

```json
{
  "prompt": "传统的四川茶馆，竹椅木桌，盖碗茶，热气腾腾，音效：茶馆里的嘈杂声、茶杯碰撞声、川剧背景音乐隐约传来。0.5-3.5s 李大爷得意地说：\"昨天那个麻将打得才叫安逸哦！最后一把硬是自摸清一色！\"，得意、兴奋，四川方言，眉飞色舞，面部表情：笑容满面，眼睛发亮，身体语言：手舞足蹈，拍大腿。4-6s 张太婆惊讶地说：\"哟喂！你娃手气好哦！下次带我一起三！\"，惊讶、羡慕，四川方言，笑容灿烂，面部表情：惊讶的表情，随即转为羡慕的笑容，身体语言：拍着李大爷的手臂，身体前倾。6.5-9s 李大爷豪爽地说：\"要得要得！明天下午老地方，不见不散！\"，豪爽、期待，四川方言，拍胸脯保证，面部表情：豪爽的大笑，拍胸脯，身体语言：拍胸脯，竖起大拇指。茶馆里还有其他茶客，背景是典型的川西风格。整体氛围悠闲自在，充满生活气息。音色更准、声音更真，嘴型精准同步，方言/口音保留，原生音画像素级对齐。",
  "negative_prompt": "模糊，低质量，扭曲，文字，水印，logo",
  "generation_product": "VIDEO_UNIVERSAL",
  "model_family": "SEEDANCE",
  "model": "seedance_2_0",
  "aspect_ratio": "16:9",
  "duration": 10.0,
  "style": "DOCUMENTARY",
  "camera": {
    "movement": "STATIC",
    "angle": "EYE_LEVEL",
    "lens": "35mm"
  },
  "lighting": {
    "type": "NATURAL",
    "intensity": "MEDIUM",
    "time_of_day": "AFTERNOON"
  },
  "assets": [
    {
      "id": "sichuan_teahouse",
      "type": "IMAGE",
      "url": "https://example.com/teahouse.jpg",
      "description": "四川茶馆参考图",
      "weight": 0.9
    },
    {
      "id": "dialogue_dialect",
      "type": "DIALOGUE",
      "description": "四川方言对话"
    }
  ],
  "dialogue": [
    {
      "id": "d1",
      "speaker": "李大爷",
      "text": "昨天那个麻将打得才叫安逸哦！最后一把硬是自摸清一色！",
      "emotion": "得意、兴奋",
      "start_time": 0.5,
      "end_time": 3.5,
      "notes": "四川方言，眉飞色舞",
      "external_dubbing": false,
      "accent": "sichuan"
    },
    {
      "id": "d2",
      "speaker": "张太婆",
      "text": "哟喂！你娃手气好哦！下次带我一起三！",
      "emotion": "惊讶、羡慕",
      "start_time": 4.0,
      "end_time": 6.0,
      "notes": "四川方言，笑容灿烂",
      "external_dubbing": false,
      "accent": "sichuan"
    },
    {
      "id": "d3",
      "speaker": "李大爷",
      "text": "要得要得！明天下午老地方，不见不散！",
      "emotion": "豪爽、期待",
      "start_time": 6.5,
      "end_time": 9.0,
      "notes": "四川方言，拍胸脯保证",
      "external_dubbing": false,
      "accent": "sichuan"
    }
  ]
}
```

**Platform Strategy:**
- **即梦 Seedance 2.0:** prompt 中包含完整对话、情感和音效描述，原生支持方言/口音保留

---

## Example 6: 即梦歌声还原

**Input Content:**
> 街头艺人弹吉他唱歌，歌声动人，吸引路人驻足聆听

**Output:**

```json
{
  "prompt": "繁华的城市街头，傍晚时分，暖黄的路灯亮起，音效：吉他声、悠扬的歌声、城市的背景噪音、路人的脚步声、偶尔的掌声。1-11s 街头艺人深情地弹唱：\"在这城市的夜晚，霓虹点亮孤单，我用歌声寻找温暖...\"，深情、投入，弹唱，歌声悠扬，闭着眼睛，神情投入，面部表情：闭着眼睛，眉头微蹙，完全沉浸在音乐中，身体语言：手指在吉他琴弦上灵活地拨动，身体随着音乐轻轻摇摆。周围围了几个路人，有的停下脚步聆听，有的拿出手机录制。氛围温馨而文艺。音色更准、声音更真，歌声还原，嘴型精准同步，原生音画像素级对齐。",
  "negative_prompt": "模糊，低质量，扭曲，文字，水印，logo，路人看向镜头",
  "generation_product": "VIDEO_UNIVERSAL",
  "model_family": "SEEDANCE",
  "model": "seedance_2_0",
  "aspect_ratio": "16:9",
  "duration": 12.0,
  "style": "CINEMATIC",
  "camera": {
    "movement": "SLOW_ORBIT",
    "angle": "SLIGHTLY_LOW",
    "lens": "50mm"
  },
  "lighting": {
    "type": "WARM",
    "intensity": "MEDIUM",
    "time_of_day": "SUNSET"
  },
  "assets": [
    {
      "id": "street_performance",
      "type": "DIALOGUE",
      "description": "街头弹唱表演"
    }
  ],
  "dialogue": [
    {
      "id": "d1",
      "speaker": "街头艺人",
      "text": "在这城市的夜晚，霓虹点亮孤单，我用歌声寻找温暖...",
      "emotion": "深情、投入",
      "start_time": 1.0,
      "end_time": 11.0,
      "notes": "弹唱，歌声悠扬",
      "external_dubbing": false,
      "is_singing": true
    }
  ]
}
```

**Platform Strategy:**
- **即梦 Seedance 2.0:** prompt 中包含完整歌声、情感和音效描述，原生支持歌声还原

---

## Example 7: Google Veo 复杂对话场景

**Input Content:**
> 会议室里，团队成员激烈讨论产品方案，各抒己见

**Output:**

```json
{
  "prompt": "现代化的会议室，阳光透过落地窗洒进来，音效：键盘敲击声、讨论声、纸张翻动声。0.5-3s 产品经理急切地说：\"这个功能必须在下个月发布，这是用户的核心需求！\"，坚定、急切，手势强调，语气坚定，面部表情：严肃的神情，眉头微皱，眼神坚定，身体语言：指着白板上的图表，手势有力。3.5-6.5s 工程师担忧地说：\"技术上有难度，这个时间点太紧张了，我们需要更多时间测试。\"，担忧、务实，皱着眉头，语气诚恳，面部表情：担忧的神情，眉头紧锁，身体语言：摊开双手，身体微微后仰。7-9.5s 项目经理冷静地说：\"大家都别着急，我们一起看看能不能找到折中方案。\"，冷静、协调，伸手示意大家冷静，面部表情：平静的神情，眼神温和，身体语言：伸手向下压，示意大家冷静。10-13.5s 市场经理理性地说：\"数据显示这个功能确实能提升用户留存率30%，但我们可以分阶段发布。\"，理性、分析，看着电脑屏幕，展示数据，面部表情：专注的神情，眼睛盯着屏幕，身体语言：手指着电脑屏幕，身体前倾。产品经理指着白板上的图表，据理力争；设计师在一旁认真记录，不时点头；工程师皱着眉头思考，然后提出技术难题；市场经理快速敲打着笔记本电脑，查阅数据；项目经理在中间协调，试图达成共识。每个人的表情都很生动，手势丰富，氛围专业而热烈。",
  "negative_prompt": "模糊，低质量，扭曲，文字，水印，logo，有人看镜头",
  "generation_product": "VIDEO_UNIVERSAL",
  "model_family": "GOOGLE",
  "model": "veo_2",
  "aspect_ratio": "16:9",
  "duration": 15.0,
  "style": "PROFESSIONAL",
  "camera": {
    "movement": "MULTI_SHOT",
    "angle": "EYE_LEVEL",
    "lens": "35mm"
  },
  "lighting": {
    "type": "NATURAL",
    "intensity": "BRIGHT",
    "time_of_day": "MORNING"
  },
  "assets": [
    {
      "id": "meeting_room",
      "type": "DIALOGUE",
      "description": "会议室团队讨论"
    }
  ],
  "dialogue": [
    {
      "id": "d1",
      "speaker": "产品经理",
      "text": "这个功能必须在下个月发布，这是用户的核心需求！",
      "emotion": "坚定、急切",
      "start_time": 0.5,
      "end_time": 3.0,
      "notes": "手势强调，语气坚定",
      "external_dubbing": true,
      "dubbing_tool": "AMAZON_POLLY",
      "voice_id": "female_professional_002"
    },
    {
      "id": "d2",
      "speaker": "工程师",
      "text": "技术上有难度，这个时间点太紧张了，我们需要更多时间测试。",
      "emotion": "担忧、务实",
      "start_time": 3.5,
      "end_time": 6.5,
      "notes": "皱着眉头，语气诚恳",
      "external_dubbing": true,
      "dubbing_tool": "AMAZON_POLLY",
      "voice_id": "male_professional_003"
    },
    {
      "id": "d3",
      "speaker": "项目经理",
      "text": "大家都别着急，我们一起看看能不能找到折中方案。",
      "emotion": "冷静、协调",
      "start_time": 7.0,
      "end_time": 9.5,
      "notes": "伸手示意大家冷静",
      "external_dubbing": true,
      "dubbing_tool": "AMAZON_POLLY",
      "voice_id": "female_calm_001"
    },
    {
      "id": "d4",
      "speaker": "市场经理",
      "text": "数据显示这个功能确实能提升用户留存率30%，但我们可以分阶段发布。",
      "emotion": "理性、分析",
      "start_time": 10.0,
      "end_time": 13.5,
      "notes": "看着电脑屏幕，展示数据",
      "external_dubbing": true,
      "dubbing_tool": "AMAZON_POLLY",
      "voice_id": "female_analytical_001"
    }
  ]
}
```

**Platform Strategy:**
- **Google Veo:** prompt 中包含完整对话、情感和音效描述，详细描述多人互动和复杂的身体语言

---

## Example 8: Runway 愤怒情感表达

**Input Content:**
> 职场场景，员工因为工作失误被上司严厉批评，情绪从愧疚到愤怒

**Output:**

```json
{
  "prompt": "现代办公室，气氛紧张，音效：紧张的背景音乐、急促的呼吸声、文件摔在桌上的声音。0.5-3.5s 上司愤怒地说：\"这么简单的事情你都能搞砸！你知道这给公司带来多大损失吗？\"，愤怒、失望，声音提高，拍桌子，面部表情：眉头紧锁，怒目圆睁，脸色铁青，身体语言：拍桌子，手指着员工，身体前倾。4-6s 员工愧疚地说：\"对不起，我知道错了，我会马上补救的...\"，愧疚、害怕，声音很小，低着头，面部表情：愧疚的神情，眼眶泛红，不敢抬头，身体语言：双手紧张地握在一起，低头，身体微微颤抖。6.5-9s 员工愤怒地说：\"但这不全是我的责任！团队里其他人也有问题！\"，愤怒、不服，突然抬头，语气激动，面部表情：愤怒的神情，眼睛瞪大，咬紧嘴唇，身体语言：突然抬头，双手握拳，身体挺直。",
  "negative_prompt": "模糊，低质量，扭曲的面部，文字，水印，logo",
  "generation_product": "VIDEO_UNIVERSAL",
  "model_family": "RUNWAY",
  "model": "gen_3_alpha",
  "aspect_ratio": "16:9",
  "duration": 10.0,
  "style": "DRAMATIC",
  "camera": {
    "movement": "HANDHELD_TENSE",
    "angle": "EYE_LEVEL",
    "lens": "50mm"
  },
  "lighting": {
    "type": "COOL",
    "intensity": "MEDIUM",
    "time_of_day": "INDOOR"
  },
  "assets": [
    {
      "id": "office_conflict",
      "type": "DIALOGUE",
      "description": "办公室冲突场景"
    }
  ],
  "dialogue": [
    {
      "id": "d1",
      "speaker": "上司",
      "text": "这么简单的事情你都能搞砸！你知道这给公司带来多大损失吗？",
      "emotion": "愤怒、失望",
      "start_time": 0.5,
      "end_time": 3.5,
      "notes": "声音提高，拍桌子",
      "external_dubbing": true,
      "dubbing_tool": "ELEVEN_LABS",
      "voice_id": "male_angry_001"
    },
    {
      "id": "d2",
      "speaker": "员工",
      "text": "对不起，我知道错了，我会马上补救的...",
      "emotion": "愧疚、害怕",
      "start_time": 4.0,
      "end_time": 6.0,
      "notes": "声音很小，低着头",
      "external_dubbing": true,
      "dubbing_tool": "ELEVEN_LABS",
      "voice_id": "female_guilty_001"
    },
    {
      "id": "d3",
      "speaker": "员工",
      "text": "但这不全是我的责任！团队里其他人也有问题！",
      "emotion": "愤怒、不服",
      "start_time": 6.5,
      "end_time": 9.0,
      "notes": "突然抬头，语气激动",
      "external_dubbing": true,
      "dubbing_tool": "ELEVEN_LABS",
      "voice_id": "female_angry_001"
    }
  ]
}
```

**Platform Strategy:**
- **Runway:** prompt 中包含完整对话、情感和音效描述，着重描述情绪的转变过程和微表情变化

---

## Example 9: 多平台同时支持即梦和可灵

**Input Content:**
> 美食博主在厨房里教大家做红烧肉，步骤清晰，语言生动

**Output:**

```json
{
  "prompt": "温馨明亮的厨房，一位30岁左右的女性美食博主站在灶台前，穿着干净的围裙，音效：欢快的背景音乐、切菜声、炒菜声、油在锅里的滋滋声。0.5-3s 美食博主热情地说：\"大家好！今天我来教大家做一道家常红烧肉，肥而不腻，入口即化！\"，热情、亲切，微笑着面对镜头挥手，面部表情：灿烂的笑容，眼神亲切，身体语言：挥手打招呼，身体微微前倾。3.5-6.5s 美食博主专注地说：\"首先我们把五花肉切成大小均匀的块，冷水下锅焯水，撇去浮沫。\"，专注、认真，展示切好的肉块，面部表情：专注的神情，眼睛看着肉块，身体语言：展示切好的肉块，手指着肉块。7-10s 美食博主耐心地说：\"然后锅中放少许油，加入冰糖炒糖色，小火慢炒到枣红色冒泡。\"，专注、耐心，展示炒糖色的过程，面部表情：专注的神情，眼睛盯着锅，身体语言：手持锅铲，慢慢翻炒。10.5-14s 美食博主期待地说：\"最后放入肉块翻炒上色，加入葱姜、料酒、酱油、开水，大火烧开后转小火炖一个小时。\"，期待、满足，展示做好的红烧肉，香气扑鼻的感觉，面部表情：期待的笑容，吸鼻子闻香气，身体语言：展示做好的红烧肉，手势诱人。她面前的操作台上摆放着新鲜的食材：五花肉、葱姜蒜、酱油、冰糖等。博主面带微笑，一边熟练地操作，一边热情地讲解。她的动作自然流畅，表情生动，时而展示食材，时而指着锅里的变化，整个过程充满生活气息和感染力。光线柔和，色彩鲜艳。音色更准、声音更真，嘴型精准同步，原生音画像素级对齐。",
  "negative_prompt": "模糊，低质量，扭曲，文字，水印，logo",
  "generation_product": "VIDEO_UNIVERSAL",
  "model_family": "SEEDANCE",
  "model": "seedance_2_0",
  "aspect_ratio": "9:16",
  "duration": 15.0,
  "style": "LIFESTYLE",
  "camera": {
    "movement": "MULTI_SHOT",
    "angle": "EYE_LEVEL",
    "lens": "35mm"
  },
  "lighting": {
    "type": "WARM",
    "intensity": "BRIGHT",
    "time_of_day": "INDOOR"
  },
  "assets": [
    {
      "id": "cooking_lesson",
      "type": "DIALOGUE",
      "description": "美食烹饪教学"
    }
  ],
  "dialogue": [
    {
      "id": "d1",
      "speaker": "美食博主",
      "text": "大家好！今天我来教大家做一道家常红烧肉，肥而不腻，入口即化！",
      "emotion": "热情、亲切",
      "start_time": 0.5,
      "end_time": 3.0,
      "notes": "微笑着面对镜头挥手",
      "external_dubbing": false
    },
    {
      "id": "d2",
      "speaker": "美食博主",
      "text": "首先我们把五花肉切成大小均匀的块，冷水下锅焯水，撇去浮沫。",
      "emotion": "专注、认真",
      "start_time": 3.5,
      "end_time": 6.5,
      "notes": "展示切好的肉块",
      "external_dubbing": false
    },
    {
      "id": "d3",
      "speaker": "美食博主",
      "text": "然后锅中放少许油，加入冰糖炒糖色，小火慢炒到枣红色冒泡。",
      "emotion": "专注、耐心",
      "start_time": 7.0,
      "end_time": 10.0,
      "notes": "展示炒糖色的过程",
      "external_dubbing": false
    },
    {
      "id": "d4",
      "speaker": "美食博主",
      "text": "最后放入肉块翻炒上色，加入葱姜、料酒、酱油、开水，大火烧开后转小火炖一个小时。",
      "emotion": "期待、满足",
      "start_time": 10.5,
      "end_time": 14.0,
      "notes": "展示做好的红烧肉，香气扑鼻的感觉",
      "external_dubbing": false
    }
  ]
}
```

**Multi-Platform Strategies:**
- **即梦 Seedance 2.0:** 使用上述配置，prompt 中包含完整对话、情感和音效描述，启用原生音画同步
- **可灵 Kling:** 复制上述配置，修改以下字段：
  - `model_family`: "KLING"
  - `model`: "kling_1_5"
  - 所有 `external_dubbing`: true
  - 添加配音工具配置：`dubbing_tool`: "ELEVEN_LABS"
  - 在 prompt 中进一步加强面部表情和身体语言的描述
  - 移除"音色更准、声音更真，嘴型精准同步，原生音画像素级对齐"

---

## Key Takeaways

1. **Prompt 必须完整：** 无论平台是否支持音画同步，prompt 中都必须包含：
   - 场景描述
   - 对话内容（带时间标签）
   - 情感描述（面部表情 + 身体语言）
   - 音效描述（环境音效、背景音乐）
   
2. **保留 Dialogue 节点：** 用于提取和管理对白信息，方便外部配音使用

3. **即梦 Seedance 2.0:** prompt 中包含完整描述 + 原生音画同步关键字

4. **其他平台:** prompt 中包含完整描述 + 详细的面部表情和身体语言描述，使用外部配音

5. **音效描述:** 在 prompt 中添加环境音效、背景音乐等描述，增强画面感

6. **No Extra Nodes:** assets_stats 和 dialogue_summary 不包含，只保留 dialogue 数组
