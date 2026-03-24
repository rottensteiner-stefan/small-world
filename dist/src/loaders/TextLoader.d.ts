import { AbstractLoader } from './AbstractLoader.js';
export declare class TextLoader extends AbstractLoader<string> {
    load(url: string): Promise<string>;
}
