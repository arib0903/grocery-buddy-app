/*
 * This file manages Household state — the shared space that users belong to.
 *
 * A household is created or joined during onboarding (after Cognito auth).
 * All lists, sessions, and items are scoped to a household.
 *
 * The LocalHouseholdService is a stub until AppSync + Cognito are live (Phase 3).
 * At that point, swap it for AppSyncHouseholdService — this file and all
 * components remain unchanged.
 *
 * Flow:
 *   1. User signs up / logs in (Cognito)    →  currentUser is set
 *   2. User creates or joins a household    →  createHousehold / joinHousehold
 *   3. currentHousehold is set              →  app routes to home screen
 */

import { createContext, useState, useContext, useRef, useMemo, ReactNode } from "react";
import { Household, HouseholdMember, UserProfile } from "../types";
import { LocalHouseholdService } from "../api/householdService";

// ========================================
// SECTION 1: TYPESCRIPT INTERFACE
// ========================================

interface HouseholdContextType {
  currentHousehold: Household | null;
  members: HouseholdMember[];

  // Create a new household. Caller becomes OWNER.
  createHousehold: (name: string) => Household | null;

  // Join a household by invite code. Caller becomes MEMBER.
  joinHousehold: (inviteCode: string) => Household | null;

  // Rotate the invite code. OWNER only (enforced by AppSync/Lambda in production).
  regenerateInviteCode: () => string | null;

  // Leave the current household.
  leaveHousehold: () => void;

  // Set the current user (called after Cognito sign-in).
  setCurrentUser: (user: UserProfile | null) => void;

  currentUser: UserProfile | null;
}

// ========================================
// SECTION 2: CONTEXT SETUP
// ========================================

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

interface HouseholdProviderProps {
  children: ReactNode;
}

// ========================================
// SECTION 3: PROVIDER
// ========================================

export function HouseholdProvider(props: HouseholdProviderProps) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentHousehold, setCurrentHousehold] = useState<Household | null>(null);

  const householdsRef = useRef(households);
  householdsRef.current = households;

  const membersRef = useRef(members);
  membersRef.current = members;

  const service = useMemo(
    () => new LocalHouseholdService(householdsRef, membersRef, setHouseholds, setMembers),
    [],
  );

  const createHousehold = (name: string): Household | null => {
    if (!currentUser) return null;
    const result = service.createHousehold(name, currentUser);
    if (!result) return null;
    setCurrentHousehold(result.household);
    return result.household;
  };

  const joinHousehold = (inviteCode: string): Household | null => {
    if (!currentUser) return null;
    const result = service.joinHousehold(inviteCode, currentUser);
    if (!result) return null;
    setCurrentHousehold(result.household);
    return result.household;
  };

  const regenerateInviteCode = (): string | null => {
    if (!currentHousehold) return null;
    return service.regenerateInviteCode(currentHousehold.householdId);
  };

  const leaveHousehold = () => {
    if (!currentHousehold || !currentUser) return;
    service.leaveHousehold(currentHousehold.householdId, currentUser.userId);
    setCurrentHousehold(null);
  };

  const currentMembers = currentHousehold
    ? service.getMembers(currentHousehold.householdId)
    : [];

  // ========================================
  // SECTION 4: PROVIDE EVERYTHING
  // ========================================

  const value: HouseholdContextType = {
    currentHousehold,
    members: currentMembers,
    createHousehold,
    joinHousehold,
    regenerateInviteCode,
    leaveHousehold,
    setCurrentUser,
    currentUser,
  };

  return (
    <HouseholdContext.Provider value={value}>
      {props.children}
    </HouseholdContext.Provider>
  );
}

// ========================================
// SECTION 5: CUSTOM HOOK
// ========================================

export function useHousehold(): HouseholdContextType {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error("useHousehold must be used within a HouseholdProvider");
  }
  return context;
}
