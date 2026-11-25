import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const views = [
  ["Reset view", [1, 0.55, 1]], ["Front", [0, 0, 1]], ["Rear", [0, 0, -1]], ["Side", [1, 0, 0]],
];

function verifyEmbeddedGlb(bytes) {
  if (bytes.byteLength < 20) throw new Error("The model file is incomplete.");
  const header = new DataView(bytes);
  const length = header.getUint32(12, true);
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 ||
      header.getUint32(8, true) !== bytes.byteLength || header.getUint32(16, true) !== 0x4e4f534a ||
      length > Math.min(bytes.byteLength - 20, 8 * 1024 * 1024)) {
    throw new Error("This preview requires a valid GLB 2.0 model.");
  }
  const manifest = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, length)));
  if ([...(manifest.buffers || []), ...(manifest.images || [])].some(item => item.uri !== undefined)) {
    throw new Error("This preview requires geometry and textures to be embedded in the GLB.");
  }
}

function releaseModel(model) {
  const resources = new Set();
  model.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials.filter(Boolean)) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
    object.skeleton?.dispose();
  });
  for (const resource of resources) {
    if (resource.isTexture) resource.source.data?.close?.();
    resource.dispose();
  }
}

export default function GlbPreview({ blob, name }) {
  const viewport = useRef(null);
  const actions = useRef(null);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const mount = viewport.current;
    let cancelled = false;
    let renderer, controls, resize, model;
    async function load() {
      const bytes = await blob.arrayBuffer();
      if (cancelled) return;
      verifyEmbeddedGlb(bytes);
      const manager = new THREE.LoadingManager();
      manager.setURLModifier(url => {
        if (!url.startsWith("blob:")) throw new Error("External model resources are disabled.");
        return url;
      });
      const gltf = await new GLTFLoader(manager).parseAsync(bytes, "");
      model = gltf.scene;
      if (cancelled) { releaseModel(model); return; }
      const bounds = new THREE.Box3().setFromObject(model);
      if (bounds.isEmpty()) throw new Error("The model has no visible geometry.");
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      if (!Number.isFinite(sphere.radius)) throw new Error("The model bounds are invalid.");
      const radius = Math.max(sphere.radius, 0.0001);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x18272c);
      scene.add(model, new THREE.HemisphereLight(0xffffff, 0x8b8278, 2.4));
      const key = new THREE.DirectionalLight(0xfff3df, 2.5);
      key.position.set(2, 4, 3);
      scene.add(key);
      const camera = new THREE.PerspectiveCamera(40, 1, radius / 100, radius * 100);
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.setAttribute("aria-label", name || "3D model");
      renderer.domElement.setAttribute("role", "img");
      mount.append(renderer.domElement);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.minDistance = radius * 0.3;
      controls.maxDistance = radius * 30;
      const render = () => renderer.render(scene, camera);
      const frame = direction => {
        const angle = THREE.MathUtils.degToRad(camera.fov / 2);
        const distance = radius * Math.max(1, 1 / camera.aspect) / Math.sin(angle);
        controls.target.copy(sphere.center);
        camera.position.copy(sphere.center).add(new THREE.Vector3(...direction).normalize().multiplyScalar(distance));
        controls.update();
        render();
      };
      controls.addEventListener("change", render);
      const fit = () => {
        camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight, false);
      };
      fit();
      frame(views[0][1]);
      resize = new ResizeObserver(() => { fit(); render(); });
      resize.observe(mount);
      actions.current = { frame };
      setStatistics(renderer.info.render.triangles);
    }
    load().catch(failure => {
      if (!cancelled) setError(failure instanceof SyntaxError ? "The GLB contains invalid model data." : failure.message);
    });
    return () => {
      cancelled = true;
      actions.current = null;
      resize?.disconnect();
      controls?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      if (model) releaseModel(model);
    };
  }, [blob, name]);

  return <section className="operations-media__model" aria-label="3D model inspector">
    {error && <p role="alert">{error}</p>}
    {!error && statistics === null && <p role="status">Opening 3D preview…</p>}
    <div className="operations-media__model-viewport" hidden={!!error} ref={viewport} />
    {statistics !== null && <>
      <div className="operations__modes">{views.map(([label, direction]) =>
        <button key={label} type="button" onClick={() => actions.current?.frame(direction)}>{label}</button>)}</div>
      <p>{statistics.toLocaleString()} rendered triangles. Drag to orbit, scroll or pinch to zoom, and use two fingers or right-drag to pan.</p>
    </>}
  </section>;
}
