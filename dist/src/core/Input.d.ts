import { UniversalGamepadController } from './UniversalGamepadController.js';
import { Keys } from '../enums/index.js';
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
export declare class Input implements InputInterface {
    private static _instance;
    private _keys;
    private _gamepadController;
    /** Mouse state including position and button status. */
    mouse: MouseState;
    /** Whether the pointer is currently locked. */
    isPointerLocked: boolean;
    /** Whether debug mode is enabled for input. */
    debug: boolean;
    /**
     * Gets the global singleton instance.
     */
    static get instance(): Input;
    /**
     * Static accessors to maintain backward compatibility.
     */
    static get mouse(): MouseState;
    static get isPointerLocked(): boolean;
    static set isPointerLocked(v: boolean);
    static get debug(): boolean;
    static set debug(v: boolean);
    static get gamepadController(): UniversalGamepadController;
    static requestJoyConConnection(): Promise<void>;
    /**
     * Initializes the input listeners.
     */
    static init(): void;
    /** Global block flag to temporarily disable PointerLock requests (e.g. for inspector). */
    static preventPointerLock: boolean;
    static requestPointerLock(element: HTMLElement): void;
    /** @inheritdoc */
    isPressed(code: string | Keys): boolean;
    /** @inheritdoc */
    getAxis(neg: string | Keys, pos: string | Keys): number;
    private _lastDebugLog;
    /**
     * Polls gamepad look axes and accumulates them into mouse deltas.
     * Should be called once per frame.
     */
    update(): void;
    /** Static wrappers */
    static isPressed(code: string | Keys): boolean;
    static getAxis(neg: string | Keys, pos: string | Keys): number;
    static update(): void;
    /**
     * Helper for testing to manually set key state.
     */
    setKeyState(code: string | Keys, pressed: boolean): void;
}
