#!/usr/bin/env node
/**
 * SDKWork CLI Entry Point
 *
 * 命令: sdkwork
 * 直接进入交互式 TUI 界面与 Agent 对话
 * 
 * 增强版 CLI 功能：
 * - 智能补全 (Tab键)
 * - 历史导航 (↑/↓键)
 * - 多主题支持 (/theme)
 * - 会话管理 (/session)
 * - 模型切换 (/model)
 * - 5种加载动画样式
 * - 渐变文字效果
 * 
 * @version 3.0.0
 */

import { main } from '../dist/tui/cli.js';

main().catch((error) => {
  console.error('Failed to start SDKWork:', error);
  process.exit(1);
});
