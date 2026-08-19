import { Object3D, Scene, InstancedMesh } from "../../../core/index.js";
import { AbstractMaterial } from "../../../core/materials/index.js";
import { Vector3D, Matrix4 } from "../../../math/index.js";
import { Cube } from "../../../geometry/index.js";
import { CellType } from "../enums/CellType.js";
import { ObjectTags } from "../enums/ObjectTags.js";
import { MazeGenerator } from "./MazeGenerator.js";

export interface LevelObjects {
  /** World-space positions of all ENEMY_SPAWN cells. */
  enemySpawnPoints: Vector3D[];
}

export class LevelBuilder {
  private readonly _scale: number = 4.0;
  private readonly _height: number = 4.0;
  private readonly _floorThickness: number = 0.2;

  public get scale(): number {
    return this._scale;
  }

  public get height(): number {
    return this._height;
  }

  public build(
    scene: Scene,
    maze: MazeGenerator,
    wallMat: AbstractMaterial,
    floorMat: AbstractMaterial,
    seamMat: AbstractMaterial,
  ): LevelObjects {
    const cubeGeo = new Cube({ size: 1 }).getGeometryData();
    const wallMatrices: Matrix4[] = [];
    const floorMatrices: Matrix4[] = [];
    const ceilingMatrices: Matrix4[] = [];
    const seamMatrices: Matrix4[] = [];
    const enemySpawnPoints: Vector3D[] = [];

    const seamLift = 0.004;
    const seamW = 0.08;

    const isFloorLike = (t: CellType): boolean =>
      t === CellType.FLOOR ||
      t === CellType.SPAWN ||
      t === CellType.ENEMY_SPAWN ||
      t === CellType.PICKUP;

    const addCollisionBox = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
    ): void => {
      const box = new Object3D("ColBox");
      box.geometry = cubeGeo;
      box.setScale(w, h, d);
      box.position.set(x, y, z);
      box.isVisible = false;
      box.isStatic = true;
      box.updateMatrixWorld();
      box.computeBounds();
      scene.add(box);
    };

    const addInstanced = (name: string, mat: AbstractMaterial, matrices: Matrix4[]): void => {
      if (matrices.length === 0) return;
      const mesh = new InstancedMesh(name, cubeGeo, mat, matrices.length);
      mesh.initInstanceData(4);
      for (let i = 0; i < matrices.length; i++) {
        mesh.setMatrixAt(i, matrices[i]!);
      }
      mesh.tag = ObjectTags.WALL;
      mesh.isStatic = true;
      mesh.isCollidable = false;
      mesh.updateMatrixWorld();
      mesh.computeBounds();
      scene.add(mesh);
    };

    for (let z = 0; z < maze.depth; z++) {
      for (let x = 0; x < maze.width; x++) {
        const type = maze.grid[z]![x]!;
        const wx = x * this._scale;
        const wz = -z * this._scale;

        if (type === CellType.WALL) {
          const m = new Matrix4();
          m.compose(
            new Vector3D(wx, this._height / 2, wz),
            new Vector3D(),
            new Vector3D(this._scale, this._height, this._scale),
          );
          wallMatrices.push(m);
          addCollisionBox(this._scale, this._height, this._scale, wx, this._height / 2, wz);
          continue;
        }

        if (type === CellType.ENEMY_SPAWN) {
          enemySpawnPoints.push(new Vector3D(wx, 1.8, wz));
        }

        // Floor slab
        const fm = new Matrix4();
        fm.compose(
          new Vector3D(wx, 0, wz),
          new Vector3D(),
          new Vector3D(this._scale, this._floorThickness, this._scale),
        );
        floorMatrices.push(fm);
        addCollisionBox(this._scale, this._floorThickness, this._scale, wx, 0, wz);

        // Ceiling slab
        const cm = new Matrix4();
        cm.compose(
          new Vector3D(wx, this._height, wz),
          new Vector3D(),
          new Vector3D(this._scale, this._floorThickness, this._scale),
        );
        ceilingMatrices.push(cm);
        addCollisionBox(this._scale, this._floorThickness, this._scale, wx, this._height, wz);

        // Seam strips along south and west edges (neighbor handles the shared boundary).
        const southNeighbor = z < maze.depth - 1 ? maze.grid[z + 1]![x]! : CellType.WALL;
        const sm = new Matrix4();
        sm.compose(
          new Vector3D(wx, 0.05 + seamLift, wz - this._scale / 2 + 0.1),
          new Vector3D(),
          new Vector3D(this._scale, 0.1, seamW),
        );
        seamMatrices.push(sm);

        // Only add north seam when the north neighbor is a wall (otherwise it draws its own south seam).
        const northNeighbor = z > 0 ? maze.grid[z - 1]![x]! : CellType.WALL;
        if (!isFloorLike(northNeighbor)) {
          const nm = new Matrix4();
          nm.compose(
            new Vector3D(wx, 0.05 + seamLift, wz + this._scale / 2 - 0.1),
            new Vector3D(),
            new Vector3D(this._scale, 0.1, seamW),
          );
          seamMatrices.push(nm);
        }

        const em2 = new Matrix4();
        em2.compose(
          new Vector3D(wx - this._scale / 2 + 0.1, 0.05 + seamLift, wz),
          new Vector3D(),
          new Vector3D(seamW, 0.1, this._scale),
        );
        seamMatrices.push(em2);

        const eastNeighbor = x < maze.width - 1 ? maze.grid[z]![x + 1]! : CellType.WALL;
        if (!isFloorLike(eastNeighbor)) {
          const em = new Matrix4();
          em.compose(
            new Vector3D(wx + this._scale / 2 - 0.1, 0.05 + seamLift, wz),
            new Vector3D(),
            new Vector3D(seamW, 0.1, this._scale),
          );
          seamMatrices.push(em);
        }

        void southNeighbor; // used indirectly via sm push above
      }
    }

    addInstanced("DW_Walls", wallMat, wallMatrices);
    addInstanced("DW_Ceilings", wallMat, ceilingMatrices);
    addInstanced("DW_Floors", floorMat, floorMatrices);
    addInstanced("DW_Seams", seamMat, seamMatrices);

    return { enemySpawnPoints };
  }
}
