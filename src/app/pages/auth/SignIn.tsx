import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout, AuthField, SocialButtons } from "./AuthLayout";
import { useAuth } from "../../context/AuthContext";

export function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password, remember);
    } catch (err: any) {
      toast.error(err.message || "Sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="WELCOME BACK"
      title="Sign in to your account"
      subtitle={
        <>
          New to NS Captures?{" "}
          <Link to="/signup" className="font-semibold text-[#1e4a3f] hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <AuthField
          label="Email"
          type="email"
          placeholder="you@studio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthField
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          trailing={
            <Link to="/forgot-password" className="font-normal text-[#1e4a3f] hover:underline">
              Forgot?
            </Link>
          }
        />
        <label className="flex items-center gap-2 text-sm text-[#4a534e]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 accent-[#1e4a3f]"
          />
          Keep me signed in
        </label>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-[#1e4a3f] py-3 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-[#9aa09b]">
        <span className="h-px flex-1 bg-[#ececec]" /> or continue with <span className="h-px flex-1 bg-[#ececec]" />
      </div>
      <SocialButtons />
    </AuthLayout>
  );
}