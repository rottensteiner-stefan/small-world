/// src/core/ConfigLoader.ts
/**
 * Utility class for loading configuration files.
 */
export class ConfigLoader {
  /**
   * Loads a JSON configuration file from the given path.
   * @param path The path to the configuration file.
   * @returns A promise that resolves to the configuration object.
   */
  public static async load(path: string): Promise<unknown> {
    const response: Response = await fetch(path);
    return response.json();
  }
}
