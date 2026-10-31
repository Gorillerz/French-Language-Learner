import type { VocabularyItem } from "../db";
import { useCollection, useItems, useLastRatings } from "./store";

type Props = {
  collectionId: string;
  onBack: () => void;
  onAddItem: () => void;
  onEditItem: (itemId: string) => void;
  onStudy: (items: VocabularyItem[]) => void;
};

export function CollectionPage({ collectionId, onBack, onAddItem, onEditItem, onStudy }: Props) {
  const collection = useCollection(collectionId);
  const items = useItems(collectionId);
  const lastRatings = useLastRatings(collectionId);

  return (
    <section className="vocabulary">
      <button type="button" className="link-button" onClick={onBack}>
        Back to collections
      </button>
      <h3>{collection?.name}</h3>
      <div className="form-actions">
        {items && items.length > 0 && (
          <button type="button" className="primary-button" onClick={() => onStudy(items)}>
            Study flashcards
          </button>
        )}
        <button type="button" className="action-button" onClick={onAddItem}>
          Add item
        </button>
      </div>
      {items?.length === 0 && <p className="muted">No items yet</p>}
      <ul className="row-list" aria-label="Items">
        {items?.map((item) => {
          const lastRating = lastRatings?.get(item.id);
          return (
            <li key={item.id} className="item-row">
              <span className="item-text">
                <span className="item-french" lang="fr">
                  {item.french}
                </span>
                <span className="item-english">{item.english}</span>
                {lastRating && <span className="item-rating">Last rating: {lastRating}</span>}
              </span>
              <button
                type="button"
                className="link-button"
                aria-label={`Edit ${item.french}`}
                onClick={() => onEditItem(item.id)}
              >
                Edit
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
