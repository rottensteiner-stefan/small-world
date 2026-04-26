/// src/examples/example11.ts

import {
  CameraStrategyType,
  Color,
  Cylinder,
  DirectionalLight,
  FluidManager,
  FluidMaterial,
  FluidParticleSystem,
  Object3D,
  PerspectiveProjection,
  PhongMaterial,
  ProjectionType,
  Pyramid,
  Texture,
  Torus,
  Vector3D,
} from "../index.js";
import { AbstractExample } from "../core/example/AbstractExample.js";

/**
 * Example 11: Baptismal fonts with colored magical fluids.
 * Featuring procedural marble textures with engraved cross details.
 */
class Example11 extends AbstractExample {
  
  protected override async setupScene(): Promise<void> {
    // 1. Camera Setup
    if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
      this.camera.projection = new PerspectiveProjection({
        fov: (45 * Math.PI) / 180,
        aspect: window.innerWidth / window.innerHeight,
        near: 0.1,
        far: 1000,
      });
      this.camera.updateProjectionMatrix();
    }
    this.camera.setStrategy(CameraStrategyType.SMOOTH);
    this.camera.position.set(0, 15, 30);
    this.camera.target.set(0, 5, 0);

    // 2. Lighting
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 1.2 });
    sun.direction.set(-1, -1, -1);
    this.scene.add(sun);

    // 3. Platform
    const floor = new Object3D("StonePlatform");
    floor.geometry = new Cylinder({ radiusTop: 25, radiusBottom: 25, height: 1.0 }).getGeometryData();
    floor.material = new PhongMaterial({ color: new Color(0.1, 0.1, 0.15), shininess: 20 });
    floor.setPosition(0, -0.5, 0);
    this.scene.add(floor);

    // 4. Generate Procedural Marble & Normal Map with Cross
    const marbleNormalMap = await this.generateMarbleWithCross();

    const fonts = [
      { pos: new Vector3D(-9, 0, 0), color: new Color(0.95, 0.1, 0.1, 0.8), name: "Ruby" },
      { pos: new Vector3D(9, 0, 0), color: new Color(0.1, 0.95, 0.2, 0.8), name: "Emerald" },
      { pos: new Vector3D(0, 0, -9), color: new Color(0.1, 0.4, 1.0, 0.8), name: "Sapphire" }
    ];

    for (const data of fonts) {
      this.createStoneFont(data.pos, data.color, data.name, marbleNormalMap);
    }
  }

  /**
   * Generates a procedural normal map with a cross engraving.
   */
  private async generateMarbleWithCross(): Promise<Texture> {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Background: Neutral Normal (Flat Z-up)
    ctx.fillStyle = "rgb(128, 128, 255)";
    ctx.fillRect(0, 0, size, size);

    // Draw Cross with Normal-shading (Simple Bevelling)
    const cx = size / 2;
    const cy = size / 2;
    const w = 40;
    const h = 200;

    ctx.lineWidth = 15;
    
    // Vertical part
    this.drawBevelledRect(ctx, cx - w/2, cy - h/2, w, h);
    // Horizontal part
    this.drawBevelledRect(ctx, cx - h/3, cy - h/4, h * 0.7, w);

    const texture = Texture.fromImage(await createImageBitmap(canvas));
    return texture;
  }

  private drawBevelledRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    // "Engrave" effect using normal map colors
    // Left edge (X-negative)
    ctx.fillStyle = "rgb(80, 128, 255)";
    ctx.fillRect(x, y, 5, h);
    // Right edge (X-positive)
    ctx.fillStyle = "rgb(180, 128, 255)";
    ctx.fillRect(x + w - 5, y, 5, h);
    // Top edge (Y-negative)
    ctx.fillStyle = "rgb(128, 80, 255)";
    ctx.fillRect(x, y, w, 5);
    // Bottom edge (Y-positive)
    ctx.fillStyle = "rgb(128, 180, 255)";
    ctx.fillRect(x, y + h - 5, w, 5);
    // Middle (Flat deep)
    ctx.fillStyle = "rgb(128, 128, 220)";
    ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
  }

  private createStoneFont(pos: Vector3D, fluidColor: Color, name: string, normalMap: Texture): void {
    const fontRoot = new Object3D(name + "Font");
    fontRoot.setPosition(pos.x, pos.y, pos.z);

    const marbleMat = new PhongMaterial({ 
        color: new Color(0.92, 0.92, 0.95), 
        shininess: 60,
        normalMap: normalMap 
    });

    // 1. Pedestal
    const pedestal = new Object3D(name + "Pedestal");
    pedestal.geometry = new Pyramid({ base: 5, height: 6.5, radialSegments: 4 }).getGeometryData();
    pedestal.material = marbleMat;
    pedestal.rotation.y = Math.PI / 4;
    pedestal.setPosition(0, 3.25, 0);
    fontRoot.add(pedestal);

    // 2. Bowl Bottom
    const bowlBase = new Object3D(name + "BowlBase");
    bowlBase.geometry = new Cylinder({ radiusTop: 4.8, radiusBottom: 2.5, height: 2 }).getGeometryData();
    bowlBase.material = marbleMat;
    bowlBase.setPosition(0, 7.5, 0);
    fontRoot.add(bowlBase);

    // 3. The Rim (Torus)
    const rim = new Object3D(name + "Rim");
    rim.geometry = new Torus({ radius: 4.5, tube: 0.7, radialSegments: 16, tubularSegments: 64 }).getGeometryData();
    rim.material = marbleMat;
    rim.rotation.x = Math.PI / 2;
    rim.setPosition(0, 8.5, 0);
    fontRoot.add(rim);

    this.scene.add(fontRoot);

    // 4. Fluid
    const fluid = new FluidParticleSystem({
      particleCount: 2500,
      radius: 0.35,
      boundaryMin: new Vector3D(pos.x - 4, 7.8, pos.z - 4),
      boundaryMax: new Vector3D(pos.x + 4, 9.5, pos.z + 4),
      gravity: new Vector3D(0, -9.81, 0)
    });
    fluid.material = new FluidMaterial(fluidColor, 6.0);
    
    this.scene.add(fluid);
    FluidManager.instance.registerSystem(fluid);
  }

  protected override update(_deltaTime: number): void { }
}

const app = new Example11();
app.start().catch(console.error);
