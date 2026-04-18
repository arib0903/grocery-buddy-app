// Canonical grocery categories — defines display order and metadata.
// The LLM returns these as categoryHint strings; keys must match exactly (lowercase).

export type CategoryKey =
  | "produce"
  | "meat"
  | "dairy"
  | "bakery"
  | "frozen"
  | "pantry"
  | "beverages"
  | "household"
  | "other";

// Display order for section headers in both screens.
export const CATEGORY_ORDER: CategoryKey[] = [
  "produce",
  "meat",
  "dairy",
  "bakery",
  "frozen",
  "pantry",
  "beverages",
  "household",
  "other",
];

// Human-readable label and Ionicons icon name per category.
export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; icon: string }
> = {
  produce:   { label: "Produce",   icon: "leaf-outline"         },
  meat:      { label: "Meat",      icon: "nutrition-outline"    },
  dairy:     { label: "Dairy",     icon: "water-outline"        },
  bakery:    { label: "Bakery",    icon: "storefront-outline"   },
  frozen:    { label: "Frozen",    icon: "snow-outline"         },
  pantry:    { label: "Pantry",    icon: "archive-outline"      },
  beverages: { label: "Beverages", icon: "cafe-outline"         },
  household: { label: "Household", icon: "home-outline"         },
  other:     { label: "Other",     icon: "grid-outline"         },
};
