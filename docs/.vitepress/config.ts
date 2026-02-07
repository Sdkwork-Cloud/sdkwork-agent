import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'SDKWork Agent',
  titleTemplate: ':title | SDKWork Agent',
  description: '统一智能体架构 - DDD Domain-Driven Design，行业领先的 Skill/Tool/MCP/Plugin 执行标准',
  
  lang: 'zh-CN',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#646cff' }],
    ['meta', { name: 'keywords', content: 'AI Agent, LLM, Skill, Tool, MCP, Plugin, DDD, TypeScript' }],
    ['meta', { property: 'og:title', content: 'SDKWork Agent' }],
    ['meta', { property: 'og:description', content: '统一智能体架构 - DDD Domain-Driven Design' }],
    ['meta', { property: 'og:type', content: 'website' }],
  ],

  lastUpdated: true,
  cleanUrls: true,
  
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',
    
    nav: [
      { text: '指南', link: '/guide/what-is', activeMatch: '/guide/' },
      { text: '架构', link: '/architecture/overview', activeMatch: '/architecture/' },
      { text: 'API', link: '/api/agent', activeMatch: '/api/' },
      { text: '示例', link: '/examples/basic', activeMatch: '/examples/' },
      {
        text: 'v1.0.0',
        items: [
          { text: '更新日志', link: '/changelog' },
          { text: '贡献指南', link: '/contributing' },
          { text: '路线图', link: '/roadmap' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          collapsed: false,
          items: [
            { text: '什么是 SDKWork?', link: '/guide/what-is' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '安装', link: '/guide/installation' },
            { text: '核心概念', link: '/guide/concepts' },
          ],
        },
        {
          text: '参考',
          collapsed: false,
          items: [
            { text: '故障排除', link: '/guide/troubleshooting' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: '架构概览',
          collapsed: false,
          items: [
            { text: '总览', link: '/architecture/overview' },
            { text: 'DDD 分层架构', link: '/architecture/ddd' },
            { text: '微内核架构', link: '/architecture/microkernel' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'Core API',
          collapsed: false,
          items: [
            { text: 'Agent', link: '/api/agent' },
          ],
        },
        {
          text: 'Domain',
          collapsed: false,
          items: [
            { text: 'Skill', link: '/api/skill' },
            { text: 'Tool', link: '/api/tool' },
            { text: 'Memory', link: '/api/memory' },
            { text: 'Events', link: '/api/events' },
          ],
        },
      ],
      '/examples/': [
        {
          text: '基础示例',
          collapsed: false,
          items: [
            { text: 'Hello World', link: '/examples/basic' },
            { text: '流式对话', link: '/examples/streaming' },
          ],
        },
        {
          text: '高级示例',
          collapsed: false,
          items: [
            { text: '实战场景', link: '/examples/advanced' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sdkwork/agent' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 SDKWork Team',
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档',
          },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },

    editLink: {
      pattern: 'https://github.com/sdkwork/agent/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    outline: {
      label: '本页目录',
      level: [2, 3],
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
    config: (md) => {
      // 可以在这里添加自定义 markdown 插件
    },
  },

  sitemap: {
    hostname: 'https://sdkwork-agent.vercel.app',
  },
});
