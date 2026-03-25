/// src/core/Input.ts

import { Keys } from "../enums/Keys.js";

/**
 * Handles user input (keyboard and mouse).
 */
export class Input {
  private static _keys: Map<string, boolean> = new Map<string, boolean>();

  /** Mouse state including position and button status. */
  public static mouse: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    left: boolean;
    right: boolean;
  } = {
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    left: false,
    right: false,
  };

  /** Whether the pointer is currently locked. */
  public static isPointerLocked: boolean = false;
  /** Whether debug mode is enabled for input. */
  public static debug: boolean = false;

  /**
   * Initializes the input listeners.
   */
  public static init(): void {
    window.addEventListener("keydown", (e: KeyboardEvent) => this._keys.set(e.code, true));
    window.addEventListener("keyup", (e: KeyboardEvent) => this._keys.set(e.code, false));
    window.addEventListener("mousedown", (e: MouseEvent) => {
      if (0 === e.button) {
        this.mouse.left = true;
      }
      if (2 === e.button) {
        this.mouse.right = true;
      }
    });
    window.addEventListener("mouseup", (e: MouseEvent) => {
      if (0 === e.button) {
        this.mouse.left = false;
      }
      if (2 === e.button) {
        this.mouse.right = false;
      }
    });
    window.addEventListener("mousemove", (e: MouseEvent) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.dx += e.movementX;
      this.mouse.dy += e.movementY;
    });
    window.addEventListener("contextmenu", (e: MouseEvent) => e.preventDefault());

    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = undefined !== document.pointerLockElement;
    });
  }

  /**
   * Requests a pointer lock on the given element.
   * @param element The element to lock the pointer to.
   */
  public static requestPointerLock(element: HTMLElement): void {
    try {
      element.requestPointerLock();
    } catch (e: unknown) {
      console.warn("[Input] Konnte PointerLock nicht aktivieren:", e);
    }
  }

  /**
   * Checks if a key is currently pressed.
   * @param code The key code.
   * @returns True if the key is pressed.
   */
  public static isPressed(code: string | Keys): boolean {
    return this._keys.get(code) === true;
  }

  /**
   * Returns the value of an axis defined by two keys.
   * @param neg The key for negative direction.
   * @param pos The key for positive direction.
   * @returns -1, 0, or 1.
   */
  public static getAxis(neg: string | Keys, pos: string | Keys): number {
    let v: number = 0;
    if (this.isPressed(neg)) {
      v -= 1;
    }
    if (this.isPressed(pos)) {
      v += 1;
    }
    return v;
  }
}
