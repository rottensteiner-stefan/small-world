import { describe, it, expect, vi } from "vitest";
import {
  Bone,
  Skeleton,
  SkinnedMesh,
  AnimationClip,
  KeyframeTrack,
  AnimationMixer,
  MAX_SKINNED_BONES,
} from "../../../src/core/animation/index.js";
import { Object3D } from "../../../src/core/Object3D.js";
import { Scene } from "../../../src/core/Scene.js";

describe("Skeletal Animation System", () => {
  it("should create bones and compute skeleton matrices", () => {
    const rootBone = new Bone("Root");
    const childBone = new Bone("Child");
    childBone.position.set(0, 5, 0);
    rootBone.add(childBone);

    const skeleton = new Skeleton([rootBone, childBone]);
    rootBone.updateMatrixWorld();
    skeleton.update();

    expect(skeleton.bones.length).toBe(2);
    expect(skeleton.boneMatrices.length).toBe(32); // 2 * 16 floats
    expect(skeleton.getBoneByName("Child")).toBe(childBone);
  });

  it("should interpolate translation keyframes in KeyframeTrack", () => {
    const times = new Float32Array([0, 1.0]);
    const values = new Float32Array([0, 0, 0, 10, 20, 30]);
    const track = new KeyframeTrack("BoneA", "translation", times, values, "LINEAR");

    const sampled = track.sampleVector(0.5);

    expect(sampled.x).toBeCloseTo(5);
    expect(sampled.y).toBeCloseTo(10);
    expect(sampled.z).toBeCloseTo(15);
  });

  it("should update tracks in AnimationMixer over time", () => {
    const root = new Object3D("Hero");
    const arm = new Bone("Arm");
    root.add(arm);

    const times = new Float32Array([0, 1.0, 2.0]);
    const values = new Float32Array([0, 0, 0, 1, 0, 0.7071, 0, 0.7071, 0, 1, 0, 0]);
    const track = new KeyframeTrack("Arm", "rotation", times, values, "LINEAR");
    const clip = new AnimationClip("Swing", 2.0, [track]);

    const mixer = new AnimationMixer(root);
    const action = mixer.clipAction(clip);
    action.play();

    mixer.update(0.5); // Halfway to 1.0
    expect(arm.quaternion).toBeDefined();
    expect(arm.quaternion!.y).toBeGreaterThan(0);
  });

  it("should bind skeleton to SkinnedMesh and update world matrix", () => {
    const bone = new Bone("B0");
    const skeleton = new Skeleton([bone]);
    const skinnedMesh = new SkinnedMesh("Character");

    skinnedMesh.bind(skeleton);
    skinnedMesh.updateMatrixWorld();

    expect(skinnedMesh.skeleton).toBe(skeleton);
  });

  it("should blend two simultaneously-playing actions by their relative weight", () => {
    const root = new Object3D("Hero");
    const arm = new Bone("Arm");
    root.add(arm);

    const times = new Float32Array([0, 1.0]);
    const trackA = new KeyframeTrack(
      "Arm",
      "translation",
      times,
      new Float32Array([0, 0, 0, 0, 0, 0]),
    );
    const trackB = new KeyframeTrack(
      "Arm",
      "translation",
      times,
      new Float32Array([10, 0, 0, 10, 0, 0]),
    );
    const clipA = new AnimationClip("Idle", 1.0, [trackA]);
    const clipB = new AnimationClip("Reach", 1.0, [trackB]);

    const mixer = new AnimationMixer(root);
    const actionA = mixer.clipAction(clipA);
    const actionB = mixer.clipAction(clipB);
    actionA.weight = 0.5;
    actionB.weight = 0.5;
    actionA.play();
    actionB.play();

    mixer.update(0);

    // A last-writer-wins implementation would snap to whichever action's track happened to
    // be evaluated last (0 or 10), not the weighted midpoint.
    expect(arm.position.x).toBeCloseTo(5);
  });

  it("should reflect the current frame's bone pose even when the SkinnedMesh is added before its bones", () => {
    // Mirrors typical glTF export order: the mesh node is a sibling of (and precedes)
    // the armature root in the parent's children array. A single top-down
    // updateMatrixWorld() pass would visit the mesh before its bones are current.
    const armatureRoot = new Bone("Hips");
    const skeleton = new Skeleton([armatureRoot]);
    const skinnedMesh = new SkinnedMesh("Character");
    skinnedMesh.bind(skeleton);

    const root = new Object3D("glTF_Root");
    root.add(skinnedMesh, armatureRoot);

    armatureRoot.position.set(0, 5, 0);

    const scene = new Scene();
    scene.add(root);
    scene.update(0);

    // If skinning were computed inside updateMatrixWorld() during the single
    // top-down pass, this would still read Hips' pre-update (identity) matrix.
    expect(skeleton.boneMatrices[13]).toBeCloseTo(5);
  });

  it("should bind a track's mixamorigN: target name to a node with a differently-numbered mixamorig suffix", () => {
    // Mixamo assigns its rig prefix's numeric suffix per export session, independent of which
    // character was exported -- a rig and a shared animation clip pulled from separate sessions
    // can carry different suffixes for what is otherwise the same joint.
    const root = new Object3D("Character");
    const hips = new Bone("mixamorig5:Hips");
    root.add(hips);

    const times = new Float32Array([0, 2.0]);
    const track = new KeyframeTrack(
      "mixamorig:Hips",
      "translation",
      times,
      new Float32Array([0, 0, 0, 10, 0, 0]),
    );
    const clip = new AnimationClip("Walk", 2.0, [track]);

    const mixer = new AnimationMixer(root);
    mixer.clipAction(clip).play();
    mixer.update(1.0); // Halfway to 2.0

    expect(hips.position.x).toBeCloseTo(5);
  });

  it("should report a bone's accumulated world scale, unaffected by ancestors shared with other branches", () => {
    const armature = new Object3D("Armature");
    armature.scale.set(100, 100, 100);
    const hips = new Bone("mixamorig:Hips");
    armature.add(hips);
    armature.updateMatrixWorld();

    expect(hips.getAccumulatedWorldScale()).toBeCloseTo(100);
  });

  it("should warn when a skeleton exceeds the GPU skinning bone limit", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const tooManyBones = Array.from(
      { length: MAX_SKINNED_BONES + 1 },
      (_, i) => new Bone(`Bone${i}`),
    );

    new Skeleton(tooManyBones);

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]![0]).toContain(`${MAX_SKINNED_BONES}`);
    warnSpy.mockRestore();
  });
});
