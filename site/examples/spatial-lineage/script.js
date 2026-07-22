const diagram = document.querySelector('#diagram');
const room = document.querySelector('.decision-room');
const phaseLabel = document.querySelector('#phase');
const detailLabel = document.querySelector('#detail');
const confidenceLabel = document.querySelector('#confidence');
const confidenceBar = document.querySelector('#confidence-bar');
const scoreItems = [...document.querySelectorAll('[data-score]')];
const routes = [...diagram.querySelectorAll('[data-route]')];
const nodes = [...diagram.querySelectorAll('[data-node]')];
const signals = [document.querySelector('#signal-a'), document.querySelector('#signal-b')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const CYCLE = 15000;
const phaseNames = ['intake', 'frame', 'branch', 'review', 'commit', 'archive'];
const phaseStarts = [0, 0.17, 0.34, 0.53, 0.72, 0.89, 1];
const activeNodes = [
  ['request', 'evidence', 'context'],
  ['frame'],
  ['hold', 'release'],
  ['review'],
  ['decision'],
  ['archive']
];
const defaultDetails = [
  'A policy request enters the trace with its target and threshold attached.',
  'Evidence and context meet in a shared frame before alternatives are generated.',
  'Two alternatives carry the same evidence toward different outcomes.',
  'Two reviewers challenge the branch and confirm the confidence record.',
  'The release branch commits at 0.87 confidence and retains its full path.',
  'The complete decision trace is sealed into the lineage archive.'
];

let frame = 0;
let visible = true;
let pageVisible = true;
let start = performance.now();
let focusedNode = null;

function phaseFor(progress) {
  for (let index = 0; index < phaseNames.length; index += 1) {
    if (progress < phaseStarts[index + 1]) return index;
  }
  return phaseNames.length - 1;
}

function confidenceFor(progress) {
  if (progress < 0.17) return 0.24 + progress * 0.7;
  if (progress < 0.34) return 0.38 + (progress - 0.17) * 0.85;
  if (progress < 0.53) return 0.49 + (progress - 0.34) * 0.62;
  if (progress < 0.72) return 0.59 + (progress - 0.53) * 0.92;
  return Math.min(0.87, 0.76 + (progress - 0.72) * 0.55);
}

function routePairFor(phase) {
  const active = routes.filter(route => Number(route.dataset.phase) === phase);
  return [active[0] ?? null, active[1] ?? null];
}

function placeSignal(signal, path, progress) {
  if (!path) {
    signal.style.opacity = '0';
    return;
  }
  const length = path.getTotalLength();
  const point = path.getPointAtLength(Math.max(0, Math.min(1, progress)) * length);
  signal.setAttribute('cx', point.x);
  signal.setAttribute('cy', point.y);
  signal.style.opacity = '1';
}

function renderAt(timeMs = 0) {
  const progress = ((timeMs % CYCLE) + CYCLE) % CYCLE / CYCLE;
  const phase = phaseFor(progress);
  const startProgress = phaseStarts[phase];
  const endProgress = phaseStarts[phase + 1];
  const localProgress = (progress - startProgress) / (endProgress - startProgress);
  const pair = routePairFor(phase);
  placeSignal(signals[0], pair[0], localProgress);
  placeSignal(signals[1], pair[1], Math.max(0, localProgress - 0.08));

  for (const route of routes) route.classList.toggle('is-active', Number(route.dataset.phase) === phase);
  for (const node of nodes) {
    const active = focusedNode ? node === focusedNode : activeNodes[phase].includes(node.dataset.node);
    node.classList.toggle('is-active', active);
  }

  const confidence = confidenceFor(progress);
  room.dataset.phase = phaseNames[phase];
  phaseLabel.textContent = phaseNames[phase];
  if (!focusedNode) detailLabel.textContent = defaultDetails[phase];
  confidenceLabel.textContent = confidence.toFixed(2);
  confidenceBar.style.width = `${confidence * 100}%`;
  for (const item of scoreItems) item.classList.toggle('is-active', item.dataset.score === phaseNames[phase]);
}

function focusNode(node) {
  focusedNode = node;
  if (node) detailLabel.textContent = node.dataset.detail;
  renderAt(reducedMotion.matches ? CYCLE * 0.84 : performance.now() - start);
}

function animate(now) {
  renderAt(now - start);
  if (visible && pageVisible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(animate);
}

function sync() {
  cancelAnimationFrame(frame);
  if (visible && pageVisible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(animate);
  else renderAt(CYCLE * 0.84);
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
  renderAt(qaState.timeMs);
}

const qa = {
  ready: true,
  setSeed(value) {
    qaState.seed = value;
    renderAt(qaState.timeMs);
  },
  seek: seekQa,
  setProgress(value) {
    seekQa({ progress: value });
  },
  renderAt(timeMs) {
    seekQa({ timeMs });
  },
  setPointer(next) {
    if (next.active === false) {
      focusNode(null);
      return;
    }
    const x = Math.max(0, Math.min(1, Number(next.x ?? 0.5))) * 680;
    const y = Math.max(0, Math.min(1, Number(next.y ?? 0.5))) * 820;
    let closest = null;
    let closestDistance = Infinity;
    for (const node of nodes) {
      const matrix = node.transform.baseVal.consolidate()?.matrix;
      if (!matrix) continue;
      const distance = (matrix.e - x) ** 2 + (matrix.f - y) ** 2;
      if (distance < closestDistance) {
        closest = node;
        closestDistance = distance;
      }
    }
    focusNode(closestDistance < 18000 ? closest : null);
  },
  render() {
    renderAt(qaState.timeMs);
  },
  describe() {
    return { phase: phaseLabel.textContent, seed: qaState.seed, time: qaState.timeMs / 1000, progress: qaState.progress };
  },
  flush() {
    seekQa({ timeMs: reducedMotion.matches ? CYCLE * 0.84 : performance.now() - start });
  }
};

window.__signatureVisual = qa;
window.__signatureVisualQA = qa;

for (const node of nodes) {
  node.addEventListener('pointerenter', () => focusNode(node));
  node.addEventListener('pointerleave', () => focusNode(null));
  node.addEventListener('focus', () => focusNode(node));
  node.addEventListener('blur', () => focusNode(null));
  node.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      focusNode(node);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      node.blur();
    }
  });
}
new IntersectionObserver(entries => {
  visible = entries[0]?.isIntersecting ?? true;
  sync();
}).observe(room);
document.addEventListener('visibilitychange', sync);
reducedMotion.addEventListener('change', sync);
window.addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  if (event.data?.type === 'signature-visual-visibility') {
    pageVisible = Boolean(event.data.visible);
    sync();
  }
});

sync();
