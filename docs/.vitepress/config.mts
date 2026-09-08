import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/small-world/",
  title: "Small World Engine",
  description:
    "A lightweight, high-performance, modular 3D game engine for the web built with TypeScript.",
  themeConfig: {
    nav: [
      { text: "Guides", link: "/guides/getting-started" },
      { text: "Architecture Decisions (ADRs)", link: "/adr/" },
      { text: "Research", link: "/research/" },
      { text: "API Reference", link: "/api/index.html", target: "_blank" },
      { text: "Showcases", link: "/showcases/index.html", target: "_blank" },
    ],
    sidebar: {
      "/guides/": [
        {
          text: "Getting Started",
          items: [
            { text: "Installation & Setup", link: "/guides/getting-started" },
            { text: "Commercial Indie Roadmap", link: "/guides/commercial-indie-roadmap" },
          ],
        },
        {
          text: "Core Concepts",
          items: [
            { text: "Architecture & Overview", link: "/guides/architecture" },
            { text: "Materials & Shaders", link: "/guides/materials" },
            { text: "Shadows", link: "/guides/shadows" },
            { text: "Adding a New Material", link: "/guides/adding-materials" },
            { text: "Shader Importers", link: "/guides/shader-importers" },
            { text: "Configuration & Setup", link: "/guides/configuration" },
            { text: "Coordinate System & Camera Strategies", link: "/guides/coordinate-system" },
            { text: "Gamification & Interactions", link: "/guides/interactions" },
            { text: "Physics & RigidBodies", link: "/guides/physics" },
            { text: "Audio System", link: "/guides/audio" },
            { text: "Finite State Machines (FSM)", link: "/guides/state-machines" },
            { text: "EventBus & Gameloop", link: "/guides/eventbus" },
            { text: "Modular Ecosystem & Layering", link: "/guides/extensions" },
            { text: "Building a Custom Game", link: "/guides/custom-game" },
          ],
        },
        {
          text: "Toolchain & Editors",
          items: [
            { text: "Toolchain Overview", link: "/guides/toolchain" },
            { text: "Maker (3D World Editor)", link: "/guides/maker" },
            { text: "The Forge (In-Game Window Manager)", link: "/guides/forge" },
            { text: "Material Studio", link: "/guides/material-studio" },
            { text: "Pixler (Pixel Art Editor)", link: "/guides/pixler" },
            { text: "Xtractor (Sprite Extractor)", link: "/guides/xtractor" },
            { text: "Map Generator (ASCII Grid Levels)", link: "/guides/map-generator" },
          ],
        },
      ],
      "/adr/": [
        {
          text: "Architecture Decision Records",
          items: [
            { text: "Overview & Index", link: "/adr/" },
            { text: "0001: Config Shape (Named Keys)", link: "/adr/0001-config-shape-named-keys-not-tagged-arrays" },
            { text: "0002: TAA Jitter Shared ViewProj", link: "/adr/0002-taa-jitter-shared-viewproj-matrix" },
            { text: "0003: Global Hit-Stop", link: "/adr/0003-hit-stop-is-global-not-per-entity" },
            { text: "0004: Point/Spot Light Global Cap", link: "/adr/0004-point-spot-light-global-cap" },
            { text: "0005: CCD Sphere-Only Scope", link: "/adr/0005-ccd-sphere-only-scope" },
            { text: "0006: PCSS Directional-Light Only", link: "/adr/0006-pcss-directional-light-only" },
            { text: "0007: Clustered Forward+ Lighting", link: "/adr/0007-clustered-lighting-webgl2-webgpu-only" },
            { text: "0008: HZB Occlusion Culling", link: "/adr/0008-hzb-occlusion-culling-webgpu-only" },
            { text: "0009: Character Pipeline & Mixamo", link: "/adr/0009-character-pipeline-and-mixamo-rigging-standard" },
            { text: "0010: Maker Editor Architecture", link: "/adr/0010-maker-editor-architecture" },
            { text: "0011: Modular Asset Kits", link: "/adr/0011-modular-asset-kits-and-remote-catalog" },
            { text: "0012: The Stray Principle", link: "/adr/0012-atmospheric-indie-game-design-and-rendering-philosophy" },
            { text: "0013: Unified Liquid Materials", link: "/adr/0013-unified-liquid-surface-material" },
            { text: "0014: Modular Domain Layering", link: "/adr/0014-modular-ecosystem-and-domain-layering" },
            { text: "0015: App-First Genre Code Extraction", link: "/adr/0015-app-first-genre-code-extraction-rule" },
          ],
        },
      ],
      "/research/": [
        {
          text: "Technical Research & Studies",
          items: [
            { text: "Overview & Index", link: "/research/" },
            { text: "AAA Engine Rendering Techniques", link: "/research/aaa-engine-techniques" },
            { text: "Diorama Environment Architecture", link: "/research/diorama-environment-architecture" },
            { text: "Oil & Puddle Shader Techniques", link: "/research/oil-puddle-shader-technique" },
            { text: "XDP Game Networking", link: "/research/xdp-game-networking" },
            { text: "Showcase Feature Audit", link: "/research/showcase-feature-audit" },
            { text: "Codebase Architecture Review", link: "/research/codebase-review-2026-08-22" },
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
