import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import {
  Compass,
  LayoutGrid,
  Activity,
  Calendar,
  Anchor,
  ShieldCheck,
  User,
  Settings,
  ArrowLeft,
  Search,
  Bell,
  Fuel,
  Wallet,
  Check,
  Copy,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ChevronRight,
  ShoppingBag,
  Eye,
  ArrowUpRight,
  TrendingUp,
  Flame,
  CheckCircle2,
  X,
  Layers,
  Award,
  Globe,
  RefreshCw,
  LogOut,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStoredEditions,
  getStoredOwnerships,
  getStoredActivity,
  purchaseEdition,
  type DigitalEdition,
  type EditionTier,
} from "../data/editions";
import { CertificateOfAuthenticityModal } from "../components/CertificateOfAuthenticityModal";
import { MintEditionModal } from "../components/MintEditionModal";
import { useAuth } from "../context/AuthContext";
import { fetchCreatorWeb3Vault, type CryptoWalletEntry } from "../data/db";
import {
  fetchMultiChainVaultBalances,
  type MultiChainVaultBalance,
} from "../../lib/onChainBalance";
import { copyToClipboard } from "../../lib/clipboard";
import { generateQrSvg } from "../../lib/qrcode";
import { photos, type Photo } from "../data/photos";

// Mini SVG Sparkline Component
function Sparkline({
  data,
  isPositive = true,
  className = "w-24 h-8",
}: {
  data: number[];
  isPositive?: boolean;
  className?: string;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 32;
  const width = 100;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const color = isPositive ? "#10B981" : "#EF4444";
  const gradId = `spark-grad-${data[0]}-${data[data.length - 1]}`;

  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#${gradId})`} points={`0,${height} ${points} ${width},${height}`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// OpenSea stylized ship / monogram logo
function OpenSeaShipLogo({ className = "size-7" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 40 40" fill="none" className="size-full">
        <rect width="40" height="40" rx="10" fill="#2081E2" />
        <path d="M10 24L20 9L30 24H10Z" fill="white" fillOpacity="0.9" />
        <path d="M13 25.5C15 28 25 28 27 25.5L25 31H15L13 25.5Z" fill="white" />
      </svg>
    </div>
  );
}

export function Editions() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [editions, setEditions] = useState<DigitalEdition[]>(() => getStoredEditions());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<"nfts" | "collections">("nfts");
  const [activeTimeframe, setActiveTimeframe] = useState<"1h" | "6h" | "24h" | "7d">("24h");
  const [proMode, setProMode] = useState<boolean>(false);
  const [currencyMode, setCurrencyMode] = useState<"crypto" | "usd">("crypto");

  // Wallet Flyout & Web3 State
  const [isWalletFlyoutOpen, setIsWalletFlyoutOpen] = useState<boolean>(false);
  const [vaultWallets, setVaultWallets] = useState<CryptoWalletEntry[]>([]);
  const [vaultBalances, setVaultBalances] = useState<MultiChainVaultBalance | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Modals
  const [activeCertData, setActiveCertData] = useState<{
    edition: DigitalEdition;
    ownership: any;
  } | null>(null);
  const [selectedEditionForPurchase, setSelectedEditionForPurchase] =
    useState<DigitalEdition | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState<"GBP" | "ETH" | "USDT" | "SOL">("ETH");
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [activeDepositCoin, setActiveDepositCoin] = useState<"ETH" | "SOL" | "USDT" | "BTC">("ETH");

  // Hero carousel slide index
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  // Load user Web3 vault balances
  useEffect(() => {
    let isMounted = true;
    async function loadVault() {
      if (!user) return;
      try {
        const targetId = user.slug || user.id;
        const vault = await fetchCreatorWeb3Vault(targetId);
        if (vault && vault.wallets && vault.wallets.length > 0 && isMounted) {
          setVaultWallets(vault.wallets);
          const balances = await fetchMultiChainVaultBalances(vault.wallets);
          if (isMounted) setVaultBalances(balances);
        }
      } catch (err) {
        console.error("Failed to load Web3 vault in Editions:", err);
      }
    }
    loadVault();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Derived user addresses for the OpenSea multi-wallet drawer
  const evmWallet = useMemo(() => {
    const found = vaultWallets.find(
      (w) => w.coin === "ETH" || w.network === "ERC20" || w.network === "Base",
    );
    return (
      found || {
        coin: "ETH",
        network: "Base",
        address: "0x9f538e12a8497cb9e2a1b9f481c4e90264b9401b",
        name: "EVM Primary Vault",
      }
    );
  }, [vaultWallets]);

  const solanaWallet = useMemo(() => {
    const found = vaultWallets.find((w) => w.coin === "SOL" || w.network === "Solana");
    return (
      found || {
        coin: "SOL",
        network: "Solana",
        address: "7mXw8kP2q9tZ4L5nY6vB3jR8cM1dF9sA2eH5gW7uK4p",
        name: "Solana Primary Vault",
      }
    );
  }, [vaultWallets]);

  // Combined wallet value display
  const totalWalletUsd = useMemo(() => {
    if (!vaultBalances) return "$0.00";
    return `$${(vaultBalances.totalGbp * 1.28).toFixed(2)}`;
  }, [vaultBalances]);

  // Global keyboard shortcut '/' to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsWalletFlyoutOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Featured Editions for Hero Carousel
  const featuredEditions = useMemo(() => {
    const list = editions.filter((e) => e.featured);
    return list.length > 0 ? list : editions.slice(0, 3);
  }, [editions]);

  const activeHero = featuredEditions[heroSlideIndex % featuredEditions.length] || editions[0];

  // Filtered editions catalog
  const filteredEditions = useMemo(() => {
    return editions.filter((e) => {
      // Category filter
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

      // Search query
      const matchesSearch =
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.photographerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.collectionName && e.collectionName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        e.camera.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.tokenId.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesChain && matchesSearch;
    });
  }, [editions, selectedCategory, selectedChain, searchQuery]);

  // Trending tokens / editions mock with live sparklines
  const trendingDrops = useMemo(
    () => [
      {
        id: "tr-1",
        title: "Kyoto Nocturnes",
        artist: "Haru Tanaka",
        avatar:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        volume: "£142.5K",
        change: "+28.3%",
        isPositive: true,
        sparkline: [12, 14, 13, 17, 19, 18, 24, 28],
      },
      {
        id: "tr-2",
        title: "Gangwon Mist Series",
        artist: "Junghoon Sung",
        avatar:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        volume: "£68.2K",
        change: "+14.5%",
        isPositive: true,
        sparkline: [20, 21, 19, 22, 23, 21, 26, 29],
      },
      {
        id: "tr-3",
        title: "Barbican Modernism",
        artist: "Patrick Watson-Quine",
        avatar:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
        volume: "£34.8K",
        change: "+9.9%",
        isPositive: true,
        sparkline: [15, 16, 14, 18, 17, 20, 22, 24],
      },
      {
        id: "tr-4",
        title: "Namib Dune Twilight",
        artist: "Lexmond Dennis",
        avatar:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        volume: "£89.0K",
        change: "+18.2%",
        isPositive: true,
        sparkline: [30, 29, 32, 35, 33, 38, 41, 44],
      },
    ],
    [],
  );

  // Right-hand Leaderboard collections
  const leaderboardItems = useMemo(
    () => [
      {
        rank: 1,
        title: "Kyoto Nocturnes",
        artist: "Haru Tanaka",
        image:
          "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=150&auto=format&fit=crop&q=80",
        floorEth: "0.72 ETH",
        floorUsd: "$1,850",
        change: "+456.6%",
        isPositive: true,
      },
      {
        rank: 2,
        title: "Gangwon Peninsula",
        artist: "Junghoon Sung",
        image:
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=150&auto=format&fit=crop&q=80",
        floorEth: "0.18 ETH",
        floorUsd: "$450",
        change: "+10.5%",
        isPositive: true,
      },
      {
        rank: 3,
        title: "Barbican Geometry",
        artist: "Patrick Watson-Quine",
        image:
          "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=150&auto=format&fit=crop&q=80",
        floorEth: "0.11 ETH",
        floorUsd: "$280",
        change: "+22.2%",
        isPositive: true,
      },
      {
        rank: 4,
        title: "Dune 45 Genesis",
        artist: "Lexmond Dennis",
        image:
          "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=150&auto=format&fit=crop&q=80",
        floorEth: "0.58 ETH",
        floorUsd: "$1,480",
        change: "+4.1%",
        isPositive: true,
      },
      {
        rank: 5,
        title: "Nordic Silence",
        artist: "Astrid Lindholm",
        image:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&auto=format&fit=crop&q=80",
        floorEth: "0.25 ETH",
        floorUsd: "$640",
        change: "+18.4%",
        isPositive: true,
      },
    ],
    [],
  );

  const handleCopy = (text: string, label: string) => {
    copyToClipboard(text);
    setCopiedAddress(text);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedAddress(null), 2500);
  };

  const handlePurchase = (edition: DigitalEdition) => {
    setSelectedEditionForPurchase(edition);
  };

  const confirmPurchase = () => {
    if (!selectedEditionForPurchase) return;
    try {
      setPurchasing(true);
      const buyerName = user?.name || "Private Collector";
      const buyerId = user?.id || "guest-collector";
      const buyerEmail = user?.email;

      const res = purchaseEdition(
        selectedEditionForPurchase.id,
        { id: buyerId, name: buyerName, email: buyerEmail },
        paymentCurrency,
      );

      if (res.success && res.ownership) {
        toast.success(
          `Acquired: ${selectedEditionForPurchase.title} (${res.ownership.serialDisplay})`,
        );
        setEditions(getStoredEditions());
        setSelectedEditionForPurchase(null);
        setActiveCertData({
          edition: selectedEditionForPurchase,
          ownership: res.ownership,
        });
      } else {
        toast.error(res.error || "Purchase failed.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Transaction failed");
    } finally {
      setPurchasing(false);
    }
  };

  // Sample photo to supply to MintEditionModal
  const demoMintPhoto: Photo = useMemo(() => {
    return (
      photos[0] || {
        id: "demo-photo",
        title: "Fine Art Master Study",
        photographerId: user?.id || "artist-1",
        photographer: user?.name || "Elena Vance",
        category: "Fine Art",
        image:
          "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&auto=format&fit=crop&q=85",
        price: 250,
        license: "EXCLUSIVE",
        location: "Studio",
        color: "Dark",
        orientation: "landscape",
        ratio: "aspect-[4/3]",
        downloads: 0,
        views: 0,
        likes: 0,
        camera: "Leica M11",
        lens: "50mm f/0.95",
        iso: 100,
        keywords: ["fine-art", "digital-edition"],
      }
    );
  }, [user]);

  return (
    <div className="min-h-screen bg-[#080B10] text-[#E5E8EB] flex flex-col selection:bg-[#2081E2] selection:text-white font-sans antialiased">
      {/* App Shell: Left Slim Rail + Main Workspace */}
      <div className="flex flex-1 relative overflow-x-hidden">
        {/* ============================================================ */}
        {/* 1. LEFT SLIM NAVIGATION RAIL (OpenSea Desktop Icon Rail)     */}
        {/* ============================================================ */}
        <aside className="w-16 shrink-0 bg-[#0A0D14] border-r border-[#1B222D] flex flex-col items-center justify-between py-3.5 z-40 sticky top-0 h-screen">
          {/* Top Rail: Brand Icon + Primary Navigation */}
          <div className="flex flex-col items-center gap-4 w-full">
            {/* OpenSea Style App Logo */}
            <Link
              to="/editions"
              className="p-1 rounded-xl transition hover:scale-105 active:scale-95 group relative"
              title="NS Editions Marketplace"
            >
              <OpenSeaShipLogo className="size-9" />
              <span className="absolute left-16 ml-2 px-2 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                NS Editions Home
              </span>
            </Link>

            <div className="w-8 h-[1px] bg-[#1F2633]" />

            {/* Navigation Icons with OpenSea-style active indicators */}
            <nav className="flex flex-col items-center gap-1.5 w-full">
              {/* Discover / Explore */}
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedChain("all");
                  setSearchQuery("");
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition group relative ${
                  selectedCategory === "all"
                    ? "bg-[#2081E2]/20 text-[#2081E2] border border-[#2081E2]/40"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                title="Discover Editions"
              >
                <Compass className="size-5" />
                <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Discover
                </span>
              </button>

              {/* Collections */}
              <button
                onClick={() => setSelectedCategory("series")}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition group relative ${
                  selectedCategory === "series"
                    ? "bg-[#2081E2]/20 text-[#2081E2] border border-[#2081E2]/40"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                title="Curated Series"
              >
                <LayoutGrid className="size-5" />
                <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Series & Collections
                </span>
              </button>

              {/* Activity / Pulse */}
              <button
                onClick={() => {
                  const acts = getStoredActivity();
                  toast.info(
                    `Live Provenance Engine: ${acts.length} authenticated blockchain records on Base & Solana.`,
                  );
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition group relative"
                title="Activity Feed"
              >
                <Activity className="size-5" />
                <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Activity Feed
                </span>
              </button>

              {/* Drops Calendar */}
              <button
                onClick={() => setSelectedCategory("genesis")}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition group relative ${
                  selectedCategory === "genesis"
                    ? "bg-[#2081E2]/20 text-[#2081E2] border border-[#2081E2]/40"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                title="Genesis Drops"
              >
                <Calendar className="size-5" />
                <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Genesis Drops
                </span>
              </button>

              {/* Mint / Create (Anchor) */}
              <button
                onClick={() => setIsMintModalOpen(true)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#10B981] bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/30 transition group relative shadow-md"
                title="Mint Fine-Art Edition"
              >
                <Anchor className="size-5" />
                <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Mint Edition (Web3 Deposit Required)
                </span>
              </button>

              {/* Certificate of Authenticity Lookup */}
              <button
                onClick={() => {
                  const sampleEdition = editions[0];
                  const sampleOwnership = getStoredOwnerships().find(
                    (o) => o.editionId === sampleEdition.id,
                  ) || {
                    id: "coa-demo",
                    editionId: sampleEdition.id,
                    serialNumber: 1,
                    serialDisplay: "#01 / 01",
                    ownerId: "owner-1",
                    ownerName: sampleEdition.photographerName,
                    acquiredAt: sampleEdition.mintedAt,
                    purchasePriceGbp: sampleEdition.priceGbp,
                    purchaseCurrency: "ETH",
                    certificateNumber: "COA-NSC-DEMO-01",
                    isListedForResale: false,
                  };
                  setActiveCertData({
                    edition: sampleEdition,
                    ownership: sampleOwnership,
                  });
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition group relative"
                title="Inspect Archival COA"
              >
                <ShieldCheck className="size-5" />
                <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Archival Certificates (COA)
                </span>
              </button>
            </nav>
          </div>

          {/* Bottom Rail: Back to Main Photography Gallery & Vault Account */}
          <div className="flex flex-col items-center gap-3 w-full">
            {/* Return to Normal Photography Gallery */}
            <Link
              to="/search"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition group relative border border-white/5"
              title="Back to Photography Gallery"
            >
              <ArrowLeft className="size-4" />
              <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Exit to Photography Gallery
              </span>
            </Link>

            {/* Profile / Web3 Vault */}
            <Link
              to="/account?tab=vault"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition group relative"
              title="Collector Web3 Vault"
            >
              <User className="size-5" />
              <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Web3 Settlement Vault
              </span>
            </Link>

            {/* Settings */}
            <button
              onClick={() => toast.info("Collector terminal preferences saved.")}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition group relative"
              title="Settings"
            >
              <Settings className="size-4" />
              <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Preferences
              </span>
            </button>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* 2. MAIN WORKSPACE WITH TOP BAR, STAGE, & RIGHT LEADERBOARD   */}
        {/* ============================================================ */}
        <div className="flex-1 flex flex-col min-w-0 pb-12">
          {/* ---------------------------------------------------------- */}
          {/* TOP OPEN-SEA APP BAR                                       */}
          {/* ---------------------------------------------------------- */}
          <header className="h-16 bg-[#0A0D14]/90 backdrop-blur-md border-b border-[#1B222D] px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
            {/* Search Input with Hotkey Shortcut '/' */}
            <div className="flex items-center gap-4 flex-1 max-w-xl">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search OpenSea / NS Editions"
                  className="w-full pl-10 pr-10 py-2 bg-[#121722] hover:bg-[#161D2B] focus:bg-[#161D2B] border border-[#222B3A] focus:border-[#2081E2] rounded-xl text-xs text-white placeholder:text-white/40 focus:outline-none transition"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-white/20 text-[10px] text-white/50 font-mono">
                  /
                </span>
              </div>
            </div>

            {/* Category Pills (OpenSea Horizontal Badges) */}
            <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto py-1">
              {[
                { id: "all", label: "All" },
                { id: "art", label: "Art" },
                { id: "genesis", label: "Genesis 1/1" },
                { id: "series", label: "Series" },
                { id: "twin", label: "Physical" },
                { id: "curator", label: "Spotlight" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                    selectedCategory === c.id
                      ? "bg-white text-[#0A0D14] font-semibold"
                      : "bg-[#121722] text-white/70 hover:text-white hover:bg-[#1A2230] border border-[#222B3A]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Multi-Chain Filter Selectors */}
            <div className="hidden 2xl:flex items-center gap-1.5 pl-3 border-l border-[#1B222D]">
              {[
                { id: "all", label: "All", icon: "🌐" },
                { id: "eth", label: "Ethereum", icon: "⟠" },
                { id: "sol", label: "Solana", icon: "◎" },
                { id: "base", label: "Base", icon: "🔵" },
                { id: "btc", label: "Bitcoin", icon: "₿" },
                { id: "tron", label: "TRON", icon: "💎" },
              ].map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChain(ch.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-mono transition flex items-center gap-1 ${
                    selectedChain === ch.id
                      ? "bg-[#2081E2] text-white font-bold"
                      : "bg-[#121722] text-white/60 hover:text-white border border-[#222B3A]"
                  }`}
                  title={ch.label}
                >
                  <span>{ch.icon}</span>
                  <span className="text-[11px]">{ch.id.toUpperCase()}</span>
                </button>
              ))}
            </div>

            {/* Right Controls: Gas Tracker, Notifications, Wallet Pill & Avatar */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Notification Bell */}
              <button
                onClick={() => toast.info("No unread marketplace notifications.")}
                className="size-9 rounded-xl flex items-center justify-center bg-[#121722] hover:bg-[#1A2230] border border-[#222B3A] text-white/60 hover:text-white transition relative"
                title="Notifications"
              >
                <Bell className="size-4" />
                <span className="absolute top-2 right-2 size-2 rounded-full bg-[#2081E2]" />
              </button>

              {/* Gas Tracker Pill */}
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121722] border border-[#222B3A] text-xs font-mono text-white/80"
                title="Current Ethereum / Base Gas Tracker"
              >
                <Fuel className="size-3.5 text-[#10B981]" />
                <span className="text-[11px]">15 Gwei</span>
              </div>

              {/* Wallet Pill & Connected Avatar (Triggers OpenSea Multi-Wallet Flyout) */}
              <div className="relative">
                <button
                  onClick={() => setIsWalletFlyoutOpen(!isWalletFlyoutOpen)}
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-[#121722] hover:bg-[#1A2230] border border-[#222B3A] rounded-xl transition shadow-sm"
                >
                  <Wallet className="size-4 text-[#2081E2]" />
                  <span className="font-mono text-xs font-semibold text-white">
                    {totalWalletUsd}
                  </span>

                  {/* Blockies style user avatar circle */}
                  <div className="size-6 rounded-full bg-gradient-to-tr from-[#9333EA] via-[#2081E2] to-[#10B981] flex items-center justify-center text-[10px] font-bold text-white uppercase ml-1">
                    {user?.name ? user.name.slice(0, 2) : "0x"}
                  </div>
                  <ChevronDown className="size-3.5 text-white/50" />
                </button>

                {/* ============================================================ */}
                {/* 3. OPENSEA MULTI-WALLET FLYOUT DRAWER (Top Right Dropdown)   */}
                {/* ============================================================ */}
                {isWalletFlyoutOpen && (
                  <div className="absolute right-0 top-12 mt-2 w-80 bg-[#121722] border border-[#232D3F] rounded-2xl shadow-2xl p-4 z-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Header Address Card */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-full bg-gradient-to-br from-[#EC4899] via-[#8B5CF6] to-[#3B82F6] flex items-center justify-center text-xs font-bold text-white shadow-inner">
                          {user?.name ? user.name.slice(0, 2).toUpperCase() : "0x"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-xs font-mono font-semibold text-white">
                            <span>
                              {evmWallet.address.slice(0, 6)}...
                              {evmWallet.address.slice(-4)}
                            </span>
                            <button
                              onClick={() => handleCopy(evmWallet.address, "EVM Address")}
                              className="text-white/40 hover:text-white transition p-0.5"
                              title="Copy EVM Address"
                            >
                              {copiedAddress === evmWallet.address ? (
                                <Check className="size-3 text-[#10B981]" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] font-mono text-white/50 block">
                            2 Wallets Linked • {totalWalletUsd}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-white/40" />
                    </div>

                    {/* Sub-Wallets List */}
                    <div className="space-y-2">
                      {/* EVM Wallet Card */}
                      <div className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-lg bg-[#2081E2]/20 border border-[#2081E2]/40 flex items-center justify-center text-xs text-[#2081E2] font-mono font-bold">
                            ⟠
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-white block">
                              EVM Wallet
                            </span>
                            <span className="text-[10px] font-mono text-white/50 block">
                              {evmWallet.address.slice(0, 4)}...{evmWallet.address.slice(-4)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-xs font-semibold text-white block">
                            {vaultBalances?.assets.find((a) => a.coin === "ETH")
                              ?.balanceFormatted || "0.00 ETH"}
                          </span>
                          <span className="text-[10px] text-[#10B981] block">● Connected</span>
                        </div>
                      </div>

                      {/* Solana Wallet Card */}
                      <div className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-lg bg-[#9945FF]/20 border border-[#9945FF]/40 flex items-center justify-center text-xs text-[#9945FF] font-mono font-bold">
                            ◎
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-white block">
                              Solana Wallet
                            </span>
                            <span className="text-[10px] font-mono text-white/50 block">
                              {solanaWallet.address.slice(0, 4)}...{solanaWallet.address.slice(-4)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-xs font-semibold text-white block">
                            {vaultBalances?.assets.find((a) => a.coin === "SOL")
                              ?.balanceFormatted || "0.00 SOL"}
                          </span>
                          <span className="text-[10px] text-[#10B981] block">● Connected</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Links */}
                    <div className="pt-2 border-t border-white/10 space-y-1">
                      {/* Deposit / Link */}
                      <button
                        onClick={() => {
                          setIsWalletFlyoutOpen(false);
                          setIsDepositModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white hover:bg-white/10 transition"
                      >
                        <Plus className="size-4 text-[#2081E2]" />
                        <span>Link Wallet / Deposit Crypto</span>
                      </button>

                      {/* Manage Web3 Vault */}
                      <Link
                        to="/account?tab=vault"
                        onClick={() => setIsWalletFlyoutOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white hover:bg-white/10 transition"
                      >
                        <Wallet className="size-4 text-white/60" />
                        <span>Manage Wallets & Settlement Vault</span>
                      </Link>

                      {/* Profile / Editions */}
                      <button
                        onClick={() => {
                          setIsWalletFlyoutOpen(false);
                          const owns = getStoredOwnerships();
                          if (owns.length === 0) {
                            toast.info("You haven't acquired any digital editions yet.");
                          } else {
                            toast.success(`You own ${owns.length} fine-art digital editions.`);
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white hover:bg-white/10 transition"
                      >
                        <User className="size-4 text-white/60" />
                        <span>Profile & Provenance Portfolio</span>
                      </button>

                      {/* Sign Out */}
                      {user && (
                        <button
                          onClick={async () => {
                            setIsWalletFlyoutOpen(false);
                            await logout();
                            toast.success("Disconnected Web3 session");
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition"
                        >
                          <LogOut className="size-4 text-[#EF4444]" />
                          <span>Log Out</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ---------------------------------------------------------- */}
          {/* MAIN STAGE + RIGHT SIDEBAR LEADERBOARD (75% / 25% GRID)    */}
          {/* ---------------------------------------------------------- */}
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full grid grid-cols-12 gap-8">
            {/* Left 75%: Hero Drop + Trending Drops + Marketplace Grid */}
            <div className="col-span-12 xl:col-span-9 space-y-8">
              {/* ======================================================== */}
              {/* HERO FEATURE DROP CAROUSEL (OpenSea Verified Spotlight)  */}
              {/* ======================================================== */}
              {activeHero && (
                <div className="relative rounded-3xl overflow-hidden border border-[#222B3A] bg-[#0E131C] shadow-2xl group">
                  {/* Background Artwork Banner */}
                  <div className="relative aspect-[16/9] sm:aspect-[21/9] max-h-[460px] overflow-hidden">
                    <img
                      src={activeHero.image}
                      alt={activeHero.title}
                      className="size-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    {/* Deep gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080B10] via-[#080B10]/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#080B10]/90 via-[#080B10]/40 to-transparent" />

                    {/* Content Overlay */}
                    <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-between">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[#2081E2] text-[11px] font-mono font-semibold uppercase tracking-wider">
                            <Sparkles className="size-3" />
                            {activeHero.tier === "genesis_1_of_1"
                              ? "Genesis 1 of 1"
                              : "Curated Limited Series"}
                          </span>
                          {activeHero.hasPhysicalTwin && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono">
                              + Hahnemühle Print Twin
                            </span>
                          )}
                        </div>

                        {/* Slide Selector Indicators */}
                        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                          {featuredEditions.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setHeroSlideIndex(idx)}
                              className={`h-1.5 rounded-full transition-all ${
                                heroSlideIndex % featuredEditions.length === idx
                                  ? "w-6 bg-[#2081E2]"
                                  : "w-2 bg-white/30 hover:bg-white/60"
                              }`}
                              title={`Slide ${idx + 1}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Bottom Title, Artist & Stats Overlay Bar */}
                      <div className="space-y-4">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2 text-white/80 font-mono text-xs">
                            <span>By {activeHero.photographerName}</span>
                            <span className="size-4 rounded-full bg-[#2081E2] flex items-center justify-center text-white text-[9px]">
                              ✓
                            </span>
                          </div>
                          <h1 className="font-serif text-2xl sm:text-4xl text-white font-medium leading-tight">
                            {activeHero.title}
                          </h1>
                          <p className="text-xs sm:text-sm text-white/70 line-clamp-2 font-serif">
                            {activeHero.description}
                          </p>
                        </div>

                        {/* OpenSea Stats Card Bar */}
                        <div className="inline-flex flex-wrap items-center gap-4 sm:gap-6 p-4 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">
                              FLOOR PRICE
                            </span>
                            <span className="font-mono text-sm sm:text-base font-bold text-white">
                              {currencyMode === "crypto"
                                ? `${activeHero.priceEth} ETH`
                                : `£${activeHero.priceGbp.toLocaleString("en-GB")}`}
                            </span>
                          </div>

                          <div className="w-[1px] h-8 bg-white/15" />

                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">
                              ITEMS
                            </span>
                            <span className="font-mono text-sm sm:text-base font-bold text-white">
                              {activeHero.totalEditions}
                            </span>
                          </div>

                          <div className="w-[1px] h-8 bg-white/15" />

                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">
                              TOTAL VOLUME
                            </span>
                            <span className="font-mono text-sm sm:text-base font-bold text-white">
                              £142.5K
                            </span>
                          </div>

                          <div className="w-[1px] h-8 bg-white/15" />

                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">
                              LISTED
                            </span>
                            <span className="font-mono text-sm sm:text-base font-bold text-[#10B981]">
                              {activeHero.availableEditions} (
                              {activeHero.totalEditions > 0
                                ? (
                                    (activeHero.availableEditions / activeHero.totalEditions) *
                                    100
                                  ).toFixed(0)
                                : 0}
                              %)
                            </span>
                          </div>

                          {/* Action Button inside banner */}
                          <button
                            onClick={() => handlePurchase(activeHero)}
                            disabled={activeHero.availableEditions === 0}
                            className={`ml-auto px-5 py-2.5 rounded-xl font-medium text-xs font-mono transition flex items-center gap-2 shadow-lg ${
                              activeHero.availableEditions === 0
                                ? "bg-white/10 text-white/40 cursor-not-allowed"
                                : "bg-[#2081E2] text-white hover:bg-[#1868B7]"
                            }`}
                          >
                            <ShoppingBag className="size-4" />
                            <span>
                              {activeHero.availableEditions === 0 ? "Sold Out" : "Acquire Edition"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TRENDING DROPS (TOKENS) WITH DYNAMIC SPARKLINE CHARTS    */}
              {/* ======================================================== */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-sans text-lg font-bold text-white flex items-center gap-2">
                      <span>Trending Drops</span>
                      <span className="size-2 rounded-full bg-[#10B981] animate-pulse" />
                    </h2>
                    <p className="text-xs text-white/50">
                      Editions with verified provenance and volume today
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-mono text-[#2081E2] hover:underline cursor-pointer">
                    <span>View all drops</span>
                    <ChevronRight className="size-3" />
                  </div>
                </div>

                {/* Horizontal Cards with Sparklines */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {trendingDrops.map((token) => (
                    <div
                      key={token.id}
                      onClick={() => setSearchQuery(token.title.split(" ")[0])}
                      className="p-3.5 rounded-2xl bg-[#0E131C] border border-[#1E2738] hover:border-[#2081E2]/50 hover:bg-[#121824] transition cursor-pointer flex items-center justify-between shadow-sm group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={token.avatar}
                          alt={token.title}
                          className="size-10 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-white truncate group-hover:text-[#2081E2] transition">
                              {token.title}
                            </span>
                            <span className="size-3.5 rounded-full bg-[#2081E2] flex items-center justify-center text-white text-[8px] shrink-0">
                              ✓
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="text-white/60">{token.volume}</span>
                            <span className="text-[#10B981] font-semibold">{token.change}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sparkline Graph */}
                      <Sparkline
                        data={token.sparkline}
                        isPositive={token.isPositive}
                        className="w-16 h-8 shrink-0 ml-2"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ======================================================== */}
              {/* MARKETPLACE CATALOG GRID (OpenSea Pro Card Layout)       */}
              {/* ======================================================== */}
              <div className="space-y-4 pt-4 border-t border-[#1B222D]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button className="px-3.5 py-1.5 rounded-xl bg-[#2081E2]/15 text-[#2081E2] font-semibold text-xs border border-[#2081E2]/30 flex items-center gap-1.5">
                      <span>Items</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-[#2081E2] text-white text-[10px] font-mono">
                        {filteredEditions.length}
                      </span>
                    </button>
                    <button
                      onClick={() => toast.info("Live secondary trading orderbook syncing...")}
                      className="px-3.5 py-1.5 rounded-xl text-white/60 hover:text-white text-xs hover:bg-white/5 transition"
                    >
                      Activity
                    </button>
                    <button
                      onClick={() => toast.info("Analytics charts available in Pro Mode")}
                      className="px-3.5 py-1.5 rounded-xl text-white/60 hover:text-white text-xs hover:bg-white/5 transition"
                    >
                      Analytics
                    </button>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs text-white/60">
                    <span>Pricing:</span>
                    <button
                      onClick={() => setCurrencyMode(currencyMode === "crypto" ? "usd" : "crypto")}
                      className="px-2.5 py-1 rounded-lg bg-[#121722] border border-[#222B3A] text-white hover:border-[#2081E2] transition"
                    >
                      {currencyMode === "crypto" ? "ETH / SOL" : "GBP (£)"}
                    </button>
                  </div>
                </div>

                {/* Grid of Editions */}
                {filteredEditions.length === 0 ? (
                  <div className="p-16 text-center rounded-2xl bg-[#0E131C] border border-[#1B222D] space-y-3">
                    <Search className="size-8 text-white/30 mx-auto" />
                    <p className="text-white text-sm font-semibold">No digital editions found</p>
                    <p className="text-white/50 text-xs">
                      Try clearing filters or searching for another camera model or artist.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategory("all");
                        setSelectedChain("all");
                        setSearchQuery("");
                      }}
                      className="px-4 py-2 bg-[#2081E2] text-white text-xs rounded-xl font-medium"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredEditions.map((item) => {
                      const isSoldOut = item.availableEditions === 0;
                      return (
                        <div
                          key={item.id}
                          className="group rounded-2xl overflow-hidden bg-[#0E131C] border border-[#1E2738] hover:border-[#2081E2] transition duration-300 flex flex-col shadow-lg relative"
                        >
                          {/* Image Container */}
                          <div className="relative aspect-[4/3] bg-black/40 overflow-hidden">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="size-full object-cover transition duration-500 group-hover:scale-105"
                            />

                            {/* Scarcity / Serial Badge */}
                            <div className="absolute top-3 left-3 flex gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-[#2081E2] text-[10px] font-mono uppercase font-semibold border border-white/15">
                                {item.tier === "genesis_1_of_1"
                                  ? "Genesis 1/1"
                                  : `${item.availableEditions}/${item.totalEditions} Available`}
                              </span>
                            </div>

                            {item.hasPhysicalTwin && (
                              <div className="absolute top-3 right-3">
                                <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-white/90 border border-white/10">
                                  + Print Twin
                                </span>
                              </div>
                            )}

                            {/* Hover Quick Action Buttons */}
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                              <button
                                onClick={() => handlePurchase(item)}
                                disabled={isSoldOut}
                                className={`px-4 py-2.5 rounded-xl font-medium text-xs font-mono transition shadow-lg ${
                                  isSoldOut
                                    ? "bg-white/10 text-white/40 cursor-not-allowed"
                                    : "bg-[#2081E2] text-white hover:bg-[#1868B7]"
                                }`}
                              >
                                {isSoldOut ? "Sold Out" : "Instant Collect"}
                              </button>

                              <button
                                onClick={() => {
                                  const sampleOwnership = getStoredOwnerships().find(
                                    (o) => o.editionId === item.id,
                                  ) || {
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
                                className="px-3.5 py-2.5 rounded-xl font-medium text-xs font-mono bg-white/20 text-white hover:bg-white/30 border border-white/20 transition"
                                title="Inspect Archival COA"
                              >
                                <Eye className="size-4" />
                              </button>
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                              <div className="flex items-center justify-between text-[11px] text-white/50 font-mono mb-1">
                                <span className="truncate">{item.tokenId}</span>
                                <span>{item.yearCreated}</span>
                              </div>

                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-xs text-white/70 truncate">
                                  {item.photographerName}
                                </span>
                                <span className="size-3 rounded-full bg-[#2081E2] flex items-center justify-center text-white text-[7px]">
                                  ✓
                                </span>
                              </div>

                              <h3 className="font-serif text-base text-white font-medium group-hover:text-[#2081E2] transition truncate">
                                {item.title}
                              </h3>
                            </div>

                            {/* Camera & Lens */}
                            <div className="py-1.5 px-2.5 bg-white/5 rounded-lg border border-white/5 text-[10px] font-mono text-white/60 flex items-center justify-between">
                              <span className="truncate">{item.camera}</span>
                              <span className="shrink-0">{item.lens}</span>
                            </div>

                            {/* Pricing & Footer */}
                            <div className="pt-2 border-t border-[#1E2738] flex items-center justify-between">
                              <div>
                                <span className="text-[9px] font-mono uppercase tracking-wider text-white/50 block">
                                  Price
                                </span>
                                <span className="font-mono text-sm font-bold text-white">
                                  {currencyMode === "crypto"
                                    ? `${item.priceEth} ETH`
                                    : `£${item.priceGbp.toLocaleString("en-GB")}`}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-white/50 block">
                                  Secondary Royalty
                                </span>
                                <span className="font-mono text-xs text-[#10B981]">
                                  {item.royaltyPercent}% to Artist
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

            {/* ======================================================== */}
            {/* RIGHT 25%: TOP COLLECTIONS LEADERBOARD (OpenSea Rail)    */}
            {/* ======================================================== */}
            <div className="col-span-12 xl:col-span-3 space-y-4">
              <div className="sticky top-20 bg-[#0E131C] border border-[#1E2738] rounded-2xl p-4 shadow-xl space-y-4">
                {/* Header Switcher: [ NFTs ] [ Collections ] */}
                <div className="flex items-center justify-between border-b border-[#1E2738] pb-3">
                  <div className="flex items-center bg-[#121722] p-1 rounded-xl border border-[#222B3A]">
                    <button
                      onClick={() => setActiveLeaderboardTab("nfts")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        activeLeaderboardTab === "nfts"
                          ? "bg-[#2081E2] text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      NFTs
                    </button>
                    <button
                      onClick={() => setActiveLeaderboardTab("collections")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        activeLeaderboardTab === "collections"
                          ? "bg-[#2081E2] text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      Collections
                    </button>
                  </div>

                  {/* Timeframe selector: 1h / 6h / 24h / 7d */}
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    {(["1h", "6h", "24h", "7d"] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setActiveTimeframe(tf)}
                        className={`px-1.5 py-0.5 rounded transition ${
                          activeTimeframe === tf
                            ? "bg-white/20 text-white font-bold"
                            : "text-white/40 hover:text-white"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Header */}
                <div className="flex items-center justify-between text-[10px] font-mono text-white/50 uppercase tracking-wider px-1">
                  <span>COLLECTION</span>
                  <span>FLOOR / 24H</span>
                </div>

                {/* Ranked List */}
                <div className="space-y-1">
                  {leaderboardItems.map((col) => (
                    <div
                      key={col.rank}
                      onClick={() => setSearchQuery(col.title.split(" ")[0])}
                      className="p-2 rounded-xl hover:bg-[#141C29] transition cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-xs text-white/40 w-4 text-center">
                          {col.rank}
                        </span>
                        <img
                          src={col.image}
                          alt={col.title}
                          className="size-8 rounded-lg object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-white truncate group-hover:text-[#2081E2] transition">
                              {col.title}
                            </span>
                            <span className="size-3 rounded-full bg-[#2081E2] flex items-center justify-center text-white text-[7px] shrink-0">
                              ✓
                            </span>
                          </div>
                          <span className="text-[10px] text-white/40 block truncate">
                            {col.artist}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0 ml-2">
                        <span className="text-xs font-bold text-white block">
                          {currencyMode === "crypto" ? col.floorEth : col.floorUsd}
                        </span>
                        <span className="text-[10px] text-[#10B981] font-semibold block">
                          {col.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* OpenSea Collector Pro Promotion Card */}
                <div className="pt-3 border-t border-[#1E2738] space-y-2">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-[#2081E2]/15 to-transparent border border-[#2081E2]/30 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Flame className="size-3.5 text-[#2081E2]" />
                      <span>NS Editions Terminal Pro</span>
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed">
                      Real-time gas tracking, instant multi-token sweeping, and archival museum COA
                      export.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. BOTTOM STICKY LIVE STATUS BAR (OpenSea Console Footer)    */}
      {/* ============================================================ */}
      <footer className="h-9 bg-[#0A0D14] border-t border-[#1B222D] px-4 flex items-center justify-between text-[11px] font-mono text-white/60 fixed bottom-0 left-0 right-0 z-30">
        {/* Left Status Indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-white/80 font-medium">Live</span>
          </div>

          <span className="hidden sm:inline text-white/20">|</span>

          <div className="hidden sm:flex items-center gap-1 text-white/70">
            <Sparkles className="size-3 text-[#2081E2]" />
            <span>Aggregating Base & Solana Provenance</span>
          </div>

          <span className="hidden md:inline text-white/20">|</span>

          <Link to="/legal" className="hidden md:inline hover:text-white transition">
            Terms & Privacy
          </Link>
        </div>

        {/* Right Status Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Gas Price Tracker */}
          <div className="flex items-center gap-1.5 text-white/80">
            <Fuel className="size-3 text-[#10B981]" />
            <span>$2,519.15 (15 Gwei)</span>
          </div>

          <span className="text-white/20">|</span>

          {/* Mode Switch: Collector / Pro */}
          <button
            onClick={() => {
              setProMode(!proMode);
              toast.success(`Switched to ${!proMode ? "Pro Trader" : "Collector"} mode`);
            }}
            className="flex items-center gap-1 hover:text-white transition"
          >
            <span className="text-white/40">Mode:</span>
            <span className={proMode ? "text-[#2081E2] font-bold" : "text-white"}>
              {proMode ? "Pro" : "Collector"}
            </span>
          </button>

          <span className="hidden sm:inline text-white/20">|</span>

          {/* Currency Switcher */}
          <button
            onClick={() => setCurrencyMode(currencyMode === "crypto" ? "usd" : "crypto")}
            className="hidden sm:inline hover:text-white transition uppercase font-semibold text-white/90"
          >
            {currencyMode === "crypto" ? "Crypto" : "USD / GBP"}
          </button>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* 5. INTERACTIVE ACQUISITION MODAL (Checkout)                  */}
      {/* ============================================================ */}
      {selectedEditionForPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#121722] border border-[#232D3F] rounded-2xl text-white p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#2081E2] tracking-widest font-semibold">
                  CONFIRM ART ACQUISITION
                </span>
                <h3 className="font-serif text-xl text-white mt-0.5">
                  {selectedEditionForPurchase.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEditionForPurchase(null)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Overview */}
            <div className="flex gap-4 items-center p-3.5 bg-white/5 rounded-xl border border-white/10">
              <img
                src={selectedEditionForPurchase.image}
                alt={selectedEditionForPurchase.title}
                className="size-16 object-cover rounded-lg"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-serif text-sm font-semibold text-white truncate">
                  {selectedEditionForPurchase.title}
                </p>
                <p className="text-xs text-white/60">
                  By {selectedEditionForPurchase.photographerName}
                </p>
                <span className="text-[10px] font-mono text-[#2081E2] block">
                  Next Serial: #
                  {String(
                    selectedEditionForPurchase.totalEditions -
                      selectedEditionForPurchase.availableEditions +
                      1,
                  ).padStart(2, "0")}{" "}
                  / {selectedEditionForPurchase.totalEditions}
                </span>
              </div>
            </div>

            {/* Currency Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-white/70 block">
                Settlement Currency
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["ETH", "SOL", "USDT", "GBP"] as const).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setPaymentCurrency(curr)}
                    className={`py-2 rounded-lg text-xs font-mono transition border ${
                      paymentCurrency === curr
                        ? "bg-[#2081E2] text-white font-bold border-[#2081E2]"
                        : "bg-white/5 text-white/80 border-white/10 hover:border-white/30"
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-white/70">
                <span>Master Artwork Price:</span>
                <span>£{selectedEditionForPurchase.priceGbp.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Platform Mint & Certification:</span>
                <span className="text-[#10B981]">INCLUDED (£0.00)</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Secondary Creator Royalty (10%):</span>
                <span>£{(selectedEditionForPurchase.priceGbp * 0.1).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm text-white">
                <span>Total Due:</span>
                <span className="text-[#2081E2]">
                  {paymentCurrency === "ETH" && `${selectedEditionForPurchase.priceEth} ETH`}
                  {paymentCurrency === "SOL" && `${selectedEditionForPurchase.priceSol} SOL`}
                  {paymentCurrency === "USDT" &&
                    `${(selectedEditionForPurchase.priceGbp * 1.28).toFixed(2)} USDT`}
                  {paymentCurrency === "GBP" &&
                    `£${selectedEditionForPurchase.priceGbp.toLocaleString("en-GB")}`}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedEditionForPurchase(null)}
                className="flex-1 py-3 rounded-xl text-xs font-mono text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                disabled={purchasing}
                className="flex-1 py-3 rounded-xl text-xs font-mono font-bold bg-[#2081E2] text-white hover:bg-[#1868B7] transition shadow-lg"
              >
                {purchasing ? "Issuing Provenance..." : "Confirm & Issue COA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. CRYPTO DEPOSIT MODAL (For funding Web3 Vault)             */}
      {/* ============================================================ */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121722] border border-[#232D3F] rounded-2xl text-white p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#2081E2] tracking-widest font-semibold">
                  WEB3 VAULT DEPOSIT
                </span>
                <h3 className="font-sans text-lg text-white font-bold mt-0.5">
                  Fund Collector Vault
                </h3>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Network Selector Tabs */}
            <div className="grid grid-cols-4 gap-2">
              {(["ETH", "SOL", "USDT", "BTC"] as const).map((coin) => (
                <button
                  key={coin}
                  onClick={() => setActiveDepositCoin(coin)}
                  className={`py-2 rounded-xl text-xs font-mono font-semibold transition border ${
                    activeDepositCoin === coin
                      ? "bg-[#2081E2] text-white border-[#2081E2]"
                      : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
                  }`}
                >
                  {coin}
                </button>
              ))}
            </div>

            {/* QR Code and Address */}
            {(() => {
              const depositTargetAddress =
                activeDepositCoin === "SOL"
                  ? solanaWallet.address
                  : activeDepositCoin === "BTC"
                    ? "bc1q9f538e12a8497cb9e2a1b9f481c4e90264b9401"
                    : evmWallet.address;

              const qrSvg = generateQrSvg(depositTargetAddress, {
                margin: 2,
                fgColor: "#FFFFFF",
                bgColor: "#161D2B",
              });

              return (
                <div className="space-y-4">
                  <div className="flex justify-center p-4 bg-[#161D2B] rounded-2xl border border-white/10">
                    <div
                      className="size-44 [&>svg]:size-full"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-white/50">
                      Deposit Address ({activeDepositCoin})
                    </span>
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl font-mono text-xs break-all text-white/90 flex items-center justify-between gap-2">
                      <span>{depositTargetAddress}</span>
                      <button
                        onClick={() =>
                          handleCopy(depositTargetAddress, `${activeDepositCoin} Address`)
                        }
                        className="p-1 text-white/60 hover:text-white transition shrink-0"
                      >
                        {copiedAddress === depositTargetAddress ? (
                          <Check className="size-4 text-[#10B981]" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-white/60 leading-relaxed font-mono">
                    • Send only {activeDepositCoin} to this address.
                    <br />• Deposits automatically credit your Web3 vault balance upon on-chain
                    confirmation.
                  </p>
                </div>
              );
            })()}

            <button
              onClick={() => {
                setIsDepositModalOpen(false);
                navigate("/account?tab=vault");
              }}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-medium transition flex items-center justify-center gap-2"
            >
              <span>Open Settlement Vault Tab</span>
              <ArrowUpRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. MINT EDITION MODAL (Anchor Trigger)                       */}
      {/* ============================================================ */}
      {isMintModalOpen && (
        <MintEditionModal
          photo={demoMintPhoto}
          onClose={() => setIsMintModalOpen(false)}
          onSuccess={(newEdition) => {
            setEditions(getStoredEditions());
            setIsMintModalOpen(false);
            toast.success(`Successfully minted: ${newEdition.title}`);
          }}
        />
      )}

      {/* ============================================================ */}
      {/* 8. ARCHIVAL CERTIFICATE OF AUTHENTICITY VIEWER MODAL         */}
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
