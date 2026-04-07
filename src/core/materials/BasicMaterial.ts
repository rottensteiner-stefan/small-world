/// src/core/materials/BasicMaterial.ts
import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/index.js";

import { Texture } from "../textures/index.js";

/**
 * A basic material that only uses a flat color.
 */
export class BasicMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.BASIC;

  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;
}
