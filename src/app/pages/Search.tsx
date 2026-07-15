import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Search, SlidersHorizontal, Sparkles, X, Globe, Library } from "lucide-react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { PhotoCard } from "../components/PhotoCard";
import { Eyebrow } from "../components/ui";
import { photos, categories, licenses, License, Orientation, Photo } from "../data/photos";

const orientations: Orientation[] = ["portrait", "landscape", "square"];

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const ai = params.get("ai") === "1";

  const [query, setQuery] = useState(q);
  const [category, setCategory] = useState(params.get("cat") ?? "All");

  useEffect(() => {
    setQuery(params.get("q") ?? "");
    setCategory(params.get("cat") ?? "All");
  }, [params]);
  const [activeLicenses, setActiveLicenses] = useState<License[]>([]);
  const [orientation, setOrientation] = useState<Orientation | null>(null);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [sort, setSort] = useState<"popular" | "new" | "priceLow">("popular");
  const [drawer, setDrawer] = useState(false);

  // Unsplash API state
  const [source, setSource] = useState<"local" | "unsplash">("local");
  const [unsplashResults, setUnsplashResults] = useState<Photo[]>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);

  useEffect(() => {
    if (source !== "unsplash") return;

    setUnsplashLoading(true);
    const searchQuery = query || (category !== "All" ? category : "photography");

    const controller = new AbortController();
    fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=24`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.results) {
          const mapped: Photo[] = data.results.map((item: any) => ({
            id: "unsplash-" + item.id,
            title: item.description || item.alt_description || "Untitled Frame",
            photographerId: item.user.username,
            photographer: item.user.name,
            license: "COMMERCIAL" as License,
            category: "Unsplash",
            location: item.user.location || "Global Network",
            color: item.color || "#333",
            orientation: item.width > item.height ? ("landscape" as Orientation) : ("portrait" as Orientation),
            ratio: item.width > item.height ? "aspect-[3/2]" : "aspect-[3/4]",
            price: 250,
            downloads: item.likes * 12,
            views: item.likes * 240,
            likes: item.likes,
            camera: "Professional Body",
            lens: "Prime Focal Lens",
            iso: 100,
            keywords: ["unsplash", "global"],
            image: item.urls.regular,
          }));
          setUnsplashResults(mapped);
        } else {
          setUnsplashResults([]);
        }
        setUnsplashLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error(err);
          setUnsplashLoading(false);
        }
      });

    return () => controller.abort();
  }, [query, category, source]);

  const toggleLicense = (l: License) =>
    setActiveLicenses((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

  const results = useMemo(() => {
    if (source === "unsplash") {
      let list = [...unsplashResults];
      if (orientation) {
        list = list.filter((p) => p.orientation === orientation);
      }
      if (sort === "priceLow") list.sort((a, b) => a.price - b.price);
      if (sort === "new") list.sort((a, b) => b.id.localeCompare(a.id));
      if (sort === "popular") list.sort((a, b) => b.downloads - a.downloads);
      return list;
    }

    let list = photos.filter((p) => {
      const matchesQ =
        !query ||
        [p.title, p.photographer, p.location, p.category, ...(p.keywords || [])]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesCat = category === "All" || p.category === category;
      const matchesLicense = activeLicenses.length === 0 || activeLicenses.includes(p.license);
      const matchesOrient = !orientation || p.orientation === orientation;
      const matchesPrice = p.price <= maxPrice;
      return matchesQ && matchesCat && matchesLicense && matchesOrient && matchesPrice;
    });
    if (sort === "priceLow") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "new") list = [...list].sort((a, b) => b.id.localeCompare(a.id));
    if (sort === "popular") list = [...list].sort((a, b) => b.downloads - a.downloads);
    return list;
  }, [query, category, activeLicenses, orientation, maxPrice, sort, source, unsplashResults]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams((prev) => {
      prev.set("q", query);
      return prev;
    });
  };

  const clearAll = () => {
    setActiveLicenses([]);
    setOrientation(null);
    setMaxPrice(1000);
    setCategory("All");
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
          max={1000}
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
            onClick={() => setCategory(c)}
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
          {/* API Source Switcher */}
          <div className="flex border-b border-[#ececec] mb-6 gap-6">
            <button
              onClick={() => setSource("local")}
              className={`pb-3 text-xs font-mono tracking-wider font-semibold uppercase relative transition flex items-center gap-1.5 cursor-pointer ${
                source === "local" ? "text-[#1e4a3f]" : "text-[#8a8f89] hover:text-[#18211f]"
              }`}
            >
              <Library className="size-3.5" /> Local Archive
              {source === "local" && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#1e4a3f]" />}
            </button>
            <button
              onClick={() => setSource("unsplash")}
              className={`pb-3 text-xs font-mono tracking-wider font-semibold uppercase relative transition flex items-center gap-1.5 cursor-pointer ${
                source === "unsplash" ? "text-[#1e4a3f]" : "text-[#8a8f89] hover:text-[#18211f]"
              }`}
            >
              <Globe className="size-3.5" /> Global Unsplash Network
              {source === "unsplash" && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#1e4a3f]" />}
            </button>
          </div>

          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <Eyebrow>{query ? `RESULTS FOR "${query.toUpperCase()}"` : "THE LIBRARY"}</Eyebrow>
              <p className="mt-2 text-sm text-[#6b716d]">{unsplashLoading ? "Searching..." : `${results.length} images`}</p>
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

          {unsplashLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse border border-[#ececec]/80 bg-white rounded-2xl p-4 space-y-4 shadow-sm">
                  <div className="aspect-[3/4] bg-gray-200 rounded-xl"></div>
                  <div className="h-4 bg-gray-200 w-2/3 rounded-md"></div>
                  <div className="h-3 bg-gray-200 w-1/3 rounded-md"></div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
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
