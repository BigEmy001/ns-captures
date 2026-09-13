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
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
      <div className="rounded-[30px] border border-[#e7e1d9] bg-[#f7f2ea] p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Eyebrow>CURATED COLLECTIONS</Eyebrow>
            <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-[0.94] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Private salons. Photographic studies.
            </h1>
          </div>

          <p className="max-w-xl text-sm leading-7 text-[#59645f] sm:text-[15px]">
            Collections gather imagery around an idea — a place, a mood, or a line of thought.
            Browse the ones that feel closest to your eye.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        {collections.map((c) => (
          <Link
            key={c.id}
            to={`/collection/${c.id}`}
            className="group block rounded-[26px] border border-[#e7e1d9] bg-[#faf7f2] p-3 shadow-[0_16px_40px_rgba(18,17,15,0.03)] transition duration-300 hover:-translate-y-1 hover:border-[#d4c7b7]"
          >
            <div className="grid aspect-[16/10] grid-cols-3 gap-1 overflow-hidden rounded-[18px] bg-[#d7d8d2]">
              {c.cover?.[0] ? (
                <img
                  src={getOptimizedImageUrl(c.cover[0], 600)}
                  alt={c.title}
                  loading="lazy"
                  className="col-span-2 size-full object-cover transition duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="col-span-2 size-full bg-[#d7d8d2]" />
              )}
              <div className="grid grid-rows-2 gap-1">
                {c.cover?.[1] ? (
                  <img
                    src={getOptimizedImageUrl(c.cover[1], 300)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full bg-[#d7d8d2]" />
                )}
                {c.cover?.[2] ? (
                  <img
                    src={getOptimizedImageUrl(c.cover[2], 300)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full bg-[#d7d8d2]" />
                )}
              </div>
            </div>

            <div className="mt-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b716d]">
                  Curated by {c.curator}
                </p>
                <h2 className="mt-2 font-serif text-2xl leading-none text-[#171513] sm:text-[2rem]">
                  {c.title}
                </h2>
              </div>
              <span className="shrink-0 rounded-full border border-[#e7e1d9] bg-white/70 px-2.5 py-1 font-mono text-[9px] tracking-[0.1em] text-[#637167]">
                {c.count.toLocaleString()} {c.count === 1 ? "IMAGE" : "IMAGES"}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-[#59645f]">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
