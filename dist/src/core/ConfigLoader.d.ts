/**
 * Utility class for loading configuration files.
 */
export declare class ConfigLoader {
    /**
     * Loads a JSON configuration file from the given path.
     * @param path The path to the configuration file.
     * @returns A promise that resolves to the configuration object.
     */
    static load(path: string): Promise<unknown>;
}
