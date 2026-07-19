import * as THREE from 'three';

const stage = document.querySelector('#three-stage');
const sceneElement = document.querySelector('.scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0, 6.2);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.setAttribute('aria-hidden', 'true');
stage.append(renderer.domElement);

const uniforms = {
  uTime: { value: 0 },
  uEnergy: { value: 0.78 },
  uViolet: { value: new THREE.Color('#786cff') },
  uCoral: { value: new THREE.Color('#ff6e62') }
};

const geometry = new THREE.IcosahedronGeometry(1.36, 5);
const material = new THREE.ShaderMaterial({
  uniforms,
  transparent: true,
  vertexShader: `
    uniform float uTime;
    uniform float uEnergy;
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vField;

    void main() {
      float breath = sin(uTime * 0.84) * 0.5 + 0.5;
      float waveA = sin(position.x * 2.8 + uTime * 0.93);
      float waveB = sin(position.y * 2.3 - uTime * 0.61);
      float waveC = sin(position.z * 3.2 + uTime * 0.39);
      float ridge = sin((position.x - position.z) * 4.4 - uTime * 0.3) * 0.5;
      float field = waveA * waveB * waveC;
      float displacement = field * (0.09 + uEnergy * 0.11) + ridge * 0.034 + breath * 0.04;
      vec3 transformed = position + normal * displacement;
      vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vView = -viewPosition.xyz;
      vField = field * 0.5 + 0.5;
      gl_Position = projectionMatrix * viewPosition;
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform vec3 uViolet;
    uniform vec3 uCoral;
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vField;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDirection = normalize(vView);
      float fresnel = pow(1.0 - max(0.0, dot(normal, viewDirection)), 2.3);
      float light = dot(normal, normalize(vec3(-0.35, 0.74, 0.58))) * 0.5 + 0.5;
      float band = smoothstep(0.62, 0.92, vField);
      vec3 color = mix(uViolet * 0.24, uViolet, light);
      color = mix(color, uCoral, band * 0.48);
      color += fresnel * mix(uViolet, uCoral, 0.3) * 1.16;
      gl_FragColor = vec4(color, 0.94 + fresnel * 0.06);
    }
  `
});

const shellMaterial = new THREE.MeshBasicMaterial({
  color: '#4d43c7',
  wireframe: true,
  transparent: true,
  opacity: 0.08,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const form = new THREE.Mesh(geometry, material);
const shell = new THREE.Mesh(geometry, shellMaterial);
shell.scale.setScalar(1.055);
const group = new THREE.Group();
group.add(form, shell);
scene.add(group);

const dustGeometry = new THREE.BufferGeometry();
const dustCount = 520;
const dustPositions = new Float32Array(dustCount * 3);
for (let index = 0; index < dustCount; index += 1) {
  const phi = Math.acos(1 - (2 * (index + 0.5)) / dustCount);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  const radius = 1.82 + Math.sin(index * 12.9898) * 0.18;
  dustPositions[index * 3] = Math.cos(theta) * Math.sin(phi) * radius;
  dustPositions[index * 3 + 1] = Math.sin(theta) * Math.sin(phi) * radius;
  dustPositions[index * 3 + 2] = Math.cos(phi) * radius;
}
dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
const dustMaterial = new THREE.PointsMaterial({
  color: '#786cff',
  size: 0.018,
  transparent: true,
  opacity: 0.32,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});
const dust = new THREE.Points(dustGeometry, dustMaterial);
group.add(dust);

const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: 0, target: 0 };
let frame = 0;
let visible = true;
let pageVisible = true;
let start = performance.now();

function resize() {
  const rect = sceneElement.getBoundingClientRect();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  const mobile = rect.width < 650;
  group.position.set(mobile ? 0.3 : 1.25, mobile ? -1.1 : 0, 0);
  group.scale.setScalar(mobile ? 0.86 : 1);
}

function pointerMove(event) {
  const rect = sceneElement.getBoundingClientRect();
  pointer.tx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.ty = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  pointer.target = 1;
}

function render(now = performance.now(), still = false) {
  const time = reducedMotion.matches ? 2.4 : (now - start) * 0.001;
  pointer.x += (pointer.tx - pointer.x) * 0.055;
  pointer.y += (pointer.ty - pointer.y) * 0.055;
  pointer.active += (pointer.target - pointer.active) * 0.055;
  uniforms.uTime.value = time;
  group.rotation.x = -0.11 + pointer.y * 0.13 * pointer.active + Math.sin(time * 0.21) * 0.035;
  group.rotation.y = time * 0.07 + pointer.x * 0.18 * pointer.active;
  group.rotation.z = Math.sin(time * 0.16) * 0.055;
  dust.rotation.y = -time * 0.024;
  dust.rotation.x = time * 0.016;
  renderer.render(scene, camera);
  stage.classList.add('three-ready');
  if (visible && pageVisible && !document.hidden && !reducedMotion.matches && !still) frame = requestAnimationFrame(render);
}

function sync() {
  cancelAnimationFrame(frame);
  if (visible && pageVisible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(render);
  else render(start + 2400, true);
}

new ResizeObserver(resize).observe(sceneElement);
new IntersectionObserver(entries => {
  visible = entries[0]?.isIntersecting ?? true;
  sync();
}).observe(sceneElement);
sceneElement.addEventListener('pointermove', pointerMove, { passive: true });
sceneElement.addEventListener('pointerleave', () => { pointer.target = 0; }, { passive: true });
document.addEventListener('visibilitychange', sync);
reducedMotion.addEventListener('change', sync);
window.addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  if (event.data?.type === 'signature-visual-visibility') {
    pageVisible = Boolean(event.data.visible);
    sync();
  }
});

resize();
sync();

window.addEventListener('pagehide', () => {
  cancelAnimationFrame(frame);
  geometry.dispose();
  material.dispose();
  shellMaterial.dispose();
  dustGeometry.dispose();
  dustMaterial.dispose();
  renderer.dispose();
});
