/**
 * TUI Module - Terminal User Interface
 * 
 * 专业级终端交互界面组件库
 * 参考 Claude Code、Codex CLI、OpenCode 等顶级 AI CLI 工具设计
 * 
 * @module TUI
 * @version 2.0.0
 */

// 核心渲染器
export {
  TUIRenderer,
  LoadingIndicator,
  createRenderer,
  DEFAULT_THEME,
} from './renderer.js';
export type { Theme } from './renderer.js';

// Markdown 渲染器
export {
  MarkdownRenderer,
  renderMarkdown,
  printMarkdown,
} from './markdown-renderer.js';

// 流式输出渲染器
export {
  StreamRenderer,
  createStreamRenderer,
  streamOutput,
} from './stream-renderer.js';
export type { StreamOptions } from './stream-renderer.js';

// 多行输入
export {
  MultilineInput,
  readMultiline,
} from './multiline-input.js';
export type { MultilineOptions } from './multiline-input.js';

// CLI 主入口
export { main } from './cli';
