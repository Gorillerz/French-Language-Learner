import { useState } from "react";
import type { PreparedAiRequest } from "../ai/client";
import { AiRequestReview } from "../ai/AiRequestReview";
import {
  blankDetails,
  parseDetailsReply,
  prepareDetailsRequest,
  type GeneratableDetail,
} from "../ai/flashcardDetails";
import { TopicHelp } from "../ai/TopicHelp";
import { useAiBlocker } from "../ai/useAiBlocker";
import type { VocabularyItem } from "../db";
import { saveGeneratedDetails, useItem } from "./store";

type Props = {
  itemId: string;
  onBack: () => void;
  onEdit: () => void;
};

const detailRows: { name: keyof VocabularyItem; label: string; lang?: string }[] = [
  { name: "definition", label: "Definition" },
  { name: "explanation", label: "Explanation" },
  { name: "etymology", label: "Etymology" },
  { name: "history", label: "History" },
  { name: "synonyms", label: "Synonyms", lang: "fr" },
  { name: "example", label: "Example sentences", lang: "fr" },
  { name: "pronunciation", label: "Pronunciation" },
];

export function ItemDetails({ itemId, onBack, onEdit }: Props) {
  const item = useItem(itemId);
  if (!item) return null;

  return (
    <section className="area-content">
      <button type="button" className="link-button" onClick={onBack}>
        Back to collection
      </button>
      <h3 lang="fr">{item.french}</h3>
      <p>{item.english}</p>
      <dl className="detail-list">
        {detailRows.map(({ name, label, lang }) => (
          <div key={name}>
            <dt>{label}</dt>
            {item[name] ? <dd lang={lang}>{item[name]}</dd> : <dd className="muted">Blank</dd>}
          </div>
        ))}
      </dl>
      <div className="form-actions">
        <button
          type="button"
          className="action-button"
          aria-label={`Edit ${item.french}`}
          onClick={onEdit}
        >
          Edit
        </button>
      </div>
      <FillBlankDetails item={item} />
      <TopicHelp
        action="ask-about-flashcard"
        topic={`French: ${item.french}\nEnglish: ${item.english}`}
      />
    </section>
  );
}

type PendingFill = { request: PreparedAiRequest; fields: GeneratableDetail[] };

function FillBlankDetails({ item }: { item: VocabularyItem }) {
  const { isBlocked, reason } = useAiBlocker();
  const [pending, setPending] = useState<PendingFill | null>(null);
  const [result, setResult] = useState("");
  const fields = blankDetails(item);

  async function review() {
    setResult("");
    setPending({ request: await prepareDetailsRequest(item, fields), fields });
  }

  async function save(text: string, requested: GeneratableDetail[]) {
    const saved = await saveGeneratedDetails(item.id, parseDetailsReply(text, requested));
    setPending(null);
    setResult(
      saved === 0
        ? "Those details are no longer blank, so nothing was changed."
        : `Filled ${saved} blank ${saved === 1 ? "detail" : "details"}.`,
    );
  }

  if (pending) {
    return (
      <AiRequestReview
        request={pending.request}
        onReply={(text) => save(text, pending.fields)}
        onCancel={() => setPending(null)}
      />
    );
  }

  return (
    <div className="ai-action">
      {fields.length > 0 ? (
        <button
          type="button"
          className="action-button"
          disabled={isBlocked}
          onClick={() => void review()}
        >
          Fill blank details
        </button>
      ) : (
        <p className="muted">This card has no blank details for AI to fill.</p>
      )}
      {fields.length > 0 && reason && <p className="muted">{reason}</p>}
      <p role="status" aria-label="AI result">
        {result}
      </p>
    </div>
  );
}
