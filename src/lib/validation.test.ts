import { describe, it, expect } from "vitest";
import { isValidEmail, isStrongPassword, isValidPhone, isValidHttpsUrl } from "./validation";

describe("Validation utilities", () => {
  it("validates emails correctly", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
  });

  it("validates strong passwords", () => {
    expect(isStrongPassword("Password123!")).toBe(true);
    expect(isStrongPassword("weak")).toBe(false);
  });

  it("validates phone numbers", () => {
    expect(isValidPhone("+1234567890")).toBe(true);
    expect(isValidPhone("123")).toBe(false); // Too short
  });

  it("validates HTTPS URLs", () => {
    expect(isValidHttpsUrl("https://example.com")).toBe(true);
    expect(isValidHttpsUrl("http://example.com")).toBe(false);
    expect(isValidHttpsUrl("not-a-url")).toBe(false);
  });
});
