import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./safe-return-to";

describe("safeReturnTo", () => {
  it("allows same-site relative paths", () => {
    expect(safeReturnTo("/designs", "/")).toBe("/designs");
    expect(safeReturnTo("/editor/new?product=mug", "/")).toBe("/editor/new?product=mug");
    expect(safeReturnTo("/orders/abc-123", "/")).toBe("/orders/abc-123");
  });

  it("rejects protocol-relative open redirects", () => {
    expect(safeReturnTo("//evil.example/phish", "/designs")).toBe("/designs");
    expect(safeReturnTo("//evil.example", "/designs")).toBe("/designs");
  });

  it("rejects absolute URLs and empty values", () => {
    expect(safeReturnTo("https://evil.example", "/designs")).toBe("/designs");
    expect(safeReturnTo("http://evil.example", "/designs")).toBe("/designs");
    expect(safeReturnTo(undefined, "/designs")).toBe("/designs");
    expect(safeReturnTo("", "/designs")).toBe("/designs");
  });
});
