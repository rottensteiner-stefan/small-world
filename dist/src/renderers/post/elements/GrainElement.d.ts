import { PostProcessingElement } from '../PostProcessingElement.js';
import { PostProcessingEffectType } from '../../../enums/index.js';
export declare class GrainElement extends PostProcessingElement {
    readonly type = PostProcessingEffectType.GRAIN;
    /** Controls the intensity/opacity of the film grain (default: 0.05) */
    intensity: number;
}
