# Glossary Reader

Glossary Reader is a personal macOS Obsidian desktop plugin for reading DRM-free, reflowable English EPUB books without leaving the original text to look up words.

The project is intentionally scoped as an Obsidian plugin. It is not a reusable reader engine, standalone application, cloud service, or cross-platform framework.

## Core experience

- Open an `.epub` file directly inside Obsidian.
- Read one paginated page at a time with keyboard and button navigation.
- Use all keyboard arrow keys: Left/Up for previous page and Right/Down for next page.
- Preserve the current reading position and show whole-book progress.
- Adapt the rendition when the Obsidian pane or app zoom changes, without stretching or losing book images.
- Click an English word to save and show a short Chinese gloss below it.
- Double-click a word to show all available local Chinese and English senses.
- Keep saved glosses attached after reopening the book or changing layout.
- Work offline and keep the original EPUB unchanged.

## First release boundary

- Target: the current macOS Obsidian desktop app, for personal use only.
- Supported books: DRM-free, reflowable EPUB files stored in the active vault.
- Storage: Obsidian plugin `data.json`.
- Dictionary: bundled ECDICT English-Chinese data; exact lookup first, then lemma fallback.
- No PDF, DRM bypass, cloud sync, accounts, telemetry, or network translation.

The glosses and the “全部释义” card come from the bundled ECDICT dataset. The reader now shows the available senses in a clearer format, but an offline dictionary cannot guarantee that every context-specific translation is perfect.

## Design documents

- [Confirmed product specification](docs/confirmed-product-spec.md)
- [Architecture](docs/architecture.md)
- [Earlier implementation plan (superseded)](docs/superpowers/plans/2026-08-23-obsidian-epub-plugin.md)

## Status

Core implementation is present on `feat/implement-reader`; manual Obsidian verification is still required.

## Local development

```bash
npm install
npm run build:dictionary
npm test
npm run build
```

For a local test vault, copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/glossary-reader/`, enable the plugin, and open an EPUB from the Vault. See the [manual checklist](docs/manual-test-checklist.md).

The generated dictionary is derived from ECDICT; see [third-party notices](THIRD-PARTY-NOTICES.md).
