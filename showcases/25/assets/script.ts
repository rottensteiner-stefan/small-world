import {
  Scene,
  PerspectiveCamera,
  WebGPURenderer,
  OpenWaterMaterial,
  Mesh,
  Color,
  DirectionalLight,
  Plane,
  Vector3,
} from "../../../src/index.js";
import { OrbitCameraStrategy } from "../../../src/core/cameras/strategies/OrbitCameraStrategy.js";

async function init() {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  const renderer = new WebGPURenderer(canvas);
  await renderer.init();

  const scene = new Scene();
  scene.clearColor = new Color(0.5, 0.7, 0.9);

  const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 20);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.setStrategy(new OrbitCameraStrategy(camera, canvas));

  const light = new DirectionalLight(new Color(1.0, 1.0, 1.0), 1.0);
  light.position.set(10, 20, 10);
  scene.add(light);

  const material = new OpenWaterMaterial({
    waterColor: new Color(0.0, 0.4, 0.8),
    deepWaterColor: new Color(0.0, 0.1, 0.3),
    edgeColor: new Color(0.8, 0.9, 1.0),
    edgeSoftness: 1.0,
    speed: 1.0,
    wave1: [1.0, 0.5, 0.1, 10.0],
    wave2: [0.2, 0.8, 0.15, 6.0],
    wave3: [-0.3, 0.7, 0.05, 3.0],
  });

  const planeGeom = new Plane(100, 100, 128, 128);
  const plane = new Mesh(planeGeom, material);
  scene.add(plane);

  let time = 0;
  const loop = () => {
    time += 0.01;
    material.time = time;
    camera.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  loop();
}

init();
