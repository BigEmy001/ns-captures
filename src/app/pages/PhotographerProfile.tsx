import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import {
  BadgeCheck,
  MapPin,
  Share2,
  Mail,
  ChevronDown,
  Camera,
  Download,
  Bookmark,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { Eyebrow } from "../components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  fetchPhotographer,
  fetchPhotosByPhotographer,
  fetchContributorPublicFields,
  type Photographer,
  type Photo,
  getOptimizedImageUrl,
  fetchFollowerCount,
  fetchFollowers,
  toggleFollow,
  hasUserFollowedPhotographer,
  type FollowerInfo,
} from "../data/db";
import { contributorLevelLabel } from "../data/contributor";
import { NotFound } from "./NotFound";
import { getDisplayViews, getDisplayDownloads } from "../data/photos";

type Tab = "highlights" | "gallery" | "collections" | "statistics";

export function PhotographerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followers, setFollowers] = useState<FollowerInfo[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [shots, setShots] = useState<Photo[]>([]);

  useEffect(() => {
    const load = async () => {
      const p = await fetchPhotographer(id ?? "");
      if (p) {
        // Recognition and specialties live on the contributor's profile.
        const extra = await fetchContributorPublicFields([id ?? ""]);
        setPhotographer({ ...p, ...(extra[id ?? ""] || {}) });
        const photos = await fetchPhotosByPhotographer(id ?? "");
        setShots(photos);
        // Neither of these is a reason to break the page if it fails.
        fetchFollowerCount(id ?? "")
          .then(setFollowerCount)
          .catch(() => {});
        fetchFollowers(id ?? "", 24)
          .then(setFollowers)
          .catch(() => {});
        if (user) {
          hasUserFollowedPhotographer(user.id, id ?? "")
            .then(setIsFollowing)
            .catch(() => {});
        }
      } else {
        setPhotographer(p);
      }
    };
    load();
  }, [id, user]);
  const [tab, setTab] = useState<Tab>("gallery");
  const [sort, setSort] = useState<"recency" | "popular">("recency");

  if (!photographer) {
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12">
        <div className="flex items-center gap-4">
          <div className="size-20 sm:size-24 rounded-full bg-[#e7ebe2] animate-pulse" />
          <div className="space-y-3">
            <div className="h-8 w-48 bg-[#e7ebe2] rounded animate-pulse" />
            <div className="h-4 w-72 bg-[#e7ebe2] rounded animate-pulse" />
            <div className="h-4 w-36 bg-[#e7ebe2] rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const totalDownloads = shots.reduce((s, p) => s + getDisplayDownloads(p), 0);
  const totalViews = shots.reduce((s, p) => s + getDisplayViews(p), 0);

  const sorted = [...shots].sort((a, b) =>
    sort === "popular" ? getDisplayDownloads(b) - getDisplayDownloads(a) : 0,
  );

  const tabs: { id: Tab; label: string; count?: number; badge?: string }[] = [
    { id: "gallery", label: "Gallery", count: shots.length },
    { id: "statistics", label: "Statistics", badge: "NEW" },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-5">
          <Avatar className="size-20 shrink-0 sm:size-24">
            <AvatarImage
              src={photographer.avatar ? getOptimizedImageUrl(photographer.avatar, 200) : ""}
              alt={photographer.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-[#1e4a3f] text-white font-serif text-2xl sm:text-3xl">
              {photographer.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "NS"}
            </AvatarFallback>
          </Avatar>
          <div className="pt-1">
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-3xl leading-none sm:text-4xl">{photographer.name}</h1>
              {photographer.verified && <BadgeCheck className="size-6 text-[#1e4a3f]" />}
            </div>
            <p className="mt-1.5 font-mono text-[10px] tracking-[0.14em] text-[#49685d] uppercase">
              {contributorLevelLabel(photographer.contributorLevel)}
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#59645f]">{photographer.bio}</p>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-[#6b716d]">
              <MapPin className="size-4" /> {photographer.location}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {followerCount !== null && followerCount > 0 && (
                <button
                  onClick={() => setShowFollowers((v) => !v)}
                  aria-expanded={showFollowers}
                  className="text-sm text-[#59645f] hover:text-[#1e4a3f]"
                >
                  <span className="font-serif text-lg text-[#18211f]">
                    {followerCount.toLocaleString()}
                  </span>{" "}
                  {followerCount === 1 ? "follower" : "followers"}
                </button>
              )}
              {user && user.slug !== id && (
                <button
                  onClick={async () => {
                    setFollowBusy(true);
                    const now = await toggleFollow(user.id, id ?? "");
                    setFollowBusy(false);
                    setIsFollowing(now);
                    setFollowerCount((c) => (c ?? 0) + (now ? 1 : -1));
                    toast(now ? `Following ${photographer.name}` : "Unfollowed");
                  }}
                  disabled={followBusy}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                    isFollowing
                      ? "border border-[#ececec] text-[#6b716d] hover:border-[#1e4a3f] hover:text-[#1e4a3f]"
                      : "bg-[#1e4a3f] text-white hover:bg-[#123b31]"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>
            {showFollowers && followers.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-3">
                {followers.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarImage src={f.avatar} alt="" className="object-cover" />
                      <AvatarFallback className="bg-[#e7ebe2] font-mono text-[9px] text-[#1e4a3f]">
                        {f.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-[#59645f]">{f.name}</span>
                  </li>
                ))}
              </ul>
            )}
            {photographer.specialties && photographer.specialties.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {photographer.specialties.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-[#ececec] bg-white px-3 py-1 text-xs text-[#59645f]"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toast("Link copied")}
            aria-label="Share"
            className="grid size-10 place-items-center border border-[#ececec] text-[#4a534e] transition hover:border-[#1e4a3f]"
          >
            <Share2 className="size-4" />
          </button>
          <Link
            to="/contact"
            aria-label="Message"
            className="grid size-10 place-items-center border border-[#ececec] text-[#4a534e] transition hover:border-[#1e4a3f]"
          >
            <Mail className="size-4" />
          </Link>
        </div>
      </div>

      {/* Stat strip */}
      <div className="mt-8 grid grid-cols-2 divide-[#ececec] border border-[#ececec] bg-[#ffffff] ns-shadow-sm sm:grid-cols-3 lg:grid-cols-3 lg:divide-x">
        <StatCell value={compact(totalViews)} label="Total views" />
        <StatCell value={compact(totalDownloads)} label="Downloads" />
        <StatCell value={String(shots.length)} label="Published" muted />
      </div>

      {/* Tabs + filters */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#ececec] pb-3">
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === t.id ? "bg-[#1e4a3f] text-white" : "text-[#4a534e] hover:bg-[#e7ebe2]"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs ${tab === t.id ? "text-white/70" : "text-[#8a8f89]"}`}>
                  {t.count}
                </span>
              )}
              {t.badge && (
                <span className="rounded-full bg-[#dce8df] px-1.5 py-0.5 font-mono text-[8px] tracking-[0.08em] text-[#285746]">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "gallery" && (
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-full border border-[#ececec] bg-white/50 px-3 py-2 text-xs text-[#4a534e]">
              Photos & videos <ChevronDown className="size-3" />
            </button>
            <button
              onClick={() => setSort((s) => (s === "recency" ? "popular" : "recency"))}
              className="flex items-center gap-1.5 rounded-full border border-[#ececec] bg-white/50 px-3 py-2 text-xs text-[#4a534e]"
            >
              {sort === "recency" ? "Recency" : "Popular"} <ChevronDown className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="py-10">
        {tab === "gallery" &&
          (sorted.length > 0 ? (
            <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 640: 2, 1024: 3 }}>
              <Masonry gutter="16px">
                {sorted.map((p) => (
                  <GalleryTile key={p.id} photo={p} name={photographer.name} />
                ))}
              </Masonry>
            </ResponsiveMasonry>
          ) : (
            <Empty text="No published work yet." />
          ))}

        {tab === "highlights" && <Empty text="No highlights pinned yet." />}

        {tab === "collections" && (
          <Empty text="This photographer hasn't shared any public collections." />
        )}

        {tab === "statistics" && (
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "TOTAL VIEWS", value: compact(totalViews) },
              { label: "TOTAL DOWNLOADS", value: compact(totalDownloads) },
              {
                label: "AVG. LICENSE PRICE",
                value: `£${Math.round(shots.reduce((s, p) => s + p.price, 0) / (shots.length || 1))}`,
              },
            ].map((s) => (
              <div key={s.label} className="border border-[#ececec] bg-[#ffffff] ns-shadow-sm p-6">
                <p className="font-mono text-[9px] tracking-[0.1em] text-[#758078]">{s.label}</p>
                <p className="mt-2 font-serif text-4xl">{s.value}</p>
              </div>
            ))}
            <div className="border border-[#ececec] bg-[#ffffff] ns-shadow-sm p-6 sm:col-span-3">
              <Eyebrow>GEAR</Eyebrow>
              <div className="mt-4 flex flex-wrap gap-3">
                {photographer.gear?.map((g) => (
                  <span
                    key={g}
                    className="flex items-center gap-2 border border-[#ececec] px-3 py-2 text-sm"
                  >
                    <Camera className="size-4 text-[#1e4a3f]" /> {g}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCell({ value, label, muted }: { value: string; label: string; muted?: boolean }) {
  return (
    <div className={`border-b border-[#ececec] p-5 sm:border-b-0 ${muted ? "opacity-45" : ""}`}>
      <p className="font-serif text-2xl leading-none">{value}</p>
      <p className="mt-2 text-xs text-[#6b716d]">{label}</p>
    </div>
  );
}

function GalleryTile({ photo, name }: { photo: Photo; name: string }) {
  return (
    <div className="group relative overflow-hidden bg-[#d7d8d2]">
      <Link to={`/photo/${photo.id}`}>
        <img
          src={getOptimizedImageUrl(photo.image, 600)}
          alt={photo.title}
          loading="lazy"
          className="w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 opacity-100 md:opacity-0 transition md:group-hover:opacity-100" />
      </Link>
      <button
        onClick={() => toast("Saved to collection")}
        aria-label="Save"
        className="absolute right-3 top-3 grid size-8 place-items-center bg-white/90 text-[#1e4a3f] opacity-100 md:opacity-0 transition md:group-hover:opacity-100"
      >
        <Bookmark className="size-4" />
      </button>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between opacity-100 md:opacity-0 transition md:group-hover:opacity-100">
        <span className="truncate text-xs font-medium text-white">{name}</span>
        <button
          onClick={(e) => {
            e.preventDefault();
            toast.success("License to download");
          }}
          className="pointer-events-auto flex items-center gap-1.5 bg-white px-3 py-1.5 text-xs font-semibold text-[#1e4a3f]"
        >
          <Download className="size-3.5" /> License
        </button>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-[#ececec] py-24 text-center">
      <p className="font-serif text-2xl">Nothing here yet.</p>
      <p className="mt-2 text-sm text-[#6b716d]">{text}</p>
    </div>
  );
}

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
