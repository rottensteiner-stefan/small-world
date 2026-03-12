/// src/core/Input.ts
import { Keys } from "../enums/Keys.js";

export class Input {
  private static keys = new Map<string, boolean>();
  public static mouse = { x: 0, y: 0, dx: 0, dy: 0, right: false };
  public static isPointerLocked = false;
  public static debug = false;

  public static init() {
    window.addEventListener("keydown", (e) => this.keys.set(e.code, true));
    window.addEventListener("keyup", (e) => this.keys.set(e.code, false));
    window.addEventListener("mousedown", (e) => {
      if (e.button === 2) this.mouse.right = true;
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 2) this.mouse.right = false;
    });
    window.addEventListener("mousemove", (e) => {
      // WICHTIG: += summiert die Bewegung sauber auf, bis das nächste Frame gerendert wird!
      this.mouse.dx += e.movementX;
      this.mouse.dy += e.movementY;
    });
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    // Pointer Lock Events
    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = document.pointerLockElement !== null;
    });
  }

  public static requestPointerLock(element: HTMLElement) {
    try {
      element.requestPointerLock();
    } catch (e) {
      console.warn("[Input] Konnte PointerLock nicht aktivieren:", e);
    }
  }

  public static isPressed(code: string | Keys): boolean {
    return this.keys.get(code) === true;
  }

  public static getAxis(neg: string | Keys, pos: string | Keys): number {
    let v = 0;
    if (this.isPressed(neg)) v -= 1;
    if (this.isPressed(pos)) v += 1;
    return v;
  }
}
