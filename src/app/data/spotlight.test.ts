import { describe, it, expect, vi } from "vitest";
import { fetchEditorialSpotlight, fetchSiteSettings } from "./db";

const { mockSingle } = vi.hoisted(() => ({
  mockSingle: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    })),
  },
}));

describe("fetchEditorialSpotlight", () => {
  it("exports fetchEditorialSpotlight function", () => {
    expect(typeof fetchEditorialSpotlight).toBe("function");
  });

  it("uses a premium editorial default headline instead of the generic week label", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error("no settings") });

    await expect(fetchSiteSettings()).resolves.toMatchObject({
      featuredSpotlightHeadline: "Featured Photographer",
    });
  });
});
