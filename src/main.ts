import { Notice, Plugin, TFile } from "obsidian";
import { EpubView, EPUB_VIEW_TYPE } from "./epub-view";
import { PluginStateStore } from "./state";

export default class GlossaryReaderPlugin extends Plugin {
  state = new PluginStateStore(() => this.loadData(), (data) => this.saveData(data));

  async onload(): Promise<void> {
    await this.state.load();
    this.registerView(EPUB_VIEW_TYPE, (leaf) => new EpubView(leaf, this));
    this.registerExtensions(["epub"], EPUB_VIEW_TYPE);
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (file instanceof TFile && file.extension.toLowerCase() === "epub") this.state.renameBook(oldPath, file.path);
    }));
    this.addCommand({
      id: "clear-current-book-progress",
      name: "Clear current book progress",
      checkCallback: (checking) => this.withActiveBook(checking, (path) => this.state.clearBookProgress(path))
    });
    this.addCommand({
      id: "clear-current-book-glosses",
      name: "Clear current book glosses",
      checkCallback: (checking) => this.withActiveBook(checking, (path) => {
        if (!checking && window.confirm("Clear all saved glosses for this book?")) this.state.clearBookGlosses(path);
      })
    });
    this.addCommand({
      id: "clean-missing-book-state",
      name: "Clean state for missing EPUBs",
      callback: () => {
        if (!window.confirm("Remove saved state for EPUB paths that no longer exist?")) return;
        const paths = new Set(this.app.vault.getFiles().filter((file) => file.extension.toLowerCase() === "epub").map((file) => file.path));
        new Notice(`Removed ${this.state.cleanupMissingBooks(paths)} missing book record(s).`);
      }
    });
  }

  onunload(): void {
    void this.state.flush();
  }

  private withActiveBook(checking: boolean, action: (path: string) => void): boolean {
    const view = this.app.workspace.getActiveViewOfType(EpubView);
    const path = view?.file?.path;
    if (!path) return false;
    if (!checking) action(path);
    return true;
  }
}
