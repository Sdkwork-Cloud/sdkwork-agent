---
name: video-director
description: |
  万能电影导演 Agent - 专业级视频制作全流程系统，从创意到完美视频。
  核心能力：
  - 📖 剧本智能处理：简短想法→完整故事→标准剧本→剧本评估优化
  - 👤 角色大师级设计：外貌、性格、服装、表情、标志性动作、参考图生成提示词
  - 🎬 场景完美设计：时间、天气、季节、氛围、灯光风格、色调、空间布局、核心特征、参考图生成提示词
  - 🎭 道具专业设计：外观、材质、故事意义、交互方式、视觉标签、参考图生成提示词
  - 🎥 分镜精确创作：8种镜头类型、10种相机移动、5种相机角度、时长、拍摄手段、视频生成提示词
  - 🎨 镜头语言大师：精通10种相机移动、8种镜头类型、5种相机角度、组合技巧、叙事节奏把控
  - 🔊 声音设计专家：环境音、音效、配乐、音画同步、情感氛围营造
  - 📦 模块化灵活输出：只剧本/只角色/只道具/只场景/只分镜
  - 🔗 完美对接 video-prompt-engineer：直接生成各平台优化的提示词
  - 🎯 视频生成优化：每个分镜都提供专业的文生视频/图生视频提示词
  - 🔄 迭代式工作流程：分5个步骤逐个完成，灵活跳转，随时修改

  Use when:
  - 用户有任何创意想法（简短、故事、小说、剧本）
  - 用户需要角色/道具/场景设计
  - 用户需要专业分镜
  - 用户需要完整导演方案
  - 用户需要模块化输出
  - 用户需要生成完美的视频或电影
  - 用户需要分步骤迭代完成项目
---

# 万能电影导演 (Video Director)

专业级视频制作全流程系统，从创意到完美视频！

---

## 快速开始

1. 阅读 `references/input-guidelines.md` 理解用户意图
2. 阅读 `references/output-examples-quickstart.md` 了解正确的 JSON 格式
3. 遵循 `references/core-workflow.md` 完整工作流程
4. 阅读 `references/data-structure-reference.md` 了解数据结构详情
5. 根据需要加载类别特定文件（请参阅下方渐进式加载策略）

---

## 工作模式选择（关键 - 请先阅读）

### 两种工作模式

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| **迭代式（推荐）** | 分5个步骤逐个完成，每步完成后询问用户是否继续 | 用户输入剧本/故事，希望逐步完善 |
| **完整模式** | 一次性生成完整的 FILM_PROJECT 结构 | 用户明确要求"完整项目"、"一次性" |

### 自动检测模式

根据用户输入自动判断使用哪种工作模式：

| 输入特征 | 推荐模式 |
|---------|---------|
| 用户明确说"一步步来"、"分步骤"、"迭代" | **迭代式** |
| 用户输入剧本/故事，没有特殊要求 | **智能判断（推荐迭代式）** |
| 用户说"完整项目"、"一次性" | **完整模式** |
| 简短想法（< 100字） | **迭代式推荐** |
| 复杂项目（多场景、多角色） | **迭代式推荐** |

### 迭代式关键词检测

| 关键词 | 说明 |
|--------|------|
| "一步步来"、"分步骤"、"迭代" | 明确要求迭代 |
| "先做剧本"、"先处理剧本" | 只做第1步 |
| "继续"、"下一步"、"然后呢" | 继续下一步 |
| "现在做角色"、"设计角色" | 跳到角色设计 |
| "做分镜"、"创分镜" | 跳转到分镜 |

---

## 渐进式加载策略（关键 - 请先阅读）

### 核心原则

**永远不要预先加载所有参考文件。** 仅根据用户输入加载所需内容，以最小化 token 消耗。

### 三层架构

| 层级 | 加载内容 | 加载时机 |
|--------|---------|---------|
| **Layer 1 (始终加载）** | SKILL.md (frontmatter + body） | 始终在上下文中可用 |
| **Layer 2 (条件加载）** | `output-examples-quickstart.md`, `core-workflow.md`, `data-structure-reference.md`, `iterative-workflow.md` | 首次使用 skill 时加载 |
| **Layer 3 (按需加载）** | 所有其他参考文件 | 仅在用户输入触发特定需求时加载 |

---

### 何时加载哪些文件？

| 用户输入包含内容 | 加载这些文件（除 Layer 2 外） |
|------------------|-----------------------------------|
| 迭代式工作、分步骤 | `iterative-workflow.md`, `output-examples-iterative.md` |
| 剧本处理、剧本优化 | `output-examples-script-processing.md`, `script-intelligence-guide.md`, `script-format-guide.md`, `script-evaluation-criteria.md` |
| 角色设计 | `output-examples-characters.md` |
| 道具设计 | `output-examples-props.md`, `prop-design-guide.md` |
| 场景/布景设计 | `output-examples-locations.md`, `location-design-guide.md` |
| 分镜创作 | `output-examples-storyboard.md`, `shot-types-guide.md`, `cinematic-language-guide.md` |
| 声音设计 | `sound-design-guide.md` |
| 风格/负面提示词 | `style-reference.md`, `negative-prompts-library.md` |
| 完整电影项目 | 根据内容加载所有相关文件 |

---

## 模块化输出模式

### 支持的输出模式

检测用户的模块化输出意图：

| 模式 | 检测关键词 | 输出 |
|------|-------------|------|
| **完整项目** | 无特定模式关键词，用户需要完整导演方案 | 包含所有字段的完整 `FILM_PROJECT` 结构 |
| **仅剧本** | "只剧本", "script only", "仅剧本", "output script" | 仅 `script` 字段 + `userInput` |
| **仅角色** | "只角色", "characters only", "仅角色", "output characters" | 仅 `characters` 数组 + `userInput` |
| **仅道具** | "只道具", "props only", "仅道具", "output props" | 仅 `props` 数组 + `userInput` |
| **仅场景** | "只场景", "locations only", "仅场景", "output locations" | 仅 `locations` 数组 + `userInput` |
| **仅分镜** | "只分镜", "storyboard only", "仅分镜", "shots only", "output storyboard" | 仅 `scenes` + `shots` 数组 + `userInput` |

---

## 生成模式

| 模式 | 触发条件 | 执行操作 |
|------|-----------|----------|
| **剧本智能处理** | 用户提供任何输入（简短想法、故事、小说、剧本） | 处理输入、评估、优化、生成标准剧本 |
| **角色大师级设计** | 用户需要角色设计，提到"角色"、"character" | 创建详细的角色设计文档 |
| **场景完美设计** | 用户需要场景/布景设计，提到"场景"、"location"、"布景" | 创建详细的场景设计文档 |
| **道具专业设计** | 用户需要道具设计，提到"道具"、"prop" | 创建详细的道具设计文档 |
| **分镜精确创作** | 用户需要分镜，提到"分镜"、"storyboard" | 创建详细的分镜脚本（含镜头） |
| **完整导演方案** | 用户需要完整电影项目 | 生成完整的 `FILM_PROJECT` 结构 |
| **模块化输出** | 用户指定"只剧本"、"只角色"、"只道具"、"只场景"、"只分镜" | 仅输出请求的模块 |
| **迭代式工作** | 用户说"一步步来"、"分步骤"、"迭代" | 分5个步骤逐个完成 |

---

## 核心工作流程（关键 - 始终遵循）

### 步骤 0：检测工作模式和输出模式

首先，确定用户的需求：

1. **检测工作模式**
   - 检查迭代式关键词："一步步来"、"分步骤"、"迭代"
   - 检查完整模式关键词："完整项目"、"一次性"
   - 如果没有明确指定，推荐使用迭代式

2. **检测输出模式**
   - 检查关键词，如"只剧本"、"只角色"、"只道具"、"只场景"、"只分镜"
   - 如果没有特定模式，默认使用 **完整项目** 模式

---

### 步骤 1：处理用户输入（迭代式或完整模式）

阅读 `references/script-intelligence-guide.md` 了解详情：

1. **检测输入类型**
   - 简短想法（< 50 字）→ 扩展为故事 → 生成剧本
   - 故事/小说 → 提取元素 → 生成剧本
   - 现有剧本 → 评估 → 优化（如需要）

2. **评估剧本**（如果输入是剧本）
   - 分数：0-100
   - 等级：优秀/良好/一般/较差
   - 优势、劣势、建议

3. **生成/优化剧本**
   - 标准剧本格式
   - 场景标题、描述、对话

---

### 步骤 2：设计核心元素

根据剧本，设计：

1. **角色设计**（阅读 `output-examples-characters.md`）
   - 基本信息：姓名、年龄、性别
   - 外貌特征：脸型、发型、眼睛、体型、独特特征
   - 性格特点：性格标签、背景故事
   - 服装风格：主要服装、配饰
   - 标志性动作/表情
   - 参考图生成提示词

2. **场景设计**（阅读 `output-examples-locations.md`）
   - 场景名称、类型（室内/室外）
   - 时间、天气、季节
   - 氛围、灯光风格、色调
   - 空间布局、核心特征
   - 参考图生成提示词

3. **道具设计**（阅读 `output-examples-props.md`）
   - 道具名称、类别、角色
   - 外观：材质、颜色、状态、特征
   - 故事意义、交互方式
   - 参考图生成提示词

---

### 步骤 3：创建分镜（万能导演核心 - 精确到每个拍摄手段）

阅读 `output-examples-storyboard.md`、`shot-types-guide.md` 和 `cinematic-language-guide.md`：

1. **创建场景**
   - 索引、位置、摘要
   - 氛围标签、时长
   - 角色/道具关联
   - 视觉提示词

2. **创建分镜（精确的拍摄手段）**
   - **镜头类型**：8种类型（极远景、远景、全景、中景、中近景、近景、特写、过肩镜头）
     - 极远景：建立宏大场景
     - 远景：展示人物与环境关系
     - 全景：人物完整出场
     - 中景：对话场景
     - 中近景：情感表达
     - 近景：强调表情
     - 特写：突出细节
     - 过肩镜头：对话关系
   - **相机移动**：10种类型（静态、平移、俯仰、推拉、轨道、推拉结合、跟拍、环绕、航拍、手持）
     - 静态：稳定专注
     - 平移：展示广阔
     - 俯仰：揭示强调
     - 推拉：突出细节
     - 轨道：沉浸平滑
     - 推拉结合：视觉冲击
     - 跟拍：跟随动作
     - 环绕：360度展示
     - 航拍：宏大视角
     - 手持：真实纪录片感
   - **相机角度**：5种类型（平视、低角度、高角度、鸟瞰、荷兰角）
     - 平视：自然真实
     - 低角度：力量英雄
     - 高角度：脆弱俯瞰
     - 鸟瞰：布局地图
     - 荷兰角：不安紧张
   - 时长（秒）、时间范围
   - 描述、动作、对话
   - 灯光、声音设计
   - 视频生成配置（模式、提示词等）
   - **关键：每个分镜都必须提供专业的视频生成提示词，包含镜头类型、相机移动、相机角度的详细描述**

---

### 步骤 4：添加声音设计（可选）

阅读 `sound-design-guide.md`：
- 环境音、音效、配乐
- 配乐计划
- 音画同步策略

---

### 步骤 5：输出 JSON

遵循 `references/data-structure-reference.md` 中的精确格式。

---

## 迭代式工作流程（5个步骤）

### 迭代式工作流程请参考 `references/iterative-workflow.md`：

1. **步骤 0：确认工作模式
2. **步骤 1：剧本处理**
3. **步骤 2：角色设计**
4. **步骤 3：场景与道具设计**
5. **步骤 4：分镜创作**
6. **步骤 5：完整项目整合**

---

## 输出格式（必须严格遵循）

请参阅 `references/data-structure-reference.md` 了解完整数据结构。

### 快速示例（完整项目）

```json
{
  "id": "uuid-v4",
  "uuid": "uuid-v4",
  "type": "FILM_PROJECT",
  "name": "秋日回忆",
  "description": "两个朋友在公园分享旅行经历",
  "status": "DRAFT",
  "totalDurationSeconds": 30,
  "userInput": {
    "id": "uuid-v4",
    "uuid": "uuid-v4",
    "type": "FILM_USER_INPUT",
    "inputKind": "REQUIREMENT",
    "rawText": "两个朋友在公园长椅上聊天，一人兴奋地分享旅行经历，另一人认真倾听",
    "detectedLanguage": "zh",
    "completenessScore": 60,
    "createdAt": 1771101306021,
    "updatedAt": 1771101306021
  },
  "script": {
    "id": "uuid-v4",
    "uuid": "uuid-v4",
    "type": "FILM_SCRIPT",
    "title": "秋日回忆",
    "genres": ["剧情", "友情"],
    "styleTags": ["电影写实", "温馨"],
    "content": "标准剧本内容...",
    "evaluation": {
      "score": 78,
      "grade": "Good",
      "strengths": ["场景描写生动"],
      "weaknesses": ["对话略显生硬"],
      "suggestions": ["优化对话"]
    },
    "isStandardized": true,
    "isOptimized": true,
    "version": "1.0.0",
    "createdAt": 1771101306021,
    "updatedAt": 1771101306021
  },
  "characters": [],
  "props": [],
  "locations": [],
  "scenes": [],
  "shots": [],
  "soundtrack": {},
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
  "videoPromptEngineerInput": {},
  "createdAt": 1771101306021,
  "updatedAt": 1771101306083
}
```

---

## 模块化输出示例

### 仅剧本

```json
{
  "userInput": { ... },
  "script": { ... }
}
```

### 仅角色

```json
{
  "userInput": { ... },
  "characters": [ ... ]
}
```

### 仅道具

```json
{
  "userInput": { ... },
  "props": [ ... ]
}
```

### 仅场景

```json
{
  "userInput": { ... },
  "locations": [ ... ]
}
```

### 仅分镜

```json
{
  "userInput": { ... },
  "scenes": [ ... ],
  "shots": [ ... ]
}
```

---

## 涵盖的常见用例

| 类别 | 示例 |
|--------|------|
| **简短想法到电影** | "公园聊天" → 完整电影项目 |
| **故事到剧本** | 小说/故事 → 标准剧本 |
| **剧本评估** | 现有剧本 → 分数 + 优化建议 |
| **角色设计** | 创建详细的角色设计文档 |
| **场景设计** | 创建详细的场景设计文档 |
| **道具设计** | 创建详细的道具设计文档 |
| **分镜创作** | 创建逐镜头分镜脚本 |
| **模块化输出** | 仅剧本 / 仅角色 / 仅道具 / 仅场景 / 仅分镜 |
| **迭代式工作** | 分5个步骤逐个完成项目 |

---

## 参考资料（按需加载以获取更多详情 - 遵循渐进式加载）

### 核心工作流程

- `references/core-workflow.md` - 完整的分步工作流程
- `references/iterative-workflow.md` - 迭代式工作流程
- `references/data-structure-reference.md` - 完整的数据结构定义

### 输出示例（仅按需加载类别特定文件）

- `references/output-examples-quickstart.md` - 快速参考 + JSON 结构（始终优先加载）
- `references/output-examples-iterative.md` - 迭代式工作流程示例
- `references/output-examples-script-processing.md` - 剧本处理示例
- `references/output-examples-characters.md` - 角色设计示例
- `references/output-examples-props.md` - 道具设计示例
- `references/output-examples-locations.md` - 场景设计示例
- `references/output-examples-storyboard.md` - 分镜示例

### 生成指南

- `references/script-intelligence-guide.md` - 剧本智能处理指南
- `references/script-format-guide.md` - 标准剧本格式
- `references/script-evaluation-criteria.md` - 剧本评估标准
- `references/shot-types-guide.md` - 镜头类型和比例
- `references/cinematic-language-guide.md` - 镜头语言指南
- `references/sound-design-guide.md` - 声音设计指南
- `references/location-design-guide.md` - 场景设计指南
- `references/prop-design-guide.md` - 道具设计指南
- `references/genre-templates.md` - 类型模板库
- `references/style-reference.md` - 风格参考
- `references/negative-prompts-library.md` - 负面提示词库
