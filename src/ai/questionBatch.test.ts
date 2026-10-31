import { describe, expect, it } from "vitest";
import { parseBatchReply, promptKey } from "./questionBatch";

function question(prompt: string, options: string[]) {
  const [answer, ...distractors] = options.map((text) => ({ text, explanation: `Why ${text}` }));
  return { format: "complete", prompt, answer, distractors };
}

function reply(first: ReturnType<typeof question>) {
  const rest = Array.from({ length: 9 }, (_, index) =>
    question(`Phrase ${index} ___.`, ["un", "deux", "trois", "quatre", "cinq"]),
  );
  return JSON.stringify({ questions: [first, ...rest] });
}

describe("promptKey", () => {
  it("ignores case, accents and whitespace", () => {
    expect(promptKey("  Il  A été  À Paris. ")).toBe("il a ete a paris.");
  });

  it("treats composed and decomposed accents alike", () => {
    expect(promptKey("é")).toBe(promptKey("é"));
  });

  it("keeps words and punctuation", () => {
    expect(promptKey("Il part.")).not.toBe(promptKey("Il partit."));
  });
});

describe("parseBatchReply", () => {
  it("keeps the model's answer key and an explanation for every option", () => {
    const [draft] = parseBatchReply(
      reply(question(" Il va ___ Paris. ", ["à", "de", "en", "par", "sur"])),
      [],
    );

    expect(draft).toEqual({
      format: "complete",
      prompt: "Il va ___ Paris.",
      answer: "à",
      distractors: ["de", "en", "par", "sur"],
      explanations: {
        à: "Why à",
        de: "Why de",
        en: "Why en",
        par: "Why par",
        sur: "Why sur",
      },
    });
  });

  it("lets options differ by an accent alone, since that is often the point", () => {
    const options = ["à", "a", "as", "ont", "est"];

    expect(parseBatchReply(reply(question("Il ___ faim.", options)), [])).toHaveLength(10);
  });

  it("refuses options that differ only by case or whitespace", () => {
    const options = ["le", "Le", " la ", "les", "un"];

    expect(() => parseBatchReply(reply(question("___ chat.", options)), [])).toThrow(/nothing was saved/);
  });
});
