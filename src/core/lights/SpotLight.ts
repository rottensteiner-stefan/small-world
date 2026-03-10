import { Object3D } from "../Object3D.js";
import { Color } from "../colors/Color.js";
import { Vector3D } from "../../math/Vector3D.js";

export class SpotLight extends Object3D {
    public direction: Vector3D = new Vector3D(0, -1, 0);

    constructor(
        public color: Color = Color.WHITE,
        public intensity: number = 1.0,
        public distance: number = 50.0,
        public angle: number = Math.PI / 6, // 30 Grad Kegel
        public penumbra: number = 0.5,      // 0 = harte Kante, 1 = extrem weich
        public decay: number = 2.0
    ) {
        super("SpotLight");
    }
}