import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  Sparkles,
  ShieldAlert,
  Coins,
  FileCheck,
  Sliders,
  Award,
  Check,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  getStoredEditions,
  saveStoredEditions,
  getStoredOwnerships,
  getDepositConfig,
  saveDepositConfig,
  isEditionsPublic,
  setEditionsPublic,
  type DigitalEdition,
  type DepositGateConfig,
} from "../../data/editions";

export function EditionsPanel() {
  const [activeTab, setActiveTab] = useState<"catalog" | "gate" | "ledger">("catalog");
  const [editions, setEditions] = useState<DigitalEdition[]>(() => getStoredEditions());
  const [ownerships] = useState(() => getStoredOwnerships());
  const [depositConfig, setDepositConfig] = useState<DepositGateConfig>(() => getDepositConfig());
  const [savingConfig, setSavingConfig] = useState(false);
  const [isPublicVisible, setIsPublicVisible] = useState(() => isEditionsPublic());

  // Metrics
  const stats = useMemo(() => {
    const totalListed = editions.length;
    const totalInventoryValue = editions.reduce((sum, e) => sum + e.priceGbp * e.totalEditions, 0);
    const totalSoldAmount = ownerships.reduce((sum, o) => sum + o.purchasePriceGbp, 0);
    const totalRoyaltiesPaid = Math.round(totalSoldAmount * 0.1);

    return {
      totalListed,
      totalInventoryValue,
      totalSoldAmount,
      totalRoyaltiesPaid,
    };
  }, [editions, ownerships]);

  // Toggle Featured drop for hero spotlight
  const handleToggleFeatured = (editionId: string) => {
    const updated = editions.map((e) => ({
      ...e,
      featured: e.id === editionId ? !e.featured : false, // spotlight one at a time
    }));
    setEditions(updated);
    saveStoredEditions(updated);
    toast.success("Updated hero spotlight edition on /editions");
  };

  // Toggle status
  const handleToggleStatus = (editionId: string) => {
    const updated: DigitalEdition[] = editions.map((e) => {
      if (e.id === editionId) {
        return {
          ...e,
          status: e.status === "listed" ? ("archived" as const) : ("listed" as const),
        };
      }
      return e;
    });
    setEditions(updated);
    saveStoredEditions(updated);
    toast.success("Edition listing status updated");
  };

  // Save Deposit Gate Config
  const handleSaveConfig = () => {
    setSavingConfig(true);
    saveDepositConfig(depositConfig);
    setTimeout(() => {
      setSavingConfig(false);
      toast.success("Web3 deposit gating settings updated successfully");
    }, 300);
  };

  const handleTogglePublicVisibility = () => {
    const next = !isPublicVisible;
    setIsPublicVisible(next);
    setEditionsPublic(next);
    toast.success(
      next
        ? "Digital Editions room is now VISIBLE to the public on /editions"
        : "Digital Editions room is now HIDDEN from the public (Admin preview only)",
    );
  };

  return (
    <div className="space-y-6">
      {/* Public Marketplace Visibility Control */}
      <div className="p-5 rounded-2xl border border-[#ececec] bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-base font-semibold text-[#18211f]">
              Public Marketplace Visibility (/editions)
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                isPublicVisible
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              {isPublicVisible ? "● Live to Public" : "● Hidden from Public (Admin Preview Only)"}
            </span>
          </div>
          <p className="text-xs text-[#6b716d] leading-relaxed max-w-2xl">
            Control whether the Digital Editions room and its navigation links are publicly visible to all website visitors, or hidden and restricted to private administrator preview.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <Link
            to="/editions"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-medium text-[#1e4a3f] bg-[#1e4a3f]/10 hover:bg-[#1e4a3f]/15 border border-[#1e4a3f]/20 transition"
          >
            <span>Preview /editions</span>
            <ExternalLink className="size-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleTogglePublicVisibility}
            aria-pressed={isPublicVisible}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isPublicVisible ? "bg-[#1e4a3f]" : "bg-gray-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isPublicVisible ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[#ececec] bg-white shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#758078] font-mono uppercase">
            <span>Active Masterworks</span>
            <Sparkles className="size-4 text-[#d4af37]" />
          </div>
          <p className="font-serif text-2xl font-bold text-[#18211f]">
            {stats.totalListed} Editions
          </p>
          <span className="text-[11px] text-[#758078]">Curated on-platform inventory</span>
        </div>

        <div className="p-4 rounded-xl border border-[#ececec] bg-white shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#758078] font-mono uppercase">
            <span>Curated Inventory Value</span>
            <Coins className="size-4 text-[#1e4a3f]" />
          </div>
          <p className="font-serif text-2xl font-bold text-[#18211f]">
            £{stats.totalInventoryValue.toLocaleString("en-GB")}
          </p>
          <span className="text-[11px] text-[#758078]">Across all available series</span>
        </div>

        <div className="p-4 rounded-xl border border-[#ececec] bg-white shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#758078] font-mono uppercase">
            <span>Total Edition Volume</span>
            <TrendingUp className="size-4 text-emerald-600" />
          </div>
          <p className="font-serif text-2xl font-bold text-emerald-700">
            £{stats.totalSoldAmount.toLocaleString("en-GB")}
          </p>
          <span className="text-[11px] text-[#758078]">
            {ownerships.length} Certificates of Authenticity issued
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[#ececec] bg-white shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#758078] font-mono uppercase">
            <span>10% Creator Royalties</span>
            <Award className="size-4 text-[#1e4a3f]" />
          </div>
          <p className="font-serif text-2xl font-bold text-[#1e4a3f]">
            £{stats.totalRoyaltiesPaid.toLocaleString("en-GB")}
          </p>
          <span className="text-[11px] text-[#758078]">Disbursed to photographer earnings</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-[#ececec] pb-2">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "catalog"
              ? "bg-[#1e4a3f] text-white shadow-sm"
              : "bg-white text-[#59645f] hover:text-[#18211f] border border-[#ececec]"
          }`}
        >
          Curated Inventory ({editions.length})
        </button>

        <button
          onClick={() => setActiveTab("gate")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === "gate"
              ? "bg-[#1e4a3f] text-white shadow-sm"
              : "bg-white text-[#59645f] hover:text-[#18211f] border border-[#ececec]"
          }`}
        >
          <Sliders className="size-3.5" />
          <span>Web3 Deposit Gating Rules</span>
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === "ledger"
              ? "bg-[#1e4a3f] text-white shadow-sm"
              : "bg-white text-[#59645f] hover:text-[#18211f] border border-[#ececec]"
          }`}
        >
          <FileCheck className="size-3.5" />
          <span>COA Registry & Royalties</span>
        </button>
      </div>

      {/* TAB 1: CURATED CATALOG */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#758078]">
              Manage live digital masterworks. Click "Hero Spotlight" to change the featured artist
              drop on the <strong>/editions</strong> gallery page.
            </p>
            <a
              href="/editions"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1e4a3f] hover:underline"
            >
              <span>View Live Editions Room</span>
              <ExternalLink className="size-3.5" />
            </a>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#ececec] bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] border-b border-[#ececec] text-[#59645f] font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Masterwork</th>
                  <th className="py-3 px-4">Artist</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Inventory</th>
                  <th className="py-3 px-4">Valuation</th>
                  <th className="py-3 px-4">Spotlight Drop</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ececec]">
                {editions.map((ed) => (
                  <tr key={ed.id} className="hover:bg-[#FAF9F5]/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={ed.image}
                          alt={ed.title}
                          className="size-10 rounded-lg object-cover border border-[#ececec]"
                        />
                        <div className="min-w-0">
                          <p className="font-serif font-semibold text-[#18211f] truncate max-w-[200px]">
                            {ed.title}
                          </p>
                          <span className="font-mono text-[10px] text-[#758078]">{ed.tokenId}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-medium text-[#18211f]">{ed.photographerName}</td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                          ed.tier === "genesis_1_of_1"
                            ? "bg-[#d4af37]/20 text-[#8a6b10]"
                            : "bg-[#1e4a3f]/10 text-[#1e4a3f]"
                        }`}
                      >
                        {ed.tier === "genesis_1_of_1" ? "Genesis 1/1" : "Numbered Run"}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {ed.availableEditions} of {ed.totalEditions} left
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-serif font-bold text-[#18211f]">
                        £{ed.priceGbp.toLocaleString("en-GB")}
                      </span>
                      <span className="block text-[10px] text-[#758078] font-mono">
                        ≈ {ed.priceEth} ETH
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleFeatured(ed.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          ed.featured
                            ? "bg-[#d4af37] text-[#0d1714] shadow-sm font-bold"
                            : "bg-gray-100 text-[#59645f] hover:bg-gray-200"
                        }`}
                      >
                        <Sparkles className="size-3" />
                        <span>{ed.featured ? "Hero Active" : "Set Spotlight"}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(ed.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          ed.status === "listed"
                            ? "text-red-700 bg-red-50 hover:bg-red-100"
                            : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                        }`}
                      >
                        {ed.status === "listed" ? "Archive" : "Publish"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DEPOSIT GATING SETTINGS */}
      {activeTab === "gate" && (
        <div className="max-w-2xl bg-white p-6 rounded-2xl border border-[#ececec] shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-[#1e4a3f]" />
              <h3 className="font-serif text-lg font-semibold text-[#18211f]">
                Web3 Deposit Verification Gate
              </h3>
            </div>
            <p className="text-xs text-[#758078] mt-1">
              Creators must maintain an active deposit in their self-custody Web3 vault across
              either Ethereum, Solana, TRON, or Bitcoin to list or mint digital editions.
            </p>
          </div>

          {/* Master Enforce Toggle */}
          <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#ececec] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#18211f] block">
                Enforce Deposit Gate Requirement
              </span>
              <span className="text-[11px] text-[#758078]">
                When disabled, creators can mint digital editions without holding vault balances.
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setDepositConfig((prev) => ({
                  ...prev,
                  enforceDepositGate: !prev.enforceDepositGate,
                }))
              }
              className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                depositConfig.enforceDepositGate
                  ? "bg-[#1e4a3f] justify-end"
                  : "bg-gray-300 justify-start"
              }`}
            >
              <div className="size-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Thresholds by Network */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#59645f] font-semibold">
              Minimum Balance Verification Thresholds
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#18211f] block mb-1">
                  Ethereum Threshold (ETH)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={depositConfig.ethThreshold}
                  onChange={(e) =>
                    setDepositConfig((prev) => ({
                      ...prev,
                      ethThreshold: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white border border-[#ececec] rounded-xl text-xs font-mono focus:outline-none focus:border-[#1e4a3f]"
                />
                <span className="text-[10px] text-[#758078] mt-0.5 block">
                  Default: 0.006 ETH (~$15–$20)
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-[#18211f] block mb-1">
                  Solana Threshold (SOL)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={depositConfig.solThreshold}
                  onChange={(e) =>
                    setDepositConfig((prev) => ({
                      ...prev,
                      solThreshold: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white border border-[#ececec] rounded-xl text-xs font-mono focus:outline-none focus:border-[#1e4a3f]"
                />
                <span className="text-[10px] text-[#758078] mt-0.5 block">
                  Default: 0.15 SOL (~$20)
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-[#18211f] block mb-1">
                  Tether Threshold (USDT on TRC-20 / ERC-20)
                </label>
                <input
                  type="number"
                  step="5"
                  value={depositConfig.usdtThreshold}
                  onChange={(e) =>
                    setDepositConfig((prev) => ({
                      ...prev,
                      usdtThreshold: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white border border-[#ececec] rounded-xl text-xs font-mono focus:outline-none focus:border-[#1e4a3f]"
                />
                <span className="text-[10px] text-[#758078] mt-0.5 block">Default: 20.00 USDT</span>
              </div>

              <div>
                <label className="text-xs font-medium text-[#18211f] block mb-1">
                  Bitcoin Threshold (BTC)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={depositConfig.btcThreshold}
                  onChange={(e) =>
                    setDepositConfig((prev) => ({
                      ...prev,
                      btcThreshold: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white border border-[#ececec] rounded-xl text-xs font-mono focus:outline-none focus:border-[#1e4a3f]"
                />
                <span className="text-[10px] text-[#758078] mt-0.5 block">Default: 0.0003 BTC</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#ececec] flex justify-end">
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e4a3f] text-white text-xs font-semibold hover:bg-[#163830] transition shadow-sm"
            >
              {savingConfig ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>Save Gate Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: OWNERSHIP REGISTRY & ROYALTIES */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#758078]">
              Official record of issued Certificates of Authenticity (COA) and 10% secondary creator
              royalty transactions.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#ececec] bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] border-b border-[#ececec] text-[#59645f] font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Certificate Serial</th>
                  <th className="py-3 px-4">Collector / Owner</th>
                  <th className="py-3 px-4">Edition Serial</th>
                  <th className="py-3 px-4">Price Paid</th>
                  <th className="py-3 px-4">Creator 10% Cut</th>
                  <th className="py-3 px-4">Issue Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ececec]">
                {ownerships.map((own) => (
                  <tr key={own.id} className="hover:bg-[#FAF9F5]/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#1e4a3f]">
                      {own.certificateNumber}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#18211f]">{own.ownerName}</p>
                      <span className="text-[10px] text-[#758078] font-mono">
                        {own.ownerEmail || own.ownerWalletAddress?.substring(0, 10) + "..."}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-[#1e4a3f]/10 text-[#1e4a3f] font-semibold text-[10px]">
                        {own.serialDisplay}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#18211f]">
                      £{own.purchasePriceGbp.toFixed(2)} ({own.purchaseCurrency})
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                      £{(own.purchasePriceGbp * 0.1).toFixed(2)} (Disbursed)
                    </td>
                    <td className="py-3 px-4 font-mono text-[#758078]">
                      {new Date(own.acquiredAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
