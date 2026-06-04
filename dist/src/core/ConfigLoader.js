/// src/core/ConfigLoader.ts
import { AssetManager } from "../loaders/AssetManager.js";
/**
 * Utility class for loading configuration files.
 */
export class ConfigLoader {
    /**
     * Loads a JSON configuration file from the given path.
     * @param path The path to the configuration file.
     * @returns A promise that resolves to the configuration object.
     */
    static async load(path) {
        const text = await AssetManager.loadText(path);
        return JSON.parse(text);
    }
}
//# sourceMappingURL=ConfigLoader.js.map