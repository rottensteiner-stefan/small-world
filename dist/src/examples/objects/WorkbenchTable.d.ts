import { Object3D, AbstractMaterial } from '../../index.js';
export interface WorkbenchTableOptions {
    /** Width in meters (X-axis). Default: 1.2 */
    width?: number;
    /** Depth in meters (Z-axis). Default: 0.7 */
    depth?: number;
    /** Height in meters (Y-axis). Default: 0.45 */
    height?: number;
    /** Thickness of the tabletop in meters. Default: 0.08 */
    topThickness?: number;
    /** Material for the wooden parts */
    woodMaterial?: AbstractMaterial;
    /** Material for the metal bolts and frames */
    metalMaterial?: AbstractMaterial;
}
export declare class WorkbenchTable extends Object3D {
    constructor(name: string, options?: WorkbenchTableOptions);
}
