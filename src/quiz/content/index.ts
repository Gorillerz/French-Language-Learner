import { conditionalQuestions } from "./conditional";
import { expressingCauseQuestions } from "./expressingCause";
import { mostCommonWordsQuestions } from "./mostCommonWords";
import { pastTensesQuestions } from "./pastTenses";
import { pronounsQuestions } from "./pronouns";
import { subjunctiveQuestions } from "./subjunctive";
import type { CuratedTopic, PracticeQuestion } from "./types";
import { usefulExpressionsQuestions } from "./usefulExpressions";
import { verbPrepositionsQuestions } from "./verbPrepositions";

export type { PracticeQuestion, QuestionFormat } from "./types";

const curatedTopics: CuratedTopic[] = [
  mostCommonWordsQuestions,
  usefulExpressionsQuestions,
  pastTensesQuestions,
  pronounsQuestions,
  verbPrepositionsQuestions,
  conditionalQuestions,
  subjunctiveQuestions,
  expressingCauseQuestions,
];

export const curatedQuestions: PracticeQuestion[] = curatedTopics.flatMap(({ topicId, kind, questions }) =>
  questions.map(({ slug, ...question }) => ({
    ...question,
    id: `${topicId}/${slug}`,
    topicId,
    kind,
  })),
);
