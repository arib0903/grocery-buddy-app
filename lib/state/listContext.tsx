/*
 * This file manages GroceryList state and exposes CRUD operations to all screens.
 *
 * All data operations are delegated to LocalListService (lib/api/listService.ts).
 * To migrate to AppSync, swap LocalListService for AppSyncListService —
 * this file and all components remain unchanged.
 */

import { createContext, useState, useContext, useRef, useMemo, ReactNode } from "react";
import { GroceryItem, GroceryList } from "../types";
import { LocalListService } from "../api/listService";

// ========================================
// SECTION 1: TYPESCRIPT INTERFACE
// ========================================

interface ListContextType {
  lists: GroceryList[];
  addList: (name: string, store: string) => GroceryList | null;
  updateList: (id: string, updates: Partial<GroceryList>) => void;
  deleteList: (id: string) => void;
  getListById: (id: string) => GroceryList | undefined;
  addItemToList: (listId: string, name: string, quantity?: number | null, unit?: string, category?: string, notes?: string) => void;
  deleteItemByName: (listId: string, itemName: string) => void;
  updateItem: (listId: string, itemId: string, updates: Partial<GroceryItem>) => void;
  deleteItem: (listId: string, itemId: string) => void;
  toggleItem: (listId: string, itemId: string) => void;
}

const ListContext = createContext<ListContextType | undefined>(undefined);

interface ListProviderProps {
  children: ReactNode;
}

// ========================================
// SECTION 2: PROVIDER
// ========================================

export function ListProvider(props: ListProviderProps) {
  const [lists, setLists] = useState<GroceryList[]>([]);

  // Ref so the service always reads the latest lists without being recreated on every render.
  const listsRef = useRef(lists);
  listsRef.current = lists;

  const service = useMemo(() => new LocalListService(listsRef, setLists), []);

  // ------------------------------------------
  // FUNCTION: addList
  // ------------------------------------------
  const addList = (name: string, store: string): GroceryList | null => {
    return service.createList(name, store);
  };

  // ------------------------------------------
  // FUNCTION: updateList
  // ------------------------------------------
  // Used internally and directly when updating list name/store.
  const updateList = (id: string, updates: Partial<GroceryList>) => {
    service.updateList(id, updates);
  };

  // ------------------------------------------
  // FUNCTION: deleteList
  // ------------------------------------------
  const deleteList = (id: string) => {
    service.deleteList(id);
  };

  // ------------------------------------------
  // FUNCTION: getListById
  // ------------------------------------------
  const getListById = (id: string): GroceryList | undefined => {
    return lists.find((l) => l.id === id);
  };

  // ------------------------------------------
  // FUNCTION: addItemToList
  // ------------------------------------------
  const addItemToList = (
    listId: string,
    name: string,
    quantity?: number | null,
    unit?: string,
    category?: string,
    notes?: string,
  ) => {
    service.addItem(listId, name, quantity, unit, category, notes);
  };

  // ------------------------------------------
  // FUNCTION: updateItem
  // ------------------------------------------
  const updateItem = (listId: string, itemId: string, updates: Partial<GroceryItem>) => {
    service.updateItem(listId, itemId, updates);
  };

  // ------------------------------------------
  // FUNCTION: deleteItem
  // ------------------------------------------
  const deleteItem = (listId: string, itemId: string) => {
    service.deleteItem(listId, itemId);
  };

  // ------------------------------------------
  // FUNCTION: deleteItemByName
  // ------------------------------------------
  const deleteItemByName = (listId: string, itemName: string) => {
    service.deleteItemByName(listId, itemName);
  };

  // ------------------------------------------
  // FUNCTION: toggleItem
  // ------------------------------------------
  // NOTE: Completion state lives on SessionItem, not GroceryItem.
  // Use toggleSessionItem from sessionContext instead.
  const toggleItem = (_listId: string, _itemId: string) => {};

  const value: ListContextType = {
    lists,
    addList,
    updateList,
    deleteList,
    getListById,
    addItemToList,
    deleteItemByName,
    updateItem,
    deleteItem,
    toggleItem,
  };

  return (
    <ListContext.Provider value={value}>{props.children}</ListContext.Provider>
  );
}

// ========================================
// SECTION 3: CUSTOM HOOK
// ========================================

export function useLists(): ListContextType {
  const context = useContext(ListContext);
  if (context === undefined) {
    throw new Error("useLists must be used within a ListProvider");
  }
  return context;
}
