import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Ai文档',
  tagline: '系统化、结构化的技术知识库',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://github.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/AiDocs/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'Aiden-Coding', // Usually your GitHub org/user name.
  projectName: 'AiDocs', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/Aiden-Coding/AiDocs/tree/main/',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  
  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
      type: 'text/css',
      integrity: 'sha384-n8MVd4RsNIBMW3Zksd/cgGfpkkcg23OqxEnQl9o23PppNwe/eB84kLtyzzN3lft9',
      crossorigin: 'anonymous',
    },
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/social-card.webp',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Ai文档',
      logo: {
        alt: 'Ai文档 Logo',
        src: 'img/logo.webp',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'homeSidebar',
          position: 'left',
          label: '体系介绍',
        },
        {
          type: 'docSidebar',
          sidebarId: 'interviewSidebar',
          position: 'left',
          label: '2026 面试突击',
        },
        {
          type: 'docSidebar',
          sidebarId: 'javaSidebar',
          position: 'left',
          label: 'Java',
        },
        {
          type: 'docSidebar',
          sidebarId: 'databaseSidebar',
          position: 'left',
          label: '数据库',
        },
        {
          type: 'docSidebar',
          sidebarId: 'cacheSidebar',
          position: 'left',
          label: '缓存',
        },
        {
          type: 'docSidebar',
          sidebarId: 'distributedSidebar',
          position: 'left',
          label: '分布式',
        },
        {
          type: 'docSidebar',
          sidebarId: 'rustSidebar',
          position: 'left',
          label: 'Rust',
        },
        {
          type: 'docSidebar',
          sidebarId: 'reactSidebar',
          position: 'left',
          label: 'React',
        },
        {
          type: 'docSidebar',
          sidebarId: 'webBasicsSidebar',
          position: 'left',
          label: 'Web 基础',
        },
        {
          href: 'https://github.com/Aiden-Coding/AiDocs',
          className: 'header-github-link',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} AiDocs 架构知识库. 基于 Docusaurus 驱动.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
