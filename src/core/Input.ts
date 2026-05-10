/// src/core/Input.ts

import { Keys } from "../enums/Keys.js";

/**
 * Interface for mouse state.
 */
export interface MouseState {
  x: number;
  y: number;
  dx: number;
  dy: number;
  wheelX: number;
  wheelY: number;
  zoom: number;
  left: boolean;
  right: boolean;
}

/**
 * Interface for Input management to allow mocking and dependency injection.
 */
export interface InputInterface {
  mouse: MouseState;
  isPointerLocked: boolean;
  isPressed(code: string | Keys): boolean;
  getAxis(neg: string | Keys, pos: string | Keys): number;
}

/**
 * Handles user input (keyboard and mouse).
 * Implements a static singleton pattern for global access, 
 * but can be instantiated or mocked for testing.
 */
export class Input implements InputInterface {
  private static _instance: Input;
  private _keys: Map<string, boolean> = new Map<string, boolean>();

  /** Mouse state including position and button status. */
  public mouse: MouseState = {
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
  public isPointerLocked: boolean = false;
  /** Whether debug mode is enabled for input. */
  public debug: boolean = false;

  /**
   * Gets the global singleton instance.
   */
  public static get instance(): Input {
    if (!this._instance) {
      this._instance = new Input();
    }
    return this._instance;
  }

  /**
   * Static accessors to maintain backward compatibility.
   */
  public static get mouse(): MouseState { return this.instance.mouse; }
  public static get isPointerLocked(): boolean { return this.instance.isPointerLocked; }
  public static set isPointerLocked(v: boolean) { this.instance.isPointerLocked = v; }
  public static get debug(): boolean { return this.instance.debug; }
  public static set debug(v: boolean) { this.instance.debug = v; }

  /**
   * Initializes the input listeners.
   */
  public static init(): void {
    const inst = this.instance;
    window.addEventListener("keydown", (e: KeyboardEvent): void => {
      inst._keys.set(e.code, true);
    });
    window.addEventListener("keyup", (e: KeyboardEvent): void => {
      inst._keys.set(e.code, false);
    });
    window.addEventListener("mousedown", (e: MouseEvent): void => {
      inst.mouse.x = e.clientX;
      inst.mouse.y = e.clientY;
      if (0 === e.button) {
        inst.mouse.left = true;
      }
      if (2 === e.button) {
        inst.mouse.right = true;
      }
    });
    window.addEventListener("mouseup", (e: MouseEvent): void => {
      inst.mouse.x = e.clientX;
      inst.mouse.y = e.clientY;
      if (0 === e.button) {
        inst.mouse.left = false;
      }
      if (2 === e.button) {
        inst.mouse.right = false;
      }
    });
    window.addEventListener("mousemove", (e: MouseEvent): void => {
      inst.mouse.x = e.clientX;
      inst.mouse.y = e.clientY;
      if (inst.isPointerLocked) {
        inst.mouse.dx += e.movementX;
        inst.mouse.dy += e.movementY;
      } else {
        inst.mouse.dx = 0;
        inst.mouse.dy = 0;
      }
    });
    window.addEventListener(
      "wheel",
      (e: WheelEvent): void => {
        // Pinch-to-zoom on trackpads is often sent as a wheel event with ctrlKey
        if (e.ctrlKey) {
          e.preventDefault();
          inst.mouse.zoom += e.deltaY * 0.01;
        } else {
          inst.mouse.wheelX += e.deltaX;
          inst.mouse.wheelY += e.deltaY;
          inst.mouse.zoom += e.deltaY * 0.001;
        }
      },
      { passive: false },
    );

    window.addEventListener("gesturechange", (e: Event): void => {
      e.preventDefault();
      const gestureEvent = e as unknown as { scale: number };
      inst.mouse.zoom += (1.0 - gestureEvent.scale) * 2.0;
    });

    window.addEventListener("contextmenu", (e: MouseEvent): void => e.preventDefault());

    document.addEventListener("pointerlockchange", (): void => {
      inst.isPointerLocked = null !== document.pointerLockElement;
      if (!inst.isPointerLocked) {
        inst.mouse.dx = 0;
        inst.mouse.dy = 0;
      }
    });
  }

  public static requestPointerLock(element: HTMLElement): void {
    try {
      element.requestPointerLock();
    } catch (e: unknown) {
      console.warn("[Input] Could not activate PointerLock:", e);
    }
  }

  /** @inheritdoc */
  public isPressed(code: string | Keys): boolean {
    return true === this._keys.get(code);
  }

  /** @inheritdoc */
  public getAxis(neg: string | Keys, pos: string | Keys): number {
    let v: number = 0;
    if (this.isPressed(neg)) v -= 1;
    if (this.isPressed(pos)) v += 1;
    return v;
  }

  /** Static wrappers */
  public static isPressed(code: string | Keys): boolean { return this.instance.isPressed(code); }
  public static getAxis(neg: string | Keys, pos: string | Keys): number { return this.instance.getAxis(neg, pos); }

  /**
   * Helper for testing to manually set key state.
   */
  public setKeyState(code: string | Keys, pressed: boolean): void {
    this._keys.set(code, pressed);
  }
}
