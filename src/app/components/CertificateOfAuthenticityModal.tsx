import { useRef } from "react";
import { X, Printer, ShieldCheck, Copy, Check, QrCode } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { DigitalEdition, EditionOwnership } from "../data/editions";
import { copyToClipboard } from "../../lib/clipboard";

interface CertificateOfAuthenticityModalProps {
  edition: DigitalEdition;
  ownership: EditionOwnership;
  onClose: () => void;
}

export function CertificateOfAuthenticityModal({
  edition,
  ownership,
  onClose,
}: CertificateOfAuthenticityModalProps) {
  const [copied, setCopied] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#FAF9F5] text-[#18211f] rounded-2xl shadow-2xl overflow-hidden border border-[#e5e2da] my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Action Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e2da] bg-white/70 backdrop-blur print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-[#1e4a3f]" />
            <span className="text-xs font-mono tracking-widest uppercase text-[#59645f]">
              Digital Provenance Registry
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyVerification}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1e4a3f] bg-[#1e4a3f]/10 rounded-lg hover:bg-[#1e4a3f]/20 transition"
              title="Copy verification hash"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copied" : "Copy Hash"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1e4a3f] rounded-lg hover:bg-[#163830] transition shadow-sm"
            >
              <Printer className="size-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#59645f] hover:text-[#18211f] hover:bg-gray-100 transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Museum Certificate Document (Print-ready) */}
        <div ref={certRef} className="p-8 sm:p-12 relative bg-[#FAF9F5]">
          {/* Ornate Archival Double Border */}
          <div className="p-6 sm:p-8 border-2 border-[#1e4a3f]/30 rounded-xl relative bg-white/80 shadow-inner">
            {/* Corner Embellishments */}
            <div className="absolute top-2 left-2 size-3 border-t-2 border-l-2 border-[#1e4a3f]" />
            <div className="absolute top-2 right-2 size-3 border-t-2 border-r-2 border-[#1e4a3f]" />
            <div className="absolute bottom-2 left-2 size-3 border-b-2 border-l-2 border-[#1e4a3f]" />
            <div className="absolute bottom-2 right-2 size-3 border-b-2 border-r-2 border-[#1e4a3f]" />

            {/* Gallery Branding */}
            <div className="text-center space-y-2">
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#1e4a3f] font-semibold">
                NS CAPTURES FINE-ART ARCHIVES
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl tracking-tight text-[#18211f]">
                Certificate of Authenticity
              </h2>
              <p className="text-xs text-[#59645f] max-w-md mx-auto italic font-serif">
                This document certifies the authorship, provenance, and numbered scarcity of the
                photographic digital edition specified below.
              </p>
            </div>

            {/* Artwork Overview Card */}
            <div className="mt-8 flex flex-col sm:flex-row gap-6 items-center p-4 bg-[#FAF9F5] rounded-xl border border-[#e5e2da]">
              <img
                src={edition.image}
                alt={edition.title}
                className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-lg shadow-md border border-white"
              />
              <div className="space-y-1.5 text-center sm:text-left min-w-0 flex-1">
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#1e4a3f]/10 text-[#1e4a3f] text-[10px] font-mono font-semibold uppercase tracking-wider">
                  {ownership.serialDisplay}
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#18211f] truncate">
                  {edition.title}
                </h3>
                <p className="text-sm text-[#59645f]">
                  Artist:{" "}
                  <strong className="text-[#18211f] font-medium">{edition.photographerName}</strong>
                </p>
                <p className="text-xs text-[#59645f]">
                  Location & Year: {edition.location || "Global"} • {edition.yearCreated}
                </p>
              </div>
            </div>

            {/* Certificate Details Grid */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#e5e2da]/70">
                <span className="text-[10px] uppercase tracking-wider font-mono text-[#59645f] block">
                  Certificate Serial
                </span>
                <span className="font-mono font-bold text-[#1e4a3f] text-xs">
                  {ownership.certificateNumber}
                </span>
              </div>

              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#e5e2da]/70">
                <span className="text-[10px] uppercase tracking-wider font-mono text-[#59645f] block">
                  Token ID
                </span>
                <span className="font-mono font-semibold text-[#18211f] text-xs">
                  {edition.tokenId}
                </span>
              </div>

              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#e5e2da]/70">
                <span className="text-[10px] uppercase tracking-wider font-mono text-[#59645f] block">
                  Total Edition Run
                </span>
                <span className="font-serif font-semibold text-[#18211f] text-xs">
                  {edition.tier === "genesis_1_of_1"
                    ? "1 of 1 Genesis Master"
                    : `${edition.totalEditions} Editions`}
                </span>
              </div>

              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#e5e2da]/70">
                <span className="text-[10px] uppercase tracking-wider font-mono text-[#59645f] block">
                  Current Owner
                </span>
                <span className="font-medium text-[#18211f] truncate block">
                  {ownership.ownerName}
                </span>
              </div>

              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#e5e2da]/70">
                <span className="text-[10px] uppercase tracking-wider font-mono text-[#59645f] block">
                  Date Certified
                </span>
                <span className="font-mono text-[#18211f]">
                  {new Date(ownership.acquiredAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#e5e2da]/70">
                <span className="text-[10px] uppercase tracking-wider font-mono text-[#59645f] block">
                  Camera System
                </span>
                <span className="text-[#18211f] truncate block">{edition.camera}</span>
              </div>
            </div>

            {/* Cryptographic Master Fingerprint */}
            <div className="mt-4 p-3 bg-[#1e4a3f]/5 rounded-lg border border-[#1e4a3f]/20">
              <span className="text-[9px] uppercase tracking-widest font-mono text-[#1e4a3f] font-semibold block">
                Cryptographic SHA-256 Master Fingerprint
              </span>
              <p className="font-mono text-[10px] text-[#18211f] break-all select-all mt-0.5">
                {edition.masterHash}
              </p>
            </div>

            {/* Signatures & Seal */}
            <div className="mt-8 pt-6 border-t border-[#e5e2da] flex items-center justify-between">
              <div>
                <p className="font-serif italic text-lg text-[#1e4a3f] leading-none">
                  {edition.photographerName}
                </p>
                <div className="h-px w-32 bg-[#1e4a3f]/40 my-1" />
                <p className="text-[9px] font-mono uppercase tracking-wider text-[#59645f]">
                  Photographer / Author
                </p>
              </div>

              {/* Embossed Gallery Seal */}
              <div className="flex items-center gap-2 text-right">
                <div className="size-12 rounded-full border-2 border-dashed border-[#1e4a3f] flex items-center justify-center p-1 bg-[#1e4a3f]/5 text-[#1e4a3f]">
                  <QrCode className="size-8 opacity-70" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[9px] font-mono uppercase font-bold text-[#1e4a3f] tracking-wider">
                    VERIFIED MASTER
                  </p>
                  <p className="text-[8px] text-[#59645f] font-mono">NS CAPTURES REGISTRY</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
