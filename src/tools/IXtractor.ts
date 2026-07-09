import { ForgeTool, ForgeToolOptions } from "./forge/ForgeTool.js";
import { ToolEvents } from "../enums/ToolEvents.js";

export class IXtractor extends ForgeTool {
  public loadFromBase64?: (base64: string) => void;

  public override onPasteImage(base64: string): void {
    if (this.loadFromBase64) {
      this.loadFromBase64(base64);
    }
  }

  constructor(options: ForgeToolOptions = {}) {
    super(options);
    this._injectCSS();
    this._buildUI();
    this._bindLogic();
  }

  private _injectCSS(): void {
    if (document.getElementById("ixtractor-style")) return;
    const style = document.createElement("style");
    style.id = "ixtractor-style";
    style.innerHTML = `
    body {
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: #121214;
      color: #e2e8f0;
      margin: 0;
      padding: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    header {
      padding: 1rem 2rem;
      border-bottom: 1px solid rgba(0, 229, 255, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(90deg, rgba(11,15,25,1) 0%, rgba(20,25,40,1) 100%);
      flex-shrink: 0;
    }
    h1 { margin: 0; font-size: 1.5rem; text-transform: uppercase; letter-spacing: 2px; color: #fff; }
    h1 span { color: #00e5ff; }
    
    .main-container {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Left Side: Workbench */
    .workbench {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #0f172a;
      position: relative;
      min-width: 0;
    }
    .toolbar {
      padding: 0.5rem 1rem;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 15px;
    }
    .toolbar-group {
      display: flex;
      gap: 5px;
      background: #0f172a;
      padding: 4px;
      border-radius: 6px;
      border: 1px solid #334155;
    }
    .btn {
      background: #38bdf8;
      color: #0f172a;
      border: none;
      padding: 0.5rem 1rem;
      font-weight: bold;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover { background: #7dd3fc; }
    .btn.secondary { background: #475569; color: #e2e8f0; }
    .btn.secondary:hover { background: #64748b; }
    
    .tool-btn {
      background: transparent;
      color: #94a3b8;
    }
    .tool-btn:hover { background: rgba(56, 189, 248, 0.2); color: #fff; }
    .tool-btn.active { background: #38bdf8; color: #0f172a; }
    
    .canvas-container {
      flex: 1;
      overflow: auto;
      padding: 2rem;
      position: relative;
      background: repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 20px 20px;
    }
    #canvas-stage {
      position: relative; 
      display: inline-block; 
      transform-origin: 0 0;
      transition: transform 0.1s ease-out;
    }
    #image-canvas {
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      cursor: crosshair;
      max-width: 100%;
    }
    #drop-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 1.5rem;
      color: #38bdf8;
      border: 4px dashed #38bdf8;
      z-index: 10;
      display: none;
    }
    /* Splitter */
    .splitter {
      width: 8px;
      background: #1e293b;
      cursor: col-resize;
      display: flex;
      justify-content: center;
      align-items: center;
      border-left: 1px solid #334155;
      border-right: 1px solid #334155;
      transition: background 0.2s;
      flex-shrink: 0;
      z-index: 50;
    }
    .splitter:hover, .splitter.active {
      background: #38bdf8;
    }
    .splitter::after {
      content: '||';
      color: #94a3b8;
      font-size: 10px;
      letter-spacing: -1px;
    }
    .splitter:hover::after, .splitter.active::after {
      color: #0f172a;
    }

    /* Right Side: Chat & Results */
    .sidebar {
      width: 400px;
      min-width: 250px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      background: #121214;
    }
    .chat-history {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .message {
      padding: 1rem;
      border-radius: 8px;
      max-width: 85%;
    }
    .msg-ai {
      background: #1e293b;
      align-self: flex-start;
      border: 1px solid #334155;
    }
    .msg-user {
      background: #0284c7;
      color: white;
      align-self: flex-end;
    }
    
    .chat-input-area {
      padding: 1rem;
      background: #1e293b;
      border-top: 1px solid #334155;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .context-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #0f172a;
      padding: 0.5rem;
      border-radius: 4px;
      border: 1px solid #38bdf8;
      display: none;
    }
    .context-pill canvas {
      height: 40px;
      border: 1px solid #475569;
    }
    .context-pill-text {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .chat-input-row {
      display: flex;
      gap: 10px;
    }
    input[type="text"] {
      flex: 1;
      padding: 0.75rem;
      border-radius: 4px;
      border: 1px solid #475569;
      background: #0f172a;
      color: white;
      outline: none;
    }
    input[type="text"]:focus { border-color: #38bdf8; }

    /* Selection Box & Props */
    #selection-box {
      position: absolute;
      border: 2px dashed #00e5ff;
      background: rgba(0, 229, 255, 0.2);
      pointer-events: none; /* Let canvas handle events */
      display: none;
      z-index: 5;
    }
    #selection-props {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: #1e293b;
      padding: 10px 15px;
      border-radius: 6px;
      border: 1px solid #334155;
      display: flex;
      gap: 15px;
      z-index: 20;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    }
    .prop-group {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #94a3b8;
      font-size: 0.9rem;
      font-weight: bold;
    }
    .prop-input {
      width: 50px;
      background: #0f172a;
      color: white;
      border: 1px solid #475569;
      padding: 4px;
      border-radius: 4px;
      outline: none;
    }
    .prop-input:focus { border-color: #38bdf8; }
  `;
    document.head.appendChild(style);
  }

  private _buildUI(): void {
    this._container.style.width = "100%";
    this._container.style.height = "100%";
    this._container.style.display = "flex";
    this._container.style.flexDirection = "row";
    this._container.innerHTML = `
    <!-- WORKBENCH -->
    <div class="workbench">
      <div class="toolbar">
        <label class="btn">
          Upload Image/PDF
          <input type="file" id="file-input" style="display:none;" accept="image/*,application/pdf" />
        </label>
        
        <div class="toolbar-group">
          <input type="text" id="url-input" class="prop-input" style="width: 150px; font-weight:normal;" placeholder="https://... (Image URL)" />
          <button class="btn secondary" id="btn-load-url" style="padding: 0.25rem 0.5rem; margin-left: 2px;">Load URL</button>
        </div>
        
        <div class="toolbar-group">
          <button class="btn tool-btn" id="btn-tool-pan" title="Hand Tool">Hand</button>
          <button class="btn tool-btn active" id="btn-tool-rect" title="Rechteck Auswahl">Rechteck</button>
          <button class="btn tool-btn" id="btn-tool-circle" title="Kreis Auswahl">Kreis</button>
        </div>
        
        <div class="toolbar-group">
          <button class="btn tool-btn" id="btn-zoom-out">-</button>
          <span style="color: #94a3b8; padding: 0 5px; font-weight: bold; font-size: 0.9rem; align-self: center;" id="zoom-label">100%</span>
          <button class="btn tool-btn" id="btn-zoom-in">+</button>
        </div>
        
        <button class="btn secondary" style="margin-left: auto;" id="btn-clear-selection">Clear Selection</button>
      </div>
      
      <div class="canvas-container" id="canvas-wrapper">
        <div id="drop-overlay">Drop File Here</div>
        <!-- We wrap the canvas in a div that exactly matches the image size to position absolute elements easily -->
        <div id="canvas-stage">
            <canvas id="image-canvas"></canvas>
            <div id="selection-box"></div>
        </div>
        
        <!-- Precision Input Panel -->
        <div id="selection-props" style="display: none;">
          <div class="prop-group"><label>X:</label> <input type="number" id="prop-x" class="prop-input"/></div>
          <div class="prop-group"><label>Y:</label> <input type="number" id="prop-y" class="prop-input"/></div>
          <div class="prop-group"><label>W:</label> <input type="number" id="prop-w" class="prop-input"/></div>
          <div class="prop-group"><label>H:</label> <input type="number" id="prop-h" class="prop-input"/></div>
        </div>
      </div>
    <!-- SPLITTER -->
    <div class="splitter" id="splitter"></div>

    <!-- CHAT & AI INTERFACE -->
    <div class="sidebar" id="sidebar">
      <div class="chat-history" id="chat-history">
        <div class="message msg-ai">
          Willkommen beim IXtractor! Lade ein Bild hoch (oder ziehe es per Drag & Drop rein) und markiere einen Bereich, den ich für dich analysieren oder zuschneiden soll.
        </div>
      </div>
      
      <div class="chat-input-area">
        <div class="context-pill" id="context-pill">
          <canvas id="crop-preview-canvas"></canvas>
          <div class="context-pill-text">Ausschnitt markiert.</div>
          <button class="btn secondary" style="padding: 0.2rem 0.5rem; margin-left: auto; margin-right: 5px;" id="btn-send-pixler">An Pixler</button>
          <button class="btn secondary" style="padding: 0.2rem 0.5rem;" id="btn-cancel-crop">X</button>
        </div>
        <div class="chat-input-row">
          <input type="text" id="chat-input" placeholder="Z. B. 'Extrahiere alle Zahlen aus dem Bild...'" />
          <button class="btn" id="btn-send">Senden</button>
        </div>
      </div>
    </div>`;
  }

  private _bindLogic(): void {
    // Elements
    const canvas = this._container.querySelector<HTMLCanvasElement>("#image-canvas")!;
    const ctx = canvas.getContext("2d")!;
    const fileInput = this._container.querySelector<HTMLInputElement>("#file-input")!;
    const canvasWrapper = this._container.querySelector<HTMLElement>("#canvas-wrapper")!;
    const canvasStage = this._container.querySelector<HTMLElement>("#canvas-stage")!;
    const dropOverlay = this._container.querySelector<HTMLElement>("#drop-overlay")!;
    const selectionBox = this._container.querySelector<HTMLElement>("#selection-box")!;
    const selectionProps = this._container.querySelector<HTMLElement>("#selection-props")!;

    const urlInput = this._container.querySelector<HTMLInputElement>("#url-input")!;
    const btnLoadUrl = this._container.querySelector<HTMLElement>("#btn-load-url")!;

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

    // Tools
    const btnToolRect = this._container.querySelector<HTMLElement>("#btn-tool-rect")!;
    const btnToolCircle = this._container.querySelector<HTMLElement>("#btn-tool-circle")!;
    const btnToolPan = this._container.querySelector<HTMLElement>("#btn-tool-pan")!;
    const zoomLabel = this._container.querySelector<HTMLElement>("#zoom-label")!;

    function setActiveTool(tool: string): void {
      currentTool = tool;
      btnToolRect.classList.toggle("active", tool === "rect");
      btnToolCircle.classList.toggle("active", tool === "circle");
      btnToolPan.classList.toggle("active", tool === "pan");

      if (tool === "pan") {
        canvas.style.cursor = "grab";
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

    // 1. File Loading Logic
    fileInput.addEventListener("change", (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        loadFile(target.files[0]!);
      }
    });

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
      if (e.dataTransfer!.files && e.dataTransfer!.files[0]) {
        loadFile(e.dataTransfer!.files[0]);
      }
    });

    this.loadFromBase64 = (base64: string): void => {
      const img = new Image();
      img.onload = (): void => {
        currentImage = img;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        clearSelection();
        addMessage(`Bild aus Zwischenablage geladen (${img.width}x${img.height}px).`, "ai");
      };
      img.src = base64;
    };

    const loadFile = (file: File): void => {
      if (file.type === "application/pdf") {
        alert("PDF Konvertierung bauen wir in Phase 2 ein (via PDF.js). Bitte ein Bild nutzen.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e): void => {
        const base64 = e.target!.result as string;
        // Call the mapped function
        if (this.loadFromBase64) {
          this.loadFromBase64(base64);
        }
      };
      reader.readAsDataURL(file);
    };

    // URL Loading Logic
    btnLoadUrl.addEventListener("click", () => {
      const url = urlInput.value.trim();
      if (!url) return;

      const img = new Image();
      img.crossOrigin = "Anonymous"; // Attempt to prevent canvas tainting
      img.onload = (): void => {
        currentImage = img;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        clearSelection();
        urlInput.value = "";
        addMessage(`Bild erfolgreich von URL geladen (${img.width}x${img.height}px).`, "ai");
      };
      img.onerror = (): void => {
        addMessage(
          `Fehler beim Laden der URL. Der fremde Server blockiert den Zugriff vermutlich durch CORS-Richtlinien. Lade das Bild am besten kurz lokal herunter und nutze den Upload-Button.`,
          "ai",
        );
      };
      img.src = url;
    });

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
      if (currentRect && this._options.events) {
        const base64 = cropPreviewCanvas.toDataURL("image/png");
        this._options.events.dispatchEvent(ToolEvents.Pixler.LOAD_BASE64, { base64 });
      } else if (!this._options.events) {
        alert("EventBus not found on ToolOptions");
      }
    });

    // 3. Mock Chat Logic
    const chatInput = this._container.querySelector<HTMLInputElement>("#chat-input")!;
    const btnSend = this._container.querySelector<HTMLElement>("#btn-send")!;
    const chatHistory = this._container.querySelector<HTMLElement>("#chat-history")!;

    function addMessage(text: string, type: "user" | "ai"): void {
      const msg = document.createElement("div");
      msg.className = `message msg-${type}`;
      msg.innerText = text;
      chatHistory.appendChild(msg);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    btnSend.addEventListener("click", () => {
      const text = chatInput.value.trim();
      if (!text) return;

      addMessage(text, "user");
      chatInput.value = "";

      // Mock AI Response & Processing
      setTimeout(() => {
        if (currentRect) {
          const lowerText = text.toLowerCase();

          // Smart keyword matching for slicing
          const match10 = lowerText.match(/(?:10|zehn)/);
          const matchSlice = lowerText.match(/(?:schneide|zerschneide|teile|slice|zahlen)/);

          if (match10 || matchSlice) {
            addMessage(
              "Ich habe deinen Ausschnitt analysiert und in 10 gleichmäßige Segmente unterteilt. Hier ist das Ergebnis:",
              "ai",
            );

            const numSlices = 10;
            const sliceWidth = currentRect!.w / numSlices;

            const gallery = document.createElement("div");
            gallery.style.display = "flex";
            gallery.style.gap = "5px";
            gallery.style.flexWrap = "wrap";
            gallery.style.marginTop = "10px";

            for (let i = 0; i < numSlices; i++) {
              const sliceCanvas = document.createElement("canvas");
              sliceCanvas.width = sliceWidth;
              sliceCanvas.height = currentRect!.h;
              sliceCanvas.style.border = "1px solid #38bdf8";
              sliceCanvas.style.background = "#0f172a";
              sliceCanvas.title = `Sprite ${i} (Klicken zum Speichern)`;

              const sCtx = sliceCanvas.getContext("2d")!;
              sCtx.drawImage(
                canvas,
                currentRect!.x + i * sliceWidth,
                currentRect!.y,
                sliceWidth,
                currentRect!.h,
                0,
                0,
                sliceWidth,
                currentRect!.h,
              );

              // Click to download
              sliceCanvas.style.cursor = "pointer";
              sliceCanvas.addEventListener("click", () => {
                const link = document.createElement("a");
                link.download = `doom_num_${i}.png`;
                link.href = sliceCanvas.toDataURL();
                link.click();
              });

              gallery.appendChild(sliceCanvas);
            }

            chatHistory.lastChild!.appendChild(gallery);
            addMessage(
              "Klicke auf ein beliebiges Segment, um es direkt als PNG auf deinen Rechner herunterzuladen!",
              "ai",
            );
          } else {
            addMessage(
              `Verstanden! Ich habe den Ausschnitt (${Math.round(currentRect!.w)}x${Math.round(currentRect!.h)}px) entgegengenommen. Was genau soll ich damit tun? (Tipp: Sag mir z.B. "Schneide es in 10 Teile").`,
              "ai",
            );
          }
        } else {
          addMessage(
            "Das werde ich machen! (Hinweis: Du hast aktuell keinen Bereich auf dem Bild markiert. Bitte ziehe zuerst ein Rechteck!).",
            "ai",
          );
        }
      }, 800);
    });

    chatInput.addEventListener("keypress", (e: KeyboardEvent) => {
      if (e.key === "Enter") btnSend.click();
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
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 250 && newWidth < window.innerWidth - 300) {
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
