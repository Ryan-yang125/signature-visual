const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const directionData = {
  tidal: {
    index: 'Direction 01',
    name: 'Tidal Ledger',
    material: 'ink currents · coordinated drift'
  },
  glass: {
    index: 'Direction 02',
    name: 'Glasshouse Core',
    material: 'soft tissue · refracted light'
  },
  relay: {
    index: 'Direction 03',
    name: 'Relay Almanac',
    material: 'route marks · measured arrivals'
  }
};

const motionStates = [
  { progress: 0, name: 'Still' },
  { progress: 0.25, name: 'Wake' },
  { progress: 0.5, name: 'Gather' },
  { progress: 0.75, name: 'Crest' },
  { progress: 1, name: 'Settle' }
];

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

function hash(value, salt = 0) {
  const number = Math.sin(value * 127.1 + salt * 311.7) * 43758.5453;
  return number - Math.floor(number);
}

function intensityAt(progress) {
  if (progress <= 0.75) return progress / 0.75;
  return 1 - (progress - 0.75) * 2.35;
}

function drawTidal(context, width, height, progress, pointer) {
  context.fillStyle = '#10130f';
  context.fillRect(0, 0, width, height);

  const intensity = intensityAt(progress);
  const safeLeft = width * 0.17;
  const centerX = width * 0.62;
  const centerY = height * 0.46;
  const lineCount = Math.max(26, Math.round(height / 9));
  const stepX = Math.max(8, width / 100);

  context.save();
  context.lineCap = 'round';
  for (let line = 0; line < lineCount; line += 1) {
    const seed = hash(line, 2);
    const baseY = ((line + 0.5) / lineCount) * height;
    const tone = line % 9 === 0 ? '#d6ff43' : line % 5 === 0 ? '#f0ece2' : '#6f8560';
    context.strokeStyle = tone;
    context.globalAlpha = line % 9 === 0 ? 0.78 : 0.23 + seed * 0.22;
    context.lineWidth = line % 9 === 0 ? 1.35 : 0.45 + seed * 0.5;
    context.beginPath();

    for (let x = -stepX; x <= width + stepX; x += stepX) {
      const nx = x / width;
      const wave = Math.sin(nx * 9.2 + line * 0.31 + progress * 5.7) * height * (0.012 + intensity * 0.025);
      const crossWave = Math.cos(nx * 3.1 - line * 0.19) * height * 0.008;
      const focusDistance = Math.abs(x - centerX) / (width * 0.43);
      const focus = Math.max(0, 1 - focusDistance * focusDistance);
      const polarity = baseY < centerY ? -1 : 1;
      const corridor = polarity * focus * height * 0.038 * intensity;

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
  context.arc(centerX, centerY, Math.min(width, height) * (0.025 + intensity * 0.032), 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = '#d6ff43';
  context.beginPath();
  context.arc(centerX, centerY, 2.3 + intensity * 1.5, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function organicPoint(cx, cy, radius, angle, ring, progress, width, height) {
  const pulse = Math.sin(angle * 3 + ring * 0.37 + progress * 4.2) * 0.075;
  const tissue = Math.cos(angle * 5 - ring * 0.26 + progress * 2.3) * 0.048;
  return {
    x: cx + Math.cos(angle) * radius * (1 + pulse + tissue) * (width / Math.max(width, height)),
    y: cy + Math.sin(angle) * radius * (1 + pulse - tissue) * (height / Math.max(width, height))
  };
}

function drawGlass(context, width, height, progress, pointer) {
  context.fillStyle = '#e9e4d9';
  context.fillRect(0, 0, width, height);

  const intensity = intensityAt(progress);
  const cx = width * (0.55 + (pointer.x - 0.5) * 0.035 * pointer.strength);
  const cy = height * (0.46 + (pointer.y - 0.5) * 0.035 * pointer.strength);
  const radius = Math.min(width, height) * (0.36 + intensity * 0.035);
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
  for (let ring = 9; ring >= 0; ring -= 1) {
    const ringRadius = radius * (0.34 + ring * 0.065);
    const alpha = 0.05 + (9 - ring) * 0.011;
    context.strokeStyle = ring % 3 === 0 ? `rgba(46,67,174,${alpha + 0.12})` : `rgba(23,23,17,${alpha})`;
    context.lineWidth = ring % 3 === 0 ? 1.2 : 0.65;
    context.beginPath();
    const points = 96;
    for (let index = 0; index <= points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const point = organicPoint(cx, cy, ringRadius, angle, ring, progress, width, height);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.closePath();
    context.stroke();
  }
  context.restore();

  for (let index = 0; index < 22; index += 1) {
    const angle = hash(index, 3) * Math.PI * 2 + progress * (index % 2 ? 0.8 : -0.5);
    const distance = radius * (0.18 + hash(index, 5) * 0.62);
    const cellX = cx + Math.cos(angle) * distance * (width / Math.max(width, height));
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
}

function drawRelay(context, width, height, progress, pointer) {
  context.fillStyle = '#f04b2d';
  context.fillRect(0, 0, width, height);

  const intensity = intensityAt(progress);
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
  const routeCount = 7;

  context.save();
  context.strokeStyle = dark;
  context.fillStyle = dark;
  context.lineCap = 'square';
  context.lineJoin = 'miter';
  for (let route = 0; route < routeCount; route += 1) {
    const y = margin + ((route + 0.8) / routeCount) * (height - margin * 2);
    const elbowA = width * (0.28 + hash(route, 2) * 0.12);
    const elbowB = width * (0.62 + hash(route, 6) * 0.13);
    const shift = (hash(route, 8) - 0.5) * height * 0.14 * intensity;
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
  const lensRadius = Math.min(width, height) * (0.075 + intensity * 0.025);
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
  context.arc(lensX, lensY, 3 + intensity * 2, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = dark;
  context.font = `${Math.max(7, Math.min(width, height) * 0.025)}px monospace`;
  context.textBaseline = 'top';
  context.fillText('ORIGIN / 07', margin, margin * 0.48);
  context.textAlign = 'right';
  context.fillText(`${String(Math.round(progress * 100)).padStart(3, '0')} / ARRIVAL`, width - margin, margin * 0.48);
  context.textAlign = 'left';
}

function renderScene(context, width, height, direction, progress, pointer = { x: 0.5, y: 0.5, strength: 0 }) {
  context.clearRect(0, 0, width, height);
  if (direction === 'glass') drawGlass(context, width, height, progress, pointer);
  else if (direction === 'relay') drawRelay(context, width, height, progress, pointer);
  else drawTidal(context, width, height, progress, pointer);
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
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  render(context, rect.width, rect.height);
}

function setupDirector() {
  const stage = document.querySelector('.direction-stage');
  const heroCanvas = document.querySelector('#direction-canvas');
  const directionButtons = [...document.querySelectorAll('.direction-card[data-direction]')];
  const stateButtons = [...document.querySelectorAll('.score-states [data-progress]')];
  const qaCanvases = [...document.querySelectorAll('.qa-canvas')];
  if (!stage || !heroCanvas) return;

  const stageIndex = document.querySelector('#stage-index');
  const stageName = document.querySelector('#stage-name');
  const stageMaterial = document.querySelector('#stage-material');
  const status = document.querySelector('#director-status');
  const readout = document.querySelector('#motion-readout');
  const scoreFill = document.querySelector('#score-fill');
  const playhead = document.querySelector('#score-playhead');
  const pointer = { x: 0.5, y: 0.5, strength: 0 };
  let direction = 'tidal';
  let progress = 0;

  const drawHero = () => {
    sizeCanvas(heroCanvas, (context, width, height) => renderScene(context, width, height, direction, progress, pointer));
  };

  const drawContactSheet = () => {
    for (const canvas of qaCanvases) {
      const fixedProgress = Number(canvas.dataset.progress);
      sizeCanvas(canvas, (context, width, height) => renderScene(context, width, height, direction, fixedProgress));
    }
  };

  const updateStatus = () => {
    const state = motionStates.find(item => item.progress === progress) ?? motionStates[0];
    const percent = Math.round(progress * 100);
    if (readout) readout.textContent = `${state.name} · ${String(percent).padStart(2, '0')}%`;
    if (status) status.textContent = `${directionData[direction].name}, ${state.name} state`;
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
    updateStatus();
    drawHero();
    drawContactSheet();
  };

  const selectState = nextProgress => {
    progress = Number(nextProgress);
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
  stateButtons.forEach(button => {
    button.addEventListener('click', () => selectState(button.dataset.progress));
  });

  stage.addEventListener(
    'pointermove',
    event => {
      const rect = stage.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width;
      pointer.y = (event.clientY - rect.top) / rect.height;
      pointer.strength = reducedMotion.matches ? 0 : 1;
      drawHero();
    },
    { passive: true }
  );
  stage.addEventListener(
    'pointerleave',
    () => {
      pointer.strength = 0;
      drawHero();
    },
    { passive: true }
  );

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

  selectDirection(direction);
  selectState(progress);
}

setupCopyButtons();
setupLiveFrames();
setupDirector();
