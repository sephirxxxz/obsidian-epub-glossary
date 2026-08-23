export interface ReadingProgress {
  cfi: string;
  percentage?: number;
  updatedAt: string;
}

export interface SavedGloss {
  cfi: string;
  surface: string;
  lookup: string;
  shortZh: string;
  detailZh: string;
  detailEn: string;
  ipa: string;
  createdAt: string;
}

export interface BookState {
  progress?: ReadingProgress;
  glosses: Record<string, SavedGloss>;
}

export interface PluginData {
  version: 2;
  fontSizePercent: number;
  books: Record<string, BookState>;
}
