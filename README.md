# Glossary Reader

Glossary Reader is a personal macOS Obsidian desktop plugin for reading DRM-free, reflowable English EPUB books without leaving the original text to look up words.

The project is intentionally scoped as an Obsidian plugin. It is not a reusable reader engine, standalone application, cloud service, or cross-platform framework.

## Core experience

- Open an `.epub` file directly inside Obsidian.
- Read one paginated page at a time with keyboard and button navigation.
- Preserve the current reading position and show whole-book progress.
- Change one global font-size setting without stretching or losing book images.
- Click an English word to save and show a short Chinese gloss below it.
- Double-click a word to open a fuller local dictionary entry.
- Keep saved glosses attached after reopening the book or changing layout.
- Work offline and keep the original EPUB unchanged.

## First release boundary

- Target: the current macOS Obsidian desktop app, for personal use only.
- Supported books: DRM-free, reflowable EPUB files stored in the active vault.
- Storage: Obsidian plugin `data.json`.
- Dictionary: bundled ECDICT English-Chinese data; exact lookup first, then lemma fallback.
- No PDF, DRM bypass, cloud sync, accounts, telemetry, or network translation.

## Design documents

- [Confirmed product specification](docs/confirmed-product-spec.md)
- [Architecture](docs/architecture.md)
- [Earlier implementation plan (superseded)](docs/superpowers/plans/2026-08-23-obsidian-epub-plugin.md)

## Status

Architecture selected; implementation has not started.
