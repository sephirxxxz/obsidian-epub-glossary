# Glossary Reader architecture

## Architecture decision

Build a single concrete macOS Obsidian plugin. It directly uses Obsidian's `FileView`, `Plugin.loadData()`/`saveData()`, and `epubjs`; it contains no generic renderer, storage, dictionary-provider, service, or UI-framework abstraction.

| Concern | Choice |
| --- | --- |
| Host | Obsidian desktop plugin |
| Language and build | TypeScript and esbuild, following the official sample-plugin build shape |
| EPUB engine | `epubjs` 0.3.93 |
| View | One `EpubView extends FileView` registered for the `epub` extension |
| Reader layout | `epubjs` paginated flow, single-page spread, fixed white reader styling |
| UI | Obsidian helpers and plain DOM |
| Persistent state | Plugin `data.json` only |
| Dictionary | A compact ECDICT subset bundled into `main.js` |
| Test strategy | Vitest for pure state/word functions; manual macOS Obsidian checks for EPUB rendering |

## Runtime

```text
main.ts
  -> registers EpubView and the .epub extension
  -> creates command-palette maintenance commands

EpubView
  -> reads a Vault TFile with vault.readBinary()
  -> creates epubjs Book and paginated Rendition
  -> owns the toolbar, table-of-contents drawer, detail card, and link history
  -> saves relocation CFIs and restores saved glosses after each chapter render

chapter iframe handlers
  -> resolve a click to one word and a CFI range
  -> dictionary lookup and ruby-style gloss insertion/removal
  -> double-click detail display
```

The chapter iframe is the isolated document that `epubjs` uses to display each EPUB section. Its styling and event listeners must be installed through `epubjs`, not through outer `styles.css`.

## Source layout

```text
src/main.ts             Lifecycle, extension/view registration, commands, vault rename handling
src/epub-view.ts        FileView, page renderer, toolbar, ToC, link history, detail card
src/reader-events.ts    Click-to-word range resolution and ruby gloss DOM helpers
src/dictionary.ts       Exact and lemma-fallback lookup
src/dictionary-data.ts  Generated compact ECDICT data
src/state.ts            Version-2 data loading, debounced save, rename, cleanup, reset
src/types.ts            PluginData and book/gloss types
scripts/build-dictionary.mjs
tests/state.test.ts
tests/reader-events.test.ts
tests/dictionary.test.ts
styles.css              Reader shell, toolbar, ToC drawer, detail card
```

## Rendering and page state

`EpubView.onLoadFile(file)` performs these steps:

1. Read the Vault EPUB as an `ArrayBuffer` using `app.vault.readBinary(file)`.
2. Open it with `epubjs`, render with paginated flow and one-page spread, and set `allowScriptedContent: false`.
3. Apply the fixed reader stylesheet to the iframe: white background, serif body text, consistent margins/line height, responsive `img`/`svg`, and ruby gloss formatting.
4. Display the saved CFI if one exists; otherwise display the first page.
5. Start `book.locations.generate()` after the first display, so the book opens before percentage calculation is complete.
6. On every `relocated` event, save the current CFI and any available percentage.
7. On every chapter render, attach local interaction handlers and restore saved glosses for ranges resolvable in that chapter.

Before a font change or gloss insertion, capture the visible CFI. Apply the DOM/layout change and display that CFI again once `epubjs` finishes pagination. This is how the reader honors the requirement that the clicked passage remains visible even though a gloss changes page flow.

## Word and gloss behavior

The click handler uses the chapter document's caret range at the mouse coordinate. It expands that caret to a single alphabetic word and asks `contents.cfiFromRange(range)` for the word location.

The source word is wrapped in a `ruby` element whose `rt` child holds the compact Chinese gloss. Ruby is the native HTML pattern for small text below a word. The wrapper carries the saved gloss key and the `epubjs` CFI parser is configured to ignore reader-decoration classes when calculating locations.

When a user clicks an existing `rt` gloss, the handler removes the DOM decoration and deletes that record. A double-click follows the normal lookup path, ensures the short gloss exists, and fills an outer-reader detail card with safe `textContent` calls. No EPUB markup is copied into the card.

## Navigation

- `rendition.prev()` and `rendition.next()` power buttons and focused Left/Right keys.
- The table of contents uses `book.navigation.toc`; choosing an item calls `rendition.display(href)` and closes the drawer.
- Internal links push the current CFI onto a per-view in-memory history stack before navigation. The return button pops and displays that CFI.
- An external URL triggers confirmation, then opens through Obsidian's external-link mechanism. No external link opens automatically.

History is deliberately not persisted: reopening a book restores the last reading location, not a temporary link trail.

## State

State is version 2 as defined in [the confirmed specification](confirmed-product-spec.md). The book key is the Vault-relative path. `state.ts` debounces writes for 500 milliseconds, flushes pending writes when the view unloads, migrates a rename event, and exposes the three confirmed maintenance commands.

The plugin keeps state after EPUB deletion to make Obsidian Trash recovery safe. The explicit cleanup command compares stored paths with `vault.getFiles()` and deletes only missing-path records after confirmation.

## Dictionary build

Use the MIT-licensed ECDICT CSV source. The build script parses quoted CSV safely, retains only the fields required by the confirmed specification, filters to the chosen compact subset, and generates `src/dictionary-data.ts` deterministically. At runtime, lookup checks the normalized source token first and then its ECDICT lemma mapping. There is no network fallback.

## Security and privacy

- `allowScriptedContent` remains `false`.
- Never use remote translation or transmit EPUB text.
- Never manually rewrite EPUB archive resources unless a test fixture proves an `epubjs` failure.
- Keep every DOM event listener scoped to the current chapter iframe or the current view; destroy rendition/book/listeners on file unload and view close.

## Verification fixtures

Run the manual test checklist against:

- `ob/psychology/The Principles of Psychology (The Complete Two-Volume Edition) (William James) (z-library.sk, 1lib.sk, z-lib.sk).epub` — English word interactions and a long book.
- The three distinct Vault paths for `影响力` — verify that each path retains separate progress and gloss state.

## Primary references

- [Obsidian plugin API types](https://github.com/obsidianmd/obsidian-api)
- [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Obsidian Vault API guidance](https://docs.obsidian.md/Plugins/Vault)
- [epub.js](https://github.com/futurepress/epub.js)
- [ECDICT source and MIT license](https://github.com/skywind3000/ECDICT)
