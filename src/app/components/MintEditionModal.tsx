import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { MotionConfig, motion } from "framer-motion";
import { X, ShieldAlert, ShieldCheck, Copy, Check, RefreshCw, FileCheck } from "lucide-react";
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
import { NsCapturesLogoBadge } from "./NsCapturesLogoBadge";
import { Chip, SegmentedControl } from "./editions/editionsUi";
import { useBodyScrollLock } from "./editions/useBodyScrollLock";
import { useEditionsTheme } from "./editions/useEditionsTheme";
import {
  inputClass,
  monoLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./editions/editionsFormat";

interface MintEditionModalProps {
  photo: Photo;
  onClose: () => void;
  onSuccess?: (edition: DigitalEdition) => void;
}

const DEPOSIT_COINS = [
  { id: "ETH", label: "ETH" },
  { id: "USDT", label: "USDT" },
  { id: "SOL", label: "SOL" },
  { id: "BTC", label: "BTC" },
] as const;

const TIER_CHOICES: { id: EditionTier; title: string; description: string }[] = [
  {
    id: "genesis_1_of_1",
    title: "Genesis 1 of 1 master",
    description: "A singular digital original. No further copies will ever be minted.",
  },
  {
    id: "limited_series",
    title: "Numbered series",
    description: "A fixed run (e.g. 15 or 25) with stamped serials like #01/25.",
  },
];

export function MintEditionModal({ photo, onClose, onSuccess }: MintEditionModalProps) {
  const { user } = useAuth();
  const { theme } = useEditionsTheme();
  const config = getDepositConfig();
  useBodyScrollLock();

  // Verification state
  const [checkingBalance, setCheckingBalance] = useState(() => Boolean(user));
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Load vault & check balances
  const checkBalances = useCallback(async () => {
    if (!user) return;
    try {
      setCheckingBalance(true);
      const vault = await fetchCreatorWeb3Vault(user.id);
      const userWallets = vault?.wallets || [];
      setWallets(userWallets);

      if (userWallets.length > 0) {
        const balances = await fetchMultiChainVaultBalances(userWallets, {
          tokenBalances: vault?.tokenBalances,
        });

        const balanceOf = (coin: string) =>
          balances.assets.find((a) => a.coin === coin)?.balance || 0;
        const eligibility = checkDepositEligibility({
          eth: balanceOf("ETH"),
          sol: balanceOf("SOL"),
          usdt: balanceOf("USDT"),
          usdc: balanceOf("USDC"),
          btc: balanceOf("BTC"),
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

  const handleMint = (submitForReview: boolean) => {
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
        createdBy: user?.id,
        submitForReview,
      });

      toast.success(
        submitForReview
          ? `“${newEdition.title}” sent for review`
          : `“${newEdition.title}” saved as a draft`,
        {
          description: submitForReview
            ? "It goes live once the NS CAPTURES team approves it. Track it in Account → NFT Editions."
            : "Submit it for review from Account → NFT Editions when you're ready.",
        },
      );
      if (onSuccess) onSuccess(newEdition);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mint digital edition.");
    } finally {
      setMinting(false);
    }
  };

  const formLocked = !user || !isEligible;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        data-ed-theme={theme}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Certify and mint edition"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", duration: 0.45, bounce: 0 }}
          className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-(--ed-border) bg-(--ed-surface) font-sans text-(--ed-text) shadow-(--ed-shadow-lg) sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-(--ed-border) px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <NsCapturesLogoBadge className="size-9" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-medium leading-7 text-(--ed-text)">
                  Certify & mint edition
                </h2>
                <p className="truncate text-sm text-(--ed-muted)">
                  On-platform provenance and numbered scarcity
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1.5 text-(--ed-muted) transition-colors hover:bg-(--ed-hover) hover:text-(--ed-text)"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-5">
            {/* Artwork Snippet */}
            <div className="flex items-center gap-4 rounded-lg border border-(--ed-border) bg-(--ed-bg) p-3">
              <img
                src={photo.image}
                alt={photo.title}
                className="size-16 shrink-0 rounded object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
              />
              <div className="min-w-0 flex-1">
                <p className={monoLabelClass}>Original master file</p>
                <h3 className="truncate pt-1 text-base font-medium text-(--ed-text)">
                  {photo.title}
                </h3>
                <p className="truncate text-xs text-(--ed-muted)">
                  {photo.camera} · {photo.lens} · ISO {photo.iso}
                </p>
              </div>
            </div>

            {/* Verification Status & Gating */}
            {!user ? (
              <div className="flex flex-col items-start gap-3 rounded-lg border border-(--ed-border) bg-(--ed-bg) p-4">
                <div>
                  <p className="text-sm font-medium text-(--ed-text)">Sign in to mint editions</p>
                  <p className="pt-1 text-sm leading-6 text-(--ed-muted)">
                    Minting is linked to your creator account and Web3 vault.
                  </p>
                </div>
                <Link to="/signin" className={`${primaryButtonClass} h-9 px-4 text-sm`}>
                  Sign in
                </Link>
              </div>
            ) : checkingBalance ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-(--ed-border) bg-(--ed-bg) p-6 text-sm text-(--ed-muted)">
                <RefreshCw className="size-4 animate-spin" />
                Verifying your Web3 vault deposit…
              </div>
            ) : !isEligible ? (
              <div className="flex flex-col gap-4 rounded-lg border border-[rgba(255,138,0,0.35)] bg-[rgba(255,138,0,0.08)] p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 size-5 shrink-0 text-(--ed-warning)" />
                  <div>
                    <h4 className="text-sm font-medium text-(--ed-text)">
                      Active vault deposit required
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-(--ed-muted)">
                      To keep the gallery spam-free, creators need an active deposit in their Web3
                      vault (minimum <span className="text-(--ed-text)">£15 / $20 equivalent</span>{" "}
                      in ETH, SOL, USDT or BTC).
                    </p>
                  </div>
                </div>

                <SegmentedControl
                  label="Deposit network"
                  fullWidth
                  options={DEPOSIT_COINS}
                  value={activeDepositTab}
                  onChange={setActiveDepositTab}
                />

                <div className="flex flex-col items-center gap-4 rounded-lg border border-(--ed-border) bg-(--ed-bg) p-3 sm:flex-row">
                  {qrSvg && (
                    <div
                      className="size-24 shrink-0 rounded bg-[#fff] p-1 [&>svg]:size-full"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-2 text-center sm:text-left">
                    <span className={monoLabelClass}>
                      Your vault {activeDepositTab} deposit address
                    </span>
                    <p className="select-all break-all rounded border border-(--ed-border) bg-(--ed-surface) p-2 font-mono text-xs text-(--ed-text)">
                      {depositAddress || "No vault wallet for this network yet"}
                    </p>
                    <div className="flex justify-center gap-2 sm:justify-start">
                      <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!depositAddress}
                        className={`${secondaryButtonClass} h-8 px-3 text-xs disabled:opacity-50`}
                      >
                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        {copied ? "Copied" : "Copy address"}
                      </button>
                      <button
                        type="button"
                        onClick={checkBalances}
                        className={`${primaryButtonClass} h-8 px-3 text-xs`}
                      >
                        <RefreshCw className="size-3.5" />
                        Verify on-chain
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-center text-xs text-(--ed-muted)">
                  Deposited funds stay in your self-custody vault and are never confiscated.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[rgba(47,191,113,0.35)] bg-[rgba(47,191,113,0.08)] p-3">
                <p className="flex items-center gap-2 text-sm text-(--ed-text)">
                  <ShieldCheck className="size-5 text-(--ed-positive)" />
                  Vault verified via {eligibilityToken || "Web3 Vault"}
                </p>
                <Chip>Minting unlocked</Chip>
              </div>
            )}

            {/* Minting Form */}
            <div
              className={`flex flex-col gap-5 transition-opacity duration-200 ${formLocked ? "pointer-events-none opacity-40" : "opacity-100"}`}
            >
              <div>
                <span className={`${monoLabelClass} mb-2 block`}>Scarcity tier</span>
                <div
                  role="radiogroup"
                  aria-label="Scarcity tier"
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  {TIER_CHOICES.map((choice) => {
                    const checked = tier === choice.id;
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => setTier(choice.id)}
                        className={`rounded-lg border p-4 text-left transition-colors ${
                          checked
                            ? "border-(--ed-primary) bg-(--ed-primary)/10"
                            : "border-(--ed-border) bg-(--ed-bg) hover:border-(--ed-border-strong)"
                        }`}
                      >
                        <span className="block text-sm font-medium text-(--ed-text)">
                          {choice.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-(--ed-muted)">
                          {choice.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {tier === "limited_series" && (
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="mint-quantity" className={monoLabelClass}>
                      Edition quantity
                    </label>
                    <span className="font-mono text-sm text-(--ed-text)">
                      {totalEditions} editions
                    </span>
                  </div>
                  <input
                    id="mint-quantity"
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={totalEditions}
                    onChange={(e) => setTotalEditions(Number(e.target.value))}
                    className="mt-3 w-full accent-(--ed-primary)"
                  />
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-(--ed-muted)">
                    <span>5 · ultra rare</span>
                    <span>25 · standard</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="mint-price" className={`${monoLabelClass} mb-2 block`}>
                    Listing price (GBP)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-(--ed-muted)">
                      £
                    </span>
                    <input
                      id="mint-price"
                      type="number"
                      min={50}
                      step={10}
                      value={priceGbp}
                      onChange={(e) => setPriceGbp(Math.max(1, Number(e.target.value)))}
                      className={`${inputClass} pl-7 font-mono`}
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-xs text-(--ed-muted)">
                    ≈ ${(priceGbp * 1.28).toFixed(0)} · {(priceGbp / 2600).toFixed(3)} ETH
                  </p>
                </div>

                <div>
                  <label htmlFor="mint-royalty" className={`${monoLabelClass} mb-2 block`}>
                    Resale royalty
                  </label>
                  <div className="relative">
                    <input
                      id="mint-royalty"
                      type="number"
                      min={5}
                      max={20}
                      value={royaltyPercent}
                      onChange={(e) => setRoyaltyPercent(Number(e.target.value))}
                      className={`${inputClass} pr-8 font-mono`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-(--ed-muted)">
                      %
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-(--ed-muted)">
                    Credited automatically on secondary sales.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-(--ed-border) bg-(--ed-bg) p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={hasPhysicalTwin}
                    onChange={(e) => setHasPhysicalTwin(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-(--ed-primary)"
                  />
                  <span>
                    <span className="block text-sm font-medium text-(--ed-text)">
                      Pair with a physical print twin
                    </span>
                    <span className="block text-xs leading-5 text-(--ed-muted)">
                      The collector also receives a museum-grade Hahnemühle print delivered to their
                      door.
                    </span>
                  </span>
                </label>

                {hasPhysicalTwin && (
                  <textarea
                    value={physicalDetails}
                    onChange={(e) => setPhysicalDetails(e.target.value)}
                    rows={2}
                    aria-label="Physical print details"
                    placeholder="Print dimensions, paper type (e.g. 24x36 Photo Rag) and framing details"
                    className="w-full rounded-lg border border-(--ed-border) bg-(--ed-surface) p-2.5 text-sm text-(--ed-text) outline-none transition-colors placeholder:text-(--ed-muted) focus:border-(--ed-primary)"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-(--ed-border) px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className={`${secondaryButtonClass} h-10 px-5 text-sm`}
            >
              Cancel
            </button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleMint(false)}
                disabled={formLocked || minting}
                className={`${secondaryButtonClass} h-10 px-4 text-sm disabled:pointer-events-none disabled:opacity-50`}
              >
                Save draft
              </button>
              <button
                type="button"
                onClick={() => handleMint(true)}
                disabled={formLocked || minting}
                className={`${primaryButtonClass} h-10 px-5 text-sm`}
              >
                {minting ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <FileCheck className="size-4" />
                    Submit for review
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}
