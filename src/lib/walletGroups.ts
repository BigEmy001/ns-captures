export type WalletGroupEntry = {
  coin: string;
  network: string;
  label: string;
  addresses: Array<{
    coin: string;
    network: string;
    address: string;
  }>;
};

export function groupWalletsByAsset(
  wallets: Array<{ coin: string; network: string; address: string }>,
) {
  const groups = new Map<string, WalletGroupEntry>();

  for (const wallet of wallets) {
    const coin = (wallet.coin || "Wallet").trim() || "Wallet";
    const network = (wallet.network || "General").trim() || "General";
    const key = `${coin}::${network}`;

    const item = groups.get(key) ?? {
      coin,
      network,
      label: coin,
      addresses: [],
    };

    item.addresses.push({
      coin,
      network,
      address: wallet.address,
    });

    groups.set(key, item);
  }

  return Array.from(groups.values()).sort((a, b) => {
    const coinDelta = a.coin.localeCompare(b.coin);
    if (coinDelta !== 0) return coinDelta;
    return a.network.localeCompare(b.network);
  });
}
