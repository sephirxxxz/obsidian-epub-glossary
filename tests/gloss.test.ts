import { describe, expect, it } from "vitest";
import { glossKey, insertGloss, removeGloss } from "../src/reader-events";

describe("gloss DOM helpers", () => {
  it("creates a stable key from a CFI and lookup word", () => {
    expect(glossKey("epubcfi(/6/2!/4/2)", "example")).toBe("epubcfi(/6/2!/4/2)::example");
  });

  it("wraps the selected word with a ruby gloss", () => {
    const root = document.createElement("p");
    root.textContent = "Read example today.";
    const range = document.createRange();
    range.setStart(root.firstChild!, 5);
    range.setEnd(root.firstChild!, 12);

    insertGloss(range, "例子", "cfi::example");

    expect(root.querySelector("ruby rb")?.textContent).toBe("example");
    expect(root.querySelector("ruby rt")?.textContent).toBe("例子");
    expect(root.querySelector("ruby")?.dataset.glossKey).toBe("cfi::example");
  });

  it("removes only the selected gloss and restores source text", () => {
    const root = document.createElement("p");
    root.innerHTML = '<ruby class="glossary-reader-decoration" data-gloss-key="a"><rb>example</rb><rt>例子</rt></ruby> book';
    document.body.append(root);

    expect(removeGloss(root.ownerDocument, "a")).toBe(true);
    expect(root.textContent).toBe("example book");
    expect(removeGloss(root.ownerDocument, "missing")).toBe(false);
  });
});
