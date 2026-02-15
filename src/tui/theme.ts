/**
 * TUI Theme System - 专业级主题系统
 *
 * 参考 OpenClaw、OpenCode、Codex CLI 等顶级工具的设计
 * 融合行业最佳实践的颜色方案
 *
 * @module TUI
 * @version 6.0.0
 */

import chalk from 'chalk';
import { highlight, supportsLanguage } from 'cli-highlight';

// ============================================
// 专业调色板 - 参考 OpenClaw 设计
// ============================================

export interface Palette {
  name: string;
  text: string;
  dim: string;
  accent: string;
  accentSoft: string;
  border: string;
  userBg: string;
  userText: string;
  assistantBg: string;
  assistantText: string;
  systemText: string;
  toolPendingBg: string;
  toolSuccessBg: string;
  toolErrorBg: string;
  toolTitle: string;
  toolOutput: string;
  quote: string;
  quoteBorder: string;
  code: string;
  codeBlock: string;
  codeBorder: string;
  link: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

export const PALETTES: Record<string, Palette> = {
  techblue: {
    name: 'TechBlue',
    text: '#E0E8FF',
    dim: '#64748B',
    accent: '#60A5FA',
    accentSoft: '#93C5FD',
    border: '#334155',
    userBg: '#1E293B',
    userText: '#F1F5F9',
    assistantBg: '#0F172A',
    assistantText: '#E2E8F0',
    systemText: '#94A3B8',
    toolPendingBg: '#0F172A',
    toolSuccessBg: '#064E3B',
    toolErrorBg: '#450A0A',
    toolTitle: '#60A5FA',
    toolOutput: '#CBD5E1',
    quote: '#60A5FA',
    quoteBorder: '#1E3A8A',
    code: '#FBBF24',
    codeBlock: '#0F172A',
    codeBorder: '#334155',
    link: '#34D399',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  openclaw: {
    name: 'OpenClaw',
    text: '#E8E3D5',
    dim: '#7B7F87',
    accent: '#F6C453',
    accentSoft: '#F2A65A',
    border: '#3C414B',
    userBg: '#2B2F36',
    userText: '#F3EEE0',
    assistantBg: '#1E232A',
    assistantText: '#E8E3D5',
    systemText: '#9BA3B2',
    toolPendingBg: '#1F2A2F',
    toolSuccessBg: '#1E2D23',
    toolErrorBg: '#2F1F1F',
    toolTitle: '#F6C453',
    toolOutput: '#E1DACB',
    quote: '#8CC8FF',
    quoteBorder: '#3B4D6B',
    code: '#F0C987',
    codeBlock: '#1E232A',
    codeBorder: '#343A45',
    link: '#7DD3A5',
    error: '#F97066',
    success: '#7DD3A5',
    warning: '#F6C453',
    info: '#8CC8FF',
  },
  opencode: {
    name: 'OpenCode',
    text: '#ffffff',
    dim: '#808080',
    accent: '#fab283',
    accentSoft: '#f8d0b8',
    border: '#404040',
    userBg: '#1a1a2e',
    userText: '#ffffff',
    assistantBg: '#16213e',
    assistantText: '#e0e0e0',
    systemText: '#a0a0a0',
    toolPendingBg: '#1e3a5f',
    toolSuccessBg: '#1e4a1e',
    toolErrorBg: '#4a1e1e',
    toolTitle: '#fab283',
    toolOutput: '#c0c0c0',
    quote: '#8cc8ff',
    quoteBorder: '#4a6fa5',
    code: '#f0c987',
    codeBlock: '#1a1a2e',
    codeBorder: '#404040',
    link: '#7dd3a5',
    error: '#f97066',
    success: '#7dd3a5',
    warning: '#f6c453',
    info: '#8cc8ff',
  },
  dracula: {
    name: 'Dracula',
    text: '#f8f8f2',
    dim: '#6272a4',
    accent: '#bd93f9',
    accentSoft: '#caa9fa',
    border: '#44475a',
    userBg: '#282a36',
    userText: '#f8f8f2',
    assistantBg: '#21222c',
    assistantText: '#f8f8f2',
    systemText: '#8be9fd',
    toolPendingBg: '#1e1f29',
    toolSuccessBg: '#1e2d23',
    toolErrorBg: '#2f1f1f',
    toolTitle: '#ffb86c',
    toolOutput: '#f8f8f2',
    quote: '#8be9fd',
    quoteBorder: '#6272a4',
    code: '#ff79c6',
    codeBlock: '#282a36',
    codeBorder: '#44475a',
    link: '#50fa7b',
    error: '#ff5555',
    success: '#50fa7b',
    warning: '#ffb86c',
    info: '#8be9fd',
  },
  solarized: {
    name: 'Solarized',
    text: '#839496',
    dim: '#657b83',
    accent: '#b58900',
    accentSoft: '#cb4b16',
    border: '#586e75',
    userBg: '#073642',
    userText: '#93a1a1',
    assistantBg: '#002b36',
    assistantText: '#839496',
    systemText: '#657b83',
    toolPendingBg: '#073642',
    toolSuccessBg: '#073642',
    toolErrorBg: '#073642',
    toolTitle: '#b58900',
    toolOutput: '#839496',
    quote: '#2aa198',
    quoteBorder: '#586e75',
    code: '#dc322f',
    codeBlock: '#002b36',
    codeBorder: '#586e75',
    link: '#2aa198',
    error: '#dc322f',
    success: '#859900',
    warning: '#b58900',
    info: '#268bd2',
  },
  monokai: {
    name: 'Monokai',
    text: '#f8f8f2',
    dim: '#75715e',
    accent: '#f92672',
    accentSoft: '#fd971f',
    border: '#49483e',
    userBg: '#272822',
    userText: '#f8f8f2',
    assistantBg: '#1e1f1c',
    assistantText: '#f8f8f2',
    systemText: '#a6e22e',
    toolPendingBg: '#272822',
    toolSuccessBg: '#272822',
    toolErrorBg: '#272822',
    toolTitle: '#f92672',
    toolOutput: '#f8f8f2',
    quote: '#66d9ef',
    quoteBorder: '#49483e',
    code: '#e6db74',
    codeBlock: '#272822',
    codeBorder: '#49483e',
    link: '#a6e22e',
    error: '#f92672',
    success: '#a6e22e',
    warning: '#f92672',
    info: '#66d9ef',
  },
};

export const DEFAULT_PALETTE = PALETTES.techblue;

// ============================================
// 语法高亮主题
// ============================================

export function createSyntaxTheme(codeColor: (text: string) => string) {
  return {
    keyword: codeColor,
    string: chalk.hex('#a5d6ff'),
    number: chalk.hex('#f9f9f9'),
    comment: chalk.hex('#6a737d'),
    function: chalk.hex('#d2a8ff'),
    class: chalk.hex('#79c0ff'),
    type: chalk.hex('#79c0ff'),
    property: chalk.hex('#79c0ff'),
    identifier: chalk.hex('#79c0ff'),
    operator: chalk.hex('#d4d4d4'),
    tag: chalk.hex('#ff7b72'),
    attr: chalk.hex('#ffa657'),
    attrValue: chalk.hex('#a5d6ff'),
  };
}

/**
 * 语法高亮代码
 */
export function highlightCode(code: string, lang?: string): string[] {
  try {
    const language = lang && supportsLanguage(lang) ? lang : undefined;
    const highlighted = highlight(code, {
      language,
      theme: createSyntaxTheme(chalk.hex(PALETTES.openclaw.code)),
      ignoreIllegals: true,
    });
    return highlighted.split('\n');
  } catch {
    return code.split('\n').map((line) => chalk.hex(PALETTES.openclaw.code)(line));
  }
}

// ============================================
// 主题工厂
// ============================================

export interface Theme {
  name: string;
  palette: Palette;
  fg: (text: string) => string;
  dim: (text: string) => string;
  muted: (text: string) => string;
  primary: (text: string) => string;
  secondary: (text: string) => string;
  accent: (text: string) => string;
  accentSoft: (text: string) => string;
  success: (text: string) => string;
  error: (text: string) => string;
  warning: (text: string) => string;
  info: (text: string) => string;
  header: (text: string) => string;
  system: (text: string) => string;
  userBg: (text: string) => string;
  userText: (text: string) => string;
  assistantBg: (text: string) => string;
  assistantText: (text: string) => string;
  toolTitle: (text: string) => string;
  toolOutput: (text: string) => string;
  toolPendingBg: (text: string) => string;
  toolSuccessBg: (text: string) => string;
  toolErrorBg: (text: string) => string;
  border: (text: string) => string;
  bold: (text: string) => string;
  italic: (text: string) => string;
  underline: (text: string) => string;
  strike: (text: string) => string;
  link: (text: string) => string;
  quote: (text: string) => string;
  code: (text: string) => string;
  codeBlock: (text: string) => string;
}

export function createTheme(palette: Palette = DEFAULT_PALETTE): Theme {
  const fg = (hex: string) => (text: string) => chalk.hex(hex)(text);
  const bg = (hex: string) => (text: string) => chalk.bgHex(hex)(text);

  return {
    name: palette.name,
    palette,
    fg: fg(palette.text),
    dim: fg(palette.dim),
    muted: fg(palette.dim),
    primary: fg(palette.accent),
    secondary: fg(palette.dim),
    accent: fg(palette.accent),
    accentSoft: fg(palette.accentSoft),
    success: fg(palette.success),
    error: fg(palette.error),
    warning: fg(palette.warning),
    info: fg(palette.info),
    header: (text: string) => chalk.bold(fg(palette.accent)(text)),
    system: fg(palette.systemText),
    userBg: bg(palette.userBg),
    userText: fg(palette.userText),
    assistantBg: bg(palette.assistantBg),
    assistantText: fg(palette.assistantText),
    toolTitle: fg(palette.toolTitle),
    toolOutput: fg(palette.toolOutput),
    toolPendingBg: bg(palette.toolPendingBg),
    toolSuccessBg: bg(palette.toolSuccessBg),
    toolErrorBg: bg(palette.toolErrorBg),
    border: fg(palette.border),
    bold: (text: string) => chalk.bold(text),
    italic: (text: string) => chalk.italic(text),
    underline: (text: string) => chalk.underline(text),
    strike: (text: string) => chalk.strikethrough(text),
    link: fg(palette.link),
    quote: fg(palette.quote),
    code: fg(palette.code),
    codeBlock: bg(palette.codeBlock),
  };
}

export const THEMES: Record<string, Theme> = Object.fromEntries(
  Object.entries(PALETTES).map(([key, palette]) => [key, createTheme(palette)])
);

export const DEFAULT_THEME = THEMES.techblue;
