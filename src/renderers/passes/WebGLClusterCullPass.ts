import { WebGLRenderPass } from "../WebGLRenderPass.js";
import { WebGL2Renderer } from "../WebGL2/WebGL2Renderer.js";
import { Scene } from "../../core/index.js";
import { Vector3D ,
  clusterIndex,
  lightClusterCoverage,
  CLUSTER_TEX_WIDTH,
  DEFAULT_CLUSTER_TILE_SIZE,
} from "../../math/index.js";
import { LightDataInterface } from "../../interfaces/index.js";
import { RenderList } from "../../core/Scene.js";

/**
 * CPU-side clustered light culling for WebGL2 (fixed-capacity-per-cluster, no atomics -- see
 * docs/adr/0007-clustered-lighting-webgl2-webgpu-only.md). For each of the (up to 16) point/spot
 * lights, computes its screen-space + radial-distance coverage range via `lightClusterCoverage()`
 * -- the same formula `cluster_cull.wgsl` uses on WebGPU -- and only visits the cluster cells
 * within that range, instead of testing every cell against every light.
 */
export class WebGLClusterCullPass implements WebGLRenderPass {
  public name = "WebGLClusterCullPass";

  private _pointCounts = new Uint8Array(1);
  private _pointIndices = new Uint32Array(CLUSTER_TEX_WIDTH);
  private _pointGrid = new Uint32Array(2);
  private _spotCounts = new Uint8Array(1);
  private _spotIndices = new Uint32Array(CLUSTER_TEX_WIDTH);
  private _spotGrid = new Uint32Array(2);

  public execute(
    renderer: WebGL2Renderer,
    _scene: Scene,
    vp: Float32Array,
    camPos: Vector3D,
    _vMat: Float32Array | undefined,
    _renderList: RenderList,
    extractedLights: LightDataInterface,
    near: number = 0.1,
    far: number = 1000,
  ): void {
    const gl = renderer.webglContext as WebGL2RenderingContext;
    const dims = renderer._clusterDims;
    const maxLightsPerCluster = renderer._clusterMaxLightsPerCluster;
    const tileSizePx = renderer.quality.clusteredLighting?.tileSize ?? DEFAULT_CLUSTER_TILE_SIZE;
    const projMatrix = renderer._frameProjMatrix;
    const numClusters = dims.x * dims.y * dims.z;
    const gridHeight = Math.max(1, Math.ceil(numClusters / CLUSTER_TEX_WIDTH));
    const indexCount = numClusters * maxLightsPerCluster;
    const indexHeight = Math.max(1, Math.ceil(indexCount / CLUSTER_TEX_WIDTH));

    renderer.writeClusterGridUniforms(tileSizePx);

    if (this._pointGrid.length < numClusters * 2) {
      this._pointGrid = new Uint32Array(gridHeight * CLUSTER_TEX_WIDTH * 2);
      this._spotGrid = new Uint32Array(gridHeight * CLUSTER_TEX_WIDTH * 2);
      this._pointCounts = new Uint8Array(numClusters);
      this._spotCounts = new Uint8Array(numClusters);
    }
    if (this._pointIndices.length < indexCount) {
      this._pointIndices = new Uint32Array(indexHeight * CLUSTER_TEX_WIDTH);
      this._spotIndices = new Uint32Array(indexHeight * CLUSTER_TEX_WIDTH);
    }
    this._pointCounts.fill(0, 0, numClusters);
    this._spotCounts.fill(0, 0, numClusters);
    // Zero the (offset, count) grid every frame, not just on resize -- otherwise a cell that had
    // lights last frame but none this frame would keep serving last frame's stale count.
    this._pointGrid.fill(0, 0, numClusters * 2);
    this._spotGrid.fill(0, 0, numClusters * 2);

    if (!projMatrix) {
      // No projection matrix stashed yet (e.g. very first frame) -- leave every cluster empty
      // rather than guessing; the next frame will have one.
      this._uploadAndBind(gl, renderer, gridHeight, indexHeight);
      return;
    }

    const projScaleX = projMatrix[0]!;
    const projScaleY = projMatrix[5]!;
    const numPointLights = Math.min(extractedLights.pLights.length, 16);
    const numSpotLights = Math.min(extractedLights.sLights.length, 16);

    for (let i = 0; i < numPointLights; i++) {
      const light = extractedLights.pLights[i]!;
      this._cullLightIntoCells(
        light.worldMatrix.data,
        light.distance,
        i,
        vp,
        camPos,
        projScaleX,
        projScaleY,
        renderer,
        dims,
        maxLightsPerCluster,
        near,
        far,
        this._pointGrid,
        this._pointIndices,
        this._pointCounts,
      );
    }
    for (let i = 0; i < numSpotLights; i++) {
      const light = extractedLights.sLights[i]!;
      this._cullLightIntoCells(
        light.worldMatrix.data,
        light.distance,
        i,
        vp,
        camPos,
        projScaleX,
        projScaleY,
        renderer,
        dims,
        maxLightsPerCluster,
        near,
        far,
        this._spotGrid,
        this._spotIndices,
        this._spotCounts,
      );
    }

    this._uploadAndBind(gl, renderer, gridHeight, indexHeight);
  }

  /** Projects one light and writes its index into every cluster cell it can reach. */
  private _cullLightIntoCells(
    worldMatrixData: Float32Array,
    radius: number,
    lightIndex: number,
    vp: Float32Array,
    camPos: Vector3D,
    projScaleX: number,
    projScaleY: number,
    renderer: WebGL2Renderer,
    dims: { x: number; y: number; z: number },
    maxLightsPerCluster: number,
    near: number,
    far: number,
    grid: Uint32Array,
    indices: Uint32Array,
    counts: Uint8Array,
  ): void {
    const lx = worldMatrixData[12]!;
    const ly = worldMatrixData[13]!;
    const lz = worldMatrixData[14]!;
    const dx = lx - camPos.x;
    const dy = ly - camPos.y;
    const dz = lz - camPos.z;
    const viewDist = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 0.0001);

    const clipX = vp[0]! * lx + vp[4]! * ly + vp[8]! * lz + vp[12]!;
    const clipY = vp[1]! * lx + vp[5]! * ly + vp[9]! * lz + vp[13]!;
    const clipW = vp[3]! * lx + vp[7]! * ly + vp[11]! * lz + vp[15]!;
    const ndcX = clipW !== 0 ? clipX / clipW : 0;
    const ndcY = clipW !== 0 ? clipY / clipW : 0;

    const coverage = lightClusterCoverage(
      viewDist,
      Math.max(radius, 0.001),
      ndcX,
      ndcY,
      clipW,
      projScaleX,
      projScaleY,
      renderer.webglContext.canvas.width,
      renderer.webglContext.canvas.height,
      renderer.quality.clusteredLighting?.tileSize ?? DEFAULT_CLUSTER_TILE_SIZE,
      dims,
      near,
      far,
    );

    for (let z = coverage.sliceMin; z <= coverage.sliceMax; z++) {
      for (let y = coverage.cellMinY; y <= coverage.cellMaxY; y++) {
        for (let x = coverage.cellMinX; x <= coverage.cellMaxX; x++) {
          const cell = clusterIndex(x, y, z, dims);
          const count = counts[cell]!;
          if (count >= maxLightsPerCluster) continue;
          indices[cell * maxLightsPerCluster + count] = lightIndex;
          counts[cell] = count + 1;
          grid[cell * 2] = cell * maxLightsPerCluster;
          grid[cell * 2 + 1] = count + 1;
        }
      }
    }
  }

  private _uploadAndBind(
    gl: WebGL2RenderingContext,
    renderer: WebGL2Renderer,
    gridHeight: number,
    indexHeight: number,
  ): void {
    gl.activeTexture(gl.TEXTURE0 + WebGL2Renderer._CLUSTER_POINT_GRID_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, renderer._pointClusterGridTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      CLUSTER_TEX_WIDTH,
      gridHeight,
      gl.RG_INTEGER,
      gl.UNSIGNED_INT,
      this._pointGrid,
    );

    gl.activeTexture(gl.TEXTURE0 + WebGL2Renderer._CLUSTER_POINT_INDEX_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, renderer._pointClusterIndexTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      CLUSTER_TEX_WIDTH,
      indexHeight,
      gl.RED_INTEGER,
      gl.UNSIGNED_INT,
      this._pointIndices,
    );

    gl.activeTexture(gl.TEXTURE0 + WebGL2Renderer._CLUSTER_SPOT_GRID_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, renderer._spotClusterGridTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      CLUSTER_TEX_WIDTH,
      gridHeight,
      gl.RG_INTEGER,
      gl.UNSIGNED_INT,
      this._spotGrid,
    );

    gl.activeTexture(gl.TEXTURE0 + WebGL2Renderer._CLUSTER_SPOT_INDEX_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, renderer._spotClusterIndexTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      CLUSTER_TEX_WIDTH,
      indexHeight,
      gl.RED_INTEGER,
      gl.UNSIGNED_INT,
      this._spotIndices,
    );
  }
}
