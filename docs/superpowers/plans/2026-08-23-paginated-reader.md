# Paginated Glossary Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the confirmed macOS Obsidian EPUB reader with one-page pagination, persistent local word glosses, dictionary detail cards, progress, and safe link navigation.

**Architecture:** `main.ts` registers one concrete `FileView`; `epub-view.ts` owns the `epubjs` book, paginated rendition, toolbar, ToC, progress, and link history; small pure modules handle state, word ranges, and dictionary lookup. The original EPUB is read-only and all persistent state uses Obsidian `data.json`.

**Tech Stack:** TypeScript, Obsidian API 1.13.1, esbuild, `epubjs` 0.3.93, `csv-parse`, Vitest.

---

## Files

- Create: `manifest.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `styles.css`
- Create: `src/main.ts`, `src/types.ts`, `src/state.ts`, `src/reader-events.ts`, `src/dictionary.ts`, `src/dictionary-data.ts`, `src/epub-view.ts`
- Create: `scripts/build-dictionary.mjs`
- Create: `tests/state.test.ts`, `tests/reader-events.test.ts`, `tests/dictionary.test.ts`
- Modify: `README.md`

### Task 1: Scaffold and prove the test runner

- [ ] Add `manifest.json` with id `glossary-reader`, version `0.1.0`, `minAppVersion` `1.7.2`, and `isDesktopOnly: true`.
- [ ] Add `package.json` with `epubjs@0.3.93`, `csv-parse@7.0.2`, `obsidian@^1.13.1`, TypeScript, esbuild, and Vitest; scripts are `dev`, `build`, `test`, and `test:watch`.
- [ ] Add strict TypeScript and official-sample-style esbuild configuration with `obsidian`, `electron`, and CodeMirror packages externalized.
- [ ] Add an empty `GlossaryReaderPlugin extends Plugin` entrypoint and scoped reader shell CSS.
- [ ] Run `npm install`, `npm test`, and `npm run build`; expected result is 0 tests, 0 failures, and a generated `main.js`.
- [ ] Commit `chore: scaffold glossary reader plugin`.

### Task 2: Implement state with tests first

- [ ] Write tests proving absent data gets version-2 defaults, a path rename moves state, and reset operations remove only the selected book.
- [ ] Run `npm test -- tests/state.test.ts`; verify the tests fail because `src/state.ts` is absent.
- [ ] Implement `PluginData`, `BookState`, `SavedGloss`, `PluginStateStore.load()`, `book()`, `renameBook()`, `resetBook()`, `cleanupMissingBooks()`, `queueSave()`, and `flush()`.
- [ ] Run the focused tests and then the full suite; expected result is green.
- [ ] Commit `feat: persist reader state`.

### Task 3: Implement word extraction and dictionary lookup with tests first

- [ ] Write tests for punctuation trimming, caret-to-word extraction, exact dictionary lookup, lemma fallback, and unknown-word `null`.
- [ ] Run both focused test files and verify they fail for missing modules.
- [ ] Implement `normalizeWord()`, `wordAtOffset()`, and `rangeAtPoint()` using the chapter document caret range without relying on cross-iframe `instanceof` checks.
- [ ] Add `scripts/build-dictionary.mjs` using `csv-parse/sync` to generate a deterministic compact `src/dictionary-data.ts`; retain word, phonetic, translation, definition, and lemma/exchange fields only.
- [ ] Implement exact lookup followed by ECDICT lemma fallback in `src/dictionary.ts`.
- [ ] Run focused tests and `npm run build`; expected result is green.
- [ ] Commit `feat: add offline word lookup`.

### Task 4: Implement the concrete paginated Obsidian view

- [ ] Write a view smoke test for the registered view type and a manual checklist entry for opening both Vault fixtures.
- [ ] Implement `EpubView extends FileView`: `getViewType()`, `getDisplayText()`, `getIcon()`, `onLoadFile()`, `onUnloadFile()`, and `onClose()`.
- [ ] In `onLoadFile()`, read `app.vault.readBinary(file)`, call `ePub(bytes)`, render with `flow: "paginated"`, `spread: "none"`, `allowScriptedContent: false`, and display the saved CFI.
- [ ] Inject stable white-page CSS into the rendition, including responsive `img`/`svg` and ruby gloss rules.
- [ ] Add toolbar buttons for return, ToC, previous, next, font down, font up, and percentage; use `rendition.prev()`/`next()` and focused Left/Right keys.
- [ ] Generate book locations after initial display and update the percentage from `relocated` events.
- [ ] Register the view and `.epub` extension from `main.ts`, register vault rename handling, and flush state on unload.
- [ ] Run `npm run build` and manually open `The Principles of Psychology` in the test Vault.
- [ ] Commit `feat: render paginated epub view`.

### Task 5: Add persistent glosses, detail cards, ToC, and links

- [ ] Write tests for a gloss key, duplicate gloss prevention, and removing one gloss without removing another.
- [ ] Run the focused tests and verify failure before implementation.
- [ ] Bind chapter-local click and double-click handlers through the rendition's rendered-content hook.
- [ ] On a word click, exact/lemma lookup, create a CFI-backed record, wrap the source range in `ruby`/`rt`, and save; clicking an existing `rt` removes that record.
- [ ] On double-click, save if needed and fill an outer-view detail card using `textContent` with word, IPA, full Chinese, and English definitions.
- [ ] On chapter render, resolve saved CFIs and restore all glosses for that chapter; after insertion, redisplay the clicked CFI.
- [ ] Build the temporary ToC drawer from `book.navigation.toc`; selecting an item calls `rendition.display()` and closes it.
- [ ] Push internal-link CFIs to an in-memory history stack and implement return-to-text; confirm external links before calling Obsidian's external-link helper.
- [ ] Add command-palette reset/cleanup commands with confirmation notices.
- [ ] Run the full unit suite and manually verify both fixtures, restart recovery, font reflow, links, and offline lookup.
- [ ] Commit `feat: persist glosses and navigation`.

### Task 6: Verify and deploy

- [ ] Add `docs/manual-test-checklist.md` with the confirmed acceptance cases.
- [ ] Run `npm test`, `npm run build`, and `npm run lint` if linting is added by the scaffold.
- [ ] Copy `main.js`, `manifest.json`, and `styles.css` into a clean test vault plugin directory and repeat the checklist.
- [ ] Update README installation instructions and record the tested Obsidian version.
- [ ] Commit `docs: add plugin verification checklist`.
- [ ] Push `feat/implement-reader` to GitHub and report the branch URL; do not merge into `main` until the user reviews the working build.

## Self-review

- Coverage: every confirmed requirement is addressed by Tasks 2–6; no mobile, Markdown export, cloud, phrase translation, or separate library work is included.
- Placeholder scan: this plan contains no TODO/TBD steps; commands, filenames, and expected verification results are explicit.
- Type consistency: `PluginData` version 2 and `BookState` are shared by state and view; all page locations use CFI strings, not page-number assumptions.
