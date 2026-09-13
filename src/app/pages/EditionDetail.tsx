import { useState, useMemo, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Share2,
  Heart,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  Award,
  Maximize2,
  FileText,
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
} from "lucide-react";
import { toast } from "sonner";
import {
  getStoredEditions,
  getStoredOwnerships,
  getStoredActivity,
  purchaseEdition,
  checkDepositEligibility,
  getDepositConfig,
  type DigitalEdition,
  type EditionOwnership,
  type EditionActivity,
} from "../data/editions";
import { CertificateOfAuthenticityModal } from "../components/CertificateOfAuthenticityModal";
import { useAuth } from "../context/AuthContext";
import { fetchCreatorWeb3Vault, type CryptoWalletEntry } from "../data/db";
import {
  fetchMultiChainVaultBalances,
  type MultiChainVaultBalance,
} from "../../lib/onChainBalance";
import { copyToClipboard } from "../../lib/clipboard";
import { generateQrSvg } from "../../lib/qrcode";

export function EditionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [editions, setEditions] = useState<DigitalEdition[]>(() => getStoredEditions());
  const [ownerships, setOwnerships] = useState<EditionOwnership[]>(() => getStoredOwnerships());
  const [activities, setActivities] = useState<EditionActivity[]>(() => getStoredActivity());

  // Find edition by ID or token ID
  const edition = useMemo(() => {
    return editions.find(
      (e) => e.id === id || e.tokenId.toLowerCase() === id?.toLowerCase(),
    );
  }, [editions, id]);

  // Ownerships for this specific edition
  const editionOwnerships = useMemo(() => {
    if (!edition) return [];
    return ownerships.filter((o) => o.editionId === edition.id);
  }, [ownerships, edition]);

  // Activity trail for this edition
  const editionActivity = useMemo(() => {
    if (!edition) return [];
    return activities.filter((a) => a.editionId === edition.id);
  }, [activities, edition]);

  // Accordion state toggles
  const [descOpen, setDescOpen] = useState(true);
  const [artistOpen, setArtistOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [traitsOpen, setTraitsOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);

  // Modals state
  const [coaModalOpen, setCoaModalOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<"ETH" | "GBP" | "SOL" | "USDT">("ETH");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);

  // Active COA view target
  const [activeOwnershipForCoa, setActiveOwnershipForCoa] = useState<EditionOwnership | null>(null);

  // Web3 Vault & Gating
  const [userWallets, setUserWallets] = useState<CryptoWalletEntry[]>([]);
  const [vaultBalance, setVaultBalance] = useState<MultiChainVaultBalance | null>(null);
  const [_loadingVault, setLoadingVault] = useState(false);
  const depositConfig = useMemo(() => getDepositConfig(), []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingVault(true);

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
      .catch((e) => {
        console.error("Failed to load vault balances:", e);
      })
      .finally(() => {
        if (active) setLoadingVault(false);
      });

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

  const handleCopy = (text: string, key: string, label: string) => {
    copyToClipboard(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: edition?.title || "NS CAPTURES Fine-Art Digital Edition",
        url: window.location.href,
      });
    } else {
      copyToClipboard(window.location.href);
      toast.success("Page link copied to clipboard");
    }
  };

  // Trait Pill Color Generator (matches Figma colorful rarity pills)
  const getRarityBadgeStyle = (rarity: number) => {
    if (rarity <= 5) {
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    }
    if (rarity <= 10) {
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    }
    if (rarity <= 20) {
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    }
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  };

  // Compile Traits (Derived from Photographic Metadata)
  const traits = useMemo(() => {
    if (!edition) return [];
    return [
      {
        type: "CAMERA",
        value: edition.camera || "Leica M11 Archival",
        rarity: 4,
        floorEth: "0.45 ETH",
      },
      {
        type: "LENS",
        value: edition.lens || "50mm f/0.95 Noctilux",
        rarity: 2,
        floorEth: "0.50 ETH",
      },
      {
        type: "ISO",
        value: `ISO ${edition.iso || 100}`,
        rarity: 18,
        floorEth: "0.38 ETH",
      },
      {
        type: "APERTURE",
        value: edition.aperture || "f/1.4",
        rarity: 12,
        floorEth: "0.42 ETH",
      },
      {
        type: "SHUTTER SPEED",
        value: edition.shutterSpeed || "1/500s",
        rarity: 25,
        floorEth: "0.35 ETH",
      },
      {
        type: "LOCATION",
        value: edition.location || "Kyoto, Japan",
        rarity: 6,
        floorEth: "0.60 ETH",
      },
      {
        type: "EDITION TIER",
        value:
          edition.tier === "genesis_1_of_1"
            ? "1 of 1 Genesis Master"
            : edition.tier === "physical_twin"
              ? "Physical Twin Edition"
              : `Limited Series (${edition.totalEditions} Total)`,
        rarity: edition.tier === "genesis_1_of_1" ? 1 : 8,
        floorEth: `${edition.priceEth} ETH`,
      },
      {
        type: "PHYSICAL TWIN",
        value: edition.hasPhysicalTwin ? "Museum Giclée Included" : "Digital Masterwork Only",
        rarity: edition.hasPhysicalTwin ? 7 : 80,
        floorEth: edition.hasPhysicalTwin ? "0.65 ETH" : "0.30 ETH",
      },
      {
        type: "YEAR CREATED",
        value: String(edition.yearCreated || 2025),
        rarity: 15,
        floorEth: "0.40 ETH",
      },
    ];
  }, [edition]);

  // Execute Direct Purchase with Deposit Check
  const handleExecuteBuy = () => {
    if (!edition) return;
    if (!user) {
      toast.error("Please sign in or create an account to acquire digital editions.");
      navigate("/signin");
      return;
    }

    // Check deposit gate eligibility
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
        setPurchaseModalOpen(true);
        return;
      }
    }

    // Process purchase
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
        selectedCurrency,
      );

      if (res.success && res.ownership) {
        toast.success(`Successfully Acquired: ${edition.title}`, {
          description: `Edition Serial: ${res.ownership.serialDisplay} • Cryptographic COA Issued`,
        });
        setEditions(getStoredEditions());
        setOwnerships(getStoredOwnerships());
        setActivities(getStoredActivity());
        setActiveOwnershipForCoa(res.ownership);
        setCoaModalOpen(true);
      } else {
        toast.error(res.error || "Purchase failed.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Transaction could not be completed.");
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

  // If edition is not found
  if (!edition) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-[#edf4f1] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl border border-[#1e293b] bg-[#161f2c]">
          <Award className="size-12 text-[#10b981] mx-auto opacity-70" />
          <h2 className="text-xl font-serif font-bold text-white">Digital Edition Not Found</h2>
          <p className="text-sm text-[#94a3b8]">
            The requested photographic edition token or masterwork could not be located in the
            registry.
          </p>
          <div className="pt-2">
            <Link
              to="/editions"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10b981] text-[#080B10] text-xs font-bold hover:bg-[#059669] transition"
            >
              <ArrowLeft className="size-4" />
              <span>Back to Editions</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isSoldOut = edition.availableEditions <= 0;

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#edf4f1] font-sans selection:bg-[#10b981] selection:text-[#080B10]">
      {/* ============================================================ */}
      {/* 1. TOP UTILITY HEADER / BREADCRUMBS                          */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-40 bg-[#161b22]/90 backdrop-blur-md border-b border-[#21262d] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 truncate">
          <Link
            to="/editions"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#30363d] bg-[#21262d]/50 hover:bg-[#30363d] text-xs font-medium text-[#c9d1d9] transition shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Back to Editions</span>
          </Link>

          <span className="text-[#484f58] hidden sm:inline">/</span>

          <span className="text-xs font-mono text-[#8b949e] truncate hidden md:inline">
            {edition.collectionName || "Fine-Art Registry"}
          </span>

          <span className="text-[#484f58] hidden md:inline">/</span>

          <span className="text-xs font-semibold text-[#f0f6fc] truncate">
            {edition.title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-lg border border-[#30363d] bg-[#21262d]/50 hover:bg-[#30363d] text-[#c9d1d9] hover:text-white transition"
            title="Share Masterwork"
          >
            <Share2 className="size-4" />
          </button>

          {/* Favorite Button */}
          <button
            type="button"
            onClick={() => {
              setIsFavorited(!isFavorited);
              toast.success(
                !isFavorited ? "Added to your collection watchlist" : "Removed from watchlist",
              );
            }}
            className={`p-2 rounded-lg border transition ${
              isFavorited
                ? "border-pink-500/50 bg-pink-500/10 text-pink-400"
                : "border-[#30363d] bg-[#21262d]/50 hover:bg-[#30363d] text-[#c9d1d9] hover:text-white"
            }`}
            title="Favorite / Watchlist"
          >
            <Heart className={`size-4 ${isFavorited ? "fill-current" : ""}`} />
          </button>

          {/* Inspect COA Modal Trigger */}
          <button
            type="button"
            onClick={() => {
              setActiveOwnershipForCoa(editionOwnerships[0] || null);
              setCoaModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#10b981]/40 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-xs font-mono font-medium text-[#5af2b3] transition"
          >
            <ShieldCheck className="size-3.5" />
            <span className="hidden sm:inline">Inspect COA</span>
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. MAIN 2-COLUMN WORKSPACE (Matching Figma Screen)            */}
      {/* ============================================================ */}
      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ------------------------------------------------------------ */}
          {/* LEFT COLUMN (Cols 1-6): Artwork Display & Details Accordions */}
          {/* ------------------------------------------------------------ */}
          <div className="lg:col-span-6 space-y-6">
            {/* Artwork Card with Framing & Zoom */}
            <div className="relative rounded-2xl overflow-hidden border border-[#30363d] bg-[#161b22] shadow-2xl group">
              {/* Top Banner Tag inside Artwork */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d1117]/80 backdrop-blur-md border border-[#30363d] text-[11px] font-mono font-semibold text-white shadow-lg">
                  <Sparkles className="size-3 text-[#10b981]" />
                  {edition.tier === "genesis_1_of_1"
                    ? "1 OF 1 GENESIS MASTER"
                    : edition.tier === "physical_twin"
                      ? "PHYSICAL GICLÉE TWIN"
                      : `LIMITED SERIES #${String(edition.totalEditions - edition.availableEditions + 1).padStart(2, "0")}/${edition.totalEditions}`}
                </span>
                {edition.hasPhysicalTwin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300">
                    MUSEUM PRINT PAIRING
                  </span>
                )}
              </div>

              {/* Fullscreen Trigger */}
              <button
                type="button"
                onClick={() => setFullscreenOpen(true)}
                className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-[#0d1117]/80 backdrop-blur-md border border-[#30363d] text-white/80 hover:text-white hover:scale-105 transition shadow-lg opacity-0 group-hover:opacity-100"
                title="Fullscreen View"
              >
                <Maximize2 className="size-4" />
              </button>

              {/* High-Resolution Artwork Image */}
              <div className="w-full aspect-square bg-[#0d1117] flex items-center justify-center overflow-hidden">
                <img
                  src={edition.image}
                  alt={edition.title}
                  className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition duration-500 ease-out"
                />
              </div>

              {/* Master Hash & Provenance Bar below image */}
              <div className="p-4 bg-[#161b22] border-t border-[#21262d] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-[#8b949e] font-mono text-[11px] truncate">
                  <ShieldCheck className="size-4 text-[#10b981] shrink-0" />
                  <span className="truncate">
                    SHA-256: {edition.masterHash.slice(0, 16)}...{edition.masterHash.slice(-8)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(edition.masterHash, "hash", "Master Hash")}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-[#58a6ff] hover:underline"
                >
                  {copiedKey === "hash" ? <Check className="size-3" /> : <Copy className="size-3" />}
                  <span>{copiedKey === "hash" ? "Copied" : "Copy Hash"}</span>
                </button>
              </div>
            </div>

            {/* Accordion 1: Description & Curatorial Statement */}
            <div className="rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setDescOpen(!descOpen)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#21262d]/40 transition"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="size-4 text-[#8b949e]" />
                  <span className="text-sm font-semibold text-[#f0f6fc]">
                    Description &amp; Curatorial Note
                  </span>
                </div>
                {descOpen ? <ChevronUp className="size-4 text-[#8b949e]" /> : <ChevronDown className="size-4 text-[#8b949e]" />}
              </button>
              {descOpen && (
                <div className="px-5 pb-5 pt-1 text-sm text-[#8b949e] leading-relaxed space-y-3 border-t border-[#21262d]">
                  <p>{edition.description}</p>
                  {edition.curatorNote && (
                    <div className="p-3.5 rounded-xl border border-[#10b981]/30 bg-[#10b981]/5 text-xs text-[#c9d1d9] space-y-1">
                      <span className="font-mono text-[10px] text-[#5af2b3] uppercase font-bold tracking-wider block">
                        Curator's Assessment
                      </span>
                      <p className="italic leading-relaxed">{edition.curatorNote}</p>
                    </div>
                  )}
                  {edition.physicalPrintDetails && (
                    <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs text-[#c9d1d9] space-y-1">
                      <span className="font-mono text-[10px] text-amber-400 uppercase font-bold tracking-wider block">
                        Physical Twin Specifications
                      </span>
                      <p className="leading-relaxed">{edition.physicalPrintDetails}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Accordion 2: About the Artist */}
            <div className="rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setArtistOpen(!artistOpen)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#21262d]/40 transition"
              >
                <div className="flex items-center gap-2.5">
                  <User className="size-4 text-[#8b949e]" />
                  <span className="text-sm font-semibold text-[#f0f6fc]">
                    About {edition.photographerName}
                  </span>
                </div>
                {artistOpen ? <ChevronUp className="size-4 text-[#8b949e]" /> : <ChevronDown className="size-4 text-[#8b949e]" />}
              </button>
              {artistOpen && (
                <div className="px-5 pb-5 pt-1 space-y-4 border-t border-[#21262d]">
                  <div className="flex items-center gap-3 pt-2">
                    <img
                      src={
                        edition.photographerAvatar ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                      }
                      alt={edition.photographerName}
                      className="size-12 rounded-full object-cover border border-[#30363d]"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white">
                          {edition.photographerName}
                        </span>
                        <CheckCircle2 className="size-4 text-[#10b981]" />
                      </div>
                      <span className="text-xs text-[#8b949e] font-mono">
                        Verified Fine-Art Photographer
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-[#8b949e] leading-relaxed">
                    Celebrated photographer focusing on medium-format archival storytelling,
                    tonal precision, and cryptographic digital provenance registered on NS CAPTURES.
                  </p>
                  <div className="pt-1 flex items-center gap-3">
                    <Link
                      to={`/photographer/${edition.photographerSlug || edition.photographerId}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#30363d] bg-[#21262d]/60 hover:bg-[#30363d] text-xs font-semibold text-[#f0f6fc] transition"
                    >
                      <span>View Artist Profile</span>
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 3: Contract & Details */}
            <div className="rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#21262d]/40 transition"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="size-4 text-[#8b949e]" />
                  <span className="text-sm font-semibold text-[#f0f6fc]">
                    Contract &amp; On-Chain Details
                  </span>
                </div>
                {detailsOpen ? <ChevronUp className="size-4 text-[#8b949e]" /> : <ChevronDown className="size-4 text-[#8b949e]" />}
              </button>
              {detailsOpen && (
                <div className="px-5 pb-5 pt-1 space-y-3 text-xs border-t border-[#21262d] font-mono">
                  <div className="flex items-center justify-between py-1 border-b border-[#21262d]">
                    <span className="text-[#8b949e]">Contract Address</span>
                    <div className="flex items-center gap-1.5 text-[#58a6ff]">
                      <a
                        href="https://basescan.org"
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        0x29f8...7B4c
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            "0x29f8a32490b6c12c98d7b4c9103e5a7b8e9104f1",
                            "contract",
                            "Contract Address",
                          )
                        }
                      >
                        {copiedKey === "contract" ? (
                          <Check className="size-3 text-emerald-400" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#21262d]">
                    <span className="text-[#8b949e]">Token ID</span>
                    <span className="text-[#f0f6fc]">{edition.tokenId}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#21262d]">
                    <span className="text-[#8b949e]">Token Standard</span>
                    <span className="text-[#f0f6fc]">
                      {edition.tier === "genesis_1_of_1" ? "ERC-721 (1/1 Master)" : "ERC-1155 (Edition Series)"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#21262d]">
                    <span className="text-[#8b949e]">Chain</span>
                    <span className="text-[#f0f6fc]">Base L2 • Multi-Chain EVM</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#21262d]">
                    <span className="text-[#8b949e]">Creator Royalties</span>
                    <span className="text-[#f0f6fc]">{edition.royaltyPercent}% Perpetual</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#8b949e]">Metadata Fingerprint</span>
                    <span className="text-[#10b981] font-semibold">100% On-Chain COA</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* RIGHT COLUMN (Cols 7-12): Pricing, Actions, Traits & Activity */}
          {/* ------------------------------------------------------------ */}
          <div className="lg:col-span-6 space-y-6">
            {/* Header / Collection & Title */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-[#58a6ff] hover:underline cursor-pointer">
                  {edition.collectionName || "NS CAPTURES Fine-Art Master Series"}
                </span>
                <CheckCircle2 className="size-3.5 text-[#58a6ff] fill-current" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                {edition.title}
              </h1>

              <div className="flex items-center gap-3 text-xs text-[#8b949e]">
                <span>
                  Minted by{" "}
                  <strong className="text-white font-medium">
                    {edition.photographerName}
                  </strong>
                </span>
                <span>&bull;</span>
                <span className="font-mono">
                  {edition.availableEditions} of {edition.totalEditions} Remaining
                </span>
              </div>
            </div>

            {/* Metric Ribbon (Figma 4-stat bar) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-[#30363d] bg-[#161b22]">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-[#8b949e] uppercase block">
                  Top Offer
                </span>
                <span className="text-sm font-semibold font-mono text-white">
                  {(edition.priceEth * 0.85).toFixed(2)} ETH
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-[#8b949e] uppercase block">
                  Last Sale
                </span>
                <span className="text-sm font-semibold font-mono text-white">
                  {edition.priceEth} ETH
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-[#8b949e] uppercase block">
                  Floor Price
                </span>
                <span className="text-sm font-semibold font-mono text-white">
                  {edition.priceEth} ETH
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-[#8b949e] uppercase block">
                  Edition Supply
                </span>
                <span className="text-sm font-semibold font-mono text-[#10b981]">
                  {edition.totalEditions} Total
                </span>
              </div>
            </div>

            {/* Price Box & Primary CTAs (Figma Prominent Buy Now) */}
            <div className="p-6 rounded-2xl border border-[#30363d] bg-[#161b22] shadow-xl space-y-5">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-[#8b949e]">
                  <span>Current Price</span>
                  <span className="flex items-center gap-1 text-[#10b981] font-mono">
                    <Zap className="size-3" />
                    Instant Acquisition
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tight">
                    {edition.priceEth} ETH
                  </span>
                  <span className="text-sm font-mono text-[#8b949e]">
                    &asymp; £{edition.priceGbp.toLocaleString("en-GB")} GBP / $
                    {edition.priceUsd.toLocaleString("en-US")} USD
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={isSoldOut || isPurchasing}
                  onClick={handleExecuteBuy}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2.5 shadow-xl ${
                    isSoldOut
                      ? "bg-[#21262d] text-[#6e7681] cursor-not-allowed border border-[#30363d]"
                      : "bg-[#2081e2] hover:bg-[#1868b7] active:scale-[0.99] text-white shadow-[#2081e2]/25"
                  }`}
                >
                  <Zap className="size-4" />
                  <span>
                    {isPurchasing
                      ? "Processing Acquisition..."
                      : isSoldOut
                        ? "Sold Out"
                        : "Buy Now"}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOfferModalOpen(true)}
                    className="py-2.5 px-4 rounded-xl border border-[#30363d] bg-[#21262d]/60 hover:bg-[#30363d] text-xs font-semibold text-white transition flex items-center justify-center gap-2"
                  >
                    <Tag className="size-3.5 text-[#8b949e]" />
                    <span>Make Offer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveOwnershipForCoa(editionOwnerships[0] || null);
                      setCoaModalOpen(true);
                    }}
                    className="py-2.5 px-4 rounded-xl border border-[#30363d] bg-[#21262d]/60 hover:bg-[#30363d] text-xs font-semibold text-[#5af2b3] transition flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="size-3.5" />
                    <span>Inspect COA</span>
                  </button>
                </div>
              </div>

              {/* Deposit Gating Verification Notice */}
              <div className="pt-2 border-t border-[#21262d] flex items-center justify-between text-[11px] text-[#8b949e]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-[#10b981]" />
                  <span>Platform Deposit Vault Guarded</span>
                </div>
                <span className="font-mono text-[#58a6ff]">Base &bull; Solana &bull; USDT</span>
              </div>
            </div>

            {/* Traits & Photographic Attributes Grid (Exact Figma Replica) */}
            <div className="rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setTraitsOpen(!traitsOpen)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#21262d]/40 transition"
              >
                <div className="flex items-center gap-2.5">
                  <Tag className="size-4 text-[#8b949e]" />
                  <span className="text-sm font-semibold text-[#f0f6fc]">
                    Traits &amp; Photographic Attributes
                  </span>
                  <span className="text-xs font-mono text-[#8b949e]">
                    ({traits.length})
                  </span>
                </div>
                {traitsOpen ? <ChevronUp className="size-4 text-[#8b949e]" /> : <ChevronDown className="size-4 text-[#8b949e]" />}
              </button>

              {traitsOpen && (
                <div className="p-5 pt-2 border-t border-[#21262d]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {traits.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-[#30363d] bg-[#0d1117] hover:border-[#58a6ff]/50 transition space-y-1.5"
                      >
                        <span className="font-mono text-[10px] text-[#8b949e] uppercase tracking-wider block">
                          {t.type}
                        </span>
                        <p className="text-xs font-semibold text-white truncate" title={t.value}>
                          {t.value}
                        </p>
                        <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                          <span className={`px-2 py-0.5 rounded-full border ${getRarityBadgeStyle(t.rarity)}`}>
                            {t.rarity}% rarity
                          </span>
                          <span className="text-[#8b949e]">{t.floorEth}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Item Activity Table (Mints, Sales, Transfers) */}
            <div className="rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setActivityOpen(!activityOpen)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#21262d]/40 transition"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="size-4 text-[#8b949e]" />
                  <span className="text-sm font-semibold text-[#f0f6fc]">
                    Item Activity &amp; Provenance
                  </span>
                  <span className="text-xs font-mono text-[#8b949e]">
                    ({editionActivity.length + 1})
                  </span>
                </div>
                {activityOpen ? <ChevronUp className="size-4 text-[#8b949e]" /> : <ChevronDown className="size-4 text-[#8b949e]" />}
              </button>

              {activityOpen && (
                <div className="border-t border-[#21262d] overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#161b22] text-[#8b949e] text-[10px] uppercase border-b border-[#21262d]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Event</th>
                        <th className="px-4 py-3 font-medium">Price</th>
                        <th className="px-4 py-3 font-medium">From</th>
                        <th className="px-4 py-3 font-medium">To</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d] text-[#c9d1d9]">
                      {/* Seed Mint Event */}
                      <tr className="hover:bg-[#21262d]/30">
                        <td className="px-4 py-3 font-semibold text-[#5af2b3] flex items-center gap-1.5">
                          <Sparkles className="size-3" />
                          Minted
                        </td>
                        <td className="px-4 py-3 text-white font-bold">
                          {edition.priceEth} ETH
                        </td>
                        <td className="px-4 py-3 text-[#58a6ff] truncate max-w-[100px]">
                          NullAddress
                        </td>
                        <td className="px-4 py-3 text-[#58a6ff] truncate max-w-[100px]">
                          {edition.photographerName}
                        </td>
                        <td className="px-4 py-3 text-[#8b949e]">
                          {new Date(edition.mintedAt).toLocaleDateString()}
                        </td>
                      </tr>

                      {/* Real User Activities */}
                      {editionActivity.map((act) => (
                        <tr key={act.id} className="hover:bg-[#21262d]/30">
                          <td className="px-4 py-3 font-semibold text-[#58a6ff] capitalize">
                            {act.type}
                          </td>
                          <td className="px-4 py-3 text-white font-bold">
                            {act.price ? `${act.price} ETH` : "-"}
                          </td>
                          <td className="px-4 py-3 text-[#8b949e] truncate max-w-[100px]">
                            {act.fromUser || "Registry"}
                          </td>
                          <td className="px-4 py-3 text-[#58a6ff] truncate max-w-[100px]">
                            {act.toUser || "Collector"}
                          </td>
                          <td className="px-4 py-3 text-[#8b949e]">Just now</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* 3. MODALS (COA, Fullscreen, Offers, Deposit Warning)          */}
      {/* ============================================================ */}

      {/* Cryptographic Certificate of Authenticity Modal */}
      {coaModalOpen && (
        <CertificateOfAuthenticityModal
          edition={edition}
          ownership={
            activeOwnershipForCoa || {
              id: `coa-${edition.id}-sample`,
              editionId: edition.id,
              serialNumber: 1,
              serialDisplay:
                edition.tier === "genesis_1_of_1"
                  ? "#01 / 01"
                  : `#01 / ${edition.totalEditions}`,
              ownerId: edition.photographerId,
              ownerName: edition.photographerName,
              acquiredAt: edition.mintedAt,
              purchasePriceGbp: edition.priceGbp,
              purchaseCurrency: "ETH",
              certificateNumber: `COA-${edition.tokenId.replace("NSC-", "")}-01`,
              isListedForResale: false,
            }
          }
          onClose={() => setCoaModalOpen(false)}
        />
      )}

      {/* Fullscreen Artwork Modal */}
      {fullscreenOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-200"
          onClick={() => setFullscreenOpen(false)}
        >
          <button
            type="button"
            onClick={() => setFullscreenOpen(false)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10"
          >
            <X className="size-6" />
          </button>
          <img
            src={edition.image}
            alt={edition.title}
            className="max-h-[92vh] max-w-[92vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Make Offer Modal */}
      {offerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-2xl border border-[#30363d] bg-[#161b22] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif font-bold text-white">Make an Offer</h3>
              <button
                type="button"
                onClick={() => setOfferModalOpen(false)}
                className="text-[#8b949e] hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs text-[#8b949e]">
              Enter your offer amount in ETH for <strong>{edition.title}</strong>.
            </p>

            <form onSubmit={handleMakeOffer} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-[#8b949e] block mb-1">
                  Offer Amount (ETH)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="0.45"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#30363d] bg-[#0d1117] text-white font-mono text-sm focus:border-[#58a6ff] outline-none"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-mono text-[#8b949e]">
                    ETH
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOfferModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#30363d] text-xs font-semibold text-[#c9d1d9] hover:bg-[#21262d] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2081e2] hover:bg-[#1868b7] text-white text-xs font-bold transition shadow-lg"
                >
                  Submit Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Required Warning Modal */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-2xl border border-amber-500/40 bg-[#161b22] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Coins className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-white">
                  Web3 Deposit Required
                </h3>
                <span className="text-xs text-[#8b949e]">
                  Collector Verification Gate
                </span>
              </div>
            </div>

            <p className="text-xs text-[#c9d1d9] leading-relaxed">
              To acquire on-platform digital editions, an active crypto deposit is required in your
              assigned Web3 address (min: {depositConfig.ethThreshold} ETH,{" "}
              {depositConfig.solThreshold} SOL, or {depositConfig.usdtThreshold} USDT).
            </p>

            {primaryEvmAddress && (
              <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1">
                <span className="text-[10px] font-mono uppercase text-[#8b949e]">
                  Your Web3 Deposit Address
                </span>
                <div className="flex items-center justify-between font-mono text-xs text-[#58a6ff]">
                  <span className="truncate">{primaryEvmAddress}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(primaryEvmAddress, "depositAddr", "Deposit Address")}
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPurchaseModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#30363d] text-xs font-semibold text-[#c9d1d9] hover:bg-[#21262d] transition"
              >
                Close
              </button>
              <Link
                to="/account?tab=settlement"
                className="px-5 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#080B10] text-xs font-bold transition shadow-lg"
              >
                Go to Vault Deposit
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
