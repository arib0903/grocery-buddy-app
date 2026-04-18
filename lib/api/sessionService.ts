/*
 * Session Service
 *
 * ISessionService defines the contract for all shopping session operations.
 * LocalSessionService is the in-memory implementation (current behavior).
 *
 * To migrate to AppSync: implement ISessionService with GraphQL calls and
 * swap it into sessionContext — no component changes required.
 */

import { Dispatch, SetStateAction } from "react";
import { GroceryList, SessionItem, ShoppingSession } from "../types";

// ========================================
// SECTION 1: INTERFACE
// ========================================

export interface ISessionService {
  startSession(list: GroceryList): ShoppingSession | null;
  getSession(sessionId: string): ShoppingSession | undefined;
  getActiveSession(listId: string): ShoppingSession | undefined;
  toggleSessionItem(sessionId: string, itemId: string): void;
  setSessionItemCompleted(sessionId: string, itemName: string, completed: boolean): void;
  addItemToSession(
    sessionId: string,
    name: string,
    quantity?: number | null,
    unit?: string,
    category?: string,
  ): void;
  removeItemFromSession(sessionId: string, itemName: string): void;
  resyncSession(sessionId: string, list: GroceryList): void;
  completeSession(sessionId: string): void;
  deleteSession(sessionId: string): void;
}

// ========================================
// SECTION 2: LOCAL IMPLEMENTATION
// ========================================

export class LocalSessionService implements ISessionService {
  constructor(
    private sessionsRef: { current: ShoppingSession[] },
    private setSessions: Dispatch<SetStateAction<ShoppingSession[]>>,
  ) {}

  startSession(list: GroceryList): ShoppingSession | null {
    if (list.items.length === 0) return null;

    const snapshotItems: SessionItem[] = list.items.map((item) => ({
      itemId: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      completed: false,
    }));

    const newSession: ShoppingSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      listId: list.id,
      createdAt: new Date().toISOString(),
      completedAt: undefined,
      items: snapshotItems,
    };

    this.setSessions((prev) => [...prev, newSession]);
    return newSession;
  }

  getSession(sessionId: string): ShoppingSession | undefined {
    return this.sessionsRef.current.find((s) => s.id === sessionId);
  }

  getActiveSession(listId: string): ShoppingSession | undefined {
    return this.sessionsRef.current.find((s) => s.listId === listId && !s.completedAt);
  }

  toggleSessionItem(sessionId: string, itemId: string): void {
    this.setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          items: session.items.map((item) =>
            item.itemId === itemId ? { ...item, completed: !item.completed } : item,
          ),
        };
      }),
    );
  }

  setSessionItemCompleted(sessionId: string, itemName: string, completed: boolean): void {
    const nameLower = itemName.toLowerCase();
    this.setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          items: session.items.map((item) =>
            item.name.toLowerCase() === nameLower ? { ...item, completed } : item,
          ),
        };
      }),
    );
  }

  addItemToSession(
    sessionId: string,
    name: string,
    quantity?: number | null,
    unit?: string,
    category?: string,
  ): void {
    const newItem: SessionItem = {
      itemId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      quantity: quantity ?? null,
      unit: unit ?? null,
      category,
      completed: false,
    };

    this.setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, items: [...session.items, newItem] }
          : session,
      ),
    );
  }

  removeItemFromSession(sessionId: string, itemName: string): void {
    const nameLower = itemName.toLowerCase();
    this.setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          items: session.items.filter((item) => item.name.toLowerCase() !== nameLower),
        };
      }),
    );
  }

  resyncSession(sessionId: string, list: GroceryList): void {
    this.setSessions((prev) => {
      let didChange = false;

      const next = prev.map((session) => {
        if (session.id !== sessionId) return session;
        if (session.completedAt) return session;

        const existingItemIds = new Set(session.items.map((i) => i.itemId));

        const newItems: SessionItem[] = list.items
          .filter((item) => !existingItemIds.has(item.id))
          .map((item) => ({
            itemId: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            completed: false,
          }));

        if (newItems.length === 0) return session;

        didChange = true;
        return { ...session, items: [...session.items, ...newItems] };
      });

      return didChange ? next : prev;
    });
  }

  completeSession(sessionId: string): void {
    this.setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, completedAt: new Date().toISOString() }
          : session,
      ),
    );
  }

  deleteSession(sessionId: string): void {
    this.setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }
}
