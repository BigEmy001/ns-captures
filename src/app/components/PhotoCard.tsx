import { Link } from "react-router";
import { Heart, Bookmark, Check } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Photo } from "../data/photos";
import { useAuth } from "../context/AuthContext";
import { toggleSave, hasUserSavedPhoto, getOptimizedImageUrl } from "../data/db";

export function PhotoCard({ item }: { item: Photo }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) hasUserSavedPhoto(user.id, item.id).then(setSaved);
  }, [user, item.id]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sign in to save photos"); return; }
    const nowSaved = await toggleSave(user.id, item.id);
    setSaved(nowSaved);
    toast(nowSaved ? `Saved "${item.title}"` : `Removed "${item.title}" from saved`);
  };

  const photographerHref = `/photographer/${item.photographerId}`;

  return (
    <article className="group">
      <div className={`relative overflow-hidden bg-[#d7d8d2] ${item.ratio}`}>
        <Link to={`/photo/${item.id}`} className="block size-full">
          <img
            src={getOptimizedImageUrl(item.image, 600)}
            alt={item.title}
            loading="lazy"
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-100 md:opacity-0 transition md:group-hover:opacity-100" />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 font-mono text-[9px] tracking-[0.08em] text-[#1e4a3f] opacity-100 md:opacity-0 transition md:group-hover:opacity-100">
            {item.license}
          </span>
        </Link>
        <button
          aria-label={`Save ${item.title}`}
          onClick={handleSave}
          className="absolute right-3 top-3 grid size-8 translate-y-0 md:translate-y-1 place-items-center bg-white/90 text-[#1e4a3f] opacity-100 md:opacity-0 transition md:group-hover:translate-y-0 md:group-hover:opacity-100 cursor-pointer rounded-full"
        >
          {saved ? <Check className="size-4" /> : <Bookmark className="size-4" />}
        </button>
      </div>
      <div className="flex items-start justify-between gap-4 pt-3">
        <div>
          <Link to={`/photo/${item.id}`} className="font-serif text-lg leading-none hover:underline">
            {item.title}
          </Link>
          <Link to={photographerHref} className="mt-1.5 block text-xs text-[#6b716d] hover:text-[#1e4a3f]">
            by {item.photographer}
          </Link>
        </div>
        <span className="pt-1 font-mono text-[9px] tracking-[0.1em] text-[#637167]">
          £{item.price}
        </span>
      </div>
    </article>
  );
}
