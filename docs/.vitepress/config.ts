import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "SDKWork Agent",
  description: "AI 智能体开发套件",
  lang: 'zh-CN',
  base: '/sdkwork-browser-agent/',
  lastUpdated: true,
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#5f67ee' }],
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '指南', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: '示例', link: '/examples/' },
      { text: '服务端', link: '/server/getting-started' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '简介', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '核心概念', link: '/guide/concepts' },
          ]
        },
        {
          text: '基础',
          items: [
            { text: '智能体', link: '/guide/agent' },
            { text: '任务', link: '/guide/task' },
            { text: '能力', link: '/guide/capability' },
            { text: '内存', link: '/guide/memory' },
            { text: '工具', link: '/guide/tools' },
          ]
        },
        {
          text: '高级',
          items: [
            { text: '工作流', link: '/guide/workflow' },
            { text: '多智能体', link: '/guide/multi-agent' },
            { text: '自定义扩展', link: '/guide/extensions' },
          ]
        },
        {
          text: '部署',
          items: [
            { text: '生产环境', link: '/guide/production' },
            { text: '性能优化', link: '/guide/performance' },
            { text: '监控', link: '/guide/monitoring' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '概述', link: '/api/' },
            { text: 'Agent', link: '/api/agent' },
            { text: 'Task', link: '/api/task' },
            { text: 'Capability', link: '/api/capability' },
            { text: 'Memory', link: '/api/memory' },
            { text: 'Tools', link: '/api/tools' },
          ]
        }
      ],
      '/examples/': [
        {
          text: '示例',
          items: [
            { text: '概述', link: '/examples/' },
            { text: '聊天助手', link: '/examples/chat-agent' },
            { text: '代码助手', link: '/examples/code-agent' },
            { text: '数据分析', link: '/examples/data-analysis' },
            { text: '自动化工作流', link: '/examples/workflow' },
          ]
        }
      ],
      '/server/': [
        {
          text: '服务端',
          items: [
            { text: '快速开始', link: '/server/getting-started' },
            { text: '架构设计', link: '/server/architecture' },
            { text: 'API Reference', link: '/server/api-reference' },
            { text: '模块开发', link: '/server/module-development' },
          ]
        }
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Sdkwork-Cloud/sdkwork-agent' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 SDKWork'
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭'
            }
          }
        }
      }
    },

    outline: {
      label: '页面导航'
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    lastUpdated: {
      text: '最后更新于'
    },

    langMenuLabel: '多语言',
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  },

  markdown: {
    lineNumbers: true,
    config: (md) => {
      // 添加代码块复制按钮
      md.use(() => {
        // 代码块配置
      })
    }
  }
})
