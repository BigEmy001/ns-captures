import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Camera, LogOut, Moon, Sparkles, Sun, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getPublicEditionCollections,
  getPublishedEditions,
  isWeb3Activated,
  type DigitalEdition,
} from "../../data/editions";
import { MaskIcon } from "../MaskIcon";
import { NsCapturesLogoBadge } from "../NsCapturesLogoBadge";
import { creatorHref, formatEth } from "./editionsFormat";
import { useEditionsTheme } from "./useEditionsTheme";
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

              <div className="flex shrink-0 items-center gap-1">
                {headerActions ?? (
                  <button
                    type="button"
                    onClick={() => navigate(user ? "/account?tab=vault" : "/signin")}
                    className="hidden h-10 items-center rounded-full px-4 text-sm font-medium tracking-[-0.15px] text-(--ed-text) transition-colors hover:bg-(--ed-hover) sm:flex"
                  >
                    {walletLabel}
                  </button>
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

            {children}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
