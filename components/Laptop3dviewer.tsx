"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { fetchLaptops, type Laptop } from "@/lib/supabase";
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

type LaptopMeshRefs = {
  bodyMeshes: THREE.Mesh[];
  screenPivot: THREE.Group;
  display: THREE.Mesh;
  backlightPlane: THREE.Mesh;
  logo: THREE.Mesh;
  group: THREE.Group;
};

function buildLaptop(
  bodyMat: THREE.MeshPhysicalMaterial
): { group: THREE.Group; refs: LaptopMeshRefs } {
  const group = new THREE.Group();
  const bodyMeshes: THREE.Mesh[] = [];
  const { width, depth, baseThickness, lidThickness, cornerRadius } = DIMS;

  const darkMat = new THREE.MeshStandardMaterial({
    color: "#212226",
    roughness: 0.75,
    metalness: 0.15,
  });
  const keyMat = new THREE.MeshStandardMaterial({
    color: "#17181b",
    roughness: 0.55,
    metalness: 0.2,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: "#3a3d42",
    roughness: 0.15,
    metalness: 0.2,
    clearcoat: 0.6,
    clearcoatRoughness: 0.1,
  });

  const base = new THREE.Mesh(
    new RoundedBoxGeometry(width, baseThickness, depth, 7, cornerRadius),
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

  const trackpad = new THREE.Mesh(
    new RoundedBoxGeometry(0.62, 0.006, 0.4, 4, 0.025),
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

  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, width - 0.3, 20),
    darkMat
  );
  hinge.rotation.z = Math.PI / 2;
  screenPivot.add(hinge);

  const lid = new THREE.Mesh(
    new RoundedBoxGeometry(width, depth, lidThickness, 7, cornerRadius),
    bodyMat
  );
  lid.position.set(0, depth / 2, -lidThickness / 2);
  lid.castShadow = true;
  screenPivot.add(lid);
  bodyMeshes.push(lid);

  const logo = new THREE.Mesh(
    new THREE.CircleGeometry(0.11, 32),
    new THREE.MeshStandardMaterial({
      color: "#dcdfe3",
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 0,
      roughness: 0.4,
      metalness: 0.3,
    })
  );
  logo.rotation.y = Math.PI;
  logo.position.set(0, depth / 2, -lidThickness - 0.001);
  screenPivot.add(logo);

  const bezel = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.09, depth - 0.09),
    darkMat
  );
  bezel.position.set(0, depth / 2, -lidThickness + 0.002);
  screenPivot.add(bezel);

  const displayMat = new THREE.MeshStandardMaterial({
    color: "#0a84ff",
    emissive: new THREE.Color("#3aa0ff"),
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.16, depth - 0.2),
    displayMat
  );
  display.position.set(0, depth / 2 + 0.02, -lidThickness + 0.003);
  screenPivot.add(display);

  const cam = new THREE.Mesh(
    new THREE.CircleGeometry(0.012, 12),
    new THREE.MeshStandardMaterial({ color: "#050506", roughness: 0.4 })
  );
  cam.position.set(0, depth - 0.05, -lidThickness + 0.0025);
  screenPivot.add(cam);

  return {
    group,
    refs: { bodyMeshes, screenPivot, display, backlightPlane, logo, group },
  };
}

export default function Laptop3DViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<LaptopMeshRefs | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groundRef = useRef<THREE.Mesh | null>(null);

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
    if (id === "") return;
    const laptop = laptops.find((l) => l.id === id);
    if (!laptop) return;
    setBaseColor(colorForBrand(laptop.brand));
    setModelScale(scaleForScreenSize(laptop.screen_size));
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

    const { group: laptop, refs } = buildLaptop(bodyMat);
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
    const mat = refs.display.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = displayOn ? 0.6 : 0.02;
    mat.color.set(displayOn ? "#0a84ff" : "#111214");
  }, [displayOn]);

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
    <div className={styles.wrapper}>
      <div className={styles.canvasArea}>
        <div ref={mountRef} className={styles.canvasArea} />
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
@'
"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { fetchLaptops, type Laptop } from "@/lib/supabase";
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

type LaptopMeshRefs = {
  bodyMeshes: THREE.Mesh[];
  screenPivot: THREE.Group;
  display: THREE.Mesh;
  backlightPlane: THREE.Mesh;
  logo: THREE.Mesh;
  group: THREE.Group;
};

function buildLaptop(
  bodyMat: THREE.MeshPhysicalMaterial
): { group: THREE.Group; refs: LaptopMeshRefs } {
  const group = new THREE.Group();
  const bodyMeshes: THREE.Mesh[] = [];
  const { width, depth, baseThickness, lidThickness, cornerRadius } = DIMS;

  const darkMat = new THREE.MeshStandardMaterial({
    color: "#212226",
    roughness: 0.75,
    metalness: 0.15,
  });
  const keyMat = new THREE.MeshStandardMaterial({
    color: "#17181b",
    roughness: 0.55,
    metalness: 0.2,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: "#3a3d42",
    roughness: 0.15,
    metalness: 0.2,
    clearcoat: 0.6,
    clearcoatRoughness: 0.1,
  });

  const base = new THREE.Mesh(
    new RoundedBoxGeometry(width, baseThickness, depth, 7, cornerRadius),
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

  const trackpad = new THREE.Mesh(
    new RoundedBoxGeometry(0.62, 0.006, 0.4, 4, 0.025),
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

  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, width - 0.3, 20),
    darkMat
  );
  hinge.rotation.z = Math.PI / 2;
  screenPivot.add(hinge);

  const lid = new THREE.Mesh(
    new RoundedBoxGeometry(width, depth, lidThickness, 7, cornerRadius),
    bodyMat
  );
  lid.position.set(0, depth / 2, -lidThickness / 2);
  lid.castShadow = true;
  screenPivot.add(lid);
  bodyMeshes.push(lid);

  const logo = new THREE.Mesh(
    new THREE.CircleGeometry(0.11, 32),
    new THREE.MeshStandardMaterial({
      color: "#dcdfe3",
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 0,
      roughness: 0.4,
      metalness: 0.3,
    })
  );
  logo.rotation.y = Math.PI;
  logo.position.set(0, depth / 2, -lidThickness - 0.001);
  screenPivot.add(logo);

  const bezel = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.09, depth - 0.09),
    darkMat
  );
  bezel.position.set(0, depth / 2, -lidThickness + 0.002);
  screenPivot.add(bezel);

  const displayMat = new THREE.MeshStandardMaterial({
    color: "#0a84ff",
    emissive: new THREE.Color("#3aa0ff"),
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.16, depth - 0.2),
    displayMat
  );
  display.position.set(0, depth / 2 + 0.02, -lidThickness + 0.003);
  screenPivot.add(display);

  const cam = new THREE.Mesh(
    new THREE.CircleGeometry(0.012, 12),
    new THREE.MeshStandardMaterial({ color: "#050506", roughness: 0.4 })
  );
  cam.position.set(0, depth - 0.05, -lidThickness + 0.0025);
  screenPivot.add(cam);

  return {
    group,
    refs: { bodyMeshes, screenPivot, display, backlightPlane, logo, group },
  };
}

export default function Laptop3DViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<LaptopMeshRefs | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groundRef = useRef<THREE.Mesh | null>(null);

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
    if (id === "") return;
    const laptop = laptops.find((l) => l.id === id);
    if (!laptop) return;
    setBaseColor(colorForBrand(laptop.brand));
    setModelScale(scaleForScreenSize(laptop.screen_size));
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

    const { group: laptop, refs } = buildLaptop(bodyMat);
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
    const mat = refs.display.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = displayOn ? 0.6 : 0.02;
    mat.color.set(displayOn ? "#0a84ff" : "#111214");
  }, [displayOn]);

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
    <div className={styles.wrapper}>
      <div className={styles.canvasArea}>
        <div ref={mountRef} className={styles.canvasArea} />
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
      </aside>
    </div>
  );
}
