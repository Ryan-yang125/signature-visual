const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const directionData = {
  tidal: {
    index: 'Search winner',
    name: 'Tidal Ledger',
    material: 'ink currents / coordinated drift',
    challenge: 'Challenge / remove color',
    verdict: 'The protected corridor and current topology still carry the idea.'
  },
  glass: {
    index: 'External direction',
    name: 'Glasshouse Core',
    material: 'soft tissue / refracted light',
    challenge: 'Challenge / product specificity',
    verdict: 'The membrane is compelling. Its relationship to custody needs one sharper rule.'
  },
  relay: {
    index: 'Counterfactual',
    name: 'Relay Almanac',
    material: 'route marks / measured arrivals',
    challenge: 'Challenge / freeze motion',
    verdict: 'The route remains legible. Its resting silhouette needs more tension at hero scale.'
  },
  quiet: {
    index: 'Far field',
    name: 'Quiet Escrow',
    material: 'open field / held aperture',
    challenge: 'Challenge / peak consequence',
    verdict: 'The composition is ownable. The decisive event needs a more durable afterimage.'
  }
};

const temporalData = {
  accumulation: {
    name: 'Accumulation',
    states: ['Seed', 'Gather', 'Layer', 'Saturate', 'Residue']
  },
  bifurcation: {
    name: 'Bifurcation',
    states: ['Stable', 'Pressure', 'Split', 'Consequence', 'Reconcile']
  },
  inspection: {
    name: 'Inspection',
    states: ['Rest', 'Acquire', 'Isolate', 'Verify', 'Release']
  }
};

const entropyData = {
  near: {
    name: 'Near',
    density: 0.74,
    amplitude: 0.72,
    note: 'Stay near the native artifact and vary one governing system.'
  },
  cross: {
    name: 'Cross',
    density: 1,
    amplitude: 1,
    note: 'Cross artifact stance, substance, and temporal character.'
  },
  far: {
    name: 'Far',
    density: 1.32,
    amplitude: 1.25,
    note: 'Invite remote metaphors, then demand a direct line back to the brief.'
  }
};

function setupCopyButtons() {
  for (const button of document.querySelectorAll('[data-copy]')) {
    button.addEventListener('click', async () => {
      const label = button.querySelector('.copy-label');
      if (!label) return;
      const previous = label.textContent;
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        label.textContent = 'Copied';
      } catch {
        label.textContent = 'Select';
      }
      window.setTimeout(() => {
        label.textContent = previous;
      }, 1600);
    });
  }
}

function setupLiveFrames() {
  const frames = [...document.querySelectorAll('iframe[data-src]')];

  const updateFrame = (frame, visible) => {
    if (visible && !frame.dataset.loaded) {
      frame.src = frame.dataset.src;
      frame.dataset.loaded = 'true';
    }
    if (frame.dataset.loaded) {
      frame.contentWindow?.postMessage(
        { type: 'signature-visual-visibility', visible },
        window.location.origin
      );
    }
  };

  if (!('IntersectionObserver' in window)) {
    frames.forEach(frame => updateFrame(frame, true));
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) updateFrame(entry.target, entry.isIntersecting);
    },
    { rootMargin: '280px 0px', threshold: 0.01 }
  );
  frames.forEach(frame => observer.observe(frame));
}

function setupArrowNavigation(selector) {
  for (const group of document.querySelectorAll(selector)) {
    const buttons = [...group.querySelectorAll('button')];
    group.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      const current = buttons.indexOf(document.activeElement);
      if (current < 0) return;
      event.preventDefault();
      let next = current;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + buttons.length) % buttons.length;
      else next = (current + 1) % buttons.length;
      buttons[next].focus();
      buttons[next].click();
    });
  }
}

function hash(value, salt = 0) {
  const number = Math.sin(value * 127.1 + salt * 311.7) * 43758.5453;
  return number - Math.floor(number);
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(edge0, edge1, value) {
  const amount = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
}

function temporalMetrics(progress, temporal) {
  if (temporal === 'bifurcation') {
    const pressure = smoothstep(0.08, 0.48, progress);
    const split = smoothstep(0.4, 0.68, progress);
    const reconcile = smoothstep(0.82, 1, progress);
    return {
      energy: clamp(pressure * (1 - reconcile * 0.45)),
      split: split * (1 - reconcile * 0.34),
      residue: split * 0.7,
      focus: 0.18 + pressure * 0.52,
      scan: progress
    };
  }

  if (temporal === 'inspection') {
    const acquire = smoothstep(0.08, 0.36, progress);
    const release = smoothstep(0.78, 1, progress);
    return {
      energy: clamp(acquire * (1 - release * 0.62)),
      split: 0.08 * acquire,
      residue: acquire * 0.22,
      focus: clamp(acquire * (1 - release * 0.35)),
      scan: 0.12 + progress * 0.76
    };
  }

  const gather = smoothstep(0.04, 0.72, progress);
  const settle = smoothstep(0.78, 1, progress);
  return {
    energy: clamp(gather * (1 - settle * 0.48)),
    split: 0.08 * gather,
    residue: clamp(gather * 0.72 + settle * 0.28),
    focus: 0.2 + gather * 0.56,
    scan: progress
  };
}

function drawInspectionMark(context, width, height, metrics, dark = false) {
  const x = width * metrics.scan;
  context.save();
  context.strokeStyle = dark ? 'rgba(23,23,17,0.52)' : 'rgba(214,255,67,0.72)';
  context.fillStyle = dark ? 'rgba(23,23,17,0.7)' : '#d6ff43';
  context.lineWidth = 0.8;
  context.setLineDash([4, 7]);
  context.beginPath();
  context.moveTo(x, height * 0.08);
  context.lineTo(x, height * 0.92);
  context.stroke();
  context.setLineDash([]);
  context.beginPath();
  context.arc(x, height * (0.3 + metrics.focus * 0.22), 3 + metrics.focus * 11, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(x, height * (0.3 + metrics.focus * 0.22), 2.2, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawTidal(context, width, height, progress, pointer, temporal, entropy) {
  context.fillStyle = '#10130f';
  context.fillRect(0, 0, width, height);

  const metrics = temporalMetrics(progress, temporal);
  const entropySettings = entropyData[entropy];
  const safeLeft = width * 0.17;
  const centerX = width * 0.62;
  const centerY = height * 0.46;
  const lineCount = Math.max(22, Math.round((height / 9) * entropySettings.density));
  const stepX = Math.max(8, width / 100);

  context.save();
  context.lineCap = 'round';
  for (let line = 0; line < lineCount; line += 1) {
    const seed = hash(line, 2);
    const baseY = ((line + 0.5) / lineCount) * height;
    const tone = line % 9 === 0 ? '#d6ff43' : line % 5 === 0 ? '#f0ece2' : '#6f8560';
    context.strokeStyle = tone;
    context.globalAlpha = line % 9 === 0 ? 0.78 : 0.2 + seed * 0.24;
    context.lineWidth = line % 9 === 0 ? 1.35 : 0.4 + seed * 0.55;
    context.beginPath();

    for (let x = -stepX; x <= width + stepX; x += stepX) {
      const nx = x / width;
      const wave = Math.sin(nx * (8.2 + entropySettings.amplitude) + line * 0.31 + progress * 5.7) * height * (0.01 + metrics.energy * 0.029 * entropySettings.amplitude);
      const crossWave = Math.cos(nx * 3.1 - line * 0.19) * height * 0.008 * entropySettings.amplitude;
      const focusDistance = Math.abs(x - centerX) / (width * 0.43);
      const focus = Math.max(0, 1 - focusDistance * focusDistance);
      const polarity = baseY < centerY ? -1 : 1;
      const corridor = polarity * focus * height * (0.016 * metrics.energy + 0.054 * metrics.split);

      const dx = x - pointer.x * width;
      const dy = baseY - pointer.y * height;
      const pointerRadius = Math.min(width, height) * 0.28;
      const distance = Math.hypot(dx, dy);
      const pointerForce = Math.max(0, 1 - distance / pointerRadius) * pointer.strength;
      const pointerBend = (dy / Math.max(distance, 1)) * pointerForce * height * 0.09;
      const marginQuiet = x < safeLeft ? (1 - x / safeLeft) * wave * -0.85 : 0;
      const y = baseY + wave + crossWave + corridor + pointerBend + marginQuiet;

      if (x === -stepX) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }

  context.globalAlpha = 0.9;
  context.strokeStyle = '#d6ff43';
  context.lineWidth = 1;
  context.beginPath();
  context.arc(centerX, centerY, Math.min(width, height) * (0.024 + metrics.focus * 0.034), 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = '#d6ff43';
  context.beginPath();
  context.arc(centerX, centerY, 2.3 + metrics.energy * 1.5, 0, Math.PI * 2);
  context.fill();
  context.restore();

  if (temporal === 'inspection') drawInspectionMark(context, width, height, metrics);
}

function organicPoint(cx, cy, radius, angle, ring, progress, width, height, metrics) {
  const pulse = Math.sin(angle * 3 + ring * 0.37 + progress * 4.2) * (0.045 + metrics.energy * 0.04);
  const tissue = Math.cos(angle * 5 - ring * 0.26 + progress * 2.3) * (0.028 + metrics.split * 0.08);
  return {
    x: cx + Math.cos(angle) * radius * (1 + pulse + tissue) * (width / Math.max(width, height)),
    y: cy + Math.sin(angle) * radius * (1 + pulse - tissue) * (height / Math.max(width, height))
  };
}

function drawGlass(context, width, height, progress, pointer, temporal, entropy) {
  context.fillStyle = '#e9e4d9';
  context.fillRect(0, 0, width, height);

  const metrics = temporalMetrics(progress, temporal);
  const entropySettings = entropyData[entropy];
  const splitOffset = metrics.split * width * 0.045;
  const cx = width * (0.55 + (pointer.x - 0.5) * 0.035 * pointer.strength) - splitOffset;
  const cy = height * (0.46 + (pointer.y - 0.5) * 0.035 * pointer.strength);
  const radius = Math.min(width, height) * (0.34 + metrics.energy * 0.04);
  const glow = context.createRadialGradient(cx - radius * 0.28, cy - radius * 0.34, radius * 0.03, cx, cy, radius * 1.15);
  glow.addColorStop(0, 'rgba(255,255,255,0.98)');
  glow.addColorStop(0.2, 'rgba(244,168,183,0.78)');
  glow.addColorStop(0.55, 'rgba(118,86,232,0.55)');
  glow.addColorStop(0.82, 'rgba(46,67,174,0.18)');
  glow.addColorStop(1, 'rgba(46,67,174,0)');
  context.fillStyle = glow;
  context.fillRect(cx - radius * 1.4, cy - radius * 1.4, radius * 2.8, radius * 2.8);

  context.save();
  context.globalCompositeOperation = 'multiply';
  const ringCount = Math.max(7, Math.round(10 * entropySettings.density));
  for (let ring = ringCount - 1; ring >= 0; ring -= 1) {
    const ringRadius = radius * (0.31 + ring * (0.67 / ringCount));
    const alpha = 0.05 + (ringCount - ring) * 0.01;
    context.strokeStyle = ring % 3 === 0 ? `rgba(46,67,174,${alpha + 0.12})` : `rgba(23,23,17,${alpha})`;
    context.lineWidth = ring % 3 === 0 ? 1.2 : 0.65;
    context.beginPath();
    const points = 96;
    for (let index = 0; index <= points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const point = organicPoint(cx, cy, ringRadius, angle, ring, progress, width, height, metrics);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.closePath();
    context.stroke();
  }
  context.restore();

  const cellCount = Math.round(18 + 9 * entropySettings.density);
  for (let index = 0; index < cellCount; index += 1) {
    const angle = hash(index, 3) * Math.PI * 2 + progress * (index % 2 ? 0.8 : -0.5);
    const distance = radius * (0.18 + hash(index, 5) * 0.62);
    const cellX = cx + Math.cos(angle) * distance * (width / Math.max(width, height)) + (index % 2 ? splitOffset * 2 : 0);
    const cellY = cy + Math.sin(angle) * distance * (height / Math.max(width, height));
    const size = 1.2 + hash(index, 7) * 4.5;
    context.fillStyle = index % 4 === 0 ? 'rgba(240,75,45,0.82)' : 'rgba(23,23,17,0.42)';
    context.beginPath();
    context.arc(cellX, cellY, size, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = 'rgba(23,23,17,0.42)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(width * 0.08, height * 0.16);
  context.lineTo(width * 0.23, height * 0.16);
  context.moveTo(width * 0.08, height * 0.16);
  context.lineTo(width * 0.08, height * 0.31);
  context.moveTo(width * 0.92, height * 0.75);
  context.lineTo(width * 0.92, height * 0.88);
  context.moveTo(width * 0.79, height * 0.88);
  context.lineTo(width * 0.92, height * 0.88);
  context.stroke();

  if (temporal === 'inspection') drawInspectionMark(context, width, height, metrics, true);
}

function drawRelay(context, width, height, progress, pointer, temporal, entropy) {
  context.fillStyle = '#f04b2d';
  context.fillRect(0, 0, width, height);

  const metrics = temporalMetrics(progress, temporal);
  const entropySettings = entropyData[entropy];
  const dark = '#2b180f';
  const margin = Math.min(width, height) * 0.09;
  const grid = Math.max(18, Math.min(width, height) / 16);

  context.save();
  context.globalAlpha = 0.19;
  context.strokeStyle = dark;
  context.lineWidth = 0.75;
  for (let x = margin; x < width - margin; x += grid) {
    context.beginPath();
    context.moveTo(x, margin);
    context.lineTo(x, height - margin);
    context.stroke();
  }
  for (let y = margin; y < height - margin; y += grid) {
    context.beginPath();
    context.moveTo(margin, y);
    context.lineTo(width - margin, y);
    context.stroke();
  }
  context.restore();

  const routeStart = margin;
  const routeEnd = width - margin;
  const visibleEnd = routeStart + (routeEnd - routeStart) * (0.13 + progress * 0.87);
  const routeCount = Math.max(5, Math.round(7 * entropySettings.density));

  context.save();
  context.strokeStyle = dark;
  context.fillStyle = dark;
  context.lineCap = 'square';
  context.lineJoin = 'miter';
  for (let route = 0; route < routeCount; route += 1) {
    const y = margin + ((route + 0.8) / routeCount) * (height - margin * 2);
    const elbowA = width * (0.28 + hash(route, 2) * 0.12);
    const elbowB = width * (0.62 + hash(route, 6) * 0.13);
    const shift = (hash(route, 8) - 0.5) * height * (0.06 + metrics.split * 0.19);
    context.globalAlpha = 0.35 + hash(route, 4) * 0.5;
    context.lineWidth = route % 3 === 0 ? 2 : 0.85;
    context.beginPath();
    context.moveTo(routeStart, y);
    context.lineTo(Math.min(elbowA, visibleEnd), y);
    if (visibleEnd > elbowA) {
      context.lineTo(Math.min(elbowA + grid, visibleEnd), y + shift);
      context.lineTo(Math.min(elbowB, visibleEnd), y + shift);
    }
    if (visibleEnd > elbowB) {
      context.lineTo(Math.min(elbowB + grid, visibleEnd), y - shift * 0.45);
      context.lineTo(visibleEnd, y - shift * 0.45);
    }
    context.stroke();

    const nodeX = Math.min(visibleEnd, elbowB + grid * 1.5);
    const nodeY = visibleEnd > elbowB ? y - shift * 0.45 : y;
    context.fillRect(nodeX - 2.5, nodeY - 2.5, 5, 5);
  }
  context.restore();

  const lensX = width * (0.76 + (pointer.x - 0.5) * 0.05 * pointer.strength);
  const lensY = height * (0.31 + (pointer.y - 0.5) * 0.04 * pointer.strength);
  const lensRadius = Math.min(width, height) * (0.075 + metrics.focus * 0.025);
  context.strokeStyle = dark;
  context.lineWidth = 1.3;
  context.beginPath();
  context.arc(lensX, lensY, lensRadius, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(lensX, lensY, lensRadius * 0.56, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = '#d6ff43';
  context.beginPath();
  context.arc(lensX, lensY, 3 + metrics.energy * 2, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = dark;
  context.font = `${Math.max(7, Math.min(width, height) * 0.025)}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono')}`;
  context.textBaseline = 'top';
  context.fillText('ORIGIN / SEARCH', margin, margin * 0.48);
  context.textAlign = 'right';
  context.fillText(`${String(Math.round(progress * 100)).padStart(3, '0')} / ARRIVAL`, width - margin, margin * 0.48);
  context.textAlign = 'left';

  if (temporal === 'inspection') drawInspectionMark(context, width, height, metrics, true);
}

function drawQuiet(context, width, height, progress, pointer, temporal, entropy) {
  context.fillStyle = '#d8ded4';
  context.fillRect(0, 0, width, height);

  const metrics = temporalMetrics(progress, temporal);
  const entropySettings = entropyData[entropy];
  const ink = '#1c2a22';
  const apertureX = width * (0.58 + (pointer.x - 0.5) * 0.025 * pointer.strength);
  const apertureY = height * 0.48;
  const gap = width * (0.026 + metrics.focus * 0.06);
  const railCount = Math.max(8, Math.round(12 * entropySettings.density));

  context.save();
  for (let index = 0; index < railCount; index += 1) {
    const ratio = index / Math.max(1, railCount - 1);
    const x = width * (0.12 + ratio * 0.76);
    const side = x < apertureX ? -1 : 1;
    const displacement = side * Math.max(0, 1 - Math.abs(x - apertureX) / (width * 0.24)) * gap;
    context.globalAlpha = 0.18 + hash(index, 4) * 0.42;
    context.strokeStyle = index % 4 === 0 ? '#f04b2d' : ink;
    context.lineWidth = index % 4 === 0 ? 1.2 : 0.7;
    context.beginPath();
    context.moveTo(x + displacement, height * 0.12);
    context.bezierCurveTo(
      x + displacement * 1.4,
      height * 0.32,
      x - displacement * 0.4,
      height * 0.7,
      x + displacement * 0.25,
      height * 0.9
    );
    context.stroke();
  }
  context.restore();

  context.strokeStyle = ink;
  context.lineWidth = 1;
  context.strokeRect(apertureX - gap, apertureY - height * 0.18, gap * 2, height * 0.36);
  context.fillStyle = '#d6ff43';
  context.fillRect(apertureX - 2, apertureY - 2, 4, 4);

  if (metrics.residue > 0.1) {
    context.globalAlpha = metrics.residue * 0.55;
    context.fillStyle = ink;
    for (let index = 0; index < 18; index += 1) {
      const x = width * (0.25 + hash(index, 7) * 0.58);
      const y = height * (0.76 + hash(index, 8) * 0.12);
      context.fillRect(x, y, 1 + hash(index, 9) * 3, 1);
    }
    context.globalAlpha = 1;
  }

  if (temporal === 'inspection') drawInspectionMark(context, width, height, metrics, true);
}

function renderScene(
  context,
  width,
  height,
  direction,
  progress,
  pointer = { x: 0.5, y: 0.5, strength: 0 },
  temporal = 'accumulation',
  entropy = 'cross'
) {
  context.clearRect(0, 0, width, height);
  if (direction === 'glass') drawGlass(context, width, height, progress, pointer, temporal, entropy);
  else if (direction === 'relay') drawRelay(context, width, height, progress, pointer, temporal, entropy);
  else if (direction === 'quiet') drawQuiet(context, width, height, progress, pointer, temporal, entropy);
  else drawTidal(context, width, height, progress, pointer, temporal, entropy);
}

function sizeCanvas(canvas, render) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const pixelWidth = Math.max(1, Math.round(rect.width * dpr));
  const pixelHeight = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  render(context, rect.width, rect.height);
}

function setupDirector() {
  const stage = document.querySelector('.direction-stage');
  const heroCanvas = document.querySelector('#direction-canvas');
  const directionButtons = [...document.querySelectorAll('.direction-card[data-direction]')];
  const temporalButtons = [...document.querySelectorAll('[data-temporal]')].filter(button => button.tagName === 'BUTTON');
  const entropyButtons = [...document.querySelectorAll('button[data-entropy]')];
  const stateButtons = [...document.querySelectorAll('.score-states [data-progress]')];
  const qaCanvases = [...document.querySelectorAll('.qa-canvas')];
  if (!stage || !heroCanvas) return;

  const stageIndex = document.querySelector('#stage-index');
  const stageName = document.querySelector('#stage-name');
  const stageMaterial = document.querySelector('#stage-material');
  const status = document.querySelector('#director-status');
  const readout = document.querySelector('#motion-readout');
  const archetypeReadout = document.querySelector('#archetype-readout');
  const entropyNote = document.querySelector('#entropy-note');
  const challengeName = document.querySelector('#challenge-name');
  const challengeVerdict = document.querySelector('#challenge-verdict');
  const scoreFill = document.querySelector('#score-fill');
  const playhead = document.querySelector('#score-playhead');
  const qaLabels = [...document.querySelectorAll('.contact-sheet figcaption b')];
  const pointer = { x: 0.5, y: 0.5, strength: 0 };
  let direction = 'tidal';
  let temporal = 'accumulation';
  let entropy = 'cross';
  let progress = 0;

  const drawHero = () => {
    sizeCanvas(heroCanvas, (context, width, height) => {
      renderScene(context, width, height, direction, progress, pointer, temporal, entropy);
    });
  };

  const drawContactSheet = () => {
    for (const canvas of qaCanvases) {
      const fixedProgress = Number(canvas.dataset.progress);
      sizeCanvas(canvas, (context, width, height) => {
        renderScene(context, width, height, direction, fixedProgress, undefined, temporal, entropy);
      });
    }
  };

  const currentStateIndex = () => {
    const index = Math.round(progress * 4);
    return Math.max(0, Math.min(4, index));
  };

  const updateStateLabels = () => {
    const states = temporalData[temporal].states;
    stateButtons.forEach((button, index) => {
      const label = button.querySelector('b');
      if (label) label.textContent = states[index];
      button.setAttribute('aria-label', `${states[index]}, ${Math.round(Number(button.dataset.progress) * 100)} percent`);
    });
    qaLabels.forEach((label, index) => {
      label.textContent = states[index];
    });
  };

  const updateStatus = () => {
    const stateName = temporalData[temporal].states[currentStateIndex()];
    const percent = Math.round(progress * 100);
    if (readout) readout.textContent = `${stateName} / ${String(percent).padStart(2, '0')}%`;
    if (status) status.textContent = `${directionData[direction].name}, ${temporalData[temporal].name}, ${stateName} state`;
    if (scoreFill) scoreFill.style.width = `${percent}%`;
    if (playhead) playhead.style.left = `${percent}%`;
  };

  const selectDirection = nextDirection => {
    if (!directionData[nextDirection]) return;
    direction = nextDirection;
    stage.dataset.direction = direction;
    directionButtons.forEach(button => {
      const active = button.dataset.direction === direction;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (stageIndex) stageIndex.textContent = directionData[direction].index;
    if (stageName) stageName.textContent = directionData[direction].name;
    if (stageMaterial) stageMaterial.textContent = directionData[direction].material;
    if (challengeName) challengeName.textContent = directionData[direction].challenge;
    if (challengeVerdict) challengeVerdict.textContent = directionData[direction].verdict;
    updateStatus();
    drawHero();
    drawContactSheet();
  };

  const selectTemporal = nextTemporal => {
    if (!temporalData[nextTemporal]) return;
    temporal = nextTemporal;
    stage.dataset.temporal = temporal;
    temporalButtons.forEach(button => {
      const active = button.dataset.temporal === temporal;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (archetypeReadout) archetypeReadout.textContent = temporalData[temporal].name;
    updateStateLabels();
    updateStatus();
    drawHero();
    drawContactSheet();
  };

  const selectEntropy = nextEntropy => {
    if (!entropyData[nextEntropy]) return;
    entropy = nextEntropy;
    stage.dataset.entropy = entropy;
    entropyButtons.forEach(button => {
      const active = button.dataset.entropy === entropy;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (entropyNote) entropyNote.textContent = entropyData[entropy].note;
    updateStatus();
    drawHero();
    drawContactSheet();
  };

  const selectState = nextProgress => {
    progress = clamp(Number(nextProgress));
    stateButtons.forEach(button => {
      const active = Number(button.dataset.progress) === progress;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    updateStatus();
    drawHero();
  };

  directionButtons.forEach(button => {
    button.addEventListener('click', () => selectDirection(button.dataset.direction));
  });
  temporalButtons.forEach(button => {
    button.addEventListener('click', () => selectTemporal(button.dataset.temporal));
  });
  entropyButtons.forEach(button => {
    button.addEventListener('click', () => selectEntropy(button.dataset.entropy));
  });
  stateButtons.forEach(button => {
    button.addEventListener('click', () => selectState(button.dataset.progress));
  });

  stage.addEventListener(
    'pointermove',
    event => {
      const rect = stage.getBoundingClientRect();
      pointer.x = clamp((event.clientX - rect.left) / rect.width);
      pointer.y = clamp((event.clientY - rect.top) / rect.height);
      pointer.strength = reducedMotion.matches ? 0 : 1;
      drawHero();
    },
    { passive: true }
  );
  const clearPointer = () => {
    pointer.strength = 0;
    drawHero();
  };
  stage.addEventListener('pointerleave', clearPointer, { passive: true });
  stage.addEventListener('pointercancel', clearPointer, { passive: true });
  stage.addEventListener('lostpointercapture', clearPointer, { passive: true });
  window.addEventListener('blur', clearPointer, { passive: true });

  const resizeObserver = new ResizeObserver(() => {
    drawHero();
    drawContactSheet();
  });
  resizeObserver.observe(stage);
  qaCanvases.forEach(canvas => resizeObserver.observe(canvas));

  reducedMotion.addEventListener('change', () => {
    pointer.strength = 0;
    drawHero();
  });

  selectEntropy(entropy);
  selectTemporal(temporal);
  selectDirection(direction);
  selectState(progress);
}

setupCopyButtons();
setupLiveFrames();
setupArrowNavigation('.control-cluster > div, .direction-selector, .score-states');
setupDirector();
