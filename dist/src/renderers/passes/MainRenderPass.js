import { MaterialType } from "../../enums/index.js";
/**
 * Standard render pass for opaque and skybox objects.
 */
export class MainRenderPass {
    name = "MainRenderPass";
    _scratchTransparentMap = new Map();
    execute(renderer, scene, ce, targetView, vp, camPos, vMat) {
        const renderList = scene.getVisibleObjectsSorted(vp, camPos);
        const rp = ce.beginRenderPass({
            colorAttachments: [
                {
                    view: targetView,
                    clearValue: renderer.clearColor,
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
            depthStencilAttachment: {
                view: renderer._depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store",
            },
        });
        // 1. Skybox first
        const skyboxShaderMap = renderList.opaque.get(MaterialType.SKYBOX);
        if (skyboxShaderMap) {
            for (const [topology, materialGroups] of skyboxShaderMap.entries()) {
                renderer._renderGroup(rp, MaterialType.SKYBOX, materialGroups, vMat, topology);
            }
            renderList.opaque.delete(MaterialType.SKYBOX);
        }
        // 2. All other opaque objects
        for (const [shaderId, topologyMap] of renderList.opaque.entries()) {
            for (const [topology, materialGroups] of topologyMap.entries()) {
                renderer._renderGroup(rp, shaderId, materialGroups, vMat, topology);
            }
        }
        if (renderList.transparent.length > 0) {
            // End opaque pass
            rp.end();
            // Capture opaque texture for transparent materials (like glass)
            const targetTex = renderer.postProcessing.enabled
                ? renderer._hdrTexture
                : renderer._context.getCurrentTexture();
            renderer.captureOpaqueTexture(ce, targetTex);
            // Start transparent pass
            const rpTransparent = ce.beginRenderPass({
                colorAttachments: [
                    {
                        view: targetView,
                        loadOp: "load",
                        storeOp: "store",
                    },
                ],
                depthStencilAttachment: {
                    view: renderer._depthTexture.createView(),
                    depthLoadOp: "load",
                    depthStoreOp: "store",
                },
            });
            // 3. Transparent objects
            for (const obj of renderList.transparent) {
                const manifest = obj.material.getRenderManifest();
                const shaderId = manifest.shaderId;
                const topology = manifest.state?.topology ||
                    obj.geometry?.topology ||
                    (obj.geometry?.indices?.length === 2 ? "line-list" : "triangle-list");
                this._scratchTransparentMap.clear();
                this._scratchTransparentMap.set(obj.material.uuid, [obj]);
                renderer._renderGroup(rpTransparent, shaderId, this._scratchTransparentMap, vMat, topology);
            }
            rpTransparent.end();
        }
        else {
            rp.end();
        }
    }
}
//# sourceMappingURL=MainRenderPass.js.map