import { useState, useMemo, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Share2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  Coins,
  Wallet,
  Zap,
  Tag,
  Clock,
  User,
  Info,
  CheckCircle2,
  X,
  Search,
  Filter,
  SlidersHorizontal,
  Grid3X3,
  LayoutGrid,
  TrendingUp,
  Activity,
  BarChart3,
  Eye,
  Star,
  Globe,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStoredEditions,
  getStoredOwnerships,
  getStoredActivity,
  getEditionCollection,
  getEditionCollections,
  getEditionsByCollection,
  purchaseEdition,
  checkDepositEligibility,
  getDepositConfig,
  type DigitalEdition,
  type EditionOwnership,
  type EditionActivity,
  type EditionCollectionMeta,
} from "../data/editions";
import { CertificateOfAuthenticityModal } from "../components/CertificateOfAuthenticityModal";
import { useAuth } from "../context/AuthContext";
import { fetchCreatorWeb3Vault, type CryptoWalletEntry } from "../data/db";
import {
  fetchMultiChainVaultBalances,
  type MultiChainVaultBalance,
} from "../../lib/onChainBalance";
import { copyToClipboard } from "../../lib/clipboard";

export function EditionCollection() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active Collection Meta
  const collection: EditionCollectionMeta = useMemo(() => {
    return getEditionCollection(id || "kyoto-nocturnes") || getEditionCollections()[0];
  }, [id]);

  // All editions belonging to this collection
  const [editions, setEditions] = useState<DigitalEdition[]>(() => {
    return getEditionsByCollection(collection.id);
  });

  useEffect(() => {
    setEditions(getEditionsByCollection(collection.id));
  }, [collection.id]);

  // Navigation tabs: items | analytics | activity
  const [activeTab, setActiveTab] = useState<"items" | "analytics" | "activity">("items");

  // Sidebar & Filters State
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [traitSearchQuery, setTraitSearchQuery] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "buy_now" | "has_offers">("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [priceCurrency, setPriceCurrency] = useState<"ETH" | "GBP">("ETH");
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [selectedLenses, setSelectedLenses] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [hasPhysicalTwinOnly, setHasPhysicalTwinOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "scarcity" | "newest">("price_asc");
  const [gridDensity, setGridDensity] = useState<"large" | "compact">("large");

  // Accordion collapsed state for traits
  const [expandedAccordions, setExpandedAccordions] = useState<{ [key: string]: boolean }>({
    status: true,
    price: true,
    camera: true,
    lens: false,
    location: false,
    tier: false,
    twin: false,
  });

  const toggleAccordion = (key: string) => {
    setExpandedAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Watchlist toggle state
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Certificate modal state
  const [activeCertData, setActiveCertData] = useState<{
    edition: DigitalEdition;
    ownership: EditionOwnership;
  } | null>(null);

  // Web3 Vault & Gating
  const [userWallets, setUserWallets] = useState<CryptoWalletEntry[]>([]);
  const [vaultBalance, setVaultBalance] = useState<MultiChainVaultBalance | null>(null);
  const depositConfig = useMemo(() => getDepositConfig(), []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchCreatorWeb3Vault(user.id || (user as any).slug)
      .then(async (vault) => {
        if (!active) return;
        const wallets = vault?.wallets || [];
        setUserWallets(wallets);
        if (wallets.length > 0) {
          const balances = await fetchMultiChainVaultBalances(wallets, {
            tokenBalances: vault?.tokenBalances,
          });
          if (active) setVaultBalance(balances);
        }
      })
      .catch((e) => console.error("Vault load error:", e));

    return () => {
      active = false;
    };
  }, [user]);

  const primaryEvmAddress = useMemo(() => {
    const w = userWallets.find(
      (w) => w.coin === "ETH" || w.network === "ERC20" || w.network === "Base",
    );
    return w?.address || (user ? `0x${user.id.replace(/-/g, "").slice(0, 40)}` : null);
  }, [userWallets, user]);

  // Dynamic Collection Stats Calculation
  const stats = useMemo(() => {
    const totalItems = editions.length;
    const available = editions.filter((e) => e.availableEditions > 0);
    const listedCount = available.length;
    const listedPercent = totalItems > 0 ? Math.round((listedCount / totalItems) * 100) : 0;

    const floorEth =
      available.length > 0 ? Math.min(...available.map((e) => e.priceEth)) : 0.72;
    const floorGbp =
      available.length > 0 ? Math.min(...available.map((e) => e.priceGbp)) : 1850;

    const bestOfferEth = Number((floorEth * 0.9).toFixed(2));

    const totalVolumeEth = editions
      .reduce((sum, e) => sum + (e.totalEditions - e.availableEditions) * e.priceEth, 0)
      .toFixed(1);

    const ownerships = getStoredOwnerships().filter((o) =>
      editions.some((e) => e.id === o.editionId),
    );
    const uniqueOwnersCount = Math.max(new Set(ownerships.map((o) => o.ownerId)).size, 14);

    return {
      totalItems,
      listedCount,
      listedPercent,
      floorEth,
      floorGbp,
      bestOfferEth,
      totalVolumeEth: Number(totalVolumeEth) > 0 ? totalVolumeEth : "142.5",
      uniqueOwnersCount,
    };
  }, [editions]);

  // Unique Trait Options from dataset
  const traitOptions = useMemo(() => {
    const cameras = Array.from(new Set(editions.map((e) => e.camera))).filter(Boolean);
    const lenses = Array.from(new Set(editions.map((e) => e.lens))).filter(Boolean);
    const locations = Array.from(new Set(editions.map((e) => e.location))).filter(Boolean);
    const tiers = [
      { id: "genesis_1_of_1", label: "Genesis 1 of 1" },
      { id: "curated_series", label: "Curated Series" },
      { id: "limited_series", label: "Limited Series" },
    ];
    return { cameras, lenses, locations, tiers };
  }, [editions]);

  // Filter & Sort Logic
  const filteredEditions = useMemo(() => {
    return editions
      .filter((item) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchToken = item.tokenId.toLowerCase().includes(q);
          const matchPhotog = item.photographerName.toLowerCase().includes(q);
          if (!matchTitle && !matchToken && !matchPhotog) return false;
        }

        // Status
        if (statusFilter === "buy_now" && item.availableEditions === 0) return false;
        if (statusFilter === "has_offers" && item.tier !== "genesis_1_of_1") return false;

        // Price range
        const price = priceCurrency === "ETH" ? item.priceEth : item.priceGbp;
        if (minPrice && price < parseFloat(minPrice)) return false;
        if (maxPrice && price > parseFloat(maxPrice)) return false;

        // Photographic Attributes
        if (selectedCameras.length > 0 && !selectedCameras.includes(item.camera)) return false;
        if (selectedLenses.length > 0 && !selectedLenses.includes(item.lens)) return false;
        if (selectedLocations.length > 0 && !selectedLocations.includes(item.location))
          return false;
        if (selectedTiers.length > 0 && !selectedTiers.includes(item.tier)) return false;
        if (hasPhysicalTwinOnly && !item.hasPhysicalTwin) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") return a.priceEth - b.priceEth;
        if (sortBy === "price_desc") return b.priceEth - a.priceEth;
        if (sortBy === "scarcity") return a.totalEditions - b.totalEditions;
        if (sortBy === "newest") return b.yearCreated - a.yearCreated;
        return 0;
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

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0) +
    selectedCameras.length +
    selectedLenses.length +
    selectedLocations.length +
    selectedTiers.length +
    (hasPhysicalTwinOnly ? 1 : 0);

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

  // Instant Collect action with deposit check
  const handleInstantCollect = (item: DigitalEdition) => {
    if (item.availableEditions === 0) {
      toast.error("This numbered edition has already been acquired.");
      return;
    }
    if (!user) {
      toast.error("Please sign in or connect your wallet to acquire digital editions.");
      navigate("/signin");
      return;
    }

    if (depositConfig.enforceDepositGate) {
      const ethAsset = vaultBalance?.assets.find((a) => a.coin === "ETH");
      const solAsset = vaultBalance?.assets.find((a) => a.coin === "SOL");
      const usdtAsset = vaultBalance?.assets.find((a) => a.coin === "USDT");
      const usdcAsset = vaultBalance?.assets.find((a) => a.coin === "USDC");
      const btcAsset = vaultBalance?.assets.find((a) => a.coin === "BTC");

      const gateCheck = checkDepositEligibility({
        eth: ethAsset?.balance || 0,
        sol: solAsset?.balance || 0,
        usdt: usdtAsset?.balance || 0,
        usdc: usdcAsset?.balance || 0,
        btc: btcAsset?.balance || 0,
        totalUsd: vaultBalance?.totalUsd,
      });

      if (!gateCheck.eligible) {
        toast.error("Deposit Verification Required", {
          description: gateCheck.reason || "Please deposit crypto into your Web3 address first.",
        });
        return;
      }
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
      setEditions(getEditionsByCollection(collection.id));
      setActiveCertData({ edition: item, ownership: res.ownership });
    }
  };

  const handleShareCollection = () => {
    if (navigator.share) {
      navigator.share({
        title: `${collection.name} | NS CAPTURES Editions`,
        url: window.location.href,
      });
    } else {
      copyToClipboard(window.location.href);
      toast.success("Collection link copied to clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#edf4f1] font-sans selection:bg-[#1f8fff]/30 selection:text-[#80d0ff]">
      {/* ============================================================ */}
      {/* 1. TOP COVER BANNER                                          */}
      {/* ============================================================ */}
      <div className="relative w-full h-[220px] sm:h-[300px] md:h-[360px] overflow-hidden bg-[#06090d] border-b border-[#21262d]">
        <img
          src={collection.bannerImage}
          alt={collection.name}
          className="size-full object-cover object-center transform scale-105 filter brightness-90 contrast-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/40 to-transparent" />

        {/* Back Button Overlay */}
        <div className="absolute top-4 left-4 sm:left-6 z-20">
          <Link
            to="/editions"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/80 border border-white/10 backdrop-blur-md text-xs font-mono text-white/90 transition shadow-lg"
          >
            <ArrowLeft className="size-4" />
            <span>Marketplace</span>
          </Link>
        </div>

        {/* Switch Collection Pill Dropdown */}
        <div className="absolute top-4 right-4 sm:right-6 z-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[11px] font-mono text-white/80">
            <Sparkles className="size-3 text-[#1f8fff]" />
            <span>Curated Fine-Art Series</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. COLLECTION IDENTITY & PROFILE SECTION                     */}
      {/* ============================================================ */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 sm:-mt-20 z-10 pb-6 border-b border-[#21262d]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            {/* Avatar & Title Info */}
            <div className="flex items-start sm:items-end gap-4 sm:gap-5">
              <div className="relative size-24 sm:size-28 md:size-32 rounded-2xl overflow-hidden border-4 border-[#0d1117] bg-[#161b22] shadow-2xl shrink-0">
                <img
                  src={collection.avatarImage}
                  alt={collection.name}
                  className="size-full object-cover"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{collection.name}</span>
                    <span
                      className="size-5 rounded-full bg-[#1f8fff] text-white flex items-center justify-center text-[10px] font-bold shadow-sm"
                      title="Verified Photographic Provenance"
                    >
                      ✓
                    </span>
                  </h1>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-[#8b949e]">
                  <span>
                    By{" "}
                    <span className="text-white font-semibold">
                      {collection.photographerName}
                    </span>
                  </span>
                  <span>&bull;</span>
                  <span className="inline-flex items-center gap-1 text-[#58a6ff]">
                    <ShieldCheck className="size-3.5" />
                    <span>Cryptographic Provenance</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Social & Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
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
                className={`p-2.5 rounded-xl border transition ${
                  isWatchlisted
                    ? "bg-[#1f8fff]/15 border-[#1f8fff] text-[#58a6ff]"
                    : "bg-[#161b22] border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d] hover:text-white"
                }`}
                title="Watchlist Collection"
              >
                <Star
                  className={`size-4 ${isWatchlisted ? "fill-[#58a6ff]" : ""}`}
                />
              </button>

              <button
                type="button"
                onClick={handleShareCollection}
                className="p-2.5 rounded-xl bg-[#161b22] border border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d] hover:text-white transition"
                title="Share Collection"
              >
                <Share2 className="size-4" />
              </button>

              {collection.contractAddress && (
                <a
                  href={`https://etherscan.io/address/${collection.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-[#161b22] border border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d] hover:text-white transition"
                  title="View Contract on Etherscan"
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          </div>

          {/* Description & Curatorial Statement */}
          <div className="mt-4 max-w-3xl">
            <p className="text-xs sm:text-sm text-[#8b949e] font-serif leading-relaxed">
              {showFullDesc
                ? collection.description
                : collection.description.slice(0, 180) + "..."}
              <button
                type="button"
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="ml-2 text-[#58a6ff] hover:underline font-mono text-xs inline-flex items-center gap-1"
              >
                {showFullDesc ? "Show less" : "Read more"}
              </button>
            </p>
          </div>

          {/* ============================================================ */}
          {/* 3. COLLECTION 9-METRIC STAT STRIP (OpenSea / Claynosaurz style)*/}
          {/* ============================================================ */}
          <div className="mt-6 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 pt-4 border-t border-[#21262d]/70 text-left">
            {/* Total Items */}
            <div className="p-2.5 rounded-xl bg-[#161b22] border border-[#30363d]/60">
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Items
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-white block mt-0.5">
                {stats.totalItems}
              </span>
            </div>

            {/* Created */}
            <div className="p-2.5 rounded-xl bg-[#161b22] border border-[#30363d]/60">
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Created
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-white block mt-0.5">
                Jan 2026
              </span>
            </div>

            {/* Creator Royalties */}
            <div className="p-2.5 rounded-xl bg-[#161b22] border border-[#30363d]/60">
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Royalties
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-[#1f8fff] block mt-0.5">
                {collection.royaltyPercent}%
              </span>
            </div>

            {/* Chain */}
            <div className="p-2.5 rounded-xl bg-[#161b22] border border-[#30363d]/60">
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Chain
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-white block mt-0.5 flex items-center gap-1">
                <span>Ethereum</span>
              </span>
            </div>

            {/* Total Volume */}
            <div className="p-2.5 rounded-xl bg-[#161b22] border border-[#30363d]/60">
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Total Volume
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-white block mt-0.5">
                {stats.totalVolumeEth} ETH
              </span>
            </div>

            {/* Floor Price */}
            <div className="p-2.5 rounded-xl bg-[#161b22] border border-[#30363d]/60">
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Floor Price
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-white block mt-0.5">
                {stats.floorEth} ETH
              </span>
            </div>

            {/* Best Offer */}
            <div className="p-2.5 rounded-xl bg-[#161b22] border border-[#30363d]/60">
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Best Offer
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-[#80d0ff] block mt-0.5">
                {stats.bestOfferEth} ETH
              </span>
            </div>

            {/* Listed % */}
            <div className="p-2.5 rounded-xl bg-[#161b22] border border-[#30363d]/60">
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Listed
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-white block mt-0.5">
                {stats.listedPercent}%
              </span>
            </div>

            {/* Owners */}
            <div className="p-2.5 rounded-xl bg-[#161b22] border border-[#30363d]/60 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Owners
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-white block mt-0.5">
                {stats.uniqueOwnersCount}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. SUB-NAVIGATION TABS (Items / Analytics / Activity)        */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between py-4 border-b border-[#21262d]">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("items")}
              className={`flex items-center gap-2 pb-2 text-sm font-semibold transition border-b-2 ${
                activeTab === "items"
                  ? "border-[#1f8fff] text-white"
                  : "border-transparent text-[#8b949e] hover:text-white"
              }`}
            >
              <span>Items</span>
              <span className="px-2 py-0.5 rounded-full bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#c9d1d9]">
                {filteredEditions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 pb-2 text-sm font-semibold transition border-b-2 ${
                activeTab === "analytics"
                  ? "border-[#1f8fff] text-white"
                  : "border-transparent text-[#8b949e] hover:text-white"
              }`}
            >
              <BarChart3 className="size-4" />
              <span>Analytics</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("activity")}
              className={`flex items-center gap-2 pb-2 text-sm font-semibold transition border-b-2 ${
                activeTab === "activity"
                  ? "border-[#1f8fff] text-white"
                  : "border-transparent text-[#8b949e] hover:text-white"
              }`}
            >
              <Activity className="size-4" />
              <span>Activity</span>
            </button>
          </div>

          {/* Other Collections Quick Selector */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[#8b949e]">
            <span>Series:</span>
            {getEditionCollections().map((col) => (
              <Link
                key={col.id}
                to={`/editions/collection/${col.id}`}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  col.id === collection.id
                    ? "bg-[#1f8fff]/20 border-[#1f8fff] text-[#58a6ff] font-semibold"
                    : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white"
                }`}
              >
                {col.name.split(" ")[0]}
              </Link>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. TAB VIEW 1: ITEMS CATALOG & LEFT FILTER SIDEBAR           */}
        {/* ============================================================ */}
        {activeTab === "items" && (
          <div className="py-6">
            {/* Top Filter & Toolbar Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2.5 flex-1 max-w-xl">
                {/* Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-2 transition ${
                    showFilters
                      ? "bg-[#1f8fff] text-white border-[#1f8fff]"
                      : "bg-[#161b22] text-[#c9d1d9] border-[#30363d] hover:bg-[#21262d]"
                  }`}
                >
                  <Filter className="size-3.5" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="size-4 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* Items Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8b949e]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, serial, or token ID..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#161b22] border border-[#30363d] text-xs font-mono text-white placeholder:text-[#8b949e] focus:outline-none focus:border-[#1f8fff]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sorting & Layout Toggles */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2.5 rounded-xl bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#c9d1d9] focus:outline-none focus:border-[#1f8fff]"
                >
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="scarcity">Edition Scarcity</option>
                  <option value="newest">Recently Created</option>
                </select>

                <div className="hidden sm:flex items-center bg-[#161b22] border border-[#30363d] rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setGridDensity("large")}
                    className={`p-1.5 rounded-lg transition ${
                      gridDensity === "large"
                        ? "bg-[#21262d] text-white"
                        : "text-[#8b949e] hover:text-white"
                    }`}
                    title="Large Grid"
                  >
                    <LayoutGrid className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridDensity("compact")}
                    className={`p-1.5 rounded-lg transition ${
                      gridDensity === "compact"
                        ? "bg-[#21262d] text-white"
                        : "text-[#8b949e] hover:text-white"
                    }`}
                    title="Compact Grid"
                  >
                    <Grid3X3 className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters Pill Bar */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-[#21262d]">
                <span className="text-[11px] font-mono text-[#8b949e]">Active Filters:</span>
                {statusFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-mono text-white">
                    <span>Status: {statusFilter.replace("_", " ")}</span>
                    <button type="button" onClick={() => setStatusFilter("all")}>
                      <X className="size-3 hover:text-red-400" />
                    </button>
                  </span>
                )}
                {(minPrice || maxPrice) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-mono text-white">
                    <span>
                      Price: {minPrice || "0"} - {maxPrice || "∞"} {priceCurrency}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice("");
                        setMaxPrice("");
                      }}
                    >
                      <X className="size-3 hover:text-red-400" />
                    </button>
                  </span>
                )}
                {selectedCameras.map((cam) => (
                  <span
                    key={cam}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-mono text-white"
                  >
                    <span>{cam}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCameras((prev) => prev.filter((c) => c !== cam))
                      }
                    >
                      <X className="size-3 hover:text-red-400" />
                    </button>
                  </span>
                ))}
                {hasPhysicalTwinOnly && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-mono text-white">
                    <span>Physical Twin</span>
                    <button type="button" onClick={() => setHasPhysicalTwinOnly(false)}>
                      <X className="size-3 hover:text-red-400" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-mono text-[#58a6ff] hover:underline ml-auto"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
              {/* ======================================================== */}
              {/* COLLAPSIBLE LEFT FILTER SIDEBAR                          */}
              {/* ======================================================== */}
              {showFilters && (
                <aside className="w-full bg-[#161b22] rounded-2xl border border-[#30363d] p-4 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold text-white flex items-center gap-2">
                      <SlidersHorizontal className="size-3.5 text-[#58a6ff]" />
                      <span>Collection Attributes</span>
                    </span>
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-[11px] font-mono text-[#8b949e] hover:text-white"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* 1. Status Filter */}
                  <div className="border-b border-[#21262d] pb-4">
                    <button
                      type="button"
                      onClick={() => toggleAccordion("status")}
                      className="w-full flex items-center justify-between text-xs font-semibold text-[#c9d1d9] py-1"
                    >
                      <span>Status</span>
                      {expandedAccordions.status ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </button>
                    {expandedAccordions.status && (
                      <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                        {(["all", "buy_now", "has_offers"] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`py-1.5 px-2 rounded-xl text-[11px] font-mono text-center transition capitalize ${
                              statusFilter === st
                                ? "bg-[#1f8fff] text-white font-semibold"
                                : "bg-[#0d1117] text-[#8b949e] hover:text-white border border-[#30363d]"
                            }`}
                          >
                            {st === "all" ? "All" : st === "buy_now" ? "Buy Now" : "Offers"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Price Filter */}
                  <div className="border-b border-[#21262d] pb-4">
                    <button
                      type="button"
                      onClick={() => toggleAccordion("price")}
                      className="w-full flex items-center justify-between text-xs font-semibold text-[#c9d1d9] py-1"
                    >
                      <span>Price Range</span>
                      {expandedAccordions.price ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </button>
                    {expandedAccordions.price && (
                      <div className="mt-2.5 space-y-2">
                        <div className="flex items-center gap-1 p-1 bg-[#0d1117] rounded-xl border border-[#30363d]">
                          <button
                            type="button"
                            onClick={() => setPriceCurrency("ETH")}
                            className={`flex-1 py-1 rounded-lg text-xs font-mono transition ${
                              priceCurrency === "ETH"
                                ? "bg-[#1f8fff] text-white font-bold"
                                : "text-[#8b949e] hover:text-white"
                            }`}
                          >
                            ETH
                          </button>
                          <button
                            type="button"
                            onClick={() => setPriceCurrency("GBP")}
                            className={`flex-1 py-1 rounded-lg text-xs font-mono transition ${
                              priceCurrency === "GBP"
                                ? "bg-[#1f8fff] text-white font-bold"
                                : "text-[#8b949e] hover:text-white"
                            }`}
                          >
                            GBP (£)
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            placeholder="Min"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono text-white placeholder:text-[#8b949e] focus:outline-none focus:border-[#1f8fff]"
                          />
                          <input
                            type="number"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            placeholder="Max"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono text-white placeholder:text-[#8b949e] focus:outline-none focus:border-[#1f8fff]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Camera Traits */}
                  <div className="border-b border-[#21262d] pb-4">
                    <button
                      type="button"
                      onClick={() => toggleAccordion("camera")}
                      className="w-full flex items-center justify-between text-xs font-semibold text-[#c9d1d9] py-1"
                    >
                      <span>Camera Body ({traitOptions.cameras.length})</span>
                      {expandedAccordions.camera ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </button>
                    {expandedAccordions.camera && (
                      <div className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {traitOptions.cameras.map((cam) => {
                          const isSelected = selectedCameras.includes(cam);
                          const count = editions.filter((e) => e.camera === cam).length;
                          return (
                            <label
                              key={cam}
                              className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d]/50 hover:border-[#1f8fff] cursor-pointer text-xs font-mono transition"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setSelectedCameras((prev) => prev.filter((c) => c !== cam));
                                    } else {
                                      setSelectedCameras((prev) => [...prev, cam]);
                                    }
                                  }}
                                  className="rounded text-[#1f8fff] focus:ring-0 bg-[#161b22] border-[#30363d]"
                                />
                                <span className={isSelected ? "text-white font-semibold" : "text-[#8b949e]"}>
                                  {cam}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#8b949e]">({count})</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 4. Edition Tier */}
                  <div className="border-b border-[#21262d] pb-4">
                    <button
                      type="button"
                      onClick={() => toggleAccordion("tier")}
                      className="w-full flex items-center justify-between text-xs font-semibold text-[#c9d1d9] py-1"
                    >
                      <span>Edition Tier</span>
                      {expandedAccordions.tier ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </button>
                    {expandedAccordions.tier && (
                      <div className="mt-2.5 space-y-1.5">
                        {traitOptions.tiers.map((t) => {
                          const isSelected = selectedTiers.includes(t.id);
                          const count = editions.filter((e) => e.tier === t.id).length;
                          return (
                            <label
                              key={t.id}
                              className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d]/50 hover:border-[#1f8fff] cursor-pointer text-xs font-mono transition"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setSelectedTiers((prev) => prev.filter((id) => id !== t.id));
                                    } else {
                                      setSelectedTiers((prev) => [...prev, t.id]);
                                    }
                                  }}
                                  className="rounded text-[#1f8fff] focus:ring-0 bg-[#161b22] border-[#30363d]"
                                />
                                <span className={isSelected ? "text-white font-semibold" : "text-[#8b949e]"}>
                                  {t.label}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#8b949e]">({count})</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 5. Physical Archival Twin Toggle */}
                  <div>
                    <label className="flex items-center justify-between px-2 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] cursor-pointer text-xs font-mono transition hover:border-[#1f8fff]">
                      <span className="text-white flex items-center gap-2">
                        <Sparkles className="size-3.5 text-[#10B981]" />
                        <span>Physical Archival Twin</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={hasPhysicalTwinOnly}
                        onChange={(e) => setHasPhysicalTwinOnly(e.target.checked)}
                        className="rounded text-[#1f8fff] focus:ring-0 bg-[#161b22] border-[#30363d]"
                      />
                    </label>
                  </div>
                </aside>
              )}

              {/* ======================================================== */}
              {/* MAIN ITEMS GRID                                          */}
              {/* ======================================================== */}
              <div className="w-full">
                {filteredEditions.length === 0 ? (
                  <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-12 text-center">
                    <Sparkles className="size-10 text-[#8b949e] mx-auto mb-3 opacity-60" />
                    <h3 className="text-base font-serif font-bold text-white mb-1">
                      No Editions Found
                    </h3>
                    <p className="text-xs text-[#8b949e] font-mono max-w-sm mx-auto mb-4">
                      No artworks in this collection match the selected filters.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-4 py-2 rounded-xl bg-[#1f8fff] text-white text-xs font-mono font-bold hover:bg-[#1977d6] transition"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div
                    className={`grid gap-4 ${
                      gridDensity === "compact"
                        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    }`}
                  >
                    {filteredEditions.map((item) => {
                      const isSoldOut = item.availableEditions === 0;
                      return (
                        <div
                          key={item.id}
                          className="group rounded-2xl overflow-hidden border border-[#21262d] bg-[#161b22] hover:border-[#1f8fff] transition duration-300 flex flex-col shadow-lg relative"
                        >
                          {/* Image Container */}
                          <div className="relative aspect-square overflow-hidden bg-[#0d1117]">
                            <Link to={`/editions/${item.id}`} className="block size-full">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="size-full object-cover transition duration-500 group-hover:scale-105 cursor-pointer"
                              />
                            </Link>

                            {/* Scarcity / Serial Badge */}
                            <div className="absolute top-2.5 left-2.5 flex gap-1.5 z-10">
                              <span className="px-2 py-0.5 rounded-md bg-black/75 border border-white/10 backdrop-blur-md text-[10px] font-mono text-[#80d0ff] font-semibold">
                                {item.tier === "genesis_1_of_1"
                                  ? "Genesis 1/1"
                                  : `${item.availableEditions}/${item.totalEditions} left`}
                              </span>
                            </div>

                            {item.hasPhysicalTwin && (
                              <div className="absolute top-2.5 right-2.5 z-10">
                                <span className="px-2 py-0.5 rounded-md bg-black/75 border border-white/10 backdrop-blur-md text-[10px] font-mono text-[#10B981] font-semibold">
                                  + Twin
                                </span>
                              </div>
                            )}

                            {/* Hover Quick Action Buttons */}
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4 z-20">
                              <button
                                type="button"
                                onClick={() => handleInstantCollect(item)}
                                disabled={isSoldOut}
                                className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition shadow-lg flex items-center gap-1.5 ${
                                  isSoldOut
                                    ? "bg-white/10 text-white/40 cursor-not-allowed"
                                    : "bg-[#1f8fff] text-white hover:bg-[#1977d6]"
                                }`}
                              >
                                <Zap className="size-3.5 fill-current" />
                                <span>{isSoldOut ? "Sold Out" : "Buy Now"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const sampleOwnership: EditionOwnership = {
                                    id: `coa-${item.id}`,
                                    editionId: item.id,
                                    serialNumber: 1,
                                    serialDisplay:
                                      item.tier === "genesis_1_of_1"
                                        ? "#01 / 01"
                                        : `#01 / ${item.totalEditions}`,
                                    ownerId: item.photographerId,
                                    ownerName: item.photographerName,
                                    acquiredAt: item.mintedAt,
                                    purchasePriceGbp: item.priceGbp,
                                    purchaseCurrency: "ETH",
                                    certificateNumber: `COA-${item.tokenId.replace("NSC-", "")}-01`,
                                    isListedForResale: false,
                                  };
                                  setActiveCertData({
                                    edition: item,
                                    ownership: sampleOwnership,
                                  });
                                }}
                                className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/20 text-white transition"
                                title="Inspect Archival Certificate of Authenticity"
                              >
                                <Eye className="size-4" />
                              </button>

                              <Link
                                to={`/editions/${item.id}`}
                                className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/20 text-white transition"
                                title="View NFT Picture Details"
                              >
                                <ExternalLink className="size-4" />
                              </Link>
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                            <div>
                              <div className="flex items-center justify-between text-[10px] font-mono text-[#8b949e] mb-1">
                                <span className="truncate">{item.tokenId}</span>
                                <span>{item.yearCreated}</span>
                              </div>

                              <Link to={`/editions/${item.id}`}>
                                <h3 className="font-serif text-sm font-semibold text-white truncate hover:text-[#58a6ff] transition">
                                  {item.title}
                                </h3>
                              </Link>
                            </div>

                            {/* Camera & Lens Meta */}
                            <div className="px-2 py-1 rounded-md bg-[#0d1117] border border-[#21262d] text-[10px] font-mono text-[#8b949e] flex items-center justify-between truncate">
                              <span className="truncate">{item.camera}</span>
                              <span className="shrink-0">{item.lens}</span>
                            </div>

                            {/* Pricing Row */}
                            <div className="pt-2 border-t border-[#21262d] flex items-center justify-between">
                              <div>
                                <span className="text-[9px] font-mono uppercase text-[#8b949e] block">
                                  Price
                                </span>
                                <span className="font-mono text-sm font-bold text-white">
                                  {item.priceEth} ETH
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="text-[9px] font-mono uppercase text-[#8b949e] block">
                                  Last Sale
                                </span>
                                <span className="font-mono text-xs text-[#8b949e]">
                                  {(item.priceEth * 0.95).toFixed(2)} ETH
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 6. TAB VIEW 2: ANALYTICS & VOLUME TRENDS                     */}
        {/* ============================================================ */}
        {activeTab === "analytics" && (
          <div className="py-8 space-y-6">
            <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold font-serif text-white flex items-center gap-2">
                    <span>Floor Price & Volume History</span>
                    <TrendingUp className="size-4 text-[#10B981]" />
                  </h2>
                  <p className="text-xs font-mono text-[#8b949e]">
                    Daily trading volume across primary and secondary verified provenance transfers.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 p-1 bg-[#0d1117] rounded-xl border border-[#30363d] text-xs font-mono">
                  {(["24h", "7d", "30d", "All"] as const).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      className={`px-3 py-1 rounded-lg transition ${
                        tf === "7d"
                          ? "bg-[#1f8fff] text-white font-bold"
                          : "text-[#8b949e] hover:text-white"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sparkline Graphic / Volume Bar Representation */}
              <div className="h-64 flex items-end gap-3 pt-6 pb-2 border-b border-[#21262d]">
                {[32, 45, 28, 65, 80, 52, 94, 76, 88, 110, 95, 142].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div
                      style={{ height: `${(val / 142) * 100}%` }}
                      className="w-full rounded-t-md bg-[#1f8fff]/70 group-hover:bg-[#1f8fff] transition-all relative"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition px-2 py-0.5 rounded bg-black text-[10px] font-mono text-white pointer-events-none whitespace-nowrap z-20">
                        {val} ETH
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-[#8b949e]">
                      {idx + 1}d
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-left">
                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d]">
                  <span className="text-xs font-mono text-[#8b949e] block">All-Time High Sale</span>
                  <span className="text-xl font-mono font-bold text-white block mt-1">2.40 ETH</span>
                  <span className="text-[11px] font-mono text-[#10B981]">Kyoto Nocturne #01</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d]">
                  <span className="text-xs font-mono text-[#8b949e] block">24h Sales Volume</span>
                  <span className="text-xl font-mono font-bold text-white block mt-1">18.6 ETH</span>
                  <span className="text-[11px] font-mono text-[#10B981]">+28.4% vs last week</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d]">
                  <span className="text-xs font-mono text-[#8b949e] block">Secondary Royalties Paid</span>
                  <span className="text-xl font-mono font-bold text-[#80d0ff] block mt-1">14.25 ETH</span>
                  <span className="text-[11px] font-mono text-[#8b949e]">10% distributed directly</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 7. TAB VIEW 3: LIVE COLLECTION ACTIVITY                      */}
        {/* ============================================================ */}
        {activeTab === "activity" && (
          <div className="py-8">
            <div className="rounded-2xl border border-[#30363d] bg-[#161b22] overflow-hidden shadow-xl">
              <div className="p-5 border-b border-[#21262d]">
                <h2 className="text-base font-bold font-serif text-white">
                  Provenance & Transfer Audit Trail
                </h2>
                <p className="text-xs font-mono text-[#8b949e]">
                  Cryptographically signed on-chain events and sales for this collection.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-[#0d1117] border-b border-[#21262d] text-[#8b949e]">
                      <th className="py-3 px-4">Event</th>
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">From</th>
                      <th className="py-3 px-4">To</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d]">
                    {getStoredActivity().slice(0, 12).map((act) => (
                      <tr key={act.id} className="hover:bg-white/5 transition">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              act.type === "purchased"
                                ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40"
                                : act.type === "minted"
                                ? "bg-[#80d0ff]/20 text-[#80d0ff] border border-[#80d0ff]/40"
                                : act.type === "transferred"
                                ? "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40"
                                : "bg-white/10 text-white/80 border border-white/20"
                            }`}
                          >
                            {act.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white font-medium">
                          {act.details ? (act.details.length > 32 ? `${act.details.slice(0, 32)}...` : act.details) : `Edition #${act.editionId.slice(-4)}`}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {act.price ? `${act.price} ${act.currency || "ETH"}` : "—"}
                        </td>
                        <td className="py-3 px-4 text-[#8b949e]">
                          {act.fromUser ? act.fromUser : collection.photographerName}
                        </td>
                        <td className="py-3 px-4 text-[#8b949e]">
                          {act.toUser ? act.toUser : "Vault"}
                        </td>
                        <td className="py-3 px-4 text-[#8b949e]">
                          {new Date(act.timestamp).toLocaleDateString("en-GB")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={`https://etherscan.io/tx/${act.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#58a6ff] hover:underline inline-flex items-center gap-1"
                          >
                            <span>{act.txHash.slice(0, 6)}...</span>
                            <ExternalLink className="size-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 8. CERTIFICATE OF AUTHENTICITY MODAL                         */}
      {/* ============================================================ */}
      {activeCertData && (
        <CertificateOfAuthenticityModal
          edition={activeCertData.edition}
          ownership={activeCertData.ownership}
          onClose={() => setActiveCertData(null)}
        />
      )}
    </div>
  );
}

