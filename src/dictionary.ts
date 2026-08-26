import { DICTIONARY, LEMMAS } from "./dictionary-data";
import { normalizeWord } from "./reader-events";

export interface DictionaryEntry {
  word: string;
  ipa: string;
  shortZh: string;
  detailZh: string;
  detailEn: string;
  chineseSenses: string[];
  englishSenses: string[];
}

function splitSenses(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^\[网络\]/.test(line));
}

function makeEntry(word: string, tuple: readonly [string, string, string, string]): DictionaryEntry {
  return {
    word,
    ipa: tuple[0],
    shortZh: tuple[1],
    detailZh: tuple[2],
    detailEn: tuple[3],
    chineseSenses: splitSenses(tuple[2]),
    englishSenses: splitSenses(tuple[3])
  };
}

export function lookupWord(input: string): DictionaryEntry | null {
  const normalized = normalizeWord(input);
  if (!normalized) return null;
  const exact = DICTIONARY[normalized];
  if (exact) return makeEntry(normalized, exact);
  const lemma = LEMMAS[normalized];
  const fallback = lemma ? DICTIONARY[lemma] : undefined;
  return fallback ? makeEntry(lemma, fallback) : null;
}
