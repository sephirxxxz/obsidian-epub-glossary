import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PLUGIN_DATA, PluginStateStore } from "../src/state";

describe("PluginStateStore", () => {
  it("loads version 2 defaults when plugin data is absent", async () => {
    const store = new PluginStateStore(async () => null, async () => undefined);
    await store.load();
    expect(store.data).toEqual(DEFAULT_PLUGIN_DATA);
  });

  it("moves one book state when its Vault path changes", async () => {
    const store = new PluginStateStore(async () => ({
      version: 2,
      fontSizePercent: 100,
      books: { "old/book.epub": { glosses: {} } }
    }), async () => undefined);
    await store.load();

    store.renameBook("old/book.epub", "new/book.epub");

    expect(store.data.books["old/book.epub"]).toBeUndefined();
    expect(store.data.books["new/book.epub"]).toEqual({ glosses: {} });
  });

  it("resets only the selected book", async () => {
    const save = vi.fn(async () => undefined);
    const store = new PluginStateStore(async () => ({
      version: 2,
      fontSizePercent: 100,
      books: {
        "a.epub": { progress: { cfi: "a", updatedAt: "now" }, glosses: {} },
        "b.epub": { progress: { cfi: "b", updatedAt: "now" }, glosses: {} }
      }
    }), save);
    await store.load();

    store.resetBook("a.epub");

    expect(store.data.books["a.epub"]).toBeUndefined();
    expect(store.data.books["b.epub"]).toBeDefined();
    expect(save).not.toHaveBeenCalled();
  });

  it("clears progress and glosses independently", async () => {
    const store = new PluginStateStore(async () => ({
      version: 2,
      fontSizePercent: 100,
      books: {
        "book.epub": {
          progress: { cfi: "a", updatedAt: "now" },
          glosses: { "a::example": { cfi: "a", surface: "example", lookup: "example", shortZh: "例子", detailZh: "例子", detailEn: "instance", ipa: "", createdAt: "now" } }
        }
      }
    }), async () => undefined);
    await store.load();

    store.clearBookProgress("book.epub");
    expect(store.data.books["book.epub"].progress).toBeUndefined();
    expect(Object.keys(store.data.books["book.epub"].glosses)).toHaveLength(1);

    store.clearBookGlosses("book.epub");
    expect(store.data.books["book.epub"].glosses).toEqual({});
  });
});
