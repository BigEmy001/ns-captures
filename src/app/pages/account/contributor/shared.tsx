import type { ReactNode } from "react";
import { Eyebrow } from "../../../components/ui";

/** Money as whole pounds — the platform stores and shows no minor units. */
export function money(amount: number, currency = "GBP"): string {
  const symbol = currency === "GBP" ? "£" : `${currency} `;
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

export function PortalPage({
  eyebrow,
  title,
  intro,
  aside,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="w-full bg-[#FAF9F5] py-8 sm:py-12 min-h-screen">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl tracking-tight text-[#18211f]">
              {title}
            </h1>
            {intro && <p className="mt-3 text-sm leading-relaxed text-[#59645f]">{intro}</p>}
          </div>
          {aside}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#ddddd6] bg-white p-14 text-center">
      <p className="font-serif text-lg text-[#4a534e]">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[#758078]">{body}</p>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[#ececec]/80 bg-white p-6 ns-shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

const PILL_TONES = {
  progress: "bg-[#ece9df] text-[#6d746e]",
  good: "bg-[#dce8df] text-[#285746]",
  attention: "bg-[#f6ecd8] text-[#7a5a17]",
  closed: "bg-[#f1f1ef] text-[#8a8f89]",
} as const;

export type PillTone = keyof typeof PILL_TONES;

export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.08em] uppercase ${PILL_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function FieldGrid({ fields }: { fields: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((f) => (
        <div key={f.label}>
          <dt className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
            {f.label}
          </dt>
          <dd className="mt-1 text-sm text-[#18211f]">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
