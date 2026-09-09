import React, { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Lock, Mail, Play, Sparkles, Wallet } from "lucide-react";
import confetti from "canvas-confetti";
import { fetchSiteSettings, joinWeb3Waitlist } from "../data/db";
import { sendWeb3WaitlistConfirmation } from "../../lib/email";
import { toast } from "sonner";

interface Web3WaitlistSectionProps {
  headline?: string;
  subtitle?: string;
}

const ROLES = [
  { id: "photographer", label: "Photographer" },
  { id: "collector", label: "Collector" },
  { id: "enthusiast", label: "Enthusiast" },
  { id: "builder", label: "Builder" },
];

export const Web3WaitlistSection: React.FC<Web3WaitlistSectionProps> = ({
  headline = "Available soon",
  subtitle = "Visitors can register for early access and be notified when the launch window opens.",
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
  const [features, setFeatures] = useState<string[]>([
    "Private beta access",
    "Curated collector drops",
    "Creator-first release flow",
  ]);

  useEffect(() => {
    let active = true;
    fetchSiteSettings()
      .then((settings) => {
        if (!active) return;
        setLaunchHeadline(settings.web3WaitlistHeadline || headline);
        setLaunchSubtitle(settings.web3WaitlistSubtitle || subtitle);
        setFeatures(
          settings.web3WaitlistFeatures && settings.web3WaitlistFeatures.length
            ? settings.web3WaitlistFeatures
            : ["Private beta access", "Curated collector drops", "Creator-first release flow"],
        );
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

      try {
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.65 },
          colors: ["#d9ff32", "#0f172a", "#ffffff", "#99ff00", "#b6ff2f"],
        });
      } catch {
        // Decorative only
      }

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

  const stats = [
    { value: "527", label: "days" },
    { value: "1", label: "hour" },
    { value: "39", label: "minutes" },
    { value: "20", label: "seconds" },
  ];

  const avatars = ["A", "M", "S", "J", "K"];

  return (
    <section id="web3-waitlist" className="relative overflow-hidden bg-[#f6f4ef] py-12 sm:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,255,50,0.12),transparent_26%),radial-gradient(circle_at_bottom,rgba(0,0,0,0.03),transparent_32%)]" />

      <div className="relative mx-auto max-w-[1080px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[760px] text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0a0d12] text-[#d9ff32] shadow-[0_0_30px_rgba(217,255,50,0.2)]">
            <div className="flex flex-col gap-[3px]">
              <span className="h-[2px] w-4 rounded-full bg-[#d9ff32]" />
              <span className="h-[2px] w-4 rounded-full bg-[#d9ff32]" />
              <span className="h-[2px] w-4 rounded-full bg-[#d9ff32]" />
            </div>
          </div>

          <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-[#49514d]">
            Available in early 2025
          </p>

          <h2 className="font-serif text-[2.5rem] leading-none tracking-[-0.06em] text-[#111111] sm:text-[4rem]">
            {launchHeadline}
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#4b544f] sm:text-base">
            {launchSubtitle}
          </p>

          {submitted ? (
            <div className="mx-auto mt-8 max-w-[540px] rounded-[1.5rem] border border-[#e5e4df] bg-white p-8 text-center shadow-[0_20px_50px_rgba(17,17,17,0.05)]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#d9ff32]/15 text-[#0a0d12]">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="font-serif text-3xl leading-none text-[#111111]">
                {alreadyExisted ? "Status refreshed" : "You’re on the list"}
              </h3>
              <p className="mt-3 text-sm text-[#4b544f]">
                A confirmation email has been sent to{" "}
                <span className="font-mono text-[#0a0d12]">{email}</span>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                  setWalletAddress("");
                  setName("");
                }}
                className="mt-6 text-xs font-medium text-[#4b544f] underline underline-offset-4 transition hover:text-[#111111]"
              >
                Register another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-[640px]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="h-12 w-full rounded-xl border border-[#e5e4df] bg-white px-4 text-sm text-[#111111] placeholder:text-[#757d79] focus:border-[#0a0d12] focus:outline-none focus:ring-2 focus:ring-[#d9ff32]/25"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d9ff32] px-5 text-sm font-semibold text-[#0a0d12] transition hover:brightness-95 disabled:opacity-60"
                >
                  {loading ? "Joining..." : "Join waitlist"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-[#3f4946]">
            <div className="flex -space-x-2">
              {avatars.map((initial, index) => (
                <div
                  key={initial + index}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[#f5f3ee] text-[9px] font-semibold text-[#111]"
                  style={{
                    background:
                      index % 2 === 0
                        ? "linear-gradient(135deg,#f5f5f0,#d1d1d1)"
                        : "linear-gradient(135deg,#b6ff2f,#d9ff32)",
                  }}
                >
                  {initial}
                </div>
              ))}
            </div>
            <span className="text-[#49514d]">Join 12,500+ others on the waitlist</span>
          </div>

          <div className="mt-7 flex items-center justify-center gap-6 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="font-mono text-[1.7rem] font-semibold leading-none tracking-[-0.06em] text-[#111111]">
                  {stat.value}
                </div>
                <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[#6b716d]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center">
            {features.map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center rounded-full border border-[#e6e2dc] bg-white px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#2d362f]"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-[2rem] border border-[#e5e4df] bg-white p-3 shadow-[0_25px_60px_rgba(17,17,17,0.08)]">
          <div className="relative mx-auto aspect-[16/8] overflow-hidden rounded-[1.5rem] bg-[#f5f5f0]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.9),rgba(255,255,255,0.5)_20%,transparent_70%)]" />
            <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(135deg,rgba(0,0,0,0.04)_0%,rgba(255,255,255,0)_30%,rgba(0,0,0,0.04)_50%,rgba(255,255,255,0)_74%,rgba(0,0,0,0.04)_100%)]" />
            <div className="absolute inset-x-[12%] top-[10%] bottom-[8%] rounded-[50%] border border-black/5" />
            <div className="absolute inset-x-[18%] top-[18%] bottom-[16%] rounded-[50%] border border-black/5" />
            <div className="absolute inset-x-[25%] top-[26%] bottom-[24%] rounded-[50%] border border-black/5" />
            <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#d9ff32] shadow-[0_0_30px_rgba(217,255,50,0.7)]">
              <Play className="ml-1 h-7 w-7 fill-[#0a0d12] text-[#0a0d12]" />
            </div>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.2em] text-black/55">
              see how it works
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 bg-[#f3f2ee] py-10 sm:py-12">
        <div className="mx-auto max-w-[1080px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[760px] rounded-[2rem] border border-[#e5e4df] bg-[#f8f8f6] p-6 text-center shadow-[0_25px_60px_rgba(17,17,17,0.06)] sm:p-8">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0a0d12] text-[#d9ff32]">
              <div className="flex flex-col gap-[3px]">
                <span className="h-[2px] w-4 rounded-full bg-[#d9ff32]" />
                <span className="h-[2px] w-4 rounded-full bg-[#d9ff32]" />
                <span className="h-[2px] w-4 rounded-full bg-[#d9ff32]" />
              </div>
            </div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[#49514d]">
              Available in early 2025
            </p>
            <h3 className="mt-4 font-serif text-[2.2rem] leading-none tracking-[-0.06em] text-[#111111] sm:text-[3.2rem]">
              Get early access
            </h3>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#4b544f] sm:text-base">
              Be amongst the first to experience the next chapter of NS Captures. Join the waitlist
              and be notified when we launch.
            </p>

            <div className="mx-auto mt-7 flex max-w-[640px] flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a817d]" />
                <input
                  type="email"
                  readOnly
                  value=""
                  placeholder="Email"
                  className="h-12 w-full rounded-xl border border-[#e5e4df] bg-white px-10 text-sm text-[#111111] placeholder:text-[#757d79] focus:border-[#0a0d12] focus:outline-none"
                />
              </div>
              <button className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d9ff32] px-5 text-sm font-semibold text-[#0a0d12] transition hover:brightness-95">
                Join waitlist
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3 text-xs text-[#4b544f]">
              <div className="flex -space-x-2">
                {avatars.map((initial, index) => (
                  <div
                    key={initial + index + "-light"}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[#f2f2ef] text-[9px] font-semibold text-[#111]"
                    style={{
                      background:
                        index % 2 === 0
                          ? "linear-gradient(135deg,#f5f5f0,#d1d1d1)"
                          : "linear-gradient(135deg,#b6ff2f,#d9ff32)",
                    }}
                  >
                    {initial}
                  </div>
                ))}
              </div>
              <span className="text-[#49514d]">Join 12,500+ others on the waitlist</span>
            </div>

            <div className="mt-7 flex items-center justify-center gap-6 text-center">
              {stats.map((stat) => (
                <div key={stat.label + "-light"}>
                  <div className="font-mono text-[1.7rem] font-semibold leading-none tracking-[-0.06em] text-[#111111]">
                    {stat.value}
                  </div>
                  <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[#6b716d]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#e5e4df] bg-white/80 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3d463f]">
              <Lock className="h-3.5 w-3.5 text-[#0a0d12]" />
              Left until full release
            </div>

            <div className="mt-8 overflow-hidden rounded-[1.6rem] border border-[#e5e4df] bg-[#eff0ed] p-2">
              <div className="relative mx-auto aspect-[16/8] overflow-hidden rounded-[1.2rem] bg-[#f5f5f0]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.9),rgba(255,255,255,0.45)_22%,transparent_70%)]" />
                <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(135deg,rgba(0,0,0,0.04)_0%,rgba(255,255,255,0)_30%,rgba(0,0,0,0.04)_50%,rgba(255,255,255,0)_74%,rgba(0,0,0,0.04)_100%)]" />
                <div className="absolute inset-x-[12%] top-[10%] bottom-[8%] rounded-[50%] border border-black/5" />
                <div className="absolute inset-x-[18%] top-[18%] bottom-[16%] rounded-[50%] border border-black/5" />
                <div className="absolute inset-x-[25%] top-[26%] bottom-[24%] rounded-[50%] border border-black/5" />
                <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#d9ff32] shadow-[0_0_30px_rgba(217,255,50,0.7)]">
                  <Play className="ml-1 h-7 w-7 fill-[#0a0d12] text-[#0a0d12]" />
                </div>
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.2em] text-black/55">
                  see how it works
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
