import { describe, expect, it } from "vitest";
import { groupWalletsByAsset } from "./walletGroups";

describe("groupWalletsByAsset", () => {
  it("groups all wallet addresses under the same coin, with networks nested inside", () => {
    const groups = groupWalletsByAsset([
      { coin: "USDT", network: "TRC20", address: "T-1" },
      { coin: "USDT", network: "ERC20", address: "E-1" },
      { coin: "BTC", network: "Bitcoin", address: "B-1" },
      { coin: "USDT", network: "TRC20", address: "T-2" },
      { coin: "SOL", network: "Solana", address: "S-1" },
      { coin: "ETH", network: "Base", address: "0xbase" },
      { coin: "ETH", network: "ERC20", address: "0xeth" },
    ]);

    expect(groups.map((g) => g.coin)).toEqual(["BTC", "ETH", "SOL", "USDT"]);
    expect(groups[1].networks.map((n) => n.network)).toEqual(["Base", "ERC20"]);
    expect(groups[1].networks[0].addresses).toEqual(["0xbase"]);
    expect(groups[3].networks.find((n) => n.network === "TRC20")?.addresses).toEqual([
      "T-1",
      "T-2",
    ]);
    expect(groups[3].networks.find((n) => n.network === "ERC20")?.addresses).toEqual(["E-1"]);
  });

  it("falls back to a generic coin label when the wallet data is incomplete", () => {
    const groups = groupWalletsByAsset([{ coin: "ETH", network: "", address: "0xabc" }]);

    expect(groups).toHaveLength(1);
    expect(groups[0].coin).toBe("ETH");
    expect(groups[0].networks[0].network).toBe("General");
    expect(groups[0].networks[0].addresses).toEqual(["0xabc"]);
  });
});
