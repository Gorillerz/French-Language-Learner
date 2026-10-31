import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { DEFAULT_MODEL, getAiKey, getAiModel, saveAiKey, saveAiModel } from "./client";

export function AiArea() {
  const savedModel = useLiveQuery(getAiModel);
  // Waits for the saved model, so loading it cannot overwrite what the Learner types.
  return savedModel === undefined ? null : <AiSettingsForm savedModel={savedModel} />;
}

function AiSettingsForm({ savedModel }: { savedModel: string }) {
  const hasKey = useLiveQuery(async () => (await getAiKey()) !== "");
  const [key, setKey] = useState("");
  const [model, setModel] = useState(savedModel);
  const [notice, setNotice] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    const newKey = key.trim();
    if (newKey) await saveAiKey(newKey);
    await saveAiModel(model.trim() || DEFAULT_MODEL);
    setKey("");
    setNotice("Saved.");
  }

  async function removeKey() {
    await saveAiKey("");
    setNotice("Key removed.");
  }

  return (
    <form className="area-content stack-form" onSubmit={(event) => void save(event)}>
      <p>
        AI help runs only when you ask for it, and shows you what will be sent first. It uses your
        own OpenRouter API key, which is sent to the AI service with each request. If you set up
        sync, the key also reaches your other devices through the cloud, end-to-end encrypted like
        the rest of your settings, so the cloud cannot read it.
      </p>
      <label>
        OpenRouter API key
        <input
          type="password"
          autoComplete="off"
          value={key}
          placeholder={hasKey ? "Saved. Enter a new key to replace it." : ""}
          onChange={(event) => setKey(event.target.value)}
        />
      </label>
      <label>
        Model
        <input value={model} onChange={(event) => setModel(event.target.value)} />
      </label>
      <div className="form-actions">
        <button type="submit" className="primary-button">
          Save AI settings
        </button>
        {hasKey && (
          <button type="button" className="action-button" onClick={() => void removeKey()}>
            Remove key
          </button>
        )}
      </div>
      <p role="status" aria-label="AI settings">
        {notice}
      </p>
    </form>
  );
}
