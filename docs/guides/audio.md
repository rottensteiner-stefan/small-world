# Audio

Small World Engine ships a lightweight `AudioSystem` that wraps the Web Audio API: sample loading and playback (global or 3D-spatial), a small mixer (master/SFX/music buses plus a send-effect reverb), camera-synced listener positioning, and a set of procedurally synthesized sound effects that need no audio assets at all.

## Accessing the Audio System

Like the renderer and physics system, `AudioSystem` is instance-owned — every `SmallWorld` application gets its own via `this.audio`, so multiple engine instances on one page (editors, minimaps, split-screen) never share audio state.

```typescript
// Inside a SmallWorld subclass
protected override async setupScene(): Promise<void> {
  await this.audio.load("./assets/explosion.wav", "explosion");
}
```

Because browsers suspend the `AudioContext` until a user gesture, call `this.audio.resume()` (or just play a sound — every playback method calls it internally) from a click/keydown handler before expecting audio to be audible.

## Loading and Playing Samples

`load(url, name)` fetches and decodes a file once, caching it under `name` for repeated playback.

```typescript
await this.audio.load("./assets/explosion.wav", "explosion");

// Global (non-spatial) playback
this.audio.play("explosion", /* loop */ false, /* volume */ 0.8);
```

For sounds that should attenuate and pan with 3D position, use `playSpatial` instead:

```typescript
this.audio.playSpatial("explosion", enemy.position, false, 1.0, /* refDistance */ 2.0, /* maxDistance */ 20.0);
```

`playSpatial` uses an HRTF `PannerNode` with inverse distance falloff. Both methods return the underlying `AudioBufferSourceNode` (and, for spatial sounds, the `PannerNode`) so you can stop or otherwise inspect the playing instance yourself — the engine does not track active voices for you.

## The Mixer

Every sound plays through one of two gain buses, both routed into a master bus:

- `sfxGain` — sound effects (`play`, `playSpatial`, and all `SynthSFX` methods except `startDrone`).
- `musicGain` — background music/ambience.

A single procedural reverb (a fixed 2-second decay impulse, generated at startup) is wired as a send effect off the SFX bus. Adjust levels with:

```typescript
this.audio.setMasterVolume(0.9);
this.audio.setSFXVolume(0.8);
this.audio.setMusicVolume(0.5);
this.audio.setReverbLevel(0.3); // 0 = dry, higher = more reverb send
```

::: tip GadgetInspector wiring
These four setters are already wired to `gadget:audio:master`/`music`/`sfx`/`reverb` window events, so a `GadgetInspector` volume panel controls them without any glue code on your part.
:::

## Listener Position (3D Audio)

Spatial audio needs to know where the "ears" are. Sync the Web Audio listener to your camera once per frame:

```typescript
protected override update(deltaTime: number): void {
  this.audio.updateListener(this.camera);
  // ...your other game logic
}
```

This is not automatic — the engine doesn't assume audio should always follow the main camera (e.g. a spectator camera or a minimap camera shouldn't necessarily move the listener), so call it explicitly from wherever your "ears" actually are.

## Procedural Sound Effects (No Assets Needed)

For quick prototyping, retro-style feedback, or ambience that doesn't need a hand-authored sample, `AudioSystem` also exposes a handful of Web-Audio-synthesized effects (implemented in `SynthSFX`, importable on its own if you want to build your own):

```typescript
this.audio.playTone(880, 0.15, 0.4, "square"); // A quick "laser" blip
this.audio.playFootstep();
this.audio.playShoot();
this.audio.playHurt();
this.audio.startFire(torch.position, 0.4); // Looping crackle at a 3D position
this.audio.startDrone(); // Ambient sub-bass + noise bed, routed to the music bus
```

These are plain oscillator/noise graphs — no network request, no decode step, and safe to call before any asset has loaded.

## Limitations

- No built-in voice limiting or pooling: playing the same sound rapidly (e.g. a very fast weapon) creates a new `AudioBufferSourceNode` per call with no cap.
- Only one reverb preset exists; there's no API to swap in a different impulse response per-room.
- No music crossfade/ducking helpers — layering or transitioning between music tracks is on you (fade the two `GainNode`s manually, or route through your own intermediate gain).
