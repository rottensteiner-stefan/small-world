/// src/audio/AudioSystem.ts
import { Vector3D } from "../math/index.js";
import { CameraInterfaceData } from "../interfaces/index.js";

/**
 * A basic Audio System that wraps the Web Audio API.
 * Supports loading sounds and playing them globally or spatially.
 */
export class AudioSystem {
  public context: AudioContext;
  private _buffers: Map<string, AudioBuffer> = new Map();

  // Audio Mixer Nodes
  public masterGain!: GainNode;
  public sfxGain!: GainNode;
  public musicGain!: GainNode;
  private _reverbNode!: ConvolverNode;
  private _reverbGain!: GainNode;

  constructor() {
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

    // 1. GIGANTIC SUB-BASS (The Black Hole's mass)
    const subOsc = this.context.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.value = 42; // Deep rumble

    const subOsc2 = this.context.createOscillator();
    subOsc2.type = "triangle";
    subOsc2.frequency.value = 43.5; // Beating effect for slow pulsing

    // 2. GHOSTLY CHOIR / DRONE (Atonal minor 9th cluster)
    // We create a very slow, hollow pad sound using a few sine waves
    const pad1 = this.context.createOscillator();
    pad1.type = "sine";
    pad1.frequency.value = 110; // A2

    const pad2 = this.context.createOscillator();
    pad2.type = "sine";
    pad2.frequency.value = 164.81; // E3 (Perfect 5th)

    const pad3 = this.context.createOscillator();
    pad3.type = "sine";
    pad3.frequency.value = 233.08; // Bb3 (Minor 9th, creates dark dissonance)

    // 3. BROWN NOISE (Cosmic Wind)
    const bufferSize = this.context.sampleRate * 2;
    const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      let u1 = Math.random();
      const u2 = Math.random();
      if (u1 === 0) u1 = 1e-7;
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      output[i] = Math.max(-1.0, Math.min(1.0, z0 * 0.25));
    }
    const noiseSrc = this.context.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    // 4. BREATHING LOWPASS FILTER (LFO Modulation)
    // Instead of a static bandpass, we use a lowpass that opens and closes
    const windFilter = this.context.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 250; // Base cutoff
    windFilter.Q.value = 2.0; // Adds a slight resonant whistle

    const windLFO = this.context.createOscillator();
    windLFO.type = "sine";
    windLFO.frequency.value = 0.05; // 20-second cycle! "Breathing"

    const windLFOGain = this.context.createGain();
    windLFOGain.gain.value = 200; // Modulates cutoff by +/- 200Hz

    windLFO.connect(windLFOGain);
    windLFOGain.connect(windFilter.frequency);

    // 5. MIXING GAINS
    const subGain = this.context.createGain();
    subGain.gain.value = 0.8;

    const padGain = this.context.createGain();
    padGain.gain.value = 0.05; // Extremely quiet, ghostly presence

    const windGain = this.context.createGain();
    windGain.gain.value = 0.6; // Prominent, but softened by lowpass

    const mainGain = this.context.createGain();
    mainGain.gain.value = 0.8;

    // 6. ROUTING
    subOsc.connect(subGain);
    subOsc2.connect(subGain);
    subGain.connect(mainGain);

    pad1.connect(padGain);
    pad2.connect(padGain);
    pad3.connect(padGain);
    padGain.connect(mainGain);

    noiseSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(mainGain);

    // 7. ENDLESS VOID (Reverb)
    mainGain.connect(this._reverbNode);
    // Add a tiny bit of dry signal to keep the rumble punchy
    mainGain.connect(this.musicGain);

    // 8. START THE ENGINES
    subOsc.start();
    subOsc2.start();
    pad1.start();
    pad2.start();
    pad3.start();
    noiseSrc.start();
    windLFO.start();
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
