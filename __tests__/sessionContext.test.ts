import { renderHook, act } from "@testing-library/react";
import { SessionProvider, useSessions } from "../lib/state/sessionContext";
import { GroceryList } from "../lib/types";

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
      quantity: "1 gallon",
      createdAt: "2025-12-01T10:00:00Z",
    },
    {
      id: "item-2",
      name: "Bread",
      quantity: "2 loaves",
      createdAt: "2025-12-01T10:01:00Z",
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

  it("[failure] creates a session with an empty items array when the blueprint has no items", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    const emptyList: GroceryList = { ...mockList, items: [] };

    act(() => {
      result.current.startSession(emptyList);
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].items).toHaveLength(0);
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
      sessionId = result.current.startSession(mockList).id;
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
      sessionId = result.current.startSession(mockList).id;
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
      sessionId = result.current.startSession(mockList).id;
    });

    const updatedList: GroceryList = {
      ...mockList,
      items: [
        ...mockList.items,
        {
          id: "item-3",
          name: "Eggs",
          quantity: "1 dozen",
          createdAt: "2025-12-01T10:05:00Z",
        },
      ],
    };

    act(() => {
      result.current.resyncSession(sessionId, updatedList);
    });

    expect(result.current.sessions[0].items).toHaveLength(3);
    expect(result.current.sessions[0].items[2].name).toBe("Eggs");
  });

  it("[failure] does not change the session when the blueprint has no new items", () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: SessionProvider,
    });
    let sessionId: string;

    act(() => {
      sessionId = result.current.startSession(mockList).id;
    });
    act(() => {
      result.current.resyncSession(sessionId, mockList);
    });

    expect(result.current.sessions[0].items).toHaveLength(2);
  });
});
