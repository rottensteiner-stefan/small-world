export class ConfigLoader {
  public static async load(p: string) { const r = await fetch(p); return r.json(); }
}
