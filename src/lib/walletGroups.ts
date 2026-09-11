export type WalletNetworkGroup = {
  network: string;
  addresses: string[];
};

export type WalletCoinGroup = {
  coin: string;
  networks: WalletNetworkGroup[];
};

export function groupWalletsByAsset(
  wallets: Array<{ coin: string; network: string; address: string }>,
): WalletCoinGroup[] {
  const groups = new Map<string, Map<string, string[]>>();

  for (const wallet of wallets) {
    const coin = (wallet.coin || "Wallet").trim() || "Wallet";
    const network = (wallet.network || "General").trim() || "General";

    if (!groups.has(coin)) {
      groups.set(coin, new Map());
    }

    const networkMap = groups.get(coin)!;
    const addresses = networkMap.get(network) ?? [];
    addresses.push(wallet.address);
    networkMap.set(network, addresses);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([coin, networkMap]) => ({
      coin,
      networks: Array.from(networkMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([network, addresses]) => ({ network, addresses })),
    }));
}
