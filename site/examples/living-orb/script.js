import * as THREE from 'three';
import { createRuntimeState } from '../runtime-state.js';

const stage = document.querySelector('#three-stage');
const sheet = document.querySelector('.specimen-sheet');
const phaseLabel = document.querySelector('#phase');
const permeabilityLabel = document.querySelector('#permeability');
const responseLabel = document.querySelector('#response');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const runtime = createRuntimeState({ reducedMotion });
const deterministicQa = Boolean(window.__signatureVisualQASeed);

const CYCLE = 18000;
const phaseNames = ['dormant', 'osmosis', 'permeable', 'response', 'repair'];
const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: 0, target: 0 };
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(29, 1, 0.1, 100);
camera.position.set(0, 0, 7.2);

function supportsWebGL() {
  const probe = document.createElement('canvas');
  const context = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!context) return false;
  context.getExtension('WEBGL_lose_context')?.loseContext();
  return true;
}

const fallbackRenderer = {
  setPixelRatio() {},
  setSize() {},
  render() {},
  dispose() {}
};
let gpuAvailable = false;
let contextLost = false;
let renderer = fallbackRenderer;

function setGpuFallback(active, reason = null) {
  contextLost = active && reason === 'context-lost';
  runtime.setFallback(active, reason);
  stage.classList.toggle('three-ready', !active && gpuAvailable);
  stage.dataset.renderer = active ? 'fallback' : 'webgl';
  runtime.setPauseReason('gpu-context-lost', contextLost);
}

function handleContextLost(event) {
  event?.preventDefault?.();
  setGpuFallback(true, 'context-lost');
  sync();
}

function handleContextRestored() {
  contextLost = false;
  setGpuFallback(false);
  resize();
  sync();
}

function initializeRenderer() {
  gpuAvailable = supportsWebGL();
  contextLost = false;
  renderer = fallbackRenderer;
  if (gpuAvailable) {
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: Boolean(window.__signatureVisualQASeed)
      });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      stage.append(renderer.domElement);
      runtime.addListener(renderer.domElement, 'webglcontextlost', handleContextLost);
      runtime.addListener(renderer.domElement, 'webglcontextrestored', handleContextRestored);
      setGpuFallback(false);
      return;
    } catch {
      gpuAvailable = false;
      renderer = fallbackRenderer;
    }
  }
  setGpuFallback(true, 'webgl-unavailable');
}

const uniforms = {
  uTime: { value: 0 },
  uResponse: { value: 0.18 },
  uPermeability: { value: 0.12 },
  uLeaf: { value: new THREE.Color('#637b71') },
  uPollen: { value: new THREE.Color('#d7dfaa') },
  uBlood: { value: new THREE.Color('#a34b3d') }
};

const geometry = new THREE.IcosahedronGeometry(1.42, 6);
const membraneMaterial = new THREE.ShaderMaterial({
  uniforms,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  vertexShader: `
    uniform float uTime;
    uniform float uResponse;
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vTissue;
    varying float vHeight;

    void main() {
      float lobes = sin(position.y * 3.1 + uTime * 0.34) * sin(position.x * 2.6 - uTime * 0.22);
      float cell = sin((position.x + position.z) * 4.7 + uTime * 0.19) * cos(position.y * 3.9 - uTime * 0.27);
      float pulse = sin(uTime * 1.08) * 0.5 + 0.5;
      float displacement = lobes * (0.055 + uResponse * 0.075) + cell * 0.035 + pulse * uResponse * 0.028;
      vec3 transformed = position + normal * displacement;
      transformed.x += sin(position.y * 2.2 + uTime * 0.18) * 0.055;
      vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vView = -viewPosition.xyz;
      vTissue = cell * 0.5 + 0.5;
      vHeight = transformed.y;
      gl_Position = projectionMatrix * viewPosition;
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform float uResponse;
    uniform float uPermeability;
    uniform vec3 uLeaf;
    uniform vec3 uPollen;
    uniform vec3 uBlood;
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vTissue;
    varying float vHeight;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDirection = normalize(vView);
      float fresnel = pow(1.0 - max(0.0, dot(normal, viewDirection)), 2.1);
      float light = dot(normal, normalize(vec3(-0.45, 0.72, 0.48))) * 0.5 + 0.5;
      float pores = smoothstep(0.56, 0.88, vTissue + uPermeability * 0.16);
      float blush = smoothstep(-0.35, 0.8, -vHeight) * uResponse;
      vec3 color = mix(uLeaf * 0.54, uPollen, light * 0.76);
      color = mix(color, uBlood, blush * 0.38 + pores * uResponse * 0.14);
      color += fresnel * uPollen * 0.72;
      float alpha = 0.25 + fresnel * 0.44 + (1.0 - uPermeability) * 0.14 + pores * 0.08;
      gl_FragColor = vec4(color, alpha);
    }
  `
});

const membrane = new THREE.Mesh(geometry, membraneMaterial);
const shellMaterial = new THREE.MeshBasicMaterial({
  color: '#50675f',
  wireframe: true,
  transparent: true,
  opacity: 0.042,
  depthWrite: false
});
const shell = new THREE.Mesh(geometry, shellMaterial);
shell.scale.setScalar(1.012);

const innerGeometry = new THREE.IcosahedronGeometry(0.72, 4);
const innerMaterial = new THREE.MeshStandardMaterial({
  color: '#9d5144',
  emissive: '#58271f',
  emissiveIntensity: 0.16,
  roughness: 0.48,
  metalness: 0,
  transparent: true,
  opacity: 0.58
});
const innerBody = new THREE.Mesh(innerGeometry, innerMaterial);
innerBody.scale.set(0.82, 1.17, 0.72);

const culture = new THREE.Group();
const vesicleGeometry = new THREE.IcosahedronGeometry(0.12, 2);
const vesicleMaterial = new THREE.MeshStandardMaterial({
  color: '#b55a47',
  emissive: '#6f2f26',
  emissiveIntensity: 0.24,
  roughness: 0.36
});
const vesicleData = [
  [-0.31, 0.54, 0.16, 1.15],
  [0.38, 0.26, 0.24, 0.76],
  [-0.18, -0.14, 0.52, 0.88],
  [0.32, -0.5, 0.11, 1.0],
  [-0.4, -0.61, -0.12, 0.66],
  [0.11, 0.72, -0.22, 0.55]
];
const vesicles = vesicleData.map(([x, y, z, scale], index) => {
  const vesicle = new THREE.Mesh(vesicleGeometry, vesicleMaterial);
  vesicle.position.set(x, y, z);
  vesicle.scale.setScalar(scale);
  vesicle.userData.home = new THREE.Vector3(x, y, z);
  vesicle.userData.phase = index * 0.93;
  culture.add(vesicle);
  return vesicle;
});

const organism = new THREE.Group();
organism.add(innerBody, culture, membrane, shell);
organism.scale.set(0.92, 1.32, 0.72);
organism.rotation.z = -0.16;
scene.add(organism);

scene.add(new THREE.HemisphereLight('#f7f4df', '#53665e', 2.4));
const keyLight = new THREE.DirectionalLight('#fffbe4', 3.2);
keyLight.position.set(-3, 4, 5);
scene.add(keyLight);

let frame = 0;
let start = performance.now();

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function timeline(progress) {
  const rise = smoothstep(0.16, 0.5, progress);
  const fall = smoothstep(0.8, 1, progress);
  const response = 0.18 + rise * 0.78 - fall * 0.63;
  const permeability = 0.1 + smoothstep(0.28, 0.58, progress) * 0.78 - fall * 0.56;
  const phase = progress < 0.17 ? 0 : progress < 0.37 ? 1 : progress < 0.59 ? 2 : progress < 0.81 ? 3 : 4;
  return { response, permeability, phase };
}

function resize() {
  const rect = sheet.getBoundingClientRect();
  const explicitlyZero = sheet.style.width === '0px' || sheet.style.height === '0px';
  const zeroSize = explicitlyZero || rect.width < 1 || rect.height < 1;
  runtime.setPauseReason('zero-size', zeroSize);
  if (zeroSize || runtime.state.disposed) {
    sync();
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  const mobile = rect.width < 720;
  organism.position.set(mobile ? 0.34 : 1.42, mobile ? -0.72 : -0.08, 0);
  organism.scale.set(mobile ? 0.73 : 0.92, mobile ? 1.03 : 1.32, mobile ? 0.57 : 0.72);
}

function refreshSizePause() {
  const rect = sheet.getBoundingClientRect();
  const zeroSize = sheet.style.width === '0px' || sheet.style.height === '0px' || rect.width < 1 || rect.height < 1;
  runtime.setPauseReason('zero-size', zeroSize);
  if (zeroSize) {
    cancelAnimationFrame(frame);
    frame = 0;
    runtime.setRafScheduled(false);
  } else if (!deterministicQa && !runtime.state.disposed && !runtime.state.paused && !runtime.state.resources.raf) {
    frame = requestAnimationFrame(animate);
    runtime.setRafScheduled(true);
  }
}

function pointerMove(event) {
  const rect = sheet.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  pointer.tx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.ty = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  pointer.target = 1;
  runtime.setPointer({
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
    active: true,
    event: event.type
  });
}

function renderAt(timeMs = 0) {
  const progress = ((timeMs % CYCLE) + CYCLE) % CYCLE / CYCLE;
  const score = timeline(progress);
  const seconds = timeMs * 0.001;
  pointer.x += (pointer.tx - pointer.x) * 0.075;
  pointer.y += (pointer.ty - pointer.y) * 0.075;
  pointer.active += (pointer.target - pointer.active) * 0.07;

  const proximity = pointer.active * 0.3;
  uniforms.uTime.value = seconds;
  uniforms.uResponse.value = Math.min(1, score.response + proximity);
  uniforms.uPermeability.value = Math.min(1, score.permeability + proximity * 0.65);
  organism.rotation.x = -0.08 + pointer.y * 0.11 * pointer.active + Math.sin(seconds * 0.19) * 0.025;
  organism.rotation.y = -0.22 + seconds * 0.034 + pointer.x * 0.17 * pointer.active;
  organism.rotation.z = -0.16 + Math.sin(seconds * 0.15) * 0.035;
  innerBody.scale.set(
    0.82 + score.response * 0.025,
    1.17 + Math.sin(seconds * 0.75) * score.response * 0.035,
    0.72 + score.response * 0.02
  );
  innerMaterial.opacity = 0.42 + score.response * 0.28;
  shellMaterial.opacity = 0.025 + score.permeability * 0.07;

  for (const vesicle of vesicles) {
    const home = vesicle.userData.home;
    const phase = vesicle.userData.phase;
    vesicle.position.x = home.x + Math.sin(seconds * 0.43 + phase) * 0.035 + pointer.x * pointer.active * score.permeability * 0.08;
    vesicle.position.y = home.y + Math.cos(seconds * 0.36 + phase) * 0.04 + pointer.y * pointer.active * score.permeability * 0.08;
    vesicle.rotation.x = seconds * 0.18 + phase;
    vesicle.rotation.y = -seconds * 0.15 + phase;
  }

  if (!contextLost) renderer.render(scene, camera);
  if (gpuAvailable && !contextLost) stage.classList.add('three-ready');
  sheet.dataset.phase = phaseNames[score.phase];
  phaseLabel.textContent = phaseNames[score.phase];
  permeabilityLabel.textContent = score.permeability > 0.64 ? 'open' : score.permeability > 0.3 ? 'softening' : 'sealed';
  responseLabel.textContent = Math.min(1, score.response + proximity).toFixed(2);
}

function animate(now) {
  renderAt(now - start);
  if (!runtime.state.paused && !runtime.state.disposed) {
    frame = requestAnimationFrame(animate);
    runtime.setRafScheduled(true);
  }
}

function sync() {
  cancelAnimationFrame(frame);
  frame = 0;
  runtime.setRafScheduled(false);
  runtime.setPauseReason('document-hidden', document.hidden);
  runtime.setReducedMotion(reducedMotion.matches);
  if (deterministicQa) {
    if (!runtime.state.disposed && !runtime.describe().pauseReasons.includes('zero-size')) renderAt(qaState.timeMs);
    return;
  }
  if (!runtime.state.paused && !runtime.state.disposed) {
    renderAt(performance.now() - start);
    frame = requestAnimationFrame(animate);
    runtime.setRafScheduled(true);
  } else if (!runtime.state.disposed && !runtime.describe().pauseReasons.includes('zero-size')) {
    renderAt(CYCLE * 0.66);
  }
}

function clearPointer(event = 'pointerleave') {
  pointer.target = 0;
  pointer.active = 0;
  runtime.clearPointer(event);
}

const qaState = { seed: 125, timeMs: 0, progress: 0 };

function seekQa(next = {}) {
  if (Number.isFinite(next.progress)) {
    qaState.progress = Math.max(0, Math.min(1, Number(next.progress)));
    qaState.timeMs = qaState.progress * CYCLE;
  } else {
    qaState.timeMs = Number.isFinite(next.timeMs) ? Number(next.timeMs) : Number(next.time ?? 0) * 1000;
    qaState.progress = ((qaState.timeMs % CYCLE) + CYCLE) % CYCLE / CYCLE;
  }
  renderAt(qaState.timeMs);
}

const qa = {
  ready: true,
  setSeed(value) {
    qaState.seed = value;
    renderAt(qaState.timeMs);
  },
  seek: seekQa,
  setProgress(value) {
    seekQa({ progress: value });
  },
  renderAt(timeMs) {
    seekQa({ timeMs });
  },
  setPointer(next) {
    pointer.tx = next.x * 2 - 1;
    pointer.ty = -(next.y * 2 - 1);
    pointer.x = pointer.tx;
    pointer.y = pointer.ty;
    pointer.target = next.active === false ? 0 : 1;
    pointer.active = pointer.target;
    runtime.setPointer({ x: next.x, y: next.y, active: pointer.target > 0, event: 'hook' });
  },
  render() {
    renderAt(qaState.timeMs);
  },
  describe() {
    refreshSizePause();
    return runtime.describe({
      phase: phaseLabel.textContent,
      seed: qaState.seed,
      time: qaState.timeMs / 1000,
      progress: qaState.progress,
      renderer: gpuAvailable && !contextLost ? 'webgl' : 'fallback'
    });
  },
  flush() {
    seekQa({ timeMs: reducedMotion.matches ? CYCLE * 0.66 : performance.now() - start });
  },
  loseContext() {
    handleContextLost({ preventDefault() {} });
    return qa.describe();
  },
  restoreContext() {
    handleContextRestored();
    return qa.describe();
  },
  dispose,
  remount() {
    if (!runtime.state.disposed) dispose();
    start = performance.now();
    mount();
    return qa.describe();
  }
};

window.__signatureVisual = qa;
window.__signatureVisualQA = qa;

function disposeSceneResources() {
  geometry.dispose();
  innerGeometry.dispose();
  vesicleGeometry.dispose();
  membraneMaterial.dispose();
  shellMaterial.dispose();
  innerMaterial.dispose();
  vesicleMaterial.dispose();
}

function dispose() {
  if (!runtime.disposeManaged()) return qa.describe();
  cancelAnimationFrame(frame);
  frame = 0;
  clearPointer('dispose');
  renderer.dispose();
  renderer.domElement?.remove();
  renderer = fallbackRenderer;
  gpuAvailable = false;
  contextLost = false;
  stage.classList.remove('three-ready');
  stage.dataset.renderer = 'fallback';
  disposeSceneResources();
  return qa.describe();
}

function mount() {
  runtime.beginMount();
  runtime.setPauseReason('window-blur', false);
  runtime.setPauseReason('host-hidden', false);
  initializeRenderer();
  runtime.addObserver(new ResizeObserver(resize), sheet);
  runtime.addObserver(new IntersectionObserver(entries => {
    runtime.setPauseReason('outside-viewport', !(entries[0]?.isIntersecting ?? true));
    sync();
  }), sheet);
  runtime.addListener(sheet, 'pointermove', pointerMove, { passive: true });
  for (const type of ['pointerleave', 'pointercancel', 'lostpointercapture']) {
    runtime.addListener(sheet, type, () => clearPointer(type), { passive: true });
  }
  runtime.addListener(document, 'visibilitychange', sync);
  runtime.addListener(reducedMotion, 'change', sync);
  runtime.addListener(window, 'blur', () => {
    clearPointer('window-blur');
    runtime.setPauseReason('window-blur', true);
    sync();
  });
  runtime.addListener(window, 'focus', () => {
    runtime.setPauseReason('window-blur', false);
    sync();
  });
  runtime.addListener(window, 'message', event => {
    if (event.origin !== location.origin || event.data?.type !== 'signature-visual-visibility') return;
    runtime.setPauseReason('host-hidden', !event.data.visible);
    sync();
  });
  runtime.addListener(window, 'pagehide', dispose, { once: true });
  resize();
  runtime.finishMount();
  sync();
}

mount();
