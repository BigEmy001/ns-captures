import React, { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Mail, Wallet, ShieldCheck, Globe } from "lucide-react";
import { fetchSiteSettings, joinWeb3Waitlist } from "../data/db";
import { sendWeb3WaitlistConfirmation } from "../../lib/email";
import { toast } from "sonner";
import { Eyebrow } from "./ui";

interface Web3WaitlistSectionProps {
  headline?: string;
  subtitle?: string;
}

const ROLES = [
  { id: "photographer", label: "Creator" },
  { id: "collector", label: "Collector" },
  { id: "agency", label: "Agency / Partner" },
];

const CREATOR_AVATARS = [
  {
    src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=120",
    name: "Elena",
  },
  {
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=120",
    name: "Mateo",
  },
  {
    src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=120",
    name: "Chloe",
  },
  {
    src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=120",
    name: "David",
  },
  {
    src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=120",
    name: "Jessica",
  },
];

export const Web3WaitlistSection: React.FC<Web3WaitlistSectionProps> = ({
  headline = "Direct digital-asset settlement for creators.",
  subtitle = "We are preparing a direct Web3 settlement platform for contributors and collectors worldwide. Join the waitlist for priority access when rollout begins in late 2026.",
}) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("photographer");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyExisted, setAlreadyExisted] = useState(false);
  const [launchHeadline, setLaunchHeadline] = useState(headline);
  const [launchSubtitle, setLaunchSubtitle] = useState(subtitle);

  useEffect(() => {
    let active = true;
    fetchSiteSettings()
      .then((settings) => {
        if (!active) return;
        setLaunchHeadline(settings.web3WaitlistHeadline || headline);
        setLaunchSubtitle(settings.web3WaitlistSubtitle || subtitle);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [headline, subtitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await joinWeb3Waitlist({
        email: cleanEmail,
        name: name.trim() || undefined,
        role,
        walletAddress: walletAddress.trim() || undefined,
      });

      if (!res.ok) {
        toast.error(res.error || "Could not join waitlist. Please try again.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setAlreadyExisted(Boolean(res.alreadyExists));

      sendWeb3WaitlistConfirmation(cleanEmail, name.trim() || undefined, role).catch((err) => {
        console.warn("Waitlist confirmation email dispatch failed:", err);
      });

      if (res.alreadyExists) {
        toast.success("Welcome back! Your waitlist details have been updated.");
      } else {
        toast.success("You're on the waitlist! Confirmation email dispatched.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="web3-waitlist" className="border-t border-[#ececec] bg-[#FAF9F5] py-20 sm:py-24">
      <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
        <div className="mx-auto max-w-[720px] text-center">
          <Eyebrow>ON-CHAIN SETTLEMENT · LATE 2026</Eyebrow>

          <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-[#18211f]">
            {launchHeadline}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-[#59645f] leading-relaxed">
            {launchSubtitle}
          </p>

          {/* Role selector */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-[#758078] font-medium mr-1">I am a:</span>
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  role === r.id
                    ? "bg-[#1e4a3f] text-white shadow-xs"
                    : "bg-white border border-[#ececec] text-[#59645f] hover:border-[#1e4a3f] hover:text-[#18211f]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Form / Submitted state */}
          {submitted ? (
            <div className="mx-auto mt-8 max-w-[540px] rounded-2xl border border-[#ececec] bg-white p-8 text-center ns-shadow-sm">
              <div className="mx-auto mb-3.5 flex size-12 items-center justify-center rounded-full bg-[#1e4a3f]/10 text-[#1e4a3f]">
                <CheckCircle2 className="size-6" />
              </div>
              <h3 className="font-serif text-2xl text-[#18211f]">
                {alreadyExisted ? "Details updated" : "You're on the waitlist"}
              </h3>
              <p className="mt-2 text-sm text-[#59645f] leading-relaxed">
                A confirmation has been sent to{" "}
                <strong className="font-medium text-[#18211f]">{email}</strong>. We will notify you
                as soon as early access opens.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                  setWalletAddress("");
                  setName("");
                }}
                className="mt-5 inline-block text-xs font-semibold text-[#1e4a3f] underline underline-offset-4 hover:text-[#123b31] cursor-pointer"
              >
                Register another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto mt-6 max-w-[540px]">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#758078]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="h-12 w-full rounded-full border border-[#ececec] bg-white pl-11 pr-4 text-sm text-[#18211f] placeholder:text-[#8a8f89] focus:border-[#1e4a3f] focus:outline-none focus:ring-1 focus:ring-[#1e4a3f]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 shrink-0 rounded-full bg-[#1e4a3f] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123b31] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? "Joining..." : "Join waitlist"}
                  {!loading && <ArrowRight className="size-4" />}
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-[#758078]">
                Rolling out in late 2026. No spam, ever. Unsubscribe anytime.
              </p>
            </form>
          )}

          {/* Clean creator community avatars */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="flex -space-x-2 overflow-hidden">
              {CREATOR_AVATARS.map((person, idx) => (
                <img
                  key={idx}
                  src={person.src}
                  alt={person.name}
                  className="inline-block size-7 rounded-full ring-2 ring-[#FAF9F5] object-cover shadow-xs"
                  loading="lazy"
                />
              ))}
            </div>
            <p className="text-xs text-[#59645f] font-medium">
              Joined by <span className="font-semibold text-[#18211f]">2,400+</span> creators &amp;
              collectors
            </p>
          </div>
        </div>

        {/* 3 Refined Value Points */}
        <div className="mt-16 grid gap-8 sm:grid-cols-3 border-t border-[#ececec] pt-12 text-left">
          <div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-white border border-[#ececec] text-[#1e4a3f]">
              <Wallet className="size-4" />
            </div>
            <h3 className="mt-4 font-serif text-lg text-[#18211f]">Direct Wallet Delivery</h3>
            <p className="mt-2 text-xs sm:text-sm text-[#59645f] leading-relaxed">
              Payouts delivered straight to personal crypto wallets in USDT, bypassing traditional
              intermediary delays.
            </p>
          </div>
          <div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-white border border-[#ececec] text-[#1e4a3f]">
              <ShieldCheck className="size-4" />
            </div>
            <h3 className="mt-4 font-serif text-lg text-[#18211f]">Full Principal Delivery</h3>
            <p className="mt-2 text-xs sm:text-sm text-[#59645f] leading-relaxed">
              Approved earnings delivered 100% in full. Conversion and network transfer costs are
              recorded separately.
            </p>
          </div>
          <div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-white border border-[#ececec] text-[#1e4a3f]">
              <Globe className="size-4" />
            </div>
            <h3 className="mt-4 font-serif text-lg text-[#18211f]">Global Clearance</h3>
            <p className="mt-2 text-xs sm:text-sm text-[#59645f] leading-relaxed">
              Seamless routing for international contributors and agencies awaiting local banking
              rail connectivity.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
