/** Lifecycle-aware raw WebGL shader field. */
export function createShaderField(target, options = {}) {
  if (!(target instanceof HTMLElement)) {
    throw new TypeError('createShaderField requires an HTMLElement target');
  }

  const config = {
    accentA: options.accentA ?? [0.16, 0.32, 0.95],
    accentB: options.accentB ?? [0.95, 0.26, 0.38],
    background: options.background ?? [0.015, 0.02, 0.08],
    energy: options.energy ?? 0.72,
    calm: options.calm ?? 0.62,
    response: options.response ?? 0.8,
    maxDpr: options.maxDpr ?? 1.75
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

  const gl = canvas.getContext('webgl', {
    alpha: true,
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
    uniform float uEnergy;
    uniform vec3 uAccentA;
    uniform vec3 uAccentB;
    uniform vec3 uBackground;

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
      for (int i = 0; i < 4; i++) {
        value += noise(p) * amplitude;
        p = mat2(1.72, 1.21, -1.21, 1.72) * p + 0.17;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
      vec2 pointer = (uPointer * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);

      float t = uTime * 0.13;
      vec2 domain = uv;
      float warpA = fbm(domain * 1.35 + vec2(t, -t * 0.72));
      float warpB = fbm(domain * 2.1 + vec2(-t * 0.43, t * 0.31) + warpA);
      domain += vec2(warpA - 0.5, warpB - 0.5) * (0.72 + uEnergy * 0.42);

      float field = fbm(domain * 2.25 - vec2(t * 0.8, 0.0));
      float folds = sin((domain.x + field * 0.92) * 8.0 - uTime * 0.42) * 0.5 + 0.5;
      float pointerDistance = length(uv - pointer);
      float lens = exp(-pointerDistance * 3.8) * uPointerActive;
      float rings = sin(pointerDistance * 22.0 - uTime * 1.6) * 0.5 + 0.5;
      field += lens * rings * 0.28;

      float light = smoothstep(0.28, 0.92, field + folds * 0.22);
      float edge = pow(max(0.0, 1.0 - length(uv) * 0.42), 1.7);
      vec3 color = mix(uBackground, uAccentA, light * 0.68);
      color = mix(color, uAccentB, smoothstep(0.62, 0.94, field + lens * 0.4) * 0.52);
      color += vec3(0.12, 0.18, 0.26) * folds * light * uEnergy;
      color *= 0.56 + edge * 0.72;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Unknown shader compile error';
      gl.deleteShader(shader);
      throw new Error(message);
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
    throw new Error(gl.getProgramInfoLog(program) || 'WebGL program link failed');
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  gl.useProgram(program);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    resolution: gl.getUniformLocation(program, 'uResolution'),
    pointer: gl.getUniformLocation(program, 'uPointer'),
    pointerActive: gl.getUniformLocation(program, 'uPointerActive'),
    time: gl.getUniformLocation(program, 'uTime'),
    energy: gl.getUniformLocation(program, 'uEnergy'),
    accentA: gl.getUniformLocation(program, 'uAccentA'),
    accentB: gl.getUniformLocation(program, 'uAccentB'),
    background: gl.getUniformLocation(program, 'uBackground')
  };

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: 0, targetActive: 0 };
  let width = 1;
  let height = 1;
  let frame = 0;
  let visible = true;
  let destroyed = false;

  function resize() {
    const rect = target.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, config.maxDpr);
    width = Math.max(1, Math.round(rect.width * dpr));
    height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function updatePointer(event) {
    const rect = target.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    pointer.tx = (event.clientX - rect.left) * scaleX;
    pointer.ty = height - (event.clientY - rect.top) * scaleY;
    pointer.targetActive = 1;
  }

  function leavePointer() {
    pointer.targetActive = 0;
  }

  function render(now = 0, singleFrame = false) {
    if (destroyed) return;
    pointer.x += (pointer.tx - pointer.x) * 0.075;
    pointer.y += (pointer.ty - pointer.y) * 0.075;
    pointer.active += (pointer.targetActive - pointer.active) * 0.07;

    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform2f(uniforms.pointer, pointer.x, pointer.y);
    gl.uniform1f(uniforms.pointerActive, pointer.active * config.response);
    gl.uniform1f(uniforms.time, reducedMotion.matches ? 3.6 : now * 0.001 * (1.15 - config.calm * 0.55));
    gl.uniform1f(uniforms.energy, config.energy);
    gl.uniform3fv(uniforms.accentA, config.accentA);
    gl.uniform3fv(uniforms.accentB, config.accentB);
    gl.uniform3fv(uniforms.background, config.background);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (visible && !document.hidden && !reducedMotion.matches && !singleFrame) {
      frame = requestAnimationFrame(render);
    }
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    if (visible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(render);
    else render(3600, true);
  }

  const resizeObserver = new ResizeObserver(resize);
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
  resize();
  syncAnimation();

  return function disposeShaderField() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    target.removeEventListener('pointermove', updatePointer);
    target.removeEventListener('pointerleave', leavePointer);
    document.removeEventListener('visibilitychange', syncAnimation);
    reducedMotion.removeEventListener('change', syncAnimation);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
    if (changedPosition) target.style.position = previousPosition;
  };
}
