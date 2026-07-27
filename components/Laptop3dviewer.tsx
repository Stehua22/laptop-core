"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
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
  { name: "Matte", roughness: 0.85, metalness: 0.1 },
  { name: "Glossy", roughness: 0.2, metalness: 0.6 },
];

type LaptopMeshRefs = {
  base: THREE.Mesh;
  screenPivot: THREE.Group;
  screenPanel: THREE.Mesh;
  display: THREE.Mesh;
  keyboardDeck: THREE.Mesh;
  trackpad: THREE.Mesh;
};

export default function Laptop3DViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<LaptopMeshRefs | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  const [baseColor, setBaseColor] = useState(BASE_COLORS[0].hex);
  const [finishIndex, setFinishIndex] = useState(0);
  const [openAngle, setOpenAngle] = useState(105);
  const [autoRotate, setAutoRotate] = useState(true);
  const [displayOn, setDisplayOn] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4f5f7");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(3.2, 2.4, 4.2);
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
    controls.minDistance = 2.5;
    controls.maxDistance = 8;
    controls.maxPolarAngle = Math.PI * 0.49;
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
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

    const laptop = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: FINISHES[finishIndex].roughness,
      metalness: FINISHES[finishIndex].metalness,
    });

    const baseGeo = new THREE.BoxGeometry(2.2, 0.09, 1.5);
    const base = new THREE.Mesh(baseGeo, bodyMat);
    base.position.y = 0.045;
    base.castShadow = true;
    base.receiveShadow = true;
    laptop.add(base);

    const deckMat = new THREE.MeshStandardMaterial({
      color: "#2b2d31",
      roughness: 0.9,
    });
    const keyboardDeck = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.01, 1.1),
      deckMat
    );
    keyboardDeck.position.set(0, 0.096, -0.08);
    laptop.add(keyboardDeck);

    const trackpadMat = new THREE.MeshStandardMaterial({
      color: "#3d3f44",
      roughness: 0.6,
      metalness: 0.2,
    });
    const trackpad = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.011, 0.45),
      trackpadMat
    );
    trackpad.position.set(0, 0.097, 0.42);
    laptop.add(trackpad);

    const screenPivot = new THREE.Group();
    screenPivot.position.set(0, 0.09, -0.75);
    laptop.add(screenPivot);

    const screenPanel = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.4, 0.07),
      bodyMat
    );
    screenPanel.position.set(0, 0.7, -0.035);
    screenPanel.castShadow = true;
    screenPivot.add(screenPanel);

    const displayMat = new THREE.MeshStandardMaterial({
      color: "#0a84ff",
      emissive: new THREE.Color("#3aa0ff"),
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const display = new THREE.Mesh(
      new THREE.PlaneGeometry(2.02, 1.24),
      displayMat
    );
    display.position.set(0, 0.7, 0.001);
    screenPivot.add(display);

    screenPivot.rotation.x = THREE.MathUtils.degToRad(-(180 - openAngle));

    scene.add(laptop);

    meshesRef.current = {
      base,
      screenPivot,
      screenPanel,
      display,
      keyboardDeck,
      trackpad,
    };

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

  const autoRotateRef = useRef(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const m = meshesRef.current;
    if (!m) return;
    (m.base.material as THREE.MeshStandardMaterial).color.set(baseColor);
    (m.screenPanel.material as THREE.MeshStandardMaterial).color.set(
      baseColor
    );
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
