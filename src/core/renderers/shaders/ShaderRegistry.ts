/// src/core/renderers/shaders/ShaderRegistry.ts

import { ShaderDefinition } from "./ShaderDefinition.js";

/**
 * Central registry for shader definitions.
 */
export class ShaderRegistry {
  private static _instance: ShaderRegistry;
  private _shaders: Map<string, ShaderDefinition> = new Map();
  private _chunks: Map<string, string> = new Map();

  private constructor() {}

  /**
   * Gets the singleton instance of the ShaderRegistry.
   * @returns The instance.
   */
  public static get instance(): ShaderRegistry {
    if (!this._instance) {
      this._instance = new ShaderRegistry();
    }
    return this._instance;
  }

  /**
   * Registers a new shader definition.
   * @param definition The shader definition to register.
   */
  public register(definition: ShaderDefinition): void {
    if (this._shaders.has(definition.id)) {
      console.warn(`[ShaderRegistry] Overwriting existing shader: ${definition.id}`);
    }
    this._shaders.set(definition.id, definition);
  }

  /**
   * Gets a shader definition by its ID.
   * @param id The ID of the shader.
   * @returns The shader definition or undefined if not found.
   */
  public get(id: string): ShaderDefinition | undefined {
    return this._shaders.get(id);
  }

  /**
   * Registers a shader chunk.
   * @param id The ID of the chunk.
   * @param code The source code of the chunk.
   */
  public registerChunk(id: string, code: string): void {
    this._chunks.set(id, code);
  }

  /**
   * Gets a shader chunk by its ID.
   * @param id The ID of the chunk.
   * @returns The source code of the chunk or undefined if not found.
   */
  public getChunk(id: string): string | undefined {
    return this._chunks.get(id);
  }

  /**
   * Processes a shader source and replaces all chunk placeholders.
   * Placeholders are formatted as: [CHUNK_ID]
   * @param source The shader source code.
   * @returns The source code with all placeholders replaced.
   */
  public assemble(source: string): string {
    return source.replace(/\[([A-Z0-9_]+)\]/g, (match: string, chunkId: string) => {
      const chunk: string | undefined = this.getChunk(chunkId);
      if (undefined === chunk) {
        console.warn(`[ShaderRegistry] Chunk not found: ${chunkId}`);
        return match;
      }
      return chunk;
    });
  }
}
