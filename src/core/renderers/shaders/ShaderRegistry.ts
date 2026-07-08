/// src/core/renderers/shaders/ShaderRegistry.ts
import { ShaderDefinition } from "./ShaderDefinition.js";
import { ShaderProvider } from "../../../interfaces/index.js";

/**
 * Supported shader languages.
 */
export type ShaderLanguage = "glsl300" | "glsl100" | "wgsl";

/**
 * Central registry for shader definitions.
 */
export class ShaderRegistry {
  private static _instance: ShaderRegistry;
  private _shaders: Map<string, ShaderDefinition> = new Map();
  private _providers: Map<string, ShaderProvider> = new Map();
  private _chunks: Map<string, Map<ShaderLanguage, string>> = new Map();

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
      console.debug(`[ShaderRegistry] Overwriting shader: ${definition.id}`);
    }
    this._shaders.set(definition.id, definition);
  }

  /**
   * Registers a provider that can supply a shader definition on demand.
   * @param id The shader ID.
   * @param provider The provider instance.
   */
  public registerProvider(id: string, provider: ShaderProvider): void {
    this._providers.set(id, provider);
  }

  /**
   * Gets a shader definition by its ID.
   * If not found, it checks if a provider is registered for this ID.
   * @param id The ID of the shader.
   * @returns The shader definition or undefined if not found.
   */
  public get(id: string): ShaderDefinition | undefined {
    let def = this._shaders.get(id);

    if (!def && this._providers.has(id)) {
      const provider = this._providers.get(id)!;
      def = provider.getShaderDefinition();
      this.register(def);
      this._providers.delete(id); // Move from provider to registered shader
    }

    return def;
  }

  /**
   * Registers a shader chunk for a specific language.
   * @param id The ID of the chunk (e.g., "LIGHTING_PHONG").
   * @param code The source code of the chunk.
   * @param lang The language of the code.
   */
  public registerChunk(id: string, code: string, lang: ShaderLanguage): void {
    if (!this._chunks.has(id)) {
      this._chunks.set(id, new Map());
    }
    this._chunks.get(id)!.set(lang, code);
  }

  /**
   * Gets a shader chunk by its ID and language.
   * @param id The ID of the chunk.
   * @param lang The language of the chunk.
   * @returns The source code of the chunk or undefined if not found.
   */
  public getChunk(id: string, lang: ShaderLanguage): string | undefined {
    return this._chunks.get(id)?.get(lang);
  }

  /**
   * Processes a shader source and replaces all chunk placeholders.
   * Placeholders are formatted as: [CHUNK_ID]
   * @param source The shader source code.
   * @param lang The language to use for chunks.
   * @returns The source code with all placeholders replaced.
   */
  public assemble(source: string, lang: ShaderLanguage): string {
    // Regex matches [CHUNK_NAME] but avoids [0-9] or single letters to not collide with GLSL array indexing
    return source.replace(/\[([A-Z][A-Z0-9_]+)\]/g, (match: string, chunkId: string) => {
      const chunk: string | undefined = this.getChunk(chunkId, lang);
      if (undefined === chunk) {
        console.warn(`[ShaderRegistry] Chunk not found for language ${lang}: ${chunkId}`);
        return match;
      }
      // Recursively assemble chunks in case chunks contain other chunks
      return this.assemble(chunk, lang);
    });
  }
}
