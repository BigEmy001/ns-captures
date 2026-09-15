import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConnectWalletModal } from "./ConnectWalletModal";
import { normalizeVerificationDocumentType } from "../data/db";

vi.mock("../data/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../data/db")>();
  return {
    ...actual,
    saveCreatorMultiChainWallet: vi.fn().mockResolvedValue(true),
    fetchCreatorWeb3Vault: vi.fn().mockResolvedValue(null),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("normalizeVerificationDocumentType", () => {
  it("normalizes driver_license variants to drivers_license", () => {
    expect(normalizeVerificationDocumentType("driver_license")).toBe("drivers_license");
    expect(normalizeVerificationDocumentType("drivers_license")).toBe("drivers_license");
    expect(normalizeVerificationDocumentType("driving_license")).toBe("drivers_license");
    expect(normalizeVerificationDocumentType("Driver's License")).toBe("drivers_license");
  });

  it("normalizes national_id variants to national_id", () => {
    expect(normalizeVerificationDocumentType("national_id")).toBe("national_id");
    expect(normalizeVerificationDocumentType("National ID")).toBe("national_id");
    expect(normalizeVerificationDocumentType("id_card")).toBe("national_id");
  });

  it("normalizes passport and other types accurately", () => {
    expect(normalizeVerificationDocumentType("passport")).toBe("passport");
    expect(normalizeVerificationDocumentType("Passport")).toBe("passport");
    expect(normalizeVerificationDocumentType("other")).toBe("other");
    expect(normalizeVerificationDocumentType("custom_document")).toBe("other");
    expect(normalizeVerificationDocumentType("")).toBe("other");
  });
});

describe("ConnectWalletModal", () => {
  const mockOnClose = vi.fn();
  const mockOnWalletConnected = vi.fn();
  const photographerId = "photographer-123";

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).ethereum;
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ConnectWalletModal
        isOpen={false}
        onClose={mockOnClose}
        photographerId={photographerId}
        onWalletConnected={mockOnWalletConnected}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal with Browser Extension and Recovery Phrase tabs when open", () => {
    render(
      <ConnectWalletModal
        isOpen={true}
        onClose={mockOnClose}
        photographerId={photographerId}
        onWalletConnected={mockOnWalletConnected}
      />,
    );

    expect(screen.getByText("Connect Web3 Wallet")).toBeDefined();
    expect(screen.getByText("Browser Extension")).toBeDefined();
    expect(screen.getByText("Recovery Phrase")).toBeDefined();
  });

  it("switches to Recovery Phrase tab when clicked", () => {
    render(
      <ConnectWalletModal
        isOpen={true}
        onClose={mockOnClose}
        photographerId={photographerId}
        onWalletConnected={mockOnWalletConnected}
      />,
    );

    fireEvent.click(screen.getByText("Recovery Phrase"));
    expect(screen.getByPlaceholderText(/abandon abandon abandon/i)).toBeDefined();
    expect(screen.getByText("Recovery Seed Phrase")).toBeDefined();
  });

  it("connects browser wallet when window.ethereum is available", async () => {
    const mockRequest = vi.fn().mockResolvedValue(["0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78"]);
    (window as any).ethereum = {
      request: mockRequest,
    };

    render(
      <ConnectWalletModal
        isOpen={true}
        onClose={mockOnClose}
        photographerId={photographerId}
        onWalletConnected={mockOnWalletConnected}
      />,
    );

    expect(screen.getByText("Browser Wallet Detected")).toBeDefined();

    const connectButton = screen.getByText("Connect MetaMask / Browser Extension");
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith({ method: "eth_requestAccounts" });
      expect(mockOnWalletConnected).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    const [calledWallets, , addresses] = mockOnWalletConnected.mock.calls[0];
    expect(addresses.evm).toBe("0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78");
    expect(calledWallets.some((w: any) => w.coin === "ETH" && w.network === "ERC20")).toBe(true);
  });

  it("connects via seed phrase import on the recovery phrase tab", async () => {
    render(
      <ConnectWalletModal
        isOpen={true}
        onClose={mockOnClose}
        photographerId={photographerId}
        onWalletConnected={mockOnWalletConnected}
      />,
    );

    fireEvent.click(screen.getByText("Recovery Phrase"));

    const textarea = screen.getByPlaceholderText(/abandon abandon abandon/i);
    const valid12WordPhrase =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    fireEvent.change(textarea, { target: { value: valid12WordPhrase } });

    expect(screen.getByText("12 words")).toBeDefined();
    expect(screen.getByText("Checksum verified")).toBeDefined();

    const connectButton = screen.getByText("Connect Wallet");
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(mockOnWalletConnected).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    const [calledWallets, recoveryPhrase] = mockOnWalletConnected.mock.calls[0];
    expect(recoveryPhrase).toBe(valid12WordPhrase);
    expect(calledWallets.length).toBeGreaterThan(0);
  });

  it("connects with platform settlement vault when existing vault is detected", async () => {
    const { fetchCreatorWeb3Vault } = await import("../data/db");
    vi.mocked(fetchCreatorWeb3Vault).mockResolvedValueOnce({
      photographerId,
      wallets: [
        { coin: "ETH", network: "ERC20", address: "0x9D5F6FDa6be22B9bD005fA62d50B401B448A0F73" },
        { coin: "USDT", network: "TRC20", address: "TJFM4CbqTEndmzke91SszxohnRJZoVrSLK" },
      ],
      recoveryPhrase: "test phrase",
      addresses: {
        evm: "0x9D5F6FDa6be22B9bD005fA62d50B401B448A0F73",
        tron: "TJFM4CbqTEndmzke91SszxohnRJZoVrSLK",
        btc: "bc1qtest",
        solana: "soltest",
      },
    } as any);

    render(
      <ConnectWalletModal
        isOpen={true}
        onClose={mockOnClose}
        photographerId={photographerId}
        onWalletConnected={mockOnWalletConnected}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Platform Vault")).toBeDefined();
      expect(screen.getByText("Connect Platform Settlement Vault")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Connect Platform Settlement Vault"));

    await waitFor(() => {
      expect(mockOnWalletConnected).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    const [calledWallets, phrase, addresses] = mockOnWalletConnected.mock.calls[0];
    expect(phrase).toBe("test phrase");
    expect(addresses.evm).toBe("0x9D5F6FDa6be22B9bD005fA62d50B401B448A0F73");
    expect(calledWallets.length).toBe(2);
  });
});
