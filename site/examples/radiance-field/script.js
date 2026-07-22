const canvas = document.querySelector('#shader');
const bench = document.querySelector('.bench');
const crt = document.querySelector('.crt');
const phaseLabel = document.querySelector('#phase');
const pressureLabel = document.querySelector('#pressure');
const routeLabel = document.querySelector('#route');
const probeLabel = document.querySelector('#probe-state');
const codeLabel = document.querySelector('#screen-code');
const needle = document.querySelector('#needle');
const probe = document.querySelector('.probe');
const scoreItems = [...document.querySelectorAll('[data-score]')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const CYCLE = 20000;
const phaseNames = ['equilibrium', 'spike', 'outage', 'reroute', 'cool'];
const phaseCodes = ['EQ–01', 'PX–86', 'ØØ–00', 'RR–42', 'CL–08'];
const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, target: 0 };

let width = 1;
let height = 1;
let frame = 0;
let visible = true;
let pageVisible = true;
let start = performance.now();
let glState = null;

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function timeline(progress) {
  let phase = 0;
  let pressure = 0.28 + Math.sin(progress * Math.PI * 4) * 0.025;
  let outage = 0;
  let reroute = 0;
  if (progress >= 0.2 && progress < 0.42) {
    phase = 1;
    pressure = 0.28 + smoothstep(0.2, 0.39, progress) * 0.68;
  } else if (progress >= 0.42 && progress < 0.59) {
    phase = 2;
    pressure = 0.96 - smoothstep(0.42, 0.56, progress) * 0.75;
    outage = smoothstep(0.42, 0.5, progress);
  } else if (progress >= 0.59 && progress < 0.82) {
    phase = 3;
    pressure = 0.34 + Math.sin((progress - 0.59) * 18) * 0.06;
    outage = 1 - smoothstep(0.59, 0.7, progress);
    reroute = smoothstep(0.59, 0.72, progress);
  } else if (progress >= 0.82) {
    phase = 4;
    pressure = 0.42 - smoothstep(0.82, 1, progress) * 0.14;
    reroute = 1 - smoothstep(0.82, 1, progress) * 0.7;
  }
  return { phase, pressure, outage, reroute };
}

function initializeWebgl() {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: Boolean(window.__signatureVisualQASeed)
  });
  if (!gl) return null;

  const vertexSource = `
    attribute vec2 aPosition;
    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;
    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uPointerActive;
    uniform float uTime;
    uniform float uPressure;
    uniform float uOutage;
    uniform float uReroute;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.52;
      for (int i = 0; i < 5; i++) {
        value += noise(p) * amplitude;
        p = mat2(1.52, 1.14, -1.14, 1.52) * p + 0.17;
        amplitude *= 0.49;
      }
      return value;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 p = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
      vec2 probe = (uPointer * 2.0 - 1.0) * vec2(uResolution.x / min(uResolution.x, uResolution.y), uResolution.y / min(uResolution.x, uResolution.y));
      float time = uTime * 0.055;

      vec2 drift = vec2(time, -time * 0.46);
      float broad = fbm(p * 1.28 + drift);
      float detail = fbm(p * 2.7 - drift * 0.73 + broad * 0.48);
      float source = exp(-length(p - vec2(-0.38, 0.08)) * (2.3 - uPressure * 0.72));
      float probeField = exp(-length(p - probe) * 4.2) * uPointerActive;
      float pressure = broad * 0.58 + detail * 0.24 + source * uPressure * 0.62 + probeField * 0.26;
      pressure += sin(p.x * 2.2 - p.y * 1.8 + time) * 0.055;

      float contourPhase = abs(fract(pressure * 13.0) - 0.5);
      float contour = 1.0 - smoothstep(0.032, 0.088, contourPhase);
      float majorPhase = abs(fract(pressure * 4.0) - 0.5);
      float major = 1.0 - smoothstep(0.026, 0.072, majorPhase);
      float routeA = 1.0 - smoothstep(0.018, 0.044, abs(p.y - sin(p.x * 2.6 + time) * 0.17 - 0.13));
      float routeB = 1.0 - smoothstep(0.018, 0.044, abs(p.y + sin(p.x * 2.1 - time) * 0.16 - 0.18));
      float route = max(routeA, routeB) * uReroute;

      vec3 dark = vec3(0.018, 0.058, 0.042);
      vec3 green = vec3(0.58, 0.67, 0.30);
      vec3 amber = vec3(0.88, 0.42, 0.18);
      vec3 color = dark;
      color += green * contour * (0.36 + pressure * 0.36);
      color += green * major * 0.42;
      color = mix(color, amber * (0.36 + contour), smoothstep(0.7, 1.08, pressure) * uPressure * 0.72);
      color += mix(green, amber, 0.32) * route * 0.78;
      color += amber * probeField * (0.18 + contour * 0.5);
      color *= 1.0 - uOutage * (0.75 - route * 0.56);
      color *= 0.76 + sin(uv.y * uResolution.y * 1.6) * 0.04;
      color *= smoothstep(0.88, 0.35, length(p * vec2(0.82, 1.0)));
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.useProgram(program);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  return {
    gl,
    buffer,
    program,
    vertexShader,
    fragmentShader,
    uniforms: {
      resolution: gl.getUniformLocation(program, 'uResolution'),
      pointer: gl.getUniformLocation(program, 'uPointer'),
      pointerActive: gl.getUniformLocation(program, 'uPointerActive'),
      time: gl.getUniformLocation(program, 'uTime'),
      pressure: gl.getUniformLocation(program, 'uPressure'),
      outage: gl.getUniformLocation(program, 'uOutage'),
      reroute: gl.getUniformLocation(program, 'uReroute')
    }
  };
}

glState = initializeWebgl();
if (!glState) bench.classList.add('webgl-fallback');

function resize() {
  const rect = crt.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 1.65);
  width = Math.max(1, Math.round(rect.width * dpr));
  height = Math.max(1, Math.round(rect.height * dpr));
  canvas.width = width;
  canvas.height = height;
  glState?.gl.viewport(0, 0, width, height);
}

function pointerMove(event) {
  const rect = crt.getBoundingClientRect();
  pointer.tx = (event.clientX - rect.left) / rect.width;
  pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
  pointer.target = 1;
  probe.style.left = `${pointer.tx * 100}%`;
  probe.style.top = `${(1 - pointer.ty) * 100}%`;
  probe.classList.add('is-active');
  probeLabel.textContent = 'reading';
}

function updatePanel(score) {
  const phaseName = phaseNames[score.phase];
  const pressure = Math.round(score.pressure * 100);
  bench.dataset.phase = phaseName;
  phaseLabel.textContent = phaseName;
  pressureLabel.textContent = String(pressure);
  routeLabel.textContent = score.phase === 2 ? 'lost' : score.phase === 3 ? 'secondary' : score.phase === 4 ? 'merging' : 'primary';
  codeLabel.textContent = phaseCodes[score.phase];
  needle.style.setProperty('--needle-angle', `${-48 + score.pressure * 96}deg`);
  for (const item of scoreItems) item.classList.toggle('is-active', item.dataset.score === phaseName);
}

function renderAt(timeMs = 0) {
  const progress = ((timeMs % CYCLE) + CYCLE) % CYCLE / CYCLE;
  const score = timeline(progress);
  pointer.x += (pointer.tx - pointer.x) * 0.1;
  pointer.y += (pointer.ty - pointer.y) * 0.1;
  pointer.active += (pointer.target - pointer.active) * 0.09;
  updatePanel(score);

  if (glState) {
    const { gl, program, uniforms } = glState;
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform2f(uniforms.pointer, pointer.x, pointer.y);
    gl.uniform1f(uniforms.pointerActive, pointer.active);
    gl.uniform1f(uniforms.time, timeMs * 0.001);
    gl.uniform1f(uniforms.pressure, score.pressure);
    gl.uniform1f(uniforms.outage, score.outage);
    gl.uniform1f(uniforms.reroute, score.reroute);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

function animate(now) {
  renderAt(now - start);
  if (visible && pageVisible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(animate);
}

function sync() {
  cancelAnimationFrame(frame);
  if (visible && pageVisible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(animate);
  else renderAt(CYCLE * 0.72);
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
    pointer.tx = next.x;
    pointer.ty = 1 - next.y;
    pointer.x = pointer.tx;
    pointer.y = pointer.ty;
    pointer.target = next.active === false ? 0 : 1;
    pointer.active = pointer.target;
    probe.style.left = `${next.x * 100}%`;
    probe.style.top = `${next.y * 100}%`;
    probe.classList.toggle('is-active', pointer.target > 0);
  },
  render() {
    renderAt(qaState.timeMs);
  },
  describe() {
    return { phase: phaseLabel.textContent, seed: qaState.seed, time: qaState.timeMs / 1000, progress: qaState.progress };
  },
  flush() {
    seekQa({ timeMs: reducedMotion.matches ? CYCLE * 0.72 : performance.now() - start });
  }
};

window.__signatureVisual = qa;
window.__signatureVisualQA = qa;

new ResizeObserver(resize).observe(crt);
new IntersectionObserver(entries => {
  visible = entries[0]?.isIntersecting ?? true;
  sync();
}).observe(bench);
crt.addEventListener('pointermove', pointerMove, { passive: true });
crt.addEventListener('pointerleave', () => {
  pointer.target = 0;
  probe.classList.remove('is-active');
  probeLabel.textContent = 'parked';
}, { passive: true });
document.addEventListener('visibilitychange', sync);
reducedMotion.addEventListener('change', sync);
window.addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  if (event.data?.type === 'signature-visual-visibility') {
    pageVisible = Boolean(event.data.visible);
    sync();
  }
});
window.addEventListener('pagehide', () => {
  cancelAnimationFrame(frame);
  if (!glState) return;
  const { gl, buffer, program, vertexShader, fragmentShader } = glState;
  gl.deleteBuffer(buffer);
  gl.deleteProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
});

resize();
sync();
