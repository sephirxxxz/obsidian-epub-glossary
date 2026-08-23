# Glossary Reader manual test checklist

Test in the active macOS Obsidian Vault against the two confirmed fixture types: the English `The Principles of Psychology` EPUB and the three path-distinct `影响力` EPUB copies.

- [ ] Enable the plugin without console errors.
- [ ] Open an EPUB from the Vault and see one paginated page.
- [ ] Use the previous/next buttons and Left/Right arrow keys.
- [ ] Open and use the temporary table-of-contents drawer.
- [ ] Verify raster and SVG images keep their aspect ratio.
- [ ] Click a known word and see a short Chinese gloss under it.
- [ ] Restart Obsidian and verify the gloss returns.
- [ ] Double-click the word and verify the detail card shows word, IPA, Chinese, and English definitions.
- [ ] Click the visible gloss and verify only that gloss is removed.
- [ ] Click a word missing from the dictionary and verify `未收录` appears without a saved gloss.
- [ ] Change font size and verify the clicked passage remains visible after re-pagination.
- [ ] Wait for whole-book location generation and verify a percentage appears.
- [ ] Follow a footnote/internal link and use return-to-text.
- [ ] Follow an external link and verify confirmation appears before the system browser opens.
- [ ] Restart Obsidian and verify the last CFI is restored.
- [ ] Open the three path-distinct `影响力` copies and verify each has independent progress/gloss state.
- [ ] Run the three command-palette maintenance commands and confirm destructive actions require confirmation.
- [ ] Disable network access and repeat a dictionary lookup successfully.
- [ ] Open an EPUB containing scripted content and verify scripts do not execute.

Record the tested Obsidian version and any failing fixture here before release.
