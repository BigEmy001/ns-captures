import { useEffect, useMemo, useState } from "react";
import { X, Check, Upload, ChevronDown, Copy, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { resolveContact, contactLabel, withSubject } from "../../../lib/contact";
import {
  fetchAdminPaymentMethods,
  fetchSiteSettings,
  submitConversionFeePayment,
  type AdminPaymentMethod,
  type CryptoWalletEntry,
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
 * One thing a person can actually send money to.
 *
 * A method row is not that unit. The Global Deposit Wallets screen saves every
 * crypto wallet the admin configures into a single row as details.wallets, so
 * one row can hold BTC, three USDT networks and an ETH address at once. Each
 * of those is a separate choice here.
 */
interface PayOption {
  key: string;
  methodId: string;
  group: string;
  label: string;
  tag?: string;
  address: string;
  extras: [string, string][];
  /** What gets recorded against the payment when they confirm. */
  recordName: string;
}

function optionsFrom(method: AdminPaymentMethod): PayOption[] {
  const wallets = (method.details || {}).wallets;

  if (Array.isArray(wallets)) {
    return (wallets as CryptoWalletEntry[])
      .filter((w) => w && typeof w.address === "string" && w.address.trim())
      .map((w) => ({
        key: `${method.id}:${w.coin}:${w.network}`,
        methodId: method.id,
        group: method.methodType,
        label: w.coin || method.name,
        tag: w.network,
        address: w.address.trim(),
        extras: [],
        recordName: `${w.coin} (${w.network})`,
      }));
  }

  const address = addressOf(method);
  if (!address) return [];
  const network = method.details?.currency || method.details?.network;

  return [
    {
      key: method.id,
      methodId: method.id,
      group: method.methodType,
      label: method.name,
      tag: network ? String(network) : undefined,
      address,
      extras: extraDetails(method, address),
      recordName: method.name,
    },
  ];
}

/**
 * The same wallet saved under four different rows is still one wallet. Showing
 * it four times would make the list look busy without offering a real choice.
 */
function dedupe(options: PayOption[]): PayOption[] {
  const seen = new Set<string>();
  return options.filter((o) => {
    const key = `${o.group}|${o.label.trim().toLowerCase()}|${o.tag || ""}|${o.address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function CopyValue({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  // This sits inside a <label>, so a bare click would also toggle that
  // label's radio. Stopping it here keeps Copy meaning only copy.
  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast.success(label ? `Copied ${label}` : "Copied");
    } catch {
      toast.error("Could not copy — select the text instead");
    }
  };

  return (
    <span className="mt-2 block rounded-lg border border-[#ececec] bg-white p-2.5">
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
          Send to
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1 rounded border border-[#ececec] bg-[#f8f9f7] px-2 py-1 text-[11px] font-medium text-[#1e4a3f] transition hover:bg-[#ececec]"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </span>
      <code className="mt-1.5 block rounded border border-[#ececec] bg-[#f8f9f7] p-2 font-mono text-xs break-all text-[#18211f] select-all">
        {value}
      </code>
    </span>
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
    const options = dedupe(methods.flatMap(optionsFrom));
    const byType = new Map<string, PayOption[]>();
    for (const o of options) {
      const list = byType.get(o.group) || [];
      list.push(o);
      byType.set(o.group, list);
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

  const chosen = useMemo(
    () => groups.flatMap((g) => g.items).find((o) => o.key === selectedId),
    [groups, selectedId],
  );

  const owed = (request.conversionFeeGbp || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // The desk's own address if the admin set one, otherwise the same Contact
  // Admin destination every other payment modal uses.
  const desk = resolveContact(settings?.paymentDeskEmail, settings?.contactLink);
  const deskWhatsapp = settings?.paymentDeskWhatsapp
    ? resolveContact(settings.paymentDeskWhatsapp)
    : null;
  const deskHref = withSubject(desk, `Conversion charge £${owed} — ${contributorName}`);

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

      const ok = await submitConversionFeePayment(
        request.id,
        json.secure_url,
        chosen?.recordName || "Payment method",
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
                const chosenHere = group.items.some((o) => o.key === selectedId);

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
                        {group.items.map((option) => {
                          const isSelected = selectedId === option.key;

                          return (
                            <label
                              key={option.key}
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
                                  value={option.key}
                                  checked={isSelected}
                                  onChange={() => setSelectedId(option.key)}
                                  className="size-4 shrink-0 accent-[#1e4a3f]"
                                />
                                <span className="min-w-0 flex-1 text-sm font-semibold text-[#18211f]">
                                  {option.label}
                                </span>
                                {option.tag && (
                                  <span className="shrink-0 rounded-full bg-[#f2f2ee] px-2 py-0.5 font-mono text-[9px] tracking-wider text-[#59645f] uppercase">
                                    {option.tag}
                                  </span>
                                )}
                              </span>

                              <CopyValue value={option.address} label={option.recordName} />

                              {isSelected && option.extras.length > 0 && (
                                <dl className="mt-2 space-y-1.5">
                                  {option.extras.map(([k, v]) => (
                                    <div key={k}>
                                      <dt className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                                        {prettyKey(k)}
                                      </dt>
                                      <dd className="mt-0.5">
                                        <CopyValue value={v} label={prettyKey(k)} />
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
            </div>

            {groups.length === 0 && (
              <p className="mt-2.5 rounded-xl border border-[#ececec] p-4 text-xs text-[#758078]">
                No payment methods are published yet — use the payment desk below.
              </p>
            )}
          </div>

          {/* Never behind a disclosure: someone who cannot use any method above
              needs this to be visible, not found. */}
          <div className="rounded-xl border border-[#ececec] bg-[#fcfcfa] p-4">
            <p className="text-sm font-semibold text-[#18211f]">Cannot use any of these?</p>
            <p className="mt-0.5 text-xs text-[#59645f]">
              {settings?.paymentDeskNote ||
                "Message the payment desk and we will arrange another way to settle."}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={deskHref}
                target={desk.kind === "email" ? undefined : "_blank"}
                rel={desk.kind === "email" ? undefined : "noopener noreferrer"}
                className="inline-flex items-center gap-2 rounded-full bg-[#1e4a3f] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#123b31]"
              >
                {desk.kind === "email" ? (
                  <Mail className="size-3.5" />
                ) : (
                  <MessageCircle className="size-3.5" />
                )}
                {contactLabel(desk)}
              </a>

              {deskWhatsapp && (
                <a
                  href={deskWhatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#1e4a3f] px-4 py-2 text-xs font-semibold text-[#1e4a3f] transition hover:bg-[#1e4a3f] hover:text-white"
                >
                  <MessageCircle className="size-3.5" /> WhatsApp
                </a>
              )}
            </div>

            {/* A mailto: link does nothing at all on a machine with no mail
                client, and the click looks broken. The address itself is
                always here to copy. */}
            <p className="mt-2.5 font-mono text-[10px] break-all text-[#8a8f89]">{desk.display}</p>
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
