/// src/renderers/shaders/FluidWGSL.ts

export const FluidWGSL = `
struct Config {
  particleCount: u32,
  radius: f32,
  viscosity: f32,
  surfaceTension: f32,
  restDensity: f32,
  deltaTime: f32,
  _pad0: f32,
  _pad1: f32,
  gravityX: f32,
  gravityY: f32,
  gravityZ: f32,
  gridSizeX: u32,
  gridSizeY: u32,
  gridSizeZ: u32,
  cellSize: f32,
  _pad2: f32,
  boundaryMinX: f32,
  boundaryMinY: f32,
  boundaryMinZ: f32,
  _pad3: f32,
  boundaryMaxX: f32,
  boundaryMaxY: f32,
  boundaryMaxZ: f32,
  _pad4: f32,
};

@group(0) @binding(0) var<uniform> config: Config;
@group(0) @binding(1) var<storage, read_write> positions: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> predictedPositions: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> velocities: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> lambdas: array<f32>;
@group(0) @binding(5) var<storage, read_write> deltaPositions: array<vec4<f32>>;

// Spatial Hashing Buffers
@group(0) @binding(6) var<storage, read_write> gridHeads: array<atomic<u32>>; 
@group(0) @binding(7) var<storage, read_write> particleNext: array<u32>;

const PI: f32 = 3.14159265359;
const EMPTY: u32 = 0xFFFFFFFFu;

fn getCellIdx(pos: vec3<f32>) -> u32 {
    let gridPos = vec3<u32>(floor((pos + 20.0) / config.cellSize));
    return gridPos.x + gridPos.y * config.gridSizeX + gridPos.z * config.gridSizeX * config.gridSizeY;
}

// Pass 0: Clear Grid
@compute @workgroup_size(64)
fn clearGrid(@builtin(global_invocation_id) id: vec3<u32>) {
    let totalCells = config.gridSizeX * config.gridSizeY * config.gridSizeZ;
    if (id.x >= totalCells) { return; }
    atomicStore(&gridHeads[id.x], EMPTY);
}

// Pass 1: Build Grid (Linked List)
@compute @workgroup_size(64)
fn buildGrid(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= config.particleCount) { return; }

    let pos = predictedPositions[idx].xyz;
    let cellIdx = getCellIdx(pos);
    
    let oldHead = atomicExchange(&gridHeads[cellIdx], idx);
    particleNext[idx] = oldHead;
}

// Kernels
fn cubicKernel(r: f32, h: f32) -> f32 {
    let q = r / h;
    if (q >= 1.0) { return 0.0; }
    let k = 8.0 / (PI * h * h * h);
    if (q <= 0.5) {
        return k * (6.0 * (q * q * q - q * q) + 1.0);
    } else {
        return k * 2.0 * pow(1.0 - q, 3.0);
    }
}

fn cubicKernelGradient(r: f32, h: f32, diff: vec3<f32>) -> vec3<f32> {
    let dist = r;
    if (dist <= 0.0 || dist >= h) { return vec3<f32>(0.0); }
    let q = dist / h;
    let k = 48.0 / (PI * pow(h, 4.0));
    var grad: f32 = 0.0;
    if (q <= 0.5) {
        grad = k * (3.0 * q * q - 2.0 * q);
    } else {
        grad = -k * pow(1.0 - q, 2.0);
    }
    return grad * (diff / dist);
}

// Pass 2: Prediction
@compute @workgroup_size(64)
fn predict(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= config.particleCount) { return; }
    var pos = positions[idx].xyz;
    var vel = velocities[idx].xyz;
    let gravity = vec3<f32>(config.gravityX, config.gravityY, config.gravityZ);
    vel += gravity * config.deltaTime;
    predictedPositions[idx] = vec4<f32>(pos + vel * config.deltaTime, 1.0);
}

// Pass 3: Density and Lambda
@compute @workgroup_size(64)
fn computeLambdas(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= config.particleCount) { return; }

    let pos_i = predictedPositions[idx].xyz;
    var density: f32 = 0.0;
    
    let gridPos = vec3<i32>(floor((pos_i + 20.0) / config.cellSize));
    for (var z = -1; z <= 1; z++) {
        for (var y = -1; y <= 1; y++) {
            for (var x = -1; x <= 1; x++) {
                let neighborCellPos = vec3<u32>(vec3<i32>(gridPos) + vec3<i32>(x, y, z));
                let cellIdx = neighborCellPos.x + neighborCellPos.y * config.gridSizeX + neighborCellPos.z * config.gridSizeX * config.gridSizeY;
                
                var curr = atomicLoad(&gridHeads[cellIdx]);
                while (curr != EMPTY) {
                    let pos_j = predictedPositions[curr].xyz;
                    let r = distance(pos_i, pos_j);
                    density += cubicKernel(r, config.radius);
                    curr = particleNext[curr];
                }
            }
        }
    }

    let C = max(density / config.restDensity - 1.0, 0.0);
    if (C > 0.0) {
        lambdas[idx] = -C * 0.1; 
    } else {
        lambdas[idx] = 0.0;
    }
}

// Pass 4: Density Constraints (Position Delta)
@compute @workgroup_size(64)
fn solveConstraints(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= config.particleCount) { return; }

    let pos_i = predictedPositions[idx].xyz;
    let lambda_i = lambdas[idx];
    var deltaPos = vec3<f32>(0.0);

    let gridPos = vec3<i32>(floor((pos_i + 20.0) / config.cellSize));
    for (var z = -1; z <= 1; z++) {
        for (var y = -1; y <= 1; y++) {
            for (var x = -1; x <= 1; x++) {
                let neighborCellPos = vec3<u32>(vec3<i32>(gridPos) + vec3<i32>(x, y, z));
                let cellIdx = neighborCellPos.x + neighborCellPos.y * config.gridSizeX + neighborCellPos.z * config.gridSizeX * config.gridSizeY;
                
                var curr = atomicLoad(&gridHeads[cellIdx]);
                while (curr != EMPTY) {
                    if (curr != idx) {
                        let pos_j = predictedPositions[curr].xyz;
                        let r = distance(pos_i, pos_j);
                        let grad = cubicKernelGradient(r, config.radius, pos_i - pos_j);
                        deltaPos += (lambda_i + lambdas[curr]) * grad;
                    }
                    curr = particleNext[curr];
                }
            }
        }
    }
    deltaPositions[idx] = vec4<f32>(deltaPos / config.restDensity, 0.0);
}

// Pass 5: Final Update
@compute @workgroup_size(64)
fn update(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= config.particleCount) { return; }

    var predPos = predictedPositions[idx].xyz + deltaPositions[idx].xyz;
    let oldPos = positions[idx].xyz;

    // Local Boundaries
    if (predPos.y < config.boundaryMinY) { predPos.y = config.boundaryMinY; }
    if (predPos.y > config.boundaryMaxY) { predPos.y = config.boundaryMaxY; }
    
    if (predPos.x < config.boundaryMinX) { predPos.x = config.boundaryMinX; }
    if (predPos.x > config.boundaryMaxX) { predPos.x = config.boundaryMaxX; }
    
    if (predPos.z < config.boundaryMinZ) { predPos.z = config.boundaryMinZ; }
    if (predPos.z > config.boundaryMaxZ) { predPos.z = config.boundaryMaxZ; }

    positions[idx] = vec4<f32>(predPos, 1.0);
    velocities[idx] = vec4<f32>((predPos - oldPos) / config.deltaTime, 0.0);
}
`;
