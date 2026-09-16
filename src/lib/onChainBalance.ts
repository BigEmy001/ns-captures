import { Buffer } from "buffer";
import bs58 from "bs58";

/**
 * On-Chain Balance Tracking & Multi-Chain Explorer Service
 *
 * Connects directly to public blockchain nodes and indexers (TronGrid, Blockstream,
 * Cloudflare Ethereum RPC, Solana RPC) to verify deposits and retrieve live balances
 * for Bitcoin (Native SegWit), TRON (USDT TRC-20), Ethereum (ETH & USDT ERC-20),
 * and Solana (SOL & USDT SPL).
 */

export interface AssetBalance {
  coin: string;
  network: string;
  address: string;
  balance: number;
  balanceFormatted: string;
  fiatUsd: number;
  fiatGbp: number;
  status: "live" | "unfunded" | "error";
  lastChecked: string;
  explorerUrl: string;
  txCount?: number;
  error?: string;
}

export interface MultiChainVaultBalance {
  assets: AssetBalance[];
  totalUsd: number;
  totalGbp: number;
  lastUpdated: string;
  isLive: boolean;
}

/** Estimated baseline rates in USD & GBP */
export const DEFAULT_EXCHANGE_RATES: Record<string, { usd: number; gbp: number }> = {
  NSC: { usd: 1.3, gbp: 1.0 }, // 1:1 with GBP, ~$1.30 USD
  USDT: { usd: 1.0, gbp: 0.79 },
  USDC: { usd: 1.0, gbp: 0.79 },
  BTC: { usd: 64500.0, gbp: 50950.0 },
  ETH: { usd: 3450.0, gbp: 2725.0 },
  SOL: { usd: 145.0, gbp: 114.5 },
  TRX: { usd: 0.25, gbp: 0.2 },
};

/**
 * Returns the public blockchain block explorer URL for any supported chain.
 */
export function getExplorerUrl(coin: string, network: string, address: string): string {
  const normCoin = coin.toUpperCase();
  const normNet = network.toUpperCase();

  if (normNet.includes("TRC") || normCoin === "TRX") {
    return `https://tronscan.org/#/address/${address}`;
  }
  if (normNet.includes("SOL") || normCoin === "SOL") {
    return `https://solscan.io/account/${address}`;
  }
  if (normCoin === "BTC" || normNet.includes("BITCOIN") || normNet.includes("SEGWIT")) {
    return `https://mempool.space/address/${address}`;
  }
  if (normNet.includes("POLYGON") || normNet.includes("MATIC")) {
    return `https://polygonscan.com/address/${address}`;
  }
  if (normNet.includes("ARBITRUM")) {
    return `https://arbiscan.io/address/${address}`;
  }
  if (normNet.includes("BASE")) {
    return `https://basescan.org/address/${address}`;
  }
  if (normNet.includes("BSC") || normNet.includes("BEP")) {
    return `https://bscscan.com/address/${address}`;
  }
  // Default to Ethereum Etherscan for EVM addresses
  return `https://etherscan.io/address/${address}`;
}

function createTimeoutSignal(ms: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cleanup: () => clearTimeout(id) };
}

/**
 * Fetch live TRON USDT (TRC-20) balance from TronGrid public API.
 */
export async function fetchTronUsdtBalance(address: string): Promise<number> {
  if (!address || !address.startsWith("T")) return 0;
  const USDT_TRC20_BASE58 = "TR7NHqJEKQxGTCi8q8ZY4pL8otSzgjLj6t";
  const USDT_TRC20_CONTRACT_MOCK = "TR7NHqjekKQxGTCi8q8ZY4pL8otSzgjLj6";

  // 1. Check TronGrid v1/accounts (handles accounts with TRX activation and standard API responses)
  try {
    const { signal, cleanup } = createTimeoutSignal(3500);
    const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}`, {
      headers: { Accept: "application/json" },
      signal,
    });
    cleanup();

    if (res.ok) {
      const data = await res.json();
      const account = data?.data?.[0];
      if (account?.trc20 && Array.isArray(account.trc20)) {
        for (const token of account.trc20) {
          const raw =
            token[USDT_TRC20_BASE58] ||
            token[USDT_TRC20_CONTRACT_MOCK] ||
            Object.entries(token).find(([k]) => k.toLowerCase().startsWith("tr7nhq"))?.[1];
          if (raw) {
            return Number(raw) / 1_000_000;
          }
        }
      }
    }
  } catch {
    // Proceed to direct smart contract call
  }

  // 2. Direct TRON smart contract query (balanceOf) via official TronGrid JSON-RPC.
  // Works reliably for ANY address on-chain, whether activated with TRX or not.
  try {
    const { signal, cleanup } = createTimeoutSignal(4000);
    const bs58Decoder =
      (
        bs58 as unknown as {
          default?: { decode: (s: string) => Uint8Array };
          decode: (s: string) => Uint8Array;
        }
      ).default || bs58;
    const decoded = bs58Decoder.decode(address);
    if (decoded && decoded.length === 25) {
      const hex20 = Buffer.from(decoded.slice(1, 21)).toString("hex");
      const hexParam = hex20.padStart(64, "0");

      const rpcRes = await fetch("https://api.trongrid.io/wallet/triggerconstantcontract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_address: "410000000000000000000000000000000000000000",
          contract_address: "41a614f803b6fd780986a42c78ec9c7f77e6ded13c", // TR7NHqJEKQxGTCi8q8ZY4pL8otSzgjLj6t
          function_selector: "balanceOf(address)",
          parameter: hexParam,
        }),
        signal,
      });
      cleanup();

      if (rpcRes.ok) {
        const json = await rpcRes.json();
        if (json.constant_result && json.constant_result[0]) {
          const raw = BigInt("0x" + json.constant_result[0]);
          const bal = Number(raw) / 1_000_000;
          if (bal > 0) return bal;
        }
      }
    }
  } catch {
    // fallback to Tronscan API
  }

  // 3. High-reliability fallback to Tronscan API
  try {
    const { signal, cleanup } = createTimeoutSignal(4000);
    const res = await fetch(`https://apilist.tronscanapi.com/api/account?address=${address}`, {
      headers: { Accept: "application/json" },
      signal,
    });
    cleanup();

    if (res.ok) {
      const data = await res.json();
      const token = data.trc20token_balances?.find(
        (t: { tokenAbbr?: string; symbol?: string; tokenId?: string; balance?: string | number }) =>
          t.tokenAbbr === "USDT" ||
          t.symbol === "USDT" ||
          t.tokenId?.toLowerCase() === USDT_TRC20_BASE58.toLowerCase(),
      );
      if (token && token.balance) {
        return Number(token.balance) / 1_000_000;
      }
    }
  } catch {
    // all fallbacks completed
  }

  return 0;
}

/**
 * Fetch live TRON TRX (native coin) balance from TronGrid or Tronscan.
 */
export async function fetchTronTrxBalance(address: string): Promise<number> {
  if (!address || !address.startsWith("T")) return 0;

  try {
    const { signal, cleanup } = createTimeoutSignal(3500);
    const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}`, {
      headers: { Accept: "application/json" },
      signal,
    });
    cleanup();

    if (res.ok) {
      const data = await res.json();
      const account = data?.data?.[0];
      if (account && typeof account.balance === "number") {
        return account.balance / 1_000_000;
      }
    }
  } catch {
    // Proceed to fallback
  }

  try {
    const { signal, cleanup } = createTimeoutSignal(3500);
    const res = await fetch(`https://apilist.tronscanapi.com/api/account?address=${address}`, {
      headers: { Accept: "application/json" },
      signal,
    });
    cleanup();

    if (res.ok) {
      const data = await res.json();
      if (typeof data.balance === "number") {
        return data.balance / 1_000_000;
      }
    }
  } catch {
    // fallback completed
  }

  return 0;
}

/**
 * Fetch live Bitcoin Native SegWit / legacy balance via Blockstream API.
 */
export async function fetchBitcoinBalance(address: string): Promise<number> {
  if (!address) return 0;

  const { signal, cleanup } = createTimeoutSignal(6000);
  try {
    const res = await fetch(`https://blockstream.info/api/address/${address}`, {
      headers: { Accept: "application/json" },
      signal,
    });
    cleanup();

    if (res.ok) {
      const data = await res.json();
      const chainFunded = data?.chain_stats?.funded_txo_sum || 0;
      const chainSpent = data?.chain_stats?.spent_txo_sum || 0;
      const memFunded = data?.mempool_stats?.funded_txo_sum || 0;
      const memSpent = data?.mempool_stats?.spent_txo_sum || 0;
      const sats = chainFunded - chainSpent + (memFunded - memSpent);
      return Math.max(0, sats / 100_000_000);
    }
  } catch {
    cleanup();
  }

  // Fallback to Blockchain.info query
  const fallback = createTimeoutSignal(4000);
  try {
    const res = await fetch(`https://blockchain.info/q/addressbalance/${address}?confirmations=0`, {
      signal: fallback.signal,
    });
    fallback.cleanup();
    if (res.ok) {
      const sats = parseInt(await res.text(), 10);
      if (!isNaN(sats)) return Math.max(0, sats / 100_000_000);
    }
  } catch {
    fallback.cleanup();
  }

  return 0;
}

/**
 * Fetch Ethereum native ETH and ERC-20 USDT balances via public Cloudflare JSON-RPC.
 */
export async function fetchEthereumBalances(
  address: string,
): Promise<{ eth: number; usdt: number }> {
  if (!address || !address.startsWith("0x")) return { eth: 0, usdt: 0 };

  const USDT_ERC20 = "0xdac17f958d2ee523a2206206994597c13d831ec7";
  const cleanAddr = address.replace(/^0x/, "").toLowerCase().padStart(64, "0");
  const balanceOfCallData = `0x70a08231${cleanAddr}`;

  let eth = 0;
  let usdt = 0;

  try {
    const rpcEndpoint = "https://cloudflare-eth.com";

    // 1. Fetch ETH balance
    const ethTimeout = createTimeoutSignal(5000);
    const ethRes = await fetch(rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [address, "latest"],
      }),
      signal: ethTimeout.signal,
    });
    ethTimeout.cleanup();

    if (ethRes.ok) {
      const data = await ethRes.json();
      if (data?.result && typeof data.result === "string") {
        const wei = BigInt(data.result);
        eth = Number(wei) / 1e18;
      }
    }

    // 2. Fetch USDT ERC-20 balance
    const usdtTimeout = createTimeoutSignal(5000);
    const usdtRes = await fetch(rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "eth_call",
        params: [{ to: USDT_ERC20, data: balanceOfCallData }, "latest"],
      }),
      signal: usdtTimeout.signal,
    });
    usdtTimeout.cleanup();

    if (usdtRes.ok) {
      const data = await usdtRes.json();
      if (data?.result && typeof data.result === "string" && data.result !== "0x") {
        const raw = BigInt(data.result);
        usdt = Number(raw) / 1e6; // USDT has 6 decimals
      }
    }
  } catch {
    // network / sandbox protection fallback
  }

  return { eth, usdt };
}

/**
 * Fetch Solana balance via public Solana RPC (native SOL, USDT SPL, and USDC SPL).
 */
export async function fetchSolanaBalance(
  address: string,
): Promise<{ sol: number; usdt: number; usdc: number }> {
  if (!address || address.startsWith("0x") || address.startsWith("T")) {
    return { sol: 0, usdt: 0, usdc: 0 };
  }

  let sol = 0;
  let usdt = 0;
  let usdc = 0;

  const { signal, cleanup } = createTimeoutSignal(5000);
  try {
    // 1. Fetch native SOL balance
    try {
      const rpcRes = await fetch("https://api.mainnet-beta.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [address],
        }),
        signal,
      });
      if (rpcRes.ok) {
        const data = await rpcRes.json();
        if (typeof data?.result?.value === "number") {
          sol = data.result.value / 1e9;
        }
      }
    } catch {
      // ignore individual RPC error
    }

    // 2. Fetch SPL token accounts (USDC & USDT on Solana)
    try {
      const tokenRes = await fetch("https://api.mainnet-beta.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "getTokenAccountsByOwner",
          params: [
            address,
            { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
            { encoding: "jsonParsed" },
          ],
        }),
        signal,
      });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        const accounts = tokenData?.result?.value || [];
        for (const item of accounts) {
          const info = item?.account?.data?.parsed?.info;
          const mint = info?.mint;
          const uiAmount = info?.tokenAmount?.uiAmount;
          if (typeof uiAmount === "number") {
            if (mint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") {
              usdc += uiAmount;
            } else if (mint === "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB") {
              usdt += uiAmount;
            }
          }
        }
      }
    } catch {
      // ignore token RPC error
    }
  } catch {
    // network fallback
  } finally {
    cleanup();
  }

  return { sol, usdt, usdc };
}

/**
 * Query live on-chain balances for an array of configured creator wallets.
 * Returns detailed balance breakdown and total aggregated fiat valuation.
 */
export async function fetchMultiChainVaultBalances(
  wallets: Array<{ coin: string; network: string; address: string }>,
  options?: {
    /** Native platform token balances credited in vault (e.g. NSC) */
    tokenBalances?: Record<string, number>;
  },
): Promise<MultiChainVaultBalance> {
  const assets: AssetBalance[] = [];
  let totalUsd = 0;
  let totalGbp = 0;
  const now = new Date().toISOString();

  let anyLiveSuccess = false;

  for (let i = 0; i < wallets.length; i++) {
    const w = wallets[i];
    if (!w.address || w.address.trim() === "") continue;

    const coin = w.coin.toUpperCase();
    const network = w.network.toUpperCase();
    const rates = DEFAULT_EXCHANGE_RATES[coin] || { usd: 1.0, gbp: 0.79 };
    let balance = 0;
    let status: AssetBalance["status"] = "unfunded";

    try {
      const explicitLedgerBal =
        options?.tokenBalances?.[coin.toLowerCase()] ??
        options?.tokenBalances?.[coin.toUpperCase()];

      if (typeof explicitLedgerBal === "number" && coin !== "NSC") {
        balance = explicitLedgerBal;
        status = balance > 0 ? "live" : "unfunded";
        if (balance > 0) anyLiveSuccess = true;
      } else if (coin === "NSC") {
        // Native platform token: balance managed through platform treasury & ledger
        const nscHeld =
          options?.tokenBalances?.nsc ??
          options?.tokenBalances?.NSC ??
          (typeof window !== "undefined"
            ? parseFloat(localStorage.getItem(`ns_nsc_balance_${w.address}`) || "0")
            : 0);

        // Assign to primary network (Base) so total isn't duplicated
        if (network.includes("BASE") && nscHeld > 0) {
          balance = nscHeld;
          status = "live";
          anyLiveSuccess = true;
        } else {
          balance = 0;
          status = "unfunded";
        }
      } else if (coin === "TRX") {
        balance = await fetchTronTrxBalance(w.address);
        status = balance > 0 ? "live" : "unfunded";
        if (balance > 0) anyLiveSuccess = true;
      } else if (network.includes("TRC") || (coin === "USDT" && network === "TRC20")) {
        balance = await fetchTronUsdtBalance(w.address);
        status = balance > 0 ? "live" : "unfunded";
        if (balance > 0) anyLiveSuccess = true;
      } else if (coin === "BTC" || network.includes("BITCOIN")) {
        balance = await fetchBitcoinBalance(w.address);
        status = balance > 0 ? "live" : "unfunded";
        if (balance > 0) anyLiveSuccess = true;
      } else if (
        coin === "ETH" ||
        network.includes("ETHEREUM") ||
        network.includes("ERC") ||
        network.includes("BASE") ||
        network.includes("POLYGON") ||
        network.includes("ARBITRUM") ||
        network.includes("BEP")
      ) {
        const evm = await fetchEthereumBalances(w.address);
        balance = coin === "ETH" ? evm.eth : evm.usdt;
        status = balance > 0 ? "live" : "unfunded";
        if (balance > 0) anyLiveSuccess = true;
      } else if (network.includes("SOL") || coin === "SOL") {
        const solData = await fetchSolanaBalance(w.address);
        balance = coin === "SOL" ? solData.sol : coin === "USDC" ? solData.usdc : solData.usdt;
        status = balance > 0 ? "live" : "unfunded";
        if (balance > 0) anyLiveSuccess = true;
      }
    } catch {
      status = "error";
    }

    const fiatUsd = balance * rates.usd;
    const fiatGbp = balance * rates.gbp;
    totalUsd += fiatUsd;
    totalGbp += fiatGbp;

    // Formatting decimals
    const balanceFormatted =
      coin === "BTC"
        ? balance.toFixed(8)
        : coin === "ETH" || coin === "SOL"
          ? balance.toFixed(4)
          : balance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

    assets.push({
      coin: w.coin,
      network: w.network,
      address: w.address,
      balance,
      balanceFormatted,
      fiatUsd,
      fiatGbp,
      status,
      lastChecked: now,
      explorerUrl: getExplorerUrl(w.coin, w.network, w.address),
    });
  }

  return {
    assets,
    totalUsd,
    totalGbp,
    lastUpdated: now,
    isLive: anyLiveSuccess,
  };
}
