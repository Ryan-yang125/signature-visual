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
  const program = options.createProgram?.({ svg, element: svgElement, target, options }) ?? {};
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, targetActive: 0 };
  let width = 1;
  let height = 1;
  let frame = 0;
  let visible = true;
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
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    svg.dataset.compact = String(width < (options.compactAt ?? 520));
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
    const delta = Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    const time = captureTime ?? (reducedMotion.matches ? config.reducedTime : (now - startTime) / 1000);
    const ease = singleFrame && captureTime !== null ? 1 : config.pointerEase;
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    pointer.active += (pointer.targetActive - pointer.active) * ease;
    program.update?.(state(time, delta));

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
    pointer.tx = Math.max(0, Math.min(1, Number(next.x ?? pointer.tx)));
    pointer.ty = Math.max(0, Math.min(1, Number(next.y ?? pointer.ty)));
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
    svg.remove();
  }

  dispose.dispose = dispose;
  dispose.setSeed = setSeed;
  dispose.seek = seek;
  dispose.setPointer = setPointer;
  dispose.render = renderOnce;
  return dispose;
}
