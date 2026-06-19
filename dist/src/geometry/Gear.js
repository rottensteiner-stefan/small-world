/// src/geometry/Gear.ts
import { ExtrudeGeometry } from "./ExtrudeGeometry.js";
import { Vector2D, MathUtils } from "../math/index.js";
/**
 * Procedural Gear Geometry based on isosceles trapezoidal teeth.
 * @see Please refer to `REFERENCES.md#gear-zahnrad` for the underlying tooth calculation formulas.
 */
export class Gear extends ExtrudeGeometry {
    teeth;
    innerRadius;
    toothHeight;
    holeRadius;
    vRatio;
    constructor(options = {}) {
        const { teeth = 10, innerRadius = 1.0, toothHeight = 0.5, holeRadius = innerRadius / 4.0, vRatio = 0.5, thickness = 0.5, } = options;
        const { shape, innerShape } = Gear._generateShapes(teeth, innerRadius, toothHeight, holeRadius, vRatio);
        super({ shape, innerShape, depth: thickness });
        this.teeth = teeth;
        this.innerRadius = innerRadius;
        this.toothHeight = toothHeight;
        this.holeRadius = holeRadius;
        this.vRatio = vRatio;
    }
    /**
     * Generates the 2D contour of the gear and its inner hole.
     */
    static _generateShapes(teeth, r, i, holeRadius, v) {
        const shape = [];
        const innerShape = [];
        const R = r + i;
        // Circumference base calculation for ratio
        const a = (MathUtils.TWO_PI * r * v) / (teeth * (v + 1.0));
        const b = a / v;
        const alphaBase = b / (2.0 * r);
        const alphaTop = a / (2.0 * R);
        const deltaTheta = MathUtils.TWO_PI / teeth;
        for (let k = 0; teeth > k; k++) {
            const theta = k * deltaTheta;
            // Point 1: Right base corner
            shape.push(new Vector2D(r * Math.cos(theta - alphaBase), r * Math.sin(theta - alphaBase)));
            // Point 2: Right top corner
            shape.push(new Vector2D(R * Math.cos(theta - alphaTop), R * Math.sin(theta - alphaTop)));
            // Point 3: Left top corner
            shape.push(new Vector2D(R * Math.cos(theta + alphaTop), R * Math.sin(theta + alphaTop)));
            // Point 4: Left base corner
            shape.push(new Vector2D(r * Math.cos(theta + alphaBase), r * Math.sin(theta + alphaBase)));
            // Inner shape (Hole) points at the same angles
            innerShape.push(new Vector2D(holeRadius * Math.cos(theta - alphaBase), holeRadius * Math.sin(theta - alphaBase)));
            innerShape.push(new Vector2D(holeRadius * Math.cos(theta - alphaTop), holeRadius * Math.sin(theta - alphaTop)));
            innerShape.push(new Vector2D(holeRadius * Math.cos(theta + alphaTop), holeRadius * Math.sin(theta + alphaTop)));
            innerShape.push(new Vector2D(holeRadius * Math.cos(theta + alphaBase), holeRadius * Math.sin(theta + alphaBase)));
        }
        return { shape, innerShape };
    }
}
//# sourceMappingURL=Gear.js.map