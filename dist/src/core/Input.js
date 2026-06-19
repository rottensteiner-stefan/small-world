/// src/core/Input.ts
/**
 * Handles user input (keyboard and mouse).
 * Implements a static singleton pattern for global access,
 * but can be instantiated or mocked for testing.
 */
export class Input {
    static _instance;
    _keys = new Map();
    /** Mouse state including position and button status. */
    mouse = {
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
    isPointerLocked = false;
    /** Whether debug mode is enabled for input. */
    debug = false;
    /**
     * Gets the global singleton instance.
     */
    static get instance() {
        if (!this._instance) {
            this._instance = new Input();
        }
        return this._instance;
    }
    /**
     * Static accessors to maintain backward compatibility.
     */
    static get mouse() {
        return this.instance.mouse;
    }
    static get isPointerLocked() {
        return this.instance.isPointerLocked;
    }
    static set isPointerLocked(v) {
        this.instance.isPointerLocked = v;
    }
    static get debug() {
        return this.instance.debug;
    }
    static set debug(v) {
        this.instance.debug = v;
    }
    /**
     * Initializes the input listeners.
     */
    static init() {
        const inst = this.instance;
        window.addEventListener("keydown", (e) => {
            inst._keys.set(e.code, true);
        });
        window.addEventListener("keyup", (e) => {
            inst._keys.set(e.code, false);
        });
        window.addEventListener("mousedown", (e) => {
            inst.mouse.x = e.clientX;
            inst.mouse.y = e.clientY;
            if (0 === e.button) {
                inst.mouse.left = true;
            }
            if (2 === e.button) {
                inst.mouse.right = true;
            }
        });
        window.addEventListener("mouseup", (e) => {
            inst.mouse.x = e.clientX;
            inst.mouse.y = e.clientY;
            if (0 === e.button) {
                inst.mouse.left = false;
            }
            if (2 === e.button) {
                inst.mouse.right = false;
            }
        });
        window.addEventListener("mousemove", (e) => {
            inst.mouse.x = e.clientX;
            inst.mouse.y = e.clientY;
            if (inst.isPointerLocked) {
                inst.mouse.dx += e.movementX;
                inst.mouse.dy += e.movementY;
            }
            else {
                inst.mouse.dx = 0;
                inst.mouse.dy = 0;
            }
        });
        window.addEventListener("wheel", (e) => {
            // Pinch-to-zoom on trackpads is often sent as a wheel event with ctrlKey
            if (e.ctrlKey) {
                e.preventDefault();
                inst.mouse.zoom += e.deltaY * 0.01;
            }
            else {
                inst.mouse.wheelX += e.deltaX;
                inst.mouse.wheelY += e.deltaY;
                inst.mouse.zoom += e.deltaY * 0.001;
            }
        }, { passive: false });
        window.addEventListener("gesturechange", (e) => {
            e.preventDefault();
            const gestureEvent = e;
            inst.mouse.zoom += (1.0 - gestureEvent.scale) * 2.0;
        });
        window.addEventListener("contextmenu", (e) => e.preventDefault());
        window.addEventListener("blur", () => {
            inst._keys.clear();
            inst.mouse.left = false;
            inst.mouse.right = false;
            inst.mouse.dx = 0;
            inst.mouse.dy = 0;
        });
        document.addEventListener("pointerlockchange", () => {
            inst.isPointerLocked = null !== document.pointerLockElement;
            // Reset deltas when lock state changes to prevent jumping
            inst.mouse.dx = 0;
            inst.mouse.dy = 0;
        });
    }
    /** Global block flag to temporarily disable PointerLock requests (e.g. for inspector). */
    static preventPointerLock = false;
    static requestPointerLock(element) {
        if (true === Input.preventPointerLock) {
            return;
        }
        try {
            element.requestPointerLock();
        }
        catch (e) {
            console.warn("[Input] Could not activate PointerLock:", e);
        }
    }
    /** @inheritdoc */
    isPressed(code) {
        return true === this._keys.get(code);
    }
    /** @inheritdoc */
    getAxis(neg, pos) {
        let v = 0;
        if (this.isPressed(neg))
            v -= 1;
        if (this.isPressed(pos))
            v += 1;
        return v;
    }
    /** Static wrappers */
    static isPressed(code) {
        return this.instance.isPressed(code);
    }
    static getAxis(neg, pos) {
        return this.instance.getAxis(neg, pos);
    }
    /**
     * Helper for testing to manually set key state.
     */
    setKeyState(code, pressed) {
        this._keys.set(code, pressed);
    }
}
//# sourceMappingURL=Input.js.map