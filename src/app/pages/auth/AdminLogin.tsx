import { Link } from "react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { AuthLayout, AuthField } from "./AuthLayout";
import { useAuth } from "../../context/AuthContext";

export function AdminLogin() {
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
      eyebrow="ADMIN ACCESS"
      title="Administrator sign in"
      subtitle={
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-[#1e4a3f]" />
          Authorized personnel only
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <AuthField
          label="Email"
          type="email"
          placeholder="admin@ns.co"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthField
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          {isLoading ? "Signing in..." : "Sign in to admin panel"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[#9aa09b]">
        <Link to="/signin" className="text-[#1e4a3f] hover:underline">
          ← Back to regular sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
