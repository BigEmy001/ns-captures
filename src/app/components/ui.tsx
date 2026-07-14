import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export function PartnerButton({
  label = "Become a partner",
  onClick,
  className = "",
}: {
  label?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-3.5 rounded-full bg-[#efeee9] p-1 pr-6 text-[#18211f] transition-all duration-300 ease-out hover:text-white cursor-pointer select-none border border-[#e2e0d7]/30 ${className}`}
    >
      {/* The expanding circle */}
      <div className="absolute left-1 top-1 size-9 rounded-full bg-[#1e4a3f] transition-all duration-500 ease-out group-hover:w-[calc(100%-8px)] z-0" />
      
      {/* Arrow Icon */}
      <div className="relative z-10 flex size-9 items-center justify-center rounded-full text-white bg-transparent">
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
      
      {/* Text Label */}
      <span className="relative z-10 text-sm font-bold tracking-wide transition-colors duration-300">
        {label}
      </span>
    </button>
  );
}

export function Monogram({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-full bg-[#1e4a3f] font-serif text-lg italic text-[#ffffff]">
        N
      </span>
      <span className={`text-sm font-bold tracking-[0.14em] ${light ? "text-white" : "text-[#18211f]"}`}>
        NS CAPTURES
      </span>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[10px] tracking-[0.18em] text-[#49685d]">{children}</p>;
}

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "solid" | "outline" | "ghost" | "light";
  className?: string;
  type?: "button" | "submit";
};

export function Button({ children, onClick, variant = "solid", className = "", type = "button" }: BtnProps) {
  const baseClasses =
    "group relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 ease-out overflow-hidden select-none cursor-pointer border ns-shadow-sm hover:-translate-y-0.5";

  const variants = {
    solid: {
      button: "bg-[#1e4a3f] border-[#1e4a3f] text-white",
      circle: "bg-[#123b31]", // darker green expands
      text: "relative z-10 transition-colors duration-300 text-white",
    },
    outline: {
      button: "bg-white border-[#e2e2e2] text-[#18211f]",
      circle: "bg-[#1e4a3f]", // green expands
      text: "relative z-10 transition-colors duration-300 text-[#18211f] group-hover:text-white",
    },
    ghost: {
      button: "bg-transparent border-transparent text-[#1e4a3f]",
      circle: "bg-[#e7ebe2]", // light green expands
      text: "relative z-10 transition-colors duration-300 text-[#1e4a3f]",
    },
    light: {
      button: "border-white/50 bg-white/10 text-white backdrop-blur-sm",
      circle: "bg-white", // white expands
      text: "relative z-10 transition-colors duration-300 text-white group-hover:text-[#1e4a3f]",
    },
  };

  const current = variants[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClasses} ${current.button} ${className}`}
    >
      {/* The expanding hover circle */}
      <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-0 rounded-full transition-all duration-500 ease-out group-hover:size-[280px] z-0 ${current.circle}`} />
      
      {/* Label/Icon (stays on top) */}
      <span className={current.text}>
        {children}
      </span>
    </button>
  );
}

export function Badge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "muted" }) {
  const t =
    tone === "green"
      ? "bg-[#dce8df] text-[#285746]"
      : "bg-[#ece9df] text-[#6d746e]";
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.08em] ${t}`}>
      {children}
    </span>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] tracking-[0.1em] text-[#758078]">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
    </div>
  );
}
