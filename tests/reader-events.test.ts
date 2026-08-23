import { describe, expect, it } from "vitest";
import { normalizeWord, wordAtOffset } from "../src/reader-events";

describe("normalizeWord", () => {
  it.each([
    ["Reader's", "reader's"],
    ["—books—", "books"],
    ["HELLO", "hello"],
    ["123", ""]
  ])("normalizes %s", (input, expected) => {
    expect(normalizeWord(input)).toBe(expected);
  });
});

describe("wordAtOffset", () => {
  it("extracts the word around a text offset", () => {
    expect(wordAtOffset("Read better books.", 13)).toEqual({
      surface: "books",
      start: 12,
      end: 17
    });
  });
});
