import { useState, type ComponentType } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ArrowUpRight, CheckCircle2, Circle, Gem, Palette, Sparkles } from "lucide-react";
import type { AuthUser } from "../../context/AuthContext";
import { PresaleBuyModal } from "../PresaleBuyModal";
import { hasCreatorAccess } from "../../data/roles";
import {
  CREATOR_PROFILE_LIMITS,
  activateWeb3,
  getEditionCreatorProfile,
  resolveCreatorIdentity,
  saveEditionCreatorProfile,
  type Web3Role,
} from "../../data/editions";
import { EditionsModal } from "./editionsUi";
import { inputClass, monoLabelClass, shortHex } from "./editionsFormat";
import { ImageField } from "./StudioUi";
import {
  fieldLabelClass,
  mediumPrimaryButton,
  mediumSecondaryButton,
  textareaClass,
} from "./studioFormat";
import { useEditionVault } from "./useEditionVault";

type Step = "choose" | "profile" | "finish";

const ROLE_OPTIONS: {
  id: Web3Role;
  title: string;
  body: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    id: "collector",
    title: "Collect editions",
    body: "Buy numbered editions, keep their certificates and show them on a public collector page.",
    icon: Gem,
  },
  {
    id: "creator",
    title: "Create and sell editions",
    body: "Mint photos or artwork, build collections and earn royalties. Includes everything collectors get.",
    icon: Palette,
  },
];

function StatusRow({
  done,
  title,
  body,
  action,
}: {
  done: boolean;
  title: string;
  body: string;
  action?: { label: string; to: string };
}) {
  return (
    <li className="flex items-start gap-3 p-4">
      {done ? (
        <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-(--ed-positive)" />
      ) : (
        <Circle aria-hidden className="mt-0.5 size-5 shrink-0 text-(--ed-border-strong)" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-(--ed-text)">
          {title}
          <span className="sr-only">{done ? " (done)" : " (not yet)"}</span>
        </p>
        <p className="mt-0.5 text-sm leading-6 text-(--ed-muted)">{body}</p>
      </div>
      {action && (
        <Link
          to={action.to}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 self-center text-sm font-medium text-(--ed-primary) hover:underline"
        >
          {action.label}
          <ArrowUpRight aria-hidden className="size-3.5" />
          <span className="sr-only"> (opens in a new tab)</span>
        </Link>
      )}
    </li>
  );
}

/**
 * Switches Web3 on for an existing NS CAPTURES account — no second sign-up.
 * `role="choose"` is the full studio onboarding; `"collector"` is the light version
 * shown before a first purchase; `"creator"` sets up (or upgrades to) the creator studio.
 */
export function Web3OnboardingFlow({
  user,
  role,
  onComplete,
  onCancel,
}: {
  user: AuthUser;
  role: Web3Role | "choose";
  onComplete: (role: Web3Role) => void;
  onCancel?: () => void;
}) {
  const { wallets, depositConfig, checkPurchaseGate, primaryEvmAddress, refresh } =
    useEditionVault();
  const canCreate = hasCreatorAccess(user.role, user.verificationStatus);
  const profile = getEditionCreatorProfile(user.id);

  const [path, setPath] = useState<Web3Role>(
    role === "choose" ? (canCreate ? "creator" : "collector") : role,
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? user.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatar, setAvatar] = useState(resolveCreatorIdentity(user, profile).avatar ?? "");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSwapOpen, setIsSwapOpen] = useState(false);

  if (role === "creator" && !canCreate) {
    const isPhotographer = user.role === "Photographer" || user.role === "Contributor";
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-medium text-(--ed-text)">
            Creating editions needs a verified profile
          </h3>
          <p className="mt-1 text-sm leading-6 text-(--ed-muted)">
            {isPhotographer
              ? "Finish verifying your photographer profile, then come back to set up your creator studio."
              : "Creating editions is open to verified photographers and contributors. You can apply to sell your work from your account."}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-(--ed-border) pt-4">
          {onCancel && (
            <button type="button" onClick={onCancel} className={mediumSecondaryButton}>
              Not now
            </button>
          )}
          <Link to="/account?tab=security" className={mediumPrimaryButton}>
            {isPhotographer ? "Check verification" : "Go to my account"}
          </Link>
        </div>
      </div>
    );
  }

  // A buyer switching Web3 on for a purchase only needs the essentials
  const steps: Step[] = [];
  if (role === "choose") steps.push("choose");
  if (role !== "collector") steps.push("profile");
  steps.push("finish");
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  const hasWallet = wallets.length > 0;
  const depositMet = checkPurchaseGate().eligible;
  const accountAvatar = user.avatar || undefined;

  const handleContinue = () => {
    setError(null);
    if (step === "profile") {
      const avatarSource = avatar && avatar !== accountAvatar ? "upload" : "account";
      const result = saveEditionCreatorProfile(
        {
          displayName,
          bio,
          avatarSource,
          avatarUrl: avatarSource === "upload" ? avatar : undefined,
        },
        user,
      );
      if (!result.success) {
        setError(result.error ?? "Couldn't save your profile.");
        return;
      }
    }
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };

  const handleFinish = () => {
    if (!agreed) {
      setError("Agree to the terms to continue.");
      return;
    }
    activateWeb3(user.id, path);
    toast.success(path === "creator" ? "Your creator studio is ready" : "Web3 is on", {
      description:
        path === "creator"
          ? "Create editions, build collections and manage sales from your studio."
          : "You can now collect editions with your NS CAPTURES account.",
    });
    onComplete(path);
  };

  const headings: Record<Step, { title: string; body: string }> = {
    choose: {
      title: "How do you want to use Web3?",
      body: "You keep your NS CAPTURES account. Web3 adds editions, your vault and a public page to it.",
    },
    profile: {
      title: path === "creator" ? "Your creator profile" : "Your collector profile",
      body:
        path === "creator"
          ? "This is how collectors see you on your editions, collections and public page."
          : "Shown on your public collector page.",
    },
    finish: {
      title: "Wallet and terms",
      body: `Here’s what you need to ${path === "creator" ? "buy and mint" : "buy"}. You can finish anything that’s missing later.`,
    },
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        {steps.length > 1 && (
          <p className={monoLabelClass}>
            Step {steps.indexOf(step) + 1} of {steps.length}
          </p>
        )}
        <h3 className="mt-1 text-lg font-medium text-(--ed-text)">{headings[step].title}</h3>
        <p className="mt-1 text-sm leading-6 text-(--ed-muted)">{headings[step].body}</p>
      </div>

      {step === "choose" && (
        <div
          role="radiogroup"
          aria-label="How you’ll use Web3"
          className="grid gap-3 sm:grid-cols-2"
        >
          {ROLE_OPTIONS.map((option) => {
            const checked = path === option.id;
            const disabled = option.id === "creator" && !canCreate;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-disabled={disabled}
                onClick={() => !disabled && setPath(option.id)}
                className={`flex flex-col gap-3 rounded-lg border p-4 text-left transition-colors ${
                  checked
                    ? "border-(--ed-primary) bg-(--ed-primary)/10"
                    : "border-(--ed-border) bg-(--ed-bg) hover:border-(--ed-border-strong)"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-(--ed-raised) text-(--ed-text)">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-(--ed-text)">{option.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-(--ed-muted)">
                    {disabled ? "For verified photographers and contributors." : option.body}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {step === "profile" && (
        <div className="flex flex-col gap-5">
          <ImageField
            label="Avatar"
            value={avatar}
            onChange={setAvatar}
            profileImage={accountAvatar}
            uploadLabel="Upload avatar or character"
            shape="circle"
            hint="Use your profile picture, or upload an avatar or character."
          />
          <div>
            <label htmlFor="web3-display-name" className={fieldLabelClass}>
              Display name
            </label>
            <input
              id="web3-display-name"
              type="text"
              value={displayName}
              maxLength={CREATOR_PROFILE_LIMITS.name}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
          </div>
          {path === "creator" && (
            <div>
              <label htmlFor="web3-bio" className={fieldLabelClass}>
                Short bio <span className="font-normal text-(--ed-muted)">(optional)</span>
              </label>
              <textarea
                id="web3-bio"
                value={bio}
                maxLength={CREATOR_PROFILE_LIMITS.bio}
                rows={3}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What you make and where you work"
                className={textareaClass}
              />
            </div>
          )}
        </div>
      )}

      {step === "finish" && (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y divide-(--ed-border) rounded-lg border border-(--ed-border) bg-(--ed-bg)">
            <StatusRow
              done
              title="Same account"
              body="You keep signing in with NS CAPTURES. There’s nothing new to remember."
            />
            <StatusRow
              done={hasWallet}
              title="Web3 vault wallet"
              body={
                hasWallet
                  ? `Ready${primaryEvmAddress ? ` · ${shortHex(primaryEvmAddress)}` : ""}`
                  : "Create or connect a wallet in your vault. Purchases and sales settle there."
              }
              action={hasWallet ? undefined : { label: "Set up vault", to: "/account?tab=web3" }}
            />
            <StatusRow
              done={depositMet}
              title="Vault activation & deposit"
              body={`Hold at least ${depositConfig.nscThreshold ?? 20} NSC or ${depositConfig.ethThreshold} ETH (or equivalent crypto). NSC is the native platform coin used for Web3 activation, minting fees and acquiring editions.`}
              action={depositMet ? undefined : { label: "Activate vault", to: "/account?tab=web3" }}
            />
          </ul>

          {!depositMet && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-lg border border-(--ed-primary)/30 bg-(--ed-primary)/10 p-3.5">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-(--ed-text) flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-(--ed-primary)" />
                  Activate Vault with NSC or ETH
                </p>
                <p className="text-[11px] text-(--ed-muted)">
                  Swap ETH or crypto to NSC instantly with zero extra gas. Funds route to NS
                  CAPTURES Treasury and your vault is credited.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSwapOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-(--ed-primary) px-3.5 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90 shrink-0"
              >
                <Sparkles className="size-3.5" />
                Swap ETH to NSC
              </button>
            </div>
          )}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-(--ed-border) bg-(--ed-bg) p-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                setError(null);
              }}
              className="mt-1 size-4 shrink-0 accent-(--ed-primary)"
            />
            <span className="text-sm leading-6 text-(--ed-text-soft)">
              I understand that crypto payments and on-chain transfers can’t be reversed
              {path === "creator"
                ? ", that I only mint work I own or have the rights to sell, and that every edition is reviewed before it goes live"
                : ""}
              . I agree to the{" "}
              <Link
                to="/legal"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-(--ed-text) underline underline-offset-2"
              >
                NS CAPTURES terms
              </Link>
              .
            </span>
          </label>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-(--ed-negative)/40 bg-(--ed-negative)/10 px-3 py-2 text-sm text-(--ed-negative)"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--ed-border) pt-4">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStepIndex((index) => index - 1);
            }}
            className={mediumSecondaryButton}
          >
            Back
          </button>
        ) : onCancel ? (
          <button type="button" onClick={onCancel} className={mediumSecondaryButton}>
            Not now
          </button>
        ) : (
          <span />
        )}
        {step === "finish" ? (
          <button type="button" onClick={handleFinish} className={mediumPrimaryButton}>
            {role === "collector"
              ? "Switch on and continue"
              : path === "creator"
                ? "Open my creator studio"
                : "Switch on Web3"}
          </button>
        ) : (
          <button type="button" onClick={handleContinue} className={mediumPrimaryButton}>
            Continue
          </button>
        )}
      </div>

      {isSwapOpen && (
        <PresaleBuyModal
          isOpen={isSwapOpen}
          onClose={() => setIsSwapOpen(false)}
          onSuccess={() => {
            setIsSwapOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

export function Web3ActivationModal({
  user,
  role,
  onClose,
  onComplete,
}: {
  user: AuthUser;
  role: Web3Role;
  onClose: () => void;
  onComplete: (role: Web3Role) => void;
}) {
  return (
    <EditionsModal
      eyebrow="NS CAPTURES Web3"
      title={role === "creator" ? "Set up your creator studio" : "Switch on Web3 to collect"}
      onClose={onClose}
      size="lg"
    >
      <Web3OnboardingFlow user={user} role={role} onComplete={onComplete} onCancel={onClose} />
    </EditionsModal>
  );
}
