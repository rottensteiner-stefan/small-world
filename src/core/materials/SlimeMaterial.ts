import { FluidSurfaceMaterial, FluidSurfaceMaterialOptions } from "./FluidSurfaceMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";

export type SlimeMaterialOptions = FluidSurfaceMaterialOptions;

/**
 * Translucent, faintly-glowing slime preset on {@link FluidSurfaceMaterial} -- see
 * docs/adr/0013-unified-liquid-surface-material.md. A "flow family" sibling of
 * {@link OpenWaterMaterial}/{@link StylizedWaterMaterial} (the "wave family"): same noise-driven
 * flow mechanism, tuned for a thick, oozing, faintly luminous look instead of open water.
 */
export class SlimeMaterial extends FluidSurfaceMaterial {
  constructor(options: SlimeMaterialOptions = {}) {
    const {
      color = new Color(0.15, 0.55, 0.1),
      edgeColor = new Color(0.55, 0.9, 0.2),
      flowSpeed = 0.5,
      distortion = 2.5,
      viscosity = 9.0,
      emissiveColor = new Color(0.4, 0.9, 0.2),
      emissiveStrength = 0.15,
      ...rest
    } = options;

    super(
      {
        color,
        edgeColor,
        flowSpeed,
        distortion,
        viscosity,
        emissiveColor,
        emissiveStrength,
        ...rest,
      },
      MaterialType.SLIME,
    );

    this.transparent = true;
    this.depthWrite = false;
  }
}
