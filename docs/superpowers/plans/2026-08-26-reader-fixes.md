# Reader Interaction and Dictionary Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make EPUB navigation reliable with all keyboard arrow keys, make the reader respond to Obsidian view resizing/zooming, and present complete dictionary senses on double-click.

**Architecture:** Keep `EpubView` as the integration boundary, but move navigation decisions into a pure helper and make all navigation calls pass through one guarded async method. Observe the reader host size and resize the epubjs rendition while preserving its current CFI. Keep the bundled offline ECDICT source, but render every Chinese and English sense as readable individual lines in the detail card.

**Tech Stack:** TypeScript, epubjs 0.3.93, Obsidian API, Vitest/jsdom.

---

## Root-cause findings

- Keyboard handling is only registered on the outer `contentEl`; key events originating inside the rendition iframe do not bubble into that element.
- `rendition.next()` and `rendition.prev()` are called without an error boundary or a single-flight guard. epubjs uses an internal queue; a rejected queued operation can leave later operations waiting forever.
- The reader host uses `height: 100%` beside a toolbar and has no `ResizeObserver`, so an Obsidian zoom or pane-size change can leave epubjs's stage using stale dimensions.
- The dictionary detail card renders raw multiline strings in two paragraphs. The data contains all available ECDICT lines, but the UI does not label or format each sense as a complete entry.

## Files

- Create: `src/navigation.ts`
- Create: `tests/navigation.test.ts`
- Modify: `src/epub-view.ts`
- Modify: `src/dictionary.ts`
- Modify: `src/types.ts`
- Modify: `styles.css`
- Modify: `tests/dictionary.test.ts`
- Modify: `docs/manual-test-checklist.md`

### Task 1: Navigation behavior

- [x] Write failing tests proving Left/Up map to previous, Right/Down map to next, and editable controls do not navigate.
- [x] Implement the pure key mapping helper and use it from both the outer view and each rendered EPUB document.
- [x] Add a single guarded navigation method that ignores repeated requests while one page turn is active, catches errors, and always releases the guard.
- [x] Run the focused navigation tests and the full unit suite.

### Task 2: Resize and zoom adaptation

- [x] Write a testable size helper that ignores zero dimensions and only emits a resize when dimensions change.
- [x] Attach a `ResizeObserver` to the reader host, call `rendition.resize(width, height)`, and disconnect it during teardown.
- [x] Change the host CSS to a flex column with a flexible content region and make iframe body sizing responsive instead of relying on fixed page dimensions.
- [x] Run the full unit suite and build.

### Task 3: Complete dictionary display

- [x] Write tests proving dictionary entries expose all non-empty Chinese and English sense lines and preserve the source word/lemma.
- [x] Normalize dictionary display lines in `dictionary.ts` without inventing translations or making network requests.
- [x] Change double-click UI labels to “全部释义” and render labeled Chinese/English sense lists using `textContent`.
- [x] Run dictionary tests, the full unit suite, and build.

### Task 4: Verify and deploy

- [ ] Update the manual checklist for all four arrow keys, resize/zoom, repeated navigation, and complete-sense display.
- [ ] Run `npm test`, `npm run build`, and `npm audit --omit=dev`.
- [ ] Copy rebuilt plugin files into the user's Vault plugin directory and push the changes to `feat/implement-reader`.
