import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { EditionsShell } from "../components/editions/EditionsShell";
import {
  EditionCard,
  EmptyState,
  Stat,
  TabBar,
  VerifiedBadge,
} from "../components/editions/editionsUi";
import {
  fadeUpVariants,
  formatDate,
  formatNsc,
  iconButtonClass,
  monoLabelClass,
} from "../components/editions/editionsFormat";
import { CreatorAvatar } from "../components/editions/StudioUi";
import {
  mediumPrimaryButton,
  mediumSecondaryButton,
  surfaceCardClass,
} from "../components/editions/studioFormat";
import { useEditionVault } from "../components/editions/useEditionVault";
import { gbpToNsc, getCreatorPageData } from "../data/editions";
import { copyToClipboard } from "../../lib/clipboard";

type ProfileTab = "created" | "collections" | "collected";

const gridClass =
  "mt-6 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/** Public page for a creator or collector: what they made, their collections, what they own. */
export function EditionsCreator() {
  const { id = "" } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { walletLabel } = useEditionVault();
  const page = useMemo(() => getCreatorPageData(id), [id]);
  const [tab, setTab] = useState<ProfileTab | null>(null);

  if (!page) {
    return (
      <EditionsShell walletLabel={walletLabel}>
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md">
            <EmptyState
              title="Profile not found"
              description="This creator or collector doesn’t have a public page yet."
              action={
                <Link to="/editions" className={mediumPrimaryButton}>
                  Browse editions
                </Link>
              }
            />
          </div>
        </main>
      </EditionsShell>
    );
  }

  const isOwnPage = Boolean(user) && (page.userId === user?.id || id === user?.slug);
  const isCreator = page.created.length > 0;
  const activeTab: ProfileTab =
    tab ?? (isCreator ? "created" : page.collected.length > 0 ? "collected" : "created");
  const banner =
    page.collections[0]?.bannerImage ?? page.created[0]?.image ?? page.collected[0]?.edition.image;
  const floor = isCreator ? gbpToNsc(Math.min(...page.created.map((e) => e.priceGbp))) : null;

  const tabs: { id: ProfileTab; label: string; count: number }[] = [
    { id: "created", label: "Created", count: page.created.length },
    { id: "collections", label: "Collections", count: page.collections.length },
    { id: "collected", label: "Collected", count: page.collected.length },
  ];

  const copyLink = async () => {
    if (await copyToClipboard(window.location.href)) toast.success("Profile link copied");
  };

  return (
    <EditionsShell walletLabel={walletLabel}>
      <main className="flex-1 pb-16">
        <div className="relative h-[160px] overflow-hidden border-b border-(--ed-border) bg-(--ed-raised) sm:h-[220px]">
          {banner && <img src={banner} alt="" className="size-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-(--ed-bg) via-(--ed-bg)/20 to-transparent" />
        </div>

        <div className="px-4 sm:px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            className="relative -mt-12 flex flex-col gap-4 sm:-mt-14"
          >
            <CreatorAvatar
              src={page.avatar}
              name={page.name}
              className="size-24 ring-4 ring-(--ed-bg) sm:size-28"
            />

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="flex min-w-0 items-center gap-2 text-[26px] font-medium leading-9 tracking-[0.2px] text-(--ed-text) sm:text-[32px] sm:leading-10">
                  <span className="truncate">{page.name}</span>
                  {isCreator && <VerifiedBadge className="size-5 shrink-0" />}
                </h1>
                <p className="mt-1 text-sm text-(--ed-muted)">
                  {isCreator ? "Creator" : "Collector"}
                  {page.joinedAt && ` · Web3 since ${formatDate(page.joinedAt)}`}
                </p>
                {page.bio && (
                  <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-(--ed-text-soft)">
                    {page.bio}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isOwnPage && (
                  <>
                    <Link to="/editions/studio" className={mediumPrimaryButton}>
                      Open studio
                    </Link>
                    <Link to="/editions/studio?section=profile" className={mediumSecondaryButton}>
                      Edit profile
                    </Link>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  aria-label="Copy profile link"
                  title="Copy link"
                  className={iconButtonClass}
                >
                  <Link2 aria-hidden className="size-4" />
                </button>
              </div>
            </div>

            <dl
              className={`${surfaceCardClass} grid grid-cols-2 gap-4 p-4 sm:grid-cols-4 lg:max-w-3xl`}
            >
              <Stat label="Editions" value={page.created.length} />
              <Stat label="Collections" value={page.collections.length} />
              <Stat label="Floor" value={floor !== null ? formatNsc(floor) : "—"} />
              <Stat label="Collectors" value={page.collectors} />
            </dl>
          </motion.div>

          <div className="mt-8">
            <TabBar label="Profile sections" tabs={tabs} active={activeTab} onChange={setTab} />

            {activeTab === "created" &&
              (page.created.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    title="No editions yet"
                    description="Editions appear here once they’re approved and live."
                  />
                </div>
              ) : (
                <ul className={gridClass}>
                  {page.created.map((edition) => (
                    <li key={edition.id}>
                      <EditionCard edition={edition} />
                    </li>
                  ))}
                </ul>
              ))}

            {activeTab === "collections" &&
              (page.collections.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    title="No collections yet"
                    description="Public collections from this creator will show here."
                  />
                </div>
              ) : (
                <ul className={gridClass}>
                  {page.collections.map((collection) => (
                    <li key={collection.id}>
                      <Link
                        to={`/editions/collection/${collection.id}`}
                        className={`${surfaceCardClass} group flex flex-col overflow-hidden transition-colors hover:border-(--ed-border-strong)`}
                      >
                        <span className="block aspect-[16/9] overflow-hidden bg-(--ed-raised)">
                          <img
                            src={collection.bannerImage}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          />
                        </span>
                        <span className="flex items-center gap-3 p-3">
                          <img
                            src={collection.avatarImage}
                            alt=""
                            className="size-10 shrink-0 rounded-md object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
                          />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1 text-sm font-medium text-(--ed-text)">
                              <span className="truncate">{collection.name}</span>
                              <VerifiedBadge className="size-3.5 shrink-0" />
                            </span>
                            <span className={`${monoLabelClass} mt-0.5 block`}>
                              {collection.chain} · {collection.royaltyPercent}% royalty
                            </span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}

            {activeTab === "collected" &&
              (page.collected.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    title="Nothing collected yet"
                    description="Editions this account buys will show here."
                  />
                </div>
              ) : (
                <ul className={gridClass}>
                  {page.collected.map(({ edition, ownership }) => (
                    <li key={ownership.id} className="flex flex-col gap-2">
                      <EditionCard edition={edition} />
                      <p className="font-mono text-xs text-(--ed-muted)">
                        Serial {ownership.serialDisplay}
                      </p>
                    </li>
                  ))}
                </ul>
              ))}
          </div>
        </div>
      </main>
    </EditionsShell>
  );
}
