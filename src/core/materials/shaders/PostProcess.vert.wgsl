@vertex
fn vs_main(@builtin(vertex_index) id: u32) -> @builtin(position) vec4f {
    // Generate a fullscreen triangle from vertex index alone.
    // 3 vertices cover the entire clip space.
    let x = f32((id << 1u) & 2u) * 2.0 - 1.0;
    let y = f32(id & 2u) * 2.0 - 1.0;
    return vec4f(x, y, 0.0, 1.0);
}
