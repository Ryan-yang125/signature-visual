const canvas = document.querySelector('#shader');
const scene = document.querySelector('.scene');
const phaseLabel = document.querySelector('#phase');
const lensLabel = document.querySelector('#lens');
const gl = canvas.getContext('webgl', {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  powerPreference: 'high-performance'
});

if (!gl) throw new Error('WebGL is unavailable');

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

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += noise(p) * amplitude;
      p = mat2(1.63, 1.17, -1.17, 1.63) * p + 0.13;
      amplitude *= 0.51;
    }
    return value;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
    vec2 pointer = (uPointer * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
    float time = uTime * 0.11;

    vec2 domain = uv;
    float warpA = fbm(domain * 1.25 + vec2(time, -time * 0.62));
    float warpB = fbm(domain * 2.05 + vec2(-time * 0.5, time * 0.31) + warpA * 0.8);
    domain += vec2(warpA - 0.5, warpB - 0.5) * 0.88;

    float field = fbm(domain * 2.2 - vec2(time * 0.72, 0.0));
    float folds = sin((domain.x + field * 0.88) * 8.6 - uTime * 0.38) * 0.5 + 0.5;
    float fine = sin((domain.y - field * 0.42) * 16.0 + uTime * 0.14) * 0.5 + 0.5;

    float pointerDistance = length(uv - pointer);
    float lens = exp(-pointerDistance * 3.4) * uPointerActive;
    float rings = sin(pointerDistance * 23.0 - uTime * 1.55) * 0.5 + 0.5;
    field += lens * rings * 0.3;

    float glow = smoothstep(0.25, 0.93, field + folds * 0.2);
    float hot = smoothstep(0.68, 1.08, field + lens * 0.52 + fine * 0.08);
    vec3 dark = vec3(0.035, 0.012, 0.09);
    vec3 violet = vec3(0.28, 0.13, 0.66);
    vec3 cyan = vec3(0.18, 0.82, 0.78);
    vec3 coral = vec3(1.0, 0.22, 0.34);
    vec3 color = mix(dark, violet, glow * 0.78);
    color = mix(color, cyan, folds * glow * 0.42);
    color = mix(color, coral, hot * 0.7);
    color += vec3(0.16, 0.08, 0.28) * fine * glow;
    color *= 0.65 + pow(max(0.0, 1.0 - length(uv) * 0.31), 1.8) * 0.58;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || 'Shader compile failed');
  }
  return shader;
}

const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(program) || 'Program link failed');
}

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
gl.useProgram(program);
const position = gl.getAttribLocation(program, 'aPosition');
gl.enableVertexAttribArray(position);
gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

const uniforms = {
  resolution: gl.getUniformLocation(program, 'uResolution'),
  pointer: gl.getUniformLocation(program, 'uPointer'),
  pointerActive: gl.getUniformLocation(program, 'uPointerActive'),
  time: gl.getUniformLocation(program, 'uTime')
};

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: 0, target: 0 };
let width = 1;
let height = 1;
let frame = 0;
let visible = true;
let pageVisible = true;

function resize() {
  const rect = scene.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 1.65);
  width = Math.max(1, Math.round(rect.width * dpr));
  height = Math.max(1, Math.round(rect.height * dpr));
  canvas.width = width;
  canvas.height = height;
  gl.viewport(0, 0, width, height);
}

function pointerMove(event) {
  const rect = scene.getBoundingClientRect();
  pointer.tx = ((event.clientX - rect.left) / rect.width) * width;
  pointer.ty = height - ((event.clientY - rect.top) / rect.height) * height;
  pointer.target = 1;
  lensLabel.textContent = 'ACTIVE';
}

function render(now = 0, still = false) {
  pointer.x += (pointer.tx - pointer.x) * 0.07;
  pointer.y += (pointer.ty - pointer.y) * 0.07;
  pointer.active += (pointer.target - pointer.active) * 0.065;
  const seconds = reducedMotion.matches ? 4.2 : now * 0.001;
  gl.useProgram(program);
  gl.uniform2f(uniforms.resolution, width, height);
  gl.uniform2f(uniforms.pointer, pointer.x, pointer.y);
  gl.uniform1f(uniforms.pointerActive, pointer.active);
  gl.uniform1f(uniforms.time, seconds);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  phaseLabel.textContent = (seconds % 10).toFixed(2);
  if (visible && pageVisible && !document.hidden && !reducedMotion.matches && !still) frame = requestAnimationFrame(render);
}

function sync() {
  cancelAnimationFrame(frame);
  if (visible && pageVisible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(render);
  else render(4200, true);
}

new ResizeObserver(resize).observe(scene);
new IntersectionObserver(entries => {
  visible = entries[0]?.isIntersecting ?? true;
  sync();
}).observe(scene);
scene.addEventListener('pointermove', pointerMove, { passive: true });
scene.addEventListener('pointerleave', () => {
  pointer.target = 0;
  lensLabel.textContent = 'IDLE';
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
  gl.deleteBuffer(buffer);
  gl.deleteProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
});

resize();
sync();
