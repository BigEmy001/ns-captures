import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getExplorerUrl,
  fetchTronUsdtBalance,
  fetchBitcoinBalance,
  fetchEthereumBalances,
  fetchSolanaBalance,
  fetchMultiChainVaultBalances,
  DEFAULT_EXCHANGE_RATES,
} from "./onChainBalance";

describe("onChainBalance Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getExplorerUrl", () => {
    it("returns correct TronScan URL for TRON network", () => {
      const url = getExplorerUrl("USDT", "TRC20", "TJm5...xyz");
      expect(url).toBe("https://tronscan.org/#/address/TJm5...xyz");
    });

    it("returns mempool.space for Bitcoin SegWit", () => {
      const url = getExplorerUrl(
        "BTC",
        "Native SegWit",
        "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      );
      expect(url).toBe("https://mempool.space/address/bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq");
    });

    it("returns Etherscan for Ethereum EVM addresses", () => {
      const url = getExplorerUrl("ETH", "Ethereum", "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B");
      expect(url).toBe("https://etherscan.io/address/0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B");
    });

    it("returns Solscan for Solana addresses", () => {
      const url = getExplorerUrl("SOL", "Solana", "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
      expect(url).toBe("https://solscan.io/account/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
    });

    it("returns PolygonScan for Polygon network", () => {
      const url = getExplorerUrl("USDT", "Polygon", "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B");
      expect(url).toBe(
        "https://polygonscan.com/address/0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
      );
    });
  });

  describe("fetchTronUsdtBalance", () => {
    it("returns 0 for invalid or empty address", async () => {
      const bal = await fetchTronUsdtBalance("");
      expect(bal).toBe(0);
    });

    it("parses TRC-20 USDT token balance accurately", async () => {
      const mockTronGrid = {
        data: [
          {
            trc20: [
              {
                TR7NHqjekKQxGTCi8q8ZY4pL8otSzgjLj6: "16060000000", // 16,060 USDT (6 decimals)
              },
            ],
          },
        ],
      };

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockTronGrid,
      } as Response);

      const bal = await fetchTronUsdtBalance("TJm5Xz...");
      expect(bal).toBe(16060);
    });
  });

  describe("fetchBitcoinBalance", () => {
    it("parses satoshis from Blockstream response", async () => {
      const mockBlockstream = {
        chain_stats: {
          funded_txo_sum: 250000000, // 2.5 BTC
          spent_txo_sum: 50000000, // 0.5 BTC
        },
        mempool_stats: {
          funded_txo_sum: 0,
          spent_txo_sum: 0,
        },
      };

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlockstream,
      } as Response);

      const bal = await fetchBitcoinBalance("bc1q...");
      expect(bal).toBe(2);
    });
  });

  describe("fetchEthereumBalances", () => {
    it("parses ETH and USDT ERC-20 from JSON-RPC calls", async () => {
      // Mock 1: eth_getBalance -> 1.5 ETH (1.5 * 10^18 wei = 0x14d1120d7b160000)
      // Mock 2: eth_call (balanceOf) -> 5,000 USDT (5000 * 10^6 = 5,000,000,000 = 0x12a05f200)
      vi.spyOn(global, "fetch")
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jsonrpc: "2.0", id: 1, result: "0x14d1120d7b160000" }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jsonrpc: "2.0", id: 2, result: "0x12a05f200" }),
        } as Response);

      const balances = await fetchEthereumBalances("0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B");
      expect(balances.eth).toBeCloseTo(1.5, 4);
      expect(balances.usdt).toBe(5000);
    });
  });

  describe("fetchSolanaBalance", () => {
    it("parses SOL balance from JSON-RPC call", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: "2.0", id: 1, result: { value: 2500000000 } }), // 2.5 SOL
      } as Response);

      const balances = await fetchSolanaBalance("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
      expect(balances.sol).toBe(2.5);
    });
  });

  describe("fetchMultiChainVaultBalances", () => {
    it("aggregates portfolio with simulated settlement allocation when specified", async () => {
      // Mock fetch to simulate network offline / empty
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("network"));

      const wallets = [
        { coin: "USDT", network: "TRC20", address: "TMX...1" },
        { coin: "BTC", network: "Native SegWit", address: "bc1q...2" },
      ];

      const res = await fetchMultiChainVaultBalances(wallets, {
        simulatedSettlementAmount: 16060,
      });

      expect(res.assets.length).toBe(2);
      const usdtAsset = res.assets.find((a) => a.coin === "USDT");
      expect(usdtAsset).toBeDefined();
      expect(usdtAsset?.balance).toBe(16060);
      expect(usdtAsset?.status).toBe("simulated");
      expect(usdtAsset?.fiatUsd).toBe(16060 * DEFAULT_EXCHANGE_RATES.USDT.usd);
      expect(usdtAsset?.fiatGbp).toBe(16060 * DEFAULT_EXCHANGE_RATES.USDT.gbp);
      expect(res.totalUsd).toBeGreaterThanOrEqual(16060);
    });
  });
});
