type MessageKey = string;
type MessageParams = Record<string, string | number>;

const messages: Record<string, Record<string, string>> = {
  'zh-CN': {
    'app.name': 'SDKWork Agent',
    'app.welcome': '欢迎使用 SDKWork Agent，让我们开始配置...',
    'app.goodbye': '再见!',
    
    'command.help': '显示帮助信息',
    'command.clear': '清空对话历史',
    'command.exit': '退出 CLI',
    'command.config': '显示/修改配置',
    'command.setup': '配置向导',
    'command.skills': '列出可用技能',
    'command.skill': '执行技能',
    'command.active': '管理活动技能',
    'command.tools': '列出可用工具',
    'command.model': '切换/显示模型',
    'command.provider': '切换提供商',
    'command.theme': '切换主题',
    'command.session': '会话管理',
    'command.status': '显示当前状态',
    'command.stats': '显示使用统计',
    'command.events': '显示事件日志',
    'command.history': '显示命令历史',
    'command.export': '导出对话',
    'command.redo': '重新执行上一条命令',
    'command.undo': '撤销上一条消息',
    'command.compact': '压缩对话历史',
    
    'category.general': '通用',
    'category.session': '会话',
    'category.capabilities': '功能',
    'category.settings': '设置',
    'category.info': '信息',
    
    'skill.category.text': '文本处理',
    'skill.category.code': '代码开发',
    'skill.category.file': '文件操作',
    'skill.category.analysis': '分析搜索',
    'skill.category.tools': '工具集成',
    'skill.category.other': '其他',
    'skill.noParams': '无需参数',
    'skill.noDescription': '无描述',
    
    'config.apiKey': 'API Key',
    'config.provider': '提供商',
    'config.model': '模型',
    'config.baseUrl': 'Base URL',
    'config.theme': '主题',
    'config.streamOutput': '流式输出',
    'config.autoSave': '自动保存',
    
    'error.invalidApiKey': 'API Key 无效或已过期，请检查配置',
    'error.rateLimit': '请求过于频繁，请稍后重试',
    'error.network': '网络连接失败，请检查网络设置',
    'error.timeout': '请求超时，请检查网络或稍后重试',
    'error.quotaExceeded': 'API 配额不足，请充值后重试',
    'error.modelUnavailable': '模型不可用，请使用 /model 切换模型',
    'error.configFailed': '请检查 API Key 和网络连接',
    
    'time.justNow': '刚刚',
    'time.minutesAgo': '{count}分钟前',
    'time.hoursAgo': '{count}小时前',
    'time.daysAgo': '{count}天前',
    
    'prompt.selectProvider': '请选择 AI 提供商',
    'prompt.selectModel': '请选择模型',
    'prompt.enterApiKey': 'API Key',
    'prompt.continue': '继续配置?',
    
    'status.enabled': '启用',
    'status.disabled': '禁用',
    'status.current': '当前',
    'status.recommended': '推荐',
    
    'action.set': '设置',
    'action.clear': '清除',
    'action.reset': '重置',
    'action.save': '保存',
    'action.load': '加载',
    'action.delete': '删除',
    'action.export': '导出',
    'action.cancel': '取消',
    'action.confirm': '确认',
    
    'message.configSaved': '配置已保存',
    'message.sessionRestored': '已恢复上次会话 ({count} 条消息)',
    'message.historyCleared': '对话历史已清空',
    'message.eventsCleared': '事件日志已清空',
    'message.exportSuccess': '导出成功',
    'message.exportFailed': '导出失败',
    
    'help.shortcuts': '快捷键',
    'help.commands': '可用命令',
    'help.tips': '提示',
  },
  'en-US': {
    'app.name': 'SDKWork Agent',
    'app.welcome': 'Welcome to SDKWork Agent, let\'s start configuration...',
    'app.goodbye': 'Goodbye!',
    
    'command.help': 'Show help information',
    'command.clear': 'Clear conversation history',
    'command.exit': 'Exit CLI',
    'command.config': 'Show/modify configuration',
    'command.setup': 'Configuration wizard',
    'command.skills': 'List available skills',
    'command.skill': 'Execute skill',
    'command.active': 'Manage active skill',
    'command.tools': 'List available tools',
    'command.model': 'Switch/show model',
    'command.provider': 'Switch provider',
    'command.theme': 'Switch theme',
    'command.session': 'Session management',
    'command.status': 'Show current status',
    'command.stats': 'Show usage statistics',
    'command.events': 'Show event log',
    'command.history': 'Show command history',
    'command.export': 'Export conversation',
    'command.redo': 'Re-execute last command',
    'command.undo': 'Undo last message',
    'command.compact': 'Compact conversation history',
    
    'category.general': 'General',
    'category.session': 'Session',
    'category.capabilities': 'Capabilities',
    'category.settings': 'Settings',
    'category.info': 'Info',
    
    'skill.category.text': 'Text Processing',
    'skill.category.code': 'Code Development',
    'skill.category.file': 'File Operations',
    'skill.category.analysis': 'Analysis & Search',
    'skill.category.tools': 'Tool Integration',
    'skill.category.other': 'Other',
    'skill.noParams': 'No parameters required',
    'skill.noDescription': 'No description',
    
    'config.apiKey': 'API Key',
    'config.provider': 'Provider',
    'config.model': 'Model',
    'config.baseUrl': 'Base URL',
    'config.theme': 'Theme',
    'config.streamOutput': 'Stream Output',
    'config.autoSave': 'Auto Save',
    
    'error.invalidApiKey': 'Invalid or expired API Key, please check configuration',
    'error.rateLimit': 'Too many requests, please try again later',
    'error.network': 'Network connection failed, please check network settings',
    'error.timeout': 'Request timeout, please check network or try again later',
    'error.quotaExceeded': 'API quota exceeded, please top up and try again',
    'error.modelUnavailable': 'Model unavailable, use /model to switch',
    'error.configFailed': 'Please check API Key and network connection',
    
    'time.justNow': 'Just now',
    'time.minutesAgo': '{count} minutes ago',
    'time.hoursAgo': '{count} hours ago',
    'time.daysAgo': '{count} days ago',
    
    'prompt.selectProvider': 'Select AI Provider',
    'prompt.selectModel': 'Select Model',
    'prompt.enterApiKey': 'API Key',
    'prompt.continue': 'Continue configuration?',
    
    'status.enabled': 'Enabled',
    'status.disabled': 'Disabled',
    'status.current': 'Current',
    'status.recommended': 'Recommended',
    
    'action.set': 'Set',
    'action.clear': 'Clear',
    'action.reset': 'Reset',
    'action.save': 'Save',
    'action.load': 'Load',
    'action.delete': 'Delete',
    'action.export': 'Export',
    'action.cancel': 'Cancel',
    'action.confirm': 'Confirm',
    
    'message.configSaved': 'Configuration saved',
    'message.sessionRestored': 'Session restored ({count} messages)',
    'message.historyCleared': 'Conversation history cleared',
    'message.eventsCleared': 'Event log cleared',
    'message.exportSuccess': 'Export successful',
    'message.exportFailed': 'Export failed',
    
    'help.shortcuts': 'Shortcuts',
    'help.commands': 'Available Commands',
    'help.tips': 'Tips',
  }
};

let currentLocale: string = 'zh-CN';

export function setLocale(locale: string): void {
  if (messages[locale]) {
    currentLocale = locale;
  }
}

export function getLocale(): string {
  return currentLocale;
}

export function t(key: MessageKey, params?: MessageParams): string {
  const localeMessages = messages[currentLocale] || messages['zh-CN'];
  let message = localeMessages[key] || key;
  
  if (params) {
    for (const [paramKey, value] of Object.entries(params)) {
      message = message.replace(`{${paramKey}}`, String(value));
    }
  }
  
  return message;
}

export function tn(key: MessageKey, count: number): string {
  return t(key, { count });
}

export const i18n = {
  t,
  tn,
  setLocale,
  getLocale,
  messages,
};

export type I18n = typeof i18n;
