import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchEditorialSpotlight } from "./db";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("fetchEditorialSpotlight", () => {
  it("exports fetchEditorialSpotlight function", () => {
    expect(typeof fetchEditorialSpotlight).toBe("function");
  });
});
