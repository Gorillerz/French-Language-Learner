import { useState, type FormEvent } from "react";
import { createCollection, useCollections } from "./store";

export function CollectionList({ onOpen }: { onOpen: (collectionId: string) => void }) {
  const collections = useCollections();
  const [name, setName] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed) void createCollection(trimmed).then(onOpen);
  }

  return (
    <section className="area-content">
      <h3>Collections</h3>
      <ul className="row-list" aria-label="Collections">
        {collections?.map((collection) => (
          <li key={collection.id}>
            <button
              type="button"
              className="row-button"
              aria-label={`Open ${collection.name}`}
              onClick={() => onOpen(collection.id)}
            >
              {collection.name}
            </button>
          </li>
        ))}
      </ul>
      <form className="inline-form" onSubmit={submit}>
        <label>
          New collection name
          <input value={name} required onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="submit" className="primary-button">
          Create collection
        </button>
      </form>
    </section>
  );
}
