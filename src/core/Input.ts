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
    wheelX: number;
    wheelY: number;
    zoom: number;
    left: boolean;
    right: boolean;
  } = {
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    wheelX: 0,
    wheelY: 0,
    zoom: 0,
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
    window.addEventListener("keydown", (e: KeyboardEvent): void => {
      this._keys.set(e.code, true);
    });
    window.addEventListener("keyup", (e: KeyboardEvent): void => {
      this._keys.set(e.code, false);
    });
    window.addEventListener("mousedown", (e: MouseEvent): void => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (0 === e.button) {
        this.mouse.left = true;
      }
      if (2 === e.button) {
        this.mouse.right = true;
      }
    });
    window.addEventListener("mouseup", (e: MouseEvent): void => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (0 === e.button) {
        this.mouse.left = false;
      }
      if (2 === e.button) {
        this.mouse.right = false;
      }
    });
    window.addEventListener("mousemove", (e: MouseEvent): void => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (this.isPointerLocked) {
        this.mouse.dx += e.movementX;
        this.mouse.dy += e.movementY;
      } else {
        this.mouse.dx = 0;
        this.mouse.dy = 0;
      }
    });
    window.addEventListener(
      "wheel",
      (e: WheelEvent): void => {
        // Pinch-to-zoom on trackpads is often sent as a wheel event with ctrlKey
        if (e.ctrlKey) {
          e.preventDefault();
          this.mouse.zoom += e.deltaY * 0.01;
        } else {
          this.mouse.wheelX += e.deltaX;
          this.mouse.wheelY += e.deltaY;
          // Also add to zoom for standard mouse wheel convenience
          this.mouse.zoom += e.deltaY * 0.001;
        }
      },
      { passive: false },
    );

    // macOS specific gesture events for smoother pinching
    window.addEventListener("gesturechange", (e: Event): void => {
      e.preventDefault();
      const gestureEvent = e as unknown as { scale: number };
      // scale > 1 is zoom in (negative delta for distance usually), scale < 1 is zoom out
      // We map this to our zoom delta
      this.mouse.zoom += (1.0 - gestureEvent.scale) * 2.0;
    });

    window.addEventListener("contextmenu", (e: MouseEvent): void => e.preventDefault());

    document.addEventListener("pointerlockchange", (): void => {
      this.isPointerLocked = null !== document.pointerLockElement;
      if (this.debug) {
        console.log(`[Input] PointerLock changed: ${this.isPointerLocked}`);
      }
      if (!this.isPointerLocked) {
        this.mouse.dx = 0;
        this.mouse.dy = 0;
      }
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
      console.warn("[Input] Could not activate PointerLock:", e);
    }
  }

  /**
   * Checks if a key is currently pressed.
   * @param code The key code.
   * @returns True if the key is pressed.
   */
  public static isPressed(code: string | Keys): boolean {
    return true === this._keys.get(code);
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
