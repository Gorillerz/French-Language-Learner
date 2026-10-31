import { useState, type FormEvent } from "react";
import type { ItemFields } from "./store";

type Props = {
  title: string;
  initial?: ItemFields;
  onSave: (fields: ItemFields) => void;
  onCancel: () => void;
};

const blank: ItemFields = {
  french: "",
  english: "",
  definition: "",
  explanation: "",
  etymology: "",
  history: "",
  synonyms: "",
  example: "",
  pronunciation: "",
};

export function ItemForm({ title, initial = blank, onSave, onCancel }: Props) {
  const [fields, setFields] = useState(initial);

  function field(name: keyof ItemFields, label: string, required = false) {
    return (
      <label>
        {label}
        <input
          value={fields[name]}
          required={required}
          onChange={(event) => setFields({ ...fields, [name]: event.target.value })}
        />
      </label>
    );
  }

  function longField(name: keyof ItemFields, label: string) {
    return (
      <label>
        {label}
        <textarea
          rows={3}
          value={fields[name]}
          onChange={(event) => setFields({ ...fields, [name]: event.target.value })}
        />
      </label>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed: ItemFields = {
      french: fields.french.trim(),
      english: fields.english.trim(),
      definition: fields.definition.trim(),
      explanation: fields.explanation.trim(),
      etymology: fields.etymology.trim(),
      history: fields.history.trim(),
      synonyms: fields.synonyms.trim(),
      example: fields.example.trim(),
      pronunciation: fields.pronunciation.trim(),
    };
    if (trimmed.french && trimmed.english) onSave(trimmed);
  }

  return (
    <form className="area-content stack-form" onSubmit={submit}>
      <h3>{title}</h3>
      {field("french", "French", true)}
      {field("english", "English", true)}
      {longField("definition", "Definition")}
      {longField("explanation", "Explanation")}
      {longField("etymology", "Etymology")}
      {longField("history", "History")}
      {field("synonyms", "Synonyms")}
      {longField("example", "Example sentences")}
      {field("pronunciation", "Pronunciation")}
      <div className="form-actions">
        <button type="submit" className="primary-button">
          Save
        </button>
        <button type="button" className="action-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
