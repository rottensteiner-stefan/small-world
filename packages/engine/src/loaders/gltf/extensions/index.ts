import { registerGltfExtension } from "../GltfExtensionRegistry.js";
import { khrLightsPunctual } from "./KhrLightsPunctual.js";
import { swPrefabInstance } from "./SwPrefabInstance.js";
import { swStageZone } from "./SwStageZone.js";

registerGltfExtension(khrLightsPunctual);
registerGltfExtension(swPrefabInstance);
registerGltfExtension(swStageZone);

export { khrLightsPunctual, swPrefabInstance, swStageZone };
