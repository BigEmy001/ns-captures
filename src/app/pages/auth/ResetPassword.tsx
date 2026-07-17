import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { AuthLayout, AuthField } from "./AuthLayout";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { isStrongPassword } from "../../../lib/validation";

export function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY" || session?.access_token) {
        setReady(true);
      }
    });
    const hash = window.location.hash;
    if (hash && (hash.includes("access_token") || hash.includes("type=recovery"))) {
      setReady(true);
    }
    return () => sub.data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isStrongPassword(password)) { setError("Use at least 10 characters with letters and numbers"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setIsLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (err) { setError(err.message); return; }
    toast.success("Password updated successfully");
    navigate("/signin", { replace: true });
  };

  if (!ready) {
    return (
      <AuthLayout eyebrow="RESET PASSWORD" title="Verifying link..." subtitle="Please wait while we verify your reset link.">
        <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-[#1e4a3f]" /></div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="RESET PASSWORD"
      title="Choose a new password"
      subtitle="Use at least 10 characters with letters and numbers."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <AuthField
            label="New Password"
            type="password"
            placeholder="At least 10 characters"
            value={password}
            autoComplete="new-password"
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
          />
        </div>
        <div>
          <AuthField
            label="Confirm Password"
            type="password"
            placeholder="Repeat your password"
            value={confirm}
            autoComplete="new-password"
            onChange={(e) => { setConfirm(e.target.value); setError(""); }}
          />
        </div>
        {error && <p className="text-xs text-[#d4183d]">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-[#1e4a3f] py-3 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> Updating...</span> : "Update password"}
        </button>
      </form>
    </AuthLayout>
  );
}
