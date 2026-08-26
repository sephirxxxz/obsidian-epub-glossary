import { describe, expect, it } from "vitest";
import { didViewportSizeChange, viewportSizeFromRect } from "../src/layout";

describe("viewport sizing", () => {
  it("ignores zero-sized reader hosts", () => {
    expect(viewportSizeFromRect({ width: 0, height: 400 })).toBeNull();
    expect(viewportSizeFromRect({ width: 800, height: 0 })).toBeNull();
  });

  it("only reports a resize when dimensions change", () => {
    const first = viewportSizeFromRect({ width: 800.8, height: 600.2 });
    expect(first).toEqual({ width: 800, height: 600 });
    expect(didViewportSizeChange(first, { width: 800, height: 600 })).toBe(false);
    expect(didViewportSizeChange(first, { width: 801, height: 600 })).toBe(true);
  });
});
