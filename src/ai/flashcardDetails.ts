import type { VocabularyItem } from "../db";
import { AiError, parseJson, prepareAiRequest } from "./client";

/** The details AI may write. */
export const generatableDetails = [
  "definition",
  "explanation",
  "etymology",
  "history",
  "synonyms",
  "example",
  "pronunciation",
] as const;

export type GeneratableDetail = (typeof generatableDetails)[number];
export type GeneratedDetails = Partial<Record<GeneratableDetail, string>>;

const descriptions: Record<GeneratableDetail, string> = {
  definition: "a short definition in English",
  explanation: "how it is used, in English",
  etymology: "where it comes from, in English",
  history: "how its use has changed, in English",
  synonyms: "French synonyms, separated by commas",
  example: "French example sentences, one per line",
  pronunciation: "its pronunciation in IPA, between slashes",
};

export function blankDetails(item: VocabularyItem) {
  return generatableDetails.filter((name) => item[name].trim() === "");
}

/** The word, its translation and the wanted field names: the rest of the card stays home. */
export function prepareDetailsRequest(item: VocabularyItem, fields: GeneratableDetail[]) {
  const wanted = fields.map((name) => `- ${name}: ${descriptions[name]}`).join("\n");
  return prepareAiRequest("fill-flashcard-details", [
    {
      role: "system",
      content:
        "You write study notes for an advanced learner of French. Reply with one JSON object " +
        `and nothing else. Give exactly these keys, each with a plain string value:\n${wanted}`,
    },
    { role: "user", content: `French: ${item.french}\nEnglish: ${item.english}` },
  ]);
}

const MALFORMED = "The AI's reply was not in the expected form, so nothing was saved. Try again.";

/** Keeps only the requested fields. Anything else the model adds is ignored. */
export function parseDetailsReply(text: string, fields: GeneratableDetail[]): GeneratedDetails {
  const reply = parseJson(text, MALFORMED);
  if (typeof reply !== "object" || reply === null) throw new AiError(MALFORMED);

  const details: GeneratedDetails = {};
  for (const name of fields) {
    const value = (reply as Record<string, unknown>)[name];
    if (typeof value !== "string") throw new AiError(MALFORMED);
    if (value.trim()) details[name] = value.trim();
  }
  if (Object.keys(details).length === 0) throw new AiError(MALFORMED);
  return details;
}
