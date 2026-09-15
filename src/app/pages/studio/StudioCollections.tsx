import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Eye, PencilLine, Plus, Trash2 } from "lucide-react";
import type { AuthUser } from "../../context/AuthContext";
import {
  deleteEditionCollection,
  editionReviewStatus,
  type DigitalEdition,
  type EditionCollectionMeta,
} from "../../data/editions";
import { EmptyState } from "../../components/editions/editionsUi";
import { iconButtonClass } from "../../components/editions/editionsFormat";
import { StudioSectionHeader } from "../../components/editions/StudioUi";
import {
  chipBaseClass,
  smallPrimaryButton,
  smallSecondaryButton,
  surfaceCardClass,
} from "../../components/editions/studioFormat";
import { StudioCollectionForm } from "./StudioCollectionForm";

type FormState = { mode: "create" } | { mode: "edit"; collection: EditionCollectionMeta } | null;

export function StudioCollections({
  user,
  collections,
  editions,
  creatorAvatar,
  creatorAvatarIsUpload,
}: {
  user: AuthUser;
  collections: EditionCollectionMeta[];
  editions: DigitalEdition[];
  creatorAvatar?: string;
  creatorAvatarIsUpload: boolean;
}) {
  const [form, setForm] = useState<FormState>(null);

  const handleDelete = (collection: EditionCollectionMeta) => {
    const confirmed = window.confirm(
      `Delete “${collection.name}”? Drafts in it will be kept and listed on their own.`,
    );
    if (!confirmed) return;
    const result = deleteEditionCollection(collection.id, user);
    if (!result.success) {
      toast.error(result.error ?? "Couldn't delete the collection.");
      return;
    }
    toast.success("Collection deleted");
  };

  const newButton = (
    <button
      type="button"
      onClick={() => setForm({ mode: "create" })}
      className={smallPrimaryButton}
    >
      <Plus aria-hidden className="size-3.5" />
      New collection
    </button>
  );

  return (
    <section aria-labelledby="studio-collections" className="flex flex-col gap-4">
      <StudioSectionHeader
        id="studio-collections"
        title="Your collections"
        description="Group related editions under one name, logo and banner. Editions can also be listed on their own."
        action={form === null ? newButton : undefined}
      />

      {form && (
        <StudioCollectionForm
          key={form.mode === "edit" ? form.collection.id : "new"}
          user={user}
          collection={form.mode === "edit" ? form.collection : undefined}
          creatorAvatar={creatorAvatar}
          creatorAvatarIsUpload={creatorAvatarIsUpload}
          onCancel={() => setForm(null)}
          onSaved={() => setForm(null)}
        />
      )}

      {collections.length === 0 ? (
        form === null && (
          <EmptyState
            title="No collections yet"
            description="Create one here, or start a collection while you create an edition."
            action={newButton}
          />
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => {
            const members = editions.filter((e) => e.collectionId === collection.id);
            const live = members.filter((e) => editionReviewStatus(e) === "published").length;
            const isPublic = live > 0;
            return (
              <li
                key={collection.id}
                className={`${surfaceCardClass} flex flex-col overflow-hidden`}
              >
                <div className="aspect-[3/1] bg-(--ed-raised)">
                  <img src={collection.bannerImage} alt="" className="size-full object-cover" />
                </div>
                <div className="flex flex-1 flex-col px-4 pb-4">
                  <img
                    src={collection.avatarImage}
                    alt=""
                    className="-mt-7 size-14 rounded-lg object-cover ring-4 ring-(--ed-surface)"
                  />
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate text-base font-medium text-(--ed-text)">
                      {collection.name}
                    </p>
                    <span
                      className={`${chipBaseClass} ${isPublic ? "bg-(--ed-positive)/15 text-(--ed-positive)" : "bg-(--ed-raised) text-(--ed-muted)"}`}
                    >
                      {isPublic ? "Public" : "Not public yet"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-(--ed-muted)">
                    {collection.chain} · {collection.royaltyPercent}% royalty · {members.length}{" "}
                    edition{members.length === 1 ? "" : "s"}
                    {members.length > 0 && ` (${live} live)`}
                  </p>
                  {!isPublic && (
                    <p className="mt-1 text-xs text-(--ed-muted)">
                      Goes public with its first approved edition.
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    <Link
                      to={`/editions/collection/${collection.id}`}
                      className={smallSecondaryButton}
                    >
                      <Eye aria-hidden className="size-3.5" />
                      {isPublic ? "View page" : "Preview"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setForm({ mode: "edit", collection })}
                      className={smallSecondaryButton}
                    >
                      <PencilLine aria-hidden className="size-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(collection)}
                      aria-label={`Delete ${collection.name}`}
                      title="Delete"
                      className={`${iconButtonClass} ml-auto hover:text-(--ed-negative)`}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
