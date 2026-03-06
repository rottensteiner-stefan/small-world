export class Color {
    r;
    g;
    b;
    a;
    constructor(r, g, b, a = 1.0) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    static get WHITE() {
        return new Color(1, 1, 1);
    }
    static get BLACK() {
        return new Color(0, 0, 0);
    }
    static get RED() {
        return new Color(1, 0, 0);
    }
    static get GREEN() {
        return new Color(0, 1, 0);
    }
    static get BLUE() {
        return new Color(0, 0, 1);
    }
    static get ORANGE() {
        return new Color(1, 0.5, 0);
    }
    static get DODGERBLUE() {
        return new Color(0.12, 0.56, 1);
    }
    static get SKYBLUE() {
        return new Color(0.53, 0.81, 0.92);
    }
    static get LIGHTSTEELBLUE() {
        return new Color(0.69, 0.77, 0.87);
    }
    static get DARKSLATEGRAY() {
        return new Color(0.18, 0.31, 0.31);
    }
    static get GRAY() {
        return new Color(0.5, 0.5, 0.5);
    }
    static get YELLOW() {
        return new Color(1, 1, 0);
    }
    toArray() {
        return [this.r, this.g, this.b, this.a];
    }
}
//# sourceMappingURL=Color.js.map