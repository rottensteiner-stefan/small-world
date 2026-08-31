import { Scene, Object3D, AxesHelper } from "../../core/index.js";
import { Cube } from "../../geometry/index.js";
import { WireframeMaterial } from "../../core/materials/index.js";
import { Color } from "../../core/colors/index.js";
import { BoundingType } from "../../enums/index.js";
import { BoundingBox, BoundingSphere } from "../../physix/index.js";
import { Vector3D, MathPool } from "../../math/index.js";
import { AxesSettings } from "./types.js";

/**
 * Manages 3D visual selection gizmos and coordinate axes helpers in GadgetInspector.
 */
export class InspectorGizmos {
  public highlightMesh: Object3D;
  public worldAxes: AxesHelper;
  public objectAxes: AxesHelper;
  public axesSettings: AxesSettings = {
    showWorldAxes: false,
    showObjectAxes: false,
    axesScale: 1.0,
  };

  constructor(scene: Scene) {
    const geo = new Cube({ size: 1 });
    const mat = new WireframeMaterial(new Color(0.0, 1.0, 1.0));
    this.highlightMesh = new Object3D("InspectorHighlight");
    this.highlightMesh.geometry = geo.getGeometryData();
    this.highlightMesh.material = mat;
    this.highlightMesh.isVisible = false;
    scene.add(this.highlightMesh);

    const showLabels = typeof document !== "undefined";
    this.worldAxes = new AxesHelper({ size: 2.0, showLabels });
    this.worldAxes.name = "InspectorWorldAxes";
    this.worldAxes.isVisible = false;
    scene.add(this.worldAxes);

    this.objectAxes = new AxesHelper({ size: 1.0, showLabels });
    this.objectAxes.name = "InspectorObjectAxes";
    this.objectAxes.isVisible = false;
    scene.add(this.objectAxes);
  }

  /**
   * Checks whether the object is one of the inspector's own visual helpers.
   */
  public isGizmoObject(obj: Object3D): boolean {
    return obj === this.highlightMesh || obj === this.worldAxes || obj === this.objectAxes;
  }

  /**
   * Syncs the wireframe highlight mesh position and scale with the target object bounds.
   */
  public syncHighlightMesh(obj: Object3D): boolean {
    if (!obj.bounds) return false;

    const epsilon = new Vector3D(0.02, 0.02, 0.02);

    if (BoundingType.BOX === obj.bounds.type) {
      const box = obj.bounds as BoundingBox;
      const size = new Vector3D().copyFrom(box.max).sub(box.min).add(epsilon);
      this.highlightMesh.position.copyFrom(box.center);
      this.highlightMesh.scale.copyFrom(size);
      this.highlightMesh.updateMatrixWorld();
      return true;
    }

    if (BoundingType.SPHERE === obj.bounds.type) {
      const sphere = obj.bounds as BoundingSphere;
      const diameter = sphere.radius * 2;
      const size = new Vector3D(diameter, diameter, diameter).add(epsilon);
      this.highlightMesh.position.copyFrom(sphere.center);
      this.highlightMesh.scale.copyFrom(size);
      this.highlightMesh.updateMatrixWorld();
      return true;
    }

    return false;
  }

  /**
   * Updates gizmos in the render loop.
   */
  public update(selectedObject: Object3D | null): void {
    if (selectedObject && this.highlightMesh.isVisible) {
      if (selectedObject.geometry) {
        selectedObject.computeBounds();
      }
      this.syncHighlightMesh(selectedObject);
    }

    if (selectedObject && this.objectAxes.isVisible) {
      const pos = MathPool.acquireVector();
      const rot = MathPool.acquireVector();
      const sc = MathPool.acquireVector();
      selectedObject.worldMatrix.decompose(pos, rot, sc);
      this.objectAxes.position.copyFrom(pos);
      this.objectAxes.rotation.copyFrom(rot);
      this.objectAxes.updateMatrixWorld();
      MathPool.releaseVector(pos);
      MathPool.releaseVector(rot);
      MathPool.releaseVector(sc);
    }
  }
}
