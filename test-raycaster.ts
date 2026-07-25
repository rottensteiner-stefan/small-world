import { Raycaster } from "./src/physix/Raycaster.js";
import { Object3D } from "./src/core/Object3D.js";
import { Cube } from "./src/geometry/index.js";
import { Vector2D } from "./src/math/Vector2D.js";
import { Camera } from "./src/core/Camera.js";
import { PerspectiveProjection } from "./src/math/PerspectiveProjection.js";

const camera = new Camera(new PerspectiveProjection());
camera.position.set(0, 2, 10);
camera.updateProjectionMatrix();
camera.updateMatrixWorld();

const cube = new Object3D("test");
const geo = new Cube({ size: 1 });
cube.geometry = geo.getGeometryData();
cube.position.set(0, 0, 0); // At origin, camera is looking down -Z!
cube.isCollidable = true;
cube.updateMatrixWorld();
cube.computeBounds();

const rc = new Raycaster();
rc.setFromCamera(new Vector2D(0, 0), camera);

console.log("Ray:", rc.ray.origin, rc.ray.direction);
console.log("Bounds:", cube.bounds);

const hits = rc.intersectObjects([cube], true);
console.log("Hits:", hits);
