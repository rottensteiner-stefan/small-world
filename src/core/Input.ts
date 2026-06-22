/// src/core/Input.ts

import { Keys } from "../enums/Keys.js";
import { UniversalGamepadController } from "./UniversalGamepadController.js";

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
  private _gamepadController: UniversalGamepadController = new UniversalGamepadController();

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
  public static get mouse(): MouseState {
    return this.instance.mouse;
  }
  public static get isPointerLocked(): boolean {
    return this.instance.isPointerLocked;
  }
  public static set isPointerLocked(v: boolean) {
    this.instance.isPointerLocked = v;
  }
  public static get debug(): boolean {
    return this.instance.debug;
  }
  public static set debug(v: boolean) {
    this.instance.debug = v;
  }
  public static get gamepadController(): UniversalGamepadController {
    return this.instance._gamepadController;
  }
  public static requestJoyConConnection(): Promise<void> {
    return this.instance._gamepadController.requestJoyConConnection();
  }

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

    window.addEventListener("blur", (): void => {
      inst._keys.clear();
      inst.mouse.left = false;
      inst.mouse.right = false;
      inst.mouse.dx = 0;
      inst.mouse.dy = 0;
    });

    document.addEventListener("pointerlockchange", (): void => {
      inst.isPointerLocked = null !== document.pointerLockElement;
      // Reset deltas when lock state changes to prevent jumping
      inst.mouse.dx = 0;
      inst.mouse.dy = 0;
    });

    window.addEventListener("gamepadconnected", (e: GamepadEvent): void => {
      console.log(
        `[Input] Gamepad connected: ${e.gamepad.id} | Mapping: ${e.gamepad.mapping} | Axes: ${e.gamepad.axes.length} | Buttons: ${e.gamepad.buttons.length}`,
      );
    });
    window.addEventListener("gamepaddisconnected", (e: GamepadEvent): void => {
      console.log(`[Input] Gamepad disconnected: ${e.gamepad.id}`);
    });
  }

  /** Global block flag to temporarily disable PointerLock requests (e.g. for inspector). */
  public static preventPointerLock: boolean = false;

  public static requestPointerLock(element: HTMLElement): void {
    if (true === Input.preventPointerLock) {
      return;
    }
    try {
      element.requestPointerLock();
    } catch (e: unknown) {
      console.warn("[Input] Could not activate PointerLock:", e);
    }
  }

  /** @inheritdoc */
  public isPressed(code: string | Keys): boolean {
    if (true === this._keys.get(code)) {
      return true;
    }

    const gp = this._gamepadController.getActiveDevice();
    if (gp) {
      const deadzone = 0.5;

      // Map left stick directions to movement keys
      if (code === Keys.W || code === Keys.UP) {
        if (gp.getAxis(1) < -deadzone) return true;
      }
      if (code === Keys.S || code === Keys.DOWN) {
        if (gp.getAxis(1) > deadzone) return true;
      }
      if (code === Keys.A || code === Keys.LEFT) {
        if (gp.getAxis(0) < -deadzone) return true;
      }
      if (code === Keys.D || code === Keys.RIGHT) {
        if (gp.getAxis(0) > deadzone) return true;
      }

      // Map gamepad button 0 (A / Cross) to Space
      if (code === Keys.SPACE) {
        if (gp.isButtonPressed(0)) return true;
      }

      // Map D-Pad buttons
      if (code === Keys.UP) {
        if (gp.isButtonPressed(12)) return true;
      }
      if (code === Keys.DOWN) {
        if (gp.isButtonPressed(13)) return true;
      }
      if (code === Keys.LEFT) {
        if (gp.isButtonPressed(14)) return true;
      }
      if (code === Keys.RIGHT) {
        if (gp.isButtonPressed(15)) return true;
      }
    }

    return false;
  }

  /** @inheritdoc */
  public getAxis(neg: string | Keys, pos: string | Keys): number {
    let v: number = 0;
    if (this.isPressed(neg)) v -= 1;
    if (this.isPressed(pos)) v += 1;

    const gp = this._gamepadController.getActiveDevice();
    if (gp) {
      const deadzone = 0.15;
      if ((neg === Keys.W || neg === Keys.UP) && (pos === Keys.S || pos === Keys.DOWN)) {
        const val = gp.getAxis(1);
        if (Math.abs(val) > deadzone) {
          v += val;
        }
      }
      if ((neg === Keys.A || neg === Keys.LEFT) && (pos === Keys.D || pos === Keys.RIGHT)) {
        const val = gp.getAxis(0);
        if (Math.abs(val) > deadzone) {
          v += val;
        }
      }
    }

    return Math.max(-1.0, Math.min(1.0, v));
  }

  private _lastDebugLog: number = 0;

  /**
   * Polls gamepad look axes and accumulates them into mouse deltas.
   * Should be called once per frame.
   */
  public update(): void {
    this._gamepadController.update();
    const gp = this._gamepadController.getActiveDevice();
    if (!gp) return;

    const deadzone = 0.15;
    const rx = gp.getAxis(2);
    const ry = gp.getAxis(3);

    // Accumulate right stick movements into mouse.dx / mouse.dy
    if (Math.abs(rx) > deadzone) {
      this.mouse.dx += rx * 15.0;
    }
    if (Math.abs(ry) > deadzone) {
      this.mouse.dy += ry * 15.0;
    }

    // Diagnostics logging when debug is enabled
    if (this.debug) {
      const now = performance.now();
      if (now - this._lastDebugLog > 500) {
        // throttle log to every 500ms
        const axes: string[] = [];
        for (let i = 0; i < 4; i++) {
          const val = gp.getAxis(i);
          if (Math.abs(val) > 0.05) {
            axes.push(`Axis ${i}: ${val.toFixed(2)}`);
          }
        }
        const buttons: string[] = [];
        for (let i = 0; i < 18; i++) {
          if (gp.isButtonPressed(i)) {
            buttons.push(`Btn ${i}: Pressed`);
          }
        }

        if (axes.length > 0 || buttons.length > 0) {
          console.log(
            `[Input Gamepad Debug] ${gp.id} | Axes: [${axes.join(", ")}] | Buttons: [${buttons.join(", ")}]`,
          );
          this._lastDebugLog = now;
        }
      }
    }
  }

  /** Static wrappers */
  public static isPressed(code: string | Keys): boolean {
    return this.instance.isPressed(code);
  }
  public static getAxis(neg: string | Keys, pos: string | Keys): number {
    return this.instance.getAxis(neg, pos);
  }
  public static update(): void {
    this.instance.update();
  }

  /**
   * Helper for testing to manually set key state.
   */
  public setKeyState(code: string | Keys, pressed: boolean): void {
    this._keys.set(code, pressed);
  }
}
