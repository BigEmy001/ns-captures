import { useEffect, useMemo, useState } from "react";
import { X, Check, Upload, ChevronDown, Copy, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAdminPaymentMethods,
  fetchSiteSettings,
  submitConversionFeePayment,
  type AdminPaymentMethod,
  type PayoutRequest,
  type SiteSettingsRow,
} from "../../data/db";

/** Field keys that describe the method rather than say where to send money. */
const LABEL_KEYS = new Set(["currency", "enabled", "network", "coin"]);

/** Where the money actually goes, by method type, in order of preference. */
const ADDRESS_KEYS: Record<string, string[]> = {
  crypto: ["address", "wallet", "walletAddress", "value"],
  paypal: ["email", "value"],
  bank: ["iban", "accountNumber", "account", "value"],
};

const GROUP_ORDER = ["crypto", "bank", "paypal"] as const;

const GROUP_LABEL: Record<string, string> = {
  crypto: "Crypto wallets",
  bank: "Bank transfer",
  paypal: "PayPal",
};

function prettyKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/** The one line that matters for this method — the address to send to. */
function addressOf(method: AdminPaymentMethod): string {
  const details = method.details || {};
  for (const key of ADDRESS_KEYS[method.methodType] || ["value"]) {
    const value = details[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const first = Object.entries(details).find(
    ([k, v]) => typeof v === "string" && v.trim() && !LABEL_KEYS.has(k),
  );
  return first ? String(first[1]).trim() : "";
}

/** Everything worth showing beyond the address itself. */
function extraDetails(method: AdminPaymentMethod, address: string): [string, string][] {
  return Object.entries(method.details || {})
    .filter(
      ([k, v]) =>
        typeof v === "string" && v.trim() && !LABEL_KEYS.has(k) && String(v).trim() !== address,
    )
    .map(([k, v]) => [k, String(v).trim()] as [string, string]);
}

/**
 * Two rows naming the same wallet at the same address are one wallet, however
 * many times they were saved. Showing them all would make the list look busy
 * without offering a real choice.
 */
function dedupe(methods: AdminPaymentMethod[]): AdminPaymentMethod[] {
  const seen = new Set<string>();
  return methods.filter((m) => {
    const key = `${m.methodType}|${m.name.trim().toLowerCase()}|${addressOf(m)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function CopyValue({ value, mono = true }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy — select the text instead");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy"
      className="group flex w-full items-start gap-2 rounded-lg bg-[#FAF9F5] px-2.5 py-2 text-left transition hover:bg-[#f2f0e8]"
    >
      <span
        className={`min-w-0 flex-1 break-all text-[#18211f] ${mono ? "font-mono text-xs" : "text-sm"}`}
      >
        {value}
      </span>
      {copied ? (
        <Check className="mt-0.5 size-3.5 shrink-0 text-[#285746]" />
      ) : (
        <Copy className="mt-0.5 size-3.5 shrink-0 text-[#a2a89f] group-hover:text-[#1e4a3f]" />
      )}
    </button>
  );
}

/**
 * Paying an outstanding conversion charge. The methods are grouped by how the
 * money travels and collapsed by default, so the choice is between three or
 * four kinds of transfer rather than a list of every account on file. Anyone
 * none of them suits can reach the payment desk instead.
 */
export function SettleChargeModal({
  request,
  contributorName,
  onClose,
  onSubmitted,
}: {
  request: PayoutRequest;
  contributorName: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [methods, setMethods] = useState<AdminPaymentMethod[]>([]);
  const [settings, setSettings] = useState<SiteSettingsRow | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAdminPaymentMethods()
      .then((all) => setMethods(all.filter((m) => m.enabled)))
      .catch(() => setMethods([]));
    fetchSiteSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // A method with nowhere to send money is not a way to pay. Keeping it in the
  // list would give someone an option that dead-ends when they open it.
  const groups = useMemo(() => {
    const usable = dedupe(methods).filter((m) => addressOf(m));
    const byType = new Map<string, AdminPaymentMethod[]>();
    for (const m of usable) {
      const list = byType.get(m.methodType) || [];
      list.push(m);
      byType.set(m.methodType, list);
    }
    const ordered = [
      ...GROUP_ORDER,
      ...[...byType.keys()].filter((t) => !GROUP_ORDER.includes(t as any)),
    ];
    return ordered
      .filter((type) => (byType.get(type) || []).length > 0)
      .map((type) => ({
        type,
        label: GROUP_LABEL[type] || prettyKey(type),
        items: byType.get(type)!,
      }));
  }, [methods]);

  const owed = (request.conversionFeeGbp || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const deskEmail = settings?.paymentDeskEmail || settings?.supportEmail || "";
  const deskWhatsapp = settings?.paymentDeskWhatsapp || settings?.contactLink || "";
  const whatsappHref = deskWhatsapp.startsWith("http")
    ? deskWhatsapp
    : `https://wa.me/${deskWhatsapp.replace(/[^0-9]/g, "")}`;
  const deskSubject = encodeURIComponent(`Conversion charge £${owed} — ${contributorName}`);

  const submit = async () => {
    if (!selectedId) {
      toast.error("Choose how you paid");
      return;
    }
    if (!receipt) {
      toast.error("Upload your proof of transfer");
      return;
    }

    setIsSubmitting(true);
    try {
      const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
      const preset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

      const fd = new FormData();
      fd.append("file", receipt);
      fd.append("upload_preset", preset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Could not upload your receipt");
      const json = await res.json();

      const method = methods.find((m) => m.id === selectedId);
      const ok = await submitConversionFeePayment(
        request.id,
        json.secure_url,
        method?.name || "Payment method",
      );
      if (!ok) throw new Error("Could not record your payment");

      toast.success("Payment submitted", {
        description: "NS CAPTURES will confirm receipt and release your payout.",
      });
      onSubmitted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Could not submit your payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settle-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#ececec] px-6 py-5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.14em] text-[#758078] uppercase">
              Conversion charge
            </p>
            <h2 id="settle-title" className="mt-1 font-serif text-xl text-[#18211f]">
              Settle £{owed}
            </h2>
            <p className="mt-0.5 text-sm text-[#6b716d]">
              On your {request.payoutCurrency || "currency"} payout of £
              {request.amount.toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-[#758078] transition hover:bg-[#f2f2f2] hover:text-[#18211f]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="rounded-xl bg-[#f6ecd8] p-3 text-xs text-[#7a5a17]">
            This charge is separate from your payout — you still receive the full converted amount.
            Your payout continues once we have confirmed the charge.
          </p>

          <div>
            <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
              Choose how to pay
            </p>

            <div className="mt-2.5 divide-y divide-[#ececec] overflow-hidden rounded-xl border border-[#ececec]">
              {groups.map((group) => {
                const isOpen = openGroup === group.type;
                const chosenHere = group.items.some((m) => m.id === selectedId);

                return (
                  <div key={group.type}>
                    <button
                      type="button"
                      onClick={() => setOpenGroup(isOpen ? null : group.type)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#faf9f5]"
                    >
                      <span className="flex-1 text-sm font-semibold text-[#18211f]">
                        {group.label}
                      </span>
                      {chosenHere && (
                        <span className="rounded-full bg-[#e6f0ea] px-2 py-0.5 font-mono text-[9px] tracking-wider text-[#285746] uppercase">
                          Selected
                        </span>
                      )}
                      <span className="text-xs text-[#8a8f89]">{group.items.length}</span>
                      <ChevronDown
                        className={`size-4 shrink-0 text-[#8a8f89] transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="space-y-2 bg-[#fcfcfa] px-4 pt-1 pb-4">
                        {group.items.map((method) => {
                          const address = addressOf(method);
                          const isSelected = selectedId === method.id;
                          const extras = extraDetails(method, address);
                          const network = method.details?.currency || method.details?.network;

                          return (
                            <label
                              key={method.id}
                              className={`block cursor-pointer rounded-xl border p-3 transition ${
                                isSelected
                                  ? "border-[#1e4a3f] bg-white"
                                  : "border-[#ececec] bg-white hover:border-[#1e4a3f]/40"
                              }`}
                            >
                              <span className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="settle-method"
                                  value={method.id}
                                  checked={isSelected}
                                  onChange={() => setSelectedId(method.id)}
                                  className="size-4 shrink-0 accent-[#1e4a3f]"
                                />
                                <span className="min-w-0 flex-1 text-sm font-semibold text-[#18211f]">
                                  {method.name}
                                </span>
                                {network && (
                                  <span className="shrink-0 font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                                    {String(network)}
                                  </span>
                                )}
                              </span>

                              <span className="mt-2 block">
                                <CopyValue value={address} />
                              </span>

                              {isSelected && extras.length > 0 && (
                                <dl className="mt-2 space-y-1.5">
                                  {extras.map(([k, v]) => (
                                    <div key={k}>
                                      <dt className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                                        {prettyKey(k)}
                                      </dt>
                                      <dd className="mt-0.5">
                                        <CopyValue value={v} />
                                      </dd>
                                    </div>
                                  ))}
                                </dl>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Always last, and always there: the way out when nothing above works. */}
              <div>
                <button
                  type="button"
                  onClick={() => setOpenGroup(openGroup === "desk" ? null : "desk")}
                  aria-expanded={openGroup === "desk"}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#faf9f5]"
                >
                  <span className="flex-1 text-sm font-semibold text-[#18211f]">
                    Contact the payment desk
                  </span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-[#8a8f89] transition-transform ${openGroup === "desk" ? "rotate-180" : ""}`}
                  />
                </button>

                {openGroup === "desk" && (
                  <div className="bg-[#fcfcfa] px-4 pt-1 pb-4">
                    <p className="text-xs text-[#59645f]">
                      {settings?.paymentDeskNote ||
                        "If none of these suit you, or your region is not supported, we will arrange another way to settle."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {deskEmail && (
                        <a
                          href={`mailto:${deskEmail}?subject=${deskSubject}`}
                          className="inline-flex items-center gap-2 rounded-full border border-[#1e4a3f] px-4 py-2 text-xs font-semibold text-[#1e4a3f] transition hover:bg-[#1e4a3f] hover:text-white"
                        >
                          <Mail className="size-3.5" /> Email the desk
                        </a>
                      )}
                      {deskWhatsapp && (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-[#1e4a3f] px-4 py-2 text-xs font-semibold text-[#1e4a3f] transition hover:bg-[#1e4a3f] hover:text-white"
                        >
                          <MessageCircle className="size-3.5" /> WhatsApp
                        </a>
                      )}
                      {!deskEmail && !deskWhatsapp && (
                        <p className="text-xs text-[#758078]">No contact route is published yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {groups.length === 0 && (
              <p className="mt-2.5 text-xs text-[#758078]">
                No payment methods are published yet — use the payment desk above.
              </p>
            )}
          </div>

          {/* Proof only makes sense once they have chosen where they sent it. */}
          {selectedId && (
            <div className="space-y-3 border-t border-[#ececec] pt-4">
              <label className="block">
                <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                  Proof of transfer
                </span>
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-[#ececec] p-4">
                  <Upload className="size-4 shrink-0 text-[#758078]" />
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                    className="min-w-0 flex-1 text-sm text-[#4a534e]"
                  />
                </div>
                {receipt && (
                  <span className="mt-1.5 flex items-center gap-1.5 text-xs text-[#285746]">
                    <Check className="size-3.5" /> {receipt.name}
                  </span>
                )}
              </label>

              <p className="text-xs text-[#758078]">
                Include your name, {contributorName}, as the payment reference so we can match it.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#ececec] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-[#ececec] px-5 py-2.5 text-sm font-semibold text-[#4a534e] transition hover:border-[#1e4a3f] hover:text-[#1e4a3f]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isSubmitting || !selectedId || !receipt}
            className="rounded-full bg-[#1e4a3f] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Submitting…" : "I have paid this charge"}
          </button>
        </div>
      </div>
    </div>
  );
}
