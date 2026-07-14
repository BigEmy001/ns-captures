import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, MailCheck } from "lucide-react";
import { AuthLayout, AuthField } from "./AuthLayout";

export function ForgotPassword() {
  const [sent, setSent] = useState(false);

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
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
          className="space-y-4"
        >
          <AuthField label="Email" type="email" placeholder="you@studio.com" />
          <button
            type="submit"
            className="w-full rounded-full bg-[#1e4a3f] py-3 text-sm font-semibold text-white transition hover:bg-[#123b31]"
          >
            Send reset link
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
