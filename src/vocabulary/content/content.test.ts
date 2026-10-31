import { describe, expect, it } from "vitest";
import { seedCollections, seedItems } from ".";
import { mostCommonWords } from "./mostCommonWords";
import { usefulExpressions } from "./usefulExpressions";

describe("built-in vocabulary", () => {
  it("has exactly 100 distinct most common words, from le to rester", () => {
    const words = mostCommonWords.items.map((item) => item.french);

    expect(words).toHaveLength(100);
    expect(new Set(words).size).toBe(100);
    expect(words[0]).toBe("le");
    expect(words[99]).toBe("rester");
  });

  it("has a useful-expressions collection of distinct expressions", () => {
    const expressions = usefulExpressions.items.map((item) => item.french);

    expect(expressions).toHaveLength(50);
    expect(new Set(expressions).size).toBe(50);
  });

  it("fills in every detail of every entry", () => {
    for (const item of seedItems) {
      expect(item.english.trim(), item.id).not.toBe("");
      expect(item.definition.length, item.id).toBeGreaterThan(10);
      expect(item.example.trim().split(" ").length, item.id).toBeGreaterThan(2);
      expect(item.pronunciation, item.id).toMatch(/^\/[^/]+\/$/);
    }
  });

  it("gives every collection and item its own id", () => {
    const ids = [...seedCollections, ...seedItems].map((row) => row.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
