import type { QuestionFormat } from "./content";

export const formats: Record<
  QuestionFormat,
  { instruction: string; promptLang: string; optionLang: string }
> = {
  complete: { instruction: "Complete the sentence", promptLang: "fr", optionLang: "fr" },
  "to-english": { instruction: "Choose the English meaning", promptLang: "fr", optionLang: "en" },
  "to-french": { instruction: "Choose the French translation", promptLang: "en", optionLang: "fr" },
  "closest-to-english": {
    instruction: "Choose the closest English meaning",
    promptLang: "fr",
    optionLang: "en",
  },
  "closest-to-french": {
    instruction: "Choose the closest French meaning",
    promptLang: "en",
    optionLang: "fr",
  },
};
