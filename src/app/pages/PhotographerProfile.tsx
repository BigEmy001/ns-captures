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
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { Button, Eyebrow } from "../components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { useRequest } from "../components/RequestModal";
import {
  fetchPhotographer,
  fetchPhotosByPhotographer,
  type Photographer,
  type Photo,
  getOptimizedImageUrl,
} from "../data/db";
import { NotFound } from "./NotFound";
import { useAuth } from "../context/AuthContext";
import {
  toggleFollow,
  hasUserFollowedPhotographer,
  fetchFollowerCount,
  fetchFollowers,
  fetchFollowing,
  type FollowerInfo,
} from "../data/db";

type Tab = "highlights" | "gallery" | "collections" | "statistics" | "followers" | "following";

export function PhotographerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [shots, setShots] = useState<Photo[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followers, setFollowers] = useState<FollowerInfo[]>([]);
  const [followingList, setFollowingList] = useState<FollowerInfo[]>([]);

  useEffect(() => {
    const load = async () => {
      const p = await fetchPhotographer(id ?? "");
      setPhotographer(p);
      if (p) {
        const photos = await fetchPhotosByPhotographer(id ?? "");
        setShots(photos);
        const count = await fetchFollowerCount(id ?? "");
        if (count > 0) setFollowerCount(count);
        fetchFollowers(id ?? "")
          .then(setFollowers)
          .catch(() => {
            toast.error("An error occurred");
            return null;
          });
        fetchFollowing(id ?? "")
          .then(setFollowingList)
          .catch(() => {
            toast.error("An error occurred");
            return null;
          });
      }
    };
    load();
  }, [id]);
  const [tab, setTab] = useState<Tab>("gallery");
  const [following, setFollowing] = useState(false);
  const [sort, setSort] = useState<"recency" | "popular">("recency");
  const openRequest = useRequest();

  useEffect(() => {
    if (user && id) hasUserFollowedPhotographer(user.id, id).then(setFollowing);
  }, [user, id]);

  if (!photographer) return <NotFound />;

  const totalDownloads = shots.reduce((s, p) => s + p.downloads, 0);
  const totalViews = shots.reduce((s, p) => s + p.views, 0);
  const followingCount = 0;

  const sorted = [...shots].sort((a, b) => (sort === "popular" ? b.downloads - a.downloads : 0));

  const tabs: { id: Tab; label: string; count?: number; badge?: string }[] = [
    { id: "gallery", label: "Gallery", count: shots.length },
    { id: "statistics", label: "Statistics", badge: "NEW" },
    { id: "followers", label: "Followers", count: followerCount },
    { id: "following", label: "Following", count: followingCount },
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
            <p className="mt-3 max-w-md text-sm leading-6 text-[#59645f]">{photographer.bio}</p>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-[#6b716d]">
              <MapPin className="size-4" /> {photographer.location}
            </p>
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
          <button
            onClick={openRequest}
            aria-label="Message"
            className="grid size-10 place-items-center border border-[#ececec] text-[#4a534e] transition hover:border-[#1e4a3f]"
          >
            <Mail className="size-4" />
          </button>
          <Button
            variant={following ? "outline" : "solid"}
            onClick={async () => {
              if (!user) {
                toast.error("Sign in to follow");
                return;
              }
              const nowFollowing = await toggleFollow(user.id, photographer.id);
              setFollowing(nowFollowing);
              setFollowerCount((c) => (nowFollowing ? c + 1 : Math.max(c - 1, 0)));
              toast(nowFollowing ? `Following ${photographer.name}` : "Unfollowed");
            }}
          >
            {following ? "Following" : "Follow"}
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="mt-8 grid grid-cols-2 divide-[#ececec] border border-[#ececec] bg-[#ffffff] ns-shadow-sm sm:grid-cols-3 lg:grid-cols-4 lg:divide-x">
        <StatCell value={compact(totalViews)} label="Total views" />
        <StatCell value={compact(totalDownloads)} label="Downloads" />
        <StatCell value={photographer.followers} label="Followers" muted />
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

        {(tab === "followers" || tab === "following") && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(tab === "followers" ? followers : followingList).map((f) => (
              <div
                key={f.followerId + f.followingId}
                className="flex items-center gap-3 border border-[#ececec] bg-[#ffffff] ns-shadow-sm p-4"
              >
                <Avatar className="size-11">
                  <AvatarImage src={f.avatar || ""} className="object-cover" />
                  <AvatarFallback className="bg-[#e7ebe2] text-[#1e4a3f] font-mono text-xs">
                    {f.name?.charAt(0).toUpperCase() || "NS"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{f.name}</p>
                </div>
                <button
                  onClick={() => toast(tab === "following" ? "Unfollowed" : `Following ${f.name}`)}
                  className="text-xs font-semibold text-[#1e4a3f]"
                >
                  {tab === "following" ? "Following" : "Follow"}
                </button>
              </div>
            ))}
            {tab === "followers" && (
              <p key="more" className="text-sm text-[#8a8f89] col-span-full">
                …and {followerCount} more.
              </p>
            )}
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
