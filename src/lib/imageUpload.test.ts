import { describe, it, expect } from "vitest";
import { MAX_UPLOAD_MB, validateImageFile } from "./imageUpload";

describe("validateImageFile", () => {
  it("accepts an image within the size limit", () => {
    expect(validateImageFile(new File(["x"], "avatar.png", { type: "image/png" }))).toBeNull();
  });

  it("rejects files that aren't images", () => {
    const pdf = new File(["x"], "brief.pdf", { type: "application/pdf" });
    expect(validateImageFile(pdf)).toContain("image file");
  });

  it("rejects images over the size limit", () => {
    const large = new File(["x"], "character.jpg", { type: "image/jpeg" });
    Object.defineProperty(large, "size", { value: (MAX_UPLOAD_MB + 1) * 1024 * 1024 });
    expect(validateImageFile(large)).toContain(`${MAX_UPLOAD_MB} MB`);
  });
});
