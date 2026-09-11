import { describe, it, expect } from "vitest";
import { generateQrMatrix, generateQrSvg } from "./qrcode";

describe("qrcode generator", () => {
  it("generates a valid QR matrix for a TRON USDT address", () => {
    const tronAddress = "TMX7y4sFwXy898q3wZ7Gk5qP8e5aB9xL1k";
    const matrix = generateQrMatrix(tronAddress);
    expect(matrix.size).toBeGreaterThanOrEqual(21);
    expect(matrix.modules.length).toBe(matrix.size);
    expect(matrix.modules[0].length).toBe(matrix.size);

    // Verify top-left finder pattern center (row 3, col 3) is true
    expect(matrix.modules[3][3]).toBe(true);
    // Verify top-left finder border (row 0, col 0) is true
    expect(matrix.modules[0][0]).toBe(true);
  });

  it("generates valid SVG markup with viewBox", () => {
    const btcAddress = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
    const svg = generateQrSvg(btcAddress, { margin: 4 });
    expect(svg).toContain("<svg xmlns=");
    expect(svg).toContain('viewBox="0 0');
    expect(svg).toContain("<rect");
  });
});
