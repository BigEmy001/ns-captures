import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { Heart, Share2, Bookmark, Check, Eye, Download, MapPin, Camera, Aperture } from "lucide-react";
import { toast } from "sonner";
import { PhotoCard } from "../components/PhotoCard";
import { Eyebrow, Button, Badge } from "../components/ui";
import { fetchPhoto, type Photo } from "../data/db";
import { getPhoto } from "../data/photos";
import { NotFound } from "./NotFound";
import { addToCart } from "../data/cart";

interface LicenseOption {
  id: string;
  price: number;
  usage: string;
  restrictions: string;
  duration: string;
  coverage: string;
}

export function PhotoDetail() {
  const { id } = useParams();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("COMMERCIAL");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchPhoto(id).then((p) => {
      setPhoto(p || getPhoto(id) || null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 animate-pulse space-y-8 min-h-screen">
        <div className="h-4 bg-gray-200 w-1/4 rounded"></div>
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <div className="aspect-[4/3] bg-gray-200 rounded-2xl"></div>
            <div className="h-8 bg-gray-200 w-2/3 rounded"></div>
            <div className="h-4 bg-gray-200 w-1/3 rounded"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!photo) return <NotFound />;

  const MIN_PRICE = 1000;
  const options: LicenseOption[] = [
    { id: "COMMERCIAL", price: Math.max(photo.price, MIN_PRICE), usage: "Ads, packaging, web & social for a business.", restrictions: "No resale as stock.", duration: "Perpetual", coverage: "Worldwide" },
    { id: "EDITORIAL", price: Math.max(Math.round(photo.price * 0.7), MIN_PRICE), usage: "News, blogs, education & non-commercial.", restrictions: "No commercial promotion.", duration: "Perpetual", coverage: "Worldwide" },
    { id: "EXTENDED", price: Math.max(Math.round(photo.price * 2.4), MIN_PRICE), usage: "Merchandise for resale, unlimited prints.", restrictions: "None.", duration: "Perpetual", coverage: "Worldwide" },
    { id: "EXCLUSIVE", price: Math.max(Math.round(photo.price * 6), MIN_PRICE), usage: "Sole rights — removed from the library.", restrictions: "Buyer owns exclusive use.", duration: "Perpetual", coverage: "Worldwide" },
  ];

  const current = options.find((o) => o.id === selected)!;
  const related = photos.filter((p) => p.id !== photo.id && (p.category === photo.category || p.photographerId === photo.photographerId)).slice(0, 4);
  const categoryHref = `/search?cat=${encodeURIComponent(photo.category)}`;
  const photographerHref = `/photographer/${photo.photographerId}`;

  // Robust image display with URL parsing
  let imageSrc = photo.image || "";
  try {
    if (imageSrc && imageSrc.startsWith("http")) {
      const url = new URL(imageSrc);
      if (url.searchParams.has("w")) {
        url.searchParams.set("w", "1600");
        url.searchParams.set("q", "90");
        imageSrc = url.toString();
      }
    }
  } catch (e) {
    // Ignore invalid URLs
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 min-h-screen">
      <nav className="mb-6 flex items-center gap-2 text-xs text-[#6b716d]">
        <Link to="/search" className="hover:text-[#1e4a3f]">Library</Link>
        <span>/</span>
        <Link to={categoryHref} className="hover:text-[#1e4a3f]">{photo.category}</Link>
        <span>/</span>
        <span className="text-[#18211f] truncate max-w-[200px] inline-block align-bottom">{photo.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        {/* Image + meta */}
        <div>
          <div className="overflow-hidden bg-[#d7d8d2] rounded-2xl shadow-sm">
            <img src={imageSrc} alt={photo.title} className="w-full object-cover max-h-[80vh]" />
          </div>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl leading-snug sm:text-4xl">{photo.title}</h1>
              <p className="mt-2 text-sm text-[#6b716d]">
                by <Link to={photographerHref} className="font-semibold text-[#1e4a3f] hover:underline">{photo.photographer}</Link>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setSaved((v) => !v); toast(saved ? "Removed from collection" : "Saved to collection"); }} className="flex items-center gap-2 rounded-full border border-[#ececec] bg-white/50 px-3 py-2 text-sm transition hover:border-[#1e4a3f] cursor-pointer">
                {saved ? <Check className="size-4 text-[#1e4a3f]" /> : <Bookmark className="size-4" />} Save
              </button>
              <button onClick={() => toast("Link copied")} className="flex items-center gap-2 rounded-full border border-[#ececec] bg-white/50 px-3 py-2 text-sm transition hover:border-[#1e4a3f] cursor-pointer">
                <Share2 className="size-4" /> Share
              </button>
              <button onClick={() => toast("Liked")} className="grid place-items-center rounded-full border border-[#ececec] bg-white/50 px-3 py-2 transition hover:border-[#1e4a3f] cursor-pointer">
                <Heart className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-6 border-y border-[#ececec] py-4 text-sm text-[#6b716d]">
            <span className="flex items-center gap-2"><Eye className="size-4" /> {photo.views.toLocaleString()} views</span>
            <span className="flex items-center gap-2"><Download className="size-4" /> {photo.downloads.toLocaleString()} downloads</span>
            <span className="flex items-center gap-2"><Heart className="size-4" /> {photo.likes.toLocaleString()} likes</span>
            <span className="flex items-center gap-2"><MapPin className="size-4" /> {photo.location}</span>
          </div>

          {/* EXIF */}
          <div className="mt-8">
            <Eyebrow>TECHNICAL SPECS</Eyebrow>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: Camera, label: "CAMERA BODY", value: photo.camera },
                { icon: Aperture, label: "OPTICS/LENS", value: photo.lens },
                { icon: null, label: "ISO SENSITIVITY", value: String(photo.iso) },
                { icon: null, label: "LICENSING RIGHTS", value: photo.license },
              ].map((e) => (
                <div key={e.label} className="border border-[#ececec] bg-[#ffffff] ns-shadow-sm p-4 rounded-xl">
                  <p className="font-mono text-[9px] tracking-[0.1em] text-[#758078]">{e.label}</p>
                  <p className="mt-1.5 text-sm font-semibold truncate" title={e.value}>{e.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="mt-8">
            <Eyebrow>KEYWORDS</Eyebrow>
            <div className="mt-4 flex flex-wrap gap-2">
              {(photo.keywords || []).map((k) => (
                <Link key={k} to={`/search?q=${k}`} className="rounded-full border border-[#ececec] bg-white/50 px-3 py-1.5 text-xs text-[#4a534e] hover:border-[#1e4a3f]">
                  {k}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky licensing panel */}
        <div>
          <div className="sticky top-24 border border-[#e2e2e2] bg-[#ffffff] ns-shadow p-6 rounded-2xl">
            <Eyebrow>LICENSE THIS IMAGE</Eyebrow>
            <div className="mt-4 space-y-2">
              {options.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelected(o.id)}
                  className={`flex w-full items-center justify-between border px-4 py-3 text-left transition rounded-xl cursor-pointer ${
                    selected === o.id ? "border-[#1e4a3f] bg-[#e7ebe2] ns-shadow-sm" : "border-[#ececec] bg-white hover:border-[#c3c8bf]"
                  }`}
                >
                  <span className="text-sm font-semibold capitalize">{o.id.toLowerCase()}</span>
                  <span className="font-serif text-lg">${o.price}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t border-[#ececec] pt-5 text-sm">
              <Row label="Usage" value={current.usage} />
              <Row label="Restrictions" value={current.restrictions} />
              <Row label="Duration" value={current.duration} />
              <Row label="Coverage" value={current.coverage} />
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-[#ececec] pt-5">
              <span className="text-sm text-[#6b716d]">Total</span>
              <span className="font-serif text-3xl">${current.price}</span>
            </div>
            <Button
              onClick={() => {
                addToCart({
                  id: `${photo.id}-${selected}`,
                  photoId: photo.id,
                  title: photo.title,
                  license: selected,
                  price: current.price,
                  image: photo.image,
                  photographer: photo.photographer,
                });
                toast.success("Added to cart", {
                  description: `${selected} license for "${photo.title}" has been added to your cart.`,
                });
              }}
              className="mt-4 w-full py-3"
            >
              License & download
            </Button>
            <p className="mt-3 text-center text-xs text-[#8a8f89]">Instant download · Royalty-free after purchase</p>

            <Link to={photographerHref} className="mt-6 flex items-center gap-3 border-t border-[#ececec] pt-5 hover:opacity-80">
              <div className="grid size-10 place-items-center rounded-full bg-[#dce8df] text-xs font-semibold text-[#1e4a3f]">{photo.photographer.charAt(0)}</div>
              <div className="text-xs">
                <p className="font-semibold">{photo.photographer}</p>
                <p className="text-[#6b716d]">{photo.location}</p>
              </div>
              <Badge tone="muted">VERIFIED</Badge>
            </Link>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-8 font-serif text-3xl">More like this</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <PhotoCard key={p.id} item={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-24 shrink-0 font-mono text-[10px] tracking-[0.08em] text-[#758078]">{label.toUpperCase()}</span>
      <span className="text-[#4a534e]">{value}</span>
    </div>
  );
}
