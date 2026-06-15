import {
  PostProcessingElement,
  ToneMappingElement,
  VignetteElement,
  GrainElement,
} from "./PostProcessingElement.js";
import { PostProcessingEffectType } from "../../enums/index.js";

/**
 * A logical grouping of post-processing elements.
 * Currently acts as a "Global Volume", applying its elements to the entire scene.
 * In the future, this can be extended into a spatial BoundingVolume for local overrides.
 */
export class PostProcessingGroup {
  /** If false, the entire post-processing group is bypassed. */
  public enabled: boolean = false;

  /** Currently always true (Global Volume). */
  public isGlobal: boolean = true;

  private _elements: Map<PostProcessingEffectType, PostProcessingElement> = new Map();

  constructor() {
    // Add defaults so when enabled, it behaves like before
    this.add(new ToneMappingElement());
    this.add(new VignetteElement());
    this.add(new GrainElement());
  }

  /**
   * Adds or overwrites a post-processing element in this group.
   * @param element The element to add (e.g. VignetteElement)
   */
  public add(element: PostProcessingElement): this {
    this._elements.set(element.type, element);
    return this;
  }

  /**
   * Get an element by its type.
   * @param type The type
   */
  public get<T extends PostProcessingElement>(type: PostProcessingEffectType): T | undefined {
    return this._elements.get(type) as T;
  }

  /**
   * Removes an element by its type.
   */
  public delete(type: PostProcessingEffectType): boolean {
    return this._elements.delete(type);
  }
}
