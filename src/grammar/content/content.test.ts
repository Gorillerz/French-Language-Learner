import { describe, expect, it } from "vitest";
import { grammarConcepts } from "./index";

const sentences = grammarConcepts.flatMap((concept) => concept.sentences);

describe("built-in grammar content", () => {
  it("has no repeated ids, because ratings refer to them", () => {
    const conceptIds = grammarConcepts.map((concept) => concept.id);
    const sentenceIds = sentences.map((sentence) => sentence.id);

    expect(new Set(conceptIds).size).toBe(conceptIds.length);
    expect(new Set(sentenceIds).size).toBe(sentenceIds.length);
  });

  it.each(grammarConcepts.map((concept) => [concept.title, concept] as const))(
    "%s has an explanation, examples and at least ten sentence flashcards",
    (_title, concept) => {
      expect(concept.explanation.length).toBeGreaterThan(0);
      expect(concept.examples.length).toBeGreaterThan(0);
      expect(concept.sentences.length).toBeGreaterThanOrEqual(10);
    },
  );

  it("has both languages for every sentence", () => {
    for (const { fr, en } of [...sentences, ...grammarConcepts.flatMap((c) => c.examples)]) {
      expect(fr.trim()).not.toBe("");
      expect(en.trim()).not.toBe("");
      expect(fr).not.toBe(en);
    }
  });

  it("does not label content with CEFR levels or difficulty", () => {
    const text = JSON.stringify(grammarConcepts);

    expect(text).not.toMatch(/\b[ABC][12]\b/);
    expect(text).not.toMatch(/\b(beginner|intermediate|advanced|difficulty)\b/i);
  });
});
