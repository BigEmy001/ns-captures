import { describe, it, expect, vi } from "vitest";
import {
  joinWeb3Waitlist,
  fetchSiteSettings,
  updateWeb3WaitlistWalletAddress,
  updateUserWalletAddress,
} from "./db";

const { mockMaybeSingle, mockInsert, mockUpdate, mockProfileUpdate } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockProfileUpdate: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "web3_waitlist") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockMaybeSingle,
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          insert: mockInsert,
          update: vi.fn(() => ({
            eq: mockUpdate,
          })),
        };
      }
      if (table === "profiles") {
        return {
          update: vi.fn(() => ({
            eq: mockProfileUpdate,
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      };
    }),
  },
}));

describe("Web3 Waitlist Functionality", () => {
  it("rejects empty or invalid email addresses", async () => {
    const result = await joinWeb3Waitlist({ email: "invalid-email" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("valid email address");
  });

  it("submits valid new entry successfully", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockInsert.mockResolvedValueOnce({ data: null, error: null });

    const result = await joinWeb3Waitlist({
      email: "collector@example.com",
      name: "Crypto Collector",
      role: "collector",
      walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
    });

    expect(result.ok).toBe(true);
    expect(result.alreadyExists).toBeFalsy();
    expect(mockInsert).toHaveBeenCalled();
  });

  it("handles duplicate email registrations gracefully by updating details", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: "existing-uuid" }, error: null });
    mockUpdate.mockResolvedValueOnce({ data: null, error: null });

    const result = await joinWeb3Waitlist({
      email: "collector@example.com",
      name: "Updated Name",
      role: "photographer",
    });

    expect(result.ok).toBe(true);
    expect(result.alreadyExists).toBe(true);
  });

  it("site settings defaults include the waitlist launch state and admin-managed feature list", async () => {
    const settings = await fetchSiteSettings();
    expect(settings.web3WaitlistEnabled).toBe(true);
    expect(settings.web3WaitlistFeatures).toContain("Direct Wallet Delivery");
    expect(settings.web3WaitlistHeadline).toContain("Direct digital-asset settlement");
  });

  it("allows admin to update web3 waitlist wallet address", async () => {
    mockUpdate.mockResolvedValueOnce({ error: null });
    const success = await updateWeb3WaitlistWalletAddress(
      "entry-123",
      "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    );
    expect(success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith("id", "entry-123");
  });

  it("allows admin to update user profile wallet address", async () => {
    mockProfileUpdate.mockResolvedValueOnce({ error: null });
    const success = await updateUserWalletAddress(
      "user-456",
      "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    );
    expect(success).toBe(true);
    expect(mockProfileUpdate).toHaveBeenCalledWith("id", "user-456");
  });
});
