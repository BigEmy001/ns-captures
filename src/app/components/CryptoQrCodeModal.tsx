import React, { useEffect, useState } from "react";
import { X, Copy, Check, ExternalLink, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { generateQrSvg } from "../../lib/qrcode";
import { getExplorerUrl } from "../../lib/onChainBalance";
import { copyToClipboard } from "../../lib/clipboard";
import { useBodyScrollLock } from "./editions/useBodyScrollLock";
import {
  monoLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./editions/editionsFormat";

interface CryptoQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  coin: string;
  network: string;
  address: string;
}

export function CryptoQrCodeModal({
  isOpen,
  onClose,
  coin,
  network,
  address,
}: CryptoQrCodeModalProps) {
  const [copied, setCopied] = useState(false);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !address) return null;

  const svgContent = generateQrSvg(address, { margin: 3 });
  const explorerUrl = getExplorerUrl(coin, network, address);

  const handleCopy = async () => {
    const ok = await copyToClipboard(address);
    if (ok) {
      setCopied(true);
      toast.success("Deposit address copied");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Couldn't copy the address");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Deposit ${coin}`}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-(--ed-border) bg-(--ed-surface) font-sans text-(--ed-text) shadow-(--ed-shadow-lg) sm:max-w-md sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-(--ed-border) px-5 py-4">
          <div className="min-w-0">
            <p className={monoLabelClass}>
              {coin} · {network}
            </p>
            <h3 className="truncate pt-1 text-lg font-medium leading-7 text-(--ed-text)">
              Deposit address
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5">
          <p className="text-sm leading-6 text-(--ed-muted)">
            Scan this with your wallet app, or copy the address below.
          </p>

          {/* The QR plate stays white whatever the theme — codes need a light ground to scan */}
          <div className="flex justify-center">
            <div className="flex aspect-square w-full max-w-[240px] items-center justify-center rounded-xl bg-white p-3">
              <div className="size-full" dangerouslySetInnerHTML={{ __html: svgContent }} />
            </div>
          </div>

          <div className="rounded-xl border border-(--ed-border) bg-(--ed-bg) p-3">
            <p className={monoLabelClass}>Address</p>
            <p className="mt-1 break-all font-mono text-xs text-(--ed-text)">{address}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`${primaryButtonClass} h-10 flex-1 px-4 text-sm`}
            >
              {copied ? (
                <>
                  <Check aria-hidden className="size-4" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy aria-hidden className="size-4" />
                  <span>Copy address</span>
                </>
              )}
            </button>

            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${secondaryButtonClass} h-10 px-4 text-sm`}
            >
              <ExternalLink aria-hidden className="size-4 text-(--ed-muted)" />
              <span>Explorer</span>
            </a>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-(--ed-warning)/30 bg-(--ed-warning)/10 p-3 text-xs leading-6 text-(--ed-text)">
            <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-(--ed-warning)" />
            <span>
              Send only {coin} on {network} to this address. Anything else is lost. Deposits appear
              once the network confirms them.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
