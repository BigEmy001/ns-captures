import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { AuthUser } from "../../context/AuthContext";
import {
  COLLECTION_CHAINS,
  COLLECTION_LIMITS,
  ROYALTY_LIMITS,
  createEditionCollection,
  updateEditionCollection,
  type EditionCollectionMeta,
} from "../../data/editions";
import { MaskIcon } from "../../components/MaskIcon";
import { inputClass, selectClass } from "../../components/editions/editionsFormat";
import { ImageField } from "../../components/editions/StudioUi";
import {
  fieldLabelClass,
  mediumPrimaryButton,
  mediumSecondaryButton,
  surfaceCardClass,
  textareaClass,
} from "../../components/editions/studioFormat";
import chevronLeftIcon from "../../../assets/edition-detail/chevron-left.svg";

export function StudioCollectionForm({
  user,
  collection,
  creatorAvatar,
  creatorAvatarIsUpload,
  onCancel,
  onSaved,
}: {
  user: AuthUser;
  collection?: EditionCollectionMeta;
  creatorAvatar?: string;
  creatorAvatarIsUpload: boolean;
  onCancel: () => void;
  onSaved: (collection: EditionCollectionMeta) => void;
}) {
  const formId = useId();
  const [name, setName] = useState(collection?.name ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [logo, setLogo] = useState(collection?.avatarImage ?? creatorAvatar ?? "");
  const [banner, setBanner] = useState(
    collection && collection.bannerImage !== collection.avatarImage ? collection.bannerImage : "",
  );
  const [chain, setChain] = useState(collection?.chain ?? COLLECTION_CHAINS[0]);
  const [royalty, setRoyalty] = useState(collection?.royaltyPercent ?? 10);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const input = {
      name,
      description,
      avatarImage: logo,
      bannerImage: banner,
      chain,
      royaltyPercent: royalty,
    };
    const result = collection
      ? updateEditionCollection(collection.id, input, user)
      : createEditionCollection(input, user);
    if (!result.success || !result.collection) {
      setError(result.error ?? "Couldn't save the collection.");
      return;
    }
    setError(null);
    toast.success(
      collection ? "Collection changes saved" : `Collection “${result.collection.name}” created`,
    );
    onSaved(result.collection);
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={`${formId}-title`}
      className={`${surfaceCardClass} flex flex-col gap-6 p-5 sm:p-6`}
      noValidate
    >
      <div>
        <h3 id={`${formId}-title`} className="text-lg font-medium text-(--ed-text)">
          {collection ? "Edit collection" : "New collection"}
        </h3>
        <p className="mt-1 text-sm text-(--ed-muted)">
          Collections stay off the marketplace until one of their editions is approved.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={`${formId}-name`} className={fieldLabelClass}>
                Name
              </label>
              <span className="font-mono text-xs text-(--ed-muted)">
                {name.trim().length}/{COLLECTION_LIMITS.nameMax}
              </span>
            </div>
            <input
              id={`${formId}-name`}
              type="text"
              value={name}
              maxLength={COLLECTION_LIMITS.nameMax}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kyoto After Dark"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor={`${formId}-description`} className={fieldLabelClass}>
              Description
            </label>
            <textarea
              id={`${formId}-description`}
              value={description}
              maxLength={COLLECTION_LIMITS.description}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What ties these editions together?"
              className={textareaClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${formId}-chain`} className={fieldLabelClass}>
                Chain
              </label>
              <div className="relative">
                <select
                  id={`${formId}-chain`}
                  value={chain}
                  onChange={(e) => setChain(e.target.value)}
                  className={`${selectClass} w-full`}
                >
                  {COLLECTION_CHAINS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <MaskIcon
                  src={chevronLeftIcon}
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 -rotate-90 text-(--ed-muted)"
                />
              </div>
            </div>
            <div>
              <label htmlFor={`${formId}-royalty`} className={fieldLabelClass}>
                Royalty (%)
              </label>
              <input
                id={`${formId}-royalty`}
                type="number"
                min={ROYALTY_LIMITS.min}
                max={ROYALTY_LIMITS.max}
                step={0.5}
                value={royalty}
                onChange={(e) => setRoyalty(Number(e.target.value))}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <ImageField
            label="Logo"
            value={logo}
            onChange={setLogo}
            profileImage={creatorAvatar}
            profileLabel={
              creatorAvatarIsUpload ? "Use my creator avatar" : "Use my profile picture"
            }
            uploadLabel="Upload logo"
            hint="Square images work best."
          />
          <ImageField
            label="Banner (optional)"
            value={banner}
            onChange={setBanner}
            shape="wide"
            uploadLabel="Upload banner"
            allowRemove
            hint="Wide images (3:1) work best. Your logo is used if you skip this."
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-(--ed-negative)/40 bg-(--ed-negative)/10 px-3 py-2 text-sm text-(--ed-negative)"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className={mediumSecondaryButton}>
          Cancel
        </button>
        <button type="submit" className={mediumPrimaryButton}>
          {collection ? "Save changes" : "Create collection"}
        </button>
      </div>
    </form>
  );
}
