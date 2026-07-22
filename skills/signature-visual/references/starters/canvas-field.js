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
  if (!context) throw new Error('Canvas 2D is unavailable');

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, targetActive: 0 };
  let width = 1;
  let height = 1;
  let dpr = 1;
  let frame = 0;
  let visible = true;
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
  const program = options.createProgram?.(runtime) ?? {};

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
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(devicePixelRatio || 1, config.maxDpr);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    program.resize?.(state(captureTime ?? 0));
    renderOnce();
  }

  function updatePointer(event) {
    const rect = target.getBoundingClientRect();
    pointer.tx = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
    pointer.ty = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)));
    pointer.targetActive = 1;
  }

  function leavePointer() {
    pointer.targetActive = 0;
  }

  function renderFrame(now = performance.now(), singleFrame = false) {
    if (destroyed) return;
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
    pointer.targetActive = Math.max(0, Math.min(1, Number(next.active ?? pointer.targetActive)));
    pointer.x = pointer.tx;
    pointer.y = pointer.ty;
    pointer.active = pointer.targetActive;
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
  resetProgram();
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
    canvas.remove();
    if (changedPosition) target.style.position = previousPosition;
  }

  dispose.dispose = dispose;
  dispose.setSeed = setSeed;
  dispose.seek = seek;
  dispose.setPointer = setPointer;
  dispose.render = renderOnce;
  return dispose;
}
