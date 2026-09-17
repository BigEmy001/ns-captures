import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  getStoredOwnerships,
  getStoredActivity,
  getEditionCollection,
  getEditionsByCollection,
  getPublicEditionCollections,
  gbpToNsc,
  isCollectionCreator,
  isEditionForSale,
  isWeb3Activated,
  purchaseEdition,
  type DigitalEdition,
  type EditionOwnership,
  type EditionCollectionMeta,
} from "../data/editions";
import { CertificateOfAuthenticityModal } from "../components/CertificateOfAuthenticityModal";
import { MaskIcon } from "../components/MaskIcon";
import { EditionsShell } from "../components/editions/EditionsShell";
import {
  ActivityTable,
  Chip,
  EditionCard,
  EmptyState,
  FilterGroup,
  SegmentedControl,
  Stat,
  TabBar,
  VerifiedBadge,
} from "../components/editions/editionsUi";
import {
  creatorHref,
  fadeUpVariants,
  formatNsc,
  inputClass,
  monoLabelClass,
  primaryButtonClass,
  sampleOwnershipFor,
  secondaryButtonClass,
  selectClass,
  shortHex,
  PRICE_CURRENCY_OPTIONS,
  type PriceCurrency,
} from "../components/editions/editionsFormat";
import { useEditionVault } from "../components/editions/useEditionVault";
import { useWeb3Activation } from "../components/editions/useWeb3Activation";
import { useAuth } from "../context/AuthContext";
import { copyToClipboard } from "../../lib/clipboard";
import contentCopyIcon from "../../assets/edition-detail/content-copy.svg";
import favoriteIcon from "../../assets/edition-detail/favorite.svg";
import searchIcon from "../../assets/edition-detail/search.svg";
import gridViewIcon from "../../assets/edition-detail/grid-view.svg";
import tileMediumIcon from "../../assets/edition-detail/tile-medium.svg";
import ethereumIcon from "../../assets/edition-detail/ethereum.svg";
import chevronLeftIcon from "../../assets/edition-detail/chevron-left.svg";

type CollectionTab = "items" | "analytics" | "activity";
type SortKey = "price_asc" | "price_desc" | "scarcity" | "newest";
type StatusFilter = "all" | "buy_now" | "has_offers";
type FilterGroupKey = "status" | "price" | "camera" | "lens" | "location" | "tier";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "price_asc", label: "Price: low to high" },
  { id: "price_desc", label: "Price: high to low" },
  { id: "scarcity", label: "Edition scarcity" },
  { id: "newest", label: "Recently created" },
];

const STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "buy_now", label: "Buy now" },
  { id: "has_offers", label: "Offers" },
] as const;

const TIER_OPTIONS = [
  { value: "genesis_1_of_1", label: "Genesis 1 of 1" },
  { value: "limited_series", label: "Limited series" },
  { value: "physical_twin", label: "Physical twin" },
];

const VOLUME_BARS = [32, 45, 28, 65, 80, 52, 94, 76, 88, 110, 95, 142];

const ANALYTICS_HIGHLIGHTS = [
  { label: "All-time high sale", value: "2.40 ETH", note: "Kyoto Nocturne #01", positive: false },
  { label: "24h sales volume", value: "18.6 ETH", note: "+28.4% vs last week", positive: true },
  {
    label: "Royalties paid",
    value: "14.25 ETH",
    note: "10% distributed directly",
    positive: false,
  },
];

const headerIconClass =
  "flex items-center text-(--ed-text) transition-colors hover:text-(--ed-text-soft)";

function CheckboxList({
  options,
  selected,
  onToggle,
  countFor,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  countFor: (value: string) => number;
}) {
  if (options.length === 0) return <p className="text-sm text-(--ed-muted)">No options</p>;

  return (
    <ul className="-mx-2 flex max-h-48 flex-col gap-0.5 overflow-y-auto">
      {options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <li key={option.value}>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-(--ed-hover)">
              <span className="flex min-w-0 items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(option.value)}
                  className="size-4 shrink-0 accent-(--ed-primary)"
                />
                <span className={`truncate ${checked ? "text-(--ed-text)" : "text-(--ed-muted)"}`}>
                  {option.label}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs text-(--ed-muted)">
                {countFor(option.value)}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export function EditionCollection() {
  const { id = "" } = useParams<{ id: string }>();
  const { user } = useAuth();
  const collection = getEditionCollection(id);
  // Creator collections stay private until one of their editions is published
  const visible =
    !!collection &&
    (!collection.createdBy ||
      isCollectionCreator(collection, user) ||
      user?.role === "Admin" ||
      getEditionsByCollection(collection.id).length > 0);

  if (!collection || !visible) {
    return (
      <EditionsShell activeRail="collections">
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md">
            <EmptyState
              title="Collection not found"
              description="This collection doesn't exist or isn't public yet."
              action={
                <Link
                  to="/editions/collection"
                  className={`${primaryButtonClass} h-10 px-5 text-sm`}
                >
                  Browse collections
                </Link>
              }
            />
          </div>
        </main>
      </EditionsShell>
    );
  }

  return <CollectionPage key={collection.id} collection={collection} />;
}

function CollectionPage({ collection }: { collection: EditionCollectionMeta }) {
  const navigate = useNavigate();
  const { user, walletLabel, primaryEvmAddress, checkPurchaseGate } = useEditionVault();
  const { requireWeb3, activationModal } = useWeb3Activation();

  const allCollections = useMemo(() => getPublicEditionCollections(), []);

  // Inventory for this collection: re-read from storage on route change or after a purchase
  const [inventory, setInventory] = useState(() => ({
    collectionId: collection.id,
    items: getEditionsByCollection(collection.id),
  }));
  if (inventory.collectionId !== collection.id) {
    setInventory({ collectionId: collection.id, items: getEditionsByCollection(collection.id) });
  }
  const editions = inventory.items;

  const [activeTab, setActiveTab] = useState<CollectionTab>("items");

  // Filters
  // The filter sidebar starts open only where it sits beside the grid (lg and up)
  const [showFilters, setShowFilters] = useState(
    () => typeof window === "undefined" || window.matchMedia("(min-width: 1024px)").matches,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceCurrency, setPriceCurrency] = useState<PriceCurrency>("nsc");
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [selectedLenses, setSelectedLenses] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [hasPhysicalTwinOnly, setHasPhysicalTwinOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("price_asc");
  const [gridDensity, setGridDensity] = useState<"large" | "compact">("large");
  const [openGroups, setOpenGroups] = useState<Record<FilterGroupKey, boolean>>({
    status: true,
    price: true,
    camera: true,
    lens: false,
    location: false,
    tier: false,
  });
  const toggleGroup = (key: FilterGroupKey) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [activeCertData, setActiveCertData] = useState<{
    edition: DigitalEdition;
    ownership: EditionOwnership;
  } | null>(null);

  // Collection stats
  const stats = useMemo(() => {
    const totalItems = editions.length;
    const available = editions.filter((e) => e.availableEditions > 0);
    const listedPercent = totalItems > 0 ? Math.round((available.length / totalItems) * 100) : 0;
    // In NSC from the £ list prices. No floor when nothing is for sale, and volume is only what
    // has actually sold (these used to fall back to made-up ETH figures).
    const floorGbp = available.length > 0 ? Math.min(...available.map((e) => e.priceGbp)) : null;
    const soldGbp = editions.reduce(
      (sum, e) => sum + (e.totalEditions - e.availableEditions) * e.priceGbp,
      0,
    );
    const ownerIds = new Set(
      getStoredOwnerships()
        .filter((o) => editions.some((e) => e.id === o.editionId))
        .map((o) => o.ownerId),
    );

    return {
      totalItems,
      listedPercent,
      floorNsc: floorGbp !== null ? gbpToNsc(floorGbp) : null,
      bestOfferNsc: floorGbp !== null ? gbpToNsc(floorGbp * 0.9) : null,
      totalVolumeNsc: gbpToNsc(soldGbp),
      uniqueOwnersCount: Math.max(ownerIds.size, 14),
    };
  }, [editions]);

  const traitOptions = useMemo(() => {
    const unique = (values: (string | undefined)[]) =>
      Array.from(new Set(values.filter((v): v is string => Boolean(v)))).map((value) => ({
        value,
        label: value,
      }));
    return {
      cameras: unique(editions.map((e) => e.camera)),
      lenses: unique(editions.map((e) => e.lens)),
      locations: unique(editions.map((e) => e.location)),
    };
  }, [editions]);

  const filteredEditions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return editions
      .filter((item) => {
        if (
          q &&
          ![item.title, item.tokenId, item.photographerName].some((v) =>
            v.toLowerCase().includes(q),
          )
        ) {
          return false;
        }
        if (statusFilter === "buy_now" && !isEditionForSale(item)) return false;
        if (statusFilter === "has_offers" && item.tier !== "genesis_1_of_1") return false;

        const price =
          priceCurrency === "eth"
            ? item.priceEth
            : priceCurrency === "gbp"
              ? item.priceGbp
              : gbpToNsc(item.priceGbp);
        if (minPrice && price < parseFloat(minPrice)) return false;
        if (maxPrice && price > parseFloat(maxPrice)) return false;

        if (selectedCameras.length > 0 && !selectedCameras.includes(item.camera)) return false;
        if (selectedLenses.length > 0 && !selectedLenses.includes(item.lens)) return false;
        if (
          selectedLocations.length > 0 &&
          (!item.location || !selectedLocations.includes(item.location))
        ) {
          return false;
        }
        if (selectedTiers.length > 0 && !selectedTiers.includes(item.tier)) return false;
        if (hasPhysicalTwinOnly && !item.hasPhysicalTwin) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") return a.priceGbp - b.priceGbp;
        if (sortBy === "price_desc") return b.priceGbp - a.priceGbp;
        if (sortBy === "scarcity") return a.totalEditions - b.totalEditions;
        return b.yearCreated - a.yearCreated;
      });
  }, [
    editions,
    searchQuery,
    statusFilter,
    priceCurrency,
    minPrice,
    maxPrice,
    selectedCameras,
    selectedLenses,
    selectedLocations,
    selectedTiers,
    hasPhysicalTwinOnly,
    sortBy,
  ]);

  const collectionActivity = useMemo(() => {
    const ids = new Set(editions.map((e) => e.id));
    return getStoredActivity().filter((a) => ids.has(a.editionId));
  }, [editions]);

  const toggleIn = (setter: Dispatch<SetStateAction<string[]>>) => (value: string) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  const toggleCamera = toggleIn(setSelectedCameras);
  const toggleLens = toggleIn(setSelectedLenses);
  const toggleLocation = toggleIn(setSelectedLocations);
  const toggleTier = toggleIn(setSelectedTiers);

  const filterPills: { key: string; label: string; onRemove: () => void }[] = [
    ...(statusFilter !== "all"
      ? [
          {
            key: "status",
            label: statusFilter === "buy_now" ? "Buy now" : "Has offers",
            onRemove: () => setStatusFilter("all"),
          },
        ]
      : []),
    ...(minPrice || maxPrice
      ? [
          {
            key: "price",
            label: `${minPrice || "0"}–${maxPrice || "∞"} ${priceCurrency.toUpperCase()}`,
            onRemove: () => {
              setMinPrice("");
              setMaxPrice("");
            },
          },
        ]
      : []),
    ...selectedCameras.map((v) => ({
      key: `camera-${v}`,
      label: v,
      onRemove: () => toggleCamera(v),
    })),
    ...selectedLenses.map((v) => ({ key: `lens-${v}`, label: v, onRemove: () => toggleLens(v) })),
    ...selectedLocations.map((v) => ({
      key: `location-${v}`,
      label: v,
      onRemove: () => toggleLocation(v),
    })),
    ...selectedTiers.map((v) => ({
      key: `tier-${v}`,
      label: TIER_OPTIONS.find((t) => t.value === v)?.label ?? v,
      onRemove: () => toggleTier(v),
    })),
    ...(hasPhysicalTwinOnly
      ? [{ key: "twin", label: "Physical twin", onRemove: () => setHasPhysicalTwinOnly(false) }]
      : []),
  ];

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setSelectedCameras([]);
    setSelectedLenses([]);
    setSelectedLocations([]);
    setSelectedTiers([]);
    setHasPhysicalTwinOnly(false);
  };

  // Buy now with deposit check
  const handleInstantCollect = (item: DigitalEdition) => {
    if (item.availableEditions === 0) {
      toast.error("This numbered edition has already been acquired.");
      return;
    }
    if (item.salesPaused) {
      toast.error("The creator has paused sales of this edition.");
      return;
    }
    if (!user) {
      toast.error("Please sign in or connect your wallet to acquire digital editions.");
      navigate("/signin");
      return;
    }
    // First purchase: switch Web3 on for this account, then carry on
    if (!isWeb3Activated(user.id)) {
      requireWeb3("collector", () => handleInstantCollect(item));
      return;
    }

    const gateCheck = checkPurchaseGate();
    if (!gateCheck.eligible) {
      toast.error("Deposit Verification Required", {
        description: gateCheck.reason || "Please deposit crypto into your Web3 address first.",
      });
      return;
    }

    const res = purchaseEdition(
      item.id,
      {
        id: user.id,
        name: user.name || "Verified Collector",
        email: user.email,
        walletAddress: primaryEvmAddress || undefined,
      },
      "ETH",
    );

    if (res.success && res.ownership) {
      toast.success(`Successfully Acquired: ${item.title}`, {
        description: `Certificate ${res.ownership.certificateNumber} issued to your account.`,
      });
      setInventory({ collectionId: collection.id, items: getEditionsByCollection(collection.id) });
      setActiveCertData({ edition: item, ownership: res.ownership });
    } else {
      toast.error(res.error || "Purchase failed.");
    }
  };

  const openCertificate = (edition: DigitalEdition) => {
    setActiveCertData({
      edition,
      ownership:
        getStoredOwnerships().find((o) => o.editionId === edition.id) ||
        sampleOwnershipFor(edition),
    });
  };

  const createdLabel = new Date(collection.createdAt).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
  const isLongDescription = collection.description.length > 180;
  const maxBar = Math.max(...VOLUME_BARS);

  return (
    <EditionsShell
      activeRail={activeTab === "activity" ? "activity" : "collections"}
      onActivity={() => setActiveTab("activity")}
      walletLabel={walletLabel}
    >
      <main className="flex-1 pb-16">
        {/* ============================================================ */}
        {/* BANNER + IDENTITY                                            */}
        {/* ============================================================ */}
        <div className="relative h-[180px] overflow-hidden border-b border-(--ed-border) bg-(--ed-surface) sm:h-[260px]">
          <motion.img
            key={collection.bannerImage}
            src={collection.bannerImage}
            alt=""
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.2, 0, 0, 1] }}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-(--ed-bg) via-(--ed-bg)/20 to-transparent" />
        </div>

        <div className="px-4 sm:px-6">
          <motion.div
            key={collection.id}
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            className="relative -mt-12 flex flex-col gap-4 sm:-mt-14"
          >
            <img
              src={collection.avatarImage}
              alt=""
              className="size-24 rounded-xl border-4 border-(--ed-bg) bg-(--ed-surface) object-cover sm:size-28"
            />

            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
              <div className="flex min-w-0 flex-col gap-2">
                <h1 className="flex min-w-0 items-center gap-2 text-[26px] font-medium leading-9 tracking-[0.4px] text-(--ed-text) sm:text-[32px] sm:leading-10">
                  <span className="truncate">{collection.name}</span>
                  <VerifiedBadge className="size-5 shrink-0" />
                </h1>
                <p className="text-sm tracking-[-0.15px] text-(--ed-muted)">
                  By{" "}
                  <Link
                    to={creatorHref(collection.photographerId)}
                    className="font-medium text-(--ed-text) transition-colors hover:text-(--ed-text-soft)"
                  >
                    {collection.photographerName}
                  </Link>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip icon={ethereumIcon}>{collection.chain}</Chip>
                  <Chip>Created {createdLabel}</Chip>
                  <Chip>Royalty {collection.royaltyPercent}%</Chip>
                  <Chip>{shortHex(collection.contractAddress)}</Chip>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => {
                    copyToClipboard(window.location.href);
                    toast.success("Collection link copied to clipboard");
                  }}
                  aria-label="Copy collection link"
                  title="Copy link"
                  className={headerIconClass}
                >
                  <MaskIcon src={contentCopyIcon} className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsWatchlisted(!isWatchlisted);
                    toast.success(
                      isWatchlisted
                        ? "Removed from watchlist"
                        : "Added to your collection watchlist",
                    );
                  }}
                  aria-pressed={isWatchlisted}
                  aria-label="Watchlist collection"
                  title="Watchlist"
                  className={`flex items-center transition-colors ${isWatchlisted ? "text-[#ff5c8a]" : "text-(--ed-text) hover:text-(--ed-text-soft)"}`}
                >
                  <MaskIcon src={favoriteIcon} className="size-[22px]" />
                </button>
              </div>
            </div>

            <p className="max-w-3xl text-sm leading-6 text-(--ed-muted)">
              {showFullDesc || !isLongDescription
                ? collection.description
                : `${collection.description.slice(0, 180).trimEnd()}…`}
              {isLongDescription && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => setShowFullDesc((v) => !v)}
                    className="text-sm font-medium text-(--ed-text) transition-colors hover:text-(--ed-text-soft)"
                  >
                    {showFullDesc ? "Show less" : "Read more"}
                  </button>
                </>
              )}
            </p>
          </motion.div>

          {/* Stats */}
          <motion.dl
            key={`stats-${collection.id}`}
            initial="hidden"
            animate="visible"
            custom={0.1}
            variants={fadeUpVariants}
            className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-(--ed-border) bg-(--ed-surface) p-4 sm:grid-cols-3 lg:grid-cols-6"
          >
            <Stat
              label="Floor price"
              value={stats.floorNsc !== null ? formatNsc(stats.floorNsc) : "—"}
            />
            <Stat
              label="Best offer"
              value={stats.bestOfferNsc !== null ? formatNsc(stats.bestOfferNsc) : "—"}
            />
            <Stat label="Total volume" value={formatNsc(stats.totalVolumeNsc)} />
            <Stat label="Listed" value={`${stats.listedPercent}%`} />
            <Stat label="Owners" value={stats.uniqueOwnersCount} />
            <Stat label="Items" value={stats.totalItems} />
          </motion.dl>

          {/* Tabs */}
          <div className="mt-6">
            <TabBar<CollectionTab>
              label="Collection sections"
              tabs={[
                { id: "items", label: "Items", count: filteredEditions.length },
                { id: "analytics", label: "Analytics" },
                { id: "activity", label: "Activity" },
              ]}
              active={activeTab}
              onChange={setActiveTab}
              trailing={
                <>
                  <span className={monoLabelClass}>Series</span>
                  {allCollections.map((col) => {
                    const current = col.id === collection.id;
                    return (
                      <Link
                        key={col.id}
                        to={`/editions/collection/${col.id}`}
                        aria-current={current ? "page" : undefined}
                        className={`h-7 rounded-full border px-3 text-xs font-medium leading-[26px] transition-colors ${
                          current
                            ? "border-(--ed-text) bg-(--ed-text) text-(--ed-bg)"
                            : "border-(--ed-border) text-(--ed-muted) hover:text-(--ed-text)"
                        }`}
                      >
                        {col.name.split(" ")[0]}
                      </Link>
                    );
                  })}
                </>
              }
            />
          </div>

          {/* ============================================================ */}
          {/* ITEMS                                                        */}
          {/* ============================================================ */}
          {activeTab === "items" && (
            <div>
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-2 sm:max-w-xl">
                  <button
                    type="button"
                    onClick={() => setShowFilters((v) => !v)}
                    aria-expanded={showFilters}
                    className={`${secondaryButtonClass} h-10 shrink-0 px-4 text-sm`}
                  >
                    Filters
                    {filterPills.length > 0 && (
                      <span className="rounded-full bg-(--ed-text) px-1.5 font-mono text-xs leading-5 text-(--ed-bg)">
                        {filterPills.length}
                      </span>
                    )}
                  </button>
                  <label className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-(--ed-border) bg-(--ed-surface) px-3 transition-colors focus-within:border-(--ed-primary)">
                    <MaskIcon src={searchIcon} className="size-4 text-(--ed-muted)" />
                    <span className="sr-only">Search items</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by title, artist or token ID"
                      className="min-w-0 flex-1 bg-transparent text-sm text-(--ed-text) outline-none placeholder:text-(--ed-muted)"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear search"
                        className="text-lg leading-none text-(--ed-muted) transition-colors hover:text-(--ed-text)"
                      >
                        ×
                      </button>
                    )}
                  </label>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <label className="relative">
                    <span className="sr-only">Sort items</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      className={selectClass}
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <MaskIcon
                      src={chevronLeftIcon}
                      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 -rotate-90 text-(--ed-muted)"
                    />
                  </label>
                  <div
                    role="radiogroup"
                    aria-label="Grid density"
                    className="hidden items-center rounded-full border border-(--ed-border) bg-(--ed-surface) p-0.5 sm:flex"
                  >
                    {(
                      [
                        { id: "large", label: "Large grid", icon: tileMediumIcon },
                        { id: "compact", label: "Compact grid", icon: gridViewIcon },
                      ] as const
                    ).map((option) => {
                      const checked = gridDensity === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          aria-label={option.label}
                          title={option.label}
                          onClick={() => setGridDensity(option.id)}
                          className={`flex size-8 items-center justify-center rounded-full transition-colors ${
                            checked
                              ? "bg-(--ed-selected) text-(--ed-text)"
                              : "text-(--ed-muted) hover:text-(--ed-text)"
                          }`}
                        >
                          <MaskIcon src={option.icon} className="size-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {filterPills.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pb-4">
                  {filterPills.map((pill) => (
                    <span
                      key={pill.key}
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-(--ed-border) bg-(--ed-surface) pl-3 pr-1 text-sm text-(--ed-text)"
                    >
                      {pill.label}
                      <button
                        type="button"
                        onClick={pill.onRemove}
                        aria-label={`Remove ${pill.label} filter`}
                        className="flex size-6 items-center justify-center rounded-full text-base leading-none text-(--ed-muted) transition-colors hover:bg-(--ed-divider) hover:text-(--ed-text)"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-2 text-sm font-medium text-(--ed-muted) transition-colors hover:text-(--ed-text)"
                  >
                    Clear all
                  </button>
                </div>
              )}

              <div
                className={`grid items-start gap-6 ${showFilters ? "lg:grid-cols-[260px_minmax(0,1fr)]" : ""}`}
              >
                {showFilters && (
                  <aside
                    aria-label="Filters"
                    className="rounded-lg border border-(--ed-border) bg-(--ed-surface) px-4 lg:sticky lg:top-20"
                  >
                    <FilterGroup
                      title="Status"
                      open={openGroups.status}
                      onToggle={() => toggleGroup("status")}
                    >
                      <SegmentedControl
                        label="Status"
                        fullWidth
                        options={STATUS_OPTIONS}
                        value={statusFilter}
                        onChange={setStatusFilter}
                      />
                    </FilterGroup>

                    <FilterGroup
                      title="Price"
                      open={openGroups.price}
                      onToggle={() => toggleGroup("price")}
                    >
                      <div className="flex flex-col gap-2">
                        <SegmentedControl
                          label="Price currency"
                          fullWidth
                          options={PRICE_CURRENCY_OPTIONS}
                          value={priceCurrency}
                          onChange={setPriceCurrency}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            placeholder="Min"
                            aria-label="Minimum price"
                            className={inputClass}
                          />
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            placeholder="Max"
                            aria-label="Maximum price"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </FilterGroup>

                    <FilterGroup
                      title="Camera"
                      open={openGroups.camera}
                      onToggle={() => toggleGroup("camera")}
                    >
                      <CheckboxList
                        options={traitOptions.cameras}
                        selected={selectedCameras}
                        onToggle={toggleCamera}
                        countFor={(v) => editions.filter((e) => e.camera === v).length}
                      />
                    </FilterGroup>

                    <FilterGroup
                      title="Lens"
                      open={openGroups.lens}
                      onToggle={() => toggleGroup("lens")}
                    >
                      <CheckboxList
                        options={traitOptions.lenses}
                        selected={selectedLenses}
                        onToggle={toggleLens}
                        countFor={(v) => editions.filter((e) => e.lens === v).length}
                      />
                    </FilterGroup>

                    <FilterGroup
                      title="Location"
                      open={openGroups.location}
                      onToggle={() => toggleGroup("location")}
                    >
                      <CheckboxList
                        options={traitOptions.locations}
                        selected={selectedLocations}
                        onToggle={toggleLocation}
                        countFor={(v) => editions.filter((e) => e.location === v).length}
                      />
                    </FilterGroup>

                    <FilterGroup
                      title="Edition tier"
                      open={openGroups.tier}
                      onToggle={() => toggleGroup("tier")}
                    >
                      <CheckboxList
                        options={TIER_OPTIONS}
                        selected={selectedTiers}
                        onToggle={toggleTier}
                        countFor={(v) => editions.filter((e) => e.tier === v).length}
                      />
                    </FilterGroup>

                    <label className="flex cursor-pointer items-center justify-between gap-3 py-4 text-sm font-medium text-(--ed-text)">
                      Physical twin only
                      <input
                        type="checkbox"
                        checked={hasPhysicalTwinOnly}
                        onChange={(e) => setHasPhysicalTwinOnly(e.target.checked)}
                        className="size-4 accent-(--ed-primary)"
                      />
                    </label>
                  </aside>
                )}

                <div className="min-w-0">
                  {filteredEditions.length === 0 ? (
                    <EmptyState
                      title="No editions found"
                      description="No artworks in this collection match the selected filters."
                      action={
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className={`${primaryButtonClass} h-10 px-5 text-sm`}
                        >
                          Reset filters
                        </button>
                      }
                    />
                  ) : (
                    <div
                      className={`grid gap-4 ${
                        gridDensity === "compact"
                          ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
                          : "grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                      }`}
                    >
                      {filteredEditions.map((item) => (
                        <EditionCard
                          key={item.id}
                          edition={item}
                          currency={priceCurrency}
                          onBuy={handleInstantCollect}
                          onInspectCertificate={openCertificate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ANALYTICS                                                    */}
          {/* ============================================================ */}
          {activeTab === "analytics" && (
            <div className="flex flex-col gap-4 pt-6">
              <section className="rounded-lg border border-(--ed-border) bg-(--ed-surface) p-4 sm:p-6">
                <h2 className="text-base font-medium text-(--ed-text)">Volume</h2>
                <p className="pt-1 text-sm text-(--ed-muted)">
                  Daily trading volume over the last 12 days, across primary and secondary
                  transfers.
                </p>

                <div className="mt-6 flex h-56 items-end gap-2 border-b border-(--ed-border) pb-2">
                  {VOLUME_BARS.map((value, idx) => (
                    <div
                      key={idx}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >
                      <motion.div
                        title={`${value} ETH`}
                        initial={{ height: "0%" }}
                        animate={{ height: `${(value / maxBar) * 88}%` }}
                        transition={{
                          type: "spring",
                          duration: 0.6,
                          bounce: 0,
                          delay: idx * 0.035,
                        }}
                        className="w-full rounded-t bg-(--ed-primary)/60 transition-colors hover:bg-(--ed-primary)"
                      />
                      <span className="font-mono text-[10px] text-(--ed-muted)">{idx + 1}d</span>
                    </div>
                  ))}
                </div>

                <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                  {ANALYTICS_HIGHLIGHTS.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-(--ed-border) bg-(--ed-bg) p-4"
                    >
                      <dt className={monoLabelClass}>{item.label}</dt>
                      <dd className="mt-2 font-mono text-xl font-medium text-(--ed-text)">
                        {item.value}
                      </dd>
                      <dd
                        className={`mt-1 text-xs ${item.positive ? "text-(--ed-positive)" : "text-(--ed-muted)"}`}
                      >
                        {item.note}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          )}

          {/* ============================================================ */}
          {/* ACTIVITY                                                     */}
          {/* ============================================================ */}
          {activeTab === "activity" && (
            <div className="pt-6">
              <ActivityTable
                activities={collectionActivity}
                editions={editions}
                emptyDescription="Mints and sales for this collection will appear here."
              />
            </div>
          )}
        </div>
      </main>

      {activeCertData && (
        <CertificateOfAuthenticityModal
          edition={activeCertData.edition}
          ownership={activeCertData.ownership}
          onClose={() => setActiveCertData(null)}
        />
      )}
      {activationModal}
    </EditionsShell>
  );
}
