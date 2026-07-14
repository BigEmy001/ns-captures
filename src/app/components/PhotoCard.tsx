import { Link } from "react-router";
import { Heart } from "lucide-react";
import { Photo } from "../data/photos";

export function PhotoCard({ item }: { item: Photo }) {
  return (
    <article className="group">
      <Link to={`/photo/${item.id}`} className="block">
        <div className={`relative overflow-hidden bg-[#d7d8d2] ${item.ratio}`}>
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 font-mono text-[9px] tracking-[0.08em] text-[#1e4a3f] opacity-0 transition group-hover:opacity-100">
            {item.license}
          </span>
          <button
            aria-label={`Save ${item.title}`}
            onClick={(e) => e.preventDefault()}
            className="absolute right-3 top-3 grid size-8 translate-y-1 place-items-center bg-white/90 text-[#1e4a3f] opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100"
          >
            <Heart className="size-4" />
          </button>
        </div>
      </Link>
      <div className="flex items-start justify-between gap-4 pt-3">
        <div>
          <Link to={`/photo/${item.id}`} className="font-serif text-lg leading-none hover:underline">
            {item.title}
          </Link>
          <Link to={`/photographer/${item.photographerId}`} className="mt-1.5 block text-xs text-[#6b716d] hover:text-[#1e4a3f]">
            by {item.photographer}
          </Link>
        </div>
        <span className="pt-1 font-mono text-[9px] tracking-[0.1em] text-[#637167]">
          ${item.price}
        </span>
      </div>
    </article>
  );
}
