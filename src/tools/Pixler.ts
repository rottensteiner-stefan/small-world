/// src/tools/Pixler.ts
import { ForgeTool, ForgeToolOptions } from "./forge/ForgeTool.js";
import { ToolEvents } from "../enums/ToolEvents.js";

export const PIXLER_PALETTES = {
  DEFAULT: [
    "#000000",
    "#ffffff",
    "#888888",
    "#444444",
    "#ff0000",
    "#880000",
    "#ffff00",
    "#ff8800",
    "#00ff00",
    "#008800",
    "#0000ff",
    "#00ffff",
    "#8b4513",
    "#d2b48c",
    "#ff00ff",
    "transparent",
  ],
  EGA: [
    "#000000",
    "#0000AA",
    "#00AA00",
    "#00AAAA",
    "#AA0000",
    "#AA00AA",
    "#AA5500",
    "#AAAAAA",
    "#555555",
    "#5555FF",
    "#55FF55",
    "#55FFFF",
    "#FF5555",
    "#FF55FF",
    "#FFFF55",
    "#FFFFFF",
    "transparent",
  ],
  VGA: [
    "#000000",
    "#800000",
    "#008000",
    "#808000",
    "#000080",
    "#800080",
    "#008080",
    "#C0C0C0",
    "#808080",
    "#FF0000",
    "#00FF00",
    "#FFFF00",
    "#0000FF",
    "#FF00FF",
    "#00FFFF",
    "#FFFFFF",
    "transparent",
  ],
  PICO8: [
    "#000000",
    "#1D2B53",
    "#7E2553",
    "#008751",
    "#AB5236",
    "#5F574F",
    "#C2C3C7",
    "#FFF1E8",
    "#FF004D",
    "#FFA300",
    "#FFEC27",
    "#00E436",
    "#29ADFF",
    "#83769C",
    "#FF77A8",
    "#FFCCAA",
  ],
  GAMEBOY: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f", "transparent"],
  GRAYSCALE: [
    "#000000",
    "#222222",
    "#444444",
    "#666666",
    "#888888",
    "#aaaaaa",
    "#cccccc",
    "#eeeeee",
    "#ffffff",
    "transparent",
  ],
};

export interface PixlerOptions extends ForgeToolOptions {
  width?: number;
  height?: number;
  gridX?: number;
  gridY?: number;
  scale?: number;
  palette?: string[];
}

export class Pixler extends ForgeTool {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _gridOverlay: HTMLDivElement;
  private _cursorEl: HTMLDivElement;
  private _paletteContainer: HTMLDivElement;

  private _width: number = 32;
  private _height: number = 32;
  private _gridX: number = 8;
  private _gridY: number = 8;
  private _scale: number = 16;

  private _inputs: Record<string, HTMLInputElement> = {};

  private _currentColor: string = "#ffffff";
  private _isDrawing: boolean = false;
  private _isErasing: boolean = false;
  private _cursorPos = { x: 0, y: 0 };

  private _palette = [...PIXLER_PALETTES.DEFAULT];

  constructor(options: PixlerOptions = {}) {
    super(options);
    if (options.width !== undefined) this._width = options.width;
    if (options.height !== undefined) this._height = options.height;
    if (options.gridX !== undefined) this._gridX = options.gridX;
    if (options.gridY !== undefined) this._gridY = options.gridY;
    if (options.scale !== undefined) this._scale = options.scale;
    if (options.palette !== undefined) this._palette = [...options.palette];

    Object.assign(this._container.style, {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    });

    // Controls
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "5px";
    controls.style.flexWrap = "wrap";

    controls.appendChild(this._createInput("W", this._width, (v) => (this.width = v)));
    controls.appendChild(this._createInput("H", this._height, (v) => (this.height = v)));
    controls.appendChild(this._createInput("GridX", this._gridX, (v) => (this.gridX = v)));
    controls.appendChild(this._createInput("GridY", this._gridY, (v) => (this.gridY = v)));
    controls.appendChild(
      this._createInput("Zoom", this._scale, (v) => {
        this._scale = v;
        this._updateGrid();
      }),
    );

    const paletteSelect = document.createElement("select");
    Object.assign(paletteSelect.style, {
      backgroundColor: "#333",
      color: "#fff",
      border: "1px solid #555",
      fontSize: "12px",
      padding: "2px",
    });
    Object.keys(PIXLER_PALETTES).forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      paletteSelect.appendChild(opt);
    });
    paletteSelect.onchange = (e): void => {
      const val = (e.target as HTMLSelectElement).value;
      this.setPalette(PIXLER_PALETTES[val as keyof typeof PIXLER_PALETTES]);
    };
    controls.appendChild(paletteSelect);

    this._container.appendChild(controls);

    // Canvas Area
    const canvasContainer = document.createElement("div");
    Object.assign(canvasContainer.style, {
      position: "relative",
      backgroundColor: "#111",
      overflow: "auto",
      maxHeight: "400px",
      border: "1px solid #000",
      padding: "20px", // give some breathing room around the canvas
    });

    this._canvas = document.createElement("canvas");
    this._ctx = this._canvas.getContext("2d", { willReadFrequently: true })!;
    Object.assign(this._canvas.style, {
      display: "block",
      imageRendering: "pixelated",
      transformOrigin: "top left",
      backgroundImage:
        "linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)",
      backgroundColor: "#1a1a1a",
      boxShadow: "0 0 10px rgba(0,0,0,0.8)",
    });

    this._gridOverlay = document.createElement("div");
    Object.assign(this._gridOverlay.style, {
      position: "absolute",
      top: "20px",
      left: "20px", // offset by container padding
      pointerEvents: "none",
      backgroundImage:
        "linear-gradient(to right, rgba(255, 0, 255, 0.8) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 0, 255, 0.8) 1px, transparent 1px)",
    });

    const pixelGrid = document.createElement("div");
    pixelGrid.id = "pixler-pixel-grid";
    Object.assign(pixelGrid.style, {
      position: "absolute",
      top: "20px",
      left: "20px", // offset by container padding
      pointerEvents: "none",
      backgroundImage:
        "linear-gradient(to right, rgba(0, 255, 255, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 255, 255, 0.25) 1px, transparent 1px)",
    });

    this._cursorEl = document.createElement("div");
    Object.assign(this._cursorEl.style, {
      position: "absolute",
      top: "20px",
      left: "20px",
      border: "2px solid rgba(255, 0, 0, 0.8)",
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      pointerEvents: "none",
      boxSizing: "border-box",
      zIndex: "10",
      transition: "transform 0.05s linear",
    });

    canvasContainer.appendChild(this._canvas);
    canvasContainer.appendChild(pixelGrid);
    canvasContainer.appendChild(this._gridOverlay);
    canvasContainer.appendChild(this._cursorEl);
    this._container.appendChild(canvasContainer);

    // Palette
    this._paletteContainer = document.createElement("div");
    this._container.appendChild(this._paletteContainer);
    this._renderPaletteUI();

    // Actions
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "5px";

    const btnClear = document.createElement("button");
    btnClear.textContent = "Clear";
    btnClear.onclick = (): void => this._ctx.clearRect(0, 0, this._width, this._height);

    const btnBase64 = document.createElement("button");
    btnBase64.textContent = "Copy B64";
    btnBase64.onclick = (): void => {
      navigator.clipboard.writeText(this._canvas.toDataURL());
      alert("Base64 copied!");
    };

    const btnImage = document.createElement("button");
    btnImage.textContent = "Copy Image";
    btnImage.onclick = (): void => {
      this._canvas.toBlob((blob) => {
        if (blob) {
          const item = new ClipboardItem({ "image/png": blob });
          navigator.clipboard
            .write([item])
            .then(() => alert("Image copied to clipboard! (Ready to paste)"));
        }
      });
    };

    const btnTemplate = document.createElement("button");
    btnTemplate.textContent = "A-Z";
    btnTemplate.title = "Load A-Z Template";
    btnTemplate.onclick = (): void => this.loadTemplateA2Z();

    [btnClear, btnBase64, btnImage, btnTemplate].forEach((b) => {
      b.style.flex = "1";
      b.style.padding = "5px";
      b.style.cursor = "pointer";
      b.style.fontSize = "12px";
      actions.appendChild(b);
    });
    this._container.appendChild(actions);

    this._resize(this._width, this._height);
    this._bindEvents();

    if (this._options.events) {
      this._options.events.addEventListener(
        ToolEvents.Pixler.LOAD_BASE64,
        (e: Record<string, unknown>) => {
          const base64 = e["base64"] as string;
          if (base64) {
            this.loadFromBase64(base64).catch((err) => console.error(err));
          }
        },
      );
    }
  }

  private _createInput(
    label: string,
    value: number,
    onChange: (v: number) => void,
  ): HTMLDivElement {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "2px";

    const lbl = document.createElement("span");
    lbl.textContent = label + ":";
    lbl.style.fontSize = "12px";

    const inp = document.createElement("input");
    this._inputs[label] = inp;
    inp.type = "number";
    inp.value = value.toString();
    Object.assign(inp.style, {
      width: "40px",
      backgroundColor: "#333",
      color: "#fff",
      border: "1px solid #555",
    });
    inp.onchange = (e): void => onChange(parseInt((e.target as HTMLInputElement).value) || 1);

    div.appendChild(lbl);
    div.appendChild(inp);
    return div;
  }

  private _resize(w: number, h: number): void {
    const oldData = this._ctx.getImageData(0, 0, this._width, this._height);
    this._width = w;
    this._height = h;
    this._canvas.width = w;
    this._canvas.height = h;
    this._ctx.putImageData(oldData, 0, 0);
    this._updateGrid();
  }

  private _updateGrid(): void {
    const cssW = this._width * this._scale;
    const cssH = this._height * this._scale;

    this._canvas.style.width = `${cssW}px`;
    this._canvas.style.height = `${cssH}px`;

    // Pixel-perfect checkerboard background on the canvas
    const s = this._scale;
    this._canvas.style.backgroundSize = `${s * 2}px ${s * 2}px`;
    this._canvas.style.backgroundPosition = `0 0, 0 ${s}px, ${s}px -${s}px, -${s}px 0px`;

    // Macro grid
    this._gridOverlay.style.width = `${cssW}px`;
    this._gridOverlay.style.height = `${cssH}px`;
    this._gridOverlay.style.backgroundSize = `${this._gridX * s}px ${this._gridY * s}px`;

    // Pixel grid (every 1 pixel)
    const pixelGrid = this._container.querySelector("#pixler-pixel-grid") as HTMLDivElement;
    if (pixelGrid) {
      pixelGrid.style.width = `${cssW}px`;
      pixelGrid.style.height = `${cssH}px`;
      pixelGrid.style.backgroundSize = `${s}px ${s}px`;
    }

    this._updateCursorVisual();
  }

  private _updateCursorVisual(): void {
    this._cursorEl.style.width = `${this._scale}px`;
    this._cursorEl.style.height = `${this._scale}px`;
    this._cursorEl.style.transform = `translate(${this._cursorPos.x * this._scale}px, ${this._cursorPos.y * this._scale}px)`;
  }

  public loadTemplateA2Z(): void {
    const font = [
      "0110,1001,1111,1001,1001",
      "1110,1001,1110,1001,1110",
      "0111,1000,1000,1000,0111", // A B C
      "1110,1001,1001,1001,1110",
      "1111,1000,1110,1000,1111",
      "1111,1000,1110,1000,1000", // D E F
      "0111,1000,1011,1001,0111",
      "1001,1001,1111,1001,1001",
      "0110,0110,0110,0110,0110", // G H I
      "0001,0001,0001,1001,0110",
      "1001,1010,1100,1010,1001",
      "1000,1000,1000,1000,1111", // J K L
      "1001,1111,1001,1001,1001",
      "1001,1101,1011,1001,1001",
      "0110,1001,1001,1001,0110", // M N O
      "1110,1001,1110,1000,1000",
      "0110,1001,1001,0110,0001",
      "1110,1001,1110,1010,1001", // P Q R
      "0111,1000,0110,0001,1110",
      "1111,0110,0110,0110,0110",
      "1001,1001,1001,1001,0110", // S T U
      "1001,1001,1001,0110,0110",
      "1001,1001,1001,1111,1001",
      "1001,1001,0110,1001,1001", // V W X
      "1001,1001,0110,0110,0110",
      "1111,0010,0100,1000,1111", // Y Z
    ];

    // Width: 7 chars * 4px + 6px space = 34
    // Height: 4 rows * 5px + 3px space = 23
    this._gridX = 5;
    this._gridY = 6;
    if (this._inputs["GridX"]) this._inputs["GridX"].value = "5";
    if (this._inputs["GridY"]) this._inputs["GridY"].value = "6";
    if (this._inputs["W"]) this._inputs["W"].value = "34";
    if (this._inputs["H"]) this._inputs["H"].value = "23";

    this._resize(34, 23);
    this._scale = 16;
    this._updateGrid();

    this._ctx.clearRect(0, 0, this._width, this._height);

    if (this._currentColor === "transparent") {
      this._currentColor = "#ffffff";
    }

    font.forEach((charStr, i) => {
      const row = Math.floor(i / 7);
      const col = i % 7;
      const startX = col * 5; // 4px char + 1px spacing
      const startY = row * 6;
      const lines = charStr.split(",");
      lines.forEach((line, y) => {
        for (let x = 0; x < 4; x++) {
          if (line[x] === "1") {
            this._drawPixel(startX + x, startY + y, false);
          }
        }
      });
    });
  }

  private _drawPixel(x: number, y: number, erase: boolean = false): void {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return;
    if (erase || this._currentColor === "transparent") {
      this._ctx.clearRect(x, y, 1, 1);
    } else {
      this._ctx.fillStyle = this._currentColor;
      this._ctx.fillRect(x, y, 1, 1);
    }
  }

  private _isSameColor(x: number, y: number, color: string): boolean {
    if (color === "transparent") return false;
    const p = this._ctx.getImageData(x, y, 1, 1).data;
    if (p[3] === 0) return false;
    const toHex = (c: number): string => c.toString(16).padStart(2, "0");
    const hex = `#${toHex(p[0]!)}${toHex(p[1]!)}${toHex(p[2]!)}`.toLowerCase();
    return hex === color.toLowerCase();
  }

  private _bindEvents(): void {
    let isSpaceDown = false;

    window.addEventListener("keyup", (e) => {
      if (e.key === " ") {
        isSpaceDown = false;
      }
    });

    const getPos = (e: MouseEvent): { x: number; y: number } => {
      const rect = this._canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / this._scale);
      const y = Math.floor((e.clientY - rect.top) / this._scale);
      return { x, y };
    };

    this._canvas.addEventListener("mousedown", (e) => {
      const { x, y } = getPos(e);
      this._cursorPos = { x, y };

      if (e.button === 2) {
        this._isErasing = true;
      } else {
        this._isErasing = this._isSameColor(x, y, this._currentColor);
      }

      this._isDrawing = true;
      this._drawPixel(x, y, this._isErasing);
      this._updateCursorVisual();
    });

    this._canvas.addEventListener("mousemove", (e) => {
      const { x, y } = getPos(e);
      this._cursorPos = { x, y };
      this._updateCursorVisual();
      if (this._isDrawing) {
        this._drawPixel(x, y, this._isErasing);
      }
    });

    window.addEventListener("mouseup", () => {
      this._isDrawing = false;
    });

    this._canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Keyboard controls
    window.addEventListener("keydown", (e) => {
      // Don't intercept if typing in inputs
      if (document.activeElement?.tagName === "INPUT") return;

      const k = e.key.toLowerCase();
      let moved = false;

      if (k === "arrowup" || k === "w") {
        this._cursorPos.y = Math.max(0, this._cursorPos.y - 1);
        moved = true;
      }
      if (k === "arrowdown" || k === "s") {
        this._cursorPos.y = Math.min(this._height - 1, this._cursorPos.y + 1);
        moved = true;
      }
      if (k === "arrowleft" || k === "a") {
        this._cursorPos.x = Math.max(0, this._cursorPos.x - 1);
        moved = true;
      }
      if (k === "arrowright" || k === "d") {
        this._cursorPos.x = Math.min(this._width - 1, this._cursorPos.x + 1);
        moved = true;
      }

      if (moved) {
        this._updateCursorVisual();
        if (this._isDrawing || isSpaceDown) {
          this._drawPixel(this._cursorPos.x, this._cursorPos.y, this._isErasing);
        }
        e.preventDefault();
      }

      if (e.key === " ") {
        if (!isSpaceDown) {
          isSpaceDown = true;
          this._isErasing = this._isSameColor(
            this._cursorPos.x,
            this._cursorPos.y,
            this._currentColor,
          );
        }
        this._drawPixel(this._cursorPos.x, this._cursorPos.y, this._isErasing);
        e.preventDefault();
      }
      if (k === "x" || e.key === "Delete" || e.key === "Backspace") {
        this._drawPixel(this._cursorPos.x, this._cursorPos.y, true);
        e.preventDefault();
      }

      // Palette shortcuts 1-9
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && num <= this._palette.length) {
        this._currentColor = this._palette[num - 1]!;
      }
    });
  }

  private _renderPaletteUI(): void {
    this._paletteContainer.innerHTML = "";
    this._paletteContainer.style.display = "grid";
    this._paletteContainer.style.gridTemplateColumns = "repeat(8, 1fr)";
    this._paletteContainer.style.gap = "2px";

    this._palette.forEach((color, i) => {
      const btn = document.createElement("div");
      Object.assign(btn.style, {
        height: "24px",
        backgroundColor: color === "transparent" ? "#000" : color,
        border: "1px solid #555",
        cursor: "pointer",
        position: "relative",
      });
      if (color === "transparent") {
        btn.innerHTML = "❌";
        btn.style.textAlign = "center";
        btn.style.lineHeight = "24px";
        btn.style.fontSize = "10px";
      }
      btn.title = `Key ${i + 1 > 9 ? "" : i + 1}`;
      btn.onclick = (): void => {
        this._currentColor = color;
      };
      this._paletteContainer.appendChild(btn);
    });
  }

  // --- PUBLIC API ---

  public get width(): number {
    return this._width;
  }
  public set width(v: number) {
    if (this._inputs["W"]) this._inputs["W"].value = v.toString();
    this._resize(v, this._height);
  }

  public get height(): number {
    return this._height;
  }
  public set height(v: number) {
    if (this._inputs["H"]) this._inputs["H"].value = v.toString();
    this._resize(this._width, v);
  }

  public get gridX(): number {
    return this._gridX;
  }
  public set gridX(v: number) {
    this._gridX = v;
    if (this._inputs["GridX"]) this._inputs["GridX"].value = v.toString();
    this._updateGrid();
  }

  public get gridY(): number {
    return this._gridY;
  }
  public set gridY(v: number) {
    this._gridY = v;
    if (this._inputs["GridY"]) this._inputs["GridY"].value = v.toString();
    this._updateGrid();
  }

  public getBase64(): string {
    return this._canvas.toDataURL();
  }

  public loadFromBase64(base64: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = (): void => {
        this.width = img.width;
        this.height = img.height;
        this._ctx.clearRect(0, 0, img.width, img.height);
        this._ctx.drawImage(img, 0, 0);
        resolve();
      };
    });
  }

  public setPalette(colors: string[]): void {
    this._palette = [...colors];
    if (this._palette.length > 0) this._currentColor = this._palette[0]!;
    this._renderPaletteUI();
  }

  public override onPasteImage(base64: string): void {
    this.loadFromBase64(base64).catch((e) =>
      console.error("Failed to paste image into Pixler:", e),
    );
  }

  public getState(): unknown {
    return this.getBase64();
  }

  public setState(state: unknown): void {
    if (typeof state === "string" && state.startsWith("data:image")) {
      this.loadFromBase64(state);
    }
  }
}
