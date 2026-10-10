// Minimal typing for the slice of `pngjs` the script tests use (no @types package installed).
declare module "pngjs" {
  export class PNG {
    public static sync: { write(png: PNG): Buffer };
    public data: Buffer;
    public width: number;
    public height: number;
    constructor(options?: { width: number; height: number });
  }
}
