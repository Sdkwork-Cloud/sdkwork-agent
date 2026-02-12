# TUI 终端界面

SDKWork Agent 提供专业级的终端用户界面（TUI），支持多提供者、多模型、主题切换、会话管理等丰富功能。

## 功能特性

### 核心功能

- **多 LLM 提供者支持** - OpenAI, Anthropic, Google, Moonshot, MiniMax, Zhipu, Qwen, DeepSeek, Doubao
- **65+ 模型选择** - 覆盖主流大语言模型
- **9 种主题** - default, ocean, sunset, forest, dark, neon, monochrome, cyberpunk, nord
- **会话管理** - 保存、加载、删除会话
- **自动补全** - 命令和历史记录补全
- **Markdown 渲染** - 支持代码高亮和格式化
- **流式输出** - 实时显示 AI 响应
- **多行输入** - 支持 Shift+Enter 换行

## 启动 TUI

### 方式 1：直接导入

```typescript
import { main } from '@sdkwork/agent/tui/cli';

// 启动交互式 TUI
main();
```

### 方式 2：命令行

```bash
# 安装后运行
npx @sdkwork/agent

# 或
node -e "require('@sdkwork/agent/tui/cli').main()"
```

## 界面说明

### 主界面

```
┌─────────────────────────────────────────────────────────────┐
│  SDKWork Agent CLI v3.0.0                                   │
│  Provider: OpenAI | Model: gpt-4 | Theme: ocean             │
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
🚀 Welcome to SDKWork Agent CLI!

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
// 9 种精美主题
const themes = {
  default:  '默认主题 - 蓝紫渐变',
  ocean:    '海洋主题 - 深蓝配色',
  sunset:   '日落主题 - 橙红渐变',
  forest:   '森林主题 - 绿色系',
  dark:     '暗黑主题 - 纯黑背景',
  neon:     '霓虹主题 - 高对比度',
  monochrome: '单色主题 - 黑白配',
  cyberpunk: '赛博朋克 - 紫青配色',
  nord:     'Nord 主题 - 极地配色'
};
```

### 切换主题

```
按 Ctrl+T 打开主题选择器

┌─────────────────────────────────────┐
│  🎨 Select Theme                    │
│                                     │
│  [1] default    [6] neon           │
│  [2] ocean      [7] monochrome     │
│  [3] sunset     [8] cyberpunk      │
│  [4] forest     [9] nord           │
│  [5] dark                           │
│                                     │
│  Current: ocean                     │
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

### 基础渲染器

提供基本的终端渲染功能：

```typescript
import { TUIRenderer } from '@sdkwork/agent/tui/renderer';

const renderer = new TUIRenderer();

// 渲染标题
renderer.renderTitle('SDKWork Agent');

// 渲染消息气泡
renderer.renderMessage('Hello!', 'assistant');
renderer.renderMessage('Hi!', 'user');

// 渲染代码块
renderer.renderCodeBlock(`const x = 1;`, 'typescript');

// 渲染加载动画
const spinner = renderer.renderSpinner('Thinking...');
spinner.stop();
```

### 增强渲染器

提供更多视觉效果：

```typescript
import { EnhancedTUIRenderer } from '@sdkwork/agent/tui/renderer-enhanced';

const renderer = new EnhancedTUIRenderer({ theme: 'ocean' });

// 5 种加载动画样式
renderer.renderSpinner('Loading...', { style: 'dots' });
renderer.renderSpinner('Loading...', { style: 'line' });
renderer.renderSpinner('Loading...', { style: 'arrow' });
renderer.renderSpinner('Loading...', { style: 'bounce' });
renderer.renderSpinner('Loading...', { style: 'pulse' });

// 进度条
renderer.renderProgressBar(50, 100, { showEta: true });

// 通知
renderer.renderNotification('Success!', 'success');
renderer.renderNotification('Warning!', 'warning');
renderer.renderNotification('Error!', 'error');
renderer.renderNotification('Info', 'info');
```

### 完美级渲染器

最高质量的渲染效果：

```typescript
import { PerfectTUIRenderer } from '@sdkwork/agent/tui/renderer-perfect';

const renderer = new PerfectTUIRenderer({ theme: 'cyberpunk' });

// 8 种加载动画
renderer.renderSpinner('Loading...', { style: 'star' });
renderer.renderSpinner('Loading...', { style: 'moon' });
renderer.renderSpinner('Loading...', { style: 'earth' });

// 流式输出（打字机效果）
const stream = renderer.createStreamRenderer();
for await (const chunk of llmStream) {
  stream.write(chunk.content);
}

// 渐变文字
renderer.renderGradientText('SDKWork Agent', {
  colors: ['#646cff', '#bd34fe']
});
```

## 多行输入

支持复杂的输入场景：

```typescript
import { MultilineInput } from '@sdkwork/agent/tui/multiline-input';

const input = new MultilineInput({
  placeholder: 'Enter your message... (Shift+Enter for new line)',
  maxLines: 10
});

const text = await input.read();
console.log('Input:', text);
```

## Markdown 渲染

支持完整的 Markdown 语法：

```typescript
import { MarkdownRenderer } from '@sdkwork/agent/tui/markdown-renderer';

const renderer = new MarkdownRenderer();

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

renderer.render(markdown);
```

## 自定义 TUI

### 创建自定义界面

```typescript
import { EnhancedTUIRenderer } from '@sdkwork/agent/tui/renderer-enhanced';
import { main as cliMain } from '@sdkwork/agent/tui/cli';

// 使用自定义配置启动
async function customTUI() {
  const renderer = new EnhancedTUIRenderer({
    theme: 'cyberpunk',
    animations: true
  });
  
  // 自定义欢迎界面
  renderer.renderBox({
    title: 'My Custom Agent',
    content: 'Welcome to my custom TUI!',
    style: 'double'
  });
  
  // 启动标准 CLI
  await cliMain();
}

customTUI();
```

### 自定义主题

```typescript
// 创建自定义主题
const myTheme = {
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

// 保存主题
await fs.writeFile(
  '~/.sdkwork/themes/my-theme.json',
  JSON.stringify(myTheme, null, 2)
);
```

## 最佳实践

### 1. 选择合适的渲染器

```typescript
// 简单场景 - 基础渲染器
import { TUIRenderer } from '@sdkwork/agent/tui/renderer';

// 复杂场景 - 增强渲染器
import { EnhancedTUIRenderer } from '@sdkwork/agent/tui/renderer-enhanced';

// 高端场景 - 完美级渲染器
import { PerfectTUIRenderer } from '@sdkwork/agent/tui/renderer-perfect';
```

### 2. 处理长时间运行任务

```typescript
const renderer = new EnhancedTUIRenderer();

// 显示进度
const progress = renderer.renderProgressBar(0, 100);

for (let i = 0; i <= 100; i++) {
  await doWork();
  progress.update(i);
}

progress.complete();
```

### 3. 优雅处理错误

```typescript
try {
  await agent.chat({ messages });
} catch (error) {
  renderer.renderNotification(
    `Error: ${error.message}`,
    'error'
  );
}
```

## 相关文档

- [快速开始](./quick-start.md) - 5 分钟上手
- [API 参考](../api/agent.md) - Agent API
- [架构设计](../architecture/overview.md) - 技术架构
