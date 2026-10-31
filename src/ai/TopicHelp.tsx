import { AiConversation } from "./AiConversation";

type Props = {
  action: "ask-about-flashcard" | "ask-about-grammar-concept";
  /** The minimum that identifies the flashcard or grammar concept. */
  topic: string;
};

/** Questions to AI about one flashcard or grammar concept. */
export function TopicHelp({ action, topic }: Props) {
  return (
    <AiConversation
      action={action}
      title="Topic help"
      instructions={`You answer an advanced learner of French's questions about one topic. Be brief. Reply in plain text.\n\nTopic:\n${topic}`}
    />
  );
}
