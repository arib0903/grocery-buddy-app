/*
 * This file creates a "data warehouse" that all the screens can access.
 */

import { createContext, useState, useContext, ReactNode } from "react";
import { GroceryItem, GroceryList } from "../types";

// ========================================
// SECTION 1: TYPESCRIPT INTERFACE
// ========================================
// This defines the "shape" of what this Context will provide so that all the screens can acess it.
// This context hook will provide the functionalities of the CRUD operations for the lists
// AND act as a storage for the list data as GroceryList[]

interface ListContextType {
  lists: GroceryList[];
  addList: (name: string, store: string) => GroceryList;
  updateList: (id: string, updates: Partial<GroceryList>) => void;
  deleteList: (id: string) => void;
  getListById: (id: string) => GroceryList | undefined;
  addItemToList: (listId: string, name: string, quantity?: string) => void;
  updateItem: (
    listId: string,
    itemId: string,
    updates: Partial<GroceryItem>
  ) => void;
  deleteItem: (listId: string, itemId: string) => void;
  toggleItem: (listId: string, itemId: string) => void;
}

// JUST A REFRENCE TO LOOK AT HOW THE DATA IS DEFINED
/** GROCERY LIST
 * id: string; // Unique identifier (like "list-456")
  name: string; // Name of the list ("Weekly Groceries")
  items: GroceryItem[]; // Array of all items in this list
  createdAt: string; // When the list was created
  updatedAt: string; // When the list was last modified
 */
/** GROCERY ITEM
 *  id: string; // Unique identifier (like "item-123")
  name: string; // What the item is called ("Milk")
  quantity?: string;
  completed: boolean; // Whether it's been checked off the list
  createdAt: string; // When it was added to the list
  price?: number;
  addedBy?: string;
 */

//Creating a context to create an empty container for the data
const ListContext = createContext<ListContextType | undefined>(undefined);

// Needed so that all the children can access the listprovider's functions and lists
interface ListProviderProps {
  children: ReactNode;
}

/************************************************************************************************************************/
//Creating the actual component which will
//Store the data, and provide CRUD operations
export function ListProvider(props: ListProviderProps) {
  // ------------------------------------------
  // STATE: Store all lists in memory
  // ------------------------------------------
  const [lists, setLists] = useState<GroceryList[]>([]); // a list of objects. the objects represents the new list

  // ------------------------------------------
  // FUNCTION: addList
  // ------------------------------------------
  // Used in: app/create-list/index.tsx to create a new list by the handleCreateList callback function at line 45
  // Parameters: name (string), store (string) the actual store, items (GroceryItem[], default to [])
  // Returns: GroceryList (the newly created list)
  /**
   * NEED TO:
   * 1.  generate a unique ID for list
   * 2. get the current timestamp to update the created at
   * 3. create a newList object of GroceryList type that will be the strucutre of grocerylist
   * 4. update the lists state by calling setList
   *
   */

  const addList = (name: string, store: string): GroceryList => {
    // generate unique ID for list:
    let uniqID = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // get the current timestamp:
    let timeStamp = new Date().toISOString();
    //define newList object:
    const newList: GroceryList = {
      id: uniqID,
      name,
      store,
      items: [],
      createdAt: timeStamp,
      updatedAt: timeStamp,
    };

    //adding newList to state
    // setLists([...lists, newList]);
    setLists((prevLists) => [...prevLists, newList]);

    return newList;
  };

  // ------------------------------------------
  // FUNCTION: updateList
  // ------------------------------------------
  // Used internally by: addItemToList, updateItem, and deleteItem functions to update list state
  // TODO: updates the name of list or store
  // Parameters: list id (string), updates (Partial<GroceryList>)
  // Returns: void
  /**
   * NEED TO:
   * 1. create a variable that creates a list of previous(unchanged) items along with the items that have been updated
   * DO THIS BY: mapping through the lists array and find the specific list by matching the id from parameter with each iteration of the list
   * 2. if list object is found we update by creating an object that merges the list object and its update through spread operators
   * 3. if list object not found then theres nothing to change so just return listobject
   
   *  NOTE: updates is represented as an object because it is of type groceryList
   * updates will also be an object that contains exactly what we want to update
   */
  const updateList = (id: string, updates: Partial<GroceryList>) => {
    const updatedList: GroceryList[] = lists.map((listObject) =>
      listObject.id == id
        ? { ...listObject, ...updates, updatedAt: new Date().toISOString() }
        : listObject
    );
    setLists(updatedList);
    return;
  };
  // ------------------------------------------
  // FUNCTION: deleteList
  // ------------------------------------------
  // Used in: Currently not used in any component (available for future implementation)
  // Parameters: id (string)
  // Returns: void
  const deleteList = (id: string) => {
    const updatedList = lists.filter((listObject) => id !== listObject.id);

    setLists(updatedList);

    return;
  };
  // ------------------------------------------
  // FUNCTION: getListById
  // ------------------------------------------
  // Used in: app/list/[id].tsx at line 39 to retrieve the current list being displayed
  // Parameters: id (string)
  // Returns: GroceryList | undefined... undefined because there could be none by the id

  const getListById = (id: string): GroceryList | undefined => {
    const specificList = lists.find((listObject) => listObject.id === id);

    return specificList;
  };
  // ------------------------------------------
  // FUNCTION: addItemToList
  // ------------------------------------------
  // Used in: app/list/[id].tsx at line 51 by the handleAddItem function to add a new item to the list
  // Parameters: listId (string), name (string), quantity (optional string), price (number), addedBy (string)
  // Returns: void
  /***
   * Need to:
   * 1. Find the list so we can copy its items(spreading) when we update lists state
   * 2. create a newItem that will represent the structure of GroceryItem
   * 3. call the updateList function with the listID and the updates.
   * NOTE: updates is represented as an object because it is of type groceryList
   * updates will also be an object that contains exactly what we want to update. in this function it will be items
   */

  const addItemToList = (
    listId: string,
    name: string,
    quantity?: string,
    price?: number,
    addedBy?: string
  ) => {
    const findList = lists.find((listObject) => listObject.id === listId);
    if (!findList) return; // had to do this otherwise findList.items bugout

    const newItem: GroceryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      quantity,
      createdAt: new Date().toISOString(),
      completed: false,
      price,
      addedBy,
    };

    updateList(listId, { items: [...findList.items, newItem] });
  };
  // ------------------------------------------
  // FUNCTION: updateItem
  // ------------------------------------------
  // Used in: app/list/[id].tsx at line 77 by the handleSaveEdit function to update an item's name
  // TODO: Create a function called updateItem
  // Parameters: listId (string), itemId (string), updates (Partial<GroceryItem>)
  // Returns: void
  /**
   * NEED TO DO:
   * 1. Use the listId to find the specific list
   * 2. use the itemId to find the specific item and merge the items and updates
   * 3. if specific item doesn't match what we need to be updating, then just return the item object of groceryItem type
   *
   */

  const updateItem = (
    listId: string,
    itemId: string,
    updates: Partial<GroceryItem>
  ) => {
    //get and find the specific list:
    const specificList: GroceryList | undefined = getListById(listId);

    if (!specificList) return;

    const updatedItems: GroceryItem[] = specificList.items.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    );

    updateList(listId, { items: updatedItems });
  };
  // ------------------------------------------
  // FUNCTION: deleteItem
  // ------------------------------------------
  // Used in: app/list/[id].tsx at line 62 by the handleDeleteItem function to remove an item from the list
  // Parameters: listId (string), itemId (string)
  // Returns: void

  const deleteItem = (listId: string, itemId: string) => {
    const specificList: GroceryList | undefined = getListById(listId);

    if (!specificList) return;

    const filteredItems = specificList.items.filter(
      (item) => item.id !== itemId
    );

    updateList(listId, { items: filteredItems });
  };

  // ------------------------------------------
  // FUNCTION: toggleItem
  // ------------------------------------------
  // Used in: app/list/[id].tsx (currently commented out at line 58, available for future use to toggle item completion status)
  // TODO: Create a function called toggleItem
  // Parameters: listId (string), itemId (string)
  // Returns: void

  const toggleItem = (listId: string, itemId: string) => {
    const specificList: GroceryList | undefined = getListById(listId);
    if (!specificList) return;

    const specificItem: GroceryItem | undefined = specificList.items.find(
      (item) => item.id === itemId
    );
    if (!specificItem) return;
    updateItem(listId, itemId, { completed: !specificItem.completed });
  };

  // creating an object of ListContextType which will be used as a value for the listcontext provider
  const value: ListContextType = {
    lists,
    addList,
    updateList,
    deleteList,
    getListById,
    addItemToList,
    updateItem,
    deleteItem,
    toggleItem,
  };

  // Fills the empty container with real data (lists, addList, etc.) and return it
  // {props.children} means everything wrapped inside this Provider can access the data
  return (
    <ListContext.Provider value={value}>{props.children}</ListContext.Provider>
  );
}

/************************************************************************************************************************/

/************************************************************************************************************************/
// CREATING THE CUSTOM HOOK
export function useLists(): ListContextType {
  const context = useContext(ListContext);
  if (context === undefined) {
    throw new Error("useLists must be used within a ListProvider");
  }
  return context;
}
/************************************************************************************************************************/
