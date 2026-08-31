/**
 * Shared ring buffer holding every object's `ObjectUniforms` slot for the current frame, bound
 * once via `hasDynamicOffset` instead of one `GPUBuffer`+`GPUBindGroup` per object -- plus the
 * per-frame slot dedup (same object+material reused across multiple draws, e.g. a shadow caster
 * drawn across 4 CSM cascades, gets one slot instead of a fresh one each time) and the
 * grows-only capacity management that avoids resizing mid-encode.
 *
 * Extracted from `WebGPURenderer` -- see .agents/collaborate/god-objects-refactoring.md Phase 4.
 * No behavior change. Deliberately does NOT know how to pack a `RenderManifest`/`Object3D` into
 * `ObjectUniforms` bytes -- that's `WebGPURenderer._packObjectUniforms()`'s job (real business
 * logic tied to shaders/materials/skinning, not generic ring-buffer bookkeeping). `acquireSlot()`
 * only decides WHICH offset a (possibly deduped) draw gets and whether the caller still needs to
 * pack+`write()` into it.
 */
export class GPUObjectRingBuffer {
  private readonly _device: GPUDevice;
  private readonly _objectBGL: GPUBindGroupLayout;
  private readonly _stride: number;

  private _buffer!: GPUBuffer;
  private _bindGroup!: GPUBindGroup;
  private _capacity = 0;
  /** Frame-local: `` `${obj.uuid}:${matUuid}` `` -> byte offset already written this frame. */
  private _slotMap = new Map<string, number>();
  /** Frame-local slot counter; becomes `_lastFrameSlotCount` for next frame's capacity guess. */
  private _slotCount = 0;
  private _lastFrameSlotCount = 0;
  private _overflowWarned = false;
  /** Set by `ensureCapacity()` when it grows; destroyed in `endFrame()` once every draw that
   * referenced the old buffer's slots has actually been recorded and submitted. */
  private _pendingDestroy?: GPUBuffer | undefined;

  constructor(device: GPUDevice, objectBGL: GPUBindGroupLayout, initialCapacity: number = 1024) {
    this._device = device;
    this._objectBGL = objectBGL;
    // Slot stride must respect the device's dynamic-offset alignment (commonly 256, but not
    // guaranteed) -- 256 is the payload size (`ObjectUniforms` packs into <= 256 bytes).
    const alignment = device.limits.minUniformBufferOffsetAlignment;
    this._stride = Math.ceil(256 / alignment) * alignment;
    this.ensureCapacity(initialCapacity);
  }

  public get bindGroup(): GPUBindGroup {
    return this._bindGroup;
  }
  public get buffer(): GPUBuffer {
    return this._buffer;
  }
  public get capacity(): number {
    return this._capacity;
  }
  public get stride(): number {
    return this._stride;
  }
  public get pendingDestroy(): GPUBuffer | undefined {
    return this._pendingDestroy;
  }

  /** Grows the ring buffer (+ its single dynamic-offset bind group) to hold at least
   * `neededSlots`. Never shrinks. Called once at construction and once per frame in
   * `beginFrame()` based on the previous frame's usage -- never mid-frame (see `acquireSlot()`'s
   * overflow clamp for why: swapping the bound `GPUBuffer` while a render pass is being recorded
   * would need a second bind group + risks stale offsets in already-encoded draws). */
  public ensureCapacity(neededSlots: number): void {
    if (this._buffer && this._capacity >= neededSlots) return;

    const newCapacity = Math.max(neededSlots, this._capacity * 2, 1);
    const newBuffer = this._device.createBuffer({
      size: newCapacity * this._stride,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const newBindGroup = this._device.createBindGroup({
      layout: this._objectBGL,
      entries: [
        { binding: 0, resource: { buffer: newBuffer, offset: 0, size: this._stride } },
      ],
    });

    // Destroying immediately after this frame's queue.submit() is spec-safe (the driver keeps the
    // underlying resource alive, ref-counted, until in-flight GPU work finishes) -- but growth
    // happens *before* this frame's draws are recorded, so the old buffer is still what those
    // draws' already-taken slot offsets refer to until we submit. Deferred to `endFrame()`'s
    // post-submit cleanup instead of destroying it here.
    this._pendingDestroy = this._buffer;
    this._buffer = newBuffer;
    this._bindGroup = newBindGroup;
    this._capacity = newCapacity;
  }

  /** Resets per-frame dedup/slot state and grows capacity from last frame's actual usage (with
   * 50% headroom) so growth is the rare case, not the norm. Call once per frame, before encoding
   * any draws. */
  public beginFrame(): void {
    this._slotMap.clear();
    this._slotCount = 0;
    this._overflowWarned = false;
    this.ensureCapacity(Math.max(1024, Math.ceil(this._lastFrameSlotCount * 1.5)));
  }

  /** Remembers this frame's usage for next frame's capacity guess, and destroys a buffer replaced
   * by a mid-init `ensureCapacity()` growth call. Call once per frame, right after
   * `queue.submit()`, once nothing can still reference the old buffer. */
  public endFrame(): void {
    this._lastFrameSlotCount = this._slotCount;
    if (this._pendingDestroy) {
      this._pendingDestroy.destroy();
      this._pendingDestroy = undefined;
    }
  }

  /**
   * Looks up or allocates a slot for `key` (`undefined` for draws that must never dedupe, e.g.
   * sprites -- their model matrix is billboarded towards the active view matrix, which differs
   * per pass). Returns the byte offset and whether this was a cache hit; the caller should
   * (re)pack + `write()` data only when `cached` is false.
   */
  public acquireSlot(key: string | undefined): { offset: number; cached: boolean } {
    if (key !== undefined) {
      const cached = this._slotMap.get(key);
      if (cached !== undefined) return { offset: cached, cached: true };
    }

    let slot = this._slotCount;
    if (slot >= this._capacity) {
      // Rare mid-frame spike beyond what last frame's usage predicted -- clamp instead of
      // resizing mid-encode (see `ensureCapacity()`'s doc comment). Self-corrects next frame once
      // `_lastFrameSlotCount` reflects the higher demand.
      if (!this._overflowWarned) {
        console.warn(
          `[WebGPURenderer] Object uniform ring buffer exceeded its ${this._capacity}-slot capacity mid-frame; reusing the last slot for the overflow this frame. Capacity grows for the next frame.`,
        );
        this._overflowWarned = true;
      }
      slot = this._capacity - 1;
    } else {
      this._slotCount++;
    }

    const offset = slot * this._stride;
    if (key !== undefined) this._slotMap.set(key, offset);
    return { offset, cached: false };
  }

  public write(offset: number, data: Float32Array): void {
    this._device.queue.writeBuffer(this._buffer, offset, data);
  }

  public dispose(): void {
    this._buffer?.destroy();
    this._pendingDestroy?.destroy();
  }
}
