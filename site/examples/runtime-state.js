export function createRuntimeState({ reducedMotion }) {
  const listeners = [];
  const observers = [];
  const pauseReasons = new Set();

  const state = {
    ready: false,
    disposed: false,
    paused: true,
    mountCount: 0,
    disposeCount: 0,
    pointer: { active: false, x: 0.5, y: 0.5, lastEvent: 'idle' },
    fallback: { active: false, reason: null },
    action: { count: 0, last: null, source: null },
    reducedMotion: Boolean(reducedMotion?.matches),
    resources: { listeners: 0, observers: 0, raf: 0, timers: 0 }
  };

  function updatePaused() {
    state.paused = state.disposed || pauseReasons.size > 0;
  }

  function setPauseReason(reason, active) {
    if (active) pauseReasons.add(reason);
    else pauseReasons.delete(reason);
    updatePaused();
  }

  function addListener(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    listeners.push(() => target.removeEventListener(type, listener, options));
    state.resources.listeners = listeners.length;
    return listener;
  }

  function addObserver(observer, target) {
    observer.observe(target);
    observers.push(observer);
    state.resources.observers = observers.length;
    return observer;
  }

  function beginMount() {
    state.disposed = false;
    state.ready = false;
    state.mountCount += 1;
    pauseReasons.delete('disposed');
    updatePaused();
  }

  function finishMount() {
    state.ready = true;
    updatePaused();
  }

  function disposeManaged() {
    if (state.disposed) return false;
    while (listeners.length) listeners.pop()();
    while (observers.length) observers.pop().disconnect();
    state.resources.listeners = 0;
    state.resources.observers = 0;
    state.resources.raf = 0;
    state.resources.timers = 0;
    state.disposed = true;
    state.ready = false;
    state.disposeCount += 1;
    pauseReasons.clear();
    pauseReasons.add('disposed');
    state.pointer.active = false;
    state.pointer.lastEvent = 'dispose';
    updatePaused();
    return true;
  }

  function setPointer({ x = state.pointer.x, y = state.pointer.y, active = true, event = 'pointermove' } = {}) {
    state.pointer.x = Number.isFinite(Number(x)) ? Number(x) : state.pointer.x;
    state.pointer.y = Number.isFinite(Number(y)) ? Number(y) : state.pointer.y;
    state.pointer.active = Boolean(active);
    state.pointer.lastEvent = event;
  }

  function clearPointer(event = 'pointerleave') {
    state.pointer.active = false;
    state.pointer.lastEvent = event;
  }

  function setFallback(active, reason = null) {
    state.fallback.active = Boolean(active);
    state.fallback.reason = active ? reason ?? 'unavailable' : null;
  }

  function setReducedMotion(value) {
    state.reducedMotion = Boolean(value);
    setPauseReason('reduced-motion', state.reducedMotion);
  }

  function setRafScheduled(active) {
    state.resources.raf = active ? 1 : 0;
  }

  function recordAction(last, source) {
    state.action.count += 1;
    state.action.last = last ?? null;
    state.action.source = source ?? null;
  }

  function describe(extra = {}) {
    if (reducedMotion) setReducedMotion(reducedMotion.matches);
    return {
      ready: state.ready,
      disposed: state.disposed,
      paused: state.paused,
      pauseReasons: [...pauseReasons].sort(),
      pointer: { ...state.pointer },
      fallback: { ...state.fallback },
      action: { ...state.action },
      reducedMotion: state.reducedMotion,
      mountCount: state.mountCount,
      disposeCount: state.disposeCount,
      resources: { ...state.resources },
      ...extra
    };
  }

  return {
    state,
    addListener,
    addObserver,
    beginMount,
    finishMount,
    disposeManaged,
    setPauseReason,
    setPointer,
    clearPointer,
    setFallback,
    setReducedMotion,
    setRafScheduled,
    recordAction,
    describe
  };
}
