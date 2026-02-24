export function getSkillIcon(skillName: string): string {
  const icons: Record<string, string> = {
    translate: '🌐',
    code: '💻',
    analyze: '📊',
    file: '📁',
    search: '🔍',
    image: '🖼️',
    audio: '🎵',
    video: '🎬',
    pdf: '📄',
    excel: '📊',
    default: '⚡',
  };
  
  const key = Object.keys(icons).find(k => skillName.toLowerCase().includes(k));
  return icons[key || 'default'];
}

export function getSkillCategory(skillName: string): string {
  const categories: Record<string, string[]> = {
    '文本处理': ['translate', 'summarize', 'rewrite', 'proofread'],
    '代码开发': ['code', 'debug', 'review', 'refactor', 'test'],
    '文件操作': ['file', 'read', 'write', 'edit'],
    '分析搜索': ['analyze', 'search', 'research', 'data'],
    '工具集成': ['api', 'webhook', 'mcp', 'plugin'],
    '其他': [],
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(k => skillName.toLowerCase().includes(k))) {
      return category;
    }
  }
  return '其他';
}

export function formatSkillDescription(skill: { description?: string }, maxLength: number = 60): string {
  if (!skill.description) return '无描述';
  return skill.description.length > maxLength 
    ? skill.description.substring(0, maxLength - 3) + '...'
    : skill.description;
}

export function getSkillParameterHint(skill: { parameters?: { properties?: Record<string, unknown> } }): string {
  const props = skill.parameters?.properties;
  if (!props || Object.keys(props).length === 0) return '';
  
  const hints = Object.keys(props).slice(0, 3).map(p => `<${p}>`);
  return hints.join(' ');
}

export function truncateText(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  
  return date.toLocaleDateString('zh-CN');
}

export function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
  return (num / 1000000).toFixed(1) + 'M';
}

export function parseKeyValue(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pairs = input.split(',');
  
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    if (key && valueParts.length > 0) {
      result[key.trim()] = valueParts.join('=').trim();
    }
  }
  
  return result;
}
