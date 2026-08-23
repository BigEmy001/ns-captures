import { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../data/db";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  relativeTime,
  unreadCount,
  type AppNotification,
  type NotificationCategory,
} from "../data/notifications";

const POLL_INTERVAL = 90_000;

/**
 * The notification centre. Opens from the navbar, filters by the categories
 * the programme uses, and marks things read as they are dealt with.
 */
export function NotificationBell() {
  const { user, isViewingAs } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<NotificationCategory | "all">("all");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id || isViewingAs) return;
    let cancelled = false;

    const load = () => {
      fetchNotifications(user.id).then((rows) => {
        if (!cancelled) setItems(rows);
      });
    };

    load();
    const timer = window.setInterval(load, POLL_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user?.id, isViewingAs]);

  // Close on an outside click or Escape, as any menu should.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user || isViewingAs) return null;

  const unread = unreadCount(items);
  const visible = filter === "all" ? items : items.filter((n) => n.category === filter);

  const openNotification = async (notification: AppNotification) => {
    if (!notification.readAt) {
      setItems((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
      markNotificationRead(notification.id);
    }

    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  const readAll = async () => {
    const stamp = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: stamp })));
    await markAllNotificationsRead(user.id);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative grid size-9 place-items-center rounded-full text-[#4a534e] transition hover:bg-[#f2f2f2] hover:text-[#18211f]"
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 grid min-w-[16px] place-items-center rounded-full bg-[#1e4a3f] px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,26rem)] overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#ececec] px-4 py-3">
            <h2 className="font-serif text-base text-[#18211f]">Notifications</h2>
            {unread > 0 && (
              <button
                onClick={readAll}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#1e4a3f] hover:underline"
              >
                <Check className="size-3.5" /> Mark all as read
              </button>
            )}
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-[#ececec] px-3 py-2">
            {(["all", ...CATEGORY_ORDER] as const).map((id) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filter === id
                    ? "bg-[#1e4a3f] text-white"
                    : "text-[#6b716d] hover:bg-[#f2f2f2] hover:text-[#18211f]"
                }`}
              >
                {id === "all" ? "All" : CATEGORY_LABELS[id]}
              </button>
            ))}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {visible.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#758078]">
                {items.length === 0
                  ? "Nothing yet. Approvals, licences, offers and payouts will appear here."
                  : "Nothing in this category."}
              </p>
            ) : (
              <ul>
                {visible.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => openNotification(n)}
                      className={`flex w-full gap-3 border-b border-[#f4f4f2] px-4 py-3 text-left transition last:border-0 hover:bg-[#FAF9F5] ${
                        n.readAt ? "" : "bg-[#f6f9f7]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          n.readAt ? "bg-transparent" : "bg-[#1e4a3f]"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-semibold text-[#18211f]">{n.title}</span>
                          <span className="shrink-0 font-mono text-[10px] text-[#8a8f89]">
                            {relativeTime(n.createdAt)}
                          </span>
                        </span>
                        {n.body && (
                          <span className="mt-0.5 block text-xs text-[#59645f]">{n.body}</span>
                        )}
                        <span className="mt-1 block font-mono text-[9px] tracking-wider text-[#8a8f89] uppercase">
                          {CATEGORY_LABELS[n.category]}
                          {n.priority === "high" && " · Needs attention"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-[#ececec] px-4 py-2.5 text-center">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/account?tab=security");
              }}
              className="text-xs font-semibold text-[#1e4a3f] hover:underline"
            >
              Notification settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
