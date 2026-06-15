import { PostProcessingElement } from './PostProcessingElement.js';
import { PostProcessingEffectType } from '../../enums/index.js';
/**
 * A logical grouping of post-processing elements.
 * Currently acts as a "Global Volume", applying its elements to the entire scene.
 * In the future, this can be extended into a spatial BoundingVolume for local overrides.
 */
export declare class PostProcessingGroup {
    /** If false, the entire post-processing group is bypassed. */
    enabled: boolean;
    /** Currently always true (Global Volume). */
    isGlobal: boolean;
    private _elements;
    constructor();
    /**
     * Adds or overwrites a post-processing element in this group.
     * @param element The element to add (e.g. VignetteElement)
     */
    add(element: PostProcessingElement): this;
    /**
     * Get an element by its type.
     * @param type The type
     */
    get<T extends PostProcessingElement>(type: PostProcessingEffectType): T | undefined;
    /**
     * Removes an element by its type.
     */
    delete(type: PostProcessingEffectType): boolean;
}
