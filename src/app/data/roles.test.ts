import { describe, it, expect } from "vitest";
import {
  isCreatorRole,
  isProgrammeRole,
  hasCreatorAccess,
  hasProgrammeAccess,
  ASSIGNABLE_ROLES,
} from "./roles";

describe("Photographer and Contributor are different roles", () => {
  it("both upload and earn", () => {
    expect(isCreatorRole("Photographer")).toBe(true);
    expect(isCreatorRole("Contributor")).toBe(true);
  });

  it("only a Contributor is in the programme", () => {
    expect(isProgrammeRole("Contributor")).toBe(true);
    expect(isProgrammeRole("Photographer")).toBe(false);
  });

  it("leaves buyers and enterprise out of both", () => {
    for (const role of ["Buyer", "Enterprise", "Guest", undefined]) {
      expect(isCreatorRole(role)).toBe(false);
      expect(isProgrammeRole(role)).toBe(false);
    }
  });

  it("offers both roles to an admin assigning one", () => {
    expect(ASSIGNABLE_ROLES).toContain("Photographer");
    expect(ASSIGNABLE_ROLES).toContain("Contributor");
  });
});

describe("access to the creator and programme screens", () => {
  it("requires verification for a photographer", () => {
    expect(hasCreatorAccess("Photographer", "unverified")).toBe(false);
    expect(hasCreatorAccess("Photographer", "verified")).toBe(true);
  });

  it("requires verification for a contributor", () => {
    expect(hasProgrammeAccess("Contributor", "pending")).toBe(false);
    expect(hasProgrammeAccess("Contributor", "verified")).toBe(true);
  });

  it("gives a verified photographer the creator screens but not the programme", () => {
    expect(hasCreatorAccess("Photographer", "verified")).toBe(true);
    expect(hasProgrammeAccess("Photographer", "verified")).toBe(false);
  });

  it("gives a verified contributor both", () => {
    expect(hasCreatorAccess("Contributor", "verified")).toBe(true);
    expect(hasProgrammeAccess("Contributor", "verified")).toBe(true);
  });

  it("lets an admin through without a verification record", () => {
    expect(hasCreatorAccess("Admin", undefined)).toBe(true);
    expect(hasProgrammeAccess("Admin", undefined)).toBe(true);
  });

  it("keeps a buyer out of both, however verified", () => {
    expect(hasCreatorAccess("Buyer", "verified")).toBe(false);
    expect(hasProgrammeAccess("Buyer", "verified")).toBe(false);
  });
});
