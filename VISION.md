# The Small World Vision

**Small World** is not trying to be just another heavyweight 3D web framework. It is trying to be the **"Preact of 3D Engines."**

In a landscape where enterprise 3D web frameworks pull megabytes of JavaScript into the browser just to render a spinning cube, Small World is designed for edge cases that demand absolute minimalism without sacrificing modern rendering techniques.

## The Pain Points We Solve

### 1. Bundle Size & The Micro-App Ecosystem
**The Problem:** Big engines are monolithic. A simple 3D scene in an enterprise framework can easily exceed 1.5MB of code. Many popular libraries, despite their modularity, struggle with effective tree-shaking for tiny applications. For Playable Ads (which have strict 2MB constraints including assets), Telegram Mini-Apps, edge computing, and fast Web3 frontends, loading times are critical.
**Our Solution:** Zero dependencies. By heavily relying on modern browser standards and aggressive dead-code elimination, Small World delivers a PBR-lit, WebGPU-accelerated scene in a fraction of the size.

### 2. Architecture vs. Library
**The Problem:** Many popular solutions are just rendering libraries, not engines. They provide no standard architecture for game loops, state management, or input handling. Developers either reinvent the wheel or adopt heavy declarative wrappers, dragging the massive overhead of complex DOM reconciliation loops into the 60FPS 3D world.
**Our Solution:** The integrated **Behavior System** (`addBehavior(new HoverBehavior())`) and **Interaction Manager** (`onPointerClick`). Small World provides out-of-the-box, drag-and-drop game logic and strict Finite State Machines (`StateMachine`) that mimic the developer experience of professional standalone game engines, without the monolithic framework tax.

### 3. Developer Experience (DX) & TypeScript
**The Problem:** Legacy engines suffer from years of JavaScript cruft. Their third-party TypeScript definitions are often asynchronous to the actual codebase, patched together with `any` types that silently fail at runtime.
**Our Solution:** Small World is 100% strict TypeScript. No `any`. Explicit return types. Private member encapsulation (`_propertyName`). We offer an API where the autocomplete never lies, allowing developers to refactor with absolute confidence.

### 4. Native WebGPU vs. WebGL Baggage
**The Problem:** Legacy engines are struggling to adapt their 10-year-old architectures to the parallel compute paradigms of WebGPU, often resulting in fragmented NodeMaterial systems that break backward compatibility.
**Our Solution:** Small World was built hybrid from day one. Our shaders use static parameter specialization, guaranteeing zero-cost abstraction. We design for WebGPU first and seamlessly fallback to WebGL 2, without forcing the user to learn a proprietary visual scripting language.

## Our Core Philosophy

1. **Lightweight over Exhaustive:** If a feature requires 500KB of polyfills to support 1% of edge cases, it doesn't belong in the core.
2. **DX is King:** Built-in tools like the `GadgetInspector` and the `IBL Generator` ship with the engine because developers shouldn't have to spend a day configuring external UI libraries just to tweak a light's intensity.
3. **Data-Oriented & Zero Allocation:** In hot paths (like `Object3D.computeBounds()` or Raycasting), we avoid object instantiation to eliminate Garbage Collection pauses. 

Small World is the engine for the modern TypeScript developer who wants the raw power of WebGPU, the architectural elegance of a real game engine, and a bundle size that loads before the user even blinks.
