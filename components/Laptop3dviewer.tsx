"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import styles from "./Laptop3dviewer.module.css";

// ---- Config ----
const BASE_COLORS = [
  { name: "Space Grey", hex: "#4b4f56" },
  { name: "Silver", hex: "#d6d9dd" },
  { name: "Midnight", hex: "#1c1e22" },
  { name: "Rose Gold", hex: "#d9b8ac" },
  { name: "Sky Blue", hex: "#8bb4d6" },
];

const FINISHES = [
  { name: "Matte", roughness: 0.75, metalness: 0.35 },
  { name: "Glossy", roughness: 0.15, metalness: 0.7 },
];

// Overall proportions, in scene units (roughly a 14" laptop)
const DIMS = {
  width: 2.2,
  depth: 1.5,
  baseThickness: 0.075,
  lidThickness: 0.045,
  cornerRadius: 0.035,
};

type LaptopMeshRefs = {
  bodyMeshes: THREE.Mesh[]; // meshes that take baseColor + finish
  screenPivot: THREE.Group;
  display: THREE.Mesh;
  bezel: THREE.Mesh;
};

function buildLaptop(bodyMat: THREE.MeshStandardMaterial): {
  group: THREE.Group;
  refs: LaptopMeshRefs;
} {
  const group = new THREE.Group();
  const bodyMeshes: THREE.Mesh[] = [];
  const { width, depth, baseThickness, lidThickness, cornerRadius } = DIMS;

  const darkMat = new THREE.MeshStandardMaterial({
    color: "#26282c",
    roughness: 0.8,
    metalness: 0.1,
  });
  const keyMat = new THREE.MeshStandardMaterial({
    color: "#1a1b1e",
    roughness: 0.6,
    metalness: 0.15,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: "#3a3d42",
    roughness: 0.25,
    metalness: 0.3,
  });

  // ---- Base ----
  const base = new THREE.Mesh(
    new RoundedBoxGeometry(width, baseThickness, depth, 4, cornerRadius),
    bodyMat
  );
  base.position.y = baseThickness / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  bodyMeshes.push(base);

  // Rubber feet
  const footGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.008, 14);
  const footMat = new THREE.MeshStandardMaterial({
    color: "#111214",
    roughness: 0.9,
  });
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

  // Keyboard deck (recessed inset plate)
  const deckWidth = width - 0.28;
  const deckDepth = depth - 0.42;
  const deck = new THREE.Mesh(
    new RoundedBoxGeometry(deckWidth, 0.006, deckDepth, 3, 0.02),
    darkMat
  );
  deck.position.set(0, baseThickness + 0.003, -depth * 0.06);
  group.add(deck);

  // Keys (chiclet grid, instanced for performance)
  const cols = 14;
  const rows = 5;
  const keySize = 0.1;
  const keyGap = 0.018;
  const keyStepX = keySize + keyGap;
  const keyStepZ = keySize + keyGap;
  const keyGeo = new RoundedBoxGeometry(keySize, 0.014, keySize, 2, 0.02);
  const keysMesh = new THREE.InstancedMesh(keyGeo, keyMat, cols * rows);
  const gridWidth = (cols - 1) * keyStepX;
  const gridDepth = (rows - 1) * keyStepZ;
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -gridWidth / 2 + c * keyStepX;
      const z = deck.position.z - gridDepth / 2 + r * keyStepZ + 0.06;
      dummy.position.set(x, baseThickness + 0.013, z);
      dummy.updateMatrix();
      keysMesh.setMatrixAt(idx, dummy.matrix);
      idx++;
    }
  }
  keysMesh.instanceMatrix.needsUpdate = true;
  group.add(keysMesh);

  // Trackpad
  const trackpad = new THREE.Mesh(
    new RoundedBoxGeometry(0.62, 0.006, 0.4, 3, 0.025),
    glassMat
  );
  trackpad.position.set(0, baseThickness + 0.004, depth * 0.34);
  group.add(trackpad);

  // Speaker grille dots (either side, above keyboard, near hinge)
  const dotGeo = new THREE.CircleGeometry(0.008, 8);
  const dotMat = new THREE.MeshStandardMaterial({
    color: "#111214",
    roughness: 0.9,
  });
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

  // Port notches on the right edge (simple recessed dark rectangles)
  const portGeo = new THREE.BoxGeometry(0.01, 0.02, 0.06);
  const portZs = [-0.35, -0.1, 0.15];
  portZs.forEach((z) => {
    const port = new THREE.Mesh(portGeo, darkMat);
    port.position.set(width / 2 - 0.002, baseThickness / 2 + 0.01, z);
    group.add(port);
  });

  // ---- Screen (pivoting group at the hinge line) ----
  const screenPivot = new THREE.Group();
  screenPivot.position.set(0, baseThickness, -depth / 2);
  group.add(screenPivot);

  // Hinge cylinder
  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, width - 0.3, 16),
    darkMat
  );
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, 0, 0);
  screenPivot.add(hinge);

  const lid = new THREE.Mesh(
    new RoundedBoxGeometry(width, depth, lidThickness, 4, cornerRadius),
    bodyMat
  );
  lid.position.set(0, depth / 2, -lidThickness / 2);
  lid.castShadow = true;
  screenPivot.add(lid);
  bodyMeshes.push(lid);

  // Bezel (dark rim) sits on the front face of the lid
  const bezel = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.09, depth - 0.09),
    darkMat
  );
  bezel.position.set(0, depth / 2, -lidThickness + 0.002);
  screenPivot.add(bezel);

  // Display sits slightly in front of the bezel
  const displayMat = new THREE.MeshStandardMaterial({
    color: "#0a84ff",
    emissive: new THREE.Color("#3aa0ff"),
    emissiveIntensity: 0.6,
    roughness: 0.25,
  });
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.16, depth - 0.2),
    displayMat
  );
  display.position.set(0, depth / 2 + 0.02, -lidThickness + 0.003);
  screenPivot.add(display);

  // Webcam notch
  const cam = new THREE.Mesh(
    new THREE.CircleGeometry(0.012, 12),
    new THREE.MeshStandardMaterial({ color: "#050506", roughness: 0.4 })
  );
  cam.position.set(0, depth - 0.05, -lidThickness + 0.0025);
  screenPivot.add(cam);

  return {
    group,
    refs: { bodyMeshes, screenPivot, display, bezel },
  };
}

export default function Laptop3DViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<LaptopMeshRefs | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const [baseColor, setBaseColor] = useState(BASE_COLORS[0].hex);
  const [finishIndex, setFinishIndex] = useState(0);
  const [openAngle, setOpenAngle] = useState(105); // degrees, 0 = closed, ~130 = wide open
  const [autoRotate, setAutoRotate] = useState(true);
  const [displayOn, setDisplayOn] = useState(true);

  const autoRotateRef = useRef(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // ---- One-time scene setup ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4f5f7");

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(3.0, 2.2, 4.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.2;
    controls.maxDistance = 7;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 0.35, 0);
    controlsRef.current = controls;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(4, 6, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xaecbff, 0.45);
    rim.position.set(-4, 3, -3);
    scene.add(rim);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(6, 48),
      new THREE.MeshStandardMaterial({ color: "#e9eaed", roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.001;
    ground.receiveShadow = true;
    scene.add(ground);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: FINISHES[finishIndex].roughness,
      metalness: FINISHES[finishIndex].metalness,
    });

    const { group: laptop, refs } = buildLaptop(bodyMat);
    refs.screenPivot.rotation.x = THREE.MathUtils.degToRad(-(180 - openAngle));
    scene.add(laptop);
    meshesRef.current = refs;

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
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Reactive updates (no full re-init) ----
  useEffect(() => {
    const refs = meshesRef.current;
    if (!refs) return;
    refs.bodyMeshes.forEach((m) => {
      (m.material as THREE.MeshStandardMaterial).color.set(baseColor);
    });
  }, [baseColor]);

  useEffect(() => {
    const refs = meshesRef.current;
    if (!refs) return;
    const finish = FINISHES[finishIndex];
    refs.bodyMeshes.forEach((m) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.roughness = finish.roughness;
      mat.metalness = finish.metalness;
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

  const resetView = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(3.0, 2.2, 4.0);
    controls.target.set(0, 0.35, 0);
    controls.update();
  };

  return (
    <div className={styles.wrapper}>
      <div ref={mountRef} className={styles.canvasArea} />

      <aside className={styles.filterPanel} aria-label="3D model filters">
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
                  outline:
                    baseColor === c.hex ? "2px solid var(--accent, #0a84ff)" : "none",
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
                className={`${styles.toggleBtn} ${
                  finishIndex === i ? styles.toggleBtnActive : ""
                }`}
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
            <input
              type="checkbox"
              checked={displayOn}
              onChange={(e) => setDisplayOn(e.target.checked)}
            />
            Display on
          </label>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => setAutoRotate(e.target.checked)}
            />
            Auto-rotate
          </label>
        </div>

        <button onClick={resetView} className={styles.resetBtn}>
          Reset view
        </button>
      </aside>
    </div>
  );
}
