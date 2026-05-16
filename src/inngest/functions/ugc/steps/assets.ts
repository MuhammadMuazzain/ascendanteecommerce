import { UgcServices } from "../index";
import { config } from "../../../config";

export const preprocessProductAssets = async (scheme: any, services: UgcServices) => {
  const rawUrls = (scheme.assets || []).map((a: any) => a.url).filter(Boolean);

  if (rawUrls.length === 0) {
    console.log("No assets to preprocess, skipping.");
    return scheme.assets;
  }

  const gemini = services.gemini;
  const imageModel = config.gemini.imageModel;

  console.log(`Preprocessing ${rawUrls.length} product assets...`);
  const preprocessedResults = await gemini.preprocessProductAssets(rawUrls, imageModel);
  console.log(`Preprocessing complete. Got ${preprocessedResults.length} clean asset objects.`);

  return preprocessedResults.map((result, i) => {
    const originalAsset = (scheme.assets?.[Math.floor(i / 2)] || {}) as any;

    return {
      id: originalAsset.id,
      name: originalAsset.name,
      type: originalAsset.type || "image",
      url: result.url,
      label: result.label,
      isPreprocessed: true,
    };
  });
};
