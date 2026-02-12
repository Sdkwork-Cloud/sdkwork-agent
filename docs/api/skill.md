# Skill API

Skill 是 SDKWork Browser Agent 的可执行代码单元，支持多语言脚本和引用文件。

## Skill 定义

### Skill 接口

```typescript
interface Skill {
  /** Skill ID */
  id: string;
  /** Skill 名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 版本 */
  version?: string;
  
  /** 执行脚本 */
  script: SkillScript;
  
  /** 引用文件 */
  references?: Reference[];
  
  /** 输入 Schema */
  input?: JSONSchema;
  /** 输出 Schema */
  output?: JSONSchema;
  
  /** 元数据 */
  meta?: Record<string, unknown>;
}
```

### SkillScript

```typescript
interface SkillScript {
  /** 代码内容 */
  code: string;
  /** 语言 */
  lang: SkillLanguage;
  /** 入口函数 */
  entry?: string;
  /** 依赖 */
  dependencies?: Record<string, string>;
}
```

### SkillLanguage

```typescript
type SkillLanguage = 
  | 'javascript' 
  | 'typescript' 
  | 'python' 
  | 'bash' 
  | 'shell';
```

### JSONSchema

```typescript
interface JSONSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: unknown[];
  description?: string;
  default?: unknown;
}
```

## 创建 Skill

### 基础示例

```typescript
import type { Skill } from '@sdkwork/browser-agent';

const calculatorSkill: Skill = {
  id: 'calculator',
  name: 'Calculator',
  description: 'Perform mathematical calculations',
  version: '1.0.0',
  script: {
    lang: 'typescript',
    code: `
      async function main() {
        const { a, b, operation } = $input;
        let result;
        
        switch (operation) {
          case 'add': result = a + b; break;
          case 'subtract': result = a - b; break;
          case 'multiply': result = a * b; break;
          case 'divide': result = a / b; break;
          default: throw new Error('Unknown operation');
        }
        
        return { result, operation };
      }
    `,
    entry: 'main',
  },
  input: {
    type: 'object',
    properties: {
      a: { type: 'number', description: 'First number' },
      b: { type: 'number', description: 'Second number' },
      operation: { 
        type: 'string', 
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: 'Operation to perform'
      },
    },
    required: ['a', 'b', 'operation'],
  },
  output: {
    type: 'object',
    properties: {
      result: { type: 'number' },
      operation: { type: 'string' },
    },
  },
};
```

### 使用引用文件

```typescript
import type { Skill, Reference } from '@sdkwork/browser-agent';

const templateSkill: Skill = {
  id: 'template-renderer',
  name: 'Template Renderer',
  description: 'Render templates with data',
  version: '1.0.0',
  script: {
    lang: 'typescript',
    code: `
      async function main() {
        const template = $ref('template');
        const data = $input;
        
        // Simple template replacement
        let result = template;
        for (const [key, value] of Object.entries(data)) {
          result = result.replace(new RegExp(\`{{\${key}}}\`, 'g'), String(value));
        }
        
        return { rendered: result };
      }
    `,
    entry: 'main',
  },
  references: [
    {
      name: 'template',
      path: './templates/email.txt',
      content: 'Hello {{name}}, welcome to {{company}}!',
      type: 'template',
    },
  ],
  input: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      company: { type: 'string' },
    },
    required: ['name', 'company'],
  },
};
```

## 注入 API

在 Skill 脚本中可以使用以下注入 API：

### $input

输入数据对象。

```typescript
const { a, b } = $input;
```

### $llm

调用 LLM 服务。

```typescript
const response = await $llm('Analyze this code', {
  model: 'gpt-4',
  temperature: 0.7,
});
```

### $tool

调用 Tool。

```typescript
const fileContent = await $tool('file-read', { path: './data.txt' });
```

### $skill

调用其他 Skill。

```typescript
const result = await $skill('math-calc', { expression: '2+2' });
```

### $memory

内存操作。

```typescript
// 存储
await $memory.set('key', { data: 'value' });

// 获取
const value = await $memory.get('key');

// 删除
await $memory.delete('key');

// 搜索
const results = await $memory.search('query', 10);
```

### $references / $ref

访问引用文件。

```typescript
// 通过对象访问
const template = $references.template;

// 通过函数访问
const data = $ref('data.json');
```

### $log

日志输出。

```typescript
$log.info('Processing...');
$log.debug('Debug info:', { data });
$log.warn('Warning message');
$log.error('Error occurred');
```

## SkillRegistry

### 注册 Skill

```typescript
agent.skills.register(calculatorSkill);
```

### 注销 Skill

```typescript
agent.skills.unregister('calculator');
```

### 获取 Skill

```typescript
const skill = agent.skills.get('calculator');
const skillByName = agent.skills.getByName('Calculator');
```

### 列出所有 Skill

```typescript
const skills = agent.skills.list();
skills.forEach(s => console.log(s.id, s.name));
```

### 搜索 Skill

```typescript
const results = agent.skills.search('math');
```

## 执行 Skill

### 通过 Agent 执行

```typescript
const result = await agent.executeSkill('calculator', JSON.stringify({
  a: 10,
  b: 5,
  operation: 'multiply',
}));

if (result.success) {
  console.log('Result:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### SkillResult

```typescript
interface SkillResult {
  /** 是否成功 */
  success: boolean;
  /** 输出数据 */
  data?: unknown;
  /** 错误信息 */
  error?: SkillError;
  /** 执行元数据 */
  metadata?: SkillExecutionMeta;
}

interface SkillError {
  code: string;
  message: string;
  skillId: string;
  stack?: string;
  recoverable: boolean;
}

interface SkillExecutionMeta {
  executionId: string;
  skillId: string;
  skillName: string;
  startTime: number;
  endTime: number;
  duration: number;
  resources?: ResourceUsage;
}
```

## Skill 事件

```typescript
type SkillEventType =
  | 'skill:registered'
  | 'skill:unregistered'
  | 'skill:executing'
  | 'skill:executed'
  | 'skill:completed'
  | 'skill:failed'
  | 'skill:aborted';
```

## 完整示例

```typescript
import { createAgent } from '@sdkwork/browser-agent';
import { OpenAIProvider } from '@sdkwork/browser-agent/llm';
import type { Skill } from '@sdkwork/browser-agent';

// 定义 Skill
const greetingSkill: Skill = {
  id: 'greeting',
  name: 'Greeting',
  description: 'Generate personalized greeting',
  version: '1.0.0',
  script: {
    lang: 'typescript',
    code: `
      async function main() {
        const name = $input.name || 'Guest';
        const hour = new Date().getHours();
        
        let greeting = 'Hello';
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 18) greeting = 'Good afternoon';
        else greeting = 'Good evening';
        
        return {
          message: \`\${greeting}, \${name}!\`,
          timestamp: Date.now()
        };
      }
    `,
    entry: 'main',
  },
  input: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name to greet' },
    },
  },
  output: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      timestamp: { type: 'number' },
    },
  },
};

async function main() {
  const llm = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  });

  const agent = createAgent(llm, {
    name: 'SkillAgent',
    skills: [greetingSkill],
  });

  await agent.initialize();

  const result = await agent.executeSkill('greeting', JSON.stringify({
    name: 'Alice',
  }));

  console.log(result.data);

  await agent.destroy();
}

main().catch(console.error);
```

## 最佳实践

1. **清晰的描述** - 提供详细的 description 帮助 AI 理解
2. **完整的 Schema** - 定义 input 和 output Schema
3. **错误处理** - 在脚本中处理可能的错误
4. **版本管理** - 使用 version 字段跟踪变更
5. **引用文件** - 使用 references 管理模板和数据
