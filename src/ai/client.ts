import { aiTarget, aiTimeoutMs } from "../serviceConfig";
import { getSetting, setSetting } from "../settings";

/**
 * The one way out to the AI service. A call takes two steps, so nothing can be sent
 * unseen: `prepareAiRequest` builds a request naming the Learner action behind it,
 * `AiRequestReview` shows it, and `sendAiRequest` posts exactly that and nothing
 * else on the Learner's say-so. Build the messages from the minimum the action needs.
 */

export type LearnerAction =
  | "fill-flashcard-details"
  | "ask-about-flashcard"
  | "ask-about-grammar-concept"
  | "generate-quiz-questions"
  | "ask-about-quiz-question";

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

/** Everything sent to the service but the API key, which is added at the last moment. */
export type PreparedAiRequest = {
  action: LearnerAction;
  model: string;
  messages: AiMessage[];
};

/** `message` is written for the Learner. */
export class AiError extends Error {}

export const DEFAULT_MODEL = "openrouter/auto";

const KEY_SETTING = "openRouterKey";
const MODEL_SETTING = "openRouterModel";

export async function getAiKey() {
  return (await getSetting<string>(KEY_SETTING)) ?? "";
}

export async function getAiModel() {
  return (await getSetting<string>(MODEL_SETTING)) || DEFAULT_MODEL;
}

export function saveAiKey(key: string) {
  return setSetting(KEY_SETTING, key);
}

export function saveAiModel(model: string) {
  return setSetting(MODEL_SETTING, model);
}

/** Where requests go, for telling the Learner. */
export function aiServiceName() {
  return aiTarget.available ? new URL(aiTarget.baseUrl).host : "the AI service";
}

export async function prepareAiRequest(
  action: LearnerAction,
  messages: AiMessage[],
): Promise<PreparedAiRequest> {
  return { action, model: await getAiModel(), messages };
}

function failureFor(status: number) {
  if (status === 401) {
    return new AiError("The AI service refused your API key. Check it in the AI area.");
  }
  if (status === 429) {
    return new AiError(
      "The AI service is limiting requests on your key. Wait a little, then try again.",
    );
  }
  if (status >= 500) {
    return new AiError("The AI service is having trouble. Try again later.");
  }
  return new AiError(`The AI service turned this request down (error ${status}).`);
}

const UNUSABLE_REPLY = "The AI service sent a reply that could not be used. Nothing was saved.";

async function readReply(response: Response) {
  let body: { choices?: { message?: { content?: unknown } }[] };
  try {
    body = await response.json();
  } catch {
    throw new AiError(UNUSABLE_REPLY);
  }
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") throw new AiError(UNUSABLE_REPLY);
  return content;
}

/** Returns the model's text. Fails with an `AiError`, or an abort if `signal` fires. */
export async function sendAiRequest({ model, messages }: PreparedAiRequest, signal?: AbortSignal) {
  if (!aiTarget.available) throw new AiError("This build has no safe AI service to talk to.");
  if (!navigator.onLine) throw new AiError("You are offline. AI help needs an internet connection.");
  const key = await getAiKey();
  if (!key) throw new AiError("Add your OpenRouter API key in the AI area first.");

  const timeout = AbortSignal.timeout(aiTimeoutMs);
  try {
    const response = await fetch(`${aiTarget.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      credentials: "omit",
      // A redirect could carry the API key away from the HTTPS address that was checked.
      redirect: "error",
    });
    if (!response.ok) throw failureFor(response.status);
    return await readReply(response);
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted) throw new AiError("The AI service took too long to answer. Try again.");
    if (error instanceof AiError) throw error;
    throw new AiError("Could not reach the AI service. Check your connection and try again.");
  }
}
