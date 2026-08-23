import type { BookState, PluginData } from "./types";

export const DEFAULT_PLUGIN_DATA: PluginData = {
  version: 2,
  fontSizePercent: 100,
  books: {}
};

type LoadData = () => Promise<unknown>;
type SaveData = (data: PluginData) => Promise<void>;

function isPluginData(value: unknown): value is PluginData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PluginData>;
  return candidate.version === 2
    && typeof candidate.fontSizePercent === "number"
    && !!candidate.books
    && typeof candidate.books === "object";
}

export class PluginStateStore {
  data: PluginData = structuredClone(DEFAULT_PLUGIN_DATA);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly loadData: LoadData, private readonly saveData: SaveData) {}

  async load(): Promise<void> {
    const raw = await this.loadData();
    if (isPluginData(raw)) {
      this.data = raw;
    }
  }

  book(path: string): BookState {
    return (this.data.books[path] ??= { glosses: {} });
  }

  renameBook(oldPath: string, newPath: string): void {
    if (oldPath === newPath) return;
    const state = this.data.books[oldPath];
    if (!state) return;
    this.data.books[newPath] = state;
    delete this.data.books[oldPath];
    this.queueSave();
  }

  resetBook(path: string): void {
    delete this.data.books[path];
  }

  clearBookProgress(path: string): void {
    const state = this.data.books[path];
    if (!state) return;
    delete state.progress;
    this.queueSave();
  }

  clearBookGlosses(path: string): void {
    const state = this.data.books[path];
    if (!state) return;
    state.glosses = {};
    this.queueSave();
  }

  cleanupMissingBooks(existingPaths: Set<string>): number {
    let removed = 0;
    for (const path of Object.keys(this.data.books)) {
      if (!existingPaths.has(path)) {
        delete this.data.books[path];
        removed += 1;
      }
    }
    if (removed > 0) this.queueSave();
    return removed;
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
