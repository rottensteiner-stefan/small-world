import { ForgeWindow } from "./ForgeWindow.js";
import { ForgeTool } from "./ForgeTool.js";

export interface ForgeOptions {
  toggleKey?: string; // e.g. "F12" or "~"
}

export class Forge {
  private _overlay: HTMLDivElement;
  private _isVisible: boolean = false;
  private _windows: ForgeWindow[] = [];

  constructor(options: ForgeOptions = {}) {
    this._injectCSS();

    this._overlay = document.createElement("div");
    this._overlay.className = "swf-forge-overlay";
    this._overlay.style.display = "none"; // hidden by default
    document.body.appendChild(this._overlay);

    if (options.toggleKey) {
      window.addEventListener("keydown", (e) => {
        if (e.key === options.toggleKey) {
          this.toggle();
          e.preventDefault();
        }
      });
    }

    // Global Paste Listener for Tools
    window.addEventListener("paste", (e) => {
      if (!this._isVisible) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      let blob: File | null = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i]!.type.indexOf("image") !== -1) {
          blob = items[i]!.getAsFile();
          break;
        }
      }

      if (blob) {
        // Find topmost window
        let activeWin: ForgeWindow | null = null;
        let maxZ = -1;
        for (const win of this._windows) {
          if (win.isVisible) {
            const z = parseInt(win.getElement().style.zIndex || "0", 10);
            if (z > maxZ) {
              maxZ = z;
              activeWin = win;
            }
          }
        }

        if (activeWin && activeWin.tool) {
          const reader = new FileReader();
          reader.onload = (event): void => {
            const base64 = event.target?.result as string;
            if (base64 && activeWin?.tool) {
              activeWin.tool.onPasteImage(base64);
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    });
  }

  public toggle(): void {
    this._isVisible = !this._isVisible;
    this._overlay.style.display = this._isVisible ? "block" : "none";
    // Optional: add a semi-transparent dark background when visible so it feels like a real overlay
    this._overlay.style.pointerEvents = this._isVisible ? "auto" : "none";
    this._overlay.style.backgroundColor = this._isVisible ? "rgba(0,0,0,0.3)" : "transparent";
  }

  public get windows(): ForgeWindow[] {
    return this._windows;
  }

  public openWindow(title: string, tool: ForgeTool, x: number = 20, y: number = 20): ForgeWindow {
    const win = new ForgeWindow(title, this._overlay, x, y);
    win.mountTool(tool);
    this._windows.push(win);

    // Every time a window state changes (like closed), update the taskbar
    win.setOnClose(() => {
      this._updateTaskbar();
    });

    this._updateTaskbar();
    return win;
  }

  private _taskbarEl?: HTMLDivElement;

  private _updateTaskbar(): void {
    if (!this._taskbarEl) {
      this._taskbarEl = document.createElement("div");
      this._taskbarEl.className = "swf-taskbar";
      this._overlay.appendChild(this._taskbarEl);
    }

    this._taskbarEl.innerHTML = "";
    for (const win of this._windows) {
      const btn = document.createElement("div");
      btn.className = "swf-taskbar-btn" + (win.isVisible ? "" : " hidden");
      btn.textContent = win.title;
      btn.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        win.toggleVisibility();
        this._updateTaskbar();
      });
      this._taskbarEl.appendChild(btn);
    }
  }

  private _injectCSS(): void {
    if (document.getElementById("sw-forge-style")) return;
    const style = document.createElement("style");
    style.id = "sw-forge-style";
    style.innerHTML = `
      :root {
        --swf-bg: rgba(26, 26, 26, 0.95);
        --swf-panel: #2a2a2a;
        --swf-border: #444444;
        --swf-accent: #ff00ff;
        --swf-text: #eeeeee;
        --swf-font: "Courier New", Courier, monospace;
      }
      .swf-forge-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        pointer-events: none;
        z-index: 10000;
        display: flex;
        flex-direction: column;
      }
      .swf-taskbar {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 32px;
        background: rgba(20, 20, 20, 0.9);
        border-top: 1px solid var(--swf-border);
        display: flex;
        align-items: center;
        padding: 0 8px;
        gap: 8px;
        pointer-events: auto;
        z-index: 99999;
      }
      .swf-taskbar-btn {
        background: rgba(255,255,255,0.1);
        border: 1px solid var(--swf-border);
        color: var(--swf-text);
        padding: 2px 12px;
        cursor: pointer;
        font-family: var(--swf-font);
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        height: 20px;
        user-select: none;
      }
      .swf-taskbar-btn:hover {
        background: var(--swf-accent);
      }
      .swf-taskbar-btn.hidden {
        opacity: 0.4;
        background: transparent;
      }
      .swf-window {
        position: absolute;
        pointer-events: auto;
        background: var(--swf-panel);
        border: 1px solid var(--swf-border);
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        font-family: var(--swf-font);
        color: var(--swf-text);
        display: flex;
        flex-direction: column;
        min-width: 200px;
        min-height: 150px;
      }
      .swf-window-resize-handle {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 16px;
        height: 16px;
        cursor: se-resize;
        background: repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255, 255, 255, 0.3) 2px, rgba(255, 255, 255, 0.3) 4px);
        z-index: 10;
      }
      .swf-window-header {
        background: rgba(255, 255, 255, 0.05);
        border-bottom: 1px solid var(--swf-border);
        padding: 4px 8px;
        cursor: grab;
        user-select: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
        font-size: 12px;
      }
      .swf-window-header:active {
        cursor: grabbing;
      }
      .swf-window-content {
        padding: 8px;
        flex: 1;
        overflow: auto;
      }
      .swf-close-btn {
        cursor: pointer;
        color: #888;
      }
      .swf-close-btn:hover {
        color: var(--swf-accent);
      }
    `;
    document.head.appendChild(style);
  }
}
