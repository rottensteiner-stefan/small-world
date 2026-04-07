/// src/core/Skydome.ts

import { Sphere } from "../geometry/index.js";
import { Object3D } from "./Object3D.js";
import { BasicMaterial } from "./materials/index.js";
import { Texture } from "./textures/index.js";

/**
 * Configuration options for the Skydome.
 */
export interface SkydomeOptions {
  /** The texture to use for the skydome. */
  texture: Texture;
  /** The radius of the skydome. Defaults to 100. */
  radius?: number;
  /** The number of width segments. Defaults to 32. */
  widthSegments?: number;
  /** The number of height segments. Defaults to 32. */
  heightSegments?: number;
}

/**
 * A skydome that surrounds the scene using a spherical geometry.
 */
export class Skydome extends Object3D {
  declare material: BasicMaterial;
  /**
   * Creates a new Skydome.
   * @param options The configuration options for the skydome.
   */
  constructor(options: SkydomeOptions) {
    super("Skydome");

    const {
      texture,
      radius = 100,
      widthSegments = 32,
      heightSegments = 32,
    } = options;

    this.geometry = new Sphere({
      radius,          // Nutzt den destrukturierten Wert oder Default (100)
      widthSegments,   // Nutzt den destrukturierten Wert oder Default (32)
      heightSegments,  // Nutzt den destrukturierten Wert oder Default (32)
    }).getGeometryData();

    this.material = new BasicMaterial();
    this.material.color.set(1, 1, 1);
    this.material.diffuseMap = texture;

    this.frustumCulled = false;
  }
}
