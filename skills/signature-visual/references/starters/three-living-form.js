import * as THREE from 'three';

/**
 * Neutral Three.js runtime shell.
 *
 * Supply options.createProgram({ THREE, scene, camera, renderer, target, options }).
 * The returned program may implement resize(state), update(state), seek(state),
 * setSeed(seed), setPointer(pointer), and dispose().
 */
function normalizeSeed(value) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric) && String(value).trim() !== '') return numeric >>> 0;
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createLivingForm(target, options = {}) {
  if (!(target instanceof HTMLElement)) {
    throw new TypeError('createLivingForm requires an HTMLElement target');
  }

  const config = {
    maxDpr: options.maxDpr ?? 1.75,
    seed: options.seed ?? 125,
    reducedTime: options.reducedTime ?? 2.4,
    pointerEase: options.pointerEase ?? 0.1,
    fov: options.fov ?? 35,
    cameraZ: options.cameraZ ?? 5
  };

  const renderer = new THREE.WebGLRenderer({
    alpha: options.alpha ?? true,
    antialias: options.antialias ?? true,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(options.clearColor ?? 0x000000, options.clearAlpha ?? 0);
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
  const camera = new THREE.PerspectiveCamera(config.fov, 1, 0.1, 100);
  camera.position.set(0, 0, config.cameraZ);
  const program = options.createProgram?.({ THREE, scene, camera, renderer, target, options }) ?? {};
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: 0, targetActive: 0 };
  let width = 1;
  let height = 1;
  let dpr = 1;
  let frame = 0;
  let visible = true;
  let destroyed = false;
  let startTime = performance.now();
  let previousTime = startTime;
  let captureTime = null;
  let captureProgress = 0;
  let seed = normalizeSeed(config.seed);

  function state(time, delta = 0) {
    return {
      THREE,
      scene,
      camera,
      renderer,
      target,
      options,
      width,
      height,
      dpr,
      time,
      delta,
      progress: captureProgress,
      seed,
      pointer: { ...pointer },
      reducedMotion: reducedMotion.matches
    };
  }

  function resize() {
    const rect = target.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(devicePixelRatio || 1, config.maxDpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    program.resize?.(state(captureTime ?? 0));
    renderOnce();
  }

  function updatePointer(event) {
    const rect = target.getBoundingClientRect();
    pointer.tx = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1));
    pointer.ty = Math.max(-1, Math.min(1, -(((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1)));
    pointer.targetActive = 1;
  }

  function leavePointer() {
    pointer.targetActive = 0;
  }

  function renderFrame(now = performance.now(), singleFrame = false) {
    if (destroyed) return;
    const delta = Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    const time = captureTime ?? (reducedMotion.matches ? config.reducedTime : (now - startTime) / 1000);
    const ease = singleFrame && captureTime !== null ? 1 : config.pointerEase;
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    pointer.active += (pointer.targetActive - pointer.active) * ease;

    program.update?.(state(time, delta));
    renderer.render(scene, camera);

    if (visible && !document.hidden && !reducedMotion.matches && captureTime === null && !singleFrame) {
      frame = requestAnimationFrame(renderFrame);
    }
  }

  function renderOnce() {
    cancelAnimationFrame(frame);
    renderFrame(performance.now(), true);
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    if (visible && !document.hidden && !reducedMotion.matches && captureTime === null) {
      previousTime = performance.now();
      frame = requestAnimationFrame(renderFrame);
    } else {
      renderOnce();
    }
  }

  function setSeed(nextSeed) {
    seed = normalizeSeed(nextSeed);
    program.setSeed?.(seed);
    renderOnce();
  }

  function seek(next = {}) {
    captureTime = Number.isFinite(next.time) ? Number(next.time) : captureTime ?? 0;
    captureProgress = Number.isFinite(next.progress) ? Math.max(0, Math.min(1, Number(next.progress))) : captureProgress;
    program.seek?.(state(captureTime));
    renderOnce();
  }

  function setPointer(next = {}) {
    const ratioX = Math.max(0, Math.min(1, Number(next.x ?? (pointer.tx + 1) / 2)));
    const ratioY = Math.max(0, Math.min(1, Number(next.y ?? (1 - pointer.ty) / 2)));
    pointer.tx = ratioX * 2 - 1;
    pointer.ty = 1 - ratioY * 2;
    pointer.targetActive = Math.max(0, Math.min(1, Number(next.active ?? pointer.targetActive)));
    pointer.x = pointer.tx;
    pointer.y = pointer.ty;
    pointer.active = pointer.targetActive;
    program.setPointer?.({ ...pointer });
    renderOnce();
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
  program.setSeed?.(seed);
  resize();
  syncAnimation();

  function dispose() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    target.removeEventListener('pointermove', updatePointer);
    target.removeEventListener('pointerleave', leavePointer);
    document.removeEventListener('visibilitychange', syncAnimation);
    reducedMotion.removeEventListener('change', syncAnimation);
    program.dispose?.();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    if (changedPosition) target.style.position = previousPosition;
  }

  dispose.dispose = dispose;
  dispose.setSeed = setSeed;
  dispose.seek = seek;
  dispose.setPointer = setPointer;
  dispose.render = renderOnce;
  return dispose;
}
