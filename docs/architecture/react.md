# ReAct 思考引擎

ReAct (Reasoning + Acting) 是 SDKWork Agent 的核心思考引擎，实现了 Thought-Action-Observation 循环，支持并行工具调用和自我反思。

## 什么是 ReAct

ReAct 是一种将推理（Reasoning）和行动（Acting）结合的方法，让 Agent 能够：

1. **思考 (Thought)** - 分析当前情况并制定计划
2. **行动 (Action)** - 选择工具或技能执行
3. **观察 (Observation)** - 收集执行结果
4. **反思 (Reflection)** - 评估进展并调整策略

```
┌─────────────────────────────────────────────────────────────┐
│                    ReAct 循环                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│   │ Thought  │───→│  Action  │───→│Observation│            │
│   │  思考    │    │  行动    │    │  观察    │            │
│   └──────────┘    └──────────┘    └────┬─────┘            │
│         ↑                              │                   │
│         │                              │                   │
│         └──────────┬───────────────────┘                   │
│                    │                                       │
│              ┌─────┴─────┐                                 │
│              │Reflection │                                 │
│              │  反思     │                                 │
│              └───────────┘                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 核心特性

### 1. 并行工具调用

ReAct 引擎支持同时执行多个独立的工具：

```typescript
const agent = createAgent(openai, {
  name: 'ParallelAgent',
  skills: [skill1, skill2, skill3]
});

// 在 ReAct 循环中，可以同时执行多个工具
// 例如：同时搜索多个数据源
```

### 2. 自我反思

每 N 步（默认 3 步）进行一次自我反思：

```typescript
// 配置反思参数
const agent = createAgent(openai, {
  name: 'ReflectiveAgent',
  // 通过 Agent 配置传递 ReAct 配置
});

// 反思内容包含：
// - 是否在向目标前进
// - 是否有错误或低效
// - 是否需要调整策略
```

### 3. 超时控制

防止思考过程无限循环：

```typescript
// 默认超时：60 秒
// 默认最大步数：10 步
const result = await agent.think('Complex question', {
  sessionId: 'session-1',
  executionId: 'exec-1'
});
```

## 使用方式

### 基础使用

```typescript
const agent = createAgent(openai, {
  name: 'ReasoningAgent',
  skills: [calculatorSkill, searchSkill]
});

await agent.initialize();

// 使用 ReAct 思考
const result = await agent.think(
  'What is the population of Tokyo multiplied by 2?',
  { sessionId: 'session-1', executionId: 'exec-1' }
);

console.log('Answer:', result.answer);
console.log('Steps:', result.steps.length);
console.log('Tools used:', result.toolsUsed);
console.log('Reflections:', result.reflections);
```

### 流式输出

```typescript
for await (const event of agent.thinkStream('Complex question')) {
  switch (event.type) {
    case 'start':
      console.log('🚀 Starting:', event.input);
      break;
      
    case 'thought':
      console.log(`🧠 Step ${event.step}:`, event.thought);
      break;
      
    case 'actions':
      console.log(`🔧 Step ${event.step} Actions:`);
      event.actions.forEach(action => {
        console.log(`  - ${action.type}:${action.name}`);
      });
      break;
      
    case 'observations':
      console.log(`👁️ Step ${event.step} Results:`);
      event.observations.forEach(obs => {
        console.log(`  - ${obs}`);
      });
      break;
      
    case 'reflection':
      console.log(`💭 Step ${event.step} Reflection:`);
      console.log(`  ${event.reflection}`);
      break;
      
    case 'complete':
      console.log('✅ Complete!');
      console.log('Answer:', event.answer);
      if (event.incomplete) {
        console.log('⚠️  Incomplete (max steps reached)');
      }
      break;
      
    case 'error':
      console.error('❌ Error:', event.error);
      break;
  }
}
```

## 动作类型

ReAct 引擎支持以下动作类型：

### 1. Tool 动作

```typescript
{
  type: 'tool',
  name: 'calculator',
  parameters: { expression: '2 + 2' }
}
```

### 2. Skill 动作

```typescript
{
  type: 'skill',
  name: 'data-processor',
  parameters: { data: [...] }
}
```

### 3. Finish 动作

表示任务完成：

```typescript
{
  type: 'finish',
  name: 'finish',
  parameters: { answer: 'The result is 4' }
}
```

### 4. Think 动作

继续思考：

```typescript
{
  type: 'think',
  name: 'think',
  parameters: { thought: 'I need more information' }
}
```

### 5. Reflect 动作

进行自我反思：

```typescript
{
  type: 'reflect',
  name: 'reflect',
  parameters: { reflection: 'Progress is good' }
}
```

## 执行流程

### 单步执行流程

```typescript
// 1. 生成思考
const thought = await generateThought(input, step);

// 2. 选择动作
const actions = await selectActions(thought, step);

// 3. 检查是否完成
const finishAction = actions.find(a => a.type === 'finish');
if (finishAction) {
  return finishAction.parameters.answer;
}

// 4. 执行动作
const observations = await executeActions(actions, step, context);

// 5. 记录步骤
steps.push({
  step,
  thought,
  action: actions[0],
  observation: observations.join('\n'),
  duration
});

// 6. 反思（每 N 步）
if (shouldReflect(step)) {
  await reflect(step, context);
}
```

### 并行执行

当 `enableParallelTools` 为 true 时：

```typescript
// 并行执行所有动作
const executions = actions.map(action =>
  executeSingleAction(action, step, context)
);
const results = await Promise.all(executions);
```

## 配置选项

### ReAct 配置

```typescript
interface ReActConfig {
  maxSteps?: number;           // 最大步数（默认 10）
  timeout?: number;            // 超时时间（默认 60000ms）
  enableReflection?: boolean;  // 启用反思（默认 true）
  reflectionInterval?: number; // 反思间隔（默认 3 步）
  maxReflections?: number;     // 最大反思次数（默认 3）
  systemPrompt?: string;       // 系统提示词
  temperature?: number;        // 温度（默认 0.7）
  enableParallelTools?: boolean; // 并行工具（默认 false）
}
```

### 使用配置

```typescript
// 在旧版 Agent 中使用
const agent = new Agent(config, {
  llm,
  skillRegistry,
  toolRegistry,
  memory,
  logger,
  eventBus
});

// 配置 ReAct 引擎
agent.thinkingEngine = createReActEngine({
  llm,
  tools: toolRegistry,
  skills: skillRegistry,
  memory,
  logger,
  config: {
    maxSteps: 15,
    enableReflection: true,
    enableParallelTools: true
  },
  eventBus
});
```

## 结果结构

### ThinkingResult

```typescript
interface ThinkingResult {
  success: boolean;           // 是否成功
  answer: string;            // 最终答案
  steps: ThinkingStep[];     // 思考步骤
  totalSteps: number;        // 总步数
  totalDuration: number;     // 总耗时（ms）
  toolsUsed: string[];       // 使用的工具
  reflections: string[];     // 反思内容
  error?: string;           // 错误信息
}

interface ThinkingStep {
  step: number;             // 步骤编号
  thought: string;          // 思考内容
  action: Action;           // 执行的动作
  observation: string;      // 观察结果
  duration: number;         // 耗时（ms）
}
```

## 最佳实践

### 1. 合理设置最大步数

```typescript
// 简单问题
const result = await agent.think('Simple question');

// 复杂问题，增加步数
const result = await agent.think('Complex problem');
// 在 ReAct 配置中设置 maxSteps: 15
```

### 2. 使用流式输出监控进度

```typescript
for await (const event of agent.thinkStream(question)) {
  // 实时显示思考过程
  updateUI(event);
}
```

### 3. 处理超时和错误

```typescript
try {
  const result = await agent.think(question, { sessionId, executionId });
  
  if (!result.success) {
    console.warn('Thinking incomplete:', result.error);
    console.log('Partial answer:', result.answer);
  }
} catch (error) {
  console.error('Thinking failed:', error);
}
```

### 4. 结合 Skills 和 Tools

```typescript
const agent = createAgent(openai, {
  name: 'PowerfulAgent',
  skills: [
    dataAnalysisSkill,
    reportGenerationSkill
  ],
  tools: [
    fileReaderTool,
    httpRequestTool,
    databaseQueryTool
  ]
});

// ReAct 引擎会自动选择合适的 Skills 和 Tools
const result = await agent.think(
  'Analyze the sales data and generate a report'
);
```

## 示例场景

### 场景 1：数学问题求解

```typescript
const result = await agent.think(
  'Calculate the area of a circle with radius 5'
);

// 思考过程：
// 1. Thought: I need to calculate the area of a circle
// 2. Action: tool:calculator({ expression: 'Math.PI * 5 * 5' })
// 3. Observation: 78.53981633974483
// 4. Action: finish({ answer: 'The area is approximately 78.54' })
```

### 场景 2：多步骤研究

```typescript
const result = await agent.think(
  'What is the GDP of Japan and how does it compare to Germany?'
);

// 思考过程：
// 1. Thought: I need to find GDP data for both countries
// 2. Action: skill:search({ query: 'Japan GDP 2024' })
// 3. Action: skill:search({ query: 'Germany GDP 2024' })
// 4. Observation: [Japan GDP data, Germany GDP data]
// 5. Thought: Now I can compare them
// 6. Action: finish({ answer: '...' })
```

### 场景 3：复杂数据处理

```typescript
const result = await agent.think(
  'Read the sales.csv file, calculate total revenue, and find the best-selling product'
);

// 思考过程：
// 1. Thought: I need to read the file first
// 2. Action: tool:file-reader({ path: 'sales.csv' })
// 3. Observation: [file content]
// 4. Thought: Now I need to process the data
// 5. Action: skill:data-processor({ data: [...] })
// 6. Observation: [processed data]
// 7. Thought: Let me calculate the totals
// 8. Action: tool:calculator({ expression: '...' })
// 9. Action: finish({ answer: '...' })
```

## 相关文档

- [架构总览](./overview.md) - 整体架构设计
- [DDD 分层](./ddd.md) - 领域驱动设计
- [微内核](./microkernel.md) - 微内核架构
- [API 参考](../api/agent.md) - Agent API
