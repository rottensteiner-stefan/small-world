/// src/audio/AudioSystem.ts
import { Vector3D } from "../math/index.js";
import { CameraInterfaceData } from "../interfaces/index.js";

/**
 * A basic Audio System that wraps the Web Audio API.
 * Supports loading sounds and playing them globally or spatially.
 */
export class AudioSystem {
  private static _instance: AudioSystem;
  public context: AudioContext;
  private _buffers: Map<string, AudioBuffer> = new Map();

  // Audio Mixer Nodes
  public masterGain!: GainNode;
  public sfxGain!: GainNode;
  public musicGain!: GainNode;
  private _reverbNode!: ConvolverNode;
  private _reverbGain!: GainNode;

  private constructor() {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.context = new AudioContextClass();
    this._buildMixer();
  }

  private _buildMixer(): void {
    this.masterGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.musicGain = this.context.createGain();

    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);

    // Procedural Reverb (Dungeon Hall)
    this._reverbNode = this.context.createConvolver();
    this._reverbGain = this.context.createGain();
    this._reverbGain.gain.value = 0.3; // Default reverb level

    const rate = this.context.sampleRate;
    const length = rate * 2.0; // 2 seconds decay
    const impulse = this.context.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (rate * 0.5));
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    this._reverbNode.buffer = impulse;

    // Route SFX through reverb as a send effect
    this.sfxGain.connect(this._reverbNode);
    this._reverbNode.connect(this._reverbGain);
    this._reverbGain.connect(this.masterGain);
  }

  /** Set the global master volume (0.0 to 1.0) */
  public setMasterVolume(value: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, value));
  }
  /** Set the SFX volume (0.0 to 1.0) */
  public setSFXVolume(value: number): void {
    this.sfxGain.gain.value = Math.max(0, Math.min(1, value));
  }
  /** Set the Music volume (0.0 to 1.0) */
  public setMusicVolume(value: number): void {
    this.musicGain.gain.value = Math.max(0, Math.min(1, value));
  }
  /** Set the Reverb level (0.0 to 1.0) */
  public setReverbLevel(value: number): void {
    this._reverbGain.gain.value = Math.max(0, Math.min(1, value));
  }

  /** Gets the singleton instance of the AudioSystem. */
  public static get instance(): AudioSystem {
    if (!AudioSystem._instance) {
      AudioSystem._instance = new AudioSystem();
    }
    return AudioSystem._instance;
  }

  /** Must be called after a user interaction to resume the audio context on some browsers. */
  public resume(): void {
    if (this.context.state === "suspended") {
      this.context.resume().catch(console.error);
    }
  }

  /**
   * Loads an audio file and decodes it into a buffer.
   * @param url The URL of the audio file.
   * @param name The unique name to identify the sound.
   */
  public async load(url: string, name: string): Promise<void> {
    if (this._buffers.has(name)) return;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this._buffers.set(name, audioBuffer);
    } catch (e) {
      console.error(`Failed to load audio: ${url}`, e);
    }
  }

  /**
   * Plays a global (non-spatial) sound.
   */
  public play(
    name: string,
    loop: boolean = false,
    volume: number = 1.0,
  ): AudioBufferSourceNode | null {
    const buffer = this._buffers.get(name);
    if (!buffer) return null;

    this.resume();

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.sfxGain);

    source.start(0);
    return source;
  }

  /**
   * Plays a 3D spatial sound at a given position.
   */
  public playSpatial(
    name: string,
    position: Vector3D,
    loop: boolean = false,
    volume: number = 1.0,
    refDistance: number = 2.0,
    maxDistance: number = 20.0,
  ): { source: AudioBufferSourceNode; panner: PannerNode } | null {
    const buffer = this._buffers.get(name);
    if (!buffer) return null;

    this.resume();

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const panner = this.context.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = refDistance;
    panner.maxDistance = maxDistance;
    panner.rolloffFactor = 1;

    if (panner.positionX) {
      panner.positionX.value = position.x;
      panner.positionY.value = position.y;
      panner.positionZ.value = position.z;
    } else {
      // Fallback for older browsers
      panner.setPosition(position.x, position.y, position.z);
    }

    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;

    source.connect(panner);
    panner.connect(gainNode);
    gainNode.connect(this.sfxGain);

    source.start(0);
    return { source, panner };
  }

  /**
   * Updates the global listener position and orientation based on the camera.
   */
  public updateListener(camera: CameraInterfaceData): void {
    const listener = this.context.listener;

    const posX = camera.position.x;
    const posY = camera.position.y;
    const posZ = camera.position.z;

    // Calculate forward vector (assuming right-handed system: -Z is forward, but rotation depends on theta/phi)
    // SmallWorld uses: theta for Y-axis rotation, phi for X-axis
    const sinTheta = Math.sin(camera.theta);
    const cosTheta = Math.cos(camera.theta);
    const sinPhi = Math.sin(camera.phi);
    const cosPhi = Math.cos(camera.phi);

    const forwardX = -sinTheta * cosPhi;
    const forwardY = sinPhi;
    const forwardZ = -cosTheta * cosPhi;

    const upX = 0;
    const upY = 1;
    const upZ = 0;

    if (listener.positionX) {
      listener.positionX.value = posX;
      listener.positionY.value = posY;
      listener.positionZ.value = posZ;
      listener.forwardX.value = forwardX;
      listener.forwardY.value = forwardY;
      listener.forwardZ.value = forwardZ;
      listener.upX.value = upX;
      listener.upY.value = upY;
      listener.upZ.value = upZ;
    } else {
      listener.setPosition(posX, posY, posZ);
      listener.setOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ);
    }
  }

  /**
   * Starts a creepy, pulsing low-frequency background drone using the Web Audio API.
   */
  public startDrone(): void {
    this.resume();

    // Base oscillator (smooth, deep sine wave)
    const osc = this.context.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 35; // Even lower bass tone

    // Add a second oscillator slightly detuned for dissonance
    const osc2 = this.context.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = 36.2; // Beating effect

    // Replaced the "beeping" 8000Hz shimmer with a low, airy rumble
    const shimmer = this.context.createOscillator();
    shimmer.type = "triangle";
    shimmer.frequency.value = 110; // Low ominous drone

    const shimmerGain = this.context.createGain();
    shimmerGain.gain.value = 0.05;

    // An LFO to make the drone pulse very slowly
    const shimmerLfo = this.context.createOscillator();
    shimmerLfo.type = "sine";
    shimmerLfo.frequency.value = 0.02; // 50 second cycle (extremely slow)
    const shimmerLfoGain = this.context.createGain();
    shimmerLfoGain.gain.value = 0.05;
    shimmerLfo.connect(shimmerLfoGain);
    shimmerLfoGain.connect(shimmerGain.gain);

    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 80; // Very muffled

    // LFO to create slow pulsing of the lowpass filter
    const lfo = this.context.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.08; // Slower filter pulse

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 60; // Depth of the pulse filter

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const mainGain = this.context.createGain();
    mainGain.gain.value = 0.9; // Boost volume slightly to compensate for deep frequencies

    // White Noise Generator for Cosmic Background Radiation
    const bufferSize = this.context.sampleRate * 2; // 2 seconds
    const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Box-Muller transform for Gaussian (Normal) distribution
      let u1 = Math.random();
      const u2 = Math.random();
      // Prevent log(0)
      if (u1 === 0) u1 = 1e-7;

      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

      // Scale and clip to [-1.0, 1.0] to prevent audio clipping
      // We use std_dev of 0.25 so most values are small, with occasional peaks
      const val = z0 * 0.25;
      output[i] = Math.max(-1.0, Math.min(1.0, val));
    }
    const noiseSrc = this.context.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    // Filter the white noise so it sounds like a deep rushing wind or distant radiation
    const noiseFilter = this.context.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 400; // Low-mid rumbling wind
    noiseFilter.Q.value = 0.5; // Very wide band

    const noiseGain = this.context.createGain();
    noiseGain.gain.value = 0.15; // Keep it subtle and atmospheric

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(mainGain);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(mainGain);

    shimmer.connect(shimmerGain);
    shimmerGain.connect(mainGain);

    // Route drone through heavy reverb!
    mainGain.connect(this._reverbNode);
    // Also dry signal
    mainGain.connect(this.musicGain);

    // User requested ONLY white noise
    // osc.start();
    // osc2.start();
    // lfo.start();
    // shimmer.start();
    // shimmerLfo.start();

    noiseSrc.start();
  }

  /**
   * Starts a procedural fire crackling noise at a specific 3D location.
   */
  public startFire(position: Vector3D, volume: number = 1.0): void {
    this.resume();

    const bufferSize = this.context.sampleRate * 2; // 2 seconds of noise
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.context.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    // Filter to make it sound like fire (lowpass for rumble, bandpass for crackle)
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;

    const panner = this.context.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 1.0;
    panner.maxDistance = 15.0;
    panner.rolloffFactor = 1.5;

    if (panner.positionX) {
      panner.positionX.value = position.x;
      panner.positionY.value = position.y;
      panner.positionZ.value = position.z;
    } else {
      panner.setPosition(position.x, position.y, position.z);
    }

    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;

    noiseSource.connect(filter);
    filter.connect(panner);
    panner.connect(gainNode);
    gainNode.connect(this.sfxGain);

    noiseSource.start(0);
  }

  /**
   * Generates a retro synthesized footstep thud.
   */
  public playFootstep(): void {
    this.resume();
    const osc = this.context.createOscillator();
    osc.type = "sine";

    // Quick pitch drop for a thud
    osc.frequency.setValueAtTime(150, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.3, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.context.currentTime + 0.1);
  }

  /**
   * Generates a retro "Pew Pew" laser/gunshot sound.
   */
  public playShoot(): void {
    this.resume();
    const osc = this.context.createOscillator();
    osc.type = "square";

    // Classic laser pitch drop
    osc.frequency.setValueAtTime(880, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.context.currentTime + 0.15);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.4, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.context.currentTime + 0.15);
  }

  /**
   * Generates a retro "Ugh!" hurt sound.
   */
  public playHurt(): void {
    this.resume();
    const osc = this.context.createOscillator();
    osc.type = "sawtooth";

    // Quick grunting pitch drop
    osc.frequency.setValueAtTime(250, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 0.3);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.6, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.context.currentTime + 0.3);
  }

  /**
   * Generates a procedural synth tone (e.g., for musical instruments or physical impacts).
   * @param frequency The base frequency in Hz.
   * @param duration The duration of the tone in seconds.
   * @param volume The starting volume.
   * @param type The oscillator type.
   */
  public playTone(
    frequency: number = 440,
    duration: number = 0.5,
    volume: number = 0.5,
    type: OscillatorType = "sine",
  ): void {
    this.resume();
    const osc = this.context.createOscillator();
    osc.type = type;

    osc.frequency.setValueAtTime(frequency, this.context.currentTime);

    const gain = this.context.createGain();
    // Quick attack, exponential decay for a percussive strike
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.context.currentTime + duration);
  }
}
