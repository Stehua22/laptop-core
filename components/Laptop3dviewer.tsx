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
  { name: "Space Grey", hex: "#4b4f56" },
  { name: "Silver", hex: "#d6d9dd" },
  { name: "Midnight", hex: "#1c1e22" },
  { name: "Rose Gold", hex: "#d9b8ac" },
  { name: "Sky Blue", hex: "#8bb4d6" },
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
  { name: "Matte", roughness: 0.55, clearcoat: 0.15 },
  { name: "Aluminum", roughness: 0.32, clearcoat: 0.35 },
  { name: "Glossy", roughness: 0.08, clearcoat: 0.7 },
];

const BACKLIGHTS = [
  { name: "Off", color: null },
  { name: "White", color: "#eef3ff" },
  { name: "Blue", color: "#4d9dff" },
  { name: "Green", color: "#5df29a" },
  { name: "Red", color: "#ff4d4d" },
];

const BACKGROUNDS = [
  { name: "Studio", color: "#f4f5f7", ground: "#e9eaed" },
  { name: "Dark", color: "#1b1c1f", ground: "#2a2b2f" },
];

const VIEWS: Record<string, { pos: [number, number, number]; target: [number, number, number] }> = {
  iso: { pos: [3.0, 2.2, 4.0], target: [0, 0.35, 0] },
  front: { pos: [0, 0.9, 3.6], target: [0, 0.65, 0] },
  side: { pos: [3.8, 0.6, 0], target: [0, 0.4, 0] },
  top: { pos: [0.01, 4.2, 0.01], target: [0, 0, 0] },
};

// Overall proportions, in scene units (roughly a 14" laptop)
const DIMS = {
  width: 2.2,
  depth: 1.5,
  baseThickness: 0.07,
  lidThickness: 0.04,
  cornerRadius: 0.04,
};

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

function makeContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(0,0,0,0.6)");
  gradient.addColorStop(0.3, "rgba(0,0,0,0.4)");
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
    // Proxy the image URL to bypass CORS and prevent black screens in WebGL
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
    const isThinkpad = b.includes("thinkpad") || m.includes("thinkpad") || (b.includes("lenovo") && (m.includes("x1") || m.includes("t14") || m.includes("carbon") || m.includes("p1")));
    if (isThinkpad) {
      ctx.font = "bold 90px sans-serif";
      ctx.fillText("ThinkPad", 256, 256);
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(425, 200, 18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Draw Lenovo logo
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
};

function buildLaptop(
  bodyMat: THREE.MeshPhysicalMaterial,
  displayTexture: THREE.Texture
): { group: THREE.Group; refs: LaptopMeshRefs } {
  const group = new THREE.Group();
  const bodyMeshes: THREE.Mesh[] = [];
  const { width, depth, baseThickness, lidThickness, cornerRadius } = DIMS;

  const darkMat = new THREE.MeshStandardMaterial({
    color: "#181a1e",
    roughness: 0.8,
    metalness: 0.1,
  });
  const bezelMat = new THREE.MeshStandardMaterial({
    color: "#050505",
    roughness: 0.1,
    metalness: 0.8,
  });
  const keyMat = new THREE.MeshStandardMaterial({
    color: "#1a1b1e",
    roughness: 0.3,
    metalness: 0.4,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: "#2a2c30",
    roughness: 0.05,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
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

  const ventGeo = new THREE.BoxGeometry(0.09, 0.006, 0.012);
  for (let i = 0; i < 10; i++) {
    const vent = new THREE.Mesh(ventGeo, darkMat);
    vent.position.set(-width / 2 + 0.25 + i * 0.1, baseThickness - 0.002, -depth / 2 + 0.01);
    group.add(vent);
  }

  const deckWidth = width - 0.28;
  const deckDepth = depth - 0.42;
  const deck = new THREE.Mesh(
    new RoundedBoxGeometry(deckWidth, 0.006, deckDepth, 3, 0.02),
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

  const cols = 14;
  const rows = 5;
  const keySize = 0.1;
  const keyGap = 0.018;
  const keyStepX = keySize + keyGap;
  const keyStepZ = keySize + keyGap;
  const keyGeo = new RoundedBoxGeometry(keySize, 0.016, keySize, 2, 0.02);
  const keysMesh = new THREE.InstancedMesh(keyGeo, keyMat, cols * rows);
  const gridWidth = (cols - 1) * keyStepX;
  const gridDepth = (rows - 1) * keyStepZ;
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -gridWidth / 2 + c * keyStepX;
      const z = deck.position.z - gridDepth / 2 + r * keyStepZ + 0.06;
      dummy.position.set(x, baseThickness + 0.014, z);
      dummy.updateMatrix();
      keysMesh.setMatrixAt(idx, dummy.matrix);
      idx++;
    }
  }
  keysMesh.instanceMatrix.needsUpdate = true;
  group.add(keysMesh);

  // ThinkPad TrackPoint (red dot in the middle of keyboard)
  const trackpoint = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 16, 16),
    new THREE.MeshStandardMaterial({ color: "#ff0000", roughness: 0.8 })
  );
  // Position it in the middle of the keyboard, slightly above the keys
  trackpoint.position.set(0, baseThickness + 0.02, deck.position.z);
  trackpoint.visible = false; // Hidden by default
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

  const portOuterGeo = new THREE.BoxGeometry(0.012, 0.024, 0.07);
  const portInnerGeo = new THREE.BoxGeometry(0.006, 0.018, 0.05);
  const portMetalMat = new THREE.MeshStandardMaterial({
    color: "#9a9ea3",
    roughness: 0.3,
    metalness: 0.8,
  });
  [-0.35, -0.1, 0.15].forEach((z) => {
    const outer = new THREE.Mesh(portOuterGeo, darkMat);
    outer.position.set(width / 2 - 0.003, baseThickness / 2 + 0.01, z);
    group.add(outer);
    const inner = new THREE.Mesh(portInnerGeo, portMetalMat);
    inner.position.set(width / 2 - 0.001, baseThickness / 2 + 0.01, z);
    group.add(inner);
  });

  const screenPivot = new THREE.Group();
  screenPivot.position.set(0, baseThickness, -depth / 2);
  group.add(screenPivot);

  // Bottom Details (Feet and Vents)
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
    new THREE.CylinderGeometry(0.028, 0.028, width - 0.3, 20),
    darkMat
  );
  hinge.rotation.z = Math.PI / 2;
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
  cameraBump.visible = false;
  screenPivot.add(cameraBump);
  bodyMeshes.push(cameraBump);

  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.28),
    new THREE.MeshStandardMaterial({
      color: "#ffffff", // Will be set to chrome or glowing depending on brand
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
  secondaryLogo.position.set(0, 0, -lidThickness - 0.001);
  secondaryLogo.visible = false;
  screenPivot.add(secondaryLogo);

  const bezel = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.09, depth - 0.09),
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
    new THREE.PlaneGeometry(width - 0.16, depth - 0.2),
    displayMat
  );
  display.position.set(0, depth / 2 + 0.02, 0.003);
  screenPivot.add(display);

  const screenGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.09, depth - 0.09),
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
    refs: { bodyMeshes, screenPivot, display, backlightPlane, logo, secondaryLogo, trackpoint, cameraBump, bottomDetails, group },
  };
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
    setBaseColor(colorForBrand(laptop.brand));
    setModelScale(scaleForScreenSize(laptop.screen_size));
    const theme = osThemeForBrand(laptop.brand);
    setOsTheme(theme);
    setLogoGlow(theme === "mac");
    setBrandName(laptop.brand);
    setModelName(laptop.model);
    
    // Set backlight to red/RGB for gaming brands, otherwise white
    const b = (laptop.brand || "").toLowerCase();
    const m = (laptop.model || "").toLowerCase();
    if (b.includes("msi") || b.includes("rog") || m.includes("rog") || b.includes("razer")) {
      setBacklightIndex(4); // Index 4 is Red
    } else {
      setBacklightIndex(0); // Index 0 is Off
    }

    setCustomDisplayUrl(""); // Force default OS wallpaper instead of laptop's product image

    // Load saved 3D design override if present
    fetchLaptopDesign(typeof id === "number" ? id : Number(id)).then((design) => {
      if (!design) return;
      setBaseColor(design.color_hex);
      const fi = FINISHES.findIndex((f) => f.name === design.finish);
      if (fi >= 0) setFinishIndex(fi);
      const bi = BACKLIGHTS.findIndex((b) => b.name === design.backlight);
      if (bi >= 0) setBacklightIndex(bi);
      setOpenAngle(design.open_angle);
      setLogoGlow(design.logo_glow);
    });
  };

  const loadCustomModel = (file: File) => {
    const scene = sceneRef.current;
    const refs = meshesRef.current;
    if (!scene) return;

    // Clean up previous blob URL and custom model
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    if (customModelRef.current) {
      scene.remove(customModelRef.current);
      customModelRef.current = null;
    }

    if (!file) {
      // Restore built-in laptop
      if (refs) refs.group.visible = true;
      setImportStatus("");
      setImportedFileName("");
      return;
    }

    setImportStatus("loading");
    setImportedFileName(file.name);

    const blobUrl = URL.createObjectURL(file);
    blobUrlRef.current = blobUrl;

    const loader = new GLTFLoader();
    loader.load(
      blobUrl,
      (gltf) => {
        const model = gltf.scene;

        // Auto-center and scale the model to fit nicely
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 2.5;
        const scale = targetSize / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y = 0; // sit on ground

        // Hide the built-in laptop
        if (refs) refs.group.visible = false;

        scene.add(model);
        customModelRef.current = model;
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
  };

  // ---- One-time scene setup ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUNDS[0].color);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(...VIEWS.iso.pos);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.0;
    controls.maxDistance = 7;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(...VIEWS.iso.target);
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(4, 6, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xaecbff, 0.5);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(6, 48),
      new THREE.MeshStandardMaterial({ color: BACKGROUNDS[0].ground, roughness: 1 })
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
        opacity: 0.8,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.001;
    scene.add(contactShadow);

    const normalMap = makeBrushedMetalNormalMap();
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: baseColor,
      roughness: FINISHES[finishIndex].roughness,
      metalness: 0.85,
      clearcoat: FINISHES[finishIndex].clearcoat,
      clearcoatRoughness: 0.2,
      normalMap,
      normalScale: new THREE.Vector2(0.15, 0.15),
      envMapIntensity: 1,
    });

    const initialDisplayTexture = getDisplayTexture(osTheme, customDisplayUrl);
    const { group: laptop, refs } = buildLaptop(bodyMat, initialDisplayTexture);
    refs.screenPivot.rotation.x = THREE.MathUtils.degToRad(-(180 - openAngle));
    scene.add(laptop);
    meshesRef.current = refs;

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (autoRotateRef.current) laptop.rotation.y += 0.004;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

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
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Reactive updates ----
  useEffect(() => {
    const refs = meshesRef.current;
    if (!refs) return;
    refs.bodyMeshes.forEach((m) => {
      (m.material as THREE.MeshPhysicalMaterial).color.set(baseColor);
    });
  }, [baseColor]);

  useEffect(() => {
    const refs = meshesRef.current;
    if (!refs) return;
    const finish = FINISHES[finishIndex];
    refs.bodyMeshes.forEach((m) => {
      const mat = m.material as THREE.MeshPhysicalMaterial;
      mat.roughness = finish.roughness;
      mat.clearcoat = finish.clearcoat;
    });
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
    
    // Update logo texture
    const logoTex = makeBrandLogoTexture(brandName, modelName);
    const logoMat = refs.logo.material as THREE.MeshStandardMaterial;
    logoMat.map = logoTex;
    logoMat.alphaMap = logoTex;
    logoMat.needsUpdate = true;

    // Toggle trackpoint and bottom details
    const b = (brandName || "").toLowerCase();
    const m = (modelName || "").toLowerCase();
    const isThinkpad = b.includes("thinkpad") || m.includes("thinkpad") || (b.includes("lenovo") && (m.includes("x1") || m.includes("t14") || m.includes("carbon") || m.includes("p1")));
    refs.trackpoint.visible = isThinkpad;
    refs.bottomDetails.visible = isThinkpad;
    refs.cameraBump.visible = isThinkpad;
    
    // Toggle logo glow (Apple glowing, gaming laptops glowing, others chrome)
    if (b.includes("apple") || b.includes("macbook") || m.includes("macbook") || b.includes("rog") || m.includes("rog") || b.includes("razer") || b.includes("msi")) {
      logoMat.emissiveIntensity = 0.8;
      logoMat.metalness = 0.2;
      logoMat.color.set("#ffffff");
    } else {
      logoMat.emissiveIntensity = 0;
      logoMat.metalness = 1.0; // Chrome look
      logoMat.roughness = 0.1;
      logoMat.color.set("#dddddd");
    }

    // Set logo position and rotation
    const { width, depth, lidThickness } = DIMS;
    if (isThinkpad) {
      // ThinkPad logo on top-left (when looking from back open, y=depth is lip/top)
      refs.logo.position.set(width / 2 - 0.35, depth - 0.25, -lidThickness - 0.001);
      refs.logo.rotation.z = Math.PI / 8; // Slant the ThinkPad logo
      refs.logo.scale.set(1.2, 1.2, 1); // Make text bigger for Thinkpads
      
      // Show Lenovo badge on bottom-right (when looking from back open, y=0 is hinge/bottom)
      refs.secondaryLogo.visible = true;
      refs.secondaryLogo.position.set(-width / 2 + 0.15, 0.25, -lidThickness - 0.001); // Move more to the side
      refs.secondaryLogo.rotation.z = Math.PI / 2; // Vertical badge
    } else {
      // All other laptops, including normal Lenovos, get the logo centered
      refs.logo.position.set(0, depth / 2, -lidThickness - 0.001);
      refs.logo.rotation.z = 0; // Reset rotation
      refs.logo.scale.set(1, 1, 1);
      refs.secondaryLogo.visible = false;
    }
  }, [brandName]);

  useEffect(() => {
    const refs = meshesRef.current;
    if (!refs) return;
    const mat = refs.backlightPlane.material as THREE.MeshStandardMaterial;
    const bl = BACKLIGHTS[backlightIndex];
    if (bl.color) {
      mat.emissive.set(bl.color);
      mat.emissiveIntensity = 0.9;
    } else {
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
          <div className={styles.swatchRow}>
            {BASE_COLORS.map((c) => (
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


