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
  ArrowRight,
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
  Sun,
  Moon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStoredEditions,
  getStoredOwnerships,
  getStoredActivity,
  purchaseEdition,
  isEditionsPublic,
  EDITIONS_VISIBILITY_EVENT,
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
      <polygon
        fill={`url(#${gradId})`}
        points={`0,${height} ${points} ${width},${height}`}
      />
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

// Official NS CAPTURES Monogram Brand Badge
function NsCapturesLogoBadge({ className = "size-9" }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-xl bg-[#12241e] border border-[#10b981]/40 shadow-lg hover:border-[#10b981] transition group ${className}`}
    >
      <svg
        viewBox="0 0 700 700"
        className="size-6 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main letters */}
        <path
          d="M408.602 226.458C416.585 225.749 432.633 226.199 441.109 226.203L502.536 226.264L511.721 270.435C489.584 270.727 467.246 270.05 445.222 270.43C423.021 270.812 397.602 266.65 380.618 284.038C367.723 297.071 368.086 316.828 380.126 330.203C396.255 348.115 416.803 345.815 438.706 345.628C449.198 345.538 459.617 345.597 470.044 347.47C509.261 354.515 542.696 387.258 542.954 428.725C543.269 449.967 534.874 470.402 519.721 485.289C496.189 508.636 471.278 510.902 440.311 510.845C390.118 511.257 366.933 508.853 334.869 466.507C375.449 466.088 415.932 466.927 456.665 466.298C490.568 465.773 513.019 427.5 485.842 402.315C464.568 382.593 430.456 392.903 404.094 389.041C365.61 383.412 330.24 353.352 326.393 313.257C324.466 292.947 330.828 272.721 344.046 257.175C360.747 237.129 383.328 228.872 408.602 226.458Z"
          fill="#ffffff"
        />
        <path
          d="M138.549 203.895C143.958 207.542 157.137 220.77 162.5 225.923L208.173 269.811L399.595 455.635C377.87 456.2 354.693 455.805 332.862 455.788L267.833 392.346C239.7 364.608 211.37 337.065 182.846 309.724C181.664 373.474 182.894 439.015 182.499 503.03C168.095 503.457 152.733 503.28 138.325 503.062L138.311 309.433C138.303 275.469 137.478 237.609 138.549 203.895Z"
          fill="#ffffff"
        />
        {/* Trademark Dot */}
        <path
          d="M534.4 190.718C546.609 187.6 559.052 194.927 562.246 207.12C565.439 219.314 558.189 231.8 546.012 235.07C533.738 238.369 521.117 231.042 517.892 218.74C514.666 206.438 522.077 193.864 534.4 190.718Z"
          fill="#5af2b3"
        />
      </svg>
    </div>
  );
}

export function Editions() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const [editions, setEditions] = useState<DigitalEdition[]>(() => getStoredEditions());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<"nfts" | "collections">("nfts");
  const [activeTimeframe, setActiveTimeframe] = useState<"1h" | "6h" | "24h" | "7d">("24h");
  const [proMode, setProMode] = useState<boolean>(false);
  const [currencyMode, setCurrencyMode] = useState<"crypto" | "usd">("crypto");
  const [themeMode, setThemeMode] = useState<"dark" | "light">("light");
  const isDarkTheme = themeMode === "dark";

  const marketTheme = isDarkTheme
    ? {
        page: "min-h-screen bg-[#101714] text-[#edf4f1]",
        panel: "bg-[#151d1b] border-[#23322f]",
        panelAlt: "bg-[#1a241f] border-[#2b3834]",
        soft: "bg-[#1a221f] border-[#2b3834]",
        mutedText: "text-[#afc0b9]",
        strongText: "text-[#f1f7f4]",
        subText: "text-[#7f938f]",
        accent: "bg-[#1e4a3f] text-[#edf8f4] border-[#285d52]",
        accentSoft: "bg-[#1e4a3f]/10 text-[#dff5ee] border-[#285d52]/50",
        action: "bg-[#1e4a3f] text-[#f4faf7] hover:bg-[#224d43]",
        buttonNeutral: "bg-[#171f1c] text-[#edf4f1] border-[#2a3734] hover:bg-[#1d2724]",
        border: "border-[#23322f]",
      }
    : {
        page: "min-h-screen bg-[#f4efe8] text-[#1b1b1a]",
        panel: "bg-[#fbfaf7] border-[#e7dfd4]",
        panelAlt: "bg-[#f7f2eb] border-[#e9dfd3]",
        soft: "bg-[#f6f1ea] border-[#e9dfd5]",
        mutedText: "text-[#5f6662]",
        strongText: "text-[#1b1b1a]",
        subText: "text-[#6d726d]",
        accent: "bg-[#1e4a3f] text-[#f7faf8] border-[#1e4a3f]",
        accentSoft: "bg-[#ebf3ef] text-[#1e4a3f] border-[#d6e6df]",
        action: "bg-[#1e4a3f] text-[#f4f9f7] hover:bg-[#163d35]",
        buttonNeutral: "bg-white text-[#1b1b1a] border-[#e3d9cd] hover:bg-[#f6f1ea]",
        border: "border-[#e7dfd4]",
      };

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

  // Derived user addresses for the NS multi-wallet drawer
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

  // Trending drops with live sparklines
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

  // Public Visibility Guard: If editions room is toggled OFF by admin, hide from public
  if (!isPublic && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0d1412] text-[#edf4f1] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-[#1e4a3f] selection:text-white">
        {/* Ambient Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#173029]/35 via-[#0d1412]/80 to-[#0d1412] pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#10b981]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#d4af37]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-xl w-full text-center space-y-7 p-8 md:p-12 rounded-3xl border border-[#23322f] bg-[#141d1b]/95 backdrop-blur-xl shadow-2xl">
          {/* Brand Logo Monogram */}
          <div className="flex justify-center">
            <NsCapturesLogoBadge className="size-16" />
          </div>

          {/* Exclusive Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#10b981]/10 border border-[#10b981]/30 text-[#5af2b3] text-xs font-mono font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5af2b3] animate-pulse" />
            PRIVATE CURATED SALON &bull; COMING SOON
          </div>

          {/* Heading and Narrative */}
          <div className="space-y-3">
            <h1 className="font-serif text-3xl md:text-4xl font-normal text-white tracking-tight">
              Fine-Art Digital Editions
            </h1>
            <p className="text-sm md:text-base text-[#9fb3ab] leading-relaxed">
              The NS CAPTURES Editions room is currently accessible by invitation and administrative preview only while our curated collection of limited series and cryptographic certificates of authenticity is being assembled.
            </p>
          </div>

          {/* Key Value Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
            <div className="p-3.5 rounded-xl border border-[#23322f] bg-[#182320]/70 space-y-1">
              <span className="font-mono text-[10px] text-[#5af2b3] uppercase tracking-wider block">Provenance</span>
              <p className="text-xs text-[#edf4f1] font-medium leading-snug">Cryptographic Certificates of Authenticity</p>
            </div>
            <div className="p-3.5 rounded-xl border border-[#23322f] bg-[#182320]/70 space-y-1">
              <span className="font-mono text-[10px] text-[#d4af37] uppercase tracking-wider block">Scarcity</span>
              <p className="text-xs text-[#edf4f1] font-medium leading-snug">Numbered Limited Series &amp; Genesis 1/1s</p>
            </div>
            <div className="p-3.5 rounded-xl border border-[#23322f] bg-[#182320]/70 space-y-1">
              <span className="font-mono text-[10px] text-[#60a5fa] uppercase tracking-wider block">Physical Twins</span>
              <p className="text-xs text-[#edf4f1] font-medium leading-snug">Museum-Grade Giclée Print Pairings</p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/explore"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1e4a3f] hover:bg-[#255e50] text-white font-medium text-sm transition shadow-lg shadow-[#1e4a3f]/25"
            >
              <span>Explore Stock Gallery</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl border border-[#2b3b37] hover:bg-[#1a2623] text-[#cfded7] text-sm font-medium transition"
            >
              Return to Homepage
            </Link>
          </div>

          {/* Footer Subtext */}
          <p className="text-[11px] text-[#677a72] font-mono">
            NS CAPTURES Fine Art Registry &copy; {new Date().getFullYear()} &bull; Private Access Only
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${marketTheme.page} flex flex-col selection:bg-[#1e4a3f] selection:text-white font-sans antialiased`}>
      {/* Admin Preview Mode Alert Banner (Visible only when editions is hidden from public) */}
      {isAdmin && !isPublic && (
        <div className="w-full bg-[#2a1e0b] border-b border-[#f59e0b]/40 text-amber-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-50 sticky top-0 shadow-md">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold text-amber-300 font-mono uppercase tracking-wider">
              Admin Preview Mode
            </span>
            <span className="text-amber-200/90">
              &bull; The Digital Editions room is currently <strong>HIDDEN</strong> from the public. Regular visitors see the private salon holding card.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 font-mono text-[11px] transition"
            >
              Open Admin Console &rarr;
            </Link>
          </div>
        </div>
      )}
      {/* App Shell: Left Slim Rail + Main Workspace */}
      <div className="flex flex-1 relative overflow-x-hidden">
        {/* ============================================================ */}
        {/* 1. LEFT SLIM NAVIGATION RAIL (Luxury Collector Console)     */}
        {/* ============================================================ */}
        <aside className={`w-16 shrink-0 ${marketTheme.panel} border-r flex flex-col items-center justify-between py-3.5 z-40 sticky top-0 h-screen`}>
          {/* Top Rail: Official NS Monogram + Primary Navigation */}
          <div className="flex flex-col items-center gap-4 w-full">
            {/* NS CAPTURES Official Monogram Icon */}
            <Link
              to="/editions"
              className="p-1 rounded-xl transition hover:scale-105 active:scale-95 group relative"
              title="NS CAPTURES Digital Editions"
            >
              <NsCapturesLogoBadge className="size-10" />
              <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#12241e] border border-[#10b981]/40 text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                NS CAPTURES Editions
              </span>
            </Link>

            <div className="w-8 h-[1px] bg-[#1F2633]" />

            {/* Navigation Icons with NS Emerald Active Indicators */}
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
                    ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                title="Discover Editions"
              >
                <Compass className="size-5" />
                <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Discover All Works
                </span>
              </button>

              {/* Collections */}
              <button
                onClick={() => setSelectedCategory("series")}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition group relative ${
                  selectedCategory === "series"
                    ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                title="Numbered Series"
              >
                <LayoutGrid className="size-5" />
                <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Numbered Series
                </span>
              </button>

              {/* Activity / Pulse */}
              <button
                onClick={() => {
                  const acts = getStoredActivity();
                  toast.info(
                    `NS CAPTURES Provenance Engine: ${acts.length} verified records on Base & Solana.`,
                  );
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition group relative"
                title="Activity Feed"
              >
                <Activity className="size-5" />
                <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Provenance Activity
                </span>
              </button>

              {/* Genesis Drops Calendar */}
              <button
                onClick={() => setSelectedCategory("genesis")}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition group relative ${
                  selectedCategory === "genesis"
                    ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                title="Genesis 1/1 Drops"
              >
                <Calendar className="size-5" />
                <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Genesis 1 of 1s
                </span>
              </button>

              {/* Mint / Create (Anchor) */}
              <button
                onClick={() => setIsMintModalOpen(true)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#10B981] bg-[#10B981]/15 hover:bg-[#10B981]/25 border border-[#10B981]/40 transition group relative shadow-md"
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
                title="Inspect Archival Certificate (COA)"
              >
                <ShieldCheck className="size-5" />
                <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#1A222F] text-white text-[11px] font-medium rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Certificates of Authenticity (COA)
                </span>
              </button>
            </nav>
          </div>

          {/* Bottom Rail: Back to Stock Photography & Vault Account */}
          <div className="flex flex-col items-center gap-3 w-full">
            {/* Return to Normal Photography Gallery */}
            <Link
              to="/search"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition group relative border border-white/5"
              title="Return to Stock Photography Gallery"
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
              title="Preferences"
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
          {/* TOP APP BAR (NS CAPTURES Branded Navigation)               */}
          {/* ---------------------------------------------------------- */}
          <header className={`${marketTheme.panel} h-16 bg-opacity-95 backdrop-blur-md border-b px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30`}>
            {/* Search Input with Hotkey Shortcut '/' */}
            <div className="flex items-center gap-4 flex-1 max-w-xl">
              <div className="relative w-full">
                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 size-4 ${marketTheme.subText}`} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search NS CAPTURES editions, artists, cameras..."
                  className={`w-full pl-10 pr-10 py-2 ${marketTheme.soft} border ${marketTheme.border} rounded-xl text-xs ${marketTheme.strongText} placeholder:text-[#7f938f] focus:outline-none transition`}
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border ${marketTheme.border} text-[10px] ${marketTheme.subText} font-mono`}>
                  /
                </span>
              </div>
            </div>

            {/* Category Pills */}
            <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto py-1">
              {[
                { id: "all", label: "All Works" },
                { id: "art", label: "Fine Art" },
                { id: "genesis", label: "Genesis 1/1" },
                { id: "series", label: "Series" },
                { id: "twin", label: "Physical Twin" },
                { id: "curator", label: "Curator Spotlight" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                    selectedCategory === c.id
                      ? `${marketTheme.accent} font-bold`
                      : `${marketTheme.buttonNeutral} ${marketTheme.mutedText} hover:${marketTheme.strongText}`
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Multi-Chain Filter Selectors */}
            <div className={`hidden 2xl:flex items-center gap-1.5 pl-3 border-l ${marketTheme.border}`}>
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
                      ? `${marketTheme.accent} font-bold`
                      : `${marketTheme.buttonNeutral} ${marketTheme.mutedText}`
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
                className={`size-9 rounded-xl flex items-center justify-center ${marketTheme.buttonNeutral} ${marketTheme.mutedText} transition relative`}
                title="Notifications"
              >
                <Bell className="size-4" />
                <span className="absolute top-2 right-2 size-2 rounded-full bg-[#1e4a3f]" />
              </button>

              {/* Gas Tracker Pill */}
              <div
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${marketTheme.buttonNeutral} ${marketTheme.mutedText} text-xs font-mono`}
                title="Ethereum & Base Network Gas Tracker"
              >
                <Fuel className="size-3.5 text-[#1e4a3f]" />
                <span className="text-[11px]">15 Gwei</span>
              </div>

              <button
                onClick={() => setThemeMode(isDarkTheme ? "light" : "dark")}
                className={`hidden sm:flex size-9 items-center justify-center rounded-xl border ${marketTheme.buttonNeutral} ${marketTheme.mutedText} transition`}
                title={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDarkTheme ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>

              {/* Wallet Pill & Connected Avatar */}
              <div className="relative">
                <button
                  onClick={() => setIsWalletFlyoutOpen(!isWalletFlyoutOpen)}
                  className={`flex items-center gap-2 pl-3 pr-2 py-1.5 ${marketTheme.buttonNeutral} border rounded-xl transition shadow-sm`}
                >
                  <Wallet className={`size-4 ${isDarkTheme ? "text-[#d9b57a]" : "text-[#1e4a3f]"}`} />
                  <span className={`font-mono text-xs font-semibold ${marketTheme.strongText}`}>
                    {totalWalletUsd}
                  </span>

                  <div className={`size-6 rounded-full ${isDarkTheme ? "bg-[linear-gradient(135deg,_#d9b57a_0%,_#b98b5a_38%,_#553d31_100%)] text-[#171412]" : "bg-[#dfeae5] text-[#1e4a3f]"} flex items-center justify-center text-[10px] font-bold uppercase ml-1`}>
                    {user?.name ? user.name.slice(0, 2) : "NS"}
                  </div>
                  <ChevronDown className={`size-3.5 ${marketTheme.subText}`} />
                </button>

                {/* ============================================================ */}
                {/* 3. MULTI-WALLET FLYOUT DRAWER (Top Right Dropdown)           */}
                {/* ============================================================ */}
                {isWalletFlyoutOpen && (
                  <div className="absolute right-0 top-12 mt-2 w-80 bg-[#121722] border border-[#232D3F] rounded-2xl shadow-2xl p-4 z-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Header Address Card */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-full bg-gradient-to-br from-[#10B981] via-[#059669] to-[#d4af37] flex items-center justify-center text-xs font-bold text-[#080B10] shadow-inner">
                          {user?.name ? user.name.slice(0, 2).toUpperCase() : "NS"}
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
                          <div className="size-7 rounded-lg bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-xs text-[#10B981] font-mono font-bold">
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
                            {vaultBalances?.assets.find((a) => a.coin === "ETH")?.balanceFormatted ||
                              "0.00 ETH"}
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
                            {vaultBalances?.assets.find((a) => a.coin === "SOL")?.balanceFormatted ||
                              "0.00 SOL"}
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
                        <Plus className="size-4 text-[#10B981]" />
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
              {/* HERO FEATURE DROP CAROUSEL (Fine-Art Verified Spotlight) */}
              {/* ======================================================== */}
              {activeHero && (
                <div className={`relative rounded-[24px] overflow-hidden border ${marketTheme.border} ${isDarkTheme ? "bg-[#171d1b]" : "bg-[#f7f3ee]"} shadow-[0_12px_30px_rgba(15,23,20,0.08)] group`}>
                  <div className="relative aspect-[16/9] sm:aspect-[21/9] max-h-[460px] overflow-hidden">
                    <img
                      src={activeHero.image}
                      alt={activeHero.title}
                      className="size-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0b0a] via-[#0c0b0a]/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0c0b0a]/90 via-[#0c0b0a]/30 to-transparent" />

                    <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${isDarkTheme ? "bg-[#121a18]/80 border border-[#2b3834] text-[#dfece8]" : "bg-white/80 border border-[#dfe6e2] text-[#183a32]"} text-[11px] font-mono font-semibold uppercase tracking-wider`}>
                            <Sparkles className={`size-3 ${isDarkTheme ? "text-[#dfece8]" : "text-[#183a32]"}`} />
                            {activeHero.tier === "genesis_1_of_1"
                              ? "Genesis 1 of 1"
                              : "Curated Limited Series"}
                          </span>
                          {activeHero.hasPhysicalTwin && (
                            <span className={`hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full ${isDarkTheme ? "bg-[#121a18]/80 border border-[#2b3834] text-[#edf9f4]" : "bg-white/80 border border-[#dfe6e2] text-[#183a32]"} text-[11px] font-mono`}>
                              + Archival Print Twin
                            </span>
                          )}
                        </div>

                        <div className={`flex items-center gap-1.5 ${isDarkTheme ? "bg-[#121a18]/80" : "bg-white/70"} backdrop-blur-md px-3 py-1 rounded-full border ${isDarkTheme ? "border-[#2b3834]" : "border-[#dfe6e2]"}`}>
                          {featuredEditions.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setHeroSlideIndex(idx)}
                              className={`h-1.5 rounded-full transition-all ${
                                heroSlideIndex % featuredEditions.length === idx
                                  ? "w-6 bg-[#1e4a3f]"
                                  : `w-2 ${isDarkTheme ? "bg-white/20" : "bg-[#a6b5af]"}`
                              }`}
                              title={`Slide ${idx + 1}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1 max-w-xl">
                          <div className={`flex items-center gap-2 ${isDarkTheme ? "text-[#dfece8]" : "text-[#1f2a28]"} font-mono text-xs`}>
                            <span>By {activeHero.photographerName}</span>
                            <span className={`size-4 rounded-full ${isDarkTheme ? "bg-[#1e4a3f] text-[#effaf5]" : "bg-[#1e4a3f] text-white"} flex items-center justify-center font-bold text-[9px]`}>
                              ✓
                            </span>
                          </div>
                          <h1 className={`font-serif text-2xl sm:text-4xl ${isDarkTheme ? "text-[#f6f9f7]" : "text-[#1a1b1a]"} font-medium leading-tight`}>
                            {activeHero.title}
                          </h1>
                          <p className={`text-xs sm:text-sm ${isDarkTheme ? "text-[#dfece8]/75" : "text-[#44524e]"} line-clamp-2 font-serif`}>
                            {activeHero.description}
                          </p>
                        </div>

                        <div className={`inline-flex flex-wrap items-center gap-4 sm:gap-6 p-4 rounded-2xl ${isDarkTheme ? "bg-[#121a18]/80 border border-[#2b3834]" : "bg-white/80 border border-[#e3d9cd]"} backdrop-blur-md`}>
                          <div>
                            <span className={`text-[10px] font-mono uppercase tracking-wider ${isDarkTheme ? "text-[#bfcdc8]" : "text-[#5e6662]"} block`}>
                              Floor price
                            </span>
                            <span className={`font-mono text-sm sm:text-base font-bold ${isDarkTheme ? "text-[#f6f9f7]" : "text-[#1b1b1a]"}`}>
                              {currencyMode === "crypto"
                                ? `${activeHero.priceEth} ETH`
                                : `£${activeHero.priceGbp.toLocaleString("en-GB")}`}
                            </span>
                          </div>

                          <div className={`w-[1px] h-8 ${isDarkTheme ? "bg-[#2b3834]" : "bg-[#e3d9cd]"}`} />

                          <div>
                            <span className={`text-[10px] font-mono uppercase tracking-wider ${isDarkTheme ? "text-[#bfcdc8]" : "text-[#5e6662]"} block`}>
                              Editions
                            </span>
                            <span className={`font-mono text-sm sm:text-base font-bold ${isDarkTheme ? "text-[#f6f9f7]" : "text-[#1b1b1a]"}`}>
                              {activeHero.totalEditions}
                            </span>
                          </div>

                          <div className={`w-[1px] h-8 ${isDarkTheme ? "bg-[#2b3834]" : "bg-[#e3d9cd]"}`} />

                          <div>
                            <span className={`text-[10px] font-mono uppercase tracking-wider ${isDarkTheme ? "text-[#bfcdc8]" : "text-[#5e6662]"} block`}>
                              Volume
                            </span>
                            <span className={`font-mono text-sm sm:text-base font-bold ${isDarkTheme ? "text-[#f6f9f7]" : "text-[#1b1b1a]"}`}>
                              £142.5K
                            </span>
                          </div>

                          <div className={`w-[1px] h-8 ${isDarkTheme ? "bg-[#2b3834]" : "bg-[#e3d9cd]"}`} />

                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#d7c7a9]/80 block">
                              Listed
                            </span>
                            <span className="font-mono text-sm sm:text-base font-bold text-[#1e4a3f]">
                              {activeHero.availableEditions} ({activeHero.totalEditions > 0 ? ((activeHero.availableEditions / activeHero.totalEditions) * 100).toFixed(0) : 0}%)
                            </span>
                          </div>

                          <button
                            onClick={() => handlePurchase(activeHero)}
                            disabled={activeHero.availableEditions === 0}
                            className={`ml-auto px-5 py-2.5 rounded-xl font-medium text-xs font-mono transition flex items-center gap-2 shadow-[0_8px_20px_rgba(30,74,63,0.14)] ${
                              activeHero.availableEditions === 0
                                ? "bg-white/10 text-white/40 cursor-not-allowed"
                                : "bg-[#1e4a3f] text-[#f4faf7] hover:bg-[#163d35] font-bold"
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
              {/* TRENDING DROPS WITH DYNAMIC SPARKLINE CHARTS             */}
              {/* ======================================================== */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`font-sans text-lg font-bold ${isDarkTheme ? "text-[#f6f9f7]" : "text-[#1b1b1a]"} flex items-center gap-2`}>
                      <span>Trending Fine-Art Drops</span>
                      <span className="size-2 rounded-full bg-[#1e4a3f] animate-pulse" />
                    </h2>
                    <p className={`text-xs ${isDarkTheme ? "text-[#dfece8]/70" : "text-[#5f6662]"}`}>
                      Editions with verified provenance and transaction volume today
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-mono ${isDarkTheme ? "text-[#dfece8]" : "text-[#1e4a3f]"} hover:underline cursor-pointer`}>
                    <span>View all drops</span>
                    <ChevronRight className="size-3" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {trendingDrops.map((token) => (
                    <div
                      key={token.id}
                      onClick={() => setSearchQuery(token.title.split(" ")[0])}
                      className={`p-3.5 rounded-2xl ${isDarkTheme ? "bg-[#141d1b] border-[#24312e] hover:bg-[#192521]" : "bg-[#f9f7f3] border-[#e7dfd4] hover:bg-[#f3efe9]"} border hover:border-[#1e4a3f]/40 transition cursor-pointer flex items-center justify-between shadow-sm group`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={token.avatar}
                          alt={token.title}
                          className="size-10 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-white truncate group-hover:text-[#10B981] transition">
                              {token.title}
                            </span>
                            <span className="size-3.5 rounded-full bg-[#10B981] flex items-center justify-center text-[#080B10] font-bold text-[8px] shrink-0">
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
              {/* MARKETPLACE CATALOG GRID                                */}
              {/* ======================================================== */}
              <div className="space-y-4 pt-4 border-t border-[#2a2722]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button className={`px-3.5 py-1.5 rounded-xl ${isDarkTheme ? "bg-[#1e4a3f]/15 text-[#ebf8f4] border-[#2a5d52]" : "bg-[#eaf3ef] text-[#1e4a3f] border-[#cfe1d9]"} font-semibold text-xs border flex items-center gap-1.5`}>
                      <span>Items</span>
                      <span className={`px-1.5 py-0.2 rounded-full ${isDarkTheme ? "bg-[#1e4a3f] text-[#ebf8f4]" : "bg-[#1e4a3f] text-white"} text-[10px] font-mono font-bold`}>
                        {filteredEditions.length}
                      </span>
                    </button>
                    <button
                      onClick={() => toast.info("Live secondary trading orderbook syncing...")}
                      className={`px-3.5 py-1.5 rounded-xl ${marketTheme.mutedText} text-xs ${isDarkTheme ? "hover:text-white" : "hover:text-[#1b1b1a]"} transition`}
                    >
                      Activity
                    </button>
                    <button
                      onClick={() => toast.info("Analytics charts available in Pro Mode")}
                      className={`px-3.5 py-1.5 rounded-xl ${marketTheme.mutedText} text-xs ${isDarkTheme ? "hover:text-white" : "hover:text-[#1b1b1a]"} transition`}
                    >
                      Analytics
                    </button>
                  </div>

                  <div className={`flex items-center gap-2 font-mono text-xs ${marketTheme.mutedText}`}>
                    <span>Pricing:</span>
                    <button
                      onClick={() => setCurrencyMode(currencyMode === "crypto" ? "usd" : "crypto")}
                      className={`${marketTheme.buttonNeutral} px-2.5 py-1 rounded-lg transition`}
                    >
                      {currencyMode === "crypto" ? "ETH / SOL" : "GBP (£)"}
                    </button>
                  </div>
                </div>

                {/* Grid of Editions */}
                {filteredEditions.length === 0 ? (
                  <div className={`p-16 text-center rounded-2xl border space-y-3 ${isDarkTheme ? "bg-[#0E131C] border-[#1B222D]" : "bg-[#f7f3ee] border-[#e8dfd3]"}`}>
                    <Search className={`size-8 mx-auto ${isDarkTheme ? "text-white/30" : "text-[#6f736f]"}`} />
                    <p className={`text-sm font-semibold ${marketTheme.strongText}`}>No digital editions found</p>
                    <p className={`text-xs ${marketTheme.mutedText}`}>
                      Try clearing filters or searching for another camera model or artist.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategory("all");
                        setSelectedChain("all");
                        setSearchQuery("");
                      }}
                      className="px-4 py-2 bg-[#1e4a3f] text-[#f7faf8] text-xs rounded-xl font-bold hover:bg-[#163d35] transition"
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
                          className={`group rounded-2xl overflow-hidden border transition duration-300 flex flex-col shadow-sm relative ${isDarkTheme ? "bg-[#0E131C] border-[#1E2738] hover:border-[#10B981]" : "bg-[#fffdfb] border-[#e7dfd4] hover:border-[#1e4a3f]/50"}`}
                        >
                          {/* Image Container */}
                          <div className={`relative aspect-[4/3] overflow-hidden ${isDarkTheme ? "bg-black/40" : "bg-[#efe7df]"}`}>
                            <img
                              src={item.image}
                              alt={item.title}
                              className="size-full object-cover transition duration-500 group-hover:scale-105"
                            />

                            {/* Scarcity / Serial Badge */}
                            <div className="absolute top-3 left-3 flex gap-1.5">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md backdrop-blur-md text-[10px] font-mono uppercase font-semibold border ${isDarkTheme ? "bg-black/70 text-[#d4af37] border-white/15" : "bg-white/80 text-[#1e4a3f] border-[#dfe9e3]"}`}>
                                {item.tier === "genesis_1_of_1"
                                  ? "Genesis 1/1"
                                  : `${item.availableEditions}/${item.totalEditions} Available`}
                              </span>
                            </div>

                            {item.hasPhysicalTwin && (
                              <div className="absolute top-3 right-3">
                                <span className={`px-2 py-0.5 rounded backdrop-blur text-[10px] font-mono border ${isDarkTheme ? "bg-black/70 text-white/90 border-white/10" : "bg-white/75 text-[#1b1b1a] border-[#e3d9cd]"}`}>
                                  + Print Twin
                                </span>
                              </div>
                            )}

                            {/* Hover Quick Action Buttons */}
                            <div className={`absolute inset-0 ${isDarkTheme ? "bg-black/40" : "bg-[#1b1b1a]/25"} backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4`}>
                              <button
                                onClick={() => handlePurchase(item)}
                                disabled={isSoldOut}
                                className={`px-4 py-2.5 rounded-xl font-medium text-xs font-mono transition shadow-lg ${
                                  isSoldOut
                                    ? isDarkTheme
                                      ? "bg-white/10 text-white/40 cursor-not-allowed"
                                      : "bg-[#e6ece9] text-[#6f7a76] cursor-not-allowed"
                                    : "bg-[#1e4a3f] text-[#f4faf7] hover:bg-[#163d35] font-bold"
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
                                className={`px-3.5 py-2.5 rounded-xl font-medium text-xs font-mono border transition ${isDarkTheme ? "bg-white/20 text-white hover:bg-white/30 border-white/20" : "bg-[#f4efe8] text-[#1b1b1a] hover:bg-[#efe5da] border-[#e3d9cd]"}`}
                                title="Inspect Archival COA"
                              >
                                <Eye className="size-4" />
                              </button>
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                              <div className={`flex items-center justify-between text-[11px] font-mono mb-1 ${isDarkTheme ? "text-white/50" : "text-[#5f6662]"}`}>
                                <span className="truncate">{item.tokenId}</span>
                                <span>{item.yearCreated}</span>
                              </div>

                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-xs truncate ${isDarkTheme ? "text-white/70" : "text-[#3f4d49]"}`}>
                                  {item.photographerName}
                                </span>
                                <span className="size-3 rounded-full bg-[#1e4a3f] flex items-center justify-center text-white font-bold text-[7px]">
                                  ✓
                                </span>
                              </div>

                              <h3 className={`font-serif text-base font-medium transition truncate ${isDarkTheme ? "text-white group-hover:text-[#10B981]" : "text-[#1b1b1a] group-hover:text-[#1e4a3f]"}`}>
                                {item.title}
                              </h3>
                            </div>

                            {/* Camera & Lens */}
                            <div className={`py-1.5 px-2.5 rounded-lg border text-[10px] font-mono flex items-center justify-between ${isDarkTheme ? "bg-white/5 border-white/5 text-white/60" : "bg-[#f5efe9] border-[#e7dfd4] text-[#475651]"}`}>
                              <span className="truncate">{item.camera}</span>
                              <span className="shrink-0">{item.lens}</span>
                            </div>

                            {/* Pricing & Footer */}
                            <div className={`pt-2 border-t flex items-center justify-between ${isDarkTheme ? "border-[#1E2738]" : "border-[#e7dfd4]"}`}>
                              <div>
                                <span className={`text-[9px] font-mono uppercase tracking-wider block ${isDarkTheme ? "text-white/50" : "text-[#5f6662]"}`}>
                                  Price
                                </span>
                                <span className={`font-mono text-sm font-bold ${isDarkTheme ? "text-white" : "text-[#1b1b1a]"}`}>
                                  {currencyMode === "crypto"
                                    ? `${item.priceEth} ETH`
                                    : `£${item.priceGbp.toLocaleString("en-GB")}`}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className={`text-[9px] font-mono uppercase tracking-wider block ${isDarkTheme ? "text-white/50" : "text-[#5f6662]"}`}>
                                  Secondary Royalty
                                </span>
                                <span className="font-mono text-xs text-[#1e4a3f]">
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
            {/* RIGHT 25%: TOP COLLECTIONS LEADERBOARD                   */}
            {/* ======================================================== */}
            <div className="col-span-12 xl:col-span-3 space-y-4">
              <div className={`sticky top-20 border rounded-2xl p-4 shadow-sm space-y-4 ${isDarkTheme ? "bg-[#0E131C] border-[#1E2738]" : "bg-[#fbfaf7] border-[#e7dfd4]"}`}>
                {/* Header Switcher: [ NFTs ] [ Collections ] */}
                <div className={`flex items-center justify-between border-b pb-3 ${isDarkTheme ? "border-[#1E2738]" : "border-[#e7dfd4]"}`}>
                  <div className={`flex items-center p-1 rounded-xl border ${isDarkTheme ? "bg-[#121722] border-[#222B3A]" : "bg-[#f4efe8] border-[#e7dfd4]"}`}>
                    <button
                      onClick={() => setActiveLeaderboardTab("nfts")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        activeLeaderboardTab === "nfts"
                          ? "bg-[#1e4a3f] text-[#f7faf8] font-bold"
                          : isDarkTheme
                            ? "text-white/60 hover:text-white"
                            : "text-[#5f6662] hover:text-[#1b1b1a]"
                      }`}
                    >
                      NFTs
                    </button>
                    <button
                      onClick={() => setActiveLeaderboardTab("collections")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        activeLeaderboardTab === "collections"
                          ? "bg-[#1e4a3f] text-[#f7faf8] font-bold"
                          : isDarkTheme
                            ? "text-white/60 hover:text-white"
                            : "text-[#5f6662] hover:text-[#1b1b1a]"
                      }`}
                    >
                      Collections
                    </button>
                  </div>

                  {/* Timeframe selector: 1h / 6h / 24h / 7d */}
                  <div className={`flex items-center gap-1 font-mono text-[10px] ${isDarkTheme ? "text-white/60" : "text-[#5f6662]"}`}>
                    {(["1h", "6h", "24h", "7d"] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setActiveTimeframe(tf)}
                        className={`px-1.5 py-0.5 rounded transition ${
                          activeTimeframe === tf
                            ? isDarkTheme
                              ? "bg-white/20 text-white font-bold"
                              : "bg-[#e8f0ed] text-[#1e4a3f] font-bold"
                            : isDarkTheme
                              ? "text-white/40 hover:text-white"
                              : "text-[#7e827f] hover:text-[#1b1b1a]"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Header */}
                <div className={`flex items-center justify-between text-[10px] font-mono uppercase tracking-wider px-1 ${isDarkTheme ? "text-white/50" : "text-[#5f6662]"}`}>
                  <span>COLLECTION</span>
                  <span>FLOOR / 24H</span>
                </div>

                {/* Ranked List */}
                <div className="space-y-1">
                  {leaderboardItems.map((col) => (
                    <div
                      key={col.rank}
                      onClick={() => setSearchQuery(col.title.split(" ")[0])}
                      className={`p-2 rounded-xl transition cursor-pointer flex items-center justify-between group ${isDarkTheme ? "hover:bg-[#141C29]" : "hover:bg-[#f4efe8]"}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`font-mono text-xs w-4 text-center ${isDarkTheme ? "text-white/40" : "text-[#7a807d]"}`}>
                          {col.rank}
                        </span>
                        <img
                          src={col.image}
                          alt={col.title}
                          className={`size-8 rounded-lg object-cover border shrink-0 ${isDarkTheme ? "border-white/10" : "border-[#e7dfd4]"}`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-semibold truncate transition ${isDarkTheme ? "text-white group-hover:text-[#10B981]" : "text-[#1b1b1a] group-hover:text-[#1e4a3f]"}`}>
                              {col.title}
                            </span>
                            <span className="size-3 rounded-full bg-[#1e4a3f] flex items-center justify-center text-white font-bold text-[7px] shrink-0">
                              ✓
                            </span>
                          </div>
                          <span className={`text-[10px] block truncate ${isDarkTheme ? "text-white/40" : "text-[#5f6662]"}`}>
                            {col.artist}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0 ml-2">
                        <span className={`text-xs font-bold block ${isDarkTheme ? "text-white" : "text-[#1b1b1a]"}`}>
                          {currencyMode === "crypto" ? col.floorEth : col.floorUsd}
                        </span>
                        <span className="text-[10px] text-[#1e4a3f] font-semibold block">
                          {col.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Promotion Card */}
                <div className={`pt-3 border-t space-y-2 ${isDarkTheme ? "border-[#1E2738]" : "border-[#e7dfd4]"}`}>
                  <div className={`p-3 rounded-xl border bg-gradient-to-r space-y-1 ${isDarkTheme ? "from-[#10B981]/15 to-transparent border-[#10B981]/30" : "from-[#eaf2ef] to-transparent border-[#d5e4de]"}`}>
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${isDarkTheme ? "text-white" : "text-[#1b1b1a]"}`}>
                      <Flame className="size-3.5 text-[#1e4a3f]" />
                      <span>NS CAPTURES Collector Terminal</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isDarkTheme ? "text-white/70" : "text-[#4d5855]"}`}>
                      Archival museum provenance, cryptographic certificates of authenticity, and instant on-chain multi-token settlement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. BOTTOM STICKY LIVE STATUS BAR                             */}
      {/* ============================================================ */}
      <footer className={`${marketTheme.panel} h-9 border-t px-4 flex items-center justify-between text-[11px] font-mono ${marketTheme.mutedText} fixed bottom-0 left-0 right-0 z-30`}>
        {/* Left Status Indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-white/80 font-medium">Live</span>
          </div>

          <span className="hidden sm:inline text-white/20">|</span>

          <div className="hidden sm:flex items-center gap-1 text-white/70">
            <Sparkles className="size-3 text-[#10B981]" />
            <span>NS CAPTURES Provenance Engine • Base & Solana</span>
          </div>

          <span className="hidden md:inline text-white/20">|</span>

          <Link
            to="/legal"
            className="hidden md:inline hover:text-white transition"
          >
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
            <span className={proMode ? "text-[#10B981] font-bold" : "text-white"}>
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
                <span className="text-[10px] font-mono uppercase text-[#d4af37] tracking-widest font-semibold">
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
                <span className="text-[10px] font-mono text-[#d4af37] block">
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
                        ? "bg-[#10B981] text-[#080B10] font-bold border-[#10B981]"
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
                <span className="text-[#d4af37]">
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
                className="flex-1 py-3 rounded-xl text-xs font-mono font-bold bg-[#10B981] text-[#080B10] hover:bg-[#059669] transition shadow-lg"
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
                <span className="text-[10px] font-mono uppercase text-[#10B981] tracking-widest font-semibold">
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
                      ? "bg-[#10B981] text-[#080B10] border-[#10B981]"
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
                        onClick={() => handleCopy(depositTargetAddress, `${activeDepositCoin} Address`)}
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
                    <br />• Deposits automatically credit your Web3 vault balance upon on-chain confirmation.
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
