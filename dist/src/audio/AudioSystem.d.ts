import { Vector3D } from '../math/index.js';
import { CameraInterfaceData } from '../interfaces/index.js';
/**
 * A basic Audio System that wraps the Web Audio API.
 * Supports loading sounds and playing them globally or spatially.
 */
export declare class AudioSystem {
    private static _instance;
    context: AudioContext;
    private _buffers;
    masterGain: GainNode;
    sfxGain: GainNode;
    musicGain: GainNode;
    private _reverbNode;
    private _reverbGain;
    private constructor();
    private _buildMixer;
    /** Set the global master volume (0.0 to 1.0) */
    setMasterVolume(value: number): void;
    /** Set the SFX volume (0.0 to 1.0) */
    setSFXVolume(value: number): void;
    /** Set the Music volume (0.0 to 1.0) */
    setMusicVolume(value: number): void;
    /** Set the Reverb level (0.0 to 1.0) */
    setReverbLevel(value: number): void;
    /** Gets the singleton instance of the AudioSystem. */
    static get instance(): AudioSystem;
    /** Must be called after a user interaction to resume the audio context on some browsers. */
    resume(): void;
    /**
     * Loads an audio file and decodes it into a buffer.
     * @param url The URL of the audio file.
     * @param name The unique name to identify the sound.
     */
    load(url: string, name: string): Promise<void>;
    /**
     * Plays a global (non-spatial) sound.
     */
    play(name: string, loop?: boolean, volume?: number): AudioBufferSourceNode | null;
    /**
     * Plays a 3D spatial sound at a given position.
     */
    playSpatial(name: string, position: Vector3D, loop?: boolean, volume?: number, refDistance?: number, maxDistance?: number): {
        source: AudioBufferSourceNode;
        panner: PannerNode;
    } | null;
    /**
     * Updates the global listener position and orientation based on the camera.
     */
    updateListener(camera: CameraInterfaceData): void;
    /**
     * Starts a creepy, pulsing low-frequency background drone using the Web Audio API.
     */
    startDrone(): void;
    /**
     * Starts a procedural fire crackling noise at a specific 3D location.
     */
    startFire(position: Vector3D, volume?: number): void;
    /**
     * Generates a retro synthesized footstep thud.
     */
    playFootstep(): void;
    /**
     * Generates a retro "Pew Pew" laser/gunshot sound.
     */
    playShoot(): void;
    /**
     * Generates a retro "Ugh!" hurt sound.
     */
    playHurt(): void;
}
