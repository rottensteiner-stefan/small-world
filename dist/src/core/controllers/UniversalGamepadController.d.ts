import { JoyConLeft, JoyConRight } from 'joy-con-webhid';
/**
 * Interface representing a generic gamepad device (standard or WebHID).
 */
export interface GamepadDevice {
    /** Descriptive identifier of the gamepad. */
    id: string;
    /** Whether the device is currently active and connected. */
    connected: boolean;
    /** Checks if a specific button is pressed using standard button indices (0-17). */
    isButtonPressed(buttonIndex: number): boolean;
    /** Returns the analog value of a specific axis (-1.0 to 1.0). */
    getAxis(axisIndex: number): number;
    /** Synchronizes state each frame. */
    update(): void;
}
/**
 * GamepadDevice implementation wrapping the native browser Gamepad API.
 */
export declare class StandardGamepadDevice implements GamepadDevice {
    id: string;
    connected: boolean;
    private _index;
    constructor(gamepad: Gamepad);
    private _getGamepad;
    isButtonPressed(buttonIndex: number): boolean;
    getAxis(axisIndex: number): number;
    update(): void;
}
/**
 * GamepadDevice implementation wrapping one or two Nintendo Joy-Cons via WebHID.
 */
export declare class JoyConGamepadDevice implements GamepadDevice {
    id: string;
    connected: boolean;
    private _leftDevice;
    private _rightDevice;
    private _buttonStates;
    private _axisStates;
    constructor(left: JoyConLeft | null, right: JoyConRight | null);
    private _setupListeners;
    private _handleInput;
    isButtonPressed(buttonIndex: number): boolean;
    getAxis(axisIndex: number): number;
    update(): void;
}
/**
 * Manages standard browser gamepads and WebHID Nintendo controllers.
 */
export declare class UniversalGamepadController {
    private _devices;
    private _joyConModule;
    private _initializedJoyCons;
    private _lastUpdateFrameTime;
    constructor();
    private _loadModule;
    /**
     * Prompts the user to connect a new Joy-Con controller using WebHID.
     * MUST be called in response to a user gesture (e.g. click).
     */
    requestJoyConConnection(): Promise<void>;
    private _initializeWebHIDDevices;
    /**
     * Updates all devices and scans for changes. Should be called once per frame.
     */
    update(force?: boolean): void;
    get devices(): GamepadDevice[];
    getActiveDevice(): GamepadDevice | null;
}
