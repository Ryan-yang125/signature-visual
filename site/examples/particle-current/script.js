const canvas = document.querySelector('#field');
const scene = document.querySelector('.scene');
const coordinate = document.querySelector('#coordinate');
const context = canvas.getContext('2d', { alpha: true });
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const colors = ['#5b78ff', '#74dad3', '#ff7869'];

let width = 1;
let height = 1;
let dpr = 1;
let frame = 0;
let visible = true;
let pageVisible = true;
let points = new Float32Array();
let count = 0;
let lastTime = performance.now();
const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: 0, target: 0 };

function hash(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function reset(index, edge = false) {
  const offset = index * 6;
  points[offset] = edge ? width * (0.55 + hash(index, 4) * 0.55) : hash(index, 1) * width;
  points[offset + 1] = hash(index, 2) * height;
  points[offset + 2] = points[offset];
  points[offset + 3] = points[offset + 1];
  points[offset + 4] = hash(index, 3);
  points[offset + 5] = Math.floor(hash(index, 5) * colors.length);
}

function resize() {
  const rect = scene.getBoundingClientRect();
  width = Math.max(1, rect.width);
  height = Math.max(1, rect.height);
  dpr = Math.min(devicePixelRatio || 1, 1.7);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  count = Math.max(150, Math.min(720, Math.round(width * height * 0.00058)));
  points = new Float32Array(count * 6);
  for (let index = 0; index < count; index += 1) reset(index);
  draw(performance.now(), true);
}

function pointerMove(event) {
  const rect = scene.getBoundingClientRect();
  pointer.tx = event.clientX - rect.left;
  pointer.ty = event.clientY - rect.top;
  pointer.target = 1;
  coordinate.textContent = `${(pointer.tx / width).toFixed(3)} : ${(pointer.ty / height).toFixed(3)}`;
}

function draw(now, still = false) {
  const step = Math.min(32, now - lastTime) / 16.667;
  lastTime = now;
  const time = reducedMotion.matches ? 1.7 : now * 0.0002;
  pointer.x += (pointer.tx - pointer.x) * 0.08;
  pointer.y += (pointer.ty - pointer.y) * 0.08;
  pointer.active += (pointer.target - pointer.active) * 0.075;

  context.globalCompositeOperation = 'destination-out';
  context.fillStyle = reducedMotion.matches ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0.12)';
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
      Math.sin(nx * 7.1 + time * 1.1 + seed * 2) * 1.24 +
      Math.cos(ny * 5.4 - time * 0.76) * 1.12 +
      Math.sin((nx + ny) * 3.3 + time * 0.31) * 0.38;
    let vx = Math.cos(angle) * (0.55 + seed * 0.75);
    let vy = Math.sin(angle) * (0.55 + seed * 0.75);

    const dx = x - pointer.x;
    const dy = y - pointer.y;
    const radius = Math.min(width, height) * 0.24;
    const distanceSquared = dx * dx + dy * dy;
    if (pointer.active > 0.01 && distanceSquared < radius * radius) {
      const distance = Math.max(1, Math.sqrt(distanceSquared));
      const force = (1 - distance / radius) * pointer.active;
      vx += (dx / distance) * force * 2.7;
      vy += (dy / distance) * force * 2.7;
    }

    const safeBoundary = width < 620 ? width * 0.15 : width * 0.6;
    if (x < safeBoundary) vx += (1 - Math.max(0, x) / safeBoundary) * 0.56;

    if (!reducedMotion.matches) {
      x += vx * step;
      y += vy * step;
    }
    points[offset] = x;
    points[offset + 1] = y;
    points[offset + 2] = previousX;
    points[offset + 3] = previousY;

    context.globalAlpha = 0.15 + seed * 0.5;
    context.strokeStyle = colors[points[offset + 5]];
    context.lineWidth = 0.4 + seed * 1.1;
    context.beginPath();
    context.moveTo(previousX, previousY);
    context.lineTo(x, y);
    context.stroke();

    if (x < -28 || x > width + 28 || y < -28 || y > height + 28) reset(index, true);
  }

  context.globalAlpha = 1;
  if (visible && pageVisible && !document.hidden && !reducedMotion.matches && !still) frame = requestAnimationFrame(draw);
}

function sync() {
  cancelAnimationFrame(frame);
  if (visible && pageVisible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(draw);
  else draw(performance.now(), true);
}

new ResizeObserver(resize).observe(scene);
scene.addEventListener('pointermove', pointerMove, { passive: true });
scene.addEventListener('pointerleave', () => { pointer.target = 0; }, { passive: true });
document.addEventListener('visibilitychange', sync);
reducedMotion.addEventListener('change', sync);
window.addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  if (event.data?.type === 'signature-visual-visibility') {
    pageVisible = Boolean(event.data.visible);
    sync();
  }
});
new IntersectionObserver(entries => {
  visible = entries[0]?.isIntersecting ?? true;
  sync();
}).observe(scene);
resize();
sync();
