export declare class HUD {
    private enabled;
    private root;
    private elements;
    constructor(enabled: boolean);
    init(): Promise<void>;
    setVisible(visible: boolean): void;
    /**
     * Nimmt ein Key-Value Objekt entgegen und aktualisiert nur die gemappten Elemente.
     * Beispiel: hud.update({ "hud.fps": 120, "hud.cam.type": "SMOOTH" });
     */
    update(data: Record<string, string | number>): void;
}
