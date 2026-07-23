/**
 * Neutral Canvas 2D runtime shell.
 *
 * Supply options.createProgram(runtime) and return any of:
 *   reset(state), resize(state), step(state), draw(state), seek(state), dispose().
 * The shell owns DOM, sizing, time, visibility, input, reduced motion, and cleanup.
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

export function createCanvasField(target, options = {}) {
  if (!(target instanceof HTMLElement)) {
    throw new TypeError('createCanvasField requires an HTMLElement target');
  }

  const config = {
    maxDpr: options.maxDpr ?? 1.75,
    seed: options.seed ?? 125,
    reducedTime: options.reducedTime ?? 2.4,
    pointerEase: options.pointerEase ?? 0.12,
    alpha: options.alpha ?? true
  };

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
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
  target.append(canvas);

  const context = canvas.getContext('2d', { alpha: config.alpha });
  function rollbackMount() {
    canvas.remove();
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
        const result = options.fallback({ target, reason, error, renderer: 'canvas-2d' });
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
        renderer: 'canvas-2d',
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

  if (!context) return fallbackController('context-unavailable', new Error('Canvas 2D is unavailable'));

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, targetActive: 0 };
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let visible = true;
  let windowFocused = true;
  let hasSize = false;
  let destroyed = false;
  let captureTime = null;
  let captureProgress = 0;
  let seed = normalizeSeed(config.seed);
  let startTime = performance.now();
  let previousTime = startTime;

  function randomSource(initialSeed) {
    let value = initialSeed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  let random = randomSource(seed);
  const runtime = {
    canvas,
    context,
    target,
    options,
    random: () => random(),
    get seed() { return seed; },
    get width() { return width; },
    get height() { return height; },
    get dpr() { return dpr; }
  };
  let program;
  try {
    program = options.createProgram?.(runtime) ?? {};
  } catch (error) {
    return fallbackController('initialization-error', error);
  }

  function state(time, delta = 0) {
    return {
      ...runtime,
      time,
      delta,
      progress: captureProgress,
      pointer: { ...pointer },
      reducedMotion: reducedMotion.matches
    };
  }

  function resetProgram() {
    random = randomSource(seed);
    program.reset?.(state(captureTime ?? 0));
  }

  function resize() {
    const rect = target.getBoundingClientRect();
    width = Math.max(0, rect.width);
    height = Math.max(0, rect.height);
    hasSize = width > 0 && height > 0;
    dpr = Math.min(devicePixelRatio || 1, config.maxDpr);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    program.resize?.(state(captureTime ?? 0));
    syncAnimation();
  }

  function updatePointer(event) {
    const rect = target.getBoundingClientRect();
    pointer.tx = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
    pointer.ty = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)));
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

  function renderFrame(now = performance.now(), singleFrame = false) {
    if (destroyed || !hasSize) return;
    const elapsed = Math.min(50, Math.max(0, now - previousTime)) / 1000;
    previousTime = now;
    const time = captureTime ?? (reducedMotion.matches ? config.reducedTime : (now - startTime) / 1000);
    const ease = singleFrame && captureTime !== null ? 1 : config.pointerEase;
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    pointer.active += (pointer.targetActive - pointer.active) * ease;

    const current = state(time, elapsed);
    program.step?.(current);
    if (program.draw) program.draw(current);
    else context.clearRect(0, 0, width, height);

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
    if (hasSize && visible && windowFocused && !document.hidden && !reducedMotion.matches && captureTime === null) {
      previousTime = performance.now();
      frame = requestAnimationFrame(renderFrame);
    } else {
      renderOnce();
    }
  }

  function setSeed(nextSeed) {
    seed = normalizeSeed(nextSeed);
    resetProgram();
    renderOnce();
  }

  function seek(next = {}) {
    captureTime = Number.isFinite(next.time) ? Number(next.time) : captureTime ?? 0;
    captureProgress = Number.isFinite(next.progress) ? Math.max(0, Math.min(1, Number(next.progress))) : captureProgress;
    if (program.seek) program.seek(state(captureTime));
    else resetProgram();
    renderOnce();
  }

  function setPointer(next = {}) {
    pointer.tx = Math.max(0, Math.min(1, Number(next.x ?? pointer.tx)));
    pointer.ty = Math.max(0, Math.min(1, Number(next.y ?? pointer.ty)));
    const active = next.active === undefined ? pointer.targetActive > 0 : Boolean(next.active);
    const strength = next.strength === undefined ? (active ? 1 : 0) : Number(next.strength);
    pointer.targetActive = active && Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
    pointer.x = pointer.tx;
    pointer.y = pointer.ty;
    pointer.active = pointer.targetActive;
    renderOnce();
  }

  function describe() {
    const pauseReasons = [];
    if (!hasSize) pauseReasons.push('zero-size');
    if (!visible) pauseReasons.push('offscreen');
    if (document.hidden) pauseReasons.push('document-hidden');
    if (!windowFocused) pauseReasons.push('window-blur');
    if (reducedMotion.matches) pauseReasons.push('reduced-motion');
    return {
      ready: !destroyed,
      disposed: destroyed,
      renderer: 'canvas-2d',
      fallback: false,
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
    resetProgram();
    resize();
  } catch (error) {
    cancelAnimationFrame(frame);
    try { program.dispose?.(); } catch {}
    return fallbackController('initialization-error', error);
  }
  resizeObserver.observe(target);
  intersectionObserver.observe(target);
  target.addEventListener('pointermove', updatePointer, { passive: true });
  target.addEventListener('pointerleave', cancelPointer, { passive: true });
  target.addEventListener('pointercancel', cancelPointer, { passive: true });
  target.addEventListener('lostpointercapture', cancelPointer, { passive: true });
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
    document.removeEventListener('visibilitychange', syncAnimation);
    reducedMotion.removeEventListener('change', syncAnimation);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    program.dispose?.();
    canvas.remove();
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
