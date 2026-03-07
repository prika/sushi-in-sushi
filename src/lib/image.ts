const SUPABASE_STORAGE_PREFIX = "/storage/v1/object/public/";
const SUPABASE_RENDER_PREFIX = "/storage/v1/render/image/public/";

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

/**
 * Converts a Supabase Storage public URL into a transformed/resized URL
 * using Supabase Storage Image Transformations.
 *
 * If the URL is not a Supabase Storage URL, returns it unchanged.
 *
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */
export function getOptimizedImageUrl(
  url: string,
  options: ImageTransformOptions,
): string {
  if (!url) return url;

  // Only transform Supabase Storage URLs
  const storageIndex = url.indexOf(SUPABASE_STORAGE_PREFIX);
  if (storageIndex === -1) return url;

  // Extract base and path after /storage/v1/object/public/
  const base = url.substring(0, storageIndex);
  const filePath = url.substring(
    storageIndex + SUPABASE_STORAGE_PREFIX.length,
  );

  // Build query params
  const params = new URLSearchParams();
  if (options.width) params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  if (options.quality) params.set("quality", String(options.quality));
  if (options.resize) params.set("resize", options.resize);

  const qs = params.toString();
  return `${base}${SUPABASE_RENDER_PREFIX}${filePath}${qs ? `?${qs}` : ""}`;
}

/** Preset sizes for common use cases */
export const IMAGE_SIZES = {
  /** Product card thumbnail (ProductCard, menu grid) */
  thumbnail: { width: 400, quality: 75, resize: "cover" as const },
  /** Product detail / carousel */
  detail: { width: 800, quality: 80, resize: "cover" as const },
  /** Admin list preview */
  adminPreview: { width: 200, quality: 70, resize: "cover" as const },
} as const;
