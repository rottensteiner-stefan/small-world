import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/MaterialType.js";
export class SkyboxMaterial extends AbstractMaterial {
    type = MaterialType.SKYBOX;
    cubeMap = null;
}
//# sourceMappingURL=SkyboxMaterial.js.map