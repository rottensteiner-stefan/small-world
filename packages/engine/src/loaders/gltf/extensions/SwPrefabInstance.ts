import { GltfExtensionPlugin } from "../GltfExtensionPlugin.js";

/**
 * `SW_prefab_instance` -- provenance-only record of the Maker prefab a node was instantiated
 * from (see `Object3D.prefabSource`'s own doc comment and ADR 0010 Phase 2). Purely field-based:
 * no root-level data, no class decision, just a plain string read onto/written from an already
 * existing `Object3D`.
 */
export const swPrefabInstance: GltfExtensionPlugin = {
  name: "SW_prefab_instance",

  applyNode(obj, nodeDef) {
    const source = nodeDef.extensions?.SW_prefab_instance?.source;
    if (source) obj.prefabSource = source;
  },

  writeNode(obj, node) {
    if (obj.prefabSource) {
      node.extensions = { ...node.extensions, SW_prefab_instance: { source: obj.prefabSource } };
    }
  },
};
