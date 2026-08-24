import { describe, it, expect } from "vitest";
import { resolveContact, withSubject, contactLabel, DEFAULT_CONTACT } from "./contact";

describe("resolveContact", () => {
  it("turns a bare address into an email", () => {
    const c = resolveContact("payments@nscaptures.com");
    expect(c.kind).toBe("email");
    expect(c.href).toBe("mailto:payments@nscaptures.com");
  });

  it("turns a phone number into WhatsApp", () => {
    const c = resolveContact("+44 7700 900123");
    expect(c.kind).toBe("whatsapp");
    expect(c.href).toBe("https://wa.me/447700900123");
  });

  it("follows a link as written", () => {
    const c = resolveContact("https://t.me/nscaptures");
    expect(c.kind).toBe("link");
    expect(c.href).toBe("https://t.me/nscaptures");
  });

  it("knows a wa.me link is WhatsApp", () => {
    expect(resolveContact("https://wa.me/447700900123").kind).toBe("whatsapp");
  });

  it("accepts a mailto the admin typed in full", () => {
    const c = resolveContact("mailto:desk@nscaptures.com");
    expect(c.kind).toBe("email");
    expect(c.display).toBe("desk@nscaptures.com");
  });

  it("gives a bare domain a scheme rather than dropping it", () => {
    expect(resolveContact("t.me/nscaptures").href).toBe("https://t.me/nscaptures");
  });

  it("falls back to the default when nothing is set", () => {
    expect(resolveContact("").href).toBe(`mailto:${DEFAULT_CONTACT}`);
    expect(resolveContact(null, undefined, "  ").href).toBe(`mailto:${DEFAULT_CONTACT}`);
  });

  it("prefers the first candidate that resolves", () => {
    expect(resolveContact(null, "desk@nscaptures.com", "+44 7700 900123").display).toBe(
      "desk@nscaptures.com",
    );
  });

  it("skips a candidate that is not a destination at all", () => {
    expect(resolveContact("contact support", "desk@nscaptures.com").display).toBe(
      "desk@nscaptures.com",
    );
  });

  it("never returns an empty destination", () => {
    for (const input of ["", "   ", "nonsense", "@@@", "..."]) {
      expect(resolveContact(input).href).toBeTruthy();
    }
  });
});

describe("withSubject", () => {
  it("attaches a subject to an email", () => {
    const c = resolveContact("desk@nscaptures.com");
    expect(withSubject(c, "Conversion charge £370")).toBe(
      "mailto:desk@nscaptures.com?subject=Conversion%20charge%20%C2%A3370",
    );
  });

  it("leaves a WhatsApp link alone", () => {
    const c = resolveContact("+44 7700 900123");
    expect(withSubject(c, "anything")).toBe("https://wa.me/447700900123");
  });
});

describe("contactLabel", () => {
  it("names the button after where it goes", () => {
    expect(contactLabel(resolveContact("desk@nscaptures.com"))).toBe("Email Admin");
    expect(contactLabel(resolveContact("+44 7700 900123"))).toBe("WhatsApp Admin");
    expect(contactLabel(resolveContact("https://t.me/x"))).toBe("Contact Admin");
  });
});
