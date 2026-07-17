import { Link } from "react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout, AuthField, SocialButtons } from "./AuthLayout";
import { useAuth } from "../../context/AuthContext";
import { isStrongPassword, isValidEmail } from "../../../lib/validation";

export function SignUp() {
  const { signup } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string; password?: string; terms?: string }>({});
  const [terms, setTerms] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    if (!firstName.trim()) next.firstName = "First name is required";
    if (!lastName.trim()) next.lastName = "Last name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!isValidEmail(email)) next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    else if (!isStrongPassword(password)) next.password = "Use at least 10 characters with letters and numbers";
    if (!terms) next.terms = "You must agree to the terms";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const clearError = (field: string) => setErrors((p) => ({ ...p, [field]: undefined }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
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
          <div>
            <AuthField
              label="First name"
              placeholder="Ada"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); clearError("firstName"); }}
            />
            {errors.firstName && <p className="mt-1 text-xs text-[#d4183d]">{errors.firstName}</p>}
          </div>
          <div>
            <AuthField
              label="Last name"
              placeholder="Obi"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); clearError("lastName"); }}
            />
            {errors.lastName && <p className="mt-1 text-xs text-[#d4183d]">{errors.lastName}</p>}
          </div>
        </div>
        <div>
          <AuthField
            label="Email"
            type="email"
            placeholder="you@studio.com"
            value={email}
            autoComplete="email"
            onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
          />
          {errors.email && <p className="mt-1 text-xs text-[#d4183d]">{errors.email}</p>}
        </div>
        <div>
          <AuthField
            label="Password"
            type="password"
            placeholder="At least 10 characters"
            value={password}
            autoComplete="new-password"
            onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
          />
          {errors.password && <p className="mt-1 text-xs text-[#d4183d]">{errors.password}</p>}
        </div>
        <div>
          <label className="flex items-start gap-2 text-xs leading-5 text-[#4a534e]">
            <input type="checkbox" checked={terms} onChange={(e) => { setTerms(e.target.checked); clearError("terms"); }} className="mt-0.5 size-4 accent-[#1e4a3f]" />
            I agree to the{" "}
            <Link to="/pricing" className="text-[#1e4a3f] hover:underline">Terms</Link>{" "}
            &{" "}
            <Link to="/pricing" className="text-[#1e4a3f] hover:underline">Privacy Policy</Link>.
          </label>
          {errors.terms && <p className="mt-1 text-xs text-[#d4183d]">{errors.terms}</p>}
        </div>
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
