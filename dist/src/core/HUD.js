export class HUD {
    element;
    constructor(enabled) {
        this.element = document.createElement("div");
        this.element.style.position = "absolute";
        this.element.style.top = "10px";
        this.element.style.left = "10px";
        this.element.style.color = "#00ff00";
        this.element.style.fontFamily = "monospace";
        this.element.style.fontSize = "14px";
        this.element.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        this.element.style.padding = "10px";
        this.element.style.borderRadius = "5px";
        this.element.style.pointerEvents = "none";
        this.element.style.display = enabled ? "block" : "none";
        document.body.appendChild(this.element);
    }
    update(fps, strategy, posX, posZ) {
        this.element.innerHTML = `
      <div><b>SmallWorld v0.8.34</b></div>
      <hr style="border:0; border-top:1px solid #00ff0033"/>
      <div>FPS: ${fps}</div>
      <div>CAM: ${strategy}</div>
      <div>POS: X: ${posX.toFixed(2)} | Z: ${posZ.toFixed(2)}</div>
      <div style="font-size: 10px; margin-top: 5px; color: #888">Tasten [1,2,3] Kamera ändern</div>
    `;
    }
}
//# sourceMappingURL=HUD.js.map