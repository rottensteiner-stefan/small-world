import { Projection } from "./Projection.js";
import { Matrix4 } from "../Matrix4.js";
export class OrthographicProjection extends Projection {
    l;
    r;
    b;
    t;
    n;
    f;
    constructor(l, r, b, t, n, f) {
        super();
        this.l = l;
        this.r = r;
        this.b = b;
        this.t = t;
        this.n = n;
        this.f = f;
        this.update();
    }
    update() {
        Matrix4.orthographic(this.l, this.r, this.b, this.t, this.n, this.f, this.matrix);
    }
    getMatrix() {
        return this.matrix;
    }
}
//# sourceMappingURL=OrthographicProjection.js.map