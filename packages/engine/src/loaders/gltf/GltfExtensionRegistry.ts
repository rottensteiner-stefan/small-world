import { GltfExtensionPlugin } from "./GltfExtensionPlugin.js";

const registry: GltfExtensionPlugin[] = [];

/** Registers a glTF extension plugin so `GltfLoader`/`WorldWriter` pick it up automatically --
 * see ADR 0017. Built-in extensions self-register via a side-effect import of
 * `./extensions/index.js`; a consumer can register additional ones (e.g. from a separate
 * `@small-world/gltf-extensions`-style package) the exact same way. */
export function registerGltfExtension(plugin: GltfExtensionPlugin): void {
  registry.push(plugin);
}

export function getGltfExtensions(): readonly GltfExtensionPlugin[] {
  return registry;
}
