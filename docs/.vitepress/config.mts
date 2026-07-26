import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/small-world/",
  title: "Small World Engine",
  description:
    "A lightweight, high-performance, modular 3D game engine for the web built with TypeScript.",
  themeConfig: {
    nav: [
      { text: "Guides", link: "/guides/getting-started" },
      { text: "API Reference", link: "/api/index.html", target: "_blank" },
      { text: "Showcases", link: "/showcases/index.html", target: "_blank" },
    ],
    sidebar: {
      "/guides/": [
        {
          text: "Getting Started",
          items: [{ text: "Installation & Setup", link: "/guides/getting-started" }],
        },
        {
          text: "Core Concepts",
          items: [
            { text: "Architecture & Overview", link: "/guides/architecture" },
            { text: "Materials & Shaders", link: "/guides/materials" },
            { text: "Configuration & Setup", link: "/guides/configuration" },
            { text: "Coordinate System & Camera Strategies", link: "/guides/coordinate-system" },
            { text: "Gamification & Interactions", link: "/guides/interactions" },
            { text: "Physics & RigidBodies", link: "/guides/physics" },
            { text: "Finite State Machines (FSM)", link: "/guides/state-machines" },
            { text: "EventBus & Gameloop", link: "/guides/eventbus" },
            { text: "Extensions & Ecosystem", link: "/guides/extensions" },
            { text: "Forge (In-Game Tools)", link: "/guides/forge" },
            { text: "Building a Custom Game", link: "/guides/custom-game" },
          ],
        },
      ],
    },
    socialLinks: [{ icon: "github", link: "https://github.com/rottensteiner-stefan/small-world" }],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 Stefan Rottensteiner",
    },
  },
});
