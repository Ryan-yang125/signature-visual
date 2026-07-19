/**
 * Lifecycle-aware Canvas particle field.
 * Copy into the target project and reshape the field, particle archetype,
 * safe zone, and palette for the project concept.
 */
export function createCanvasField(target, options = {}) {
  if (!(target instanceof HTMLElement)) {
    throw new TypeError('createCanvasField requires an HTMLElement target');
  }

  const config = {
    accent: options.accent ?? '#5b78ff',
    secondary: options.secondary ?? '#73d6cf',
    density: options.density ?? 0.00042,
    minParticles: options.minParticles ?? 90,
    maxParticles: options.maxParticles ?? 520,
    speed: options.speed ?? 0.78,
    calm: options.calm ?? 0.62,
    response: options.response ?? 0.8,
    maxDpr: options.maxDpr ?? 1.75,
    textSafeSide: options.textSafeSide ?? 'none'
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

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Canvas 2D is unavailable');

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: 0, targetActive: 0 };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1;
  let height = 1;
  let dpr = 1;
  let particles = new Float32Array();
  let particleCount = 0;
  let frame = 0;
  let visible = true;
  let destroyed = false;
  let lastTime = performance.now();

  function hash(index, salt = 0) {
    const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function safeZoneRepulsion(x, y) {
    if (config.textSafeSide === 'none') return [0, 0];
    const boundary = width * 0.46;
    const inside = config.textSafeSide === 'left' ? x < boundary : x > width - boundary;
    if (!inside) return [0, 0];
    const edge = config.textSafeSide === 'left' ? boundary : width - boundary;
    const distance = Math.max(24, Math.abs(edge - x));
    const direction = config.textSafeSide === 'left' ? 1 : -1;
    return [direction * Math.min(0.8, 22 / distance), (y / height - 0.5) * 0.05];
  }

  function resetParticle(index, fromEdge = false) {
    const offset = index * 5;
    particles[offset] = fromEdge ? -12 : hash(index, 1) * width;
    particles[offset + 1] = hash(index, 2) * height;
    particles[offset + 2] = particles[offset];
    particles[offset + 3] = particles[offset + 1];
    particles[offset + 4] = hash(index, 3);
  }

  function seedParticles() {
    particleCount = Math.round(width * height * config.density);
    particleCount = Math.max(config.minParticles, Math.min(config.maxParticles, particleCount));
    particles = new Float32Array(particleCount * 5);
    for (let index = 0; index < particleCount; index += 1) resetParticle(index);
  }

  function resize() {
    const rect = target.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(devicePixelRatio || 1, config.maxDpr);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedParticles();
    draw(performance.now(), true);
  }

  function updatePointer(event) {
    const rect = target.getBoundingClientRect();
    pointer.tx = event.clientX - rect.left;
    pointer.ty = event.clientY - rect.top;
    pointer.targetActive = 1;
  }

  function leavePointer() {
    pointer.targetActive = 0;
  }

  function draw(now, singleFrame = false) {
    if (destroyed) return;
    const elapsed = Math.min(32, now - lastTime) / 16.667;
    lastTime = now;
    const time = reducedMotion.matches ? 0.8 : now * 0.00022 * config.speed;

    pointer.x += (pointer.tx - pointer.x) * 0.085;
    pointer.y += (pointer.ty - pointer.y) * 0.085;
    pointer.active += (pointer.targetActive - pointer.active) * 0.08;

    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = reducedMotion.matches ? 'rgba(0,0,0,1)' : `rgba(0,0,0,${0.13 + config.calm * 0.09})`;
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'source-over';
    context.lineCap = 'round';

    for (let index = 0; index < particleCount; index += 1) {
      const offset = index * 5;
      let x = particles[offset];
      let y = particles[offset + 1];
      const previousX = x;
      const previousY = y;
      const seed = particles[offset + 4];
      const nx = x / width - 0.5;
      const ny = y / height - 0.5;

      const angle =
        Math.sin(nx * 6.2 + time * 1.15 + seed * 2.1) * 1.32 +
        Math.cos(ny * 5.4 - time * 0.82 - seed) * 1.08 +
        Math.sin((nx + ny) * 3.1 + time * 0.36) * 0.42;

      let vx = Math.cos(angle) * (0.44 + seed * 0.7);
      let vy = Math.sin(angle) * (0.44 + seed * 0.7);

      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const distanceSquared = dx * dx + dy * dy;
      const radius = Math.min(width, height) * 0.22;
      if (pointer.active > 0.001 && distanceSquared < radius * radius) {
        const distance = Math.max(1, Math.sqrt(distanceSquared));
        const influence = (1 - distance / radius) * config.response * pointer.active;
        vx += (dx / distance) * influence * 2.1;
        vy += (dy / distance) * influence * 2.1;
      }

      const [safeX, safeY] = safeZoneRepulsion(x, y);
      vx += safeX;
      vy += safeY;

      if (!reducedMotion.matches) {
        x += vx * elapsed * config.speed;
        y += vy * elapsed * config.speed;
      }

      particles[offset] = x;
      particles[offset + 1] = y;
      particles[offset + 2] = previousX;
      particles[offset + 3] = previousY;

      const alpha = 0.16 + seed * 0.46;
      context.strokeStyle = seed > 0.72 ? config.secondary : config.accent;
      context.globalAlpha = alpha;
      context.lineWidth = 0.55 + seed * 1.05;
      context.beginPath();
      context.moveTo(previousX, previousY);
      context.lineTo(x, y);
      context.stroke();

      if (x < -20 || x > width + 20 || y < -20 || y > height + 20) {
        resetParticle(index, true);
      }
    }
    context.globalAlpha = 1;

    const shouldAnimate = visible && !document.hidden && !reducedMotion.matches && !singleFrame;
    if (shouldAnimate) frame = requestAnimationFrame(draw);
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    if (visible && !document.hidden && !reducedMotion.matches) {
      lastTime = performance.now();
      frame = requestAnimationFrame(draw);
    } else {
      draw(performance.now(), true);
    }
  }

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(
    entries => {
      visible = entries[0]?.isIntersecting ?? true;
      syncAnimation();
    },
    { rootMargin: '120px' }
  );

  resizeObserver.observe(target);
  intersectionObserver.observe(target);
  target.addEventListener('pointermove', updatePointer, { passive: true });
  target.addEventListener('pointerleave', leavePointer, { passive: true });
  document.addEventListener('visibilitychange', syncAnimation);
  reducedMotion.addEventListener('change', syncAnimation);
  resize();
  syncAnimation();

  return function disposeCanvasField() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    target.removeEventListener('pointermove', updatePointer);
    target.removeEventListener('pointerleave', leavePointer);
    document.removeEventListener('visibilitychange', syncAnimation);
    reducedMotion.removeEventListener('change', syncAnimation);
    canvas.remove();
    if (changedPosition) target.style.position = previousPosition;
  };
}
