import fragGLSL from "./OilSlick.frag.glsl?raw";
import fragGLSL100 from "./OilSlick.frag.glsl100?raw";
import fragWGSL from "./OilSlick.frag.wgsl?raw";
import { AbstractMaterial } from "../../../../core/materials/AbstractMaterial.js";
import { Color } from "../../../../core/colors/index.js";
import {
  RenderManifest,
  ShaderDefinition,
  StandardWebGPULayout,
} from "../../../../core/renderers/shaders/index.js";
import { ShaderPropertyType } from "../../../../enums/index.js";
import { Vector2D } from "../../../../math/index.js";

/**
 * Configuration options for {@link OilSlickMaterial}.
 */
export interface OilSlickMaterialOptions {
  /** The base colour of the settled oil. Defaults to a near-black, faintly warm brown. */
  color?: Color;
  /** Tint of the dynamic specular highlight and the fixed drip-point glow (both read as "the
   * warm sheen of the oil catching light"). Defaults to a warm amber. */
  highlightColor?: Color;
  /** Specular tightness for the dynamic light highlight. Higher = smaller, glassier glint.
   * Defaults to 180. */
  shininess?: number;
  /** How strongly the muted thin-film iridescence tints the fresnel rim, 0-1. Defaults to 0.3 --
   * matches the "restrained sheen, not a rainbow" look established for this style. */
  iridescenceStrength?: number;
  /** Local UV-space (0-1) position of the fixed warm glow, i.e. where the oil actually drips
   * from. Defaults to (0.5, 0.22). */
  highlightPoint?: Vector2D;
  /** Falloff radius (UV units) of the fixed drip-point glow. Defaults to 0.22. */
  highlightRadius?: number;
  /** Intensity of the fixed drip-point glow. Defaults to 0.35. */
  highlightIntensity?: number;
  /** Base radius (UV units, before noise) of the organic splatter shape. Defaults to 0.32. */
  splatterBaseRadius?: number;
  /** Noise amplitude (UV units) added to the splatter edge for an irregular, non-circular
   * silhouette. Defaults to 0.12. */
  splatterNoiseAmp?: number;
  /** Width of the ink outline ring that extends beyond the oil silhouette onto the floor (UV units).
   * Defaults to 0.035. */
  outlineWidth?: number;
  /** Opacity of the outer ink outline ring, 0-1. Defaults to 0.85. */
  outlineAlpha?: number;
  /** Strength of the synthetic meniscus rim (normal perturbation at the edge), 0-1. Defaults to
   * 0.65 -- the rim catches dynamic light as a curved glint. */
  meniscusStrength?: number;
  /** How strongly the warm core colour fades to deep ink black toward the edges of the oil body, 0-1.
   * Defaults to 0.95. */
  rimDarkening?: number;
  /** How much of the real, captured floor color (tinted dark by the oil) shows through at the
   * puddle's thin rim, instead of the flat procedural ink-black edge, 0-1. 0 keeps the original
   * flat edge; 1 makes the rim read as fully translucent oil film over the actual pavement.
   * Defaults to 0.6. See `.agents/notes/oil-shader-roadmap.md` Phase 1. */
  floorVisibility?: number;
}

/**
 * A settled, viscous oil puddle: muted thin-film iridescence and a real dynamic specular
 * highlight (driven by the scene's actual lights, e.g. a wall lamp) for the "hard glassy glint",
 * plus a fixed warm glow pooling at the drip point, for the "Graphic Noir" look established for
 * `character-diorama`. Deliberately has NO vertex displacement or spreading/rippling animation --
 * unlike showcase 12's `OilPuddleMaterial` (built for raindrop-style impact ripples), this is a
 * thick, settled pool that never moves; only its thin-film shimmer drifts slowly. See
 * `docs/adr/` water/liquid material family for the wider context.
 */
export class OilSlickMaterial extends AbstractMaterial {
  /** The base colour of the settled oil. */
  public override color: Color;
  /** Tint of the specular highlight and the fixed drip-point glow. */
  public highlightColor: Color;
  /** Specular tightness for the dynamic light highlight. */
  public shininess: number;
  /** Strength of the muted thin-film iridescence, 0-1. */
  public iridescenceStrength: number;
  /** Local UV-space position of the fixed drip-point glow. */
  public highlightPoint: Vector2D;
  /** Falloff radius (UV units) of the fixed drip-point glow. */
  public highlightRadius: number;
  /** Intensity of the fixed drip-point glow. */
  public highlightIntensity: number;
  /** Base radius (UV units) of the organic splatter shape. */
  public splatterBaseRadius: number;
  /** Noise amplitude (UV units) of the splatter edge. */
  public splatterNoiseAmp: number;
  /** Width of the ink outline ring extending beyond the oil silhouette (UV units). */
  public outlineWidth: number;
  /** Opacity of the outer ink outline ring, 0-1. */
  public outlineAlpha: number;
  /** Strength of the synthetic meniscus rim (edge normal perturbation), 0-1. */
  public meniscusStrength: number;
  /** How strongly the core colour darkens to ink black toward the edges, 0-1. */
  public rimDarkening: number;
  /** How much of the real, captured floor color shows through at the puddle's thin rim, 0-1. */
  public floorVisibility: number;
  /** Current time/frame, advanced externally by the scene's update loop -- drives only the slow
   * thin-film shimmer, nothing spatial. */
  public time: number = 0;

  constructor(options: OilSlickMaterialOptions = {}) {
    super("AND_NOW_OIL_SLICK");
    const {
      color = new Color(0.035, 0.028, 0.022, 0.95),
      highlightColor = new Color(1.0, 0.62, 0.28),
      shininess = 180,
      iridescenceStrength = 0.3,
      highlightPoint = new Vector2D(0.5, 0.22),
      highlightRadius = 0.22,
      highlightIntensity = 0.35,
      splatterBaseRadius = 0.32,
      splatterNoiseAmp = 0.12,
      outlineWidth = 0.035,
      outlineAlpha = 0.85,
      meniscusStrength = 0.65,
      rimDarkening = 0.95,
      floorVisibility = 0.6,
    } = options;

    this.color = color;
    this.highlightColor = highlightColor;
    this.shininess = shininess;
    this.iridescenceStrength = iridescenceStrength;
    this.highlightPoint = highlightPoint;
    this.highlightRadius = highlightRadius;
    this.highlightIntensity = highlightIntensity;
    this.splatterBaseRadius = splatterBaseRadius;
    this.splatterNoiseAmp = splatterNoiseAmp;
    this.outlineWidth = outlineWidth;
    this.outlineAlpha = outlineAlpha;
    this.meniscusStrength = meniscusStrength;
    this.rimDarkening = rimDarkening;
    this.floorVisibility = floorVisibility;

    this.transparent = true;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = this._createBaseManifest();
      // Left undefined so the renderer falls back to its live-captured opaque colour texture
      // (see WebGL2Renderer/WebGL1Renderer's u_opaqueMap sampler-bind fallback and
      // WebGPURenderer's equivalent) -- gives the puddle's thin rim a real view of the actual
      // floor beneath it instead of only a flat procedural edge colour.
      this._renderManifest.textures["u_opaqueMap"] = undefined;
    }
    this._syncBaseManifestState();

    const props = this._renderManifest.properties as Record<string, unknown>;

    props["u_specColor"] = this.highlightColor.toFloat32Array();
    props["u_shininess"] = this.shininess;
    // u_isTerrain is otherwise unused by this material (no terrain blending) -- repurposed to
    // carry floorVisibility, same "borrow a free named slot" convention LiquidWaveMaterial uses.
    props["u_isTerrain"] = this.floorVisibility;
    props["u_extraParams"] = [
      this.time,
      this.iridescenceStrength,
      this.highlightPoint.x,
      this.highlightPoint.y,
    ];
    props["u_liquidParams"] = [
      this.highlightRadius,
      this.highlightIntensity,
      this.splatterBaseRadius,
      this.splatterNoiseAmp,
    ];
    props["u_thresholds"] = [
      this.outlineWidth,
      this.outlineAlpha,
      this.meniscusStrength,
      this.rimDarkening,
    ];

    return this._renderManifest;
  }

  /** @inheritdoc */
  public override getShaderDefinition(): ShaderDefinition {
    return {
      id: "AND_NOW_OIL_SLICK",
      sources: {
        glsl300: {
          vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]",
          fs: fragGLSL,
        },
        glsl100: {
          vs: "[BASE_VS]",
          fs: fragGLSL100,
        },
        wgsl: `[WGSL_STRUCTS]\n[WGSL_PBR_MATH]\n[WGSL_VS]\n${fragWGSL}`,
      },
      layout: {
        ...StandardWebGPULayout,
        textures: {
          ...StandardWebGPULayout.textures,
          u_opaqueMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }
}
