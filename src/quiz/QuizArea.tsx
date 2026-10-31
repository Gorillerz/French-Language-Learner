import { useState } from "react";
import { grammarConcepts } from "../grammar/content";
import { useCollections } from "../vocabulary/store";
import { GenerateQuestions } from "./GenerateQuestions";
import { QuizReview } from "./QuizReview";
import { QuizSession } from "./QuizSession";
import {
  buildGeneralQuiz,
  buildTopicQuiz,
  useRecentQuizzes,
  type QuizQuestion,
  type QuizTopic,
  type RecentQuiz,
} from "./store";

const grammarTopics: QuizTopic[] = grammarConcepts.map(({ id, title }) => ({
  id,
  name: title,
  kind: "grammar",
}));

type View =
  | { name: "start" }
  | { name: "quiz"; questions: QuizQuestion[] }
  | { name: "generate"; topic: QuizTopic; isEmpty: boolean }
  | { name: "review"; sessionId: string };

export function QuizArea() {
  const collections = useCollections();
  const recentQuizzes = useRecentQuizzes();
  const [view, setView] = useState<View>({ name: "start" });

  const collectionTopics: QuizTopic[] = (collections ?? []).map(({ id, name }) => ({
    id,
    name,
    kind: "vocabulary",
  }));
  const topics = [...collectionTopics, ...grammarTopics];
  const topicName = (topicId: string) => topics.find(({ id }) => id === topicId)?.name ?? "";

  async function startTopic(topic: QuizTopic) {
    const questions = await buildTopicQuiz(topic.id);
    setView(
      questions.length > 0
        ? { name: "quiz", questions }
        : { name: "generate", topic, isEmpty: true },
    );
  }

  async function startGeneral() {
    setView({ name: "quiz", questions: await buildGeneralQuiz() });
  }

  const backToStart = () => setView({ name: "start" });
  const generate = (topic: QuizTopic) => setView({ name: "generate", topic, isEmpty: false });

  switch (view.name) {
    case "quiz":
      return <QuizSession questions={view.questions} topicName={topicName} onBack={backToStart} />;
    case "generate":
      return (
        <section className="vocabulary">
          <h3>{view.topic.name}</h3>
          <GenerateQuestions
            topic={view.topic}
            isEmpty={view.isEmpty}
            onStartQuiz={() => void startTopic(view.topic)}
          />
          <button type="button" className="link-button" onClick={backToStart}>
            Back to quizzes
          </button>
        </section>
      );
    case "review":
      return <QuizReview sessionId={view.sessionId} backLabel="Back to quizzes" onBack={backToStart} />;
    case "start":
      return (
        <section className="vocabulary">
          <p className="muted">A general quiz mixes vocabulary and grammar, starting with what needs review.</p>
          <button type="button" className="primary-button" onClick={() => void startGeneral()}>
            Start general quiz
          </button>
          <TopicList
            title="Vocabulary collections"
            topics={collectionTopics}
            onStart={startTopic}
            onGenerate={generate}
          />
          <TopicList
            title="Grammar concepts"
            topics={grammarTopics}
            onStart={startTopic}
            onGenerate={generate}
          />
          {recentQuizzes && recentQuizzes.length > 0 && (
            <RecentQuizzes
              quizzes={recentQuizzes}
              topicName={topicName}
              onReview={(sessionId) => setView({ name: "review", sessionId })}
            />
          )}
        </section>
      );
  }
}

type TopicListProps = {
  title: string;
  topics: QuizTopic[];
  onStart: (topic: QuizTopic) => Promise<void>;
  onGenerate: (topic: QuizTopic) => void;
};

function TopicList({ title, topics, onStart, onGenerate }: TopicListProps) {
  return (
    <>
      <h3>{title}</h3>
      <ul className="row-list" aria-label={title}>
        {topics.map((topic) => (
          <li key={topic.id} className="topic-row">
            <button
              type="button"
              className="row-button"
              aria-label={`Quiz on ${topic.name}`}
              onClick={() => void onStart(topic)}
            >
              {topic.name}
            </button>
            <button
              type="button"
              className="link-button"
              aria-label={`More questions for ${topic.name}`}
              onClick={() => onGenerate(topic)}
            >
              More questions
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

type RecentQuizzesProps = {
  quizzes: RecentQuiz[];
  topicName: (topicId: string) => string;
  onReview: (sessionId: string) => void;
};

function RecentQuizzes({ quizzes, topicName, onReview }: RecentQuizzesProps) {
  return (
    <>
      <h3>Recent quizzes</h3>
      <ul className="row-list" aria-label="Recent quizzes">
        {quizzes.map(({ sessionId, answeredAt, topicIds, correct, attempts }) => (
          <li key={sessionId}>
            <button type="button" className="row-button" onClick={() => onReview(sessionId)}>
              Review {topicIds.length === 1 ? topicName(topicIds[0] as string) : "mixed topics"}:{" "}
              {correct} of {attempts} correct
              <span className="muted review-date">
                {new Date(answeredAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
