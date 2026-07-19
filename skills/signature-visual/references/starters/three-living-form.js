import * as THREE from 'three';

/** Lifecycle-aware Three.js living form. */
export function createLivingForm(target, options = {}) {
  if (!(target instanceof HTMLElement)) {
    throw new TypeError('createLivingForm requires an HTMLElement target');
  }

  const config = {
    accent: options.accent ?? '#7388ff',
    secondary: options.secondary ?? '#ff7869',
    energy: options.energy ?? 0.72,
    calm: options.calm ?? 0.62,
    response: options.response ?? 0.72,
    maxDpr: options.maxDpr ?? 1.75,
    detail: options.detail ?? 5
  };

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  Object.assign(renderer.domElement.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none'
  });

  const previousPosition = target.style.position;
  const changedPosition = getComputedStyle(target).position === 'static';
  if (changedPosition) target.style.position = 'relative';
  target.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 5.4);

  const uniforms = {
    uTime: { value: 0 },
    uEnergy: { value: config.energy },
    uAccent: { value: new THREE.Color(config.accent) },
    uSecondary: { value: new THREE.Color(config.secondary) }
  };

  const geometry = new THREE.IcosahedronGeometry(1.28, Math.min(6, Math.max(2, config.detail)));
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: true,
    vertexShader: `
      uniform float uTime;
      uniform float uEnergy;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vField;

      void main() {
        float breath = sin(uTime * 0.82) * 0.5 + 0.5;
        float field =
          sin(position.x * 2.75 + uTime * 0.92) *
          sin(position.y * 2.25 - uTime * 0.63) *
          sin(position.z * 3.15 + uTime * 0.41);
        float ridge = sin((position.x + position.z) * 4.1 - uTime * 0.34) * 0.5;
        float displacement = field * (0.08 + uEnergy * 0.12) + ridge * 0.035 + breath * 0.035;
        vec3 transformed = position + normal * displacement;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(transformed, 1.0)).xyz;
        vField = field * 0.5 + 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform vec3 uAccent;
      uniform vec3 uSecondary;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vField;

      void main() {
        vec3 viewDirection = normalize(-vPosition);
        float fresnel = pow(1.0 - max(0.0, dot(normalize(vNormal), viewDirection)), 2.35);
        float light = dot(normalize(vNormal), normalize(vec3(-0.45, 0.7, 0.55))) * 0.5 + 0.5;
        vec3 color = mix(uAccent * 0.34, uAccent, light);
        color = mix(color, uSecondary, smoothstep(0.68, 0.96, vField) * 0.42);
        color += fresnel * mix(uAccent, uSecondary, 0.34) * 1.15;
        gl_FragColor = vec4(color, 0.92 + fresnel * 0.08);
      }
    `
  });

  const shellMaterial = new THREE.MeshBasicMaterial({
    color: config.accent,
    wireframe: true,
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const group = new THREE.Group();
  const form = new THREE.Mesh(geometry, material);
  const shell = new THREE.Mesh(geometry, shellMaterial);
  shell.scale.setScalar(1.055);
  group.add(form, shell);
  scene.add(group);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: 0, targetActive: 0 };
  let frame = 0;
  let visible = true;
  let destroyed = false;
  let startTime = performance.now();

  function resize() {
    const rect = target.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, config.maxDpr));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function updatePointer(event) {
    const rect = target.getBoundingClientRect();
    pointer.tx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.ty = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    pointer.targetActive = 1;
  }

  function leavePointer() {
    pointer.targetActive = 0;
  }

  function render(now = performance.now(), singleFrame = false) {
    if (destroyed) return;
    const elapsed = reducedMotion.matches ? 2.4 : (now - startTime) * 0.001 * (1.1 - config.calm * 0.45);
    pointer.x += (pointer.tx - pointer.x) * 0.055;
    pointer.y += (pointer.ty - pointer.y) * 0.055;
    pointer.active += (pointer.targetActive - pointer.active) * 0.06;

    uniforms.uTime.value = elapsed;
    group.rotation.x = -0.12 + pointer.y * 0.13 * config.response * pointer.active + Math.sin(elapsed * 0.23) * 0.035;
    group.rotation.y = elapsed * 0.075 + pointer.x * 0.2 * config.response * pointer.active;
    group.rotation.z = Math.sin(elapsed * 0.16) * 0.07;
    const scale = 1 + Math.sin(elapsed * 0.82) * 0.012;
    group.scale.setScalar(scale);

    renderer.render(scene, camera);
    if (visible && !document.hidden && !reducedMotion.matches && !singleFrame) {
      frame = requestAnimationFrame(render);
    }
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    if (visible && !document.hidden && !reducedMotion.matches) {
      startTime = performance.now() - uniforms.uTime.value * 1000;
      frame = requestAnimationFrame(render);
    } else {
      render(startTime + 2400, true);
    }
  }

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true;
    syncAnimation();
  }, { rootMargin: '120px' });

  resizeObserver.observe(target);
  intersectionObserver.observe(target);
  target.addEventListener('pointermove', updatePointer, { passive: true });
  target.addEventListener('pointerleave', leavePointer, { passive: true });
  document.addEventListener('visibilitychange', syncAnimation);
  reducedMotion.addEventListener('change', syncAnimation);
  resize();
  syncAnimation();

  return function disposeLivingForm() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    target.removeEventListener('pointermove', updatePointer);
    target.removeEventListener('pointerleave', leavePointer);
    document.removeEventListener('visibilitychange', syncAnimation);
    reducedMotion.removeEventListener('change', syncAnimation);
    geometry.dispose();
    material.dispose();
    shellMaterial.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    if (changedPosition) target.style.position = previousPosition;
  };
}
