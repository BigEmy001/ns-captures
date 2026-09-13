import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { PhotoCard } from "../components/PhotoCard";
import { fetchCollections, fetchPhotosPaginated } from "../data/db";
import type { Collection } from "../data/photos";
import type { Photo } from "../data/photos";

export function CollectionDetail() {
  const { id } = useParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const collections = await fetchCollections();
        const found = collections.find((item) => item.id === id) || null;

        if (!active) return;
        setCollection(found);

        if (!found) {
          setPhotos([]);
          return;
        }

        const { photos: items } = await fetchPhotosPaginated(
          {
            query: "",
            category: "All",
            licenses: [],
            orientation: null,
            maxPrice: 10000,
            sort: "popular",
            collectionId: found.id,
          },
          0,
          24,
        );
        if (active) setPhotos(items);
      } catch {
        if (active) {
          setCollection(null);
          setPhotos([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  const cover = useMemo(() => collection?.cover ?? [], [collection]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-32 rounded bg-[#ececec]" />
          <div className="h-12 w-2/3 rounded bg-[#ececec]" />
          <div className="h-6 w-full max-w-xl rounded bg-[#f0f0f0]" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-72 rounded-xl bg-[#f0f0f0] md:col-span-2" />
            <div className="grid gap-4">
              <div className="h-34 rounded-xl bg-[#f0f0f0]" />
              <div className="h-34 rounded-xl bg-[#f0f0f0]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-20 text-center sm:px-8 lg:px-12">
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#6b716d] uppercase">Collection unavailable</p>
        <h1 className="mt-4 font-serif text-5xl leading-none sm:text-6xl">Not in the archive.</h1>
        <p className="mx-auto mt-4 max-w-md text-[#59645f]">
          This collection is no longer available, or it was never published to the library.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/collections" className="inline-flex items-center gap-2 rounded-full bg-[#1e4a3f] px-5 py-3 text-sm font-semibold text-white">
            <ArrowLeft className="size-4" />
            Back to collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link to="/collections" className="inline-flex items-center gap-2 text-sm font-medium text-[#1e4a3f] hover:underline">
          <ArrowLeft className="size-4" />
          Collections
        </Link>
        <Link
          to={`/search?collectionId=${collection.id}&collectionName=${encodeURIComponent(collection.title)}`}
          className="inline-flex items-center gap-2 rounded-full border border-[#d9d4ce] bg-white/70 px-4 py-2 text-sm font-medium text-[#1f1d1a] hover:bg-white"
        >
          Browse full collection
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#5f655e] uppercase">Curated collection</p>
          <h1 className="mt-4 font-serif text-5xl leading-none tracking-[-0.04em] sm:text-6xl">
            {collection.title}
          </h1>
        </div>

        <div className="rounded-[26px] border border-[#e6e1d8] bg-[#faf7f2] p-5 shadow-[0_15px_50px_rgba(0,0,0,0.03)]">
          <p className="text-sm leading-7 text-[#4c514d]">{collection.description}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-mono uppercase tracking-[0.14em] text-[#606c67]">
            <span>{collection.count.toLocaleString()} images</span>
            <span>Curated by {collection.curator}</span>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-2 md:grid-cols-3">
        {cover[0] && (
          <div className="overflow-hidden rounded-[22px] border border-[#e6e1d8] bg-[#f2efe9] md:col-span-2">
            <img src={cover[0]} alt={collection.title} className="h-full min-h-[340px] w-full object-cover" />
          </div>
        )}
        <div className="grid gap-2">
          {cover.slice(1,3).map((image, index) => (
            <div key={`${collection.id}-${index}`} className="overflow-hidden rounded-[18px] border border-[#e6e1d8] bg-[#f2efe9]">
              <img src={image} alt={`${collection.title} ${index + 1}`} className="h-[170px] w-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#5f655e] uppercase">In this collection</p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl">Selected imagery</h2>
          </div>
          <Link
            to={`/search?collectionId=${collection.id}&collectionName=${encodeURIComponent(collection.title)}`}
            className="hidden text-sm font-semibold text-[#1e4a3f] hover:underline sm:block"
          >
            Open filtered search
          </Link>
        </div>

        {photos.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#d9d4ce] bg-[#faf7f2] px-6 py-16 text-center">
            <p className="font-serif text-2xl">No images in this collection yet.</p>
            <p className="mt-2 text-sm text-[#59645f]">
              This set is being assembled; check back soon for new work.
            </p>
          </div>
        ) : (
          <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 640: 2, 1024: 3 }}>
            <Masonry gutter="20px">
              {photos.map((photo) => (
                <PhotoCard key={photo.id} item={photo} />
              ))}
            </Masonry>
          </ResponsiveMasonry>
        )}
      </div>
    </div>
  );
}
