import { PostProcessingElement } from "../PostProcessingElement.js";
import { PostProcessingEffectType } from "../../../enums/index.js";
import { Color } from "../../../core/colors/index.js";

/**
 * Parametric color grading (contrast/saturation/temperature-tint/lift-gamma-gain), applied in
 * display-referred space after tone mapping. Distinct from the `filterMode` camera-look presets
 * (Night Vision, Noir, ...) -- this is an always-available continuous grading layer, not one of
 * those mutually exclusive stylized filters.
 */
export class ColorGradingElement extends PostProcessingElement {
  public readonly type = PostProcessingEffectType.COLOR_GRADING;

  /** Contrast around mid-gray pivot (default: 1.0, no change). */
  public contrast: number = 1.0;
  /** Saturation via luma mix (default: 1.0, no change; 0 = grayscale). */
  public saturation: number = 1.0;
  /** Warm/cool white-balance approximation, -1 (cool) to 1 (warm). Default: 0.0. */
  public temperature: number = 0.0;
  /** Green/magenta white-balance approximation, -1 (green) to 1 (magenta). Default: 0.0. */
  public tint: number = 0.0;
  /** Shadows color offset (ASC-CDL "lift"). Default: black (no change). */
  public lift: Color = new Color(0.0, 0.0, 0.0);
  /**
   * Midtones color power (ASC-CDL "gamma"). Default: white (no change). Not to be confused with
   * `ToneMappingElement.gamma`, which is the scalar display gamma correction.
   */
  public gamma: Color = new Color(1.0, 1.0, 1.0);
  /** Highlights color multiplier (ASC-CDL "gain"). Default: white (no change). */
  public gain: Color = new Color(1.0, 1.0, 1.0);
}
