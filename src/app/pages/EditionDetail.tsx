import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Coins, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  getStoredEditions,
  getStoredOwnerships,
  getStoredActivity,
  getEditionCollection,
  isWeb3Activated,
  purchaseEdition,
  EDITION_REVIEW_LABELS,
  editionReviewStatus,
  isEditionCreator,
  isEditionPublished,
  type DigitalEdition,
  type EditionOwnership,
  type EditionActivity,
} from "../data/editions";
import { CertificateOfAuthenticityModal } from "../components/CertificateOfAuthenticityModal";
import { MaskIcon } from "../components/MaskIcon";
import { ArtworkLightbox, ArtworkPreview } from "../components/editions/ArtworkViewer";
import { EditionsShell } from "../components/editions/EditionsShell";
import {
  ActivityTable,
  Chip,
  DetailSection,
  EditionCard,
  EditionsModal,
  EmptyState,
  Stat,
  TabBar,
  VerifiedBadge,
} from "../components/editions/editionsUi";
import {
  collectionHrefFor,
  creatorHrefFor,
  fadeUpVariants,
  formatDate,
  formatEth,
  formatGbp,
  formatPercent,
  initials,
  inputClass,
  monoLabelClass,
  primaryButtonClass,
  sampleOwnershipFor,
  secondaryButtonClass,
  shortHex,
  tableHeadClass,
  traitTone,
} from "../components/editions/editionsFormat";
import { useEditionVault } from "../components/editions/useEditionVault";
import { useWeb3Activation } from "../components/editions/useWeb3Activation";
import { copyToClipboard } from "../../lib/clipboard";

// Icons exported from the Figma "photo details" frame (node 18:2)
import contentCopyIcon from "../../assets/edition-detail/content-copy.svg";
import favoriteIcon from "../../assets/edition-detail/favorite.svg";
import moreHorizIcon from "../../assets/edition-detail/more-horiz.svg";
import ethereumIcon from "../../assets/edition-detail/ethereum.svg";
import traitsIcon from "../../assets/edition-detail/traits.svg";
import gridViewIcon from "../../assets/edition-detail/grid-view.svg";
import tableRowsIcon from "../../assets/edition-detail/table-rows.svg";
import attachMoneyIcon from "../../assets/edition-detail/attach-money.svg";
import editNoteIcon from "../../assets/edition-detail/edit-note.svg";
import tileMediumIcon from "../../assets/edition-detail/tile-medium.svg";

type SectionKey = "traits" | "priceHistory" | "about" | "chain" | "more";

const DETAIL_TABS = [
  { id: "details", label: "Details" },
  { id: "orders", label: "Orders" },
  { id: "activity", label: "Activity" },
] as const;

type DetailTab = (typeof DETAIL_TABS)[number]["id"];

const headerIconClass =
  "flex items-center text-(--ed-text) transition-colors hover:text-(--ed-text-soft)";

const staggerChildren = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const traitsStagger = { hidden: {}, visible: { transition: { staggerChildren: 0.03 } } };

// Quick cross-fade between tab panels (a frequent interaction, so kept short)
const panelMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: "easeOut" } },
} as const;

export function EditionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, walletLabel, primaryEvmAddress, depositConfig, checkPurchaseGate } =
    useEditionVault();
  const { requireWeb3, activationModal } = useWeb3Activation();

  const [editions, setEditions] = useState<DigitalEdition[]>(() => getStoredEditions());
  const [ownerships, setOwnerships] = useState<EditionOwnership[]>(() => getStoredOwnerships());
  const [activities, setActivities] = useState<EditionActivity[]>(() => getStoredActivity());

  // Find edition by ID or token ID
  const edition = useMemo(() => {
    return editions.find((e) => e.id === id || e.tokenId.toLowerCase() === id?.toLowerCase());
  }, [editions, id]);

  // Only public editions count towards trait rarity and "more from this collection"
  const publishedEditions = useMemo(() => editions.filter(isEditionPublished), [editions]);

  const collection = useMemo(() => {
    const key = edition?.collectionId ?? edition?.collectionName;
    return key ? getEditionCollection(key) : null;
  }, [edition]);

  // Ownerships for this specific edition (newest first)
  const editionOwnerships = useMemo(() => {
    if (!edition) return [];
    return ownerships.filter((o) => o.editionId === edition.id);
  }, [ownerships, edition]);

  // Activity trail for this edition, with a mint row when the registry has none
  const editionActivity = useMemo<EditionActivity[]>(() => {
    if (!edition) return [];
    const trail = activities.filter((a) => a.editionId === edition.id);
    if (trail.some((a) => a.type === "minted")) return trail;
    return [
      ...trail,
      {
        id: `mint-${edition.id}`,
        editionId: edition.id,
        type: "minted",
        fromUser: "Null address",
        toUser: edition.photographerName,
        timestamp: edition.mintedAt,
        txHash: "",
      },
    ];
  }, [activities, edition]);

  // Tabs, sections & view toggles
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    traits: true,
    priceHistory: false,
    about: false,
    chain: false,
    more: false,
  });
  const [traitsView, setTraitsView] = useState<"grid" | "table">("grid");
  const toggleSection = (key: SectionKey) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Modals & menus
  const [coaModalOpen, setCoaModalOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeOwnershipForCoa, setActiveOwnershipForCoa] = useState<EditionOwnership | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const closeFullscreen = useCallback(() => setFullscreenOpen(false), []);

  // Close the "more" menu on outside click or Escape
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (!moreMenuRef.current?.contains(e.target as Node)) setMoreMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreMenuOpen]);

  // Traits derived from photographic metadata, counted across the whole registry
  const traits = useMemo(() => {
    if (!edition) return [];
    const total = publishedEditions.length || 1;
    type TraitDef = { type: string; value: string; matches: (e: DigitalEdition) => boolean };
    const isArtwork = (e: DigitalEdition) => !!e.artworkSource && e.artworkSource !== "portfolio";
    // Uploaded artwork has no camera data, so it gets a medium trait instead
    const captureDefs: TraitDef[] = isArtwork(edition)
      ? [{ type: "Medium", value: "Digital artwork", matches: isArtwork }]
      : [
          { type: "Camera", value: edition.camera, matches: (e) => e.camera === edition.camera },
          { type: "Lens", value: edition.lens, matches: (e) => e.lens === edition.lens },
          {
            type: "ISO",
            value: edition.iso ? `ISO ${edition.iso}` : "—",
            matches: (e) => e.iso === edition.iso,
          },
          {
            type: "Aperture",
            value: edition.aperture ?? "—",
            matches: (e) => e.aperture === edition.aperture,
          },
          {
            type: "Shutter speed",
            value: edition.shutterSpeed ?? "—",
            matches: (e) => e.shutterSpeed === edition.shutterSpeed,
          },
        ];
    const defs: TraitDef[] = [
      ...captureDefs,
      {
        type: "Location",
        value: edition.location ?? "—",
        matches: (e) => e.location === edition.location,
      },
      {
        type: "Edition tier",
        value:
          edition.tier === "genesis_1_of_1"
            ? "1 of 1 Genesis"
            : edition.tier === "physical_twin"
              ? "Physical twin"
              : `Limited series of ${edition.totalEditions}`,
        matches: (e) => e.tier === edition.tier,
      },
      {
        type: "Physical twin",
        value: edition.hasPhysicalTwin ? "Museum giclée included" : "Digital only",
        matches: (e) => e.hasPhysicalTwin === edition.hasPhysicalTwin,
      },
      {
        type: "Year created",
        value: String(edition.yearCreated),
        matches: (e) => e.yearCreated === edition.yearCreated,
      },
    ];

    return defs.map(({ type, value, matches }) => {
      const sharing = publishedEditions.filter(matches);
      const count = Math.max(sharing.length, 1);
      return {
        type,
        value,
        count,
        percent: (count / total) * 100,
        floorEth: Math.min(edition.priceEth, ...sharing.map((e) => e.priceEth)),
      };
    });
  }, [edition, publishedEditions]);

  const relatedEditions = useMemo(() => {
    if (!edition) return { items: [] as DigitalEdition[], fromCollection: true };
    const others = publishedEditions.filter((e) => e.id !== edition.id);
    const siblings = others.filter(
      (e) =>
        (edition.collectionName && e.collectionName === edition.collectionName) ||
        e.photographerId === edition.photographerId,
    );
    return siblings.length > 0
      ? { items: siblings.slice(0, 6), fromCollection: true }
      : { items: others.slice(0, 6), fromCollection: false };
  }, [edition, publishedEditions]);

  const handleCopy = (text: string, label: string) => {
    copyToClipboard(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: edition?.title || "NS CAPTURES Fine-Art Digital Edition",
        url: window.location.href,
      });
    } else {
      handleCopy(window.location.href, "Page link");
    }
  };

  const openCoa = (ownership: EditionOwnership | null) => {
    setActiveOwnershipForCoa(ownership);
    setCoaModalOpen(true);
  };

  const openActivityTab = () => {
    setActiveTab("activity");
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Execute Direct Purchase with Deposit Check
  const handleExecuteBuy = () => {
    if (!edition) return;
    if (!user) {
      toast.error("Please sign in or create an account to acquire digital editions.");
      navigate("/signin");
      return;
    }
    // First purchase: switch Web3 on for this account, then carry on
    if (!isWeb3Activated(user.id)) {
      requireWeb3("collector", handleExecuteBuy);
      return;
    }

    const gateCheck = checkPurchaseGate();
    if (!gateCheck.eligible) {
      toast.error("Deposit Verification Required", {
        description: gateCheck.reason || "Please deposit crypto into your Web3 address first.",
      });
      setPurchaseModalOpen(true);
      return;
    }

    setIsPurchasing(true);
    try {
      const res = purchaseEdition(
        edition.id,
        {
          id: user.id,
          name: user.name || "Verified Collector",
          email: user.email,
          walletAddress: primaryEvmAddress || undefined,
        },
        "ETH",
      );

      if (res.success && res.ownership) {
        toast.success(`Successfully Acquired: ${edition.title}`, {
          description: `Edition Serial: ${res.ownership.serialDisplay} • Cryptographic COA Issued`,
        });
        setEditions(getStoredEditions());
        setOwnerships(getStoredOwnerships());
        setActivities(getStoredActivity());
        openCoa(res.ownership);
      } else {
        toast.error(res.error || "Purchase failed.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transaction could not be completed.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleMakeOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      toast.error("Please enter a valid offer amount.");
      return;
    }
    toast.success(`Offer of ${offerAmount} ETH submitted for ${edition?.title}!`, {
      description: "The photographer will be notified via cryptographic notification desk.",
    });
    setOfferModalOpen(false);
    setOfferAmount("");
  };

  const reviewStatus = edition ? editionReviewStatus(edition) : "published";
  const isPublished = reviewStatus === "published";
  const isCreator = !!edition && isEditionCreator(edition, user);
  const canPreview = isCreator || user?.role === "Admin";

  // Unpublished editions exist only for their creator and the review team
  if (!edition || (!isPublished && !canPreview)) {
    return (
      <EditionsShell walletLabel={walletLabel}>
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md">
            <EmptyState
              title="Digital edition not found"
              description="The requested photographic edition token or masterwork could not be located in the registry."
              action={
                <Link to="/editions" className={`${primaryButtonClass} h-10 px-5 text-sm`}>
                  Back to Editions
                </Link>
              }
            />
          </div>
        </main>
      </EditionsShell>
    );
  }

  const isSoldOut = edition.availableEditions <= 0;
  const collectionHref = collectionHrefFor(edition);
  const collectionAvatar = collection?.avatarImage ?? edition.photographerAvatar;
  const contractAddress =
    collection?.contractAddress ?? "0x29f8a32490b6c12c98d7b4c9103e5a7b8e9104f1";
  const chainName = collection?.chain ?? "Ethereum";
  const tokenStandard = edition.tier === "genesis_1_of_1" ? "ERC721" : "ERC1155";
  const tokenNumber = edition.tokenId.split("-").pop() ?? edition.tokenId;

  const latestOwner = editionOwnerships[0];
  const ownerName = latestOwner?.ownerName ?? edition.photographerName;
  const ownerIsArtist = !latestOwner || latestOwner.ownerId === edition.photographerId;
  const extraOwners = Math.max(editionOwnerships.length - 1, 0);

  const collectionFloorEth = Math.min(
    edition.priceEth,
    ...(relatedEditions.fromCollection ? relatedEditions.items.map((e) => e.priceEth) : []),
  );
  const sales = editionActivity.filter((a) => a.type === "purchased");

  const chainRows: { label: string; value: string; copy?: string }[] = [
    { label: "Contract address", value: shortHex(contractAddress), copy: contractAddress },
    { label: "Token ID", value: edition.tokenId },
    { label: "Token standard", value: tokenStandard },
    { label: "Chain", value: chainName },
    { label: "Creator royalty", value: `${edition.royaltyPercent}%` },
    {
      label: "Master hash",
      value: shortHex(edition.masterHash, 14, 6),
      copy: edition.masterHash,
    },
    { label: "Minted", value: formatDate(edition.mintedAt) },
  ];

  return (
    <EditionsShell
      activeRail={activeTab === "activity" ? "activity" : undefined}
      onActivity={openActivityTab}
      walletLabel={walletLabel}
    >
      {/* ============================================================ */}
      {/* MAIN: ARTWORK (5 cols) + ITEM DETAILS (7 cols)               */}
      {/* ============================================================ */}
      <main className="grid flex-1 grid-cols-1 lg:grid-cols-12">
        <section
          aria-label="Artwork"
          className="border-b border-(--ed-border) bg-(--ed-surface) lg:col-span-5 lg:border-b-0 lg:border-r"
        >
          <div className="lg:sticky lg:top-16">
            <ArtworkPreview edition={edition} onExpand={() => setFullscreenOpen(true)} />
          </div>
        </section>

        <section className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:col-span-7">
          <motion.div
            key={edition.id}
            initial="hidden"
            animate="visible"
            variants={staggerChildren}
            className="flex max-w-[960px] flex-col gap-4"
          >
            {!isPublished && (
              <motion.div
                variants={fadeUpVariants}
                role="status"
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--ed-tone-rare-fg)/40 bg-(--ed-tone-rare-bg) px-4 py-3 text-sm"
              >
                <p className="text-(--ed-text)">
                  <span className="font-medium">
                    Not public yet · {EDITION_REVIEW_LABELS[reviewStatus]}.
                  </span>{" "}
                  <span className="text-(--ed-text-soft)">
                    Only {isCreator ? "you" : "the creator"} and the NS CAPTURES review team can see
                    this page.
                  </span>
                </p>
                <Link
                  to={isCreator ? "/editions/studio?section=editions" : "/admin"}
                  className={`${secondaryButtonClass} h-8 shrink-0 px-3 text-xs`}
                >
                  {isCreator ? "Manage edition" : "Open review queue"}
                </Link>
              </motion.div>
            )}

            <motion.h1
              variants={fadeUpVariants}
              className="text-balance text-[26px] font-medium leading-9 tracking-[0.4px] text-(--ed-text) sm:text-[32px] sm:leading-10"
            >
              {edition.title}
            </motion.h1>

            {/* Collection / owner / actions */}
            <motion.div
              variants={fadeUpVariants}
              className="relative z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                <Link
                  to={collectionHref}
                  className="flex min-w-0 items-center gap-2 text-sm font-medium tracking-[-0.15px] text-(--ed-text) transition-colors hover:text-(--ed-text-soft)"
                >
                  {collectionAvatar && (
                    <img
                      src={collectionAvatar}
                      alt=""
                      className="size-6 shrink-0 rounded-full object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
                    />
                  )}
                  <span className="truncate">
                    {edition.collectionName || "NS CAPTURES Registry"}
                  </span>
                  <VerifiedBadge />
                </Link>

                <span className="hidden h-6 w-px bg-(--ed-divider) sm:block" />

                <div className="flex min-w-0 items-center gap-1 text-sm tracking-[-0.15px]">
                  <span className="text-(--ed-muted)">Owned by</span>
                  {ownerIsArtist && edition.photographerAvatar ? (
                    <img
                      src={edition.photographerAvatar}
                      alt=""
                      className="size-5 shrink-0 rounded-full object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
                    />
                  ) : (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-(--ed-raised) text-[9px] font-medium text-(--ed-text)">
                      {initials(ownerName)}
                    </span>
                  )}
                  {ownerIsArtist ? (
                    <Link
                      to={creatorHrefFor(edition)}
                      className="truncate font-medium text-(--ed-text) transition-colors hover:text-(--ed-text-soft)"
                    >
                      {ownerName}
                    </Link>
                  ) : (
                    <span className="truncate font-medium text-(--ed-text)">{ownerName}</span>
                  )}
                  {extraOwners > 0 && <span className="text-(--ed-muted)">+{extraOwners}</span>}
                </div>
              </div>

              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => handleCopy(window.location.href, "Page link")}
                  aria-label="Copy link"
                  title="Copy link"
                  className={headerIconClass}
                >
                  <MaskIcon src={contentCopyIcon} className="size-5" />
                </button>

                <motion.button
                  type="button"
                  onClick={() => {
                    setIsFavorited(!isFavorited);
                    toast.success(
                      !isFavorited
                        ? "Added to your collection watchlist"
                        : "Removed from watchlist",
                    );
                  }}
                  animate={isFavorited ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  aria-pressed={isFavorited}
                  aria-label="Favorite"
                  title="Favorite"
                  className={`flex items-center transition-colors ${isFavorited ? "text-[#ff5c8a]" : "text-(--ed-text) hover:text-(--ed-text-soft)"}`}
                >
                  <MaskIcon src={favoriteIcon} className="size-[22px]" />
                </motion.button>

                <div ref={moreMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMoreMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={moreMenuOpen}
                    aria-label="More options"
                    className={headerIconClass}
                  >
                    <MaskIcon src={moreHorizIcon} className="size-5" />
                  </button>
                  <AnimatePresence>
                    {moreMenuOpen && (
                      <motion.div
                        role="menu"
                        initial={{ opacity: 0, scale: 0.96, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
                        transition={{ type: "spring", duration: 0.25, bounce: 0 }}
                        style={{ transformOrigin: "top right" }}
                        className="absolute right-0 top-8 z-20 w-56 rounded-lg border border-(--ed-border) bg-(--ed-surface) p-1 shadow-(--ed-shadow)"
                      >
                        {[
                          { label: "View full size", onSelect: () => setFullscreenOpen(true) },
                          {
                            label: "Inspect certificate (COA)",
                            onSelect: () => openCoa(editionOwnerships[0] || null),
                          },
                          { label: "Share", onSelect: handleShare },
                          {
                            label: "View collection",
                            onSelect: () => navigate(collectionHref),
                          },
                        ].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMoreMenuOpen(false);
                              item.onSelect();
                            }}
                            className="block w-full rounded-md px-3 py-2 text-left text-sm text-(--ed-text) transition-colors hover:bg-(--ed-hover)"
                          >
                            {item.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Token chips */}
            <motion.div variants={fadeUpVariants} className="flex flex-wrap gap-2">
              <Chip>{tokenStandard}</Chip>
              <Chip icon={ethereumIcon}>{chainName}</Chip>
              <Chip>Token #{tokenNumber}</Chip>
            </motion.div>

            {/* Price card */}
            <motion.div variants={fadeUpVariants} className="pt-2">
              <div className="flex flex-col gap-4 rounded-lg border border-(--ed-border) bg-(--ed-surface) p-4">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label="Best offer" value={formatEth(edition.priceEth * 0.85)} />
                  <Stat
                    label="Last sale"
                    value={editionOwnerships.length > 0 ? formatEth(edition.priceEth) : "—"}
                  />
                  <Stat label="Collection floor" value={formatEth(collectionFloorEth)} />
                  <Stat label="Royalty" value={`${edition.royaltyPercent}%`} muted alignEnd />
                </dl>

                <div className="h-px bg-(--ed-divider)" />

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <span className={monoLabelClass}>Buy for</span>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono text-[32px] font-medium leading-10 text-(--ed-text)">
                        {formatEth(edition.priceEth)}
                      </span>
                      <span className="font-mono text-sm text-(--ed-muted)">
                        ≈ {formatGbp(edition.priceGbp)}
                      </span>
                      <Chip>
                        {isSoldOut
                          ? "Sold out"
                          : edition.salesPaused
                            ? "Sales paused"
                            : `${edition.availableEditions} of ${edition.totalEditions} available`}
                      </Chip>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setOfferModalOpen(true)}
                      className={`${secondaryButtonClass} h-12 px-6 text-base tracking-[-0.31px] sm:flex-[356_1_0%]`}
                    >
                      Make Offer
                    </button>
                    <button
                      type="button"
                      disabled={isSoldOut || isPurchasing || !isPublished || !!edition.salesPaused}
                      onClick={handleExecuteBuy}
                      className={`${primaryButtonClass} h-12 px-6 text-base tracking-[-0.31px] sm:flex-[308_1_0%]`}
                    >
                      {isPurchasing
                        ? "Processing…"
                        : isSoldOut
                          ? "Sold Out"
                          : edition.salesPaused
                            ? "Not for sale"
                            : "Buy Now"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Tabs */}
            <motion.div ref={tabsRef} variants={fadeUpVariants} className="scroll-mt-20">
              <TabBar
                label="Item sections"
                tabs={DETAIL_TABS}
                active={activeTab}
                onChange={setActiveTab}
              />

              <AnimatePresence mode="wait" initial={false}>
                {/* ---------------- Details ---------------- */}
                {activeTab === "details" && (
                  <motion.div
                    key="details"
                    role="tabpanel"
                    {...panelMotion}
                    className="flex flex-col gap-2 pt-6"
                  >
                    <DetailSection
                      icon={traitsIcon}
                      iconClassName="text-(--ed-text)"
                      title="Traits"
                      open={openSections.traits}
                      onToggle={() => toggleSection("traits")}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm uppercase leading-[17.5px] text-(--ed-text)">
                              Traits
                            </span>
                            <span className="text-sm text-(--ed-muted)">{traits.length}</span>
                          </div>
                          <div role="radiogroup" aria-label="Trait layout" className="flex">
                            {(
                              [
                                { id: "grid", label: "Grid view", icon: gridViewIcon },
                                { id: "table", label: "Table view", icon: tableRowsIcon },
                              ] as const
                            ).map((option) => {
                              const checked = traitsView === option.id;
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={checked}
                                  aria-label={option.label}
                                  title={option.label}
                                  onClick={() => setTraitsView(option.id)}
                                  className={`flex size-8 items-center justify-center rounded-full border transition-colors ${
                                    checked
                                      ? "border-(--ed-border) bg-(--ed-surface) text-(--ed-text)"
                                      : "border-transparent text-(--ed-muted) hover:text-(--ed-text)"
                                  }`}
                                >
                                  <MaskIcon src={option.icon} className="size-5" />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {traitsView === "grid" ? (
                          <motion.ul
                            key="traits-grid"
                            initial="hidden"
                            animate="visible"
                            variants={traitsStagger}
                            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
                          >
                            {traits.map((trait) => (
                              <motion.li
                                key={trait.type}
                                variants={fadeUpVariants}
                                className="flex min-w-0 flex-col rounded-lg border border-(--ed-border) bg-(--ed-bg) p-4 transition-[border-color,translate] duration-150 ease-out hover:-translate-y-0.5 hover:border-(--ed-border-strong) motion-reduce:hover:translate-y-0"
                              >
                                <span className="truncate text-xs uppercase leading-[18px] text-(--ed-muted)">
                                  {trait.type}
                                </span>
                                <span
                                  className="truncate pt-1 text-sm leading-[21px] tracking-[-0.15px] text-(--ed-text)"
                                  title={trait.value}
                                >
                                  {trait.value}
                                </span>
                                <div className="flex items-center justify-between gap-2 pt-3">
                                  <span
                                    className={`inline-flex h-[22px] items-center gap-2 rounded px-1.5 font-mono text-sm uppercase leading-[14px] ${traitTone(trait.percent)}`}
                                  >
                                    <span className="text-(--ed-text)">
                                      {trait.count.toLocaleString("en-US")}
                                    </span>
                                    <span>{formatPercent(trait.percent)}</span>
                                  </span>
                                  <span className="font-mono text-sm leading-[21px] text-(--ed-text)">
                                    {formatEth(trait.floorEth)}
                                  </span>
                                </div>
                              </motion.li>
                            ))}
                          </motion.ul>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-(--ed-border)">
                            <table className="w-full text-left text-sm">
                              <thead className={tableHeadClass}>
                                <tr>
                                  <th className="px-4 py-3 font-normal">Trait</th>
                                  <th className="px-4 py-3 font-normal">Value</th>
                                  <th className="px-4 py-3 font-normal">Count</th>
                                  <th className="px-4 py-3 text-right font-normal">Floor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {traits.map((trait) => (
                                  <tr
                                    key={trait.type}
                                    className="border-t border-(--ed-border) transition-colors hover:bg-(--ed-hover)"
                                  >
                                    <td className="whitespace-nowrap px-4 py-3 text-xs uppercase text-(--ed-muted)">
                                      {trait.type}
                                    </td>
                                    <td className="px-4 py-3 text-(--ed-text)">{trait.value}</td>
                                    <td className="whitespace-nowrap px-4 py-3">
                                      <span
                                        className={`inline-flex h-[22px] items-center gap-2 rounded px-1.5 font-mono text-sm leading-[14px] ${traitTone(trait.percent)}`}
                                      >
                                        <span className="text-(--ed-text)">{trait.count}</span>
                                        <span>{formatPercent(trait.percent)}</span>
                                      </span>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-(--ed-text)">
                                      {formatEth(trait.floorEth)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </DetailSection>

                    <DetailSection
                      icon={attachMoneyIcon}
                      title="Price history"
                      open={openSections.priceHistory}
                      onToggle={() => toggleSection("priceHistory")}
                    >
                      {sales.length === 0 ? (
                        <p className="text-sm text-(--ed-muted)">
                          No sales recorded for this edition yet.
                        </p>
                      ) : (
                        <ul className="divide-y divide-(--ed-border) rounded-lg border border-(--ed-border)">
                          {sales.map((sale) => (
                            <li
                              key={sale.id}
                              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                            >
                              <span className="text-(--ed-muted)">
                                {formatDate(sale.timestamp)}
                              </span>
                              <span className="truncate text-(--ed-text)">
                                {sale.toUser ?? "Collector"}
                              </span>
                              <span className="font-mono text-(--ed-text)">
                                {formatGbp(sale.price ?? 0)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </DetailSection>

                    <DetailSection
                      icon={editNoteIcon}
                      title="About"
                      open={openSections.about}
                      onToggle={() => toggleSection("about")}
                    >
                      <div className="flex flex-col gap-4 text-sm leading-6 text-(--ed-muted)">
                        <p>{edition.description}</p>
                        {edition.curatorNote && (
                          <div className="rounded-lg border border-(--ed-border) bg-(--ed-bg) p-3">
                            <p className={monoLabelClass}>Curator's note</p>
                            <p className="mt-1 text-(--ed-text)">{edition.curatorNote}</p>
                          </div>
                        )}
                        {edition.physicalPrintDetails && (
                          <div className="rounded-lg border border-(--ed-border) bg-(--ed-bg) p-3">
                            <p className={monoLabelClass}>Physical twin</p>
                            <p className="mt-1 text-(--ed-text)">{edition.physicalPrintDetails}</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-3 border-t border-(--ed-border) pt-4">
                          <div className="flex min-w-0 items-center gap-3">
                            {edition.photographerAvatar ? (
                              <img
                                src={edition.photographerAvatar}
                                alt=""
                                className="size-10 shrink-0 rounded-full object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
                              />
                            ) : (
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--ed-raised) text-xs font-medium text-(--ed-text)">
                                {initials(edition.photographerName)}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-(--ed-text)">
                                {edition.photographerName}
                              </p>
                              <p className="text-xs">Photographer</p>
                            </div>
                          </div>
                          <Link
                            to={creatorHrefFor(edition)}
                            className={`${secondaryButtonClass} h-9 shrink-0 px-4 text-sm`}
                          >
                            View profile
                          </Link>
                        </div>
                      </div>
                    </DetailSection>

                    <DetailSection
                      icon={tileMediumIcon}
                      title="Blockchain details"
                      open={openSections.chain}
                      onToggle={() => toggleSection("chain")}
                    >
                      <dl className="divide-y divide-(--ed-border)">
                        {chainRows.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between gap-4 py-2.5 text-sm"
                          >
                            <dt className="text-(--ed-muted)">{row.label}</dt>
                            <dd className="flex min-w-0 items-center gap-2 font-mono text-(--ed-text)">
                              <span className="truncate">{row.value}</span>
                              {row.copy && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(row.copy!, row.label)}
                                  aria-label={`Copy ${row.label.toLowerCase()}`}
                                  className="shrink-0 text-(--ed-muted) transition-colors hover:text-(--ed-text)"
                                >
                                  <MaskIcon src={contentCopyIcon} className="size-4" />
                                </button>
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </DetailSection>

                    <DetailSection
                      icon={gridViewIcon}
                      title="More from this collection"
                      open={openSections.more}
                      onToggle={() => toggleSection("more")}
                    >
                      {!relatedEditions.fromCollection && (
                        <p className="pb-3 text-sm text-(--ed-muted)">
                          This is the only edition in its collection so far. Other editions on NS
                          CAPTURES:
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {relatedEditions.items.map((item) => (
                          <EditionCard key={item.id} edition={item} />
                        ))}
                      </div>
                    </DetailSection>
                  </motion.div>
                )}

                {/* ---------------- Orders ---------------- */}
                {activeTab === "orders" && (
                  <motion.div key="orders" role="tabpanel" {...panelMotion} className="pt-6">
                    {editionOwnerships.length === 0 ? (
                      <EmptyState
                        title="No orders yet"
                        description="Be the first collector of this edition."
                      />
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-(--ed-border) bg-(--ed-surface)">
                        <table className="w-full text-left text-sm">
                          <thead className={tableHeadClass}>
                            <tr>
                              <th className="px-4 py-3 font-normal">Serial</th>
                              <th className="px-4 py-3 font-normal">Collector</th>
                              <th className="px-4 py-3 font-normal">Price</th>
                              <th className="px-4 py-3 font-normal">Acquired</th>
                              <th className="px-4 py-3 text-right font-normal">
                                <span className="sr-only">Certificate</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {editionOwnerships.map((own) => (
                              <tr
                                key={own.id}
                                className="border-t border-(--ed-border) transition-colors hover:bg-(--ed-hover)"
                              >
                                <td className="whitespace-nowrap px-4 py-3 font-mono text-(--ed-text)">
                                  {own.serialDisplay}
                                </td>
                                <td className="px-4 py-3 text-(--ed-text)">{own.ownerName}</td>
                                <td className="whitespace-nowrap px-4 py-3 font-mono text-(--ed-text)">
                                  {formatGbp(own.purchasePriceGbp)}
                                  <span className="pl-1.5 text-xs text-(--ed-muted)">
                                    via {own.purchaseCurrency}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-(--ed-muted)">
                                  {formatDate(own.acquiredAt)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => openCoa(own)}
                                    className={`${secondaryButtonClass} h-8 px-3 text-xs`}
                                  >
                                    View COA
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ---------------- Activity ---------------- */}
                {activeTab === "activity" && (
                  <motion.div key="activity" role="tabpanel" {...panelMotion} className="pt-6">
                    <ActivityTable activities={editionActivity} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* ============================================================ */}
      {/* MODALS (COA, Full screen, Offers, Deposit Warning)           */}
      {/* ============================================================ */}

      {coaModalOpen && (
        <CertificateOfAuthenticityModal
          edition={edition}
          ownership={activeOwnershipForCoa || sampleOwnershipFor(edition)}
          onClose={() => setCoaModalOpen(false)}
        />
      )}

      <ArtworkLightbox edition={edition} open={fullscreenOpen} onClose={closeFullscreen} />

      {offerModalOpen && (
        <EditionsModal
          eyebrow="Make an offer"
          title={edition.title}
          onClose={() => setOfferModalOpen(false)}
        >
          <form onSubmit={handleMakeOffer} className="flex flex-col gap-4">
            <p className="text-sm leading-6 text-(--ed-muted)">
              Offers go to {edition.photographerName}. The listed price is{" "}
              {formatEth(edition.priceEth)}.
            </p>
            <div>
              <label htmlFor="offer-amount" className={`${monoLabelClass} mb-2 block`}>
                Offer amount (ETH)
              </label>
              <div className="relative">
                <input
                  id="offer-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder={(edition.priceEth * 0.85).toFixed(2)}
                  className={`${inputClass} pr-14 font-mono`}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm text-(--ed-muted)">
                  ETH
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOfferModalOpen(false)}
                className={`${secondaryButtonClass} h-10 px-5 text-sm`}
              >
                Cancel
              </button>
              <button type="submit" className={`${primaryButtonClass} h-10 px-5 text-sm`}>
                Submit offer
              </button>
            </div>
          </form>
        </EditionsModal>
      )}

      {purchaseModalOpen && (
        <EditionsModal
          eyebrow="Collector verification"
          title="Web3 deposit required"
          onClose={() => setPurchaseModalOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setPurchaseModalOpen(false)}
                className={`${secondaryButtonClass} h-10 px-5 text-sm`}
              >
                Close
              </button>
              <Link to="/account?tab=vault" className={`${primaryButtonClass} h-10 px-5 text-sm`}>
                Go to vault deposit
              </Link>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgba(255,138,0,0.2)] text-(--ed-warning)">
                <Coins className="size-5" />
              </span>
              <p className="text-sm leading-6 text-(--ed-muted)">
                To acquire on-platform digital editions, an active crypto deposit is required in
                your Web3 vault (min: {depositConfig.ethThreshold} ETH, {depositConfig.solThreshold}{" "}
                SOL, or {depositConfig.usdtThreshold} USDT).
              </p>
            </div>

            {primaryEvmAddress ? (
              <div className="flex flex-col gap-1.5 rounded-lg border border-(--ed-border) bg-(--ed-bg) p-3">
                <span className={monoLabelClass}>Your Web3 deposit address</span>
                <div className="flex items-center justify-between gap-2 font-mono text-xs text-(--ed-text)">
                  <span className="truncate">{primaryEvmAddress}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(primaryEvmAddress, "Deposit address")}
                    aria-label="Copy deposit address"
                    className="shrink-0 text-(--ed-muted) transition-colors hover:text-(--ed-text)"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-(--ed-muted)">
                You don't have a vault wallet yet. Create one from your account to get a deposit
                address.
              </p>
            )}
          </div>
        </EditionsModal>
      )}
      {activationModal}
    </EditionsShell>
  );
}
