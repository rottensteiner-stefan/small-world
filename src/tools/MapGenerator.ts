import { ForgeTool, ForgeToolOptions } from "./forge/ForgeTool.js";

export class MapGenerator extends ForgeTool {
  private _gridWidth = 40;
  private _gridHeight = 25;
  private _cellSize = 16;
  private _grid: string[][] = [];

  private _canvas!: HTMLCanvasElement;
  private _ctx!: CanvasRenderingContext2D;
  private _textArea!: HTMLTextAreaElement;

  private _inputW!: HTMLInputElement;
  private _inputH!: HTMLInputElement;

  private _currentChar: string = "W";
  private _isDrawing = false;

  private _hoverX = -1;
  private _hoverY = -1;

  // Mapping characters to colors for rendering
  private _palette: Record<string, { color: string; label: string }> = {
    W: { color: "#555555", label: "Wall" },
    G: { color: "#444444", label: "Wall 2" },
    "+": { color: "#00ff00", label: "Door" },
    O: { color: "#005500", label: "Secret" },
    P: { color: "#0000ff", label: "Player" },
    E: { color: "#ff0000", label: "Enemy" },
    b: { color: "#a0522d", label: "Barrel" },
    I: { color: "#ffd700", label: "Item" },
    l: { color: "#ffaa00", label: "Torch" },
    T: { color: "#ff5500", label: "Lava" },
    "~": { color: "#00ffaa", label: "Slime" },
    ".": { color: "#1a1a1a", label: "Empty" },
  };

  constructor(options: ForgeToolOptions = {}) {
    super(options);
    this._initGrid();
    this._injectCSS();
    this._buildUI();
    this._bindEvents();
    this._render();
  }

  private _initGrid(): void {
    this._grid = [];
    for (let y = 0; y < this._gridHeight; y++) {
      const row: string[] = [];
      for (let x = 0; x < this._gridWidth; x++) {
        row.push(".");
      }
      this._grid.push(row);
    }
  }

  private _resizeGrid(newW: number, newH: number): void {
    const oldGrid = this._grid;
    this._gridWidth = newW;
    this._gridHeight = newH;
    this._grid = [];

    for (let y = 0; y < this._gridHeight; y++) {
      const row: string[] = [];
      for (let x = 0; x < this._gridWidth; x++) {
        if (oldGrid[y] && oldGrid[y]![x]) {
          row.push(oldGrid[y]![x]!);
        } else {
          row.push(".");
        }
      }
      this._grid.push(row);
    }
    this._render();
  }

  private _injectCSS(): void {
    if (document.getElementById("mapgen-style")) return;
    const style = document.createElement("style");
    style.id = "mapgen-style";
    style.innerHTML = `
      .mapgen-container {
        display: flex;
        flex-direction: row;
        width: 100%;
        height: 100%;
        background: var(--swf-bg);
        color: var(--swf-text);
        font-family: var(--swf-font);
      }
      .mapgen-toolbar {
        width: 280px;
        background: var(--swf-panel);
        border-right: 1px solid var(--swf-border);
        display: flex;
        flex-direction: column;
        padding: 1rem;
        gap: 0.75rem;
        overflow-y: auto;
      }
      .mapgen-canvas-wrapper {
        flex: 1;
        overflow: auto;
        display: flex;
        justify-content: center;
        align-items: center;
        background: repeating-conic-gradient(rgba(30, 41, 59, 0.5) 0% 25%, rgba(15, 23, 42, 0.5) 0% 50%) 50% / 20px 20px;
      }
      .mapgen-canvas {
        box-shadow: var(--swf-shadow);
        cursor: crosshair;
        background: #1a1a1a;
      }
      .mapgen-palette {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 5px;
      }
      .mapgen-palette-btn {
        background: rgba(0,0,0,0.3);
        color: var(--swf-text);
        border: 1px solid var(--swf-border);
        padding: 8px 4px;
        cursor: pointer;
        text-align: center;
        font-weight: bold;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: 11px;
        gap: 2px;
      }
      .mapgen-palette-btn:hover {
        background: var(--swf-panel-hover);
      }
      .mapgen-palette-btn.active {
        border-color: var(--swf-accent);
        background: rgba(0, 229, 255, 0.2);
      }
      .mapgen-textarea {
        width: 100%;
        height: 120px;
        background: rgba(0,0,0,0.3);
        color: var(--swf-accent);
        border: 1px solid var(--swf-border);
        padding: 8px;
        font-size: 10px;
        font-family: monospace;
        resize: vertical;
        box-sizing: border-box;
      }
      .mapgen-inputs {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .mapgen-inputs input {
        width: 50px;
      }
      .mapgen-btn-play {
        background: #10b981;
        color: white;
        margin-top: 10px;
        font-size: 1.1em;
        text-transform: uppercase;
        letter-spacing: 1px;
        padding: 0.75rem;
      }
      .mapgen-btn-play:hover { background: #34d399; }
      .mapgen-header { margin:0; font-size:1.1em; color:var(--swf-text-muted); border-bottom:1px solid var(--swf-border); padding-bottom:5px;}
    `;
    document.head.appendChild(style);
  }

  private _buildUI(): void {
    this._container.innerHTML = `
      <div class="mapgen-container">
        <div class="mapgen-toolbar">
          <h3 class="mapgen-header">Grid Size</h3>
          <div class="mapgen-inputs">
            W: <input type="number" id="mapgen-w" class="swf-input" value="${this._gridWidth}">
            H: <input type="number" id="mapgen-h" class="swf-input" value="${this._gridHeight}">
            <button class="swf-btn" id="mapgen-btn-resize" style="padding:4px 8px;">Resize</button>
          </div>

          <h3 class="mapgen-header" style="margin-top:10px;">Palette</h3>
          <div class="mapgen-palette" id="mapgen-palette"></div>
          
          <button class="swf-btn" id="mapgen-btn-fill">Bucket Fill (Empty)</button>
          <button class="swf-btn" id="mapgen-btn-clear" style="background:#ef4444; color:white; border-color:#b91c1c;">Clear Map</button>

          <h3 class="mapgen-header" style="margin-top:10px;">Data</h3>
          <button class="swf-btn secondary" id="mapgen-btn-export">Export String \u2193</button>
          <textarea class="mapgen-textarea" id="mapgen-textarea" placeholder="Map data here..."></textarea>
          <button class="swf-btn secondary" id="mapgen-btn-import">Import String \u2191</button>
          
          <button class="swf-btn mapgen-btn-play" id="mapgen-btn-play" style="border-color:#059669;">\u25B6 Play in YAD</button>
        </div>
        <div class="mapgen-canvas-wrapper">
          <canvas class="mapgen-canvas" id="mapgen-canvas"></canvas>
        </div>
      </div>
    `;

    this._canvas = this._container.querySelector<HTMLCanvasElement>("#mapgen-canvas")!;
    this._ctx = this._canvas.getContext("2d")!;
    this._textArea = this._container.querySelector<HTMLTextAreaElement>("#mapgen-textarea")!;
    this._inputW = this._container.querySelector<HTMLInputElement>("#mapgen-w")!;
    this._inputH = this._container.querySelector<HTMLInputElement>("#mapgen-h")!;

    // Build Palette
    const paletteContainer = this._container.querySelector<HTMLElement>("#mapgen-palette")!;
    for (const [char, meta] of Object.entries(this._palette)) {
      const btn = document.createElement("button");
      btn.className = "mapgen-palette-btn";
      if (char === this._currentChar) btn.classList.add("active");
      btn.dataset["char"] = char;

      const swatch = document.createElement("div");
      swatch.style.width = "20px";
      swatch.style.height = "20px";
      swatch.style.background = meta.color;
      swatch.style.border = "1px solid #1e293b";
      swatch.style.display = "flex";
      swatch.style.justifyContent = "center";
      swatch.style.alignItems = "center";
      swatch.style.color = "#fff";
      swatch.style.fontSize = "12px";
      swatch.innerText = char;

      btn.appendChild(swatch);
      btn.appendChild(document.createTextNode(meta.label));

      paletteContainer.appendChild(btn);
    }
  }

  private _bindEvents(): void {
    this._canvas.addEventListener("mousedown", this._onPointerDown.bind(this));
    this._canvas.addEventListener("mousemove", this._onPointerMove.bind(this));
    this._canvas.addEventListener("mouseleave", () => {
      this._hoverX = -1;
      this._hoverY = -1;
      this._render();
    });
    window.addEventListener("mouseup", this._onPointerUp.bind(this));

    const paletteBtns = this._container.querySelectorAll(".mapgen-palette-btn");
    paletteBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        paletteBtns.forEach((b) => b.classList.remove("active"));
        const target = e.currentTarget as HTMLElement;
        target.classList.add("active");
        this._currentChar = target.dataset["char"] || "W";
      });
    });

    this._container.querySelector("#mapgen-btn-export")?.addEventListener("click", () => {
      this._textArea.value = this.getMapString();
    });

    this._container.querySelector("#mapgen-btn-import")?.addEventListener("click", () => {
      this.loadMapString(this._textArea.value);
    });

    this._container.querySelector("#mapgen-btn-clear")?.addEventListener("click", () => {
      if (confirm("Are you sure?")) {
        this._initGrid();
        this._render();
      }
    });

    this._container.querySelector("#mapgen-btn-resize")?.addEventListener("click", () => {
      const w = parseInt(this._inputW.value, 10);
      const h = parseInt(this._inputH.value, 10);
      if (w > 0 && h > 0) {
        this._resizeGrid(w, h);
      }
    });

    this._container.querySelector("#mapgen-btn-fill")?.addEventListener("click", () => {
      // Replace all '.' with currentChar
      for (let y = 0; y < this._gridHeight; y++) {
        for (let x = 0; x < this._gridWidth; x++) {
          if (this._grid[y]![x] === ".") {
            this._grid[y]![x] = this._currentChar;
          }
        }
      }
      this._render();
    });

    this._container.querySelector("#mapgen-btn-play")?.addEventListener("click", () => {
      const mapStr = this.getMapString();
      localStorage.setItem("yad_custom_map", mapStr);
      window.open("../showcases/yad/index.html", "_blank");
    });
  }

  private _onPointerDown(e: MouseEvent): void {
    this._isDrawing = true;
    this._paint(e);
  }

  private _onPointerMove(e: MouseEvent): void {
    const rect = this._canvas.getBoundingClientRect();
    const scaleX = this._canvas.width / rect.width;
    const scaleY = this._canvas.height / rect.height;

    const x = Math.floor(((e.clientX - rect.left) * scaleX) / this._cellSize);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / this._cellSize);

    if (this._hoverX !== x || this._hoverY !== y) {
      this._hoverX = x;
      this._hoverY = y;
      if (!this._isDrawing) {
        this._render(); // update hover
      }
    }

    if (this._isDrawing) {
      this._paint(e);
    }
  }

  private _onPointerUp(): void {
    this._isDrawing = false;
  }

  private _paint(e: MouseEvent): void {
    const rect = this._canvas.getBoundingClientRect();
    const scaleX = this._canvas.width / rect.width;
    const scaleY = this._canvas.height / rect.height;

    const x = Math.floor(((e.clientX - rect.left) * scaleX) / this._cellSize);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / this._cellSize);

    if (x >= 0 && x < this._gridWidth && y >= 0 && y < this._gridHeight) {
      if (this._grid[y]![x] !== this._currentChar) {
        this._grid[y]![x] = this._currentChar;
        this._render();
      }
    }
  }

  private _render(): void {
    this._canvas.width = this._gridWidth * this._cellSize;
    this._canvas.height = this._gridHeight * this._cellSize;

    this._ctx.fillStyle = this._palette["."]!.color;
    this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

    for (let y = 0; y < this._gridHeight; y++) {
      for (let x = 0; x < this._gridWidth; x++) {
        const char = this._grid[y]![x]!;
        if (char !== ".") {
          this._ctx.fillStyle = this._palette[char]?.color || "#ffffff";
          this._ctx.fillRect(
            x * this._cellSize,
            y * this._cellSize,
            this._cellSize,
            this._cellSize,
          );
        }

        // Draw grid lines
        this._ctx.strokeStyle = "#333333";
        this._ctx.strokeRect(
          x * this._cellSize,
          y * this._cellSize,
          this._cellSize,
          this._cellSize,
        );

        if (this._cellSize >= 16 && char !== ".") {
          this._ctx.fillStyle = "#ffffff";
          this._ctx.font = "10px monospace";
          this._ctx.textAlign = "center";
          this._ctx.textBaseline = "middle";
          this._ctx.fillText(
            char,
            x * this._cellSize + this._cellSize / 2,
            y * this._cellSize + this._cellSize / 2,
          );
        }

        // Hover effect
        if (x === this._hoverX && y === this._hoverY) {
          this._ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          this._ctx.fillRect(
            x * this._cellSize,
            y * this._cellSize,
            this._cellSize,
            this._cellSize,
          );
          this._ctx.strokeStyle = "#ffffff";
          this._ctx.strokeRect(
            x * this._cellSize,
            y * this._cellSize,
            this._cellSize,
            this._cellSize,
          );
        }
      }
    }
  }

  public getMapString(): string {
    return this._grid.map((row) => row.join("")).join("\\n");
  }

  public loadMapString(mapStr: string): void {
    if (!mapStr.trim()) return;
    const lines = mapStr
      .trim()
      .split("\\n")
      .map((l) => l.trim());
    if (lines.length > 0) {
      this._gridHeight = lines.length;
      this._gridWidth = lines[0]!.length;
      this._inputW.value = this._gridWidth.toString();
      this._inputH.value = this._gridHeight.toString();

      this._grid = [];
      for (let y = 0; y < this._gridHeight; y++) {
        const row = lines[y]!.split("");
        // Pad if needed
        while (row.length < this._gridWidth) row.push(".");
        this._grid.push(row);
      }
      this._render();
    }
  }

  public getState(): unknown {
    return this.getMapString();
  }

  public setState(state: unknown): void {
    if (typeof state === "string") {
      this.loadMapString(state);
    }
  }
}
