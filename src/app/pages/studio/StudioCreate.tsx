import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ImageUp, UserRound } from "lucide-react";
import type { AuthUser } from "../../context/AuthContext";
import { submissionStatus } from "../../data/contributor";
import { fetchPhotosByPhotographer, getOptimizedImageUrl, type Photo } from "../../data/db";
import { editionReviewStatus, type DigitalEdition } from "../../data/editions";
import { MAX_UPLOAD_MB } from "../../../lib/imageUpload";
import { EmptyState } from "../../components/editions/editionsUi";
import { ReviewChip, StudioSectionHeader, UploadButton } from "../../components/editions/StudioUi";
import {
  mediumPrimaryButton,
  smallPrimaryButton,
  smallSecondaryButton,
  surfaceCardClass,
} from "../../components/editions/studioFormat";
import { titleFromFileName, type MintRequest } from "./studioData";

const PHOTO_PREVIEW_LIMIT = 8;

export function StudioCreate({
  user,
  editions,
  onStart,
}: {
  user: AuthUser;
  editions: DigitalEdition[];
  onStart: (request: MintRequest) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const photographerId = user.slug || user.id;

  // Photo editions are made from photographs already approved in the creator's portfolio
  useEffect(() => {
    let active = true;
    fetchPhotosByPhotographer(photographerId)
      .then((rows) => {
        if (active) setPhotos(rows.filter((photo) => submissionStatus(photo).key === "approved"));
      })
      .catch(() => {
        if (active) setPhotos([]);
      })
      .finally(() => {
        if (active) setLoadingPhotos(false);
      });
    return () => {
      active = false;
    };
  }, [photographerId]);

  const editionByPhoto = useMemo(() => new Map(editions.map((e) => [e.photoId, e])), [editions]);
  const shownPhotos = showAllPhotos ? photos : photos.slice(0, PHOTO_PREVIEW_LIMIT);

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="studio-create-new">
        <StudioSectionHeader
          id="studio-create-new"
          title="Start a new edition"
          description="Pick the artwork first. Next you’ll add a title, choose a collection or list it on its own, and set the edition type, price and royalty."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className={`${surfaceCardClass} flex flex-col gap-4 p-5`}>
            <span className="flex size-11 items-center justify-center rounded-full bg-(--ed-primary)/15 text-(--ed-primary)">
              <ImageUp aria-hidden className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-medium text-(--ed-text)">Upload artwork</h3>
              <p className="mt-1 text-sm leading-6 text-(--ed-muted)">
                An avatar, a character, digital art or a photo that isn’t in your portfolio.
              </p>
              <p className="mt-2 text-xs leading-5 text-(--ed-muted)">
                JPG, PNG, WebP or GIF, up to {MAX_UPLOAD_MB} MB. Only upload work you own. The
                review team checks rights before approving.
              </p>
            </div>
            <div className="mt-auto">
              <UploadButton
                label="Choose image"
                className={mediumPrimaryButton}
                onUploaded={(url, file) =>
                  onStart({
                    artwork: { image: url, title: titleFromFileName(file.name) },
                    source: "upload",
                  })
                }
              />
            </div>
          </div>

          <div className={`${surfaceCardClass} flex flex-col gap-4 p-5`}>
            {user.avatar ? (
              <img
                src={getOptimizedImageUrl(user.avatar, 160)}
                alt=""
                className="size-11 rounded-full object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
              />
            ) : (
              <span className="flex size-11 items-center justify-center rounded-full bg-(--ed-raised) text-(--ed-muted)">
                <UserRound aria-hidden className="size-5" />
              </span>
            )}
            <div>
              <h3 className="text-base font-medium text-(--ed-text)">Use my profile picture</h3>
              <p className="mt-1 text-sm leading-6 text-(--ed-muted)">
                Turn your current profile picture into an edition, such as an avatar or character
                you made.
              </p>
            </div>
            <div className="mt-auto">
              {user.avatar ? (
                <button
                  type="button"
                  onClick={() =>
                    onStart({
                      artwork: { image: user.avatar ?? "", title: `${user.name || "My"} avatar` },
                      source: "profile",
                    })
                  }
                  className={mediumPrimaryButton}
                >
                  Create from profile picture
                </button>
              ) : (
                <p className="text-sm text-(--ed-muted)">
                  You don’t have a profile picture yet.{" "}
                  <Link
                    to="/account?tab=security"
                    className="font-medium text-(--ed-primary) hover:underline"
                  >
                    Add one in your account
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="studio-create-photos">
        <StudioSectionHeader
          id="studio-create-photos"
          title="From your approved photos"
          action={
            !loadingPhotos && photos.length > 0 ? (
              <p className="text-sm text-(--ed-muted)">
                {photos.length} approved photo{photos.length === 1 ? "" : "s"}
              </p>
            ) : undefined
          }
        />

        {loadingPhotos ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-lg bg-(--ed-raised)" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <EmptyState
            title="No approved photos yet"
            description="Once a photo submission is approved it shows up here, ready to become an edition. You can upload artwork above in the meantime."
            action={
              <Link to="/account?tab=submissions" className={smallSecondaryButton}>
                View my submissions
              </Link>
            }
          />
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {shownPhotos.map((photo) => {
                const existing = editionByPhoto.get(photo.id);
                return (
                  <li key={photo.id} className={`${surfaceCardClass} overflow-hidden`}>
                    <img
                      src={getOptimizedImageUrl(photo.image, 480)}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="flex flex-col gap-2.5 p-3">
                      <p
                        className="truncate text-sm font-medium text-(--ed-text)"
                        title={photo.title}
                      >
                        {photo.title}
                      </p>
                      {existing ? (
                        <div className="flex items-center justify-between gap-2">
                          <ReviewChip status={editionReviewStatus(existing)} />
                          <span className="text-xs text-(--ed-muted)">Edition made</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStart({ artwork: photo, source: "portfolio" })}
                          className={`${smallPrimaryButton} w-full`}
                        >
                          Create edition
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {photos.length > PHOTO_PREVIEW_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAllPhotos((v) => !v)}
                className={`${smallSecondaryButton} mt-4`}
              >
                {showAllPhotos ? "Show fewer" : `Show all ${photos.length} photos`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
