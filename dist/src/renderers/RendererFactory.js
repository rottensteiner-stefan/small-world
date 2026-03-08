import { RendererType } from "../enums/RendererType.js";
import { WebGL1Renderer } from "./WebGL1Renderer.js";
import { WebGL2Renderer } from "./WebGL2Renderer.js";
import { WebGPURenderer } from "./WebGPURenderer.js";
export class RendererFactory {
    /**
     * Erstellt und initialisiert den passenden Renderer.
     * @param type Der gewünschte Renderer-Typ (aus der Config)
     * @param canvas Das HTMLCanvasElement
     * @returns Eine vollständig initialisierte Instanz, die IRenderer implementiert
     */
    static async create(type, canvas) {
        // Ermittle den tatsächlichen Typ, falls "BEST" gewählt wurde
        let actualType = type;
        if (actualType === RendererType.BEST) {
            actualType = navigator.gpu ? RendererType.WEB_GPU : RendererType.WEB_GL2;
        }
        let renderer;
        // Instanziierung basierend auf dem ermittelten Typ
        switch (actualType) {
            case RendererType.WEB_GPU:
                if (!navigator.gpu) {
                    console.warn("[RendererFactory] WebGPU wird vom Browser nicht unterstützt. Fallback auf WebGL2.");
                    renderer = new WebGL2Renderer();
                }
                else {
                    // Cast auf any, falls WebGPURenderer das IRenderer Interface noch nicht zu 100% formal implementiert
                    renderer = new WebGPURenderer();
                }
                break;
            case RendererType.WEB_GL2:
                renderer = new WebGL2Renderer();
                break;
            case RendererType.WEB_GL1:
                renderer = new WebGL1Renderer();
                break;
            default:
                console.warn(`[RendererFactory] Unbekannter Typ '${type}'. Nutze Fallback WebGL2.`);
                renderer = new WebGL2Renderer();
                break;
        }
        // Die asynchrone Initialisierung direkt hier in der Factory abhandeln
        await renderer.initialize(canvas);
        return renderer;
    }
}
//# sourceMappingURL=RendererFactory.js.map