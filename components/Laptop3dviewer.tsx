"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { win11B64, macB64 } from "./images_b64";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { fetchLaptops, fetchLaptopDesign, saveLaptopDesign, type Laptop } from "@/lib/supabase";
import styles from "./Laptop3dviewer.module.css";

// ---- Config ----
const BASE_COLORS = [
  { name: "Space Grey",      hex: "#4b4f56" },
  { name: "Silver",          hex: "#d6d9dd" },
  { name: "Midnight Black",  hex: "#1c1e22" },
  { name: "Rose Gold",       hex: "#d9b8ac" },
  { name: "Sky Blue",        hex: "#8bb4d6" },
  { name: "Starlight",       hex: "#e8e4dc" },
  { name: "Glacier White",   hex: "#f0f2f5" },
  { name: "Cobalt Blue",     hex: "#1f4e8c" },
  { name: "Forest Green",    hex: "#2d5a3d" },
  { name: "Volcanic Red",    hex: "#7a1a1a" },
  { name: "Arctic Purple",   hex: "#5b3f7a" },
  { name: "Champagne Gold",  hex: "#c9a86c" },
  { name: "Graphite",        hex: "#36383d" },
  { name: "Copper",          hex: "#8b5c3e" },
];

// Best-guess color per brand, since the laptops table has no color column
const BRAND_COLORS: Record<string, string> = {
  apple: "#4b4f56",
  macbook: "#4b4f56",
  dell: "#c9ccd1",
  hp: "#d6d9dd",
  lenovo: "#1c1e22",
  thinkpad: "#1c1e22",
  asus: "#1c1e22",
  rog: "#1c1e22",
  acer: "#c9ccd1",
  msi: "#26282c",
  microsoft: "#d6d9dd",
  surface: "#8bb4d6",
  razer: "#1c1e22",
  samsung: "#8bb4d6",
  lg: "#d6d9dd",
  gigabyte: "#1c1e22",
};

function colorForBrand(brand?: string): string {
  if (!brand) return BASE_COLORS[0].hex;
  const key = brand.toLowerCase().trim();
  for (const k of Object.keys(BRAND_COLORS)) {
    if (key.includes(k)) return BRAND_COLORS[k];
  }
  return BASE_COLORS[0].hex;
}

function osThemeForBrand(brand?: string): "windows" | "mac" {
  if (!brand) return "windows";
  const b = brand.toLowerCase();
  return b.includes("apple") || b.includes("macbook") ? "mac" : "windows";
}

function scaleForScreenSize(screenSize?: number | null): number {
  if (!screenSize) return 1;
  return THREE.MathUtils.clamp(screenSize / 14, 0.82, 1.2);
}

const FINISHES = [
  { name: "Matte",     roughness: 0.55, clearcoat: 0.2,  sheen: 0.2,  metalness: 0.65, sheenTint: "#ffffff" },
  { name: "Aluminum", roughness: 0.22, clearcoat: 0.55, sheen: 0.08, metalness: 0.82, sheenTint: "#ffffff" },
  { name: "Glossy",   roughness: 0.04, clearcoat: 1.0,  sheen: 0,    metalness: 0.7,  sheenTint: "#ffffff" },
  { name: "Titanium", roughness: 0.32, clearcoat: 0.3,  sheen: 0.35, metalness: 0.9,  sheenTint: "#c8c0b0" },
  { name: "Carbon",   roughness: 0.42, clearcoat: 0.65, sheen: 0.05, metalness: 0.4,  sheenTint: "#111111" },
];

const BACKLIGHTS = [
  { name: "Off",       color: null },
  { name: "White",     color: "#eef3ff" },
  { name: "Blue",      color: "#4d9dff" },
  { name: "Green",     color: "#5df29a" },
  { name: "Red",       color: "#ff4d4d" },
  { name: "Purple",    color: "#b04dff" },
  { name: "Amber",     color: "#ffb84d" },
  { name: "Cyan",      color: "#4dffe0" },
  { name: "Rainbow",   color: "__rainbow__" },
];

const BACKGROUNDS = [
  { name: "Studio",   color: "#f4f5f7", ground: "#e9eaed" },
  { name: "Dark",     color: "#1b1c1f", ground: "#2a2b2f" },
  { name: "Slate",    color: "#1a2033", ground: "#222840" },
  { name: "Warm",     color: "#1f1a14", ground: "#2c2418" },
];

const VIEWS: Record<string, { pos: [number, number, number]; target: [number, number, number] }> = {
  iso: { pos: [3.0, 2.2, 4.0], target: [0, 0.35, 0] },
  front: { pos: [0, 0.9, 3.6], target: [0, 0.65, 0] },
  side: { pos: [3.8, 0.6, 0], target: [0, 0.4, 0] },
  top: { pos: [0.01, 4.2, 0.01], target: [0, 0, 0] },
};

// Overall footprint stays constant (screen-size scaling applies uniformly on top);
// everything else that actually varies between laptop families lives in SHAPE_PROFILES below.
const DIMS = {
  width: 2.2,
  depth: 1.5,
};

// ---- Shape profiles: brand families get genuinely different proportions/details, not just color ----
type ShapeProfile = {
  name: string;
  baseThickness: number;
  lidThickness: number;
  cornerRadius: number;      // 0 = sharp/angular, higher = rounded consumer look
  deckInsetX: number;        // how far the keyboard deck sits in from the sides
  bezelInset: number;        // screen bezel thickness (larger = thicker bezel, ThinkPad-like)
  vents: "side" | "rear" | "hidden";
  keyHeight: number;         // keycap thickness -- flatter for ultrabooks, taller for gaming
  keyGap: number;
  hasTrackpoint: boolean;
  hasCameraBump: boolean;
  logoStyle: "centered-glow" | "corner-etched";
};

const SHAPE_PROFILES: Record<string, ShapeProfile> = {
  thinkpad: {
    name: "thinkpad",
    baseThickness: 0.078,
    lidThickness: 0.038,
    cornerRadius: 0.016,
    deckInsetX: 0.16,
    bezelInset: 0.05,
    vents: "side",
    keyHeight: 0.014,
    keyGap: 0.02,
    hasTrackpoint: true,
    hasCameraBump: true,
    logoStyle: "corner-etched",
  },
  macbook: {
    name: "macbook",
    baseThickness: 0.052,
    lidThickness: 0.028,
    cornerRadius: 0.065,
    deckInsetX: 0.11,
    bezelInset: 0.022,
    vents: "hidden",
    keyHeight: 0.009,
    keyGap: 0.014,
    hasTrackpoint: false,
    hasCameraBump: false,
    logoStyle: "centered-glow",
  },
  gaming: {
    name: "gaming",
    baseThickness: 0.098,
    lidThickness: 0.05,
    cornerRadius: 0.022,
    deckInsetX: 0.18,
    bezelInset: 0.035,
    vents: "rear",
    keyHeight: 0.02,
    keyGap: 0.016,
    hasTrackpoint: false,
    hasCameraBump: false,
    logoStyle: "centered-glow",
  },
  default: {
    name: "default",
    baseThickness: 0.07,
    lidThickness: 0.04,
    cornerRadius: 0.04,
    deckInsetX: 0.14,
    bezelInset: 0.045,
    vents: "side",
    keyHeight: 0.016,
    keyGap: 0.018,
    hasTrackpoint: false,
    hasCameraBump: false,
    logoStyle: "centered-glow",
  },
};

function isThinkpadName(brand?: string, model?: string): boolean {
  const b = (brand || "").toLowerCase();
  const m = (model || "").toLowerCase();
  return b.includes("thinkpad") || m.includes("thinkpad") ||
    (b.includes("lenovo") && (m.includes("x1") || m.includes("t14") || m.includes("carbon") || m.includes("p1")));
}

function profileForLaptop(brand?: string, model?: string): ShapeProfile {
  const b = (brand || "").toLowerCase();
  const m = (model || "").toLowerCase();
  if (b.includes("apple") || b.includes("macbook") || m.includes("macbook")) return SHAPE_PROFILES.macbook;
  if (isThinkpadName(brand, model)) return SHAPE_PROFILES.thinkpad;
  if (
    b.includes("rog") || m.includes("rog") || b.includes("razer") || b.includes("msi") ||
    m.includes("legion") || m.includes("predator") || m.includes("alienware") || m.includes("titan")
  ) return SHAPE_PROFILES.gaming;
  return SHAPE_PROFILES.default;
}

// ---- Exact-model dimension overrides, sourced from real spec sheets (mm, converted to scene units) ----
// This is the actual accuracy upgrade: instead of every ThinkPad or every MacBook sharing one guessed
// shape, laptops matching these specific model names get their *real* measured footprint and thickness.
// Anything not in this table still falls back to its shape-profile family above.
type DimensionOverride = { widthScene: number; depthScene: number; thicknessScene: number };

// Calibrated against the ThinkPad T14 Gen 5's real 315.9 x 223.7mm footprint mapping to this scene's
// existing 2.2 x 1.5 unit baseline -- so all other real-world mm figures convert on the same scale.
const MM_TO_SCENE_W = 2.2 / 315.9;
const MM_TO_SCENE_D = 1.5 / 223.7;

function mmToScene(widthMm: number, depthMm: number, thicknessMm: number): DimensionOverride {
  return {
    widthScene: widthMm * MM_TO_SCENE_W,
    depthScene: depthMm * MM_TO_SCENE_D,
    thicknessScene: thicknessMm * MM_TO_SCENE_W,
  };
}

// Keys are matched as case-insensitive substrings against "<brand> <model>".
// Source: manufacturer spec sheets / PSREF, checked at the time these were added.
const MODEL_DIMENSIONS: Record<string, DimensionOverride> = {
  "thinkpad t14 gen 5": mmToScene(315.9, 223.7, 17.7),
  "thinkpad t14s gen 5": mmToScene(313.6, 219.4, 15.3),
  "macbook air 13": mmToScene(304.1, 215.0, 11.3),
  "macbook air m2": mmToScene(304.1, 215.0, 11.3),
  "macbook pro 14": mmToScene(312.6, 221.2, 15.5),
  "legion 5": mmToScene(362.5, 260.0, 24.0),
  "xps 13": mmToScene(295.3, 199.04, 14.8),
};

function dimensionOverrideForLaptop(brand?: string, model?: string): DimensionOverride | null {
  const key = `${brand || ""} ${model || ""}`.toLowerCase();
  for (const [needle, dims] of Object.entries(MODEL_DIMENSIONS)) {
    if (key.includes(needle)) return dims;
  }
  return null;
}

// ---- Real official color options per model, replacing the generic 14-swatch palette ----
// When a laptop matches one of these, the Color picker shows ONLY the colors that
// model actually ships in (verified against manufacturer pages), instead of letting
// the user pick an arbitrary shade Lenovo/Apple/Dell never made.
type OfficialColor = { name: string; hex: string };

const OFFICIAL_COLORS: Record<string, OfficialColor[]> = {
  "thinkpad t14 gen 5": [{ name: "Thunder Black", hex: "#1c1e22" }],
  "thinkpad t14s gen 5": [{ name: "Thunder Black", hex: "#1c1e22" }],
  "macbook air 13": [
    { name: "Midnight", hex: "#1e2a3d" },
    { name: "Starlight", hex: "#e9e2d0" },
    { name: "Space Gray", hex: "#5c5c5e" },
    { name: "Silver", hex: "#e5e5e7" },
  ],
  "macbook air m2": [
    { name: "Midnight", hex: "#1e2a3d" },
    { name: "Starlight", hex: "#e9e2d0" },
    { name: "Space Gray", hex: "#5c5c5e" },
    { name: "Silver", hex: "#e5e5e7" },
  ],
  "macbook pro 14": [
    { name: "Space Gray", hex: "#4b4d50" },
    { name: "Silver", hex: "#e5e5e7" },
  ],
  "xps 13": [
    { name: "Platinum", hex: "#e6e6e8" },
    { name: "Graphite", hex: "#3a3a3c" },
  ],
  "spectre x360": [
    { name: "Nightfall Black", hex: "#1a1a1c" },
    { name: "Natural Silver", hex: "#d6d6d8" },
    { name: "Nocturne Blue", hex: "#1f3350" },
  ],
  "legion 5": [{ name: "Onyx Grey", hex: "#3a3b3f" }],
  "legion pro 5": [{ name: "Onyx Grey", hex: "#3a3b3f" }],
};

function officialColorsForLaptop(brand?: string, model?: string): OfficialColor[] | null {
  const key = `${brand || ""} ${model || ""}`.toLowerCase();
  for (const [needle, colors] of Object.entries(OFFICIAL_COLORS)) {
    if (key.includes(needle)) return colors;
  }
  return null;
}

// ---- Real per-family port layouts, replacing the old "3 identical slots on the right" ----
// Actual counts/types/sides sourced from spec sheets: e.g. a real ThinkPad T14 has 2x USB-A +
// HDMI on one side and 2x USB-C/Thunderbolt + Ethernet + audio on the other; a MacBook Air has
// only MagSafe + 2x Thunderbolt on the left and a headphone jack on the right, nothing more.
type PortType = "usb-a" | "usb-c" | "hdmi" | "ethernet" | "audio" | "sdcard" | "lock" | "magsafe";
type PortSpec = { type: PortType; zRatio: number }; // zRatio: 0 = back/hinge edge, 1 = front edge

const PORT_DIMENSIONS: Record<PortType, { w: number; h: number; color: string }> = {
  "usb-a":   { w: 0.026, h: 0.011, color: "#9a9ea3" },
  "usb-c":   { w: 0.014, h: 0.006, color: "#c9ccd1" },
  "hdmi":    { w: 0.024, h: 0.008, color: "#9a9ea3" },
  "ethernet":{ w: 0.024, h: 0.02,  color: "#3a3d42" },
  "audio":   { w: 0.012, h: 0.012, color: "#1a1a1c" },
  "sdcard":  { w: 0.026, h: 0.003, color: "#5a5d62" },
  "lock":    { w: 0.012, h: 0.007, color: "#2a2c30" },
  "magsafe": { w: 0.016, h: 0.009, color: "#c9ccd1" },
};

const PORT_LAYOUTS: Record<string, { left: PortSpec[]; right: PortSpec[] }> = {
  thinkpad: {
    // Real T14: right side has 2x USB-A + HDMI; left side has 2x USB-C (Thunderbolt/USB4),
    // Ethernet, headphone jack, and a Kensington lock slot near the back.
    right: [
      { type: "lock", zRatio: 0.08 },
      { type: "hdmi", zRatio: 0.28 },
      { type: "usb-a", zRatio: 0.52 },
      { type: "usb-a", zRatio: 0.74 },
    ],
    left: [
      { type: "ethernet", zRatio: 0.15 },
      { type: "usb-c", zRatio: 0.4 },
      { type: "usb-c", zRatio: 0.58 },
      { type: "audio", zRatio: 0.8 },
    ],
  },
  macbook: {
    // Real MacBook Air: MagSafe 3 + 2x Thunderbolt/USB4 all on the left, headphone jack alone
    // on the right. Nothing else -- no HDMI, no USB-A, no Ethernet, no SD card.
    left: [
      { type: "magsafe", zRatio: 0.2 },
      { type: "usb-c", zRatio: 0.5 },
      { type: "usb-c", zRatio: 0.68 },
    ],
    right: [
      { type: "audio", zRatio: 0.25 },
    ],
  },
  gaming: {
    // Gaming laptops typically load most I/O onto the left side plus a rear cluster (approximated
    // here as extra left-side ports since this model doesn't build a separate back panel), with
    // just audio/one USB-A on the right so the RGB/vent side stays clear.
    left: [
      { type: "ethernet", zRatio: 0.12 },
      { type: "hdmi", zRatio: 0.3 },
      { type: "usb-c", zRatio: 0.48 },
      { type: "usb-a", zRatio: 0.64 },
      { type: "sdcard", zRatio: 0.82 },
    ],
    right: [
      { type: "usb-a", zRatio: 0.35 },
      { type: "audio", zRatio: 0.6 },
    ],
  },
  default: {
    right: [
      { type: "usb-a", zRatio: 0.25 },
      { type: "usb-a", zRatio: 0.5 },
      { type: "audio", zRatio: 0.75 },
    ],
    left: [
      { type: "usb-c", zRatio: 0.3 },
      { type: "hdmi", zRatio: 0.6 },
    ],
  },
};

function portLayoutForProfile(profileName: string): { left: PortSpec[]; right: PortSpec[] } {
  return PORT_LAYOUTS[profileName] ?? PORT_LAYOUTS.default;
}

// ---- Real keyboard layouts with actual printed labels, instead of a blank uniform grid ----
// A "u" is one standard keycap width; wider keys (space, shift, enter) get a multiple of that.
type KeyDef = { label: string; u: number; isMod?: boolean };
type KeyRow = KeyDef[];

const U = 0.1; // one key unit in scene units, matches the old keySize

const NUMBER_ROW: KeyRow = [
  { label: "`", u: 1 }, { label: "1", u: 1 }, { label: "2", u: 1 }, { label: "3", u: 1 },
  { label: "4", u: 1 }, { label: "5", u: 1 }, { label: "6", u: 1 }, { label: "7", u: 1 },
  { label: "8", u: 1 }, { label: "9", u: 1 }, { label: "0", u: 1 }, { label: "-", u: 1 },
  { label: "=", u: 1 }, { label: "Bksp", u: 1.8, isMod: true },
];
const QWERTY_ROW: KeyRow = [
  { label: "Tab", u: 1.4, isMod: true }, { label: "Q", u: 1 }, { label: "W", u: 1 }, { label: "E", u: 1 },
  { label: "R", u: 1 }, { label: "T", u: 1 }, { label: "Y", u: 1 }, { label: "U", u: 1 }, { label: "I", u: 1 },
  { label: "O", u: 1 }, { label: "P", u: 1 }, { label: "[", u: 1 }, { label: "]", u: 1 }, { label: "\\", u: 1.2, isMod: true },
];
const HOME_ROW: KeyRow = [
  { label: "Caps", u: 1.7, isMod: true }, { label: "A", u: 1 }, { label: "S", u: 1 }, { label: "D", u: 1 },
  { label: "F", u: 1 }, { label: "G", u: 1 }, { label: "H", u: 1 }, { label: "J", u: 1 }, { label: "K", u: 1 },
  { label: "L", u: 1 }, { label: ";", u: 1 }, { label: "'", u: 1 }, { label: "Enter", u: 2.1, isMod: true },
];
const SHIFT_ROW: KeyRow = [
  { label: "Shift", u: 2.2, isMod: true }, { label: "Z", u: 1 }, { label: "X", u: 1 }, { label: "C", u: 1 },
  { label: "V", u: 1 }, { label: "B", u: 1 }, { label: "N", u: 1 }, { label: "M", u: 1 }, { label: ",", u: 1 },
  { label: ".", u: 1 }, { label: "/", u: 1 }, { label: "Shift", u: 2.6, isMod: true },
];
const FUNCTION_ROW: KeyRow = [
  { label: "Esc", u: 1, isMod: true },
  ...Array.from({ length: 12 }, (_, i) => ({ label: `F${i + 1}`, u: 1 })),
];

// ThinkPad's signature layout quirk: Fn sits to the LEFT of Ctrl (opposite of nearly every
// other PC keyboard), which is one of the most recognizable ThinkPad-specific details.
const THINKPAD_BOTTOM_ROW: KeyRow = [
  { label: "Fn", u: 1, isMod: true }, { label: "Ctrl", u: 1.2, isMod: true }, { label: "Win", u: 1, isMod: true },
  { label: "Alt", u: 1, isMod: true }, { label: "", u: 5.5 }, { label: "AltGr", u: 1, isMod: true },
  { label: "Ctrl", u: 1.2, isMod: true }, { label: "\u25c0", u: 0.9, isMod: true }, { label: "\u25b2\n\u25bc", u: 0.9, isMod: true },
  { label: "\u25b6", u: 0.9, isMod: true },
];

// MacBook: Control/Option/Command ordering with the Touch ID button replacing the last
// function-row key, and the same inverted-T arrow cluster Apple has used for years.
const MACBOOK_BOTTOM_ROW: KeyRow = [
  { label: "Fn", u: 1, isMod: true }, { label: "Ctrl", u: 1, isMod: true }, { label: "\u2325", u: 1, isMod: true },
  { label: "\u2318", u: 1.3, isMod: true }, { label: "", u: 5 }, { label: "\u2318", u: 1.3, isMod: true },
  { label: "\u2325", u: 1, isMod: true }, { label: "\u25c0", u: 0.9, isMod: true }, { label: "\u25b2\n\u25bc", u: 0.9, isMod: true },
  { label: "\u25b6", u: 0.9, isMod: true },
];
const MACBOOK_FUNCTION_ROW: KeyRow = [
  { label: "esc", u: 1, isMod: true },
  ...Array.from({ length: 11 }, (_, i) => ({ label: `F${i + 1}`, u: 1 })),
  { label: "\u25c9", u: 1, isMod: true }, // Touch ID
];

const GAMING_BOTTOM_ROW: KeyRow = [
  { label: "Ctrl", u: 1.2, isMod: true }, { label: "Win", u: 1, isMod: true }, { label: "Alt", u: 1, isMod: true },
  { label: "", u: 6.25 }, { label: "Alt", u: 1, isMod: true }, { label: "Fn", u: 1, isMod: true },
  { label: "Ctrl", u: 1.2, isMod: true }, { label: "\u25c0", u: 0.9, isMod: true }, { label: "\u25b2\n\u25bc", u: 0.9, isMod: true },
  { label: "\u25b6", u: 0.9, isMod: true },
];

// Extra numpad block for larger gaming laptops (e.g. a real Legion Pro 5 16" ships with one).
const NUMPAD_ROWS: KeyRow[] = [
  [{ label: "NumLk", u: 1, isMod: true }, { label: "/", u: 1 }, { label: "*", u: 1 }, { label: "-", u: 1 }],
  [{ label: "7", u: 1 }, { label: "8", u: 1 }, { label: "9", u: 1 }, { label: "+", u: 1 }],
  [{ label: "4", u: 1 }, { label: "5", u: 1 }, { label: "6", u: 1 }, { label: "", u: 1 }],
  [{ label: "1", u: 1 }, { label: "2", u: 1 }, { label: "3", u: 1 }, { label: "Enter", u: 1, isMod: true }],
  [{ label: "0", u: 2 }, { label: ".", u: 1 }, { label: "", u: 1 }],
];

function keyboardLayoutForProfile(profileName: string): { rows: KeyRow[]; numpad: KeyRow[] | null } {
  if (profileName === "thinkpad") {
    return { rows: [FUNCTION_ROW, NUMBER_ROW, QWERTY_ROW, HOME_ROW, SHIFT_ROW, THINKPAD_BOTTOM_ROW], numpad: null };
  }
  if (profileName === "macbook") {
    return { rows: [MACBOOK_FUNCTION_ROW, NUMBER_ROW, QWERTY_ROW, HOME_ROW, SHIFT_ROW, MACBOOK_BOTTOM_ROW], numpad: null };
  }
  if (profileName === "gaming") {
    return { rows: [FUNCTION_ROW, NUMBER_ROW, QWERTY_ROW, HOME_ROW, SHIFT_ROW, GAMING_BOTTOM_ROW], numpad: NUMPAD_ROWS };
  }
  return { rows: [FUNCTION_ROW, NUMBER_ROW, QWERTY_ROW, HOME_ROW, SHIFT_ROW, THINKPAD_BOTTOM_ROW.map((k) => k.label === "Fn" ? { ...k, label: "Ctrl" } : k)], numpad: null };
}

// Cache one small canvas texture per unique label so we don't regenerate ~50 identical
// "A" textures across different keyboards/rebuilds.
const keyLabelTextureCache = new Map<string, THREE.CanvasTexture>();
function getKeyLabelTexture(label: string, isMod: boolean): THREE.CanvasTexture {
  const cacheKey = `${label}|${isMod}`;
  const cached = keyLabelTextureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#1a1b1e";
  ctx.fillRect(0, 0, 64, 64);
  if (label) {
    ctx.fillStyle = isMod ? "#b8bcc4" : "#e8eaee";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = label.split("\n");
    const fontSize = isMod ? (lines[0].length > 2 ? 13 : 18) : 26;
    ctx.font = `${isMod ? "600" : "500"} ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
    const lineHeight = fontSize * 1.05;
    const startY = 32 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => ctx.fillText(line, 32, startY + i * lineHeight));
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  keyLabelTextureCache.set(cacheKey, tex);
  return tex;
}

// Builds one row of individually-shaped, individually-labeled keycaps (not a uniform
// instanced grid) so wide keys (space/shift/enter) actually look wide and every key
// shows its real character.
function buildKeyRow(
  row: KeyRow,
  centerX: number,
  z: number,
  yBase: number,
  keyHeight: number,
  keyGap: number,
  sideMat: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  const totalUnits = row.reduce((sum, k) => sum + k.u, 0) + (row.length - 1) * (keyGap / U);
  let cursor = -((totalUnits * U) / 2);
  row.forEach((key) => {
    const keyW = key.u * U - keyGap * 0.3;
    const keyD = U - keyGap * 0.3;
    const x = cursor + (key.u * U) / 2;
    cursor += key.u * U + keyGap;

    if (!key.label && key.u < 2) {
      // Blank filler slot (e.g. gap in numpad) -- skip rendering a cap entirely.
      return;
    }

    const geo = new RoundedBoxGeometry(keyW, keyHeight, keyD, 2, 0.018);
    const topMat = new THREE.MeshStandardMaterial({
      map: getKeyLabelTexture(key.label, !!key.isMod),
      roughness: 0.5,
      metalness: 0.15,
    });
    // Materials order for a Box-derived geometry: [+x,-x,+y,-y,+z,-z] -- index 2 is the top face.
    const mesh = new THREE.Mesh(geo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
    mesh.position.set(centerX + x, yBase + keyHeight / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  return group;
}

function makeBrushedMetalNormalMap(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#8080ff";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * size;
    const shade = 118 + Math.floor(Math.random() * 20);
    ctx.strokeStyle = `rgba(${shade},${shade},255,${0.06 + Math.random() * 0.08})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 3);
  return tex;
}

function makeMicroRoughnessMap(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 200 + Math.floor(Math.random() * 55);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  return tex;
}

function makeContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(0,0,0,0.55)");
  gradient.addColorStop(0.35, "rgba(0,0,0,0.32)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

const texLoader = typeof window !== "undefined" ? new THREE.TextureLoader() : null;

function getDisplayTexture(theme: "windows" | "mac", customUrl?: string): THREE.Texture {
  if (!texLoader) {
    const fallback = new THREE.Texture();
    return fallback;
  }
  let url = theme === "windows" ? win11B64 : macB64;
  if (customUrl) {
    url = `https://api.allorigins.win/raw?url=${encodeURIComponent(customUrl)}`;
  }
  texLoader.crossOrigin = "anonymous";
  const tex = texLoader.load(url, () => {
    tex.needsUpdate = true;
  });
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBrandLogoTexture(brand: string, model: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 512);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const b = (brand || "").toLowerCase();
  const m = (model || "").toLowerCase();

  if (b.includes("apple") || b.includes("macbook") || m.includes("macbook")) {
    ctx.beginPath();
    ctx.arc(256, 276, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(380, 276, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.ellipse(256, 100, 40, 20, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.includes("dell")) {
    ctx.beginPath();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 20;
    ctx.arc(256, 256, 180, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = "bold 110px sans-serif";
    ctx.fillText("DELL", 256, 276);
  } else if (b.includes("hp")) {
    ctx.beginPath();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 20;
    ctx.arc(256, 256, 180, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = "italic bold 160px serif";
    ctx.fillText("hp", 256, 270);
  } else if (b.includes("lenovo") || b.includes("thinkpad") || m.includes("thinkpad") || m.includes("legion") || m.includes("yoga")) {
    const isThinkpad = isThinkpadName(brand, model);
    if (isThinkpad) {
      ctx.font = "bold 90px sans-serif";
      ctx.fillText("ThinkPad", 256, 256);
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(425, 200, 18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.font = "bold 120px sans-serif";
      ctx.fillText("Lenovo", 256, 256);
    }
  } else if (b.includes("asus") || b.includes("rog") || m.includes("rog") || m.includes("expertbook") || m.includes("zenbook") || m.includes("vivobook")) {
    if (m.includes("rog") || b.includes("rog")) {
      ctx.font = "bold 120px sans-serif";
      ctx.fillText("ROG", 256, 256);
      ctx.fillRect(100, 310, 312, 12);
    } else {
      ctx.font = "bold 130px sans-serif";
      ctx.fillText("ASUS", 256, 256);
    }
  } else if (b.includes("acer") || m.includes("acer")) {
    ctx.font = "bold 140px sans-serif";
    ctx.fillText("acer", 256, 256);
  } else {
    ctx.beginPath();
    ctx.arc(256, 256, 100, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

function makeLenovoBadgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 256, 64);

  ctx.fillStyle = "#444444";
  ctx.font = "bold 44px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Lenovo", 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

type LaptopMeshRefs = {
  bodyMeshes: THREE.Mesh[];
  screenPivot: THREE.Group;
  display: THREE.Mesh;
  backlightPlane: THREE.Mesh;
  logo: THREE.Mesh;
  secondaryLogo: THREE.Mesh;
  trackpoint: THREE.Mesh;
  cameraBump: THREE.Mesh;
  bottomDetails: THREE.Group;
  group: THREE.Group;
  profile: ShapeProfile;
  width: number;
  depth: number;
  lidThickness: number;
  dimsOverride: DimensionOverride | null;
};

// buildLaptop now takes a ShapeProfile so different laptop families get real
// geometric differences (thickness, corner radius, deck size, vents, key height)
// instead of only a recolored identical box.
function buildLaptop(
  bodyMat: THREE.MeshPhysicalMaterial,
  displayTexture: THREE.Texture,
  profile: ShapeProfile,
  dimsOverride: DimensionOverride | null
): { group: THREE.Group; refs: LaptopMeshRefs } {
  const group = new THREE.Group();
  const bodyMeshes: THREE.Mesh[] = [];
  const width = dimsOverride?.widthScene ?? DIMS.width;
  const depth = dimsOverride?.depthScene ?? DIMS.depth;
  const { cornerRadius, deckInsetX, bezelInset, keyHeight, keyGap } = profile;
  // Real measured thickness (when we have a spec-sheet match) overrides the profile's guessed thickness.
  // Split roughly 70/30 between base and lid, matching typical laptop proportions.
  const baseThickness = dimsOverride ? dimsOverride.thicknessScene * 0.68 : profile.baseThickness;
  const lidThickness = dimsOverride ? dimsOverride.thicknessScene * 0.32 : profile.lidThickness;

  const darkMat = new THREE.MeshStandardMaterial({
    color: "#181a1e",
    roughness: 0.75,
    metalness: 0.15,
  });
  const bezelMat = new THREE.MeshStandardMaterial({
    color: "#0a0a0a",
    roughness: 0.35,
    metalness: 0.55,
  });
  const keyMat = new THREE.MeshStandardMaterial({
    color: "#1a1b1e",
    roughness: 0.42,
    metalness: 0.25,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: "#2a2c30",
    roughness: 0.04,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const screenGlassMat = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    metalness: 0.1,
    roughness: 0,
    transmission: 1.0,
    ior: 1.5,
    transparent: true,
    opacity: 1,
  });
  const ventAccentMat = new THREE.MeshStandardMaterial({
    color: profile.vents === "rear" ? "#ff3b3b" : "#0d0e0f",
    roughness: 0.6,
    metalness: 0.3,
    emissive: profile.vents === "rear" ? new THREE.Color("#ff3b3b") : new THREE.Color("#000000"),
    emissiveIntensity: profile.vents === "rear" ? 0.35 : 0,
  });

  const base = new THREE.Mesh(
    new RoundedBoxGeometry(width, baseThickness, depth, 16, cornerRadius),
    bodyMat
  );
  base.position.y = baseThickness / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  bodyMeshes.push(base);

  const footGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.008, 14);
  const footMat = new THREE.MeshStandardMaterial({ color: "#0d0e0f", roughness: 0.9 });
  const footOffsets: [number, number][] = [
    [-width / 2 + 0.12, -depth / 2 + 0.12],
    [width / 2 - 0.12, -depth / 2 + 0.12],
    [-width / 2 + 0.12, depth / 2 - 0.12],
    [width / 2 - 0.12, depth / 2 - 0.12],
  ];
  footOffsets.forEach(([x, z]) => {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(x, -0.004, z);
    group.add(foot);
  });

  // ---- Vents: differ by profile instead of always identical side slats ----
  if (profile.vents === "side") {
    const ventGeo = new THREE.BoxGeometry(0.09, 0.006, 0.012);
    for (let i = 0; i < 10; i++) {
      const vent = new THREE.Mesh(ventGeo, darkMat);
      vent.position.set(-width / 2 + 0.25 + i * 0.1, baseThickness - 0.002, -depth / 2 + 0.01);
      group.add(vent);
    }
  } else if (profile.vents === "rear") {
    // Aggressive rear-exhaust slats with a colored accent line, gaming-laptop style
    const ventGeo = new THREE.BoxGeometry(0.05, baseThickness * 0.7, 0.014);
    const slatCount = 14;
    const spanW = width - 0.3;
    for (let i = 0; i < slatCount; i++) {
      const vent = new THREE.Mesh(ventGeo, darkMat);
      vent.position.set(-spanW / 2 + (i / (slatCount - 1)) * spanW, baseThickness * 0.55, -depth / 2 + 0.006);
      group.add(vent);
    }
    const accent = new THREE.Mesh(new THREE.BoxGeometry(spanW + 0.02, 0.006, 0.01), ventAccentMat);
    accent.position.set(0, baseThickness * 0.2, -depth / 2 + 0.006);
    group.add(accent);
  }
  // profile.vents === "hidden" -> no visible vent geometry (MacBook-style bottom-only venting, omitted for simplicity)

  const deckWidth = width - deckInsetX * 2;
  const deckDepth = depth - 0.42;
  const deck = new THREE.Mesh(
    new RoundedBoxGeometry(deckWidth, 0.006, deckDepth, 3, Math.min(0.02, cornerRadius)),
    darkMat
  );
  deck.position.set(0, baseThickness + 0.003, -depth * 0.06);
  group.add(deck);

  const backlightPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(deckWidth - 0.05, deckDepth - 0.32),
    new THREE.MeshStandardMaterial({
      color: "#000000",
      emissive: new THREE.Color("#4d9dff"),
      emissiveIntensity: 0,
      roughness: 1,
    })
  );
  backlightPlane.rotation.x = -Math.PI / 2;
  backlightPlane.position.set(0, baseThickness + 0.009, deck.position.z + 0.02);
  group.add(backlightPlane);

  // Real keyboard: individually shaped/labeled rows instead of a uniform blank grid.
  // Layout (row order, key widths, Fn/Ctrl position, numpad presence) is chosen per
  // shape-profile family, so a ThinkPad, a MacBook, and a gaming laptop actually differ.
  const { rows: kbRows, numpad } = keyboardLayoutForProfile(profile.name);
  const keySideMat = keyMat;
  const rowGap = U + keyGap;
  const kbTotalDepth = kbRows.length * rowGap;
  const kbStartZ = deck.position.z - kbTotalDepth / 2 + rowGap / 2 + 0.02;

  // Numpad shifts the main alpha block left to make room on the right, matching how a
  // real numpad gaming keyboard is laid out (not centered when a numpad is present).
  const numpadUnits = numpad ? Math.max(...numpad.map((r) => r.reduce((s, k) => s + k.u, 0))) : 0;
  const mainBlockCenterX = numpad ? -(numpadUnits * U) / 2 - 0.04 : 0;

  kbRows.forEach((row, i) => {
    const z = kbStartZ + i * rowGap;
    const rowGroup = buildKeyRow(row, mainBlockCenterX, z, baseThickness + 0.006, keyHeight, keyGap, keySideMat);
    group.add(rowGroup);
  });

  if (numpad) {
    const numpadStartZ = deck.position.z - (numpad.length * rowGap) / 2 + rowGap / 2 + 0.02;
    const numpadCenterX = mainBlockCenterX + (Math.max(...kbRows.map((r) => r.reduce((s, k) => s + k.u, 0))) * U) / 2 + 0.06 + (numpadUnits * U) / 2;
    numpad.forEach((row, i) => {
      const z = numpadStartZ + i * rowGap;
      const rowGroup = buildKeyRow(row, numpadCenterX, z, baseThickness + 0.006, keyHeight, keyGap, keySideMat);
      group.add(rowGroup);
    });
  }

  // ThinkPad TrackPoint (red dot in the middle of keyboard) -- visibility set per-profile below
  const trackpoint = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 16, 16),
    new THREE.MeshStandardMaterial({ color: "#ff0000", roughness: 0.7 })
  );
  trackpoint.position.set(0, baseThickness + 0.02, deck.position.z);
  trackpoint.visible = profile.hasTrackpoint;
  group.add(trackpoint);

  const trackpad = new THREE.Mesh(
    new RoundedBoxGeometry(0.62, 0.004, 0.4, 4, 0.025),
    glassMat
  );
  trackpad.position.set(0, baseThickness + 0.004, depth * 0.34);
  group.add(trackpad);

  const dotGeo = new THREE.CircleGeometry(0.008, 8);
  const dotMat = new THREE.MeshStandardMaterial({ color: "#0d0e0f", roughness: 0.9 });
  const speakerClusters: [number, number][] = [
    [-deckWidth / 2 + 0.1, -depth / 2 + 0.12],
    [deckWidth / 2 - 0.1, -depth / 2 + 0.12],
  ];
  speakerClusters.forEach(([cx, cz]) => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(cx + c * 0.02 - 0.02, baseThickness + 0.0035, cz + r * 0.02);
        group.add(dot);
      }
    }
  });

  // Ports: real per-family layout instead of 3 identical generic slots always on the right.
  // A ThinkPad, a MacBook, and a gaming laptop each get genuinely different port counts,
  // types, and which side they're on -- matching what those laptops actually have.
  const portMetalMat = new THREE.MeshStandardMaterial({
    color: "#c9ccd1",
    roughness: 0.25,
    metalness: 0.85,
  });
  const layout = portLayoutForProfile(profile.name);
  const buildPortsOnSide = (ports: PortSpec[], side: "left" | "right") => {
    const xFace = side === "right" ? width / 2 : -width / 2;
    ports.forEach(({ type, zRatio }) => {
      const dim = PORT_DIMENSIONS[type];
      const z = -depth / 2 + zRatio * depth;
      const y = baseThickness / 2 + 0.005;
      const outerGeo = new THREE.BoxGeometry(0.012, dim.h + 0.006, dim.w + 0.006);
      const outer = new THREE.Mesh(outerGeo, darkMat);
      outer.position.set(xFace - (side === "right" ? 0.003 : -0.003), y, z);
      group.add(outer);

      const innerMat = type === "audio"
        ? new THREE.MeshStandardMaterial({ color: PORT_DIMENSIONS.audio.color, roughness: 0.5, metalness: 0.2 })
        : portMetalMat;
      const innerGeo = type === "audio"
        ? new THREE.CylinderGeometry(dim.w / 2, dim.w / 2, 0.006, 16)
        : new THREE.BoxGeometry(0.006, dim.h, dim.w);
      const inner = new THREE.Mesh(innerGeo, innerMat);
      if (type === "audio") inner.rotation.z = Math.PI / 2;
      inner.position.set(xFace - (side === "right" ? 0.001 : -0.001), y, z);
      group.add(inner);
    });
  };
  buildPortsOnSide(layout.left, "left");
  buildPortsOnSide(layout.right, "right");

  const screenPivot = new THREE.Group();
  screenPivot.position.set(0, baseThickness, -depth / 2);
  group.add(screenPivot);

  // Bottom Details (Feet and Vents) -- shown for ThinkPad-style profiles only
  const bottomDetails = new THREE.Group();
  bottomDetails.position.set(0, 0, 0);

  const tpFootGeo = new RoundedBoxGeometry(0.12, 0.015, 0.04, 4, 0.005);
  const tpFootMat = new THREE.MeshStandardMaterial({ color: "#000000", roughness: 0.9 });

  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([signX, signZ]) => {
    const foot = new THREE.Mesh(tpFootGeo, tpFootMat);
    foot.position.set(signX * (width / 2 - 0.2), -0.005, signZ * (depth / 2 - 0.15));
    bottomDetails.add(foot);
  });

  const tpVentGeo = new THREE.BoxGeometry(0.5, 0.005, 0.01);
  for (let i = 0; i < 7; i++) {
    const vent = new THREE.Mesh(tpVentGeo, darkMat);
    vent.position.set(-width / 4, -0.002, -0.1 + i * 0.03);
    bottomDetails.add(vent);
  }
  bottomDetails.visible = false;
  group.add(bottomDetails);

  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, width - 0.3, 24),
    darkMat
  );
  hinge.rotation.z = Math.PI / 2;
  hinge.castShadow = true;
  screenPivot.add(hinge);

  const lid = new THREE.Mesh(
    new RoundedBoxGeometry(width, depth, lidThickness, 16, cornerRadius),
    bodyMat
  );
  lid.position.set(0, depth / 2, -lidThickness / 2);
  lid.castShadow = true;
  screenPivot.add(lid);
  bodyMeshes.push(lid);

  const cameraBump = new THREE.Mesh(
    new RoundedBoxGeometry(0.5, 0.04, lidThickness, 8, 0.01),
    bodyMat
  );
  cameraBump.position.set(0, depth + 0.01, -lidThickness / 2);
  cameraBump.castShadow = true;
  cameraBump.visible = profile.hasCameraBump;
  screenPivot.add(cameraBump);
  bodyMeshes.push(cameraBump);

  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.28),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 0,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      alphaTest: 0.1,
    })
  );
  logo.rotation.y = Math.PI;
  logo.position.set(0, depth / 2, -lidThickness - 0.001);
  screenPivot.add(logo);

  const secondaryLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.045),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      metalness: 1.0,
      roughness: 0.1,
      transparent: true,
      alphaTest: 0.1,
      map: makeLenovoBadgeTexture()
    })
  );
  secondaryLogo.rotation.y = Math.PI;
  secondaryLogo.position.set(-width / 2 + 0.15, 0.25, -lidThickness - 0.001);
  secondaryLogo.rotation.z = Math.PI / 2;
  secondaryLogo.visible = false;
  screenPivot.add(secondaryLogo);

  // Bezel thickness now varies by profile -- ThinkPad gets a visibly thicker bezel,
  // MacBook a much thinner one, instead of both sharing one fixed inset.
  const bezel = new THREE.Mesh(
    new THREE.PlaneGeometry(width - bezelInset, depth - bezelInset),
    bezelMat
  );
  bezel.position.set(0, depth / 2, 0.002);
  screenPivot.add(bezel);

  const displayMat = new THREE.MeshBasicMaterial({
    map: displayTexture,
    color: 0xffffff,
    toneMapped: false,
  });
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(width - bezelInset * 1.8, depth - bezelInset * 2.2),
    displayMat
  );
  display.position.set(0, depth / 2 + 0.02, 0.003);
  screenPivot.add(display);

  const screenGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(width - bezelInset, depth - bezelInset),
    screenGlassMat
  );
  screenGlass.position.set(0, depth / 2, 0.0035);
  screenPivot.add(screenGlass);

  const cam = new THREE.Mesh(
    new THREE.CircleGeometry(0.012, 12),
    new THREE.MeshStandardMaterial({ color: "#050506", roughness: 0.4 })
  );
  cam.position.set(0, depth - 0.05, 0.0025);
  screenPivot.add(cam);

  return {
    group,
    refs: {
      bodyMeshes, screenPivot, display, backlightPlane, logo, secondaryLogo,
      trackpoint, cameraBump, bottomDetails, group, profile,
      width, depth, lidThickness, dimsOverride,
    },
  };
}

// Disposes every geometry/material in a group so switching profiles doesn't leak GPU memory
function disposeGroup(group: THREE.Group) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => m?.dispose());
    }
  });
}

export default function Laptop3DViewer({ isAdmin = false, studioMode = false }: { isAdmin?: boolean; studioMode?: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<LaptopMeshRefs | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groundRef = useRef<THREE.Mesh | null>(null);
  const customModelRef = useRef<THREE.Group | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const bodyMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const normalMapRef = useRef<THREE.CanvasTexture | null>(null);
  const roughnessMapRef = useRef<THREE.CanvasTexture | null>(null);

  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [loadingLaptops, setLoadingLaptops] = useState(true);

  const [baseColor, setBaseColor] = useState(BASE_COLORS[0].hex);
  const [finishIndex, setFinishIndex] = useState(1);
  const [openAngle, setOpenAngle] = useState(105);
  const [autoRotate, setAutoRotate] = useState(true);
  const [displayOn, setDisplayOn] = useState(true);
  const [backlightIndex, setBacklightIndex] = useState(0);
  const [logoGlow, setLogoGlow] = useState(true);
  const [bgIndex, setBgIndex] = useState(0);
  const [modelScale, setModelScale] = useState(1);
  const [osTheme, setOsTheme] = useState<"windows" | "mac">("windows");
  const [brandName, setBrandName] = useState<string>("");
  const [modelName, setModelName] = useState<string>("");
  const [customDisplayUrl, setCustomDisplayUrl] = useState<string>("");
  const [saveMsg, setSaveMsg] = useState<"" | "saving" | "saved" | "error">("" );
  const [importStatus, setImportStatus] = useState<"" | "loading" | "loaded" | "error">("" );
  const [importedFileName, setImportedFileName] = useState<string>("");
  const [customModelBase64, setCustomModelBase64] = useState<string>("");

  const autoRotateRef = useRef(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // ---- Load real laptop data ----
  useEffect(() => {
    fetchLaptops()
      .then((data) => setLaptops(data))
      .catch(() => setLaptops([]))
      .finally(() => setLoadingLaptops(false));
  }, []);

  const selectedLaptop = laptops.find((l) => l.id === selectedId) || null;

  const handleSelectLaptop = (id: number | "") => {
    setSelectedId(id);
    if (id === "") {
      setBrandName("");
      setModelName("");
      setCustomDisplayUrl("");
      return;
    }
    const laptop = laptops.find((l) => l.id === id);
    if (!laptop) return;
    // Use the real official color when this exact model is recognized;
    // otherwise fall back to the old per-brand guess.
    const officialColors = officialColorsForLaptop(laptop.brand, laptop.model);
    setBaseColor(officialColors ? officialColors[0].hex : colorForBrand(laptop.brand));
    // If we have this laptop's real spec-sheet dimensions, those ALREADY encode its true
    // physical size (e.g. a 13" MacBook Air's 304.1mm real width vs a 14" ThinkPad's 315.9mm).
    // Applying an extra screen-size-based scale on top of that double-counts size and actually
    // makes cross-model proportions LESS accurate. Only fall back to the screen-size guess for
    // laptops we don't have real dimensions for.
    const hasRealDims = dimensionOverrideForLaptop(laptop.brand, laptop.model) !== null;
    setModelScale(hasRealDims ? 1 : scaleForScreenSize(laptop.screen_size));
    const theme = osThemeForBrand(laptop.brand);
    setOsTheme(theme);
    setLogoGlow(theme === "mac");
    setBrandName(laptop.brand);
    setModelName(laptop.model);

    const b = (laptop.brand || "").toLowerCase();
    const m = (laptop.model || "").toLowerCase();
    if (b.includes("msi") || b.includes("rog") || m.includes("rog") || b.includes("razer")) {
      setBacklightIndex(4);
    } else {
      setBacklightIndex(0);
    }

    setCustomDisplayUrl("");

    fetchLaptopDesign(typeof id === "number" ? id : Number(id)).then(async (design) => {
      if (!design) return;
      setBaseColor(design.color_hex);
      const fi = FINISHES.findIndex((f) => f.name === design.finish);
      if (fi >= 0) setFinishIndex(fi);
      const bi = BACKLIGHTS.findIndex((b) => b.name === design.backlight);
      if (bi >= 0) setBacklightIndex(bi);
      setOpenAngle(design.open_angle);
      setLogoGlow(design.logo_glow);

      if (design.custom_model_base64) {
        setCustomModelBase64(design.custom_model_base64);
        try {
          const res = await fetch(design.custom_model_base64);
          const blob = await res.blob();
          const file = new File([blob], "saved_model.glb", { type: blob.type });
          loadCustomModel(file, false);
        } catch (err) {
          console.error("Failed to load custom model from base64:", err);
        }
      } else {
        clearCustomModel();
      }
    });
  };

  const loadCustomModel = (file: File | null, updateBase64 = true) => {
    const scene = sceneRef.current;
    const refs = meshesRef.current;
    if (!scene) return;

    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    if (customModelRef.current) {
      scene.remove(customModelRef.current);
      customModelRef.current = null;
    }

    if (!file) {
      if (refs) refs.group.visible = true;
      setImportStatus("");
      setImportedFileName("");
      if (updateBase64) setCustomModelBase64("");
      return;
    }

    setImportStatus("loading");
    setImportedFileName(file.name);

    if (updateBase64) {
      const reader = new FileReader();
      reader.onload = () => {
        setCustomModelBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    const blobUrl = URL.createObjectURL(file);
    blobUrlRef.current = blobUrl;

    const loader = new GLTFLoader();
    loader.load(
      blobUrl,
      (gltf) => {
        const model = gltf.scene;

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 2.5;
        const scale = targetSize / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y = 0;

        if (refs) refs.group.visible = false;

        scene.add(model);
        customModelRef.current = model;

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const m = child.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
            if (m && m.color) {
              m.color.set(baseColor);
              if (m.roughness !== undefined) m.roughness = FINISHES[finishIndex].roughness;
            }
          }
        });

        setImportStatus("loaded");
      },
      undefined,
      () => {
        setImportStatus("error");
        if (refs) refs.group.visible = true;
      }
    );
  };

  const clearCustomModel = () => {
    const scene = sceneRef.current;
    const refs = meshesRef.current;
    if (customModelRef.current && scene) {
      scene.remove(customModelRef.current);
      customModelRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (refs) refs.group.visible = true;
    setImportStatus("");
    setImportedFileName("");
    setCustomModelBase64("");
  };

  // ---- One-time scene setup ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUNDS[0].color);
    scene.fog = new THREE.Fog(BACKGROUNDS[0].color, 8, 16);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(...VIEWS.iso.pos);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.minDistance = 1.8;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.zoomSpeed = 0.7;
    controls.rotateSpeed = 0.65;
    controls.panSpeed = 0.8;
    controls.target.set(...VIEWS.iso.target);
    controlsRef.current = controls;

    const hemi = new THREE.HemisphereLight(0xf5f7ff, 0x3a3d45, 0.55);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff6e8, 1.35);
    keyLight.position.set(4, 6.5, 3.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xaecbff, 0.7);
    rimLight.position.set(-4.5, 3.5, -3.5);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
    fillLight.position.set(-1.5, 1.2, 4);
    scene.add(fillLight);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(6, 64),
      new THREE.MeshStandardMaterial({ color: BACKGROUNDS[0].ground, roughness: 0.95, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.001;
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;

    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 3.5),
      new THREE.MeshBasicMaterial({
        map: makeContactShadowTexture(),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.001;
    scene.add(contactShadow);

    const normalMap = makeBrushedMetalNormalMap();
    const roughnessMap = makeMicroRoughnessMap();
    normalMapRef.current = normalMap;
    roughnessMapRef.current = roughnessMap;
    const finish = FINISHES[finishIndex];
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: baseColor,
      roughness: finish.roughness,
      metalness: finish.metalness ?? 0.78,
      clearcoat: finish.clearcoat,
      clearcoatRoughness: 0.12,
      sheen: finish.sheen,
      sheenColor: new THREE.Color(finish.sheenTint ?? "#ffffff"),
      normalMap,
      normalScale: new THREE.Vector2(0.14, 0.14),
      roughnessMap,
      envMapIntensity: 1.3,
    });
    bodyMatRef.current = bodyMat;

    const initialDisplayTexture = getDisplayTexture(osTheme, customDisplayUrl);
    const initialProfile = profileForLaptop(brandName, modelName);
    const initialDimsOverride = dimensionOverrideForLaptop(brandName, modelName);
    const { group: laptop, refs } = buildLaptop(bodyMat, initialDisplayTexture, initialProfile, initialDimsOverride);
    refs.screenPivot.rotation.x = THREE.MathUtils.degToRad(-(180 - openAngle));
    scene.add(laptop);
    meshesRef.current = refs;

    let rotVelocity = 0.004;
    const rotTarget  = 0.0032;
    const rotDamping = 0.96;
    const rotSpring  = 0.015;

    let hoverTiltX   = 0;
    let hoverTiltY   = 0;
    let hoverTiltTargetX = 0;
    let hoverTiltTargetY = 0;
    const tiltSpring  = 0.07;
    const tiltDamping = 0.82;
    let tiltVelX = 0, tiltVelY = 0;
    const MAX_TILT   = 0.14;

    let floatT = 0;
    const FLOAT_SPEED  = 0.5;
    const FLOAT_AMP    = 0.018;

    let rainbowT = 0;

    const onPointerMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      const ny = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
      hoverTiltTargetY =  nx * MAX_TILT;
      hoverTiltTargetX = -ny * MAX_TILT * 0.5;
    };
    const onPointerLeave = () => {
      hoverTiltTargetX = 0;
      hoverTiltTargetY = 0;
    };
    mount.addEventListener("pointermove", onPointerMove);
    mount.addEventListener("pointerleave", onPointerLeave);

    let frameId: number;
    let lastTime = performance.now();
    const animate = (now: number) => {
      frameId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 16.67, 3);
      lastTime = now;

      const currentLaptop = meshesRef.current?.group;
      if (!currentLaptop) {
        controls.update();
        renderer.render(scene, camera);
        return;
      }

      if (autoRotateRef.current) {
        rotVelocity += (rotTarget - rotVelocity) * rotSpring * dt;
        currentLaptop.rotation.y += rotVelocity * dt;
      } else {
        rotVelocity *= Math.pow(rotDamping, dt);
        if (Math.abs(rotVelocity) > 0.00005) currentLaptop.rotation.y += rotVelocity * dt;
      }

      floatT += FLOAT_SPEED * 0.016 * dt;
      currentLaptop.position.y = Math.sin(floatT) * FLOAT_AMP;

      if (!autoRotateRef.current) {
        tiltVelX += (hoverTiltTargetX - hoverTiltX) * tiltSpring * dt;
        tiltVelY += (hoverTiltTargetY - hoverTiltY) * tiltSpring * dt;
        tiltVelX *= Math.pow(tiltDamping, dt);
        tiltVelY *= Math.pow(tiltDamping, dt);
        hoverTiltX += tiltVelX * dt;
        hoverTiltY += tiltVelY * dt;
        currentLaptop.rotation.x = hoverTiltX;
      } else {
        hoverTiltX *= Math.pow(0.92, dt);
        currentLaptop.rotation.x = hoverTiltX;
      }

      const blMat = meshesRef.current?.backlightPlane.material as THREE.MeshStandardMaterial | undefined;
      if (blMat && blMat.emissiveIntensity > 0) {
        if ((blMat as any).__rainbow) {
          rainbowT += 0.012 * dt;
          const r = Math.sin(rainbowT) * 0.5 + 0.5;
          const g = Math.sin(rainbowT + 2.094) * 0.5 + 0.5;
          const b2 = Math.sin(rainbowT + 4.189) * 0.5 + 0.5;
          blMat.emissive.setRGB(r, g, b2);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate(performance.now());

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerleave", onPointerLeave);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Rebuild geometry when the laptop's shape PROFILE actually changes ----
  // (color/finish/backlight/etc. below still update in place without a rebuild --
  // only brand/model changes that imply a different physical shape trigger this.)
  useEffect(() => {
    const scene = sceneRef.current;
    const bodyMat = bodyMatRef.current;
    if (!scene || !bodyMat) return;

    const newProfile = profileForLaptop(brandName, modelName);
    const newDimsOverride = dimensionOverrideForLaptop(brandName, modelName);
    const currentProfile = meshesRef.current?.profile;
    const currentDimsOverride = meshesRef.current?.dimsOverride ?? null;

    // Skip rebuild only if BOTH the shape-profile family AND the exact real dimensions
    // are unchanged. Two different ThinkPads share a profile family but can have
    // different real spec-sheet sizes (e.g. T14 vs T14s), so a dims-only change must
    // still trigger a rebuild -- comparing profile name alone would silently skip that.
    const sameProfile = currentProfile && currentProfile.name === newProfile.name;
    const sameDims = JSON.stringify(currentDimsOverride) === JSON.stringify(newDimsOverride);
    if (sameProfile && sameDims) return;

    const oldGroup = meshesRef.current?.group;
    const wasVisible = oldGroup ? oldGroup.visible : true;
    const oldRotationY = oldGroup ? oldGroup.rotation.y : 0;
    const oldScale = oldGroup ? oldGroup.scale.x : modelScale;

    if (oldGroup) {
      scene.remove(oldGroup);
      disposeGroup(oldGroup);
    }

    const displayTexture = getDisplayTexture(osTheme, customDisplayUrl);
    const { group: laptop, refs } = buildLaptop(bodyMat, displayTexture, newProfile, newDimsOverride);
    laptop.rotation.y = oldRotationY;
    laptop.scale.setScalar(oldScale);
    laptop.visible = wasVisible && !customModelRef.current;
    refs.screenPivot.rotation.x = THREE.MathUtils.degToRad(-(180 - openAngle));

    const blMat = refs.backlightPlane.material as THREE.MeshStandardMaterial;
    const bl = BACKLIGHTS[backlightIndex];
    if (bl.color === "__rainbow__") {
      blMat.emissive.set("#ff4444");
      blMat.emissiveIntensity = 1.1;
      (blMat as any).__rainbow = true;
    } else if (bl.color) {
      blMat.emissive.set(bl.color);
      blMat.emissiveIntensity = 1.0;
    }

    const logoMat = refs.logo.material as THREE.MeshStandardMaterial;
    logoMat.emissiveIntensity = logoGlow ? 0.8 : 0;

    scene.add(laptop);
    meshesRef.current = refs;
  }, [brandName, modelName]);

  // ---- Reactive updates (color/finish/etc. -- unchanged behaviour, still in-place updates) ----
  useEffect(() => {
    const refs = meshesRef.current;
    if (refs) {
      refs.bodyMeshes.forEach((m) => {
        (m.material as THREE.MeshPhysicalMaterial).color.set(baseColor);
      });
    }
    if (customModelRef.current) {
      customModelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const m = child.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
          if (m && m.color) m.color.set(baseColor);
        }
      });
    }
  }, [baseColor]);

  useEffect(() => {
    const finish = FINISHES[finishIndex];
    const refs = meshesRef.current;
    if (refs) {
      refs.bodyMeshes.forEach((m) => {
        const mat = m.material as THREE.MeshPhysicalMaterial;
        mat.roughness   = finish.roughness;
        mat.metalness   = finish.metalness ?? 0.78;
        mat.clearcoat   = finish.clearcoat;
        mat.sheen       = finish.sheen;
        mat.sheenColor  = new THREE.Color(finish.sheenTint ?? "#ffffff");
        mat.needsUpdate = true;
      });
    }
    if (customModelRef.current) {
      customModelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const m = child.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
          if (m && m.roughness !== undefined) {
            m.roughness = finish.roughness;
            m.metalness = finish.metalness ?? 0.78;
          }
        }
      });
    }
  }, [finishIndex]);

  useEffect(() => {
    const refs = meshesRef.current;
    if (!refs) return;
    refs.screenPivot.rotation.x = THREE.MathUtils.degToRad(-(180 - openAngle));
  }, [openAngle]);

  useEffect(() => {
    const refs = meshesRef.current;
    if (!refs) return;
    const mat = refs.display.material as THREE.MeshBasicMaterial;
    mat.color.set(displayOn ? 0xffffff : 0x0a0a0c);
  }, [displayOn]);

  useEffect(() => {
    const refs = meshesRef.current;
    if (!refs) return;
    const tex = getDisplayTexture(osTheme, customDisplayUrl);
    const mat = refs.display.material as THREE.MeshBasicMaterial;
    mat.map = tex;
    mat.needsUpdate = true;
  }, [osTheme, customDisplayUrl]);

  useEffect(() => {
    const refs = meshesRef.current;
    if (!refs) return;

    const logoTex = makeBrandLogoTexture(brandName, modelName);
    const logoMat = refs.logo.material as THREE.MeshStandardMaterial;
    logoMat.map = logoTex;
    logoMat.alphaMap = logoTex;
    logoMat.needsUpdate = true;

    const isThinkpad = isThinkpadName(brandName, modelName);
    refs.trackpoint.visible = isThinkpad;
    refs.bottomDetails.visible = isThinkpad;
    refs.cameraBump.visible = isThinkpad;

    const b = (brandName || "").toLowerCase();
    const m = (modelName || "").toLowerCase();
    if (b.includes("apple") || b.includes("macbook") || m.includes("macbook") || b.includes("rog") || m.includes("rog") || b.includes("razer") || b.includes("msi")) {
      logoMat.emissiveIntensity = 0.8;
      logoMat.metalness = 0.2;
      logoMat.color.set("#ffffff");
    } else {
      logoMat.emissiveIntensity = 0;
      logoMat.metalness = 1.0;
      logoMat.roughness = 0.1;
      logoMat.color.set("#dddddd");
    }

    const profile = refs.profile;
    const { width, depth } = DIMS;
    const lidThickness = profile.lidThickness;
    if (isThinkpad) {
      refs.logo.position.set(width / 2 - 0.35, depth - 0.25, -lidThickness - 0.001);
      refs.logo.rotation.z = Math.PI / 8;
      refs.logo.scale.set(1.2, 1.2, 1);
      refs.secondaryLogo.visible = true;
    } else {
      refs.logo.position.set(0, depth / 2, -lidThickness - 0.001);
      refs.logo.rotation.z = 0;
      refs.logo.scale.set(1, 1, 1);
      refs.secondaryLogo.visible = false;
    }
  }, [brandName, modelName]);

  useEffect(() => {
    const refs = meshesRef.current;
    if (!refs) return;
    const mat = refs.backlightPlane.material as THREE.MeshStandardMaterial;
    const bl = BACKLIGHTS[backlightIndex];
    if (bl.color === "__rainbow__") {
      mat.emissive.set("#ff4444");
      mat.emissiveIntensity = 1.1;
      (mat as any).__rainbow = true;
    } else if (bl.color) {
      (mat as any).__rainbow = false;
      mat.emissive.set(bl.color);
      mat.emissiveIntensity = 1.0;
    } else {
      (mat as any).__rainbow = false;
      mat.emissiveIntensity = 0;
    }
  }, [backlightIndex]);

  useEffect(() => {
    const refs = meshesRef.current;
    if (!refs) return;
    const mat = refs.logo.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = logoGlow ? 0.8 : 0;
  }, [logoGlow]);

  useEffect(() => {
    const scene = sceneRef.current;
    const ground = groundRef.current;
    if (!scene || !ground) return;
    const bg = BACKGROUNDS[bgIndex];
    (scene.background as THREE.Color).set(bg.color);
    if (scene.fog) (scene.fog as THREE.Fog).color.set(bg.color);
    (ground.material as THREE.MeshStandardMaterial).color.set(bg.ground);
  }, [bgIndex]);

  useEffect(() => {
    const refs = meshesRef.current;
    if (!refs) return;
    refs.group.scale.setScalar(modelScale);
  }, [modelScale]);

  const goToView = (key: keyof typeof VIEWS) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const v = VIEWS[key];
    camera.position.set(...v.pos);
    controls.target.set(...v.target);
    controls.update();
  };

  return (
    <div className={studioMode ? styles.studioWrapper : styles.wrapper}>
      <div className={styles.canvasArea}>
        <div ref={mountRef} className={styles.canvasInner} />
        {selectedLaptop && (
          <div className={styles.laptopBadge}>
            {selectedLaptop.brand} {selectedLaptop.model}
          </div>
        )}
      </div>

      <aside className={styles.filterPanel} aria-label="3D model filters">
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Laptop</span>
          <select
            className={styles.select}
            value={selectedId}
            onChange={(e) =>
              handleSelectLaptop(e.target.value === "" ? "" : Number(e.target.value))
            }
          >
            <option value="">
              {loadingLaptops ? "Loading..." : "Custom (no laptop selected)"}
            </option>
            {laptops.map((l) => (
              <option key={l.id} value={l.id}>
                {l.brand} {l.model}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Color</span>
          {(() => {
            // Recognized models only offer the colors they actually ship in --
            // e.g. a real ThinkPad T14 only ever came in Thunder Black, so we
            // don't show 13 fictional colors it never existed in.
            const officialColors = officialColorsForLaptop(brandName, modelName);
            const swatches: OfficialColor[] = officialColors ?? BASE_COLORS;
            return (
              <div className={styles.swatchRow}>
                {swatches.map((c) => (
                  <button
                    key={c.hex}
                    title={c.name}
                    onClick={() => setBaseColor(c.hex)}
                    className={styles.swatch}
                    style={{
                      backgroundColor: c.hex,
                      outline: baseColor === c.hex ? "2px solid var(--accent, #0a84ff)" : "none",
                    }}
                  />
                ))}
              </div>
            );
          })()}
          {officialColorsForLaptop(brandName, modelName) && (
            <span style={{ fontSize: 10, color: "#8892aa", marginTop: 4, display: "block" }}>
              Showing this model&apos;s real color options
            </span>
          )}
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Finish</span>
          <div className={styles.toggleRow}>
            {FINISHES.map((f, i) => (
              <button
                key={f.name}
                onClick={() => setFinishIndex(i)}
                className={`${styles.toggleBtn} ${finishIndex === i ? styles.toggleBtnActive : ""}`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Keyboard backlight</span>
          <div className={styles.toggleRow}>
            {BACKLIGHTS.map((b, i) => (
              <button
                key={b.name}
                onClick={() => setBacklightIndex(i)}
                className={`${styles.toggleBtn} ${backlightIndex === i ? styles.toggleBtnActive : ""}`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Background</span>
          <div className={styles.toggleRow}>
            {BACKGROUNDS.map((b, i) => (
              <button
                key={b.name}
                onClick={() => setBgIndex(i)}
                className={`${styles.toggleBtn} ${bgIndex === i ? styles.toggleBtnActive : ""}`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>View</span>
          <div className={styles.toggleRow}>
            <button className={styles.toggleBtn} onClick={() => goToView("iso")}>Iso</button>
            <button className={styles.toggleBtn} onClick={() => goToView("front")}>Front</button>
            <button className={styles.toggleBtn} onClick={() => goToView("side")}>Side</button>
            <button className={styles.toggleBtn} onClick={() => goToView("top")}>Top</button>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Open angle</span>
          <input
            type="range"
            min={20}
            max={130}
            value={openAngle}
            onChange={(e) => setOpenAngle(Number(e.target.value))}
            className={styles.slider}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={displayOn} onChange={(e) => setDisplayOn(e.target.checked)} />
            Display on
          </label>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={logoGlow} onChange={(e) => setLogoGlow(e.target.checked)} />
            Logo glow
          </label>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
            Auto-rotate
          </label>
        </div>

        <button onClick={() => goToView("iso")} className={styles.resetBtn}>
          Reset view
        </button>

        {isAdmin && selectedId !== "" && (
          <div style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}>
            <span style={{
              display: "block",
              fontSize: 10,
              fontFamily: "'DM Mono', monospace",
              color: "#63e88c",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: 8,
            }}>✦ Admin — Save Design</span>
            <p style={{ fontSize: 11, color: "#8892aa", marginBottom: 10, lineHeight: 1.5 }}>
              Saves current color, finish, backlight, angle &amp; glow for this laptop. All visitors will see this design.
            </p>
            <button
              onClick={async () => {
                if (!selectedId) return;
                setSaveMsg("saving");
                try {
                  await saveLaptopDesign({
                    laptop_id: Number(selectedId),
                    color_hex: baseColor,
                    finish: FINISHES[finishIndex].name,
                    backlight: BACKLIGHTS[backlightIndex].name,
                    open_angle: openAngle,
                    logo_glow: logoGlow,
                    custom_model_base64: customModelBase64,
                  });
                  setSaveMsg("saved");
                  setTimeout(() => setSaveMsg(""), 3000);
                } catch {
                  setSaveMsg("error");
                  setTimeout(() => setSaveMsg(""), 3000);
                }
              }}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                borderRadius: 8,
                background: saveMsg === "saved" ? "#1e6640" : saveMsg === "error" ? "#7a2222" : "#63e88c",
                color: saveMsg === "saved" || saveMsg === "error" ? "#fff" : "#0d1f16",
                cursor: "pointer",
                transition: "background 0.3s",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {saveMsg === "saving" ? "Saving…" : saveMsg === "saved" ? "✓ Saved!" : saveMsg === "error" ? "✗ Error" : "Save Design"}
            </button>
          </div>
        )}
        {isAdmin && (
          <div style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}>
            <span style={{
              display: "block",
              fontSize: 10,
              fontFamily: "'DM Mono', monospace",
              color: "#63e88c",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: 8,
            }}>✦ Admin — Import Model</span>
            <p style={{ fontSize: 11, color: "#8892aa", marginBottom: 10, lineHeight: 1.5 }}>
              Import a <strong style={{color:"#c9d1e0"}}>GLB / GLTF</strong> file to replace the generated model. Auto-scales to fit.
            </p>

            {importStatus === "loaded" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#63e88c", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>✓ {importedFileName}</span>
                <button
                  onClick={clearCustomModel}
                  title="Remove custom model"
                  style={{
                    padding: "3px 8px", fontSize: 11, border: "1px solid rgba(255,100,100,0.4)",
                    borderRadius: 6, background: "rgba(255,100,100,0.1)", color: "#f76a6a",
                    cursor: "pointer",
                  }}
                >✕ Clear</button>
              </div>
            )}
            {importStatus === "error" && (
              <p style={{ fontSize: 11, color: "#f76a6a", marginBottom: 8 }}>Failed to load. Make sure it&apos;s a valid GLB/GLTF file.</p>
            )}

            <label style={{
              display: "block",
              width: "100%",
              padding: "9px",
              fontSize: 12,
              fontWeight: 600,
              border: "1px dashed rgba(99,232,140,0.4)",
              borderRadius: 8,
              background: importStatus === "loading" ? "rgba(99,232,140,0.05)" : "transparent",
              color: importStatus === "loading" ? "#8892aa" : "#63e88c",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.2s",
              boxSizing: "border-box",
            }}>
              {importStatus === "loading" ? "Loading…" : "📂 Choose GLB / GLTF file"}
              <input
                type="file"
                accept=".glb,.gltf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadCustomModel(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}
      </aside>
    </div>
  );
}