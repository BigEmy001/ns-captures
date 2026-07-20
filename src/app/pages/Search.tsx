import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router";
import { Search, SlidersHorizontal, Sparkles, X, Loader2 } from "lucide-react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { PhotoCard } from "../components/PhotoCard";
import { Eyebrow } from "../components/ui";
import { categories, licenses, License, Orientation, Photo } from "../data/photos";
import { fetchPhotosPaginated } from "../data/db";
import { toast } from "sonner";

const orientations: Orientation[] = ["portrait", "landscape", "square"];

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const ai = params.get("ai") === "1";
  const collectionId = params.get("collectionId") ?? undefined;
  const collectionName = params.get("collectionName") ?? undefined;

  const [query, setQuery] = useState(q);
  const [category, setCategory] = useState(params.get("cat") ?? "All");
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [activeLicenses, setActiveLicenses] = useState<License[]>([]);
  const [orientation, setOrientation] = useState<Orientation | null>(null);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [sort, setSort] = useState<"popular" | "new" | "priceLow">("popular");
  const [drawer, setDrawer] = useState(false);

  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Keep query and category in sync with URL
  useEffect(() => {
    setQuery(params.get("q") ?? "");
    setCategory(params.get("cat") ?? "All");
  }, [params]);

  // Reset pagination when any filter changes
  useEffect(() => {
    setPage(0);
    setPhotos([]);
    setHasMore(true);
    setIsLoading(true);
  }, [query, category, activeLicenses, orientation, maxPrice, sort, collectionId]);

  // Fetch data
  useEffect(() => {
    let active = true;
    const fetch = async () => {
      if (page > 0) setIsLoadingMore(true);
      try {
        const { photos: newPhotos, hasMore: more } = await fetchPhotosPaginated(
          { query, category, licenses: activeLicenses, orientation, maxPrice, sort, collectionId },
          page,
          20,
        );

        if (!active) return;

        if (page === 0) {
          setPhotos(newPhotos);
        } else {
          setPhotos((prev) => [...prev, ...newPhotos]);
        }
        setHasMore(more);
      } catch (err) {
        toast.error("Failed to load photos");
      } finally {
        if (active) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    };
    fetch();
    return () => {
      active = false;
    };
  }, [page, query, category, activeLicenses, orientation, maxPrice, sort]);

  // Infinite Scroll Observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading || isLoadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isLoading, isLoadingMore, hasMore],
  );

  const toggleLicense = (l: License) =>
    setActiveLicenses((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

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
                orientation === o
                  ? "border-[#1e4a3f] bg-[#e7ebe2] text-[#1e4a3f]"
                  : "border-[#ececec] text-[#68706b]"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 font-mono text-[10px] tracking-[0.14em] text-[#758078]">
          MAX PRICE — £{maxPrice}
        </p>
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
      <form
        onSubmit={submit}
        className="flex items-center gap-2 border border-[#ececec] bg-[#ffffff] ns-shadow-sm px-4 py-3"
      >
        {ai ? (
          <Sparkles className="size-5 text-[#1e4a3f]" />
        ) : (
          <Search className="size-5 text-[#56625d]" />
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            ai ? "Describe the image you need..." : "Search photographs, people, places..."
          }
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#8a8f89]"
        />
        <button
          type="submit"
          className="rounded-full bg-[#1e4a3f] px-4 py-2 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>

      {ai && (
        <p className="mt-3 flex items-center gap-2 text-xs text-[#547066]">
          <Sparkles className="size-3.5" /> AI semantic search — results ranked by meaning, not just
          keywords.
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
              category === c
                ? "border-[#1e4a3f] bg-[#1e4a3f] text-white ns-shadow-sm"
                : "border-[#ececec] bg-white/50 text-[#4a534e] hover:border-[#1e4a3f]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-8 flex gap-10">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">{filtersContent}</div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <Eyebrow>
                {collectionName
                  ? `COLLECTION: ${collectionName.toUpperCase()}`
                  : query
                    ? `RESULTS FOR "${query.toUpperCase()}"`
                    : "NS COLLECTION"}
              </Eyebrow>
              {isLoading ? (
                <div className="mt-2 h-4 w-16 bg-[#ececec] rounded animate-pulse" />
              ) : (
                <p className="mt-2 text-sm text-[#6b716d]">{photos.length} images</p>
              )}
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

          {isLoading ? (
            <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 640: 2, 1024: 3 }}>
              <Masonry gutter="20px">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-[#ececec] animate-pulse"
                    style={{ height: 150 + ((i * 37) % 200) + "px" }}
                  />
                ))}
              </Masonry>
            </ResponsiveMasonry>
          ) : photos.length === 0 ? (
            <div className="border border-dashed border-[#ececec] py-24 text-center">
              <p className="font-serif text-2xl">No matches yet.</p>
              <p className="mt-2 text-sm text-[#6b716d]">
                Try a broader term or request a custom shoot.
              </p>
            </div>
          ) : (
            <>
              <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 640: 2, 1024: 3 }}>
                <Masonry gutter="20px">
                  {photos.map((p, index) => {
                    const isLast = index === photos.length - 1;
                    return (
                      <div key={p.id} ref={isLast ? lastElementRef : null}>
                        <PhotoCard item={p} />
                      </div>
                    );
                  })}
                </Masonry>
              </ResponsiveMasonry>

              {isLoadingMore && (
                <div className="mt-8 flex justify-center py-4">
                  <Loader2 className="size-6 animate-spin text-[#1e4a3f]" />
                </div>
              )}

              {!hasMore && photos.length > 0 && (
                <div className="mt-12 text-center text-sm text-[#6b716d]">
                  End of results. You've seen all {photos.length} images.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute right-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-[#ffffff] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-serif text-2xl">Filters</h3>
              <button onClick={() => setDrawer(false)}>
                <X />
              </button>
            </div>
            {filtersContent}
          </div>
        </div>
      )}
    </div>
  );
}
