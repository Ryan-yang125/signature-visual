import { createRuntimeState } from '../runtime-state.js';

const canvas = document.querySelector('#field');
const loom = document.querySelector('.loom');
const phaseLabel = document.querySelector('#phase');
const scoreProgress = document.querySelector('#score-progress');
const context = canvas.getContext('2d', { alpha: true });
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const runtime = createRuntimeState({ reducedMotion });

const CYCLE = 16000;
const THREADS = 64;
const COLORS = ['#a54335', '#334b68', '#6d7450'];
const phaseNames = ['Slack', 'Gather', 'Cross', 'Knot', 'Release'];
const pointer = { x: 0.7, y: 0.5, tx: 0.7, ty: 0.5, active: 0, target: 0 };

let width = 1;
let height = 1;
let dpr = 1;
let frame = 0;
let start = performance.now();

function hash(index, salt = 0) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function phaseFor(progress) {
  if (progress < 0.16) return 0;
  if (progress < 0.36) return 1;
  if (progress < 0.58) return 2;
  if (progress < 0.78) return 3;
  return 4;
}

function pointOnThread(index, progress, time, weave) {
  const seed = hash(index, 1);
  const band = index % 3;
  const row = (index + 0.5) / THREADS;
  const knot = Math.exp(-Math.pow(progress - 0.59, 2) / 0.026);
  const sway = Math.sin(progress * Math.PI * (2.1 + band * 0.35) + seed * 8.0 + time * 0.00028);
  const overUnder = Math.sin(progress * Math.PI * 18 + index * 1.71 + time * 0.00064);
  let x = width * (0.1 + progress * 0.84);
  let y = height * (0.2 + row * 0.61);
  y += sway * height * (0.018 + seed * 0.012);
  y += overUnder * height * 0.0045 * weave;
  y += (0.5 - (0.2 + row * 0.61)) * height * knot * (0.44 + weave * 0.24);
  x += Math.sin(row * 16 + time * 0.00022) * width * 0.006 * knot;

  const dx = x / width - pointer.x;
  const dy = y / height - pointer.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const influence = Math.max(0, 1 - distance / 0.19) * pointer.active;
  if (influence > 0) {
    const safe = Math.max(distance, 0.001);
    x += (dx / safe) * influence * width * 0.027;
    y += (dy / safe) * influence * height * 0.046;
  }
  return { x, y };
}

function drawPin(x, y, color, alpha = 1) {
  context.save();
  context.translate(x, y);
  context.strokeStyle = color;
  context.fillStyle = '#e7ddcb';
  context.globalAlpha = alpha;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(0, 0, 4.2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.beginPath();
  context.arc(0, 0, 1.1, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
  context.restore();
}

function draw(timeMs = 0) {
  const progress = ((timeMs % CYCLE) + CYCLE) % CYCLE / CYCLE;
  const currentPhase = phaseFor(progress);
  const gather = smoothstep(0.1, 0.34, progress);
  const release = smoothstep(0.78, 0.98, progress);
  const weave = gather * (1 - release * 0.72);
  pointer.x += (pointer.tx - pointer.x) * 0.11;
  pointer.y += (pointer.ty - pointer.y) * 0.11;
  pointer.active += (pointer.target - pointer.active) * 0.09;

  context.clearRect(0, 0, width, height);
  context.save();
  context.globalCompositeOperation = 'multiply';
  context.lineCap = 'round';

  const frameTop = height * 0.16;
  const frameBottom = height * 0.84;
  const frameLeft = width * 0.095;
  const frameRight = width * 0.945;
  context.strokeStyle = 'rgba(47, 51, 47, 0.16)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(frameLeft, frameTop);
  context.lineTo(frameLeft, frameBottom);
  context.moveTo(frameRight, frameTop);
  context.lineTo(frameRight, frameBottom);
  context.stroke();

  for (let index = 0; index < THREADS; index += 1) {
    const seed = hash(index, 2);
    const color = COLORS[index % COLORS.length];
    context.beginPath();
    const steps = 58;
    for (let step = 0; step <= steps; step += 1) {
      const u = step / steps;
      const point = pointOnThread(index, u, timeMs, weave);
      if (step === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.strokeStyle = color;
    context.globalAlpha = 0.14 + seed * 0.36;
    context.lineWidth = 0.45 + seed * 0.92;
    context.stroke();

    const tracer = (progress * (0.7 + seed * 0.34) + seed * 0.83) % 1;
    const tracerPoint = pointOnThread(index, tracer, timeMs, weave);
    context.fillStyle = color;
    context.globalAlpha = 0.22 + weave * 0.48;
    context.beginPath();
    context.arc(tracerPoint.x, tracerPoint.y, 0.75 + seed * 1.45, 0, Math.PI * 2);
    context.fill();
  }

  const columns = width < 720 ? 9 : 18;
  context.globalAlpha = 0.12 + weave * 0.11;
  context.strokeStyle = '#2f332f';
  context.lineWidth = 0.6;
  for (let column = 0; column < columns; column += 1) {
    const x = frameLeft + (column / Math.max(1, columns - 1)) * (frameRight - frameLeft);
    context.beginPath();
    context.moveTo(x, frameTop);
    context.bezierCurveTo(x + Math.sin(column) * 8, height * 0.37, x - Math.cos(column) * 9, height * 0.63, x, frameBottom);
    context.stroke();
  }

  const knotAlpha = Math.max(0, 1 - Math.abs(progress - 0.68) * 4.3);
  drawPin(width * 0.59, height * 0.5, COLORS[0], 0.35 + knotAlpha * 0.65);
  drawPin(frameLeft, height * 0.31, COLORS[1], 0.55);
  drawPin(frameRight, height * 0.68, COLORS[2], 0.55);
  context.restore();

  loom.dataset.phase = phaseNames[currentPhase].toLowerCase();
  phaseLabel.textContent = phaseNames[currentPhase];
  scoreProgress.style.width = `${progress * 100}%`;
}

function resize() {
  const rect = loom.getBoundingClientRect();
  const explicitlyZero = loom.style.width === '0px' || loom.style.height === '0px';
  const zeroSize = explicitlyZero || rect.width < 1 || rect.height < 1;
  runtime.setPauseReason('zero-size', zeroSize);
  if (zeroSize || runtime.state.disposed) {
    sync();
    return;
  }
  width = rect.width;
  height = rect.height;
  dpr = Math.min(devicePixelRatio || 1, 1.75);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw(reducedMotion.matches ? CYCLE * 0.68 : performance.now() - start);
}

function refreshSizePause() {
  const rect = loom.getBoundingClientRect();
  const zeroSize = loom.style.width === '0px' || loom.style.height === '0px' || rect.width < 1 || rect.height < 1;
  runtime.setPauseReason('zero-size', zeroSize);
  if (zeroSize) {
    cancelAnimationFrame(frame);
    frame = 0;
    runtime.setRafScheduled(false);
  } else if (!runtime.state.disposed && !runtime.state.paused && !runtime.state.resources.raf) {
    frame = requestAnimationFrame(animate);
    runtime.setRafScheduled(true);
  }
}

function pointerMove(event) {
  const rect = loom.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  pointer.tx = (event.clientX - rect.left) / rect.width;
  pointer.ty = (event.clientY - rect.top) / rect.height;
  pointer.target = 1;
  runtime.setPointer({ x: pointer.tx, y: pointer.ty, active: true, event: event.type });
}

function animate(now) {
  draw(now - start);
  if (!runtime.state.paused && !runtime.state.disposed) {
    frame = requestAnimationFrame(animate);
    runtime.setRafScheduled(true);
  }
}

function sync() {
  cancelAnimationFrame(frame);
  frame = 0;
  runtime.setRafScheduled(false);
  runtime.setPauseReason('document-hidden', document.hidden);
  runtime.setReducedMotion(reducedMotion.matches);
  if (!runtime.state.paused && !runtime.state.disposed) {
    draw(performance.now() - start);
    frame = requestAnimationFrame(animate);
    runtime.setRafScheduled(true);
  } else if (!runtime.state.disposed && !runtime.describe().pauseReasons.includes('zero-size')) {
    draw(CYCLE * 0.68);
  }
}

function clearPointer(event = 'pointerleave') {
  pointer.target = 0;
  pointer.active = 0;
  runtime.clearPointer(event);
}

const qaState = { seed: 125, timeMs: 0, progress: 0 };

function seekQa(next = {}) {
  if (Number.isFinite(next.progress)) {
    qaState.progress = Math.max(0, Math.min(1, Number(next.progress)));
    qaState.timeMs = qaState.progress * CYCLE;
  } else {
    qaState.timeMs = Number.isFinite(next.timeMs) ? Number(next.timeMs) : Number(next.time ?? 0) * 1000;
    qaState.progress = ((qaState.timeMs % CYCLE) + CYCLE) % CYCLE / CYCLE;
  }
  draw(qaState.timeMs);
}

const qa = {
  ready: true,
  setSeed(value) {
    qaState.seed = value;
    draw(qaState.timeMs);
  },
  seek: seekQa,
  setProgress(value) {
    seekQa({ progress: value });
  },
  renderAt(timeMs) {
    seekQa({ timeMs });
  },
  setPointer(next) {
    pointer.tx = next.x;
    pointer.ty = next.y;
    pointer.x = next.x;
    pointer.y = next.y;
    pointer.target = next.active === false ? 0 : 1;
    pointer.active = pointer.target;
    runtime.setPointer({ x: next.x, y: next.y, active: pointer.target > 0, event: 'hook' });
  },
  render() {
    draw(qaState.timeMs);
  },
  describe() {
    refreshSizePause();
    return runtime.describe({
      phase: phaseLabel.textContent,
      seed: qaState.seed,
      time: qaState.timeMs / 1000,
      progress: qaState.progress,
      renderer: 'canvas-2d'
    });
  },
  flush() {
    seekQa({ timeMs: reducedMotion.matches ? CYCLE * 0.68 : performance.now() - start });
  },
  dispose,
  remount() {
    if (!runtime.state.disposed) dispose();
    start = performance.now();
    mount();
    return qa.describe();
  }
};

window.__signatureVisual = qa;
window.__signatureVisualQA = qa;

function dispose() {
  if (!runtime.disposeManaged()) return qa.describe();
  cancelAnimationFrame(frame);
  frame = 0;
  clearPointer('dispose');
  return qa.describe();
}

function mount() {
  runtime.beginMount();
  runtime.setFallback(false);
  runtime.setPauseReason('window-blur', false);
  runtime.setPauseReason('host-hidden', false);
  runtime.addObserver(new ResizeObserver(resize), loom);
  runtime.addObserver(new IntersectionObserver(entries => {
    runtime.setPauseReason('outside-viewport', !(entries[0]?.isIntersecting ?? true));
    sync();
  }), loom);
  runtime.addListener(loom, 'pointermove', pointerMove, { passive: true });
  for (const type of ['pointerleave', 'pointercancel', 'lostpointercapture']) {
    runtime.addListener(loom, type, () => clearPointer(type), { passive: true });
  }
  runtime.addListener(document, 'visibilitychange', sync);
  runtime.addListener(reducedMotion, 'change', sync);
  runtime.addListener(window, 'blur', () => {
    clearPointer('window-blur');
    runtime.setPauseReason('window-blur', true);
    sync();
  });
  runtime.addListener(window, 'focus', () => {
    runtime.setPauseReason('window-blur', false);
    sync();
  });
  runtime.addListener(window, 'message', event => {
    if (event.origin !== location.origin || event.data?.type !== 'signature-visual-visibility') return;
    runtime.setPauseReason('host-hidden', !event.data.visible);
    sync();
  });
  runtime.addListener(window, 'pagehide', dispose, { once: true });
  resize();
  runtime.finishMount();
  sync();
}

mount();
