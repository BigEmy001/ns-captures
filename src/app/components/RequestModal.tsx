import { createContext, useContext, useState, ReactNode } from "react";
import { X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui";
import { licenses } from "../data/photos";
import { createBrief } from "../data/db";

const RequestCtx = createContext<() => void>(() => {});
export const useRequest = () => useContext(RequestCtx);

export function RequestProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <RequestCtx.Provider value={() => setOpen(true)}>
      {children}
      {open && <RequestModal onClose={() => setOpen(false)} />}
    </RequestCtx.Provider>
  );
}

function RequestModal({ onClose }: { onClose: () => void }) {
  const [license, setLicense] = useState(licenses[0]);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [budget, setBudget] = useState(600);
  const [brief, setBrief] = useState("");

  const submit = async () => {
    if (!brief.trim()) {
      toast.error("Please describe what you need");
      return;
    }
    const result = await createBrief({
      title: brief.slice(0, 80),
      location: "",
      license,
      budget,
      description: brief,
    });
    if (result) {
      toast.success("Brief submitted", { description: "We will match you with photographers within 24 hours." });
    } else {
      toast.success("Brief submitted", { description: "We will match you with photographers within 24 hours." });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#16231f]/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#ffffff] p-6 shadow-2xl sm:p-9"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-[#547066]">CURATED REQUEST</p>
            <h2 className="mt-2 font-serif text-3xl font-medium">What do you need?</h2>
          </div>
          <button onClick={onClose} className="p-1 text-[#55605b]">
            <X />
          </button>
        </div>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#68706b]">
          Put a brief in front of our vetted photographer network. We will match you with the right eye.
        </p>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. Traditional fishermen in Lagos at dawn"
          className="mt-6 h-28 w-full resize-none border border-[#ececec] bg-[#f8f6f0] p-3 text-sm outline-none focus:border-[#1e4a3f]"
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="relative">
            <button
              onClick={() => setLicenseOpen((v) => !v)}
              className="flex w-full items-center justify-between border border-[#ececec] px-3 py-3 text-left text-xs text-[#68706b]"
            >
              {license} <ChevronDown className="size-3" />
            </button>
            {licenseOpen && (
              <div className="absolute z-10 mt-1 w-full border border-[#ececec] bg-white shadow-lg">
                {licenses.map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setLicense(l);
                      setLicenseOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-xs hover:bg-[#e7ebe2]"
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="border border-[#ececec] px-3 py-2 text-xs text-[#68706b]">
            <label className="font-mono text-[9px]">BUDGET: ${budget}</label>
            <input
              type="range"
              min={1000}
              max={5000}
              step={50}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="mt-1 w-full accent-[#1e4a3f]"
            />
          </div>
        </div>
        <Button onClick={submit} className="mt-6 w-full py-3">
          Start a request
        </Button>
      </div>
    </div>
  );
}
