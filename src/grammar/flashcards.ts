import { useLiveQuery } from "dexie-react-hooks";
import { getSetting, setSetting } from "../settings";
import type { GrammarConcept } from "./content";

export const directions = [
  { id: "fr-en", label: "French to English", instruction: "Translate into English", promptLang: "fr" },
  { id: "en-fr", label: "English to French", instruction: "Translate into French", promptLang: "en" },
] as const;

export type Direction = (typeof directions)[number];

const DEFAULT_DIRECTION_SETTING = "grammarFlashcardDirection";

/** Undefined while loading. Follows choices synced in from another device. */
export function useDefaultDirection(): Direction | undefined {
  return useLiveQuery(async () => {
    const id = await getSetting(DEFAULT_DIRECTION_SETTING);
    return directions.find((direction) => direction.id === id) ?? directions[0];
  });
}

export function saveDefaultDirection(direction: Direction) {
  return setSetting(DEFAULT_DIRECTION_SETTING, direction.id);
}

export type GrammarFlashcard = {
  /** Stored with ratings. Includes the direction, because each way round is recalled separately. */
  id: string;
  prompt: string;
  answer: string;
};

export function flashcardsFor(concept: GrammarConcept, direction: Direction): GrammarFlashcard[] {
  return concept.sentences.map((sentence) => ({
    id: `${sentence.id}:${direction.id}`,
    prompt: direction.promptLang === "fr" ? sentence.fr : sentence.en,
    answer: direction.promptLang === "fr" ? sentence.en : sentence.fr,
  }));
}
