"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { fetchLaptops, type Laptop } from "@/lib/supabase";
import styles from "./Laptop3dviewer.module.css";

// ---- Cosmetic config ----
const BASE_COLORS = [
  { name: "Space Grey", hex: "#4b4f56" },
  { name: "Silver", hex: "#d6d9dd" },
  { name: "Midnight", hex: "#1c1e22" },
  { name: "Rose Gold", hex: "#d9b8ac" },
  { name: "Sky Blue", hex: "#8bb4d6" },
];

const FINISHES = [
  { name: "Matte", roughness: 0.85, metalness: 0.1 },
  { name: "Glossy", roughness: 0.2, metalness: 0.6 },
];

// ---- Spec filter config ----
const CPU_OPTIONS = [
  "Any",
  "Intel i3",
  "Intel i5",
  "Intel i7",
  "Intel i9",
  "Ryzen 3",
  "Ryzen 5",
  "Ryzen 7",
  "Ryzen 9",
  "Apple M",
];
const RAM_OPTIONS = ["Any", "8GB", "16GB", "32GB", "64GB"];
const STORAGE_OPTIONS = ["Any", "256GB", "512GB", "1TB", "2TB"];
const SCREEN_OPTIONS = ["Any", "13\"", "14\"", "15\"", "16\"+"];

type LaptopMeshRefs = {
  base: THREE.Mesh;
  screenPivot: THREE.Group;
  screenPanel: THREE.Mesh;
  display: THREE.Mesh;
  hinge: THREE.Mesh;
};

// Rounded-rectangle shape used to build the base and lid so edges aren't hard boxes
function roundedRectShape(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const w = width / 2;
  const h = height / 2;
  shape.moveTo(-w + radius, -h);
  shape.lineTo(w - radius, -h);
  shape.quadraticCurveTo(w, -h, w, -h + radius);
  shape.lineTo(w, h - radius);
  shape.quadraticCurveTo(w, h, w - radius, h);
  shape.lineTo(-w + radius, h);
  shape.quadraticCurveTo(-w, h, -w, h - radius);
  shape.lineTo(-w, -h + radius);
  shape.quadraticCurveTo(-w, -h, -w + radius, -h);
  return shape;
}

function roundedSlabGeometry(width: number, depth: number, thickness: number, radius: number) {
  const shape = roundedRectShape(width, depth, radius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.18,
    bevelSize: thickness * 0.18,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geo.translate(0, 0, -thickness / 2);
  geo.rotateX(Math.PI / 2);
  return geo;
}

function matchesCpu(specs: string, cpu: string) {
  if (cpu === "Any") return true;
  return specs.toLowerCase().includes(cpu.toLowerCase());
}

function matchesRam(specs: string, ram: string) {
  if (ram === "Any") return true;
  const wanted = parseInt(ram, 10);
  const m = specs.match(/(\d+)\s?GB\s?RAM/i);
  if (!m) return false;
  return parseInt(m[1], 10) === wanted;
}

function matchesStorage(specs: string, storage: string) {
  if (storage === "Any") return true;
  const wantedGB = storage.includes("TB") ? parseInt(storage, 10) * 1024 : parseInt(storage, 10);
  const m = specs.match(/(\d+)\s?(GB|TB)\s?(SSD|storage|HDD)/i);
  if (!m) return false;
  const foundGB = m[2].toUpperCase() === "TB" ? parseInt(m[1], 10) * 1024 : parseInt(m[1], 10);
  return foundGB === wantedGB;
}

function matchesScreen(screenSize: number | null | undefined, screen: string) {
  if (screen === "Any") return true;
  if (screenSize == null) return false;
  if (screen === "16\"+") return screenSize >= 16;
  const wanted = parseInt(screen, 10);
  return Math.round(screenSize) === wanted;
}

export default function Laptop3DViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<LaptopMeshRefs | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const autoRotateRef = useRef(true);

  // Cosmetic state
  const [baseColor, setBaseColor] = useState(BASE_COLORS[0].hex);
  const [finishIndex, setFinishIndex] = useState(0);
  const [openAngle, setOpenAngle] = useState(105);
  const [autoRotate, setAutoRotate] = useState(true);
  const [displayOn, setDisplayOn] = useState(true);

  // Spec filter state
  const [cpuFilter, setCpuFilter] = useState("Any");
  const [ramFilter, setRamFilter] = useState("Any");
  const [storageFilter, setStorageFilter] = useState("Any");
  const [screenFilter, setScreenFilter] = useState("Any");
  const [brandFilter, setBrandFilter] = useState("Any");
  const [maxPrice, setMaxPrice] = useState(3000);

  // Laptop data
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [loadingLaptops, setLoadingLaptops] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLaptops()
      .then((data) => {
        if (!cancelled) setLaptops(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message ?? "Failed to load laptops");
      })
      .finally(() => {
        if (!cancelled) setLoadingLaptops(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const brandOptions = useMemo(() => {
    const set = new Set(laptops.map((l) => l.brand).filter(Boolean));
    return ["Any", ...Array.from(set).sort()];
  }, [laptops]);

  const matches = useMemo(() => {
    return laptops
      .filter((l) => {
        const specs = l.specs ?? "";
        if (brandFilter !== "Any" && l.brand !== brandFilter) return false;
        if (!matchesCpu(specs, cpuFilter)) return false;
        if (!matchesRam(specs, ramFilter)) return false;
        if (!matchesStorage(specs, storageFilter)) return false;
        if (!matchesScreen(l.screen_size, screenFilter)) return false;
        const price = l.current_price ?? l.retail_price ?? 0;
        if (price > maxPrice) return false;
        return true;
      })
      .slice(0, 12);
  }, [laptops, brandFilter, cpuFilter, ramFilter, storageFilter, screenFilter, maxPrice]);

  const anyFilterActive =
    cpuFilter !== "Any" ||
    ramFilter !== "Any" ||
    storageFilter !== "Any" ||
    screenFilter !== "Any" ||
    brandFilter !== "Any";

  // ---- One-time scene setup ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4f5f7");

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(3.2, 2.4, 4.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Soft image-based lighting so metal/glossy finishes have something to reflect
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.5;
    controls.maxDistance = 8;
    controls.maxPolarAngle = Math.PI * 0.49;
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(4, 6, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xaecbff, 0.5);
    rim.position.set(-4, 3, -3);
    scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(6, 48),
      new THREE.MeshStandardMaterial({ color: "#e9eaed", roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.001;
    ground.receiveShadow = true;
    scene.add(ground);

    // ---- Laptop group ----
    const laptop = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: FINISHES[finishIndex].roughness,
      metalness: FINISHES[finishIndex].metalness,
      envMapIntensity: 1,
    });

    // Base (rounded slab instead of a hard-edged box)
    const baseGeo = roundedSlabGeometry(2.2, 1.5, 0.09, 0.09);
    const base = new THREE.Mesh(baseGeo, bodyMat);
    base.position.y = 0.045;
    base.castShadow = true;
    base.receiveShadow = true;
    laptop.add(base);

    // Keyboard deck (recessed dark plate)
    const deckMat = new THREE.MeshStandardMaterial({ color: "#2b2d31", roughness: 0.9 });
    const keyboardDeck = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.008, 1.05), deckMat);
    keyboardDeck.position.set(0, 0.093, -0.12);
    laptop.add(keyboardDeck);

    // Individual keys as an instanced grid (much closer to a real keyboard than a flat plate)
    const keyGeo = new THREE.BoxGeometry(0.1, 0.012, 0.09);
    const keyMat = new THREE.MeshStandardMaterial({ color: "#3d3f44", roughness: 0.7 });
    const cols = 15;
    const rows = 5;
    const keyGapX = 0.115;
    const keyGapZ = 0.105;
    const gridWidth = (cols - 1) * keyGapX;
    const gridDepth = (rows - 1) * keyGapZ;
    const keys = new THREE.InstancedMesh(keyGeo, keyMat, cols * rows);
    keys.castShadow = true;
    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dummy.position.set(
          -gridWidth / 2 + c * keyGapX,
          0.1,
          -0.12 - gridDepth / 2 + r * keyGapZ
        );
        dummy.updateMatrix();
        keys.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    keys.instanceMatrix.needsUpdate = true;
    laptop.add(keys);

    // Trackpad
    const trackpadMat = new THREE.MeshStandardMaterial({ color: "#3d3f44", roughness: 0.5, metalness: 0.2 });
    const trackpad = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.011, 0.45), trackpadMat);
    trackpad.position.set(0, 0.097, 0.42);
    laptop.add(trackpad);

    // Hinge cylinder
    const hingeMat = new THREE.MeshStandardMaterial({ color: "#1a1b1e", roughness: 0.5, metalness: 0.4 });
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.1, 20), hingeMat);
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(0, 0.09, -0.75);
    hinge.castShadow = true;
    laptop.add(hinge);

    // Screen pivot (hinge at back edge of base)
    const screenPivot = new THREE.Group();
    screenPivot.position.set(0, 0.09, -0.75);
    laptop.add(screenPivot);

    const screenGeo = roundedSlabGeometry(2.2, 1.4, 0.07, 0.09);
    const screenPanel = new THREE.Mesh(screenGeo, bodyMat);
    screenPanel.position.set(0, 0.7, -0.035);
    screenPanel.castShadow = true;
    screenPivot.add(screenPanel);

    const displayMat = new THREE.MeshStandardMaterial({
      color: "#0a84ff",
      emissive: new THREE.Color("#3aa0ff"),
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const display = new THREE.Mesh(new THREE.PlaneGeometry(2.02, 1.24), displayMat);
    display.position.set(0, 0.7, 0.005);
    screenPivot.add(display);

    // Webcam notch at the top bezel
    const webcamMat = new THREE.MeshStandardMaterial({ color: "#0d0e10", roughness: 0.4 });
    const webcam = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), webcamMat);
    webcam.position.set(0, 1.36, 0.006);
    screenPivot.add(webcam);

    // Subtle brand emblem on the lid back
    const emblemMat = new THREE.MeshStandardMaterial({ color: "#9a9da2", roughness: 0.3, metalness: 0.6 });
    const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.13, 32), emblemMat);
    emblem.position.set(0, 0.7, -0.071);
    emblem.rotation.y = Math.PI;
    screenPivot.add(emblem);

    screenPivot.rotation.x = THREE.MathUtils.degToRad(-(180 - openAngle));

    scene.add(laptop);

    meshesRef.current = { base, screenPivot, screenPanel, display, hinge };

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (autoRotateRef.current) {
        laptop.rotation.y += 0.004;
      }
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
      pmrem.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // ---- Reactive cosmetic updates (no full re-init) ----
  useEffect(() => {
    const m = meshesRef.current;
    if (!m) return;
    (m.base.material as THREE.MeshStandardMaterial).color.set(baseColor);
    (m.screenPanel.material as THREE.MeshStandardMaterial).color.set(baseColor);
  }, [baseColor]);

  useEffect(() => {
    const m = meshesRef.current;
    if (!m) return;
    const finish = FINISHES[finishIndex];
    const mat = m.base.material as THREE.MeshStandardMaterial;
    mat.roughness = finish.roughness;
    mat.metalness = finish.metalness;
    const screenMat = m.screenPanel.material as THREE.MeshStandardMaterial;
    screenMat.roughness = finish.roughness;
    screenMat.metalness = finish.metalness;
  }, [finishIndex]);

  useEffect(() => {
    const m = meshesRef.current;
    if (!m) return;
    m.screenPivot.rotation.x = THREE.MathUtils.degToRad(-(180 - openAngle));
  }, [openAngle]);

  useEffect(() => {
    const m = meshesRef.current;
    if (!m) return;
    const mat = m.display.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = displayOn ? 0.6 : 0.02;
    mat.color.set(displayOn ? "#0a84ff" : "#111214");
  }, [displayOn]);

  const resetView = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(3.2, 2.4, 4.2);
    controls.target.set(0, 0.4, 0);
    controls.update();
  };

  return (
    <div className={styles.root}>
      <div className={styles.wrapper}>
        <div ref={mountRef} className={styles.canvasArea} />

        <aside className={styles.filterPanel} aria-label="3D model filters">
          <div className={styles.panelSection}>
            <span className={styles.sectionHeading}>Customize model</span>

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
                <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
                Auto-rotate
              </label>
            </div>

            <button onClick={resetView} className={styles.resetBtn}>
              Reset view
            </button>
          </div>

          <div className={styles.panelDivider} />

          <div className={styles.panelSection}>
            <span className={styles.sectionHeading}>Find similar laptops</span>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Brand</span>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className={styles.select}
              >
                {brandOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>CPU</span>
              <select value={cpuFilter} onChange={(e) => setCpuFilter(e.target.value)} className={styles.select}>
                {CPU_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>RAM</span>
              <div className={styles.toggleRow}>
                {RAM_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRamFilter(r)}
                    className={`${styles.toggleBtnSmall} ${ramFilter === r ? styles.toggleBtnActive : ""}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Storage</span>
              <div className={styles.toggleRow}>
                {STORAGE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStorageFilter(s)}
                    className={`${styles.toggleBtnSmall} ${storageFilter === s ? styles.toggleBtnActive : ""}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Screen size</span>
              <div className={styles.toggleRow}>
                {SCREEN_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setScreenFilter(s)}
                    className={`${styles.toggleBtnSmall} ${screenFilter === s ? styles.toggleBtnActive : ""}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Max price: ${maxPrice}</span>
              <input
                type="range"
                min={200}
                max={5000}
                step={100}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
          </div>
        </aside>
      </div>

      <div className={styles.resultsSection}>
        <div className={styles.resultsHeader}>
          <span className={styles.sectionHeading}>
            {anyFilterActive ? `Matches (${matches.length})` : "All laptops"}
          </span>
        </div>

        {loadingLaptops && <p className={styles.mutedText}>Loading laptops...</p>}
        {loadError && <p className={styles.mutedText}>Couldn't load laptops: {loadError}</p>}

        {!loadingLaptops && !loadError && matches.length === 0 && (
          <p className={styles.mutedText}>No laptops match those filters yet.</p>
        )}

        {!loadingLaptops && matches.length > 0 && (
          <div className={styles.resultsGrid}>
            {matches.map((l) => (
              <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className={styles.resultCard}>
                {l.image_url ? (
                  <img src={l.image_url} alt={`${l.brand} ${l.model}`} className={styles.resultImage} />
                ) : (
                  <div className={styles.resultImagePlaceholder} />
                )}
                <div className={styles.resultInfo}>
                  <span className={styles.resultBrand}>{l.brand}</span>
                  <span className={styles.resultModel}>{l.model}</span>
                  <span className={styles.resultPrice}>
                    ${(l.current_price ?? l.retail_price ?? 0).toLocaleString()}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
