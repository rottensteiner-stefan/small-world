import { Object3D, Scene, InstancedMesh } from "../../../core/index.js";
import { AbstractMaterial, FrostglassMaterial } from "../../../core/materials/index.js";
import { Vector3D, Matrix4 } from "../../../math/index.js";
import { Cube } from "../../../geometry/index.js";
import { CellType } from "../enums/CellType.js";
import { ObjectTags } from "../enums/ObjectTags.js";
import { MazeGenerator } from "./MazeGenerator.js";

export class LevelBuilder {
  private _scale: number = 4.0;
  private _height: number = 4.0;
  private _floorThickness: number = 0.2;

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
    frostglassMat: FrostglassMaterial,
    ledMat: AbstractMaterial,
    shortcutSeamMat: AbstractMaterial,
  ): void {
    const cubeGeo = new Cube({ size: 1 }).getGeometryData();

    const wallMatrices: Matrix4[] = [];
    // Floor-facing-up and ceiling-facing-down plates get their own arrays/material now (a
    // tread-plate floor reads distinctly from the wall/ceiling panelling) -- they used to
    // share one "structure" array+material with the walls.
    const floorMatrices: Matrix4[] = [];
    const ceilingMatrices: Matrix4[] = [];
    const seamMatrices: Matrix4[] = [];
    const ledMatrices: Matrix4[] = [];
    const shortcutSeamMatrices: Matrix4[] = [];

    /** FLOOR/RAMP/FLOOR_SHORTCUT cells only ever get a seam drawn against these -- a
     *  WALL_FROSTGLASS neighbor gets the brighter `ledMat` strip instead of the ordinary seam. */
    const isFloorLike = (t: CellType): boolean =>
      t === CellType.FLOOR ||
      t === CellType.FLOOR_SHORTCUT ||
      t === CellType.RAMP_UP_N ||
      t === CellType.RAMP_UP_E ||
      t === CellType.RAMP_UP_S ||
      t === CellType.RAMP_UP_W;

    /** Picks which seam array a cell's own edge belongs in: a WALL_FROSTGLASS neighbor
     *  always wins (bright LED strip), otherwise a FLOOR_SHORTCUT cell gets the cyan Maze
     *  Flow seam instead of the ordinary violet one. */
    const pickSeamArray = (ownType: CellType, neighbor: CellType): Matrix4[] => {
      if (neighbor === CellType.WALL_FROSTGLASS) return ledMatrices;
      if (ownType === CellType.FLOOR_SHORTCUT) return shortcutSeamMatrices;
      return seamMatrices;
    };

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
          } else if (type === CellType.WALL_FROSTGLASS) {
            // Rendered as its own tagged Object3D rather than folded into InstancedWalls --
            // Controller._getFrostglassPanels() finds panels by scanning scene.objects for
            // ObjectTags.FROSTGLASS, and each needs an independent material instance so its
            // Clarity Pulse reveal can animate without lighting up every other panel too.
            const panel = new Object3D(`FrostglassPanel_${f}_${x}_${z}`);
            panel.geometry = cubeGeo;
            panel.material = frostglassMat.clone();
            panel.tag = ObjectTags.FROSTGLASS;
            panel.setScale(this._scale, this._height, this._scale);
            panel.position.set(wx, yOffset + this._height / 2, wz);
            panel.isStatic = true;
            panel.isCollidable = false;
            panel.updateMatrixWorld();
            panel.computeBounds();
            scene.add(panel);
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
            type === CellType.FLOOR_SHORTCUT ||
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
            ceilingMatrices.push(cm);
            addCollisionBox(
              this._scale,
              this._floorThickness,
              this._scale,
              wx,
              yOffset + this._height,
              wz,
            );

            const seamW = 0.1;

            // This cell always draws its own -z/-x edges (the +z/+x neighbor, if any,
            // draws the shared edge on its own -z/-x pass instead -- see below). Whichever
            // side a WALL_FROSTGLASS panel sits on, floor or ceiling, gets the brighter
            // `ledMat` strip instead of the ordinary seam.
            const southNeighbor = z < maze.depth - 1 ? maze.grid[f]![z + 1]![x]! : CellType.WALL;
            const southArr = pickSeamArray(type, southNeighbor);
            const sm = new Matrix4();
            sm.compose(
              new Vector3D(wx, yOffset + 0.05, wz - this._scale / 2 + 0.1),
              new Vector3D(),
              new Vector3D(this._scale, 0.1, seamW),
            );
            southArr.push(sm);
            const csm = new Matrix4();
            csm.compose(
              new Vector3D(wx, yOffset + this._height - 0.05, wz - this._scale / 2 + 0.1),
              new Vector3D(),
              new Vector3D(this._scale, 0.1, seamW),
            );
            southArr.push(csm);

            const westNeighbor = x > 0 ? maze.grid[f]![z]![x - 1]! : CellType.WALL;
            const westArr = pickSeamArray(type, westNeighbor);
            const sm2 = new Matrix4();
            sm2.compose(
              new Vector3D(wx - this._scale / 2 + 0.1, yOffset + 0.05, wz),
              new Vector3D(),
              new Vector3D(seamW, 0.1, this._scale),
            );
            westArr.push(sm2);
            const csm2 = new Matrix4();
            csm2.compose(
              new Vector3D(wx - this._scale / 2 + 0.1, yOffset + this._height - 0.05, wz),
              new Vector3D(),
              new Vector3D(seamW, 0.1, this._scale),
            );
            westArr.push(csm2);

            // The +z/+x edges are only ever drawn by a FLOOR/RAMP neighbor doing the same on
            // ITS -z/-x side -- so a cell whose +z or +x neighbor is a wall gets no seam
            // there at all unless it's added here too.
            const northNeighbor = z > 0 ? maze.grid[f]![z - 1]![x]! : CellType.WALL;
            if (!isFloorLike(northNeighbor)) {
              const northArr = pickSeamArray(type, northNeighbor);
              const nm = new Matrix4();
              nm.compose(
                new Vector3D(wx, yOffset + 0.05, wz + this._scale / 2 - 0.1),
                new Vector3D(),
                new Vector3D(this._scale, 0.1, seamW),
              );
              northArr.push(nm);
              const ncm = new Matrix4();
              ncm.compose(
                new Vector3D(wx, yOffset + this._height - 0.05, wz + this._scale / 2 - 0.1),
                new Vector3D(),
                new Vector3D(this._scale, 0.1, seamW),
              );
              northArr.push(ncm);
            }

            const eastNeighbor = x < maze.width - 1 ? maze.grid[f]![z]![x + 1]! : CellType.WALL;
            if (!isFloorLike(eastNeighbor)) {
              const eastArr = pickSeamArray(type, eastNeighbor);
              const em = new Matrix4();
              em.compose(
                new Vector3D(wx + this._scale / 2 - 0.1, yOffset + 0.05, wz),
                new Vector3D(),
                new Vector3D(seamW, 0.1, this._scale),
              );
              eastArr.push(em);
              const ecm = new Matrix4();
              ecm.compose(
                new Vector3D(wx + this._scale / 2 - 0.1, yOffset + this._height - 0.05, wz),
                new Vector3D(),
                new Vector3D(seamW, 0.1, this._scale),
              );
              eastArr.push(ecm);
            }

            if (type !== CellType.FLOOR && type !== CellType.FLOOR_SHORTCUT) {
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
            ceilingMatrices.push(cm);
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

    addInstanced("InstancedWalls", wallMat, wallMatrices);
    addInstanced("InstancedFloors", floorMat, floorMatrices);
    addInstanced("InstancedCeilings", wallMat, ceilingMatrices);
    addInstanced("InstancedSeams", seamMat, seamMatrices);
    addInstanced("InstancedFrostglassLeds", ledMat, ledMatrices);
    addInstanced("InstancedShortcutSeams", shortcutSeamMat, shortcutSeamMatrices);
  }
}
