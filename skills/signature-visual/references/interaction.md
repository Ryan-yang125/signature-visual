# Interaction

Interaction reveals the governing rule of the visual. Design input, mapping, bounds, latency, and recovery as one behavioral system.

## Interaction contract

Write:

```text
INPUT       pointer position / proximity / velocity / scroll / click / touch / keyboard / data
MEANING     what this input represents inside the metaphor
TARGET      field rule / pressure / focus / layer / route / phase / camera
RANGE       minimum, maximum, dead zone, and saturation point
LATENCY     immediate / damped / propagated / sampled / accumulated
RECOVERY    duration, curve, residue, and final state
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
- device orientation shifts a light source or calibrated plane within a small bound.

Avoid unrestricted camera orbit and direct cursor-following when they add no meaning.

## Response hierarchy

Use three levels:

1. **Acknowledgment:** a local change within roughly 50–120 ms confirms input.
2. **Consequence:** the system responds according to its material or topology.
3. **Recovery:** energy dissipates and the signature composition returns.

The acknowledgment can be subtle. The consequence carries meaning. Recovery prevents the user from leaving the visual in a broken composition.

## Bounds

Cap input before smoothing it:

- camera parallax usually stays within a few degrees;
- repulsion/attraction stops before marks leave the designed field permanently;
- deformation preserves recognizable silhouette except during an authored peak;
- scroll endpoints each form a complete frame;
- brightness and bloom retain text contrast in the maximum state;
- touch targets remain outside decorative pointer interception.

Clamp velocity or acceleration when fast input can destabilize the system.

## Pointer lifecycle

Handle:

- first entry without a jump from an uninitialized coordinate;
- coalesced or high-frequency movement;
- exit at any edge and while a button is held;
- viewport exit and document visibility change;
- touch cancellation;
- route unmount during active response.

Normalize pointer coordinates in the owner element, account for device-pixel ratio only at the renderer boundary, and keep the semantic coordinate system independent of resolution.

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

Test empty, typical, peak, and malformed/edge data. Keep a stable composition when values cluster or disappear.

## Interaction QA

Capture rest, approach, engaged, released, and recovered. Check that:

- rest is already complete;
- approach indicates affordance;
- engaged reveals the core rule;
- release contains no flash, jump, or stranded geometry;
- recovered matches the signature composition;
- touch and keyboard users can access meaningful states;
- decorative visuals remain outside accessibility and pointer flow.
