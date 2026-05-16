import { aspectRatioType } from "@/utils/enum";

export function buildPreviewPrompt(
  title: string,
  promptPreview: string,
  style: string,
  aspectRatio: string,
) {
  return `
${promptPreview}.

Add the title: "${title}" on the image.
Design the typography so that it matches the visual style of the scene and the chosen theme (${style}).
The text should be easy to read, well-integrated into the composition, and visually appealing.

Choose the appropriate weight, color, and placement automatically:
- If the scene is bright, use darker text or outline.
- If the scene is dark, use lighter text or glow.
- Avoid overly bold text unless it fits the aesthetic.
- Ensure the title feels natural within the ${style} style.

Aspect ratio: ${aspectRatio}.
`.trim();
}

export function buildScraperPreviewPrompt(
  title: string,
  promptPreview: string,
  style: string,
  aspectRatio: string,
  hasPreview: boolean,
) {
  return `
${promptPreview}.

**MANDATORY TITLE OVERLAY:**
- Overlay the text: "${title}"
- The typography must be elegant, legible, and perfectly integrated into the ${style} aesthetic.
- Position the title strategically (e.g., centered or bottom-third) to maximize visual impact.

**COMPOSITION:**
- ${hasPreview ? "Incorporate the provided image (logo/brand element) naturally into the scene." : "Focus on a high-impact, symbolic representation of the brand."}
- Ensure the lighting and color grading match the ${style} style.
- The final result must look like a professional, production-ready video thumbnail.
`.trim();
}

export function buildVisionAnalysisPrompt(productName?: string, productDescription?: string) {
  return `Analyze this product image. 
  
**PRODUCT CONTEXT:**
${productName ? `- Product Name: ${productName}` : ""}
${productDescription ? `- Product Description: ${productDescription}` : ""}
${!productName && !productDescription ? "(No additional context provided; rely on visual analysis.)" : "Use the above details to refine your analysis and ensure absolute brand accuracy."}

Identify the following: 
1. **Core Product Details:** (Brand name, product type, shape, color). 
2. **Product Components:** Identify the distinct physical elements (e.g., The outer "Exteriors/Box", the internal "Contents/Pills/Cream", or if it's a "Single Object"). List them clearly.
3. **Visual DNA:** (Primary colors, secondary accent colors, textures, lighting style, font vibe).
4. **Target Audience Vibe:** (e.g., Biohacker, luxury wellness, scientific/medical, gym/fitness).

**CRITICAL INSTRUCTION FOR PROMPT GENERATION:**
You are generating prompts for an Image-to-Image / Reference-based generation workflow. The user wants to keep the EXACT product from the original image but place it in new, cleaned-up scenarios.

Based on this analysis, generate **12 distinct Image Generation Prompts** for an AI model (like Nano Banana or Midjourney) to create 'B-Roll' assets for a video ad. Use these categories:

- **Prompt 1: The Hero Environment.** Place the product (The outer packaging/box) in a high-end, realistic setting that matches its vibe.
- **Prompt 2: The Macro/Texture Shot.** A high-detail, sensory-focused extreme close-up. Focus on specific textures, shimmer, or micro-details (e.g., "The smooth, pearlescent shimmer of the cream").
- **Prompt 3: The Lifestyle Benefit.** A scene showing the 'result' of the product (e.g., intense focus, energy, relaxation).
- **Prompt 4: The Abstract Science.** Visualizing the ingredients or the effect on a molecular level.
- **Prompt 5: The Action/Motion Shot.** An image that implies movement (e.g., pills falling, liquid swirling, the box opening).
- **Prompt 6: The CTA Shot.** A bold, high-contrast image with negative space, designed for text overlays.
- **Prompt 7: The Presentation.** The product displayed elegantly on a premium pedestal or minimalist stage.
- **Prompt 8: The Demonstration.** Showing the product being used or its primary function being performed.
- **Prompt 9: The Minimalist Flat Lay.** A clean, top-down view of the product arranged surgically among complementary "everyday carry" items or ingredients on a flat surface.
- **Prompt 10: The Exploded View / Ingredient Cloud.** The product centered with its key ingredients (e.g. berries, botanical leaves, water droplets) orbiting it in mid-air in an artistic, gravity-defying arrangement.
- **Prompt 11: The Natural Origin.** The product placed in its pristine "source" environment (e.g. misty mountain peaks, lush rainforest floor, or arctic glacier) to emphasize purity.
- **Prompt 12: The Human Touch.** A close-up (partial view only) showing a hand reaching for, holding, or interacting with the product to add warmth and relatability.

**Rules for Product Preservation:**
- **Product Reference:** Always refer to the main subject as "the product from the provided reference image" or "the exact [COMPONENT NAME] shown in the reference".
- **Visual Consistency:** Ensure the product's color, logo placement, and physical form are identical to the reference.
- **Background Replacement:** Focus on the NEW environment while stating the product itself remains constant.
- **Cinematic Quality:** Use professional photography terms (85mm lens, cinematic lighting, depth of field).
- **No Text Errors:** Do NOT include new text on the products.

Return the response as a JSON object with the following structure:
{
  "analysis": {
    "coreProductDetails": string,
    "productComponents": string,
    "visualDNA": string,
    "targetAudienceVibe": string
  },
  "prompts": [
    { "category": "Hero Environment", "prompt": string },
    { "category": "Macro/Texture Shot", "prompt": string },
    { "category": "Lifestyle Benefit", "prompt": string },
    { "category": "Abstract Science", "prompt": string },
    { "category": "Action/Motion Shot", "prompt": string },
    { "category": "CTA Shot", "prompt": string },
    { "category": "Presentation", "prompt": string },
    { "category": "Demonstration", "prompt": string },
    { "category": "Minimalist Flat Lay", "prompt": string },
    { "category": "Exploded View", "prompt": string },
    { "category": "Natural Origin", "prompt": string },
    { "category": "Human Touch", "prompt": string }
  ]
}`.trim();
}

export interface StyledPromptOptions {
  styleDescription?: string;
  isProduct?: boolean;
  shotType?:
    | "lifestyle"
    | "medical_cgi"
    | "metaphor"
    | "product"
    | "generic"
    | "b-roll"
    | "character-speaking";
  aspectRatio?: aspectRatioType;
}

/**
 * Creates a highly descriptive and structured prompt for image generation.
 * This is a pure function that can be easily understood and tweaked by non-developers.
 */
export function generateCreativePrompt(
  originalPrompt: string,
  options: StyledPromptOptions,
): string {
  const { styleDescription, isProduct = false, shotType } = options;

  // 1. Shot Context Booster
  let shotContext = "";
  const effectiveShotType = shotType || (isProduct ? "product" : "generic");

  switch (effectiveShotType) {
    case "medical_cgi":
      shotContext =
        "CONTEXT: Scientific or Medical Visualization. Focus on internal details, anatomy, or micro-structures.";
      break;
    case "lifestyle":
      shotContext = "CONTEXT: Lifestyle Shot. Focus on authentic human subjects and environments.";
      break;
    case "metaphor":
      shotContext =
        "CONTEXT: Conceptual/Metaphorical. Focus on abstract representations and symbolism.";
      break;
    case "product":
      shotContext = "CONTEXT: Product Presentation. Focus on highlighting the item clearly.";
      break;
    case "character-speaking":
      shotContext =
        "CONTEXT: Character Portrait. Focus on clear facial features, expression, and professional cinematic character animation/rendering.";
      break;
    default:
      shotContext = "CONTEXT: Cinematic Scene.";
  }

  // 2. Style Logic
  const cleanStyle = styleDescription?.trim().replace(/\.$/, "") || "";
  const styleSection = cleanStyle
    ? `STYLE: ${cleanStyle}. Follow this style strictly for lighting, tone, and texture.`
    : `STYLE: High-quality, professional composition.`;

  return `
[SHOT CONTEXT]
${shotContext}

[SUBJECT]
${originalPrompt}

[VISUAL STYLE]
${styleSection}
`.trim();
}

export function injectStructuralConstraints(
  creativePrompt: string,
  options: StyledPromptOptions,
): string {
  const { isProduct = false, shotType, aspectRatio } = options;

  // 1. Frame and Orientation Instructions
  let compositionGuide = "";
  let aspectLabel = "";

  if (aspectRatio) {
    switch (aspectRatio) {
      case aspectRatioType.NINE_SIXTEEN:
        compositionGuide =
          "\\n- VERTICAL (9:16 portrait). Subject must fill the vertical space completely.";
        aspectLabel = " portrait 9:16";
        break;
      case aspectRatioType.SIXTEEN_NINE:
        compositionGuide =
          "\\n- HORIZONTAL (16:9 landscape). Subject must fill the horizontal frame completely.";
        aspectLabel = " landscape 16:9";
        break;
      case aspectRatioType.ONE:
        compositionGuide = "\\n- SQUARE (1:1). Subject should be centered and fill the frame.";
        aspectLabel = " square 1:1";
        break;
      default:
        compositionGuide = "";
        aspectLabel = "";
        break;
    }
  }

  // 2. Add product constraint dynamically if needed without forcing a specific aesthetic
  const effectiveShotType = shotType || (isProduct ? "product" : "generic");
  const productConstraint =
    effectiveShotType === "product" || effectiveShotType === "medical_cgi"
      ? "\\nCRITICAL: Maintain the exact visual identity (form, colors, branding) of the original product/subject within the scene."
      : "";

  // 3. Final Prompt Assembly (System formatting)
  return `
[PRIMARY INSTRUCTION]
Generate ONE complete image that fills the entire${aspectLabel} frame. 
NO black bars, NO borders, and NO empty padding.

[COMPOSITION GUIDE]
- The subject must occupy the frame effectively, ensuring a balanced composition.${compositionGuide}
- Accurately reflect the requested visual style.

${creativePrompt}
${productConstraint}

[QUALITY RULES]
- NO text, logos, letters, or watermarks.
- Single scene: Output exactly one image, not a collage or grid.
- Continuity: Background must extend naturally to all edges.
`.trim();
}

export function createStyledPrompt(originalPrompt: string, options: StyledPromptOptions): string {
  const creativePrompt = generateCreativePrompt(originalPrompt, options);
  return injectStructuralConstraints(creativePrompt, options);
}
