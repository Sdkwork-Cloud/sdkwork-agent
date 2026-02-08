# SDKWork-Agent Skill交互优化架构设计

## 概述

本文档描述了SDKWork-Agent Skill系统的交互优化架构，该架构参考了OpenClaw、Claude Code、OpenCode等业界领先方案，实现了多轮对话、上下文感知、智能参数提取和优雅错误恢复等高级功能。

## 架构对比

### 优化前 vs 优化后

```
优化前（Current SDKWork-Agent）:
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  User Input │────▶│ Single-turn  │────▶│   Execute   │
└─────────────┘     │ Extraction   │     └─────────────┘
                    └──────────────┘
                    
                    问题：
                    - 单轮交互，无状态管理
                    - 简单参数提取
                    - 无错误恢复机制
                    - 无上下文感知

优化后（Optimized Architecture）:
┌─────────────┐     ┌─────────────────────────────────────────┐
│  User Input │────▶│   OptimizedSkillInteractionManager      │
└─────────────┘     │  ┌─────────────────────────────────────┐│
                    │  │  SkillConversationStateMachine      ││
                    │  │  - 10-state conversation flow       ││
                    │  │  - State transitions & validation   ││
                    │  └─────────────────────────────────────┘│
                    │  ┌─────────────────────────────────────┐│
                    │  │  IntelligentParameterExtractor      ││
                    │  │  - Multi-layer extraction           ││
                    │  │  - Few-shot learning                ││
                    │  └─────────────────────────────────────┘│
                    │  ┌─────────────────────────────────────┐│
                    │  │  LongTermMemorySystem               ││
                    │  │  - 4-layer memory architecture      ││
                    │  │  - Semantic retrieval               ││
                    │  └─────────────────────────────────────┘│
                    │  ┌─────────────────────────────────────┐│
                    │  │  ErrorRecoveryManager               ││
                    │  │  - Multi-level recovery             ││
                    │  │  - Pattern learning                 ││
                    │  └─────────────────────────────────────┘│
                    └─────────────────────────────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  Skill Execution │
                              └──────────────────┘
```

## 核心组件

### 1. 智能参数提取器 (IntelligentParameterExtractor)

**文件**: `src/skills/interaction/parameter-extractor.ts`

#### 功能特性

- **五层输入分类**：
  - `structured`: 结构化JSON输入
  - `natural_language`: 自然语言描述
  - `mixed`: 混合输入（结构化+自然语言）
  - `referential`: 引用式输入（"用刚才的文件"）
  - `multimodal`: 多模态输入（文本+附件）

- **Few-shot学习**：
  - 动态示例选择
  - 基于相似度的示例匹配
  - 持续学习和优化

- **上下文感知**：
  - 对话历史利用
  - 用户偏好记忆
  - 资源引用解析

#### 使用示例

```typescript
const extractor = new IntelligentParameterExtractor(true);

const result = await extractor.extract(
  '搜索当前目录下的所有js文件，要递归查找',
  schema,
  parameterDefinitions,
  {
    conversationHistory: [...],
    skillContext: { name: 'file_search', description: '搜索文件' }
  }
);

console.log(result.params);      // { path: '.', recursive: true, pattern: '*.js' }
console.log(result.confidence);  // 0.92
```

### 2. 对话状态机 (SkillConversationStateMachine)

**文件**: `src/skills/interaction/conversation-state-machine.ts`

#### 状态定义

```
IDLE ──▶ INTENT_RECOGNITION ──▶ SKILL_SELECTION ──▶ GATHERING_PARAMS
                                                        │
                                                        ▼
                                                  CONFIRMING ──▶ EXECUTING
                                                                   │
                                                                   ▼
                                                            PRESENTING_RESULT
                                                                   │
                                                                   ▼
                                                              FOLLOW_UP
                                                                   │
                    ┌──────────────────────────────────────────────┘
                    │
                    ▼
            ERROR_RECOVERY ◀── 错误恢复路径
                    │
                    ▼
              CLARIFYING
```

#### 10个对话状态

1. **IDLE**: 空闲状态，等待用户输入
2. **INTENT_RECOGNITION**: 意图识别中
3. **SKILL_SELECTION**: Skill选择中
4. **GATHERING_PARAMS**: 参数收集中
5. **CONFIRMING**: 等待用户确认
6. **EXECUTING**: Skill执行中
7. **PRESENTING_RESULT**: 结果展示中
8. **ERROR_RECOVERY**: 错误恢复中
9. **CLARIFYING**: 需要用户澄清
10. **FOLLOW_UP**: 跟进/结束对话

#### 状态转换规则

```typescript
const STATE_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  IDLE: ['INTENT_RECOGNITION'],
  INTENT_RECOGNITION: ['SKILL_SELECTION', 'CLARIFYING', 'IDLE'],
  SKILL_SELECTION: ['GATHERING_PARAMS', 'EXECUTING', 'CLARIFYING', 'IDLE'],
  GATHERING_PARAMS: ['GATHERING_PARAMS', 'CONFIRMING', 'CLARIFYING', 'IDLE'],
  CONFIRMING: ['EXECUTING', 'GATHERING_PARAMS', 'IDLE'],
  EXECUTING: ['PRESENTING_RESULT', 'ERROR_RECOVERY'],
  PRESENTING_RESULT: ['FOLLOW_UP'],
  ERROR_RECOVERY: ['EXECUTING', 'CLARIFYING', 'FOLLOW_UP', 'IDLE'],
  CLARIFYING: ['INTENT_RECOGNITION', 'GATHERING_PARAMS', 'IDLE'],
  FOLLOW_UP: ['INTENT_RECOGNITION', 'IDLE']
};
```

### 3. 长期记忆系统 (LongTermMemorySystem)

**文件**: `src/skills/interaction/long-term-memory.ts`

#### 四层记忆架构（MemGPT风格）

```
┌─────────────────────────────────────────────────────────────┐
│                    LongTermMemorySystem                     │
├─────────────┬──────────────┬──────────────┬─────────────────┤
│   Working   │  Short-term  │ Medium-term  │   Long-term     │
│   Memory    │    Memory    │    Memory    │     Memory      │
├─────────────┼──────────────┼──────────────┼─────────────────┤
│ - 当前上下文 │ - 会话历史   │ - 跨会话记忆  │ - 持久化知识    │
│ - 活跃参数   │ - 最近执行   │ - 用户偏好    │ - 学习到的模式  │
│ - 临时结果   │ - 近期事实   │ - 项目信息    │ - 归档数据      │
├─────────────┼──────────────┼──────────────┼─────────────────┤
│  容量: 10   │   容量: 100  │   容量: 1000 │   容量: 无限制   │
│  生命周期:  │   生命周期:  │   生命周期:  │   生命周期:     │
│  当前对话   │   1小时      │   24小时     │   永久          │
└─────────────┴──────────────┴──────────────┴─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Semantic Search │
                    │  - Embedding     │
                    │  - Similarity    │
                    └─────────────────┘
```

#### 记忆类型

- `conversation`: 对话内容
- `skill_execution`: Skill执行记录
- `user_preference`: 用户偏好
- `context_fact`: 上下文事实
- `error_pattern`: 错误模式

#### 自动管理机制

- **记忆迁移**: 根据重要性和时间自动在层间迁移
- **记忆遗忘**: 低重要性记忆自动清理
- **记忆总结**: 大量记忆自动摘要

### 4. 错误恢复管理器 (ErrorRecoveryManager)

**文件**: `src/skills/interaction/error-recovery.ts`

#### 错误分类

```typescript
type ErrorCategory = 
  | 'PARAM_MISSING'      // 参数缺失
  | 'PARAM_INVALID'      // 参数无效
  | 'VALIDATION_FAILED'  // 验证失败
  | 'EXECUTION_FAILED'   // 执行失败
  | 'TIMEOUT'            // 超时
  | 'RESOURCE_ERROR'     // 资源错误
  | 'PERMISSION_DENIED'  // 权限不足
  | 'RATE_LIMITED'       // 限流
  | 'DEPENDENCY_ERROR'   // 依赖错误
  | 'NETWORK_ERROR'      // 网络错误
  | 'UNKNOWN';           // 未知错误
```

#### 恢复策略

```typescript
type RecoveryStrategy = 
  | 'AUTO_FIX'     // 自动修复（类型转换、格式清理）
  | 'RETRY'        // 指数退避重试
  | 'FALLBACK'     // 降级执行（简化版skill）
  | 'CLARIFY'      // 请求用户澄清
  | 'SKIP'         // 跳过当前操作
  | 'ESCALATE';    // 升级处理（人工介入）
```

#### 多级恢复流程

```
错误发生
    │
    ▼
┌─────────────────┐
│  1. 错误分类     │──▶ 匹配错误模式库
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  2. 严重程度评估  │──▶ warning/error/critical/fatal
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  3. 选择恢复策略  │──▶ 基于分类和严重程度
└─────────────────┘
    │
    ├──▶ AUTO_FIX ──▶ 尝试自动修复 ──▶ 成功? ──▶ 重试执行
    │                                     │
    │                                     ▼
    │                                  失败
    │                                     │
    ├──▶ RETRY ──▶ 指数退避重试 ──▶ 成功? ──▶ 继续
    │                               │
    │                               ▼
    │                            超过最大重试
    │                               │
    ├──▶ FALLBACK ──▶ 使用降级skill ──▶ 成功? ──▶ 继续
    │                                   │
    │                                   ▼
    │                                无降级方案
    │                                   │
    ├──▶ CLARIFY ──▶ 请求用户澄清 ──▶ 用户响应 ──▶ 重试
    │
    └──▶ ESCALATE ──▶ 人工介入
```

### 5. 交互管理器 (OptimizedSkillInteractionManager)

**文件**: `src/skills/interaction/interaction-manager.ts`

#### 核心职责

- 整合所有子组件
- 管理会话生命周期
- 协调状态流转
- 处理错误恢复

#### 配置选项

```typescript
interface InteractionConfig {
  // 参数提取
  enableMultiLayerExtraction: boolean;  // 启用多层提取
  enableFewShotLearning: boolean;       // 启用Few-shot学习
  maxExtractionAttempts: number;        // 最大提取尝试次数

  // 对话
  enableMultiTurnDialog: boolean;       // 启用多轮对话
  maxConversationDepth: number;         // 最大对话深度
  contextWindowSize: number;            // 上下文窗口大小

  // 记忆
  enableLongTermMemory: boolean;        // 启用长期记忆
  memoryImportanceThreshold: number;    // 记忆重要性阈值
  autoSummarizeThreshold: number;       // 自动摘要阈值

  // 错误恢复
  recoveryConfig: RecoveryConfig;
}
```

## 完整交互流程示例

### 场景：用户想要搜索文件

```
用户: "帮我找一下文件"
    │
    ▼
┌─────────────────────────────────────┐
│ 状态: IDLE ──▶ INTENT_RECOGNITION   │
│ 动作: 识别意图为 "file_search"       │
│ 置信度: 0.85                        │
└─────────────────────────────────────┘
    │
    ▼
AI: "我将帮您执行文件搜索。请告诉我："
    "1. 搜索路径"
    "2. 文件名模式（可选）"
    "3. 是否递归搜索（可选）"
    │
用户: "在当前目录搜索所有js文件，递归查找"
    │
    ▼
┌─────────────────────────────────────┐
│ 状态: GATHERING_PARAMS              │
│ 动作: 智能参数提取                   │
│ 输入类型: natural_language          │
│ 提取结果:                           │
│   - path: "."                       │
│   - pattern: "*.js"                 │
│   - recursive: true                 │
│ 置信度: 0.92                        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 状态: GATHERING_PARAMS ──▶ CONFIRMING│
│ 动作: 所有必需参数已收集             │
└─────────────────────────────────────┘
    │
    ▼
AI: "请确认执行以下操作："
    "Skill: file_search"
    "参数:"
    "  - path: ."
    "  - pattern: *.js"
    "  - recursive: true"
    ""
    "确认执行吗？(是/否/修改)"
    │
用户: "是的"
    │
    ▼
┌─────────────────────────────────────┐
│ 状态: CONFIRMING ──▶ EXECUTING       │
│ 动作: 执行skill                      │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 状态: EXECUTING ──▶ PRESENTING_RESULT│
│ 动作: 展示执行结果                   │
│ 结果: 成功找到5个文件                │
└─────────────────────────────────────┘
    │
    ▼
AI: "✅ file_search 执行成功！"
    "结果:"
    "  - src/index.js"
    "  - src/utils.js"
    "  - tests/test.js"
    "  ..."
    ""
    "还有其他我可以帮您的吗？"
    "（输入\"新\"开始新操作，\"退出\"结束对话）"
    │
用户: "退出"
    │
    ▼
┌─────────────────────────────────────┐
│ 状态: FOLLOW_UP ──▶ IDLE             │
│ 动作: 归档记忆，关闭会话              │
└─────────────────────────────────────┘
    │
    ▼
AI: "感谢使用！再见！"
```

## 与业界方案对比

| 特性 | SDKWork-Agent (优化后) | Claude Code | OpenCode | OpenClaw |
|------|------------------------|-------------|----------|----------|
| 多层参数提取 | ✅ 5层分类 | ✅ 多层 | ✅ 多层 | ✅ 多层 |
| Few-shot学习 | ✅ 动态示例 | ✅ 支持 | ⚠️ 有限 | ✅ 支持 |
| 对话状态机 | ✅ 10状态 | ✅ 完整 | ✅ 完整 | ✅ 完整 |
| 长期记忆 | ✅ 4层架构 | ✅ 支持 | ⚠️ 基础 | ✅ 支持 |
| 语义检索 | ✅ Embedding | ✅ 支持 | ❌ 不支持 | ✅ 支持 |
| 错误恢复 | ✅ 6策略 | ✅ 完整 | ⚠️ 基础 | ✅ 完整 |
| 自动修复 | ✅ 类型转换 | ✅ 支持 | ❌ 不支持 | ⚠️ 有限 |
| 降级执行 | ✅ Fallback skill | ✅ 支持 | ❌ 不支持 | ✅ 支持 |
| 错误学习 | ✅ 模式统计 | ⚠️ 有限 | ❌ 不支持 | ⚠️ 有限 |

## 文件结构

```
src/skills/interaction/
├── index.ts                          # 模块导出
├── parameter-extractor.ts            # 智能参数提取器
├── conversation-state-machine.ts     # 对话状态机
├── long-term-memory.ts               # 长期记忆系统
├── error-recovery.ts                 # 错误恢复管理器
├── interaction-manager.ts            # 交互管理器（集成）
└── examples/
    ├── basic-usage.ts                # 基础使用示例
    └── advanced-features.ts          # 高级功能示例
```

## 使用指南

### 基础使用

```typescript
import { createOptimizedInteractionManager } from './interaction';

const manager = createOptimizedInteractionManager(registry, scheduler);

// 创建会话
const session = manager.createSession('user-123');

// 处理输入
const result = await manager.processInput(session.id, {
  text: '帮我搜索文件'
});

console.log(result.response);
```

### 高级配置

```typescript
const manager = createOptimizedInteractionManager(registry, scheduler, {
  enableMultiLayerExtraction: true,
  enableFewShotLearning: true,
  enableLongTermMemory: true,
  maxConversationDepth: 20,
  recoveryConfig: {
    maxRetries: 5,
    enableAutoFix: true,
    enableLearning: true
  }
});
```

### 事件监听

```typescript
manager.on('sessionCreated', (session) => {
  console.log('会话创建:', session.id);
});

manager.on('errorRecovered', ({ error, strategy }) => {
  console.log('错误恢复:', error.category, strategy);
});

manager.on('errorEscalated', (error) => {
  console.log('错误升级:', error.message);
});
```

## 性能优化建议

1. **记忆管理**: 定期清理过期记忆，避免内存泄漏
2. **嵌入缓存**: 对频繁检索的记忆缓存embedding
3. **状态持久化**: 重要会话状态持久化到数据库
4. **并发控制**: 限制同时活跃的会话数量
5. **LLM调用优化**: 使用流式响应，减少等待时间

## 未来扩展

1. **多模态支持**: 图像、音频输入处理
2. **协作对话**: 多用户会话支持
3. **A/B测试**: 不同策略的效果对比
4. **强化学习**: 基于用户反馈优化策略
5. **知识图谱**: 结构化知识存储和推理
