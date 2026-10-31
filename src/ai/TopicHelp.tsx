import { useState, type FormEvent } from "react";
import { AiRequestReview } from "./AiRequestReview";
import { prepareAiRequest, type AiMessage, type LearnerAction, type PreparedAiRequest } from "./client";
import { useAiBlocker } from "./useAiBlocker";

type Props = {
  action: LearnerAction;
  /** The minimum that identifies the topic. It is sent with every question. */
  topic: string;
  title?: string;
};

type Turn = { question: string; answer: string };

/** Answers live here only: leaving the page ends the conversation. */
export function TopicHelp({ action, topic, title = "Topic help" }: Props) {
  const { isBlocked, explanation } = useAiBlocker();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [request, setRequest] = useState<PreparedAiRequest | null>(null);

  async function review(event: FormEvent) {
    event.preventDefault();
    const messages: AiMessage[] = [
      {
        role: "system",
        content: `You answer an advanced learner of French's questions about one topic. Be brief. Reply in plain text.\n\nTopic:\n${topic}`,
      },
      ...turns.flatMap((turn): AiMessage[] => [
        { role: "user", content: turn.question },
        { role: "assistant", content: turn.answer },
      ]),
      { role: "user", content: question.trim() },
    ];
    setRequest(await prepareAiRequest(action, messages));
  }

  return (
    <div className="ai-action">
      <h4>{title}</h4>
      {turns.length > 0 && (
        <ul className="row-list" aria-label="AI answers">
          {turns.map((turn, index) => (
            <li key={index} className="report-row">
              <span className="report-name">{turn.question}</span>
              <span className="ai-answer">{turn.answer}</span>
            </li>
          ))}
        </ul>
      )}
      {request ? (
        <AiRequestReview
          request={request}
          onCancel={() => setRequest(null)}
          onReply={(answer) => {
            setTurns([...turns, { question: question.trim(), answer }]);
            setQuestion("");
            setRequest(null);
          }}
        />
      ) : (
        <form className="stack-form" onSubmit={(event) => void review(event)}>
          <label>
            Your question
            <textarea
              rows={2}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>
          {explanation && <p className="muted">{explanation}</p>}
          <button
            type="submit"
            className="action-button"
            disabled={isBlocked || question.trim() === ""}
          >
            Ask AI
          </button>
        </form>
      )}
    </div>
  );
}
