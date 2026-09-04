// Cheap 2D hash for the foam/caustics cell noise below -- not a general-purpose PRNG, just enough
// decorrelation between neighboring cells to avoid an obviously repeating pattern.
fn waterHash(p: vec2<f32>) -> f32 {
    return fract(sin(dot(p, vec2<f32>(12.9898, 78.233))) * 43758.5453123);
}

// Worley/cellular noise: distance from `p` to the nearest jittered point among the 3x3
// neighboring grid cells. Produces the blotchy, cell-like coverage foam needs -- unlike smooth
// Perlin-style noise, its edges are naturally sharp, which reads as foam clumps rather than a
// soft gradient. Shared by every liquid surface material that needs shoreline/foam/caustics noise.
fn waterCellNoise(p: vec2<f32>) -> f32 {
    let cell = floor(p);
    let localPos = fract(p);
    var minDistSq = 1.0;
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let neighbor = vec2<f32>(f32(x), f32(y));
            let jitter = vec2<f32>(
                waterHash(cell + neighbor),
                waterHash(cell + neighbor + vec2<f32>(17.0, 31.0))
            );
            let diff = neighbor + jitter - localPos;
            minDistSq = min(minDistSq, dot(diff, diff));
        }
    }
    return sqrt(minDistSq);
}
