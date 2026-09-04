import { FluidSurfaceMaterial, FluidSurfaceMaterialOptions } from "./FluidSurfaceMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";

export type LavaMaterialOptions = FluidSurfaceMaterialOptions;

/**
 * Opaque, glowing molten-rock preset on {@link FluidSurfaceMaterial} -- see
 * docs/adr/0013-unified-liquid-surface-material.md. A "flow family" sibling of
 * {@link OpenWaterMaterial}/{@link StylizedWaterMaterial} (the "wave family"): same noise-driven
 * flow mechanism, opaque and emissive instead of transparent and refractive.
 */
export class LavaMaterial extends FluidSurfaceMaterial {
  constructor(options: LavaMaterialOptions = {}) {
    const {
      color = new Color(0.25, 0.03, 0.0),
      edgeColor = new Color(0.15, 0.02, 0.0),
      flowSpeed = 0.3,
      distortion = 1.2,
      viscosity = 14.0,
      emissiveColor = new Color(1.0, 0.35, 0.05),
      emissiveStrength = 1.8,
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
      MaterialType.LAVA,
    );

    this.transparent = false;
    this.depthWrite = true;
  }
}
