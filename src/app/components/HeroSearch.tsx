import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";

export function HeroSearch() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"Library">("Library");
  const tabs = ["Library"] as const;

  const go = () => navigate(`/search?q=${encodeURIComponent(query)}`);

  return (
    <div className="w-full max-w-[660px] border border-white/60 bg-[#ffffff]/95 p-2 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-2.5">
      <div className="flex border-b border-[#e2e2e2] px-2">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setActiveTab(item)}
            className={`relative px-3 pb-3 text-xs font-semibold tracking-[0.07em] transition sm:px-5 ${
              activeTab === item ? "text-[#173c33]" : "text-[#74766f] hover:text-[#18211f]"
            }`}
          >
            {item}
            {activeTab === item && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#1e4a3f]" />
            )}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="flex items-center gap-2 p-2 pt-3"
      >
        <Search className="ml-2 size-5 shrink-0 text-[#56625d]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search photographs, collections, people..."
          className="min-w-0 flex-1 bg-transparent px-1 text-sm text-[#18211f] outline-none placeholder:text-[#74766f]"
        />
        <button
          type="submit"
          aria-label="Search"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1e4a3f] text-white transition hover:-translate-y-0.5 hover:bg-[#123b31]"
        >
          <ArrowUpRight className="size-5" />
        </button>
      </form>
    </div>
  );
}
