import fs from "node:fs";

const limit = 30000;
const source = JSON.parse(fs.readFileSync("node_modules/ecdict/data/dict.json", "utf8"));
const lemmaSource = JSON.parse(fs.readFileSync("node_modules/ecdict/data/lemma.json", "utf8"));

const words = source
  .filter((row) => /^[a-z][a-z'-]*$/i.test(row.word ?? "") && Number(row.frq) > 0)
  .sort((a, b) => Number(a.frq) - Number(b.frq) || a.word.localeCompare(b.word))
  .slice(0, limit);

function senseLines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^\[网络\]/.test(line));
}

function shortTranslation(value) {
  const parts = [];
  for (const line of senseLines(value)) {
    const clean = line.replace(/^(?:[a-z]+\.\s*)+/i, "").trim();
    for (const part of clean.split(/[;,，；]/)) {
      const item = part.trim();
      if (item && !parts.includes(item)) parts.push(item);
      if (parts.length === 3) return parts.join("、");
    }
  }
  return parts.join("、");
}

const dictionary = {};
for (const row of words) {
  const translation = String(row.translation ?? "").replaceAll("\\n", "\n").trim();
  const shortZh = shortTranslation(translation);
  dictionary[row.word.toLowerCase()] = [
    String(row.phonetic ?? "").trim(),
    shortZh,
    translation,
    String(row.definition ?? "").replaceAll("\\n", "\n").trim()
  ];
}

const lemmas = {};
for (const row of lemmaSource) {
  const lemma = String(row.word ?? "").toLowerCase();
  if (!dictionary[lemma]) continue;
  for (const variation of row.variations ?? []) {
    if (/^[a-z][a-z'-]*$/i.test(variation)) lemmas[variation.toLowerCase()] = lemma;
  }
}

const output = [
  "export type DictionaryTuple = readonly [ipa: string, shortZh: string, detailZh: string, detailEn: string];",
  `export const DICTIONARY: Record<string, DictionaryTuple> = ${JSON.stringify(dictionary)} as unknown as Record<string, DictionaryTuple>;`,
  `export const LEMMAS: Record<string, string> = ${JSON.stringify(lemmas)};`,
  ""
].join("\n");
fs.writeFileSync("src/dictionary-data.ts", output);
console.log(`Generated ${Object.keys(dictionary).length} dictionary entries and ${Object.keys(lemmas).length} lemma mappings.`);
