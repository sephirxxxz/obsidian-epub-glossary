export interface WordRange {
  surface: string;
  start: number;
  end: number;
}

export function glossKey(cfi: string, lookup: string): string {
  return `${cfi}::${lookup}`;
}

export function normalizeWord(input: string): string {
  const trimmed = input.toLowerCase().replace(/^[^a-z]+|[^a-z']+$/g, "");
  return /[a-z]/.test(trimmed) ? trimmed : "";
}

export function wordAtOffset(text: string, offset: number): WordRange | null {
  const isWord = (character: string): boolean => /[A-Za-z']/.test(character);
  let start = Math.min(Math.max(offset, 0), text.length);
  let end = start;
  if (!isWord(text[start] ?? "") && isWord(text[start - 1] ?? "")) start -= 1;
  while (start > 0 && isWord(text[start - 1] ?? "")) start -= 1;
  while (end < text.length && isWord(text[end] ?? "")) end += 1;
  const surface = text.slice(start, end);
  return surface ? { surface, start, end } : null;
}

export function rangeAtPoint(document: Document, x: number, y: number): Range | null {
  const withCaretRange = document as Document & {
    caretRangeFromPoint?: (clientX: number, clientY: number) => Range | null;
  };
  const caret = withCaretRange.caretRangeFromPoint?.(x, y) ?? null;
  const node = caret?.startContainer;
  if (!caret || !node || node.nodeType !== 3) return null;
  const textNode = node as Text;
  const word = wordAtOffset(textNode.data, caret.startOffset);
  if (!word) return null;
  const range = document.createRange();
  range.setStart(textNode, word.start);
  range.setEnd(textNode, word.end);
  return range;
}

export function insertGloss(range: Range, shortZh: string, key: string): HTMLElement {
  const document = range.startContainer.ownerDocument;
  if (!document) throw new Error("Cannot insert a gloss into a detached range");
  const ruby = document.createElement("ruby");
  ruby.className = "glossary-reader-decoration";
  ruby.dataset.glossKey = key;
  const base = document.createElement("rb");
  base.append(range.extractContents());
  const annotation = document.createElement("rt");
  annotation.textContent = shortZh;
  ruby.append(base, annotation);
  range.insertNode(ruby);
  return ruby;
}

export function removeGloss(document: Document, key: string): boolean {
  const ruby = Array.from(document.querySelectorAll<HTMLElement>("ruby[data-gloss-key]"))
    .find((element) => element.dataset.glossKey === key);
  if (!ruby || !ruby.parentNode) return false;
  const base = ruby.querySelector("rb");
  if (!base) return false;
  while (base.firstChild) ruby.parentNode.insertBefore(base.firstChild, ruby);
  ruby.remove();
  return true;
}
