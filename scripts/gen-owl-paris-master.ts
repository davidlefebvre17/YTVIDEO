import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const OUTDIR = path.join(ROOT, "data");

const PROMPT = `A young anthropomorphic great horned owl trader relaxes in a sophisticated contemporary Parisian penthouse lounge — a brutalist-luxe sanctuary curated by a top interior designer. Visual style: WSJ hedcut stipple pen-and-ink editorial illustration, fine crosshatching, dense dot shading, predominantly black and graphite ink with rich textural depth, illustrative and detailed editorial line work, with VERY restrained warm gold accent ONLY on the brass elements and the framed Bitcoin artwork. Refined, sophisticated, expensive, brutalist-luxe minimalism. Materials are noble, cool, and architectural: raw board-formed concrete, polished black marble with subtle veining, brushed and polished brass, dark smoked oak, slate, with one or two muted desaturated accents (deep ink-black, charcoal grey, off-white, cool stone grey, brass-gold). The palette is COOL and INDUSTRIAL-LUXE, not cream, not warm-cognac. Think Tadao Ando meets Rick Owens loft meets Joseph Dirand — gallery-grade, museum-calm, expensively spartan.

CAMERA AND COMPOSITION (most important):
Camera positioned dead-on frontal, eye-level, pointing straight at the owl from across the room. Perfectly symmetrical centered composition. Wide 16:9 establishing frame. The lounge extends symmetrically left and right of the owl. Depth goes BEHIND the owl through the glass wall toward Paris.

NO DESK in this scene. The owl sits centered in a sculptural designer lounge armchair facing the camera, with a low coffee table directly in front of him.

THE LOUNGE ARMCHAIR: a sculptural high-quality designer lounge armchair in deep black smooth leather, brushed brass slim base and feet, a Mies van der Rohe Barcelona / Eero Saarinen Womb / Joseph Dirand style — clean modern silhouette, slightly tilted back, low and wide. The chair faces the camera dead-on, the owl reclined in it, his back resting against the cushioned backrest.

THE COFFEE TABLE: a low rectangular coffee table directly in front of the armchair, between owl and camera. The table is a single slab of polished black marble with subtle grey veining, supported by a slim brushed brass frame at each end. Simple, sculptural.

THE OWL — ANATOMY MUST BE PERFECT:
Young adult anthropomorphic great horned owl, slim athletic build, soft silver-grey feathered plumage with a crisp white facial disc, bright amber eyes looking directly at the camera, round minimalist gold-frame designer eyeglasses, clean pointed ear tufts. He wears a sharp impeccably tailored slim-fit deep midnight-black wool designer suit (Brioni or Tom Ford-level), crisp white shirt with the top button open, no tie, a discreet gold watch glinting on one wrist. He sits relaxed in the lounge armchair, body slightly reclined.

CRITICAL ANATOMY:
— EXACTLY TWO feathered legs, fully extended forward from his hips toward the coffee table.
— EXACTLY TWO polished black designer leather oxford shoes at the end of those legs, both feet casually propped up on top of the marble coffee table, ankles crossed, the two shoes clearly pointing toward the camera and clearly visible on the table top.
— Legs visible from hips down to ankles in clean unbroken line; the chair seat is solid dark leather under his thighs, no extra leg passing through.
— EXACTLY TWO feathered hands: one resting relaxed behind his head, the other holding a small espresso cup in a fine white porcelain saucer balanced on his thigh.
— ONE head, ONE beak slightly parted as if speaking.
— NO third leg, NO leg passing through the table, NO duplicated limbs, NO chair leg poking up where it shouldn't be.

ON THE COFFEE TABLE: between his feet and the camera, a single folded broadsheet newspaper laid perfectly flat in the foreground, rendered in the same illustration style with NO readable text — only abstract editorial column blocks suggesting newsprint at distance. Beside the newspaper: a slim brushed brass cigar lighter and a small empty crystal glass. Nothing else on the table.

THE BACK WALL DIRECTLY BEHIND THE OWL: a single floor-to-ceiling minimalist glass curtain wall with very thin matte-black steel mullions, spanning the full width of the frame. Through the glass, a panoramic view of Paris at dawn: Eiffel Tower clearly visible slightly off-center in the middle distance, Haussmannian rooftops to the horizon, soft pink-and-peach dawn sky.

CEILING: solid, NOT glass — raw board-formed exposed concrete ceiling with subtle line patterns from the wooden formwork, very high overhead, brutalist architectural feel, with a single slim recessed linear brass lighting strip cast a soft warm wash. Convey enormous vertical volume.

SIDE WALLS: raw board-formed concrete on both side walls, clean and uncluttered, the texture of the wood-grain imprint visible in the concrete. Floor: polished slate or honed black-and-grey marble slab, cool and architectural. A single muted geometric area rug in graphite and ink-black under the coffee table to anchor the seating zone.

ROOM CONTENTS — ONLY THESE TWO SIGNATURE PIECES, NOTHING ELSE (no monitors, no chandelier, no bookshelves, no globe):

1. ON THE LEFT SIDE OF THE FRAME, mounted prominently on a tall polished black marble plinth: a striking large sculptural BRASS sculpture of a single charging bull, head down, horns thrust forward, muscles rendered in bold detail, full polished brass finish catching the dawn light, presented as a major contemporary art piece. ONLY a bull — no bear. The bull is the dominant left-side element of the frame.

2. ON THE RIGHT SIDE OF THE FRAME, mounted flush and centered on the concrete wall: a single large statement framed artwork — a clean minimalist gallery-style print in a substantial brushed brass frame, depicting the bold golden Bitcoin ₿ symbol on a deep matte-black background. The frame is heavy, gallery-grade, the artwork is the dominant right-side element. This is the room's only Bitcoin reference.

Tasteful brutalist-luxe accents (very minimal):
— A tall sculptural olive tree in a raw concrete cylindrical planter standing in one back corner.
— A slim sculptural floor lamp in brushed brass with a single linear LED beside the armchair, glowing softly.
— Optionally one small alabaster sculptural object on a slim brass console table.

The room must feel CURATED, gallery-like, refined, brutalist-luxe and visibly EXPENSIVE — concrete + brass + black marble + glass — never cluttered, never warm-cream, never traditional.

Lighting: soft cool pink-rose dawn backlight flooding through the glass wall behind the owl, silhouetting him gently and casting long soft shadows across the polished marble floor toward the camera, warm low brass accent light from the floor lamp catching the brass bull sculpture and the brass picture frame, premium architectural-photography quiet light, deep cinematic chiaroscuro between cool dawn behind and warm brass interior reflections.

Overall mood: brutalist-luxe, sophisticated, design-conscious, calm, curated, expensively spartan. Tadao Ando concrete temple meets Rick Owens loft meets Parisian penthouse. WSJ hedcut stipple editorial illustration delivery. Quiet new-money Parisian trader confidence.`;

type ModelDef = {
  id: string;
  slug: string;
  input: Record<string, unknown>;
  parseImage: (data: unknown) => string | undefined;
};

const VERSION = "v6";

const MODELS: ModelDef[] = [
  {
    id: "nano-banana-a",
    slug: "fal-ai/nano-banana",
    input: { prompt: PROMPT, num_images: 1, output_format: "png", aspect_ratio: "16:9" },
    parseImage: (d) => (d as { images?: Array<{ url: string }> }).images?.[0]?.url,
  },
  {
    id: "nano-banana-b",
    slug: "fal-ai/nano-banana",
    input: { prompt: PROMPT, num_images: 1, output_format: "png", aspect_ratio: "16:9" },
    parseImage: (d) => (d as { images?: Array<{ url: string }> }).images?.[0]?.url,
  },
  {
    id: "nano-banana-c",
    slug: "fal-ai/nano-banana",
    input: { prompt: PROMPT, num_images: 1, output_format: "png", aspect_ratio: "16:9" },
    parseImage: (d) => (d as { images?: Array<{ url: string }> }).images?.[0]?.url,
  },
];

async function generate(m: ModelDef): Promise<void> {
  console.log(`\n[${m.id}] submitting to ${m.slug}...`);
  const result = await fal.subscribe(m.slug, {
    input: m.input,
    logs: true,
    onQueueUpdate: (u) => {
      if (u.status === "IN_PROGRESS") {
        for (const log of u.logs ?? []) {
          if (log.message) console.log(`  [${m.id}]`, log.message);
        }
      }
    },
  });

  const url = m.parseImage(result.data);
  if (!url) {
    console.error(`[${m.id}] no image:`, JSON.stringify(result.data));
    return;
  }

  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.join(OUTDIR, `owl-paris-${VERSION}-${m.id}.png`);
  fs.writeFileSync(out, buf);
  console.log(`[${m.id}] saved ${out} (${Math.round(buf.length / 1024)} KB)`);
}

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Prompt: ${PROMPT.length} chars`);
  console.log(`Running ${MODELS.length} models in parallel...`);

  const results = await Promise.allSettled(MODELS.map(generate));
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[${MODELS[i].id}] FAILED:`, r.reason);
    }
  });

  console.log("\nDone. Compare:");
  for (const m of MODELS) {
    console.log(`  data/owl-paris-${VERSION}-${m.id}.png`);
  }
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
