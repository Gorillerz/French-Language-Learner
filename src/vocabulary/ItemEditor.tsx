import { ItemForm } from "./ItemForm";
import { updateItem, useItem } from "./store";

type Props = {
  itemId: string;
  onDone: () => void;
};

export function ItemEditor({ itemId, onDone }: Props) {
  const item = useItem(itemId);
  if (!item) return null;

  return (
    <ItemForm
      title={`Edit ${item.french}`}
      initial={item}
      onCancel={onDone}
      onSave={(fields) => {
        void updateItem(itemId, fields).then(onDone);
      }}
    />
  );
}
