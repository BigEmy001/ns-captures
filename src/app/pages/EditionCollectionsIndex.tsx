import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ChevronsLeft,
  ChevronsUpDown,
  Flame,
  Star,
  Trophy,
} from "lucide-react";
import { MaskIcon } from "../components/MaskIcon";
import { EditionsShell } from "../components/editions/EditionsShell";
import {
  EditionsModal,
  EmptyState,
  FilterGroup,
  SegmentedControl,
  Sparkline,
  Stat,
  VerifiedBadge,
} from "../components/editions/editionsUi";
import { useEditionVault } from "../components/editions/useEditionVault";
import {
  formatPrice,
  iconButtonClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  selectClass,
  tableHeadClass,
  PRICE_CURRENCY_OPTIONS,
  type PriceCurrency,
} from "../components/editions/editionsFormat";
import {
  TIMEFRAMES,
  buildCollectionRows,
  formatChange,
  formatCompactGbp,
  type CollectionRow,
  type Timeframe,
} from "../components/editions/collectionStats";
import {
  EDITIONS_CHANGED_EVENT,
  gbpToNsc,
  getPublishedEditions,
  getStoredOwnerships,
} from "../data/editions";
import searchIcon from "../../assets/edition-detail/search.svg";
import tableRowsIcon from "../../assets/edition-detail/table-rows.svg";
import gridViewIcon from "../../assets/edition-detail/grid-view.svg";
import chevronLeftIcon from "../../assets/edition-detail/chevron-left.svg";

const RANKINGS = [
  { id: "trending", label: "Trending", icon: Flame },
  { id: "top", label: "Top", icon: Trophy },
  { id: "watchlist", label: "Watchlist", icon: Star },
] as const;
type Ranking = (typeof RANKINGS)[number]["id"];

type SortKey = "floor" | "change" | "volume" | "sales" | "owners" | "supply";
type SortState = { key: SortKey; direction: "asc" | "desc" };

// Trending ranks by momentum, Top by traded volume
const DEFAULT_SORT: Record<Ranking, SortKey> = {
  trending: "change",
  top: "volume",
  watchlist: "volume",
};

const EDITION_TYPES = [
  { id: "all", label: "All" },
  { id: "genesis_1_of_1", label: "Genesis 1/1" },
  { id: "limited_series", label: "Limited series" },
  { id: "physical_twin", label: "Physical twin" },
] as const;
type EditionTypeFilter = (typeof EDITION_TYPES)[number]["id"];

const CHAINS = ["Ethereum", "Solana", "Base", "Bitcoin"];

const TOKEN_STANDARDS = [
  { id: "all", label: "All" },
  { id: "ERC-721", label: "ERC-721" },
  { id: "ERC-1155", label: "ERC-1155" },
] as const;
type StandardFilter = (typeof TOKEN_STANDARDS)[number]["id"];

type RangeValue = { unit: string; min: number | null; max: number | null };

// Volume is only tracked in GBP
const VOLUME_UNITS = [{ id: "gbp", label: "GBP" }] as const;

const inRange = (value: number, range: RangeValue | null) =>
  !range ||
  ((range.min === null || value >= range.min) && (range.max === null || value <= range.max));

const WATCHLIST_KEY = "ns_editions_watchlist_v1";
const DESKTOP_QUERY = "(min-width: 1024px)";

function readWatchlist(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function useIsDesktop() {
  const [matches, setMatches] = useState(
    () => typeof window === "undefined" || window.matchMedia(DESKTOP_QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return matches;
}

const matchesEditionType = (row: CollectionRow, type: EditionTypeFilter) =>
  type === "all" ||
  (type === "physical_twin"
    ? row.hasPhysicalTwin || row.tiers.includes("physical_twin")
    : row.tiers.includes(type));

const sortValue = (row: CollectionRow, key: SortKey) =>
  ({
    floor: row.floorGbp,
    change: row.change,
    volume: row.volumeGbp,
    sales: row.sales,
    owners: row.owners,
    supply: row.supply,
  })[key];

const changeClass = (value: number) =>
  value > 0 ? "text-(--ed-positive)" : value < 0 ? "text-(--ed-negative)" : "text-(--ed-muted)";

function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string; count: number }[];
  value: T;
  onChange: (id: NoInfer<T>) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const checked = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.id)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
              checked
                ? "border-(--ed-text) bg-(--ed-text) text-(--ed-bg)"
                : "border-(--ed-border) bg-(--ed-surface) text-(--ed-text) hover:bg-(--ed-raised)"
            }`}
          >
            {option.label}
            <span className={`font-mono text-xs ${checked ? "opacity-70" : "text-(--ed-muted)"}`}>
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function WatchButton({
  watched,
  name,
  onToggle,
  className = "",
}: {
  watched: boolean;
  name: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={watched}
      aria-label={watched ? `Remove ${name} from watchlist` : `Add ${name} to watchlist`}
      className={`z-10 flex size-8 items-center justify-center rounded-full transition-colors ${
        watched
          ? "text-(--ed-warning) hover:bg-(--ed-hover)"
          : "text-(--ed-muted) hover:bg-(--ed-hover) hover:text-(--ed-text)"
      } ${className}`}
    >
      <Star className="size-4" strokeWidth={1.75} fill={watched ? "currentColor" : "none"} />
    </button>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
      className={`whitespace-nowrap px-4 py-3 text-right font-normal ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 font-mono text-xs uppercase transition-colors hover:text-(--ed-text) ${
          active ? "text-(--ed-text)" : ""
        }`}
      >
        {label}
        <Icon className="size-3" strokeWidth={2} />
      </button>
    </th>
  );
}

function RangeFilter({
  label,
  units,
  value,
  onApply,
}: {
  label: string;
  units: readonly { id: string; label: string }[];
  value: RangeValue | null;
  onApply: (next: RangeValue | null) => void;
}) {
  const [unit, setUnit] = useState(value?.unit ?? units[0].id);
  const [min, setMin] = useState(value?.min?.toString() ?? "");
  const [max, setMax] = useState(value?.max?.toString() ?? "");

  const parse = (raw: string) =>
    raw.trim() === "" || Number.isNaN(Number(raw)) ? null : Number(raw);
  const minValue = parse(min);
  const maxValue = parse(max);
  const draft: RangeValue | null =
    minValue === null && maxValue === null ? null : { unit, min: minValue, max: maxValue };
  const invalid = minValue !== null && maxValue !== null && minValue > maxValue;
  const unchanged = JSON.stringify(draft) === JSON.stringify(value);
  const unitLabel = units.find((option) => option.id === unit)?.label ?? "";
  const numberClass = `${inputClass} min-w-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid && !unchanged) onApply(draft);
      }}
      className="flex flex-col gap-2"
    >
      {units.length > 1 && (
        <label className="relative">
          <span className="sr-only">{label} currency</span>
          <select
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            className={`${selectClass} w-full`}
          >
            {units.map((option) => (
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
      )}
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={min}
          onChange={(event) => setMin(event.target.value)}
          placeholder={units.length > 1 ? "Min" : `Min (${unitLabel})`}
          aria-label={`Minimum ${label.toLowerCase()} in ${unitLabel}`}
          aria-invalid={invalid}
          className={numberClass}
        />
        <span className="text-sm text-(--ed-muted)">to</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={max}
          onChange={(event) => setMax(event.target.value)}
          placeholder={units.length > 1 ? "Max" : `Max (${unitLabel})`}
          aria-label={`Maximum ${label.toLowerCase()} in ${unitLabel}`}
          aria-invalid={invalid}
          className={numberClass}
        />
      </div>
      {invalid && (
        <p role="alert" className="text-xs text-(--ed-negative)">
          Min can’t be higher than max.
        </p>
      )}
      <button
        type="submit"
        disabled={invalid || unchanged}
        className={`${secondaryButtonClass} h-10 w-full text-sm disabled:pointer-events-none disabled:opacity-40`}
      >
        Apply
      </button>
      {value && (
        <button
          type="button"
          onClick={() => {
            setMin("");
            setMax("");
            onApply(null);
          }}
          className="self-start text-sm text-(--ed-muted) transition-colors hover:text-(--ed-text)"
        >
          Clear {label.toLowerCase()}
        </button>
      )}
    </form>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 border-b border-(--ed-border) py-4">
      <label htmlFor={id} className="cursor-pointer text-sm font-medium text-(--ed-text)">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors duration-150 ${
          checked
            ? "border-(--ed-primary) bg-(--ed-primary)"
            : "border-transparent bg-(--ed-border-strong)"
        }`}
      >
        <span
          className={`size-4 rounded-full bg-[#fff] shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-150 ${
            checked ? "translate-x-5" : "translate-x-[3px]"
          }`}
        />
      </button>
    </div>
  );
}

export function EditionCollectionsIndex() {
  const { walletLabel } = useEditionVault();
  const isDesktop = useIsDesktop();

  const [editions, setEditions] = useState(() => getPublishedEditions());
  const [ownerships, setOwnerships] = useState(() => getStoredOwnerships());
  const [ranking, setRanking] = useState<Ranking>("trending");
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");
  const [currency, setCurrency] = useState<PriceCurrency>("nsc");
  const [view, setView] = useState<"table" | "grid">("table");
  const [sortOverride, setSortOverride] = useState<SortState | null>(null);
  const [query, setQuery] = useState("");
  const [editionType, setEditionType] = useState<EditionTypeFilter>("all");
  const [chain, setChain] = useState("all");
  const [standard, setStandard] = useState<StandardFilter>("all");
  const [floorRange, setFloorRange] = useState<RangeValue | null>(null);
  const [volumeRange, setVolumeRange] = useState<RangeValue | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [curatedOnly, setCuratedOnly] = useState(false);
  // Bumped on reset so the range inputs drop their typed drafts too
  const [rangeResetKey, setRangeResetKey] = useState(0);
  const [openGroups, setOpenGroups] = useState({
    type: true,
    chain: true,
    floor: true,
    volume: true,
    standard: true,
  });
  const [showSidebar, setShowSidebar] = useState(isDesktop);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>(() => readWatchlist());

  // Stay in sync with purchases, admin approvals and other tabs
  useEffect(() => {
    const refresh = () => {
      setEditions(getPublishedEditions());
      setOwnerships(getStoredOwnerships());
      setWatchlist(readWatchlist());
    };
    window.addEventListener(EDITIONS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EDITIONS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const sort: SortState = sortOverride ?? { key: DEFAULT_SORT[ranking], direction: "desc" };

  const rows = useMemo(
    () => buildCollectionRows(editions, ownerships, timeframe),
    [editions, ownerships, timeframe],
  );

  const searchedRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? rows.filter(
          (row) =>
            row.meta.name.toLowerCase().includes(q) ||
            row.meta.photographerName.toLowerCase().includes(q),
        )
      : rows;
  }, [rows, query]);

  const visibleRows = useMemo(
    () =>
      searchedRows
        .filter(
          (row) =>
            matchesEditionType(row, editionType) &&
            (chain === "all" || row.meta.chain === chain) &&
            (standard === "all" || row.standards.includes(standard)) &&
            inRange(
              floorRange?.unit === "eth"
                ? row.floorEth
                : floorRange?.unit === "gbp"
                  ? row.floorGbp
                  : gbpToNsc(row.floorGbp),
              floorRange,
            ) &&
            inRange(row.volumeGbp, volumeRange) &&
            (!verifiedOnly || row.verified) &&
            (!curatedOnly || row.curated) &&
            (ranking !== "watchlist" || watchlist.includes(row.meta.id)),
        )
        .sort((a, b) => {
          const diff = sortValue(a, sort.key) - sortValue(b, sort.key);
          return sort.direction === "asc" ? diff : -diff;
        }),
    [
      searchedRows,
      editionType,
      chain,
      standard,
      floorRange,
      volumeRange,
      verifiedOnly,
      curatedOnly,
      ranking,
      watchlist,
      sort.key,
      sort.direction,
    ],
  );

  const typeOptions = EDITION_TYPES.map((option) => ({
    ...option,
    count: searchedRows.filter((row) => matchesEditionType(row, option.id)).length,
  }));
  const chainOptions = [
    { id: "all", label: "All", count: searchedRows.length },
    ...CHAINS.map((name) => ({
      id: name,
      label: name,
      count: searchedRows.filter((row) => row.meta.chain === name).length,
    })),
  ];

  const standardOptions = TOKEN_STANDARDS.map((option) => ({
    ...option,
    count:
      option.id === "all"
        ? searchedRows.length
        : searchedRows.filter((row) => row.standards.includes(option.id)).length,
  }));

  const activeFilterCount = [
    query.trim() !== "",
    editionType !== "all",
    chain !== "all",
    standard !== "all",
    floorRange !== null,
    volumeRange !== null,
    verifiedOnly,
    curatedOnly,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setQuery("");
    setEditionType("all");
    setChain("all");
    setStandard("all");
    setFloorRange(null);
    setVolumeRange(null);
    setVerifiedOnly(false);
    setCuratedOnly(false);
    setRangeResetKey((key) => key + 1);
  };

  const selectRanking = (id: Ranking) => {
    setRanking(id);
    setSortOverride(null);
  };

  const handleSort = (key: SortKey) => {
    setSortOverride(
      sort.key === key
        ? { key, direction: sort.direction === "desc" ? "asc" : "desc" }
        : { key, direction: "desc" },
    );
  };

  const toggleWatch = (row: CollectionRow) => {
    const watched = watchlist.includes(row.meta.id);
    const next = watched
      ? watchlist.filter((id) => id !== row.meta.id)
      : [...watchlist, row.meta.id];
    setWatchlist(next);
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable: the star still works for this visit
    }
    toast.success(
      watched
        ? `Removed ${row.meta.name} from your watchlist`
        : `Added ${row.meta.name} to your watchlist`,
    );
  };

  const toggleFilters = () => {
    if (isDesktop) setShowSidebar((open) => !open);
    else setMobileFiltersOpen(true);
  };

  const floorLabel = (row: CollectionRow) =>
    formatPrice({ priceGbp: row.floorGbp, priceEth: row.floorEth }, currency);

  const filterContent = (
    <>
      <label className="flex h-10 items-center gap-2 rounded-lg border border-(--ed-border) bg-(--ed-surface) px-3 transition-colors focus-within:border-(--ed-primary)">
        <MaskIcon src={searchIcon} className="size-4 text-(--ed-muted)" />
        <span className="sr-only">Search collections</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search collections or artists"
          className="min-w-0 flex-1 bg-transparent text-sm text-(--ed-text) outline-none placeholder:text-(--ed-muted)"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="text-lg leading-none text-(--ed-muted) transition-colors hover:text-(--ed-text)"
          >
            ×
          </button>
        )}
      </label>
      <FilterGroup
        title="Edition type"
        open={openGroups.type}
        onToggle={() => setOpenGroups((groups) => ({ ...groups, type: !groups.type }))}
      >
        <FilterChips
          label="Edition type"
          options={typeOptions}
          value={editionType}
          onChange={setEditionType}
        />
      </FilterGroup>
      <FilterGroup
        title="Chain"
        open={openGroups.chain}
        onToggle={() => setOpenGroups((groups) => ({ ...groups, chain: !groups.chain }))}
      >
        <FilterChips label="Chain" options={chainOptions} value={chain} onChange={setChain} />
      </FilterGroup>
      <FilterGroup
        title="Floor price"
        open={openGroups.floor}
        onToggle={() => setOpenGroups((groups) => ({ ...groups, floor: !groups.floor }))}
      >
        <RangeFilter
          key={`floor-${rangeResetKey}`}
          label="Floor price"
          units={PRICE_CURRENCY_OPTIONS}
          value={floorRange}
          onApply={setFloorRange}
        />
      </FilterGroup>
      <FilterGroup
        title={`Volume (${timeframe})`}
        open={openGroups.volume}
        onToggle={() => setOpenGroups((groups) => ({ ...groups, volume: !groups.volume }))}
      >
        <RangeFilter
          key={`volume-${rangeResetKey}`}
          label="Volume"
          units={VOLUME_UNITS}
          value={volumeRange}
          onApply={setVolumeRange}
        />
      </FilterGroup>
      <ToggleRow label="Verified only" checked={verifiedOnly} onChange={setVerifiedOnly} />
      <ToggleRow label="Curator’s pick" checked={curatedOnly} onChange={setCuratedOnly} />
      <FilterGroup
        title="Token standard"
        open={openGroups.standard}
        onToggle={() => setOpenGroups((groups) => ({ ...groups, standard: !groups.standard }))}
      >
        <p className="mb-3 text-xs leading-5 text-(--ed-muted)">
          Genesis 1/1s are <span className="whitespace-nowrap">ERC-721</span> tokens. Limited series
          use <span className="whitespace-nowrap">ERC-1155</span>.
        </p>
        <FilterChips
          label="Token standard"
          options={standardOptions}
          value={standard}
          onChange={setStandard}
        />
      </FilterGroup>
    </>
  );

  const emptyState =
    ranking === "watchlist" && watchlist.length === 0 ? (
      <EmptyState
        title="Your watchlist is empty"
        description="Star a collection to follow its floor price and volume here."
        action={
          <button
            type="button"
            onClick={() => selectRanking("trending")}
            className={`${primaryButtonClass} h-10 px-5 text-sm`}
          >
            Browse trending
          </button>
        }
      />
    ) : (
      <EmptyState
        title="No collections match"
        description="Try a different search, edition type or chain."
        action={
          <button
            type="button"
            onClick={resetFilters}
            className={`${primaryButtonClass} h-10 px-5 text-sm`}
          >
            Reset filters
          </button>
        }
      />
    );

  return (
    <EditionsShell activeRail="collections" walletLabel={walletLabel}>
      <main className="flex flex-1 flex-col lg:flex-row lg:items-start">
        <h1 className="sr-only">Collections</h1>

        {/* ============================================================ */}
        {/* FILTER SIDEBAR (desktop)                                     */}
        {/* ============================================================ */}
        {isDesktop && showSidebar && (
          <aside
            id="collection-filters"
            aria-label="Filters"
            className="sticky top-16 flex h-[calc(100dvh-4rem)] w-[272px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-(--ed-border) px-5 py-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-(--ed-text)">Filter by</p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-sm text-(--ed-muted) transition-colors hover:text-(--ed-text)"
                >
                  Reset
                </button>
              )}
            </div>
            <div>{filterContent}</div>
          </aside>
        )}

        <div className="min-w-0 flex-1 px-4 pb-16 sm:px-6">
          {/* ============================================================ */}
          {/* TOOLBAR                                                      */}
          {/* ============================================================ */}
          <div className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-(--ed-border) bg-(--ed-bg)/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
            <button
              type="button"
              onClick={toggleFilters}
              aria-expanded={isDesktop ? showSidebar : mobileFiltersOpen}
              aria-controls={isDesktop ? "collection-filters" : undefined}
              aria-label={isDesktop && showSidebar ? "Hide filters" : "Show filters"}
              className={`${iconButtonClass} relative`}
            >
              <ChevronsLeft
                className={`size-4 transition-transform duration-200 ${isDesktop && showSidebar ? "" : "rotate-180"}`}
              />
              {activeFilterCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-(--ed-primary)" />
              )}
            </button>

            <div role="group" aria-label="Ranking" className="flex items-center gap-1">
              {RANKINGS.map(({ id, label, icon: Icon }) => {
                const active = ranking === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectRanking(id)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ${
                      active
                        ? "bg-(--ed-selected) text-(--ed-text)"
                        : "text-(--ed-muted) hover:text-(--ed-text)"
                    }`}
                  >
                    <Icon className="size-4" strokeWidth={1.75} />
                    {label}
                    {id === "watchlist" && watchlist.length > 0 && (
                      <span className="font-mono text-xs text-(--ed-muted)">
                        {watchlist.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <SegmentedControl
                label="Timeframe"
                options={TIMEFRAMES}
                value={timeframe}
                onChange={setTimeframe}
              />
              <div className="hidden sm:block">
                <SegmentedControl
                  label="Price currency"
                  options={PRICE_CURRENCY_OPTIONS}
                  value={currency}
                  onChange={setCurrency}
                />
              </div>
              <div
                role="radiogroup"
                aria-label="Layout"
                className="hidden items-center rounded-full border border-(--ed-border) bg-(--ed-surface) p-0.5 sm:flex"
              >
                {(
                  [
                    { id: "table", label: "Table view", icon: tableRowsIcon },
                    { id: "grid", label: "Grid view", icon: gridViewIcon },
                  ] as const
                ).map((option) => {
                  const checked = view === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      aria-label={option.label}
                      title={option.label}
                      onClick={() => setView(option.id)}
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

          <p className="py-3 font-mono text-xs uppercase text-(--ed-muted)" aria-live="polite">
            {visibleRows.length} {visibleRows.length === 1 ? "collection" : "collections"}
          </p>

          {/* ============================================================ */}
          {/* RESULTS                                                      */}
          {/* ============================================================ */}
          <motion.div
            key={`${ranking}-${view}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {visibleRows.length === 0 ? (
              emptyState
            ) : view === "table" || !isDesktop ? (
              <div className="@container overflow-hidden rounded-lg border border-(--ed-border) bg-(--ed-surface)">
                <table className="w-full text-left text-sm">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="w-10 py-3 pl-2 font-normal">
                        <span className="sr-only">Watchlist</span>
                      </th>
                      <th className="hidden w-8 py-3 font-normal @md:table-cell">#</th>
                      <th className="px-4 py-3 font-normal">Collection</th>
                      <SortHeader label="Floor" sortKey="floor" sort={sort} onSort={handleSort} />
                      <SortHeader
                        label={`${timeframe} change`}
                        sortKey="change"
                        sort={sort}
                        onSort={handleSort}
                        className="hidden @md:table-cell"
                      />
                      <SortHeader
                        label="Volume"
                        sortKey="volume"
                        sort={sort}
                        onSort={handleSort}
                        className="hidden @xl:table-cell"
                      />
                      <SortHeader
                        label="Sales"
                        sortKey="sales"
                        sort={sort}
                        onSort={handleSort}
                        className="hidden @3xl:table-cell"
                      />
                      <SortHeader
                        label="Owners"
                        sortKey="owners"
                        sort={sort}
                        onSort={handleSort}
                        className="hidden @4xl:table-cell"
                      />
                      <SortHeader
                        label="Supply"
                        sortKey="supply"
                        sort={sort}
                        onSort={handleSort}
                        className="hidden @4xl:table-cell"
                      />
                      <th className="hidden w-32 px-4 py-3 text-right font-normal @5xl:table-cell">
                        Last 7d
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, idx) => (
                      <tr
                        key={row.meta.id}
                        className="relative border-t border-(--ed-border) transition-colors hover:bg-(--ed-hover)"
                      >
                        <td className="py-3 pl-2">
                          <WatchButton
                            watched={watchlist.includes(row.meta.id)}
                            name={row.meta.name}
                            onToggle={() => toggleWatch(row)}
                            className="relative"
                          />
                        </td>
                        <td className="hidden py-3 font-mono text-(--ed-muted) @md:table-cell">
                          {idx + 1}
                        </td>
                        <td className="w-full max-w-0 px-4 py-3">
                          {/* The link covers the whole row; the star sits above it */}
                          <Link
                            to={`/editions/collection/${row.meta.id}`}
                            className="flex min-w-0 items-center gap-3 outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-(--ed-primary)"
                          >
                            <img
                              src={row.image}
                              alt=""
                              className="size-10 shrink-0 rounded-lg object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
                            />
                            <span className="min-w-0">
                              <span className="flex items-center gap-1">
                                <span className="truncate font-medium text-(--ed-text)">
                                  {row.meta.name}
                                </span>
                                <VerifiedBadge />
                              </span>
                              <span className="block truncate text-xs text-(--ed-muted)">
                                by {row.meta.photographerName}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-(--ed-text)">
                          {floorLabel(row)}
                        </td>
                        <td
                          className={`hidden whitespace-nowrap px-4 py-3 text-right font-mono @md:table-cell ${changeClass(row.change)}`}
                        >
                          {formatChange(row.change)}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-right font-mono text-(--ed-text) @xl:table-cell">
                          {formatCompactGbp(row.volumeGbp)}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-right font-mono text-(--ed-text) @3xl:table-cell">
                          {row.sales.toLocaleString("en-GB")}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-right font-mono text-(--ed-text) @4xl:table-cell">
                          {row.owners.toLocaleString("en-GB")}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-right font-mono text-(--ed-text) @4xl:table-cell">
                          {row.supply.toLocaleString("en-GB")}
                        </td>
                        <td className="hidden px-4 py-3 @5xl:table-cell">
                          <Sparkline data={row.sparkline} className="ml-auto h-8 w-28" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleRows.map((row) => (
                  <li
                    key={row.meta.id}
                    className="group relative overflow-hidden rounded-lg border border-(--ed-border) bg-(--ed-surface) transition-colors hover:border-(--ed-border-strong)"
                  >
                    <span className="block aspect-[16/9] overflow-hidden bg-(--ed-raised)">
                      <img
                        src={row.meta.bannerImage}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />
                    </span>
                    <div className="flex flex-col gap-4 p-4">
                      <Link
                        to={`/editions/collection/${row.meta.id}`}
                        className="flex min-w-0 items-center gap-3 outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-(--ed-primary)"
                      >
                        <img
                          src={row.image}
                          alt=""
                          className="-mt-10 size-12 shrink-0 rounded-lg object-cover ring-2 ring-(--ed-surface)"
                        />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1">
                            <span className="truncate font-medium text-(--ed-text)">
                              {row.meta.name}
                            </span>
                            <VerifiedBadge />
                          </span>
                          <span className="block truncate text-xs text-(--ed-muted)">
                            by {row.meta.photographerName}
                          </span>
                        </span>
                      </Link>
                      <dl className="grid grid-cols-3 gap-3">
                        <Stat label="Floor" value={floorLabel(row)} />
                        <Stat label="Volume" value={formatCompactGbp(row.volumeGbp)} />
                        <Stat
                          label={timeframe}
                          value={
                            <span className={changeClass(row.change)}>
                              {formatChange(row.change)}
                            </span>
                          }
                        />
                      </dl>
                    </div>
                    <WatchButton
                      watched={watchlist.includes(row.meta.id)}
                      name={row.meta.name}
                      onToggle={() => toggleWatch(row)}
                      className="absolute right-3 top-3 bg-(--ed-bg)/70 backdrop-blur-md"
                    />
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>
      </main>

      {/* Filters on smaller screens */}
      {!isDesktop && mobileFiltersOpen && (
        <EditionsModal
          eyebrow="Collections"
          title="Filters"
          onClose={() => setMobileFiltersOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
                className={`${secondaryButtonClass} h-10 px-5 text-sm disabled:opacity-50`}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className={`${primaryButtonClass} h-10 px-5 text-sm`}
              >
                Show {visibleRows.length} {visibleRows.length === 1 ? "collection" : "collections"}
              </button>
            </>
          }
        >
          {filterContent}
        </EditionsModal>
      )}
    </EditionsShell>
  );
}
