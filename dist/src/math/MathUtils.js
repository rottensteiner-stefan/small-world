export class MathUtils {
    static SIN_TABLE = new Float32Array(3600);
    static COS_TABLE = new Float32Array(3600);
    static isInit = false;
    static init() {
        if (this.isInit)
            return;
        for (let i = 0; i < 3600; i++) {
            const rad = (i / 10) * (Math.PI / 180);
            this.SIN_TABLE[i] = Math.sin(rad);
            this.COS_TABLE[i] = Math.cos(rad);
        }
        this.isInit = true;
    }
    static fastSin(rad) {
        let deg = (rad * 572.957) | 0;
        deg = ((deg % 3600) + 3600) % 3600;
        return this.SIN_TABLE[deg];
    }
}
//# sourceMappingURL=MathUtils.js.map