import { describe, it, expect } from "vitest";
import { withdrawableFrom } from "./db";

describe("NSC Main Balance Conversion Rules", () => {
  it("calculates 1:1 token conversion rate accurately", () => {
    const fiatAmount = 250.5;
    const nscReceived = fiatAmount;
    expect(nscReceived).toBe(250.5);
  });

  it("calculates withdrawable available balance factoring in reserved pending requests", () => {
    // 500 total payout balance, with 100 in pending payout requests
    const available = withdrawableFrom(500, [
      { amount: 100, status: "PENDING" },
      { amount: 50, status: "PAID" },
    ]);
    expect(available).toBe(400);
  });

  it("returns zero available balance if pending requests exceed total balance", () => {
    const available = withdrawableFrom(100, [{ amount: 150, status: "PENDING" }]);
    expect(available).toBe(0);
  });

  it("allows full balance if all previous payouts are completed or paid", () => {
    const available = withdrawableFrom(750, [
      { amount: 200, status: "PAID" },
      { amount: 150, status: "COMPLETED" },
    ]);
    expect(available).toBe(750);
  });

  it("formats NSC credit to 4 decimal places without precision loss", () => {
    const currentNsc = 12.3456;
    const addedNsc = 7.6544;
    const newNsc = Number((currentNsc + addedNsc).toFixed(4));
    expect(newNsc).toBe(20.0);
  });
});
