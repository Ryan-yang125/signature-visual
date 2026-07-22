# Acknowledgements and Research Boundaries

Signature Visual V2 was developed through original implementation and structured study of public creative-coding, animation, and Skill resources.

## Architecture

- [Hallmark](https://github.com/Nutlope/hallmark) informed the progressive-disclosure package shape: a concise entry Skill with task-specific references and reusable resources.

## Motion and deterministic review

- [GSAP Skills](https://github.com/greensock/gsap-skills) informed research into named timeline phases, shared playheads, scroll-linked state, and cleanup. The repository is MIT licensed. Signature Visual keeps timeline guidance library-independent.
- [iart WebGL Animation Skills](https://github.com/iart-ai/webgl-animation-skills) informed research into fixed-time screenshots, seeded systems, and contact-sheet review. The repository is MIT licensed. Signature Visual's QA CLI is an original implementation with its own bridge, manifest, error capture, and deterministic test suite.

## Renderer research

- [Three.js examples](https://threejs.org/examples/) and [Three.js manual](https://threejs.org/manual/) remain primary technical references for geometry, material, lighting, post-processing, and lifecycle behavior.
- [p5.js examples](https://p5js.org/examples/), [canvas-sketch](https://github.com/mattdesl/canvas-sketch), and [Paper.js examples](https://paperjs.org/examples/) informed the broader Canvas and generative-art research space.
- [The Book of Shaders](https://thebookofshaders.com/) and [Shadertoy](https://www.shadertoy.com/) are visual and technical study resources. Per-source and per-shader licensing still applies.
- [Supermemory SVG Animations](https://github.com/supermemoryai/skills/tree/main/svg-animations) and [CloudAI-X Three.js Skills](https://github.com/cloudai-x/threejs-skills) were reviewed for coverage and failure modes. Their content and code are not included in this package.

## Website runtime assets

- The showcase vendors the MIT-licensed Three.js 0.180.0 module so the living-form case runs without a third-party CDN. Its license is stored at `site/assets/vendor/LICENSE-three.txt`.
- Showcase typefaces are self-hosted from Fontsource 5.3.0 packages. Each family is distributed under the SIL Open Font License 1.1; the family-specific license files are stored in `site/assets/fonts/`.

## Source policy

The installed Skill has no dependency on external Skills. Runtime shells, pattern language, direction process, material and motion guidance, QA protocol, website, and examples are maintained in this repository under the project license.

References with unclear or restrictive licensing are used for observation and general technical learning only. Reuse of third-party assets, code, shaders, or distinctive compositions requires a separate license check.
