import ePub, { type Book, type Contents, type NavItem, type Rendition } from "epubjs";
import { FileView, Notice, type TFile, type WorkspaceLeaf } from "obsidian";
import { glossKey, insertGloss, normalizeWord, rangeAtPoint, removeGloss } from "./reader-events";
import { lookupWord, type DictionaryEntry } from "./dictionary";
import type GlossaryReaderPlugin from "./main";

export const EPUB_VIEW_TYPE = "glossary-reader-epub";
const IGNORE_CLASS = "glossary-reader-decoration";
const FRAME_CSS = `
  html, body { background: #fff !important; color: #111 !important; }
  body { font-family: Georgia, "Times New Roman", serif !important; line-height: 1.65 !important; margin: 0 auto !important; max-width: 46rem !important; padding: 2rem !important; }
  img, svg { max-width: 100% !important; height: auto !important; }
  ruby { ruby-position: under; }
  .glossary-reader-decoration rt { color: #6d3fc0; font-size: 0.65em; line-height: 1; }
`;

export class EpubView extends FileView {
  private book: Book | null = null;
  private rendition: Rendition | null = null;
  private readerEl: HTMLDivElement | null = null;
  private tocEl: HTMLDivElement | null = null;
  private history: string[] = [];
  private activeContentsCleanup: (() => void) | null = null;
  private percentageEl: HTMLSpanElement | null = null;

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
    this.createToolbar(file);
    this.readerEl = this.contentEl.createDiv({ cls: "glossary-reader-content" });

    const bytes = await this.app.vault.readBinary(file);
    this.book = ePub(bytes);
    this.rendition = this.book.renderTo(this.readerEl, {
      width: "100%",
      height: "100%",
      flow: "paginated",
      spread: "none",
      ignoreClass: IGNORE_CLASS,
      allowScriptedContent: false
    });
    this.rendition.themes.default({
      "html, body": { background: "#fff !important", color: "#111 !important" },
      body: { "font-family": "Georgia, 'Times New Roman', serif !important", "line-height": "1.65 !important" },
      "img, svg": { "max-width": "100% !important", height: "auto !important" },
      ruby: { "ruby-position": "under" },
      ".glossary-reader-decoration rt": { color: "#6d3fc0", "font-size": "0.65em", "line-height": "1" }
    });
    this.rendition.hooks.content.register((contents: Contents) => {
      void this.bindContents(contents, file);
    });
    this.rendition.on("relocated", (location: { start?: { cfi?: string; percentage?: number } }) => {
      const start = location.start;
      if (!start?.cfi) return;
      this.plugin.state.book(file.path).progress = {
        cfi: start.cfi,
        percentage: start.percentage,
        updatedAt: new Date().toISOString()
      };
      this.plugin.state.queueSave();
      this.updatePercentage(start.percentage);
    });

    const saved = this.plugin.state.book(file.path).progress?.cfi;
    await this.rendition.display(saved);
    void this.generateLocations();
  }

  async onUnloadFile(): Promise<void> {
    await this.destroyReader();
    await this.plugin.state.flush();
  }

  async onClose(): Promise<void> {
    await this.destroyReader();
    await this.plugin.state.flush();
  }

  private createToolbar(file: TFile): void {
    const toolbar = this.contentEl.createDiv({ cls: "glossary-reader-toolbar" });
    this.button(toolbar, "↶", "Return to text", () => void this.goBack());
    this.button(toolbar, "☰", "Table of contents", () => this.toggleToc());
    this.button(toolbar, "←", "Previous page", () => void this.rendition?.prev());
    this.button(toolbar, "→", "Next page", () => void this.rendition?.next());
    this.button(toolbar, "A−", "Decrease font size", () => void this.changeFontSize(-10));
    this.button(toolbar, "A+", "Increase font size", () => void this.changeFontSize(10));
    this.percentageEl = toolbar.createEl("span", { text: "—", cls: "glossary-reader-percentage" });
    this.percentageEl.setAttribute("aria-label", `Reading progress for ${file.basename}`);
    this.contentEl.addEventListener("keydown", this.onKeyDown);
  }

  private button(parent: HTMLElement, label: string, ariaLabel: string, handler: () => void): void {
    const button = parent.createEl("button", { text: label, attr: { "aria-label": ariaLabel } });
    button.addEventListener("click", handler);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, input, textarea, select")) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      void this.rendition?.prev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      void this.rendition?.next();
    }
  };

  private async bindContents(contents: Contents, file: TFile): Promise<void> {
    await contents.addStylesheetCss(FRAME_CSS, "glossary-reader");
    const bookState = this.plugin.state.book(file.path);
    for (const [key, gloss] of Object.entries(bookState.glosses)) {
      try {
        const range = contents.range(gloss.cfi, IGNORE_CLASS);
        if (range && !this.hasGloss(contents.document, key)) insertGloss(range, gloss.shortZh, key);
      } catch {
        // The saved CFI belongs to another chapter or is no longer resolvable.
      }
    }

    const onClick = (event: MouseEvent): void => {
      const target = event.target as Element | null;
      const existing = target?.closest?.("[data-gloss-key]") as HTMLElement | null;
      if (existing?.dataset.glossKey) {
        const key = existing.dataset.glossKey;
        if (removeGloss(contents.document, key)) {
          delete bookState.glosses[key];
          this.plugin.state.queueSave();
        }
        return;
      }
      const range = rangeAtPoint(contents.document, event.clientX, event.clientY);
      if (!range) return;
      const entry = lookupWord(range.toString());
      if (!entry) {
        new Notice("未收录");
        return;
      }
      const cfi = contents.cfiFromRange(range, IGNORE_CLASS);
      const key = glossKey(cfi, entry.word);
      const previous = bookState.glosses[key];
      bookState.glosses[key] = {
        cfi,
        surface: range.toString(),
        lookup: entry.word,
        shortZh: entry.shortZh,
        detailZh: entry.detailZh,
        detailEn: entry.detailEn,
        ipa: entry.ipa,
        createdAt: previous?.createdAt ?? new Date().toISOString()
      };
      this.plugin.state.queueSave();
      if (!this.hasGloss(contents.document, key)) insertGloss(range, entry.shortZh, key);
      void this.redisplay(cfi);
    };

    const onDoubleClick = (event: MouseEvent): void => {
      const range = rangeAtPoint(contents.document, event.clientX, event.clientY);
      if (!range) return;
      const entry = lookupWord(range.toString());
      if (entry) this.showDetail(entry);
    };

    const onLink = (event: MouseEvent): void => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor?.href || !/^https?:/i.test(anchor.href)) return;
      event.preventDefault();
      if (window.confirm(`Open external link?\n${anchor.href}`)) window.open(anchor.href, "_blank", "noopener,noreferrer");
    };

    contents.document.addEventListener("click", onClick);
    contents.document.addEventListener("dblclick", onDoubleClick);
    contents.document.addEventListener("click", onLink, true);
    const cleanup = (): void => {
      contents.document.removeEventListener("click", onClick);
      contents.document.removeEventListener("dblclick", onDoubleClick);
      contents.document.removeEventListener("click", onLink, true);
    };
    contents.on("unload", cleanup);
    this.activeContentsCleanup?.();
    this.activeContentsCleanup = cleanup;
  }

  private hasGloss(document: Document, key: string): boolean {
    return Array.from(document.querySelectorAll<HTMLElement>("[data-gloss-key]"))
      .some((element) => element.dataset.glossKey === key);
  }

  private showDetail(entry: DictionaryEntry): void {
    this.contentEl.querySelector(".glossary-reader-detail")?.remove();
    const card = this.contentEl.createDiv({ cls: "glossary-reader-detail" });
    card.createEl("strong", { text: entry.word });
    if (entry.ipa) card.createEl("div", { text: `/${entry.ipa}/` });
    card.createEl("p", { text: entry.detailZh });
    card.createEl("p", { text: entry.detailEn });
    card.createEl("button", { text: "Close" }).addEventListener("click", () => card.remove());
  }

  private toggleToc(): void {
    if (this.tocEl) {
      this.tocEl.remove();
      this.tocEl = null;
      return;
    }
    this.tocEl = this.contentEl.createDiv({ cls: "glossary-reader-toc" });
    for (const item of this.book?.navigation.toc ?? []) this.addTocItem(this.tocEl, item);
  }

  private addTocItem(parent: HTMLElement, item: NavItem): void {
    parent.createEl("button", { text: item.label }).addEventListener("click", () => {
      this.history.push(this.currentCfi() ?? "");
      void this.rendition?.display(item.href);
      this.tocEl?.remove();
      this.tocEl = null;
    });
    for (const child of item.subitems ?? []) this.addTocItem(parent, child);
  }

  private async goBack(): Promise<void> {
    const cfi = this.history.pop();
    if (cfi) await this.rendition?.display(cfi);
  }

  private async redisplay(cfi: string): Promise<void> {
    await this.rendition?.display(cfi);
  }

  private currentCfi(): string | undefined {
    const location = this.rendition?.currentLocation();
    if (!location || location instanceof Promise) return undefined;
    return location.cfi;
  }

  private async changeFontSize(delta: number): Promise<void> {
    if (!this.rendition) return;
    const location = await this.rendition.currentLocation();
    const cfi = location?.cfi;
    this.plugin.state.data.fontSizePercent = Math.max(70, Math.min(180, this.plugin.state.data.fontSizePercent + delta));
    this.rendition.themes.fontSize(`${this.plugin.state.data.fontSizePercent}%`);
    this.plugin.state.queueSave();
    if (cfi) await this.rendition.display(cfi);
  }

  private async generateLocations(): Promise<void> {
    if (!this.book) return;
    await this.book.locations.generate(1600);
    const location = await this.rendition?.currentLocation();
    this.updatePercentage(location?.percentage);
  }

  private updatePercentage(value: number | undefined): void {
    if (this.percentageEl && typeof value === "number" && Number.isFinite(value)) {
      this.percentageEl.textContent = `${Math.round(value * 100)}%`;
    }
  }

  private async destroyReader(): Promise<void> {
    this.contentEl.removeEventListener("keydown", this.onKeyDown);
    this.activeContentsCleanup?.();
    this.activeContentsCleanup = null;
    this.rendition?.destroy();
    this.book?.destroy();
    this.rendition = null;
    this.book = null;
    this.readerEl = null;
    this.tocEl = null;
    this.history = [];
  }
}
