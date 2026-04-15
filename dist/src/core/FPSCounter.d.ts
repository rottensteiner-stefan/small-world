/**
 * Simple FPS counter that displays the current frames per second on the screen.
 */
export declare class FPSCounter {
    private _last;
    private _frames;
    private _el;
    /**
     * Creates a new FPSCounter and adds it to the document body.
     */
    constructor();
    /**
     * Updates the FPS counter. Should be called every frame.
     */
    update(): void;
}
