# ADR 0012: Atmospheric Indie Game Design & Rendering Philosophy ("The Stray Principle")

## Status
Accepted

## Context & Problem

Modern 3D engine development frequently falls into an unsustainable trap: the brute-force "spec race." Mainstream industry trends chase 8K uncompressed textures, multi-bounce hardware raytracing, and massive multi-gigabyte engine runtimes that demand $2,000 graphics cards just to hit 30 FPS.

This mindset produces severe drawbacks:
1. **Hardware Exclusion & Energy Waste:** Games and web apps become unplayable for the overwhelming majority of users on standard laptops, MacBooks, integrated GPUs, and mobile devices.
2. **Loss of Artistic Focus:** Raw polygon counts and photorealistic texture resolutions frequently substitute for coherent art direction, mood, and tactile game feel.
3. **The "Toy Engine" Fallacy:** Conversely, many lightweight web 3D libraries reduce themselves to minimal rendering utilities (spinning cubes, tech demos, banner ads), omitting the core architecture (FSMs, physics, audio, scene editing) required to build real, substantive games.

Masterpiece indie games such as *Stray*, *Inside*, *Journey*, and *Firewatch* prove conclusively that **art direction, lighting mood, color harmony, atmosphere, responsive controls, and coherent worldbuilding** evoke far deeper emotional resonance and commercial success than unoptimized brute-force graphics ever could.

## Decision

We establish **The Stray Principle** as Small World's foundational design and rendering philosophy:

### 1. Atmosphere & Art Direction > Brute-Force Pixel Counting
- Visual fidelity in Small World is driven by **lighting mood, evocative volumetric fog, cinematic post-processing (bloom, tone mapping, color grading), striking silhouettes, and stylized PBR materials** rather than 8K texture bloat or hardware-melting path tracing.
- We deliberately design rendering techniques that deliver rich, high-end visual aesthetics on standard WebGL 2 and WebGPU hardware without excessive computational overhead.

### 2. Full-Fledged Indie Game Engine Architecture
Small World is engineered to support **real, substantive, narrative, and interactive games and rich 3D applications**, not merely isolated rendering snippets. The engine provides a complete, unified runtime stack:
- Component-based **Behavior System** and type-safe, zero-allocation **Finite State Machines (FSM)**.
- Built-in **Impulse Physics** (SAT collision detection, buoyancy, continuous collision detection).
- 3D **Spatial Audio** (HRTF positioning, procedural synthesizers, audio mixing).
- $O(\log n)$ **Octree Interaction Manager** and screen-space picking.

### 3. Universal 60 FPS Target on Everyday Hardware
- Every system and shader must achieve a rock-solid 60 FPS on mainstream consumer hardware (Apple Silicon, integrated Intel/AMD GPUs, mobile browsers).
- Strict zero-allocation hot paths and object pooling (`MathPool`) eliminate Garbage Collection stutter.

### 4. Zero-Friction Visual Authoring (Maker)
- World composition, level design, and prefab assembling happen in **Maker** (`public/tools/maker.html`) directly inside the browser.
- Uses the native File System Access API and open glTF 2.0 standards (`SW_*` metadata extensions) without requiring heavyweight desktop installs or cloud subscriptions.

## Consequences

- **Creative Empowerment:** Indie developers and digital artists can craft atmospheric, visually stunning games with immediate web distribution.
- **Universal Player Accessibility:** Games load in seconds, run cool and quiet on everyday consumer laptops and mobile devices, and require no expensive GPU upgrades.
- **Clear Architectural Guidance:** Engine features and shaders are prioritized based on artistic expression and atmospheric impact (e.g., fog, lighting, post-fx, game feel) rather than unmaintainable, hardware-punishing brute force.
