import { MaterialType } from "../../enums/index.js";
/**
 * Standard render pass for opaque and skybox objects.
 */
export class MainRenderPass {
    name = "MainRenderPass";
    execute(renderer, scene, ce, targetView, _vp, _camPos, vMat) {
        const sortedGroups = scene.getVisibleObjectsSorted();
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
        const skyboxShaderMap = sortedGroups.get(MaterialType.SKYBOX);
        if (skyboxShaderMap) {
            for (const [topology, materialGroups] of skyboxShaderMap.entries()) {
                renderer._renderGroup(rp, MaterialType.SKYBOX, materialGroups, vMat, topology);
            }
            sortedGroups.delete(MaterialType.SKYBOX);
        }
        // 2. All other materials
        for (const [shaderId, topologyMap] of sortedGroups.entries()) {
            for (const [topology, materialGroups] of topologyMap.entries()) {
                renderer._renderGroup(rp, shaderId, materialGroups, vMat, topology);
            }
        }
        rp.end();
    }
}
//# sourceMappingURL=MainRenderPass.js.map