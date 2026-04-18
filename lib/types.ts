// What every grocery item looks like
// NOTE: This is the BLUEPRINT item — it lives on the template list.
// `completed` does NOT belong here. Checked-off state lives on SessionItem instead.
export interface GroceryItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  category?: string;
  createdAt: string;
  updatedAt: string;
  price?: number;
  addedBy?: string;
}

// What every grocery list looks like (collection of items)
export interface GroceryList {
  id: string;
  name: string;
  store: string;
  items: GroceryItem[];
  createdAt: string;
  updatedAt: string;
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
  quantity: number | null;
  unit: string | null;
  category?: string;   // Snapshot of the category at the time the session was created
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

// ─────────────────────────────────────────────
// HOUSEHOLD & AUTH TYPES
// ─────────────────────────────────────────────

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  householdId: string | null;
  createdAt: string;
}

export interface Household {
  householdId: string;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export interface HouseholdMember {
  householdId: string;
  userId: string;
  displayName: string;
  role: "OWNER" | "MEMBER";
  joinedAt: string;
}
