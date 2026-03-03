export class Input {
    static keys = new Map();
    static mouse = { x: 0, y: 0, dx: 0, dy: 0, right: false };
    static debug = false;
    static init() {
        window.addEventListener("keydown", e => {
            this.keys.set(e.code, true);
            if (this.debug)
                console.log("%c[Input] Key Down: " + e.code, "color: #ff0");
        });
        window.addEventListener("keyup", e => this.keys.set(e.code, false));
        window.addEventListener("mousedown", e => { if (e.button === 2)
            this.mouse.right = true; });
        window.addEventListener("mouseup", e => { if (e.button === 2)
            this.mouse.right = false; });
        window.addEventListener("mousemove", e => { this.mouse.dx = e.movementX; this.mouse.dy = e.movementY; });
        window.addEventListener("contextmenu", e => e.preventDefault());
    }
    // DIE VERMISSTE METHODE
    static isPressed(code) {
        return this.keys.get(code) === true;
    }
    static getAxis(neg, pos) {
        let v = 0;
        if (this.isPressed(neg))
            v -= 1;
        if (this.isPressed(pos))
            v += 1;
        return v;
    }
}
//# sourceMappingURL=Input.js.map