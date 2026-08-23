import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, X } from "lucide-react";
import {
  fetchCollections,
  fetchCollectionPhotos,
  createCollection,
  deleteCollection,
  addPhotoToCollection,
  removePhotoFromCollection,
  getOptimizedImageUrl,
  type Collection,
  type Photo,
} from "../../data/db";

const label = "font-mono text-[9px] tracking-wider text-[#758078] uppercase";
const field =
  "mt-1.5 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]";
const card = "rounded-2xl border border-[#ececec]/80 bg-white p-6 ns-shadow-sm";

/** Turns a title into a stable, readable id for the collection. */
function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `collection-${Date.now().toString(36)}`
  );
}

/**
 * Curating marketplace collections. Contributors see the collections their work
 * appears in under Featured In, so this is what puts it there.
 */
export function CollectionsPanel({ assets }: { assets: Photo[] }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [contents, setContents] = useState<Record<string, string[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = () => {
    fetchCollections().then(async (rows) => {
      setCollections(rows);
      const map: Record<string, string[]> = {};
      for (const row of rows) {
        map[row.id] = await fetchCollectionPhotos(row.id);
      }
      setContents(map);
    });
  };

  useEffect(load, []);

  const published = useMemo(
    () => assets.filter((a) => (a.status || "published") === "published"),
    [assets],
  );

  const candidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return published.slice(0, 24);
    return published
      .filter(
        (p) =>
          p.title.toLowerCase().includes(query) || p.photographer.toLowerCase().includes(query),
      )
      .slice(0, 24);
  }, [published, search]);

  const create = async () => {
    if (!title.trim()) {
      toast.error("Give the collection a title");
      return;
    }

    setIsSaving(true);
    const ok = await createCollection({
      id: slugify(title),
      title: title.trim(),
      description: description.trim() || undefined,
    });
    setIsSaving(false);

    if (!ok) {
      toast.error("Could not create the collection");
      return;
    }

    toast.success(`"${title.trim()}" created`);
    setTitle("");
    setDescription("");
    load();
  };

  const add = async (collectionId: string, photoId: string) => {
    const ok = await addPhotoToCollection(collectionId, photoId);
    if (!ok) {
      toast.error("Could not add the photograph");
      return;
    }
    setContents((prev) => ({ ...prev, [collectionId]: [...(prev[collectionId] || []), photoId] }));
    toast.success("Added to the collection");
  };

  const remove = async (collectionId: string, photoId: string) => {
    const ok = await removePhotoFromCollection(collectionId, photoId);
    if (!ok) {
      toast.error("Could not remove the photograph");
      return;
    }
    setContents((prev) => ({
      ...prev,
      [collectionId]: (prev[collectionId] || []).filter((id) => id !== photoId),
    }));
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <h3 className="font-serif text-lg text-[#18211f]">Create a collection</h3>
        <p className="mt-1 text-sm text-[#6b716d]">
          Contributors see the collections their work appears in, so this is what gives a photograph
          that extra visibility.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Seoul After Dark"
              className={field}
            />
          </label>
          <label className="block">
            <span className={label}>Description</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A documentary series exploring Seoul after sunset."
              className={field}
            />
          </label>
        </div>

        <button
          onClick={create}
          disabled={isSaving}
          className="mt-5 rounded-full bg-[#1e4a3f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:opacity-40"
        >
          {isSaving ? "Creating…" : "Create collection"}
        </button>
      </div>

      {collections.length === 0 ? (
        <div className={card}>
          <p className="text-sm text-[#6b716d]">No collections yet.</p>
        </div>
      ) : (
        collections.map((collection) => {
          const photoIds = contents[collection.id] || [];
          const isOpen = openId === collection.id;

          return (
            <div key={collection.id} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-serif text-lg text-[#18211f]">{collection.title}</h3>
                  <p className="mt-0.5 text-sm text-[#59645f]">
                    {photoIds.length} photograph{photoIds.length === 1 ? "" : "s"}
                    {collection.description && ` · ${collection.description}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setOpenId(isOpen ? null : collection.id)}
                    aria-expanded={isOpen}
                    className="rounded-full border border-[#ececec] px-4 py-1.5 text-xs font-semibold text-[#1e4a3f] transition hover:border-[#1e4a3f]"
                  >
                    {isOpen ? "Done" : "Curate"}
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Delete "${collection.title}"? The photographs themselves are not affected.`,
                        )
                      )
                        return;
                      const ok = await deleteCollection(collection.id);
                      if (!ok) {
                        toast.error("Could not delete the collection");
                        return;
                      }
                      toast.success("Collection deleted");
                      load();
                    }}
                    aria-label={`Delete ${collection.title}`}
                    className="grid size-8 place-items-center rounded-full text-[#d4183d] transition hover:bg-[#fcf1f3]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              {photoIds.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {photoIds.map((photoId) => {
                    const photo = assets.find((a) => a.id === photoId);
                    return (
                      <div key={photoId} className="group relative">
                        <img
                          src={photo ? getOptimizedImageUrl(photo.image, 120) : ""}
                          alt={photo?.title || ""}
                          loading="lazy"
                          className="size-16 rounded-lg object-cover"
                        />
                        <button
                          onClick={() => remove(collection.id, photoId)}
                          aria-label={`Remove ${photo?.title || photoId}`}
                          className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-white text-[#d4183d] shadow transition hover:bg-[#fcf1f3]"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {isOpen && (
                <div className="mt-5 border-t border-[#ececec] pt-5">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search photographs by title or photographer"
                    className={field}
                  />
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {candidates.map((photo) => {
                      const already = photoIds.includes(photo.id);
                      return (
                        <button
                          key={photo.id}
                          onClick={() => !already && add(collection.id, photo.id)}
                          disabled={already}
                          title={already ? "Already in this collection" : `Add ${photo.title}`}
                          className={`relative overflow-hidden rounded-lg transition ${
                            already ? "opacity-35" : "hover:ring-2 hover:ring-[#1e4a3f]"
                          }`}
                        >
                          <img
                            src={getOptimizedImageUrl(photo.image, 160)}
                            alt={photo.title}
                            loading="lazy"
                            className="aspect-square w-full object-cover"
                          />
                          {!already && (
                            <span className="absolute right-1 bottom-1 grid size-5 place-items-center rounded-full bg-white/90 text-[#1e4a3f]">
                              <Plus className="size-3" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
