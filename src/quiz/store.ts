import { useLiveQuery } from "dexie-react-hooks";
import {
  parseBatchReply,
  prepareBatchRequest,
  type BatchTopic,
} from "../ai/questionBatch";
import { db, type QuizAttempt } from "../db";
import { grammarConcepts } from "../grammar/content";
import { curatedQuestions, type PracticeQuestion } from "./content";
import { pickGeneralQuiz, rankByPriority, shuffled } from "./priority";

const GENERAL_QUIZ_LENGTH = 10;
const RECENT_QUIZ_COUNT = 10;

/** A question as asked: its options are in the order shown to the Learner. */
export type QuizQuestion = PracticeQuestion & { options: string[] };

export type QuizTopic = { id: string; name: string; kind: PracticeQuestion["kind"] };

/** Every place questions come from. */
const questionSources: (() => Promise<PracticeQuestion[]>)[] = [
  async () => curatedQuestions,
  () => db.generatedQuestions.toArray(),
];

async function loadQuestions() {
  const questions = await Promise.all(questionSources.map((source) => source()));
  return questions.flat();
}

async function rankedQuestions(questions: PracticeQuestion[]) {
  const [attempts, ratings] = await Promise.all([
    db.quizAttempts.toArray(),
    db.flashcardRatings.toArray(),
  ]);
  return rankByPriority(questions, { attempts, ratings }, { now: new Date(), random: Math.random });
}

function asked(question: PracticeQuestion): QuizQuestion {
  const options = shuffled([question.answer, ...question.distractors], Math.random);
  return { ...question, options };
}

export async function buildGeneralQuiz() {
  const ranked = await rankedQuestions(await loadQuestions());
  return pickGeneralQuiz(ranked, GENERAL_QUIZ_LENGTH).map(asked);
}

/** Every question on the topic, weakest first. Empty if the topic has no questions yet. */
export async function buildTopicQuiz(topicId: string) {
  const questions = await loadQuestions();
  const ranked = await rankedQuestions(questions.filter((question) => question.topicId === topicId));
  return ranked.map(asked);
}

type NewAttempt = {
  question: PracticeQuestion;
  isCorrect: boolean;
  chosenOption: string;
  sessionId: string;
};

export function recordAttempt({ question, isCorrect, chosenOption, sessionId }: NewAttempt) {
  const now = new Date().toISOString();
  return db.quizAttempts.add({
    id: crypto.randomUUID(),
    questionId: question.id,
    topicId: question.topicId,
    isCorrect,
    chosenOption,
    sessionId,
    answeredAt: now,
    savedAt: now,
  });
}

/** The topic's prompts, curated then generated, oldest first. */
async function promptsOn(topicId: string) {
  const generated = await db.generatedQuestions.where("topicId").equals(topicId).sortBy("savedAt");
  return [...curatedQuestions.filter((question) => question.topicId === topicId), ...generated].map(
    ({ prompt }) => prompt,
  );
}

async function batchTopic({ id, name, kind }: QuizTopic): Promise<BatchTopic> {
  if (kind === "grammar") {
    const summary = grammarConcepts.find((concept) => concept.id === id)?.summary ?? "";
    return { kind, name, summary };
  }
  const items = await db.vocabularyItems.where("collectionId").equals(id).sortBy("position");
  return { kind, name, words: items.map(({ french, english }) => ({ french, english })) };
}

export async function prepareBatch(topic: QuizTopic) {
  return prepareBatchRequest(await batchTopic(topic), await promptsOn(topic.id));
}

/**
 * Checks the reply against the topic as it stands now, not as it stood when the AI
 * was asked: another device may have added questions meanwhile. Saves all or none.
 */
export function saveGeneratedBatch(topic: QuizTopic, reply: string) {
  return db.transaction("rw", db.generatedQuestions, async () => {
    const drafts = parseBatchReply(reply, await promptsOn(topic.id));
    const savedAt = new Date().toISOString();
    await db.generatedQuestions.bulkAdd(
      drafts.map((draft) => ({
        ...draft,
        id: crypto.randomUUID(),
        topicId: topic.id,
        kind: topic.kind,
        savedAt,
      })),
    );
    return drafts.length;
  });
}

export type ReviewedAttempt = {
  attempt: QuizAttempt;
  /** Null until sync brings the question to this device. */
  question: PracticeQuestion | null;
};

/** Built from stored rows alone, so any device holding them can review the quiz. */
export function useQuizReview(sessionId: string) {
  return useLiveQuery(async (): Promise<ReviewedAttempt[]> => {
    const [attempts, questions] = await Promise.all([
      db.quizAttempts.where("sessionId").equals(sessionId).sortBy("answeredAt"),
      loadQuestions(),
    ]);
    const byId = new Map(questions.map((question) => [question.id, question]));
    return attempts.map((attempt) => ({
      attempt,
      question: byId.get(attempt.questionId) ?? null,
    }));
  }, [sessionId]);
}

export type RecentQuiz = {
  sessionId: string;
  answeredAt: string;
  topicIds: string[];
  correct: number;
  attempts: number;
};

/** The latest quizzes, newest first. */
export function useRecentQuizzes() {
  return useLiveQuery(async () => {
    const quizzes = new Map<string, RecentQuiz>();
    for (const { sessionId, answeredAt, topicId, isCorrect } of await db.quizAttempts
      .orderBy("answeredAt")
      .toArray()) {
      const quiz = quizzes.get(sessionId) ?? {
        sessionId,
        answeredAt,
        topicIds: [],
        correct: 0,
        attempts: 0,
      };
      quiz.answeredAt = answeredAt;
      if (!quiz.topicIds.includes(topicId)) quiz.topicIds.push(topicId);
      quiz.attempts += 1;
      if (isCorrect) quiz.correct += 1;
      quizzes.set(sessionId, quiz);
    }
    return [...quizzes.values()]
      .sort((a, b) => Date.parse(b.answeredAt) - Date.parse(a.answeredAt))
      .slice(0, RECENT_QUIZ_COUNT);
  });
}
