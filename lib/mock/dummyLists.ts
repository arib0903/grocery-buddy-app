/*
 * MOCK SUBFOLDER: Contains fake/sample data for testing and development
 */

import { GroceryList } from "../types";

export const dummyLists: GroceryList[] = [
  {
    id: "1",
    name: "Weekly Groceries",
    store: "Walmart",
    createdAt: "2025-12-01T10:00:00Z",
    updatedAt: "2025-12-01T10:00:00Z",
    items: [
      {
        id: "1-1",
        name: "Milk",
        quantity: "1 gallon",
        completed: false,
        createdAt: "2025-12-01T10:00:00Z",
      },
      {
        id: "1-2",
        name: "Bread",
        quantity: "2 loaves",
        completed: true,
        createdAt: "2025-12-01T10:01:00Z",
      },
      {
        id: "1-3",
        name: "Eggs",
        quantity: "1 dozen",
        completed: false,
        createdAt: "2025-12-01T10:02:00Z",
      },
      {
        id: "1-4",
        name: "Bananas",
        quantity: "1 bunch",
        completed: true,
        createdAt: "2025-12-01T10:03:00Z",
      },
      {
        id: "1-5",
        name: "Chicken breast",
        quantity: "2 lbs",
        completed: false,
        createdAt: "2025-12-01T10:04:00Z",
      },
    ],
  },
  {
    id: "2",
    name: "Party Supplies",
    store: "Target",
    createdAt: "2025-12-02T14:30:00Z",
    updatedAt: "2025-12-02T14:30:00Z",
    items: [
      {
        id: "2-1",
        name: "Chips",
        quantity: "3 bags",
        completed: false,
        createdAt: "2025-12-02T14:30:00Z",
      },
      {
        id: "2-2",
        name: "Soda",
        quantity: "2 liters",
        completed: false,
        createdAt: "2025-12-02T14:31:00Z",
      },
      {
        id: "2-3",
        name: "Paper plates",
        quantity: "1 pack",
        completed: true,
        createdAt: "2025-12-02T14:32:00Z",
      },
    ],
  },
  {
    id: "3",
    store: "Costco",
    name: "Quick Lunch",
    createdAt: "2025-12-03T12:00:00Z",
    updatedAt: "2025-12-03T12:00:00Z",
    items: [
      {
        id: "3-1",
        name: "Sandwich ingredients",
        completed: true,
        createdAt: "2025-12-03T12:00:00Z",
      },
      {
        id: "3-2",
        name: "Apple",
        quantity: "1",
        completed: true,
        createdAt: "2025-12-03T12:01:00Z",
      },
    ],
  },
];
