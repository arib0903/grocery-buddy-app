/*
 * Household Service
 *
 * IHouseholdService defines the contract for household and membership operations.
 * LocalHouseholdService is a stub in-memory implementation to unblock Phase 3 (Cognito auth).
 *
 * The real implementation (AppSyncHouseholdService) will be wired in Phase 3/4
 * when Cognito and AppSync are live. At that point, swap LocalHouseholdService
 * out of householdContext — no component changes required.
 */

import { Dispatch, SetStateAction } from "react";
import { Household, HouseholdMember, UserProfile } from "../types";

// ========================================
// SECTION 1: INTERFACE
// ========================================

export interface IHouseholdService {
  // Create a new household and make the caller the OWNER.
  createHousehold(name: string, currentUser: UserProfile): { household: Household; member: HouseholdMember } | null;

  // Join an existing household by invite code. Makes the caller a MEMBER.
  joinHousehold(inviteCode: string, currentUser: UserProfile): { household: Household; member: HouseholdMember } | null;

  getHousehold(householdId: string): Household | null;
  getMembers(householdId: string): HouseholdMember[];

  // Rotate the invite code for a household. OWNER only.
  regenerateInviteCode(householdId: string): string | null;

  leaveHousehold(householdId: string, userId: string): void;
}

// ========================================
// SECTION 2: LOCAL STUB IMPLEMENTATION
// ========================================
// This implementation is in-memory only — it exists to give householdContext
// something to delegate to before AppSync is wired up.
// It does NOT enforce invite code uniqueness or persistence across app restarts.

export class LocalHouseholdService implements IHouseholdService {
  constructor(
    private householdsRef: { current: Household[] },
    private membersRef: { current: HouseholdMember[] },
    private setHouseholds: Dispatch<SetStateAction<Household[]>>,
    private setMembers: Dispatch<SetStateAction<HouseholdMember[]>>,
  ) {}

  private generateInviteCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 8 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
  }

  createHousehold(
    name: string,
    currentUser: UserProfile,
  ): { household: Household; member: HouseholdMember } | null {
    if (!name.trim()) return null;

    const household: Household = {
      householdId: `household-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      inviteCode: this.generateInviteCode(),
      createdAt: new Date().toISOString(),
    };

    const member: HouseholdMember = {
      householdId: household.householdId,
      userId: currentUser.userId,
      displayName: currentUser.displayName,
      role: "OWNER",
      joinedAt: new Date().toISOString(),
    };

    this.setHouseholds((prev) => [...prev, household]);
    this.setMembers((prev) => [...prev, member]);

    return { household, member };
  }

  joinHousehold(
    inviteCode: string,
    currentUser: UserProfile,
  ): { household: Household; member: HouseholdMember } | null {
    const household = this.householdsRef.current.find(
      (h) => h.inviteCode === inviteCode.toUpperCase(),
    );
    if (!household) return null;

    const alreadyMember = this.membersRef.current.some(
      (m) => m.householdId === household.householdId && m.userId === currentUser.userId,
    );
    if (alreadyMember) return null;

    const member: HouseholdMember = {
      householdId: household.householdId,
      userId: currentUser.userId,
      displayName: currentUser.displayName,
      role: "MEMBER",
      joinedAt: new Date().toISOString(),
    };

    this.setMembers((prev) => [...prev, member]);
    return { household, member };
  }

  getHousehold(householdId: string): Household | null {
    return this.householdsRef.current.find((h) => h.householdId === householdId) ?? null;
  }

  getMembers(householdId: string): HouseholdMember[] {
    return this.membersRef.current.filter((m) => m.householdId === householdId);
  }

  regenerateInviteCode(householdId: string): string | null {
    const newCode = this.generateInviteCode();
    this.setHouseholds((prev) =>
      prev.map((h) =>
        h.householdId === householdId ? { ...h, inviteCode: newCode } : h,
      ),
    );
    return newCode;
  }

  leaveHousehold(householdId: string, userId: string): void {
    this.setMembers((prev) =>
      prev.filter((m) => !(m.householdId === householdId && m.userId === userId)),
    );
  }
}
