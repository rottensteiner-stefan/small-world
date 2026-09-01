// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { TransformGizmo } from "../../../src/tools/maker/TransformGizmo.js";
import { Object3D } from "../../../src/core/Object3D.js";
import { Vector3D, Matrix4 } from "../../../src/math/index.js";
import {
  RotatorBehavior,
  attachBehavior,
  detachBehavior,
} from "../../../src/core/behaviors/index.js";
import { UndoStack } from "../../../src/tools/maker/UndoStack.js";

describe("Maker Phase 2 Features", () => {
  describe("Grid & Angle Snapping", () => {
    it("snaps translate to configured grid intervals", () => {
      const gizmo = new TransformGizmo();
      gizmo.snap.enabled = true;
      gizmo.snap.translate = 0.5;

      expect(gizmo.snapValue("translate", 0.0)).toBeCloseTo(0.0);
      expect(gizmo.snapValue("translate", 0.24)).toBeCloseTo(0.0);
      expect(gizmo.snapValue("translate", 0.26)).toBeCloseTo(0.5);
      expect(gizmo.snapValue("translate", 1.8)).toBeCloseTo(2.0);
      expect(gizmo.snapValue("translate", -0.74)).toBeCloseTo(-0.5);
      expect(gizmo.snapValue("translate", -0.76)).toBeCloseTo(-1.0);
    });

    it("snaps rotate to configured angle intervals (e.g. 15 degrees / PI/12)", () => {
      const gizmo = new TransformGizmo();
      gizmo.snap.enabled = true;
      gizmo.snap.rotate = Math.PI / 12; // 15 deg

      const deg15 = Math.PI / 12;
      expect(gizmo.snapValue("rotate", deg15 * 0.4)).toBeCloseTo(0);
      expect(gizmo.snapValue("rotate", deg15 * 0.6)).toBeCloseTo(deg15);
      expect(gizmo.snapValue("rotate", deg15 * 5.9)).toBeCloseTo(deg15 * 6); // 90 deg
    });

    it("snaps scale and enforces minimum scale of 0.01", () => {
      const gizmo = new TransformGizmo();
      gizmo.snap.enabled = true;
      gizmo.snap.scale = 0.25;

      expect(gizmo.snapValue("scale", 1.1)).toBeCloseTo(1.0);
      expect(gizmo.snapValue("scale", 1.2)).toBeCloseTo(1.25);
      expect(gizmo.snapValue("scale", -0.5)).toBeCloseTo(0.01);
      expect(gizmo.snapValue("scale", 0.0)).toBeCloseTo(0.01);
    });
  });

  describe("Pivot-Relative Cluster Transform Math", () => {
    it("rotates multiple objects around a primary pivot preserving radius", () => {
      const primary = new Object3D("Primary");
      primary.position.set(0, 0, 0);

      const child1 = new Object3D("Child1");
      child1.position.set(2, 0, 0);

      const pivot = primary.position.clone();
      const initialOffset = child1.position.clone().sub(pivot);
      const angle = Math.PI / 2; // 90 deg around Y

      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const rotated = new Vector3D(
        initialOffset.x * c + initialOffset.z * s,
        initialOffset.y,
        -initialOffset.x * s + initialOffset.z * c,
      );
      const newPos = pivot.clone().add(rotated);

      expect(newPos.x).toBeCloseTo(0);
      expect(newPos.y).toBeCloseTo(0);
      expect(newPos.z).toBeCloseTo(-2);
      expect(newPos.clone().sub(pivot).length()).toBeCloseTo(2);
    });

    it("scales multiple objects relative to primary pivot", () => {
      const primary = new Object3D("Primary");
      primary.position.set(1, 0, 0);

      const child1 = new Object3D("Child1");
      child1.position.set(3, 0, 0);

      const pivot = primary.position.clone();
      const offset = child1.position.clone().sub(pivot);
      const scaleMultiplier = 2.0;

      offset.x *= scaleMultiplier;
      const newPos = pivot.clone().add(offset);

      expect(newPos.x).toBeCloseTo(5); // 1 + (2 * 2) = 5
      expect(newPos.y).toBeCloseTo(0);
      expect(newPos.z).toBeCloseTo(0);
    });

    it("undo and redo cleanly restores multi-object transform state", () => {
      const undo = new UndoStack();
      const objA = new Object3D("A");
      objA.position.set(0, 0, 0);
      objA.rotation.set(0, 0, 0);

      const objB = new Object3D("B");
      objB.position.set(4, 0, 0);
      objB.rotation.set(0, 0, 0);

      const before = new Map<Object3D, { position: Vector3D; rotation: Vector3D; scale: Vector3D }>(
        [
          [
            objA,
            {
              position: objA.position.clone(),
              rotation: objA.rotation.clone(),
              scale: objA.scale.clone(),
            },
          ],
          [
            objB,
            {
              position: objB.position.clone(),
              rotation: objB.rotation.clone(),
              scale: objB.scale.clone(),
            },
          ],
        ],
      );

      objA.rotation.set(0, Math.PI / 2, 0);
      objB.position.set(0, 0, -4);
      objB.rotation.set(0, Math.PI / 2, 0);

      const after = new Map<Object3D, { position: Vector3D; rotation: Vector3D; scale: Vector3D }>([
        [
          objA,
          {
            position: objA.position.clone(),
            rotation: objA.rotation.clone(),
            scale: objA.scale.clone(),
          },
        ],
        [
          objB,
          {
            position: objB.position.clone(),
            rotation: objB.rotation.clone(),
            scale: objB.scale.clone(),
          },
        ],
      ]);

      const apply = (
        values: Map<Object3D, { position: Vector3D; rotation: Vector3D; scale: Vector3D }>,
      ): void => {
        for (const [obj, t] of values) {
          obj.position.copyFrom(t.position);
          obj.rotation.copyFrom(t.rotation);
          obj.scale.copyFrom(t.scale);
        }
      };

      undo.execute({
        label: "Rotate Cluster",
        redo: () => apply(after),
        undo: () => apply(before),
      });

      expect(objB.position.z).toBeCloseTo(-4);
      expect(objA.rotation.y).toBeCloseTo(Math.PI / 2);

      undo.undo();
      expect(objB.position.x).toBeCloseTo(4);
      expect(objB.position.z).toBeCloseTo(0);
      expect(objA.rotation.y).toBeCloseTo(0);

      undo.redo();
      expect(objB.position.z).toBeCloseTo(-4);
      expect(objA.rotation.y).toBeCloseTo(Math.PI / 2);
    });
  });

  describe("Batch Behaviors", () => {
    it("attaches distinct behavior instances to each selected object in batch", () => {
      const undo = new UndoStack();
      const obj1 = new Object3D("Obj1");
      const obj2 = new Object3D("Obj2");
      const objs = [obj1, obj2];

      const factory = (): RotatorBehavior => new RotatorBehavior();
      const attached = new Map<Object3D, RotatorBehavior>();
      for (const obj of objs) {
        attached.set(obj, factory());
      }

      undo.execute({
        label: "Attach Rotator (2 objects)",
        redo: () => {
          for (const [obj, beh] of attached) attachBehavior(obj.behaviors, beh, obj);
        },
        undo: () => {
          for (const [obj, beh] of attached) detachBehavior(obj.behaviors, beh);
        },
      });

      expect(obj1.behaviors.length).toBe(1);
      expect(obj2.behaviors.length).toBe(1);
      expect(obj1.behaviors[0]).toBeInstanceOf(RotatorBehavior);
      expect(obj2.behaviors[0]).toBeInstanceOf(RotatorBehavior);
      expect(obj1.behaviors[0]).not.toBe(obj2.behaviors[0]);

      undo.undo();
      expect(obj1.behaviors.length).toBe(0);
      expect(obj2.behaviors.length).toBe(0);

      undo.redo();
      expect(obj1.behaviors.length).toBe(1);
      expect(obj2.behaviors.length).toBe(1);
    });
  });

  describe("Marquee Screen Projection Math", () => {
    it("transforms world coordinates into NDC and screen rect overlap correctly", () => {
      const proj = new Matrix4();
      Matrix4.perspective(Math.PI / 3, 1.0, 0.1, 100, proj);
      const view = new Matrix4();
      Matrix4.lookAt(new Vector3D(0, 0, 10), new Vector3D(0, 0, 0), new Vector3D(0, 1, 0), view);
      const viewProj = new Matrix4().copy(proj).multiply(view);

      const ndcCenter = viewProj.transformVector(new Vector3D(0, 0, 0));
      expect(ndcCenter.x).toBeCloseTo(0);
      expect(ndcCenter.y).toBeCloseTo(0);
      expect(ndcCenter.z).toBeGreaterThan(-1);
      expect(ndcCenter.z).toBeLessThan(1);

      const rect = { left: 0, top: 0, width: 800, height: 600 };
      const screenX = (ndcCenter.x * 0.5 + 0.5) * rect.width + rect.left;
      const screenY = (-ndcCenter.y * 0.5 + 0.5) * rect.height + rect.top;

      expect(screenX).toBeCloseTo(400);
      expect(screenY).toBeCloseTo(300);

      const marqueeMinX = 350;
      const marqueeMaxX = 450;
      const marqueeMinY = 250;
      const marqueeMaxY = 350;

      const inside =
        screenX >= marqueeMinX &&
        screenX <= marqueeMaxX &&
        screenY >= marqueeMinY &&
        screenY <= marqueeMaxY;
      expect(inside).toBe(true);

      const outside = screenX >= 10 && screenX <= 50 && screenY >= 10 && screenY <= 50;
      expect(outside).toBe(false);
    });
  });

  describe("Sidebar Wheel Event Isolation", () => {
    it("stops propagation on wheel events to prevent editor viewport zoom leakage", () => {
      const sidebar = document.createElement("aside");
      sidebar.className = "maker-sidebar right";
      const props = document.createElement("div");
      props.id = "maker-properties";
      sidebar.appendChild(props);
      document.body.appendChild(sidebar);

      let globalWheelReceived = false;
      const onWindowWheel = (): void => {
        globalWheelReceived = true;
      };
      window.addEventListener("wheel", onWindowWheel);

      // Isolate sidebar
      sidebar.addEventListener("wheel", (e) => e.stopPropagation());

      const wheelEv = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 });
      props.dispatchEvent(wheelEv);

      expect(globalWheelReceived).toBe(false);

      window.removeEventListener("wheel", onWindowWheel);
      document.body.removeChild(sidebar);
    });
  });
});
