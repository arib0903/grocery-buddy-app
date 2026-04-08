import { renderHook, act } from "@testing-library/react";
import { ListProvider, useLists } from "../lib/state/listContext";
import { GroceryList } from "../lib/types";

describe("Testing adding new list - addList", () => {
  it("should take a list name and a store name as params and return a GroceryList object", () => {
    const { result } = renderHook(() => useLists(), {
      wrapper: ListProvider,
    });

    let newList: GroceryList | null = null;

    act(() => {
      newList = result.current.addList("Weekly Groceries", "Walmart");
    });

    // Verify the returned list has the correct structure
    expect(newList).toBeDefined();
    expect(newList!.name).toBe("Weekly Groceries");
    expect(newList!.store).toBe("Walmart");
    expect(newList!.items).toEqual([]);
    expect(newList!.id).toBeDefined();
    expect(typeof newList!.id).toBe("string");
    expect(newList!.createdAt).toBeDefined();
    expect(newList!.updatedAt).toBeDefined();
    expect(newList!.createdAt).toBe(newList!.updatedAt);
  });

  it("should add the new list to the lists array", () => {
    const { result } = renderHook(() => useLists(), {
      wrapper: ListProvider,
    });

    act(() => {
      result.current.addList("Weekly Groceries", "Walmart");
      result.current.addList("Party Shopping", "Target");
    });

    expect(result.current.lists).toHaveLength(2);
    expect(result.current.lists[0].name).toBe("Weekly Groceries");
    expect(result.current.lists[1].name).toBe("Party Shopping");
  });

  it("should generate unique IDs for each list", () => {
    const { result } = renderHook(() => useLists(), {
      wrapper: ListProvider,
    });

    let list1: GroceryList | null = null;
    let list2: GroceryList | null = null;

    act(() => {
      list1 = result.current.addList("List 1", "Store A");
      list2 = result.current.addList("List 2", "Store B");
    });

    expect(list1!.id).not.toBe(list2!.id);
  });

  it("should reject empty list name", () => {
    const { result } = renderHook(() => useLists(), {
      wrapper: ListProvider,
    });

    let newList: GroceryList | null = null;
    act(() => {
      newList = result.current.addList("   ", "Walmart");
    });

    expect(newList).toBeNull();
    expect(result.current.lists).toHaveLength(0);
  });

  it("should reject empty store", () => {
    const { result } = renderHook(() => useLists(), {
      wrapper: ListProvider,
    });

    let newList: GroceryList | null = null;
    act(() => {
      newList = result.current.addList("Weekly Groceries", "   ");
    });

    expect(newList).toBeNull();
    expect(result.current.lists).toHaveLength(0);
  });

  it("should trim/collapse spaces and block case-insensitive duplicates by name+store", () => {
    const { result } = renderHook(() => useLists(), {
      wrapper: ListProvider,
    });

    let first: GroceryList | null = null;
    let second: GroceryList | null = null;

    act(() => {
      first = result.current.addList("  Weekly   Groceries  ", "  Walmart  ");
    });

    act(() => {
      second = result.current.addList("weekly groceries", "walmart");
    });

    expect(first).not.toBeNull();
    expect(first!.name).toBe("Weekly Groceries");
    expect(first!.store).toBe("Walmart");
    expect(second).toBeNull();
    expect(result.current.lists).toHaveLength(1);
  });

  it("should reject names longer than 80 characters", () => {
    const { result } = renderHook(() => useLists(), {
      wrapper: ListProvider,
    });

    let newList: GroceryList | null = null;
    act(() => {
      newList = result.current.addList("a".repeat(81), "Walmart");
    });

    expect(newList).toBeNull();
    expect(result.current.lists).toHaveLength(0);
  });
});
