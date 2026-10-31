import { useState } from "react";
import type { VocabularyItem } from "../db";
import { CollectionList } from "./CollectionList";
import { CollectionPage } from "./CollectionPage";
import { FlashcardSession } from "./FlashcardSession";
import { ItemDetails } from "./ItemDetails";
import { ItemEditor } from "./ItemEditor";
import { ItemForm } from "./ItemForm";
import { addItem } from "./store";

type View =
  | { name: "collections" }
  | { name: "collection"; collectionId: string }
  | { name: "addItem"; collectionId: string }
  | { name: "item"; collectionId: string; itemId: string }
  | { name: "editItem"; collectionId: string; itemId: string }
  | { name: "study"; collectionId: string; items: VocabularyItem[] };

export function VocabularyArea() {
  const [view, setView] = useState<View>({ name: "collections" });

  switch (view.name) {
    case "collections":
      return (
        <CollectionList
          onOpen={(collectionId) => setView({ name: "collection", collectionId })}
        />
      );
    case "collection": {
      const { collectionId } = view;
      return (
        <CollectionPage
          collectionId={collectionId}
          onBack={() => setView({ name: "collections" })}
          onAddItem={() => setView({ name: "addItem", collectionId })}
          onOpenItem={(itemId) => setView({ name: "item", collectionId, itemId })}
          onEditItem={(itemId) => setView({ name: "editItem", collectionId, itemId })}
          onStudy={(items) => setView({ name: "study", collectionId, items })}
        />
      );
    }
    case "addItem": {
      const { collectionId } = view;
      const backToCollection = () => setView({ name: "collection", collectionId });
      return (
        <ItemForm
          title="New item"
          onCancel={backToCollection}
          onSave={(fields) => {
            void addItem(collectionId, fields).then(backToCollection);
          }}
        />
      );
    }
    case "item": {
      const { collectionId, itemId } = view;
      return (
        <ItemDetails
          itemId={itemId}
          onBack={() => setView({ name: "collection", collectionId })}
          onEdit={() => setView({ name: "editItem", collectionId, itemId })}
        />
      );
    }
    case "editItem": {
      const { collectionId, itemId } = view;
      return (
        <ItemEditor
          itemId={itemId}
          onDone={() => setView({ name: "collection", collectionId })}
        />
      );
    }
    case "study": {
      const { collectionId, items } = view;
      return (
        <FlashcardSession
          collectionId={collectionId}
          items={items}
          onBack={() => setView({ name: "collection", collectionId })}
        />
      );
    }
  }
}
