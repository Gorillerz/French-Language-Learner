import { useEffect, useRef, useState } from "react";
import {
  AiError,
  aiServiceName,
  sendAiRequest,
  type AiMessage,
  type LearnerAction,
  type PreparedAiRequest,
} from "./client";
import { BATCH_SIZE } from "./questionBatch";
import { useAiBlocker } from "./useAiBlocker";

type Props = {
  request: PreparedAiRequest;
  /** Gets the model's text. An `AiError` from here is shown, and the Learner can resend. */
  onReply: (text: string) => void | Promise<void>;
  onCancel: () => void;
  /** Anything else the Learner should know about what is, or is not, being sent. */
  note?: string;
};

const actionSummaries: Record<LearnerAction, string> = {
  "fill-flashcard-details": "Fill the blank details of this flashcard.",
  "ask-about-flashcard": "Ask a question about this flashcard.",
  "ask-about-grammar-concept": "Ask a question about this grammar concept.",
  "generate-quiz-questions": `Write ${BATCH_SIZE} new quiz questions for this topic.`,
  "ask-about-quiz-question": "Ask a question about this quiz question.",
};

const roleLabels: Record<AiMessage["role"], string> = {
  system: "Instructions",
  user: "Your content",
  assistant: "Earlier AI answer",
};

/** Shows exactly what a prepared request contains, and sends it only on the Learner's word. */
export function AiRequestReview({ request, onReply, onCancel, note }: Props) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isBlocked, reason } = useAiBlocker();
  const inFlight = useRef<AbortController | null>(null);

  // Leaving drops the request, so a late reply cannot land behind the Learner's back.
  useEffect(() => () => inFlight.current?.abort(), []);

  async function send() {
    const controller = new AbortController();
    inFlight.current = controller;
    setIsSending(true);
    setError(null);
    try {
      await onReply(await sendAiRequest(request, controller.signal));
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(failure instanceof AiError ? failure.message : "Something went wrong. Try again.");
    }
    setIsSending(false);
  }

  return (
    <section aria-label="Review AI request" className="ai-review">
      <h4>Review before sending</h4>
      <p>{actionSummaries[request.action]}</p>
      <p className="muted">
        Only the text below goes to {aiServiceName()}, using the model {request.model}, along with
        your API key. Nothing else from the app is included.
      </p>
      {note && <p>{note}</p>}
      {request.messages.map((message, index) => (
        <div key={index} className="ai-message">
          <strong>{roleLabels[message.role]}</strong>
          <pre>{message.content}</pre>
        </div>
      ))}
      {reason && <p className="muted">{reason}</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="primary-button"
          disabled={isSending || isBlocked}
          onClick={() => void send()}
        >
          {isSending ? "Sending…" : "Send to AI"}
        </button>
        <button type="button" className="action-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
