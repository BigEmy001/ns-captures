import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email();
export const passwordSchema = z
  .string()
  .min(10)
  .regex(/[A-Za-z]/, "Must contain at least one letter")
  .regex(/\d/, "Must contain at least one number");
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9()\-\s]{7,20}$/, "Invalid phone number format");
export const urlSchema = z
  .string()
  .trim()
  .url()
  .refine((val) => val.startsWith("https://"), {
    message: "URL must be HTTPS",
  });

export function normalizeEmail(input: string): string {
  try {
    return emailSchema.parse(input);
  } catch {
    return input.trim().toLowerCase();
  }
}

export function isValidEmail(input: string): boolean {
  return emailSchema.safeParse(input).success;
}

export function isStrongPassword(input: string): boolean {
  return passwordSchema.safeParse(input).success;
}

export function isValidPhone(input: string): boolean {
  return phoneSchema.safeParse(input).success;
}

export function isValidHttpsUrl(input: string): boolean {
  return urlSchema.safeParse(input).success;
}

export function escapeHtml(input: string): string {
  if (!input) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
