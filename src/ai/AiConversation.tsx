import { useState, type FormEvent } from "react";
import { AiRequestReview } from "./AiRequestReview";
import { prepareAiRequest, type AiMessage, type LearnerAction, type PreparedAiRequest } from "./client";
import { useAiBlocker } from "./useAiBlocker";

type Props = {
  action: LearnerAction;
  title: string;
  /** Sent with every question, so it holds only the minimum the conversation is about. */
  instructions: string;
};

type Turn = { question: string; answer: string };

/**
 * What Topic help and Follow-up questions share: asking AI in turns. Answers live
 * here only, so leaving the page ends the conversation.
 */
export function AiConversation({ action, title, instructions }: Props) {
  const { isBlocked, reason } = useAiBlocker();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [request, setRequest] = useState<PreparedAiRequest | null>(null);

  async function review(event: FormEvent) {
    event.preventDefault();
    const messages: AiMessage[] = [
      { role: "system", content: instructions },
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
          {reason && <p className="muted">{reason}</p>}
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
