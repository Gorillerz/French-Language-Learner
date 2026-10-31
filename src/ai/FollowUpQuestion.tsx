import { AiConversation } from "./AiConversation";

type Props = {
  /** The quiz question as the Learner saw it, and nothing else. */
  quizQuestion: string;
};

/** Questions to AI about one quiz question, during quiz review. */
export function FollowUpQuestion({ quizQuestion }: Props) {
  return (
    <AiConversation
      action="ask-about-quiz-question"
      title="Ask about this question"
      instructions={`You answer an advanced learner of French's questions about one quiz question. Be brief. Reply in plain text.\n\n${quizQuestion}`}
    />
  );
}
