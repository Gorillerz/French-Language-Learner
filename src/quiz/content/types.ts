/** How a question is posed. Each format sets its instruction and languages. */
export type QuestionFormat =
  | "complete"
  | "to-english"
  | "to-french"
  | "closest-to-english"
  | "closest-to-french";

/** A multiple-choice practice question, wherever it came from. */
export type PracticeQuestion = {
  /** Stored with attempts as their questionId, so it must never change. */
  id: string;
  /** The collection or grammar concept id. */
  topicId: string;
  kind: "vocabulary" | "grammar";
  format: QuestionFormat;
  prompt: string;
  /** The answer key. Options are the answer and the distractors, in shuffled order. */
  answer: string;
  distractors: string[];
  /** Why each option is right or wrong, by option. Curated questions have none. */
  explanations?: Record<string, string>;
};

/** A curated question as written in the content files. It becomes a `PracticeQuestion`. */
export type CuratedQuestionSource = Pick<PracticeQuestion, "format" | "prompt" | "answer" | "distractors"> & {
  /** Forms the question id, so it must never change. */
  slug: string;
};

export type CuratedTopic = {
  topicId: string;
  kind: PracticeQuestion["kind"];
  questions: CuratedQuestionSource[];
};
