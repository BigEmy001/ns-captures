import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import {
  Heart,
  Share2,
  Bookmark,
  Check,
  Eye,
  Download,
  MapPin,
  Camera,
  Aperture,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PhotoCard } from "../components/PhotoCard";
import { Eyebrow, Button, Badge } from "../components/ui";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import {
  fetchPhoto,
  fetchPhotographer,
  type Photo,
  type Photographer,
  getOptimizedImageUrl,
  incrementPhotoViews,
} from "../data/db";
import { getDisplayViews, getDisplayLikes, getDisplayDownloads } from "../data/photos";
import { NotFound } from "./NotFound";
import { addToCart } from "../data/cart";
import { useAuth } from "../context/AuthContext";
import { toggleLike, toggleSave, hasUserLikedPhoto, hasUserSavedPhoto } from "../data/db";
import { getStoredEditions, isEditionsPublic, type DigitalEdition } from "../data/editions";
import { MintEditionModal } from "../components/MintEditionModal";

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
  const { user } = useAuth();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("COMMERCIAL");
  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [editions, setEditions] = useState<DigitalEdition[]>(() => getStoredEditions());

  useEffect(() => {
    if (!id) return;
    fetchPhoto(id)
      .then((p) => {
        setPhoto(p || null);
        setLoading(false);
        if (p?.photographerId) {
          fetchPhotographer(p.photographerId).then(setPhotographer);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (user && id) {
      hasUserSavedPhoto(user.id, id).then(setSaved);
      hasUserLikedPhoto(user.id, id).then(setLiked);
    }
  }, [user, id]);

  // Record the visit. Fire and forget — a counter must never block the page or
  // surface an error to the reader.
  useEffect(() => {
    if (!id) return;
    incrementPhotoViews(id);
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

  const options: LicenseOption[] = [
    {
      id: "COMMERCIAL",
      price: Math.max(photo.price, 0),
      usage: "Ads, packaging, web & social for a business.",
      restrictions: "No resale as stock.",
      duration: "Perpetual",
      coverage: "Worldwide",
    },
    {
      id: "EDITORIAL",
      price: Math.max(Math.round(photo.price * 0.7), 0),
      usage: "News, blogs, education & non-commercial.",
      restrictions: "No commercial promotion.",
      duration: "Perpetual",
      coverage: "Worldwide",
    },
    {
      id: "EXTENDED",
      price: Math.max(Math.round(photo.price * 2.4), 0),
      usage: "Merchandise for resale, unlimited prints.",
      restrictions: "None.",
      duration: "Perpetual",
      coverage: "Worldwide",
    },
    {
      id: "EXCLUSIVE",
      price: Math.max(Math.round(photo.price * 6), 0),
      usage: "Sole rights — removed from the library.",
      restrictions: "Buyer owns exclusive use.",
      duration: "Perpetual",
      coverage: "Worldwide",
    },
  ];

  const current = options.find((o) => o.id === selected)!;
  const related: Photo[] = [];
  const categoryHref = `/search?cat=${encodeURIComponent(photo.category)}`;
  const photographerHref = `/photographer/${photo.photographerId}`;

  const imageSrc = getOptimizedImageUrl(photo.image || "", 1200);

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] px-4 py-8 sm:px-8 lg:px-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          to="/search"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#1e4a3f] hover:underline"
        >
          <ArrowRight className="size-4 rotate-180" />
          Back to library
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!user) {
                toast.error("Sign in to save");
                return;
              }
              const nextSaved = await toggleSave(user.id, photo.id);
              setSaved(nextSaved);
              toast(nextSaved ? "Saved to collection" : "Removed from collection");
            }}
            className="flex items-center gap-2 rounded-full border border-[#e7e1d9] bg-[#faf7f2] px-3 py-2 text-sm text-[#1c1b1a] transition hover:border-[#1e4a3f]"
          >
            {saved ? <Check className="size-4 text-[#1e4a3f]" /> : <Bookmark className="size-4" />}
            Save
          </button>
          <button
            onClick={() => toast("Link copied")}
            className="flex items-center gap-2 rounded-full border border-[#e7e1d9] bg-[#faf7f2] px-3 py-2 text-sm text-[#1c1b1a] transition hover:border-[#1e4a3f]"
          >
            <Share2 className="size-4" /> Share
          </button>
          <button
            onClick={async () => {
              if (!user) {
                toast.error("Sign in to like");
                return;
              }
              const nextLiked = await toggleLike(user.id, photo.id);
              setLiked(nextLiked);
              toast(nextLiked ? "Liked" : "Unliked");
            }}
            className={`grid place-items-center rounded-full border px-3 py-2 transition ${
              liked
                ? "border-[#1e4a3f] bg-[#e9f0ee] text-[#1e4a3f]"
                : "border-[#e7e1d9] bg-[#faf7f2] text-[#1c1b1a]"
            }`}
          >
            <Heart className="size-4" fill={liked ? "#1e4a3f" : "none"} />
          </button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.5fr_0.85fr] xl:items-start">
        <div>
          <div className="overflow-hidden rounded-[28px] border border-[#e7e1d9] bg-[#f5f1ea] shadow-[0_18px_60px_rgba(17,15,13,0.04)]">
            <img src={imageSrc} alt={photo.title} className="w-full max-h-[82vh] object-cover" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-[#ece4dc] pt-5 text-sm text-[#5d625e]">
            <span className="flex items-center gap-2">
              <Eye className="size-4" /> {getDisplayViews(photo).toLocaleString()} views
            </span>
            <span className="flex items-center gap-2">
              <Download className="size-4" /> {getDisplayDownloads(photo).toLocaleString()}{" "}
              downloads
            </span>
            <span className="flex items-center gap-2">
              <Heart className="size-4" /> {getDisplayLikes(photo).toLocaleString()} likes
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="size-4" /> {photo.location}
            </span>
          </div>
        </div>

        <aside className="rounded-[28px] border border-[#e7e1d9] bg-[#faf7f2] p-5 shadow-[0_18px_60px_rgba(17,15,13,0.03)] sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5f655e]">
            {photo.category} / Archive
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-none tracking-[-0.04em] text-[#171513] sm:text-5xl">
            {photo.title}
          </h1>
          <p className="mt-4 text-sm text-[#5d625e]">
            by{" "}
            <Link to={photographerHref} className="font-semibold text-[#1e4a3f] hover:underline">
              {photo.photographer}
            </Link>
          </p>

          <div className="mt-6 rounded-2xl border border-[#e7e1d9] bg-white p-4">
            <div className="flex items-center justify-between gap-3 border-b border-[#efe9e3] pb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#666e68]">
                License
              </span>
              <span className="text-lg font-semibold text-[#171513]">
                £{current.price.toLocaleString()}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelected(option.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    selected === option.id
                      ? "border-[#1e4a3f] bg-[#edf5f2]"
                      : "border-[#e7e1d9] bg-[#faf7f2] hover:border-[#c8bfb3]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-[#171513]">{option.id}</span>
                    <span className="font-mono text-xs text-[#5c605d]">
                      £{option.price.toLocaleString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-5">
              <button
                onClick={() => {
                  addToCart({
                    id: `${photo.id}-${current.id}`,
                    photoId: photo.id,
                    title: photo.title,
                    price: current.price,
                    image: photo.image,
                    photographer: photo.photographer,
                    license: current.id,
                  });
                  toast.success(`${current.id} license added to cart`);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1e4a3f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#183a33]"
              >
                Add to cart
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-2 text-sm text-[#4c514d]">
            <p>
              <span className="font-medium text-[#171513]">Usage:</span> {current.usage}
            </p>
            <p>
              <span className="font-medium text-[#171513]">Restrictions:</span>{" "}
              {current.restrictions}
            </p>
            <p>
              <span className="font-medium text-[#171513]">Duration:</span> {current.duration}
            </p>
            <p>
              <span className="font-medium text-[#171513]">Coverage:</span> {current.coverage}
            </p>
          </div>

          {photographer && (
            <div className="mt-6 rounded-2xl border border-[#e7e1d9] bg-[#f4f0ea] p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#dfeae6] text-xs font-semibold text-[#1e4a3f]">
                  {photographer.avatar ? (
                    <img
                      src={getOptimizedImageUrl(photographer.avatar, 80)}
                      alt={photographer.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    photographer.name?.charAt(0).toUpperCase() || "N"
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#171513]">
                    {photographer.name || photo.photographer}
                  </p>
                  <p className="text-xs text-[#5d625e]">{photo.location}</p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Camera, label: "Camera body", value: photo.camera },
          { icon: Aperture, label: "Lens", value: photo.lens },
          { icon: null, label: "ISO", value: photo.iso ? String(photo.iso) : "" },
          { icon: null, label: "Aperture", value: photo.aperture },
          { icon: null, label: "Shutter", value: photo.shutterSpeed },
          { icon: null, label: "Focal length", value: photo.focalLength },
          { icon: null, label: "Rights", value: photo.license },
        ]
          .filter((entry) => entry.value)
          .map((entry) => (
            <div key={entry.label} className="rounded-2xl border border-[#e7e1d9] bg-[#faf7f2] p-4">
              <div className="mb-2 flex items-center gap-2 text-[#58615d]">
                {entry.icon && <entry.icon className="size-4" />}
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                  {entry.label}
                </span>
              </div>
              <p className="text-sm text-[#171513]">{entry.value}</p>
            </div>
          ))}
      </div>

      <div className="mt-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5f655e]">Keywords</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(photo.keywords || []).map((k) => (
            <Link
              key={k}
              to={`/search?q=${encodeURIComponent(k)}`}
              className="rounded-full border border-[#e7e1d9] bg-[#faf7f2] px-3 py-1.5 text-xs text-[#4a534e] hover:border-[#1e4a3f]"
            >
              {k}
            </Link>
          ))}
        </div>
      </div>

      {(() => {
        const matchingEdition = editions.find(
          (e) => e.photoId === photo.id || e.title.toLowerCase() === photo.title.toLowerCase(),
        );
        const isOwner =
          user && (photo.photographerId === user.id || (user as any).slug === photo.photographerId);
        const isEditionsVisible = isEditionsPublic() || user?.role === "Admin";

        if (matchingEdition && isEditionsVisible) {
          return (
            <div className="mt-10 flex flex-col gap-5 rounded-xl border border-[#26272d] bg-[#101011] p-5 text-white sm:flex-row sm:items-center sm:p-6">
              <img
                src={matchingEdition.image}
                alt=""
                className="size-20 shrink-0 rounded-lg object-cover outline outline-1 -outline-offset-1 outline-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-mono text-xs uppercase leading-[15px] text-[#acadae]">
                  <Sparkles className="size-3.5" />
                  Digital edition ·{" "}
                  {matchingEdition.tier === "genesis_1_of_1"
                    ? "Genesis 1 of 1"
                    : `${matchingEdition.availableEditions}/${matchingEdition.totalEditions} left`}
                </p>
                <h2 className="mt-2 truncate text-xl font-medium text-white">
                  {matchingEdition.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#acadae]">
                  Numbered edition with a cryptographic certificate of authenticity.
                </p>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                <span className="font-mono text-lg font-medium text-white">
                  {matchingEdition.priceEth} ETH
                </span>
                <Link
                  to={`/editions/${matchingEdition.id}`}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0786ff] px-5 text-sm font-medium text-white transition-colors hover:bg-[#0070e0]"
                >
                  View edition
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          );
        }

        if (isOwner) {
          return (
            <div className="mt-10 rounded-xl border border-[#26272d] bg-[#101011] p-5 text-white sm:p-6">
              <p className="flex items-center gap-1.5 font-mono text-xs uppercase leading-[15px] text-[#acadae]">
                <Sparkles className="size-3.5" />
                Fine-art digital edition
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#acadae]">
                Certify this master as a limited digital edition on the NS CAPTURES platform.
              </p>
              <button
                onClick={() => setShowMintModal(true)}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-[#0786ff] px-5 text-sm font-medium text-white transition-colors hover:bg-[#0070e0]"
              >
                <ShieldCheck className="size-4" />
                Certify as digital edition
              </button>
            </div>
          );
        }

        return null;
      })()}

      {showMintModal && (
        <MintEditionModal
          photo={photo}
          onClose={() => setShowMintModal(false)}
          onSuccess={() => {
            setEditions(getStoredEditions());
          }}
        />
      )}
    </div>
  );
}
