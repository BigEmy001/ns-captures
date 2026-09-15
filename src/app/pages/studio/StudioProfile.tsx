import { useId, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ArrowUpRight } from "lucide-react";
import type { AuthUser } from "../../context/AuthContext";
import {
  CREATOR_PROFILE_LIMITS,
  resolveCreatorIdentity,
  saveEditionCreatorProfile,
  type EditionCreatorProfile,
} from "../../data/editions";
import { inputClass } from "../../components/editions/editionsFormat";
import { ImageField, StudioSectionHeader } from "../../components/editions/StudioUi";
import {
  fieldLabelClass,
  mediumPrimaryButton,
  smallSecondaryButton,
  surfaceCardClass,
  textareaClass,
} from "../../components/editions/studioFormat";

export function StudioProfile({
  user,
  profile,
  isCreator,
  publicHref,
}: {
  user: AuthUser;
  profile: EditionCreatorProfile | null;
  isCreator: boolean;
  publicHref: string;
}) {
  const formId = useId();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? user.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatar, setAvatar] = useState(resolveCreatorIdentity(user, profile).avatar ?? "");
  const [error, setError] = useState<string | null>(null);

  const accountAvatar = user.avatar || undefined;
  // Anything other than the account picture is an uploaded avatar or character
  const avatarSource: "account" | "upload" =
    avatar && avatar !== accountAvatar ? "upload" : "account";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = saveEditionCreatorProfile(
      { displayName, bio, avatarSource, avatarUrl: avatarSource === "upload" ? avatar : undefined },
      user,
    );
    if (!result.success) {
      setError(result.error ?? "Couldn't save your profile.");
      return;
    }
    setError(null);
    toast.success("Profile saved", {
      description: isCreator
        ? "Your editions, collections and public page now show this name and avatar."
        : "Your public collector page now shows this name and avatar.",
    });
  };

  return (
    <section aria-labelledby="studio-profile">
      <StudioSectionHeader
        id="studio-profile"
        title="Your Web3 profile"
        description={`The name, avatar and bio shown on ${isCreator ? "your editions, collections and " : ""}your public page. Your photography account profile doesn’t change.`}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form
          onSubmit={handleSubmit}
          className={`${surfaceCardClass} flex flex-col gap-6 p-5 sm:p-6`}
          noValidate
        >
          <ImageField
            label="Avatar"
            value={avatar}
            onChange={setAvatar}
            profileImage={accountAvatar}
            uploadLabel="Upload avatar or character"
            shape="circle"
            hint={
              accountAvatar
                ? "Use your profile picture, or upload an avatar or character. Square images work best."
                : "Upload an avatar or character. Square images work best."
            }
          />

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={`${formId}-name`} className={fieldLabelClass}>
                Display name
              </label>
              <span className="font-mono text-xs text-(--ed-muted)">
                {displayName.trim().length}/{CREATOR_PROFILE_LIMITS.name}
              </span>
            </div>
            <input
              id={`${formId}-name`}
              type="text"
              value={displayName}
              maxLength={CREATOR_PROFILE_LIMITS.name}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={`${formId}-bio`} className={fieldLabelClass}>
                Short bio
              </label>
              <span className="font-mono text-xs text-(--ed-muted)">
                {bio.trim().length}/{CREATOR_PROFILE_LIMITS.bio}
              </span>
            </div>
            <textarea
              id={`${formId}-bio`}
              value={bio}
              maxLength={CREATOR_PROFILE_LIMITS.bio}
              rows={3}
              onChange={(e) => setBio(e.target.value)}
              placeholder={isCreator ? "What you make and where you work" : "What you collect"}
              className={textareaClass}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-(--ed-negative)/40 bg-(--ed-negative)/10 px-3 py-2 text-sm text-(--ed-negative)"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button type="submit" className={mediumPrimaryButton}>
              Save profile
            </button>
          </div>
        </form>

        <aside className={`${surfaceCardClass} flex flex-col gap-3 p-5`}>
          <h3 className="text-base font-medium text-(--ed-text)">Your public page</h3>
          <p className="text-sm leading-6 text-(--ed-muted)">
            {isCreator
              ? "Collectors see your editions, collections and what you’ve collected."
              : "Others see the editions you’ve collected."}
          </p>
          <Link to={publicHref} className={`${smallSecondaryButton} self-start`}>
            View public page
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </aside>
      </div>
    </section>
  );
}
