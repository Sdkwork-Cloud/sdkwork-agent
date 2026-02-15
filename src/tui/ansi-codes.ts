/**
 * Shared ANSI Color Codes
 * 
 * Centralized ANSI escape codes for consistent terminal styling
 * across all TUI components.
 * 
 * @module tui/ansi-codes
 * @version 1.0.0
 */

export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  strikethrough: '\x1b[9m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  
  clearScreen: '\x1b[2J',
  clearScreenDown: '\x1b[0J',
  clearLine: '\x1b[2K',
  clearLineRight: '\x1b[0K',
  clearLineLeft: '\x1b[1K',
  
  cursorHome: '\x1b[0G',
  cursorUp: '\x1b[1A',
  cursorDown: '\x1b[1B',
  cursorForward: '\x1b[1C',
  cursorBack: '\x1b[1D',
  cursorUpN: (n = 1) => `\x1b[${n}A`,
  cursorDownN: (n = 1) => `\x1b[${n}B`,
  cursorForwardN: (n = 1) => `\x1b[${n}C`,
  cursorBackN: (n = 1) => `\x1b[${n}D`,
  cursorTo: (x: number, y: number) => `\x1b[${y};${x}H`,
  cursorToColumn: (x: number) => `\x1b[${x}G`,
  
  saveCursor: '\x1b[s',
  restoreCursor: '\x1b[u',
  
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  
  alternateScreen: '\x1b[?1049h',
  mainScreen: '\x1b[?1049l',
  
  scrollUp: (n = 1) => `\x1b[${n}S`,
  scrollDown: (n = 1) => `\x1b[${n}T`,
  
  rgb: (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`,
  bgRgb: (r: number, g: number, b: number) => `\x1b[48;2;${r};${g};${b}m`,
  
  color256: (n: number) => `\x1b[38;5;${n}m`,
  bgColor256: (n: number) => `\x1b[48;5;${n}m`,
} as const;

export const COLORS = {
  primary: ANSI.cyan,
  secondary: ANSI.brightBlack,
  success: ANSI.green,
  warning: ANSI.yellow,
  error: ANSI.red,
  info: ANSI.blue,
  muted: ANSI.dim,
  accent: ANSI.magenta,
} as const;

export function colorize(text: string, color: string): string {
  return `${color}${text}${ANSI.reset}`;
}

export function bold(text: string): string {
  return `${ANSI.bold}${text}${ANSI.reset}`;
}

export function dim(text: string): string {
  return `${ANSI.dim}${text}${ANSI.reset}`;
}

export function underline(text: string): string {
  return `${ANSI.underline}${text}${ANSI.reset}`;
}
