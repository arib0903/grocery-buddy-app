import { renderHook, act } from "@testing-library/react";
import { Alert } from "react-native";
import { SessionProvider, useSessions } from "../lib/state/sessionContext";
import { GroceryList } from "../lib/types";

jest.spyOn(Alert, "alert").mockImplementation(() => {});

// ── Shared fixture ─────────────────────────────────────────────────────────────
const mockList: GroceryList = {
  id: "list-1",
  name: "Weekly Groceries",
  store: "Walmart",
  createdAt: "2025-12-01T10:00:00Z",
  updatedAt: "2025-12-01T10:00:00Z",
  items: [
    {
      id: "item-1",
      name: "Milk",
      quantity: 1,
      unit: "gal",
      notes: null,
      createdAt: "2025-12-01T10:00:00Z",
      updatedAt: "2025-12-01T10:00:00Z",
    },
    {
      id: "item-2",
      name: "Bread",
      quantity: 2,
      unit: null,
      notes: null,
      createdAt: "2025-12-01T10:01:00Z",
      updatedAt: "2025-12-01T10:01:00Z",
    },
  ],
};

// ── Priority 2: startSession ───────────────────────────────────────────────────
describe("startSession", () => {
  it("[happy] snapshots all blueprint items with completed set to false", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });

    act(() => {
      result.current.startSession(mockList);
    });

    const session = result.current.sessions[0];
    expect(session.items).toHaveLength(2);
    session.items.forEach((item) => expect(item.completed).toBe(false));
  });

  it("[failure] prevents creating a session when the blueprint has no items", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    const emptyList: GroceryList = { ...mockList, items: [] };

    let session = null;
    act(() => {
      session = result.current.startSession(emptyList);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Cannot Start Session",
      "Add at least one item to this list before starting shopping mode.",
    );
    expect(session).toBeNull();
    expect(result.current.sessions).toHaveLength(0);
  });
});

// ── Priority 2: toggleSessionItem ─────────────────────────────────────────────
describe("toggleSessionItem", () => {
  it("[happy] marks an unchecked item as completed", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    let sessionId: string;

    act(() => {
      sessionId = result.current.startSession(mockList)!.id;
    });
    act(() => {
      result.current.toggleSessionItem(sessionId, "item-1");
    });

    expect(result.current.sessions[0].items[0].completed).toBe(true);
  });

  it("[failure] does nothing when the sessionId does not exist", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });

    act(() => {
      result.current.startSession(mockList);
    });
    act(() => {
      result.current.toggleSessionItem("nonexistent-session", "item-1");
    });

    // The real session is untouched
    expect(result.current.sessions[0].items[0].completed).toBe(false);
  });
});

// ── Priority 2: completeSession ───────────────────────────────────────────────
describe("completeSession", () => {
  it("[happy] stamps completedAt with a valid ISO string", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    let sessionId: string;

    act(() => {
      sessionId = result.current.startSession(mockList)!.id;
    });
    act(() => {
      result.current.completeSession(sessionId);
    });

    const { completedAt } = result.current.sessions[0];
    expect(completedAt).toBeDefined();
    expect(new Date(completedAt!).toISOString()).toBe(completedAt);
  });

  it("[failure] does nothing when the sessionId does not exist", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });

    act(() => {
      result.current.startSession(mockList);
    });
    act(() => {
      result.current.completeSession("nonexistent-session");
    });

    expect(result.current.sessions[0].completedAt).toBeUndefined();
  });
});

// ── Priority 3: resyncSession ─────────────────────────────────────────────────
describe("resyncSession", () => {
  it("[happy] appends blueprint items added after the session was created", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    let sessionId: string;

    act(() => {
      sessionId = result.current.startSession(mockList)!.id;
    });

    const updatedList: GroceryList = {
      ...mockList,
      items: [
        ...mockList.items,
        {
          id: "item-3",
          name: "Egg",
          quantity: 12,
          unit: null,
          notes: null,
          createdAt: "2025-12-01T10:05:00Z",
          updatedAt: "2025-12-01T10:05:00Z",
        },
      ],
    };

    act(() => {
      result.current.resyncSession(sessionId, updatedList);
    });

    expect(result.current.sessions[0].items).toHaveLength(3);
    expect(result.current.sessions[0].items[2].name).toBe("Egg");
  });

  it("[failure] does not change the session when the blueprint has no new items", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    let sessionId: string;

    act(() => {
      sessionId = result.current.startSession(mockList)!.id;
    });
    act(() => {
      result.current.resyncSession(sessionId, mockList);
    });

    expect(result.current.sessions[0].items).toHaveLength(2);
  });
});

describe("context wrapper methods", () => {
  it("getSessionById returns the matching session and undefined when missing", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    let sessionId: string;

    act(() => {
      sessionId = result.current.startSession(mockList)!.id;
    });

    expect(result.current.getSessionById(sessionId)).toBeDefined();
    expect(result.current.getSessionById("missing-session")).toBeUndefined();
  });

  it("getActiveSessionForList returns active session and ignores completed sessions", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    let sessionId: string;

    act(() => {
      sessionId = result.current.startSession(mockList)!.id;
    });

    const activeBeforeComplete = result.current.getActiveSessionForList(
      mockList.id,
    );
    expect(activeBeforeComplete?.id).toBe(sessionId);

    act(() => {
      result.current.completeSession(sessionId);
    });

    expect(result.current.getActiveSessionForList(mockList.id)).toBeUndefined();
    expect(
      result.current.getActiveSessionForList("missing-list"),
    ).toBeUndefined();
  });

  it("deleteSession removes an existing session and leaves state unchanged for unknown ids", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    let sessionId: string;

    act(() => {
      sessionId = result.current.startSession(mockList)!.id;
    });

    expect(result.current.sessions).toHaveLength(1);

    act(() => {
      result.current.deleteSession("missing-session");
    });
    expect(result.current.sessions).toHaveLength(1);

    act(() => {
      result.current.deleteSession(sessionId);
    });
    expect(result.current.sessions).toHaveLength(0);
  });

  it("addItemToSession trims name and applies null defaults for optional fields", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    let sessionId: string;

    act(() => {
      sessionId = result.current.startSession(mockList)!.id;
    });

    act(() => {
      result.current.addItemToSession(sessionId, "  yogurt  ");
    });

    const addedItem = result.current.sessions[0].items.find(
      (i) => i.name === "yogurt",
    );
    expect(addedItem).toBeDefined();
    expect(addedItem?.quantity).toBeNull();
    expect(addedItem?.unit).toBeNull();
    expect(addedItem?.completed).toBe(false);
  });

  it("removeItemFromSession matches item name case-insensitively", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    let sessionId: string;

    act(() => {
      sessionId = result.current.startSession(mockList)!.id;
      result.current.addItemToSession(sessionId, "yogurt");
    });

    act(() => {
      result.current.removeItemFromSession(sessionId, "YOGURT");
    });

    expect(
      result.current.sessions[0].items.some((i) => i.name === "yogurt"),
    ).toBe(false);
  });

  it("setSessionItemCompleted updates completion by name case-insensitively", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    let sessionId: string;

    act(() => {
      sessionId = result.current.startSession(mockList)!.id;
    });

    act(() => {
      result.current.setSessionItemCompleted(sessionId, "MILK", true);
    });

    const milk = result.current.sessions[0].items.find(
      (i) => i.name === "Milk",
    );
    expect(milk?.completed).toBe(true);
  });
});

describe("resyncSession edge cases", () => {
  it("does nothing when trying to resync a completed session", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    let sessionId: string;

    act(() => {
      sessionId = result.current.startSession(mockList)!.id;
      result.current.completeSession(sessionId);
    });

    const updatedList: GroceryList = {
      ...mockList,
      items: [
        ...mockList.items,
        {
          id: "item-3",
          name: "Egg",
          quantity: 12,
          unit: null,
          notes: null,
          createdAt: "2025-12-01T10:05:00Z",
          updatedAt: "2025-12-01T10:05:00Z",
        },
      ],
    };

    act(() => {
      result.current.resyncSession(sessionId, updatedList);
    });

    expect(result.current.sessions[0].items).toHaveLength(2);
  });
});

describe("useSessions guard", () => {
  it("throws when used outside SessionProvider", () => {
    expect(() => renderHook(() => useSessions())).toThrow(
      "useSessions must be used within a SessionProvider",
    );
  });
});
