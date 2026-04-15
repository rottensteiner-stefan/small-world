/**
 * Handles the Head-Up Display (HUD) overlay.
 */
export declare class HUD {
    private _enabled;
    private _root;
    private _elements;
    /**
     * Creates a new HUD.
     * @param _enabled Whether the HUD is enabled.
     */
    constructor(_enabled: boolean);
    /**
     * Initializes the HUD by loading the template and binding elements.
     */
    init(): Promise<void>;
    /**
     * Sets the visibility of the HUD.
     * @param visible True to show the HUD.
     */
    setVisible(visible: boolean): void;
    /**
     * Updates the HUD with the given data.
     * @param data A record of key-value pairs to update.
     */
    update(data: Record<string, string | number>): void;
}
