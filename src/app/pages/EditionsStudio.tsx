import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MintEditionModal } from "../components/MintEditionModal";
import { EditionsShell } from "../components/editions/EditionsShell";
import { Chip, EmptyState, TabBar } from "../components/editions/editionsUi";
import {
  creatorHref,
  fadeUpVariants,
  formatDate,
  monoLabelClass,
} from "../components/editions/editionsFormat";
import { CreatorAvatar } from "../components/editions/StudioUi";
import {
  mediumPrimaryButton,
  mediumSecondaryButton,
  surfaceCardClass,
} from "../components/editions/studioFormat";
import { useEditionVault } from "../components/editions/useEditionVault";
import { useWeb3Activation } from "../components/editions/useWeb3Activation";
import { Web3OnboardingFlow } from "../components/editions/Web3Onboarding";
import {
  EDITIONS_CHANGED_EVENT,
  editionReviewStatus,
  resolveCreatorIdentity,
} from "../data/editions";
import { hasCreatorAccess } from "../data/roles";
import { StudioCollected } from "./studio/StudioCollected";
import { StudioCollections } from "./studio/StudioCollections";
import { StudioCreate } from "./studio/StudioCreate";
import { StudioEditions } from "./studio/StudioEditions";
import { StudioOverview } from "./studio/StudioOverview";
import { StudioProfile } from "./studio/StudioProfile";
import {
  artworkForEdition,
  loadStudioData,
  type MintRequest,
  type StudioSection,
} from "./studio/studioData";

const CREATOR_SECTIONS: { id: StudioSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "create", label: "Create" },
  { id: "editions", label: "Editions" },
  { id: "collections", label: "Collections" },
  { id: "collected", label: "Collected" },
  { id: "profile", label: "Profile" },
];
const COLLECTOR_SECTIONS = CREATOR_SECTIONS.filter(
  (s) => s.id === "collected" || s.id === "profile",
);

/**
 * The Web3 home for an NS CAPTURES account: switch Web3 on, then collect, create and
 * manage editions without leaving the Editions experience.
 */
export function EditionsStudio() {
  const { user, isLoading } = useAuth();
  const { walletLabel, wallets, depositConfig, checkPurchaseGate } = useEditionVault();
  const { requireWeb3, activationModal } = useWeb3Activation();
  const [params, setParams] = useSearchParams();

  const [data, setData] = useState(() => loadStudioData(user));
  if (data.userId !== (user?.id ?? null)) setData(loadStudioData(user));
  const [mintRequest, setMintRequest] = useState<MintRequest | null>(null);

  // Stay in step with review decisions, purchases, activation and other tabs
  useEffect(() => {
    const sync = () => setData(loadStudioData(user));
    window.addEventListener(EDITIONS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EDITIONS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [user]);

  const frame = (children: ReactNode) => (
    <EditionsShell activeRail="studio" walletLabel={walletLabel}>
      {children}
      {activationModal}
    </EditionsShell>
  );

  if (isLoading) return frame(<main className="flex-1" />);

  if (!user) {
    return frame(
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <EmptyState
            title="Sign in to open your studio"
            description="Your studio is where you collect, create and manage NFT editions with your NS CAPTURES account."
            action={
              <Link to="/signin" className={mediumPrimaryButton}>
                Sign in
              </Link>
            }
          />
        </div>
      </main>,
    );
  }

  const { activation } = data;
  if (!activation) {
    return frame(
      <main className="flex flex-1 flex-col items-center px-4 pb-16 pt-10 sm:px-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="w-full max-w-2xl"
        >
          <div className="mb-6 text-center">
            <p className={monoLabelClass}>NS CAPTURES Web3</p>
            <h1 className="mt-2 text-balance text-[28px] font-medium leading-9 tracking-[0.2px] text-(--ed-text) sm:text-[36px] sm:leading-[44px]">
              Switch on Web3 for your account
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-pretty text-sm leading-6 text-(--ed-muted)">
              Collect and create NFT editions without a new account. Move between your photography
              account and Web3 whenever you like.
            </p>
          </div>
          <div className={`${surfaceCardClass} p-5 sm:p-6`}>
            <Web3OnboardingFlow
              user={user}
              role="choose"
              onComplete={() => setData(loadStudioData(user))}
            />
          </div>
        </motion.div>
      </main>,
    );
  }

  const creatorAccess = hasCreatorAccess(user.role, user.verificationStatus);
  const canCreate = activation.role === "creator" && creatorAccess;
  const sections = canCreate ? CREATOR_SECTIONS : COLLECTOR_SECTIONS;
  const section = sections.find((s) => s.id === params.get("section"))?.id ?? sections[0].id;

  const setSection = (id: StudioSection) => {
    const next = new URLSearchParams(params);
    if (id === sections[0].id) next.delete("section");
    else next.set("section", id);
    setParams(next);
  };

  const identity = resolveCreatorIdentity(user, data.profile);
  const hasWallet = wallets.length > 0;
  const depositMet = checkPurchaseGate().eligible;
  const readyToSubmit = user.role === "Admin" || (hasWallet && depositMet);
  const publicHref = creatorHref(user.slug || user.id);
  const needsChanges = data.editions.filter((e) => editionReviewStatus(e) === "rejected").length;

  const counts: Partial<Record<StudioSection, number>> = {
    editions: data.editions.length,
    collections: data.collections.length,
    collected: data.owned.length,
    overview: needsChanges > 0 ? needsChanges : undefined,
  };
  const tabs = sections.map((s) => ({ ...s, count: counts[s.id] }));
  const startEdit = (edition: (typeof data.editions)[number]) =>
    setMintRequest(artworkForEdition(edition));

  return frame(
    <>
      <main className="flex flex-1 flex-col px-4 pb-16 pt-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
          <motion.header
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-4">
              <CreatorAvatar src={identity.avatar} name={identity.name} className="size-16" />
              <div className="min-w-0">
                <p className={monoLabelClass}>
                  {canCreate ? "Creator studio" : "Collector studio"}
                </p>
                <h1 className="truncate text-[26px] font-medium leading-9 tracking-[0.2px] text-(--ed-text) sm:text-[32px] sm:leading-10">
                  {identity.name}
                </h1>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Chip>{canCreate ? "Creator" : "Collector"}</Chip>
                  <Chip>Web3 since {formatDate(activation.activatedAt)}</Chip>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={publicHref} className={mediumSecondaryButton}>
                View public page
              </Link>
              <Link to="/account" className={mediumSecondaryButton}>
                Photography account
                <ArrowUpRight aria-hidden className="size-4" />
              </Link>
            </div>
          </motion.header>

          {!canCreate && creatorAccess && (
            <div
              className={`${surfaceCardClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--ed-primary)/15 text-(--ed-primary)">
                  <Sparkles aria-hidden className="size-5" />
                </span>
                <div>
                  <p className="text-base font-medium text-(--ed-text)">Create editions too</p>
                  <p className="mt-1 text-sm leading-6 text-(--ed-muted)">
                    You’re a verified photographer. Set up your creator studio to mint editions,
                    build collections and earn royalties.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => requireWeb3("creator", () => setSection("overview"))}
                className={`${mediumPrimaryButton} shrink-0`}
              >
                Set up creator studio
              </button>
            </div>
          )}

          <TabBar label="Studio sections" tabs={tabs} active={section} onChange={setSection} />

          <div>
            {section === "overview" && (
              <StudioOverview
                data={data}
                hasWallet={hasWallet}
                depositMet={depositMet}
                depositConfig={depositConfig}
                onNavigate={setSection}
                onEdit={startEdit}
              />
            )}
            {section === "create" && (
              <StudioCreate user={user} editions={data.editions} onStart={setMintRequest} />
            )}
            {section === "editions" && (
              <StudioEditions
                user={user}
                editions={data.editions}
                readyToSubmit={readyToSubmit}
                onEdit={startEdit}
                onNavigate={setSection}
              />
            )}
            {section === "collections" && (
              <StudioCollections
                user={user}
                collections={data.collections}
                editions={data.editions}
                creatorAvatar={identity.avatar}
                creatorAvatarIsUpload={data.profile?.avatarSource === "upload"}
              />
            )}
            {section === "collected" && <StudioCollected owned={data.owned} />}
            {section === "profile" && (
              <StudioProfile
                key={data.profile?.updatedAt ?? "new"}
                user={user}
                profile={data.profile}
                isCreator={canCreate}
                publicHref={publicHref}
              />
            )}
          </div>
        </div>
      </main>

      {mintRequest && (
        <MintEditionModal
          photo={mintRequest.artwork}
          artworkSource={mintRequest.source}
          edition={mintRequest.edition}
          onClose={() => setMintRequest(null)}
          onSuccess={() => {
            setData(loadStudioData(user));
            if (!mintRequest.edition) setSection("editions");
          }}
        />
      )}
    </>,
  );
}
