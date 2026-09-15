import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, ImageUp, Loader2, UserRound } from "lucide-react";
import { EDITION_REVIEW_LABELS, type EditionReviewStatus } from "../../data/editions";
import { MAX_UPLOAD_MB, uploadImageFile } from "../../../lib/imageUpload";
import { initials, secondaryButtonClass } from "./editionsFormat";
import {
  REVIEW_CHIP_TONES,
  chipBaseClass,
  fieldLabelClass,
  smallPrimaryButton,
  smallSecondaryButton,
} from "./studioFormat";

export function ReviewChip({ status }: { status: EditionReviewStatus }) {
  return (
    <span className={`${chipBaseClass} ${REVIEW_CHIP_TONES[status]}`}>
      {EDITION_REVIEW_LABELS[status]}
    </span>
  );
}

export function StudioSectionHeader({
  id,
  title,
  description,
  action,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-xl font-medium tracking-[-0.3px] text-(--ed-text)">
          {title}
        </h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-(--ed-muted)">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CreatorAvatar({
  src,
  name,
  className = "size-10",
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  return src ? (
    <img
      src={src}
      alt=""
      className={`${className} shrink-0 rounded-full object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)`}
    />
  ) : (
    <span
      aria-hidden
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-(--ed-raised) text-sm font-medium text-(--ed-text)`}
    >
      {initials(name) || "NS"}
    </span>
  );
}

/** A file picker styled as a button. The input stays focusable for keyboard users. */
export function UploadButton({
  label,
  uploadingLabel = "Uploading…",
  onUploaded,
  className = `${secondaryButtonClass} h-9 px-4 text-sm`,
}: {
  label: string;
  uploadingLabel?: string;
  onUploaded: (url: string, file: File) => void;
  className?: string;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      onUploaded(await uploadImageFile(file), file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed. Try another image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <label
      htmlFor={inputId}
      className={`${className} cursor-pointer focus-within:ring-2 focus-within:ring-(--ed-primary) ${uploading ? "pointer-events-none opacity-60" : ""}`}
    >
      {uploading ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        <ImageUp aria-hidden className="size-4" />
      )}
      {uploading ? uploadingLabel : label}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={uploading}
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </label>
  );
}

/** Choose an image: the account profile picture, or an uploaded file. */
export function ImageField({
  label,
  hint,
  value,
  onChange,
  profileImage,
  profileLabel = "Use my profile picture",
  uploadLabel = "Upload image",
  shape = "square",
  allowRemove = false,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  profileImage?: string;
  profileLabel?: string;
  uploadLabel?: string;
  shape?: "circle" | "square" | "wide";
  allowRemove?: boolean;
}) {
  const usingProfile = Boolean(profileImage) && value === profileImage;
  const previewShape =
    shape === "circle"
      ? "size-20 rounded-full"
      : shape === "wide"
        ? "aspect-[3/1] w-full max-w-sm rounded-lg"
        : "size-20 rounded-lg";

  return (
    <fieldset className="min-w-0">
      <legend className={fieldLabelClass}>{label}</legend>
      <div className={`flex gap-4 ${shape === "wide" ? "flex-col" : "items-center"}`}>
        <div
          className={`${previewShape} shrink-0 overflow-hidden bg-(--ed-raised) outline outline-1 -outline-offset-1 outline-(--ed-image-outline)`}
        >
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-(--ed-muted)">
              <UserRound aria-hidden className="size-6" />
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profileImage && (
            <button
              type="button"
              onClick={() => onChange(profileImage)}
              aria-pressed={usingProfile}
              className={usingProfile ? smallPrimaryButton : smallSecondaryButton}
            >
              {usingProfile && <Check aria-hidden className="size-3.5" />}
              {profileLabel}
            </button>
          )}
          <UploadButton
            label={uploadLabel}
            className={smallSecondaryButton}
            onUploaded={(url) => onChange(url)}
          />
          {allowRemove && value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-full px-2 py-1 text-xs font-medium text-(--ed-muted) transition-colors hover:text-(--ed-negative)"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-(--ed-muted)">
        {hint ? `${hint} ` : ""}JPG, PNG, WebP or GIF, up to {MAX_UPLOAD_MB} MB.
      </p>
    </fieldset>
  );
}
