/*
 * This file manages Shopping Sessions — one per trip to the store.
 *
 * A session is created FROM a GroceryList (the blueprint).
 * It snapshots the list's items at that moment so that:
 *   - Checking items off during shopping never mutates the blueprint
 *   - The blueprint stays clean and reusable week after week
 *
 * All data operations are delegated to LocalSessionService (lib/api/sessionService.ts).
 * To migrate to AppSync, swap LocalSessionService for AppSyncSessionService —
 * this file and all components remain unchanged.
 *
 * Flow:
 *   1. User taps "Start Shopping" on a list  →  startSession(list)
 *   2. User checks off items in shopping mode →  toggleSessionItem(sessionId, itemId)
 *   3. User finishes the trip                 →  completeSession(sessionId)
 */

import { createContext, useState, useContext, useRef, useMemo, ReactNode } from "react";
import { Alert } from "react-native";
import { GroceryList, ShoppingSession } from "../types";
import { LocalSessionService } from "../api/sessionService";

// ========================================
// SECTION 1: TYPESCRIPT INTERFACE
// ========================================

interface SessionContextType {
  sessions: ShoppingSession[];
  startSession: (list: GroceryList) => ShoppingSession | null;
  getSessionById: (sessionId: string) => ShoppingSession | undefined;
  getActiveSessionForList: (listId: string) => ShoppingSession | undefined;
  toggleSessionItem: (sessionId: string, itemId: string) => void;
  completeSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  addItemToSession: (
    sessionId: string,
    name: string,
    quantity?: number | null,
    unit?: string,
    category?: string,
  ) => void;
  resyncSession: (sessionId: string, list: GroceryList) => void;
  removeItemFromSession: (sessionId: string, itemName: string) => void;
  setSessionItemCompleted: (
    sessionId: string,
    itemName: string,
    completed: boolean,
  ) => void;
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

  // Ref so the service always reads the latest sessions without being recreated on every render.
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const service = useMemo(() => new LocalSessionService(sessionsRef, setSessions), []);

  const startSession = (list: GroceryList): ShoppingSession | null => {
    if (list.items.length === 0) {
      Alert.alert(
        "Cannot Start Session",
        "Add at least one item to this list before starting shopping mode.",
      );
      return null;
    }
    return service.startSession(list);
  };

  const getSessionById = (sessionId: string): ShoppingSession | undefined => {
    return service.getSession(sessionId);
  };

  const getActiveSessionForList = (listId: string): ShoppingSession | undefined => {
    return service.getActiveSession(listId);
  };

  const toggleSessionItem = (sessionId: string, itemId: string) => {
    service.toggleSessionItem(sessionId, itemId);
  };

  const completeSession = (sessionId: string) => {
    service.completeSession(sessionId);
  };

  const deleteSession = (sessionId: string) => {
    service.deleteSession(sessionId);
  };

  const addItemToSession = (
    sessionId: string,
    name: string,
    quantity?: number | null,
    unit?: string,
    category?: string,
  ) => {
    service.addItemToSession(sessionId, name, quantity, unit, category);
  };

  const resyncSession = (sessionId: string, list: GroceryList) => {
    service.resyncSession(sessionId, list);
  };

  const removeItemFromSession = (sessionId: string, itemName: string) => {
    service.removeItemFromSession(sessionId, itemName);
  };

  const setSessionItemCompleted = (
    sessionId: string,
    itemName: string,
    completed: boolean,
  ) => {
    service.setSessionItemCompleted(sessionId, itemName, completed);
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
    removeItemFromSession,
    setSessionItemCompleted,
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
