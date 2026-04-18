import { Dispatch, SetStateAction } from "react";
import { LocalSessionService } from "../lib/api/sessionService";
import { GroceryList, ShoppingSession } from "../lib/types";

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
      category: "dairy",
      createdAt: "2025-12-01T10:00:00Z",
      updatedAt: "2025-12-01T10:00:00Z",
    },
    {
      id: "item-2",
      name: "Bread",
      quantity: 2,
      unit: null,
      notes: null,
      category: "bakery",
      createdAt: "2025-12-01T10:01:00Z",
      updatedAt: "2025-12-01T10:01:00Z",
    },
  ],
};

function createService(initialSessions: ShoppingSession[] = []) {
  const sessionsRef: { current: ShoppingSession[] } = { current: initialSessions };

  const setSessions: Dispatch<SetStateAction<ShoppingSession[]>> = (update) => {
    sessionsRef.current =
      typeof update === "function"
        ? (update as (prev: ShoppingSession[]) => ShoppingSession[])(sessionsRef.current)
        : update;
  };

  return {
    sessionsRef,
    service: new LocalSessionService(sessionsRef, setSessions),
  };
}

describe("LocalSessionService", () => {
  it("startSession returns null for empty lists", () => {
    const { service, sessionsRef } = createService();
    const emptyList: GroceryList = { ...mockList, items: [] };

    const session = service.startSession(emptyList);

    expect(session).toBeNull();
    expect(sessionsRef.current).toHaveLength(0);
  });

  it("getSession returns a session by id", () => {
    const { service, sessionsRef } = createService();
    const created = service.startSession(mockList)!;

    expect(service.getSession(created.id)?.id).toBe(created.id);
    expect(service.getSession("missing-id")).toBeUndefined();
    expect(sessionsRef.current).toHaveLength(1);
  });

  it("getActiveSession returns only sessions without completedAt", () => {
    const { service } = createService();
    const created = service.startSession(mockList)!;

    expect(service.getActiveSession(mockList.id)?.id).toBe(created.id);

    service.completeSession(created.id);

    expect(service.getActiveSession(mockList.id)).toBeUndefined();
    expect(service.getActiveSession("missing-list")).toBeUndefined();
  });

  it("addItemToSession trims name and defaults quantity/unit to null", () => {
    const { service, sessionsRef } = createService();
    const created = service.startSession(mockList)!;

    service.addItemToSession(created.id, "  yogurt  ");

    const added = sessionsRef.current[0].items.find((i) => i.name === "yogurt");
    expect(added).toBeDefined();
    expect(added?.quantity).toBeNull();
    expect(added?.unit).toBeNull();
    expect(added?.completed).toBe(false);
  });

  it("setSessionItemCompleted and removeItemFromSession are case-insensitive", () => {
    const { service, sessionsRef } = createService();
    const created = service.startSession(mockList)!;

    service.setSessionItemCompleted(created.id, "milk", true);
    const milk = sessionsRef.current[0].items.find((i) => i.name === "Milk");
    expect(milk?.completed).toBe(true);

    service.addItemToSession(created.id, "yogurt");
    service.removeItemFromSession(created.id, "YOGURT");
    expect(sessionsRef.current[0].items.some((i) => i.name === "yogurt")).toBe(false);
  });

  it("resyncSession skips completed sessions and appends missing list items for active sessions", () => {
    const { service, sessionsRef } = createService();
    const created = service.startSession(mockList)!;

    const withNewItem: GroceryList = {
      ...mockList,
      items: [
        ...mockList.items,
        {
          id: "item-3",
          name: "Egg",
          quantity: 12,
          unit: null,
          notes: null,
          category: "dairy",
          createdAt: "2025-12-01T10:05:00Z",
          updatedAt: "2025-12-01T10:05:00Z",
        },
      ],
    };

    service.completeSession(created.id);
    service.resyncSession(created.id, withNewItem);
    expect(sessionsRef.current[0].items).toHaveLength(2);

    const active = service.startSession(mockList)!;
    service.resyncSession(active.id, withNewItem);

    const activeSession = sessionsRef.current.find((s) => s.id === active.id)!;
    expect(activeSession.items).toHaveLength(3);
    expect(activeSession.items.some((i) => i.itemId === "item-3")).toBe(true);
  });

  it("deleteSession removes matching session and leaves others", () => {
    const { service, sessionsRef } = createService();
    const first = service.startSession(mockList)!;
    const second = service.startSession({ ...mockList, id: "list-2" })!;

    service.deleteSession("missing-id");
    expect(sessionsRef.current).toHaveLength(2);

    service.deleteSession(first.id);

    expect(sessionsRef.current).toHaveLength(1);
    expect(sessionsRef.current[0].id).toBe(second.id);
  });

  it("RACE CONDITION: concurrent startSession calls create duplicate active sessions (known issue)", async () => {
    /**
     * Household Race Condition (without households)
     *
     * When two household members call startShoppingSession(listId) concurrently,
     * the local service has no guard to prevent duplicate session creation.
     *
     * This test simulates the race:
     *   User A calls startSession(listId) → reads no active session → starts creating
     *   User B calls startSession(listId) → reads no active session → starts creating
     *   Result: Two active sessions for the same listId (BUG)
     *
     * Fix Strategy (AppSync/DynamoDB):
     *   - AppSync resolver should use a conditional write (UpdateExpression with attribute_not_exists)
     *   - Or: Query for active session first → if exists, return it; else create atomically
     *   - DynamoDB transaction ensures no two sessions can be created concurrently for the same listId
     *   - Client receives idempotent result: same session object on both calls
     *
     * Once AppSync is deployed, this race condition will be prevented at the resolver level.
     * The test documents current behavior and expected future behavior.
     */

    const { service, sessionsRef } = createService();

    // Simulate two concurrent startSession calls using Promise.all
    // Both calls happen at nearly the same microsecond
    const [session1, session2] = await Promise.all([
      Promise.resolve(service.startSession(mockList)),
      Promise.resolve(service.startSession(mockList)),
    ]);

    // Current BUG: Both sessions created for the same listId
    expect(sessionsRef.current).toHaveLength(2);
    expect(session1).toBeDefined();
    expect(session2).toBeDefined();
    expect(session1!.listId).toBe(mockList.id);
    expect(session2!.listId).toBe(mockList.id);
    expect(session1!.id).not.toBe(session2!.id);

    // FRAGILE: getActiveSession only returns the first one, second is orphaned
    const activeSession = service.getActiveSession(mockList.id);
    expect(activeSession).toBeDefined();
    // Either session1 or session2 could be returned, but only ONE should exist
    expect([session1!.id, session2!.id]).toContain(activeSession!.id);
  });
});
