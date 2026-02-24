export function trim(text: string | undefined | null): string {
  return text?.trim() || '';
}

export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function camelCase(text: string): string {
  return text
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, (c) => c.toLowerCase());
}

export function kebabCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function snakeCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

export function pascalCase(text: string): string {
  return text
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, (c) => c.toUpperCase());
}

export function trimLines(text: string): string {
  return text.split('\n').map(line => line.trim()).join('\n');
}

export function removePrefix(text: string, prefix: string): string {
  return text.startsWith(prefix) ? text.slice(prefix.length) : text;
}

export function removeSuffix(text: string, suffix: string): string {
  return text.endsWith(suffix) ? text.slice(0, -suffix.length) : text;
}

export function padStart(text: string, length: number, char: string = ' '): string {
  return text.padStart(length, char);
}

export function padEnd(text: string, length: number, char: string = ' '): string {
  return text.padEnd(length, char);
}

export function repeat(text: string, count: number): string {
  return text.repeat(count);
}

export function reverse(text: string): string {
  return text.split('').reverse().join('');
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

export function unescapeHtml(text: string): string {
  const htmlUnescapes: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  return text.replace(/&(?:amp|lt|gt|quot|#39);/g, entity => htmlUnescapes[entity]);
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isBlank(text: string | undefined | null): boolean {
  return !text || text.trim().length === 0;
}

export function isNotBlank(text: string | undefined | null): boolean {
  return !isBlank(text);
}

export function defaultIfBlank(text: string | undefined | null, defaultValue: string): string {
  return isBlank(text) ? defaultValue : text!;
}

export function lines(text: string): string[] {
  return text.split('\n');
}

export function unlines(lines: string[]): string {
  return lines.join('\n');
}

export function words(text: string): string[] {
  return text.trim().split(/\s+/);
}

export function unwords(words: string[]): string {
  return words.join(' ');
}

export function first(text: string, count: number = 1): string {
  return text.slice(0, count);
}

export function last(text: string, count: number = 1): string {
  return text.slice(-count);
}

export function splitOnce(text: string, separator: string): [string, string] {
  const idx = text.indexOf(separator);
  if (idx === -1) return [text, ''];
  return [text.slice(0, idx), text.slice(idx + separator.length)];
}
