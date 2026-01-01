/*
 * THIS FILE (stores.ts): List of all supported grocery stores
 * Used for store selection when creating new lists
 */

import { Store } from "../lib/types";

export const STORES: Store[] = [
  {
    id: "walmart",
    name: "Walmart",
    icon: "🛒",
  },
  {
    id: "costco",
    name: "Costco",
    icon: "🏪",
  },
  {
    id: "target",
    name: "Target",
    icon: "🎯",
  },
  {
    id: "whole-foods",
    name: "Whole Foods",
    icon: "🥬",
  },
  {
    id: "trader-joes",
    name: "Trader Joe's",
    icon: "🍃",
  },
  {
    id: "kroger",
    name: "Kroger",
    icon: "🛍️",
  },
];
