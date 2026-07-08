/// src/apps/yad/YadHud.ts

export class YadHud {
  private _container: HTMLDivElement;
  private _healthEl!: HTMLCanvasElement;
  private _armorEl!: HTMLCanvasElement;
  private _ammoEl!: HTMLCanvasElement;
  private _faceCanvas!: HTMLCanvasElement;
  private _faceImages: HTMLCanvasElement[] = [];

  private _keycardSlots: HTMLDivElement[] = [];
  private _keycards: string[] = [];

  private _ammoInfoCanvas?: HTMLCanvasElement;

  private _health: number = 100;
  private _armor: number = 0;
  private _ammo: number = 50;

  constructor() {
    // Load VT323 Font from Google Fonts
    if (!document.getElementById("vt323-font")) {
      const link = document.createElement("link");
      link.id = "vt323-font";
      link.href = "https://fonts.googleapis.com/css2?family=VT323&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    // Load local DOOM font
    if (!document.getElementById("doom-font-style")) {
      const style = document.createElement("style");
      style.id = "doom-font-style";
      style.innerHTML = `
        @font-face {
          font-family: 'DooM';
          src: url('./assets/fonts/DooM.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
      `;
      document.head.appendChild(style);
    }

    this._container = document.createElement("div");
    this._container.id = "yad-hud";
    Object.assign(this._container.style, {
      position: "absolute",
      bottom: "0",
      left: "0",
      width: "100%",
      height: "32px", // 32px is exactly 16% of the 200px screen, authentic DOOM scale
      display: "flex",
      flexDirection: "row",
      backgroundImage: "url('./assets/doom_pack/textures/graywide.png')",
      backgroundRepeat: "repeat",
      backgroundSize: "64px 64px", // Scale down the background texture appropriately
      fontFamily: "'VT323', monospace", // Webfont for all standard text
      color: "white",
      userSelect: "none",
      zIndex: "100",
    });

    this._createSegments();

    const retroScreen = document.getElementById("retro-screen");
    if (retroScreen) {
      retroScreen.appendChild(this._container);
    } else {
      document.body.appendChild(this._container);
    }

    this._loadAndSliceFace();

    // Wait for DOOM font to load before first render
    document.fonts.ready.then((): void => {
      this._updateDisplay();
    });

    this._bindEvents();
  }

  private _bindEvents(): void {
    window.addEventListener("yad-damage", (e: Event) => {
      const customEvent = e as CustomEvent;
      const amount = customEvent.detail?.amount || 0;
      if (this._armor > 0) {
        this._armor -= amount;
        if (this._armor < 0) {
          this._health += this._armor;
          this._armor = 0;
        }
      } else {
        this._health -= amount;
      }
      if (this._health < 0) this._health = 0;
      this._updateDisplay();
    });

    window.addEventListener("yad-pickup", (e: Event) => {
      const customEvent = e as CustomEvent;
      const type = customEvent.detail?.type;
      const amount = customEvent.detail?.amount || 0;
      if (type === "armor") {
        this._armor = Math.min(200, this._armor + amount);
      } else if (type === "health") {
        this._health = Math.min(200, this._health + amount);
      } else if (type === "ammo") {
        this._ammo = Math.min(200, this._ammo + amount);
      } else if (type === "keycard" && customEvent.detail?.color) {
        if (!this._keycards.includes(customEvent.detail.color)) {
          this._keycards.push(customEvent.detail.color);
        }
      }
      this._updateDisplay();
    });

    window.addEventListener("yad-shoot", (): void => {
      if (this._ammo > 0) {
        this._ammo -= 1;
        this._updateDisplay();
      }
    });

    window.addEventListener("yad-weapon", (e: Event) => {
      const customEvent = e as CustomEvent;
      const index = customEvent.detail?.index || 1;
      this._updateWeaponDisplay(index);
    });
  }

  private _updateWeaponDisplay(activeIndex: number): void {
    if (!this._weaponContainer) return;
    const buttons = this._weaponContainer.children;
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i] as HTMLDivElement;
      if (i + 1 === activeIndex) {
        btn.style.color = "#cc0"; // Active: Doom yellow
      } else {
        btn.style.color = "#555"; // Inactive: Dimmed grey
      }
    }
  }

  private _updateDisplay(): void {
    if (this._healthEl) {
      this._updateMainStatCanvas(this._healthEl, `${this._health}%`, "HEALTH");
    }
    if (this._armorEl) {
      this._updateMainStatCanvas(this._armorEl, `${this._armor}%`, "ARMOR");
    }
    if (this._ammoEl) {
      this._updateMainStatCanvas(this._ammoEl, this._ammo.toString(), "AMMO");
    }

    // Update face
    if (this._faceCanvas && this._faceImages.length > 0) {
      const ctx = this._faceCanvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, this._faceCanvas.width, this._faceCanvas.height);

        let faceIndex = 0;
        if (this._health <= 0) faceIndex = 5;
        else if (this._health < 20) faceIndex = 4;
        else if (this._health < 40) faceIndex = 3;
        else if (this._health < 60) faceIndex = 2;
        else if (this._health < 80) faceIndex = 1;

        const face = this._faceImages[faceIndex];
        if (face) {
          // Draw the face centered in the face canvas
          const dx = (this._faceCanvas.width - face.width) / 2;
          const dy = (this._faceCanvas.height - face.height) / 2;
          ctx.drawImage(face, dx, dy);
        }
      }
    }

    // Update keycards
    // Grid:
    // [0: Blue Card]   [1: Blue Skull]
    // [2: Yellow Card] [3: Yellow Skull]
    // [4: Red Card]    [5: Red Skull]
    const keyColors = ["blue", "yellow", "red"];
    for (let i = 0; i < 3; i++) {
      const slotIndex = i * 2; // Left column
      if (this._keycardSlots[slotIndex]) {
        if (this._keycards.includes(keyColors[i]!)) {
          const hex =
            keyColors[i] === "blue" ? "#0000ff" : keyColors[i] === "red" ? "#ff0000" : "#ffff00";
          this._keycardSlots[slotIndex]!.style.backgroundColor = hex;
        } else {
          this._keycardSlots[slotIndex]!.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
        }
      }
    }

    // Update ammo list
    this._drawAmmoInfo();
  }

  private _createSegments(): void {
    // Original DOOM HUD pixel widths (sum = 320)
    // Ammo: 45, Health: 48, Weapons: 45, Face: 32, Armor: 48, Keys: 14, Ammo Info: 88

    // Segment 1 (Ammo)
    const seg1 = this._createSegment(45);
    this._ammoEl = this._addMainStat(seg1, this._ammo.toString(), "AMMO");

    // Segment 2 (Health)
    const seg2 = this._createSegment(48);
    this._healthEl = this._addMainStat(seg2, `${this._health}%`, "HEALTH");

    // Segment 3 (Weapons)
    const seg3 = this._createSegment(45);
    this._createWeaponButtons(seg3);

    // Segment 4 (Face)
    const seg4 = this._createSegment(32);
    this._faceCanvas = document.createElement("canvas");
    // Face canvas needs to fit inside the 32px high HUD, so maybe 24x30 pixels
    this._faceCanvas.width = 24;
    this._faceCanvas.height = 30;
    Object.assign(this._faceCanvas.style, {
      width: "auto",
      height: "90%",
      imageRendering: "pixelated",
    });
    seg4.appendChild(this._faceCanvas);

    // Segment 5 (Armor)
    const seg5 = this._createSegment(48);
    this._armorEl = this._addMainStat(seg5, `${this._armor}%`, "ARMOR");

    // Segment 6 (Keys)
    const seg6 = this._createSegment(14);
    this._createKeycardButtons(seg6);

    // Segment 7 (Ammo Info)
    const seg7 = this._createSegment(88);
    this._createAmmoInfo(seg7);
  }

  private _createSegment(flexValue: number): HTMLDivElement {
    const el = document.createElement("div");
    Object.assign(el.style, {
      flex: flexValue.toString(),
      boxSizing: "border-box",
      borderTop: "1px solid rgba(255, 255, 255, 0.3)",
      borderLeft: "1px solid rgba(255, 255, 255, 0.3)",
      borderBottom: "1px solid rgba(0, 0, 0, 0.6)",
      borderRight: "1px solid rgba(0, 0, 0, 0.6)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    });
    this._container.appendChild(el);
    return el;
  }

  // --- ANTI-ALIASING DESTROYER ---
  // Removes all semi-transparent pixels to create a hard 1-bit pixel look
  private _removeAntiAliasing(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 100) {
        data[i + 3] = 255; // Force solid
      } else {
        data[i + 3] = 0; // Force transparent
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  private _addMainStat(
    container: HTMLDivElement,
    topVal: string,
    bottomLabel: string,
  ): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 28;
    Object.assign(canvas.style, {
      width: "100%",
      height: "100%",
      imageRendering: "pixelated",
    });

    container.appendChild(canvas);
    this._updateMainStatCanvas(canvas, topVal, bottomLabel);
    return canvas;
  }

  private _updateMainStatCanvas(
    canvas: HTMLCanvasElement,
    valStr: string,
    bottomLabel: string,
  ): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const x = canvas.width / 2;

    // --- Kleines Label (wird pixelgenau hart gemacht) ---
    ctx.font = "8px 'VT323', monospace";
    ctx.textBaseline = "top";
    const ySmall = 20;

    ctx.fillStyle = "#000000";
    ctx.fillText(bottomLabel, x + 1, ySmall + 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(bottomLabel, x, ySmall);

    // Anti-Aliasing nur für die kleinen Texte zerstören
    this._removeAntiAliasing(ctx, canvas.width, canvas.height);

    // --- Große rote Zahlen (behalten ihr weiches Anti-Aliasing für den Custom-Font) ---
    ctx.font = "bold 13px 'DooM', 'Impact', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const yBig = 12;

    ctx.fillStyle = "#000000";
    ctx.fillText(valStr, x + 1, yBig + 1);
    ctx.fillStyle = "#cc0000";
    ctx.fillText(valStr, x, yBig);
  }

  private _armsCanvas?: HTMLCanvasElement;

  private _createWeaponButtons(container: HTMLDivElement): void {
    this._armsCanvas = document.createElement("canvas");
    this._armsCanvas.width = 45;
    this._armsCanvas.height = 28;
    Object.assign(this._armsCanvas.style, {
      width: "100%",
      height: "100%",
      imageRendering: "pixelated",
    });
    container.appendChild(this._armsCanvas);

    this._updateWeaponDisplay(1);
  }

  private _updateWeaponDisplay(activeIndex: number): void {
    if (!this._armsCanvas) return;
    const ctx = this._armsCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, this._armsCanvas.width, this._armsCanvas.height);

    const colW = 12;
    const rowH = 7;
    const startX = (this._armsCanvas.width - (colW * 2 + 2)) / 2;
    const startY = 1;

    ctx.font = "8px 'VT323', monospace";
    ctx.textBaseline = "top";
    ctx.textAlign = "center";

    const weapons = [1, 2, 3, 4, 5, 6];
    for (let i = 0; i < 6; i++) {
      const wpn = weapons[i]!;
      const col = i >= 3 ? 1 : 0;
      const row = i % 3;

      const boxX = startX + col * (colW + 2);
      const boxY = startY + row * (rowH + 1);

      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(boxX, boxY, colW, rowH);

      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fillRect(boxX, boxY, colW, 1);
      ctx.fillRect(boxX, boxY, 1, rowH);

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(boxX, boxY + rowH - 1, colW, 1);
      ctx.fillRect(boxX + colW - 1, boxY, 1, rowH);

      ctx.fillStyle = activeIndex === wpn ? "#ffff00" : "#555555";
      ctx.fillText(wpn.toString(), boxX + colW / 2 + 1, boxY + 1);
    }

    // Explicit placement to avoid overlap
    const ySmall = 20;
    ctx.fillStyle = "#000000";
    ctx.fillText("ARMS", this._armsCanvas.width / 2 + 1, ySmall + 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("ARMS", this._armsCanvas.width / 2, ySmall);

    this._removeAntiAliasing(ctx, this._armsCanvas.width, this._armsCanvas.height);
  }

  private _createKeycardButtons(container: HTMLDivElement): void {
    container.style.padding = "2px";
    container.style.display = "grid";
    container.style.gridTemplateColumns = "1fr 1fr";
    container.style.gridTemplateRows = "1fr 1fr 1fr";
    container.style.gap = "2px";

    // Create 6 slots (3 regular cards left, 3 skull keys right)
    for (let i = 0; i < 6; i++) {
      const btn = document.createElement("div");
      Object.assign(btn.style, {
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.2)", // Outset erfordert etwas helleren Hintergrund
        borderTop: "1px solid rgba(255, 255, 255, 0.3)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.3)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.6)",
        borderRight: "1px solid rgba(0, 0, 0, 0.6)",
      });
      container.appendChild(btn);
      this._keycardSlots.push(btn);
    }
  }

  private _createAmmoInfo(container: HTMLDivElement): void {
    this._ammoInfoCanvas = document.createElement("canvas");
    this._ammoInfoCanvas.width = 88;
    this._ammoInfoCanvas.height = 30;
    Object.assign(this._ammoInfoCanvas.style, {
      width: "100%",
      height: "100%",
      imageRendering: "pixelated",
    });
    container.appendChild(this._ammoInfoCanvas);
    this._drawAmmoInfo();
  }

  private _drawAmmoInfo(): void {
    if (!this._ammoInfoCanvas) return;
    const ctx = this._ammoInfoCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, this._ammoInfoCanvas.width, this._ammoInfoCanvas.height);

    ctx.font = "8px 'VT323', monospace";
    ctx.textBaseline = "top";

    const ammos = [
      { name: "BULL", current: this._ammo, max: 200 },
      { name: "SHEL", current: 0, max: 50 },
      { name: "RCKT", current: 0, max: 50 },
      { name: "CELL", current: 0, max: 300 },
    ];

    let y = 1;
    for (const ammo of ammos) {
      ctx.fillStyle = "#000";
      ctx.fillText(ammo.name, 4, y + 1);
      ctx.fillStyle = "#fff";
      ctx.fillText(ammo.name, 3, y);

      const curStr = ammo.current.toString().padStart(3, " ");
      const maxStr = ammo.max.toString().padStart(3, " ");
      const valStr = `${curStr} / ${maxStr}`;

      const fixedWidth = ctx.measureText("999 / 999").width;
      const x = this._ammoInfoCanvas.width - fixedWidth - 4;

      ctx.fillStyle = "#000";
      ctx.fillText(valStr, x + 1, y + 1);
      ctx.fillStyle = "#fff";
      ctx.fillText(valStr, x, y);

      y += 7;
    }

    this._removeAntiAliasing(ctx, this._ammoInfoCanvas.width, this._ammoInfoCanvas.height);
  }

  private _loadAndSliceFace(): void {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "./assets/doom_pack/sprites/doomguy.png";
    img.onload = (): void => {
      // 1. Draw to offscreen canvas to manipulate pixels
      const offCanvas = document.createElement("canvas");
      offCanvas.width = img.width;
      offCanvas.height = img.height;
      const ctx = offCanvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      const data = imgData.data;

      // 2. Remove white background (r>240, g>240, b>240)
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
          data[i + 3] = 0; // Make transparent
        }
      }
      ctx.putImageData(imgData, 0, 0);

      // 3. Slice into 6 faces sequentially to ignore irregular vertical padding
      const scanWidth = Math.floor(offCanvas.width / 8); // Scan only first column (approx 160px)
      let currentY = 0;

      for (let r = 0; r < 6; r++) {
        let minY = offCanvas.height;
        let foundTop = false;

        // 1. Scan downwards to find the very top of the face
        for (let y = currentY; y < offCanvas.height; y++) {
          for (let x = 0; x < scanWidth; x++) {
            const alpha = data[(y * offCanvas.width + x) * 4 + 3];
            if (alpha > 0) {
              minY = y;
              foundTop = true;
              break;
            }
          }
          if (foundTop) break;
        }

        if (foundTop) {
          // 2. Now that we know where the face starts (minY), scan the entire height of the face (180px)
          // to find the absolute leftmost (minX) and rightmost (maxX) pixels.
          let minX = scanWidth;
          let maxX = 0;
          const faceScanH = Math.min(180, offCanvas.height - minY);

          for (let y = minY; y < minY + faceScanH; y++) {
            for (let x = 0; x < scanWidth; x++) {
              const alpha = data[(y * offCanvas.width + x) * 4 + 3];
              if (alpha > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
              }
            }
          }

          let faceW = maxX - minX + 1;
          const faceH = 180;

          // Der Suchbereich (scanWidth) überschneidet sich bei diesem Spritesheet leicht mit
          // dem nächsten Gesicht rechts. Da wir wissen, dass ein Gesicht ca. 138 Pixel breit ist,
          // schneiden wir alles was darüber hinausgeht (die Pixel vom Nachbarn) gnadenlos ab!
          if (faceW > 138) {
            faceW = 138;
          }

          const faceCanvas = document.createElement("canvas");
          faceCanvas.width = faceW;
          faceCanvas.height = faceH;
          const faceCtx = faceCanvas.getContext("2d");
          if (faceCtx) {
            faceCtx.drawImage(offCanvas, minX, minY, faceW, faceH, 0, 0, faceW, faceH);

            // Downscale to 24x30
            const scaledCanvas = document.createElement("canvas");
            scaledCanvas.width = 24;
            scaledCanvas.height = 30;
            const scaledCtx = scaledCanvas.getContext("2d");
            if (scaledCtx) {
              scaledCtx.imageSmoothingEnabled = false;
              scaledCtx.drawImage(faceCanvas, 0, 0, faceW, faceH, 0, 0, 24, 30);
              this._faceImages.push(scaledCanvas);
            }
          }

          currentY = minY + faceH;
        } else {
          console.warn("[YadHud] Could not find face pixels in row " + r);
        }
      }

      console.log(`[YadHud] Extracted ${this._faceImages.length} faces from doomguy.png`);
      this._updateDisplay();
    };
    img.onerror = (): void => {
      console.warn("[YadHud] Could not load doomguy.png from assets/doom_pack/sprites/");
    };
  }
}
