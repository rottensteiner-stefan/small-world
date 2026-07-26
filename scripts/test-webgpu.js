async function test() {
    if (!navigator.gpu) {
        console.log("No WebGPU in Node");
        return;
    }
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    console.log("WebGPU supported!");
}
test();
