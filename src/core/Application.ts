/// src/core/Application.ts
import { AbstractProjection } from "../math/projections/AbstractProjection.js";
import { Camera } from "./Camera.js";
import { ICamera } from "../interfaces/ICamera.js";
import { IEngineConfig } from "../interfaces/IEngineConfig.js";
import { IRenderer } from "../interfaces/IRenderer.js";
import { ObliqueProjection } from "../math/projections/ObliqueProjection.js";
import { OrthographicProjection } from "../math/projections/OrthographicProjection.js";
import { PerspectiveProjection } from "../math/projections/PerspectiveProjection.js";
import { ProjectionType } from "../enums/ProjectionType.js";
import { RendererFactory } from "../renderers/RendererFactory.js";
import { RendererType } from "../enums/RendererType.js";
import { Scene } from "./Scene.js";

export abstract class Application {
  public config: IEngineConfig;
  public scene: Scene;
  public camera: ICamera;
  protected renderer!: IRenderer;
  protected canvas!: HTMLCanvasElement;

  private lastTime: number = 0;
  private isRunning: boolean = false;

  constructor(userConfig: IEngineConfig = {}) {
    this.config = {
      canvasId: "canvas",
      renderer: RendererType.WEB_GPU,
      projection: ProjectionType.PERSPECTIVE, // Standard-Projektion
      fullscreen: true,
      ...userConfig,
    };

    this.scene = new Scene();

    // 1. Projektion anhand der Config ermitteln
    const aspect = window.innerWidth / window.innerHeight;
    let projection: AbstractProjection;

    if (this.config.projection === ProjectionType.ORTHOGRAPHIC) {
      projection = new OrthographicProjection(-10 * aspect, 10 * aspect, -10, 10, 0.1, 1000);
    } else if (this.config.projection === ProjectionType.OBLIQUE) {
      projection = new ObliqueProjection(-10 * aspect, 10 * aspect, -10, 10, 0.1, 1000);
    } else {
      projection = new PerspectiveProjection(75, aspect, 0.1, 1000);
    }

    this.camera = new Camera(projection);
  }

  protected abstract setupScene(): Promise<void>;
  protected abstract update(deltaTime: number): void;

  public async start(): Promise<void> {
    // Config mergen
    try {
      const response = await fetch("./config/small-world.json");
      if (response.ok) {
        const jsonConfig = await response.json();
        this.config = { ...this.config, ...jsonConfig };
      }
    } catch {
      console.warn("Nutze Fallback-Config (Keine JSON gefunden).");
    }

    // Canvas Setup
    this.canvas = document.getElementById(this.config.canvasId!) as HTMLCanvasElement;
    if (this.config.fullscreen) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      window.addEventListener("resize", () => {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.camera.aspect = this.canvas.width / this.canvas.height;
        this.camera.updateProjectionMatrix();
        if (this.renderer) this.renderer.setSize(this.canvas.width, this.canvas.height);
      });
    } else if (this.config.width && this.config.height) {
      this.canvas.width = this.config.width;
      this.canvas.height = this.config.height;
    }

    // 2. Renderer über die Factory erzeugen (Kein if/else mehr!)
    this.renderer = await RendererFactory.create(this.config.renderer!, this.canvas);

    await this.setupScene();

    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.loop(time));
  }

  private loop(currentTime: number): void {
    if (!this.isRunning) return;

    const deltaTime = (currentTime - this.lastTime) / 1000.0;
    this.lastTime = currentTime;

    this.update(deltaTime);

    this.camera.updateViewMatrix();
    this.renderer.render(this.scene, this.camera.viewProjectionMatrix, this.camera.position);

    requestAnimationFrame((time) => this.loop(time));
  }
}
