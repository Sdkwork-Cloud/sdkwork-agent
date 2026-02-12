# TUI 终端界面

SDKWork Browser Agent 提供专业级的终端用户界面（TUI），支持多提供者、多模型、主题切换、会话管理等丰富功能。

## 功能特性

### 核心功能

- **多 LLM 提供者支持** - OpenAI, Anthropic, Google, Moonshot, MiniMax, Zhipu, Qwen, DeepSeek, Doubao
- **65+ 模型选择** - 覆盖主流大语言模型
- **多种主题** - 内置多种精美主题
- **会话管理** - 保存、加载、删除会话
- **自动补全** - 命令和历史记录补全
- **Markdown 渲染** - 支持代码高亮和格式化
- **流式输出** - 实时显示 AI 响应
- **多行输入** - 支持 Shift+Enter 换行

## 启动 TUI

### 方式 1：直接导入

```typescript
import { main } from '@sdkwork/browser-agent/tui';

main();
```

### 方式 2：命令行

```bash
npx @sdkwork/browser-agent
```

## 界面说明

### 主界面

```
┌─────────────────────────────────────────────────────────────┐
│  SDKWork Browser Agent CLI v3.0.0                           │
│  Provider: OpenAI | Model: gpt-4 | Theme: default           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🤖 Assistant                                               │
│  Hello! How can I help you today?                          │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  👤 You                                                     │
│  Tell me a joke                                            │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  🤖 Assistant                                               │
│  Here's a joke for you:                                    │
│                                                             │
│  Why don't scientists trust atoms?                         │
│  Because they make up everything!                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  > _                                                        │
│  [Ctrl+H: Help] [Ctrl+T: Theme] [Ctrl+S: Session]          │
└─────────────────────────────────────────────────────────────┘
```

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+H` | 显示帮助 |
| `Ctrl+T` | 切换主题 |
| `Ctrl+S` | 会话管理 |
| `Ctrl+L` | 清屏 |
| `Ctrl+C` | 退出 |
| `Ctrl+U` | 清除当前行 |
| `Ctrl+A` | 移动到行首 |
| `Ctrl+E` | 移动到行尾 |
| `Tab` | 自动补全 |
| `↑/↓` | 历史记录 |
| `Shift+Enter` | 换行 |

## 配置向导

首次启动时会自动进入配置向导：

```
🚀 Welcome to SDKWork Browser Agent CLI!

Step 1: Choose LLM Provider
  [1] OpenAI
  [2] Anthropic
  [3] Google
  [4] Moonshot
  [5] MiniMax
  [6] Zhipu
  [7] Qwen
  [8] DeepSeek
  [9] Doubao

Step 2: Enter API Key
  > sk-...

Step 3: Select Model
  [1] gpt-4
  [2] gpt-4-turbo
  [3] gpt-3.5-turbo
  ...

Step 4: Choose Theme
  [1] default
  [2] ocean
  [3] sunset
  ...

✅ Configuration saved!
```

## 主题系统

### 内置主题

```typescript
import { THEMES, DEFAULT_THEME } from '@sdkwork/browser-agent/tui';

console.log('Available themes:', Object.keys(THEMES));
```

### 切换主题

```
按 Ctrl+T 打开主题选择器

┌─────────────────────────────────────┐
│  🎨 Select Theme                    │
│                                     │
│  [1] default                        │
│  [2] ocean                          │
│  [3] sunset                         │
│  [4] forest                         │
│  ...                                │
│                                     │
│  Current: default                   │
└─────────────────────────────────────┘
```

## 会话管理

### 保存会话

```
按 Ctrl+S 打开会话管理器

┌─────────────────────────────────────┐
│  💾 Session Manager                 │
│                                     │
│  [1] 📄 New Session                 │
│  [2] 💾 Save Current                │
│  [3] 📂 Load Session                │
│  [4] 🗑️  Delete Session              │
│  [5] 📋 List Sessions               │
│                                     │
│  Current: session-2024-01-15        │
└─────────────────────────────────────┘
```

### 会话文件

会话保存在 `~/.sdkwork/sessions/` 目录：

```
~/.sdkwork/
├── config.json           # 用户配置
├── sessions/
│   ├── session-2024-01-15-001.json
│   ├── session-2024-01-15-002.json
│   └── ...
└── themes/
    └── custom-theme.json
```

## 渲染器

### TUIRenderer

提供基本的终端渲染功能：

```typescript
import { TUIRenderer, createRenderer, DEFAULT_THEME } from '@sdkwork/browser-agent/tui';

const renderer = createRenderer({ theme: DEFAULT_THEME });

renderer.renderTitle('SDKWork Browser Agent');

renderer.renderMessage('Hello!', 'assistant');
renderer.renderMessage('Hi!', 'user');

renderer.renderCodeBlock(`const x = 1;`, 'typescript');

const spinner = renderer.renderSpinner('Thinking...');
spinner.stop();
```

### LoadingIndicator

加载动画指示器：

```typescript
import { LoadingIndicator } from '@sdkwork/browser-agent/tui';

const indicator = new LoadingIndicator({
  text: 'Loading...',
  color: 'cyan'
});

indicator.start();
await doSomething();
indicator.stop();
```

### ProgressBar

进度条组件：

```typescript
import { ProgressBar } from '@sdkwork/browser-agent/tui';

const progress = new ProgressBar({
  total: 100,
  width: 40,
  showEta: true
});

for (let i = 0; i <= 100; i++) {
  progress.update(i);
  await doWork();
}

progress.complete();
```

### ThinkingDisplay

思考过程显示：

```typescript
import { ThinkingDisplay } from '@sdkwork/browser-agent/tui';

const thinking = new ThinkingDisplay();

thinking.start('Analyzing...');
thinking.addThought('First, I need to understand the problem...');
thinking.addThought('Then, I will break it down into steps...');
thinking.stop();
```

## 流式输出

### StreamRenderer

流式输出渲染器：

```typescript
import { StreamRenderer, createStreamRenderer } from '@sdkwork/browser-agent/tui';

const streamRenderer = createStreamRenderer({
  prefix: '> ',
  color: 'green'
});

for await (const chunk of llmStream) {
  streamRenderer.write(chunk.content);
}

streamRenderer.end();
```

## 多行输入

支持复杂的输入场景：

```typescript
import { MultilineInput, readMultiline } from '@sdkwork/browser-agent/tui';

const text = await readMultiline({
  placeholder: 'Enter your message... (Shift+Enter for new line)',
  maxLines: 10
});

console.log('Input:', text);
```

## Markdown 渲染

支持完整的 Markdown 语法：

```typescript
import { MarkdownRenderer, renderMarkdown, printMarkdown } from '@sdkwork/browser-agent/tui';

const markdown = `
# Heading 1
## Heading 2

**Bold text** and *italic text*

- List item 1
- List item 2

\`\`\`typescript
const x = 1;
console.log(x);
\`\`\`

> Quote block
`;

printMarkdown(markdown);
```

## 交互式选择器

### 单选选择器

```typescript
import { select, confirm, prompt } from '@sdkwork/browser-agent/tui';

const answer = await select({
  message: 'Choose a model:',
  options: [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5', label: 'GPT-3.5' },
  ]
});

const confirmed = await confirm({
  message: 'Are you sure?',
  default: false
});

const name = await prompt({
  message: 'Enter your name:',
  default: 'Guest'
});
```

### 多选选择器

```typescript
import { InteractiveSelector, MultiSelector } from '@sdkwork/browser-agent/tui';

const multiSelect = new MultiSelector({
  message: 'Select features:',
  options: [
    { value: 'streaming', label: 'Streaming Output' },
    { value: 'memory', label: 'Memory System' },
    { value: 'tools', label: 'Tool Support' },
  ]
});

const selected = await multiSelect.run();
```

## 自定义 TUI

### 创建自定义界面

```typescript
import { TUIRenderer, createRenderer, THEMES } from '@sdkwork/browser-agent/tui';
import { main as cliMain } from '@sdkwork/browser-agent/tui';

async function customTUI() {
  const renderer = createRenderer({
    theme: THEMES.cyberpunk || THEMES.default
  });
  
  renderer.renderBox({
    title: 'My Custom Agent',
    content: 'Welcome to my custom TUI!',
    style: 'double'
  });
  
  await cliMain();
}

customTUI();
```

### 自定义主题

```typescript
import type { Theme } from '@sdkwork/browser-agent/tui';

const myTheme: Theme = {
  name: 'my-theme',
  colors: {
    primary: '#646cff',
    secondary: '#bd34fe',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
    background: '#1a1a1a',
    surface: '#242424',
    text: '#ffffff',
    textMuted: '#9ca3af'
  }
};
```

## 最佳实践

### 1. 选择合适的组件

```typescript
import { TUIRenderer } from '@sdkwork/browser-agent/tui';

const renderer = new TUIRenderer({ theme: myTheme });
```

### 2. 处理长时间运行任务

```typescript
import { ProgressBar } from '@sdkwork/browser-agent/tui';

const progress = new ProgressBar({ total: 100 });

for (let i = 0; i <= 100; i++) {
  await doWork();
  progress.update(i);
}

progress.complete();
```

### 3. 优雅处理错误

```typescript
import { TUIRenderer } from '@sdkwork/browser-agent/tui';

const renderer = new TUIRenderer();

try {
  await agent.chat({ messages });
} catch (error) {
  renderer.renderError(`Error: ${(error as Error).message}`);
}
```

## 相关文档

- [快速开始](./quick-start.md) - 5 分钟上手
- [API 参考](../api/agent.md) - Agent API
- [架构设计](../architecture/overview.md) - 技术架构
