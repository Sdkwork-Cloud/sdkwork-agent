# 高级示例

本文档展示 SDKWork Agent 的高级使用场景和最佳实践。

## RAG 知识库问答

构建一个基于文档的问答系统：

```typescript
import { createAgent, defineSkill } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';
import { readFile } from 'fs/promises';
import { glob } from 'glob';

async function createRAGAgent() {
  const agent = createAgent({
    name: 'RAGAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    }),
    memory: {
      maxTokens: 32000,
      embeddingModel: 'text-embedding-3-small'
    }
  });

  await agent.initialize();

  // 加载文档到知识库
  async function loadDocuments(docsPath: string) {
    const files = await glob('**/*.md', { cwd: docsPath });
    
    for (const file of files) {
      const content = await readFile(`${docsPath}/${file}`, 'utf-8');
      
      // 将文档分块存储
      const chunks = content.split('\n\n').filter(chunk => chunk.length > 100);
      
      for (let i = 0; i < chunks.length; i++) {
        await agent.memory.store({
          id: `doc-${file}-${i}`,
          content: chunks[i],
          type: 'semantic',
          source: 'document',
          timestamp: Date.now(),
          metadata: {
            sourcePath: file,
            chunkIndex: i,
            category: 'documentation'
          }
        });
      }
    }
    
    console.log(`Loaded ${files.length} documents`);
  }

  // 问答 Skill
  const ragSkill = defineSkill({
    id: 'rag-qa',
    name: 'RAG QA',
    description: 'Answer questions based on knowledge base',
    script: {
      lang: 'typescript',
      code: `
        async function main() {
          const question = $input.question;
          
          // 1. 检索相关文档
          const relevantDocs = await $memory.search({
            content: question,
            type: 'semantic',
            limit: 5
          });
          
          // 2. 构建上下文
          const context = relevantDocs
            .map(r => r.memory.content)
            .join('\n\n');
          
          // 3. 使用 LLM 生成答案
          const response = await $llm(question, {
            systemPrompt: \`基于以下文档回答问题。如果文档中没有相关信息，请说明。

文档内容：
\${context}\`
          });
          
          return {
            answer: response,
            sources: relevantDocs.map(r => ({
              path: r.memory.metadata?.sourcePath,
              score: r.score
            }))
          };
        }
      `
    }
  });

  agent.skills.register(ragSkill);

  return { agent, loadDocuments };
}

// 使用
async function main() {
  const { agent, loadDocuments } = await createRAGAgent();
  
  // 加载文档
  await loadDocuments('./docs');
  
  // 提问
  const result = await agent.executeSkill('rag-qa', JSON.stringify({
    question: '什么是 DDD 分层架构？'
  }));
  
  console.log('Answer:', result.data.answer);
  console.log('Sources:', result.data.sources);
  
  await agent.destroy();
}

main().catch(console.error);
```

## 多 Agent 协作系统

创建多个 Agent 协作完成复杂任务：

```typescript
import { createAgent } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

// 创建专业 Agent
async function createSpecializedAgents() {
  // 研究 Agent
  const researcher = createAgent({
    name: 'Researcher',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    })
  });

  // 写作 Agent
  const writer = createAgent({
    name: 'Writer',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    })
  });

  // 编辑 Agent
  const editor = createAgent({
    name: 'Editor',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    })
  });

  await Promise.all([
    researcher.initialize(),
    writer.initialize(),
    editor.initialize()
  ]);

  return { researcher, writer, editor };
}

// 协作工作流
async function collaborativeWriting(topic: string) {
  const { researcher, writer, editor } = await createSpecializedAgents();

  try {
    // 步骤1: 研究
    console.log('🔍 Researching...');
    const researchResult = await researcher.chat({
      messages: [{
        role: 'user',
        content: `Research the topic "${topic}" and provide key points, facts, and outline.`
      }]
    });
    const research = researchResult.choices[0].message.content;

    // 步骤2: 写作
    console.log('✍️ Writing...');
    const writingResult = await writer.chat({
      messages: [{
        role: 'user',
        content: `Write an article about "${topic}" based on this research:\n\n${research}`
      }]
    });
    const draft = writingResult.choices[0].message.content;

    // 步骤3: 编辑
    console.log('📝 Editing...');
    const editingResult = await editor.chat({
      messages: [{
        role: 'user',
        content: `Edit and improve this article:\n\n${draft}`
      }]
    });
    const finalArticle = editingResult.choices[0].message.content;

    return {
      research,
      draft,
      finalArticle
    };

  } finally {
    await Promise.all([
      researcher.destroy(),
      writer.destroy(),
      editor.destroy()
    ]);
  }
}

// 使用
collaborativeWriting('人工智能的未来发展')
  .then(result => {
    console.log('\n=== Final Article ===');
    console.log(result.finalArticle);
  })
  .catch(console.error);
```

## 自动化工作流

创建一个自动化的数据处理工作流：

```typescript
import { createAgent, defineSkill, defineTool } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function createWorkflowAgent() {
  const agent = createAgent({
    name: 'WorkflowAgent',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    })
  });

  await agent.initialize();

  // 数据提取 Tool
  agent.tools.register(defineTool({
    id: 'extract-data',
    name: 'Extract Data',
    category: 'data',
    confirm: 'none',
    input: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        schema: { type: 'object' }
      }
    },
    execute: async (input, context) => {
      // 使用 LLM 提取结构化数据
      const response = await agent.chat({
        messages: [{
          role: 'user',
          content: `Extract data from this text according to the schema:\n\nText: ${input.text}\n\nSchema: ${JSON.stringify(input.schema)}`
        }]
      });

      try {
        const data = JSON.parse(response.choices[0].message.content);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: { message: 'Failed to parse extracted data' } };
      }
    }
  }));

  // 数据处理 Skill
  const processDataSkill = defineSkill({
    id: 'process-data-pipeline',
    name: 'Process Data Pipeline',
    script: {
      lang: 'typescript',
      code: `
        async function main() {
          const { inputFile, processingSteps } = $input;
          
          // 1. 读取数据
          const rawData = await $tool('file-read', { path: inputFile });
          
          // 2. 提取结构化数据
          const extracted = await $tool('extract-data', {
            text: rawData.content,
            schema: processingSteps.extractSchema
          });
          
          // 3. 转换数据
          let transformed = extracted.data;
          for (const step of processingSteps.transformations || []) {
            transformed = await applyTransformation(transformed, step);
          }
          
          // 4. 验证数据
          const validation = await validateData(transformed, processingSteps.validationRules);
          
          // 5. 保存结果
          await $tool('file-write', {
            path: processingSteps.outputFile,
            content: JSON.stringify(transformed, null, 2)
          });
          
          return {
            inputRecords: extracted.data.length,
            outputRecords: transformed.length,
            validationErrors: validation.errors,
            outputFile: processingSteps.outputFile
          };
        }
        
        async function applyTransformation(data, step) {
          // 应用转换逻辑
          return data.map(item => {
            const result = { ...item };
            if (step.type === 'map') {
              result[step.field] = eval(step.expression);
            }
            return result;
          });
        }
        
        async function validateData(data, rules) {
          const errors = [];
          for (const item of data) {
            for (const rule of rules) {
              if (!eval(rule.condition)) {
                errors.push({ item, rule: rule.name });
              }
            }
          }
          return { valid: errors.length === 0, errors };
        }
      `
    }
  });

  agent.skills.register(processDataSkill);

  return agent;
}

// 使用工作流
async function runWorkflow() {
  const agent = await createWorkflowAgent();

  const result = await agent.executeSkill('process-data-pipeline', JSON.stringify({
    inputFile: './raw-data.csv',
    processingSteps: {
      extractSchema: {
        name: 'string',
        email: 'string',
        age: 'number'
      },
      transformations: [
        { type: 'map', field: 'age', expression: 'item.age * 1' }
      ],
      validationRules: [
        { name: 'valid-email', condition: 'item.email.includes("@")' },
        { name: 'positive-age', condition: 'item.age > 0' }
      ],
      outputFile: './processed-data.json'
    }
  }));

  console.log('Workflow result:', result.data);

  await agent.destroy();
}

runWorkflow().catch(console.error);
```

## 智能客服系统

构建一个带有记忆功能的智能客服：

```typescript
import { createAgent, defineSkill } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';

async function createCustomerServiceAgent() {
  const agent = createAgent({
    name: 'CustomerService',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    }),
    memory: {
      maxTokens: 16000,
      limit: 5000
    }
  });

  await agent.initialize();

  // 意图识别 Skill
  const intentSkill = defineSkill({
    id: 'intent-recognition',
    name: 'Intent Recognition',
    script: {
      lang: 'typescript',
      code: `
        async function main() {
          const message = $input.message;
          
          const response = await $llm(message, {
            systemPrompt: \`分析用户消息意图，返回 JSON 格式：
{
  "intent": "query|complaint|purchase|support|other",
  "category": "具体分类",
  "urgency": "high|medium|low",
  "entities": ["提取的实体"],
  "sentiment": "positive|neutral|negative"
}\`
          });
          
          return JSON.parse(response);
        }
      `
    }
  });

  // 回复生成 Skill
  const responseSkill = defineSkill({
    id: 'generate-response',
    name: 'Generate Response',
    script: {
      lang: 'typescript',
      code: `
        async function main() {
          const { message, intent, userId, conversationHistory } = $input;
          
          // 检索用户历史
          const userHistory = await $memory.search({
            content: userId,
            limit: 5
          });
          
          // 检索知识库
          const knowledge = await $memory.search({
            content: message,
            type: 'semantic',
            limit: 3
          });
          
          const response = await $llm(message, {
            systemPrompt: \`你是智能客服助手。

用户意图：\${intent.intent}
紧急程度：\${intent.urgency}
用户情绪：\${intent.sentiment}

历史对话：
\${conversationHistory.map(h => h.role + ': ' + h.content).join('\\n')}

相关知识：
\${knowledge.map(k => k.memory.content).join('\\n')}

请提供有帮助、专业的回复。\`
          });
          
          // 存储对话
          await $memory.set(\`conv-\${Date.now()}\`, {
            userId,
            message,
            response,
            intent,
            timestamp: Date.now()
          });
          
          return {
            response,
            intent,
            shouldEscalate: intent.urgency === 'high' || intent.sentiment === 'negative'
          };
        }
      `
    }
  });

  agent.skills.register(intentSkill);
  agent.skills.register(responseSkill);

  // 处理用户消息
  async function handleMessage(userId: string, message: string) {
    // 1. 识别意图
    const intentResult = await agent.executeSkill('intent-recognition', JSON.stringify({
      message
    }));

    // 2. 生成回复
    const session = agent.getSession(userId) || [];
    const responseResult = await agent.executeSkill('generate-response', JSON.stringify({
      message,
      intent: intentResult.data,
      userId,
      conversationHistory: session.slice(-5)
    }));

    return responseResult.data;
  }

  return { agent, handleMessage };
}

// 使用
async function main() {
  const { agent, handleMessage } = await createCustomerServiceAgent();

  // 模拟对话
  const userId = 'user-123';
  
  const messages = [
    '你好，我想了解一下你们的产品',
    '价格是多少？',
    '有点贵，有优惠吗？'
  ];

  for (const message of messages) {
    console.log(`User: ${message}`);
    const result = await handleMessage(userId, message);
    console.log(`Assistant: ${result.response}`);
    console.log(`Intent: ${result.intent.intent}, Urgency: ${result.intent.urgency}\n`);
  }

  await agent.destroy();
}

main().catch(console.error);
```

## 代码审查助手

创建一个自动代码审查工具：

```typescript
import { createAgent, defineSkill } from 'sdkwork-agent';
import { OpenAIProvider } from 'sdkwork-agent/llm';
import { readFile } from 'fs/promises';

async function createCodeReviewAgent() {
  const agent = createAgent({
    name: 'CodeReviewer',
    llm: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    })
  });

  await agent.initialize();

  const reviewSkill = defineSkill({
    id: 'code-review',
    name: 'Code Review',
    script: {
      lang: 'typescript',
      code: `
        async function main() {
          const { code, language, filePath } = $input;
          
          const review = await $llm(code, {
            systemPrompt: \`你是一个资深代码审查专家。请对代码进行全面审查，包括：

1. 代码质量（可读性、可维护性）
2. 潜在 Bug
3. 性能问题
4. 安全问题
5. 最佳实践遵循情况
6. 类型安全（TypeScript）

请以 JSON 格式返回：
{
  "summary": "总体评价",
  "issues": [
    {
      "severity": "error|warning|info",
      "category": "bug|performance|security|style",
      "line": 行号,
      "message": "问题描述",
      "suggestion": "改进建议"
    }
  ],
  "score": 0-100
}\`
          });
          
          return JSON.parse(review);
        }
      `
    }
  });

  agent.skills.register(reviewSkill);

  async function reviewFile(filePath: string) {
    const code = await readFile(filePath, 'utf-8');
    const language = filePath.endsWith('.ts') ? 'typescript' : 'javascript';
    
    const result = await agent.executeSkill('code-review', JSON.stringify({
      code,
      language,
      filePath
    }));

    return result.data;
  }

  return { agent, reviewFile };
}

// 使用
async function main() {
  const { agent, reviewFile } = await createCodeReviewAgent();

  const review = await reviewFile('./src/example.ts');
  
  console.log('Code Review Report');
  console.log('==================');
  console.log(`Score: ${review.score}/100`);
  console.log(`Summary: ${review.summary}\n`);
  
  if (review.issues.length > 0) {
    console.log('Issues:');
    review.issues.forEach((issue: any) => {
      console.log(`[${issue.severity.toUpperCase()}] Line ${issue.line}: ${issue.message}`);
      console.log(`  Suggestion: ${issue.suggestion}\n`);
    });
  }

  await agent.destroy();
}

main().catch(console.error);
```

## 最佳实践总结

1. **错误处理** - 始终使用 try-catch 和错误事件
2. **资源管理** - 确保调用 agent.destroy() 释放资源
3. **会话管理** - 使用 sessionId 维护对话上下文
4. **记忆优化** - 合理设置 maxTokens 和 limit
5. **流式输出** - 对于长回复使用 chatStream
6. **事件监听** - 利用事件系统实现可观测性
7. **Skill 复用** - 将通用逻辑封装为 Skill
8. **Tool 分类** - 使用合适的 confirm 级别
