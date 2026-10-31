import { describe, expect, it } from "vitest";
import { grammarConcepts } from "../../grammar/content";
import { builtInCollections } from "../../vocabulary/content";
import { curatedQuestions } from "./index";

const topicIds = [
  ...builtInCollections.map((collection) => collection.id),
  ...grammarConcepts.map((concept) => concept.id),
];

describe("curated questions", () => {
  it("has 160 questions across the 8 built-in topics", () => {
    expect(topicIds).toHaveLength(8);
    expect(curatedQuestions).toHaveLength(160);
  });

  it.each(topicIds)("gives %s 20 questions", (topicId) => {
    const questions = curatedQuestions.filter((question) => question.topicId === topicId);

    expect(questions).toHaveLength(20);
  });

  it("files each question under the right kind of topic", () => {
    const collectionIds = builtInCollections.map((collection) => collection.id);

    for (const { id, topicId, kind } of curatedQuestions) {
      expect(kind, id).toBe(collectionIds.includes(topicId) ? "vocabulary" : "grammar");
    }
  });

  it("gives every question its own id, because attempts refer to them", () => {
    const ids = curatedQuestions.map((question) => question.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never asks the same thing twice", () => {
    const prompts = curatedQuestions.map((question) => question.prompt);

    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it("offers one answer and three different distractors", () => {
    for (const { id, answer, distractors } of curatedQuestions) {
      const options = [answer, ...distractors].map((option) => option.trim());

      expect(options, id).toHaveLength(4);
      expect(new Set(options).size, id).toBe(4);
      expect(options, id).not.toContain("");
    }
  });

  it("leaves a blank in every sentence to complete", () => {
    for (const { id, format, prompt } of curatedQuestions) {
      if (format === "complete") expect(prompt, id).toContain("___");
    }
  });
});
