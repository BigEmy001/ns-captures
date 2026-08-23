import { describe, it, expect } from "vitest";
import {
  CATEGORY_ORDER,
  preferenceFor,
  relativeTime,
  shouldEmail,
  shouldShowInApp,
  unreadCount,
  type AppNotification,
  type NotificationPreferences,
} from "./notifications";

function notification(partial: Partial<AppNotification>): AppNotification {
  return {
    id: Math.random().toString(36),
    category: "earnings",
    priority: "normal",
    title: "Something happened",
    body: null,
    link: null,
    readAt: null,
    createdAt: "2026-08-23T10:00:00Z",
    ...partial,
  };
}

describe("notification preferences", () => {
  it("treats a category nobody has set as on", () => {
    expect(preferenceFor({}, "earnings")).toEqual({ inApp: true, email: true });
    expect(preferenceFor(null, "acquisitions")).toEqual({ inApp: true, email: true });
  });

  it("keeps the channel that was set and defaults the other", () => {
    const prefs: NotificationPreferences = { earnings: { inApp: true, email: false } };
    expect(preferenceFor(prefs, "earnings")).toEqual({ inApp: true, email: false });
  });

  it("covers every category the programme uses", () => {
    expect(CATEGORY_ORDER).toEqual([
      "earnings",
      "photography",
      "acquisitions",
      "publications",
      "account",
    ]);
  });
});

describe("what reaches someone", () => {
  const off: NotificationPreferences = {
    earnings: { inApp: false, email: false },
    acquisitions: { inApp: false, email: false },
  };

  it("respects an opt-out for ordinary notifications", () => {
    expect(shouldShowInApp(off, "earnings", "normal")).toBe(false);
    expect(shouldEmail(off, "earnings", "normal")).toBe(false);
  });

  it("still delivers anything that needs action", () => {
    // An acquisition offer or an agreement to sign is not opt-out-able.
    expect(shouldShowInApp(off, "acquisitions", "high")).toBe(true);
    expect(shouldEmail(off, "acquisitions", "high")).toBe(true);
  });

  it("never emails ambient activity", () => {
    expect(shouldEmail({}, "photography", "low")).toBe(false);
    expect(shouldShowInApp({}, "photography", "low")).toBe(true);
  });

  it("lets someone keep in-app but drop the email", () => {
    const prefs: NotificationPreferences = { photography: { inApp: true, email: false } };
    expect(shouldShowInApp(prefs, "photography", "normal")).toBe(true);
    expect(shouldEmail(prefs, "photography", "normal")).toBe(false);
  });
});

describe("unreadCount", () => {
  it("counts only what has not been read", () => {
    const items = [
      notification({ readAt: null }),
      notification({ readAt: "2026-08-23T11:00:00Z" }),
      notification({ readAt: null }),
    ];
    expect(unreadCount(items)).toBe(2);
  });

  it("is zero for an empty list", () => {
    expect(unreadCount([])).toBe(0);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-08-23T12:00:00Z");

  it("reads naturally at each scale", () => {
    expect(relativeTime("2026-08-23T11:59:30Z", now)).toBe("just now");
    expect(relativeTime("2026-08-23T11:45:00Z", now)).toBe("15m ago");
    expect(relativeTime("2026-08-23T09:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-08-21T12:00:00Z", now)).toBe("2d ago");
    expect(relativeTime("2026-08-09T12:00:00Z", now)).toBe("2w ago");
  });

  it("falls back to a date once it is old", () => {
    expect(relativeTime("2026-06-01T12:00:00Z", now)).toBe("1 Jun");
  });

  it("does not report a negative age for a clock skewed into the future", () => {
    expect(relativeTime("2026-08-23T12:05:00Z", now)).toBe("just now");
  });

  it("returns nothing for an unparseable date rather than NaN", () => {
    expect(relativeTime("not a date", now)).toBe("");
  });
});
