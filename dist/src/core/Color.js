export class Color {
    r;
    g;
    b;
    a;
    constructor(r = 1, g = 1, b = 1, a = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    toArray() {
        return [this.r, this.g, this.b, this.a];
    }
    clone() {
        return new Color(this.r, this.g, this.b, this.a);
    }
    // --- BASIS FARBEN ---
    static get WHITE() { return new Color(1, 1, 1, 1); }
    static get BLACK() { return new Color(0, 0, 0, 1); }
    static get RED() { return new Color(1, 0, 0, 1); }
    static get GREEN() { return new Color(0, 1, 0, 1); }
    static get BLUE() { return new Color(0, 0, 1, 1); }
    static get YELLOW() { return new Color(1, 1, 0, 1); }
    static get CYAN() { return new Color(0, 1, 1, 1); }
    static get MAGENTA() { return new Color(1, 0, 1, 1); }
    static get GRAY() { return new Color(0.5, 0.5, 0.5, 1); }
    // --- DEINE WÜNSCHE & WEB-COLORS ---
    static get DODGERBLUE() { return new Color(0.117, 0.564, 1, 1); }
    static get SPRINGGREEN() { return new Color(0, 1, 0.498, 1); }
    static get HOTPINK() { return new Color(1, 0.411, 0.705, 1); }
    static get ORANGE() { return new Color(1, 0.647, 0, 1); }
    static get GOLD() { return new Color(1, 0.843, 0, 1); }
    static get SKYBLUE() { return new Color(0.529, 0.807, 0.921, 1); }
    static get CRIMSON() { return new Color(0.862, 0.078, 0.235, 1); }
    static get SLATEBLUE() { return new Color(0.415, 0.352, 0.803, 1); }
    static get DARKSLATEGRAY() { return new Color(0.184, 0.309, 0.309, 1); }
    static get LIMEGREEN() { return new Color(0.196, 0.803, 0.196, 1); }
    static get FORESTGREEN() { return new Color(0.133, 0.545, 0.133, 1); }
    static get MIDNIGHTBLUE() { return new Color(0.098, 0.098, 0.439, 1); }
    static get PURPLE() { return new Color(0.501, 0, 0.501, 1); }
    static get TEAL() { return new Color(0, 0.501, 0.501, 1); }
    static get OLIVE() { return new Color(0.501, 0.501, 0, 1); }
    static get SILVER() { return new Color(0.752, 0.752, 0.752, 1); }
}
//# sourceMappingURL=Color.js.map