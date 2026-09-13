import { useState, useEffect, useCallback } from "react";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Layers,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  checkDepositEligibility,
  mintDigitalEdition,
  getDepositConfig,
  type DigitalEdition,
  type EditionTier,
} from "../data/editions";
import { fetchCreatorWeb3Vault, type CryptoWalletEntry } from "../data/db";
import { fetchMultiChainVaultBalances } from "../../lib/onChainBalance";
import { generateQrSvg } from "../../lib/qrcode";
import { copyToClipboard } from "../../lib/clipboard";
import type { Photo } from "../data/photos";

interface MintEditionModalProps {
  photo: Photo;
  onClose: () => void;
  onSuccess?: (edition: DigitalEdition) => void;
}

export function MintEditionModal({ photo, onClose, onSuccess }: MintEditionModalProps) {
  const { user } = useAuth();
  const config = getDepositConfig();

  // Verification state
  const [checkingBalance, setCheckingBalance] = useState(true);
  const [isEligible, setIsEligible] = useState(false);
  const [eligibilityToken, setEligibilityToken] = useState<string | null>(null);
  const [wallets, setWallets] = useState<CryptoWalletEntry[]>([]);
  const [activeDepositTab, setActiveDepositTab] = useState<"ETH" | "USDT" | "SOL" | "BTC">("ETH");
  const [copied, setCopied] = useState(false);

  // Minting form state
  const [tier, setTier] = useState<EditionTier>("limited_series");
  const [totalEditions, setTotalEditions] = useState<number>(25);
  const [priceGbp, setPriceGbp] = useState<number>(
    photo.price ? Math.max(photo.price * 2, 150) : 250,
  );
  const [royaltyPercent, setRoyaltyPercent] = useState<number>(10);
  const [hasPhysicalTwin, setHasPhysicalTwin] = useState<boolean>(false);
  const [physicalDetails, setPhysicalDetails] = useState<string>(
    "Includes 20x30” signed museum-grade Hahnemühle Photo Rag print.",
  );
  const [minting, setMinting] = useState(false);

  // Load vault & check balances
  const checkBalances = useCallback(async () => {
    if (!user) return;
    try {
      setCheckingBalance(true);
      const vault = await fetchCreatorWeb3Vault(user.id || (user as any).slug);
      const userWallets = vault?.wallets || [];
      setWallets(userWallets);

      if (userWallets.length > 0) {
        const balances = await fetchMultiChainVaultBalances(userWallets, {
          tokenBalances: vault?.tokenBalances,
        });

        // Find individual coin balances
        const ethAsset = balances.assets.find((a) => a.coin === "ETH");
        const solAsset = balances.assets.find((a) => a.coin === "SOL");
        const usdtAsset = balances.assets.find((a) => a.coin === "USDT");
        const usdcAsset = balances.assets.find((a) => a.coin === "USDC");
        const btcAsset = balances.assets.find((a) => a.coin === "BTC");

        const eligibility = checkDepositEligibility({
          eth: ethAsset?.balance || 0,
          sol: solAsset?.balance || 0,
          usdt: usdtAsset?.balance || 0,
          usdc: usdcAsset?.balance || 0,
          btc: btcAsset?.balance || 0,
          totalUsd: balances.totalGbp * 1.28,
        });

        setIsEligible(eligibility.eligible);
        setEligibilityToken(eligibility.qualifyingToken || null);
      } else {
        setIsEligible(!config.enforceDepositGate);
      }
    } catch (e) {
      console.error("Balance check error:", e);
    } finally {
      setCheckingBalance(false);
    }
  }, [user, config.enforceDepositGate]);

  useEffect(() => {
    checkBalances();
  }, [checkBalances]);

  // Selected deposit address
  const activeWallet =
    wallets.find((w) => {
      if (activeDepositTab === "ETH") return w.coin === "ETH" || w.network === "ERC20";
      if (activeDepositTab === "USDT")
        return w.coin === "USDT" && (w.network === "TRC20" || w.network === "ERC20");
      if (activeDepositTab === "SOL") return w.coin === "SOL" || w.network === "Solana";
      if (activeDepositTab === "BTC") return w.coin === "BTC" || w.network === "Bitcoin";
      return false;
    }) || wallets[0];

  const depositAddress = activeWallet?.address || "";
  const qrSvg = depositAddress ? generateQrSvg(depositAddress, { margin: 2 }) : "";

  const handleCopy = async () => {
    if (!depositAddress) return;
    const ok = await copyToClipboard(depositAddress);
    if (ok) {
      setCopied(true);
      toast.success("Deposit address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMint = () => {
    if (!isEligible) {
      toast.error("Please fund your Web3 Vault to complete certification.");
      return;
    }

    try {
      setMinting(true);

      const newEdition = mintDigitalEdition({
        photoId: photo.id,
        title: photo.title,
        description: photo.description || `Fine-art digital edition by ${photo.photographer}.`,
        photographerId: photo.photographerId || user?.id || "photog",
        photographerName: photo.photographer || user?.name || "Anonymous",
        photographerAvatar: user?.avatar,
        image: photo.image,
        tier,
        totalEditions: tier === "genesis_1_of_1" ? 1 : totalEditions,
        priceGbp,
        priceUsd: Math.round(priceGbp * 1.28),
        priceEth: Number((priceGbp / 2600).toFixed(3)),
        priceSol: Number((priceGbp / 110).toFixed(2)),
        royaltyPercent,
        hasPhysicalTwin: tier === "physical_twin" || hasPhysicalTwin,
        physicalPrintDetails:
          hasPhysicalTwin || tier === "physical_twin" ? physicalDetails : undefined,
        camera: photo.camera || "Leica M11",
        lens: photo.lens || "50mm Prime",
        iso: photo.iso || 100,
        aperture: photo.aperture,
        shutterSpeed: photo.shutterSpeed,
        location: photo.location,
        yearCreated: new Date().getFullYear(),
      });

      toast.success(`Successfully minted ${newEdition.title} as ${newEdition.tokenId}!`);
      if (onSuccess) onSuccess(newEdition);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to mint digital edition.");
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#FAF9F5] text-[#18211f] rounded-2xl shadow-2xl overflow-hidden border border-[#e5e2da] my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e2da] bg-white/70 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center bg-[#1e4a3f] text-white rounded-full text-xs font-mono font-bold">
              NS
            </span>
            <div>
              <h2 className="font-serif text-lg font-semibold leading-none text-[#18211f]">
                Certify & Mint Fine-Art Edition
              </h2>
              <p className="text-xs text-[#59645f] mt-0.5">
                On-platform digital provenance & numbered scarcity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#59645f] hover:text-[#18211f] hover:bg-gray-100 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Artwork Snippet */}
          <div className="flex gap-4 items-center p-3 bg-white rounded-xl border border-[#e5e2da] shadow-sm">
            <img
              src={photo.image}
              alt={photo.title}
              className="w-16 h-16 object-cover rounded-lg border border-[#e5e2da]"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#59645f] font-semibold">
                Original Master File
              </span>
              <h3 className="font-serif text-base font-semibold text-[#18211f] truncate">
                {photo.title}
              </h3>
              <p className="text-xs text-[#59645f]">
                {photo.camera} • {photo.lens} • ISO {photo.iso}
              </p>
            </div>
          </div>

          {/* Verification Status & Gating Alert */}
          {checkingBalance ? (
            <div className="flex items-center justify-center p-8 bg-white rounded-xl border border-[#e5e2da]">
              <RefreshCw className="size-5 text-[#1e4a3f] animate-spin mr-2" />
              <span className="text-xs font-mono text-[#59645f]">
                Verifying Web3 Vault on-chain deposit status...
              </span>
            </div>
          ) : !isEligible ? (
            /* Deposit Gate Required Banner */
            <div className="p-5 bg-[#fcf8f0] rounded-xl border border-[#eedab2] space-y-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="size-5 text-[#c27803] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[#8a5300]">
                    Active Web3 Vault Deposit Required
                  </h4>
                  <p className="text-xs text-[#704800] mt-1 leading-relaxed">
                    To maintain an exclusive, spam-free gallery of authentic photographic
                    masterworks, NS CAPTURES requires creators to hold an active deposit in their
                    Web3 vault (minimum <strong>£15 / $20 equivalent</strong> in ETH, SOL, USDT, or
                    BTC).
                  </p>
                </div>
              </div>

              {/* Deposit Network Tabs */}
              <div className="pt-2 border-t border-[#eedab2]/60">
                <div className="flex gap-1.5 p-1 bg-[#f4ece0] rounded-lg text-xs font-medium">
                  {(["ETH", "USDT", "SOL", "BTC"] as const).map((coin) => (
                    <button
                      key={coin}
                      onClick={() => setActiveDepositTab(coin)}
                      className={`flex-1 py-1.5 rounded-md transition text-center ${
                        activeDepositTab === coin
                          ? "bg-white text-[#1e4a3f] shadow-sm font-semibold"
                          : "text-[#704800] hover:text-[#18211f]"
                      }`}
                    >
                      {coin}
                    </button>
                  ))}
                </div>

                {/* Deposit Address & QR */}
                <div className="mt-4 flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-[#eedab2]/80">
                  {qrSvg && (
                    <div
                      className="size-24 shrink-0 bg-white p-1 rounded-lg border border-[#e5e2da] shadow-sm flex items-center justify-center [&>svg]:size-full"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-1.5 text-center sm:text-left">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#59645f] block">
                      Your Vault {activeDepositTab} Deposit Address
                    </span>
                    <p className="font-mono text-xs font-semibold text-[#18211f] break-all select-all bg-[#FAF9F5] p-2 rounded border border-[#e5e2da]">
                      {depositAddress || "No address derived"}
                    </p>
                    <div className="flex gap-2 justify-center sm:justify-start pt-1">
                      <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-[#FAF9F5] border border-[#e5e2da] rounded-md text-[#1e4a3f] hover:bg-white font-medium"
                      >
                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        <span>{copied ? "Copied" : "Copy Address"}</span>
                      </button>
                      <button
                        onClick={checkBalances}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-[#1e4a3f] text-white rounded-md hover:bg-[#163830] font-medium transition"
                      >
                        <RefreshCw className="size-3.5" />
                        <span>Verify On-Chain</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-[#704800] italic text-center">
                  Deposited funds remain 100% in your self-custody vault and are never confiscated.
                </div>
              </div>
            </div>
          ) : (
            /* Eligible Verified Banner */
            <div className="flex items-center justify-between p-3.5 bg-[#eef7f0] rounded-xl border border-[#c3e3cb] text-[#1e7a4f]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-[#1e7a4f]" />
                <span className="text-xs font-semibold">
                  Vault Verified: Active deposit confirmed via {eligibilityToken || "Web3 Vault"}.
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase bg-[#1e7a4f]/15 px-2 py-0.5 rounded-full font-bold">
                MINTING UNLOCKED
              </span>
            </div>
          )}

          {/* Minting Form Options */}
          <div
            className={`space-y-5 transition-opacity duration-200 ${!isEligible ? "opacity-40 pointer-events-none" : "opacity-100"}`}
          >
            {/* Edition Tier Selector */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#59645f] block mb-2 font-semibold">
                Select Scarcity Tier
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTier("genesis_1_of_1")}
                  className={`p-3.5 text-left rounded-xl border transition ${
                    tier === "genesis_1_of_1"
                      ? "border-[#1e4a3f] bg-[#1e4a3f]/5 ring-1 ring-[#1e4a3f]"
                      : "border-[#e5e2da] bg-white hover:border-[#1e4a3f]/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-serif font-semibold text-sm text-[#18211f]">
                      Genesis 1 of 1 Master
                    </span>
                    <Sparkles className="size-4 text-[#d4af37]" />
                  </div>
                  <p className="text-xs text-[#59645f] leading-snug">
                    Singular digital master original. No further digital copies will ever be minted.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTier("limited_series")}
                  className={`p-3.5 text-left rounded-xl border transition ${
                    tier === "limited_series"
                      ? "border-[#1e4a3f] bg-[#1e4a3f]/5 ring-1 ring-[#1e4a3f]"
                      : "border-[#e5e2da] bg-white hover:border-[#1e4a3f]/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-serif font-semibold text-sm text-[#18211f]">
                      Curated Numbered Series
                    </span>
                    <Layers className="size-4 text-[#1e4a3f]" />
                  </div>
                  <p className="text-xs text-[#59645f] leading-snug">
                    Fixed limited edition run (e.g. 15 or 25) with stamped serials (#01/25).
                  </p>
                </button>
              </div>
            </div>

            {/* Total Editions input (if series) */}
            {tier === "limited_series" && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#59645f] font-semibold">
                    Edition Quantity
                  </label>
                  <span className="text-xs font-mono font-bold text-[#1e4a3f]">
                    {totalEditions} Editions
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={totalEditions}
                    onChange={(e) => setTotalEditions(Number(e.target.value))}
                    className="w-full accent-[#1e4a3f]"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#59645f] mt-1 font-mono">
                  <span>5 (Ultra Rare)</span>
                  <span>25 (Standard Gallery)</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            )}

            {/* Price Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-[#59645f] block mb-1.5 font-semibold">
                  Listing Price (GBP £)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-[#59645f] font-serif">
                    £
                  </span>
                  <input
                    type="number"
                    min={50}
                    step={10}
                    value={priceGbp}
                    onChange={(e) => setPriceGbp(Math.max(1, Number(e.target.value)))}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-[#e5e2da] rounded-xl text-sm font-medium text-[#18211f] focus:outline-none focus:border-[#1e4a3f]"
                  />
                </div>
                <span className="text-[11px] text-[#59645f] mt-1 block font-mono">
                  ≈ ${(priceGbp * 1.28).toFixed(0)} USD • {(priceGbp / 2600).toFixed(3)} ETH
                </span>
              </div>

              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-[#59645f] block mb-1.5 font-semibold">
                  Secondary Resale Royalty
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={5}
                    max={20}
                    value={royaltyPercent}
                    onChange={(e) => setRoyaltyPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#e5e2da] rounded-xl text-sm font-medium text-[#18211f] focus:outline-none focus:border-[#1e4a3f]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-[#59645f] font-mono">
                    %
                  </span>
                </div>
                <span className="text-[11px] text-[#59645f] mt-1 block">
                  Creator cut credited automatically on future secondary sales.
                </span>
              </div>
            </div>

            {/* Physical Twin Toggle */}
            <div className="p-4 bg-white rounded-xl border border-[#e5e2da] space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPhysicalTwin}
                  onChange={(e) => setHasPhysicalTwin(e.target.checked)}
                  className="size-4 rounded text-[#1e4a3f] accent-[#1e4a3f]"
                />
                <div>
                  <span className="text-xs font-semibold text-[#18211f] block">
                    Pair with Archival Physical Print Twin (Optional)
                  </span>
                  <span className="text-[11px] text-[#59645f]">
                    Collector also receives a museum-grade Hahnemühle physical print delivered to
                    their door.
                  </span>
                </div>
              </label>

              {hasPhysicalTwin && (
                <textarea
                  value={physicalDetails}
                  onChange={(e) => setPhysicalDetails(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2.5 bg-[#FAF9F5] border border-[#e5e2da] rounded-lg mt-2 text-[#18211f] focus:outline-none focus:border-[#1e4a3f]"
                  placeholder="Specify print dimension, paper type (e.g. 24x36 Photo Rag), and framing details..."
                />
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 border-t border-[#e5e2da] bg-white/70 backdrop-blur flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#59645f] hover:text-[#18211f] transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleMint}
            disabled={!isEligible || minting}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm ${
              !isEligible || minting
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-[#1e4a3f] text-white hover:bg-[#163830]"
            }`}
          >
            {minting ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                <span>Certifying Masterpiece...</span>
              </>
            ) : (
              <>
                <FileCheck className="size-4" />
                <span>Certify & Publish Edition</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
