import { Link } from "react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout, AuthField, SocialButtons } from "./AuthLayout";
import { useAuth } from "../../context/AuthContext";

export function SignUp() {
  const { signup } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signup({ firstName, lastName, email, password });
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="GET STARTED"
      title="Create your account"
      subtitle={
        <>
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold text-[#1e4a3f] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AuthField
            label="First name"
            placeholder="Ada"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <AuthField
            label="Last name"
            placeholder="Obi"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
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
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="flex items-start gap-2 text-xs leading-5 text-[#4a534e]">
          <input type="checkbox" className="mt-0.5 size-4 accent-[#1e4a3f]" required />
          I agree to the{" "}
          <Link to="/pricing" className="text-[#1e4a3f] hover:underline">Terms</Link>{" "}
          &{" "}
          <Link to="/pricing" className="text-[#1e4a3f] hover:underline">Privacy Policy</Link>.
        </label>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-[#1e4a3f] py-3 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-[#9aa09b]">
        <span className="h-px flex-1 bg-[#ececec]" /> or sign up with <span className="h-px flex-1 bg-[#ececec]" />
      </div>
      <SocialButtons />
    </AuthLayout>
  );
}