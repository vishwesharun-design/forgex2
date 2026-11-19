import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Layers, RotateCcw, Play, Pause } from 'lucide-react';
import { ForgeXTheme } from '../types';

interface Landing3DCoreProps {
  theme: ForgeXTheme;
  modelLevel?: number; // 1..5 corresponding to Forge 1 -> Forge 2 Ultra
  scrollProgressRef?: React.MutableRefObject<number>;
  reduceMotion?: boolean;
}

// Pre-allocated math helpers outside render loop (zero GC churn)
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _targetScale = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createDialRingTexture(isDark: boolean): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = isDark ? '#18181b' : '#27272a';
    ctx.fillRect(0, 0, size, size);

    // Subtle brushed metallic streaks
    for (let y = 0; y < size; y += 2) {
      const alpha = 0.03 + ((y * 17) % 10) * 0.004;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(0, y, size, 1);
    }

    // Precision radial calibration ticks
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.72)';
    for (let i = 0; i < 64; i++) {
      const x = (i / 64) * size;
      const major = i % 8 === 0;
      ctx.lineWidth = major ? 2.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, major ? 12 : 20);
      ctx.lineTo(x, major ? 52 : 36);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.42)');
    grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.14)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const Landing3DCore: React.FC<Landing3DCoreProps> = ({
  theme,
  modelLevel = 5,
  scrollProgressRef,
  reduceMotion = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);
  const [isExploded, setIsExploded] = useState(false);
  const [isAutoOrbit, setIsAutoOrbit] = useState(!reduceMotion);

  // Refs synced to animation loop without tearing down WebGL context
  const themeRef = useRef(theme);
  const modelLevelRef = useRef(modelLevel);
  const explodedRef = useRef(isExploded);
  const autoOrbitRef = useRef(isAutoOrbit);
  const reduceMotionRef = useRef(reduceMotion);
  const resetCameraFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    modelLevelRef.current = modelLevel;
  }, [modelLevel]);

  useEffect(() => {
    explodedRef.current = isExploded;
  }, [isExploded]);

  useEffect(() => {
    autoOrbitRef.current = isAutoOrbit;
  }, [isAutoOrbit]);

  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
    if (reduceMotion) {
      setIsAutoOrbit(false);
    }
  }, [reduceMotion]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'pan-y';
    container.appendChild(renderer.domElement);

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    const defaultCamPos = new THREE.Vector3(0, 0.75, 6.2);
    camera.position.copy(defaultCamPos);

    // Studio environment reflection (mandatory for metallic/glass PBR realism)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3-Point Studio Lighting Rig (warm key, cool sky/ground fill, amber rim)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x27272a, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    keyLight.position.set(4.5, 6.0, 5.0);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 20;
      const d = 3.5;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 1.8);
    rimLight.position.set(-5.0, 2.5, -4.5);
    scene.add(rimLight);

    const corePointLight = new THREE.PointLight(0xf59e0b, 3.2, 8, 2);
    corePointLight.position.set(0, 0, 0);
    scene.add(corePointLight);

    // OrbitControls (zoom disabled so vertical page scroll is never hijacked)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.75;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.78;

    let userInteracting = false;
    let resettingCamera = false;
    controls.addEventListener('start', () => {
      userInteracting = true;
      resettingCamera = false;
    });
    controls.addEventListener('end', () => {
      userInteracting = false;
    });

    resetCameraFnRef.current = () => {
      resettingCamera = true;
    };

    // Procedural textures
    const dialTexture = createDialRingTexture(themeRef.current === 'dark');
    dialTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const shadowTexture = createContactShadowTexture();

    // Shared tracked disposable resources
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Materials with calibrated roughness/metalness variation (>= 0.25 delta between adjacent parts)
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.78,
      roughness: 0.28,
    });
    const brushedTitaniumMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4d4d8,
      metalness: 0.92,
      roughness: 0.22,
      anisotropy: 0.8,
      map: dialTexture,
    });
    const amberGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      metalness: 0.94,
      roughness: 0.16,
      clearcoat: 0.7,
      clearcoatRoughness: 0.12,
    });
    const matteGraphiteMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      metalness: 0.35,
      roughness: 0.62,
    });
    const plasmaCoreMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.45,
      roughness: 0.15,
      metalness: 0.1,
    });
    const glassShellMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.88,
      transparent: true,
      opacity: isSoftwareGl ? 0.28 : 1,
      ior: 1.52,
      thickness: 0.6,
      clearcoat: 1.0,
      depthWrite: false,
    });
    materials.push(
      obsidianMat,
      brushedTitaniumMat,
      amberGoldMat,
      matteGraphiteMat,
      plasmaCoreMat,
      glassShellMat
    );

    // Master assembly group
    const rootAssembly = new THREE.Group();
    rootAssembly.position.y = 0.12;
    scene.add(rootAssembly);

    // 1. Primary Silhouette: Sculpted Central Core + Lathe Containment Collar
    const coreGroup = new THREE.Group();
    rootAssembly.add(coreGroup);

    const innerPlasmaGeo = new THREE.OctahedronGeometry(0.42, 1);
    geometries.push(innerPlasmaGeo);
    const innerPlasmaMesh = new THREE.Mesh(innerPlasmaGeo, plasmaCoreMat);
    coreGroup.add(innerPlasmaMesh);

    // Faceted outer obsidian cage
    const outerCageGeo = new THREE.IcosahedronGeometry(0.68, 0);
    geometries.push(outerCageGeo);
    const outerCageWireMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.85,
      roughness: 0.25,
      wireframe: true,
    });
    materials.push(outerCageWireMat);
    const outerCageMesh = new THREE.Mesh(outerCageGeo, outerCageWireMat);
    coreGroup.add(outerCageMesh);

    // Lathe sculpted upper & lower polar caps
    const capProfile = [
      new THREE.Vector2(0.0, 0.88),
      new THREE.Vector2(0.22, 0.86),
      new THREE.Vector2(0.38, 0.72),
      new THREE.Vector2(0.45, 0.62),
      new THREE.Vector2(0.32, 0.58),
      new THREE.Vector2(0.0, 0.58),
    ];
    const polarCapGeo = new THREE.LatheGeometry(capProfile, 32);
    geometries.push(polarCapGeo);

    const topCap = new THREE.Mesh(polarCapGeo, obsidianMat);
    topCap.castShadow = !isSoftwareGl;
    coreGroup.add(topCap);

    const bottomCap = new THREE.Mesh(polarCapGeo, obsidianMat);
    bottomCap.rotation.x = Math.PI;
    bottomCap.castShadow = !isSoftwareGl;
    coreGroup.add(bottomCap);

    // Optical glass containment sphere
    const glassGeo = new THREE.SphereGeometry(0.84, 32, 32);
    geometries.push(glassGeo);
    const glassShell = new THREE.Mesh(glassGeo, glassShellMat);
    glassShell.renderOrder = 5;
    coreGroup.add(glassShell);

    // 2. Secondary Read: 4 Articulated Beveled Resonator Pylons (ExtrudeGeometry)
    const pylonShape = new THREE.Shape();
    pylonShape.moveTo(-0.1, -0.34);
    pylonShape.lineTo(0.14, -0.26);
    pylonShape.lineTo(0.22, 0.0);
    pylonShape.lineTo(0.14, 0.26);
    pylonShape.lineTo(-0.1, 0.34);
    pylonShape.lineTo(-0.16, 0.16);
    pylonShape.lineTo(-0.16, -0.16);
    pylonShape.closePath();

    const pylonGeo = new THREE.ExtrudeGeometry(pylonShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.025,
      bevelSegments: 3,
    });
    pylonGeo.center();
    geometries.push(pylonGeo);

    const tipAccentGeo = new THREE.BoxGeometry(0.06, 0.38, 0.06);
    geometries.push(tipAccentGeo);

    const pylons: { group: THREE.Group; baseRadius: number; angle: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const pylonGroup = new THREE.Group();
      const body = new THREE.Mesh(pylonGeo, matteGraphiteMat);
      body.castShadow = !isSoftwareGl;
      pylonGroup.add(body);

      const accent = new THREE.Mesh(tipAccentGeo, amberGoldMat);
      accent.position.set(0.18, 0, 0);
      pylonGroup.add(accent);

      const baseRadius = 1.15;
      pylonGroup.position.set(Math.cos(angle) * baseRadius, 0, Math.sin(angle) * baseRadius);
      pylonGroup.rotation.y = -angle;
      rootAssembly.add(pylonGroup);
      pylons.push({ group: pylonGroup, baseRadius, angle });
    }

    // 3. Secondary Read: 3 Gyroscopic Precision Rings + Clasp Brackets
    const outerRingGeo = new THREE.TorusGeometry(1.75, 0.065, 20, 96);
    const midRingGeo = new THREE.TorusGeometry(1.42, 0.048, 18, 84);
    const innerRingGeo = new THREE.TorusGeometry(1.08, 0.036, 16, 72);
    const claspGeo = new THREE.BoxGeometry(0.16, 0.18, 0.16);
    geometries.push(outerRingGeo, midRingGeo, innerRingGeo, claspGeo);

    const outerGyro = new THREE.Group();
    const outerRingMesh = new THREE.Mesh(outerRingGeo, brushedTitaniumMat);
    outerRingMesh.castShadow = !isSoftwareGl;
    outerGyro.add(outerRingMesh);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const clasp = new THREE.Mesh(claspGeo, obsidianMat);
      clasp.position.set(Math.cos(a) * 1.75, Math.sin(a) * 1.75, 0);
      clasp.rotation.z = a;
      outerGyro.add(clasp);
    }
    outerGyro.rotation.set(Math.PI * 0.18, 0.2, 0);
    rootAssembly.add(outerGyro);

    const midGyro = new THREE.Group();
    const midRingMesh = new THREE.Mesh(midRingGeo, amberGoldMat);
    midRingMesh.castShadow = !isSoftwareGl;
    midGyro.add(midRingMesh);
    for (let i = 0; i < 2; i++) {
      const a = i * Math.PI;
      const clasp = new THREE.Mesh(claspGeo, matteGraphiteMat);
      clasp.scale.setScalar(0.8);
      clasp.position.set(Math.cos(a) * 1.42, Math.sin(a) * 1.42, 0);
      clasp.rotation.z = a;
      midGyro.add(clasp);
    }
    midGyro.rotation.set(-Math.PI * 0.26, Math.PI * 0.35, 0);
    rootAssembly.add(midGyro);

    const innerGyro = new THREE.Group();
    const innerRingMesh = new THREE.Mesh(innerRingGeo, obsidianMat);
    innerGyro.add(innerRingMesh);
    innerGyro.rotation.set(Math.PI * 0.42, -Math.PI * 0.2, 0);
    rootAssembly.add(innerGyro);

    // 4. Accent Detail: Instanced Orbital Constellation Nodes (32 instances)
    const nodeCount = 32;
    const nodeGeo = new THREE.OctahedronGeometry(0.055, 0);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.7,
      roughness: 0.22,
    });
    geometries.push(nodeGeo);
    materials.push(nodeMat);

    const orbitalNodes = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);
    orbitalNodes.frustumCulled = false;
    const nodeParams = Array.from({ length: nodeCount }, (_, idx) => {
      const t = (idx / nodeCount) * Math.PI * 2;
      return {
        angleOffset: t,
        radius: 1.98 + (idx % 3) * 0.18,
        yAmp: 0.35 + (idx % 4) * 0.14,
        speed: 0.35 + (idx % 5) * 0.08,
        scale: 0.72 + (idx % 4) * 0.18,
        isAmber: idx % 3 === 0,
      };
    });

    for (let i = 0; i < nodeCount; i++) {
      _color.setHex(nodeParams[i].isAmber ? 0xf59e0b : 0xa1a1aa);
      orbitalNodes.setColorAt(i, _color);
    }
    if (orbitalNodes.instanceColor) orbitalNodes.instanceColor.needsUpdate = true;
    rootAssembly.add(orbitalNodes);

    // 5. Grounding Contact Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(4.4, 4.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    geometries.push(shadowGeo);
    materials.push(shadowMat);
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.05;
    scene.add(shadowPlane);

    // Pre-compile shaders on hardware GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Smooth animation state
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    let currentExplode = 0;
    let currentScroll = 0;
    let simTime = 0;

    // Context loss safety
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
    };
    const handleContextRestored = () => {
      if (!disposed) {
        clock.getDelta();
        tick();
      }
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // Responsive ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(100, entry.contentRect.width);
        const h = Math.max(100, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const scrollTarget = scrollProgressRef ? scrollProgressRef.current : 0;
      const targetExplode = explodedRef.current ? 1 : Math.min(0.65, scrollTarget * 1.15);

      currentScroll = THREE.MathUtils.damp(currentScroll, scrollTarget, 5.5, delta);
      currentExplode = THREE.MathUtils.damp(currentExplode, targetExplode, 6.0, delta);

      const levelFactor = 0.7 + (modelLevelRef.current || 5) * 0.14;
      const motionActive = !reduceMotionRef.current;

      if (motionActive) {
        simTime += delta * levelFactor;
      }

      // Theme-responsive lighting tweaks
      const darkMode = themeRef.current === 'dark';
      shadowMat.opacity = darkMode ? 0.25 : 0.42;
      hemiLight.intensity = darkMode ? 0.65 : 0.95;

      // Core plasma & shell kinematics
      innerPlasmaMesh.rotation.y = simTime * 0.65;
      innerPlasmaMesh.rotation.x = simTime * 0.35;
      outerCageMesh.rotation.y = -simTime * 0.32;
      outerCageMesh.rotation.z = simTime * 0.2;

      const corePulse = 1 + (motionActive ? Math.sin(simTime * 2.4) * 0.06 : 0);
      innerPlasmaMesh.scale.setScalar(corePulse);
      plasmaCoreMat.emissiveIntensity = 1.2 + (modelLevelRef.current * 0.14) + (motionActive ? Math.sin(simTime * 2.4) * 0.25 : 0);

      // Exploded-view vertical separation on caps
      topCap.position.y = THREE.MathUtils.damp(topCap.position.y, currentExplode * 0.42, 7, delta);
      bottomCap.position.y = THREE.MathUtils.damp(bottomCap.position.y, -currentExplode * 0.42, 7, delta);

      // Resonator pylons radial expansion + gentle bob
      for (let i = 0; i < pylons.length; i++) {
        const p = pylons[i];
        const r = p.baseRadius + currentExplode * 0.58;
        const bob = motionActive ? Math.sin(simTime * 1.6 + i * 1.57) * 0.045 : 0;
        p.group.position.set(Math.cos(p.angle) * r, bob, Math.sin(p.angle) * r);
      }

      // Gyroscopic ring rotation + scroll-driven tilt
      outerGyro.rotation.z = simTime * 0.24 + currentScroll * 1.6;
      outerGyro.rotation.x = Math.PI * 0.18 + currentScroll * 0.45;

      midGyro.rotation.y = -simTime * 0.38 - currentScroll * 2.1;
      midGyro.rotation.z = simTime * 0.16;

      innerGyro.rotation.x = Math.PI * 0.42 + simTime * 0.52;
      innerGyro.rotation.y = -Math.PI * 0.2 + simTime * 0.3;

      // Scroll-driven overall rotation & subtle elevation float
      if (autoOrbitRef.current && !userInteracting && motionActive) {
        rootAssembly.rotation.y += delta * 0.22 * levelFactor;
      }
      rootAssembly.position.y =
        0.12 +
        (motionActive ? Math.sin(simTime * 1.1) * 0.06 : 0) -
        currentScroll * 0.18;

      // Update instanced orbital nodes (zero GC)
      for (let i = 0; i < nodeCount; i++) {
        const p = nodeParams[i];
        const angle = p.angleOffset + simTime * p.speed + currentScroll * 2.4;
        const rad = p.radius + currentExplode * 0.35;
        _dummy.position.set(
          Math.cos(angle) * rad,
          Math.sin(angle * 2 + p.angleOffset) * p.yAmp,
          Math.sin(angle) * rad
        );
        _dummy.rotation.set(simTime + i, simTime * 0.7, 0);
        _targetScale.setScalar(p.scale * (0.9 + currentExplode * 0.18));
        _dummy.scale.copy(_targetScale);
        _dummy.updateMatrix();
        orbitalNodes.setMatrixAt(i, _dummy.matrix);
      }
      orbitalNodes.instanceMatrix.needsUpdate = true;

      // Smooth camera reset if requested
      if (resettingCamera) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, defaultCamPos.x, 5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, defaultCamPos.y, 5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, defaultCamPos.z, 5, delta);
        if (camera.position.distanceTo(defaultCamPos) < 0.03) {
          camera.position.copy(defaultCamPos);
          resettingCamera = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      dialTexture.dispose();
      shadowTexture.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/50">
        <div className="text-center px-6 py-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Layers className="w-9 h-9" />
          </div>
          <p className="font-display font-semibold text-base">ForgeX Neural Core</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Interactive 3D preview requires WebGL acceleration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[360px] select-none">
      {/* Isolated WebGL canvas mount */}
      <div
        ref={containerRef}
        aria-label="Interactive 3D ForgeX Neural Core Model — drag to rotate"
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Compact bottom-center control dock (no backdrop-blur over WebGL, no side clutter) */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium shadow-sm ${
          theme === 'dark'
            ? 'bg-neutral-900/92 border-neutral-800 text-neutral-200'
            : 'bg-white/95 border-neutral-200 text-neutral-800'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsExploded((prev) => !prev)}
          className={`px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            isExploded
              ? 'bg-amber-500 text-neutral-950 font-semibold'
              : theme === 'dark'
                ? 'hover:bg-neutral-800 text-neutral-300'
                : 'hover:bg-neutral-100 text-neutral-700'
          }`}
          title="Toggle exploded architectural view"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isExploded ? 'Assemble' : 'Explode'}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsAutoOrbit((prev) => !prev)}
          disabled={reduceMotion}
          className={`px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 ${
            theme === 'dark'
              ? 'hover:bg-neutral-800 text-neutral-300'
              : 'hover:bg-neutral-100 text-neutral-700'
          }`}
          title={isAutoOrbit ? 'Pause auto-rotation' : 'Resume auto-rotation'}
        >
          {isAutoOrbit ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isAutoOrbit ? 'Pause' : 'Orbit'}</span>
        </button>

        <button
          type="button"
          onClick={() => resetCameraFnRef.current?.()}
          className={`px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            theme === 'dark'
              ? 'hover:bg-neutral-800 text-neutral-300'
              : 'hover:bg-neutral-100 text-neutral-700'
          }`}
          title="Reset camera angle"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
