import { useState } from "react";
import { grammarConcepts } from "../grammar/content";
import { useCollections } from "../vocabulary/store";
import { QuizSession } from "./QuizSession";
import { buildGeneralQuiz, buildTopicQuiz, type QuizQuestion } from "./store";

const grammarTopics = grammarConcepts.map(({ id, title }) => ({ id, name: title }));

type View =
  | { name: "start" }
  | { name: "quiz"; questions: QuizQuestion[] }
  | { name: "noQuestions"; topicName: string };

export function QuizArea() {
  const collections = useCollections();
  const [view, setView] = useState<View>({ name: "start" });

  const collectionTopics = (collections ?? []).map(({ id, name }) => ({ id, name }));
  const topics = [...collectionTopics, ...grammarTopics];
  const topicName = (topicId: string) => topics.find(({ id }) => id === topicId)?.name ?? "";

  async function startTopic(topicId: string) {
    const questions = await buildTopicQuiz(topicId);
    setView(
      questions.length > 0
        ? { name: "quiz", questions }
        : { name: "noQuestions", topicName: topicName(topicId) },
    );
  }

  async function startGeneral() {
    setView({ name: "quiz", questions: await buildGeneralQuiz() });
  }

  const backToStart = () => setView({ name: "start" });

  switch (view.name) {
    case "quiz":
      return <QuizSession questions={view.questions} topicName={topicName} onBack={backToStart} />;
    case "noQuestions":
      return (
        <section className="vocabulary">
          <p>{view.topicName} has no questions yet.</p>
          <button type="button" className="link-button" onClick={backToStart}>
            Back to quizzes
          </button>
        </section>
      );
    case "start":
      return (
        <section className="vocabulary">
          <p className="muted">A general quiz mixes vocabulary and grammar, starting with what needs review.</p>
          <button type="button" className="primary-button" onClick={() => void startGeneral()}>
            Start general quiz
          </button>
          <TopicList title="Vocabulary collections" topics={collectionTopics} onStart={startTopic} />
          <TopicList title="Grammar concepts" topics={grammarTopics} onStart={startTopic} />
        </section>
      );
  }
}

type TopicListProps = {
  title: string;
  topics: { id: string; name: string }[];
  onStart: (topicId: string) => Promise<void>;
};

function TopicList({ title, topics, onStart }: TopicListProps) {
  return (
    <>
      <h3>{title}</h3>
      <ul className="row-list" aria-label={title}>
        {topics.map(({ id, name }) => (
          <li key={id}>
            <button
              type="button"
              className="row-button"
              aria-label={`Quiz on ${name}`}
              onClick={() => void onStart(id)}
            >
              {name}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
