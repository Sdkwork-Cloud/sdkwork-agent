import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'SDKWork Browser Agent',
  description: '企业级浏览器智能体框架',
  lang: 'zh-CN',
  
  head: [
    ['meta', { name: 'theme-color', content: '#646cff' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'SDKWork Browser Agent' }],
    ['meta', { name: 'og:description', content: '企业级浏览器智能体框架' }],
  ],
  
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'SDKWork Browser Agent',
    
    nav: [
      { text: '指南', link: '/guide/what-is', activeMatch: '/guide/' },
      { text: 'API 参考', link: '/api/agent', activeMatch: '/api/' },
      { text: '架构设计', link: '/architecture/overview', activeMatch: '/architecture/' },
      { text: '示例', link: '/examples/basic', activeMatch: '/examples/' },
    ],
    
    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '什么是 SDKWork Browser Agent?', link: '/guide/what-is' },
            { text: '安装', link: '/guide/installation' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '核心概念', link: '/guide/concepts' },
          ]
        },
        {
          text: '进阶',
          items: [
            { text: 'TUI 终端界面', link: '/guide/tui' },
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
      '/architecture/': [
        {
          text: '架构设计',
          items: [
            { text: '架构概览', link: '/architecture/overview' },
            { text: 'DDD 架构', link: '/architecture/ddd' },
            { text: '微内核架构', link: '/architecture/microkernel' },
            { text: 'React 架构', link: '/architecture/react' },
          ]
        }
      ],
      '/examples/': [
        {
          text: '示例',
          items: [
            { text: '基础示例', link: '/examples/basic' },
            { text: '高级示例', link: '/examples/advanced' },
            { text: '流式输出', link: '/examples/streaming' },
          ]
        }
      ],
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sdkwork/browser-agent' }
    ],
    
    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © 2024 SDKWork Team'
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
              navigateText: '切换'
            }
          }
        }
      }
    },
    
    outline: {
      label: '页面导航',
      level: [2, 3]
    },
    
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    
    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    }
  }
});
