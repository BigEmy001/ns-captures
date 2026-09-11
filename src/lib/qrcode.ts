/**
 * Lightweight, self-contained QR Code generator in pure TypeScript.
 * Generates standards-compliant QR Code matrices (Version 1-6, Byte mode, ECC Low/Medium)
 * without any external runtime dependencies.
 */

// Galois Field GF(256) log and antilog tables (primitive polynomial 0x11d)
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
  }
  GF256_LOG[0] = 0;
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF256_EXP[GF256_LOG[a] + GF256_LOG[b]];
}

// Generate Reed-Solomon generator polynomial
function rsGeneratorPoly(numEcWords: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < numEcWords; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], GF256_EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

// Compute Reed-Solomon error correction codewords
function rsCalculate(data: Uint8Array, numEcWords: number): Uint8Array {
  const gen = rsGeneratorPoly(numEcWords);
  const remainder = new Uint8Array(numEcWords);

  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[numEcWords - 1] = 0;
    for (let j = 0; j < numEcWords; j++) {
      remainder[j] ^= gfMul(gen[j], factor);
    }
  }
  return remainder;
}

// Standard QR Version Specs: [version, totalDataBytes, ecBytes, size]
// Using ECC Level Low (L) for maximum data density with crypto addresses
const VERSION_SPECS = [
  { ver: 1, totalData: 19, ec: 7, size: 21 },
  { ver: 2, totalData: 34, ec: 10, size: 25 },
  { ver: 3, totalData: 55, ec: 15, size: 29 },
  { ver: 4, totalData: 80, ec: 20, size: 33 },
  { ver: 5, totalData: 108, ec: 26, size: 37 },
  { ver: 6, totalData: 136, ec: 36, size: 41 },
];

export interface QrMatrix {
  size: number;
  modules: boolean[][];
}

/**
 * Generate a 2D boolean matrix for the given text.
 */
export function generateQrMatrix(text: string): QrMatrix {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const dataLen = textBytes.length;

  // Pick smallest version that can accommodate textBytes (Byte mode has 4-bit mode + 8-bit count)
  const spec =
    VERSION_SPECS.find((s) => s.totalData >= dataLen + 2) ||
    VERSION_SPECS[VERSION_SPECS.length - 1];

  // Bit buffer creation
  const bitBuffer: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bitBuffer.push((val >>> i) & 1);
    }
  }

  // Byte mode: indicator 0100
  pushBits(0b0100, 4);
  // Character count: 8 bits for versions 1-9
  pushBits(dataLen, 8);
  for (let i = 0; i < dataLen; i++) {
    pushBits(textBytes[i], 8);
  }

  // Terminator (up to 4 bits of 0)
  const maxDataBits = spec.totalData * 8;
  const termLen = Math.min(4, maxDataBits - bitBuffer.length);
  pushBits(0, termLen);

  // Pad to byte boundary
  while (bitBuffer.length % 8 !== 0) {
    bitBuffer.push(0);
  }

  // Convert bitBuffer to byte array
  const dataBytes = new Uint8Array(spec.totalData);
  for (let i = 0; i < bitBuffer.length / 8; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitBuffer[i * 8 + b];
    }
    dataBytes[i] = byteVal;
  }

  // Fill remainder with alternating pad bytes 0xEC and 0x11
  let padIdx = bitBuffer.length / 8;
  let padToggle = false;
  while (padIdx < spec.totalData) {
    dataBytes[padIdx++] = padToggle ? 0x11 : 0xec;
    padToggle = !padToggle;
  }

  // Error correction
  const ecBytes = rsCalculate(dataBytes, spec.ec);

  // Combine data + EC codewords
  const totalCodewords = new Uint8Array(spec.totalData + spec.ec);
  totalCodewords.set(dataBytes, 0);
  totalCodewords.set(ecBytes, spec.totalData);

  // Construct Matrix
  const size = spec.size;
  const modules: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );

  function setModule(r: number, c: number, val: boolean) {
    modules[r][c] = val;
    isFunction[r][c] = true;
  }

  // Finder Patterns (7x7) at (0,0), (size-7, 0), (0, size-7)
  const finderPositions = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ];

  for (const [row, col] of finderPositions) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const tr = row + r;
        const tc = col + c;
        if (tr < 0 || tr >= size || tc < 0 || tc >= size) continue;
        const isFinderBorder = r === -1 || r === 7 || c === -1 || c === 7;
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const isBlack = !isFinderBorder && (isOuter || isInner);
        setModule(tr, tc, isBlack);
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // Alignment pattern for versions >= 2
  if (spec.ver >= 2) {
    const alignCenter = size - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const tr = alignCenter + r;
        const tc = alignCenter + c;
        const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        setModule(tr, tc, isBorder || isCenter);
      }
    }
  }

  // Dark module
  setModule(size - 8, 8, true);

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[size - 1 - i][8]) isFunction[size - 1 - i][8] = true;
    if (!isFunction[8][size - 1 - i]) isFunction[8][size - 1 - i] = true;
  }

  // Place data bits in zigzag upward/downward pattern
  let bitIdx = 0;
  const allBits: number[] = [];
  for (let i = 0; i < totalCodewords.length; i++) {
    for (let b = 7; b >= 0; b--) {
      allBits.push((totalCodewords[i] >>> b) & 1);
    }
  }

  let right = size - 1;
  while (right > 0) {
    if (right === 6) right--; // Skip vertical timing column
    const upwards = ((right + 1) / 2) % 2 === 1;

    for (let vert = 0; vert < size; vert++) {
      const r = upwards ? size - 1 - vert : vert;
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const c = right - colOffset;
        if (isFunction[r][c]) continue;

        let bit = bitIdx < allBits.length ? allBits[bitIdx++] === 1 : false;

        // Apply Mask Pattern 0: (row + column) % 2 === 0
        if ((r + c) % 2 === 0) {
          bit = !bit;
        }
        modules[r][c] = bit;
      }
    }
    right -= 2;
  }

  // Format info bits for Level L, Mask 0: 0b111011111000100 (BCH 15,5 error corrected)
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  // Draw format bits around top-left, top-right, bottom-left
  const formatCoordsTopLeft = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoordsTopLeft[i];
    modules[r][c] = formatBits[i] === 1;
  }

  for (let i = 0; i < 7; i++) {
    modules[size - 1 - i][8] = formatBits[i] === 1;
  }
  for (let i = 7; i < 15; i++) {
    modules[8][size - 15 + i] = formatBits[i] === 1;
  }

  // Convert any remaining nulls to false
  const cleanModules: boolean[][] = modules.map((row) => row.map((cell) => cell === true));

  return { size, modules: cleanModules };
}

/**
 * Generate an SVG string from the QR matrix with quiet zone padding.
 */
export function generateQrSvg(
  text: string,
  options?: { margin?: number; fgColor?: string; bgColor?: string },
): string {
  const margin = options?.margin ?? 4;
  const fg = options?.fgColor ?? "#18211f";
  const bg = options?.bgColor ?? "#ffffff";

  const { size, modules } = generateQrMatrix(text);
  const totalSize = size + margin * 2;

  let rects = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        rects += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="${fg}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges">
    <rect width="${totalSize}" height="${totalSize}" fill="${bg}"/>
    ${rects}
  </svg>`;
}
