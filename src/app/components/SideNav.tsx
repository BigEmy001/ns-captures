import { ReactNode, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, LucideIcon } from "lucide-react";

export interface SideNavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number;
  heading?: string;
  divider?: boolean;
}

/**
 * Premium, Apple-like console sidebar that collapses to an icon-only rail.
 * Used by both the user account and admin console.
 */
export function SideNav({
  items,
  active,
  onSelect,
  header,
  footer,
}: {
  items: SideNavItem[];
  active: string;
  onSelect: (id: string) => void;
  header?: (collapsed: boolean) => ReactNode;
  footer?: (collapsed: boolean) => ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`hidden shrink-0 transition-[width] duration-300 md:block ${collapsed ? "w-16" : "w-60"}`}>
      <div className="sticky top-24">
        <div className={`mb-5 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && header?.(collapsed)}
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="grid size-9 shrink-0 place-items-center rounded-full text-[#6b716d] transition hover:bg-[#f2f2f2] hover:text-[#18211f]"
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
        </div>

        <nav className="space-y-1">
          {items.map((n, i) => {
            if (n.divider) {
              return <div key={`div-${i}`} className="my-4 border-t border-[#ececec]" />;
            }
            if (n.heading) {
              return (
                <div key={`head-${i}`} className={`mb-1 mt-6 px-3 text-[10px] font-bold tracking-wider text-[#8a8f89] uppercase ${collapsed ? "hidden" : "block"}`}>
                  {n.heading}
                </div>
              );
            }
            return (
              <button
                key={n.id}
                onClick={() => onSelect(n.id)}
                title={collapsed ? n.label : undefined}
                className={`relative flex w-full items-center rounded-lg py-2.5 text-sm transition ${
                  collapsed ? "justify-center px-0" : "gap-3 px-3"
                } ${
                  active === n.id
                    ? "bg-[#eef1ec] font-semibold text-[#1e4a3f]"
                    : "text-[#4a534e] hover:bg-[#f6f6f6]"
                }`}
              >
                {n.icon && <n.icon className="size-[18px] shrink-0" />}
                {!collapsed && n.label}
                
                {n.badge && n.badge > 0 ? (
                  !collapsed ? (
                    <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-[#d4183d] text-[10px] font-bold text-white">
                      {n.badge > 99 ? "99+" : n.badge}
                    </span>
                  ) : (
                    <div className="absolute right-1 top-1 size-2 rounded-full bg-[#d4183d]" />
                  )
                ) : null}
              </button>
            );
          })}
        </nav>

        {footer && <div className="mt-2 border-t border-[#f0f0f0] pt-2">{footer(collapsed)}</div>}
      </div>
    </aside>
  );
}
