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

  const previousPosition = target.style.position;
  const changedPosition = getComputedStyle(target).position === 'static';
  let renderer;
  let scene;
  let camera;
  let program;

  function rollbackMount() {
    try { program?.dispose?.(); } catch {}
    try { renderer?.dispose?.(); } catch {}
    try { renderer?.forceContextLoss?.(); } catch {}
    renderer?.domElement?.remove();
    if (changedPosition) target.style.position = previousPosition;
  }

  function fallbackController(reason, error) {
    rollbackMount();
    if (options.fallback === undefined) throw error;
    const fallbackPreviousPosition = target.style.position;
    const fallbackChangedPosition = getComputedStyle(target).position === 'static';
    if (fallbackChangedPosition) target.style.position = 'relative';
    let fallbackNode;
    let fallbackCleanup;
    try {
      if (typeof options.fallback === 'function') {
        const result = options.fallback({ target, reason, error, renderer: 'three' });
        if (result instanceof Node) fallbackNode = result;
        else if (typeof result === 'function') fallbackCleanup = result;
        else if (result?.node instanceof Node) {
          fallbackNode = result.node;
          fallbackCleanup = result.dispose;
        }
      } else if (options.fallback instanceof Node) fallbackNode = options.fallback;
      else if (typeof options.fallback === 'string') {
        fallbackNode = document.createElement('div');
        fallbackNode.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
        fallbackNode.style.background = options.fallback;
      }
      if (fallbackNode && !fallbackNode.isConnected) target.append(fallbackNode);
    } catch (fallbackError) {
      fallbackNode?.remove();
      if (fallbackChangedPosition) target.style.position = fallbackPreviousPosition;
      throw fallbackError;
    }
    let disposed = false;
    let fallbackSeed = normalizeSeed(config.seed);
    let fallbackTime = 0;
    let fallbackProgress = 0;
    let fallbackPointer = { x: 0.5, y: 0.5, active: false, strength: 0 };
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      fallbackCleanup?.();
      fallbackNode?.remove();
      if (fallbackChangedPosition) target.style.position = fallbackPreviousPosition;
    };
    dispose.dispose = dispose;
    dispose.setSeed = value => { fallbackSeed = normalizeSeed(value); };
    dispose.seek = next => {
      if (Number.isFinite(next?.time)) fallbackTime = Number(next.time);
      if (Number.isFinite(next?.progress)) fallbackProgress = Math.max(0, Math.min(1, Number(next.progress)));
    };
    dispose.setPointer = (next = {}) => {
      const x = Number(next.x);
      const y = Number(next.y);
      const active = next.active === undefined ? fallbackPointer.active : Boolean(next.active);
      const requestedStrength = next.strength === undefined
        ? (next.active === undefined ? fallbackPointer.strength : active ? 1 : 0)
        : Math.max(0, Math.min(1, Number(next.strength)));
      const strength = Number.isFinite(requestedStrength) && active ? requestedStrength : 0;
      fallbackPointer = {
        x: Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : fallbackPointer.x,
        y: Number.isFinite(y) ? Math.max(0, Math.min(1, y)) : fallbackPointer.y,
        active: active && strength > 0,
        strength
      };
    };
    dispose.render = () => {};
    dispose.describe = () => {
      const bounds = target.getBoundingClientRect();
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const pauseReasons = [];
      if (bounds.width <= 0 || bounds.height <= 0) pauseReasons.push('zero-size');
      if (reduced) pauseReasons.push('reduced-motion');
      if (disposed) pauseReasons.push('disposed');
      return {
        ready: !disposed,
        disposed,
        renderer: 'three',
        fallback: true,
        fallbackReason: reason,
        paused: pauseReasons.length > 0,
        pauseReasons,
        width: bounds.width,
        height: bounds.height,
        dpr: Math.min(window.devicePixelRatio || 1, config.maxDpr),
        seed: fallbackSeed,
        time: fallbackTime,
        progress: fallbackProgress,
        pointer: { ...fallbackPointer },
        reducedMotion: reduced
      };
    };
    Object.defineProperty(dispose, 'ready', { enumerable: true, get: () => !disposed });
    return dispose;
  }

  try {
    renderer = new THREE.WebGLRenderer({
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
    if (changedPosition) target.style.position = 'relative';
    target.append(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(config.fov, 1, 0.1, 100);
    camera.position.set(0, 0, config.cameraZ);
    program = options.createProgram?.({ THREE, scene, camera, renderer, target, options }) ?? {};
  } catch (error) {
    return fallbackController('initialization-error', error);
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: 0, targetActive: 0 };
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let visible = true;
  let windowFocused = true;
  let hasSize = false;
  let contextLost = false;
  let destroyed = false;
  let startTime = performance.now();
  let previousTime = startTime;
  let captureTime = null;
  let captureProgress = 0;
  let seed = normalizeSeed(config.seed);
  let runtimeFallbackNode;
  let runtimeFallbackCleanup;

  function showRuntimeFallback(reason) {
    if (runtimeFallbackNode || runtimeFallbackCleanup || options.fallback === undefined) return;
    const result = typeof options.fallback === 'function'
      ? options.fallback({ target, reason, renderer: 'three' })
      : options.fallback;
    if (result instanceof Node) runtimeFallbackNode = result;
    else if (typeof result === 'function') runtimeFallbackCleanup = result;
    else if (result?.node instanceof Node) {
      runtimeFallbackNode = result.node;
      runtimeFallbackCleanup = result.dispose;
    } else if (typeof result === 'string') {
      runtimeFallbackNode = document.createElement('div');
      runtimeFallbackNode.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
      runtimeFallbackNode.style.background = result;
    }
    if (runtimeFallbackNode && !runtimeFallbackNode.isConnected) target.append(runtimeFallbackNode);
  }

  function clearRuntimeFallback() {
    runtimeFallbackCleanup?.();
    runtimeFallbackCleanup = undefined;
    runtimeFallbackNode?.remove();
    runtimeFallbackNode = undefined;
  }

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
    width = Math.max(0, rect.width);
    height = Math.max(0, rect.height);
    hasSize = width > 0 && height > 0;
    dpr = Math.min(devicePixelRatio || 1, config.maxDpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    camera.aspect = hasSize ? width / height : 1;
    camera.updateProjectionMatrix();
    program.resize?.(state(captureTime ?? 0));
    syncAnimation();
  }

  function updatePointer(event) {
    const rect = target.getBoundingClientRect();
    pointer.tx = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1));
    pointer.ty = Math.max(-1, Math.min(1, -(((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1)));
    pointer.targetActive = 1;
  }

  function cancelPointer() {
    pointer.targetActive = 0;
    pointer.active = 0;
    if (!destroyed) syncAnimation();
  }

  function handleWindowBlur() {
    windowFocused = false;
    cancelPointer();
  }

  function handleWindowFocus() {
    windowFocused = true;
    syncAnimation();
  }

  function handleContextLost(event) {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frame);
    showRuntimeFallback('context-lost');
  }

  function handleContextRestored() {
    contextLost = false;
    clearRuntimeFallback();
    resize();
    syncAnimation();
  }

  function renderFrame(now = performance.now(), singleFrame = false) {
    if (destroyed || !hasSize || contextLost) return;
    const delta = Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    const time = captureTime ?? (reducedMotion.matches ? config.reducedTime : (now - startTime) / 1000);
    const ease = singleFrame && captureTime !== null ? 1 : config.pointerEase;
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    pointer.active += (pointer.targetActive - pointer.active) * ease;

    program.update?.(state(time, delta));
    renderer.render(scene, camera);

    if (visible && windowFocused && !document.hidden && !reducedMotion.matches && captureTime === null && !singleFrame) {
      frame = requestAnimationFrame(renderFrame);
    }
  }

  function renderOnce() {
    cancelAnimationFrame(frame);
    renderFrame(performance.now(), true);
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    if (hasSize && visible && windowFocused && !document.hidden && !reducedMotion.matches && !contextLost && captureTime === null) {
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
    const active = next.active === undefined ? pointer.targetActive > 0 : Boolean(next.active);
    const strength = next.strength === undefined ? (active ? 1 : 0) : Number(next.strength);
    pointer.targetActive = active && Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
    pointer.x = pointer.tx;
    pointer.y = pointer.ty;
    pointer.active = pointer.targetActive;
    program.setPointer?.({ ...pointer });
    renderOnce();
  }

  function describe() {
    const pauseReasons = [];
    if (!hasSize) pauseReasons.push('zero-size');
    if (!visible) pauseReasons.push('offscreen');
    if (document.hidden) pauseReasons.push('document-hidden');
    if (!windowFocused) pauseReasons.push('window-blur');
    if (reducedMotion.matches) pauseReasons.push('reduced-motion');
    if (contextLost) pauseReasons.push('context-lost');
    return {
      ready: !destroyed,
      disposed: destroyed,
      renderer: 'three',
      fallback: contextLost,
      fallbackReason: contextLost ? 'context-lost' : null,
      paused: pauseReasons.length > 0,
      pauseReasons,
      width,
      height,
      dpr,
      seed,
      time: captureTime ?? Math.max(0, (performance.now() - startTime) / 1000),
      progress: captureProgress,
      pointer: {
        x: pointer.x,
        y: pointer.y,
        active: pointer.targetActive > 0,
        strength: pointer.active
      },
      reducedMotion: reducedMotion.matches
    };
  }

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true;
    syncAnimation();
  }, { rootMargin: '120px' });

  try {
    program.setSeed?.(seed);
    resize();
  } catch (error) {
    cancelAnimationFrame(frame);
    return fallbackController('initialization-error', error);
  }
  resizeObserver.observe(target);
  intersectionObserver.observe(target);
  target.addEventListener('pointermove', updatePointer, { passive: true });
  target.addEventListener('pointerleave', cancelPointer, { passive: true });
  target.addEventListener('pointercancel', cancelPointer, { passive: true });
  target.addEventListener('lostpointercapture', cancelPointer, { passive: true });
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);
  document.addEventListener('visibilitychange', syncAnimation);
  reducedMotion.addEventListener('change', syncAnimation);
  window.addEventListener('blur', handleWindowBlur);
  window.addEventListener('focus', handleWindowFocus);

  function dispose() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    target.removeEventListener('pointermove', updatePointer);
    target.removeEventListener('pointerleave', cancelPointer);
    target.removeEventListener('pointercancel', cancelPointer);
    target.removeEventListener('lostpointercapture', cancelPointer);
    renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
    document.removeEventListener('visibilitychange', syncAnimation);
    reducedMotion.removeEventListener('change', syncAnimation);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    clearRuntimeFallback();
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
  dispose.describe = describe;
  Object.defineProperty(dispose, 'ready', { enumerable: true, get: () => !destroyed });
  return dispose;
}
