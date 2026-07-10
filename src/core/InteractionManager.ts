/// src/core/InteractionManager.ts
import { Scene } from "./Scene.js";
import { Camera } from "./Camera.js";
import { Input } from "./Input.js";
import { Object3D } from "./Object3D.js";
import { Raycaster, Intersection } from "../physix/index.js";
import { Vector2D } from "../math/index.js";

/**
 * Handles Gamification events: raycasts into the scene and triggers pointer events
 * on Object3D instances (onPointerEnter, onPointerLeave, onPointerClick).
 */
export class InteractionManager {
  private _raycaster: Raycaster = new Raycaster();
  private _ndcCoords: Vector2D = new Vector2D();
  private _hoveredObject: Object3D | null = null;
  private _activeObject: Object3D | null = null;
  private _wasLeftDown: boolean = false;

  constructor(
    public scene: Scene,
    public camera: Camera,
    public canvas: HTMLCanvasElement,
  ) {}

  /**
   * Called every frame to process input and fire events.
   */
  public update(): void {
    if (Input.isPointerLocked) {
      this._clearHover();
      this._wasLeftDown = Input.mouse.left;
      return;
    }

    const mouse = Input.mouse;
    const rect = this.canvas.getBoundingClientRect();
    const x = mouse.x - rect.left;
    const y = mouse.y - rect.top;

    // Check if mouse is outside canvas
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
      this._clearHover();
      this._wasLeftDown = Input.mouse.left;
      return;
    }

    this._ndcCoords.x = (x / rect.width) * 2 - 1;
    this._ndcCoords.y = -(y / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._ndcCoords, this.camera);

    let pickables: Object3D[] = [];
    if (this.scene.staticOctree || this.scene.dynamicOctree || this.scene.spatialHash) {
      const candidates = new Set<Object3D>();
      if (this.scene.staticOctree) {
        const staticHits = this.scene.staticOctree.queryRay(this._raycaster.ray);
        for (const obj of staticHits)
          if ((obj as Object3D).isPickable) candidates.add(obj as Object3D);
      }
      if (this.scene.spatialHash) {
        const hashHits = this.scene.spatialHash.queryRay(this._raycaster.ray);
        for (const obj of hashHits)
          if ((obj as Object3D).isPickable) candidates.add(obj as Object3D);
      }
      if (this.scene.dynamicOctree) {
        const dynamicHits = this.scene.dynamicOctree.queryRay(this._raycaster.ray);
        for (const obj of dynamicHits)
          if ((obj as Object3D).isPickable) candidates.add(obj as Object3D);
      }
      pickables = Array.from(candidates);
    } else {
      for (const obj of this.scene.objects) {
        this._getPickableObjects(obj, pickables);
      }
    }

    const intersects: Intersection[] = this._raycaster.intersectObjects(pickables, true);

    let hitObject: Object3D | null = null;
    const firstIntersect = intersects[0];
    if (firstIntersect) {
      hitObject = firstIntersect.object;
    }

    // Handle enter/leave
    if (hitObject !== this._hoveredObject) {
      if (this._hoveredObject && this._hoveredObject.onPointerLeave) {
        this._hoveredObject.onPointerLeave();
      }
      this._hoveredObject = hitObject;
      if (this._hoveredObject && this._hoveredObject.onPointerEnter) {
        this._hoveredObject.onPointerEnter();
      }
    }

    // Handle click (fire on mouse release if we started pressing over the canvas)
    const isLeftDown = mouse.left;
    if (!this._wasLeftDown && isLeftDown) {
      // Mouse just pressed
      if (this._hoveredObject) {
        this._activeObject = this._hoveredObject;
        if (this._activeObject.onPointerDown) {
          const point = this._raycaster.ray.at(firstIntersect ? firstIntersect.distance : 0);
          this._activeObject.onPointerDown(this._raycaster.ray, point);
        }
      }
    } else if (this._wasLeftDown && !isLeftDown) {
      // Mouse just released
      if (this._activeObject) {
        if (this._activeObject.onPointerUp) {
          this._activeObject.onPointerUp();
        }
        if (this._activeObject === this._hoveredObject && this._activeObject.onPointerClick) {
          this._activeObject.onPointerClick();
        }
      }
      this._activeObject = null;
    }

    if (this._activeObject && this._activeObject.onPointerMove) {
      this._activeObject.onPointerMove(this._raycaster.ray);
    }

    this._wasLeftDown = isLeftDown;
  }

  private _clearHover(): void {
    if (this._hoveredObject) {
      if (this._hoveredObject.onPointerLeave) {
        this._hoveredObject.onPointerLeave();
      }
      this._hoveredObject = null;
    }
  }

  private _getPickableObjects(parent: Object3D, out: Object3D[]): void {
    if (parent.isPickable) {
      parent.computeBounds();
      out.push(parent);
    }
    for (const child of parent.children) {
      this._getPickableObjects(child, out);
    }
  }
}
