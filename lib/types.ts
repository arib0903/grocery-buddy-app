// What every grocery item looks like
export interface GroceryItem {
  id: string; // Unique identifier (like "item-123")
  name: string; // What the item is called ("Milk")
  quantity?: string;
  completed: boolean; // Whether it's been checked off the list
  createdAt: string; // When it was added to the list
  price?: number;
  addedBy?: string;
}

// What every grocery list looks like (collection of items)
export interface GroceryList {
  id: string; // Unique identifier (like "list-456")
  name: string; // Name of the list ("Weekly Groceries")
  store: string;
  items: GroceryItem[]; // Array of all items in this list
  createdAt: string; // When the list was created
  updatedAt: string; // When the list was last modified
}

export interface Store {
  id: string;
  name: string;
  icon: string; // Emoji representation of the store
}

// export interface ListStore {
//   lists: GroceryList[];
//   addList: (list: Omit<GroceryList, 'id' | 'createdAt' | 'updatedAt'>) => void;
//   updateList: (id: string, updates: Partial<GroceryList>) => void;
//   deleteList: (id: string) => void;
//   addItemToList: (listId: string, item: Omit<GroceryItem, 'id' | 'createdAt'>) => void;
//   updateItem: (listId: string, itemId: string, updates: Partial<GroceryItem>) => void;
//   deleteItem: (listId: string, itemId: string) => void;
//   toggleItem: (listId: string, itemId: string) => void;
// }
