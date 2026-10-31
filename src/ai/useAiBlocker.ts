import { useLiveQuery } from "dexie-react-hooks";
import { useConnection } from "../connection";
import { getAiKey } from "./client";

export type AiBlocker = { isBlocked: boolean; explanation: string | null };

/**
 * Whether AI actions can run now and, when they cannot, what to tell the Learner.
 * "Connection lost" is about the cloud, so it does not stop the AI service being tried.
 */
export function useAiBlocker(): AiBlocker {
  const key = useLiveQuery(getAiKey);
  const connection = useConnection();

  if (key === undefined) return { isBlocked: true, explanation: null };
  if (!key) {
    return {
      isBlocked: true,
      explanation: "To use AI help, add your OpenRouter API key in the AI area.",
    };
  }
  if (connection === "offline") {
    return { isBlocked: true, explanation: "You are offline. AI help needs an internet connection." };
  }
  return { isBlocked: false, explanation: null };
}
