import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listBouquetArt } from "./satin-assets";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempBouquet(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "bouquet-"));
  dirs.push(dir);
  return dir;
}

describe("satin photo discovery", () => {
  it("uses a dropped webp before a png, and keeps legacy portraits separate", () => {
    const dir = tempBouquet();
    writeFileSync(path.join(dir, "rose-red.webp"), "");
    writeFileSync(path.join(dir, "rose-red.png"), "");
    writeFileSync(path.join(dir, "tulip-cyan.png"), "");
    writeFileSync(path.join(dir, "rose.png"), "");
    writeFileSync(path.join(dir, "notes.txt"), "");

    const art = listBouquetArt(dir);

    expect(art.satin["rose:red"]).toEqual({ src: "/bouquet/rose-red.webp", knockout: false });
    expect(art.satin["tulip:cyan"]).toEqual({ src: "/bouquet/tulip-cyan.png", knockout: true });
    expect(art.satin["rose:pink"]).toBeUndefined();
    expect(art.legacy.rose).toBe("/bouquet/rose.png");
    expect(art.legacy.tulip).toBeUndefined();
  });

  it("does not treat the natural gerbera portrait as a satin colour", () => {
    const dir = tempBouquet();
    writeFileSync(path.join(dir, "gerbera.png"), "");
    const art = listBouquetArt(dir);
    expect(art.satin["gerbera:pink"]).toBeUndefined();
    expect(art.legacy.gerbera).toBe("/bouquet/gerbera.png");
  });
});
