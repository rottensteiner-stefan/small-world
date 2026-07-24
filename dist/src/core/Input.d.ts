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
    preventPointerLock: boolean;
    private _keys;
    private _gamepadController;
    /** Mouse state including position and button status. */
    mouse: MouseState;
    /** Whether the pointer is currently locked. */
    isPointerLocked: boolean;
    /** Whether debug mode is enabled for input. */
    debug: boolean;
    get gamepadController(): UniversalGamepadController;
    requestJoyConConnection(): Promise<void>;
    /**
     * Initializes the input listeners.
     */
    init(): void;
    requestPointerLock(element: HTMLElement): void;
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
    /**
     * Helper for testing to manually set key state.
     */
    setKeyState(code: string | Keys, pressed: boolean): void;
}
