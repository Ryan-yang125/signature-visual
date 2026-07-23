const SVG_NS = 'http://www.w3.org/2000/svg';

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

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

/**
 * Neutral SVG runtime shell.
 *
 * Supply options.createProgram({ svg, element, target, options }). The program
 * may implement resize(state), update(state), seek(state), setSeed(seed),
 * setPointer(pointer), and dispose().
 */
export function createTechnicalSystem(target, options = {}) {
  if (!(target instanceof HTMLElement)) {
    throw new TypeError('createTechnicalSystem requires an HTMLElement target');
  }

  const config = {
    viewBox: options.viewBox ?? '0 0 800 500',
    decorative: options.decorative ?? true,
    title: options.title ?? 'Computational visual system',
    description: options.description ?? 'An authored visual system.',
    seed: options.seed ?? 125,
    reducedTime: options.reducedTime ?? 2.4,
    pointerEase: options.pointerEase ?? 0.12
  };

  const svg = svgElement('svg', {
    viewBox: config.viewBox,
    preserveAspectRatio: options.preserveAspectRatio ?? 'xMidYMid meet'
  });
  Object.assign(svg.style, {
    width: '100%',
    height: '100%',
    display: 'block',
    overflow: options.overflow ?? 'hidden'
  });

  if (config.decorative) {
    svg.setAttribute('aria-hidden', 'true');
    svg.style.pointerEvents = 'none';
  } else {
    svg.setAttribute('role', options.role ?? 'img');
    const title = svgElement('title');
    title.textContent = config.title;
    const description = svgElement('desc');
    description.textContent = config.description;
    svg.append(title, description);
  }

  target.append(svg);
  function fallbackController(reason, error) {
    svg.remove();
    if (options.fallback === undefined) throw error;
    let fallbackNode;
    let fallbackCleanup;
    if (typeof options.fallback === 'function') {
      const result = options.fallback({ target, reason, error, renderer: 'svg' });
      if (result instanceof Node) fallbackNode = result;
      else if (typeof result === 'function') fallbackCleanup = result;
      else if (result?.node instanceof Node) {
        fallbackNode = result.node;
        fallbackCleanup = result.dispose;
      }
    } else if (options.fallback instanceof Node) fallbackNode = options.fallback;
    else if (typeof options.fallback === 'string') {
      fallbackNode = document.createElement('div');
      fallbackNode.textContent = options.fallback;
    }
    if (fallbackNode && !fallbackNode.isConnected) target.append(fallbackNode);
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
        renderer: 'svg',
        fallback: true,
        fallbackReason: reason,
        paused: pauseReasons.length > 0,
        pauseReasons,
        width: bounds.width,
        height: bounds.height,
        dpr: window.devicePixelRatio || 1,
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

  let program;
  try {
    program = options.createProgram?.({ svg, element: svgElement, target, options }) ?? {};
  } catch (error) {
    return fallbackController('initialization-error', error);
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, targetActive: 0 };
  let width = 0;
  let height = 0;
  let frame = 0;
  let visible = true;
  let windowFocused = true;
  let hasSize = false;
  let destroyed = false;
  let captureTime = null;
  let captureProgress = 0;
  let startTime = performance.now();
  let previousTime = startTime;
  let seed = normalizeSeed(config.seed);

  function state(time, delta = 0) {
    return {
      svg,
      target,
      options,
      element: svgElement,
      width,
      height,
      time,
      delta,
      progress: captureProgress,
      seed,
      pointer: { ...pointer },
      reducedMotion: reducedMotion.matches
    };
  }

  function resize(entries) {
    const rect = entries?.[0]?.contentRect ?? target.getBoundingClientRect();
    width = Math.max(0, rect.width);
    height = Math.max(0, rect.height);
    hasSize = width > 0 && height > 0;
    svg.dataset.compact = String(width < (options.compactAt ?? 520));
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
    const delta = Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    const time = captureTime ?? (reducedMotion.matches ? config.reducedTime : (now - startTime) / 1000);
    const ease = singleFrame && captureTime !== null ? 1 : config.pointerEase;
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    pointer.active += (pointer.targetActive - pointer.active) * ease;
    program.update?.(state(time, delta));

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
    pointer.tx = Math.max(0, Math.min(1, Number(next.x ?? pointer.tx)));
    pointer.ty = Math.max(0, Math.min(1, Number(next.y ?? pointer.ty)));
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
    return {
      ready: !destroyed,
      disposed: destroyed,
      renderer: 'svg',
      fallback: false,
      paused: pauseReasons.length > 0,
      pauseReasons,
      width,
      height,
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
    svg.remove();
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
