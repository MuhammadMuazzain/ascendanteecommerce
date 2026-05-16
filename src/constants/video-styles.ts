import { FrameStyle } from "@/utils/enum";

export const VIDEO_STYLES = [
  {
    id: FrameStyle.Realism,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/realistic.webp",
    name: "Realism",
    description:
      "A style that closely mimics the visual appearance of reality, focusing on accuracy and detail.",
    scriptTonePreset:
      "Natural and conversational. Trustworthy and approachable. Avoid superlatives. Script should feel like a genuine word-of-mouth recommendation from a real person.",
  },
  {
    id: FrameStyle.Cinematic,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/cinematic.webp",
    name: "Cinematic",
    description:
      "A high-quality, professional film look with specific color grading, lighting, and an expansive aspect ratio.",
    scriptTonePreset:
      "Grounded and credible. Tight, direct copy in a premium brand-film register. Avoid hyperbole. The hero's lines should feel like a luxury commercial — less is more.",
  },
  {
    id: FrameStyle.Anime,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/anime.webp",
    name: "Anime",
    description:
      "The distinct Japanese animation style characterized by vibrant colors, large eyes, and dynamic action.",
    scriptTonePreset:
      "High emotional contrast. Villains are dramatically expressive. Heroes are passionate and resolved. Alternate between tension and triumphant release. Short punchy declarations.",
  },
  {
    id: FrameStyle.Claymation,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/claymation.webp",
    name: "Claymation",
    description:
      "Handmade Claymation style, stop-motion animation, plasticine sculpture with tactile details like visible fingerprints, tool marks, hand-sculpted texture, matte finish, and imperfections. Characters have chunky proportions, exaggerated facial expressions, large expressive Pixar-style eyes. Scenes are handmade miniature dioramas with dollhouse furniture and soft-focus background (bokeh). Warm studio lighting, soft cinematic key light, earthy organic tones with vibrant pops of color.",
    scriptTonePreset:
      "Quirky, tactile, charming. Dialogue has a playful, handmade feel. Warm humor over polished wit. Lean into imperfection as charm.",
  },
  {
    id: FrameStyle.Pixar,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/pixar.webp",
    name: "Pixar",
    description:
      "High-end 3D Pixar/Illumination animation style, immersive environments, crystal-clear 8k render, subsurface scattering, cinematic studio lighting, ultra-detailed textures, and vibrant candy-like colors.",
    scriptTonePreset:
      "Warm, witty, and playful. Villains are lovably mischievous. Heroes are plucky and endearing. Lean into comedic timing and emotional warmth. Keep dialogue bouncy and family-friendly.",
  },
  {
    id: FrameStyle.Cartoon,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/cartoon.webp",
    name: "Cartoon",
    description: "A simplified, often exaggerated 2D drawing style, typically bright and stylized.",
    scriptTonePreset:
      "Punchy, energetic, and broadly comedic. Big reactions, short sentences, over-the-top villain antics. High energy from first word to last.",
  },
  {
    id: FrameStyle.Mythological,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/mythical.webp",
    name: "Mythological",
    description: "A style evoking epic tales, ancient legends, gods, and fantastical creatures.",
    scriptTonePreset:
      "Epic and grandiose. Dialogue carries weight and gravitas. Heroes speak with resolve and conviction. Lean into mythic archetypes and legendary stakes.",
  },
  {
    id: FrameStyle.Digital,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/digital.webp",
    name: "Digital",
    description:
      "A clean, computer-generated look with sharp lines, smooth rendering, and distinct color palettes.",
    scriptTonePreset:
      "Clean, modern, and precise. Tech-forward language. Confident and efficient. Dialogue should feel like a sleek product launch presentation.",
  },
  {
    id: FrameStyle.Ghibli,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/ghibli.webp",
    name: "Ghibli",
    description:
      "The unique, hand-drawn aesthetic of Studio Ghibli, often featuring gentle fantasy, nature, and emotional depth.",
    scriptTonePreset:
      "Gentle, poetic, and wonder-filled. Avoid aggressive sales language. Lean into storytelling metaphors, nature imagery, and emotional depth. Warm and reflective.",
  },
  {
    id: FrameStyle.HyperRealistic,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/hyper_realistic.webp",
    name: "Hyper Realistic",
    description:
      "An extreme level of detail that goes beyond regular realism, appearing almost photographic or surreal in clarity.",
    scriptTonePreset:
      "Ultra-polished and aspirational. Confident and sophisticated. Dialogue should feel like a high-end beauty or tech brand campaign. Precise, elevated, authoritative.",
  },
  {
    id: FrameStyle.Shadows,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/shadows.webp",
    name: "Shadows",
    description:
      "A style that heavily emphasizes dramatic lighting, deep contrast, and silhouette, often seen in film noir.",
    scriptTonePreset:
      "Noir-adjacent. Mysterious, cool, understated. Dialogue carries weight — every word deliberate. Slow burn tension. The hero's reveal should feel inevitable.",
  },
  {
    id: FrameStyle.ThreeD,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/anime.webp",
    name: "3D",
    description:
      "General computer-generated imagery (CGI) that provides depth, volume, and complex modeling.",
    scriptTonePreset:
      "Versatile and modern. Clean, direct language. Confident without being cold. Dialogue should feel purposeful and contemporary.",
  },
  {
    id: FrameStyle.PharmaCGI,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/anime.webp",
    name: "Pharma CGI",
    description:
      "3D CGI Pharmaceutical style, high-fidelity 3D render, medical advertising style with pharmaceutical mascots (e.g. Mucinex-style character design) and anthropomorphic animation. Characters have rubber-hose arms, white cartoon gloves. Materials include subsurface scattering, porous organic textures, glossy plastic. Scenes often feature microscopic views like internal human body environments, fleshy organic caverns, or artery walls. Volumetric lighting (God rays), glowing energy particles, cinematic sparks, and dramatic rim lighting.",
    scriptTonePreset:
      "High-energy, authoritative, and dynamic. Dialogue should feel like a premium medical or supplement commercial, with a balance of serious problem-solving and engaging, anthropomorphic mascot action.",
  },
  {
    id: FrameStyle.Illustration,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/illustration.webp",
    name: "Illustration",
    description:
      "Visuals that look like a hand-drawn or painted artwork, often with visible brushstrokes or ink lines.",
    scriptTonePreset:
      "Artistic and expressive. Dialogue feels crafted and intentional, like a picture book narration. Warm and human. Metaphors welcome.",
  },
  {
    id: FrameStyle.Sketch,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/sketch.webp",
    name: "Sketch",
    description: "A raw, unfinished look, resembling a pencil, charcoal, or pen drawing.",
    scriptTonePreset:
      "Raw, honest, and unpolished. Feels like rough notes coming to life. Casual and direct. Authenticity over perfection.",
  },
  {
    id: FrameStyle.Lego,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/lego.webp",
    name: "LEGO",
    description:
      "A world built and animated using the distinct blocky look and figures of LEGO bricks.",
    scriptTonePreset:
      "Optimistic, kid-friendly, and imaginative. Simple language with big enthusiasm. Teamwork and creativity are core themes. Fun, fast, and upbeat.",
  },
  {
    id: FrameStyle.Manga,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/manga.webp",
    name: "Manga",
    description:
      "The Japanese comic book style, often characterized by black and white panels, specific shading, and dynamic composition.",
    scriptTonePreset:
      "Action-oriented with dramatic internal monologue. Short punchy declarations, high-stakes emotional beats, rapid-fire pacing. Power of will and determination as themes.",
  },
  {
    id: FrameStyle.Minecraft,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/minecraft.webp",
    name: "Minecraft",
    description: "The iconic blocky, pixelated, low-resolution 3D aesthetic of the game Minecraft.",
    scriptTonePreset:
      "Playful, community-driven, and enthusiastic. Gaming slang welcome. Casual and fun. Celebrate building, discovery, and creativity.",
  },
  {
    id: FrameStyle.WoodenTextured,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/wooden.webp",
    name: "Wooden Textured",
    description:
      "Visuals that appear to be carved from, or entirely made of, various types of wood.",
    scriptTonePreset:
      "Warm, artisanal, and grounded. Celebrates craftsmanship and natural quality. Slow and deliberate. Dialogue feels handcrafted.",
  },
  {
    id: FrameStyle.TransparentGlass,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/glass.webp",
    name: "Transparent Glass",
    description:
      "A style featuring highly reflective, clear, and translucent glass material for objects and environments.",
    scriptTonePreset:
      "Crystal clear and precise. Premium and refined language. Dialogue reflects purity and clarity — no filler, no fluff. Elegant and minimal.",
  },
  {
    id: FrameStyle.PaperStyle,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/paper.webp",
    name: "Paper Style",
    description:
      "A look that mimics papercraft, cut-outs, or folded origami, giving a flat, layered appearance.",
    scriptTonePreset:
      "Light, layered, and clever. Dialogue unfolds like a pop-up book. Playful and delightful. Each scene should feel like a new page turning.",
  },

  {
    id: FrameStyle.Miniature,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/miniature.webp",
    name: "Miniature",
    description:
      "A look that simulates a small-scale model, diorama, or tilt-shift photography, making objects appear small.",
    scriptTonePreset:
      "Charming and detail-obsessed. Big emotions in a tiny world. Dialogue is compact and precise. Humor comes from the contrast of scale.",
  },
  {
    id: FrameStyle.FeltWool,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/wool.webp",
    name: "Felt Wool",
    description:
      "A soft, fuzzy texture that simulates objects and characters being made of felt or wool fabric.",
    scriptTonePreset:
      "Cozy, soft, and comforting. Dialogue is gentle and warm like a children's story. Reassuring tone. The product is a comforting friend, not a competitor.",
  },
  {
    id: FrameStyle.Dreamwave,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/dreamwave.webp",
    name: "Dreamwave",
    description:
      "A retro-futuristic aesthetic dominated by neon colors, synthwave music vibes, and 80s-inspired themes.",
    scriptTonePreset:
      "Retro-futuristic and nostalgic. 80s-inspired enthusiasm with a synth-energy pulse. Bold, upbeat declarations. Dialogue should feel like a neon-lit power fantasy.",
  },
  {
    id: FrameStyle.Gigerwave,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/gigerwave.webp",
    name: "Gigerwave",
    description:
      "A dark, biomechanical, and organic-meets-machine horror style, inspired by the work of H.R. Giger.",
    scriptTonePreset:
      "Dark, visceral, and unsettling. Villains feel alien and inevitable. Heroes speak with grim determination. Dialogue has a machine-like cadence — cold, precise, relentless.",
  },
  {
    id: FrameStyle.GtaVi,
    previewUrl:
      "https://cdn.web.imagine.art/remote-config/solutions/shorts/generation/media_styles/gta6.webp",
    name: "GTA VI",
    description:
      "A vibrant, modern, and detailed open-world video game style, reminiscent of the Grand Theft Auto VI aesthetic.",
    scriptTonePreset:
      "Vibrant, street-smart, and unapologetically bold. Swagger and attitude in every line. Fast-talking, confident energy. The hero owns the room from the first word.",
  },
];

export const CAPTION_STYLES = [
  {
    id: "will",
    name: "Will",
    font: "Onest",
    preview: "Will",
    position: "bottom",
  },
  {
    id: "oranienbaum",
    name: "Oranienbaum",
    font: "Oranienbaum",
    preview: "Will",
    position: "bottom",
  },
  {
    id: "cinzel",
    name: "Cinzel",
    font: "Cinzel",
    preview: "Will",
    position: "top",
  },
  {
    id: "orbitron",
    name: "Orbitron",
    font: "Orbitron",
    preview: "Will",
    position: "center",
  },
];

export const NARRATIVE_VIDEO_STYLES = VIDEO_STYLES.slice(0, 8);

export const CHARACTER_DRIVEN_VIDEO_STYLES = VIDEO_STYLES.filter((s) =>
  [FrameStyle.FeltWool, FrameStyle.Pixar, FrameStyle.Claymation, FrameStyle.PharmaCGI].includes(
    s.id,
  ),
);

export const PRODUCT_IMAGE_VIDEO_STYLES = VIDEO_STYLES.filter((s) =>
  [FrameStyle.Realism, FrameStyle.Cinematic].includes(s.id),
);

export const PRODUCT_VIDEO_STYLES = VIDEO_STYLES.filter((s) =>
  [FrameStyle.Realism, FrameStyle.Cinematic].includes(s.id),
);
