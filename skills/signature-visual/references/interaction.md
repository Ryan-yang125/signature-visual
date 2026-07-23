# Interaction

Interaction reveals the governing rule of the visual. Design input, mapping, bounds, latency, cancellation, and aftermath as one behavioral system.

## Interaction contract

Write:

```text
INPUT       pointer position / proximity / velocity / scroll / click / touch / keyboard / data
MEANING     what this input represents inside the metaphor
TARGET      field rule / pressure / focus / layer / route / phase / camera
RANGE       minimum, maximum, dead zone, and saturation point
LATENCY     immediate / damped / propagated / sampled / accumulated
AFTERMATH   held, accumulated, branched, recovered, erased, or committed final state
FALLBACK    touch, keyboard, reduced motion, and unavailable input
```

Example:

```text
Pointer proximity represents a probe approaching tissue.
It increases local permeability within a 14% radius.
The effect propagates outward over 420 ms, saturates at 0.65,
and heals over 1.8 s with a faint persistent scar.
```

## Semantic mappings

Prefer mappings that share behavior with the thesis:

- pointer proximity changes pressure, focus, heat, or attraction;
- pointer velocity changes turbulence or shedding;
- scroll progress changes age, assembly, depth, or causal phase;
- click commits, seeds, samples, pins, cuts, or releases;
- data changes density, topology, scale, rhythm, or anomaly location;
- keyboard focus selects the same semantic object as pointer focus;
- pointer click, Enter, and Space commit the same primary action through one semantic control;
- device orientation shifts a light source or calibrated plane within a small bound.

Avoid unrestricted camera orbit and direct cursor-following when they add no meaning.

## Response hierarchy

Use three levels:

1. **Acknowledgment:** a local change within roughly 50–120 ms confirms input.
2. **Consequence:** the system responds according to its material or topology.
3. **Aftermath:** the system returns, holds, accumulates, commits, erases, or opens a new stable state according to the temporal archetype.

The acknowledgment can be subtle. The consequence carries meaning. The aftermath leaves the composition in an authored valid state.

## Bounds

Cap input before smoothing it:

- camera parallax usually stays within a few degrees;
- repulsion/attraction stops before marks leave the designed field permanently;
- deformation preserves recognizable silhouette except during an authored high-salience state;
- scroll endpoints each form a complete frame;
- brightness and bloom retain text contrast in the maximum state;
- touch targets remain outside decorative pointer interception.

Clamp velocity or acceleration when fast input can destabilize the system.

## Pointer lifecycle

Handle:

- first entry without a jump from an uninitialized coordinate;
- coalesced or high-frequency movement;
- `pointerleave` at any edge and while a button is held;
- `pointercancel` after touch/pen interruption;
- `lostpointercapture` after drag or browser cancellation;
- window blur, viewport exit, and document visibility change;
- route unmount during active response.

Normalize pointer coordinates in the owner element, account for device-pixel ratio only at the renderer boundary, and keep the semantic coordinate system independent of resolution.

Cancellation is an immediate state transition. Set both the target and displayed active value to zero, clear capture-owned gesture state, and enter the authored safe state. Delayed easing toward an old pointer position can leave the composition stranded after touch cancellation.

Use one cancellation function across every exit path:

```js
function cancelPointer() {
  pointer.targetActive = 0;
  pointer.active = 0;
  pointer.dragging = false;
}

owner.addEventListener('pointerleave', cancelPointer);
owner.addEventListener('pointercancel', cancelPointer);
owner.addEventListener('lostpointercapture', cancelPointer);
window.addEventListener('blur', cancelPointer);
```

## Primary action equivalence

Put a meaningful action on a native `<button>`, link, or focusable SVG control. Listen to its semantic `click` event so pointer activation, Enter, and Space share one code path.

```js
const action = document.querySelector('[data-visual-action]');
action.addEventListener('click', () => visual.setState({ phase: 'committed' }));
```

Use hover/focus for acknowledgment and click for commitment. Keyboard focus should reveal the same target and consequence available to pointer users. Decorative fields can remain pointer-responsive while their primary meaning and action stay accessible through semantic DOM.

## Scroll orchestration

Use one normalized progress value as the source of truth. Derive visual state from progress so resizing, back-navigation, and deterministic capture produce the same frame.

Separate:

- page entry/exit visibility;
- narrative progress;
- ambient micro-motion allowed within a state.

If the project already has a timeline library, connect its playhead to the normalized progress. A small visual can map progress directly without adding a dependency.

## Data response

Define the data domain and missing states. Use perceptually distinct channels:

- position/topology for category or relation;
- area or count for magnitude;
- material/light for confidence, state, or recency;
- tempo for rate;
- anomaly treatment for exceptions.

Test empty, typical, extreme, and malformed/edge data. Keep a stable composition when values cluster or disappear.

## Interaction QA

Capture the held frame, acknowledgment, engaged consequence, cancellation, and authored aftermath. Add released or recovered states when the selected model contains them. Check that:

- the held frame is already complete;
- approach indicates affordance;
- engaged reveals the core rule;
- release contains no flash, jump, or stranded geometry;
- every terminal or aftermath state preserves the signature rule;
- pointer leave, pointer cancel, lost capture, and window blur all clear active state;
- touch and keyboard users can access meaningful states;
- Enter and Space produce the same primary action as pointer click;
- a runtime reduced-motion change updates response and aftermath safely;
- dispose during an active response leaves zero listeners, frames, or generated nodes;
- decorative visuals remain outside accessibility and pointer flow.

Declare these behaviors in the V3 capability manifest and run them as browser scenarios. A capability marked N/A needs a concrete reason tied to the surface, renderer, or interaction model. See [visual-qa.md](visual-qa.md).
