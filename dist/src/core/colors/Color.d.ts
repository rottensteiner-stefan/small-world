export declare class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r: number, g: number, b: number, a?: number);
    static get WHITE(): Color;
    static get BLACK(): Color;
    static get RED(): Color;
    static get GREEN(): Color;
    static get BLUE(): Color;
    static get LIME(): Color;
    static get ORANGE(): Color;
    static get DODGERBLUE(): Color;
    static get SKYBLUE(): Color;
    static get LIGHTSTEELBLUE(): Color;
    static get DARKSLATEGRAY(): Color;
    static get GRAY(): Color;
    static get YELLOW(): Color;
    toArray(): number[];
}
