import { useState } from "react";
import { AiRequestReview } from "../ai/AiRequestReview";
import { aiServiceName, type PreparedAiRequest } from "../ai/client";
import { BATCH_SIZE } from "../ai/questionBatch";
import { useAiBlocker } from "../ai/useAiBlocker";
import { prepareBatch, saveGeneratedBatch, type QuizTopic } from "./store";

type Props = {
  topic: QuizTopic;
  /** The topic had no questions when this opened. */
  isEmpty: boolean;
  onStartQuiz: () => void;
};

type Pending = { request: PreparedAiRequest; note: string | undefined };

export function GenerateQuestions({ topic, isEmpty, onStartQuiz }: Props) {
  const { isBlocked, reason } = useAiBlocker();
  const [pending, setPending] = useState<Pending | null>(null);
  const [added, setAdded] = useState<number | null>(null);

  async function review() {
    setAdded(null);
    setPending(await prepareBatch(topic));
  }

  return (
    <div className="ai-action">
      {isEmpty && added === null && <p>{topic.name} has no questions yet.</p>}
      {added !== null && (
        <>
          <p role="status" aria-label="AI result">
            Added {added} questions to {topic.name}.
          </p>
          <button type="button" className="primary-button" onClick={onStartQuiz}>
            Start quiz
          </button>
        </>
      )}
      {pending ? (
        <AiRequestReview
          request={pending.request}
          note={pending.note}
          onCancel={() => setPending(null)}
          onReply={async (reply) => {
            setAdded(await saveGeneratedBatch(topic, reply));
            setPending(null);
          }}
        />
      ) : (
        <>
          <p className="muted">
            AI can write {BATCH_SIZE} new multiple-choice questions on {topic.name}. You will see
            what is sent to {aiServiceName()} first.
          </p>
          {reason && <p className="muted">{reason}</p>}
          <button
            type="button"
            className="action-button"
            disabled={isBlocked}
            onClick={() => void review()}
          >
            Generate {BATCH_SIZE} questions
          </button>
        </>
      )}
    </div>
  );
}
