import { Link } from "react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout, AuthField } from "./AuthLayout";
import { useAuth } from "../../context/AuthContext";
import { isStrongPassword, isValidEmail } from "../../../lib/validation";
import { getCsrfToken } from "../../../lib/csrf";

import { Camera, Briefcase, User } from "lucide-react";

export function SignUp() {
  const { signup } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Buyer" | "Photographer" | "Enterprise">("Buyer");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    terms?: string;
  }>({});
  const [terms, setTerms] = useState(false);

  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    if (!firstName.trim()) next.firstName = "First name is required";
    if (!lastName.trim()) next.lastName = "Last name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!isValidEmail(email)) next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    else if (!isStrongPassword(password))
      next.password = "Use at least 10 characters with letters and numbers";
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
      const res = await signup({ firstName, lastName, email, password, role });
      if (res.needsEmailConfirmation) {
        setIsSuccess(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout
        eyebrow="SUCCESS"
        title="Check your email"
        subtitle="We sent a confirmation link to activate your account."
      >
        <div className="rounded-2xl border border-[#ececec] bg-[#f8f9f7] p-8 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#1e4a3f]/10">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1e4a3f"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              <path d="m16 19 2 2 4-4" />
            </svg>
          </div>
          <p className="text-sm text-[#4a534e]">
            Click the secure link in the email sent to{" "}
            <strong className="text-[#18211f] font-semibold">{email}</strong> to complete your
            registration.
          </p>
          <p className="text-xs text-[#9aa09b]">
            If you don't see it, check your spam folder or{" "}
            <button onClick={() => setIsSuccess(false)} className="text-[#1e4a3f] hover:underline">
              try again
            </button>
            .
          </p>
        </div>
        <div className="mt-8">
          <Link
            to="/signin"
            className="w-full inline-flex justify-center rounded-full border border-[#ececec] bg-white py-3 text-sm font-semibold text-[#18211f] transition hover:bg-[#f8f9f7]"
          >
            Return to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

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
        <input type="hidden" name="csrf_token" value={getCsrfToken()} />

        {/* Role Selector */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole("Buyer")}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs transition ${
              role === "Buyer"
                ? "border-[#1e4a3f] bg-[#1e4a3f]/5 text-[#1e4a3f] font-semibold"
                : "border-[#ececec] bg-white text-[#6b716d] hover:bg-[#f8f9f7]"
            }`}
          >
            <User className="size-5" />
            Buyer
          </button>
          <button
            type="button"
            onClick={() => setRole("Photographer")}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs transition ${
              role === "Photographer"
                ? "border-[#1e4a3f] bg-[#1e4a3f]/5 text-[#1e4a3f] font-semibold"
                : "border-[#ececec] bg-white text-[#6b716d] hover:bg-[#f8f9f7]"
            }`}
          >
            <Camera className="size-5" />
            Creator
          </button>
          <button
            type="button"
            onClick={() => setRole("Enterprise")}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs transition ${
              role === "Enterprise"
                ? "border-[#1e4a3f] bg-[#1e4a3f]/5 text-[#1e4a3f] font-semibold"
                : "border-[#ececec] bg-white text-[#6b716d] hover:bg-[#f8f9f7]"
            }`}
          >
            <Briefcase className="size-5" />
            Enterprise
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <AuthField
              label="First name"
              placeholder="Jane"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                clearError("firstName");
              }}
            />
            {errors.firstName && <p className="mt-1 text-xs text-[#d4183d]">{errors.firstName}</p>}
          </div>
          <div>
            <AuthField
              label="Last name"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                clearError("lastName");
              }}
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
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
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
            onChange={(e) => {
              setPassword(e.target.value);
              clearError("password");
            }}
          />
          {errors.password && <p className="mt-1 text-xs text-[#d4183d]">{errors.password}</p>}
        </div>
        <div>
          <label className="flex items-start gap-2 text-xs leading-5 text-[#4a534e]">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => {
                setTerms(e.target.checked);
                clearError("terms");
              }}
              className="mt-0.5 size-4 accent-[#1e4a3f]"
            />
            I agree to the{" "}
            <Link to="/pricing" className="text-[#1e4a3f] hover:underline">
              Terms
            </Link>{" "}
            &{" "}
            <Link to="/pricing" className="text-[#1e4a3f] hover:underline">
              Privacy Policy
            </Link>
            .
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
    </AuthLayout>
  );
}
