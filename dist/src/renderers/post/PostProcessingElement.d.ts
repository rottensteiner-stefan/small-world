import { PostProcessingEffectType } from '../../enums/index.js';
/**
 * Base class for a post-processing element (effect).
 */
export declare abstract class PostProcessingElement {
    /** If false, the effect will be bypassed (cheap). */
    enabled: boolean;
    /** Unique string identifier for the effect. */
    abstract readonly type: PostProcessingEffectType;
}
