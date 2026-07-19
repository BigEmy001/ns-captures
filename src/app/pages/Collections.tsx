import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Eyebrow } from "../components/ui";
import { fetchCollections, getOptimizedImageUrl } from "../data/db";
import type { Collection } from "../data/photos";

export function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    fetchCollections().then(setCollections);
  }, []);
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
      <Eyebrow>CURATED COLLECTIONS</Eyebrow>
      <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-[1.03] sm:text-5xl">
        Sets, edited by people with taste.
      </h1>
      <p className="mt-4 max-w-lg text-[#59645f]">
        Collections gather imagery around an idea — a place, a mood, a movement. Follow the ones that speak to your work.
      </p>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {collections.map((c) => (
          <Link key={c.id} to={`/search?collectionId=${c.id}&collectionName=${encodeURIComponent(c.title)}`} className="group block">
            <div className="grid aspect-[16/9] grid-cols-3 gap-0.5 overflow-hidden bg-[#d7d8d2]">
              {c.cover?.[0] ? (
                <img src={getOptimizedImageUrl(c.cover[0], 600)} alt={c.title} loading="lazy" className="col-span-2 size-full object-cover transition group-hover:scale-[1.02]" />
              ) : (
                <div className="col-span-2 size-full bg-[#d7d8d2]" />
              )}
              <div className="grid grid-rows-2 gap-0.5">
                {c.cover?.[1] ? (
                  <img src={getOptimizedImageUrl(c.cover[1], 300)} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                  <div className="size-full bg-[#d7d8d2]" />
                )}
                {c.cover?.[2] ? (
                  <img src={getOptimizedImageUrl(c.cover[2], 300)} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                  <div className="size-full bg-[#d7d8d2]" />
                )}
              </div>
            </div>
            <div className="flex items-start justify-between gap-4 pt-4">
              <div>
                <h2 className="font-serif text-2xl leading-none">{c.title}</h2>
                <p className="mt-2 text-sm text-[#6b716d]">{c.description}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] tracking-[0.08em] text-[#637167]">{c.count} IMAGES</span>
            </div>
            <p className="mt-2 text-xs text-[#8a8f89]">Curated by {c.curator}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
