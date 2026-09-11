import { describe, expect, it } from "vitest";
import { groupWalletsByAsset } from "./walletGroups";

describe("groupWalletsByAsset", () => {
  it("groups wallets by asset and network, and keeps each address inside the group", () => {
    const groups = groupWalletsByAsset([
      { coin: "USDT", network: "TRC20", address: "T-1" },
      { coin: "USDT", network: "ERC20", address: "E-1" },
      { coin: "BTC", network: "Bitcoin", address: "B-1" },
      { coin: "USDT", network: "TRC20", address: "T-2" },
      { coin: "SOL", network: "Solana", address: "S-1" },
    ]);

    expect(groups).toHaveLength(4);
    expect(groups.map((g) => g.coin)).toEqual(["BTC", "SOL", "USDT", "USDT"]);
    expect(groups[2].addresses.map((a) => a.address)).toEqual(["E-1"]);
    expect(groups[3].addresses.map((a) => a.address)).toEqual(["T-1", "T-2"]);
  });

  it("falls back to a generic wallet label when later data is missing", () => {
    const groups = groupWalletsByAsset([{ coin: "ETH", network: "", address: "0xabc" }]);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("ETH");
    expect(groups[0].addresses[0].address).toBe("0xabc");
  });
});
