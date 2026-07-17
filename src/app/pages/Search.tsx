import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { PhotoCard } from "../components/PhotoCard";
import { Eyebrow } from "../components/ui";
import { photos as fallbackPhotos, categories, licenses, License, Orientation, Photo } from "../data/photos";
import { fetchPhotos } from "../data/db";

const orientations: Orientation[] = ["portrait", "landscape", "square"];

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const ai = params.get("ai") === "1";

  const [query, setQuery] = useState(q);
  const [category, setCategory] = useState(params.get("cat") ?? "All");
  const [photos, setPhotos] = useState<Photo[]>(fallbackPhotos);

  useEffect(() => {
    fetchPhotos().then(setPhotos).catch(() => {});
  }, []);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
    setCategory(params.get("cat") ?? "All");
  }, [params]);
  const [activeLicenses, setActiveLicenses] = useState<License[]>([]);
  const [orientation, setOrientation] = useState<Orientation | null>(null);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [sort, setSort] = useState<"popular" | "new" | "priceLow">("popular");
  const [drawer, setDrawer] = useState(false);

  const toggleLicense = (l: License) =>
    setActiveLicenses((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

  const results = useMemo(() => {
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const scored = photos
      .filter((p) => {
        const matchesCat = category === "All" || p.category === category;
        const matchesLicense = activeLicenses.length === 0 || activeLicenses.includes(p.license);
        const matchesOrient = !orientation || p.orientation === orientation;
        const matchesPrice = p.price <= maxPrice;
        if (!(matchesCat && matchesLicense && matchesOrient && matchesPrice)) return false;

        if (tokens.length === 0) return true;

        const searchable = [
          p.title,
          p.photographer,
          p.location,
          p.category,
          p.id,
          ...(p.keywords || []),
        ]
          .filter(Boolean)
          .map((s) => s.toLowerCase());

        return tokens.every((token) =>
          searchable.some((field) => field.includes(token)),
        );
      })
      .map((p) => {
        let score = 0;
        if (tokens.length > 0) {
          const lower = [p.title, p.photographer, p.location, p.category, ...(p.keywords || [])]
            .filter(Boolean)
            .map((s) => s.toLowerCase());

          for (const token of tokens) {
            if (lower[0]?.includes(token)) score += 4;
            if (lower[1]?.includes(token)) score += 3;
            if (lower.slice(2).some((f) => f.includes(token))) score += 1;
          }
        }
        return { photo: p, score };
      });

    scored.sort((a, b) => {
      if (tokens.length > 0 && a.score !== b.score) return b.score - a.score;
      if (sort === "priceLow") return a.photo.price - b.photo.price;
      if (sort === "new") return b.photo.id.localeCompare(a.photo.id);
      return b.photo.downloads - a.photo.downloads;
    });

    return scored.map((s) => s.photo);
  }, [query, category, activeLicenses, orientation, maxPrice, sort, photos]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (query) next.set("q", query);
    else next.delete("q");
    if (category === "All") next.delete("cat");
    else next.set("cat", category);
    setParams(next);
  };

  const clearAll = () => {
    setActiveLicenses([]);
    setOrientation(null);
    setMaxPrice(10000);
    setCategory("All");
    const next = new URLSearchParams(params);
    next.delete("cat");
    setParams(next);
  };

  const filtersContent = (
    <div className="space-y-8">
      <div>
        <p className="mb-3 font-mono text-[10px] tracking-[0.14em] text-[#758078]">LICENSE</p>
        <div className="space-y-2">
          {licenses.map((l) => (
            <label key={l} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={activeLicenses.includes(l)}
                onChange={() => toggleLicense(l)}
                className="size-4 accent-[#1e4a3f]"
              />
              {l.charAt(0) + l.slice(1).toLowerCase()}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 font-mono text-[10px] tracking-[0.14em] text-[#758078]">ORIENTATION</p>
        <div className="flex flex-wrap gap-2">
          {orientations.map((o) => (
            <button
              key={o}
              onClick={() => setOrientation((prev) => (prev === o ? null : o))}
              className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${
                orientation === o ? "border-[#1e4a3f] bg-[#e7ebe2] text-[#1e4a3f]" : "border-[#ececec] text-[#68706b]"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 font-mono text-[10px] tracking-[0.14em] text-[#758078]">MAX PRICE — ${maxPrice}</p>
          <input
          type="range"
          min={100}
          max={10000}
          step={10}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#1e4a3f]"
        />
      </div>
      <button onClick={clearAll} className="text-sm font-semibold text-[#1e4a3f] hover:underline">
        Clear all filters
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
      {/* Search bar */}
      <form onSubmit={submit} className="flex items-center gap-2 border border-[#ececec] bg-[#ffffff] ns-shadow-sm px-4 py-3">
        {ai ? <Sparkles className="size-5 text-[#1e4a3f]" /> : <Search className="size-5 text-[#56625d]" />}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ai ? "Describe the image you need..." : "Search photographs, people, places..."}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#8a8f89]"
        />
        <button type="submit" className="rounded-full bg-[#1e4a3f] px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>

      {ai && (
        <p className="mt-3 flex items-center gap-2 text-xs text-[#547066]">
          <Sparkles className="size-3.5" /> AI semantic search — results ranked by meaning, not just keywords.
        </p>
      )}

      {/* Category chips */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);
              const next = new URLSearchParams(params);
              if (c === "All") next.delete("cat");
              else next.set("cat", c);
              setParams(next);
            }}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${
              category === c ? "border-[#1e4a3f] bg-[#1e4a3f] text-white ns-shadow-sm" : "border-[#ececec] bg-white/50 text-[#4a534e] hover:border-[#1e4a3f]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-8 flex gap-10">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            {filtersContent}
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <Eyebrow>{query ? `RESULTS FOR "${query.toUpperCase()}"` : "NS COLLECTION"}</Eyebrow>
              <p className="mt-2 text-sm text-[#6b716d]">{results.length} images</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="border border-[#ececec] bg-[#ffffff] ns-shadow-sm px-3 py-2 text-sm outline-none"
              >
                <option value="popular">Most popular</option>
                <option value="new">Newest</option>
                <option value="priceLow">Price: low to high</option>
              </select>
              <button
                onClick={() => setDrawer(true)}
                className="flex items-center gap-2 rounded-full border border-[#ececec] bg-white/50 px-3 py-2 text-sm lg:hidden"
              >
                <SlidersHorizontal className="size-4" /> Filters
              </button>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="border border-dashed border-[#ececec] py-24 text-center">
              <p className="font-serif text-2xl">No matches yet.</p>
              <p className="mt-2 text-sm text-[#6b716d]">Try a broader term or request a custom shoot.</p>
            </div>
          ) : (
            <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 640: 2, 1024: 3 }}>
              <Masonry gutter="20px">
                {results.map((p) => (
                  <PhotoCard key={p.id} item={p} />
                ))}
              </Masonry>
            </ResponsiveMasonry>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-[#ffffff] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-serif text-2xl">Filters</h3>
              <button onClick={() => setDrawer(false)}><X /></button>
            </div>
            {filtersContent}
          </div>
        </div>
      )}
    </div>
  );
}
