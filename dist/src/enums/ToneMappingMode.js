/// src/enums/ToneMappingMode.ts
/**
 * Supported tone mapping algorithms.
 */
export var ToneMappingMode;
(function (ToneMappingMode) {
    /** No tone mapping (Linear) */
    ToneMappingMode[ToneMappingMode["NONE"] = 0] = "NONE";
    /** Reinhard tone mapping */
    ToneMappingMode[ToneMappingMode["REINHARD"] = 1] = "REINHARD";
    /** Cineon tone mapping */
    ToneMappingMode[ToneMappingMode["CINEON"] = 2] = "CINEON";
    /** ACES Filmic tone mapping */
    ToneMappingMode[ToneMappingMode["ACES_FILMIC"] = 3] = "ACES_FILMIC";
})(ToneMappingMode || (ToneMappingMode = {}));
//# sourceMappingURL=ToneMappingMode.js.map