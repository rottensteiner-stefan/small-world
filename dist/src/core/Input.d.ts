import { Keys } from '../enums/Keys.js';
/**
 * Handles user input (keyboard and mouse).
 */
export declare class Input {
    private static _keys;
    /** Mouse state including position and button status. */
    static mouse: {
        x: number;
        y: number;
        dx: number;
        dy: number;
        wheelX: number;
        wheelY: number;
        zoom: number;
        left: boolean;
        right: boolean;
    };
    /** Whether the pointer is currently locked. */
    static isPointerLocked: boolean;
    /** Whether debug mode is enabled for input. */
    static debug: boolean;
    /**
     * Initializes the input listeners.
     */
    static init(): void;
    /**
     * Requests a pointer lock on the given element.
     * @param element The element to lock the pointer to.
     */
    static requestPointerLock(element: HTMLElement): void;
    /**
     * Checks if a key is currently pressed.
     * @param code The key code.
     * @returns True if the key is pressed.
     */
    static isPressed(code: string | Keys): boolean;
    /**
     * Returns the value of an axis defined by two keys.
     * @param neg The key for negative direction.
     * @param pos The key for positive direction.
     * @returns -1, 0, or 1.
     */
    static getAxis(neg: string | Keys, pos: string | Keys): number;
}
