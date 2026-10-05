import { ForgeTool, ForgeToolOptions, ToolEvents, EventDispatcherImpl } from "@small-world/engine";
import {
  AiConfigStorage,
  createVisionAiProvider,
  sortModelsDescending,
  AiConfig,
  AiProviderType,
  DEFAULT_AI_CONFIGS,
  VisionAiMessage,
} from "./common/ai/index.js";
import {
  detectSpriteBounds,
  magicWand,
  removeBackground,
  generateNormalMap,
  parseActionChips,
  CanvasActionChip,
  CanvasUndoHistory,
} from "./common/image/index.js";
import {
  UniversalIngestRouter,
  UniversalIngestDropzone,
  IngestResult,
  CommandHistory,
  primaryPbrTexture,
  firstImageItem,
} from "./common/io/index.js";

export class Xtractor extends ForgeTool {
  public loadFromBase64?: (base64: string) => void;
  private _abortController = new AbortController();

  public override onPasteImage(base64: string): void {
    if (this.loadFromBase64) {
      this.loadFromBase64(base64);
    }
  }

  public override unmount(): void {
    super.unmount();
    this._abortController.abort();
    this._abortController = new AbortController();
  }

  constructor(
    private events: EventDispatcherImpl,
    options: ForgeToolOptions = {},
  ) {
    super(options);
    this._injectCSS();
    this._buildUI();
    this._bindLogic();
  }

  private _injectCSS(): void {
    if (document.getElementById("xtractor-style")) return;
    const style = document.createElement("style");
    style.id = "xtractor-style";
    style.innerHTML = `
    .swf-ix-main-container {
      display: flex;
      flex: 1;
      overflow: hidden;
      width: 100%;
      height: 100%;
      background: transparent;
      color: var(--tool-text);
    }
    .swf-ix-workbench {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: transparent;
      position: relative;
      min-width: 0;
    }
    .swf-ix-toolbar {
      padding: 0.5rem 1rem;
      background: var(--tool-panel);
      border-bottom: 1px solid var(--tool-border);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 15px;
    }
    .swf-ix-toolbar-group {
      gap: 5px;
    }
    .swf-ix-canvas-container {
      flex: 1;
      overflow: auto;
      padding: 2rem;
      position: relative;
      background: repeating-conic-gradient(var(--tool-card) 0% 25%, var(--tool-panel-solid) 0% 50%) 50% / 20px 20px;
    }
    #canvas-stage {
      position: relative; 
      display: inline-block; 
      transform-origin: 0 0;
      transition: transform 0.1s ease-out;
    }
    #image-canvas {
      box-shadow: var(--tool-shadow-float);
      cursor: crosshair;
      max-width: 100%;
    }
    #drop-overlay {
      position: absolute;
      inset: 0;
      background: color-mix(in srgb, var(--tool-bg) 90%, transparent);
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 1.5rem;
      color: var(--tool-accent);
      border: 2px dashed var(--tool-accent);
      border-radius: var(--tool-radius-lg);
      font-weight: 700;
      z-index: 10;
      display: none;
    }
    .swf-ix-splitter {
      width: 8px;
      background: var(--tool-panel-solid);
      cursor: col-resize;
      display: flex;
      justify-content: center;
      align-items: center;
      border-left: 1px solid var(--tool-border);
      border-right: 1px solid var(--tool-border);
      transition: background 0.2s;
      flex-shrink: 0;
      z-index: 50;
    }
    .swf-ix-splitter:hover, .swf-ix-splitter.active {
      background: var(--tool-accent);
    }
    .swf-ix-splitter::after {
      content: '||';
      color: var(--tool-text-muted);
      font-size: 10px;
      letter-spacing: -1px;
    }
    .swf-ix-sidebar {
      width: 400px;
      min-width: 250px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      background: var(--tool-panel);
    }
    .swf-ix-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.6rem 1rem;
      background: var(--tool-panel-solid);
      border-bottom: 1px solid var(--tool-border);
      gap: 10px;
    }
    .swf-ix-chat-title {
      font-weight: 700;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .swf-ix-provider-badge {
      font-size: 0.72rem;
      padding: 2px 6px;
      border-radius: 999px;
      background: var(--tool-card);
      border: 1px solid var(--tool-border);
      color: var(--tool-accent);
      font-family: monospace;
    }
    .swf-ix-ai-settings {
      padding: 1rem;
      background: var(--tool-panel);
      border-bottom: 2px solid var(--tool-border);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      font-size: 0.85rem;
    }
    .swf-ix-settings-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .swf-ix-settings-row label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--tool-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .swf-ix-chat-history {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .swf-ix-message {
      padding: 0.85rem 1rem;
      border-radius: var(--tool-radius-md);
      max-width: 90%;
      line-height: 1.45;
      font-size: 0.9rem;
      word-break: break-word;
    }
    .swf-ix-message p {
      margin: 0 0 0.5rem 0;
    }
    .swf-ix-message p:last-child {
      margin-bottom: 0;
    }
    .swf-ix-message pre {
      background: var(--tool-panel-solid);
      border: 1px solid var(--tool-border);
      padding: 0.5rem;
      border-radius: var(--tool-radius-sm);
      overflow-x: auto;
      font-family: monospace;
      font-size: 0.82rem;
      margin: 0.4rem 0;
    }
    .swf-ix-message code {
      font-family: monospace;
      font-size: 0.85em;
      background: rgba(127, 127, 127, 0.2);
      padding: 1px 4px;
      border-radius: 3px;
    }
    .swf-ix-chip-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .swf-ix-action-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      background: var(--tool-card);
      border: 1px solid var(--tool-accent);
      color: var(--tool-text);
      border-radius: var(--tool-radius-sm);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.1s ease;
    }
    .swf-ix-action-chip:hover {
      background: var(--tool-accent-glow);
      transform: translateY(-1px);
    }
    .swf-ix-color-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--tool-panel-solid);
      border: 1px solid var(--tool-border);
      font-family: monospace;
      font-size: 0.78rem;
    }
    .swf-ix-color-swatch {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      border: 1px solid rgba(255,255,255,0.3);
      display: inline-block;
    }
    .swf-ix-thinking {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--tool-accent);
      font-style: italic;
    }
    .swf-ix-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid var(--tool-accent);
      border-top-color: transparent;
      border-radius: 50%;
      animation: swf-ix-spin 0.8s linear infinite;
    }
    @keyframes swf-ix-spin {
      to { transform: rotate(360deg); }
    }
    .msg-ai {
      background: var(--tool-panel);
      align-self: flex-start;
      border: 1px solid var(--tool-border);
    }
    .msg-user {
      background: var(--tool-card-active);
      border: 1px solid var(--tool-border-active);
      align-self: flex-end;
    }
    .swf-ix-chat-input-area {
      padding: 1rem;
      background: var(--tool-panel);
      border-top: 1px solid var(--tool-border);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .swf-ix-context-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0.5rem;
      display: none;
    }
    .swf-ix-context-pill canvas {
      height: 40px;
      border: 1px solid var(--tool-border);
    }
    .swf-ix-chat-input-row {
      display: flex;
      gap: 10px;
    }
    #selection-box {
      position: absolute;
      border: 2px dashed var(--tool-accent2);
      background: var(--tool-accent2-glow);
      pointer-events: none;
      display: none;
      z-index: 5;
    }
    #selection-props {
      position: absolute;
      bottom: 20px;
      left: 20px;
      padding: 10px 15px;
      border-radius: var(--tool-radius-md);
      display: flex;
      gap: 15px;
      z-index: 20;
      box-shadow: var(--tool-shadow-float);
    }
  `;
    document.head.appendChild(style);
  }

  private _buildUI(): void {
    this._container.className = "swf-ix-main-container";
    this._container.innerHTML = `
    <!-- WORKBENCH -->
    <div class="swf-ix-workbench">
      <div class="swf-ix-toolbar">
        <div class="tool-tabs swf-ix-toolbar-group">
          <button class="tool-btn" id="btn-tool-pan" title="Hand Tool">Hand</button>
          <button class="tool-btn active" id="btn-tool-rect" title="Rechteck Auswahl">Rect</button>
          <button class="tool-btn" id="btn-tool-circle" title="Kreis Auswahl">Circle</button>
          <button class="tool-btn" id="btn-tool-wand" title="Magic Wand (Smart-Masking)">Wand</button>
        </div>
        
        <div class="tool-tabs swf-ix-toolbar-group">
          <button class="tool-btn" id="btn-auto-sprites" title="Automatisch alle Sprites auf dem Sheet erkennen">✨ Auto-Sprites</button>
          <button class="tool-btn" id="btn-remove-bg" title="Hintergrund entfernen (Smart Alpha Matting)">🪄 RemBG</button>
          <button class="tool-btn" id="btn-gen-normal" title="Normal Map erzeugen">🏔️ Normal</button>
        </div>

        <div class="tool-tabs swf-ix-toolbar-group">
          <button class="tool-btn" id="btn-undo" title="Rückgängig (Cmd+Z)">↩ Undo</button>
          <button class="tool-btn" id="btn-redo" title="Wiederholen (Cmd+Shift+Z)">↪ Redo</button>
        </div>

        <div class="tool-tabs swf-ix-toolbar-group">
          <button class="tool-btn" id="btn-zoom-out">-</button>
          <span style="color: var(--tool-text-muted); padding: 0 5px; font-weight: bold; font-size: 0.9rem; align-self: center;" id="zoom-label">100%</span>
          <button class="tool-btn" id="btn-zoom-in">+</button>
        </div>
        
        <button class="tool-btn" style="margin-left: auto;" id="btn-clear-selection">Clear Selection</button>
      </div>
      
      <div class="swf-ix-canvas-container" id="canvas-wrapper">
        <div id="drop-overlay">Drop File Here</div>
        <div id="empty-dropzone-container" style="max-width: 500px; margin: 40px auto 0;"></div>
        <div id="canvas-stage" style="display: none;">
            <canvas id="image-canvas"></canvas>
            <div id="selection-box"></div>
        </div>
        
        <!-- Precision Input Panel -->
        <div id="selection-props" class="tool-panel" style="display: none;">
          <div style="display: flex; align-items: center; gap: 5px; color: var(--tool-text-muted); font-size: 0.9rem; font-weight: bold;"><label>X:</label> <input type="number" id="prop-x" class="tool-input mono" style="width: 56px;"/></div>
          <div style="display: flex; align-items: center; gap: 5px; color: var(--tool-text-muted); font-size: 0.9rem; font-weight: bold;"><label>Y:</label> <input type="number" id="prop-y" class="tool-input mono" style="width: 56px;"/></div>
          <div style="display: flex; align-items: center; gap: 5px; color: var(--tool-text-muted); font-size: 0.9rem; font-weight: bold;"><label>W:</label> <input type="number" id="prop-w" class="tool-input mono" style="width: 56px;"/></div>
          <div style="display: flex; align-items: center; gap: 5px; color: var(--tool-text-muted); font-size: 0.9rem; font-weight: bold;"><label>H:</label> <input type="number" id="prop-h" class="tool-input mono" style="width: 56px;"/></div>
        </div>
      </div>
    </div>
    <!-- SPLITTER -->
    <div class="swf-ix-splitter" id="splitter"></div>

    <!-- CHAT & AI INTERFACE -->
    <div class="swf-ix-sidebar" id="sidebar">
      <div class="swf-ix-chat-header">
        <div class="swf-ix-chat-title">
          <span>Vision AI Assistant</span>
          <span class="swf-ix-provider-badge" id="ai-badge">Gemini</span>
        </div>
        <button class="tool-btn" id="btn-toggle-ai-settings" title="KI Einstellungen (Provider & API Keys)" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">⚙️ Settings</button>
      </div>

      <!-- Collapsible AI Settings Drawer -->
      <div class="swf-ix-ai-settings" id="ai-settings-panel" style="display: none;">
        <div class="swf-ix-settings-row">
          <label>AI Provider</label>
          <select id="ai-provider-select" class="tool-input" style="padding: 4px 8px;">
            <option value="gemini">Google Gemini (Flash / Pro)</option>
            <option value="openai">OpenAI (GPT-4o, Mini)</option>
            <option value="claude">Anthropic Claude (3.5 Sonnet / Haiku)</option>
            <option value="ollama">Ollama (Lokal / llama3.2-vision)</option>
            <option value="custom">Custom Endpoint (OpenAI-compatible)</option>
          </select>
        </div>
        <div class="swf-ix-settings-row" id="ai-apikey-row">
          <label id="ai-apikey-label">API Key</label>
          <input type="password" id="ai-api-key" class="tool-input" placeholder="AIzaSy... oder sk-..." autocomplete="off" />
        </div>
        <div class="swf-ix-settings-row">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label>Modell</label>
            <button class="tool-btn" id="btn-fetch-models" title="Verfügbare Modelle von API abrufen" style="padding: 1px 6px; font-size: 0.75rem;">🔄 Modelle laden</button>
          </div>
          <select id="ai-model-select" class="tool-input" style="padding: 4px 8px;">
            <option value="gemini-1.5-flash">gemini-1.5-flash</option>
            <option value="__custom__">Manuelle Eingabe...</option>
          </select>
          <input type="text" id="ai-model-name" class="tool-input" style="display: none; margin-top: 4px;" placeholder="Modellname eingeben..." />
        </div>
        <div class="swf-ix-settings-row" id="ai-endpoint-row" style="display: none;">
          <label>Endpoint URL</label>
          <input type="text" id="ai-endpoint" class="tool-input" placeholder="http://localhost:11434/api/chat" />
        </div>
        <div style="display: flex; gap: 8px; margin-top: 4px; align-items: center;">
          <button class="tool-btn primary" id="btn-save-ai-settings" style="flex: 1; padding: 0.35rem 0.6rem;">Speichern & Testen</button>
          <button class="tool-btn" id="btn-close-ai-settings" style="padding: 0.35rem 0.6rem;">Schließen</button>
        </div>
        <div id="ai-settings-status" style="font-size: 0.78rem; display: none;"></div>
      </div>

      <div class="swf-ix-chat-history" id="chat-history">
        <div class="swf-ix-message msg-ai">
          Willkommen beim <strong>Xtractor Vision AI</strong>!<br/>
          Lade ein Bild hoch und ziehe bei Bedarf einen Auswahlrahmen auf. Du kannst mir freie Fragen zum Bild stellen (z.B. <em>"Welche Farbpalette passt zu diesem Sprite?"</em>, <em>"Schneide in 4 Segmente"</em> oder <em>"Schätze Roughness/Metallic für diese Textur"</em>).
        </div>
      </div>
      
      <div class="swf-ix-chat-input-area">
        <div class="tool-card swf-ix-context-pill" id="context-pill">
          <canvas id="crop-preview-canvas"></canvas>
          <div style="font-size: 0.8rem; color: var(--tool-text-muted);">Ausschnitt aktiv</div>
          <button class="tool-btn" style="padding: 0.2rem 0.5rem; margin-left: auto; margin-right: 5px;" id="btn-send-pixler">An Pixler</button>
          <button class="tool-btn" style="padding: 0.2rem 0.5rem;" id="btn-cancel-crop">✖</button>
        </div>
        <div class="swf-ix-chat-input-row">
          <input type="text" id="chat-input" class="tool-input" style="flex:1;" placeholder="Frage oder Befehl eingeben..." />
          <button class="tool-btn primary" id="btn-send">Senden</button>
        </div>
      </div>
    </div>`;
  }

  private _bindLogic(): void {
    // Elements
    const canvas = this._container.querySelector<HTMLCanvasElement>("#image-canvas")!;
    const ctx = canvas.getContext("2d")!;
    const canvasWrapper = this._container.querySelector<HTMLElement>("#canvas-wrapper")!;
    const canvasStage = this._container.querySelector<HTMLElement>("#canvas-stage")!;
    const emptyDropzoneContainer = this._container.querySelector<HTMLElement>(
      "#empty-dropzone-container",
    );
    const dropOverlay = this._container.querySelector<HTMLElement>("#drop-overlay")!;
    const selectionBox = this._container.querySelector<HTMLElement>("#selection-box")!;
    const selectionProps = this._container.querySelector<HTMLElement>("#selection-props")!;

    // Prop inputs
    const propX = this._container.querySelector<HTMLInputElement>("#prop-x")!;
    const propY = this._container.querySelector<HTMLInputElement>("#prop-y")!;
    const propW = this._container.querySelector<HTMLInputElement>("#prop-w")!;
    const propH = this._container.querySelector<HTMLInputElement>("#prop-h")!;

    const contextPill = this._container.querySelector<HTMLElement>("#context-pill")!;
    const cropPreviewCanvas =
      this._container.querySelector<HTMLCanvasElement>("#crop-preview-canvas")!;
    const cropCtx = cropPreviewCanvas.getContext("2d")!;
    const btnCancelCrop = this._container.querySelector<HTMLElement>("#btn-cancel-crop")!;
    const btnClearSelection = this._container.querySelector<HTMLElement>("#btn-clear-selection")!;
    const btnSendPixler = this._container.querySelector<HTMLElement>("#btn-send-pixler")!;

    // State
    let currentImage: HTMLImageElement | null = null;
    let isDragging = false;
    let isMoving = false;
    let startX = 0,
      startY = 0;
    let moveOffsetX = 0,
      moveOffsetY = 0;
    let currentRect: { x: number; y: number; w: number; h: number } | null = null;
    let zoom = 1;
    let isPanning = false;
    let panStartX = 0,
      panStartY = 0;

    let currentTool = "rect"; // 'rect' | 'circle' | 'pan'

    const undoHistory = new CanvasUndoHistory(30);

    const triggerUndo = (): void => {
      if (!currentImage || !undoHistory.canUndo) {
        addSimpleMessage("Nichts mehr zum Rückgängigmachen.", "ai");
        return;
      }
      const snap = undoHistory.undo(canvas, ctx);
      if (snap) {
        const img = new Image();
        img.onload = (): void => {
          currentImage = img;
          if (currentRect) {
            if (
              currentRect.x + currentRect.w > canvas.width ||
              currentRect.y + currentRect.h > canvas.height
            ) {
              clearSelection();
            } else {
              captureCrop();
            }
          }
        };
        img.src = canvas.toDataURL();
        addSimpleMessage(`↩ **Rückgängig gemacht:** ${snap.label}`, "ai");
      }
    };

    const triggerRedo = (): void => {
      if (!currentImage || !undoHistory.canRedo) {
        addSimpleMessage("Nichts mehr zum Wiederholen.", "ai");
        return;
      }
      const snap = undoHistory.redo(canvas, ctx);
      if (snap) {
        const img = new Image();
        img.onload = (): void => {
          currentImage = img;
          if (currentRect) {
            if (
              currentRect.x + currentRect.w > canvas.width ||
              currentRect.y + currentRect.h > canvas.height
            ) {
              clearSelection();
            } else {
              captureCrop();
            }
          }
        };
        img.src = canvas.toDataURL();
        addSimpleMessage(`↪ **Wiederholt:** ${snap.label}`, "ai");
      }
    };

    // Tools
    const btnToolRect = this._container.querySelector<HTMLElement>("#btn-tool-rect")!;
    const btnToolCircle = this._container.querySelector<HTMLElement>("#btn-tool-circle")!;
    const btnToolPan = this._container.querySelector<HTMLElement>("#btn-tool-pan")!;
    const btnToolWand = this._container.querySelector<HTMLElement>("#btn-tool-wand")!;
    const btnAutoSprites = this._container.querySelector<HTMLElement>("#btn-auto-sprites")!;
    const btnRemoveBg = this._container.querySelector<HTMLElement>("#btn-remove-bg")!;
    const btnGenNormal = this._container.querySelector<HTMLElement>("#btn-gen-normal")!;
    const btnUndo = this._container.querySelector<HTMLElement>("#btn-undo");
    const btnRedo = this._container.querySelector<HTMLElement>("#btn-redo");
    const zoomLabel = this._container.querySelector<HTMLElement>("#zoom-label")!;

    btnUndo?.addEventListener("click", triggerUndo);
    btnRedo?.addEventListener("click", triggerRedo);

    function setActiveTool(tool: string): void {
      currentTool = tool;
      btnToolRect.classList.toggle("active", tool === "rect");
      btnToolCircle.classList.toggle("active", tool === "circle");
      btnToolPan.classList.toggle("active", tool === "pan");
      btnToolWand.classList.toggle("active", tool === "wand");

      if (tool === "pan") {
        canvas.style.cursor = "grab";
      } else if (tool === "wand") {
        canvas.style.cursor = "cell";
      } else {
        canvas.style.cursor = "crosshair";
      }
    }

    btnToolRect.addEventListener("click", () => {
      setActiveTool("rect");
      if (selectionBox.style.display === "block") {
        selectionBox.style.borderRadius = "0";
        if (currentRect) captureCrop();
      }
    });

    btnToolCircle.addEventListener("click", () => {
      setActiveTool("circle");
      if (selectionBox.style.display === "block") {
        selectionBox.style.borderRadius = "50%";
        if (currentRect) captureCrop();
      }
    });

    btnToolPan.addEventListener("click", () => setActiveTool("pan"));
    btnToolWand.addEventListener("click", () => setActiveTool("wand"));

    // Stage 2 Power Tool Listeners
    btnAutoSprites.addEventListener("click", () => {
      if (!currentImage || canvas.width === 0) {
        addSimpleMessage(
          "Bitte lade zuerst ein Bild hoch, um Sprites automatisch zu erkennen.",
          "ai",
        );
        return;
      }

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const boxes = detectSpriteBounds(imgData, { minWidth: 8, minHeight: 8, padding: 2 });

      if (boxes.length === 0) {
        addSimpleMessage(
          "Keine isolierten Sprites auf transparentem Grund erkannt. (Tipp: Vorher 🪄 RemBG nutzen!).",
          "ai",
        );
        return;
      }

      addSimpleMessage(`✨ **${boxes.length} Sprites** automatisch auf dem Sheet erkannt:`, "ai");

      const gallery = document.createElement("div");
      gallery.style.display = "flex";
      gallery.style.gap = "6px";
      gallery.style.flexWrap = "wrap";
      gallery.style.marginTop = "10px";

      boxes.forEach((box, i) => {
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = box.w;
        sliceCanvas.height = box.h;
        sliceCanvas.style.border = "1px solid var(--tool-accent)";
        sliceCanvas.style.background = "var(--tool-panel-solid)";
        sliceCanvas.style.borderRadius = "4px";
        sliceCanvas.title = `Sprite ${i + 1} (${box.w}x${box.h}px)`;

        const sCtx = sliceCanvas.getContext("2d")!;
        sCtx.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);

        sliceCanvas.style.cursor = "pointer";
        sliceCanvas.addEventListener("click", () => {
          const link = document.createElement("a");
          link.download = `sprite_${i + 1}.png`;
          link.href = sliceCanvas.toDataURL("image/png");
          link.click();
        });

        gallery.appendChild(sliceCanvas);
      });

      chatHistory.lastChild!.appendChild(gallery);
      chatHistory.scrollTop = chatHistory.scrollHeight;

      // Highlight first detected box on canvas
      const firstBox = boxes[0];
      if (firstBox) {
        currentRect = firstBox;
        const rect = canvas.getBoundingClientRect();
        updateSelectionBox(
          firstBox.x,
          firstBox.y,
          firstBox.w,
          firstBox.h,
          canvas.width / rect.width,
          canvas.height / rect.height,
        );
        updatePropsUI();
        captureCrop();
      }
    });

    btnRemoveBg.addEventListener("click", () => {
      if (!currentImage || canvas.width === 0) {
        addSimpleMessage("Bitte lade zuerst ein Bild hoch, um den Hintergrund zu entfernen.", "ai");
        return;
      }

      undoHistory.push(canvas, ctx, "Hintergrund entfernen");

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const cleaned = removeBackground(imgData, { tolerance: 28, feather: 2 });
      ctx.putImageData(cleaned, 0, 0);
      if (currentRect) captureCrop();

      addSimpleMessage(
        "🪄 **Hintergrund entfernt!** Hintergrund wurde transparent freigestellt. (Rückgängig mit <kbd>Cmd+Z</kbd>)",
        "ai",
      );
    });

    btnGenNormal.addEventListener("click", () => {
      if (!currentImage || canvas.width === 0) {
        addSimpleMessage("Bitte lade zuerst ein Bild hoch, um eine Normal Map zu berechnen.", "ai");
        return;
      }

      const srcData =
        currentRect && cropPreviewCanvas.width > 0
          ? cropCtx.getImageData(0, 0, cropPreviewCanvas.width, cropPreviewCanvas.height)
          : ctx.getImageData(0, 0, canvas.width, canvas.height);

      const normalData = generateNormalMap(srcData, 2.5);
      const nCanvas = document.createElement("canvas");
      nCanvas.width = normalData.width;
      nCanvas.height = normalData.height;
      nCanvas.getContext("2d")!.putImageData(normalData, 0, 0);

      addSimpleMessage("🏔️ **Tangent-Space Normal Map** berechnet:", "ai");

      const previewDiv = document.createElement("div");
      previewDiv.style.marginTop = "8px";
      nCanvas.style.maxWidth = "100%";
      nCanvas.style.border = "1px solid var(--tool-border)";
      nCanvas.style.borderRadius = "4px";
      previewDiv.appendChild(nCanvas);

      const btnDl = document.createElement("button");
      btnDl.className = "tool-btn primary";
      btnDl.style.marginTop = "6px";
      btnDl.style.fontSize = "0.8rem";
      btnDl.style.padding = "4px 8px";
      btnDl.innerText = "📥 Normal Map herunterladen";
      btnDl.addEventListener("click", () => {
        const link = document.createElement("a");
        link.download = "normal_map.png";
        link.href = nCanvas.toDataURL("image/png");
        link.click();
      });
      previewDiv.appendChild(btnDl);

      chatHistory.lastChild!.appendChild(previewDiv);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    });

    // Zoom Logic
    function applyZoom(
      newZoom: number,
      centerX = window.innerWidth / 2,
      centerY = window.innerHeight / 2,
    ): void {
      if (!currentImage) return;
      const prevZoom = zoom;
      zoom = Math.max(0.1, Math.min(newZoom, 10));

      const rect = canvasStage.getBoundingClientRect();
      const ptX = (centerX - rect.left) / prevZoom;
      const ptY = (centerY - rect.top) / prevZoom;

      canvasStage.style.transform = `scale(${zoom})`;
      zoomLabel.innerText = Math.round(zoom * 100) + "%";

      // Adjust scroll to keep zoom centered
      canvasWrapper.scrollLeft += ptX * (zoom - prevZoom);
      canvasWrapper.scrollTop += ptY * (zoom - prevZoom);
    }

    this._container
      .querySelector<HTMLElement>("#btn-zoom-in")!
      .addEventListener("click", () => applyZoom(zoom * 1.2));
    this._container
      .querySelector<HTMLElement>("#btn-zoom-out")!
      .addEventListener("click", () => applyZoom(zoom * 0.8));

    canvasWrapper.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        if (e.ctrlKey) {
          e.preventDefault(); // Prevent native browser pinch zoom
          const factor = e.deltaY > 0 ? 0.9 : 1.1;
          applyZoom(zoom * factor, e.clientX, e.clientY);
        }
      },
      { passive: false },
    );

    // 1. Universal Ingest Router & Loading Logic
    const ingestRouter = new UniversalIngestRouter();

    const handleIngestResult = (result: IngestResult): void => {
      if (result.kind === "image" || result.kind === "svg") {
        if (this.loadFromBase64) {
          this.loadFromBase64(result.dataUrl);
        }
      } else if (result.kind === "pbr-set") {
        const main = primaryPbrTexture(result.pbrSet);
        if (main && this.loadFromBase64) {
          const reader = new FileReader();
          reader.onload = (): void => {
            if (this.loadFromBase64) this.loadFromBase64(reader.result as string);
          };
          reader.readAsDataURL(main);
          addSimpleMessage(`PBR-Set '${result.name}' erkannt & geladen.`, "ai");
        }
      } else if (result.kind === "archive" || result.kind === "files") {
        const firstImg = firstImageItem(result);
        if (firstImg && this.loadFromBase64) {
          const reader = new FileReader();
          reader.onload = (): void => {
            if (this.loadFromBase64) this.loadFromBase64(reader.result as string);
          };
          reader.readAsDataURL(firstImg.blob);
          addSimpleMessage(
            `Archiv '${result.name}' entpackt & Bild '${firstImg.name}' geladen.`,
            "ai",
          );
        }
      } else if (result.kind === "json") {
        addSimpleMessage(`JSON-Datei '${result.name}' eingelesen.`, "ai");
      }
    };

    if (emptyDropzoneContainer) {
      new UniversalIngestDropzone({
        container: emptyDropzoneContainer,
        label: "Bild, PDF oder ZIP ablegen",
        supportedKinds: ["image", "pbr-set", "zip", "files", "svg", "text"],
        enableWindowDrop: true,
        enablePaste: true,
        onIngest: async (result: IngestResult): Promise<void> => {
          handleIngestResult(result);
        },
        onError: (err: Error): void => {
          alert(err.message);
        },
      });
    }

    // Drag & Drop
    canvasWrapper.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropOverlay.style.display = "flex";
    });
    canvasWrapper.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dropOverlay.style.display = "none";
    });
    canvasWrapper.addEventListener("drop", (e) => {
      e.preventDefault();
      dropOverlay.style.display = "none";
      if (e.dataTransfer) {
        ingestRouter
          .routeDataTransfer(e.dataTransfer)
          .then(handleIngestResult)
          .catch((err: Error) => alert(err.message));
      }
    });

    this.loadFromBase64 = (base64: string): void => {
      const img = new Image();
      img.onload = (): void => {
        currentImage = img;
        if (emptyDropzoneContainer) emptyDropzoneContainer.style.display = "none";
        canvasStage.style.display = "block";
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        clearSelection();
        addSimpleMessage(`Bild geladen (${img.width}x${img.height}px).`, "ai");
      };
      img.src = base64;
    };

    // Paste from Clipboard (Screenshots, Image Files, Data URLs, Web Links, SVG Code)
    const onPaste = (e: ClipboardEvent): void => {
      if (!this._container.isConnected) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      if (e.clipboardData) {
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
          e.preventDefault();
          ingestRouter
            .routeFiles(Array.from(e.clipboardData.files))
            .then(handleIngestResult)
            .catch((err: Error) => alert(err.message));
          return;
        }

        const text = e.clipboardData.getData("text");
        if (text && text.trim()) {
          e.preventDefault();
          ingestRouter
            .routeText(text.trim(), "clipboard_asset")
            .then(handleIngestResult)
            .catch((err: Error) => alert(err.message));
        }
      }
    };

    window.addEventListener("paste", onPaste, { signal: this._abortController.signal });

    // Keyboard shortcuts: Remove image with Backspace/Delete, Undo/Redo with Cmd+Z / Cmd+Shift+Z
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!this._container.isConnected) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "z" && !e.shiftKey) {
          e.preventDefault();
          triggerUndo();
          return;
        }
        if ((key === "z" && e.shiftKey) || (key === "y" && !e.shiftKey)) {
          e.preventDefault();
          triggerRedo();
          return;
        }
      }

      if ((e.key === "Backspace" || e.key === "Delete") && currentImage) {
        e.preventDefault();
        const confirmed = window.confirm("Möchtest du das aktuelle Bild wirklich entfernen?");
        if (confirmed) {
          currentImage = null;
          currentRect = null;
          canvas.width = 0;
          canvas.height = 0;
          ctx.clearRect(0, 0, 0, 0);
          clearSelection();
          canvasStage.style.display = "none";
          if (emptyDropzoneContainer) emptyDropzoneContainer.style.display = "block";
          applyZoom(1);
          addSimpleMessage("Bild entfernt.", "ai");
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, { signal: this._abortController.signal });

    // 2. Selection & Move Logic
    function isInside(
      x: number,
      y: number,
      rect: { x: number; y: number; w: number; h: number },
    ): boolean {
      if (!rect) return false;
      return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }

    canvas.addEventListener("mousedown", (e) => {
      if (!currentImage) return;

      if (currentTool === "pan") {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        canvas.style.cursor = "grabbing";
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const pointerX = (e.clientX - rect.left) * scaleX;
      const pointerY = (e.clientY - rect.top) * scaleY;

      if (currentTool === "wand") {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const wandRes = magicWand(imgData, Math.round(pointerX), Math.round(pointerY), 32);
        if (wandRes && wandRes.box.w > 4 && wandRes.box.h > 4) {
          currentRect = wandRes.box;
          updateSelectionBox(
            currentRect.x,
            currentRect.y,
            currentRect.w,
            currentRect.h,
            scaleX,
            scaleY,
          );
          updatePropsUI();
          captureCrop();
        }
        return;
      }

      if (currentRect && isInside(pointerX, pointerY, currentRect)) {
        // Start moving
        isMoving = true;
        moveOffsetX = pointerX - currentRect!.x;
        moveOffsetY = pointerY - currentRect!.y;
      } else {
        // Start drawing new rect
        isDragging = true;
        startX = pointerX;
        startY = pointerY;
        selectionBox.style.display = "block";
        updateSelectionBox(startX, startY, 0, 0, scaleX, scaleY);
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!currentImage) return;

      if (isPanning) {
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        canvasWrapper.scrollLeft -= dx;
        canvasWrapper.scrollTop -= dy;
        panStartX = e.clientX;
        panStartY = e.clientY;
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const pointerX = (e.clientX - rect.left) * scaleX;
      const pointerY = (e.clientY - rect.top) * scaleY;

      // Change cursor if hovering over existing selection
      if (currentRect && isInside(pointerX, pointerY, currentRect) && !isDragging) {
        canvas.style.cursor = "move";
      } else {
        canvas.style.cursor = "crosshair";
      }

      if (isMoving && currentRect) {
        // Moving existing selection
        currentRect!.x = pointerX - moveOffsetX;
        currentRect!.y = pointerY - moveOffsetY;

        // Boundary constraints (optional, but good practice)
        currentRect!.x = Math.max(0, Math.min(currentRect!.x, canvas.width - currentRect!.w));
        currentRect!.y = Math.max(0, Math.min(currentRect!.y, canvas.height - currentRect!.h));

        updateSelectionBox(
          currentRect!.x,
          currentRect!.y,
          currentRect!.w,
          currentRect!.h,
          scaleX,
          scaleY,
        );
        updatePropsUI();
        captureCrop();
      } else if (isDragging) {
        // Drawing new selection
        const width = pointerX - startX;
        const height = pointerY - startY;
        updateSelectionBox(startX, startY, width, height, scaleX, scaleY);
      }
    });

    canvas.addEventListener("mouseup", (e) => {
      if (isPanning) {
        isPanning = false;
        canvas.style.cursor = "grab";
        return;
      }
      if (isMoving) {
        isMoving = false;
        return;
      }
      if (!isDragging) return;
      isDragging = false;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const endX = (e.clientX - rect.left) * scaleX;
      const endY = (e.clientY - rect.top) * scaleY;

      currentRect = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        w: Math.abs(endX - startX),
        h: Math.abs(endY - startY),
      };

      if (currentRect!.w > 10 && currentRect!.h > 10) {
        updatePropsUI();
        captureCrop();
      } else {
        clearSelection();
      }
    });

    // Precision Inputs Logic
    function updatePropsUI(): void {
      if (!currentRect) return;
      selectionProps.style.display = "flex";
      propX.value = currentRect!.x.toString();
      propY.value = currentRect!.y.toString();
      propW.value = currentRect!.w.toString();
      propH.value = currentRect!.h.toString();
    }

    function applyPropsToRect(): void {
      if (!currentRect) return;
      currentRect!.x = parseInt(propX.value) || 0;
      currentRect!.y = parseInt(propY.value) || 0;
      currentRect!.w = parseInt(propW.value) || 10;
      currentRect!.h = parseInt(propH.value) || 10;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      updateSelectionBox(
        currentRect!.x,
        currentRect!.y,
        currentRect!.w,
        currentRect!.h,
        scaleX,
        scaleY,
      );
      captureCrop();
    }

    [propX, propY, propW, propH].forEach((input) => {
      input.addEventListener("input", applyPropsToRect);
    });

    function updateSelectionBox(
      x: number,
      y: number,
      w: number,
      h: number,
      scaleX: number,
      scaleY: number,
    ): void {
      // Map back to CSS pixels
      const cssX = Math.min(x, x + w) / scaleX;
      const cssY = Math.min(y, y + h) / scaleY;
      const cssW = Math.abs(w) / scaleX;
      const cssH = Math.abs(h) / scaleY;

      selectionBox.style.left = cssX + "px";
      selectionBox.style.top = cssY + "px";
      selectionBox.style.width = cssW + "px";
      selectionBox.style.height = cssH + "px";

      if (currentTool === "circle") {
        selectionBox.style.borderRadius = "50%";
      } else {
        selectionBox.style.borderRadius = "0";
      }
    }

    function captureCrop(): void {
      contextPill.style.display = "flex";
      cropPreviewCanvas.width = currentRect!.w;
      cropPreviewCanvas.height = currentRect!.h;
      cropCtx.clearRect(0, 0, currentRect!.w, currentRect!.h);

      if (currentTool === "circle") {
        cropCtx.save();
        cropCtx.beginPath();
        cropCtx.ellipse(
          currentRect!.w / 2,
          currentRect!.h / 2,
          currentRect!.w / 2,
          currentRect!.h / 2,
          0,
          0,
          2 * Math.PI,
        );
        cropCtx.clip();
        cropCtx.drawImage(
          canvas,
          currentRect!.x,
          currentRect!.y,
          currentRect!.w,
          currentRect!.h,
          0,
          0,
          currentRect!.w,
          currentRect!.h,
        );
        cropCtx.restore();
      } else {
        cropCtx.drawImage(
          canvas,
          currentRect!.x,
          currentRect!.y,
          currentRect!.w,
          currentRect!.h,
          0,
          0,
          currentRect!.w,
          currentRect!.h,
        );
      }
    }

    function clearSelection(): void {
      currentRect = null;
      selectionBox.style.display = "none";
      contextPill.style.display = "none";
      selectionProps.style.display = "none";
    }

    btnCancelCrop.addEventListener("click", clearSelection);
    btnClearSelection.addEventListener("click", clearSelection);

    btnSendPixler.addEventListener("click", () => {
      if (currentRect) {
        const base64 = cropPreviewCanvas.toDataURL("image/png");
        this.events.dispatchEvent(ToolEvents.Pixler.LOAD_BASE64, { base64 });
      }
    });

    // 3. Multi-Provider Vision AI Chat & Settings Logic
    let aiConfig = AiConfigStorage.load();

    const aiBadge = this._container.querySelector<HTMLElement>("#ai-badge")!;
    const btnToggleSettings =
      this._container.querySelector<HTMLElement>("#btn-toggle-ai-settings")!;
    const aiSettingsPanel = this._container.querySelector<HTMLElement>("#ai-settings-panel")!;
    const aiProviderSelect =
      this._container.querySelector<HTMLSelectElement>("#ai-provider-select")!;
    const aiApiKey = this._container.querySelector<HTMLInputElement>("#ai-api-key")!;
    const aiApiKeyRow = this._container.querySelector<HTMLElement>("#ai-apikey-row")!;
    const aiModelSelect = this._container.querySelector<HTMLSelectElement>("#ai-model-select")!;
    const aiModelName = this._container.querySelector<HTMLInputElement>("#ai-model-name")!;
    const btnFetchModels = this._container.querySelector<HTMLElement>("#btn-fetch-models")!;
    const aiEndpoint = this._container.querySelector<HTMLInputElement>("#ai-endpoint")!;
    const aiEndpointRow = this._container.querySelector<HTMLElement>("#ai-endpoint-row")!;
    const btnSaveAiSettings = this._container.querySelector<HTMLElement>("#btn-save-ai-settings")!;
    const btnCloseAiSettings =
      this._container.querySelector<HTMLElement>("#btn-close-ai-settings")!;
    const aiSettingsStatus = this._container.querySelector<HTMLElement>("#ai-settings-status")!;

    const chatInput = this._container.querySelector<HTMLInputElement>("#chat-input")!;
    const btnSend = this._container.querySelector<HTMLElement>("#btn-send")!;
    const chatHistory = this._container.querySelector<HTMLElement>("#chat-history")!;

    const commandHistory = new CommandHistory({
      maxEntries: 100,
      storageKey: "sw_xtractor_command_history",
      pageStep: 10,
    });
    commandHistory.bindInput(chatInput);

    function populateModelDropdown(models: string[], selectedModel: string): void {
      aiModelSelect.innerHTML = "";
      const sorted = sortModelsDescending(models);
      let found = false;
      for (const m of sorted) {
        const opt = document.createElement("option");
        opt.value = m;
        opt.innerText = m;
        if (m === selectedModel) {
          opt.selected = true;
          found = true;
        }
        aiModelSelect.appendChild(opt);
      }
      const customOpt = document.createElement("option");
      customOpt.value = "__custom__";
      customOpt.innerText = "Manuelle Eingabe...";
      if (!found && selectedModel) {
        customOpt.selected = true;
        aiModelName.style.display = "block";
      } else {
        aiModelName.style.display = "none";
      }
      aiModelSelect.appendChild(customOpt);
    }

    async function refreshModelsForProvider(cfg: AiConfig): Promise<void> {
      btnFetchModels.innerText = "⏳...";
      try {
        const provider = createVisionAiProvider(cfg);
        if (provider.listModels) {
          const models = await provider.listModels();
          populateModelDropdown(models, cfg.model);
        }
      } catch {
        // Fallback
      } finally {
        btnFetchModels.innerText = "🔄 Modelle laden";
      }
    }

    function syncAiUI(cfg: AiConfig): void {
      const providerNames: Record<AiProviderType, string> = {
        gemini: "Gemini",
        openai: "OpenAI",
        claude: "Claude",
        ollama: "Ollama",
        custom: "Custom",
      };
      const name = providerNames[cfg.provider] || cfg.provider;
      const modelShort = cfg.model ? ` (${cfg.model.split("/").pop()})` : "";
      aiBadge.innerText = `${name}${modelShort}`;

      aiProviderSelect.value = cfg.provider;
      aiApiKey.value = cfg.apiKey || "";
      aiModelName.value = cfg.model || "";
      aiEndpoint.value = cfg.endpoint || "";

      // Visibility of fields
      if (cfg.provider === "ollama") {
        aiApiKeyRow.style.display = "none";
        aiEndpointRow.style.display = "flex";
      } else if (cfg.provider === "custom") {
        aiApiKeyRow.style.display = "flex";
        aiEndpointRow.style.display = "flex";
      } else {
        aiApiKeyRow.style.display = "flex";
        aiEndpointRow.style.display = "none";
      }

      void refreshModelsForProvider(cfg);
    }

    syncAiUI(aiConfig);

    aiModelSelect.addEventListener("change", () => {
      if (aiModelSelect.value === "__custom__") {
        aiModelName.style.display = "block";
        aiModelName.focus();
      } else {
        aiModelName.style.display = "none";
        aiModelName.value = aiModelSelect.value;
      }
    });

    btnFetchModels.addEventListener("click", () => {
      const tempCfg: AiConfig = {
        provider: aiProviderSelect.value as AiProviderType,
        apiKey: aiApiKey.value.trim(),
        model: aiModelName.value.trim(),
        endpoint: aiEndpoint.value.trim() || undefined,
      };
      void refreshModelsForProvider(tempCfg);
    });

    aiProviderSelect.addEventListener("change", () => {
      const selected = aiProviderSelect.value as AiProviderType;
      const defaults = DEFAULT_AI_CONFIGS[selected] || DEFAULT_AI_CONFIGS.gemini;
      aiModelName.value = defaults.model;
      aiEndpoint.value = defaults.endpoint || "";
      if (selected === "ollama") {
        aiApiKeyRow.style.display = "none";
        aiEndpointRow.style.display = "flex";
      } else if (selected === "custom") {
        aiApiKeyRow.style.display = "flex";
        aiEndpointRow.style.display = "flex";
      } else {
        aiApiKeyRow.style.display = "flex";
        aiEndpointRow.style.display = "none";
      }

      void refreshModelsForProvider({
        provider: selected,
        apiKey: aiApiKey.value.trim(),
        model: defaults.model,
        endpoint: aiEndpoint.value.trim() || undefined,
      });
    });

    btnToggleSettings.addEventListener("click", () => {
      const isVisible = aiSettingsPanel.style.display !== "none";
      aiSettingsPanel.style.display = isVisible ? "none" : "flex";
      aiSettingsStatus.style.display = "none";
    });

    btnCloseAiSettings.addEventListener("click", () => {
      aiSettingsPanel.style.display = "none";
      aiSettingsStatus.style.display = "none";
    });

    btnSaveAiSettings.addEventListener("click", async () => {
      aiSettingsStatus.style.display = "block";
      aiSettingsStatus.style.color = "var(--tool-text-muted)";
      aiSettingsStatus.innerText = "⏳ Verbindung wird getestet...";

      const selectedModel =
        aiModelSelect.value === "__custom__"
          ? aiModelName.value.trim()
          : aiModelSelect.value || aiModelName.value.trim();

      const newConfig: AiConfig = {
        provider: aiProviderSelect.value as AiProviderType,
        apiKey: aiApiKey.value.trim(),
        model: selectedModel,
        endpoint: aiEndpoint.value.trim() || undefined,
      };

      try {
        const provider = createVisionAiProvider(newConfig);
        await provider.testConnection();
        aiConfig = newConfig;
        AiConfigStorage.save(newConfig);
        syncAiUI(newConfig);
        aiSettingsStatus.style.color = "#4ade80";
        aiSettingsStatus.innerText = "✓ Verbindung erfolgreich! Gespeichert.";
        setTimeout(() => {
          aiSettingsPanel.style.display = "none";
        }, 1200);
      } catch (err) {
        aiSettingsStatus.style.color = "#f87171";
        const msg = err instanceof Error ? err.message : String(err);
        aiSettingsStatus.innerText = `Fehler: ${msg}`;
      }
    });

    function executeSlice(numSlices: number): void {
      if (!currentRect) {
        addSimpleMessage(
          "Bitte wähle zuerst einen Bereich auf der Canvas aus, um ihn zu zerteilen.",
          "ai",
        );
        return;
      }
      const count = Math.max(1, Math.min(64, numSlices));
      const sliceWidth = currentRect.w / count;

      addSimpleMessage(`Bereich in ${count} gleichmäßige Segmente unterteilt:`, "ai");

      const gallery = document.createElement("div");
      gallery.style.display = "flex";
      gallery.style.gap = "6px";
      gallery.style.flexWrap = "wrap";
      gallery.style.marginTop = "10px";

      for (let i = 0; i < count; i++) {
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = sliceWidth;
        sliceCanvas.height = currentRect.h;
        sliceCanvas.style.border = "1px solid var(--tool-accent2)";
        sliceCanvas.style.background = "var(--tool-panel-solid)";
        sliceCanvas.style.borderRadius = "4px";
        sliceCanvas.title = `Sprite ${i + 1} (Klicken zum Download)`;

        const sCtx = sliceCanvas.getContext("2d")!;
        sCtx.drawImage(
          canvas,
          currentRect.x + i * sliceWidth,
          currentRect.y,
          sliceWidth,
          currentRect.h,
          0,
          0,
          sliceWidth,
          currentRect.h,
        );

        sliceCanvas.style.cursor = "pointer";
        sliceCanvas.addEventListener("click", () => {
          const link = document.createElement("a");
          link.download = `sprite_slice_${i + 1}.png`;
          link.href = sliceCanvas.toDataURL("image/png");
          link.click();
        });

        gallery.appendChild(sliceCanvas);
      }

      chatHistory.lastChild!.appendChild(gallery);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function addSimpleMessage(text: string, type: "user" | "ai"): HTMLElement {
      const msg = document.createElement("div");
      msg.className = `swf-ix-message msg-${type}`;
      msg.innerHTML = text.replace(/\n/g, "<br/>");
      chatHistory.appendChild(msg);
      chatHistory.scrollTop = chatHistory.scrollHeight;
      return msg;
    }

    function formatAiResponse(rawText: string): HTMLElement {
      const msg = document.createElement("div");
      msg.className = "swf-ix-message msg-ai";

      // Parse code blocks, bold, list items, and action tags
      let html = rawText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      // Code blocks
      html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
        return `<pre><code>${code}</code></pre>`;
      });

      // Inline code
      html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

      // Bold
      html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

      // Linebreaks
      html = html.replace(/\n/g, "<br/>");

      msg.innerHTML = html;

      // Extract Color codes (#RRGGBB) to add visual swatches
      const colorMatches = Array.from(rawText.matchAll(/#([0-9a-fA-F]{6})\b/g));
      if (colorMatches.length > 0) {
        const uniqueColors = Array.from(new Set(colorMatches.map((m) => m[0])));
        const chipContainer = document.createElement("div");
        chipContainer.className = "swf-ix-chip-container";
        for (const hex of uniqueColors) {
          const chip = document.createElement("span");
          chip.className = "swf-ix-color-chip";
          chip.innerHTML = `<span class="swf-ix-color-swatch" style="background:${hex};"></span>${hex}`;
          chipContainer.appendChild(chip);
        }
        msg.appendChild(chipContainer);
      }

      // Parse all action chips
      const chips = parseActionChips(rawText);
      if (chips.length > 0) {
        const chipContainer = document.createElement("div");
        chipContainer.className = "swf-ix-chip-container";

        for (const chip of chips) {
          const btnChip = document.createElement("button");
          btnChip.className = "swf-ix-action-chip";
          btnChip.innerHTML = `${chip.icon} ${chip.label}`;
          btnChip.addEventListener("click", () => applyActionChip(chip));
          chipContainer.appendChild(btnChip);
        }

        if (chips.length > 1) {
          const btnAll = document.createElement("button");
          btnAll.className = "swf-ix-action-chip";
          btnAll.style.background = "var(--tool-accent, #3b82f6)";
          btnAll.style.color = "#ffffff";
          btnAll.style.fontWeight = "600";
          btnAll.innerHTML = "⚡ Alle Aktionen anwenden";
          btnAll.addEventListener("click", () => {
            for (const chip of chips) {
              applyActionChip(chip);
            }
          });
          chipContainer.appendChild(btnAll);
        }

        msg.appendChild(chipContainer);
      }

      chatHistory.appendChild(msg);
      chatHistory.scrollTop = chatHistory.scrollHeight;
      return msg;
    }

    function replaceCanvasData(newImgData: ImageData): void {
      canvas.width = newImgData.width;
      canvas.height = newImgData.height;
      ctx.putImageData(newImgData, 0, 0);
      const img = new Image();
      img.onload = (): void => {
        currentImage = img;
        clearSelection();
      };
      img.src = canvas.toDataURL();
    }

    function showMapPreview(title: string, mapData: ImageData, defaultFilename: string): void {
      const mCanvas = document.createElement("canvas");
      mCanvas.width = mapData.width;
      mCanvas.height = mapData.height;
      mCanvas.getContext("2d")!.putImageData(mapData, 0, 0);

      const previewDiv = document.createElement("div");
      previewDiv.style.marginTop = "8px";
      mCanvas.style.maxWidth = "100%";
      mCanvas.style.border = "1px solid var(--tool-border)";
      mCanvas.style.borderRadius = "4px";
      previewDiv.appendChild(mCanvas);

      const btnDl = document.createElement("button");
      btnDl.className = "tool-btn primary";
      btnDl.style.marginTop = "6px";
      btnDl.style.fontSize = "0.8rem";
      btnDl.style.padding = "4px 8px";
      btnDl.innerText = `📥 ${title} herunterladen`;
      btnDl.addEventListener("click", () => {
        const a = document.createElement("a");
        a.href = mCanvas.toDataURL("image/png");
        a.download = defaultFilename;
        a.click();
      });
      previewDiv.appendChild(btnDl);

      const msg = addSimpleMessage(`✨ **${title}** berechnet:`, "ai");
      msg.appendChild(previewDiv);
    }

    function applyActionChip(chip: CanvasActionChip): void {
      if (!currentImage || canvas.width === 0) {
        addSimpleMessage("Bitte lade zuerst ein Bild hoch, um eine Aktion auszuführen.", "ai");
        return;
      }

      const srcData =
        currentRect && cropPreviewCanvas.width > 0 && cropPreviewCanvas.height > 0
          ? cropCtx.getImageData(0, 0, cropPreviewCanvas.width, cropPreviewCanvas.height)
          : ctx.getImageData(0, 0, canvas.width, canvas.height);

      const result = chip.execute(srcData);

      if ("data" in result && (result as ImageData).data instanceof Uint8ClampedArray) {
        undoHistory.push(canvas, ctx, chip.label || "Bildaktion");
        const newImgData = result as ImageData;
        if (
          currentRect &&
          cropPreviewCanvas.width > 0 &&
          newImgData.width === currentRect.w &&
          newImgData.height === currentRect.h
        ) {
          ctx.putImageData(newImgData, currentRect.x, currentRect.y);
          captureCrop();
        } else {
          replaceCanvasData(newImgData);
        }
        addSimpleMessage(
          `✅ **${chip.label}** angewendet! (Rückgängig mit <kbd>Cmd+Z</kbd>)`,
          "ai",
        );
      } else {
        const customRes = result as {
          normalMap?: ImageData;
          depthMap?: ImageData;
          sliceCount?: number;
          autoSprites?: boolean;
        };
        if (customRes.autoSprites) {
          btnAutoSprites.click();
        } else if (customRes.sliceCount) {
          executeSlice(customRes.sliceCount);
        } else if (customRes.normalMap) {
          showMapPreview("Tangent-Space Normal Map", customRes.normalMap, "normal_map.png");
        } else if (customRes.depthMap) {
          showMapPreview("Depth / Height Map", customRes.depthMap, "depth_map.png");
        }
      }
    }

    const conversationHistory: VisionAiMessage[] = [];

    const SYSTEM_PROMPT = `You are the Small World Vision AI Assistant for 2D/3D game art, texture extraction, sprite sheets, pixel art, and material authoring.
When analyzing images, recommend and emit deterministic action chips using square brackets so the user can apply them with 1 click:
- Background Removal & Chroma: '[REMBG]' or '[CHROMA_KEY: #hex, tolerance]'
- Trimming & Cropping: '[AUTOCROP]' (trim transparent padding), '[CROP: x, y, w, h]'
- Geometry & Transforms: '[FLIP_H]', '[FLIP_V]', '[ROTATE: 90|-90|180|270]', '[SCALE: 2x|4x|0.5x]', '[PAD_POT]' (power of 2)
- Color & Palette: '[RECOLOR: #fromHex -> #toHex]', '[POSTERIZE: 4]' (retro palette quantization), '[GRAYSCALE]', '[INVERT]', '[SEPIA]', '[AUTO_LEVELS]'
- Tone Adjustments: '[ADJUST: brightness=1.2, contrast=1.1, hue=45, saturation=1.2]'
- Game Art & Pixel Cleanup: '[OUTLINE: #000000, 1]' (add crisp pixel outline), '[DESPECKLE]' (remove orphan noise pixels)
- Sprite Slicing: '[AUTO_SPRITES]' (auto connected-component detection), '[SLICE: N]' (uniform N frame slice)
- 3D Texture Maps: '[NORMAL_MAP]' (tangent-space normal vectors), '[DEPTH_MAP]' (height/depth), '[EMISSIVE_MAP]' (glow mask), '[AO_MAP]' (ambient occlusion)

When colors or palettes are mentioned, output HEX values (e.g. #ff3366).
Keep answers concise, actionable, and formatted with clean markdown bullet points.`;

    async function handleSend(): Promise<void> {
      const text = chatInput.value.trim();
      if (!text) return;

      commandHistory.push(text);
      addSimpleMessage(text, "user");
      chatInput.value = "";

      // Quick local fallback for commands if typed directly
      const directChips = parseActionChips(text);
      if (directChips.length > 0) {
        for (const chip of directChips) {
          applyActionChip(chip);
        }
        return;
      }

      // Prepare image payload
      let imageBase64: string | undefined;
      if (currentRect && cropPreviewCanvas.width > 0 && cropPreviewCanvas.height > 0) {
        imageBase64 = cropPreviewCanvas.toDataURL("image/png");
      } else if (currentImage && canvas.width > 0 && canvas.height > 0) {
        // Downscale large canvas to max 1024px for fast vision transmission
        const maxDim = 1024;
        if (canvas.width > maxDim || canvas.height > maxDim) {
          const scale = Math.min(maxDim / canvas.width, maxDim / canvas.height);
          const thumb = document.createElement("canvas");
          thumb.width = Math.round(canvas.width * scale);
          thumb.height = Math.round(canvas.height * scale);
          const tCtx = thumb.getContext("2d")!;
          tCtx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
          imageBase64 = thumb.toDataURL("image/jpeg", 0.85);
        } else {
          imageBase64 = canvas.toDataURL("image/png");
        }
      }

      // Check if API key / provider is configured
      const hasKey = !!aiConfig.apiKey?.trim() || aiConfig.provider === "ollama";
      if (!hasKey) {
        const fallbackMsg = document.createElement("div");
        fallbackMsg.className = "swf-ix-message msg-ai";
        fallbackMsg.innerHTML = `
          <strong>Noch kein KI-Provider eingerichtet.</strong><br/>
          Um die echte Multimodal-Vision-KI zu nutzen (Gemini, OpenAI, Claude oder lokales Ollama), trage bitte deinen API-Key in den Einstellungen ein.<br/>
          <button class="tool-btn primary" style="margin-top: 8px; font-size: 0.82rem; padding: 4px 8px;">⚙️ Jetzt Provider konfigurieren</button>
        `;
        const btnOpen = fallbackMsg.querySelector("button")!;
        btnOpen.addEventListener("click", () => {
          aiSettingsPanel.style.display = "flex";
        });
        chatHistory.appendChild(fallbackMsg);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return;
      }

      // Render thinking indicator
      const thinkingMsg = document.createElement("div");
      thinkingMsg.className = "swf-ix-message msg-ai swf-ix-thinking";
      thinkingMsg.innerHTML = `<span class="swf-ix-spinner"></span> <span>Vision AI analysiert...</span>`;
      chatHistory.appendChild(thinkingMsg);
      chatHistory.scrollTop = chatHistory.scrollHeight;

      conversationHistory.push({
        role: "user",
        content: text,
        imageBase64,
      });

      try {
        const provider = createVisionAiProvider(aiConfig);
        const response = await provider.sendMessage({
          messages: conversationHistory,
          systemInstruction: SYSTEM_PROMPT,
        });

        thinkingMsg.remove();
        conversationHistory.push({
          role: "assistant",
          content: response.text,
        });

        formatAiResponse(response.text);
      } catch (err) {
        thinkingMsg.remove();
        const errStr = err instanceof Error ? err.message : String(err);
        const errMsg = document.createElement("div");
        errMsg.className = "swf-ix-message msg-ai";
        errMsg.style.borderColor = "#f87171";
        errMsg.innerHTML = `<strong>⚠️ KI-Fehler:</strong> ${errStr}<br/><button class="tool-btn" style="margin-top:6px;font-size:0.8rem;">⚙️ Einstellungen überprüfen</button>`;
        errMsg.querySelector("button")!.addEventListener("click", () => {
          aiSettingsPanel.style.display = "flex";
        });
        chatHistory.appendChild(errMsg);
        chatHistory.scrollTop = chatHistory.scrollHeight;
      }
    }

    btnSend.addEventListener("click", () => void handleSend());

    chatInput.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") void handleSend();
    });

    // 4. Splitter Logic
    const splitter = this._container.querySelector<HTMLElement>("#splitter")!;
    const sidebar = this._container.querySelector<HTMLElement>("#sidebar")!;
    let isSplitting = false;

    splitter.addEventListener("mousedown", (_e: MouseEvent) => {
      isSplitting = true;
      splitter.classList.add("active");
      document.body.style.cursor = "col-resize";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isSplitting) return;
      const containerRect = this._container.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      if (newWidth > 250 && newWidth < containerRect.width - 300) {
        sidebar.style.width = newWidth + "px";
      }
    });

    document.addEventListener("mouseup", () => {
      if (isSplitting) {
        isSplitting = false;
        splitter.classList.remove("active");
        document.body.style.cursor = "";
      }
    });
  }

  public getState(): unknown {
    return null;
  }
  public setState(_state: unknown): void {}
}
