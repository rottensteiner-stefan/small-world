import { SmallWorld } from "../src/core/SmallWorld.js";
import { Scene } from "../src/core/Scene.js";
import { Object3D } from "../src/core/Object3D.js";
import { Color } from "../src/core/Color.js";
import { Cube } from "../src/geometry/Cube.js";
import { Sphere } from "../src/geometry/Sphere.js";
import { Grid } from "../src/geometry/Grid.js";
import { Camera, CameraStrategy } from "../src/core/Camera.js";
import { PerspectiveProjection } from "../src/math/projections/PerspectiveProjection.js";
import { Matrix4 } from "../src/math/Matrix4.js";
import { Input } from "../src/core/Input.js";

async function start() {
  Input.init();
  const sw = new SmallWorld();
  await sw.init("./config/small-world.json");
  const WORLD_SIZE = sw.config.worldSize;

  sw.activeRenderer.setSize(window.innerWidth, window.innerHeight);
  const scene = new Scene();

  // Boden-Gitter (Konstante statt String)
  const grid = new Object3D();
  grid.geometry = new Grid(WORLD_SIZE, 50).getPrimitiveData();
  grid.color = Color.DARKSLATEGRAY;
  scene.add(grid);

  // Spieler
  const player = new Object3D();
  player.geometry = new Cube(1.5).getPrimitiveData();
  player.color = Color.ORANGE;
  scene.add(player);

  // Kugeln mit verschiedenen Konstanten
  const sphereColors = [
    Color.DODGERBLUE,
    Color.SPRINGGREEN,
    Color.HOTPINK,
    Color.GOLD,
    Color.CRIMSON,
  ];

  const sData = new Sphere(0.6, 12).getPrimitiveData();
  for (let i = 0; i < 30; i++) {
    const s = new Object3D();
    s.geometry = sData;
    s.position = [Math.random() * 40 - 20, 0, Math.random() * 40 - 20];
    s.color = sphereColors[Math.floor(Math.random() * sphereColors.length)];
    scene.add(s);
  }

  const cam = new Camera(
    new PerspectiveProjection(Math.PI / 4, window.innerWidth / window.innerHeight, 0.1, 200),
  );
  const vM = new Matrix4(),
    vpM = new Matrix4();

  function loop() {
    const speed = 0.2;
    player.position[0] += Input.getAxis("KeyA", "KeyD") * speed;
    player.position[2] += Input.getAxis("KeyW", "KeyS") * speed;

    let dx = 0,
      dy = 0;
    if (Input.mouse.right) {
      dx = Input.mouse.dx;
      dy = Input.mouse.dy;
    }
    cam.update(player.position, dx, dy);
    Input.mouse.dx = 0;
    Input.mouse.dy = 0;

    scene.update();
    Matrix4.lookAt(cam.position, cam.target, cam.up, vM);
    cam.getViewProjection(vM, vpM);

    sw.activeRenderer.render(scene, vpM.data);
    requestAnimationFrame(loop);
  }
  loop();
}
start();
