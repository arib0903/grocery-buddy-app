import { renderHook, act } from "@testing-library/react";
import { ListProvider, useLists } from "../lib/state/listContext";

// ── Priority 1: addItemToList ─────────────────────────────────────────────────
describe("addItemToList", () => {
  it("[happy] adds the item to the correct list and leaves other lists untouched", () => {
    const { result } = renderHook(() => useLists(), { wrapper: ListProvider });
    let listId: string;

    act(() => {
      listId = result.current.addList("Weekly Groceries", "Walmart")!.id;
      result.current.addList("Party Supplies", "Target"); // second list — should be untouched
    });
    act(() => {
      result.current.addItemToList(listId, "Milk");
    });

    const targetList = result.current.lists.find((l) => l.id === listId)!;
    const otherList = result.current.lists.find((l) => l.id !== listId)!;
    expect(targetList.items).toHaveLength(1);
    expect(targetList.items[0].name).toBe("Milk");
    expect(otherList.items).toHaveLength(0);
  });

  it("[failure] does nothing when the listId does not exist", () => {
    const { result } = renderHook(() => useLists(), { wrapper: ListProvider });

    act(() => {
      result.current.addList("Weekly Groceries", "Walmart");
    });
    act(() => {
      result.current.addItemToList("nonexistent-list", "Milk");
    });

    expect(result.current.lists[0].items).toHaveLength(0);
  });
});

// ── Priority 1: deleteItem ────────────────────────────────────────────────────
describe("deleteItem", () => {
  it("[happy] removes the target item and leaves sibling items intact", () => {
    const { result } = renderHook(() => useLists(), { wrapper: ListProvider });
    let listId: string;

    act(() => {
      listId = result.current.addList("Weekly Groceries", "Walmart")!.id;
    });
    act(() => {
      result.current.addItemToList(listId, "Milk");
      result.current.addItemToList(listId, "Bread");
    });

    const itemToDelete = result.current.lists[0].items[0].id;
    act(() => {
      result.current.deleteItem(listId, itemToDelete);
    });

    const items = result.current.lists[0].items;
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Bread");
  });

  it("[failure] does nothing when the listId does not exist", () => {
    const { result } = renderHook(() => useLists(), { wrapper: ListProvider });

    act(() => {
      result.current.addList("Weekly Groceries", "Walmart");
    });
    act(() => {
      result.current.deleteItem("nonexistent-list", "any-item-id");
    });

    expect(result.current.lists).toHaveLength(1);
  });
});

// ── Priority 1: updateItem ────────────────────────────────────────────────────
describe("updateItem", () => {
  it("[happy] updates only the target item; sibling items are unchanged", () => {
    const { result } = renderHook(() => useLists(), { wrapper: ListProvider });
    let listId: string;

    act(() => {
      listId = result.current.addList("Weekly Groceries", "Walmart")!.id;
    });
    act(() => {
      result.current.addItemToList(listId, "Milk");
      result.current.addItemToList(listId, "Bread");
    });

    const itemToUpdate = result.current.lists[0].items[0].id;
    act(() => {
      result.current.updateItem(listId, itemToUpdate, { name: "Almond Milk" });
    });

    const items = result.current.lists[0].items;
    expect(items[0].name).toBe("Almond Milk");
    expect(items[1].name).toBe("Bread"); // sibling unchanged
  });

  it("[failure] does nothing when the listId does not exist", () => {
    const { result } = renderHook(() => useLists(), { wrapper: ListProvider });

    act(() => {
      result.current.addList("Weekly Groceries", "Walmart");
    });
    act(() => {
      result.current.updateItem("nonexistent-list", "any-item-id", {
        name: "Oat Milk",
      });
    });

    expect(result.current.lists[0].items).toHaveLength(0);
  });
});
