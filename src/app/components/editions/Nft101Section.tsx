import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { motion, useReducedMotion } from "framer-motion";
import { MaskIcon } from "../MaskIcon";
import { iconButtonClass, sectionReveal } from "./editionsFormat";
import {
  NFT_101_RETURN_KEY,
  NFT_101_SECTION_ID,
  NFT_GUIDES,
  nftGuideHref,
  type NftGuide,
} from "../../data/nftGuides";
import chevronLeftIcon from "../../../assets/edition-detail/chevron-left.svg";

export function NftGuideCard({
  guide,
  image,
  meta,
  fromMarketplace = false,
}: {
  guide: NftGuide;
  image?: string;
  meta?: string;
  fromMarketplace?: boolean;
}) {
  return (
    <Link
      to={nftGuideHref(guide.slug)}
      state={fromMarketplace ? { from: NFT_101_SECTION_ID } : undefined}
      className="group flex w-full flex-col rounded-lg outline-none"
    >
      <span className="relative block aspect-[300/169] w-full overflow-hidden rounded-lg bg-(--ed-raised) shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline outline-1 -outline-offset-1 outline-(--ed-image-outline) group-focus-visible:ring-2 group-focus-visible:ring-(--ed-primary)">
        {image && (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        )}
      </span>
      <span
        className={`text-sm font-medium leading-[21px] tracking-[-0.15px] text-(--ed-text) ${meta ? "pt-3" : "py-3"}`}
      >
        {guide.title}
      </span>
      {meta && <span className="pt-0.5 font-mono text-xs uppercase text-(--ed-muted)">{meta}</span>}
    </Link>
  );
}

// Figma "NFT 101" (node 18:2106). Each card opens a full guide at /editions/learn/:slug.
export function Nft101Section({ coverImage }: { coverImage?: string }) {
  const reduceMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [edges, setEdges] = useState({ start: true, end: true });
  const location = useLocation();

  // Coming back from a guide (or following /editions#nft-101) lands on this section
  useEffect(() => {
    let shouldReturn = location.hash === `#${NFT_101_SECTION_ID}`;
    try {
      if (sessionStorage.getItem(NFT_101_RETURN_KEY)) shouldReturn = true;
    } catch {
      // Storage unavailable: fall back to the hash only
    }
    if (!shouldReturn) return;
    // Runs after RootLayout's scroll-to-top on navigation. The flag is cleared only once the
    // scroll happens, so a cancelled first run (e.g. StrictMode) doesn't lose it.
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(NFT_101_RETURN_KEY);
      } catch {
        // ignore
      }
      document.getElementById(NFT_101_SECTION_ID)?.scrollIntoView({ block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 1,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [updateEdges]);

  // Cards that aren't fully in view fade back, as in the design
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibility((prev) => {
          const next = { ...prev };
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.guideId;
            if (id) next[id] = entry.intersectionRatio >= 0.95;
          }
          return next;
        });
      },
      { root, threshold: [0, 0.95, 1] },
    );
    root.querySelectorAll<HTMLElement>("[data-guide-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.max(el.clientWidth * 0.8, 316),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const scrollable = !(edges.start && edges.end);

  return (
    <motion.section
      {...sectionReveal}
      id={NFT_101_SECTION_ID}
      aria-labelledby="nft-101-heading"
      className="flex scroll-mt-20 flex-col gap-4"
    >
      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id="nft-101-heading"
            className="text-xl font-medium leading-[25px] tracking-[-0.3px] text-(--ed-text)"
          >
            NFT 101
          </h2>
          <p className="text-sm leading-[21px] tracking-[-0.15px] text-(--ed-muted)">
            Learn about NFTs, Web3, and more.
          </p>
        </div>
        {scrollable && (
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={edges.start}
              aria-label="Previous guides"
              className={`${iconButtonClass} disabled:pointer-events-none disabled:opacity-40`}
            >
              <MaskIcon src={chevronLeftIcon} className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={edges.end}
              aria-label="Next guides"
              className={`${iconButtonClass} disabled:pointer-events-none disabled:opacity-40`}
            >
              <MaskIcon src={chevronLeftIcon} className="size-4 rotate-180" />
            </button>
          </div>
        )}
      </div>

      <ul
        ref={scrollerRef}
        onScroll={updateEdges}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {NFT_GUIDES.map((guide) => {
          const faded = visibility[guide.slug] === false;
          return (
            <li
              key={guide.slug}
              data-guide-id={guide.slug}
              className={`w-[min(300px,calc(100vw-4rem))] shrink-0 snap-start transition-opacity duration-300 ${
                faded ? "opacity-20 hover:opacity-50" : "opacity-100"
              }`}
            >
              <NftGuideCard guide={guide} image={guide.image ?? coverImage} fromMarketplace />
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
