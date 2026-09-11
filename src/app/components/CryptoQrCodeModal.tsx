import React, { useState } from "react";
import { X, Copy, Check, ExternalLink, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { generateQrSvg } from "../../lib/qrcode";
import { getExplorerUrl } from "../../lib/onChainBalance";
import { copyToClipboard } from "../../lib/clipboard";

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

  if (!isOpen || !address) return null;

  const svgContent = generateQrSvg(address, { margin: 3 });
  const explorerUrl = getExplorerUrl(coin, network, address);

  const handleCopy = async () => {
    const ok = await copyToClipboard(address);
    if (ok) {
      setCopied(true);
      toast.success("Deposit address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Failed to copy address to clipboard");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#ececec] text-[#18211f]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-[#758078] hover:text-[#18211f] rounded-full hover:bg-black/5 transition"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1e4a3f]/10 text-[#1e4a3f] text-xs font-semibold">
            <span>{coin}</span>
            <span className="text-[#1e4a3f]/40">•</span>
            <span>{network}</span>
          </div>
          <h3 className="text-lg font-bold tracking-tight text-[#18211f]">
            Deposit Address & QR Code
          </h3>
          <p className="text-xs text-[#758078]">
            Scan with your mobile wallet (Binance, Trust Wallet, MetaMask, Phantom, TronLink)
          </p>
        </div>

        {/* QR Code Container */}
        <div className="flex justify-center my-4">
          <div className="p-3 bg-white border-2 border-[#1e4a3f]/20 rounded-2xl shadow-inner max-w-[240px] w-full aspect-square flex items-center justify-center">
            <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: svgContent }} />
          </div>
        </div>

        {/* Address Box */}
        <div className="space-y-3">
          <div className="p-3 bg-[#FAF9F5] border border-[#dce8df] rounded-xl">
            <p className="text-[10px] uppercase font-semibold text-[#758078] tracking-wider mb-1">
              Deposit Address ({network})
            </p>
            <p className="text-xs font-mono break-all font-semibold text-[#18211f]">{address}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1e4a3f] text-white text-xs font-semibold hover:bg-[#163830] transition shadow-sm cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-300" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copy Address</span>
                </>
              )}
            </button>

            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-[#ececec] text-[#18211f] text-xs font-semibold hover:bg-[#FAF9F5] transition cursor-pointer"
            >
              <ExternalLink className="size-3.5 text-[#758078]" />
              <span>Explorer</span>
            </a>
          </div>

          {/* Caution Advisory */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 text-[11px] leading-relaxed">
            <ShieldAlert className="size-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              Send only <strong>{coin}</strong> ({network}) to this address. Sending any other token
              will result in loss of funds. Deposits credit automatically upon block confirmation.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
