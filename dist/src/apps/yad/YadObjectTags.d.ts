/**
 * Typed tags for identifying Yad gameplay objects via `Object3D.tag`,
 * used instead of matching on `Object3D.name` prefixes.
 */
export declare const YadObjectTags: {
    readonly ENEMY: "enemy";
    readonly DEAD_ENEMY: "deadEnemy";
    readonly ITEM: "item";
    readonly DOOR: "door";
    readonly LAVA: "lava";
    readonly SLIME: "slime";
};
export type YadObjectTag = (typeof YadObjectTags)[keyof typeof YadObjectTags];
