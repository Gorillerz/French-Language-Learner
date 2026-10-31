import { useState, type FormEvent } from "react";
import type { ItemFields } from "./store";

type Props = {
  title: string;
  initial?: ItemFields;
  onSave: (fields: ItemFields) => void;
  onCancel: () => void;
};

const blank: ItemFields = { french: "", english: "", definition: "", example: "", pronunciation: "" };

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

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed: ItemFields = {
      french: fields.french.trim(),
      english: fields.english.trim(),
      definition: fields.definition.trim(),
      example: fields.example.trim(),
      pronunciation: fields.pronunciation.trim(),
    };
    if (trimmed.french && trimmed.english) onSave(trimmed);
  }

  return (
    <form className="vocabulary stack-form" onSubmit={submit}>
      <h3>{title}</h3>
      {field("french", "French", true)}
      {field("english", "English", true)}
      <label>
        Definition
        <textarea
          rows={3}
          value={fields.definition}
          onChange={(event) => setFields({ ...fields, definition: event.target.value })}
        />
      </label>
      {field("example", "Example")}
      {field("pronunciation", "Pronunciation")}
      <div className="form-actions">
        <button type="submit" className="primary-button">
          Save
        </button>
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
