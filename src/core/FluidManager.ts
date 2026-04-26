/// src/core/FluidManager.ts

import { FluidParticleSystem } from "./FluidParticleSystem.js";
import { Renderer } from "../interfaces/index.js";
import { RendererType } from "../enums/index.js";
import { FluidWGSL } from "../renderers/shaders/FluidWGSL.js";

/**
 * Manager responsible for simulating fluid systems.
 * It handles the GPGPU logic for both WebGL 2 and WebGPU.
 */
export class FluidManager {
  private static _instance: FluidManager;
  private _systems: FluidParticleSystem[] = [];
  private _renderer: Renderer | undefined;

  // WebGPU specific
  private _clearGridPipeline: GPUComputePipeline | undefined;
  private _buildGridPipeline: GPUComputePipeline | undefined;
  private _predictPipeline: GPUComputePipeline | undefined;
  private _lambdaPipeline: GPUComputePipeline | undefined;
  private _solvePipeline: GPUComputePipeline | undefined;
  private _updatePipeline: GPUComputePipeline | undefined;
  
  private _configBuffers: Map<FluidParticleSystem, GPUBuffer> = new Map();
  private _bindGroups: Map<FluidParticleSystem, GPUBindGroup> = new Map();

  private constructor() {}

  /**
   * Gets the singleton instance of the FluidManager.
   */
  public static get instance(): FluidManager {
    if (!FluidManager._instance) {
      FluidManager._instance = new FluidManager();
    }
    return FluidManager._instance;
  }

  /**
   * Initializes the manager with a renderer.
   */
  public init(renderer: Renderer): void {
    this._renderer = renderer;
  }

  /**
   * Registers a fluid system to be managed.
   */
  public registerSystem(system: FluidParticleSystem): void {
    if (!this._systems.includes(system)) {
      this._systems.push(system);
      this._initSystemResources(system);
    }
  }

  /**
   * Unregisters a fluid system.
   */
  public unregisterSystem(system: FluidParticleSystem): void {
    const index = this._systems.indexOf(system);
    if (index !== -1) {
      this._systems.splice(index, 1);
    }
  }

  /**
   * Updates all registered fluid systems.
   */
  public update(deltaTime: number): void {
    if (!this._renderer) return;

    for (const system of this._systems) {
      this._simulate(system, deltaTime);
    }
  }

  private _initSystemResources(system: FluidParticleSystem): void {
    if (!this._renderer) return;

    if (this._renderer.type === RendererType.WEB_GPU) {
      this._initWebGPUSystem(system);
    } else if (this._renderer.type === RendererType.WEB_GL2) {
      this._initWebGL2System(system);
    }
  }

  private _initWebGPUSystem(system: FluidParticleSystem): void {
    if (!this._renderer || !this._renderer.gpuDevice) return;
    const device = this._renderer.gpuDevice as GPUDevice;
    
    const count = system.config.particleCount;
    const bufferSize = count * 16;
    const floatSize = count * 4;

    system.positionBuffer = device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    system.predictedPositionBuffer = device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    system.velocityBuffer = device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    system.lambdaBuffer = device.createBuffer({ size: floatSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    system.deltaPositionBuffer = device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });

    const gridCellCount = 32 * 32 * 32;
    system.gridIndexBuffer = device.createBuffer({ size: gridCellCount * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    system.sortedIndexBuffer = device.createBuffer({ size: count * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });

    const configBuffer = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this._configBuffers.set(system, configBuffer);

    if (!this._predictPipeline) {
      const shaderModule = device.createShaderModule({ code: FluidWGSL });
      const layout = device.createPipelineLayout({
        bindGroupLayouts: [device.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 7, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
          ]
        })]
      });

      this._clearGridPipeline = device.createComputePipeline({ layout, compute: { module: shaderModule, entryPoint: "clearGrid" } });
      this._buildGridPipeline = device.createComputePipeline({ layout, compute: { module: shaderModule, entryPoint: "buildGrid" } });
      this._predictPipeline = device.createComputePipeline({ layout, compute: { module: shaderModule, entryPoint: "predict" } });
      this._lambdaPipeline = device.createComputePipeline({ layout, compute: { module: shaderModule, entryPoint: "computeLambdas" } });
      this._solvePipeline = device.createComputePipeline({ layout, compute: { module: shaderModule, entryPoint: "solveConstraints" } });
      this._updatePipeline = device.createComputePipeline({ layout, compute: { module: shaderModule, entryPoint: "update" } });
    }

    const bindGroup = device.createBindGroup({
      layout: this._predictPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: configBuffer } },
        { binding: 1, resource: { buffer: system.positionBuffer } },
        { binding: 2, resource: { buffer: system.predictedPositionBuffer } },
        { binding: 3, resource: { buffer: system.velocityBuffer } },
        { binding: 4, resource: { buffer: system.lambdaBuffer } },
        { binding: 5, resource: { buffer: system.deltaPositionBuffer } },
        { binding: 6, resource: { buffer: system.gridIndexBuffer } },
        { binding: 7, resource: { buffer: system.sortedIndexBuffer } },
      ],
    });
    this._bindGroups.set(system, bindGroup);

    const posData = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      posData[i * 4 + 0] = (Math.random() - 0.5) * 5;
      posData[i * 4 + 1] = Math.random() * 10 + 5;
      posData[i * 4 + 2] = (Math.random() - 0.5) * 5;
      posData[i * 4 + 3] = 1.0;
    }
    device.queue.writeBuffer(system.positionBuffer, 0, posData);
  }

  private _initWebGL2System(_system: FluidParticleSystem): void {
    // Placeholder
  }

  private _simulate(system: FluidParticleSystem, deltaTime: number): void {
    if (this._renderer?.type === RendererType.WEB_GPU) {
      this._simulateWebGPU(system, deltaTime);
    } else if (this._renderer?.type === RendererType.WEB_GL2) {
      this._simulateWebGL2(system, deltaTime);
    }
  }

  private _simulateWebGPU(system: FluidParticleSystem, deltaTime: number): void {
    if (!this._renderer || !this._renderer.gpuDevice || !this._predictPipeline) return;
    const device = this._renderer.gpuDevice as GPUDevice;
    
    const configBuffer = this._configBuffers.get(system);
    const bindGroup = this._bindGroups.get(system);
    if (!configBuffer || !bindGroup) return;

    const configData = new ArrayBuffer(128);
    const view = new DataView(configData);
    view.setUint32(0, system.config.particleCount, true);
    view.setFloat32(4, system.config.radius, true);
    view.setFloat32(8, system.config.viscosity, true);
    view.setFloat32(12, system.config.surfaceTension, true);
    view.setFloat32(16, system.config.restDensity, true);
    view.setFloat32(20, deltaTime, true);
    view.setFloat32(32, system.config.gravity.x, true);
    view.setFloat32(36, system.config.gravity.y, true);
    view.setFloat32(40, system.config.gravity.z, true);
    view.setUint32(44, 32, true); 
    view.setUint32(48, 32, true); 
    view.setUint32(52, 32, true); 
    view.setFloat32(56, system.config.radius * 2.0, true); 
    view.setFloat32(64, system.config.boundaryMin.x, true);
    view.setFloat32(68, system.config.boundaryMin.y, true);
    view.setFloat32(72, system.config.boundaryMin.z, true);
    view.setFloat32(80, system.config.boundaryMax.x, true);
    view.setFloat32(84, system.config.boundaryMax.y, true);
    view.setFloat32(88, system.config.boundaryMax.z, true);
    device.queue.writeBuffer(configBuffer, 0, configData);

    const ce = device.createCommandEncoder();
    const particleWorkgroups = Math.ceil(system.config.particleCount / 64);
    const gridWorkgroups = Math.ceil((32 * 32 * 32) / 64);

    const cp = ce.beginComputePass();
    cp.setPipeline(this._clearGridPipeline!); cp.setBindGroup(0, bindGroup); cp.dispatchWorkgroups(gridWorkgroups);
    cp.setPipeline(this._predictPipeline!); cp.dispatchWorkgroups(particleWorkgroups);
    cp.setPipeline(this._buildGridPipeline!); cp.dispatchWorkgroups(particleWorkgroups);
    cp.setPipeline(this._lambdaPipeline!); cp.dispatchWorkgroups(particleWorkgroups);
    cp.setPipeline(this._solvePipeline!); cp.dispatchWorkgroups(particleWorkgroups);
    cp.setPipeline(this._updatePipeline!); cp.dispatchWorkgroups(particleWorkgroups);
    cp.end();
    
    device.queue.submit([ce.finish()]);
  }

  private _simulateWebGL2(_system: FluidParticleSystem, _deltaTime: number): void {
    // Placeholder
  }
}
