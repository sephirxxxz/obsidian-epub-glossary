import { describe, expect, it, vi } from "vitest";
import { createNavigationRunner, isEditableTarget, navigationDirection } from "../src/navigation";

describe("navigationDirection", () => {
  it.each([
    ["ArrowLeft", "prev"],
    ["ArrowUp", "prev"],
    ["ArrowRight", "next"],
    ["ArrowDown", "next"]
  ] as const)("maps %s to %s", (key, expected) => {
    expect(navigationDirection(key)).toBe(expected);
  });

  it("ignores unrelated keys", () => {
    expect(navigationDirection("PageDown")).toBeNull();
  });
});

describe("isEditableTarget", () => {
  it("recognizes controls but not normal text", () => {
    const button = document.createElement("button");
    const paragraph = document.createElement("p");
    expect(isEditableTarget(button)).toBe(true);
    expect(isEditableTarget(paragraph)).toBe(false);
  });
});

describe("createNavigationRunner", () => {
  it("allows only one in-flight page turn and releases the guard after errors", async () => {
    let release!: () => void;
    const navigate = vi.fn((direction: "prev" | "next") => {
      if (direction === "next") return new Promise<void>((resolve) => {
        release = resolve;
      });
      return Promise.resolve();
    });
    const run = createNavigationRunner(navigate);

    const first = run("next");
    const second = run("prev");
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("next");

    release();
    await first;
    await second;

    await run("prev");
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenLastCalledWith("prev");
  });

  it("swallows a rejected turn and permits the next one", async () => {
    const navigate = vi.fn()
      .mockRejectedValueOnce(new Error("render failed"))
      .mockResolvedValueOnce(undefined);
    const run = createNavigationRunner(navigate);

    await run("next");
    await run("next");

    expect(navigate).toHaveBeenCalledTimes(2);
  });
});
