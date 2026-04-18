/*
 * List Service
 *
 * IListService defines the contract for all list and item CRUD operations.
 * LocalListService is the in-memory implementation (current behavior).
 *
 * To migrate to AppSync: implement IListService with async GraphQL calls,
 * update the context to await results, and swap LocalListService out —
 * no component changes required.
 *
 * NOTE: Interface is synchronous because LocalListService drives React state
 * directly. When we add AppSync, the interface will become async and the
 * context will be updated accordingly.
 */

import { Dispatch, SetStateAction } from "react";
import { GroceryItem, GroceryList } from "../types";

// ========================================
// SECTION 1: INTERFACE
// ========================================

export interface IListService {
  createList(name: string, store: string): GroceryList | null;
  updateList(listId: string, updates: { name?: string; store?: string }): void;
  deleteList(listId: string): void;
  addItem(
    listId: string,
    name: string,
    quantity?: number | null,
    unit?: string,
    category?: string,
    notes?: string,
  ): GroceryItem;
  updateItem(listId: string, itemId: string, updates: Partial<GroceryItem>): void;
  deleteItem(listId: string, itemId: string): void;
  deleteItemByName(listId: string, itemName: string): void;
}

// ========================================
// SECTION 2: LOCAL IMPLEMENTATION
// ========================================

export class LocalListService implements IListService {
  // listsRef: always points to the latest lists state without causing re-instantiation.
  // setLists: React state setter — the only way to mutate lists from outside React.
  constructor(
    private listsRef: { current: GroceryList[] },
    private setLists: Dispatch<SetStateAction<GroceryList[]>>,
  ) {}

  createList(name: string, store: string): GroceryList | null {
    const normalizedName = name.trim().replace(/\s+/g, " ");
    const normalizedStore = store.trim().replace(/\s+/g, " ");

    if (!normalizedName || !normalizedStore) return null;
    if (normalizedName.length > 80 || normalizedStore.length > 80) return null;
    if (/[\u0000-\u001F\u007F]/.test(normalizedName)) return null;
    if (/[\u0000-\u001F\u007F]/.test(normalizedStore)) return null;

    const duplicate = this.listsRef.current.some(
      (l) =>
        l.name.toLowerCase() === normalizedName.toLowerCase() &&
        l.store.toLowerCase() === normalizedStore.toLowerCase(),
    );
    if (duplicate) return null;

    const now = new Date().toISOString();
    const newList: GroceryList = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: normalizedName,
      store: normalizedStore,
      items: [],
      createdAt: now,
      updatedAt: now,
    };

    this.setLists((prev) => [...prev, newList]);
    return newList;
  }

  updateList(listId: string, updates: { name?: string; store?: string }): void {
    this.setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, ...updates, updatedAt: new Date().toISOString() }
          : l,
      ),
    );
  }

  deleteList(listId: string): void {
    this.setLists((prev) => prev.filter((l) => l.id !== listId));
  }

  addItem(
    listId: string,
    name: string,
    quantity?: number | null,
    unit?: string,
    category?: string,
    notes?: string,
  ): GroceryItem {
    const now = new Date().toISOString();
    const newItem: GroceryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      quantity: quantity ?? null,
      unit: unit ?? null,
      notes: notes ?? null,
      category,
      createdAt: now,
      updatedAt: now,
    };

    this.setLists((prev) =>
      prev.map((l) =>
        l.id !== listId
          ? l
          : { ...l, items: [...l.items, newItem], updatedAt: now },
      ),
    );

    return newItem;
  }

  updateItem(listId: string, itemId: string, updates: Partial<GroceryItem>): void {
    this.setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          updatedAt: new Date().toISOString(),
          items: l.items.map((item) =>
            item.id === itemId
              ? { ...item, ...updates, updatedAt: new Date().toISOString() }
              : item,
          ),
        };
      }),
    );
  }

  deleteItem(listId: string, itemId: string): void {
    this.setLists((prev) =>
      prev.map((l) =>
        l.id !== listId
          ? l
          : {
              ...l,
              items: l.items.filter((item) => item.id !== itemId),
              updatedAt: new Date().toISOString(),
            },
      ),
    );
  }

  deleteItemByName(listId: string, itemName: string): void {
    const nameLower = itemName.toLowerCase();
    this.setLists((prev) =>
      prev.map((l) =>
        l.id !== listId
          ? l
          : {
              ...l,
              items: l.items.filter((item) => item.name.toLowerCase() !== nameLower),
              updatedAt: new Date().toISOString(),
            },
      ),
    );
  }
}
