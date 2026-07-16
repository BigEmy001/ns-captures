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
      <svg
        viewBox="0 0 700 700"
        className="size-9 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main letters */}
        <path
          d="M408.602 226.458C416.585 225.749 432.633 226.199 441.109 226.203L502.536 226.264L511.721 270.435C489.584 270.727 467.246 270.05 445.222 270.43C423.021 270.812 397.602 266.65 380.618 284.038C367.723 297.071 368.086 316.828 380.126 330.203C396.255 348.115 416.803 345.815 438.706 345.628C449.198 345.538 459.617 345.597 470.044 347.47C509.261 354.515 542.696 387.258 542.954 428.725C543.269 449.967 534.874 470.402 519.721 485.289C496.189 508.636 471.278 510.902 440.311 510.845C390.118 511.257 366.933 508.853 334.869 466.507C375.449 466.088 415.932 466.927 456.665 466.298C490.568 465.773 513.019 427.5 485.842 402.315C464.568 382.593 430.456 392.903 404.094 389.041C365.61 383.412 330.24 353.352 326.393 313.257C324.466 292.947 330.828 272.721 344.046 257.175C360.747 237.129 383.328 228.872 408.602 226.458Z"
          fill={light ? "#ffffff" : "#1e4a3f"}
        />
        <path
          d="M138.549 203.895C143.958 207.542 157.137 220.77 162.5 225.923L208.173 269.811L399.595 455.635C377.87 456.2 354.693 455.805 332.862 455.788L267.833 392.346C239.7 364.608 211.37 337.065 182.846 309.724C181.664 373.474 182.894 439.015 182.499 503.03C168.095 503.457 152.733 503.28 138.325 503.062L138.311 309.433C138.303 275.469 137.478 237.609 138.549 203.895Z"
          fill={light ? "#ffffff" : "#1e4a3f"}
        />
        {/* Trademark Dot */}
        <path
          d="M534.4 190.718C546.609 187.6 559.052 194.927 562.246 207.12C565.439 219.314 558.189 231.8 546.012 235.07C533.738 238.369 521.117 231.042 517.892 218.74C514.666 206.438 522.077 193.864 534.4 190.718Z"
          fill={light ? "#5af2b3" : "#0B3D2F"}
        />
      </svg>
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
  size?: "sm" | "md";
  className?: string;
  type?: "button" | "submit";
};

export function Button({ children, onClick, variant = "solid", size = "md", className = "", type = "button" }: BtnProps) {
  const sizeClasses = size === "sm" ? "px-4 py-1.5 text-xs" : "px-6 py-2.5 text-sm";
  const baseClasses =
    `group relative inline-flex items-center justify-center gap-2 rounded-full ${sizeClasses} font-semibold transition-all duration-300 ease-out overflow-hidden select-none cursor-pointer border ns-shadow-sm hover:-translate-y-0.5`;

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

export function Badge({ children, tone = "green", size = "md", className = "" }: { children: ReactNode; tone?: "green" | "muted" | "red"; size?: "sm" | "md"; className?: string }) {
  const t =
    tone === "green"
      ? "bg-[#dce8df] text-[#285746]"
      : tone === "red"
      ? "bg-[#fcf1f3] text-[#d4183d]"
      : "bg-[#ece9df] text-[#6d746e]";
  const s = size === "sm" ? "px-2 py-0.5 text-[8px]" : "px-2.5 py-1 text-[9px]";
  return (
    <span className={`inline-block rounded-full font-mono tracking-[0.08em] ${t} ${s} ${className}`}>
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
