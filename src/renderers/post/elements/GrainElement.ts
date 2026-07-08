/// src/renderers/post/elements/GrainElement.ts
import { PostProcessingElement } from "../PostProcessingElement.js";
import { PostProcessingEffectType } from "../../../enums/index.js";

export class GrainElement extends PostProcessingElement {
  public readonly type = PostProcessingEffectType.GRAIN;

  /** Controls the intensity/opacity of the film grain (default: 0.05) */
  public intensity: number = 0.05;
}
