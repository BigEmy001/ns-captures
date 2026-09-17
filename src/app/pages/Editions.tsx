import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowUpRight, Copy } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  getPublishedEditions,
  getStoredOwnerships,
  isEditionForSale,
  getStoredActivity,
  purchaseEdition,
  isEditionsPublic,
  getPresaleConfig,
  EDITIONS_VISIBILITY_EVENT,
  NSC_PER_GBP,
  type DigitalEdition,
  type EditionOwnership,
} from "../data/editions";
import { PresaleBuyModal } from "../components/PresaleBuyModal";
import { CertificateOfAuthenticityModal } from "../components/CertificateOfAuthenticityModal";
import { useWeb3Activation } from "../components/editions/useWeb3Activation";
import { NsCapturesLogoBadge } from "../components/NsCapturesLogoBadge";
import { MaskIcon } from "../components/MaskIcon";
import { EditionsShell } from "../components/editions/EditionsShell";
import {
  ActivityTable,
  Chip,
  EditionCard,
  EditionsModal,
  EmptyState,
  SegmentedControl,
  Sparkline,
  Stat,
  TabBar,
  VerifiedBadge,
} from "../components/editions/editionsUi";
import {
  collectionHrefFor,
  formatGbp,
  formatPrice,
  initials,
  PRICE_CURRENCY_OPTIONS,
  type PriceCurrency,
  monoLabelClass,
  primaryButtonClass,
  sampleOwnershipFor,
  secondaryButtonClass,
  sectionReveal,
  selectClass,
  shortHex,
  tableHeadClass,
  tierLabel,
} from "../components/editions/editionsFormat";
import { Nft101Section } from "../components/editions/Nft101Section";
import {
  TIMEFRAMES,
  buildCollectionRows,
  type Timeframe,
} from "../components/editions/collectionStats";
import { useEditionVault } from "../components/editions/useEditionVault";
import { useEditionsTheme } from "../components/editions/useEditionsTheme";
import { useAuth } from "../context/AuthContext";
import { copyToClipboard } from "../../lib/clipboard";
import { generateQrSvg } from "../../lib/qrcode";
import chevronLeftIcon from "../../assets/edition-detail/chevron-left.svg";

const CATEGORY_FILTERS = [
  { id: "all", label: "All works" },
  { id: "art", label: "Fine art" },
  { id: "genesis", label: "Genesis 1/1" },
  { id: "series", label: "Series" },
  { id: "twin", label: "Physical twin" },
  { id: "curator", label: "Curator spotlight" },
] as const;

const CHAIN_FILTERS = [
  { id: "all", label: "All chains" },
  { id: "eth", label: "Ethereum" },
  { id: "sol", label: "Solana" },
  { id: "base", label: "Base" },
  { id: "btc", label: "Bitcoin" },
  { id: "tron", label: "TRON" },
] as const;

const HERO_INTERVAL_MS = 6000;

const PAYMENT_CURRENCIES = [
  { id: "ETH", label: "ETH" },
  { id: "SOL", label: "SOL" },
  { id: "USDT", label: "USDT" },
  { id: "GBP", label: "GBP" },
] as const;

const SALON_FEATURES = [
  { label: "Provenance", text: "Cryptographic certificates of authenticity" },
  { label: "Scarcity", text: "Numbered limited series & Genesis 1/1s" },
  { label: "Physical twins", text: "Museum-grade giclée print pairings" },
];

const formatCompactGbp = (value: number) =>
  value >= 1000 ? `£${(value / 1000).toFixed(1)}K` : formatGbp(Math.round(value));

export function Editions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { wallets, refresh: refreshVault } = useEditionVault();
  const [isPresaleModalOpen, setIsPresaleModalOpen] = useState(false);
  const presaleConfig = useMemo(() => getPresaleConfig(), []);
  const { theme } = useEditionsTheme();
  const reduceMotion = useReducedMotion();

  const isAdmin = user?.role === "Admin";
  const [isPublic, setIsPublic] = useState(() => isEditionsPublic());

  useEffect(() => {
    const syncVisibility = () => {
      setIsPublic(isEditionsPublic());
    };
    window.addEventListener(EDITIONS_VISIBILITY_EVENT, syncVisibility);
    return () => {
      window.removeEventListener(EDITIONS_VISIBILITY_EVENT, syncVisibility);
    };
  }, []);

  const [editions, setEditions] = useState<DigitalEdition[]>(() => getPublishedEditions());
  const [activity, setActivity] = useState(() => getStoredActivity());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [catalogTab, setCatalogTab] = useState<"items" | "activity">("items");
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");
  const [currencyMode, setCurrencyMode] = useState<PriceCurrency>("nsc");
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const catalogRef = useRef<HTMLElement>(null);

  // Modals
  const [activeCertData, setActiveCertData] = useState<{
    edition: DigitalEdition;
    ownership: EditionOwnership;
  } | null>(null);
  const [selectedEditionForPurchase, setSelectedEditionForPurchase] =
    useState<DigitalEdition | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState<"GBP" | "ETH" | "USDT" | "SOL">("ETH");
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositWalletIndex, setDepositWalletIndex] = useState(0);
  const { requireWeb3, activationModal } = useWeb3Activation();

  // Signed-in collectors switch Web3 on before their first purchase
  const openPurchase = (edition: DigitalEdition) =>
    requireWeb3("collector", () => setSelectedEditionForPurchase(edition));

  // Older "?mint=1" links now open the creator studio
  useEffect(() => {
    if (searchParams.get("mint") === "1") {
      navigate("/editions/studio?section=create", { replace: true });
    }
  }, [searchParams, navigate]);

  // Featured Editions for Hero Carousel
  const featuredEditions = useMemo(() => {
    const list = editions.filter((e) => e.featured);
    return list.length > 0 ? list : editions.slice(0, 3);
  }, [editions]);

  const activeHero = featuredEditions[heroSlideIndex % featuredEditions.length] || editions[0];

  // Auto-advance the featured carousel; pauses on hover/focus and for reduced motion
  useEffect(() => {
    if (heroPaused || reduceMotion || featuredEditions.length < 2) return;
    const timer = window.setTimeout(
      () => setHeroSlideIndex((index) => (index + 1) % featuredEditions.length),
      HERO_INTERVAL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [heroSlideIndex, heroPaused, reduceMotion, featuredEditions.length]);

  // Filtered editions catalog
  const filteredEditions = useMemo(() => {
    return editions.filter((e) => {
      const matchesCategory =
        selectedCategory === "all" ||
        (selectedCategory === "art" && e.tier !== "physical_twin") ||
        (selectedCategory === "genesis" && e.tier === "genesis_1_of_1") ||
        (selectedCategory === "series" && e.tier === "limited_series") ||
        (selectedCategory === "twin" && e.hasPhysicalTwin) ||
        (selectedCategory === "curator" && e.featured);

      // Chain filter (simulated platform tags)
      const matchesChain =
        selectedChain === "all" ||
        (selectedChain === "eth" && e.priceEth > 0) ||
        (selectedChain === "sol" && e.priceSol > 0) ||
        (selectedChain === "base" && e.priceEth <= 0.2) ||
        (selectedChain === "btc" && e.priceGbp > 1000) ||
        selectedChain === "tron";

      return matchesCategory && matchesChain;
    });
  }, [editions, selectedCategory, selectedChain]);

  const ownerships = useMemo(() => getStoredOwnerships(), []);

  const trendingCollections = useMemo(
    () =>
      buildCollectionRows(editions, ownerships, timeframe).sort(
        (a, b) => b.volumeGbp - a.volumeGbp,
      ),
    [editions, ownerships, timeframe],
  );

  const handleCopy = (text: string, label: string) => {
    copyToClipboard(text);
    toast.success(`${label} copied to clipboard`);
  };

  const confirmPurchase = () => {
    if (!selectedEditionForPurchase) return;
    try {
      setPurchasing(true);
      const res = purchaseEdition(
        selectedEditionForPurchase.id,
        {
          id: user?.id || "guest-collector",
          name: user?.name || "Private Collector",
          email: user?.email,
        },
        paymentCurrency,
      );

      if (res.success && res.ownership) {
        toast.success(
          `Acquired: ${selectedEditionForPurchase.title} (${res.ownership.serialDisplay})`,
        );
        setEditions(getPublishedEditions());
        setActivity(getStoredActivity());
        setSelectedEditionForPurchase(null);
        setActiveCertData({ edition: selectedEditionForPurchase, ownership: res.ownership });
      } else {
        toast.error(res.error || "Purchase failed.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setPurchasing(false);
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

  const openActivity = () => {
    setCatalogTab("activity");
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Public Visibility Guard: If editions room is toggled OFF by admin, hide from public
  if (!isPublic && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--ed-bg) px-4 py-16 font-sans text-(--ed-text)">
        <div className="w-full max-w-3xl rounded-xl border border-(--ed-border) bg-(--ed-surface) p-6 text-center sm:p-10">
          <NsCapturesLogoBadge className="mx-auto size-14" />
          <p className={`${monoLabelClass} mt-6`}>Private curated salon · Coming soon</p>
          <h1 className="mt-3 text-balance text-[32px] font-medium leading-10 sm:text-[40px] sm:leading-[48px]">
            Fine-art digital editions
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-(--ed-muted)">
            The NS CAPTURES Editions room is currently accessible by invitation and administrative
            preview only while our curated collection of limited series and cryptographic
            certificates of authenticity is being assembled.
          </p>
          <dl className="mt-8 grid gap-3 text-left sm:grid-cols-3">
            {SALON_FEATURES.map((feature) => (
              <div
                key={feature.label}
                className="rounded-lg border border-(--ed-border) bg-(--ed-bg) p-4"
              >
                <dt className={monoLabelClass}>{feature.label}</dt>
                <dd className="mt-2 text-sm leading-6 text-(--ed-text)">{feature.text}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/explore" className={`${primaryButtonClass} h-12 px-6 text-base`}>
              Explore stock gallery
            </Link>
            <Link to="/" className={`${secondaryButtonClass} h-12 px-6 text-base`}>
              Return to homepage
            </Link>
          </div>
          <p className={`${monoLabelClass} mt-8`}>
            NS CAPTURES Fine Art Registry © {new Date().getFullYear()} · Private access only
          </p>
        </div>
      </div>
    );
  }

  const adminBanner =
    isAdmin && !isPublic ? (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(255,138,0,0.3)] bg-[rgba(255,138,0,0.12)] px-4 py-2.5 text-sm sm:px-6">
        <p className="flex flex-wrap items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-(--ed-warning)" />
          <span className="font-mono text-xs uppercase text-(--ed-warning)">Admin preview</span>
          <span className="text-(--ed-text-soft)">
            The Editions room is hidden from the public. Visitors see the private salon card.
          </span>
        </p>
        <Link to="/admin" className={`${secondaryButtonClass} h-8 px-3 text-xs`}>
          Open admin console
        </Link>
      </div>
    ) : null;

  const activeDepositWallet = wallets[depositWalletIndex] ?? wallets[0];

  const priceFor = (edition: DigitalEdition) => formatPrice(edition, currencyMode);

  return (
    <EditionsShell
      activeRail={catalogTab === "activity" ? "activity" : "discover"}
      onActivity={openActivity}
      onCertificates={() => editions[0] && openCertificate(editions[0])}
      banner={adminBanner}
    >
      <main className="flex flex-1 flex-col gap-10 px-4 pb-16 pt-6 sm:px-6">
        {/* ============================================================ */}
        {/* FEATURED EDITION                                             */}
        {/* ============================================================ */}
        {activeHero && (
          <section
            aria-label="Featured editions"
            aria-roledescription="carousel"
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
            onFocusCapture={() => setHeroPaused(true)}
            onBlurCapture={() => setHeroPaused(false)}
            className="relative isolate flex min-h-[420px] flex-col justify-end overflow-hidden rounded-xl border border-(--ed-border) bg-(--ed-surface) sm:min-h-[460px]"
          >
            <AnimatePresence initial={false}>
              <motion.img
                key={activeHero.id}
                src={activeHero.image}
                alt=""
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.2, 0, 0, 1] }}
                className="absolute inset-0 -z-10 size-full object-cover"
              />
            </AnimatePresence>
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-(--ed-bg) via-(--ed-bg)/70 to-(--ed-bg)/10" />

            {featuredEditions.length > 1 && (
              <div className="absolute right-4 top-4 flex items-center gap-1.5">
                {featuredEditions.map((item, idx) => {
                  const current = heroSlideIndex % featuredEditions.length === idx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setHeroSlideIndex(idx)}
                      aria-label={`Show featured edition ${idx + 1}`}
                      aria-current={current}
                      className={`relative h-1.5 overflow-hidden rounded-full bg-[#fff]/40 transition-[width,background-color] duration-300 hover:bg-[#fff]/70 ${
                        current ? "w-8" : "w-1.5"
                      }`}
                    >
                      {current && (
                        <motion.span
                          key={`${heroSlideIndex}-${heroPaused}`}
                          initial={{ width: heroPaused || reduceMotion ? "100%" : "0%" }}
                          animate={{ width: "100%" }}
                          transition={{
                            duration: heroPaused || reduceMotion ? 0 : HERO_INTERVAL_MS / 1000,
                            ease: "linear",
                          }}
                          className="absolute inset-y-0 left-0 bg-[#fff]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeHero.id}
                initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transitionEnd: { filter: "none" },
                }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: 0.18 } }}
                transition={{ type: "spring", duration: 0.5, bounce: 0 }}
                className="flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-end lg:justify-between"
              >
                <div className="min-w-0 max-w-2xl">
                  <div className="flex flex-wrap gap-2">
                    <Chip>Featured</Chip>
                    <Chip>{tierLabel(activeHero)}</Chip>
                    {activeHero.hasPhysicalTwin && <Chip>Print twin</Chip>}
                  </div>
                  <Link
                    to={collectionHrefFor(activeHero)}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium tracking-[-0.15px] text-(--ed-text) transition-colors hover:text-(--ed-text-soft)"
                  >
                    {activeHero.collectionName ?? activeHero.photographerName}
                    <VerifiedBadge />
                  </Link>
                  <h1 className="mt-2 text-balance text-[28px] font-medium leading-9 tracking-[0.2px] text-(--ed-text) sm:text-[40px] sm:leading-[48px]">
                    <Link
                      to={`/editions/${activeHero.id}`}
                      className="transition-colors hover:text-(--ed-text-soft)"
                    >
                      {activeHero.title}
                    </Link>
                  </h1>
                  <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-6 text-(--ed-muted)">
                    {activeHero.description}
                  </p>
                </div>

                <div className="w-full shrink-0 rounded-lg border border-(--ed-divider) bg-(--ed-surface)/85 p-4 backdrop-blur-md lg:w-[340px]">
                  <dl className="grid grid-cols-3 gap-3">
                    <Stat label="Price" value={priceFor(activeHero)} />
                    <Stat label="Editions" value={activeHero.totalEditions} />
                    <Stat label="Available" value={activeHero.availableEditions} />
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openPurchase(activeHero)}
                      disabled={!isEditionForSale(activeHero)}
                      className={`${primaryButtonClass} h-10 flex-1 text-sm`}
                    >
                      {activeHero.availableEditions === 0
                        ? "Sold out"
                        : activeHero.salesPaused
                          ? "Not for sale"
                          : "Buy now"}
                    </button>
                    <Link
                      to={`/editions/${activeHero.id}`}
                      className={`${secondaryButtonClass} h-10 flex-1 text-sm`}
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </section>
        )}

        {/* ============================================================ */}
        {/* NSC PRESALE BANNER SPOTLIGHT                                  */}
        {/* ============================================================ */}
        {presaleConfig.status === "active" && (
          <motion.section
            {...sectionReveal}
            aria-label="NSC token presale"
            className="relative overflow-hidden rounded-2xl border border-(--ed-border) bg-(--ed-surface) p-5 shadow-(--ed-shadow) sm:p-6"
          >
            {/* One soft accent in the marketplace's own primary, so the banner belongs to the page */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-(--ed-primary)/10 to-transparent lg:block"
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="min-w-0">
                <p className={`flex items-center gap-2 ${monoLabelClass}`}>
                  <span aria-hidden className="size-1.5 rounded-full bg-(--ed-positive)" />
                  {presaleConfig.symbol} presale · live
                </p>
                <h2 className="mt-2 text-lg font-medium tracking-[-0.2px] text-(--ed-text) sm:text-xl">
                  The platform coin for minting and collecting
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-(--ed-muted)">
                  {presaleConfig.symbol} covers mint fees, Web3 vault activation and edition
                  purchases, with no gas. Swap ETH, USDT, TRX, SOL or BTC for it at a fixed presale
                  rate.
                </p>
                <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
                  {[
                    {
                      label: "Presale price",
                      value: `$${presaleConfig.priceUsd.toFixed(2)}`,
                    },
                    {
                      label: "Listing target",
                      value: `$${presaleConfig.launchPriceUsd.toFixed(2)}`,
                    },
                    {
                      label: "Minimum buy",
                      value: `$${presaleConfig.minPurchaseUsd.toFixed(2)}`,
                    },
                    {
                      label: "Value on editions",
                      value: `£${(1 / NSC_PER_GBP).toFixed(2)} per ${presaleConfig.symbol}`,
                    },
                    {
                      label: "Allocation",
                      value: `${presaleConfig.hardCapNsc.toLocaleString()} ${presaleConfig.symbol}`,
                    },
                  ].map((fact) => (
                    <div key={fact.label}>
                      <dt className={monoLabelClass}>{fact.label}</dt>
                      <dd className="mt-1 font-mono text-sm text-(--ed-text)">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <button
                type="button"
                onClick={() => setIsPresaleModalOpen(true)}
                className={`${primaryButtonClass} h-11 w-full shrink-0 px-6 text-sm sm:w-auto`}
              >
                Join the presale
              </button>
            </div>
          </motion.section>
        )}

        {/* ============================================================ */}
        {/* TRENDING COLLECTIONS                                         */}
        {/* ============================================================ */}
        <motion.section
          {...sectionReveal}
          aria-labelledby="trending-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <h2
                id="trending-heading"
                className="text-xl font-medium tracking-[-0.3px] text-(--ed-text)"
              >
                Trending collections
              </h2>
              <Link
                to="/editions/collection"
                className="text-sm font-medium text-(--ed-muted) transition-colors hover:text-(--ed-text)"
              >
                View all
              </Link>
            </div>
            <SegmentedControl
              label="Timeframe"
              options={TIMEFRAMES}
              value={timeframe}
              onChange={setTimeframe}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-(--ed-border) bg-(--ed-surface)">
            <table className="w-full text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="hidden w-12 px-4 py-3 font-normal sm:table-cell">#</th>
                  <th className="px-4 py-3 font-normal">Collection</th>
                  <th className="px-4 py-3 text-right font-normal">Floor</th>
                  <th className="hidden px-4 py-3 text-right font-normal min-[480px]:table-cell">
                    Change
                  </th>
                  <th className="hidden px-4 py-3 text-right font-normal sm:table-cell">Volume</th>
                  <th className="hidden w-36 px-4 py-3 font-normal md:table-cell">
                    <span className="sr-only">Trend</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {trendingCollections.map((col, idx) => (
                  <tr
                    key={col.meta.id}
                    className="border-t border-(--ed-border) transition-colors hover:bg-(--ed-hover)"
                  >
                    <td className="hidden px-4 py-3 font-mono text-(--ed-muted) sm:table-cell">
                      {idx + 1}
                    </td>
                    <td className="w-full max-w-0 px-4 py-3">
                      <Link
                        to={`/editions/collection/${col.meta.id}`}
                        className="flex min-w-0 items-center gap-3"
                      >
                        <img
                          src={col.image}
                          alt=""
                          className="size-10 shrink-0 rounded-lg object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
                        />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1">
                            <span className="truncate font-medium text-(--ed-text)">
                              {col.meta.name}
                            </span>
                            <VerifiedBadge />
                          </span>
                          <span className="block truncate text-xs text-(--ed-muted)">
                            {col.meta.photographerName}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-(--ed-text)">
                      {formatPrice(
                        { priceGbp: col.floorGbp, priceEth: col.floorEth },
                        currencyMode,
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-right font-mono text-(--ed-positive) min-[480px]:table-cell">
                      +{col.change.toFixed(1)}%
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-right font-mono text-(--ed-text) sm:table-cell">
                      {formatCompactGbp(col.volumeGbp)}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Sparkline data={col.sparkline} className="ml-auto h-8 w-28" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* ============================================================ */}
        {/* MARKETPLACE CATALOG                                          */}
        {/* ============================================================ */}
        <motion.section
          {...sectionReveal}
          ref={catalogRef}
          aria-label="Marketplace"
          className="flex scroll-mt-20 flex-col gap-4"
        >
          <TabBar<"items" | "activity">
            label="Marketplace sections"
            tabs={[
              { id: "items", label: "Items", count: filteredEditions.length },
              { id: "activity", label: "Activity" },
            ]}
            active={catalogTab}
            onChange={setCatalogTab}
            trailing={
              <SegmentedControl
                label="Price currency"
                options={PRICE_CURRENCY_OPTIONS}
                value={currencyMode}
                onChange={setCurrencyMode}
              />
            }
          />

          {catalogTab === "items" ? (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
                  {CATEGORY_FILTERS.map((category) => {
                    const selected = selectedCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`h-9 shrink-0 rounded-full border px-4 text-sm font-medium tracking-[-0.15px] transition-colors ${
                          selected
                            ? "border-(--ed-text) bg-(--ed-text) text-(--ed-bg)"
                            : "border-(--ed-border) bg-(--ed-surface) text-(--ed-text) hover:bg-(--ed-raised)"
                        }`}
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <label className="relative shrink-0">
                    <span className="sr-only">Chain</span>
                    <select
                      value={selectedChain}
                      onChange={(e) => setSelectedChain(e.target.value)}
                      className={`${selectClass} h-9`}
                    >
                      {CHAIN_FILTERS.map((chain) => (
                        <option key={chain.id} value={chain.id}>
                          {chain.label}
                        </option>
                      ))}
                    </select>
                    <MaskIcon
                      src={chevronLeftIcon}
                      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 -rotate-90 text-(--ed-muted)"
                    />
                  </label>
                  <div className="md:hidden">
                    <SegmentedControl
                      label="Price currency"
                      options={PRICE_CURRENCY_OPTIONS}
                      value={currencyMode}
                      onChange={setCurrencyMode}
                    />
                  </div>
                </div>
              </div>

              {filteredEditions.length === 0 ? (
                <EmptyState
                  title="No digital editions found"
                  description="Try another category or chain."
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("all");
                        setSelectedChain("all");
                      }}
                      className={`${primaryButtonClass} h-10 px-5 text-sm`}
                    >
                      Reset filters
                    </button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredEditions.map((item) => (
                    <EditionCard
                      key={item.id}
                      edition={item}
                      currency={currencyMode}
                      onBuy={openPurchase}
                      onInspectCertificate={openCertificate}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <ActivityTable activities={activity} editions={editions} />
          )}
        </motion.section>

        {/* ============================================================ */}
        {/* NFT 101 (Figma node 18:2106)                                 */}
        {/* ============================================================ */}
        <Nft101Section coverImage={featuredEditions[0]?.image ?? editions[0]?.image} />
      </main>

      {/* ============================================================ */}
      {/* ACQUISITION MODAL                                            */}
      {/* ============================================================ */}
      {selectedEditionForPurchase && (
        <EditionsModal
          eyebrow="Confirm acquisition"
          title={selectedEditionForPurchase.title}
          onClose={() => setSelectedEditionForPurchase(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setSelectedEditionForPurchase(null)}
                className={`${secondaryButtonClass} h-10 px-5 text-sm`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPurchase}
                disabled={purchasing}
                className={`${primaryButtonClass} h-10 px-5 text-sm`}
              >
                {purchasing ? "Issuing certificate…" : "Confirm & issue COA"}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4 rounded-lg border border-(--ed-border) bg-(--ed-bg) p-3">
              <img
                src={selectedEditionForPurchase.image}
                alt=""
                className="size-16 shrink-0 rounded object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-(--ed-text)">
                  {selectedEditionForPurchase.title}
                </p>
                <p className="text-sm text-(--ed-muted)">
                  By {selectedEditionForPurchase.photographerName}
                </p>
                <p className="pt-1 font-mono text-xs text-(--ed-text)">
                  Next serial #
                  {String(
                    selectedEditionForPurchase.totalEditions -
                      selectedEditionForPurchase.availableEditions +
                      1,
                  ).padStart(2, "0")}{" "}
                  / {selectedEditionForPurchase.totalEditions}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className={monoLabelClass}>Settlement currency</span>
              <SegmentedControl
                label="Settlement currency"
                fullWidth
                options={PAYMENT_CURRENCIES}
                value={paymentCurrency}
                onChange={setPaymentCurrency}
              />
            </div>

            <dl className="flex flex-col gap-2 rounded-lg border border-(--ed-border) bg-(--ed-bg) p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-(--ed-muted)">Artwork price</dt>
                <dd className="font-mono text-(--ed-text)">
                  £{selectedEditionForPurchase.priceGbp.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-(--ed-muted)">Mint & certification</dt>
                <dd className="font-mono text-(--ed-positive)">Included</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-(--ed-muted)">
                  Creator royalty ({selectedEditionForPurchase.royaltyPercent}%)
                </dt>
                <dd className="font-mono text-(--ed-text)">
                  £
                  {(
                    selectedEditionForPurchase.priceGbp *
                    (selectedEditionForPurchase.royaltyPercent / 100)
                  ).toFixed(2)}
                </dd>
              </div>
              <div className="mt-1 flex justify-between gap-4 border-t border-(--ed-border) pt-3 font-medium">
                <dt className="text-(--ed-text)">Total due</dt>
                <dd className="font-mono text-(--ed-text)">
                  {paymentCurrency === "ETH" && `${selectedEditionForPurchase.priceEth} ETH`}
                  {paymentCurrency === "SOL" && `${selectedEditionForPurchase.priceSol} SOL`}
                  {paymentCurrency === "USDT" &&
                    `${(selectedEditionForPurchase.priceGbp * 1.28).toFixed(2)} USDT`}
                  {paymentCurrency === "GBP" && formatGbp(selectedEditionForPurchase.priceGbp)}
                </dd>
              </div>
            </dl>
          </div>
        </EditionsModal>
      )}

      {/* ============================================================ */}
      {/* CRYPTO DEPOSIT MODAL (real vault wallets only)               */}
      {/* ============================================================ */}
      {isDepositModalOpen && activeDepositWallet && (
        <EditionsModal
          eyebrow="Web3 vault deposit"
          title="Fund collector vault"
          onClose={() => setIsDepositModalOpen(false)}
          footer={
            <button
              type="button"
              onClick={() => {
                setIsDepositModalOpen(false);
                navigate("/account?tab=vault");
              }}
              className={`${secondaryButtonClass} h-10 px-5 text-sm`}
            >
              Open settlement vault
              <ArrowUpRight className="size-4" />
            </button>
          }
        >
          <div className="flex flex-col gap-4">
            {wallets.length > 1 && (
              <SegmentedControl
                label="Deposit wallet"
                fullWidth
                options={wallets.map((wallet, idx) => ({
                  id: String(idx),
                  label:
                    wallets.filter((w) => w.coin === wallet.coin).length > 1
                      ? `${wallet.coin} · ${wallet.network}`
                      : wallet.coin,
                }))}
                value={String(depositWalletIndex)}
                onChange={(value) => setDepositWalletIndex(Number(value))}
              />
            )}

            <div className="flex justify-center rounded-lg border border-(--ed-border) bg-(--ed-bg) p-4">
              <div
                className="size-44 [&>svg]:size-full"
                dangerouslySetInnerHTML={{
                  __html: generateQrSvg(activeDepositWallet.address, {
                    margin: 2,
                    fgColor: theme === "dark" ? "#FFFFFF" : "#141415",
                    bgColor: theme === "dark" ? "#101011" : "#F5F5F6",
                  }),
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className={monoLabelClass}>
                Deposit address · {activeDepositWallet.coin} ({activeDepositWallet.network})
              </span>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-(--ed-border) bg-(--ed-bg) p-3 font-mono text-xs text-(--ed-text)">
                <span className="break-all">{activeDepositWallet.address}</span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(activeDepositWallet.address, `${activeDepositWallet.coin} address`)
                  }
                  aria-label="Copy deposit address"
                  className="shrink-0 text-(--ed-muted) transition-colors hover:text-(--ed-text)"
                >
                  <Copy className="size-4" />
                </button>
              </div>
            </div>

            <p className="text-sm leading-6 text-(--ed-muted)">
              Send only {activeDepositWallet.coin} on {activeDepositWallet.network} to this address.
              Deposits credit your vault after on-chain confirmation.
            </p>
          </div>
        </EditionsModal>
      )}

      {activationModal}

      {activeCertData && (
        <CertificateOfAuthenticityModal
          edition={activeCertData.edition}
          ownership={activeCertData.ownership}
          onClose={() => setActiveCertData(null)}
        />
      )}

      {isPresaleModalOpen && (
        <PresaleBuyModal
          isOpen={isPresaleModalOpen}
          onClose={() => setIsPresaleModalOpen(false)}
          onSuccess={() => {
            setIsPresaleModalOpen(false);
            refreshVault();
          }}
        />
      )}
    </EditionsShell>
  );
}
