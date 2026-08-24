import { describe, it, expect } from "vitest";
import {
  Bone,
  Skeleton,
  SkinnedMesh,
  AnimationClip,
  KeyframeTrack,
  AnimationMixer,
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

  it("should interpolate translation and rotation keyframes in KeyframeTrack", () => {
    const times = new Float32Array([0, 1.0]);
    const values = new Float32Array([0, 0, 0, 10, 20, 30]);
    const track = new KeyframeTrack("BoneA", "translation", times, values, "LINEAR");

    const target = new Bone("BoneA");
    track.evaluate(0.5, target);

    expect(target.position.x).toBeCloseTo(5);
    expect(target.position.y).toBeCloseTo(10);
    expect(target.position.z).toBeCloseTo(15);
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
});
