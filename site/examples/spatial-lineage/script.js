const diagram = document.querySelector('#diagram');
const scene = document.querySelector('.scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const signals = [...diagram.querySelectorAll('[data-signal]')].map((circle, index) => ({
  circle,
  path: diagram.querySelector(`#${circle.dataset.signal}`),
  phase: index * 0.17,
  speed: 0.055 + index * 0.008
}));
const nodes = [...diagram.querySelectorAll('[data-node]')];

let frame = 0;
let visible = true;
let pageVisible = true;

function render(now = 0, still = false) {
  const time = reducedMotion.matches ? 6.4 : now * 0.001;
  for (const signal of signals) {
    const length = signal.path.getTotalLength();
    const progress = (signal.phase + time * signal.speed) % 1;
    const point = signal.path.getPointAtLength(progress * length);
    signal.circle.setAttribute('cx', point.x);
    signal.circle.setAttribute('cy', point.y);
  }
  if (visible && pageVisible && !document.hidden && !reducedMotion.matches && !still) frame = requestAnimationFrame(render);
}

function sync() {
  cancelAnimationFrame(frame);
  if (visible && pageVisible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(render);
  else render(6400, true);
}

function focusNode(target) {
  for (const node of nodes) node.classList.toggle('is-active', node === target);
}

function pointerMove(event) {
  const point = diagram.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const local = point.matrixTransform(diagram.getScreenCTM().inverse());
  let closest = null;
  let distance = Infinity;

  for (const node of nodes) {
    const matrix = node.transform.baseVal.consolidate()?.matrix;
    if (!matrix) continue;
    const dx = matrix.e - local.x;
    const dy = matrix.f - local.y;
    const candidate = dx * dx + dy * dy;
    if (candidate < distance) {
      closest = node;
      distance = candidate;
    }
  }
  focusNode(distance < 16000 ? closest : null);
}

scene.addEventListener('pointermove', pointerMove, { passive: true });
scene.addEventListener('pointerleave', () => focusNode(null), { passive: true });
for (const node of nodes) {
  node.addEventListener('focus', () => focusNode(node));
  node.addEventListener('blur', () => focusNode(null));
}
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

sync();
