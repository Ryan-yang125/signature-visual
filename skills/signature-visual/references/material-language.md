# Material Language

Material is the behavior of color, light, edge, texture, and transparency. It gives computational geometry emotional weight and prevents every engine from sharing the same glossy-tech finish.

## Material specification

Define:

```text
SUBSTANCE     ink / glass / tissue / graphite / light / paper / ceramic / vapor / metal / data mark
LIGHT MODEL   flat / emissive / grazing / transmitted / diffuse / scanned / environmental
EDGE          crisp / feathered / torn / refracted / pixelated / etched / blooming
TEXTURE       grain scale, frequency, attachment, and movement
PALETTE       ground / body / signal / exception / annotation
DEPTH CUE     overlap / scale / blur / parallax / occlusion / shading / line weight
DECAY         fade / stain / trail / residue / snap / persistent history
```

Choose one primary substance and one controlled contradiction. Examples: biological tissue with plotter-sharp annotations; graphite topology with one emissive fault; luminous vapor constrained inside a physical instrument.

## Palette roles

Assign jobs before choosing hex values:

- **Ground:** establishes contrast and temperature.
- **Body:** carries most of the visual mass.
- **Signal:** reveals state change or focus.
- **Exception:** appears rarely at a high-salience state or anomaly.
- **Annotation:** supports labels and measurement.

One color may fill several roles in a monochrome system. Keep exception color genuinely scarce so it retains meaning.

## Edge hierarchy

Use at least two edge behaviors with clear ownership:

- primary silhouette: highest authority;
- internal structure: lower contrast or thinner line;
- atmosphere/residue: softest boundary;
- interactive response: edge change that communicates state.

Uniform bloom makes scale and focus ambiguous. Apply blur in world or layer terms: a distant field, transmitted tissue, a lens artifact, or deposited pigment.

## Texture rules

Texture needs a physical or representational reason:

- paper grain remains screen-fixed while ink marks move;
- cellular noise deforms with the surface;
- scan lines belong to an instrument viewport;
- dithering expresses a constrained display or data density;
- pigment residue accumulates along flow and dries over time.

Mixing several unrelated texture metaphors weakens the material. Select a dominant scale and a subtle secondary scale.

## Material contrast pairs

Useful controlled tensions:

| Primary | Counterpoint | Effect |
| --- | --- | --- |
| Matte paper | one wet reflective trace | evidence emerging |
| Translucent tissue | etched coordinates | living system under study |
| Dense black | phosphor signal | instrument precision |
| Powdery field | sharp typographic contour | atmosphere made legible |
| Flat diagram | one depth-folded route | hidden complexity revealed |
| Polished surface | persistent scar | history inside perfection |

## Cheap-look diagnostics

Revise material when:

- neon gradient plus additive glow appears without semantic roles;
- every object uses the same opacity and blur;
- noise is pasted over the final image instead of belonging to a layer;
- metallic, glass, bloom, grain, and chromatic aberration compete at once;
- color changes continuously while the product has no reason for it;
- the effect loses all character in a static frame.

Start the revision by removing one material behavior, strengthening the primary substance, and reserving the signal treatment for meaningful changes.
