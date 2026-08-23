import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { acceptProposal, declineProposal, viewProposal, type PublicProposal } from "../data/db";

/**
 * The invitation, read by someone who has no account yet. The token in the URL
 * is their only credential, and everything it can do is checked server-side by
 * the proposal edge function.
 */
export function Proposal() {
  const { token = "" } = useParams();

  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    viewProposal(token).then((data) => {
      if (cancelled) return;
      setProposal(data);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const accept = async () => {
    setIsWorking(true);
    const result = await acceptProposal(token);
    setIsWorking(false);

    if (!result.ok) {
      toast.error("Could not accept this invitation", { description: result.message });
      return;
    }

    setProposal((prev) => (prev ? { ...prev, status: "accepted" } : prev));
    setCredentials({ email: result.email || proposal?.email || "", password: result.password });
  };

  const decline = async () => {
    if (!window.confirm("Decline this invitation? This cannot be undone.")) return;

    setIsWorking(true);
    const ok = await declineProposal(token);
    setIsWorking(false);

    if (!ok) {
      toast.error("Could not record your response");
      return;
    }

    setProposal((prev) => (prev ? { ...prev, status: "declined" } : prev));
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center bg-[#FAF9F5]">
        <p className="animate-pulse text-sm text-[#6b716d]">Loading your invitation…</p>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="grid min-h-[70vh] place-items-center bg-[#FAF9F5] px-5 text-center">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-[#49685d]">NS CAPTURES</p>
          <h1 className="mt-4 font-serif text-4xl text-[#18211f]">Invitation not found.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-[#59645f]">
            This link may have expired or been withdrawn. If you were expecting an invitation, reply
            to the email you received and we will send a new one.
          </p>
        </div>
      </div>
    );
  }

  const settled = proposal.status === "accepted" || proposal.status === "declined";
  const expired = proposal.status === "expired";

  return (
    <div className="w-full bg-[#FAF9F5] py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <header className="border-b-2 border-[#18211f] pb-6">
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#49685d] uppercase">
            NS Captures · International Contributor Programme
          </p>
          <h1 className="mt-4 font-serif text-3xl leading-tight text-[#18211f] sm:text-4xl">
            International Contributor Invitation &amp; Photographic Acquisition Proposal
          </h1>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] text-[#59645f]">
            <span>Ref {proposal.reference}</span>
            <span>Issued {format(new Date(proposal.issuedAt), "d MMMM yyyy")}</span>
            {!settled && !expired && (
              <span>Valid until {format(new Date(proposal.expiresAt), "d MMMM yyyy")}</span>
            )}
          </div>
        </header>

        <section className="mt-8 rounded-2xl border border-[#ececec] bg-white p-6">
          <p className="font-mono text-[9px] tracking-[0.14em] text-[#758078] uppercase">
            Invited contributor
          </p>
          <p className="mt-2 font-serif text-xl text-[#18211f]">{proposal.name}</p>
          <p className="text-sm text-[#59645f]">{proposal.email}</p>
          {(proposal.location || proposal.occupation) && (
            <p className="mt-1 text-sm text-[#59645f]">
              {[proposal.occupation, proposal.location].filter(Boolean).join(" · ")}
            </p>
          )}
        </section>

        {credentials ? (
          <section className="mt-8 rounded-2xl border border-[#1e4a3f]/25 bg-[#f2f7f4] p-6">
            <h2 className="font-serif text-2xl text-[#18211f]">Welcome to NS CAPTURES.</h2>
            <p className="mt-2 text-sm text-[#3d4744]">
              Your contributor account is ready. Sign in with the details below and change your
              password once you are in. Your contributor agreement is waiting to be signed.
            </p>
            <dl className="mt-5 space-y-3 rounded-xl bg-white p-5">
              <div>
                <dt className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                  Email
                </dt>
                <dd className="mt-0.5 font-mono text-sm break-all text-[#18211f]">
                  {credentials.email}
                </dd>
              </div>
              {credentials.password && (
                <div>
                  <dt className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                    Temporary password
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm break-all text-[#18211f]">
                    {credentials.password}
                  </dd>
                  <dd className="mt-1 text-xs text-[#758078]">
                    Shown once. Copy it before you leave this page.
                  </dd>
                </div>
              )}
            </dl>
            <Link
              to="/signin"
              className="mt-5 inline-block rounded-full bg-[#1e4a3f] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123b31]"
            >
              Sign in
            </Link>
          </section>
        ) : (
          <>
            <article className="mt-8 rounded-2xl border border-[#ececec] bg-white p-6 sm:p-10">
              <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-[#18211f]">
                {proposal.body || "The text of this invitation has not been attached."}
              </div>
            </article>

            {proposal.status === "declined" && (
              <p className="mt-8 rounded-2xl border border-[#ececec] bg-white p-6 text-sm text-[#59645f]">
                You have declined this invitation. If that was a mistake, reply to the email you
                received and we will be glad to reissue it.
              </p>
            )}

            {expired && (
              <p className="mt-8 rounded-2xl border border-[#ececec] bg-white p-6 text-sm text-[#59645f]">
                This invitation has expired. Reply to the email you received and we will send a
                fresh one.
              </p>
            )}

            {!settled && !expired && (
              <section className="mt-8 rounded-2xl border border-[#1e4a3f]/25 bg-white p-6">
                <p className="font-mono text-[9px] tracking-[0.14em] text-[#758078] uppercase">
                  Your response
                </p>
                <p className="mt-2 max-w-xl text-sm text-[#3d4744]">
                  Accepting creates your contributor account and opens your contributor agreement
                  for review. It does not transfer any rights in your photographs — that only ever
                  happens under a separate agreement you sign.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={accept}
                    disabled={isWorking}
                    className="rounded-full bg-[#1e4a3f] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:opacity-40"
                  >
                    {isWorking ? "Just a moment…" : "Accept invitation"}
                  </button>
                  <button
                    onClick={decline}
                    disabled={isWorking}
                    className="rounded-full border border-[#ececec] px-6 py-2.5 text-sm font-semibold text-[#4a534e] transition hover:border-[#1e4a3f] hover:text-[#1e4a3f] disabled:opacity-40"
                  >
                    Decline
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        <footer className="mt-10 border-t border-[#ececec] pt-6 text-xs text-[#758078]">
          NS CAPTURES · Global Photography Acquisition &amp; Licensing · London, United Kingdom
        </footer>
      </div>
    </div>
  );
}
