import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { fetchCreatorWeb3Vault, type CryptoWalletEntry } from "../../data/db";
import {
  checkDepositEligibility,
  getDepositConfig,
  EDITIONS_CHANGED_EVENT,
} from "../../data/editions";
import {
  fetchMultiChainVaultBalances,
  type MultiChainVaultBalance,
} from "../../../lib/onChainBalance";
import { shortHex } from "./editionsFormat";

/**
 * Loads the signed-in collector's Web3 vault (wallets + balances) and exposes the
 * deposit-gate check shared by every editions purchase flow.
 */
export function useEditionVault() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<CryptoWalletEntry[]>([]);
  const [balances, setBalances] = useState<MultiChainVaultBalance | null>(null);
  const [nscBalance, setNscBalance] = useState(0);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const depositConfig = useMemo(() => getDepositConfig(), []);

  const refresh = () => setRefreshIndex((i) => i + 1);

  // Auto-refresh vault data when editions/presale events fire or user switches back to tab
  useEffect(() => {
    const handleSync = () => setRefreshIndex((i) => i + 1);
    window.addEventListener(EDITIONS_CHANGED_EVENT, handleSync);
    window.addEventListener("focus", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(EDITIONS_CHANGED_EVENT, handleSync);
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      try {
        let vault = await fetchCreatorWeb3Vault(user.id);
        if (!vault?.wallets?.length && user.slug && user.slug !== user.id) {
          vault = await fetchCreatorWeb3Vault(user.slug);
        }
        const list = [...(vault?.wallets || [])];
        const hasTrx = list.some((w) => w.coin.toUpperCase() === "TRX");
        const tronEntry = list.find(
          (w) => w.network?.includes("TRC") || w.address?.startsWith("T"),
        );
        if (!hasTrx && tronEntry) {
          list.push({
            coin: "TRX",
            network: "TRC20",
            name: "TRON (Native TRX)",
            address: tronEntry.address,
            derivationPath: tronEntry.derivationPath,
          });
        }
        setWallets(list);

        const nscInVault = vault?.tokenBalances?.nsc ?? 0;
        let cachedNsc = 0;
        const evmAddr =
          vault?.addresses?.evm || list.find((w) => w.coin === "ETH" || w.coin === "NSC")?.address;
        if (evmAddr && typeof window !== "undefined") {
          const stored = localStorage.getItem(`ns_nsc_balance_${evmAddr}`);
          if (stored) cachedNsc = parseFloat(stored) || 0;
        }
        const resolvedNsc = Math.max(nscInVault, cachedNsc);
        if (active) setNscBalance(resolvedNsc);

        if (list.length > 0) {
          const next = await fetchMultiChainVaultBalances(list, {
            tokenBalances: vault?.tokenBalances,
          });
          if (active) setBalances(next);
        }
      } catch (e) {
        console.error("Failed to load Web3 vault:", e);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, refreshIndex]);

  const primaryEvmAddress = useMemo(
    () =>
      wallets.find((w) => w.coin === "ETH" || w.network === "ERC20" || w.network === "Base")
        ?.address ?? null,
    [wallets],
  );

  const walletLabel = primaryEvmAddress
    ? shortHex(primaryEvmAddress)
    : wallets[0]
      ? shortHex(wallets[0].address)
      : "Connect Wallet";

  const checkPurchaseGate = () => {
    const balanceOf = (coin: string) => balances?.assets.find((a) => a.coin === coin)?.balance || 0;
    return checkDepositEligibility({
      nsc: nscBalance || balanceOf("NSC"),
      eth: balanceOf("ETH"),
      sol: balanceOf("SOL"),
      usdt: balanceOf("USDT"),
      usdc: balanceOf("USDC"),
      btc: balanceOf("BTC"),
      totalUsd: balances?.totalUsd,
    });
  };

  return {
    user,
    wallets,
    balances,
    nscBalance,
    depositConfig,
    primaryEvmAddress,
    walletLabel,
    checkPurchaseGate,
    refresh,
  };
}
