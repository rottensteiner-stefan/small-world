import { FluidParticleSystem } from './FluidParticleSystem.js';
import { Renderer } from '../interfaces/index.js';
/**
 * Manager responsible for simulating fluid systems.
 * It handles the GPGPU logic for both WebGL 2 and WebGPU.
 */
export declare class FluidManager {
    private static _instance;
    private _systems;
    private _renderer;
    private _clearGridPipeline;
    private _buildGridPipeline;
    private _predictPipeline;
    private _lambdaPipeline;
    private _solvePipeline;
    private _updatePipeline;
    private _configBuffers;
    private _bindGroups;
    private constructor();
    /**
     * Gets the singleton instance of the FluidManager.
     */
    static get instance(): FluidManager;
    /**
     * Initializes the manager with a renderer.
     */
    init(renderer: Renderer): void;
    /**
     * Registers a fluid system to be managed.
     */
    registerSystem(system: FluidParticleSystem): void;
    /**
     * Unregisters a fluid system.
     */
    unregisterSystem(system: FluidParticleSystem): void;
    /**
     * Updates all registered fluid systems.
     */
    update(deltaTime: number): void;
    private _initSystemResources;
    private _initWebGPUSystem;
    private _initWebGL2System;
    private _simulate;
    private _simulateWebGPU;
    private _simulateWebGL2;
}
