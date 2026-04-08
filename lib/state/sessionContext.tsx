/*
 * This file manages Shopping Sessions — one per trip to the store.
 *
 * A session is created FROM a GroceryList (the blueprint).
 * It snapshots the list's items at that moment so that:
 *   - Checking items off during shopping never mutates the blueprint
 *   - The blueprint stays clean and reusable week after week
 *
 * Flow:
 *   1. User taps "Start Shopping" on a list  →  startSession(list)
 *   2. User checks off items in shopping mode →  toggleSessionItem(sessionId, itemId)
 *   3. User finishes the trip                 →  completeSession(sessionId)
 */

import { createContext, useState, useContext, ReactNode } from "react";
import { GroceryList, ShoppingSession, SessionItem } from "../types";

// ========================================
// SECTION 1: TYPESCRIPT INTERFACE
// ========================================

interface SessionContextType {
  // All sessions (active + completed)
  sessions: ShoppingSession[];

  // Start a new shopping trip from a blueprint list.
  // Snapshots all items from the list at this moment.
  // Returns the newly created session.
  startSession: (list: GroceryList) => ShoppingSession;

  // Get a single session by its ID.
  getSessionById: (sessionId: string) => ShoppingSession | undefined;

  // Get the active (not yet completed) session for a given list, if one exists.
  getActiveSessionForList: (listId: string) => ShoppingSession | undefined;

  // Toggle one item as picked up / not picked up.
  // This ONLY changes the session — the blueprint list is untouched.
  toggleSessionItem: (sessionId: string, itemId: string) => void;

  // Mark the entire session as done. Sets completedAt timestamp.
  completeSession: (sessionId: string) => void;

  // Delete a session (e.g. user cancels the trip before finishing).
  deleteSession: (sessionId: string) => void;

  // Add a manually-entered item to an in-progress session.
  // This ONLY adds to the session — the blueprint list is never touched.
  addItemToSession: (
    sessionId: string,
    name: string,
    quantity?: string,
  ) => void;

  // Sync an in-progress session with its blueprint list.
  // Adds any blueprint items that were added after the session was first created,
  // so the user sees newly-added list items when they resume shopping.
  // Items already in the session (checked or unchecked) are never duplicated.
  // The blueprint list itself is never modified.
  resyncSession: (sessionId: string, list: GroceryList) => void;
}

// ========================================
// SECTION 2: CONTEXT SETUP
// ========================================

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

// ========================================
// SECTION 3: PROVIDER COMPONENT
// ========================================

export function SessionProvider(props: SessionProviderProps) {
  const [sessions, setSessions] = useState<ShoppingSession[]>([]);

  // ------------------------------------------
  // FUNCTION: startSession
  // ------------------------------------------
  // Called when the user taps "Start Shopping" on a list.
  // Creates a snapshot of all current blueprint items into a new session.
  // Parameters: list (GroceryList) — the blueprint to snapshot
  // Returns: ShoppingSession (the newly created session)

  const startSession = (list: GroceryList): ShoppingSession => {
    // Snapshot each blueprint item into a SessionItem.
    // Notice: no `completed` field on GroceryItem anymore — sessions own that.
    const snapshotItems: SessionItem[] = list.items.map((item) => ({
      itemId: item.id,
      name: item.name,
      quantity: item.quantity,
      completed: false, // Always starts unchecked, regardless of past sessions
    }));

    const newSession: ShoppingSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      listId: list.id,
      createdAt: new Date().toISOString(),
      completedAt: undefined, // undefined = in-progress
      items: snapshotItems,
    };

    setSessions((prev) => [...prev, newSession]);
    return newSession;
  };

  // ------------------------------------------
  // FUNCTION: getSessionById
  // ------------------------------------------
  // Parameters: sessionId (string)
  // Returns: ShoppingSession | undefined

  const getSessionById = (sessionId: string): ShoppingSession | undefined => {
    return sessions.find((s) => s.id === sessionId);
  };

  // ------------------------------------------
  // FUNCTION: getActiveSessionForList
  // ------------------------------------------
  // Finds a session that belongs to a list and hasn't been completed yet.
  // Used to resume a trip if the user navigates away mid-shop.
  // Parameters: listId (string)
  // Returns: ShoppingSession | undefined

  const getActiveSessionForList = (
    listId: string,
  ): ShoppingSession | undefined => {
    return sessions.find((s) => s.listId === listId && !s.completedAt);
  };

  // ------------------------------------------
  // FUNCTION: toggleSessionItem
  // ------------------------------------------
  // Flips one item's completed state inside a session.
  // The blueprint GroceryItem is never touched.
  // Parameters: sessionId (string), itemId (string) — the original GroceryItem.id
  // Returns: void

  const toggleSessionItem = (sessionId: string, itemId: string) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;

        const updatedItems = session.items.map((item) =>
          item.itemId === itemId
            ? { ...item, completed: !item.completed }
            : item,
        );

        return { ...session, items: updatedItems };
      }),
    );
  };

  // ------------------------------------------
  // FUNCTION: completeSession
  // ------------------------------------------
  // Marks a session as done by stamping completedAt.
  // After this the session becomes history — blueprint is still untouched.
  // Parameters: sessionId (string)
  // Returns: void

  const completeSession = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, completedAt: new Date().toISOString() }
          : session,
      ),
    );
  };

  // ------------------------------------------
  // FUNCTION: deleteSession
  // ------------------------------------------
  // Removes a session entirely (e.g. user cancels mid-trip).
  // Parameters: sessionId (string)
  // Returns: void

  const deleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  // ------------------------------------------
  // FUNCTION: addItemToSession
  // ------------------------------------------
  // Appends a new item entered manually during shopping to the session.
  // The original blueprint list is NEVER modified — this is session-only.
  // Parameters: sessionId (string), name (string), quantity? (string)
  // Returns: void

  const addItemToSession = (
    sessionId: string,
    name: string,
    quantity?: string,
  ) => {
    const newItem: SessionItem = {
      itemId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      quantity: quantity?.trim() || undefined,
      completed: false,
    };

    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, items: [...session.items, newItem] }
          : session,
      ),
    );
  };

  // ------------------------------------------
  // FUNCTION: resyncSession
  // ------------------------------------------
  // Merges any blueprint items added after the session was created into the session.
  // Compares session item IDs against blueprint item IDs — only new ones are appended.
  // Existing session items (including manually-added ones) are untouched.
  // Parameters: sessionId (string), list (GroceryList) — the blueprint
  // Returns: void

  const resyncSession = (sessionId: string, list: GroceryList) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;

        const existingItemIds = new Set(session.items.map((i) => i.itemId));

        const newItems: SessionItem[] = list.items
          .filter((item) => !existingItemIds.has(item.id))
          .map((item) => ({
            itemId: item.id,
            name: item.name,
            quantity: item.quantity,
            completed: false,
          }));

        if (newItems.length === 0) return session; // nothing changed
        return { ...session, items: [...session.items, ...newItems] };
      }),
    );
  };

  // ========================================
  // SECTION 4: PROVIDE EVERYTHING
  // ========================================

  const value: SessionContextType = {
    sessions,
    startSession,
    getSessionById,
    getActiveSessionForList,
    toggleSessionItem,
    completeSession,
    deleteSession,
    addItemToSession,
    resyncSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {props.children}
    </SessionContext.Provider>
  );
}

// ========================================
// SECTION 5: CUSTOM HOOK
// ========================================

export function useSessions(): SessionContextType {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSessions must be used within a SessionProvider");
  }
  return context;
}
