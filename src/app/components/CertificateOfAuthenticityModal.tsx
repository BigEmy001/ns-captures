import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { X, Printer, Copy, Check, QrCode } from "lucide-react";
import { toast } from "sonner";
import type { DigitalEdition, EditionOwnership } from "../data/editions";
import { copyToClipboard } from "../../lib/clipboard";
import { NsCapturesLogoBadge } from "./NsCapturesLogoBadge";
import { Chip } from "./editions/editionsUi";
import {
  fadeUpVariants,
  formatDate,
  monoLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./editions/editionsFormat";
import { useBodyScrollLock } from "./editions/useBodyScrollLock";
import { useEditionsTheme } from "./editions/useEditionsTheme";

interface CertificateOfAuthenticityModalProps {
  edition: DigitalEdition;
  ownership: EditionOwnership;
  onClose: () => void;
}

const detailsStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

export function CertificateOfAuthenticityModal({
  edition,
  ownership,
  onClose,
}: CertificateOfAuthenticityModalProps) {
  const [copied, setCopied] = useState(false);
  const { theme } = useEditionsTheme();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock();

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyVerification = async () => {
    const text = `NS CAPTURES Certificate of Authenticity: ${ownership.certificateNumber}\nEdition: ${edition.title}\nToken ID: ${edition.tokenId}\nOwner: ${ownership.ownerName}\nSHA-256 Fingerprint: ${edition.masterHash}`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      toast.success("Certificate verification data copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const details: { label: string; value: string; mono?: boolean; wide?: boolean }[] = [
    { label: "Certificate serial", value: ownership.certificateNumber, mono: true, wide: true },
    { label: "Token ID", value: edition.tokenId, mono: true, wide: true },
    {
      label: "Edition run",
      value:
        edition.tier === "genesis_1_of_1"
          ? "1 of 1 Genesis master"
          : `${edition.totalEditions} editions`,
    },
    { label: "Current owner", value: ownership.ownerName },
    { label: "Date certified", value: formatDate(ownership.acquiredAt), mono: true },
    { label: "Camera system", value: edition.camera },
  ];

  const cornerClass = "absolute size-3 border-(--ed-muted)/60";

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
          aria-labelledby="coa-title"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", duration: 0.45, bounce: 0 }}
          className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-(--ed-border) bg-(--ed-surface) font-sans text-(--ed-text) shadow-(--ed-shadow-lg) sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl"
        >
          {/* Grab handle (mobile bottom sheet) */}
          <div aria-hidden className="flex shrink-0 justify-center pt-2 sm:hidden print:hidden">
            <span className="h-1 w-10 rounded-full bg-(--ed-muted)/40" />
          </div>

          {/* Header actions (hidden when printing) */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-(--ed-border) px-4 py-3 sm:px-5 print:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              <NsCapturesLogoBadge className="size-8" />
              <span className={`${monoLabelClass} truncate`}>Provenance registry</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleCopyVerification}
                aria-label="Copy verification data"
                className={`${secondaryButtonClass} h-9 px-3 text-sm`}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy hash"}</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                aria-label="Print or save as PDF"
                className={`${primaryButtonClass} h-9 px-3 text-sm`}
              >
                <Printer className="size-4" />
                <span className="hidden sm:inline">Print / save PDF</span>
              </button>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1.5 text-(--ed-muted) transition-colors hover:bg-(--ed-hover) hover:text-(--ed-text)"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Certificate (scrolls inside the sheet when the screen is short) */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
            <div className="ed-print-area relative rounded-lg border border-(--ed-border) bg-(--ed-bg) p-4 sm:p-8">
              <span aria-hidden className={`${cornerClass} left-2 top-2 border-l border-t`} />
              <span aria-hidden className={`${cornerClass} right-2 top-2 border-r border-t`} />
              <span aria-hidden className={`${cornerClass} bottom-2 left-2 border-b border-l`} />
              <span aria-hidden className={`${cornerClass} bottom-2 right-2 border-b border-r`} />

              <div className="text-center">
                <p className={monoLabelClass}>NS CAPTURES fine-art archives</p>
                <h2
                  id="coa-title"
                  className="mt-2 text-balance text-2xl font-medium leading-8 tracking-[0.2px] text-(--ed-text) sm:text-[32px] sm:leading-10"
                >
                  Certificate of Authenticity
                </h2>
                <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-6 text-(--ed-muted)">
                  This document certifies the authorship, provenance, and numbered scarcity of the
                  photographic digital edition specified below.
                </p>
              </div>

              <motion.div
                initial="hidden"
                animate="visible"
                variants={detailsStagger}
                className="mt-5 flex flex-col gap-2 sm:mt-6 sm:gap-3"
              >
                {/* Artwork overview */}
                <motion.div
                  variants={fadeUpVariants}
                  className="flex items-center gap-3 rounded-lg border border-(--ed-border) bg-(--ed-surface) p-2.5 sm:gap-4 sm:p-3"
                >
                  <img
                    src={edition.image}
                    alt={edition.title}
                    className="size-16 shrink-0 rounded object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline) sm:size-24"
                  />
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                    <Chip>{ownership.serialDisplay}</Chip>
                    <h3 className="max-w-full truncate text-sm font-medium text-(--ed-text) sm:text-base">
                      {edition.title}
                    </h3>
                    <p className="max-w-full truncate text-xs text-(--ed-muted) sm:text-sm">
                      By <span className="text-(--ed-text)">{edition.photographerName}</span> ·{" "}
                      {edition.location || "Global"} · {edition.yearCreated}
                    </p>
                  </div>
                </motion.div>

                {/* Certificate details */}
                <motion.dl
                  variants={fadeUpVariants}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3"
                >
                  {details.map((detail) => (
                    <div
                      key={detail.label}
                      className={`min-w-0 rounded-lg border border-(--ed-border) bg-(--ed-surface) p-2.5 sm:p-3 ${detail.wide ? "col-span-2 sm:col-span-1" : ""}`}
                    >
                      <dt className={monoLabelClass}>{detail.label}</dt>
                      <dd
                        className={`mt-1 truncate text-sm text-(--ed-text) sm:mt-1.5 ${detail.mono ? "font-mono sm:text-[13px]" : ""}`}
                        title={detail.value}
                      >
                        {detail.value}
                      </dd>
                    </div>
                  ))}
                </motion.dl>

                {/* Cryptographic master fingerprint */}
                <motion.div
                  variants={fadeUpVariants}
                  className="rounded-lg border border-(--ed-border) bg-(--ed-surface) p-2.5 sm:p-3"
                >
                  <p className={monoLabelClass}>SHA-256 master fingerprint</p>
                  <p className="mt-1 select-all break-all font-mono text-[11px] leading-5 text-(--ed-text) sm:text-xs">
                    {edition.masterHash}
                  </p>
                </motion.div>
              </motion.div>

              {/* Signature & seal */}
              <div className="mt-5 flex items-end justify-between gap-4 border-t border-(--ed-border) pt-4 sm:mt-8 sm:pt-6">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium italic leading-none text-(--ed-text) sm:text-lg">
                    {edition.photographerName}
                  </p>
                  <div className="my-2 h-px w-28 bg-(--ed-muted)/40 sm:w-32" />
                  <p className={monoLabelClass}>Photographer / author</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ type: "spring", duration: 0.7, bounce: 0, delay: 0.35 }}
                    className="flex size-11 items-center justify-center rounded-full border-2 border-dashed border-(--ed-primary)/60 text-(--ed-primary) sm:size-12"
                  >
                    <QrCode className="size-6 sm:size-7" />
                  </motion.div>
                  <div className="hidden min-[420px]:block">
                    <p className="font-mono text-xs uppercase text-(--ed-text)">Verified master</p>
                    <p className={monoLabelClass}>NS CAPTURES registry</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}
