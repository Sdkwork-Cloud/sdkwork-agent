/**
 * Markdown Renderer - Markdown 渲染器
 * 
 * 支持在终端中渲染 Markdown 格式
 * 参考 Claude Code、Codex CLI 的 Markdown 渲染
 * 
 * @module TUI
 * @version 2.0.0
 */

import { TUIRenderer, Theme, DEFAULT_THEME } from './renderer.js';
import { ANSI, COLORS } from './ansi-codes.js';

export class MarkdownRenderer {
  private renderer: TUIRenderer;
  private theme: Theme;

  constructor(renderer?: TUIRenderer, theme: Theme = DEFAULT_THEME) {
    this.renderer = renderer || new TUIRenderer(theme);
    this.theme = theme;
  }

  /**
   * 渲染 Markdown 内容
   */
  render(content: string): string {
    let result = content;

    // 代码块 (需要在行内代码之前处理)
    result = this.renderCodeBlocks(result);

    // 标题
    result = this.renderHeadings(result);

    // 粗体和斜体
    result = this.renderEmphasis(result);

    // 删除线
    result = this.renderStrikethrough(result);

    // 行内代码
    result = this.renderInlineCode(result);

    // 链接
    result = this.renderLinks(result);

    // 图片
    result = this.renderImages(result);

    // 引用块
    result = this.renderBlockquotes(result);

    // 水平线
    result = this.renderHorizontalRules(result);

    // 列表
    result = this.renderLists(result);

    // 表格
    result = this.renderTables(result);

    return result;
  }

  /**
   * 渲染标题
   */
  private renderHeadings(content: string): string {
    content = content.replace(/^# (.+)$/gm, (match, title) => {
      return `\n${ANSI.bold}${COLORS.primary}${title.toUpperCase()}${ANSI.reset}\n${COLORS.primary}${'═'.repeat(title.length)}${ANSI.reset}`;
    });

    content = content.replace(/^## (.+)$/gm, (match, title) => {
      return `\n${ANSI.bold}${COLORS.primary}${title}${ANSI.reset}\n${COLORS.primary}${'─'.repeat(title.length)}${ANSI.reset}`;
    });

    // H3: ### Title
    content = content.replace(/^### (.+)$/gm, (match, title) => {
      return `\n${ANSI.bold}${title}${ANSI.reset}`;
    });

    // H4-H6: #### Title
    content = content.replace(/^####+ (.+)$/gm, (match, title) => {
      return `\n${ANSI.dim}${title}${ANSI.reset}`;
    });

    return content;
  }

  /**
   * 渲染粗体和斜体
   */
  private renderEmphasis(content: string): string {
    // 粗体: **text** 或 __text__
    content = content.replace(/\*\*(.+?)\*\*|__(.+?)__/g, (match, text1, text2) => {
      const text = text1 || text2;
      return `${ANSI.bold}${text}${ANSI.reset}`;
    });

    // 斜体: *text* 或 _text_
    content = content.replace(/\*(.+?)\*|_(.+?)_/g, (match, text1, text2) => {
      const text = text1 || text2;
      return `${ANSI.italic}${text}${ANSI.reset}`;
    });

    return content;
  }

  /**
   * 渲染删除线
   */
  private renderStrikethrough(content: string): string {
    return content.replace(/~~(.+?)~~/g, (match, text) => {
      return `${ANSI.strikethrough}${text}${ANSI.reset}`;
    });
  }

  /**
   * 渲染行内代码
   */
  private renderInlineCode(content: string): string {
    return content.replace(/`([^`]+)`/g, (match, code) => {
      return `${COLORS.warning}${code}${ANSI.reset}`;
    });
  }

  /**
   * 渲染代码块
   */
  private renderCodeBlocks(content: string): string {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    
    return content.replace(codeBlockRegex, (match, language, code) => {
      const lines = code.trim().split('\n');
      const maxLength = Math.max(...lines.map((l: string) => l.length), 40);
      const width = Math.min(maxLength + 4, process.stdout.columns - 4 || 76);
      
      let result = '\n';
      
      result += `${COLORS.muted}┌${'─'.repeat(width)}┐${ANSI.reset}\n`;
      
      if (language) {
        result += `${COLORS.muted}│ ${ANSI.dim}${language.padEnd(width - 3)}${COLORS.muted}│${ANSI.reset}\n`;
        result += `${COLORS.muted}├${'─'.repeat(width)}┤${ANSI.reset}\n`;
      }
      
      for (const line of lines) {
        const truncated = line.slice(0, width - 4);
        const padded = truncated.padEnd(width - 4);
        result += `${COLORS.muted}│${ANSI.reset} ${padded} ${COLORS.muted}│${ANSI.reset}\n`;
      }
      
      result += `${COLORS.muted}└${'─'.repeat(width)}┘${ANSI.reset}\n`;
      
      return result;
    });
  }

  /**
   * 渲染链接
   */
  private renderLinks(content: string): string {
    return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      return `${ANSI.underline}${COLORS.info}${text}${ANSI.reset} ${ANSI.dim}(${url})${ANSI.reset}`;
    });
  }

  private renderImages(content: string): string {
    return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, _url) => {
      return `${COLORS.muted}[Image: ${alt || 'untitled'}]${ANSI.reset}`;
    });
  }

  private renderBlockquotes(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let inQuote = false;

    for (const line of lines) {
      if (line.startsWith('> ')) {
        if (!inQuote) {
          result.push('');
          inQuote = true;
        }
        const quoteText = line.slice(2);
        result.push(`${COLORS.muted}│${ANSI.reset} ${ANSI.italic}${quoteText}${ANSI.reset}`);
      } else if (line.startsWith('>')) {
        if (!inQuote) {
          result.push('');
          inQuote = true;
        }
        result.push(`${COLORS.muted}│${ANSI.reset}`);
      } else {
        if (inQuote) {
          result.push('');
          inQuote = false;
        }
        result.push(line);
      }
    }

    return result.join('\n');
  }

  private renderHorizontalRules(content: string): string {
    const width = Math.min(60, process.stdout.columns - 4 || 60);
    return content.replace(/^(---|___|\*\*\*)$/gm, () => {
      return `\n${COLORS.muted}${'─'.repeat(width)}${ANSI.reset}\n`;
    });
  }

  /**
   * 渲染列表
   */
  private renderLists(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let inList = false;

    for (const line of lines) {
      // 无序列表: - item 或 * item
      const unorderedMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
      // 有序列表: 1. item
      const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);

      if (unorderedMatch) {
        const [, indent, text] = unorderedMatch;
        const level = Math.floor(indent.length / 2);
        const bullet = level % 2 === 0 ? '•' : '◦';
        result.push(`${indent}${COLORS.primary}${bullet}${ANSI.reset} ${text}`);
        inList = true;
      } else if (orderedMatch) {
        const [, indent, number, text] = orderedMatch;
        result.push(`${indent}${COLORS.primary}${number}.${ANSI.reset} ${text}`);
        inList = true;
      } else {
        if (inList && line.trim() === '') {
          result.push('');
        }
        result.push(line);
        inList = false;
      }
    }

    return result.join('\n');
  }

  /**
   * 渲染表格
   */
  private renderTables(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 检测表格行
      if (line.startsWith('|')) {
        const cells = line
          .split('|')
          .slice(1, -1)
          .map(cell => cell.trim());

        // 跳过分隔行 (|---|---|)
        if (cells.every(cell => /^[-:]+$/.test(cell))) {
          continue;
        }

        tableRows.push(cells);
        inTable = true;
      } else {
        if (inTable) {
          // 渲染表格
          result.push(this.renderTableRows(tableRows));
          tableRows = [];
          inTable = false;
        }
        result.push(line);
      }
    }

    // 处理末尾的表格
    if (inTable && tableRows.length > 0) {
      result.push(this.renderTableRows(tableRows));
    }

    return result.join('\n');
  }

  /**
   * 渲染表格行
   */
  private renderTableRows(rows: string[][]): string {
    if (rows.length === 0) return '';

    const colCount = rows[0].length;
    const colWidths: number[] = [];

    // 计算每列的最大宽度
    for (let col = 0; col < colCount; col++) {
      const maxWidth = Math.max(...rows.map(row => (row[col] || '').length), 3);
      colWidths.push(Math.min(maxWidth, 30));
    }

    let result = '\n';

    result += COLORS.muted + '┌';
    for (let i = 0; i < colCount; i++) {
      result += '─'.repeat(colWidths[i] + 2);
      if (i < colCount - 1) result += '┬';
    }
    result += '┐' + ANSI.reset + '\n';

    rows.forEach((row, rowIndex) => {
      result += COLORS.muted + '│' + ANSI.reset;
      for (let col = 0; col < colCount; col++) {
        const cell = (row[col] || '').slice(0, colWidths[col]);
        const padded = cell.padEnd(colWidths[col]);
        const style = rowIndex === 0 ? ANSI.bold : '';
        result += ` ${style}${padded}${ANSI.reset} ${COLORS.muted}│${ANSI.reset}`;
      }
      result += '\n';

      if (rowIndex === 0) {
        result += COLORS.muted + '├';
        for (let i = 0; i < colCount; i++) {
          result += '─'.repeat(colWidths[i] + 2);
          if (i < colCount - 1) result += '┼';
        }
        result += '┤' + ANSI.reset + '\n';
      }
    });

    result += COLORS.muted + '└';
    for (let i = 0; i < colCount; i++) {
      result += '─'.repeat(colWidths[i] + 2);
      if (i < colCount - 1) result += '┴';
    }
    result += '┘' + ANSI.reset + '\n';

    return result;
  }

  /**
   * 打印渲染后的内容
   */
  print(content: string): void {
    console.log(this.render(content));
  }
}

/**
 * 便捷函数
 */
export function renderMarkdown(content: string, theme?: Theme): string {
  const renderer = new MarkdownRenderer(undefined, theme);
  return renderer.render(content);
}

export function printMarkdown(content: string, theme?: Theme): void {
  const renderer = new MarkdownRenderer(undefined, theme);
  renderer.print(content);
}

export default MarkdownRenderer;
