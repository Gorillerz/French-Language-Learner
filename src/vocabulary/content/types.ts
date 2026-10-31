export type BuiltInItem = {
  slug: string;
  french: string;
  english: string;
  definition: string;
  example: string;
  pronunciation: string;
};

export type BuiltInCollection = {
  id: string;
  name: string;
  items: BuiltInItem[];
};
