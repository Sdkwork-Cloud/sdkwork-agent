# Skill API

Skill 是可执行的代码单元，支持多语言脚本和引用文件系统。

## defineSkill

定义一个新的 Skill。

```typescript
function defineSkill(config: SkillConfig): Skill
```

### SkillConfig

```typescript
interface SkillConfig {
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

interface SkillScript {
  /** 代码内容 */
  code: string;
  
  /** 语言 */
  lang: 'javascript' | 'typescript' | 'python' | 'bash' | 'shell';
  
  /** 入口函数，默认为 'main' */
  entry?: string;
  
  /** 依赖包 */
  dependencies?: Record<string, string>;
}

interface Reference {
  /** 引用名称 */
  name: string;
  
  /** 文件路径 */
  path: string;
  
  /** 文件内容 */
  content: string;
  
  /** 文件类型 */
  type: 'code' | 'data' | 'template' | 'doc' | 'config';
}

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

### 示例

```typescript
import { defineSkill } from 'sdkwork-agent';

// 基础 Skill
const greetingSkill = defineSkill({
  id: 'greeting',
  name: 'Greeting',
  description: 'Generate personalized greeting',
  version: '1.0.0',
  script: {
    lang: 'typescript',
    code: `
      async function main() {
        const name = $input.name || 'Guest';
        return { message: 'Hello, ' + name };
      }
    `,
    entry: 'main'
  },
  input: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'User name' }
    }
  },
  output: {
    type: 'object',
    properties: {
      message: { type: 'string' }
    }
  }
});

// 带引用文件的 Skill
const templateSkill = defineSkill({
  id: 'email-generator',
  name: 'Email Generator',
  description: 'Generate email from template',
  script: {
    lang: 'typescript',
    code: `
      async function main() {
        const template = $references.template;
        const data = $input.data;
        
        // 使用模板
        let email = template;
        for (const [key, value] of Object.entries(data)) {
          email = email.replace(new RegExp('{{' + key + '}}', 'g'), value);
        }
        
        return { email };
      }
    `
  },
  references: [
    {
      name: 'template',
      path: './email-template.txt',
      content: 'Dear {{name}},\n\nThank you for your interest in {{product}}.',
      type: 'template'
    }
  ],
  input: {
    type: 'object',
    properties: {
      data: { type: 'object' }
    },
    required: ['data']
  }
});

// Python Skill
const pythonSkill = defineSkill({
  id: 'data-analysis',
  name: 'Data Analysis',
  description: 'Analyze data using Python',
  script: {
    lang: 'python',
    code: `
      import json
      
      def main():
          data = json.loads($input.json_data)
          result = sum(data) / len(data)
          return {"average": result}
    `,
    dependencies: {
      'pandas': '^2.0.0'
    }
  }
});
```

## Skill 注入 API

在 Skill Script 中，可以通过 `$` 前缀访问 Agent 能力：

### $input

访问输入参数。

```typescript
const data = $input.data;
const options = $input.options ?? {};
```

### $llm

调用 LLM 进行推理。

```typescript
// 简单调用
const response = await $llm('Hello, how are you?');

// 带选项
const response = await $llm('Explain TypeScript', {
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 1000,
  systemPrompt: 'You are a helpful assistant'
});
```

### $tool

调用 Tool。

```typescript
// 调用 Tool
const result = await $tool('file-read', { path: './data.txt' });

// 使用结果
const content = result.content;
```

### $skill

调用其他 Skill。

```typescript
const result = await $skill('math-calc', { expression: '2+2' });
```

### $memory

操作记忆系统。

```typescript
// 存储
await $memory.set('key', value);
await $memory.set('user', { name: 'Alice', preferences: ['TS'] });

// 检索
const value = await $memory.get('key');

// 搜索
const results = await $memory.search('programming', 5);

// 删除
await $memory.delete('key');

// 清空
await $memory.clear();
```

### $references

访问引用文件。

```typescript
// 读取引用文件
const template = $references.template;
const config = $references['config.json'];

// 使用模板
const output = template.replace('{{name}}', $input.name);
```

### $ref

引用文件访问函数。

```typescript
const template = $ref('template');
```

### $log

日志记录。

```typescript
$log.debug('Debug message', { data });
$log.info('Processing...');
$log.warn('Warning: something might be wrong');
$log.error('Error occurred', error);
```

### $context

访问执行上下文。

```typescript
const executionId = $context.executionId;
const agentId = $context.agentId;
const sessionId = $context.sessionId;
```

## SkillRegistry

Skill 注册表，管理所有 Skill。

### 接口

```typescript
interface SkillRegistry {
  /** 注册 Skill */
  register(skill: Skill): void;
  
  /** 取消注册 */
  unregister(skillId: string): void;
  
  /** 获取 Skill */
  get(skillId: string): Skill | undefined;
  
  /** 根据名称获取 */
  getByName(name: string): Skill | undefined;
  
  /** 列出所有 */
  list(): Skill[];
  
  /** 搜索 */
  search(query: string): Skill[];
  
  /** 清空 */
  clear(): void;
}
```

### 示例

```typescript
// 注册 Skill
agent.skills.register(greetingSkill);

// 检查是否存在
if (agent.skills.has('greeting')) {
  console.log('Skill exists');
}

// 获取 Skill
const skill = agent.skills.get('greeting');

// 根据名称获取
const skillByName = agent.skills.getByName('Greeting');

// 列出所有 Skills
const skills = agent.skills.list();
skills.forEach(skill => {
  console.log(`${skill.id}: ${skill.name}`);
});

// 搜索
const results = agent.skills.search('data');

// 注销 Skill
agent.skills.unregister('greeting');

// 清空所有
agent.skills.clear();
```

## SkillExecutor

Skill 执行器接口。

```typescript
interface SkillExecutor {
  /**
   * 执行 Skill
   */
  execute(
    skill: Skill, 
    input: unknown, 
    context: SkillExecutionContext
  ): Promise<SkillResult>;
  
  /**
   * 验证 Skill
   */
  validate(skill: Skill): ValidationResult;
  
  /**
   * 中止执行
   */
  abort(executionId: string): void;
}

interface SkillExecutionContext {
  /** 执行 ID */
  executionId: string;
  
  /** Agent ID */
  agentId: string;
  
  /** 会话 ID */
  sessionId?: string;
  
  /** 父执行 ID（用于嵌套调用） */
  parentExecutionId?: string;
  
  /** 输入数据 */
  input: unknown;
  
  /** 引用文件映射 */
  references: Record<string, string>;
  
  /** 日志 */
  logger: SkillLogger;
  
  /** 中止信号 */
  signal?: AbortSignal;
  
  /** 开始时间 */
  startedAt: Date;
}

interface SkillResult {
  success: boolean;
  data?: unknown;
  error?: SkillError;
  metadata?: SkillExecutionMeta;
}

interface SkillError {
  message: string;
  code?: string;
  skillId: string;
  stack?: string;
}

interface SkillExecutionMeta {
  executionId: string;
  skillId: string;
  skillName: string;
  startTime: number;
  endTime: number;
  duration: number;
  resources?: {
    memory?: number;
    cpu?: number;
  };
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
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

interface SkillEvent<T = unknown> {
  type: SkillEventType;
  timestamp: number;
  payload: T;
  skillId: string;
  executionId?: string;
}
```

## 多语言支持

### JavaScript

```typescript
const jsSkill = defineSkill({
  id: 'js-skill',
  script: {
    lang: 'javascript',
    code: `
      async function main() {
        const result = await fetch($input.url);
        return result.json();
      }
    `
  }
});
```

### TypeScript

```typescript
const tsSkill = defineSkill({
  id: 'ts-skill',
  script: {
    lang: 'typescript',
    code: `
      interface Input {
        value: number;
      }
      
      async function main(): Promise<number> {
        const input = $input as Input;
        return input.value * 2;
      }
    `
  }
});
```

### Python

```typescript
const pythonSkill = defineSkill({
  id: 'python-skill',
  script: {
    lang: 'python',
    code: `
      import json
      
      def main():
          data = json.loads($input.json_data)
          return {"processed": len(data)}
    `,
    dependencies: {
      'pandas': '^2.0.0'
    }
  }
});
```

### Bash

```typescript
const bashSkill = defineSkill({
  id: 'bash-skill',
  script: {
    lang: 'bash',
    code: `
      #!/bin/bash
      echo "Processing..."
      ls -la $input.directory
    `
  }
});
```

## 最佳实践

1. **明确的输入输出 Schema** - 定义清晰的 input/output Schema
2. **合理的超时设置** - 根据操作复杂度设置 timeout
3. **错误处理** - 在 Skill 中使用 try-catch
4. **日志记录** - 使用 `$log` 记录关键步骤
5. **版本管理** - 为 Skill 设置 version
6. **引用文件** - 将模板、配置分离到 references
