import { RendererType } from './index.js';
import { Renderer } from '../interfaces/index.js';
/**
 * Global world configuration.
 */
export interface WorldConfig {
    /** The type of renderer to use. */
    rendererType?: RendererType | string;
    /** The ID of the canvas element. */
    canvasId: string;
    /** Whether debug mode is enabled. */
    debug?: boolean;
    /** The size of the world. */
    worldSize?: number;
    /** The background sky color. */
    skyColor?: string;
    /** Whether to show the HUD. */
    showHUD?: boolean;
}
/**
 * Main entry point for the SmallWorld engine.
 */
export declare class SmallWorld {
    /** The current world configuration. */
    config: WorldConfig;
    /** The currently active renderer. */
    activeRenderer: Renderer;
    /**
     * Creates a new SmallWorld instance.
     */
    constructor();
    /**
     * Initializes the engine with the given configuration file.
     * @param configPath Path to the configuration JSON file.
     */
    init(configPath: string): Promise<void>;
}
