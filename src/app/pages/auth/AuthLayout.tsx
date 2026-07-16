import { ReactNode, useState } from "react";
import { Link } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import { Monogram } from "../../components/ui";

const showcase =
  "https://images.unsplash.com/photo-1711464669343-2596d0f1b526?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1400";

/**
 * Split-screen auth shell: form on the left, editorial imagery on the right (desktop).
 */
export function AuthLayout({
  children,
  eyebrow,
  title,
  subtitle,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-20">
        <Link to="/" className="inline-flex">
          <Monogram />
        </Link>

        <div className="flex flex-1 items-center py-12">
          <div className="mx-auto w-full max-w-sm">
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#49685d]">{eyebrow}</p>
            <h1 className="mt-3 font-serif text-4xl leading-[1.05] tracking-[-0.02em]">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-[#6b716d]">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>

        <p className="text-xs text-[#9aa09b]">© 2026 NS CAPTURES · Photography licensed by creators.</p>
      </div>

      {/* Image side */}
      <div className="relative hidden overflow-hidden bg-[#213e35] lg:block">
        <img src={showcase} alt="Against the wall" loading="lazy" className="absolute inset-0 size-full object-cover" />
      </div>
    </div>
  );
}

export function AuthField({
  label,
  type = "text",
  placeholder,
  trailing,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  trailing?: ReactNode;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#333935]">
        {label}
        {trailing}
      </span>
      <div className="relative">
        <input
          type={isPassword && show ? "text" : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-[#e2e2e2] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa09b] hover:text-[#333935]"
            tabIndex={-1}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </label>
  );
}

export function SocialButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {["Google", "Apple"].map((p) => (
        <button
          key={p}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#e2e2e2] bg-white py-2.5 text-sm font-semibold text-[#333935] transition hover:bg-[#f6f6f6]"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
