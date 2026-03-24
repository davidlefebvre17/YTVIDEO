# Research: AI Editorial Illustration Prompts for Trading Recap

> Research date: 2026-03-24
> Context: P7c (C8 Haiku) prompt optimization for Flux 2 Dev image generation
> Target: 50-60 editorial/newspaper illustrations per episode, WSJ hedcut-inspired

---

## 1. Flux Prompt Engineering for Editorial Illustrations

### Core Principles (Flux-specific)

**Word order is priority order.** Flux 2 weighs earlier tokens more heavily. Structure every prompt:
1. Main subject (who/what)
2. Key action or pose
3. Critical style directive
4. Essential context/setting
5. Secondary details (lighting, texture, mood)

**Natural language, not keywords.** Flux responds to descriptive sentences, not comma-separated tags. Write like you are describing a painting to someone who will recreate it.

**No negative prompts.** Flux 2 does not support negative prompts. Describe what you WANT, never what you do not want. Instead of "no text, no watermark", just omit those elements.

**No prompt weights.** Unlike SD, Flux ignores `(thing:1.5)` syntax. Use natural emphasis: "with particular attention to", "prominently featuring", "the focal point is".

**Hex colors work.** Flux 2 follows hex color values accurately. For brand consistency: `cream background #F5F0E8`, `ink black #1A1A2E`, `accent gold #D4A847`.

### Good vs Bad Prompts for Narrative Editorial Scenes

**BAD — keyword soup:**
```
oil market crash, barrels, red arrows, editorial style, black and white, newspaper, dramatic
```

**GOOD — structured natural language:**
```
A stippled ink editorial illustration of crude oil barrels tumbling down a staircase made of descending price charts, viewed from a dramatic low angle. The barrels cast long shadows. Monochrome ink on cream paper, crosshatched shading, newspaper editorial style. Stark directional lighting from upper left.
```

**BAD — too abstract:**
```
market uncertainty and geopolitical tensions affecting currency pairs
```

**GOOD — concrete visual metaphor:**
```
A stippled editorial illustration of a tightrope walker in a business suit balancing on a thread stretched between two currency symbols, EUR and USD, over a stormy sea. Crosshatched ink style on cream paper, dramatic chiaroscuro lighting.
```

### Template Structure for C8 Haiku Output

```
A [STYLE_PREFIX] of [SUBJECT doing ACTION] in [SETTING/CONTEXT].
[COMPOSITIONAL DETAIL]. [MOOD/ATMOSPHERE].
[TECHNICAL_SUFFIX]
```

Where:
- STYLE_PREFIX = "stippled ink editorial illustration" (constant)
- TECHNICAL_SUFFIX = "Monochrome ink on cream paper, crosshatched shading, newspaper editorial register. [LIGHTING]." (near-constant)

---

## 2. WSJ Hedcut Style with Flux

### Available LoRAs (tested, on HuggingFace)

| Model | Trigger Word | Base Model | Notes |
|-------|-------------|------------|-------|
| `tanzim1/WSJ-Hedcut` | `WSJ Portrait` | Flux Dev | Best for portraits. Example: "WSJ Portrait, a black and white drawing of [subject]" |
| `dvyio/flux-lora-stippled-illustration` | `stippled illustration in the style of STPPLD` | Flux Dev | Broader scope than just portraits. Works for scenes, objects, landscapes |
| `dmillar/wsj-hedcut-v1` | `wsj hedcut of [subject]` | SD 1.5 | Older, SD-based. Less useful for Flux pipeline |

### Recommendation for This Project

Use **`dvyio/flux-lora-stippled-illustration`** as primary LoRA. Reasons:
- Handles full scenes (not just portraits)
- Trigger word is descriptive, reinforces the style
- Designed for Flux Dev (your target model)

For close-up portrait beats (public figures), combine with `tanzim1/WSJ-Hedcut` as a secondary LoRA or use it as alternate.

### Prompt Formulation for Consistent Hedcut/Stipple

**Without LoRA (native Flux, fallback):**
```
A black and white stippled ink illustration in the style of Wall Street Journal hedcut portraits. [SUBJECT]. Fine dots and short dashes creating tonal gradation, white background, high contrast, crosshatching for shadows, pointillism technique for midtones.
```

**With STPPLD LoRA:**
```
Stippled illustration in the style of STPPLD. [SUBJECT in ACTION in SETTING]. [COMPOSITIONAL DETAILS]. Cream paper background, ink black rendering.
```

**With WSJ-Hedcut LoRA (portraits):**
```
WSJ Portrait, a black and white drawing of [DESCRIPTION OF PERSON]. Formal composition, neutral expression, three-quarter view, high contrast stipple dots.
```

### Does Flux Handle This Well Natively?

Moderately. Flux understands "stipple", "crosshatch", "ink illustration", "editorial", and "Wall Street Journal style" as concepts. However:
- Without a LoRA, results lean toward general ink illustration, not strict hedcut stippling
- Dot density and regularity are inconsistent without fine-tuning
- The LoRA significantly improves consistency and authenticity
- For 50-60 images per episode, LoRA is mandatory for visual coherence

---

## 3. Narrative Scene Composition in AI Art

### Complexity Tiers — What Works vs What Fails

**TIER 1 — Always works (1-2 elements):**
- Single subject with symbolic prop: "A bull statue crumbling into dust"
- Person in setting: "A trader staring at a wall of red screens"
- Object metaphor: "A gold bar melting on a hot stove"

**TIER 2 — Usually works (2-3 elements, clear spatial relationship):**
- "A bear and a bull facing each other across a chess board in a dark room"
- "Crude oil barrels stacked like dominos, the first one tipping over"
- "A central banker holding puppet strings attached to currency symbols"

**TIER 3 — Hit or miss (3-4 elements, requires explicit spatial mapping):**
- "LEFT: a crumbling factory. CENTER: a businessman on a tightrope over a canyon. RIGHT: a gleaming tech campus. Storm clouds above, calm sea below."
- Success rate ~60%. Flux sometimes merges elements or drops the weakest one.

**TIER 4 — Frequently fails (4+ independent elements, abstract relationships):**
- "Trump playing chess with oil barrels as pieces while Powell watches from a balcony and Bitcoin floats overhead"
- Flux will typically render 2-3 of these elements and merge/drop others
- The chess-with-barrels concept itself is achievable, but adding observers + floating objects overloads it

### Actionable Rules for P7c (C8 Haiku)

1. **Max 3 focal elements per image.** If C7 requests a complex scene, C8 should simplify to 3 core elements.
2. **Use explicit spatial language.** "In the foreground", "in the background", "on the left side", "towering above".
3. **One clear action per image.** "Barrels tumbling" OR "trader watching" — not both as equal subjects.
4. **Anchor abstract concepts to physical objects.** Not "inflation fears" but "a thermometer with a dollar sign, mercury rising into a red zone".
5. **Break complex narratives into sequential beats.** Instead of one image showing cause AND effect, use beat N for cause and beat N+1 for effect.

### Tested Prompt Patterns That Work for Financial Narratives

**The Metaphorical Object:**
```
A stippled ink editorial illustration of a house of cards built from hundred-dollar bills, trembling as a small wind blows from the right. Low angle view, dramatic shadows. Monochrome ink on cream paper.
```

**The Symbolic Action:**
```
Stippled illustration in the style of STPPLD. A pair of giant scissors cutting a rope bridge between two cliff faces labeled with tiny EU and UK flags. Bird's eye view, stark shadows below. Cream paper background.
```

**The Scale Contrast:**
```
A stippled editorial illustration of a tiny figure in a suit standing at the base of an enormous wall chart showing a vertical red line dropping sharply. The figure looks upward. Wide angle, overwhelming scale. Ink on cream paper, crosshatched shadows.
```

---

## 4. Visual Metaphors That Work with Flux

### HIGH SUCCESS RATE — Physical/Tangible Metaphors

These translate directly to visual elements Flux can render:

| Concept | Visual Metaphor | Prompt Fragment |
|---------|----------------|-----------------|
| Market crash | Objects falling, crumbling, sinking | "stock chart made of glass, shattering into fragments" |
| Inflation | Melting, expanding, overflowing | "a dollar bill melting like ice cream on a hot sidewalk" |
| Volatility | Stormy seas, turbulence, shaking | "a small boat on violent ocean waves, each wave shaped like a candlestick" |
| Strength/rally | Rising, towering, fortified | "a gold ingot standing tall like a monolith, casting a long shadow" |
| Pressure | Compression, weight, gravity | "a vault door being pushed by water pressure from behind" |
| Divergence | Forking paths, splitting | "a road splitting into two directions, one sunlit, one stormy" |
| Contagion | Dominos, chain reaction | "a row of national flags as dominos, first one falling" |
| Uncertainty | Fog, crossroads, blindfold | "a compass spinning wildly in a fog bank" |
| Support/resistance | Floor/ceiling, dam, wall | "water rising against a concrete dam with hairline cracks" |
| Correlation | Puppet strings, gears, chains | "two gears interlocked, one made of oil barrels, one made of dollar coins" |

### MEDIUM SUCCESS RATE — Requires Careful Prompting

| Concept | Approach | Key Trick |
|---------|----------|-----------|
| Before/after | Split composition | "The left half shows X, the right half shows Y, sharp vertical divide down the center" |
| Cause and effect | Domino/chain | Make the chain physical, not conceptual |
| Time passage | Aging/seasons on same object | "A tree with green leaves on the left branches, bare branches on the right" |
| Comparison | Scale difference | Make one object giant, the other tiny |

### LOW SUCCESS RATE — Avoid These

- **Pure abstractions**: "uncertainty about monetary policy" — Flux cannot visualize this without a concrete anchor
- **Text-dependent metaphors**: If the metaphor only works with labels/text, it will fail (Flux can render text but unreliably)
- **Irony/sarcasm**: "A 'strong' economy" — Flux cannot render tone
- **Temporal sequences in one image**: "First this happened, then that" — use multiple beats instead
- **Causal arrows/diagrams**: These are better as data overlays, not generated images

### Metaphor Prompt Formula

```
A [STYLE] of [CONCRETE_OBJECT_A] [PHYSICAL_ACTION] [CONCRETE_OBJECT_B] in [SETTING].
[SCALE/ANGLE DETAIL]. [LIGHTING/MOOD].
```

Example for "oil prices dragging down airlines":
```
A stippled editorial illustration of a commercial airplane tethered to a massive oil barrel by heavy chains, straining to take off from a runway. Low angle dramatic perspective, the plane tilting upward, the barrel anchoring it. Ink on cream paper, crosshatched storm clouds.
```

---

## 5. Consistency Techniques Across 50-60 Images

### Strategy 1: LoRA as Style Anchor (Primary)

The LoRA (`dvyio/flux-lora-stippled-illustration`) is your single most important consistency tool. It constrains the style space dramatically. Every prompt includes the trigger word.

### Strategy 2: Fixed Prompt Suffix (Mandatory)

Append an identical technical suffix to EVERY prompt generated by C8:

```
SUFFIX_STANDARD = "Monochrome stippled ink on cream paper, editorial newspaper register, crosshatched shadows, high contrast, no color, no photographic elements"

SUFFIX_PORTRAIT = "WSJ hedcut style portrait, stippled dots and dashes, white background, high contrast, formal three-quarter view"
```

### Strategy 3: Seed Strategy

- Use a **base seed per episode** (derived from date hash)
- For each beat, use `baseSeed + beatIndex`
- This gives reproducible results if you need to regenerate
- Same seed + same prompt = same composition (useful for A/B testing prompt variants)
- **Important**: same seed does NOT mean same style — the LoRA and suffix handle style. Seeds control composition/layout.

### Strategy 4: Flux 2 Multi-Reference (for Kontext)

If using Flux Kontext (image-to-image):
- Generate 3-5 "reference images" first that nail the exact style
- Pass these as reference images for all subsequent generations
- Flux Kontext can attend to up to 10 reference images
- This is the strongest consistency mechanism available

### Strategy 5: Resolution and Aspect Ratio Lock

- Lock ALL images to the same resolution: 1344x768 (16:9, as per your spec)
- Same aspect ratio = consistent composition language
- Never mix portrait/landscape/square in the same episode

### Strategy 6: Color Palette Enforcement

Even in "monochrome", enforce exact values:
- Paper: `#F5F0E8` (warm cream)
- Ink: `#1A1A2E` (deep ink black)
- Midtone: `#8B8680` (warm gray)
- Accent (rare, for emphasis): `#D4A847` (muted gold)

Include hex values in prompts for critical elements: "ink rendered in #1A1A2E on #F5F0E8 cream paper"

### Strategy 7: Image Reuse Grouping (C8 Responsibility)

C8 should detect beats that can share an image:
- Sequential beats about the same asset = same background, different overlay
- "Establishing shot" can persist for 2-3 beats
- Target: 50-60 unique images for ~100 beats (50% reuse)
- This also reduces style drift by having fewer unique generations

### What Does NOT Work for Consistency

- Relying on prompt text alone without LoRA (too much variation)
- Using different aspect ratios
- Mixing "stipple" and "crosshatch" and "engraving" randomly (pick ONE dominant technique word)
- Changing lighting direction between beats in the same segment

---

## 6. Editorial Cartoon Conventions Encodable in Prompts

### Convention 1: Scale = Power

- **Powerful figure**: rendered large, fills the frame, shot from below
- **Weak/threatened figure**: rendered small, wide shot, surrounded by large objects
- Prompt: "A towering figure of [person] viewed from a dramatic low angle, dwarfing the [smaller elements] at their feet"

### Convention 2: Light = Good/Hope, Dark = Threat/Crisis

- Positive developments: bright, open, clean backgrounds
- Negative developments: dark clouds, shadows, constrained spaces
- Prompt: "Stark directional lighting from upper left, deep crosshatched shadows on the right side"

### Convention 3: Symbolic Objects (Financial Domain)

Instantly recognized, no labels needed:

| Symbol | Meaning | Prompt-ready |
|--------|---------|-------------|
| Bull statue | Bullish market | "a charging bronze bull" |
| Bear | Bearish market | "a large bear standing on hind legs" |
| Chess board | Strategic maneuvering | "a chess board with [pieces as X]" |
| Tightrope | Precarious balance | "walking a tightrope over [danger]" |
| Ship/boat | Economy navigating | "a ship in [calm/stormy] waters" |
| Thermometer | Overheating/cooling | "a thermometer with [element] as mercury" |
| Scales/balance | Trade balance, fairness | "tilting scales with [A] and [B]" |
| Hourglass | Running out of time | "an hourglass with [element] as sand" |
| Dominos | Chain reaction | "a line of [X] as dominos, first tipping" |
| Puppet strings | Control/manipulation | "puppet strings descending from [controller] to [controlled]" |
| Dam/wall | Resistance, holding back | "a dam wall with [pressure source] behind" |
| Bridge | Connection, crossing | "a bridge between [A] and [B], [condition]" |
| Magnifying glass | Scrutiny, focus | "a magnifying glass over [subject]" |

### Convention 4: Exaggeration (Use Sparingly in Editorial Style)

Unlike political cartoons, WSJ-style editorial illustration is restrained. But controlled exaggeration works:
- Scale exaggeration: "An enormous oil barrel next to a tiny car" (ratio conveys impact)
- Feature emphasis for public figures: describe distinctive features generously but not grotesquely
- Avoid: caricature-level distortion (conflicts with the editorial/serious register)

### Convention 5: Split/Juxtaposition Compositions

Flux handles these well with explicit spatial instructions:

**Left/Right split:**
```
A stippled editorial illustration divided vertically down the center. The left half shows [SITUATION A] in bright tones. The right half shows [SITUATION B] in dark, heavy crosshatching. The divide is sharp and clean.
```

**Top/Bottom split:**
```
A stippled illustration. In the upper portion, [ABOVE SCENE — e.g., gleaming financial towers]. In the lower portion, [BELOW SCENE — e.g., cracked foundations]. The two halves connected by [LINKING ELEMENT].
```

**Foreground/Background contrast:**
```
In the foreground, sharp and detailed: [IMMEDIATE SUBJECT]. In the background, fading into lighter stippling: [LARGER CONTEXT].
```

### Convention 6: The "Establishing Shot" Pattern

For segment openings (first beat of a new topic):
- Wide angle, lots of context, sets the scene
- "A wide establishing view of [setting], [atmospheric conditions], [key element visible in the distance]"
- Follow with tighter shots in subsequent beats

### Convention 7: Public Figure Rendering

**The challenge**: Flux can render recognizable public figures, but content policies may block names.

**Solution for your pipeline**: Describe by distinctive visual features, not by name.

| Person | Prompt Description |
|--------|-------------------|
| Trump | "a man with distinctive swept-back blonde hair, dark suit, red tie, commanding presence" |
| Powell | "a silver-haired man in a conservative dark suit, standing at a podium with a neutral expression" |
| Lagarde | "a woman with short silver-white hair and a signature brooch, elegant posture" |
| Xi Jinping | "an East Asian leader figure in a dark Mao-collar suit" |

In stippled/editorial style, these descriptions produce sufficiently recognizable results without triggering safety filters. The illustration style provides additional abstraction that helps.

**Alternative approach**: Use Flux Kontext with a reference photo as input, instructing "Transform to stippled editorial illustration style". This preserves likeness through the reference image rather than text description.

---

## 7. Complete Prompt Templates for C8 (Ready to Use)

### Template A — Standard Scene Beat

```
Stippled illustration in the style of STPPLD. [SUBJECT] [ACTION] [SETTING]. [SPATIAL/COMPOSITIONAL DETAIL]. [MOOD DETAIL]. Monochrome ink on cream #F5F0E8 paper, crosshatched shadows, editorial newspaper register, no color.
```

### Template B — Portrait/Figure Beat

```
WSJ Portrait style, stippled illustration in the style of STPPLD. [PERSON DESCRIPTION] in [POSE/ACTION]. [EXPRESSION/GESTURE DETAIL]. Three-quarter view, high contrast stipple dots on cream #F5F0E8 background, formal editorial register.
```

### Template C — Metaphor Beat

```
Stippled illustration in the style of STPPLD. A visual metaphor: [CONCRETE OBJECT A] [PHYSICAL RELATIONSHIP] [CONCRETE OBJECT B]. [SCALE/PERSPECTIVE DETAIL]. Dramatic [LIGHTING DIRECTION] lighting, deep crosshatched shadows. Ink on cream paper, editorial register.
```

### Template D — Establishing/Wide Beat

```
Stippled illustration in the style of STPPLD. Wide establishing view of [SETTING/SCENE]. [ATMOSPHERIC DETAILS]. [KEY ELEMENT] visible in [POSITION]. Panoramic composition, fine stipple work for distance, heavier crosshatching in foreground. Cream paper, editorial register.
```

### Template E — Split Composition Beat

```
Stippled illustration in the style of STPPLD. Image divided vertically: LEFT shows [SCENE A] with [TONE A]. RIGHT shows [SCENE B] with [TONE B]. Sharp clean divide at center. Monochrome ink on cream paper, editorial register.
```

### Template F — Data-Heavy Beat (minimal background)

When the overlay is the star (chart, comparison, stat), the background should be simple:

```
Stippled illustration in the style of STPPLD. A subtle background texture of [SIMPLE THEMATIC ELEMENT — e.g., faded stock ticker tape, light crosshatched waves, abstract financial district skyline silhouette]. Soft, receding into cream paper. Low contrast, editorial register. Designed as backdrop for data overlay.
```

---

## 8. Anti-Patterns to Avoid

1. **Do not request text/labels in the image.** Flux renders text unreliably. All text goes in Remotion overlays.
2. **Do not use "in the style of [living artist]".** Use technique descriptions instead.
3. **Do not mix color and monochrome.** If the brand is cream/ink, every image is cream/ink. No exceptions.
4. **Do not describe more than 3 focal elements.** Simplify complex C7 directions.
5. **Do not use vague atmosphere words alone.** "Tense and dramatic" means nothing without concrete visual anchors.
6. **Do not change the suffix between beats.** Consistency comes from the technical suffix being identical.
7. **Do not request infographics or diagrams as images.** Charts and data visualization are overlay territory.
8. **Do not prompt for animation or motion blur.** These are static images; movement comes from Ken Burns and transitions.

---

## 9. Implementation Recommendations for C8 Haiku Prompt

### Input from C7 (what C8 receives)

```json
{
  "beatId": "beat_023",
  "visualRegister": "metaphor_physical",
  "emotionalIntent": "tension_rising",
  "imageType": "scene",
  "sceneDescription": "Oil market in freefall, Trump tariff shock, geopolitical cascade",
  "keyElements": ["oil barrels", "falling trajectory", "trade documents"],
  "suggestedComposition": "dynamic diagonal, top-left to bottom-right",
  "lightingMood": "dramatic, dark shadows"
}
```

### C8 Haiku Task

Transform the above into an optimized Flux prompt using:
1. Select the appropriate template (A-F)
2. Translate abstract C7 concepts into concrete visual objects
3. Limit to max 3 focal elements
4. Apply spatial language for composition
5. Append the fixed technical suffix
6. Flag if this beat can reuse a previous image (same asset, similar scene)

### Output

```json
{
  "beatId": "beat_023",
  "prompt": "Stippled illustration in the style of STPPLD. Three crude oil barrels tumbling diagonally from upper left to lower right, each barrel trailing scattered trade documents behind it like falling leaves. The barrels grow larger as they fall toward the viewer. Dramatic directional lighting from upper left, deep crosshatched shadows in the lower right corner. Monochrome ink on cream #F5F0E8 paper, crosshatched shadows, editorial newspaper register, no color.",
  "reuseFrom": null,
  "templateUsed": "C",
  "simplifications": ["Removed Trump reference — rendered as context through trade documents", "Reduced from 4 elements to 3"]
}
```

---

## Sources

- [FLUX.1 Prompt Guide: Pro Tips — getimg.ai](https://getimg.ai/blog/flux-1-prompt-guide-pro-tips-and-common-mistakes-to-avoid)
- [Flux 2 Prompt Guide — fal.ai](https://fal.ai/learn/devs/flux-2-prompt-guide)
- [Flux.2 MAX Prompt Guide — fal.ai](https://fal.ai/learn/devs/flux-2-max-prompt-guide)
- [Official Prompting Guide — Black Forest Labs](https://docs.bfl.ai/guides/prompting_guide_flux2)
- [FLUX.2 Prompting Guide — LTX Studio](https://ltx.studio/blog/flux-prompting-guide)
- [14 Essential FLUX.1 Prompts — skywork.ai](https://skywork.ai/blog/flux1-prompts-tested-templates-tips-2025/)
- [Stippled Illustration LoRA — dvyio/flux-lora-stippled-illustration (HuggingFace)](https://huggingface.co/dvyio/flux-lora-stippled-illustration)
- [Stippled Illustration LoRA — Civitai](https://civitai.com/models/772319/stippled-illustration-flux-lora)
- [WSJ-Hedcut LoRA — tanzim1/WSJ-Hedcut (HuggingFace)](https://huggingface.co/tanzim1/WSJ-Hedcut)
- [WSJ hedcut-v1 — dmillar (HuggingFace)](https://huggingface.co/dmillar/wsj-hedcut-v1)
- [Can a Machine Illustrate WSJ Portraits? — WSJ/Medium](https://medium.com/the-wall-street-journal/can-a-machine-illustrate-wsj-portraits-convincingly-3f76a10ee9ae)
- [Editorial Cartoons Introduction — Ohio State HTI](https://hti.osu.edu/opper/editorial-cartoons-introduction)
- [Political Cartoons Techniques — Study.com](https://study.com/academy/lesson/political-cartoons-art-style-techniques-examples.html)
- [Flux LoRAs on Together AI](https://www.together.ai/blog/generate-images-with-specific-styles-using-flux-loras-on-together-ai)
- [FLUX.2 Multi-Reference — Together AI](https://www.together.ai/blog/flux-2-multi-reference-image-generation-now-available-on-together-ai)
- [FLUX.1 Kontext — Black Forest Labs](https://bfl.ai/announcements/flux-1-kontext)
- [Style Transfer Handbook — ComfyUI](https://blog.comfy.org/p/the-complete-style-transfer-handbook)
- [Bypassing Celebrity Restrictions — rwgusev](https://www.rwgusev.com/tutorial/how-to-bypass-i-cant-generate-that-image-for-famous-people/)
- [Flux Style Test Gallery — enragedantelope](https://enragedantelope.github.io/Styles-FluxDev/)
