import { useEffect, useId, type ReactNode } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { DigitalEdition, EditionActivity } from "../../data/editions";
import { MaskIcon } from "../MaskIcon";
import {
  ACTIVITY_LABELS,
  formatDate,
  formatEth,
  formatGbp,
  iconButtonClass,
  monoLabelClass,
  primaryButtonClass,
  shortHex,
  tableHeadClass,
  tierLabel,
} from "./editionsFormat";
import { useBodyScrollLock } from "./useBodyScrollLock";
import "./editions.css";
import verifiedIcon from "../../../assets/edition-detail/verified.svg";
import chevronLeftIcon from "../../../assets/edition-detail/chevron-left.svg";
import certificatesIcon from "../../../assets/edition-detail/nav-certificates.svg";

const indicatorSpring = { type: "spring", duration: 0.3, bounce: 0 } as const;

export function VerifiedBadge({ className = "size-3.5 shrink-0" }: { className?: string }) {
  return <img src={verifiedIcon} alt="Verified" className={className} />;
}

export function Sparkline({
  data,
  className = "h-8 w-24",
}: {
  data: number[];
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
  const rising = data[data.length - 1] >= data[0];

  return (
    <svg
      aria-hidden
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        style={{ stroke: rising ? "var(--ed-positive)" : "var(--ed-negative)" }}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        points={points}
      />
    </svg>
  );
}

export function FilterGroup({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-(--ed-border) py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-1 text-left text-sm font-medium text-(--ed-text)"
      >
        {title}
        <MaskIcon
          src={chevronLeftIcon}
          className={`size-4 transition-transform ${open ? "rotate-90 text-(--ed-text)" : "-rotate-90 text-(--ed-muted)"}`}
        />
      </button>
      {open && <div className="pt-3">{children}</div>}
    </div>
  );
}

export function Chip({ children, icon }: { children: ReactNode; icon?: string }) {
  return (
    <span className="inline-flex h-[18px] shrink-0 items-center gap-1 rounded border border-(--ed-border) bg-(--ed-surface) px-1.5 font-mono text-xs uppercase leading-[18px] text-(--ed-text)">
      {icon && <MaskIcon src={icon} className="size-2.5" />}
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  muted = false,
  alignEnd = false,
}: {
  label: string;
  value: ReactNode;
  muted?: boolean;
  alignEnd?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${alignEnd ? "sm:items-end sm:text-right" : ""}`}>
      <dt className={monoLabelClass}>{label}</dt>
      <dd
        className={`truncate font-mono text-sm font-medium leading-[21px] ${muted ? "text-(--ed-muted)" : "text-(--ed-text)"}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  label,
  trailing,
}: {
  tabs: readonly { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: NoInfer<T>) => void;
  label: string;
  trailing?: ReactNode;
}) {
  const indicatorId = useId();

  return (
    <div className="flex items-center justify-between gap-4 border-b border-(--ed-border)">
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-6 overflow-x-auto [scrollbar-width:none]"
      >
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={`relative flex shrink-0 items-center gap-2 py-3 text-sm leading-[21px] tracking-[-0.15px] transition-colors ${
                selected
                  ? "font-medium text-(--ed-text)"
                  : "text-(--ed-muted) hover:text-(--ed-text)"
              }`}
            >
              {tab.label}
              {tab.count != null && (
                <span className="rounded bg-(--ed-raised) px-1.5 font-mono text-xs leading-[18px] text-(--ed-muted)">
                  {tab.count}
                </span>
              )}
              {selected && (
                <motion.span
                  layoutId={`tab-indicator-${indicatorId}`}
                  transition={indicatorSpring}
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-(--ed-text)"
                />
              )}
            </button>
          );
        })}
      </div>
      {trailing && <div className="hidden shrink-0 items-center gap-2 md:flex">{trailing}</div>}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  fullWidth = false,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: NoInfer<T>) => void;
  label: string;
  fullWidth?: boolean;
}) {
  const pillId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`items-center rounded-full border border-(--ed-border) bg-(--ed-surface) p-0.5 ${fullWidth ? "flex w-full" : "inline-flex"}`}
    >
      {options.map((option) => {
        const checked = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.id)}
            className={`relative h-8 whitespace-nowrap rounded-full font-mono text-xs transition-colors ${fullWidth ? "flex-1 px-2" : "px-3"} ${
              checked ? "text-(--ed-text)" : "text-(--ed-muted) hover:text-(--ed-text)"
            }`}
          >
            {checked && (
              <motion.span
                layoutId={`segment-${pillId}`}
                transition={indicatorSpring}
                className="absolute inset-0 rounded-full bg-(--ed-selected)"
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function DetailSection({
  icon,
  iconClassName = "text-(--ed-muted)",
  title,
  open,
  onToggle,
  children,
}: {
  icon: string;
  iconClassName?: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-(--ed-border) bg-(--ed-surface) transition-colors hover:border-(--ed-border-strong)">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-lg p-4 text-left text-base"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg border border-(--ed-border) bg-(--ed-surface) p-1">
            <span className="flex size-6 items-center justify-center rounded border border-(--ed-border) bg-(--ed-raised)">
              <MaskIcon src={icon} className={`size-4 ${iconClassName}`} />
            </span>
          </span>
          <span className="text-base font-medium leading-6 tracking-[-0.31px] text-(--ed-text)">
            {title}
          </span>
        </span>
        <MaskIcon
          src={chevronLeftIcon}
          className={`size-5 transition-transform duration-300 ${open ? "rotate-90 text-(--ed-text)" : "-rotate-90 text-(--ed-muted)"}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-(--ed-border) bg-(--ed-surface) px-6 py-10 text-center">
      <p className="text-sm font-medium text-(--ed-text)">{title}</p>
      {description && (
        <p className="mx-auto max-w-sm pt-1 text-sm text-(--ed-muted)">{description}</p>
      )}
      {action && <div className="pt-4">{action}</div>}
    </div>
  );
}

export function EditionsModal({
  title,
  eyebrow,
  onClose,
  children,
  footer,
  size = "md",
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  useBodyScrollLock();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0 }}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-(--ed-border) bg-(--ed-surface) font-sans text-(--ed-text) shadow-(--ed-shadow-lg) sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl ${size === "lg" ? "sm:max-w-2xl" : "sm:max-w-md"}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-(--ed-border) px-5 py-4">
          <div className="min-w-0">
            {eyebrow && <p className={monoLabelClass}>{eyebrow}</p>}
            <h3 className="truncate pt-1 text-lg font-medium leading-7 text-(--ed-text)">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 rounded-full p-1.5 text-(--ed-muted) transition-colors hover:bg-(--ed-hover) hover:text-(--ed-text)"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-(--ed-border) px-5 py-4">
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function EditionCard({
  edition,
  currency = "eth",
  onBuy,
  onInspectCertificate,
}: {
  edition: DigitalEdition;
  currency?: "eth" | "gbp";
  onBuy?: (edition: DigitalEdition) => void;
  onInspectCertificate?: (edition: DigitalEdition) => void;
}) {
  const soldOut = edition.availableEditions <= 0;
  const paused = !soldOut && !!edition.salesPaused;

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-(--ed-border) bg-(--ed-surface) transition-[border-color,translate,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-(--ed-border-strong) hover:shadow-(--ed-shadow) motion-reduce:hover:translate-y-0">
      <Link
        to={`/editions/${edition.id}`}
        tabIndex={-1}
        aria-hidden
        className="relative block aspect-square overflow-hidden bg-(--ed-bg)"
      >
        <img
          src={edition.image}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        <span className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <Chip>{tierLabel(edition)}</Chip>
          {edition.hasPhysicalTwin && edition.tier !== "physical_twin" && <Chip>+ Print twin</Chip>}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1 text-xs text-(--ed-muted)">
            <span className="truncate">{edition.collectionName ?? edition.photographerName}</span>
            <VerifiedBadge className="size-3 shrink-0" />
          </p>
          <h3 className="mt-0.5 truncate text-sm font-medium tracking-[-0.15px] text-(--ed-text)">
            <Link
              to={`/editions/${edition.id}`}
              className="transition-colors hover:text-(--ed-text-soft)"
            >
              {edition.title}
            </Link>
          </h3>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className={monoLabelClass}>Price</p>
            <p className="truncate pt-1 font-mono text-sm font-medium text-(--ed-text)">
              {currency === "eth" ? formatEth(edition.priceEth) : formatGbp(edition.priceGbp)}
            </p>
          </div>
          <p className="shrink-0 font-mono text-xs text-(--ed-muted)">
            {soldOut
              ? "Sold out"
              : paused
                ? "Sales paused"
                : `${edition.availableEditions}/${edition.totalEditions} left`}
          </p>
        </div>

        {(onBuy || onInspectCertificate) && (
          <div className="mt-auto flex items-center gap-2">
            {onBuy && (
              <button
                type="button"
                onClick={() => onBuy(edition)}
                disabled={soldOut || paused}
                className={`${primaryButtonClass} h-9 flex-1 text-sm`}
              >
                {soldOut ? "Sold out" : paused ? "Not for sale" : "Buy now"}
              </button>
            )}
            {onInspectCertificate && (
              <button
                type="button"
                onClick={() => onInspectCertificate(edition)}
                aria-label={`View certificate for ${edition.title}`}
                title="View certificate"
                className={iconButtonClass}
              >
                <MaskIcon src={certificatesIcon} className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function ActivityTable({
  activities,
  editions,
  emptyDescription = "Mints, sales and royalty payouts will appear here.",
}: {
  activities: EditionActivity[];
  editions?: DigitalEdition[];
  emptyDescription?: string;
}) {
  if (activities.length === 0) {
    return <EmptyState title="No activity yet" description={emptyDescription} />;
  }

  const editionsById = editions ? new Map(editions.map((e) => [e.id, e])) : null;

  return (
    <div className="overflow-x-auto rounded-lg border border-(--ed-border) bg-(--ed-surface)">
      <table className="w-full text-left text-sm">
        <thead className={tableHeadClass}>
          <tr>
            <th className="px-4 py-3 font-normal">Event</th>
            {editionsById && <th className="px-4 py-3 font-normal">Item</th>}
            <th className="px-4 py-3 font-normal">Price</th>
            <th className="px-4 py-3 font-normal">From</th>
            <th className="px-4 py-3 font-normal">To</th>
            <th className="px-4 py-3 font-normal">Date</th>
            <th className="px-4 py-3 text-right font-normal">Tx</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((act) => {
            const item = editionsById?.get(act.editionId);
            return (
              <tr
                key={act.id}
                className="border-t border-(--ed-border) transition-colors hover:bg-(--ed-hover)"
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium text-(--ed-text)">
                  {ACTIVITY_LABELS[act.type]}
                </td>
                {editionsById && (
                  <td className="px-4 py-3">
                    {item ? (
                      <Link
                        to={`/editions/${item.id}`}
                        className="flex min-w-0 items-center gap-2 text-(--ed-text) transition-colors hover:text-(--ed-text-soft)"
                      >
                        <img
                          src={item.image}
                          alt=""
                          className="size-8 shrink-0 rounded object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
                        />
                        <span className="max-w-[220px] truncate">{item.title}</span>
                      </Link>
                    ) : (
                      <span className="text-(--ed-muted)">—</span>
                    )}
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3 font-mono text-(--ed-text)">
                  {act.price != null ? formatGbp(act.price) : "—"}
                </td>
                <td className="max-w-[140px] truncate px-4 py-3 text-(--ed-muted)">
                  {act.fromUser || "—"}
                </td>
                <td className="max-w-[140px] truncate px-4 py-3 text-(--ed-text)">
                  {act.toUser || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-(--ed-muted)">
                  {formatDate(act.timestamp)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-(--ed-muted)">
                  {act.txHash ? shortHex(act.txHash) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
