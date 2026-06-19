import { ToneMappingElement, VignetteElement, GrainElement, BloomElement, } from "./PostProcessingElement.js";
/**
 * A logical grouping of post-processing elements.
 * Currently acts as a "Global Volume", applying its elements to the entire scene.
 * In the future, this can be extended into a spatial BoundingVolume for local overrides.
 */
export class PostProcessingGroup {
    /** If false, the entire post-processing group is bypassed. */
    enabled = false;
    /** Currently always true (Global Volume). */
    isGlobal = true;
    _elements = new Map();
    constructor() {
        // Add defaults so when enabled, it behaves like before
        this.add(new ToneMappingElement());
        this.add(new VignetteElement());
        this.add(new GrainElement());
        this.add(new BloomElement());
    }
    /**
     * Adds or overwrites a post-processing element in this group.
     * @param element The element to add (e.g. VignetteElement)
     */
    add(element) {
        this._elements.set(element.type, element);
        return this;
    }
    /**
     * Get an element by its type.
     * @param type The type
     */
    get(type) {
        return this._elements.get(type);
    }
    /**
     * Removes an element by its type.
     */
    delete(type) {
        return this._elements.delete(type);
    }
}
//# sourceMappingURL=PostProcessingGroup.js.map