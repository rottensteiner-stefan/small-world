/// src/apps/yad/YadLevelBuilder.ts

import { Object3D } from "../../core/Object3D.js";
import { Scene } from "../../core/Scene.js";
import { Vector3D } from "../../math/index.js";
import { Cube, Plane, Sphere } from "../../geometry/index.js";
import { StandardMaterial, LavaMaterial, SpriteMaterial } from "../../core/materials/index.js";
import { PointLight, Color, Texture, Sprite } from "../../core/index.js";
import { CullMode } from "../../enums/index.js";
import { GeometryDataInterface, CameraInterfaceData } from "../../interfaces/index.js";
import { ProximitySensorBehavior, BobbingBehavior } from "../../core/behaviors/index.js";

export type YadTileType =
  | "wall"
  | "door"
  | "sprite"
  | "column"
  | "lavaBall"
  | "playerSpawn"
  | "floor";

export interface YadLegendEntry {
  type: YadTileType;
  /** Primary texture */
  texture?: Texture;
  /** Ceiling texture (for floor type) */
  ceilingTexture?: Texture;
  /** Add a point light? */
  lightColor?: Color;
  lightIntensity?: number;
  /** Sprite specific settings */
  spriteScale?: number;
  spriteY?: number;
  bobbing?: boolean;
  isEnemy?: boolean;
  isItem?: boolean;
  /** Wall/Door specific settings */
  doorSpeed?: number;
  doorSound?: string;
}

export type YadLegend = Record<string, YadLegendEntry>;

/**
 * Configuration for the YadLevelBuilder.
 */
export interface YadLevelConfig {
  /** The dictionary mapping characters to logic */
  legend: YadLegend;
  /** Texture for standard floors. */
  floorTexture?: Texture;
  /** Texture for ceilings. */
  ceilingTexture?: Texture;
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
  /** Set characters that should use lava material for the floor instead of the default floor */
  lavaFloorChars?: string[];
  /** Set characters that should be treated as slime floor */
  slimeFloorChars?: string[];
  /** The player camera (for proximity sensing on doors) */
  playerCamera?: CameraInterfaceData;
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
    const floorMat: StandardMaterial = new StandardMaterial({ diffuseMap: config.floorTexture });
    const ceilMat: StandardMaterial = new StandardMaterial({
      diffuseMap: config.ceilingTexture ?? config.floorTexture,
    });

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

        const entry = config.legend[char];
        const isLavaFloor = config.lavaFloorChars?.includes(char);
        const isSlimeFloor = config.slimeFloorChars?.includes(char);

        // 1. Structural Elements (Walls, Doors)
        if (entry?.type === "wall" || entry?.type === "door") {
          const isDoor = entry.type === "door";
          const block: Object3D = new Object3D(isDoor ? `Door_${x}_${y}` : `Wall_${x}_${y}`);
          block.geometry = wallGeo;
          block.material = new StandardMaterial({ diffuseMap: entry.texture });

          const initialY = this._wallHeight / 2;
          block.position.set(worldX, initialY, worldZ);
          block.scale.y = this._wallHeight / this._gridSize;

          if (isDoor) {
            block.isStatic = false; // Need to be dynamic to open
            block.updateMatrixWorld(true);
            block.computeBounds();

            if (config.playerCamera) {
              let isOpen = false;
              const dSound = entry.doorSound ?? "door";
              block.addBehavior(
                new ProximitySensorBehavior({
                  targetObj: config.playerCamera,
                  radius: 4.0,
                  minDistance: 0.0,
                  onUpdate: (_factor: number, distance: number, deltaTime: number): void => {
                    // Open door fully if within 3.5 units
                    if (distance <= 3.5) {
                      if (!isOpen) {
                        isOpen = true;
                        import("../../audio/AudioSystem.js").then((m) => {
                          m.AudioSystem.instance.playSpatial(
                            dSound,
                            block.position,
                            false,
                            0.8,
                            3.0,
                            30.0,
                          );
                        });
                      }
                    } else if (distance >= 4.5) {
                      if (isOpen) {
                        isOpen = false;
                        import("../../audio/AudioSystem.js").then((m) => {
                          m.AudioSystem.instance.playSpatial(
                            dSound,
                            block.position,
                            false,
                            0.8,
                            3.0,
                            30.0,
                          );
                        });
                      }
                    }

                    const targetY = isOpen ? initialY + this._wallHeight : initialY;
                    block.position.y += (targetY - block.position.y) * 5.0 * deltaTime;

                    block.updateMatrixWorld(true);
                    block.computeBounds();
                  },
                }),
              );
            }
          } else {
            block.isStatic = true;
            block.updateMatrixWorld(true);
            block.computeBounds();
            scene.add(block);
            continue; // Static walls don't have floors/ceilings
          }
          scene.add(block);
          // Doors will fall through to create a floor and ceiling below them!
        }

        // 2. Floor & Ceiling (For everything else)
        const isSecretFloor = entry?.type === "floor";

        let floorName = `Floor_${x}_${y}`;
        if (isLavaFloor) floorName = `Floor_Lava_${x}_${y}`;
        if (isSlimeFloor) floorName = `Floor_Slime_${x}_${y}`;

        const floor: Object3D = new Object3D(floorName);
        floor.geometry = floorGeo;
        floor.material =
          isSecretFloor && entry.texture
            ? new StandardMaterial({ diffuseMap: entry.texture })
            : isLavaFloor
              ? lavaMat
              : floorMat;
        floor.position.set(worldX, 0, worldZ);
        floor.isStatic = true;
        scene.add(floor);

        // Ceiling (optional, but good for Doom feel)
        if (!isLavaFloor) {
          const ceil: Object3D = new Object3D(`Ceiling_${x}_${y}`);
          ceil.geometry = floorGeo;
          ceil.material =
            isSecretFloor && entry.ceilingTexture
              ? new StandardMaterial({ diffuseMap: entry.ceilingTexture })
              : ceilMat;
          ceil.position.set(worldX, this._wallHeight, worldZ);
          ceil.rotation.x = Math.PI; // Flip it
          ceil.isStatic = true;
          scene.add(ceil);
        }

        // 3. Specific Objects (Sprites, Lights, LavaBalls, etc.)
        if (!entry) continue;

        if (entry.type === "sprite") {
          const sprite: Sprite = new Sprite(new SpriteMaterial({ texture: entry.texture }));
          let spriteName = `Sprite_${x}_${y}`;
          if (entry.isEnemy) spriteName = `Enemy_${x}_${y}`;
          if (entry.isItem) spriteName = `Item_${x}_${y}`;
          sprite.name = spriteName;
          sprite.position.set(worldX, entry.spriteY ?? 1.0, worldZ);
          const scale = entry.spriteScale ?? 1.0;
          sprite.scale.set(scale, scale, scale);

          if (entry.bobbing) {
            sprite.addBehavior(new BobbingBehavior(0.1, 1.5));
          }
          if (entry.isEnemy && config.playerCamera) {
            import("./EnemyBehavior.js").then((m) => {
              sprite.addBehavior(
                new m.EnemyBehavior({
                  player: config.playerCamera!,
                  scene: scene,
                  speed: 3.0,
                  detectionRange: 15.0,
                }),
              );
            });
          }
          scene.add(sprite);

          if (entry.lightColor) {
            const light: PointLight = new PointLight({
              color: entry.lightColor,
              intensity: entry.lightIntensity ?? 3.0,
              distance: 8,
            });
            light.position.set(worldX, (entry.spriteY ?? 1.0) + 0.3, worldZ);
            scene.add(light);

            // Add fire crackling sound
            import("../../audio/AudioSystem.js").then((m) => {
              m.AudioSystem.instance.startFire(light.position, 0.4);
            });
          }
        } else if (entry.type === "column") {
          const col: Object3D = new Object3D(`Column_${x}_${y}`);
          col.geometry = new Cube({ size: 1 }).getGeometryData();
          col.material = new StandardMaterial({ diffuseMap: entry.texture });
          col.position.set(worldX, this._wallHeight / 2, worldZ);
          col.scale.set(0.5, this._wallHeight / this._gridSize, 0.5);
          col.isStatic = true;
          col.updateMatrixWorld(true);
          col.computeBounds();
          scene.add(col);
        } else if (entry.type === "lavaBall") {
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
        } else if (entry.type === "playerSpawn") {
          playerStart.set(worldX, 1.0, worldZ);
        }
      }
    }

    return { playerStart, lavaMaterials, lavaLights };
  }
}
