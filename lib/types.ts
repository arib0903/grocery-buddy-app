// What every grocery item looks like
// NOTE: This is the BLUEPRINT item — it lives on the template list.
// `completed` does NOT belong here. Checked-off state lives on SessionItem instead.
export interface GroceryItem {
  id: string; // Unique identifier (like "item-123")
  name: string; // What the item is called ("Milk")
  quantity?: string;
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

// ─────────────────────────────────────────────
// SHOPPING SESSION TYPES
// ─────────────────────────────────────────────

// A snapshot of one item during an active shopping trip.
// This is what gets checked off — never the blueprint GroceryItem.
export interface SessionItem {
  itemId: string;      // References GroceryItem.id from the template list
  name: string;        // Snapshot of the name at the time the session was created
  quantity?: string;   // Snapshot of the quantity at the time the session was created
  completed: boolean;  // Whether this item has been picked up on THIS trip
}

// One trip to the store — created from a GroceryList blueprint.
// Checking items off here never touches the original list.
export interface ShoppingSession {
  id: string;
  listId: string;         // References GroceryList.id (the blueprint this was made from)
  createdAt: string;      // When this shopping trip started
  completedAt?: string;   // Set when the user finishes — undefined means in-progress
  items: SessionItem[];   // Snapshot of all items at the time of session creation
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
