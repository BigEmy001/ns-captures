import { Link } from "react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout, AuthField, SocialButtons } from "./AuthLayout";
import { useAuth } from "../../context/AuthContext";
import { isValidEmail } from "../../../lib/validation";

export function SignIn() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!isValidEmail(email)) next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
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
        <div>
          <AuthField
            label="Email"
            type="email"
            placeholder="you@studio.com"
            value={email}
            autoComplete="email"
            onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
          />
          {errors.email && <p className="mt-1 text-xs text-[#d4183d]">{errors.email}</p>}
        </div>
        <div>
          <AuthField
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            autoComplete="current-password"
            onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
            trailing={
              <Link to="/forgot-password" className="font-normal text-[#1e4a3f] hover:underline">
                Forgot?
              </Link>
            }
          />
          {errors.password && <p className="mt-1 text-xs text-[#d4183d]">{errors.password}</p>}
        </div>
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
