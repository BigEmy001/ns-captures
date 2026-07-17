import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, MailCheck, Loader2 } from "lucide-react";
import { AuthLayout, AuthField } from "./AuthLayout";
import { supabase } from "../../../lib/supabase";
import { isValidEmail, normalizeEmail } from "../../../lib/validation";

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }
    if (!isValidEmail(email)) { setError("Enter a valid email address"); return; }
    setIsLoading(true);
    setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  };

  return (
    <AuthLayout
      eyebrow="ACCOUNT RECOVERY"
      title={sent ? "Check your inbox" : "Reset your password"}
      subtitle={
        sent
          ? "We've sent a secure reset link to your email. It expires in 30 minutes."
          : "Enter the email tied to your account and we'll send you a link to reset your password."
      }
    >
      {sent ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-lg border border-[#d7e6da] bg-[#eef5ef] px-4 py-3 text-sm text-[#1e4a3f]">
            <MailCheck className="size-5 shrink-0" /> Reset link sent successfully.
          </div>
          <button
            onClick={() => setSent(false)}
            className="text-sm font-semibold text-[#1e4a3f] hover:underline"
          >
            Didn't get it? Resend
          </button>
          <Link
            to="/signin"
            className="flex items-center gap-2 text-sm font-semibold text-[#1e4a3f] hover:underline"
          >
            <ArrowLeft className="size-4" /> Back to sign in
          </Link>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-4"
        >
          <div>
            <AuthField
              label="Email"
              type="email"
              placeholder="you@studio.com"
              value={email}
              autoComplete="email"
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
            />
            {error && <p className="mt-1 text-xs text-[#d4183d]">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-[#1e4a3f] py-3 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> Sending...</span> : "Send reset link"}
          </button>
          <Link
            to="/signin"
            className="flex items-center justify-center gap-2 text-sm font-semibold text-[#4a534e] hover:text-[#1e4a3f]"
          >
            <ArrowLeft className="size-4" /> Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
