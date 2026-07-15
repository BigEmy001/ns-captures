import { Link, useSearchParams } from "react-router";
import { ChevronDown } from "lucide-react";

const items = [
  { label: "All", to: "/search" },
  { label: "Documentary", to: "/search?cat=Documentary" },
  { label: "Portrait", to: "/search?cat=Portrait" },
  { label: "Architecture", to: "/search?cat=Architecture" },
  { label: "Culture", to: "/search?cat=Culture" },
  { label: "Fashion", to: "/search?cat=Fashion" },
  { label: "Requests", to: "/requests", badge: "NEW" },
];

// Pill category bar shown under the hero, matching the modern reference.
export function CategoryNav({ active = "All" }: { active?: string }) {
  const [params] = useSearchParams();
  const cat = params.get("cat");

  return (
    <div className="border-b border-[#ececec] bg-[#ffffff]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-12">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {items.map((i) => {
            const isActive = i.label === active || (cat && i.to.includes(cat));
            return (
              <Link
                key={i.label}
                to={i.to}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive ? "bg-[#1e4a3f] text-white" : "text-[#4a534e] hover:bg-[#e7ebe2]"
                }`}
              >
                {i.label}
                {i.badge && (
                  <span className="rounded-full bg-[#dce8df] px-1.5 py-0.5 font-mono text-[8px] tracking-[0.08em] text-[#285746]">
                    {i.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <button className="hidden shrink-0 items-center gap-1.5 border border-[#ececec] bg-[#ffffff] ns-shadow-sm px-3 py-2 text-xs text-[#4a534e] sm:flex">
          Trending <ChevronDown className="size-3" />
        </button>
      </div>
    </div>
  );
}
