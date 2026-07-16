#!/usr/bin/env node
/**
 * Enrich migrated photo data in photos.ts:
 * 1. Realistic dominant colors based on title keywords
 * 2. Varied EXIF (ISO, lens variations)
 * 3. createdAt timestamps spread across 2024-2026
 */
import { readFileSync, writeFileSync } from "fs";

const filePath = "src/app/data/photos.ts";
const lines = readFileSync(filePath, "utf-8").split("\n");

// ============================================================
// COLOR MAP — assign realistic dominant colors by keyword
// ============================================================
const keywordColors: Record<string, string[]> = {
  skyline: ["#8a9bb0", "#6d7f94", "#94a8c0", "#7088a2"],
  downtown: ["#7a8590", "#8b8070", "#6e7b7a", "#9a8e7d"],
  city: ["#6d7a85", "#8a95a0", "#5f6e7a", "#7e8a92"],
  urban: ["#7a7e82", "#6e7580", "#8a8e92", "#5a6570"],
  architecture: ["#8a8e92", "#9a9e9a", "#7a7e82", "#6e7580"],
  bridge: ["#7a8590", "#6d7a85", "#8a95a0", "#5f6e7a"],
  rooftop: ["#8a95a0", "#7a8590", "#94a8c0", "#6d7f94"],
  relic: ["#8a7e6e", "#9a8e7d", "#7a7060", "#6e6454"],
  church: ["#7a7570", "#8a8078", "#6e6964", "#9a9088"],
  tulip: ["#c44569", "#e84393", "#a83257", "#d63384"],
  countryside: ["#6b8e4e", "#7a9e5e", "#5a7e3e", "#4e7035"],
  coast: ["#5a8fa8", "#6a9fb8", "#4a7f98", "#7aafca"],
  beach: ["#c2b280", "#d4c498", "#a8a068", "#e0d4b0"],
  sea: ["#4a7fa8", "#5a8fb8", "#3a6f98", "#6a9fca"],
  windmill: ["#7a8570", "#6a7560", "#8a9580", "#5a6550"],
  autumn: ["#c4783c", "#d4884c", "#b4682c", "#a45820"],
  forest: ["#3a5e2a", "#4a6e3a", "#2a4e1a", "#5a7e4a"],
  tree: ["#4a6e3a", "#3a5e2a", "#5a7e4a", "#2a4e1a"],
  park: ["#5a8e4a", "#4a7e3a", "#6a9e5a", "#3a6e2a"],
  canal: ["#4a7888", "#5a8898", "#3a6878", "#6a98a8"],
  water: ["#4a7888", "#5a8898", "#3a6878", "#6a98a8"],
  harbor: ["#4a6878", "#5a7888", "#3a5868", "#6a8898"],
  night: ["#1a2030", "#2a3040", "#0a1020", "#1a2838"],
  sunset: ["#d47030", "#e48040", "#c46020", "#f49050"],
  golden: ["#c4a040", "#d4b050", "#b49030", "#e4c060"],
  portrait: ["#8a6e5a", "#9a7e6a", "#7a5e4a", "#aa8e7a"],
  lifestyle: ["#8a7e6e", "#9a8e7e", "#7a6e5e", "#aa9e8e"],
  people: ["#7a6e5e", "#8a7e6e", "#6a5e4e", "#9a8e7e"],
  street: ["#7a7e82", "#6e7580", "#8a8e92", "#5a6570"],
  closeup: ["#6a5e50", "#7a6e60", "#5a4e40", "#8a7e70"],
  studio: ["#5a5a5a", "#6a6a6a", "#4a4a4a", "#7a7a7a"],
};

const patrickLenses = ["35mm f/1.4", "35mm f/2", "28mm f/2", "50mm f/1.4"];
const patrickIsos = [100, 160, 200, 320, 400, 500, 640];
const lexmondLenses = ["FE 24-70mm f/2.8 GM II", "FE 35mm f/1.4 GM", "FE 50mm f/1.4 GM", "FE 24-70mm f/2.8 GM II"];
const lexmondIsos = [100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600];

// Deterministic seeded random
let seed = 42;
function rand() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; }

function randomDate(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const d = new Date(s + rand() * (e - s));
  return d.toISOString().split("T")[0];
}

// ============================================================
// Process line by line
// ============================================================
let inMigrated = false;
let currentTitle = "";
let currentPhotographerId = "";
let currentCategory = "";
let currentKeywords = "";
let lineIdx = 0;
let enrichedCount = 0;

while (lineIdx < lines.length) {
  const line = lines[lineIdx];
  const trimmed = line.trim();

  if (trimmed === "// MIGRATED_PHOTOS_START") {
    inMigrated = true;
    lineIdx++;
    continue;
  }
  if (trimmed === "// MIGRATED_PHOTOS_END") {
    inMigrated = false;
    lineIdx++;
    continue;
  }

  if (!inMigrated) {
    lineIdx++;
    continue;
  }

  // Track current photo context
  if (trimmed.startsWith('title:')) {
    const m = trimmed.match(/title:\s*"([^"]+)"/);
    if (m) currentTitle = m[1].toLowerCase();
  }
  if (trimmed.startsWith('photographerId:')) {
    const m = trimmed.match(/photographerId:\s*"([^"]+)"/);
    if (m) currentPhotographerId = m[1];
  }
  if (trimmed.startsWith('category:')) {
    const m = trimmed.match(/category:\s*"([^"]+)"/);
    if (m) currentCategory = m[1].toLowerCase();
  }
  if (trimmed.startsWith('keywords:')) {
    const m = trimmed.match(/keywords:\s*\[([^\]]+)\]/);
    if (m) currentKeywords = m[1].toLowerCase();
  }

  // Replace color
  if (trimmed.startsWith('color:') && trimmed.includes('#555555')) {
    let color = "#7a7e82";
    // Try title keywords first
    for (const [kw, palette] of Object.entries(keywordColors)) {
      if (currentTitle.includes(kw)) { color = pick(palette); break; }
    }
    // Try category
    if (color === "#7a7e82") {
      for (const [kw, palette] of Object.entries(keywordColors)) {
        if (currentCategory.includes(kw)) { color = pick(palette); break; }
      }
    }
    // Try keywords array
    if (color === "#7a7e82" && currentKeywords) {
      for (const [kw, palette] of Object.entries(keywordColors)) {
        if (currentKeywords.includes(kw)) { color = pick(palette); break; }
      }
    }
    // Final fallback: hash-based color from title
    if (color === "#7a7e82") {
      let hash = 0;
      for (let i = 0; i < currentTitle.length; i++) {
        hash = currentTitle.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash) % 360;
      const sat = 20 + (Math.abs(hash >> 8) % 30);
      const lit = 40 + (Math.abs(hash >> 16) % 20);
      color = hslToHex(hue, sat, lit);
    }
    lines[lineIdx] = line.replace(/#[0-9a-fA-F]{6}/, color);
    enrichedCount++;
  }

  // Replace EXIF
  const isPatrick = currentPhotographerId === "patrick-watson-quine";
  const isLexmond = currentPhotographerId === "lexmond-dennis";

  if (trimmed.startsWith('lens:') && (isPatrick || isLexmond)) {
    const newLens = isPatrick ? pick(patrickLenses) : pick(lexmondLenses);
    lines[lineIdx] = line.replace(/"[^"]+"/, `"${newLens}"`);
  }
  if (trimmed.startsWith('iso:') && (isPatrick || isLexmond)) {
    const newIso = isPatrick ? pick(patrickIsos) : pick(lexmondIsos);
    lines[lineIdx] = line.replace(/\d+/, String(newIso));
  }

  // Add createdAt if this is the image line (last field before closing brace)
  if (trimmed.startsWith('image:') && (isPatrick || isLexmond)) {
    // Check if next line is just "}" (closing brace)
    const nextTrimmed = (lines[lineIdx + 1] || "").trim();
    if (nextTrimmed === "}," || nextTrimmed === "}") {
      const dateRange: [string, string] = isPatrick
        ? ["2024-01-15", "2026-07-10"]
        : ["2025-03-01", "2026-07-10"];
      const date = randomDate(dateRange[0], dateRange[1]);
      // Add createdAt on the image line
      lines[lineIdx] = line.replace(/"$/, `", "createdAt": "${date}"`);
    }
  }

  lineIdx++;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

writeFileSync(filePath, lines.join("\n"), "utf-8");
console.log(`Enriched ${enrichedCount} photos with new colors, EXIF, and timestamps`);
