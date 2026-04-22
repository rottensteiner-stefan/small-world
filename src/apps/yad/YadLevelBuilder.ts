/// src/apps/yad/YadLevelBuilder.ts

import { Object3D } from "../../core/Object3D.js";
import { Scene } from "../../core/Scene.js";
import { Vector3D } from "../../math/index.js";
import { Cube, Plane, Sphere } from "../../geometry/index.js";
import {
  StandardMaterial,
  LavaMaterial,
  SlimeMaterial,
  SpriteMaterial,
} from "../../core/materials/index.js";
import { PointLight, Color, Texture, Sprite } from "../../core/index.js";
import { CullMode } from "../../enums/index.js";
import { GeometryDataInterface } from "../../interfaces/index.js";

/**
 * Configuration for the YadLevelBuilder.
 */
export interface YadLevelConfig {
  /** Texture for standard walls. */
  wallTexture?: Texture;
  /** Texture for standard floors. */
  floorTexture?: Texture;
  /** Noise map for lava animation. */
  lavaNoiseMap?: Texture;
  /** Normal map for lava. */
  lavaNormalMap?: Texture;
  /** Displacement map for lava. */
  lavaDisplacementMap?: Texture;
  /** Specular map for lava. */
  lavaSpecularMap?: Texture;
  /** Ambient map for lava. */
  lavaAmbientMap?: Texture;
  /** Texture for barrel sprites. */
  barrelTexture?: Texture;
  /** Texture for torch sprites. */
  torchTexture?: Texture;
  /** Noise map for toxin/slime floor. */
  slimeNoiseMap?: Texture;
  /** Displacement map for slime floor. */
  slimeDisplacementMap?: Texture;
  /** Normal map for slime floor. */
  slimeNormalMap?: Texture;
  /** Specular map for slime floor. */
  slimeSpecularMap?: Texture;
  /** Ambient map for slime floor. */
  slimeAmbientMap?: Texture;
}

/**
 * Utility to build a 3D level from an ASCII grid string.
 * Each character represents a 2x2x2 meter block.
 */
export class YadLevelBuilder {
  private _gridSize: number = 2.0;
  private _wallHeight: number = 3.0;

  /**
   * Builds a level into the provided scene.
   * @param scene The scene to add objects to.
   * @param mapData The raw string map data.
   * @param config Texture and material configuration.
   * @returns An object with playerStart and created materials for animation.
   */
  public async build(
    scene: Scene,
    mapData: string,
    config: YadLevelConfig,
  ): Promise<{ playerStart: Vector3D; lavaMaterials: LavaMaterial[]; lavaLights: PointLight[] }> {
    console.log("[YadLevelBuilder] Starting build...");
    const lines: string[] = mapData.trim().split("\n");
    const height: number = lines.length;
    const width: number = lines[0]!.length;
    const playerStart: Vector3D = new Vector3D(0, 1, 0);

    const lavaMaterials: LavaMaterial[] = [];
    const lavaLights: PointLight[] = [];

    // 1. Common Materials
    const wallMat: StandardMaterial = new StandardMaterial({ diffuseMap: config.wallTexture });
    const floorMat: StandardMaterial = new StandardMaterial({ diffuseMap: config.floorTexture });

    const lavaMat: LavaMaterial = new LavaMaterial({
      noiseMap: config.lavaNoiseMap,
      normalMap: config.lavaNormalMap,
      displacementMap: config.lavaDisplacementMap,
      specularMap: config.lavaSpecularMap,
      ambientMap: config.lavaAmbientMap,
      flowSpeed: 0.3,
      noiseScale: 2.0,
    });
    lavaMat.cullMode = CullMode.NONE;
    lavaMaterials.push(lavaMat);

    const slimeMat: SlimeMaterial = new SlimeMaterial({
      noiseMap: config.slimeNoiseMap,
      displacementMap: config.slimeDisplacementMap,
      normalMap: config.slimeNormalMap,
      specularMap: config.slimeSpecularMap,
      ambientMap: config.slimeAmbientMap,
    });
    slimeMat.cullMode = CullMode.NONE;
    lavaMaterials.push(slimeMat);

    const wallGeo: GeometryDataInterface = new Cube({ size: this._gridSize }).getGeometryData();
    const floorGeo: GeometryDataInterface = new Plane({
      width: this._gridSize,
      depth: this._gridSize,
      widthSegments: 8,
      depthSegments: 8,
    }).getGeometryData();
    const sphereGeo: GeometryDataInterface = new Sphere({ radius: 0.6 }).getGeometryData();

    for (let y: number = 0; y < height; y++) {
      const line: string = lines[y]!;
      for (let x: number = 0; x < width; x++) {
        const char: string = line[x]!;
        if (" " === char) continue;

        const worldX: number = x * this._gridSize - (width * this._gridSize) / 2;
        const worldZ: number = y * this._gridSize - (height * this._gridSize) / 2;

        // 1. Walls (Structural Elements)
        if ("W" === char || "G" === char) {
          const wall: Object3D = new Object3D(`Wall_${x}_${y}`);
          wall.geometry = wallGeo;
          wall.material = wallMat;
          wall.position.set(worldX, this._wallHeight / 2, worldZ);
          wall.scale.y = this._wallHeight / this._gridSize;
          wall.isStatic = true;
          wall.updateMatrixWorld(true);
          wall.computeBounds();
          scene.add(wall);
          continue; // Walls don't have floors/ceilings in this logic
        }

        // 2. Floor & Ceiling (For everything else that is not a space or a wall)
        // If it's a floating LavaBall, we STILL want floor/ceiling
        const floor: Object3D = new Object3D(`Floor_${x}_${y}`);
        floor.geometry = floorGeo;
        if ("~" === char) {
          floor.material = lavaMat;
        } else if ("T" === char) {
          floor.material = slimeMat;
        } else {
          floor.material = floorMat;
        }
        floor.position.set(worldX, 0, worldZ);
        floor.isStatic = true;
        scene.add(floor);

        // Ceiling (optional, but good for Doom feel)
        if ("~" !== char && "T" !== char) {
          const ceil: Object3D = new Object3D(`Ceiling_${x}_${y}`);
          ceil.geometry = floorGeo;
          ceil.material = floorMat;
          ceil.position.set(worldX, this._wallHeight, worldZ);
          ceil.rotation.x = Math.PI; // Flip it
          ceil.isStatic = true;
          scene.add(ceil);
        }

        // 3. Specific Objects (Sprites, Lights, LavaBalls, etc.)
        if ("l" === char) {
          // Torch
          const torch: Sprite = new Sprite(new SpriteMaterial({ texture: config.torchTexture }));
          torch.position.set(worldX, 1.5, worldZ);
          torch.scale.set(1, 1, 1);
          scene.add(torch);

          const light: PointLight = new PointLight({
            color: new Color(1.0, 0.6, 0.2),
            intensity: 3.0,
            distance: 8,
          });
          light.position.set(worldX, 1.8, worldZ);
          scene.add(light);
        } else if ("b" === char) {
          // Barrel
          const barrel: Sprite = new Sprite(new SpriteMaterial({ texture: config.barrelTexture }));
          barrel.position.set(worldX, 0.8, worldZ);
          barrel.scale.set(1.5, 1.5, 1.5);
          scene.add(barrel);
        } else if ("S" === char) {
          // Lava Ball (The requested floating lava sphere)
          const lavaBall: Object3D = new Object3D(`LavaBall_${x}_${y}`);
          lavaBall.geometry = sphereGeo;

          const ballMat = new LavaMaterial({
            noiseMap: config.lavaNoiseMap,
            color: new Color(2.0, 0.8, 0.0), // Extra bright core
            flowSpeed: 1.5, // Faster flow for the ball
          });
          lavaMaterials.push(ballMat);
          lavaBall.material = ballMat;
          lavaBall.position.set(worldX, 1.5, worldZ); // Floating at 1.5m
          scene.add(lavaBall);

          const light: PointLight = new PointLight({
            color: new Color(1.0, 0.4, 0.0),
            intensity: 4.0,
            distance: 10,
          });
          light.position.set(worldX, 1.5, worldZ);
          scene.add(light);
          lavaLights.push(light);
        } else if ("c" === char) {
          // Column (Static obstacle)
          const col: Object3D = new Object3D(`Column_${x}_${y}`);
          col.geometry = new Cube({ size: 1 }).getGeometryData(); // Placeholder for column
          col.material = wallMat;
          col.position.set(worldX, this._wallHeight / 2, worldZ);
          col.scale.set(0.5, this._wallHeight / this._gridSize, 0.5);
          col.isStatic = true;
          col.updateMatrixWorld(true);
          col.computeBounds();
          scene.add(col);
        } else if ("P" === char) {
          playerStart.set(worldX, 1.0, worldZ);
        }
      }
    }

    return { playerStart, lavaMaterials, lavaLights };
  }
}
