import { db } from "../db";
import { curatedQuestions, type PracticeQuestion } from "./content";
import { pickGeneralQuiz, rankByPriority, shuffled } from "./priority";

const GENERAL_QUIZ_LENGTH = 10;

/** A question as asked: its options are in the order shown to the Learner. */
export type QuizQuestion = PracticeQuestion & { options: string[] };

/** Every place questions come from. Generated questions (#20) belong here too. */
const questionSources: (() => Promise<PracticeQuestion[]>)[] = [async () => curatedQuestions];

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
  sessionId: string;
};

export function recordAttempt({ question, isCorrect, sessionId }: NewAttempt) {
  const now = new Date().toISOString();
  return db.quizAttempts.add({
    id: crypto.randomUUID(),
    questionId: question.id,
    topicId: question.topicId,
    isCorrect,
    sessionId,
    answeredAt: now,
    savedAt: now,
  });
}
