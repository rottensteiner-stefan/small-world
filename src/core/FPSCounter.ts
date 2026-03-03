export class FPSCounter {
    private last = performance.now(); private frames = 0; private el = document.createElement("div");
    constructor() { Object.assign(this.el.style, { position:"fixed", top:"10px", left:"10px", color:"#0f0", fontFamily:"monospace", background:"#000", padding:"4px", zIndex:"1000" }); document.body.appendChild(this.el); }
    public update() { this.frames++; const now = performance.now(); if(now >= this.last + 1000) { this.el.innerText = "FPS: " + this.frames; this.frames = 0; this.last = now; } }
}
