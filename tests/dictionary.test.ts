import { describe, expect, it } from "vitest";
import { lookupWord } from "../src/dictionary";

describe("lookupWord", () => {
  it("returns the exact local entry", () => {
    expect(lookupWord("example")).toEqual({
      word: "example",
      ipa: "ig'zæmpl",
      shortZh: "例子",
      detailZh: "n. 例子, 样本, 实例\n[化] 实例",
      detailEn: "n. an item of information that is typical of a class or group\nn. punishment intended as a warning to others"
    });
  });

  it("falls back to a lemma for an inflected form", () => {
    expect(lookupWord("gave")?.word).toBe("give");
  });

  it("returns null for an unknown word", () => {
    expect(lookupWord("notawordinthefixture")).toBeNull();
  });
});
