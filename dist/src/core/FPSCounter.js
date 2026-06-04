/// src/core/FPSCounter.ts
/**
 * Simple FPS counter that displays the current frames per second on the screen.
 */
export class FPSCounter {
    _last = performance.now();
    _frames = 0;
    _el = document.createElement("div");
    /**
     * Creates a new FPSCounter and adds it to the document body.
     */
    constructor() {
        Object.assign(this._el.style, {
            position: "fixed",
            top: "10px",
            left: "10px",
            color: "#0f0",
            fontFamily: "monospace",
            background: "#000",
            padding: "4px",
            zIndex: "1000",
        });
        document.body.appendChild(this._el);
    }
    /**
     * Updates the FPS counter. Should be called every frame.
     */
    update() {
        this._frames++;
        const now = performance.now();
        if (now >= this._last + 1000) {
            this._el.innerText = "FPS: " + this._frames;
            this._frames = 0;
            this._last = now;
        }
    }
}
//# sourceMappingURL=FPSCounter.js.map