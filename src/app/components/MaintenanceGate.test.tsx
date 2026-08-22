import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router";
import { MaintenanceGate, SITE_SETTINGS_UPDATED_EVENT } from "./MaintenanceGate";
import type { MaintenanceStatus } from "../data/db";
import type { UserRole } from "../context/AuthContext";

// ── Mocks ──────────────────────────────────────────────────────────

const mockUseAuth = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFetchMaintenanceStatus = vi.fn();

vi.mock("../data/db", () => ({
  fetchMaintenanceStatus: () => mockFetchMaintenanceStatus(),
}));

// ── Helpers ────────────────────────────────────────────────────────

const STATUS: MaintenanceStatus = {
  maintenanceMode: true,
  siteName: "NS CAPTURES",
  supportEmail: "support@ns-captures.com",
};

function setAuth(role: UserRole | null, isLoading = false) {
  mockUseAuth.mockReturnValue({ user: role ? { id: "u1", role } : null, isLoading });
}

function renderGate(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MaintenanceGate>
        <div>Site content</div>
      </MaintenanceGate>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setAuth(null);
});

// ── Tests ──────────────────────────────────────────────────────────

describe("MaintenanceGate", () => {
  it("renders the site when maintenance mode is off", async () => {
    mockFetchMaintenanceStatus.mockResolvedValue({ ...STATUS, maintenanceMode: false });
    renderGate();

    expect(await screen.findByText("Site content")).toBeInTheDocument();
    expect(screen.queryByText("Back shortly.")).not.toBeInTheDocument();
  });

  it("shows the holding page to signed-out visitors when maintenance mode is on", async () => {
    mockFetchMaintenanceStatus.mockResolvedValue(STATUS);
    renderGate();

    expect(await screen.findByText("Back shortly.")).toBeInTheDocument();
    expect(screen.queryByText("Site content")).not.toBeInTheDocument();
    expect(screen.getByText("support@ns-captures.com")).toHaveAttribute(
      "href",
      "mailto:support@ns-captures.com",
    );
  });

  it("shows the holding page to signed-in non-admins", async () => {
    mockFetchMaintenanceStatus.mockResolvedValue(STATUS);
    setAuth("Photographer");
    renderGate();

    expect(await screen.findByText("Back shortly.")).toBeInTheDocument();
    expect(screen.queryByText("Site content")).not.toBeInTheDocument();
  });

  it("lets admins through and warns them the site is closed", async () => {
    mockFetchMaintenanceStatus.mockResolvedValue(STATUS);
    setAuth("Admin");
    renderGate();

    expect(await screen.findByText("Site content")).toBeInTheDocument();
    expect(
      screen.getByText("Maintenance mode is on — only admins can see the site."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Turn off" })).toHaveAttribute(
      "href",
      "/admin?tab=settings&subtab=toggles",
    );
  });

  it("keeps the admin login route reachable so nobody is locked out", async () => {
    mockFetchMaintenanceStatus.mockResolvedValue(STATUS);
    renderGate("/admin/login");

    expect(await screen.findByText("Site content")).toBeInTheDocument();
    expect(screen.queryByText("Back shortly.")).not.toBeInTheDocument();
  });

  it("holds the paint until auth resolves, so the site never flashes", async () => {
    mockFetchMaintenanceStatus.mockResolvedValue(STATUS);
    setAuth(null, true);
    renderGate();

    await waitFor(() => expect(mockFetchMaintenanceStatus).toHaveBeenCalled());
    expect(screen.queryByText("Site content")).not.toBeInTheDocument();
    expect(screen.queryByText("Back shortly.")).not.toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("does not wait on auth while the site is open", async () => {
    mockFetchMaintenanceStatus.mockResolvedValue({ ...STATUS, maintenanceMode: false });
    setAuth(null, true);
    renderGate();

    expect(await screen.findByText("Site content")).toBeInTheDocument();
  });

  it("fails open if the first flag read never resolves", async () => {
    vi.useFakeTimers();
    mockFetchMaintenanceStatus.mockReturnValue(new Promise(() => {}));
    renderGate();

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(4_000);
    });

    expect(screen.getByText("Site content")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("re-reads the flag when settings are saved elsewhere", async () => {
    mockFetchMaintenanceStatus.mockResolvedValue({ ...STATUS, maintenanceMode: false });
    renderGate();
    expect(await screen.findByText("Site content")).toBeInTheDocument();

    mockFetchMaintenanceStatus.mockResolvedValue(STATUS);
    window.dispatchEvent(new Event(SITE_SETTINGS_UPDATED_EVENT));

    expect(await screen.findByText("Back shortly.")).toBeInTheDocument();
  });
});
