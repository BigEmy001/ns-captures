import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { TransferCryptoModal } from "./TransferCryptoModal";
import type { CryptoWalletEntry } from "../data/db";
import type { MultiChainVaultBalance } from "../../lib/onChainBalance";
import * as emailLib from "../../lib/email";
import * as clipboardLib from "../../lib/clipboard";

vi.mock("../../lib/email", () => ({
  sendCryptoWithdrawalNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../lib/clipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockWallets: CryptoWalletEntry[] = [
  {
    coin: "USDT",
    network: "TRC20",
    address: "TYsJ19v81BshD8rJv6Qj2b8w4Zpxk89B7x",
  },
  {
    coin: "USDT",
    network: "ERC20",
    address: "0x71C8363837918a71018283719284729184719284",
  },
  {
    coin: "USDT",
    network: "POLYGON",
    address: "0x71C8363837918a71018283719284729184719284",
  },
  {
    coin: "BTC",
    network: "NATIVE SEGWIT",
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  },
  {
    coin: "ETH",
    network: "ERC20",
    address: "0x71C8363837918a71018283719284729184719284",
  },
  {
    coin: "SOL",
    network: "SOLANA",
    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  },
  {
    coin: "USDT",
    network: "Solana",
    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  },
  {
    coin: "USDC",
    network: "Solana",
    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  },
  {
    coin: "NSC",
    network: "POLYGON",
    address: "0x71C8363837918a71018283719284729184719284",
  },
];

const mockVaultBalance: MultiChainVaultBalance = {
  totalUsd: 2500,
  totalGbp: 1975,
  lastUpdated: "2026-09-12T10:00:00Z",
  isLive: true,
  assets: [
    {
      coin: "USDT",
      network: "TRC20",
      address: "TYsJ19v81BshD8rJv6Qj2b8w4Zpxk89B7x",
      balance: 1000.0,
      balanceFormatted: "1,000.00",
      fiatUsd: 1000.0,
      fiatGbp: 790.0,
      status: "live",
      lastChecked: "2026-09-12T10:00:00Z",
      explorerUrl: "https://tronscan.org/#/address/TYsJ19v81BshD8rJv6Qj2b8w4Zpxk89B7x",
    },
    {
      coin: "USDT",
      network: "ERC20",
      address: "0x71C8363837918a71018283719284729184719284",
      balance: 500.0,
      balanceFormatted: "500.00",
      fiatUsd: 500.0,
      fiatGbp: 395.0,
      status: "live",
      lastChecked: "2026-09-12T10:00:00Z",
      explorerUrl: "https://etherscan.io/address/0x71C8363837918a71018283719284729184719284",
    },
    {
      coin: "USDT",
      network: "POLYGON",
      address: "0x71C8363837918a71018283719284729184719284",
      balance: 250.0,
      balanceFormatted: "250.00",
      fiatUsd: 250.0,
      fiatGbp: 197.5,
      status: "live",
      lastChecked: "2026-09-12T10:00:00Z",
      explorerUrl: "https://polygonscan.com/address/0x71C8363837918a71018283719284729184719284",
    },
    {
      coin: "USDT",
      network: "Solana",
      address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      balance: 300.0,
      balanceFormatted: "300.00",
      fiatUsd: 300.0,
      fiatGbp: 237.0,
      status: "live",
      lastChecked: "2026-09-12T10:00:00Z",
      explorerUrl: "https://solscan.io/account/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    },
    {
      coin: "USDC",
      network: "Solana",
      address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      balance: 750.0,
      balanceFormatted: "750.00",
      fiatUsd: 750.0,
      fiatGbp: 592.5,
      status: "live",
      lastChecked: "2026-09-12T10:00:00Z",
      explorerUrl: "https://solscan.io/account/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    },
    {
      coin: "BTC",
      network: "NATIVE SEGWIT",
      address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      balance: 0.05,
      balanceFormatted: "0.05",
      fiatUsd: 3000.0,
      fiatGbp: 2370.0,
      status: "live",
      lastChecked: "2026-09-12T10:00:00Z",
      explorerUrl: "https://mempool.space/address/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    },
    {
      coin: "ETH",
      network: "ERC20",
      address: "0x71C8363837918a71018283719284729184719284",
      balance: 1.5,
      balanceFormatted: "1.50",
      fiatUsd: 3900.0,
      fiatGbp: 3081.0,
      status: "live",
      lastChecked: "2026-09-12T10:00:00Z",
      explorerUrl: "https://etherscan.io/address/0x71C8363837918a71018283719284729184719284",
    },
    {
      coin: "SOL",
      network: "SOLANA",
      address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      balance: 10.0,
      balanceFormatted: "10.00",
      fiatUsd: 1500.0,
      fiatGbp: 1185.0,
      status: "live",
      lastChecked: "2026-09-12T10:00:00Z",
      explorerUrl: "https://solscan.io/account/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    },
  ],
};

describe("TransferCryptoModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <TransferCryptoModal
        isOpen={false}
        onClose={vi.fn()}
        wallets={mockWallets}
        vaultBalance={mockVaultBalance}
      />,
    );
    expect(screen.queryByText(/Transfer & Withdraw Crypto/i)).not.toBeInTheDocument();
  });

  it("renders modal and excludes NSC token from available coin choices", () => {
    render(
      <TransferCryptoModal
        isOpen={true}
        onClose={vi.fn()}
        wallets={mockWallets}
        vaultBalance={mockVaultBalance}
        initialCoin="USDT"
        initialNetwork="TRC20"
      />,
    );

    expect(
      screen.getByRole("heading", { name: /Transfer & Withdraw Crypto/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Non-Custodial Vault Transfer/i)).toBeInTheDocument();

    // Verify coin select options
    const coinOptions = screen.getAllByRole("option").map((opt) => opt.textContent);
    expect(coinOptions).toContain("USDT");
    expect(coinOptions).toContain("BTC");
    expect(coinOptions).toContain("ETH");
    expect(coinOptions).toContain("SOL");
    expect(coinOptions).not.toContain("NSC");
  });

  it("displays available balance for the selected asset and network", () => {
    render(
      <TransferCryptoModal
        isOpen={true}
        onClose={vi.fn()}
        wallets={mockWallets}
        vaultBalance={mockVaultBalance}
        initialCoin="USDT"
        initialNetwork="TRC20"
      />,
    );

    expect(screen.getByText(/Available in Vault:/i)).toBeInTheDocument();
    expect(screen.getByText("1,000.00 USDT")).toBeInTheDocument();
    expect(screen.getByText("Network: TRC20")).toBeInTheDocument();
    expect(screen.getByText("~1 USDT")).toBeInTheDocument(); // Gas fee for TRC20
  });

  it("populates full available balance when SEND MAX is clicked", () => {
    render(
      <TransferCryptoModal
        isOpen={true}
        onClose={vi.fn()}
        wallets={mockWallets}
        vaultBalance={mockVaultBalance}
        initialCoin="USDT"
        initialNetwork="TRC20"
      />,
    );

    const maxBtn = screen.getByRole("button", { name: /SEND MAX/i });
    fireEvent.click(maxBtn);

    const input = screen.getByPlaceholderText("0.00") as HTMLInputElement;
    expect(input.value).toBe("1000");
  });

  it("validates TRON TRC20 address: rejects invalid prefix and wrong length, accepts valid T... address", () => {
    render(
      <TransferCryptoModal
        isOpen={true}
        onClose={vi.fn()}
        wallets={mockWallets}
        vaultBalance={mockVaultBalance}
        initialCoin="USDT"
        initialNetwork="TRC20"
      />,
    );

    const addrInput = screen.getByPlaceholderText(/Paste external TRC20 address.../i);
    const submitBtn = screen.getByRole("button", { name: /Confirm & Send/i });

    // 1. Enter invalid address (starts with 0x instead of T)
    fireEvent.change(addrInput, {
      target: { value: "0x71C8363837918a71018283719284729184719284" },
    });
    expect(
      screen.getByText("TRON addresses must start with 'T' (34 characters)."),
    ).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // 2. Enter valid TRON address (34 chars starting with T)
    fireEvent.change(addrInput, { target: { value: "TYsJ19v81BshD8rJv6Qj2b8w4Zpxk89B7x" } });
    expect(
      screen.queryByText("TRON addresses must start with 'T' (34 characters)."),
    ).not.toBeInTheDocument();
  });

  it("validates EVM address: rejects non-0x and accepts 42-char 0x... address", () => {
    render(
      <TransferCryptoModal
        isOpen={true}
        onClose={vi.fn()}
        wallets={mockWallets}
        vaultBalance={mockVaultBalance}
        initialCoin="USDT"
        initialNetwork="ERC20"
      />,
    );

    const addrInput = screen.getByPlaceholderText(/Paste external ERC20 address.../i);
    const submitBtn = screen.getByRole("button", { name: /Confirm & Send/i });

    // Invalid: starts with T
    fireEvent.change(addrInput, { target: { value: "TYsJ19v81BshD8rJv6Qj2b8w4Zpxk89B7x" } });
    expect(
      screen.getByText("EVM addresses must start with '0x' (42 characters)."),
    ).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // Valid: 0x with 42 chars
    fireEvent.change(addrInput, {
      target: { value: "0x71C8363837918a71018283719284729184719284" },
    });
    expect(
      screen.queryByText("EVM addresses must start with '0x' (42 characters)."),
    ).not.toBeInTheDocument();
  });

  it("validates Bitcoin Native SegWit address: rejects invalid address, accepts bc1 address", () => {
    render(
      <TransferCryptoModal
        isOpen={true}
        onClose={vi.fn()}
        wallets={mockWallets}
        vaultBalance={mockVaultBalance}
        initialCoin="BTC"
        initialNetwork="NATIVE SEGWIT"
      />,
    );

    const addrInput = screen.getByPlaceholderText(/Paste external NATIVE SEGWIT address.../i);

    // Invalid: starts with 0x
    fireEvent.change(addrInput, {
      target: { value: "0x71C8363837918a71018283719284729184719284" },
    });
    expect(
      screen.getByText("Bitcoin addresses must start with 'bc1', '1', or '3'."),
    ).toBeInTheDocument();

    // Valid: bc1 address
    fireEvent.change(addrInput, {
      target: { value: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" },
    });
    expect(
      screen.queryByText("Bitcoin addresses must start with 'bc1', '1', or '3'."),
    ).not.toBeInTheDocument();
  });

  it("validates Solana address: rejects invalid characters, accepts valid Base58 address", () => {
    render(
      <TransferCryptoModal
        isOpen={true}
        onClose={vi.fn()}
        wallets={mockWallets}
        vaultBalance={mockVaultBalance}
        initialCoin="SOL"
        initialNetwork="SOLANA"
      />,
    );

    const addrInput = screen.getByPlaceholderText(/Paste external SOLANA address.../i);

    // Invalid: contains invalid Base58 character (e.g. 0, O, I, l or symbols)
    fireEvent.change(addrInput, { target: { value: "0xInvalidSolanaAddressWithBadChars!" } });
    expect(
      screen.getByText("Solana addresses must be valid Base58 (32-44 characters)."),
    ).toBeInTheDocument();

    // Valid: 44-char base58 address
    fireEvent.change(addrInput, {
      target: { value: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" },
    });
    expect(
      screen.queryByText("Solana addresses must be valid Base58 (32-44 characters)."),
    ).not.toBeInTheDocument();
  });

  it("displays correct blockchain network gas fee for Polygon (~0.01 POL)", () => {
    render(
      <TransferCryptoModal
        isOpen={true}
        onClose={vi.fn()}
        wallets={mockWallets}
        vaultBalance={mockVaultBalance}
        initialCoin="USDT"
        initialNetwork="POLYGON"
      />,
    );

    expect(screen.getByText("Estimated Blockchain Network Gas:")).toBeInTheDocument();
    expect(screen.getByText("~0.01 POL")).toBeInTheDocument();
  });

  it("executes withdrawal to external wallet, dispatches email to user only, and shows confirmation receipt", async () => {
    const onTransferCompleted = vi.fn();
    const userEmail = "junghoonsung@gmail.com";
    const userName = "Junghoon Sung";

    render(
      <TransferCryptoModal
        isOpen={true}
        onClose={vi.fn()}
        wallets={mockWallets}
        vaultBalance={mockVaultBalance}
        initialCoin="USDT"
        initialNetwork="TRC20"
        userEmail={userEmail}
        userName={userName}
        onTransferCompleted={onTransferCompleted}
      />,
    );

    // 1. Enter external recipient TRON address
    const externalAddress = "TYsJ19v81BshD8rJv6Qj2b8w4Zpxk89B7x";
    const addrInput = screen.getByPlaceholderText(/Paste external TRC20 address.../i);
    fireEvent.change(addrInput, { target: { value: externalAddress } });

    // 2. Enter withdrawal amount
    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "250.00" } });

    // 3. Click Confirm & Send
    const submitBtn = screen.getByRole("button", { name: /Confirm & Send/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    // 4. Await dispatch completion
    await waitFor(
      () => {
        expect(screen.getByRole("heading", { name: /Transfer Dispatched/i })).toBeInTheDocument();
      },
      { timeout: 3500 },
    );

    // 5. Verify confirmation screen details
    expect(screen.getByText("Blockchain Broadcast Confirmed")).toBeInTheDocument();
    expect(screen.getByText("250 USDT")).toBeInTheDocument();
    expect(screen.getByText("USDT (TRC20)")).toBeInTheDocument();
    expect(screen.getByText(externalAddress)).toBeInTheDocument();

    // Verify explorer link points to the destination address on Tronscan
    const explorerLink = screen.getByRole("link", { name: /View on Explorer/i });
    expect(explorerLink).toHaveAttribute(
      "href",
      `https://tronscan.org/#/address/${externalAddress}`,
    );

    // 6. Verify email notification dispatched strictly to userEmail
    expect(emailLib.sendCryptoWithdrawalNotification).toHaveBeenCalledTimes(1);
    expect(emailLib.sendCryptoWithdrawalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: userEmail,
        userName: userName,
        coin: "USDT",
        network: "TRC20",
        amount: "250.00",
        destinationAddress: externalAddress,
      }),
    );

    // 7. Verify callback was triggered with transaction receipt
    expect(onTransferCompleted).toHaveBeenCalledTimes(1);
    expect(onTransferCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        coin: "USDT",
        network: "TRC20",
        amount: 250,
        destination: externalAddress,
      }),
    );

    // 8. Test copy TxHash button
    const copyBtn = screen.getByTitle("Copy TxHash");
    fireEvent.click(copyBtn);
    expect(clipboardLib.copyToClipboard).toHaveBeenCalled();
  });

  it("executes withdrawal for USDC on Solana network smoothly", async () => {
    const onTransferCompleted = vi.fn();
    const userEmail = "solana_collector@example.com";
    const externalSolanaAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

    render(
      <TransferCryptoModal
        isOpen={true}
        onClose={vi.fn()}
        wallets={mockWallets}
        vaultBalance={mockVaultBalance}
        initialCoin="USDC"
        initialNetwork="Solana"
        userEmail={userEmail}
        userName="Solana User"
        onTransferCompleted={onTransferCompleted}
      />,
    );

    // Verify vault balance for USDC on Solana is displayed
    expect(screen.getByText(/Available in Vault:/i)).toBeInTheDocument();
    expect(screen.getByText("750.00 USDC")).toBeInTheDocument();
    expect(screen.getByText("Network: Solana")).toBeInTheDocument();

    // Verify estimated gas is ~0.00001 SOL
    expect(screen.getByText("Estimated Blockchain Network Gas:")).toBeInTheDocument();
    expect(screen.getByText("~0.00001 SOL")).toBeInTheDocument();

    // Enter external Solana recipient address
    const addrInput = screen.getByPlaceholderText(/Paste external Solana address.../i);
    fireEvent.change(addrInput, { target: { value: externalSolanaAddress } });

    // Enter withdrawal amount
    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "500" } });

    // Confirm & Send
    const submitBtn = screen.getByRole("button", { name: /Confirm & Send/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    // Await completion
    await waitFor(
      () => {
        expect(screen.getByRole("heading", { name: /Transfer Dispatched/i })).toBeInTheDocument();
      },
      { timeout: 3500 },
    );

    // Verify confirmation
    expect(screen.getByText("Blockchain Broadcast Confirmed")).toBeInTheDocument();
    expect(screen.getByText("500 USDC")).toBeInTheDocument();
    expect(screen.getByText("USDC (Solana)")).toBeInTheDocument();
    expect(screen.getByText(externalSolanaAddress)).toBeInTheDocument();

    // Verify Solscan explorer link
    const explorerLink = screen.getByRole("link", { name: /View on Explorer/i });
    expect(explorerLink).toHaveAttribute(
      "href",
      `https://solscan.io/account/${externalSolanaAddress}`,
    );

    // Verify email notification
    expect(emailLib.sendCryptoWithdrawalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: userEmail,
        coin: "USDC",
        network: "Solana",
        amount: "500",
        destinationAddress: externalSolanaAddress,
      }),
    );

    expect(onTransferCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        coin: "USDC",
        network: "Solana",
        amount: 500,
        destination: externalSolanaAddress,
      }),
    );
  });
});
