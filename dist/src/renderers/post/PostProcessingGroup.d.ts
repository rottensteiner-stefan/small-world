import { PostProcessingElement } from './PostProcessingElement.js';
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
     * Retrieves an element by its type name.
     * @param type The type name (e.g. "Vignette")
     */
    get<T extends PostProcessingElement>(type: string): T | undefined;
    /**
     * Removes an element by its type name.
     * @param type The type name
     */
    remove(type: string): boolean;
}
