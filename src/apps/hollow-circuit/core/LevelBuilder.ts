import { Object3D, Scene, InstancedMesh } from "../../../core/index.js";
import { AbstractMaterial } from "../../../core/materials/index.js";
import { Vector3D, Matrix4 } from "../../../math/index.js";
import { Cube } from "../../../geometry/index.js";
import { CellType } from "../enums/CellType.js";
import { MazeGenerator } from "./MazeGenerator.js";

export class LevelBuilder {
  private _scale: number = 4.0;
  private _height: number = 4.0;
  private _floorThickness: number = 0.2;

  public get scale(): number {
    return this._scale;
  }

  public build(
    scene: Scene,
    maze: MazeGenerator,
    structureMat: AbstractMaterial,
    seamMat: AbstractMaterial,
  ): void {
    const cubeGeo = new Cube({ size: 1 }).getGeometryData();

    const wallMatrices: Matrix4[] = [];
    const floorMatrices: Matrix4[] = [];
    const seamMatrices: Matrix4[] = [];

    const addCollisionBox = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      rx: number = 0,
      ry: number = 0,
      rz: number = 0,
    ): void => {
      const box = new Object3D("ColBox");
      box.geometry = cubeGeo;
      box.setScale(w, h, d);
      box.position.set(x, y, z);
      if (rx !== 0 || ry !== 0 || rz !== 0) {
        box.rotation.set(rx, ry, rz);
      }
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
      mesh.isStatic = true;
      mesh.isCollidable = false;
      mesh.updateMatrixWorld();
      mesh.computeBounds();
      scene.add(mesh);
    };

    for (let f = 0; f < maze.floors; f++) {
      const yOffset = f * this._height;
      for (let z = 0; z < maze.depth; z++) {
        for (let x = 0; x < maze.width; x++) {
          const type = maze.grid[f]![z]![x];
          const wx = x * this._scale;
          const wz = -z * this._scale;

          if (type === CellType.WALL) {
            const m = new Matrix4();
            m.compose(
              new Vector3D(wx, yOffset + this._height / 2, wz),
              new Vector3D(),
              new Vector3D(this._scale, this._height, this._scale),
            );
            wallMatrices.push(m);
            addCollisionBox(
              this._scale,
              this._height,
              this._scale,
              wx,
              yOffset + this._height / 2,
              wz,
            );
          } else if (
            type === CellType.FLOOR ||
            type === CellType.RAMP_UP_N ||
            type === CellType.RAMP_UP_S ||
            type === CellType.RAMP_UP_E ||
            type === CellType.RAMP_UP_W
          ) {
            const fm = new Matrix4();
            fm.compose(
              new Vector3D(wx, yOffset, wz),
              new Vector3D(),
              new Vector3D(this._scale, this._floorThickness, this._scale),
            );
            floorMatrices.push(fm);
            addCollisionBox(this._scale, this._floorThickness, this._scale, wx, yOffset, wz);

            const cm = new Matrix4();
            cm.compose(
              new Vector3D(wx, yOffset + this._height, wz),
              new Vector3D(),
              new Vector3D(this._scale, this._floorThickness, this._scale),
            );
            floorMatrices.push(cm);
            addCollisionBox(
              this._scale,
              this._floorThickness,
              this._scale,
              wx,
              yOffset + this._height,
              wz,
            );

            const seamW = 0.1;
            const sm = new Matrix4();
            sm.compose(
              new Vector3D(wx, yOffset + 0.05, wz - this._scale / 2 + 0.1),
              new Vector3D(),
              new Vector3D(this._scale, 0.1, seamW),
            );
            seamMatrices.push(sm);
            const sm2 = new Matrix4();
            sm2.compose(
              new Vector3D(wx - this._scale / 2 + 0.1, yOffset + 0.05, wz),
              new Vector3D(),
              new Vector3D(seamW, 0.1, this._scale),
            );
            seamMatrices.push(sm2);

            if (type !== CellType.FLOOR) {
              let rx = 0;
              let rz = 0;
              let rwx = wx,
                rwz = wz;
              if (type === CellType.RAMP_UP_N) {
                rx = Math.PI / 4;
                rwz = wz - this._scale / 2;
              } else if (type === CellType.RAMP_UP_S) {
                rx = -Math.PI / 4;
                rwz = wz + this._scale / 2;
              } else if (type === CellType.RAMP_UP_E) {
                rz = Math.PI / 4;
                rwx = wx + this._scale / 2;
              } else if (type === CellType.RAMP_UP_W) {
                rz = -Math.PI / 4;
                rwx = wx - this._scale / 2;
              }

              const rot = new Vector3D(rx, 0, rz);
              const rampLen = Math.sqrt(this._scale * this._scale + this._height * this._height);

              const w =
                type === CellType.RAMP_UP_E || type === CellType.RAMP_UP_W ? rampLen : this._scale;
              const d =
                type === CellType.RAMP_UP_N || type === CellType.RAMP_UP_S ? rampLen : this._scale;

              const rm = new Matrix4();
              rm.compose(
                new Vector3D(rwx, yOffset + this._height / 2, rwz),
                rot,
                new Vector3D(w, this._floorThickness, d),
              );
              wallMatrices.push(rm);
              addCollisionBox(
                w,
                this._floorThickness,
                d,
                rwx,
                yOffset + this._height / 2,
                rwz,
                rx,
                0,
                rz,
              );
            }
          } else if (type === CellType.HOLE) {
            const cm = new Matrix4();
            cm.compose(
              new Vector3D(wx, yOffset + this._height, wz),
              new Vector3D(),
              new Vector3D(this._scale, this._floorThickness, this._scale),
            );
            floorMatrices.push(cm);
            addCollisionBox(
              this._scale,
              this._floorThickness,
              this._scale,
              wx,
              yOffset + this._height,
              wz,
            );
          }
        }
      }
    }

    addInstanced("InstancedWalls", structureMat, wallMatrices);
    addInstanced("InstancedFloors", structureMat, floorMatrices);
    addInstanced("InstancedSeams", seamMat, seamMatrices);
  }
}
