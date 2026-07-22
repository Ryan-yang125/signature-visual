/**
 * Neutral WebGL runtime shell.
 *
 * Supply options.fragmentSource and optionally options.vertexSource,
 * options.beforeRender(state), options.onResize(state), and options.fallback.
 * Standard uniforms: uResolution, uTime, uProgress, uPointer,
 * uPointerActive, and uSeed.
 */
function normalizeSeed(value) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric) && String(value).trim() !== '') return numeric >>> 0;
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createShaderField(target, options = {}) {
  if (!(target instanceof HTMLElement)) {
    throw new TypeError('createShaderField requires an HTMLElement target');
  }

  const config = {
    maxDpr: options.maxDpr ?? 1.5,
    seed: options.seed ?? 125,
    reducedTime: options.reducedTime ?? 2.4,
    pointerEase: options.pointerEase ?? 0.1
  };

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none'
  });

  const previousPosition = target.style.position;
  const changedPosition = getComputedStyle(target).position === 'static';
  if (changedPosition) target.style.position = 'relative';
  target.append(canvas);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, targetActive: 0 };
  const vertexSource = options.vertexSource ?? `
    attribute vec2 aPosition;
    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;
  const fragmentSource = options.fragmentSource ?? `
    precision mediump float;
    uniform vec2 uResolution;
    void main() {
      vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
      gl_FragColor = vec4(uv * 0.0, 0.0, 0.0);
    }
  `;

  let gl = null;
  let program = null;
  let vertexShader = null;
  let fragmentShader = null;
  let buffer = null;
  let uniforms = {};
  let width = 1;
  let height = 1;
  let dpr = 1;
  let frame = 0;
  let visible = true;
  let destroyed = false;
  let contextLost = false;
  let captureTime = null;
  let captureProgress = 0;
  let startTime = performance.now();
  let previousTime = startTime;
  let seed = normalizeSeed(config.seed);

  function showFallback(reason) {
    canvas.dataset.svFallback = reason;
    if (typeof options.fallback === 'function') options.fallback({ target, canvas, reason });
    else if (typeof options.fallback === 'string') canvas.style.background = options.fallback;
  }

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Shader compile failed';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function releaseResources() {
    if (!gl) return;
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    buffer = null;
    program = null;
    vertexShader = null;
    fragmentShader = null;
    uniforms = {};
  }

  function initialize() {
    gl = canvas.getContext('webgl', {
      alpha: options.alpha ?? true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    });
    if (!gl) {
      showFallback('context-unavailable');
      return false;
    }

    try {
      vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
      fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
      program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'WebGL program link failed');
      }

      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      gl.useProgram(program);
      const position = gl.getAttribLocation(program, 'aPosition');
      if (position >= 0) {
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      }
      uniforms = {
        resolution: gl.getUniformLocation(program, 'uResolution'),
        time: gl.getUniformLocation(program, 'uTime'),
        progress: gl.getUniformLocation(program, 'uProgress'),
        pointer: gl.getUniformLocation(program, 'uPointer'),
        pointerActive: gl.getUniformLocation(program, 'uPointerActive'),
        seed: gl.getUniformLocation(program, 'uSeed')
      };
      canvas.dataset.svFallback = '';
      return true;
    } catch (error) {
      releaseResources();
      showFallback('shader-error');
      options.onError?.(error);
      return false;
    }
  }

  function resize() {
    const rect = target.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, config.maxDpr);
    width = Math.max(1, Math.round(rect.width * dpr));
    height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl?.viewport(0, 0, width, height);
    }
    options.onResize?.({ gl, program, uniforms, canvas, target, width, height, dpr });
    renderOnce();
  }

  function updatePointer(event) {
    const rect = target.getBoundingClientRect();
    pointer.tx = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
    pointer.ty = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / Math.max(1, rect.height)));
    pointer.targetActive = 1;
  }

  function leavePointer() {
    pointer.targetActive = 0;
  }

  function renderFrame(now = performance.now(), singleFrame = false) {
    if (destroyed || !gl || !program || contextLost) return;
    const delta = Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    const time = captureTime ?? (reducedMotion.matches ? config.reducedTime : (now - startTime) / 1000);
    const ease = singleFrame && captureTime !== null ? 1 : config.pointerEase;
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    pointer.active += (pointer.targetActive - pointer.active) * ease;

    gl.useProgram(program);
    if (uniforms.resolution) gl.uniform2f(uniforms.resolution, width, height);
    if (uniforms.time) gl.uniform1f(uniforms.time, time);
    if (uniforms.progress) gl.uniform1f(uniforms.progress, captureProgress);
    if (uniforms.pointer) gl.uniform2f(uniforms.pointer, pointer.x * width, pointer.y * height);
    if (uniforms.pointerActive) gl.uniform1f(uniforms.pointerActive, pointer.active);
    if (uniforms.seed) gl.uniform1f(uniforms.seed, seed);
    options.beforeRender?.({
      gl, program, uniforms, canvas, target, width, height, dpr, time, delta,
      progress: captureProgress, seed, pointer: { ...pointer }, reducedMotion: reducedMotion.matches
    });
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (visible && !document.hidden && !reducedMotion.matches && captureTime === null && !singleFrame) {
      frame = requestAnimationFrame(renderFrame);
    }
  }

  function renderOnce() {
    cancelAnimationFrame(frame);
    renderFrame(performance.now(), true);
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    if (visible && !document.hidden && !reducedMotion.matches && captureTime === null) {
      previousTime = performance.now();
      frame = requestAnimationFrame(renderFrame);
    } else {
      renderOnce();
    }
  }

  function setSeed(nextSeed) {
    seed = normalizeSeed(nextSeed);
    renderOnce();
  }

  function seek(next = {}) {
    captureTime = Number.isFinite(next.time) ? Number(next.time) : captureTime ?? 0;
    captureProgress = Number.isFinite(next.progress) ? Math.max(0, Math.min(1, Number(next.progress))) : captureProgress;
    renderOnce();
  }

  function setPointer(next = {}) {
    pointer.tx = Math.max(0, Math.min(1, Number(next.x ?? pointer.tx)));
    const ratioY = Math.max(0, Math.min(1, Number(next.y ?? 1 - pointer.ty)));
    pointer.ty = 1 - ratioY;
    pointer.targetActive = Math.max(0, Math.min(1, Number(next.active ?? pointer.targetActive)));
    pointer.x = pointer.tx;
    pointer.y = pointer.ty;
    pointer.active = pointer.targetActive;
    renderOnce();
  }

  function handleContextLost(event) {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frame);
    showFallback('context-lost');
  }

  function handleContextRestored() {
    contextLost = false;
    releaseResources();
    if (initialize()) {
      resize();
      syncAnimation();
    }
  }

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true;
    syncAnimation();
  }, { rootMargin: '120px' });

  canvas.addEventListener('webglcontextlost', handleContextLost);
  canvas.addEventListener('webglcontextrestored', handleContextRestored);
  resizeObserver.observe(target);
  intersectionObserver.observe(target);
  target.addEventListener('pointermove', updatePointer, { passive: true });
  target.addEventListener('pointerleave', leavePointer, { passive: true });
  document.addEventListener('visibilitychange', syncAnimation);
  reducedMotion.addEventListener('change', syncAnimation);
  initialize();
  resize();
  syncAnimation();

  function dispose() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    target.removeEventListener('pointermove', updatePointer);
    target.removeEventListener('pointerleave', leavePointer);
    document.removeEventListener('visibilitychange', syncAnimation);
    reducedMotion.removeEventListener('change', syncAnimation);
    canvas.removeEventListener('webglcontextlost', handleContextLost);
    canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    releaseResources();
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    options.dispose?.();
    canvas.remove();
    if (changedPosition) target.style.position = previousPosition;
  }

  dispose.dispose = dispose;
  dispose.setSeed = setSeed;
  dispose.seek = seek;
  dispose.setPointer = setPointer;
  dispose.render = renderOnce;
  return dispose;
}
