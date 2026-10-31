export type TranslatedSentence = {
  fr: string;
  en: string;
};

/** A sentence practised as a flashcard. Ratings refer to its id, so ids must never change. */
export type GrammarSentence = TranslatedSentence & {
  id: string;
};

export type GrammarConcept = {
  /** Stored with ratings as their topicId, so it must never change. */
  id: string;
  title: string;
  summary: string;
  explanation: string[];
  examples: TranslatedSentence[];
  sentences: GrammarSentence[];
};
