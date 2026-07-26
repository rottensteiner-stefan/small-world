async function test() {
    if (!navigator.gpu) {
        console.log("No WebGPU in Node");
        return;
    }
    const adapter = await navigator.gpu.requestAdapter();
    await adapter.requestDevice();
    console.log("WebGPU supported!");
}
test();
