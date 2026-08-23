/**
 * In-app notifications for contributors.
 *
 * The brief is explicit that not everything should reach someone's phone. Three
 * tiers: high priority needs action and is emailed too, normal is worth knowing
 * about in the app, low is ambient activity that should never interrupt anyone.
 */

export type NotificationCategory =
  "earnings" | "photography" | "acquisitions" | "publications" | "account";

export type NotificationPriority = "high" | "normal" | "low";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  earnings: "Earnings",
  photography: "Photography",
  acquisitions: "Acquisitions",
  publications: "Publications",
  account: "Account",
};

export const CATEGORY_ORDER: NotificationCategory[] = [
  "earnings",
  "photography",
  "acquisitions",
  "publications",
  "account",
];

export interface CategoryPreference {
  inApp: boolean;
  email: boolean;
}

export type NotificationPreferences = Partial<Record<NotificationCategory, CategoryPreference>>;

const DEFAULT_PREFERENCE: CategoryPreference = { inApp: true, email: true };

/**
 * A category nobody has expressed a view about is on. Defaulting to off would
 * silently withhold things like an acquisition offer from anyone who signed up
 * before the category existed.
 */
export function preferenceFor(
  preferences: NotificationPreferences | null | undefined,
  category: NotificationCategory,
): CategoryPreference {
  return { ...DEFAULT_PREFERENCE, ...(preferences?.[category] || {}) };
}

/** Whether a notification of this kind should appear in the app at all. */
export function shouldShowInApp(
  preferences: NotificationPreferences | null | undefined,
  category: NotificationCategory,
  priority: NotificationPriority,
): boolean {
  // Something that needs action is not something to opt out of.
  if (priority === "high") return true;
  return preferenceFor(preferences, category).inApp;
}

/** Whether it should also be emailed. */
export function shouldEmail(
  preferences: NotificationPreferences | null | undefined,
  category: NotificationCategory,
  priority: NotificationPriority,
): boolean {
  if (priority === "low") return false;
  if (priority === "high") return true;
  return preferenceFor(preferences, category).email;
}

export function unreadCount(notifications: AppNotification[]): number {
  return notifications.filter((n) => !n.readAt).length;
}

/** A short relative time, for a list that is scanned rather than read. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.floor((now.getTime() - then) / 1000));
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
