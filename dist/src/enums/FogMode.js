/// src/enums/FogMode.ts
/**
 * Defines the mathematical mode used for calculating fog density.
 */
export var FogMode;
(function (FogMode) {
    /** No fog applied. */
    FogMode[FogMode["NONE"] = 0] = "NONE";
    /** Linear fog increasing between a near and far distance. */
    FogMode[FogMode["LINEAR"] = 1] = "LINEAR";
    /** Exponential fog simulating physical light scattering. */
    FogMode[FogMode["EXP"] = 2] = "EXP";
    /** Squared exponential fog for a sharper, more dramatic drop-off. */
    FogMode[FogMode["EXP2"] = 3] = "EXP2";
})(FogMode || (FogMode = {}));
//# sourceMappingURL=FogMode.js.map