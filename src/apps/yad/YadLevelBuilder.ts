/// src/apps/yad/YadLevelBuilder.ts
import { Object3D } from "../../core/index.js";
import { Scene } from "../../core/index.js";
import { Vector3D } from "../../math/index.js";
import { Cube } from "../../geometry/index.js";
import { Sphere } from "../../geometry/index.js";
import { StandardMaterial } from "../../core/materials/index.js";
import { LavaMaterial } from "../../core/materials/index.js";
import { SpriteMaterial } from "../../core/materials/index.js";
import { PointLight } from "../../core/lights/index.js";
import { Color } from "../../core/colors/index.js";
import { Texture } from "../../core/textures/index.js";
import { Sprite } from "../../core/index.js";
import { CullMode } from "../../enums/index.js";
import { CameraInterfaceData } from "../../interfaces/index.js";
import { ProximitySensorBehavior } from "../../core/behaviors/index.js";
import { BobbingBehavior } from "../../core/behaviors/index.js";
import { GridLevelBuilder, GridLegend } from "../../extensions/grid-builder/GridLevelBuilder.js";

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
  itemType?: string;
  /** Wall/Door specific settings */
  doorSpeed?: number;
  doorSound?: string;
}

export type YadLegend = Record<string, YadLegendEntry>;

export interface YadLevelConfig {
  legend: YadLegend;
  floorTexture?: Texture;
  ceilingTexture?: Texture;
  lavaNoiseMap?: Texture;
  lavaNormalMap?: Texture;
  lavaDisplacementMap?: Texture;
  lavaSpecularMap?: Texture;
  lavaAmbientMap?: Texture;
  lavaFloorChars?: string[];
  slimeFloorChars?: string[];
  playerCamera?: CameraInterfaceData;
}

/**
 * YadLevelBuilder now wraps the generic GridLevelBuilder.
 */
export class YadLevelBuilder {
  private _gridSize: number = 2.0;
  private _wallHeight: number = 3.0;

  public async build(
    scene: Scene,
    mapData: string,
    config: YadLevelConfig,
  ): Promise<{ playerStart: Vector3D; lavaMaterials: LavaMaterial[]; lavaLights: PointLight[] }> {
    console.log("[YadLevelBuilder] Starting build via GridLevelBuilder...");

    const lavaMaterials: LavaMaterial[] = [];
    const lavaLights: PointLight[] = [];

    const lavaMat = new LavaMaterial({
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

    const wallGeo = new Cube({ size: this._gridSize }).getGeometryData();
    const sphereGeo = new Sphere({ radius: 0.6 }).getGeometryData();

    const playerStart = new Vector3D(0, 1, 0);

    // Convert YadLegend to GridLegend
    const gridLegend: GridLegend = {};
    for (const [char, entry] of Object.entries(config.legend)) {
      if (entry.type === "wall") {
        gridLegend[char] = {
          type: "block",
          ...(entry.texture && { texture: entry.texture }),
        };
      } else if (entry.type === "floor") {
        gridLegend[char] = {
          type: "floor",
          ...(entry.texture && { texture: entry.texture }),
          ...(entry.ceilingTexture && { ceilingTexture: entry.ceilingTexture }),
        };
      } else if (entry.type === "door") {
        gridLegend[char] = {
          type: "custom",
          onBuild: (x, y, worldX, worldZ): Object3D | undefined => {
            const block = new Object3D(`Door_${x}_${y}`);
            block.geometry = wallGeo;
            block.material = new StandardMaterial({ diffuseMap: entry.texture });

            const initialY = this._wallHeight / 2;
            block.position.set(worldX, initialY, worldZ);
            block.scale.y = this._wallHeight / this._gridSize;
            block.isStatic = false;
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
                  onUpdate: (_factor, distance, deltaTime): void => {
                    if (distance <= 3.5 && !isOpen) {
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
                    } else if (distance >= 4.5 && isOpen) {
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
                    const targetY = isOpen ? initialY + this._wallHeight : initialY;
                    block.position.y += (targetY - block.position.y) * 5.0 * deltaTime;
                    block.updateMatrixWorld(true);
                    block.computeBounds();
                  },
                }),
              );
            }
            return block; // The grid builder will add this to the scene
          },
        };
      } else if (entry.type === "sprite") {
        gridLegend[char] = {
          type: "custom",
          onBuild: (x, y, worldX, worldZ, sceneRef): Object3D | undefined => {
            const sprite = new Sprite(new SpriteMaterial({ texture: entry.texture }));
            let spriteName = `Sprite_${x}_${y}`;
            if (entry.isEnemy) spriteName = `Enemy_${x}_${y}`;
            if (entry.isItem) spriteName = `Item_${entry.itemType ?? "unknown"}_${x}_${y}`;
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
                    scene: sceneRef,
                    speed: 6.0,
                    detectionRange: 30.0,
                  }),
                );
              });
            }

            if (entry.lightColor) {
              const light = new PointLight({
                color: entry.lightColor,
                intensity: entry.lightIntensity ?? 3.0,
                distance: 8,
              });
              light.position.set(worldX, (entry.spriteY ?? 1.0) + 0.3, worldZ);
              sceneRef.add(light);

              import("../../audio/AudioSystem.js").then((m) => {
                m.AudioSystem.instance.startFire(light.position, 0.4);
              });
            }
            return sprite;
          },
        };
      } else if (entry.type === "column") {
        gridLegend[char] = {
          type: "custom",
          onBuild: (x, y, worldX, worldZ): Object3D | undefined => {
            const col = new Object3D(`Column_${x}_${y}`);
            col.geometry = new Cube({ size: 1 }).getGeometryData();
            col.material = new StandardMaterial({ diffuseMap: entry.texture });
            col.position.set(worldX, this._wallHeight / 2, worldZ);
            col.scale.set(0.5, this._wallHeight / this._gridSize, 0.5);
            col.isStatic = true;
            col.updateMatrixWorld(true);
            col.computeBounds();
            return col;
          },
        };
      } else if (entry.type === "lavaBall") {
        gridLegend[char] = {
          type: "custom",
          onBuild: (x, y, worldX, worldZ, sceneRef): Object3D | undefined => {
            const lavaBall = new Object3D(`LavaBall_${x}_${y}`);
            lavaBall.geometry = sphereGeo;
            const ballMat = new LavaMaterial({
              noiseMap: config.lavaNoiseMap,
              color: new Color(2.0, 0.8, 0.0),
              flowSpeed: 1.5,
            });
            lavaMaterials.push(ballMat);
            lavaBall.material = ballMat;
            lavaBall.position.set(worldX, 1.5, worldZ);

            const light = new PointLight({
              color: new Color(1.0, 0.4, 0.0),
              intensity: 4.0,
              distance: 10,
            });
            light.position.set(worldX, 1.5, worldZ);
            sceneRef.add(light);
            lavaLights.push(light);

            return lavaBall;
          },
        };
      } else if (entry.type === "playerSpawn") {
        gridLegend[char] = {
          type: "custom",
          onBuild: (_x, _y, worldX, worldZ): Object3D | undefined => {
            playerStart.set(worldX, 1.0, worldZ);
            return undefined; // Nothing added to scene
          },
        };
      }
    }

    // Pass lava and slime floor chars to GridLegend floor overrides
    // But GridLevelBuilder doesn't have a direct char match for default floor overrides!
    // So we need to add explicit floor entries for 'char' if they are lava/slime.
    // Wait, the lava chars are usually just '~' or 'w' mapped to "floor" type.
    // We already handle this in the outer loop for 'char'.
    // Let's refine how lava floors are made:
    for (const char of Object.keys(config.legend)) {
      if (config.lavaFloorChars?.includes(char)) {
        if (gridLegend[char]) gridLegend[char]!.material = lavaMat;
      }
    }

    const gridBuilder = new GridLevelBuilder();
    await gridBuilder.build(scene, mapData, {
      legend: gridLegend,
      ...(config.floorTexture && { defaultFloorTexture: config.floorTexture }),
      ...(config.ceilingTexture
        ? { defaultCeilingTexture: config.ceilingTexture }
        : config.floorTexture
          ? { defaultCeilingTexture: config.floorTexture }
          : {}),
      gridSize: this._gridSize,
      wallHeight: this._wallHeight,
    });

    return { playerStart, lavaMaterials, lavaLights };
  }
}
