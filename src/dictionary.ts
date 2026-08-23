import { DICTIONARY, LEMMAS } from "./dictionary-data";
import { normalizeWord } from "./reader-events";

export interface DictionaryEntry {
  word: string;
  ipa: string;
  shortZh: string;
  detailZh: string;
  detailEn: string;
}

export function lookupWord(input: string): DictionaryEntry | null {
  const normalized = normalizeWord(input);
  if (!normalized) return null;
  const exact = DICTIONARY[normalized];
  if (exact) return { word: normalized, ipa: exact[0], shortZh: exact[1], detailZh: exact[2], detailEn: exact[3] };
  const lemma = LEMMAS[normalized];
  const fallback = lemma ? DICTIONARY[lemma] : undefined;
  return fallback ? { word: lemma, ipa: fallback[0], shortZh: fallback[1], detailZh: fallback[2], detailEn: fallback[3] } : null;
}
