/**
 * Defines how the horizontal input keys (A/D) behave.
 */
export declare const InputMode: {
    /** A/D keys move the object/camera sideways. */
    readonly STRAFE: "strafe";
    /** A/D keys rotate the object/camera left/right (Tank Controls). */
    readonly TANK: "tank";
};
/**
 * Type for InputMode values.
 */
export type InputMode = (typeof InputMode)[keyof typeof InputMode];
