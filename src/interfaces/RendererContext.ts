import { DeviceCaps } from "../core/DeviceCaps.js";
import { ShaderRegistry } from "../core/renderers/shaders/ShaderRegistry.js";
import { AssetManager } from "../loaders/AssetManager.js";

/**
 * Per-engine-instance bundle for the three subsystems that are still process-wide
 * static singletons (DeviceCaps, ShaderRegistry, AssetManager). No behavior change yet --
 * see .agents/collaborate/god-objects-refactoring.md Phase 1 for the instance migration
 * this seam exists for.
 */
export interface RendererContext {
  readonly deviceCaps: typeof DeviceCaps;
  readonly shaderRegistry: ShaderRegistry;
  readonly assetManager: typeof AssetManager;
}

/** Builds a context wrapping today's static singletons -- identical behavior, new seam. */
export function createDefaultRendererContext(): RendererContext {
  return {
    deviceCaps: DeviceCaps,
    shaderRegistry: ShaderRegistry.instance,
    assetManager: AssetManager,
  };
}
