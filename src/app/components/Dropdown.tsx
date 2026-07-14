import { ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronDown, LucideIcon } from "lucide-react";

export interface DropdownItem {
  label: string;
  icon?: LucideIcon;
  to?: string;
  onClick?: () => void;
  badge?: string;
  divider?: boolean;
  flag?: string;
  action?: string;
}

/**
 * Pexels-style menu: a clean white popover of icon + label rows,
 * some with NEW badges and dividers.
 */
export function Dropdown({
  label,
  items,
  align = "right",
  trigger,
  onItemClick,
}: {
  label?: string;
  items: DropdownItem[];
  align?: "left" | "right";
  trigger?: ReactNode;
  onItemClick?: (item: DropdownItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-[#4a534e] transition hover:text-[#18211f]"
      >
        {trigger ?? (
          <>
            {label}
            <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-3 w-60 rounded-lg border border-[#ececec] bg-white py-2 ns-popover ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item, i) =>
            item.divider ? (
              <div key={`d-${i}`} className="my-2 border-t border-[#f0f0f0]" />
            ) : item.to ? (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#333935] transition hover:bg-[#f6f6f6]"
              >
                {item.flag && <span className="text-base">{item.flag}</span>}
                {item.icon && <item.icon className="size-[18px] text-[#6b716d]" />}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded bg-[#1e4a3f] px-1.5 py-0.5 font-mono text-[9px] tracking-[0.06em] text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            ) : (
              <button
                key={item.label}
                onClick={() => {
                  item.onClick?.();
                  onItemClick?.(item);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#333935] transition hover:bg-[#f6f6f6]"
              >
                {item.flag && <span className="text-base">{item.flag}</span>}
                {item.icon && <item.icon className="size-[18px] text-[#6b716d]" />}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded bg-[#1e4a3f] px-1.5 py-0.5 font-mono text-[9px] tracking-[0.06em] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
