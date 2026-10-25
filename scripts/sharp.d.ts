/**
 * `sharp`'s package exports hide `lib/index.d.ts` from this repo's
 * `moduleResolution: "bundler"`. The optimizer is the only TypeScript caller.
 */
declare module "sharp" {
  interface SharpInstance {
    rotate(): SharpInstance;
    resize(width: number, height: number, options?: object): SharpInstance;
    resize(options: object): SharpInstance;
    ensureAlpha(): SharpInstance;
    raw(): SharpInstance;
    toBuffer(): Promise<Buffer>;
    toBuffer(options: { resolveWithObject: true }): Promise<{
      data: Buffer;
      info: { width: number; height: number };
    }>;
    extract(region: { left: number; top: number; width: number; height: number }): SharpInstance;
    extend(options: object): SharpInstance;
    png(): SharpInstance;
    webp(options?: object): SharpInstance;
    toFile(file: string): Promise<unknown>;
    metadata(): Promise<{ width?: number; height?: number }>;
  }

  function sharp(input?: unknown, options?: object): SharpInstance;
  export default sharp;
}
