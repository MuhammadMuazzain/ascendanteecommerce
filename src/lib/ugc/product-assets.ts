/** Collect product image URLs from every place the setup UI may store them. */
export function collectProductAssetUrls(scheme: {
  assets?: Array<{ id?: string; name?: string; url?: string; type?: string }>;
  productImages?: Array<{ id?: string; name?: string; url?: string }>;
  productImage?: { url?: string };
}): string[] {
  const urls: string[] = [];

  for (const asset of scheme.assets ?? []) {
    if (!asset?.url) continue;
    if (asset.type && asset.type !== "image") continue;
    urls.push(asset.url);
  }

  for (const img of scheme.productImages ?? []) {
    if (img?.url) urls.push(img.url);
  }

  if (scheme.productImage?.url) {
    urls.push(scheme.productImage.url);
  }

  return [...new Set(urls)].slice(0, 2);
}

/** Merge product uploads into `assets` for generation / DB (orchestrator reads `assets` only). */
export function mergeProductImagesIntoAssets<
  T extends { id?: string; name?: string; url: string; type?: string },
>(scheme: {
  assets?: T[];
  productImages?: Array<{ id?: string; name?: string; url: string }>;
  productImage?: { id?: string; name?: string; url: string };
}): T[] {
  const existing = [...(scheme.assets ?? [])];
  const seen = new Set(existing.map((a) => a.url));

  const extras: T[] = [];
  const add = (img: { id?: string; name?: string; url: string }) => {
    if (!img.url || seen.has(img.url)) return;
    seen.add(img.url);
    extras.push({
      id: img.id,
      name: img.name,
      url: img.url,
      type: "image",
    } as T);
  };

  for (const img of scheme.productImages ?? []) {
    add(img);
  }
  if (scheme.productImage) {
    add(scheme.productImage);
  }

  return [...existing, ...extras];
}
