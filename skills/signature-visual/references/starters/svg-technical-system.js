const SVG_NS = 'http://www.w3.org/2000/svg';

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

/** Lifecycle-aware SVG technical system. */
export function createTechnicalSystem(target, options = {}) {
  if (!(target instanceof HTMLElement)) {
    throw new TypeError('createTechnicalSystem requires an HTMLElement target');
  }

  const config = {
    accent: options.accent ?? '#5b78ff',
    secondary: options.secondary ?? '#ff7768',
    ink: options.ink ?? '#dce4ff',
    calm: options.calm ?? 0.62,
    response: options.response ?? 0.7,
    decorative: options.decorative ?? true,
    title: options.title ?? 'Spatial signal system',
    description: options.description ?? 'A diagram of connected nodes carrying animated signals.'
  };

  const svg = svgElement('svg', {
    viewBox: '0 0 800 500',
    preserveAspectRatio: 'xMidYMid meet'
  });
  Object.assign(svg.style, {
    width: '100%',
    height: '100%',
    display: 'block',
    overflow: 'visible'
  });

  if (config.decorative) {
    svg.setAttribute('aria-hidden', 'true');
    svg.style.pointerEvents = 'none';
  } else {
    svg.setAttribute('role', 'img');
    const title = svgElement('title');
    title.textContent = config.title;
    const description = svgElement('desc');
    description.textContent = config.description;
    svg.append(title, description);
  }

  const definitions = svgElement('defs');
  const glow = svgElement('filter', { id: 'sv-glow', x: '-100%', y: '-100%', width: '300%', height: '300%' });
  glow.append(svgElement('feGaussianBlur', { stdDeviation: '4', result: 'blur' }));
  const merge = svgElement('feMerge');
  merge.append(svgElement('feMergeNode', { in: 'blur' }), svgElement('feMergeNode', { in: 'SourceGraphic' }));
  glow.append(merge);
  definitions.append(glow);
  svg.append(definitions);

  const scaffold = svgElement('g', { opacity: '0.18', stroke: config.ink, fill: 'none' });
  for (let x = 80; x <= 720; x += 80) scaffold.append(svgElement('path', { d: `M ${x} 44 V 456`, 'stroke-width': '0.7' }));
  for (let y = 90; y <= 410; y += 80) scaffold.append(svgElement('path', { d: `M 44 ${y} H 756`, 'stroke-width': '0.7' }));
  scaffold.append(svgElement('circle', { cx: '400', cy: '250', r: '178', 'stroke-dasharray': '2 8' }));
  scaffold.append(svgElement('circle', { cx: '400', cy: '250', r: '116', 'stroke-dasharray': '1 11' }));
  svg.append(scaffold);

  const nodes = options.nodes ?? [
    { id: 'origin', x: 142, y: 250, label: 'ORIGIN', kind: 'source' },
    { id: 'sense', x: 300, y: 132, label: 'SENSE', kind: 'relay' },
    { id: 'reason', x: 438, y: 222, label: 'REASON', kind: 'core' },
    { id: 'memory', x: 338, y: 366, label: 'MEMORY', kind: 'relay' },
    { id: 'act', x: 650, y: 306, label: 'ACT', kind: 'sink' }
  ];
  const links = options.links ?? [
    ['origin', 'sense'],
    ['origin', 'memory'],
    ['sense', 'reason'],
    ['memory', 'reason'],
    ['reason', 'act'],
    ['sense', 'act']
  ];
  const nodeById = new Map(nodes.map(node => [node.id, node]));

  const connections = svgElement('g', { fill: 'none', stroke: config.accent, 'stroke-width': '1.35' });
  const paths = [];
  for (const [fromId, toId] of links) {
    const from = nodeById.get(fromId);
    const to = nodeById.get(toId);
    if (!from || !to) continue;
    const bend = Math.max(26, Math.abs(to.x - from.x) * 0.38);
    const path = svgElement('path', {
      d: `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`,
      opacity: '0.5',
      'vector-effect': 'non-scaling-stroke'
    });
    connections.append(path);
    paths.push(path);
  }
  svg.append(connections);

  const nodeLayer = svgElement('g');
  const nodeElements = [];
  for (const node of nodes) {
    const group = svgElement('g', { transform: `translate(${node.x} ${node.y})`, 'data-node': node.id });
    const radius = node.kind === 'core' ? 18 : node.kind === 'relay' ? 11 : 8;
    group.append(svgElement('circle', {
      r: radius + 7,
      fill: 'none',
      stroke: node.kind === 'core' ? config.secondary : config.accent,
      opacity: '0.18',
      'stroke-dasharray': node.kind === 'core' ? '3 5' : '1 6'
    }));
    group.append(svgElement('circle', {
      r: radius,
      fill: node.kind === 'core' ? config.secondary : config.accent,
      opacity: node.kind === 'core' ? '0.85' : '0.72',
      filter: 'url(#sv-glow)'
    }));
    group.append(svgElement('circle', { r: Math.max(2.4, radius * 0.24), fill: '#ffffff', opacity: '0.88' }));
    const label = svgElement('text', {
      x: radius + 14,
      y: '4',
      fill: config.ink,
      opacity: '0.82',
      'font-size': '11',
      'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace',
      'letter-spacing': '1.4'
    });
    label.textContent = node.label;
    group.append(label);
    nodeLayer.append(group);
    nodeElements.push({ node, group });
  }
  svg.append(nodeLayer);

  const signalLayer = svgElement('g', { fill: config.secondary, filter: 'url(#sv-glow)' });
  const signals = paths.slice(0, 5).map((path, index) => {
    const circle = svgElement('circle', { r: index === 0 ? '3.8' : '2.7', opacity: '0.9' });
    signalLayer.append(circle);
    return { path, circle, phase: index / Math.max(1, paths.length), speed: 0.045 + index * 0.007 };
  });
  svg.append(signalLayer);
  target.append(svg);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 400, y: 250, active: 0, targetActive: 0 };
  let frame = 0;
  let visible = true;
  let destroyed = false;

  function updatePointer(event) {
    if (config.decorative) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(svg.getScreenCTM().inverse());
    pointer.x = local.x;
    pointer.y = local.y;
    pointer.targetActive = 1;
  }

  function leavePointer() {
    pointer.targetActive = 0;
  }

  function update(now = 0, singleFrame = false) {
    if (destroyed) return;
    const seconds = reducedMotion.matches ? 6.4 : now * 0.001 * (1.15 - config.calm * 0.5);
    pointer.active += (pointer.targetActive - pointer.active) * 0.08;

    for (const signal of signals) {
      const length = signal.path.getTotalLength();
      const progress = (signal.phase + seconds * signal.speed) % 1;
      const position = signal.path.getPointAtLength(progress * length);
      signal.circle.setAttribute('cx', position.x);
      signal.circle.setAttribute('cy', position.y);
    }

    if (!config.decorative) {
      let closest = null;
      let closestDistance = Infinity;
      for (const entry of nodeElements) {
        const dx = entry.node.x - pointer.x;
        const dy = entry.node.y - pointer.y;
        const distance = dx * dx + dy * dy;
        if (distance < closestDistance) {
          closest = entry;
          closestDistance = distance;
        }
      }
      for (const entry of nodeElements) {
        const active = entry === closest && closestDistance < 12000 && pointer.active > 0.05;
        entry.group.style.opacity = active ? '1' : '0.72';
        entry.group.style.transform = active ? 'scale(1.08)' : 'scale(1)';
        entry.group.style.transformBox = 'fill-box';
        entry.group.style.transformOrigin = 'center';
      }
    }

    if (visible && !document.hidden && !reducedMotion.matches && !singleFrame) {
      frame = requestAnimationFrame(update);
    }
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    if (visible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(update);
    else update(6400, true);
  }

  const resizeObserver = new ResizeObserver(entries => {
    const compact = (entries[0]?.contentRect.width ?? 800) < 520;
    svg.dataset.compact = String(compact);
    for (const { group } of nodeElements) {
      const label = group.querySelector('text');
      if (label) label.style.display = compact ? 'none' : '';
    }
  });
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
  syncAnimation();

  return function disposeTechnicalSystem() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    target.removeEventListener('pointermove', updatePointer);
    target.removeEventListener('pointerleave', leavePointer);
    document.removeEventListener('visibilitychange', syncAnimation);
    reducedMotion.removeEventListener('change', syncAnimation);
    svg.remove();
  };
}
