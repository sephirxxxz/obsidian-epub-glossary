# Glossary Reader confirmed product specification

## Product promise

Glossary Reader lets one read a DRM-free English EPUB in Obsidian and understand an unfamiliar word without leaving the page. A click places and saves one short Chinese gloss under the original word; a double-click opens a full local dictionary card.

Obsidian is the host application only. The plugin does not create Markdown vocabulary notes, a book-library page, a cloud account, or a separate reader application.

## User and platform

- One user: the repository owner.
- One platform: the current macOS Obsidian desktop application.
- Source files: only `.epub` files already inside the active Vault.
- Supported documents: DRM-free, reflowable EPUBs.
- Primary acceptance fixtures: `The Principles of Psychology` for English reading; the three path-distinct copies of `影响力` for independent-state testing.

## Reading experience

| Area | Confirmed behavior |
| --- | --- |
| Page model | One page at a time, with no automatic two-page spread. |
| Appearance | A stable white paper page with a plugin-controlled serif font, line height, margins, and image rules. Keep semantic source formatting such as headings, bold, and italics. |
| Navigation | Previous/next buttons and Left/Right arrow keys while the reader is focused. |
| Toolbar | Return to text, table of contents, previous page, next page, font size down, font size up, and whole-book percentage. |
| Table of contents | Opens as a temporary left drawer inside the reader and closes after selecting a chapter. |
| Links | Book-internal links navigate inside the reader. The toolbar returns to the prior internal location. External links require confirmation before opening in the system browser. |
| Progress | Save the current EPUB CFI on relocation. Generate locations in the background, showing `—` until a whole-book percentage is available. |
| Font size | One global setting shared by every book. Before changing size, save the current CFI and display it again after pagination settles. |

`EPUB CFI` (Canonical Fragment Identifier) is an address inside an EPUB. It is used instead of a page number because page numbers change when the font size changes.

## Word interaction

| Action | Confirmed behavior |
| --- | --- |
| Single click on one English word | Look up the word locally and immediately save/show a short Chinese gloss. |
| Single click on an existing gloss | Delete that one saved gloss. |
| Double click | Save the short gloss if needed, then open a detail card. |
| Detail card | Word, IPA pronunciation, complete Chinese explanation, and English explanation. |
| Lookup order | Exact normalized word first; if absent, use its lemma, meaning the dictionary form such as `give` for `gave`. |
| Unknown word | Show a temporary `未收录`; do not save it. |
| Scope | Single words only. No phrase lookup, sentence translation, audio, examples, or spaced-repetition functions. |
| Short gloss | The first concise Chinese ECDICT meaning. Full text belongs only in the detail card. |
| Persistence | All saved glosses on a rendered page appear automatically as small Chinese text under the English word. |

The gloss must be part of the text flow. Re-pagination is acceptable, but after a word is clicked the reader must return the clicked word to view.

## State and maintenance

The sole persistent store is Obsidian plugin `data.json`.

```ts
type PluginData = {
  version: 2;
  fontSizePercent: number;
  books: Record<string, {
    progress?: { cfi: string; percentage?: number; updatedAt: string };
    glosses: Record<string, {
      cfi: string;
      surface: string;
      lookup: string;
      shortZh: string;
      detailZh: string;
      detailEn: string;
      ipa: string;
      createdAt: string;
    }>;
  }>;
};
```

- Each Vault-relative EPUB path owns independent progress and glosses, even when files have the same content.
- Renaming an EPUB moves its state to the new path.
- Deleting an EPUB does not delete state automatically.
- The command palette provides: clear current-book progress, clear current-book glosses, and clean state for paths that no longer exist. Each destructive command requires confirmation.

## Security, privacy, and exclusions

- Scripted EPUB content remains disabled.
- No network translation, telemetry, cloud sync, accounts, or external text upload.
- The original EPUB is never modified.
- No PDF, DRM bypass, mobile support, public plugin-market release, standalone reader, Markdown-note export, separate book library, highlighting, or general annotation system.

## Definition of done

On macOS Obsidian, the reader can open either fixture from the Vault, render images safely, use single-page navigation and the table of contents, restore the prior location after restart, calculate progress in the background, maintain location through font changes, persist/delete word glosses, display details on double-click, handle internal/external links safely, and work without network access.
