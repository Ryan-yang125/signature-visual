const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function setupCopyButtons() {
  for (const button of document.querySelectorAll('[data-copy]')) {
    button.addEventListener('click', async () => {
      const label = button.querySelector('.copy-label');
      const previous = label.textContent;
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        label.textContent = 'COPIED';
      } catch {
        label.textContent = 'SELECT';
      }
      window.setTimeout(() => {
        label.textContent = previous;
      }, 1600);
    });
  }
}

function setupLiveFrames() {
  const frames = [...document.querySelectorAll('iframe[data-src]')];
  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        const frame = entry.target;
        if (entry.isIntersecting && !frame.src) frame.src = frame.dataset.src;
        frame.contentWindow?.postMessage(
          { type: 'signature-visual-visibility', visible: entry.isIntersecting },
          location.origin
        );
      }
    },
    { rootMargin: '240px 0px', threshold: 0.01 }
  );
  frames.forEach(frame => observer.observe(frame));
}

function setupHeroField() {
  const canvas = document.querySelector('#hero-field');
  const hero = document.querySelector('.hero');
  const pointerReadout = document.querySelector('.hero-coordinate-left');
  if (!canvas || !hero) return;

  const context = canvas.getContext('2d', { alpha: true });
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: 0, target: 0 };
  let width = 1;
  let height = 1;
  let dpr = 1;
  let points = new Float32Array();
  let count = 0;
  let frame = 0;
  let running = true;
  let lastTime = performance.now();

  const colors = ['#5b78ff', '#74dad3', '#ff7869', '#9b79ff'];

  function hash(value, salt) {
    const n = Math.sin(value * 127.1 + salt * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function reset(index, edge = false) {
    const offset = index * 6;
    const seed = hash(index, 3);
    points[offset] = edge ? width * (0.44 + hash(index, 4) * 0.62) : hash(index, 1) * width;
    points[offset + 1] = hash(index, 2) * height;
    points[offset + 2] = points[offset];
    points[offset + 3] = points[offset + 1];
    points[offset + 4] = seed;
    points[offset + 5] = Math.floor(seed * colors.length);
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(devicePixelRatio || 1, 1.65);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    count = Math.max(140, Math.min(620, Math.round(width * height * 0.00038)));
    points = new Float32Array(count * 6);
    for (let index = 0; index < count; index += 1) reset(index);
    render(performance.now(), true);
  }

  function updatePointer(event) {
    const rect = hero.getBoundingClientRect();
    pointer.tx = event.clientX - rect.left;
    pointer.ty = event.clientY - rect.top;
    pointer.target = 1;
    if (pointerReadout) {
      pointerReadout.textContent = `PTR / ${(pointer.tx / width).toFixed(3)} : ${(pointer.ty / height).toFixed(3)}`;
    }
  }

  function leavePointer() {
    pointer.target = 0;
  }

  function render(now, still = false) {
    const step = Math.min(32, now - lastTime) / 16.667;
    lastTime = now;
    const time = reducedMotion.matches ? 2.4 : now * 0.00018;
    pointer.x += (pointer.tx - pointer.x) * 0.07;
    pointer.y += (pointer.ty - pointer.y) * 0.07;
    pointer.active += (pointer.target - pointer.active) * 0.075;

    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = reducedMotion.matches ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0.115)';
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';

    for (let index = 0; index < count; index += 1) {
      const offset = index * 6;
      let x = points[offset];
      let y = points[offset + 1];
      const previousX = x;
      const previousY = y;
      const seed = points[offset + 4];
      const nx = x / width - 0.5;
      const ny = y / height - 0.5;

      const angle =
        Math.sin(nx * 6.4 + time * 1.2 + seed) * 1.2 +
        Math.cos(ny * 5.1 - time * 0.78) * 1.15 +
        Math.sin((nx - ny) * 2.8 + time * 0.33) * 0.5;
      let vx = Math.cos(angle) * (0.42 + seed * 0.68);
      let vy = Math.sin(angle) * (0.42 + seed * 0.68);

      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const radius = Math.min(width, height) * 0.23;
      const distanceSquared = dx * dx + dy * dy;
      if (pointer.active > 0.01 && distanceSquared < radius * radius) {
        const distance = Math.max(1, Math.sqrt(distanceSquared));
        const force = (1 - distance / radius) * pointer.active;
        vx += (dx / distance) * force * 2.3;
        vy += (dy / distance) * force * 2.3;
      }

      const textBoundary = width < 760 ? width * 0.14 : width * 0.53;
      if (x < textBoundary) {
        const proximity = 1 - Math.max(0, x) / textBoundary;
        vx += proximity * 0.42;
        vy += Math.sin(y * 0.02 + seed * 3) * proximity * 0.12;
      }

      if (!reducedMotion.matches) {
        x += vx * step;
        y += vy * step;
      }
      points[offset] = x;
      points[offset + 1] = y;
      points[offset + 2] = previousX;
      points[offset + 3] = previousY;

      context.globalAlpha = 0.13 + seed * 0.38;
      context.strokeStyle = colors[points[offset + 5]];
      context.lineWidth = 0.42 + seed * 0.92;
      context.beginPath();
      context.moveTo(previousX, previousY);
      context.lineTo(x, y);
      context.stroke();

      if (x < -30 || x > width + 30 || y < -30 || y > height + 30) reset(index, true);
    }
    context.globalAlpha = 1;

    if (running && !document.hidden && !reducedMotion.matches && !still) frame = requestAnimationFrame(render);
  }

  function sync() {
    cancelAnimationFrame(frame);
    if (running && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(render);
    else render(performance.now(), true);
  }

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(entries => {
    running = entries[0]?.isIntersecting ?? true;
    sync();
  });
  resizeObserver.observe(hero);
  intersectionObserver.observe(hero);
  hero.addEventListener('pointermove', updatePointer, { passive: true });
  hero.addEventListener('pointerleave', leavePointer, { passive: true });
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  resize();
  sync();
}

setupCopyButtons();
setupLiveFrames();
setupHeroField();
