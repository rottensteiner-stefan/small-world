/// src/examples/example6.ts

import {
  AmbientLight,
  BoundingBox,
  CameraStrategyType,
  Capsule,
  Circle,
  Color,
  Cone,
  Cube,
  Cylinder,
  CylinderSector,
  DirectionalLight,
  Disk,
  ExtrudeGeometry,
  FPSController,
  Gear,
  Geometry,
  Grid,
  Object3D,
  PerspectiveProjection,
  Plane,
  Pyramid,
  Sphere,
  StandardMaterial,
  Torus,
  Triangle,
  Tube,
  Vector2D,
  Vector3D,
  WireframeMaterial,
  ZoomController,
} from "../../../src/index.js";
import { AbstractExample } from "../../../src/core/index.js";

/**
 * Example 6: Geometry Showcase.
 */
export class Example6 extends AbstractExample {
  private _moveSpeed: number = 10.0;

  /** @inheritdoc */
  protected override async setupScene(): Promise<void> {
    this.onCanvasRecreated();

    // 0. Initialize Octrees for Collision
    this.scene.initOctrees(
      new BoundingBox(new Vector3D(-100, -10, -100), new Vector3D(100, 50, 100)),
    );

    // 1. Camera Setup
    const aspect: number = window.innerWidth / window.innerHeight;
    this.camera.projection = new PerspectiveProjection({
      fov: (75 * Math.PI) / 180,
      aspect,
      near: 0.1,
      far: 1000,
    });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, 2, 10);

    this.camera.addBehavior(
      new FPSController({
        moveSpeed: this._moveSpeed,
        collisionRadius: 0.6,
        scene: this.scene,
      }),
    );
    this.camera.addBehavior(new ZoomController());

    // 3. Lights
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.4 }));
    const sun: DirectionalLight = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 4. Floor Grid
    const gridObj: Object3D = new Object3D("FloorGrid");
    gridObj.geometry = new Grid({ size: 100, divisions: 50 }).getGeometryData();
    const gridMat: WireframeMaterial = new WireframeMaterial();
    gridMat.color = Color.DARKSLATEGRAY;
    gridObj.material = gridMat;
    gridObj.isStatic = true;
    this.scene.add(gridObj);

    const wireMat: WireframeMaterial = new WireframeMaterial();
    wireMat.color = Color.CYAN;

    const getRandomColor = (): Color => {
      return new Color(
        Math.random() * 0.8 + 0.2,
        Math.random() * 0.8 + 0.2,
        Math.random() * 0.8 + 0.2,
      );
    };

    const addGeometryPair = (name: string, geometry: Geometry, x: number, z: number): void => {
      // Wireframe version
      const objWire: Object3D = new Object3D(`${name}_Wire`);
      objWire.geometry = geometry.getGeometryData();
      objWire.material = wireMat;
      objWire.position.set(x, 2, z);
      objWire.isStatic = true;
      this.scene.add(objWire);

      // Solid version
      const objSolid: Object3D = new Object3D(`${name}_Solid`);
      objSolid.geometry = geometry.getGeometryData();
      const solidMat = new StandardMaterial({
        color: getRandomColor(),
        roughness: 0.5,
        metallic: 0.1,
      });
      objSolid.material = solidMat;
      objSolid.position.set(x, 2, z + 6); // Offset by +6 on Z axis
      objSolid.isStatic = true;
      this.scene.add(objSolid);
    };

    const geometries: { name: string; geom: Geometry }[] = [
      { name: "Cube", geom: new Cube({ size: 3 }) },
      { name: "Sphere", geom: new Sphere({ radius: 1.5, widthSegments: 32, heightSegments: 24 }) },
      { name: "Pyramid", geom: new Pyramid({ base: 3, height: 3, radialSegments: 4 }) },
      {
        name: "Torus",
        geom: new Torus({ radius: 1.5, tube: 0.5, radialSegments: 16, tubularSegments: 32 }),
      },
      {
        name: "Capsule",
        geom: new Capsule({ radius: 1, length: 2, radialSegments: 16, capSegments: 8 }),
      },
      { name: "Cone", geom: new Cone({ radius: 1.5, height: 3, radialSegments: 32 }) },
      {
        name: "Cylinder",
        geom: new Cylinder({ radiusTop: 1.5, radiusBottom: 1.5, height: 3, radialSegments: 32 }),
      },
      {
        name: "Frustum",
        geom: new Cylinder({ radiusTop: 0.7, radiusBottom: 1.5, height: 3, radialSegments: 32 }),
      },
      {
        name: "Tube",
        geom: new Tube({ radius: 1.5, innerRadius: 1.0, height: 3, radialSegments: 32 }),
      },
      { name: "Circle", geom: new Circle({ radius: 1.5, segments: 32 }) },
      { name: "Disk", geom: new Disk({ radius: 1.5, segments: 32, rings: 3 }) },
      {
        name: "CylinderSector",
        geom: new CylinderSector({
          radiusTop: 1.5,
          radiusBottom: 1.5,
          height: 3,
          radialSegments: 16,
          thetaStart: 0,
          thetaLength: Math.PI,
        }),
      },
      { name: "Plane", geom: new Plane({ width: 3, depth: 3 }) },
      {
        name: "Triangle",
        geom: new Triangle(
          new Vector3D(-1.5, 0, 0),
          new Vector3D(1.5, 0, 0),
          new Vector3D(0, 0, -2.6),
        ),
      },
      {
        name: "Gear",
        geom: new Gear({ innerRadius: 1.0, toothHeight: 0.5, teeth: 12, thickness: 0.5 }),
      },
      {
        name: "Extrude",
        geom: new ExtrudeGeometry({
          shape: [
            new Vector2D(-1, -1),
            new Vector2D(1, -1),
            new Vector2D(1, 1),
            new Vector2D(-1, 1),
          ],
          depth: 1,
        }),
      },
    ];

    const spacing: number = 5;
    const itemsPerRow: number = 6;
    const startX: number = -((itemsPerRow - 1) * spacing) / 2;

    for (let i = 0; i < geometries.length; i++) {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;

      const x = startX + col * spacing;
      // We offset Z by 15 for each row, and solid versions are +6 from the wireframes
      const z = -20 + row * 15;

      addGeometryPair(geometries[i]!.name, geometries[i]!.geom, x, z);
    }

    // IMPORTANT: Update all world matrices BEFORE computing bounds
    // and building the octree, otherwise bounds will be at (0,0,0).
    this.scene.update();

    // Now compute bounds for all static objects
    for (const obj of this.scene.objects) {
      if (obj.isStatic) obj.computeBounds();
    }

    this.scene.updateStaticOctree();
    console.log("Example 6: Scene ready.");
  }

  protected override update(): void {}
}

const app: Example6 = new Example6();
app.start();
