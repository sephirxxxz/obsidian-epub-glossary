# Superseded implementation plan

> This plan was written before the paginated-reader design interview. Do not execute it. The authoritative requirements are now in [the confirmed product specification](../../confirmed-product-spec.md) and [architecture document](../../architecture.md). A new implementation plan must be generated from those confirmed documents immediately before code work begins.

# Glossary Reader Implementation Plan (superseded)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop Obsidian plugin that opens vault EPUB files, preserves reading progress, and supports persistent offline English-Chinese glosses.

**Architecture:** Register `.epub` as a concrete Obsidian `FileView`, pass vault binary data directly to `epubjs`, and store settings, progress, and glosses through the plugin data API. Use plain TypeScript and DOM APIs; do not add a UI framework, backend, database, or replaceable abstraction layers.

**Tech Stack:** TypeScript, Obsidian API 1.13.1, esbuild, epubjs 0.3.93, Vitest, plain CSS.

---

## File map

- `manifest.json`: plugin ID, version, minimum Obsidian version, desktop-only flag.
- `package.json`: build, test, lint, and development dependencies.
- `tsconfig.json`: strict TypeScript configuration.
- `esbuild.config.mjs`: bundle `src/main.ts` to `main.js`.
- `src/main.ts`: lifecycle, view registration, EPUB extension association, rename handling.
- `src/types.ts`: exact persisted-state types and defaults.
- `src/state.ts`: loading, book-key rename, and debounced persistence.
- `src/epub-view.ts`: file loading, rendition lifecycle, toolbar, progress restore/save.
- `src/reader-events.ts`: word extraction and click/double-click behavior.
- `src/dictionary.ts`: lazy local lookup over the bundled compact dictionary.
- `src/dictionary-data.ts`: generated compact dictionary export.
- `scripts/build-dictionary.mjs`: deterministic ECDICT-to-TypeScript conversion.
- `styles.css`: only plugin-owned reader UI styles.
- `tests/state.test.ts`: state validation and rename behavior.
- `tests/reader-events.test.ts`: word normalization behavior.
- `tests/fixtures/`: small legal EPUB fixtures for manual smoke testing.

### Task 1: Scaffold the Obsidian plugin

**Files:**
- Create: `manifest.json`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.mjs`
- Create: `src/main.ts`
- Create: `styles.css`

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "glossary-reader",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc --noEmit && node esbuild.config.mjs production",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "epubjs": "0.3.93"
  },
  "devDependencies": {
    "@types/node": "^22.15.17",
    "csv-parse": "^7.0.2",
    "esbuild": "^0.25.5",
    "obsidian": "^1.13.1",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Create the Obsidian manifest**

```json
{
  "id": "glossary-reader",
  "name": "Glossary Reader",
  "version": "0.1.0",
  "minAppVersion": "1.7.2",
  "description": "Read EPUB books with persistent offline English-Chinese glosses.",
  "author": "lixiaoran",
  "isDesktopOnly": true
}
```

- [ ] **Step 3: Add strict TypeScript configuration**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "lib": ["DOM", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noImplicitAny": true,
    "strict": true,
    "target": "ES2022",
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 4: Add the esbuild entrypoint**

```js
import esbuild from "esbuild";
import process from "node:process";

const production = process.argv[2] === "production";
const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view"],
  format: "cjs",
  target: "es2022",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js"
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
```

- [ ] **Step 5: Add a loadable plugin entrypoint**

```ts
import { Plugin } from "obsidian";

export default class GlossaryReaderPlugin extends Plugin {
  onload(): void {}
}
```

- [ ] **Step 6: Install dependencies and build**

Run: `npm install && npm run build`

Expected: exit code 0 and a generated `main.js` at the repository root.

- [ ] **Step 7: Commit the scaffold**

```bash
git add manifest.json package.json package-lock.json tsconfig.json esbuild.config.mjs src/main.ts styles.css
git commit -m "chore: scaffold glossary reader plugin"
```

### Task 2: Define and test persisted plugin state

**Files:**
- Create: `src/types.ts`
- Create: `src/state.ts`
- Create: `tests/state.test.ts`

- [ ] **Step 1: Write failing state tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { PluginStateStore } from "../src/state";

describe("PluginStateStore", () => {
  it("uses defaults when saved data is absent", async () => {
    const save = vi.fn(async () => undefined);
    const store = new PluginStateStore(async () => null, save);
    await store.load();
    expect(store.data).toEqual({
      version: 1,
      settings: { fontSizePercent: 100, theme: "light" },
      books: {}
    });
  });

  it("moves book state when an epub is renamed", async () => {
    const store = new PluginStateStore(async () => ({
      version: 1,
      settings: { fontSizePercent: 100, theme: "light" },
      books: { "Books/old.epub": { glosses: {} } }
    }), async () => undefined);
    await store.load();
    store.renameBook("Books/old.epub", "Books/new.epub");
    expect(store.data.books["Books/new.epub"]).toEqual({ glosses: {} });
    expect(store.data.books["Books/old.epub"]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/state.test.ts`

Expected: FAIL because `src/state.ts` does not exist.

- [ ] **Step 3: Define the persisted types**

```ts
export type ReaderTheme = "light" | "dark" | "sepia";

export interface ReadingProgress {
  cfi: string;
  percentage: number;
  updatedAt: string;
}

export interface SavedGloss {
  cfi: string;
  surface: string;
  lemma: string;
  shortZh: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookState {
  progress?: ReadingProgress;
  glosses: Record<string, SavedGloss>;
}

export interface PluginData {
  version: 1;
  settings: { fontSizePercent: number; theme: ReaderTheme };
  books: Record<string, BookState>;
}

export const DEFAULT_DATA: PluginData = {
  version: 1,
  settings: { fontSizePercent: 100, theme: "light" },
  books: {}
};
```

- [ ] **Step 4: Implement the minimal state store**

```ts
import { DEFAULT_DATA, type BookState, type PluginData } from "./types";

type LoadData = () => Promise<unknown>;
type SaveData = (data: PluginData) => Promise<void>;

export class PluginStateStore {
  data: PluginData = structuredClone(DEFAULT_DATA);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly loadData: LoadData, private readonly saveData: SaveData) {}

  async load(): Promise<void> {
    const raw = await this.loadData();
    if (raw && typeof raw === "object" && (raw as { version?: unknown }).version === 1) {
      this.data = raw as PluginData;
    }
  }

  book(path: string): BookState {
    return (this.data.books[path] ??= { glosses: {} });
  }

  renameBook(oldPath: string, newPath: string): void {
    const value = this.data.books[oldPath];
    if (!value || oldPath === newPath) return;
    this.data.books[newPath] = value;
    delete this.data.books[oldPath];
    this.queueSave();
  }

  queueSave(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 500);
  }

  async flush(): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    await this.saveData(this.data);
  }
}
```

- [ ] **Step 5: Run the state tests**

Run: `npm test -- tests/state.test.ts`

Expected: 2 tests pass.

- [ ] **Step 6: Commit state persistence**

```bash
git add src/types.ts src/state.ts tests/state.test.ts
git commit -m "feat: add persisted reader state"
```

### Task 3: Register and render EPUB files

**Files:**
- Create: `src/epub-view.ts`
- Modify: `src/main.ts`
- Modify: `styles.css`

- [ ] **Step 1: Create the concrete EPUB file view**

```ts
import ePub, { type Book, type Rendition } from "epubjs";
import { FileView, type TFile, type WorkspaceLeaf } from "obsidian";
import type GlossaryReaderPlugin from "./main";

export const EPUB_VIEW_TYPE = "glossary-reader-epub";

export class EpubView extends FileView {
  private book: Book | null = null;
  private rendition: Rendition | null = null;
  private readerEl: HTMLDivElement | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: GlossaryReaderPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return EPUB_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.file?.basename ?? "EPUB reader";
  }

  getIcon(): string {
    return "book-open";
  }

  async onLoadFile(file: TFile): Promise<void> {
    await this.destroyReader();
    this.contentEl.empty();
    this.contentEl.addClass("glossary-reader-view");
    const toolbar = this.contentEl.createDiv({ cls: "glossary-reader-toolbar" });
    toolbar.createEl("button", { text: "A−", attr: { "aria-label": "Decrease font size" } })
      .addEventListener("click", () => void this.changeFontSize(-10));
    toolbar.createEl("button", { text: "A+", attr: { "aria-label": "Increase font size" } })
      .addEventListener("click", () => void this.changeFontSize(10));
    this.readerEl = this.contentEl.createDiv({ cls: "glossary-reader-content" });

    const bytes = await this.app.vault.readBinary(file);
    this.book = ePub(bytes);
    this.rendition = this.book.renderTo(this.readerEl, {
      width: "100%",
      height: "100%",
      allowScriptedContent: false
    });
    this.rendition.themes.default({
      "img, svg": { "max-width": "100% !important", height: "auto !important" }
    });
    this.rendition.themes.fontSize(`${this.plugin.state.data.settings.fontSizePercent}%`);

    const saved = this.plugin.state.book(file.path).progress?.cfi;
    await this.rendition.display(saved);
    this.rendition.on("relocated", (location: { start: { cfi: string; percentage?: number } }) => {
      this.plugin.state.book(file.path).progress = {
        cfi: location.start.cfi,
        percentage: location.start.percentage ?? 0,
        updatedAt: new Date().toISOString()
      };
      this.plugin.state.queueSave();
    });
  }

  async onUnloadFile(): Promise<void> {
    await this.destroyReader();
    await this.plugin.state.flush();
  }

  async onClose(): Promise<void> {
    await this.destroyReader();
  }

  private async changeFontSize(delta: number): Promise<void> {
    if (!this.rendition) return;
    const current = this.rendition.currentLocation() as { start?: { cfi?: string } } | undefined;
    const cfi = current?.start?.cfi;
    const settings = this.plugin.state.data.settings;
    settings.fontSizePercent = Math.max(70, Math.min(180, settings.fontSizePercent + delta));
    this.rendition.themes.fontSize(`${settings.fontSizePercent}%`);
    this.plugin.state.queueSave();
    if (cfi) await this.rendition.display(cfi);
  }

  private async destroyReader(): Promise<void> {
    this.rendition?.destroy();
    this.book?.destroy();
    this.rendition = null;
    this.book = null;
    this.readerEl = null;
  }
}
```

- [ ] **Step 2: Wire the view and state into the plugin lifecycle**

```ts
import { Plugin, TFile } from "obsidian";
import { EpubView, EPUB_VIEW_TYPE } from "./epub-view";
import { PluginStateStore } from "./state";

export default class GlossaryReaderPlugin extends Plugin {
  state = new PluginStateStore(() => this.loadData(), (data) => this.saveData(data));

  async onload(): Promise<void> {
    await this.state.load();
    this.registerView(EPUB_VIEW_TYPE, (leaf) => new EpubView(leaf, this));
    this.registerExtensions(["epub"], EPUB_VIEW_TYPE);
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (file instanceof TFile && file.extension === "epub") {
        this.state.renameBook(oldPath, file.path);
      }
    }));
  }

  onunload(): void {
    void this.state.flush();
  }
}
```

- [ ] **Step 3: Add view sizing styles**

```css
.glossary-reader-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 0;
}

.glossary-reader-content {
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
}

.glossary-reader-toolbar {
  border-bottom: 1px solid var(--background-modifier-border);
  display: flex;
  flex: 0 0 auto;
  gap: var(--size-4-1);
  padding: var(--size-4-1);
}
```

- [ ] **Step 4: Build the plugin**

Run: `npm run build`

Expected: TypeScript and esbuild exit 0.

- [ ] **Step 5: Install into a test vault and open a fixture**

Run: `mkdir -p "/absolute/test-vault/.obsidian/plugins/glossary-reader" && cp main.js manifest.json styles.css "/absolute/test-vault/.obsidian/plugins/glossary-reader/"`

Expected: after enabling Glossary Reader, opening a `.epub` file displays its first chapter; reopening the file returns to the saved location.

- [ ] **Step 6: Commit EPUB rendering**

```bash
git add src/main.ts src/epub-view.ts styles.css
git commit -m "feat: render epub files in obsidian"
```

### Task 4: Add test-driven word normalization

**Files:**
- Create: `src/reader-events.ts`
- Create: `tests/reader-events.test.ts`

- [ ] **Step 1: Write failing normalization tests**

```ts
import { describe, expect, it } from "vitest";
import { normalizeWord } from "../src/reader-events";

describe("normalizeWord", () => {
  it.each([
    ["Reader's", "reader's"],
    ["—books—", "books"],
    ["HELLO", "hello"],
    ["123", ""]
  ])("normalizes %s", (input, expected) => {
    expect(normalizeWord(input)).toBe(expected);
  });
});
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- tests/reader-events.test.ts`

Expected: FAIL because `normalizeWord` is not implemented.

- [ ] **Step 3: Implement word normalization**

```ts
export function normalizeWord(input: string): string {
  const trimmed = input.toLowerCase().replace(/^[^a-z]+|[^a-z']+$/g, "");
  return /[a-z]/.test(trimmed) ? trimmed : "";
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- tests/reader-events.test.ts`

Expected: 4 cases pass.

- [ ] **Step 5: Commit normalization**

```bash
git add src/reader-events.ts tests/reader-events.test.ts
git commit -m "feat: normalize clicked reader words"
```

### Task 5: Bundle and query the offline dictionary

**Files:**
- Create: `scripts/build-dictionary.mjs`
- Create: `src/dictionary.ts`
- Generate: `src/dictionary-data.ts`
- Create: `tests/dictionary.test.ts`

- [ ] **Step 1: Write a failing dictionary lookup test**

```ts
import { describe, expect, it } from "vitest";
import { lookupWord } from "../src/dictionary";

describe("lookupWord", () => {
  it("returns the compact local entry", () => {
    expect(lookupWord("example")).toMatchObject({ word: "example" });
  });
  it("returns null for an unknown word", () => {
    expect(lookupWord("notawordinthefixture")).toBeNull();
  });
});
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- tests/dictionary.test.ts`

Expected: FAIL because the dictionary module is absent.

- [ ] **Step 3: Add deterministic dictionary conversion**

```js
import fs from "node:fs";

import { parse } from "csv-parse/sync";

const [, , inputPath = "vendor/ecdict.csv", outputPath = "src/dictionary-data.ts"] = process.argv;
const rows = parse(fs.readFileSync(inputPath, "utf8"), {
  columns: true,
  skip_empty_lines: true
});
const entries = {};

for (const row of rows) {
  const key = row.word?.trim().toLowerCase();
  if (!key || entries[key]) continue;
  entries[key] = [
    row.phonetic?.trim() ?? "",
    row.translation?.trim() ?? "",
    row.definition?.trim() ?? ""
  ];
}

const ordered = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(outputPath, `export const DICTIONARY = ${JSON.stringify(ordered)} as const;\n`);
```

- [ ] **Step 4: Download the licensed source dictionary**

Run: `mkdir -p vendor && curl -L https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.mini.csv -o vendor/ecdict.csv && curl -L https://raw.githubusercontent.com/skywind3000/ECDICT/master/LICENSE -o vendor/ECDICT-LICENSE`

Expected: `vendor/ecdict.csv` starts with the official ECDICT CSV header and `vendor/ECDICT-LICENSE` contains the MIT license.

- [ ] **Step 5: Add the concrete lookup function**

```ts
import { DICTIONARY } from "./dictionary-data";

export interface DictionaryEntry {
  word: string;
  ipa: string;
  shortZh: string;
  detail: string;
}

export function lookupWord(word: string): DictionaryEntry | null {
  const value = (DICTIONARY as Record<string, readonly [string, string, string]>)[word];
  if (!value) return null;
  return { word, ipa: value[0], shortZh: value[1], detail: value[2] };
}
```

- [ ] **Step 6: Generate the data and run tests**

Run: `node scripts/build-dictionary.mjs vendor/ecdict.csv src/dictionary-data.ts && npm test -- tests/dictionary.test.ts`

Expected: the generated module is stable across repeated runs and both tests pass.

- [ ] **Step 7: Commit dictionary support**

```bash
git add scripts/build-dictionary.mjs src/dictionary.ts src/dictionary-data.ts tests/dictionary.test.ts vendor/ECDICT-LICENSE
git commit -m "feat: bundle offline dictionary"
```

### Task 6: Add persistent quick gloss and detail interactions

**Files:**
- Modify: `src/reader-events.ts`
- Modify: `src/epub-view.ts`
- Modify: `styles.css`
- Modify: `tests/reader-events.test.ts`

- [ ] **Step 1: Add a failing range-extraction test**

```ts
import { describe, expect, it } from "vitest";
import { wordAtOffset } from "../src/reader-events";

describe("wordAtOffset", () => {
  it("extracts the word around a text offset", () => {
    expect(wordAtOffset("Read better books.", 13)).toEqual({ surface: "books", start: 12, end: 17 });
  });
});
```

- [ ] **Step 2: Verify the new test fails**

Run: `npm test -- tests/reader-events.test.ts`

Expected: FAIL because `wordAtOffset` is absent.

- [ ] **Step 3: Implement extraction around the clicked offset**

```ts
export function wordAtOffset(text: string, offset: number): { surface: string; start: number; end: number } | null {
  const isWord = (character: string): boolean => /[A-Za-z']/.test(character);
  let start = Math.min(offset, text.length);
  let end = start;
  while (start > 0 && isWord(text[start - 1] ?? "")) start -= 1;
  while (end < text.length && isWord(text[end] ?? "")) end += 1;
  const surface = text.slice(start, end);
  return surface ? { surface, start, end } : null;
}
```

- [ ] **Step 4: Resolve a click to the word under the pointer**

```ts
export function rangeAtPoint(document: Document, x: number, y: number): Range | null {
  const documentWithCaret = document as Document & {
    caretRangeFromPoint?: (clientX: number, clientY: number) => Range | null;
  };
  const caret = documentWithCaret.caretRangeFromPoint?.(x, y) ?? null;
  const node = caret?.startContainer;
  if (!caret || !node || node.nodeType !== 3) return null;
  const textNode = node as Text;
  const match = wordAtOffset(textNode.data, caret.startOffset);
  if (!match) return null;
  const range = document.createRange();
  range.setStart(textNode, match.start);
  range.setEnd(textNode, match.end);
  return range;
}
```

- [ ] **Step 5: Register chapter-document events from `EpubView`**

For each `rendered` event, bind the listener to that chapter document. The click handler uses the pointer coordinates and never requires a prior text selection:

```ts
const onClick = (event: MouseEvent): void => {
  const range = rangeAtPoint(contents.document, event.clientX, event.clientY);
  if (!range || !file) return;
  const surface = range.toString();
  const lemma = normalizeWord(surface);
  const entry = lookupWord(lemma);
  if (!entry) return;
  const cfi = contents.cfiFromRange(range);
  const now = new Date().toISOString();
  const key = `${cfi}::${lemma}`;
  const existing = plugin.state.book(file.path).glosses[key];
  plugin.state.book(file.path).glosses[key] = {
    cfi,
    surface,
    lemma,
    shortZh: entry.shortZh,
    detail: entry.detail,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  plugin.state.queueSave();
  renderInlineGloss(contents.document, range, entry.shortZh, key);
};

contents.document.addEventListener("click", onClick);
contents.on("unload", () => contents.document.removeEventListener("click", onClick));
```

Do not register listeners on the Obsidian document and do not use global event handlers.

- [ ] **Step 6: Render the quick gloss and detail card**

Create inline elements only inside the EPUB iframe:

```ts
export function renderInlineGloss(document: Document, sourceRange: Range, text: string, key: string): void {
  if (document.querySelector(`[data-glossary-key="${CSS.escape(key)}"]`)) return;
  const gloss = document.createElement("span");
  gloss.className = "glossary-reader-inline-gloss";
  gloss.dataset.glossaryKey = key;
  gloss.textContent = text;
  const insertion = sourceRange.cloneRange();
  insertion.collapse(false);
  insertion.insertNode(gloss);
}
```

Create the detail card under `EpubView.contentEl` so it uses Obsidian theme variables and cannot be clipped by the EPUB iframe. Populate it with `textContent`, never `innerHTML`.

```ts
private showDetail(word: string, ipa: string, detail: string): void {
  this.contentEl.querySelector(".glossary-reader-detail")?.remove();
  const card = this.contentEl.createDiv({ cls: "glossary-reader-detail" });
  card.createEl("strong", { text: word });
  if (ipa) card.createEl("div", { text: `/${ipa}/` });
  card.createEl("p", { text: detail });
  const close = card.createEl("button", { text: "Close" });
  close.addEventListener("click", () => card.remove());
}
```

Register a `dblclick` handler beside `onClick`:

```ts
const onDoubleClick = (event: MouseEvent): void => {
  const range = rangeAtPoint(contents.document, event.clientX, event.clientY);
  if (!range) return;
  const entry = lookupWord(normalizeWord(range.toString()));
  if (entry) this.showDetail(entry.word, entry.ipa, entry.detail);
};

contents.document.addEventListener("dblclick", onDoubleClick);
contents.on("unload", () => contents.document.removeEventListener("dblclick", onDoubleClick));
```

- [ ] **Step 7: Restore saved glosses whenever a chapter renders**

```ts
for (const [key, saved] of Object.entries(plugin.state.book(file.path).glosses)) {
  try {
    const range = contents.range(saved.cfi);
    if (range) renderInlineGloss(contents.document, range, saved.shortZh, key);
  } catch {
    // The CFI belongs to another chapter or is no longer resolvable in this file.
  }
}
```

- [ ] **Step 8: Inject iframe styles and add scoped outer styles**

Add the inline-gloss rule to `rendition.themes.default(...)`, because outer plugin CSS does not cross the iframe boundary:

```ts
this.rendition.themes.default({
  "img, svg": { "max-width": "100% !important", height: "auto !important" },
  ".glossary-reader-inline-gloss": {
    color: "#7c5cff",
    "font-size": "0.78em",
    "margin-inline-start": "0.3em"
  }
});
```

Keep only the outer detail-card rule in `styles.css`:

```css
.glossary-reader-detail {
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-s);
  max-width: 28rem;
  padding: var(--size-4-3);
  position: absolute;
  right: var(--size-4-3);
  top: var(--size-4-3);
  z-index: var(--layer-popover);
}
```

- [ ] **Step 9: Run unit tests and build**

Run: `npm test && npm run build`

Expected: all tests pass and the production bundle builds.

- [ ] **Step 10: Commit interactions**

```bash
git add src/reader-events.ts src/epub-view.ts styles.css tests/reader-events.test.ts
git commit -m "feat: persist inline word glosses"
```

### Task 7: Verify the complete plugin in Obsidian

**Files:**
- Create: `docs/manual-test-checklist.md`
- Modify: `README.md`

- [ ] **Step 1: Write the manual checklist**

```markdown
# Manual test checklist

- [ ] Enable the plugin in a clean test vault without console errors.
- [ ] Open a DRM-free reflowable EPUB from the vault.
- [ ] Navigate across at least three chapters.
- [ ] Verify raster images and SVG images preserve aspect ratio.
- [ ] Close the EPUB tab, reopen it, and verify the saved CFI resumes correctly.
- [ ] Click a known English word and verify the short Chinese gloss appears.
- [ ] Double-click the same word and verify the detail card appears.
- [ ] Change font size and verify the visible passage remains stable.
- [ ] Restart Obsidian and verify progress and glosses return.
- [ ] Disconnect the network and repeat lookup to verify offline behavior.
- [ ] Open an EPUB containing scripts and verify the scripts do not execute.
```

- [ ] **Step 2: Run automated verification**

Run: `npm test && npm run build`

Expected: all unit tests pass and the build exits 0.

- [ ] **Step 3: Complete every manual check with the actual macOS Obsidian app**

Expected: every box in `docs/manual-test-checklist.md` is checked. Record the Obsidian version and fixture filenames at the bottom of the document.

- [ ] **Step 4: Update README installation instructions with the real test-vault path**

Document the three required installed files: `main.js`, `manifest.json`, and `styles.css`.

- [ ] **Step 5: Commit verification documentation**

```bash
git add README.md docs/manual-test-checklist.md
git commit -m "docs: add plugin verification checklist"
```
