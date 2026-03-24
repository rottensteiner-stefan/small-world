import { AbstractLoader } from './AbstractLoader.js';
import { PhongMaterial } from '../core/materials/PhongMaterial.js';
export declare class MtlLoader extends AbstractLoader<Map<string, PhongMaterial>> {
    load(url: string): Promise<Map<string, PhongMaterial>>;
    private parse;
}
