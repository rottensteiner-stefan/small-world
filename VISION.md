# The Small World Vision

**Small World** is not trying to be just another heavyweight 3D web framework. It is trying to be the **"Preact of 3D Engines."**

In a landscape where enterprise 3D web frameworks pull megabytes of JavaScript into the browser just to render a spinning cube, Small World is designed for edge cases that demand absolute minimalism without sacrificing modern rendering techniques.

## The Pain Points We Solve

### 1. Bundle Size & The Micro-App Ecosystem
**The Problem:** Big engines are monolithic. A simple 3D scene in an enterprise framework can easily exceed 1.5MB of code. Many popular libraries, despite their modularity, struggle with effective tree-shaking for tiny applications. For Playable Ads (which have strict 2MB constraints including assets), Telegram Mini-Apps, edge computing, and fast Web3 frontends, loading times are critical.
**Our Solution:** The rendering and math core has zero dependencies. By heavily relying on modern browser standards and aggressive dead-code elimination, Small World delivers a PBR-lit, WebGPU-accelerated scene in a fraction of the size. (A handful of dependencies do exist for optional dev tooling — e.g. `tweakpane` for the in-game Gadget Inspector GUI, `joy-con-webhid` for gamepad support — none of them ship with the engine's rendering path itself.)

### 2. Architecture vs. Library
**The Problem:** Many popular solutions are just rendering libraries, not engines. They provide no standard architecture for game loops, state management, or input handling. Developers either reinvent the wheel or adopt heavy declarative wrappers, dragging the massive overhead of complex DOM reconciliation loops into the 60FPS 3D world.
**Our Solution:** The integrated **Behavior System** (`addBehavior(new HoverBehavior())`) and **Interaction Manager** (`onPointerClick`). Small World provides out-of-the-box, drag-and-drop game logic and strict Finite State Machines (`StateMachine`) that mimic the developer experience of professional standalone game engines, without the monolithic framework tax.

### 3. Developer Experience (DX) & TypeScript
**The Problem:** Legacy engines suffer from years of JavaScript cruft. Their third-party TypeScript definitions are often asynchronous to the actual codebase, patched together with `any` types that silently fail at runtime.
**Our Solution:** Small World is 100% strict TypeScript. No `any`. Explicit return types. Private member encapsulation (`_propertyName`) -- internal renderer state stays genuinely private/protected, with narrow named getters (and, where a pass genuinely needs to mutate frame state, get/set accessor pairs) as the only way in from outside, instead of exposing raw fields. We offer an API where the autocomplete never lies, allowing developers to refactor with absolute confidence.

### 4. Native WebGPU vs. WebGL Baggage
**The Problem:** Legacy engines are struggling to adapt their 10-year-old architectures to the parallel compute paradigms of WebGPU, often resulting in fragmented NodeMaterial systems that break backward compatibility.
**Our Solution:** Small World was built hybrid from day one. Our shaders use static parameter specialization, guaranteeing zero-cost abstraction. We design for WebGPU first and seamlessly fallback to WebGL 2, without forcing the user to learn a proprietary visual scripting language.

### 5. Asset Bloat & Closed Ecosystems (Frictionless Ingestion & Open Standards)
**The Problem:** Traditional 3D engines either bundle gigabytes of heavy binary assets into their core repositories (causing agonizingly slow clone times and monolithic bloat) or lock developers into walled-garden asset stores with proprietary file formats. Indie developers and micro-app creators cannot—and should not—have to model thousands of custom 3D assets from scratch just to make their applications compelling.
**Our Solution:** The **Modular Asset Kit Standard** and **Zero-Friction Ingestion Pipeline**. Small World adopts open, universal standards (`.glb`, standard glTF 2.0 PBR, clean semantic JSON manifests). The engine repository stays feather-light, providing curated Gold-Standard reference kits (like the *Underground & Industrial Kit*), while empowering creators to seamlessly import, snap, and socket any model from the global CC0/CC-BY ecosystem (Kenney, Poly Haven, Sketchfab, Blender) or generative AI pipelines (Tripo3D, Meshy) in seconds.

## Our Core Philosophy

1. **Lightweight over Exhaustive:** If a feature requires 500KB of polyfills to support 1% of edge cases, it doesn't belong in the core.
2. **DX is King:** Built-in tools like the `GadgetInspector` and the `IBL Generator` ship with the engine because developers shouldn't have to spend a day configuring external UI libraries just to tweak a light's intensity.
3. **Data-Oriented & Zero Allocation:** In hot paths (like the main render loop, `Object3D.computeBounds()`, or Raycasting), we strictly avoid object instantiation to completely eliminate unpredictable Garbage Collection (GC) pauses.
4. **Zero-Dependency Core:** No external math libraries (like `glMatrix`), no bloated polyfills, in the rendering and math core itself. We build custom, highly-optimized systems from the ground up (like our right-handed coordinate math engine) to guarantee maximum performance and minimal footprint.
5. **Modern By Default:** We leverage the latest web technologies directly. Unified linear space post-processing pipelines are standard, not an afterthought — and WebGPU compute shaders are real, not just a graphics-pipeline talking point (the Clustered Forward+ Lighting pass culls every light against the frustum grid on the GPU before the main render pass runs).
6. **Open Standards & Frictionless Ingestion:** We do not build proprietary asset silos. Small World thrives on standard glTF/GLB binaries and self-contained kit manifests (`model.glb` + `preview.jpg` + `meta.json`). We provide the high-performance engine and gold-standard starter templates — letting developers tap into millions of existing 3D assets without friction, conversion bloat, or lock-in.

Small World is the engine for the modern TypeScript developer who wants the raw power of WebGPU, the architectural elegance of a real game engine, and a bundle size that loads before the user even blinks.
