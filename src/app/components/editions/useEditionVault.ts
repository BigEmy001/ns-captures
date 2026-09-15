import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { fetchCreatorWeb3Vault, type CryptoWalletEntry } from "../../data/db";
import { checkDepositEligibility, getDepositConfig } from "../../data/editions";
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
  const [refreshIndex, setRefreshIndex] = useState(0);
  const depositConfig = useMemo(() => getDepositConfig(), []);

  const refresh = () => setRefreshIndex((i) => i + 1);

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      try {
        let vault = await fetchCreatorWeb3Vault(user.id);
        if (!vault?.wallets?.length && user.slug && user.slug !== user.id) {
          vault = await fetchCreatorWeb3Vault(user.slug);
        }
        if (!active) return;
        const list = vault?.wallets || [];
        setWallets(list);
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
    depositConfig,
    primaryEvmAddress,
    walletLabel,
    checkPurchaseGate,
    refresh,
  };
}
