import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  ArrowUpRight,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Flame,
  LogOut,
  Moon,
  Sparkles,
  Sun,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import {
  getPresaleConfig,
  getPublicEditionCollections,
  getPublishedEditions,
  isWeb3Activated,
  type DigitalEdition,
} from "../../data/editions";
import { MaskIcon } from "../MaskIcon";
import { NsCapturesLogoBadge } from "../NsCapturesLogoBadge";
import { SpaceSwitch } from "../SpaceSwitch";
import { ConnectWalletModal } from "../ConnectWalletModal";
import { PresaleBuyModal } from "../PresaleBuyModal";
import { creatorHref, formatEth, shortHex } from "./editionsFormat";
import { useEditionsTheme } from "./useEditionsTheme";
import { useEditionVault } from "./useEditionVault";
import searchIcon from "../../../assets/edition-detail/search.svg";
import accountCircleIcon from "../../../assets/edition-detail/account-circle.svg";
import navDiscoverIcon from "../../../assets/edition-detail/nav-discover.svg";
import navCollectionsIcon from "../../../assets/edition-detail/nav-collections.svg";
import navActivityIcon from "../../../assets/edition-detail/nav-activity.svg";
import navMintIcon from "../../../assets/edition-detail/nav-mint.svg";
import navCertificatesIcon from "../../../assets/edition-detail/nav-certificates.svg";
import navProfileIcon from "../../../assets/edition-detail/nav-profile.svg";
import navSettingsIcon from "../../../assets/edition-detail/nav-settings.svg";
import navHelpIcon from "../../../assets/edition-detail/nav-help.svg";

export type EditionsRailKey = "discover" | "collections" | "activity" | "studio" | "certificates";

const railItemClass = (active: boolean) =>
  `flex size-9 items-center justify-center rounded-full transition-colors ${
    active
      ? "bg-(--ed-divider) text-(--ed-text)"
      : "text-(--ed-muted) hover:bg-(--ed-hover) hover:text-(--ed-text)"
  }`;

function RailItem({
  label,
  icon,
  active = false,
  to,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  to?: string;
  onClick?: () => void;
}) {
  const glyph = <MaskIcon src={icon} className="size-5" />;
  if (to) {
    return (
      <Link
        to={to}
        aria-label={label}
        title={label}
        aria-current={active ? "page" : undefined}
        className={railItemClass(active)}
      >
        {glyph}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={railItemClass(active)}
    >
      {glyph}
    </button>
  );
}

interface EditionsShellProps {
  children: ReactNode;
  activeRail?: EditionsRailKey;
  /** Where the Collections rail item points (defaults to the collections index). */
  collectionHref?: string;
  onActivity?: () => void;
  onCertificates?: () => void;
  walletLabel?: string;
  /** Replaces the default "Connect Wallet" button, e.g. with a wallet menu. */
  headerActions?: ReactNode;
  /** Full-width notice rendered above the rail and top bar. */
  banner?: ReactNode;
}

/**
 * App frame shared by every NFT / digital-editions screen: slim navigation rail,
 * top bar with global editions search, and the wallet / profile controls.
 */
export function EditionsShell({
  children,
  activeRail,
  collectionHref = "/editions/collection",
  onActivity,
  onCertificates,
  walletLabel = "Connect Wallet",
  headerActions,
  banner,
}: EditionsShellProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // Close the account menu on outside click or Escape
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (!accountMenuRef.current?.contains(e.target as Node)) setAccountMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  const accountLinks = user
    ? [
        { label: "Your studio", to: "/editions/studio", icon: Sparkles },
        ...(isWeb3Activated(user.id)
          ? [{ label: "Your public page", to: creatorHref(user.slug || user.id), icon: UserRound }]
          : []),
        { label: "Photography account", to: "/account", icon: Camera },
      ]
    : [];
  const menuItemClass =
    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-(--ed-text) outline-none transition-colors hover:bg-(--ed-hover) focus-visible:bg-(--ed-hover)";
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [editions, setEditions] = useState<DigitalEdition[]>(() => getPublishedEditions());
  const collections = useMemo(() => getPublicEditionCollections(), []);
  const { theme, setTheme } = useEditionsTheme();
  const rootRef = useRef<HTMLDivElement>(null);

  const {
    wallets,
    balances,
    nscBalance,
    primaryEvmAddress,
    walletLabel: vaultWalletLabel,
    refresh: refreshVault,
  } = useEditionVault();
  const [walletFlyoutOpen, setWalletFlyoutOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [presaleModalOpen, setPresaleModalOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const walletFlyoutRef = useRef<HTMLDivElement>(null);
  const presaleConfig = useMemo(() => getPresaleConfig(), []);

  // Close the wallet flyout on outside click or Escape
  useEffect(() => {
    if (!walletFlyoutOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (!walletFlyoutRef.current?.contains(e.target as Node)) setWalletFlyoutOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWalletFlyoutOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [walletFlyoutOpen]);

  const evmWallet = useMemo(
    () =>
      wallets.find((w) => w.coin === "ETH" || w.network === "ERC20" || w.network === "Base") ||
      (primaryEvmAddress ? { coin: "ETH", network: "ERC20", address: primaryEvmAddress } : null),
    [wallets, primaryEvmAddress],
  );

  const tronWallet = useMemo(
    () => wallets.find((w) => w.network.includes("TRC") || w.address.startsWith("T")),
    [wallets],
  );

  const solanaWallet = useMemo(
    () => wallets.find((w) => w.coin === "SOL" || w.network === "Solana"),
    [wallets],
  );

  const btcWallet = useMemo(
    () => wallets.find((w) => w.coin === "BTC" || w.network.includes("Bitcoin")),
    [wallets],
  );

  const hasLinkedWallets = wallets.length > 0 || Boolean(primaryEvmAddress);
  const displayWalletLabel =
    walletLabel !== "Connect Wallet"
      ? walletLabel
      : vaultWalletLabel || (primaryEvmAddress ? shortHex(primaryEvmAddress) : "Connect Wallet");

  const handleCopy = async (addr: string, label: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddress(addr);
      toast.success(`${label} copied`);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const handleWalletButtonClick = () => {
    if (!user) {
      navigate("/signin");
      return;
    }
    if (hasLinkedWallets) {
      setWalletFlyoutOpen((open) => !open);
    } else {
      setConnectModalOpen(true);
    }
  };

  // Cross-fade colours briefly while switching palettes
  const toggleTheme = () => {
    const root = rootRef.current;
    root?.setAttribute("data-ed-theme-switching", "");
    setTheme(theme === "dark" ? "light" : "dark");
    window.setTimeout(() => root?.removeAttribute("data-ed-theme-switching"), 280);
  };

  // '/' focuses search, Escape leaves it
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") searchInputRef.current?.blur();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const results = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { collections: [], editions: [] };
    return {
      collections: collections
        .filter((c) => [c.name, c.photographerName].some((v) => v.toLowerCase().includes(q)))
        .slice(0, 3),
      editions: editions
        .filter((e) =>
          [e.title, e.photographerName, e.collectionName ?? "", e.tokenId, e.camera].some((v) =>
            v.toLowerCase().includes(q),
          ),
        )
        .slice(0, 5),
    };
  }, [collections, editions, searchQuery]);

  const firstResultHref = results.collections[0]
    ? `/editions/collection/${results.collections[0].id}`
    : results.editions[0]
      ? `/editions/${results.editions[0].id}`
      : null;
  const hasResults = results.collections.length + results.editions.length > 0;

  const goTo = (href: string) => {
    setSearchQuery("");
    searchInputRef.current?.blur();
    navigate(href);
  };

  const resultRowClass =
    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-(--ed-hover)";

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={rootRef}
        data-ed-theme={theme}
        className="flex min-h-screen flex-col bg-(--ed-bg) font-sans text-(--ed-text) selection:bg-(--ed-primary) selection:text-[#fff]"
      >
        {banner}
        <div className="flex flex-1">
          {/* ============================================================ */}
          {/* SLIM NAVIGATION RAIL                                         */}
          {/* ============================================================ */}
          <aside className="sticky top-0 hidden h-screen w-[52px] shrink-0 flex-col items-center justify-between border-r border-(--ed-border) bg-(--ed-surface) px-2 py-4 md:flex">
            <nav aria-label="Editions" className="flex flex-col items-center gap-2">
              <Link
                to="/editions"
                aria-label="NS CAPTURES Editions home"
                className="mb-1 rounded-xl"
              >
                <NsCapturesLogoBadge className="size-9" />
              </Link>
              <RailItem
                label="Discover editions"
                icon={navDiscoverIcon}
                to="/editions"
                active={activeRail === "discover"}
              />
              <RailItem
                label="Collections"
                icon={navCollectionsIcon}
                to={collectionHref}
                active={activeRail === "collections"}
              />
              {onActivity && (
                <RailItem
                  label="Activity"
                  icon={navActivityIcon}
                  onClick={onActivity}
                  active={activeRail === "activity"}
                />
              )}
              <RailItem
                label="Create an edition"
                icon={navMintIcon}
                to="/editions/studio?section=create"
              />
              {onCertificates && (
                <RailItem
                  label="Certificates of authenticity"
                  icon={navCertificatesIcon}
                  onClick={onCertificates}
                  active={activeRail === "certificates"}
                />
              )}
              <RailItem
                label="Your studio"
                icon={navProfileIcon}
                to="/editions/studio"
                active={activeRail === "studio"}
              />
            </nav>
            <div className="flex flex-col items-center gap-2">
              <RailItem label="Account settings" icon={navSettingsIcon} to="/account" />
              <RailItem label="Help" icon={navHelpIcon} to="/contact" />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* ============================================================ */}
            {/* TOP BAR: SEARCH + WALLET                                     */}
            {/* ============================================================ */}
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-(--ed-border) bg-(--ed-surface) px-4 sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Link to="/editions" aria-label="NS CAPTURES Editions home" className="md:hidden">
                  <NsCapturesLogoBadge className="size-9" />
                </Link>
                <SpaceSwitch tone="editions" className="hidden sm:inline-flex" />
                <div className="relative w-full max-w-[360px]">
                  <label className="flex h-10 items-center gap-1.5 rounded-md border border-(--ed-divider) bg-(--ed-input) pl-3 pr-2 backdrop-blur-[16px] transition-colors focus-within:border-(--ed-border-strong)">
                    <MaskIcon src={searchIcon} className="size-[18px] text-(--ed-text)" />
                    <span className="sr-only">Search editions and collections</span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        setSearchFocused(true);
                        setEditions(getPublishedEditions());
                      }}
                      onBlur={() => setSearchFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && firstResultHref) goTo(firstResultHref);
                      }}
                      placeholder="Search NS CAPTURES"
                      className="min-w-0 flex-1 bg-transparent text-sm tracking-[-0.15px] text-(--ed-text) outline-none placeholder:text-(--ed-text)"
                    />
                    <kbd className="hidden size-6 shrink-0 items-center justify-center rounded border border-(--ed-divider) font-sans text-sm text-(--ed-text) sm:flex">
                      /
                    </kbd>
                  </label>

                  <AnimatePresence>
                    {searchFocused && searchQuery.trim() && (
                      <motion.div
                        key="search-results"
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                        transition={{ type: "spring", duration: 0.25, bounce: 0 }}
                        style={{ transformOrigin: "top left" }}
                        className="absolute inset-x-0 top-12 z-40 overflow-hidden rounded-lg border border-(--ed-border) bg-(--ed-surface) py-1 shadow-(--ed-shadow)"
                      >
                        {!hasResults && (
                          <p className="px-3 py-2.5 text-sm text-(--ed-muted)">
                            No results for “{searchQuery.trim()}”
                          </p>
                        )}
                        {results.collections.length > 0 && (
                          <>
                            <p className="px-3 pb-1 pt-2 font-mono text-xs uppercase text-(--ed-muted)">
                              Collections
                            </p>
                            {results.collections.map((col) => (
                              <button
                                key={col.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => goTo(`/editions/collection/${col.id}`)}
                                className={resultRowClass}
                              >
                                <img
                                  src={col.avatarImage}
                                  alt=""
                                  className="size-8 shrink-0 rounded-md object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-(--ed-text)">
                                    {col.name}
                                  </span>
                                  <span className="block truncate text-xs text-(--ed-muted)">
                                    {col.photographerName}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </>
                        )}
                        {results.editions.length > 0 && (
                          <>
                            <p className="px-3 pb-1 pt-2 font-mono text-xs uppercase text-(--ed-muted)">
                              Editions
                            </p>
                            {results.editions.map((result) => (
                              <button
                                key={result.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => goTo(`/editions/${result.id}`)}
                                className={resultRowClass}
                              >
                                <img
                                  src={result.image}
                                  alt=""
                                  className="size-8 shrink-0 rounded object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-(--ed-text)">
                                    {result.title}
                                  </span>
                                  <span className="block truncate text-xs text-(--ed-muted)">
                                    {result.collectionName ?? result.photographerName}
                                  </span>
                                </span>
                                <span className="shrink-0 font-mono text-xs text-(--ed-text)">
                                  {formatEth(result.priceEth)}
                                </span>
                              </button>
                            ))}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {presaleConfig.status === "active" && (
                  <button
                    type="button"
                    onClick={() => setPresaleModalOpen(true)}
                    className="hidden md:flex items-center gap-1.5 h-10 px-3.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-semibold tracking-[-0.1px] transition-colors cursor-pointer"
                    title="Participate in NSC Token Presale"
                  >
                    <Flame className="size-3.5 fill-amber-500 animate-pulse" />
                    <span>NSC Presale 1:1</span>
                  </button>
                )}
                {headerActions ?? (
                  <div ref={walletFlyoutRef} className="relative">
                    <button
                      type="button"
                      onClick={handleWalletButtonClick}
                      aria-expanded={walletFlyoutOpen}
                      aria-haspopup="dialog"
                      className={`hidden h-10 items-center gap-2 rounded-full px-4 text-sm font-medium tracking-[-0.15px] transition-colors sm:flex border cursor-pointer ${
                        hasLinkedWallets
                          ? "border-(--ed-border) bg-(--ed-surface) text-(--ed-text) hover:bg-(--ed-hover)"
                          : "border-(--ed-primary)/30 bg-(--ed-primary)/10 text-(--ed-primary) hover:bg-(--ed-primary)/20"
                      }`}
                    >
                      {hasLinkedWallets ? (
                        <>
                          <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span className="font-mono text-xs font-semibold text-amber-400">
                            {nscBalance > 0 ? `${nscBalance.toFixed(0)} NSC` : "0 NSC"}
                          </span>
                          <span className="text-(--ed-border-strong)">·</span>
                          <span className="font-mono text-xs">{displayWalletLabel}</span>
                          <ChevronDown
                            className={`size-3.5 text-(--ed-muted) transition-transform duration-200 ${
                              walletFlyoutOpen ? "rotate-180" : ""
                            }`}
                          />
                        </>
                      ) : (
                        <>
                          <Wallet className="size-4" />
                          <span>Connect Wallet</span>
                        </>
                      )}
                    </button>

                    <AnimatePresence>
                      {walletFlyoutOpen && hasLinkedWallets && (
                        <motion.div
                          key="wallet-flyout"
                          initial={{ opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                          transition={{ type: "spring", duration: 0.25, bounce: 0 }}
                          style={{ transformOrigin: "top right" }}
                          className="absolute right-0 top-12 z-50 w-80 sm:w-88 rounded-2xl border border-(--ed-border) bg-(--ed-surface) p-4 shadow-(--ed-shadow-lg) text-(--ed-text)"
                        >
                          {/* Header Address Card */}
                          <div className="flex items-center justify-between pb-3 border-b border-(--ed-divider)">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="size-9 rounded-full bg-gradient-to-br from-[#EC4899] via-[#8B5CF6] to-[#3B82F6] flex items-center justify-center text-xs font-bold text-white shadow-inner shrink-0">
                                {user?.name ? user.name.slice(0, 2).toUpperCase() : "0x"}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
                                  <span className="truncate">
                                    {shortHex(primaryEvmAddress || wallets[0]?.address || "")}
                                  </span>
                                  {(primaryEvmAddress || wallets[0]?.address) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopy(
                                          primaryEvmAddress || wallets[0]?.address || "",
                                          "Primary Address",
                                        )
                                      }
                                      className="text-(--ed-muted) hover:text-(--ed-text) transition-colors p-0.5 cursor-pointer"
                                      title="Copy Address"
                                    >
                                      {copiedAddress ===
                                      (primaryEvmAddress || wallets[0]?.address) ? (
                                        <Check className="size-3.5 text-emerald-500" />
                                      ) : (
                                        <Copy className="size-3.5" />
                                      )}
                                    </button>
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-(--ed-muted) block truncate">
                                  {nscBalance.toFixed(0)} NSC • {wallets.length} Wallets Linked • $
                                  {balances?.totalUsd ? balances.totalUsd.toFixed(2) : "0.00"}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setWalletFlyoutOpen(false);
                                navigate("/account?tab=vault");
                              }}
                              className="text-(--ed-muted) hover:text-(--ed-text) p-1 transition-colors cursor-pointer"
                              title="Manage Vault"
                            >
                              <ChevronRight className="size-4" />
                            </button>
                          </div>

                          {/* Sub-Wallets List */}
                          <div className="space-y-2 py-3">
                            {/* NSC Native Platform Coin Card */}
                            <div className="p-2.5 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent hover:from-amber-500/20 rounded-xl border border-amber-500/30 transition-colors flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="size-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs text-amber-400 font-mono font-bold shrink-0">
                                  🪙
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold block">NSC Coin</span>
                                    <span className="rounded bg-amber-500/20 px-1 py-0.2 font-mono text-[9px] font-semibold text-amber-400">
                                      Native Fuel
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-(--ed-muted) block">
                                    Universal Platform Currency
                                  </span>
                                </div>
                              </div>
                              <div className="text-right font-mono shrink-0 pl-2">
                                <span className="text-xs font-bold block text-amber-400">
                                  {nscBalance.toFixed(2)} NSC
                                </span>
                                <span className="text-[10px] text-(--ed-muted) block">
                                  ≈ £{nscBalance.toFixed(2)} GBP
                                </span>
                              </div>
                            </div>

                            {/* EVM Wallet Card */}
                            {evmWallet && (
                              <div className="p-2.5 bg-(--ed-bg) hover:bg-(--ed-hover) rounded-xl border border-(--ed-border) transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="size-7 rounded-lg bg-[#2081E2]/20 border border-[#2081E2]/40 flex items-center justify-center text-xs text-[#2081E2] font-mono font-bold shrink-0">
                                    ⟠
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-semibold block">EVM Wallet</span>
                                    <span className="text-[10px] font-mono text-(--ed-muted) block truncate">
                                      {shortHex(evmWallet.address)}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right font-mono shrink-0 pl-2">
                                  <span className="text-xs font-semibold block">
                                    {balances?.assets.find((a) => a.coin === "ETH")
                                      ?.balanceFormatted || "0.00"}{" "}
                                    ETH
                                  </span>
                                  <span className="text-[10px] text-emerald-500 block">
                                    ● Connected
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* TRON Wallet Card */}
                            {tronWallet && (
                              <div className="p-2.5 bg-(--ed-bg) hover:bg-(--ed-hover) rounded-xl border border-(--ed-border) transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="size-7 rounded-lg bg-[#EF0027]/20 border border-[#EF0027]/40 flex items-center justify-center text-xs text-[#EF0027] font-mono font-bold shrink-0">
                                    ⚡
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-semibold block">TRON Wallet</span>
                                    <span className="text-[10px] font-mono text-(--ed-muted) block truncate">
                                      {tronWallet.address.slice(0, 4)}...
                                      {tronWallet.address.slice(-4)}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right font-mono shrink-0 pl-2">
                                  <span className="text-xs font-semibold block">
                                    {balances?.assets.find(
                                      (a) => a.coin === "USDT" && a.network.includes("TRC"),
                                    )?.balanceFormatted ||
                                      balances?.assets.find((a) => a.coin === "USDT")
                                        ?.balanceFormatted ||
                                      "0.00"}{" "}
                                    USDT
                                  </span>
                                  <span className="text-[10px] text-emerald-500 block">
                                    ● Connected
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Solana Wallet Card */}
                            {solanaWallet && (
                              <div className="p-2.5 bg-(--ed-bg) hover:bg-(--ed-hover) rounded-xl border border-(--ed-border) transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="size-7 rounded-lg bg-[#9945FF]/20 border border-[#9945FF]/40 flex items-center justify-center text-xs text-[#14F195] font-mono font-bold shrink-0">
                                    ◎
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-semibold block">
                                      Solana Wallet
                                    </span>
                                    <span className="text-[10px] font-mono text-(--ed-muted) block truncate">
                                      {solanaWallet.address.slice(0, 4)}...
                                      {solanaWallet.address.slice(-4)}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right font-mono shrink-0 pl-2">
                                  <span className="text-xs font-semibold block">
                                    {balances?.assets.find((a) => a.coin === "SOL")
                                      ?.balanceFormatted || "0.00"}{" "}
                                    SOL
                                  </span>
                                  <span className="text-[10px] text-emerald-500 block">
                                    ● Connected
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Bitcoin Wallet Card */}
                            {btcWallet && (
                              <div className="p-2.5 bg-(--ed-bg) hover:bg-(--ed-hover) rounded-xl border border-(--ed-border) transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="size-7 rounded-lg bg-[#F7931A]/20 border border-[#F7931A]/40 flex items-center justify-center text-xs text-[#F7931A] font-mono font-bold shrink-0">
                                    ₿
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-semibold block">
                                      Bitcoin Wallet
                                    </span>
                                    <span className="text-[10px] font-mono text-(--ed-muted) block truncate">
                                      {btcWallet.address.slice(0, 6)}...
                                      {btcWallet.address.slice(-4)}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right font-mono shrink-0 pl-2">
                                  <span className="text-xs font-semibold block">
                                    {balances?.assets.find((a) => a.coin === "BTC")
                                      ?.balanceFormatted || "0.00"}{" "}
                                    BTC
                                  </span>
                                  <span className="text-[10px] text-emerald-500 block">
                                    ● SegWit
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Presale Spotlight Card */}
                          {presaleConfig.status === "active" && (
                            <div className="mb-2.5 p-3 rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-500">
                                  <Flame className="size-3.5 fill-amber-500 animate-pulse" />
                                  NSC Presale Live
                                </span>
                                <span className="text-[10px] font-mono text-(--ed-muted)">
                                  1:1 Peg
                                </span>
                              </div>
                              <p className="text-[11px] text-(--ed-muted) leading-tight">
                                Early-bird token allocation at $1.00 USD. Zero gas on internal
                                ledger.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setWalletFlyoutOpen(false);
                                  setPresaleModalOpen(true);
                                }}
                                className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <Sparkles className="size-3.5" />
                                <span>Swap for NSC Tokens</span>
                              </button>
                            </div>
                          )}

                          {/* Action Links */}
                          <div className="space-y-1 pt-2.5 border-t border-(--ed-divider) text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setWalletFlyoutOpen(false);
                                setConnectModalOpen(true);
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-(--ed-text) hover:bg-(--ed-hover) transition-colors text-left cursor-pointer"
                            >
                              <span>Link Wallet / Deposit Crypto</span>
                              <ArrowUpRight className="size-3.5 text-(--ed-muted)" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setWalletFlyoutOpen(false);
                                navigate("/account?tab=vault");
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-(--ed-text) hover:bg-(--ed-hover) transition-colors text-left cursor-pointer"
                            >
                              <span>Manage Wallets & Settlement Vault</span>
                              <ArrowUpRight className="size-3.5 text-(--ed-muted)" />
                            </button>
                            {user && (
                              <button
                                type="button"
                                onClick={() => {
                                  setWalletFlyoutOpen(false);
                                  navigate(creatorHref(user.slug || user.id));
                                }}
                                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-(--ed-text) hover:bg-(--ed-hover) transition-colors text-left cursor-pointer"
                              >
                                <span>Profile & Provenance Portfolio</span>
                                <ArrowUpRight className="size-3.5 text-(--ed-muted)" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  title={theme === "dark" ? "Light mode" : "Dark mode"}
                  className="flex size-10 items-center justify-center rounded-full text-(--ed-text) transition-colors hover:bg-(--ed-hover)"
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={theme}
                      initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                      className="flex"
                    >
                      {theme === "dark" ? (
                        <Sun className="size-5" strokeWidth={1.75} />
                      ) : (
                        <Moon className="size-5" strokeWidth={1.75} />
                      )}
                    </motion.span>
                  </AnimatePresence>
                </button>
                <span className="hidden h-6 w-px bg-(--ed-divider) sm:block" />
                {user ? (
                  <div ref={accountMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setAccountMenuOpen((open) => !open)}
                      aria-label="Account menu"
                      aria-haspopup="menu"
                      aria-expanded={accountMenuOpen}
                      title="Account"
                      className="flex size-10 items-center justify-center rounded-full text-(--ed-text) transition-colors hover:bg-(--ed-hover)"
                    >
                      <MaskIcon src={accountCircleIcon} className="size-5" />
                    </button>
                    <AnimatePresence>
                      {accountMenuOpen && (
                        <motion.div
                          key="account-menu"
                          role="menu"
                          aria-label="Account"
                          initial={{ opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                          transition={{ type: "spring", duration: 0.25, bounce: 0 }}
                          style={{ transformOrigin: "top right" }}
                          className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-lg border border-(--ed-border) bg-(--ed-surface) p-1 shadow-(--ed-shadow)"
                        >
                          <div className="px-3 py-2">
                            <p className="truncate text-sm font-medium text-(--ed-text)">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-(--ed-muted)">{user.email}</p>
                          </div>
                          <div className="my-1 h-px bg-(--ed-divider)" />
                          {accountLinks.map(({ label, to, icon: Icon }) => (
                            <Link
                              key={to}
                              to={to}
                              role="menuitem"
                              onClick={() => setAccountMenuOpen(false)}
                              className={menuItemClass}
                            >
                              <Icon aria-hidden className="size-4 text-(--ed-muted)" />
                              {label}
                            </Link>
                          ))}
                          <div className="my-1 h-px bg-(--ed-divider)" />
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              logout();
                            }}
                            className={menuItemClass}
                          >
                            <LogOut aria-hidden className="size-4 text-(--ed-muted)" />
                            Sign out
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    to="/signin"
                    aria-label="Sign in"
                    title="Sign in"
                    className="flex size-10 items-center justify-center rounded-full text-(--ed-text) transition-colors hover:bg-(--ed-hover)"
                  >
                    <MaskIcon src={accountCircleIcon} className="size-5" />
                  </Link>
                )}
              </div>
            </header>

            {/* On phones the switch gets its own row right under the header */}
            <div className="border-b border-(--ed-border) bg-(--ed-surface) px-4 py-2 sm:hidden">
              <SpaceSwitch tone="editions" size="sm" fullWidth />
            </div>

            {children}
          </div>
        </div>
      </div>

      <ConnectWalletModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        photographerId={user?.slug || user?.id || ""}
        onWalletConnected={() => {
          refreshVault();
          toast.success("Wallet synchronized successfully");
          setConnectModalOpen(false);
        }}
      />

      <PresaleBuyModal
        isOpen={presaleModalOpen}
        onClose={() => setPresaleModalOpen(false)}
        onSuccess={() => {
          refreshVault();
        }}
      />
    </MotionConfig>
  );
}
