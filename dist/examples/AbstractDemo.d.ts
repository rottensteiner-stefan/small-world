import { Application } from '../src/index.js';
import { EngineConfigInterface } from '../src/interfaces/EngineConfigInterface.js';
export declare abstract class AbstractDemo extends Application {
    constructor(config?: EngineConfigInterface);
    /**
     * Sammelt die wichtigsten Debug-Informationen der Engine.
     * Erbende Demos können diese Methode überschreiben (mit super.getDebugInfo()),
     * um demo-spezifische Daten hinzuzufügen.
     */
    protected getDebugInfo(): Record<string, string | number>;
    /**
     * Hilfsmethode, um die Infos formatiert in die Konsole zu schreiben.
     * (Kannst du z.B. bei Tastendruck 'I' für Info aufrufen).
     */
    protected printDebug(): void;
}
