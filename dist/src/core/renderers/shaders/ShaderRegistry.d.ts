import { ShaderDefinition } from './ShaderDefinition.js';
import { ShaderProvider } from '../../../interfaces/index.js';
/**
 * Supported shader languages.
 */
export type ShaderLanguage = "glsl300" | "glsl100" | "wgsl";
/**
 * Central registry for shader definitions.
 */
export declare class ShaderRegistry {
    private static _instance;
    private _shaders;
    private _providers;
    private _chunks;
    private constructor();
    /**
     * Gets the singleton instance of the ShaderRegistry.
     * @returns The instance.
     */
    static get instance(): ShaderRegistry;
    /**
     * Registers a new shader definition.
     * @param definition The shader definition to register.
     */
    register(definition: ShaderDefinition): void;
    /**
     * Registers a provider that can supply a shader definition on demand.
     * @param id The shader ID.
     * @param provider The provider instance.
     */
    registerProvider(id: string, provider: ShaderProvider): void;
    /**
     * Gets a shader definition by its ID.
     * If not found, it checks if a provider is registered for this ID.
     * @param id The ID of the shader.
     * @returns The shader definition or undefined if not found.
     */
    get(id: string): ShaderDefinition | undefined;
    /**
     * Registers a shader chunk for a specific language.
     * @param id The ID of the chunk (e.g., "LIGHTING_PHONG").
     * @param code The source code of the chunk.
     * @param lang The language of the code.
     */
    registerChunk(id: string, code: string, lang: ShaderLanguage): void;
    /**
     * Gets a shader chunk by its ID and language.
     * @param id The ID of the chunk.
     * @param lang The language of the chunk.
     * @returns The source code of the chunk or undefined if not found.
     */
    getChunk(id: string, lang: ShaderLanguage): string | undefined;
    /**
     * Processes a shader source and replaces all chunk placeholders.
     * Placeholders are formatted as: [CHUNK_ID]
     * @param source The shader source code.
     * @param lang The language to use for chunks.
     * @returns The source code with all placeholders replaced.
     */
    assemble(source: string, lang: ShaderLanguage): string;
}
