import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Small World Engine",
  description: "A lightweight, high-performance, modular 3D game engine for the web built with TypeScript.",
  themeConfig: {
    nav: [
      { text: 'Guides', link: '/guides/getting-started' },
      { text: 'API Reference', link: '/api/index.html', target: '_blank' }
    ],
    sidebar: {
      '/guides/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation & Setup', link: '/guides/getting-started' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Coordinate System & Camera Strategies', link: '/guides/coordinate-system' },
            { text: 'Finite State Machines (FSM)', link: '/guides/state-machines' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/rottensteiner-stefan/small-world' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Stefan Rottensteiner'
    }
  }
})
