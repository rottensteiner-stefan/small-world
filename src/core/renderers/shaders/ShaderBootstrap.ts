/// src/core/renderers/shaders/ShaderBootstrap.ts

import { ShaderRegistry } from "./ShaderRegistry.js";
import { CoreShaderChunks } from "./CoreShaderChunks.js";
import {
  BasicMaterial,
  PhongMaterial,
  LambertMaterial,
  StandardMaterial,
  TerrainMaterial,
  WorldMaterial,
  SkyboxMaterial,
  WireframeMaterial,
  SpriteMaterial,
  LavaMaterial,
} from "../../materials/index.js";

/**
 * Modern Bootstrapper for the ShaderRegistry.
 * Instead of hardcoding everything, it uses decentralized registration.
 */
export class ShaderBootstrap {
  private static _isInitialized: boolean = false;

  /**
   * Initializes the registry by loading standard chunks and registering core material providers.
   */
  public static async init(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    // 1. Load global shader chunks (lights, math, structures)
    await CoreShaderChunks.init();

    // 2. Register core materials as providers
    // This doesn't compile the shaders yet, only when they are first used.
    const registry = ShaderRegistry.instance;

    const coreMaterials = [
      BasicMaterial,
      PhongMaterial,
      LambertMaterial,
      StandardMaterial,
      TerrainMaterial,
      WorldMaterial,
      SkyboxMaterial,
      WireframeMaterial,
      SpriteMaterial,
      LavaMaterial,
    ];

    for (const MaterialClass of coreMaterials) {
      // Create a temporary instance to get the type (id)
      // and use the class itself as the provider
      const tempInstance = new (MaterialClass as any)();
      registry.registerProvider(tempInstance.type, tempInstance);
    }

    this._isInitialized = true;
  }
}
