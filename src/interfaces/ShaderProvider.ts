import { ShaderDefinition } from "../core/renderers/shaders/index.js";

/// src/interfaces/ShaderProvider.ts

/**
 * Interface for components that provide their own shader definitions.
 * Typically implemented by Material classes.
 */
export interface ShaderProvider {
  /**
   * Returns the shader definition for this component.
   * @returns The shader definition.
   */
  getShaderDefinition(): ShaderDefinition;
}
