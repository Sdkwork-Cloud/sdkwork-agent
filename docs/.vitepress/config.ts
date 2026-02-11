import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "SDKWork Agent",
  description: "AI 智能体开发套件 - Node.js 服务端专用",
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
      { text: '指南', link: '/guide/what-is' },
      { text: 'API', link: '/api/agent' },
      { text: '示例', link: '/examples/basic' },
      { text: '服务端', link: '/server/getting-started' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '什么是 SDKWork?', link: '/guide/what-is' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '安装指南', link: '/guide/installation' },
            { text: '核心概念', link: '/guide/concepts' },
          ]
        },
        {
          text: '基础',
          items: [
            { text: '性能优化', link: '/guide/performance' },
            { text: '故障排除', link: '/guide/troubleshooting' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: 'Agent', link: '/api/agent' },
            { text: 'Skill', link: '/api/skill' },
            { text: 'Tool', link: '/api/tool' },
            { text: 'Memory', link: '/api/memory' },
            { text: 'Events', link: '/api/events' },
          ]
        }
      ],
      '/examples/': [
        {
          text: '示例',
          items: [
            { text: '基础示例', link: '/examples/basic' },
            { text: '高级示例', link: '/examples/advanced' },
            { text: '流式对话', link: '/examples/streaming' },
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
      '/architecture/': [
        {
          text: '架构',
          items: [
            { text: '架构总览', link: '/architecture/overview' },
            { text: '微内核架构', link: '/architecture/microkernel' },
            { text: 'DDD 分层架构', link: '/architecture/ddd' },
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
