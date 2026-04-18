// Groups any array of items that carry an optional `category` field into
// SectionList-compatible sections, ordered by CATEGORY_ORDER.
// Items with no category or an unrecognised category fall into "other".

import { CATEGORY_ORDER } from "../../constants/categories";

export function groupByCategory<T extends { category?: string }>(
  items: T[],
): { title: string; data: T[] }[] {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const key = item.category?.toLowerCase() ?? "other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  const sections: { title: string; data: T[] }[] = [];

  // Add canonical categories in defined order.
  for (const cat of CATEGORY_ORDER) {
    if (map.has(cat)) {
      sections.push({ title: cat, data: map.get(cat)! });
      map.delete(cat);
    }
  }

  // Any unrecognised category keys (not in CATEGORY_ORDER, not "other") come next.
  for (const [key, data] of map) {
    if (key !== "other") sections.push({ title: key, data });
  }

  // "other" is always last.
  if (map.has("other")) {
    sections.push({ title: "other", data: map.get("other")! });
  }

  return sections;
}
