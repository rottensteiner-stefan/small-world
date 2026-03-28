/// src/core/Skybox.ts

import { Cube } from "../geometry/Cube.js";
import { CubeTexture } from "./textures/index.js";
import { Object3D } from "./Object3D.js";
import { SkyboxMaterial } from "./materials/index.js";

/**
 * A skybox that surrounds the scene.
 */
export class Skybox extends Object3D {
  /**
   * Creates a new Skybox.
   * @param source An array of paths to the cube map textures or a CubeTexture instance.
   * @param size The size of the skybox cube.
   */
  constructor(source: string[] | CubeTexture, size: number = 100) {
    super("Skybox");

    this.geometry = new Cube(size).getGeometryData();

    let cubeMap: CubeTexture;
    if (Array.isArray(source)) {
      cubeMap = new CubeTexture(source);
    } else {
      cubeMap = source;
    }

    this.material = new SkyboxMaterial({ cubeMap });
    this.frustumCulled = false;
  }
}
